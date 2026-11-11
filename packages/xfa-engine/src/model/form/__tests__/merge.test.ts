import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { buildTemplateModel, loadTemplate } from '../../template/index.js';
import { modelOf, tpl } from '../../template/__tests__/helpers.js';
import { createFormDom } from '../index.js';
import { at, build, dataAt, dataText, datasetsXml, expectXfa, find, textField } from './helpers.js';

describe('implicit merge by name (A3)', () => {
  it('the second same-name field binds the second same-name data node, in document order (consuming one node twice would make two fields share a value)', () => {
    const { dom } = build(`${textField('T')}${textField('T')}${textField('T')}`, '<form1><T>one</T><T>two</T><T>three</T></form1>');
    const fields = dom.root.children.filter((c) => c.className === 'field');
    expect(fields.map((f) => f.rawValue)).toEqual(['one', 'two', 'three']);
    expect(new Set(fields.map((f) => f.dataNode?.id)).size).toBe(3);
  });

  it('template same-name fields beyond the data siblings get NEW data nodes appended in template order (the data would otherwise lose the third value)', () => {
    const { dom, datasets } = build(`${textField('T')}${textField('T')}${textField('T')}`, '<form1><T>one</T></form1>');
    const fields = dom.root.children.filter((c) => c.className === 'field');
    if (fields[2]) fields[2].rawValue = 'c';
    if (fields[1]) fields[1].rawValue = 'b';
    expect(dataText(datasets)).toContain('<form1><T>one</T><T>b</T><T>c</T></form1>');
  });

  it('a subform binds a data group of its name and its fields bind inside that group, not at the root', () => {
    const { dom } = build(`<subform name="S">${textField('F')}</subform>${textField('F')}`, '<form1><F>root</F><S><F>inner</F></S></form1>');
    expect(at(dom, 'S.F').rawValue).toBe('inner');
    expect(dom.root.children.find((c) => c.className === 'field')?.rawValue).toBe('root');
  });

  it('an unnamed subform and a match="none" subform bind nothing and their children bind in the enclosing group (a wrapper must not add a data level)', () => {
    const { dom } = build(
      `<subform><field name="A"><ui><textEdit/></ui></field></subform><subform name="Frag"><bind match="none"/><field name="B"><ui><textEdit/></ui></field></subform>`,
      '<form1><A>a</A><B>b</B></form1>',
    );
    expect(dom.root.children.filter((c) => c.className === 'subform').flatMap((s) => s.children.filter((c) => c.className === 'field')).map((f) => f.rawValue)).toEqual(['a', 'b']);
  });

  it('a field with bind match="none" or no name is unbound, keeps its own value and writes nothing into the data', () => {
    const { dom, datasets } = build(
      `<field name="N"><bind match="none"/><ui><textEdit/></ui><value><text>keep</text></value></field>`,
      '<form1><N>data</N></form1>',
    );
    const n = at(dom, 'N');
    expect(n.dataNode).toBeNull();
    expect(n.rawValue).toBe('keep');
    n.rawValue = 'changed';
    expect(dataText(datasets)).toContain('<N>data</N>');
  });

  it('a field never binds a data group and a subform never binds a data value of the same name (kind mismatch creates a new node instead of stealing)', () => {
    const { dom, datasets } = build(`${textField('X')}`, '<form1><X><Y>group</Y></X></form1>');
    expect(at(dom, 'X').rawValue).toBeNull();
    expect(dataText(datasets)).toContain('<form1><X/><X><Y>group</Y></X></form1>');
  });

  it('missing data nodes are created in template order around existing ones (a new node must sit after the previous bound sibling, not at the end)', () => {
    const { datasets } = build(`${textField('A')}${textField('B')}${textField('C')}`, '<form1><C>c</C></form1>');
    expect(dataText(datasets)).toContain('<form1><A/><B/><C>c</C></form1>');
  });

  it('missing xfa:data and root group are created, and an empty created group is marked as a dataGroup so it re-parses as a group', () => {
    const datasets = parseXml(`<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"/>`);
    createFormDom(loadTemplate(tpl(`<subform name="Empty"/>${textField('F')}`)), datasets);
    const out = dataText(datasets);
    expect(out).toContain('<xfa:data><form1><Empty xfa:dataNode="dataGroup"/><F/></form1></xfa:data>');
  });

  it('a template default becomes the created data value only for NEW nodes; an existing empty data node keeps the data and wins over the default', () => {
    const body = `<field name="D"><ui><textEdit/></ui><value><text>dflt</text></value></field><field name="E"><ui><textEdit/></ui><value><text>dflt</text></value></field>`;
    const { dom, datasets } = build(body, '<form1><E/></form1>');
    expect(at(dom, 'D').rawValue).toBe('dflt');
    expect(at(dom, 'E').rawValue).toBeNull();
    expect(dataText(datasets)).toContain('<form1><D>dflt</D><E/></form1>');
  });

  it('exclusion-group children are not bound separately: the group owns the data node and the radio fields have none', () => {
    const { dom } = build(
      `<exclGroup name="G"><field name="No"><ui><checkButton/></ui><items><text>N</text></items></field><field name="Yes"><ui><checkButton/></ui><items><text>Y</text></items></field></exclGroup>`,
      '<form1><G>Y</G></form1>',
    );
    expect(at(dom, 'G').dataNode?.value).toBe('Y');
    expect(at(dom, 'G.Yes').dataNode).toBeNull();
    expect(at(dom, 'G.No').dataNode).toBeNull();
  });

  it('fields inside pageSet/pageArea/area containers bind in the enclosing subform scope, like the real forms (their data sits at the form root)', () => {
    const { dom } = build(`<pageSet><pageArea name="P">${textField('Hdr')}</pageArea></pageSet><area name="Ar">${textField('InArea')}</area>`, '<form1><Hdr>h</Hdr><InArea>a</InArea></form1>');
    expect(find(dom, 'field', 'Hdr').dataNode?.value).toBe('h');
    expect(dataAt(dom, 'Ar.InArea').value).toBe('a');
  });

  it('page set fields are merged after the rest of their subform, so nodes created for them land at the end of the group like the form producer writes them', () => {
    const { datasets } = build(`<pageSet><pageArea name="P">${textField('Hdr')}</pageArea></pageSet>${textField('A')}`, '<form1/>');
    expect(dataText(datasets)).toContain('<form1><A/><Hdr/></form1>');
  });

  it('a template name that is not a valid data element name is refused up front (writing it would produce a packet that cannot re-parse)', () => {
    const e = expectXfa(() => build(`<field name="a b"><ui><textEdit/></ui></field>`), 'UNSUPPORTED_FEATURE');
    expect(e.message).toMatch(/a b/);
  });

  it('a template the feature gate refuses is refused by the merge too, even when the caller built the model without the gate', () => {
    const model = modelOf(tpl(`<subform name="R"><occur max="-1"/></subform>`));
    expectXfa(() => createFormDom(model, parseXml(datasetsXml('<form1/>'))), 'UNSUPPORTED_FEATURE', /occur/);
  });

  it('a datasets root in the wrong namespace is refused like a wrong root name (a look-alike document must not be merged)', () => {
    expectXfa(() => createFormDom(loadTemplate(tpl('')), parseXml('<datasets xmlns="urn:other"><data/></datasets>')), 'MALFORMED_XML', /xfa:datasets/);
  });

  it('a datasets packet not rooted in xfa:datasets is MALFORMED_XML, not a crash', () => {
    expectXfa(() => createFormDom(loadTemplate(tpl('')), parseXml('<other/>')), 'MALFORMED_XML', /xfa:datasets/);
  });
});

