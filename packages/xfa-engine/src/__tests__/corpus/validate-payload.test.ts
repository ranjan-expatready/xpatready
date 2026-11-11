import { DOMParser, type Element } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';
import { loadTemplate, variablesOf } from '../../model/template/index.js';
import type { FormRuntime } from '../../runtime/options.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { loadFixture } from '../fixtures/form-data/apply.js';
import { blankSession, canonicalSom, corpusPdf, filledOutcome, FORM_CASES, snapshotOf, TEST_HOST, type FormCase, type Outcome } from './form-cases.js';

const DATE_LAST_VALIDATED = 'Page2.MaritalStatus.SectionA.DateLastValidated';
const COMPLETION_MESSAGE = 'Validation completed successfully.';

/** Runs `run` with the process timezone set to `tz` and restores it afterwards. */
async function underProcessZone<T>(tz: string, run: () => Promise<T>): Promise<T> {
  const before = process.env['TZ'];
  process.env['TZ'] = tz;
  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env['TZ'];
    else process.env['TZ'] = before;
  }
}

const dateLastValidated = (runtime: FormRuntime): string => ['Year', 'Month', 'Day'].map((part) => String(runtime.getValue(`${DATE_LAST_VALIDATED}.${part}`))).join('-');

/** The barcode manifests of the form's template, in barcode order: the refs each payload must be built from. */
async function manifestRefs(c: FormCase): Promise<Map<string, readonly string[]>> {
  const pdf = await corpusPdf(c.file);
  const model = loadTemplate(pdf.packet('template').text());
  const root = must(model.root.firstChild('subform'), 'root subform');
  return new Map(variablesOf(root).manifests.map((m) => [m.name, m.refs]));
}

/**
 * The payload of barcode `index`, computed WITHOUT the form's scripts: the barcode field's caption text, then the value
 * of the data node each manifest reference names (resolved by the engine's SOM resolver; an empty value is an empty
 * segment), joined with `|` and closed with a trailing `|`. This is the rule the form's own encoder implements.
 */
function independentPayload(runtime: FormRuntime, barcodeSom: string, refs: readonly string[]): string {
  const caption = must(runtime.children(barcodeSom, 'caption')[0], 'barcode caption');
  const captionValue = must(runtime.children(caption, 'value')[0], 'caption value');
  const captionText = must(runtime.children(captionValue, 'text')[0], 'caption text');
  const segments = [String(runtime.getValue(captionText)), ...refs.map((ref) => String(runtime.getValue(ref) ?? ''))];
  return `${segments.join('|')}|`;
}

const elementsOf = (parent: Element): Element[] => Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);
const attrOf = (el: Element, name: string): string => el.getAttribute(name) ?? '';
const textOf = (el: Element): string => el.textContent ?? '';

/**
 * A SECOND oracle that shares nothing with the form model, the SOM resolver or the member getters: it reads the raw
 * template text (barcode fields, caption text, manifest refs) and the datasets text the run saved, with a plain DOM walk.
 * A manifest ref `xfa[0].form[0].form1[0].A[0].B[1].dataNode` names the data element `/xfa:data/form1/A[0]/B[1]`
 * (the n-th child called that, with default binding); a container segment with no data group of its own is skipped
 * (its fields' data sits in the parent's group); a missing or empty element is an empty segment.
 */
function rawOraclePayloads(templateXml: string, datasetsXml: string): string[] {
  const template = new DOMParser().parseFromString(templateXml, 'text/xml').documentElement as unknown as Element;
  const data = new DOMParser().parseFromString(datasetsXml, 'text/xml').documentElement as unknown as Element;
  const dataRoot = must(elementsOf(data).find((e) => e.localName === 'data'), 'xfa:data');
  const subforms = Array.from(template.getElementsByTagName('subform'));
  const barcodes = must(subforms.find((e) => attrOf(e, 'name') === 'Barcodes'), 'Barcodes subform');
  const fields = elementsOf(barcodes).filter((e) => e.localName === 'field');
  const manifests = new Map(Array.from(template.getElementsByTagName('manifest')).map((m) => [attrOf(m, 'name'), elementsOf(m).filter((e) => e.localName === 'ref').map((r) => textOf(r).trim())]));
  const valueOfRef = (ref: string): string => {
    const segments = ref.replace(/^xfa\[0\]\.form\[0\]\./, '').replace(/\.dataNode$/, '').split('.');
    let at: Element = dataRoot;
    for (const [position, segment] of segments.entries()) {
      const m = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(segment);
      const [name, index] = [must(m?.[1]), Number(m?.[2] ?? '0')];
      const next = elementsOf(at).filter((e) => e.localName === name)[index];
      if (next !== undefined) at = next;
      else if (position === segments.length - 1) return '';
      // else: a subform with no data group of its own (unbound container): its fields' data sits in the parent's group.
    }
    return textOf(at);
  };
  return fields.map((field, i) => {
    const caption = textOf(must(Array.from(must(field.getElementsByTagName('caption')[0]).getElementsByTagName('text'))[0], 'caption text'));
    return `${[caption, ...must(manifests.get(`barcode${i + 1}`), `manifest barcode${i + 1}`).map(valueOfRef)].join('|')}|`;
  });
}

