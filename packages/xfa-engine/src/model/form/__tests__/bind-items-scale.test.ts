import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom } from '../index.js';
import { datasetsXml, find } from './helpers.js';

describe('bindItems resolution scales with fields, not fields times list size (F2)', () => {
  it('2,000 fields each picking one of 100,000 sibling list entries merge in under 2 seconds (every field used to re-scan all 100,000)', () => {
    const FIELDS = 2_000;
    const ENTRIES = 100_000;
    const fields = Array.from(
      { length: FIELDS },
      (_, i) => `<field name="S${i}"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.LOV.G[${i * 50}]" labelRef="$" valueRef="$"/></field>`,
    ).join('');
    const lov = `<LOV>${Array.from({ length: ENTRIES }, (_, i) => `<G>t${i}</G>`).join('')}</LOV>`;
    const model = loadTemplate(tpl(fields));
    const datasets = parseXml(datasetsXml('<form1/>', lov));
    const started = performance.now();
    const dom = createFormDom(model, datasets);
    const elapsed = performance.now() - started;
    expect(find(dom, 'field', 'S7').childrenOfClass('items')[0]?.children[0]?.plainText).toBe('t350');
    expect(elapsed).toBeLessThan(2_000);
  }, 60_000);

  it('the same holds when the list sits under xfa:data, which the merge itself changes (L2-F4: these references used to bypass the index and take about 8 seconds)', () => {
    const FIELDS = 2_000;
    const ENTRIES = 100_000;
    const fields = Array.from(
      { length: FIELDS },
      (_, i) => `<field name="S${i}"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.data.G[${i * 50}]" labelRef="$" valueRef="$"/></field>`,
    ).join('');
    const data = `<form1/>${Array.from({ length: ENTRIES }, (_, i) => `<G>t${i}</G>`).join('')}`;
    const model = loadTemplate(tpl(fields));
    const datasets = parseXml(datasetsXml(data));
    const started = performance.now();
    const dom = createFormDom(model, datasets);
    const elapsed = performance.now() - started;
    expect(find(dom, 'field', 'S7').childrenOfClass('items')[0]?.children[0]?.plainText).toBe('t350');
    expect(elapsed).toBeLessThan(2_000);
  }, 60_000);

  it('30,000 fields whose bindItems read a name under xfa:data while the merge creates a data node for each merge in under 2 seconds (every creation used to drop the whole index of the parent: 16,000 fields took 7 s and 32,000 took 43 s)', () => {
    const FIELDS = 30_000;
    const fields = Array.from({ length: FIELDS }, (_, i) => `<field name="f${i}"><bindItems ref="xfa.datasets.data.form1.Z"/></field>`).join('');
    const model = loadTemplate(tpl(fields));
    const datasets = parseXml(datasetsXml('<form1/>'));
    const started = performance.now();
    const dom = createFormDom(model, datasets);
    const elapsed = performance.now() - started;
    expect(dom.root.children.length).toBeGreaterThanOrEqual(FIELDS);
    expect(elapsed).toBeLessThan(2_000);
  }, 180_000);

  it('a reference into xfa:data sees data created earlier in the merge when the name repeats, in document order, however far apart the repeats are', () => {
    // Fields S0..S39 create data nodes a0..a39, then the second pass creates a0..a39 again: each repeat is created far from its twin.
    const names = Array.from({ length: 40 }, (_, i) => `a${i}`);
    const make = (n: string): string => `<field name="${n}"><ui><textEdit/></ui><value><text>${n}</text></value></field>`;
    const pick = `<field name="Pick"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.data.form1.a7[*]" labelRef="$" valueRef="$"/></field>`;
    const body = `${names.map(make).join('')}${names.map(make).join('')}${pick}`;
    const dom = createFormDom(loadTemplate(tpl(body)), parseXml(datasetsXml('<form1/>')));
    expect(find(dom, 'field', 'Pick').childrenOfClass('items')[0]?.children.map((c) => c.plainText)).toEqual(['a7', 'a7']);
  });

  it('a reference into xfa:data sees data the merge created earlier in the same merge, not a stale index', () => {
    // `Src` is created (empty) by the merge before `Pick` reads it; the list under form1 grows as fields are merged.
    const body = `<field name="Src"><ui><textEdit/></ui><value><text>seed</text></value></field>
      <field name="Pick"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.data.form1.Src[*]" labelRef="$" valueRef="$"/></field>`;
    const dom = createFormDom(loadTemplate(tpl(body)), parseXml(datasetsXml('<form1/>')));
    expect(find(dom, 'field', 'Pick').childrenOfClass('items')[0]?.children.map((c) => c.plainText)).toEqual(['seed']);
  });

  it('fields with the same bindItems share one resolution: the labels and values are the same, in data order', () => {
    const one = `<bindItems ref="xfa.datasets.LOV.G[*]" labelRef="$" valueRef="v"/>`;
    const body = ['A', 'B'].map((n) => `<field name="${n}"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/>${one}</field>`).join('');
    const datasets = parseXml(datasetsXml('<form1/>', '<LOV><G v="1">x</G><G v="2">y</G></LOV>'));
    const dom = createFormDom(loadTemplate(tpl(body)), datasets);
    for (const name of ['A', 'B']) {
      const blocks = find(dom, 'field', name).childrenOfClass('items');
      expect(blocks.map((b) => b.children.map((c) => c.plainText))).toEqual([['x', 'y'], ['1', '2']]);
    }
  });
});
