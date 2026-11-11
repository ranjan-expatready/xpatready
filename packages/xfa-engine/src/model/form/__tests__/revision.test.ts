import { describe, expect, it } from 'vitest';
import { tpl } from '../../template/__tests__/helpers.js';
import { formChecksum, readSavedState } from '../../form-packet/index.js';
import { at, build, datasetsXml, dataAt, find, textField } from './helpers.js';

/**
 * `FormDom.revision` (W02-T09, plan decision PA-2): the number a layout is current against. It must move when a value, an
 * attribute, the node list or the data takes a new state, and stay put for a read or a write that changes nothing, because
 * `FormNode.structureVersion` does not see attribute or value writes.
 */
const FORM = `<subform name="S">${textField('F')}${textField('G')}</subform>`;
const DATA = '<form1><S><F>one</F><G/></S></form1>';

/** The revision after `change`, and whether it moved. */
function moved(read: () => number, change: () => void): boolean {
  const before = read();
  change();
  return read() !== before;
}

describe('FormDom.revision', () => {
  it('moves for a value written to a bound field, to its data node, and to a field with no data', () => {
    const { dom } = build(FORM + '<field name="U"><ui><textEdit/></ui></field>', DATA);
    const rev = (): number => dom.revision;
    expect(moved(rev, () => (at(dom, 'S.F').rawValue = 'two'))).toBe(true);
    expect(moved(rev, () => (dataAt(dom, 'S.F').value = 'three'))).toBe(true);
    expect(moved(rev, () => (at(dom, 'U').rawValue = 'x'))).toBe(true);
  });

  it('moves for an attribute that takes a new value (presence, a size), for a node listed or unlisted, and for the data DOM changing shape', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    const f = at(dom, 'S.F');
    expect(moved(rev, () => (f.presence = 'hidden'))).toBe(true);
    expect(moved(rev, () => f.setAttr('w', '10pt'))).toBe(true);
    const created = dom.createNode('field', 'N');
    expect(moved(rev, () => at(dom, 'S').appendNode(created))).toBe(true);
    expect(moved(rev, () => at(dom, 'S').removeNode(created))).toBe(true);
    expect(moved(rev, () => dom.data.nodes.append(dom.createDataNode('dataValue', 'Extra')))).toBe(true);
  });

  it('does not move for reads, for a write of the value or attribute already there, or for the creation of a detached node', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    const f = at(dom, 'S.F');
    f.presence = 'hidden';
    expect(moved(rev, () => [f.rawValue, f.presence, f.attr('w'), f.formattedValue, f.children.length, f.nodes.length].length)).toBe(false);
    expect(moved(rev, () => (f.rawValue = 'one'))).toBe(false);
    expect(moved(rev, () => (dataAt(dom, 'S.F').value = 'one'))).toBe(false);
    expect(moved(rev, () => (f.presence = 'hidden'))).toBe(false);
    expect(moved(rev, () => f.setAttr('presence', 'hidden'))).toBe(false);
    expect(moved(rev, () => dom.createNode('field', 'Detached'))).toBe(false);
  });

  it('does not move when a read creates the default of a property the template leaves out, but the first write below it does', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    const f = at(dom, 'S.F');
    expect(moved(rev, () => f.property('border'))).toBe(false);
    expect(moved(rev, () => f.property('caption'))).toBe(false);
    const border = f.property('border');
    expect(border).toBeDefined();
    expect(moved(rev, () => border?.setAttr('presence', 'hidden'))).toBe(true);
  });

  it('does not move for the read-only xfa.template view', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    expect(moved(rev, () => dom.template.children.length)).toBe(false);
  });

  it('a quiet subtree: writes below it do not move the revision, writes elsewhere and to the data still do, and the window closes', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    const s = at(dom, 'S');
    const f = at(dom, 'S.F');
    const outside = find(dom, 'subform', 'form1');
    expect(moved(rev, () => dom.withQuietSubtree(s, () => (f.presence = 'hidden')))).toBe(false);
    expect(f.presence).toBe('hidden');
    expect(moved(rev, () => dom.withQuietSubtree(f, () => at(dom, 'S.G').setAttr('w', '5pt')))).toBe(true);
    expect(moved(rev, () => dom.withQuietSubtree(s, () => (at(dom, 'S.G').rawValue = 'bound')))).toBe(true);
    expect(moved(rev, () => outside.setAttr('w', '99pt'))).toBe(true);
    expect(moved(rev, () => (f.presence = 'visible'))).toBe(true);
  });

  it('a quiet window ends with an exception too, and nests', () => {
    const { dom } = build(FORM, DATA);
    const s = at(dom, 'S');
    const f = at(dom, 'S.F');
    expect(() =>
      dom.withQuietSubtree(s, () => {
        throw new Error('stop');
      }),
    ).toThrow('stop');
    const before = dom.revision;
    f.setAttr('w', '7pt');
    expect(dom.revision).not.toBe(before);
    dom.withQuietSubtree(s, () => dom.withQuietSubtree(f, () => undefined));
    const again = dom.revision;
    f.setAttr('w', '8pt');
    expect(dom.revision).not.toBe(again);
  });

  it('structureVersion alone misses what the revision sees: a value and an attribute write leave it where it was', () => {
    const { dom } = build(FORM, DATA);
    const f = at(dom, 'S.F');
    const structure = f.structureVersion;
    const before = dom.revision;
    f.rawValue = 'changed';
    f.setAttr('w', '3pt');
    expect(f.structureVersion).toBe(structure);
    expect(dom.revision).toBeGreaterThan(before);
  });
});

