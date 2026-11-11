import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../../pdf/errors.js';
import { MAX_XML_CHARS } from '../../../xml/limits.js';
import { parseXml } from '../../../xml/parse.js';
import { at, build, datasetsXml } from '../../form/__tests__/helpers.js';
import { FormNode } from '../../form/index.js';
import { resolveNode } from '../../som/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { captureItemsBaseline, formChecksum, formPacketText, readSavedState } from '../index.js';
import { buildFormPacket } from '../serialize.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const MIB = 1024 * 1024;

const CAPTIONED = (name: string): string =>
  `<field name="${name}"><ui><textEdit/></ui><caption><value><text>c</text></value></caption></field>`;

function textAt(from: FormNode, path: string): FormNode {
  const found = resolveNode(from, path);
  if (!(found instanceof FormNode)) throw new Error(`no form node ${path}`);
  return found;
}
const captionOf = (dom: ReturnType<typeof build>['dom'], field: string): FormNode => textAt(at(dom, field), 'caption.value.text');

/** A form whose fields have captions; `big` maps a field to the length of the `&` run its caption is set to. */
function scenario(names: readonly string[], big: Readonly<Record<string, number>>) {
  const body = names.map(CAPTIONED).join('');
  const { dom } = build(body);
  const baseline = captureItemsBaseline(dom);
  for (const name of names) at(dom, name).setAttr('presence', 'hidden');
  for (const [name, length] of Object.entries(big)) captionOf(dom, name).setPlainText('&'.repeat(length));
  return { body, dom, baseline, template: enc(tpl(body)), datasets: enc(datasetsXml('<form1/>')) };
}

