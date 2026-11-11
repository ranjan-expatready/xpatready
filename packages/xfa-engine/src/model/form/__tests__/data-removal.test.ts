import { describe, expect, it } from 'vitest';
import { at, build, dataText, must, textField } from './helpers.js';

const XFA_DATA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

describe('removing or replacing xfa:data itself (F3)', () => {
  it('removing the xfa:data node re-merges: a later field write lands in the saved datasets under a fresh xfa:data (it used to be written to the detached old element and lost)', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>old</F></form1>');
    dom.call(dom.datasets.nodes, 'remove', [dom.data]);
    expect(at(dom, 'F').rawValue).toBeNull();
    at(dom, 'F').rawValue = 'new';
    expect(dataText(datasets)).toContain('<xfa:data><form1><F>new</F></form1></xfa:data>');
    expect(dataText(datasets)).not.toContain('old');
  });

  it('loadXML with overwrite on the datasets root, which replaces xfa:data, rebinds the form to the loaded data and later writes are saved', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>old</F></form1>');
    dom.call(dom.datasets, 'loadXML', [`<wrap><xfa:data xmlns:xfa="${XFA_DATA_NS}"><form1><F>fresh</F></form1></xfa:data></wrap>`, 1, 1]);
    expect(at(dom, 'F').rawValue).toBe('fresh');
    at(dom, 'F').rawValue = 'written';
    expect(dataText(datasets)).toContain('<F>written</F>');
    expect(dataText(datasets)).not.toContain('old');
  });

  it('loadXML with overwrite on the datasets root and nothing to replace xfa:data with still leaves a bound form: the data is recreated empty', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>old</F></form1>');
    dom.call(dom.datasets, 'loadXML', ['<empty/>', 1, 1]);
    expect(at(dom, 'F').rawValue).toBeNull();
    at(dom, 'F').rawValue = 'w';
    expect(dataText(datasets)).toContain('<xfa:data><form1><F>w</F></form1></xfa:data>');
    expect(must(dom.data.child('form1')).child('F')?.value).toBe('w');
  });

  it('removing a sibling of xfa:data (the list of values) still does not re-merge', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>', '<LOVFile><LOV/></LOVFile>');
    const merges = dom.mergeCount;
    dom.call(dom.datasets.nodes, 'remove', [must(dom.datasets.child('LOVFile'))]);
    expect(dom.mergeCount).toBe(merges);
  });
});
