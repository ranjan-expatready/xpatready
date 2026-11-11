import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import type { LaidOutForm } from '../../layout/paginate/index.js';
import type { LaidOutText } from '../../layout/text/index.js';
import type { FormNode } from '../../model/form/index.js';
import { layoutAccessOf } from '../../runtime/layout-access.js';
import type { FormRuntime } from '../../runtime/options.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';
import { loadFixture } from '../fixtures/form-data/apply.js';
import { packetPageAreas, SUBJECTS, type Subject } from './acrobat-copies.js';
import { filledOutcome, FORM_CASES, NOON_UTC, TEST_HOST } from './form-cases.js';

/**
 * Real `xfa.layout`, `ready:$layout` and per-page master values on the real forms (W02-T09).
 *
 * The oracle is the PDF itself. The `form` packet Acrobat saved holds, for every page instance, the master-page fields as
 * Acrobat left them: `CurrentPage` and `PageCount` (written by the form's own `ready:$layout` scripts from
 * `xfa.layout.page(this)` and `xfa.layout.pageCount()`), and the header text fields. The tests read those values from the
 * packet text alone and compare them with the values this engine's scripts left on each page instance. Nothing under test
 * produces an expectation. Needs `XFA_ACROBAT_DIR` (NOT EXECUTED without it, never a skip).
 */
interface PacketInstance {
  readonly pageArea: string;
  /** Field name to the values of the fields of that name on the instance, in document order; null for a field with no value. */
  readonly fields: ReadonlyMap<string, readonly (string | null)[]>;
}

/** The page instances of the saved `form` packet, with the value of every field on each, read with a plain DOM walk. */
function packetInstances(pdf: XfaPdf): PacketInstance[] {
  const packet = pdf.packets.find((p) => p.name === 'form');
  if (packet === undefined) throw new Error('the PDF has no form packet');
  const doc = parseXml(packet.text());
  const out: PacketInstance[] = [];
  const areas = doc.getElementsByTagName('pageArea');
  for (let i = 0; i < areas.length; i += 1) {
    const area = areas.item(i);
    if (area === null) continue;
    const fields = new Map<string, (string | null)[]>();
    const found = area.getElementsByTagName('field');
    for (let f = 0; f < found.length; f += 1) {
      const field = found.item(f);
      if (field === null) continue;
      const name = field.getAttribute('name') ?? '';
      // The field's own `value` child (a field nested in the field has none of this field's).
      const values = field.getElementsByTagName('value');
      let own: string | null = null;
      for (let v = 0; v < values.length; v += 1) if (values.item(v)?.parentNode === field) own = (values.item(v)?.textContent ?? '').trim();
      const text = own;
      fields.set(name, [...(fields.get(name) ?? []), text === '' ? null : text]);
    }
    out.push({ pageArea: area.getAttribute('name') ?? '', fields });
  }
  return out;
}

/** The values of the master fields of one page instance as this engine left them, by field name. */
function engineFields(laid: LaidOutForm, index: number): Map<string, (string | number | null)[]> {
  const out = new Map<string, (string | number | null)[]>();
  for (const [node, value] of laid.masterValues[index] ?? new Map<FormNode, string | number | null>()) out.set(node.name, [...(out.get(node.name) ?? []), value]);
  return out;
}

const textOf = (laid: LaidOutText | undefined): string => (laid?.lines ?? []).map((line) => line.runs.map((run) => run.text).join('')).join('\n');

/** The text of the master-page draws named `name` on page `index`, as laid out for that page instance. */
function masterText(laid: LaidOutForm, index: number, name: string): string[] {
  return (laid.pages[index]?.master?.texts ?? []).filter((entry) => entry.box.node.name === name).map((entry) => textOf(entry.value));
}

const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose();
});

interface Session {
  readonly pdf: XfaPdf;
  readonly runtime: FormRuntime;
  readonly packet: readonly PacketInstance[];
  readonly names: readonly string[];
}
const sessions = new Map<string, Promise<Session>>();
function sessionOf(subject: Subject): Promise<Session> {
  let found = sessions.get(subject.label);
  if (found === undefined) {
    found = (async () => {
      const pdf = await openXfaPdf(new Uint8Array(readFileSync(subject.path)));
      const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: false });
      runtimes.push(runtime);
      runtime.load();
      return { pdf, runtime, packet: packetInstances(pdf), names: packetPageAreas(pdf) };
    })();
    sessions.set(subject.label, found);
  }
  return found;
}