describe('FormDom.revision: nodes that are not in the form', () => {
  it('a created node, a removed node and an unlisted default move nothing when written; the append and the removal do, and a written default does', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    const created = dom.createNode('field', 'N');
    expect(moved(rev, () => (created.presence = 'hidden'))).toBe(false);
    expect(moved(rev, () => created.setPlainText('text'))).toBe(false);
    expect(moved(rev, () => at(dom, 'S').appendNode(created))).toBe(true);
    expect(moved(rev, () => (created.presence = 'visible'))).toBe(true);
    expect(moved(rev, () => at(dom, 'S').removeNode(created))).toBe(true);
    expect(moved(rev, () => (created.presence = 'hidden'))).toBe(false);
    // A subtree built off to the side: the whole of it is out of the form until it is appended.
    const group = dom.createNode('subform', 'Off');
    const inner = dom.createNode('field', 'In');
    group.appendNode(inner);
    expect(moved(rev, () => (inner.presence = 'hidden'))).toBe(false);
    expect(moved(rev, () => at(dom, 'S').appendNode(group))).toBe(true);
    expect(moved(rev, () => (inner.presence = 'visible'))).toBe(true);
  });
});

describe('FormDom.revision: the data DOM and the saved state', () => {
  const DATA_ATTR = '<form1 mark="a"><S><F>one</F><G/></S></form1>';

  it('an attribute of the data moves it when it takes a new value and not when it is written the same', () => {
    const { dom } = build(FORM, DATA_ATTR);
    const rev = (): number => dom.revision;
    const form1 = dom.data.child('form1');
    const mark = form1?.child('mark');
    expect(mark).toBeDefined();
    expect(moved(rev, () => mark !== undefined && (mark.value = 'b'))).toBe(true);
    expect(moved(rev, () => mark !== undefined && (mark.value = 'b'))).toBe(false);
  });

  it('loadXML, remerge and clearing the data root (the Clear button) move it', () => {
    const { dom } = build(FORM, DATA);
    const rev = (): number => dom.revision;
    expect(moved(rev, () => dom.call(dataAt(dom, 'S'), 'loadXML', ['<F>loaded</F>', 1, 0]))).toBe(true);
    expect(moved(rev, () => dom.remerge())).toBe(true);
    expect(moved(rev, () => dom.call(dom.datasets.nodes, 'remove', [dom.data]))).toBe(true);
    expect(at(dom, 'S.F').rawValue).toBeNull();
  });

  it('restoring a saved delta moves it when it changes the form and not when the form already holds the saved state', () => {
    const body = '<subform name="A"><field name="X"><ui><textEdit/></ui></field></subform>';
    const data = '<form1><A><X/></A></form1>';
    const { dom } = build(body, data);
    const template = new TextEncoder().encode(tpl(body));
    const datasets = new TextEncoder().encode(datasetsXml(data));
    const form = `<form checksum="${formChecksum([template, datasets])}" xmlns="http://www.xfa.org/schema/xfa-form/2.8/"><subform name="form1"><subform name="A" presence="hidden"/></subform></form>`;
    const saved = readSavedState(dom, { template, datasets, form });
    const delta = saved.deltas[0];
    expect(delta?.target).toBe('presence');
    const rev = (): number => dom.revision;
    expect(moved(rev, () => delta?.restore())).toBe(true);
    expect(at(dom, 'A').presence).toBe('hidden');
    expect(moved(rev, () => delta?.restore())).toBe(false);
  });
});

