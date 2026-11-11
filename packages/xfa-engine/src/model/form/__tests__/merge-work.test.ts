import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom } from '../index.js';
import { datasetsXml, expectForm, expectXfa, textField } from './helpers.js';

/**
 * "Two pass": pass 1 creates a data node per name; pass 2 has a field of each name again, which creates a second node far
 * from its twin, and reads that name through `bindItems`. Each read used to rescan every child of the parent.
 */
function twoPass(m: number): string {
  const first = Array.from({ length: m }, (_, i) => `<field name="N${i}"/>`).join('');
  const second = Array.from({ length: m }, (_, i) => `<field name="N${i}"><bindItems ref="xfa.datasets.data.form1.N${i}"/></field>`).join('');
  return first + second;
}

describe('the merge does a bounded amount of work however the template and data are shaped (N5)', () => {
  it('two-pass fields over 190,000 padding children fail closed with a typed load error in under 3 seconds (it took 98 s)', () => {
    const body = twoPass(2_000);
    const data = `<form1>${'<p/>'.repeat(190_000)}</form1>`;
    const model = loadTemplate(tpl(body));
    const datasets = parseXml(datasetsXml(data));
    const started = performance.now();
    expectXfa(() => createFormDom(model, datasets), 'MALFORMED_XML', /merge.*child elements|child elements.*merge/i);
    expect(performance.now() - started).toBeLessThan(3_000);
  }, 60_000);

  it('60,000 two-pass fields over blank data fail closed or finish in under 3 seconds (it took minutes)', () => {
    const model = loadTemplate(tpl(twoPass(60_000)));
    const datasets = parseXml(datasetsXml('<form1/>'));
    const started = performance.now();
    try {
      createFormDom(model, datasets);
    } catch (e) {
      expectXfa(() => {
        throw e;
      }, 'MALFORMED_XML', /merge/i);
    }
    expect(performance.now() - started).toBeLessThan(3_000);
  }, 60_000);

  it('a remerge that has to index more children than the merge-work ceiling is a catchable LIMIT, and an ordinary one is not', () => {
    const body = `${textField('F')}<field name="Pick"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="xfa.datasets.data.form1.X[*]" labelRef="$" valueRef="$"/></field>`;
    const dom = createFormDom(loadTemplate(tpl(body)), parseXml(datasetsXml('<form1><X>a</X></form1>')), { limits: { maxMergeVisits: 50_000 } });
    expect(() => dom.remerge()).not.toThrow();
    dom.call(dom.data.child('form1') as never, 'loadXML', [`<w>${'<Y/>'.repeat(60_000)}</w>`, 1, 0]);
    expectForm(() => dom.remerge(), 'LIMIT', /child elements/);
  });

  it('the ceiling a caller sets can only be lower than the default', () => {
    const model = loadTemplate(tpl(textField('F')));
    expect(() => createFormDom(model, parseXml(datasetsXml('<form1/>')), { limits: { maxMergeVisits: 1_000_000_000 } })).toThrow();
  });

  it('a form that merges ordinarily reports how much work the merge did, far under the ceiling', () => {
    const dom = createFormDom(loadTemplate(tpl(twoPass(50))), parseXml(datasetsXml('<form1/>')));
    expect(dom.lastMergeVisits).toBeGreaterThan(0);
    expect(dom.lastMergeVisits).toBeLessThan(100_000);
  });
});