describe.each(SUBJECTS)('layout scripts on real form $label ($kind)', (subject) => {
  it('A1: the layout has the pages the form packet lists, settled after one pass, and every page is an instance of the page area the packet names', async () => {
    const { runtime, packet, names } = await sessionOf(subject);
    const laid = layoutAccessOf(runtime).layout();
    expect(packet.length).toBeGreaterThan(0);
    expect(laid.pages.map((p) => p.pageArea?.name)).toEqual(names);
    expect(laid.pages.map((p) => p.pageArea?.name)).toEqual(packet.map((p) => p.pageArea));
    expect(laid.settled).toBe(true);
    expect(laid.passes).toBe(1);
    expect(laid.truncated).toBe(false);
    console.info(`[layout-scripts] ${subject.label} (${subject.kind}): ${laid.pages.length} pages, settled in ${laid.passes} pass, ${laid.issues.length} layout issues`);
  });

  it('A1: xfa.layout.page(this) and pageCount() as the form\'s own ready:$layout scripts see them, per page instance, equal the CurrentPage and PageCount Acrobat saved on that instance', async () => {
    const { runtime, packet } = await sessionOf(subject);
    const laid = layoutAccessOf(runtime).layout();
    expect(laid.masterValues).toHaveLength(packet.length);
    const rows: string[] = [];
    packet.forEach((instance, index) => {
      const ours = engineFields(laid, index);
      for (const name of ['CurrentPage', 'PageCount']) {
        const expected = (instance.fields.get(name) ?? []).map(Number);
        expect(expected, `${name} is on instance ${index + 1} of the form packet`).not.toEqual([]);
        expect((ours.get(name) ?? []).map(Number), `${name} on page ${index + 1}`).toEqual(expected);
      }
      rows.push(`p${index + 1}: CurrentPage ${String(ours.get('CurrentPage')?.[0])}, PageCount ${String(ours.get('PageCount')?.[0])}`);
    });
    console.info(`[layout-scripts] ${subject.label}: ${rows.join('; ')}`);
  });

  it('the header texts: a blank form has none, as saved; the filled copy has the CRC Acrobat saved on every page instance', async () => {
    const { runtime, pdf, packet } = await sessionOf(subject);
    if (subject.kind === 'validated') return;
    const laid = layoutAccessOf(runtime).layout();
    const crc = (parseXml(pdf.packet('datasets').text()).getElementsByTagName('CRCNum').item(0)?.textContent ?? '').trim();
    packet.forEach((instance, index) => {
      const ours = (engineFields(laid, index).get('TextField') ?? []).filter((v) => v !== null && v !== '').map(String);
      const saved = (instance.fields.get('TextField') ?? []).filter((v): v is string => v !== null);
      if (subject.kind === 'blank') {
        expect(saved, `Acrobat saved no header text on the blank form (page ${index + 1})`).toEqual([]);
        expect(ours, `the blank form has no header text (page ${index + 1})`).toEqual([]);
        return;
      }
      expect(ours, `the CRC header on page ${index + 1}`).toContain(crc);
      expect(ours.filter((v) => v === saved[0]), `the CRC header of page ${index + 1} as Acrobat saved it`).toEqual(saved);
    });
  });

  // KNOWN PA-1 DEVIATION (W02-T09 tpcheck T09-F1; the owner decides at the W02-T13 side-by-side, item 6): on a form the owner
  // validated in Acrobat, Acrobat's saved header texts are NOT what the form's own ready:$layout scripts produce here. It
  // saved an empty name header and the CRC the form held when the layout last ran (older than the CRC its preSave then
  // wrote into the data); this engine fills the name header and the CRC from the data as it stands at load. Pinned so that
  // the difference is visible and changes only on purpose. Page numbers (CurrentPage / PageCount) are the parity claim, above.
  it('KNOWN DEVIATION: on the Adobe-validated copy Acrobat saved an empty name header and the older CRC; this engine fills the name and shows the CRC of the data', async () => {
    const { runtime, pdf, packet } = await sessionOf(subject);
    if (subject.kind !== 'validated') return;
    const laid = layoutAccessOf(runtime).layout();
    const crc = (parseXml(pdf.packet('datasets').text()).getElementsByTagName('CRCNum').item(0)?.textContent ?? '').trim();
    packet.forEach((instance, index) => {
      const ours = (engineFields(laid, index).get('TextField') ?? []).filter((v) => v !== null && v !== '').map(String);
      const saved = (instance.fields.get('TextField') ?? []).filter((v): v is string => v !== null);
      expect(saved, `Acrobat saved one header text, the old CRC (page ${index + 1})`).toHaveLength(1);
      expect(saved[0], `the CRC Acrobat saved is not the CRC in the saved data (page ${index + 1})`).not.toBe(crc);
      expect(ours, `this engine shows the CRC of the data (page ${index + 1})`).toContain(crc);
      expect(ours.length, `and a name header Acrobat left empty (page ${index + 1})`).toBeGreaterThan(saved.length);
      expect(ours).not.toEqual(saved);
    });
  });

  it('A1: the page numbers drawn through xfa:embed read "PAGE n OF N" on each page instance, N being the page count of the form packet', async () => {
    const { runtime, packet } = await sessionOf(subject);
    const laid = layoutAccessOf(runtime).layout();
    const total = packet.length;
    const drawn = packet.map((_, index) => masterText(laid, index, 'Pages'));
    packet.forEach((_, index) => {
      expect(drawn[index], `the Pages draw of page ${index + 1}`).toEqual([`PAGE ${index + 1} OF ${total}`]);
    });
    console.info(`[layout-scripts] ${subject.label}: embedded page numbers ${JSON.stringify(drawn.map((d) => d[0]))}`);
  });

  it('is current after load and stays so while nothing is written: asking again does not lay the form out again (same layout object, same revision)', async () => {
    const { runtime } = await sessionOf(subject);
    const access = layoutAccessOf(runtime);
    const first = access.layout();
    expect(access.layout()).toBe(first);
    expect(first.revision).toBe(access.dom.revision);
  });
});