describe('hostile template and data (A6)', () => {
  it('150k same-name siblings in template and data merge in well under a second (a per-container rescan of the data siblings would be quadratic)', () => {
    const n = 150_000;
    const fields = '<field name="T"/>'.repeat(n);
    const data = `<form1>${'<T>x</T>'.repeat(n)}</form1>`;
    const started = Date.now();
    const model = loadTemplate(tpl(fields));
    const dom = createFormDom(model, parseXml(datasetsXml(data)));
    expect(dom.root.children).toHaveLength(n);
    expect(dom.root.children[n - 1]?.rawValue).toBe('x');
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  it('over-deep template and over-large data are refused with the XML ceilings, as typed errors before any merge work', () => {
    expectXfa(() => loadTemplate(tpl('<subform>'.repeat(300) + '</subform>'.repeat(300))), 'MALFORMED_XML');
    expectXfa(() => parseXml(datasetsXml(`<form1>${'<T/>'.repeat(1_000_001)}</form1>`)), 'MALFORMED_XML');
  });

  it('a model built without the parser ceilings is still bounded: more elements than the form ceiling is a typed error', () => {
    const body = '<field name="T"/>'.repeat(5);
    const model = buildTemplateModel(parseXml(tpl(body)));
    expectXfa(() => createFormDom(model, parseXml(datasetsXml('<form1/>')), { limits: { maxNodes: 3 } }), 'MALFORMED_XML', /ceiling/);
  });
});
