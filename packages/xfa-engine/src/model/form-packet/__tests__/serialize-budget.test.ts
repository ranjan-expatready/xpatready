import { describe, expect, it } from 'vitest';
import { at, build, datasetsXml } from '../../form/__tests__/helpers.js';
import { FormNode } from '../../form/index.js';
import { resolveNode } from '../../som/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { captureItemsBaseline, formChecksum, formPacketText, MAX_SAVED_DELTAS, MAX_SAVED_ELEMENTS, readSavedState } from '../index.js';
import { buildFormPacket } from '../serialize.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const BODY =
  '<field name="Before"><ui><textEdit/></ui></field>' +
  '<field name="List"><ui><choiceList/></ui><items><text>A</text></items></field>' +
  '<field name="After"><ui><textEdit/></ui></field>';
const DATA = '<form1><List/></form1>';

function scenario(itemCount: number) {
  const { dom } = build(BODY, DATA);
  const baseline = captureItemsBaseline(dom);
  at(dom, 'Before').setAttr('presence', 'hidden');
  at(dom, 'After').setAttr('presence', 'invisible');
  const list = at(dom, 'List');
  list.clearItems();
  for (let i = 0; i < itemCount; i += 1) list.addItem(`label ${i}`, `v${i}`);
  const template = enc(tpl(BODY));
  const datasets = enc(datasetsXml(DATA));
  return { dom, baseline, template, datasets };
}

/** Writes the packet the engine would save, then reads it back the way a reopened form does. */
function roundTrip(itemCount: number) {
  const { dom, baseline, template, datasets } = scenario(itemCount);
  const form = formPacketText(dom, template, datasets, baseline);
  return { form, state: readSavedState(build(BODY, DATA).dom, { template, datasets, form }) };
}

describe('the form packet the engine writes is always one its own reader accepts (L3-F2)', () => {
  it('a field with 50,001 items (two lists, over the reader\'s whole-packet ceiling) is left out whole, and the rest of the packet is restorable', () => {
    const { form, state } = roundTrip(50_001);
    expect(form).not.toContain('<items');
    expect(state.summary).toEqual({ status: 'restorable', deltas: 2, skipped: 0 });
    expect(state.deltas.map((d) => [d.container.name, d.target, d.savedValue])).toEqual([
      ['Before', 'presence', 'hidden'],
      ['After', 'presence', 'invisible'],
    ]);
  }, 120_000);

  it('a field with 40,000 items is written and read back as before', () => {
    const { state } = roundTrip(40_000);
    expect(state.summary).toEqual({ status: 'restorable', deltas: 3, skipped: 0 });
    expect(state.deltas.find((d) => d.target === 'items')?.savedValue.split('\n')).toHaveLength(40_000);
  }, 120_000);

  it('the largest list that fits is written, and one more item leaves the whole pair out', () => {
    // Elements: the root subform (1), 3 field containers (3), and the two lists: 2 wrappers + 2 x items.
    const fixed = 1 + 3;
    const fitting = 20;
    const budget = fixed + 2 + 2 * fitting;
    const { dom, baseline, template, datasets } = scenario(fitting);
    const read = (form: string) => readSavedState(build(BODY, DATA).dom, { template, datasets, form }, { maxElements: budget });
    const written = buildFormPacket(dom, formChecksum([template, datasets]), baseline, { maxElements: budget });
    expect(read(written).summary).toEqual({ status: 'restorable', deltas: 3, skipped: 0 });
    at(dom, 'List').addItem('one more', 'more');
    const over = buildFormPacket(dom, formChecksum([template, datasets]), baseline, { maxElements: budget });
    expect(over).not.toContain('<items');
    expect(read(over).summary).toEqual({ status: 'restorable', deltas: 2, skipped: 0 });
  });

  it('a container that no longer fits is left out with its subtree, and later siblings that do fit are still written', () => {
    const body = '<subform name="A"><field name="X"><ui><textEdit/></ui></field></subform><subform name="B"><field name="Y"><ui><textEdit/></ui></field></subform>';
    const { dom } = build(body, '<form1/>');
    const baseline = captureItemsBaseline(dom);
    at(dom, 'A.X').setAttr('presence', 'hidden');
    at(dom, 'B').setAttr('presence', 'invisible');
    // Root (1) + instanceManager and subform B (2) fit in 3; A's instanceManager, subform and field would be 3 more.
    const text = buildFormPacket(dom, 'x'.repeat(28), baseline, { maxElements: 3 });
    expect(text).not.toContain('name="A"');
    expect(text).toContain('name="B"');
    expect(buildFormPacket(dom, 'x'.repeat(28), baseline, { maxElements: 6 })).toContain('name="X"');
  });

  it('under the ceiling the output does not depend on it: the default and an unlimited budget write the same bytes', () => {
    const { dom, baseline } = scenario(100);
    const checksum = 'y'.repeat(28);
    expect(buildFormPacket(dom, checksum, baseline)).toBe(buildFormPacket(dom, checksum, baseline, { maxElements: Number.MAX_SAFE_INTEGER, maxDeltas: Number.MAX_SAFE_INTEGER }));
  });

  it("the writer's defaults are the reader's ceilings", () => {
    const { dom, baseline } = scenario(100);
    const checksum = 'z'.repeat(28);
    expect(buildFormPacket(dom, checksum, baseline)).toBe(buildFormPacket(dom, checksum, baseline, { maxElements: MAX_SAVED_ELEMENTS, maxDeltas: MAX_SAVED_DELTAS }));
  });
});