describe('the form packet stays within the XML character ceiling the reader opens it under (L4-F1)', () => {
  it('a 4 MiB caption of "&" (20 MiB once escaped) is left out, the rest is written, and the packet is restorable', () => {
    const { body, dom, baseline, template, datasets } = scenario(['Small', 'Large'], { Large: 4 * MIB });
    const form = formPacketText(dom, template, datasets, baseline);
    expect(form.length).toBeLessThanOrEqual(MAX_XML_CHARS);
    expect(form).toContain('name="Large"');
    expect(form).not.toContain('&amp;&amp;');
    const state = readSavedState(build(body).dom, { template, datasets, form });
    expect(state.summary).toEqual({ status: 'restorable', deltas: 2, skipped: 0 });
    expect(state.deltas.map((d) => [d.container.name, d.target])).toEqual([
      ['Small', 'presence'],
      ['Large', 'presence'],
    ]);
  });

  it('several large captions: those that fit are written, the rest are left out, and the packet is within the ceiling', () => {
    // Each caption is 2 MiB of "&", 10 MiB escaped: one fits under 16 MiB, a second does not.
    const { body, dom, baseline, template, datasets } = scenario(['A', 'B', 'C', 'D'], { A: 2 * MIB, B: 2 * MIB, C: 2 * MIB });
    const form = formPacketText(dom, template, datasets, baseline);
    expect(form.length).toBeLessThanOrEqual(MAX_XML_CHARS);
    expect(form.split('&amp;').length - 1).toBe(2 * MIB);
    const state = readSavedState(build(body).dom, { template, datasets, form });
    expect(state.summary).toEqual({ status: 'restorable', deltas: 5, skipped: 0 });
  });

  it('under the budget the output is the same bytes whatever the character budget', () => {
    const { dom, baseline } = scenario(['A', 'B'], { A: 1000 });
    const checksum = 'k'.repeat(28);
    expect(buildFormPacket(dom, checksum, baseline)).toBe(buildFormPacket(dom, checksum, baseline, { maxChars: Number.MAX_SAFE_INTEGER }));
  });

  it('the packet written is never longer than the budget it is held to, and always one the reader keeps (every budget from the bare wrapper up)', () => {
    const body =
      '<variables><text name="note">n</text></variables>' +
      '<subform name="A"><field name="X"><ui><textEdit/></ui><caption><value><text>c</text></value></caption></field>' +
      '<field name="Pick"><ui><choiceList/></ui><items><text>old</text></items></field></subform>' +
      '<field name="Free"><ui><textEdit/></ui><bind match="none"/></field>';
    const data = '<form1><A><Pick/></A></form1>';
    const { dom } = build(body, data);
    const baseline = captureItemsBaseline(dom);
    at(dom, 'A').setAttr('presence', 'hidden');
    captionOf(dom, 'A.X').setPlainText('a < b & "c" > d\r\n');
    const pick = at(dom, 'A.Pick');
    pick.clearItems();
    for (let i = 0; i < 4; i += 1) pick.addItem(`l&${i}`, `v<${i}`);
    textAt(dom.root, 'note').setPlainText('N&');
    at(dom, 'Free').rawValue = 'free & clear';
    const template = enc(tpl(body));
    const datasets = enc(datasetsXml(data));
    const checksum = formChecksum([template, datasets]);
    const whole = buildFormPacket(dom, checksum, baseline);
    const wrapper = buildFormPacket(dom, checksum, baseline, { maxElements: 0 }).length;
    let smaller = 0;
    for (let maxChars = wrapper; maxChars <= whole.length + 1; maxChars += 1) {
      const form = buildFormPacket(dom, checksum, baseline, { maxChars });
      expect(form.length, `maxChars ${maxChars}`).toBeLessThanOrEqual(maxChars);
      const state = readSavedState(build(body, data).dom, { template, datasets, form });
      expect({ maxChars, status: state.summary.status, skipped: state.summary.skipped }).toEqual({ maxChars, status: 'restorable', skipped: 0 });
      if (form.length < whole.length) smaller += 1;
    }
    expect(smaller).toBeGreaterThan(0);
    // The budget that is exactly the whole packet writes all of it.
    expect(buildFormPacket(dom, checksum, baseline, { maxChars: whole.length })).toBe(whole);
  });

  it('the item lists count their escaped text: a pair that would pass the budget is left out whole', () => {
    const body = '<field name="Pick"><ui><choiceList/></ui><items><text>old</text></items></field>';
    const { dom } = build(body, '<form1><Pick/></form1>');
    const baseline = captureItemsBaseline(dom);
    const pick = at(dom, 'Pick');
    pick.clearItems();
    pick.addItem('&&&&&&&&', '<<<<<<<<');
    const checksum = 'p'.repeat(28);
    const whole = buildFormPacket(dom, checksum, baseline);
    expect(whole).toContain('&amp;&amp;');
    expect(buildFormPacket(dom, checksum, baseline, { maxChars: whole.length })).toBe(whole);
    const short = buildFormPacket(dom, checksum, baseline, { maxChars: whole.length - 1 });
    expect(short).not.toContain('<items');
    expect(short.length).toBeLessThanOrEqual(whole.length - 1);
  });

  it('if the packet written still cannot be re-read, a bare packet with a checksum that verifies is returned instead of failing the save', () => {
    const { body, dom, baseline, template, datasets } = scenario(['Small', 'Large'], { Large: 4 * MIB });
    // A budget past the reader's ceiling is what a miscount would look like: the writer keeps the 20 MiB caption.
    expect(() => parseXml(buildFormPacket(dom, 'x'.repeat(28), baseline, { maxChars: Number.MAX_SAFE_INTEGER }))).toThrow(XfaPdfError);
    const form = formPacketText(dom, template, datasets, baseline, { maxChars: Number.MAX_SAFE_INTEGER });
    expect(form.length).toBeLessThan(1024);
    expect(form).toContain(`checksum="${formChecksum([template, datasets])}"`);
    const state = readSavedState(build(body).dom, { template, datasets, form });
    expect(state.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 0 });
  });
});
