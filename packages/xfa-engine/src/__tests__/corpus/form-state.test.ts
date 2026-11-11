import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Element } from '@xmldom/xmldom';
import { afterAll, describe, expect, it } from 'vitest';
import { formChecksum } from '../../model/form-packet/checksum.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { FormRuntime } from '../../runtime/options.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';
import { loadPack } from '../fixtures/form-data/apply.js';
import { corpusPdf, filledOutcome, FORM_CASES, NOON_UTC, TEST_HOST, type FormCase } from './form-cases.js';

/**
 * The viewer oracle: a filled form the owner saved in the desktop viewer after testing (fictitious test data only). The
 * viewer rewrote the datasets and form packets itself, so its form packet is the reference for what the UI state looks like.
 */
const corpusDir = process.env.XFA_CORPUS_DIR ?? '';
const oracleDir = resolve(process.env.XFA_ORACLE_DIR ?? join(corpusDir, '..', 'xfa-acrobat'));
const ORACLE = { form: 'imm5257', file: 'imm5257-filled-acrobat-saved.pdf' } as const;
const oraclePath = join(oracleDir, ORACLE.file);
if (!existsSync(oraclePath)) throw new Error(`NOT EXECUTED: the viewer oracle ${ORACLE.file} is not in ${oracleDir} (set XFA_ORACLE_DIR)`);

const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const rt of runtimes.splice(0)) rt.dispose();
});

async function loadedRuntime(pdf: XfaPdf, strict: boolean): Promise<FormRuntime> {
  const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict });
  runtimes.push(runtime);
  runtime.load();
  return runtime;
}

const checksumOf = (pdf: XfaPdf): string | null => parseXml(pdf.packet('form').text()).documentElement?.getAttribute('checksum') ?? null;
const computed = (pdf: XfaPdf): string => formChecksum([pdf.packet('template').bytes, pdf.packet('datasets').bytes]);

const CONTAINERS = new Set(['subform', 'field', 'exclGroup', 'draw']);
const elements = (parent: Element): Element[] => Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);

/** One piece of UI state in a form packet: the container's SOM (from the root subform), what it is, and its value. */
interface StateEntry {
  readonly som: string;
  readonly key: string;
  readonly value: string;
}

/** The state-bearing entries of a form packet: presence and access of containers, nullTest, caption text, items. */
function stateEntries(text: string): StateEntry[] {
  const root = parseXml(text).documentElement;
  const form1 = root === null ? undefined : elements(root).find((e) => e.localName === 'subform');
  if (form1 === undefined) throw new Error('form packet without a root subform');
  const out: StateEntry[] = [];
  const visit = (node: Element, som: string): void => {
    for (const attr of ['presence', 'access']) {
      const value = node.getAttribute(attr);
      if (value !== null && value !== '' && som !== '') out.push({ som, key: attr, value });
    }
    const seen = new Map<string, number>();
    for (const el of elements(node)) {
      if (el.localName === 'validate' && el.getAttribute('nullTest')) out.push({ som, key: 'nullTest', value: el.getAttribute('nullTest') ?? '' });
      if (el.localName === 'caption') {
        const t = elements(elements(el).find((v) => v.localName === 'value') ?? el).find((x) => x.localName === 'text');
        if (t !== undefined) out.push({ som, key: 'caption', value: t.textContent ?? '' });
      }
      if (el.localName === 'items') out.push({ som, key: `items:${el.getAttribute('save') === '1' ? 'save' : 'display'}`, value: elements(el).map((x) => x.textContent ?? '').join('|') });
      if (!CONTAINERS.has(el.localName ?? '')) continue;
      const name = el.getAttribute('name') ?? '';
      const index = seen.get(name) ?? 0;
      seen.set(name, index + 1);
      visit(el, `${som === '' ? '' : `${som}.`}${name}[${index}]`);
    }
  };
  visit(form1, '');
  return out;
}