describe.each(SUBJECTS.filter((s) => s.kind === 'blank'))('re-layout on the blank form $label', (subject) => {
  it('a write that changes nothing is not a re-layout; a write that changes a value the master pages show lays the form out again and runs ready:$layout again on every page instance, within the pass bound', async () => {
    const { runtime, packet } = await sessionOf(subject);
    const access = layoutAccessOf(runtime);
    const family = 'Page1.PersonalDetails.Name.FamilyName';
    const before = access.layout();
    runtime.setValue(family, runtime.getValue(family));
    expect(access.layout()).toBe(before);
    runtime.setValue(family, 'Testname');
    const after = access.layout();
    expect(after).not.toBe(before);
    expect(after.revision).toBe(access.dom.revision);
    expect(after.revision).toBeGreaterThan(before.revision);
    expect(after.pages).toHaveLength(packet.length);
    expect(after.settled).toBe(true);
    expect(after.passes).toBeLessThanOrEqual(2);
    // The header text the master page's own script builds from the name is now on every page instance.
    for (let index = 0; index < packet.length; index += 1) expect(engineFields(after, index).get('TextField')?.[0]).toBe('Testname');
    console.info(`[layout-scripts] ${subject.label}: one value write -> ${after.passes} pass, header TextField "Testname" on all ${packet.length} page instances`);
  });
});

describe('A3: the form\'s own Validate on the synthetic person: the barcode page appears and the page numbers follow', () => {
  it.each(FORM_CASES)('$file: the validated blank form has the page count of the Acrobat-validated copy, and PAGE n OF N on every page', async (c) => {
    const validatedCopy = SUBJECTS.find((s) => s.kind === 'validated' && s.label.startsWith(c.file.slice(0, 7)));
    if (validatedCopy === undefined) throw new Error(`NOT EXECUTED: no Acrobat-validated copy for ${c.file}`);
    const oracle = await sessionOf(validatedCopy);
    const { session, validated } = await filledOutcome(c);
    expect(validated.complete).toBe(true);
    const laid = layoutAccessOf(session.runtime).layout();
    expect(laid.pages.map((p) => p.pageArea?.name)).toEqual(oracle.names);
    expect(laid.settled).toBe(true);
    const total = oracle.packet.length;
    const numbers = laid.pages.map((_, index) => masterText(laid, index, 'Pages')[0]);
    expect(numbers).toEqual(oracle.packet.map((_, index) => `PAGE ${index + 1} OF ${total}`));
    // CurrentPage / PageCount on each instance equal what Acrobat saved on the validated copy.
    oracle.packet.forEach((instance, index) => {
      const ours = engineFields(laid, index);
      for (const name of ['CurrentPage', 'PageCount']) expect((ours.get(name) ?? []).map(Number), `${name} on page ${index + 1}`).toEqual((instance.fields.get(name) ?? []).map(Number));
    });
    const fixture = loadFixture(c.form);
    console.info(`[layout-scripts] ${c.file}: synthetic person (${Object.keys(fixture).length} fixture keys) validated -> ${laid.pages.length} pages (Acrobat-validated copy ${oracle.packet.length}); ${JSON.stringify(numbers)}; passes ${laid.passes}`);
  });
});
