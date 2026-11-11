import { describe, expect, it } from 'vitest';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { parseXml } from '../../../xml/parse.js';
import { serializeXml } from '../../../xml/serialize.js';
import { createFormDom } from '../index.js';
import { build, datasetsXml, expectForm, expectXfa, must, textField } from './helpers.js';

const XHTML = 'http://www.w3.org/1999/xhtml';
const XFA_DATA_NS = 'http://www.xfa.org/schema/xfa-data/1.0/';

describe('rich-text data values are refused at load, never half-merged (F4)', () => {
  it.each([
    ['an xfa:contentType attribute', '<form1><F xfa:contentType="text/html"><body xmlns="' + XHTML + '"><p>x</p></body></F></form1>'],
    ['an XHTML child element', '<form1><F><p xmlns="' + XHTML + '">x</p></F></form1>'],
    ['an xfa:contentType attribute on a value with text only', '<form1><F xfa:contentType="text/html">plain</F></form1>'],
  ])('a data value with %s is refused with UNSUPPORTED_FEATURE naming it, and the datasets are not touched (it used to be taken for a group and an empty duplicate F inserted)', (_what, data) => {
    const datasets = parseXml(datasetsXml(data));
    const before = serializeXml(datasets);
    expectXfa(() => createFormDom(loadTemplate(tpl(textField('F'))), datasets), 'UNSUPPORTED_FEATURE', /rich-text data value.*F/i);
    expect(serializeXml(datasets)).toBe(before);
  });

  it('with several rich values the first in document order is named, by its path', () => {
    const data = '<form1><F xfa:contentType="text/html">a</F><G xfa:contentType="text/html">b</G></form1>';
    const err = expectXfa(() => build(`${textField('F')}${textField('G')}`, data), 'UNSUPPORTED_FEATURE', /rich-text/);
    expect(err.message).toMatch(/datasets\.data\.form1\.F(?![\w.])/);
  });

  it('XHTML in a sibling of xfa:data (a list of values) no longer refuses the load, while the same markup inside xfa:data still does (M3)', () => {
    const rich = `<LOV><I xfa:contentType="text/html">x</I><p xmlns="${XHTML}">y</p></LOV>`;
    expect(() => build(textField('F'), '<form1/>', rich)).not.toThrow();
    expectXfa(() => build(textField('F'), '<form1><F><p xmlns="' + XHTML + '">y</p></F></form1>', rich), 'UNSUPPORTED_FEATURE', /rich-text/i);
  });

  it('loadXML of rich-text data into the form data is a catchable INVALID_ARGUMENT and loads nothing; into a list of values outside it, it is allowed', () => {
    const { dom } = build(textField('F'));
    const group = dom.createDataNode('dataGroup', 'G');
    dom.data.nodes.append(group);
    expectForm(() => dom.call(group, 'loadXML', [`<a xmlns:xfa="${XFA_DATA_NS}" xfa:contentType="text/html"><b/></a>`, 0, 1]), 'INVALID_ARGUMENT', /rich-text/i);
    expectForm(() => dom.call(group, 'loadXML', [`<a><p xmlns="${XHTML}">x</p></a>`, 0, 1]), 'INVALID_ARGUMENT', /rich-text/i);
    expect(must(group).children).toHaveLength(0);
    const lov = dom.createDataNode('dataGroup', 'LOVFile');
    dom.datasets.nodes.append(lov);
    expect(() => dom.call(lov, 'loadXML', [`<a><p xmlns="${XHTML}">x</p></a>`, 0, 1])).not.toThrow();
    expect(lov.children).toHaveLength(1);
  });
});

describe('moving rich text into the form data with nodes.append is refused like loading it (N2)', () => {
  const rich = `<LOV><item><p xmlns="${XHTML}">y</p></item><item xmlns:xfa="${XFA_DATA_NS}" xfa:contentType="text/html">z</item><plain>ok</plain></LOV>`;

  function withLov(): { dom: ReturnType<typeof build>['dom']; lov: ReturnType<ReturnType<typeof build>['dom']['createDataNode']> } {
    const { dom } = build(textField('F'));
    const lov = dom.createDataNode('dataGroup', 'LOVFile');
    dom.datasets.nodes.append(lov);
    dom.call(lov, 'loadXML', [rich, 0, 1]);
    return { dom, lov };
  }

  it('a data node holding XHTML or an xfa:contentType value cannot be appended to xfa:data or below it (INVALID_ARGUMENT, nothing moves); plain data can', () => {
    const { dom, lov } = withLov();
    const items = must(lov.child('LOV')).children;
    const [withXhtml, withType, plain] = [must(items[0]), must(items[1]), must(items[2])];
    const form1 = dom.createDataNode('dataGroup', 'form1x');
    dom.data.nodes.append(form1);
    const before = form1.children.length;
    expectForm(() => dom.call(dom.data.nodes, 'append', [must(must(lov.child('LOV')))]), 'INVALID_ARGUMENT', /rich-text/i);
    expectForm(() => dom.call(form1.nodes, 'append', [withXhtml]), 'INVALID_ARGUMENT', /rich-text/i);
    expectForm(() => dom.call(form1.nodes, 'append', [withType]), 'INVALID_ARGUMENT', /rich-text/i);
    expect(form1.children).toHaveLength(before);
    expect(withXhtml.parent?.name).toBe('LOV');
    dom.call(form1.nodes, 'append', [plain]);
    expect(form1.children.map((c) => c.name)).toEqual(['plain']);
  });

  it('the same nodes can move between lists of values outside xfa:data', () => {
    const { dom, lov } = withLov();
    const other = dom.createDataNode('dataGroup', 'Other');
    dom.datasets.nodes.append(other);
    const item = must(must(lov.child('LOV')).children[0]);
    expect(() => dom.call(other.nodes, 'append', [item])).not.toThrow();
    expect(other.children).toHaveLength(1);
  });
});
