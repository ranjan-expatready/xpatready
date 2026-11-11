import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom } from '../index.js';
import { at, datasetsXml, must } from './helpers.js';

const ITEMS = 100;
const lov = `<LOVFile><LOV><L>${Array.from({ length: ITEMS }, (_, i) => `<I lic="v${i}">L${i}</I>`).join('')}</L></LOV></LOVFile>`;
const choice = `<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOVFile.LOV.L.I[*]" labelRef="$" valueRef="lic"/></field>`;

describe('repeated remerge does not exhaust the node budget (F8)', () => {
  it('200 remerges of a form with a 100-item list of values stay inside a budget of 5,000 nodes (each used to register 200 new item nodes and run out after about 25)', () => {
    const datasets = parseXml(datasetsXml('<form1><Sel>v3</Sel></form1>', lov));
    const dom = createFormDom(loadTemplate(tpl(choice)), datasets, { limits: { maxNodes: 5_000 } });
    const sel = at(dom, 'Sel');
    for (let i = 0; i < 200; i += 1) dom.remerge();
    expect(sel.childrenOfClass('items').map((b) => b.children.length)).toEqual([ITEMS, ITEMS]);
    expect(sel.rawValue).toBe('v3');
    expect(sel.formattedValue).toBe('L3');
  });

  it('clearItems followed by remerge (the Clear sequence) is also steady: the removed bound items are reused', () => {
    const datasets = parseXml(datasetsXml('<form1/>', lov));
    const dom = createFormDom(loadTemplate(tpl(choice)), datasets, { limits: { maxNodes: 5_000 } });
    const sel = at(dom, 'Sel');
    for (let i = 0; i < 100; i += 1) {
      sel.clearItems();
      dom.remerge();
    }
    expect(sel.childrenOfClass('items').map((b) => b.children.length)).toEqual([ITEMS, ITEMS]);
  });

  it('a reused item shows the new text and is not a leftover of the previous fill', () => {
    const datasets = parseXml(datasetsXml('<form1/>', lov));
    const dom = createFormDom(loadTemplate(tpl(choice)), datasets);
    const sel = at(dom, 'Sel');
    const first = must(dom.datasets.child('LOVFile')?.child('LOV')?.child('L')?.children[0]);
    dom.set(must(first.child('lic')), 'value', 'changed');
    dom.remerge();
    expect(sel.boundItem('L0')).toBe('changed');
    expect(sel.childrenOfClass('items')[1]?.children[0]?.plainText).toBe('changed');
  });
});