/** Reads a packet written for `body`/`data` back against a fresh form, with the given reader ceilings. */
function readBack(body: string, data: string, form: (checksum: string) => string, limits?: { maxElements?: number; maxDeltas?: number }) {
  const template = enc(tpl(body));
  const datasets = enc(datasetsXml(data));
  return readSavedState(build(body, data).dom, { template, datasets, form: form(formChecksum([template, datasets])) }, limits);
}

describe('the form packet the engine writes stays within the reader\'s delta ceiling too (L3-F2)', () => {
  const FIELDS = MAX_SAVED_DELTAS + 1;
  const body = Array.from({ length: FIELDS }, (_, i) => `<field name="F${i}"><ui><textEdit/></ui></field>`).join('');

  it('20,001 changed fields are written as 20,000 deltas, the one past the budget left out whole, and the packet is restorable', () => {
    const { dom } = build(body, '<form1/>');
    const baseline = captureItemsBaseline(dom);
    for (let i = 0; i < FIELDS; i += 1) at(dom, `F${i}`).setAttr('presence', 'hidden');
    const form = formPacketText(dom, enc(tpl(body)), enc(datasetsXml('<form1/>')), baseline);
    const state = readBack(body, '<form1/>', () => form);
    expect(state.summary).toEqual({ status: 'restorable', deltas: MAX_SAVED_DELTAS, skipped: 0 });
    expect(form).toContain('name="F19999"');
    expect(form).not.toContain('name="F20000"');
  }, 120_000);

  it('20,000 changed fields (exactly the ceiling) are all written', () => {
    const { dom } = build(body, '<form1/>');
    const baseline = captureItemsBaseline(dom);
    for (let i = 0; i < MAX_SAVED_DELTAS; i += 1) at(dom, `F${i}`).setAttr('presence', 'hidden');
    const form = buildFormPacket(dom, formChecksum([enc(tpl(body)), enc(datasetsXml('<form1/>'))]), baseline);
    expect(readBack(body, '<form1/>', () => form).summary).toEqual({ status: 'restorable', deltas: MAX_SAVED_DELTAS, skipped: 0 });
  }, 120_000);
});

describe('whatever budget the writer is held to, what it writes reads back as restorable under the same ceilings (L3-F2)', () => {
  const FORM =
    '<variables><text name="note">n</text><text name="flag">f</text></variables>' +
    '<subform name="A"><field name="X"><ui><textEdit/></ui><caption><value><text>c</text></value></caption></field>' +
    '<field name="Pick"><ui><choiceList/></ui><items><text>old</text></items></field>' +
    '<subform name="Inner"><field name="Y"><ui><textEdit/></ui><border><edge/></border></field></subform></subform>' +
    '<field name="Free"><ui><textEdit/></ui><bind match="none"/></field>' +
    '<field name="Bound"><ui><textEdit/></ui></field>';
  const DATA_ = '<form1><A><Pick/></A><Bound/></form1>';

  function changed() {
    const { dom } = build(FORM, DATA_);
    const baseline = captureItemsBaseline(dom);
    const nodeAt = (from: string, path: string): FormNode => {
      const found = resolveNode(from === '' ? dom.root : at(dom, from), path);
      if (!(found instanceof FormNode)) throw new Error(`no form node ${path}`);
      return found;
    };
    at(dom, 'A').setAttr('presence', 'hidden');
    at(dom, 'A.X').setAttr('access', 'readOnly');
    nodeAt('A.X', 'caption.value.text').setPlainText('changed');
    const pick = at(dom, 'A.Pick');
    pick.clearItems();
    for (let i = 0; i < 6; i += 1) pick.addItem(`l${i}`, `v${i}`);
    at(dom, 'A.Inner').setAttr('presence', 'invisible');
    nodeAt('A.Inner.Y', 'border.edge').setAttr('thickness', '2mm');
    nodeAt('', 'note').setPlainText('N');
    at(dom, 'Free').rawValue = 'free';
    at(dom, 'Bound').rawValue = 'bound';
    return { dom, baseline };
  }

  it('every combination of a small element budget and a small delta budget gives a packet its reader keeps and reads without skipping anything', () => {
    const { dom, baseline } = changed();
    const checksum = formChecksum([enc(tpl(FORM)), enc(datasetsXml(DATA_))]);
    let fullDeltas = 0;
    for (let maxElements = 0; maxElements <= 40; maxElements += 1) {
      for (let maxDeltas = 0; maxDeltas <= 12; maxDeltas += 1) {
        const form = buildFormPacket(dom, checksum, baseline, { maxElements, maxDeltas });
        const state = readBack(FORM, DATA_, () => form, { maxElements, maxDeltas });
        expect({ maxElements, maxDeltas, status: state.summary.status, skipped: state.summary.skipped }).toEqual({ maxElements, maxDeltas, status: 'restorable', skipped: 0 });
        expect(state.summary.deltas).toBeLessThanOrEqual(maxDeltas);
        fullDeltas = Math.max(fullDeltas, state.summary.deltas);
      }
    }
    // The sweep reaches the whole form (so the smaller budgets really did leave things out), and the whole form is what the defaults write.
    // 9 deltas in all: 4 attributes, a caption text, the item lists, 2 text variables, an unbound value.
    expect(fullDeltas).toBe(9);
    expect(buildFormPacket(dom, checksum, baseline)).toBe(buildFormPacket(dom, checksum, baseline, { maxElements: 40, maxDeltas: 12 }));
  });
});
