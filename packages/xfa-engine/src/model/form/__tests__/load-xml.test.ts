import { describe, expect, it } from 'vitest';
import { DataNode } from '../index.js';
import { at, build, dataText, expectForm, must, textField } from './helpers.js';

const LOV_XML = '<LOV generated="x"><L><I lic="a">A</I><I lic="b">B</I></L></LOV>';

function lovFile(dom: ReturnType<typeof build>['dom']): DataNode {
  const group = dom.createDataNode('dataGroup', 'LOVFile');
  dom.datasets.nodes.append(group);
  return group;
}

describe('loadXML on a data group (F1a)', () => {
  it('ignoreRoot 0 imports the root element itself and overwrite 1 first clears the node, which is how the form library attaches its list of values', () => {
    const { dom, datasets } = build(textField('F'));
    const file = lovFile(dom);
    expect(dom.call(file, 'loadXML', [LOV_XML, 0, 1])).toEqual({ kind: 'value', value: undefined });
    expect(file.children.map((c) => c.name)).toEqual(['LOV']);
    expect(dataText(datasets)).toContain('<LOVFile xfa:dataNode="dataGroup"><LOV generated="x"><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>');
    dom.call(file, 'loadXML', ['<LOV><Z/></LOV>', 0, 1]);
    expect(file.children.map((c) => c.children.map((k) => k.name))).toEqual([['Z']]);
  });

  it('ignoreRoot 1 imports the children of the root, and overwrite 0 appends after what is there', () => {
    const { dom } = build(textField('F'));
    const file = lovFile(dom);
    dom.call(file, 'loadXML', ['<wrap><A/><B/></wrap>', 1, 1]);
    expect(file.children.map((c) => c.name)).toEqual(['A', 'B']);
    dom.call(file, 'loadXML', ['<wrap><C/></wrap>', true, false]);
    expect(file.children.map((c) => c.name)).toEqual(['A', 'B', 'C']);
  });

  it('the imported nodes are owned by the datasets document and wrap as data nodes (a node of the parsed document must not leak in)', () => {
    const { dom, datasets } = build(textField('F'));
    const file = lovFile(dom);
    dom.call(file, 'loadXML', [LOV_XML, 0, 1]);
    const item = must(file.child('LOV')?.child('L')?.nodes.item(1));
    expect(item instanceof DataNode && item.element.ownerDocument).toBe(datasets);
    expect(item instanceof DataNode && item.child('lic')?.value).toBe('b');
  });

  it('malformed XML, a DOCTYPE, a non-string, an oversized string and a data value target are typed errors a script can catch', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>');
    const file = lovFile(dom);
    expectForm(() => dom.call(file, 'loadXML', ['<a><b></a>', 0, 1]), 'INVALID_ARGUMENT');
    expectForm(() => dom.call(file, 'loadXML', ['<!DOCTYPE a [<!ENTITY x "y">]><a>&x;</a>', 0, 1]), 'INVALID_ARGUMENT');
    expectForm(() => dom.call(file, 'loadXML', [42, 0, 1]), 'INVALID_ARGUMENT');
    expectForm(() => dom.call(file, 'loadXML', ['<a/>', {}, 1]), 'INVALID_ARGUMENT');
    expectForm(() => dom.call(file, 'loadXML', [`<a>${'x'.repeat(4 * 1024 * 1024)}</a>`, 0, 1]), 'LIMIT');
    const value = must(dom.data.child('form1')?.child('F'));
    expectForm(() => dom.call(value, 'loadXML', ['<a/>', 0, 1]), 'INVALID_OPERATION');
    expect(file.children).toHaveLength(0);
  });

  it('total loaded text is bounded over a run (a loop of loadXML calls cannot grow the data without limit)', () => {
    const { dom } = build(textField('F'));
    const file = lovFile(dom);
    const big = `<a>${'x'.repeat(3 * 1024 * 1024)}</a>`;
    expectForm(() => {
      for (let i = 0; i < 100; i += 1) dom.call(file, 'loadXML', [big, 0, 0]);
    }, 'LIMIT');
  });

  it('overwriting data that fields are bound to rebinds them to the new nodes (the saved data and the form must agree)', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>old</F></form1>');
    const data = dom.data;
    dom.call(data, 'loadXML', ['<form1><F>new</F></form1>', 0, 1]);
    expect(at(dom, 'F').rawValue).toBe('new');
    expect(dataText(datasets)).toContain('<xfa:data><form1><F>new</F></form1></xfa:data>');
  });
});

describe('variables are transparent for named lookup (F1b)', () => {
  const body = `<variables><script name="LOV" contentType="application/x-javascript">${'&lt;LOV/&gt;'}</script><text name="flag">true</text></variables>${textField('F')}`;

  it('a script object and a text variable declared in variables resolve by name from the container, so form.nodes.item(0).LOV.value is the string', () => {
    const { dom } = build(body);
    const first = must(dom.form.nodes.item(0));
    expect(first).toBe(dom.root);
    const lov = dom.get(first, 'LOV');
    expect(lov.kind === 'value' && lov.value && typeof lov.value === 'object' && !Array.isArray(lov.value) && dom.get(lov.value as never, 'value')).toEqual({ kind: 'value', value: '<LOV/>' });
    const flag = dom.get(first, 'flag');
    expect(flag.kind).toBe('value');
    expect(dom.namedChildren(dom.root, 'flag')).toHaveLength(1);
  });

  it('a direct child wins over a variable of the same name, and unrelated names stay unsupported', () => {
    const { dom } = build(`<variables><text name="F">v</text></variables>${textField('F')}`);
    expect(dom.namedChildren(dom.root, 'F').map((n) => (n as { className: string }).className)).toEqual(['field', 'text']);
    expect(dom.get(dom.root, 'nothing')).toEqual({ kind: 'unsupported' });
  });
});