describe.each(FORM_CASES)('form packet checksum on real form $file', (c: FormCase) => {
  it('our checksum reproduces the one stored in the blank form', async () => {
    const pdf = await corpusPdf(c.file);
    expect(computed(pdf)).toBe(checksumOf(pdf));
  });

  it('fill, Validate, save: the datasets and form packets change together, the checksum verifies, and the reopened form restores the UI state and validates again', async () => {
    const source = await corpusPdf(c.file);
    const outcome = await filledOutcome(c);
    expect(outcome.validated.complete).toBe(true);
    const saved = await openXfaPdf(await outcome.session.runtime.save());
    for (const p of source.packets) {
      if (p.name === 'datasets' || p.name === 'form') continue;
      expect(Buffer.compare(saved.packet(p.name).bytes, p.bytes), p.name).toBe(0);
    }
    expect(checksumOf(saved)).toBe(computed(saved));
    const before = outcome.session.runtime;
    const again = await loadedRuntime(saved, c.strict);
    const phone = 'Page2.ContactInformation.contact.PhoneNumbers.Phone';
    for (const som of [`${phone}.NANumber`, `${phone}.IntlNumber`]) {
      expect(again.getProperty(som, 'presence'), som).toBe(before.getProperty(som, 'presence'));
    }
    expect(again.getProperty(`${phone}.NANumber`, 'presence')).toBe('visible');
    const revalidated = again.validate(loadPack(c.form));
    expect(revalidated.firstMissingField, revalidated.messages[0]?.text).toBeNull();
    expect(revalidated.complete).toBe(true);
  });
});

/** Whitespace-only text nodes that sit beside elements (indentation), anywhere in a packet. */
function formattingWhitespace(xml: string): number {
  let count = 0;
  const visit = (el: Element): void => {
    const kids = Array.from(el.childNodes);
    const hasElements = kids.some((k) => k.nodeType === 1);
    for (const k of kids) {
      if (k.nodeType === 1) visit(k as Element);
      else if (hasElements && k.nodeType === 3 && (k.nodeValue ?? '').trim() === '') count += 1;
    }
  };
  const root = parseXml(xml).documentElement;
  if (root !== null) visit(root);
  return count;
}

describe.each(FORM_CASES)('saved datasets on real form $file', (c: FormCase) => {
  it('hold no formatting whitespace between elements, like every datasets packet the viewer writes (a list of values loaded by a script is stored without its indentation)', async () => {
    const blank = await corpusPdf(c.file);
    expect(formattingWhitespace(blank.packet('datasets').text())).toBe(0);
    const outcome = await filledOutcome(c);
    const saved = await openXfaPdf(await outcome.session.runtime.save());
    expect(formattingWhitespace(saved.packet('datasets').text())).toBe(0);
  });
});

describe('the viewer oracle (a form the desktop viewer saved)', () => {
  const oracle = (): Promise<XfaPdf> => openXfaPdf(new Uint8Array(readFileSync(oraclePath)));
  const strict = FORM_CASES.find((c) => c.form === ORACLE.form)?.strict ?? true;

  it('our checksum reproduces the checksum the viewer wrote; its datasets carry no formatting whitespace either', async () => {
    const pdf = await oracle();
    expect(computed(pdf)).toBe(checksumOf(pdf));
    expect(formattingWhitespace(pdf.packet('datasets').text())).toBe(0);
  });

  it('reloading the viewer-saved file restores the presence, access and mandatory state the viewer recorded', async () => {
    const pdf = await oracle();
    const runtime = await loadedRuntime(pdf, strict);
    const entries = stateEntries(pdf.packet('form').text()).filter((e) => e.key === 'presence' || e.key === 'access' || e.key === 'nullTest');
    expect(entries.length).toBeGreaterThan(100);
    const member = (key: string): string => (key === 'nullTest' ? 'mandatory' : key);
    const wrong = entries.filter((e) => String(runtime.getProperty(e.som, member(e.key))) !== e.value);
    expect(wrong).toEqual([]);
  });

  it('our form packet for that state carries every state-bearing entry the viewer wrote, with the same value', async () => {
    const pdf = await oracle();
    const runtime = await loadedRuntime(pdf, strict);
    const ours = new Map(stateEntries((await openXfaPdf(await runtime.save())).packet('form').text()).map((e) => [`${e.som}#${e.key}`, e.value]));
    const theirs = stateEntries(pdf.packet('form').text());
    const missing = theirs.filter((e) => ours.get(`${e.som}#${e.key}`) !== e.value);
    expect(missing).toEqual([]);
  });
});
