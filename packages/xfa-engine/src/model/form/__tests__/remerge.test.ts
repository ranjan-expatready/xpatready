import { describe, expect, it } from 'vitest';
import { at, build, dataText, expectForm, must, textField } from './helpers.js';

const LOV = '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>';
const choice = `<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOVFile.LOV.L.I[*]" labelRef="$" valueRef="lic"/></field>`;

describe('remerge and the Clear sequence (F2)', () => {
  it('removing the bound root data group re-merges automatically: fields rebind to fresh data and the saved datasets holds form1 again', () => {
    const { dom, datasets } = build(`${textField('F')}${choice}`, '<form1><F>keep</F><Sel>b</Sel></form1>', LOV);
    expect(at(dom, 'F').rawValue).toBe('keep');
    const form1 = must(dom.data.child('form1'));
    dom.call(dom.data.nodes, 'remove', [form1]);
    expect(at(dom, 'F').rawValue).toBeNull();
    expect(at(dom, 'Sel').rawValue).toBeNull();
    expect(dataText(datasets)).toContain('<xfa:data><form1><F/><Sel/></form1></xfa:data>');
    expect(at(dom, 'F').dataNode?.parent?.name).toBe('form1');
    expect(dom.data.child('form1')).not.toBe(form1);
  });

  it('bindItems lists are not duplicated by a re-merge, and the written items stay', () => {
    const { dom } = build(choice, '<form1><Sel>a</Sel></form1>', LOV);
    const sel = at(dom, 'Sel');
    const before = sel.childrenOfClass('items').map((i) => i.children.length);
    expect(before).toEqual([2, 2]);
    dom.remerge();
    dom.remerge();
    expect(sel.childrenOfClass('items').map((i) => i.children.length)).toEqual(before);
    expect(sel.rawValue).toBe('a');
    expect(sel.formattedValue).toBe('A');
  });

  it('remerge is the form member xfa.form.remerge(); data written before it is kept and unbound fields keep their own values', () => {
    const { dom, datasets } = build(`${textField('F')}<field name="U"><bind match="none"/><ui><textEdit/></ui></field>`, '<form1/>');
    at(dom, 'F').rawValue = 'x';
    at(dom, 'U').rawValue = 'local';
    expect(dom.get(dom.form, 'remerge')).toEqual({ kind: 'method' });
    expect(dom.call(dom.form, 'remerge', [])).toEqual({ kind: 'value', value: undefined });
    expect(at(dom, 'F').rawValue).toBe('x');
    expect(at(dom, 'U').rawValue).toBe('local');
    expect(dataText(datasets)).toContain('<form1><F>x</F></form1>');
  });

  it('removing a data node nothing is bound to (the list of values) does not re-merge and leaves the form untouched', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>', LOV);
    const file = must(dom.datasets.child('LOVFile'));
    const merges = dom.mergeCount;
    dom.call(dom.datasets.nodes, 'remove', [file]);
    expect(dom.mergeCount).toBe(merges);
    expect(at(dom, 'F').rawValue).toBe('v');
  });

  it('a stale node from before the removal is detached, and removing a non-child is still a typed error', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>');
    const form1 = must(dom.data.child('form1'));
    dom.call(dom.data.nodes, 'remove', [form1]);
    expectForm(() => dom.call(dom.data.nodes, 'remove', [form1]), 'INVALID_OPERATION');
  });
});