describe.each(FORM_CASES)('Validate and barcode payloads on real form $file', (c) => {
  // ---- A1 ---------------------------------------------------------------------------------------------------------
  describe('A1: the blank form', () => {
    it('Validate returns incomplete with the flag "No", the barcodes hidden and the form\'s own first required field, and records the form\'s own message', async () => {
      const { runtime, pack } = await blankSession(c);
      const result = runtime.validate(pack);
      const first = canonicalSom(c.firstMissingBlank);
      // Evidence line for the task card.
      console.log(`${c.file}: blank Validate -> first missing ${c.firstMissingBlank}; message ${JSON.stringify(result.messages[0]?.text)}`);
      expect(result).toMatchObject({ complete: false, flag: 'No', firstMissingField: first, barcodesPresence: 'hidden' });
      // The field is a real one, required by its own template and empty.
      expect(runtime.getProperty(first, 'className')).toBe('field');
      expect(runtime.getProperty(first, 'mandatory')).not.toBe('disabled');
      expect(runtime.getValue(first)).toBeNull();
      // The form asked to focus it last, and showed exactly one validation message built from the field's own texts.
      expect(result.focus.at(-1)).toBe(first);
      expect(result.messages).toHaveLength(1);
      const message = must(result.messages[0]);
      const own = { format: String(runtime.getProperty(first, 'formatMessage')), validation: String(runtime.getProperty(first, 'validationMessage')) };
      expect(own.format).not.toBe('');
      expect(own.validation).not.toBe('');
      expect(message.text.startsWith(own.format)).toBe(true);
      expect(message.text.endsWith(own.validation)).toBe(true);
      expect(message.text).toContain('The following field must contain a value');
      expect(message).toMatchObject({ title: 'Validation Error', event: 'click' });
      expect(runtime.unsupported).toEqual([]);
      expect(runtime.console).toEqual([]);
    });

    it('the first-missing-field variable is empty afterwards (the form clears it itself), so the engine had to capture it while the form held it', async () => {
      const { runtime, pack } = await blankSession(c);
      runtime.validate(pack);
      expect(runtime.getValue(pack.firstMissingField)).toBe('');
    });

    it('preSave on the blank form encodes nothing: the form only encodes after a successful Validate', async () => {
      const { runtime, pack } = await blankSession(c);
      runtime.validate(pack);
      const encoded = runtime.encodeBarcodes(pack);
      expect(encoded.validated).toBe(false);
      expect(encoded.payloads).toEqual([null, null, null, null, null]);
    });
  });

  // ---- A2 + A3 ----------------------------------------------------------------------------------------------------
  describe('A2/A3: the synthetic fixture', () => {
    let outcome: Outcome;
    const run = async (): Promise<Outcome> => (outcome ??= await filledOutcome(c));

    it('A2: Validate returns complete with the flag "Yes", the barcodes shown, no missing field, the completion message and the date last validated equal to the injected clock', async () => {
      const { session, validated } = await run();
      const { runtime } = session;
      console.log(`${c.file}: filled Validate -> complete=${validated.complete}, flag=${String(validated.flag)}, ${validated.messages.length} message(s), focus ${JSON.stringify(validated.focus)}`);
      expect(validated).toMatchObject({ complete: true, flag: 'Yes', firstMissingField: null, barcodesPresence: 'visible' });
      expect(validated.messages.map((m) => m.text.split('\n')[0])).toEqual([COMPLETION_MESSAGE]);
      expect(validated.messages[0]).toMatchObject({ title: '', icon: 3, buttons: 0, event: 'click' });
      expect(dateLastValidated(runtime)).toBe('2026-6-15');
      expect(runtime.getValue(session.pack.firstMissingField)).toBe('');
    });

    it('A2: the form focuses its consent date field when it completes, or - on the form whose script names a path its template lacks - focuses nothing and the engine records that read as unsupported', async () => {
      const { session, validated } = await run();
      if (c.consentDateField !== undefined) {
        expect(validated.focus).toEqual([canonicalSom(c.consentDateField)]);
        expect(session.runtime.getProperty(canonicalSom(c.consentDateField), 'className')).toBe('field');
      } else {
        expect(validated.focus).toEqual([]);
      }
      expect(session.runtime.unsupported).toEqual(c.unsupportedAfterValidate);
      expect(session.runtime.console).toEqual([]);
    });

    it('A3: preSave encodes five payloads, each equal to the independent computation (caption + bound values of the manifest refs, joined by "|", closed by "|")', async () => {
      const { session, encoded } = await run();
      const { runtime, pack } = session;
      const refs = await manifestRefs(c);
      const barcodes = runtime.children(pack.barcodes, 'field');
      expect(barcodes).toHaveLength(5);
      expect(encoded.validated).toBe(true);
      const expected = barcodes.map((som, i) => independentPayload(runtime, som, must(refs.get(`barcode${i + 1}`), `manifest barcode${i + 1}`)));
      console.log(`${c.file}: payload lengths ${JSON.stringify(encoded.payloads.map((p) => p?.length))}, independent ${JSON.stringify(expected.map((p) => p.length))}`);
      expect(encoded.payloads).toEqual(expected);
      expect(encoded.payloads.map((p) => p?.length)).toEqual(c.payloadLengths);
      barcodes.forEach((som, i) => expect(runtime.getValue(som), som).toBe(expected[i]));
      // The preSave broadcast ran the form's own handler(s) for the event.
      expect(encoded.scriptsRun).toBeGreaterThanOrEqual(1);
    });

    it('A3: a second oracle that shares nothing with the model (raw template text + the saved datasets text, plain DOM walk) agrees with the engine and the first oracle', async () => {
      const { session, encoded } = await run();
      const { runtime, pack } = session;
      const pdf = await corpusPdf(c.file);
      const raw = rawOraclePayloads(pdf.packet('template').text(), runtime.saveDatasets());
      const refs = await manifestRefs(c);
      const first = runtime.children(pack.barcodes, 'field').map((som, i) => independentPayload(runtime, som, must(refs.get(`barcode${i + 1}`))));
      expect(raw).toHaveLength(5);
      expect(encoded.payloads).toEqual(raw);
      expect(first).toEqual(raw);
    });

    it('A3: the payloads carry the data the fixture entered, the date last validated from the injected clock, and the reader information built from the injected host identity', async () => {
      const { session, encoded } = await run();
      const { runtime } = session;
      const payloads = encoded.payloads.map((p) => must(p));
      const segments = payloads.flatMap((p) => p.split('|'));
      for (const value of ['TESTPERSON', 'TESTGIVEN', 'TEST12345', 'test.person@example.com', '5555550123', 'TESTVILLE']) expect(segments, value).toContain(value);
      expect(payloads[0]).toMatch(/\|2026\|6\|15\|$/);
      const { appType, version, variation, platform, language } = TEST_HOST;
      const formVersion = String(runtime.getValue('Page1.ButtonsHeader.FormVersion'));
      const readerInfo = `${appType}.${version}.${variation}.${platform}.${language}${formVersion}${c.readerInfoSuffix}`;
      expect(segments).toContain(readerInfo);
      expect(payloads.filter((p) => p.includes(readerInfo))).toHaveLength(1);
      // The form never sees a vendor: nothing in the payloads names one.
      expect(payloads.join('')).not.toMatch(/acrobat|exchange|adobe/i);
    });

    it('every fixture value is in the form\'s data after the run (the data the barcodes and a saved file are built from)', async () => {
      const { session } = await run();
      for (const [som, value] of Object.entries(loadFixture(c.form))) {
        expect(String(session.runtime.getValue(`${canonicalSom(som)}.dataNode`)), som).toBe(String(value));
      }
    });
  });

  // ---- A5 ---------------------------------------------------------------------------------------------------------
  describe('A5: determinism', () => {
    it('two runs with the same inputs, clock and host identity give byte-identical payloads, messages, focus and recorders', async () => {
      const first = await filledOutcome(c);
      const second = await filledOutcome(c);
      expect(snapshotOf(second)).toBe(snapshotOf(first));
      expect(second.encoded.payloads).toEqual(first.encoded.payloads);
      expect(first.encoded.payloads.every((p) => typeof p === 'string' && p.length > 0)).toBe(true);
    });

    it('the process timezone changes nothing: the same run under three process timezones is identical', async () => {
      const reference = snapshotOf(await underProcessZone('UTC', () => filledOutcome(c)));
      for (const tz of ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland']) {
        expect(snapshotOf(await underProcessZone(tz, () => filledOutcome(c))), tz).toBe(reference);
      }
    });

    it('a different injected clock changes exactly the date segment, so the clock is the only time source', async () => {
      const other = await filledOutcome(c, { clock: Date.UTC(2027, 2, 9, 12) });
      const base = await filledOutcome(c);
      expect(dateLastValidated(other.session.runtime)).toBe('2027-3-9');
      expect(must(other.encoded.payloads[0]).replace('|2027|3|9|', '|2026|6|15|')).toBe(base.encoded.payloads[0]);
      expect(other.encoded.payloads.slice(1)).toEqual(base.encoded.payloads.slice(1));
    });

    it('a different injected host identity changes exactly the reader information, and nothing else in the payloads', async () => {
      const base = await filledOutcome(c);
      const other = await filledOutcome(c, { host: { ...TEST_HOST, appType: 'OtherApp', version: '2.5', platform: 'OtherOS' } });
      const swap = (p: string | null): string => must(p).replace('OtherApp.2.5.Test.OtherOS.XX', 'TestApp.1.0.Test.TestOS.XX');
      expect(other.encoded.payloads.map(swap)).toEqual(base.encoded.payloads);
      expect(other.encoded.payloads).not.toEqual(base.encoded.payloads);
    });
  });

  // ---- D9: the form's own date stamp in a timezone ----------------------------------------------------------------
  describe('D9: the date last validated is the date in the injected timezone', () => {
    it.each([
      ['UTC', Date.UTC(2026, 11, 31, 20, 0), '2026-12-31'],
      ['+05:30', Date.UTC(2026, 11, 31, 20, 0), '2027-1-1'],
      ['America/New_York', Date.UTC(2026, 0, 1, 3, 0), '2025-12-31'],
      ['-08:00', Date.UTC(2026, 5, 15, 5, 0), '2026-6-14'],
    ])('timezone %s at clock %#: %s', async (timezone, clock, expected) => {
      const { session, encoded } = await filledOutcome(c, { timezone, clock });
      expect(dateLastValidated(session.runtime)).toBe(expected);
      expect(must(encoded.payloads[0]).endsWith(`|${expected.replaceAll('-', '|')}|`)).toBe(true);
    });

    it('the same zone gives the same payloads under any process timezone', async () => {
      const options = { timezone: '+05:30', clock: Date.UTC(2026, 11, 31, 20, 0) };
      const reference = snapshotOf(await underProcessZone('UTC', () => filledOutcome(c, options)));
      for (const tz of ['America/Los_Angeles', 'Asia/Kolkata']) expect(snapshotOf(await underProcessZone(tz, () => filledOutcome(c, options))), tz).toBe(reference);
    });
  });

  // ---- the Clear button -------------------------------------------------------------------------------------------
  describe('the Clear button (carried in from W02-T06: the implicit caption text)', () => {
    it('runs to the end without a script error, asks for confirmation and reports completion; the one write it makes that no template models (a number on a subform) is kept as a note', async () => {
      const { runtime, pack } = await blankSession({ ...c, strict: false });
      const clear = pack.validateButton.replace('[0]', '[1]');
      const result = runtime.event(clear, 'click');
      expect(result.scriptsRun).toBeGreaterThan(0);
      expect(runtime.state).toBe('loaded');
      expect(runtime.messages).toHaveLength(2);
      expect(runtime.messages[0]).toMatchObject({ icon: 2, buttons: 1, event: 'click' });
      expect(runtime.unsupported).toEqual([]);
      expect(runtime.notes).toEqual([{ class: 'subform', member: 'ActualNumber' }]);
    });
  });
});
