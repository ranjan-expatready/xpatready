import { describe, expect, it } from 'vitest';
import { MAX_LOADED_CHARS } from '../limits.js';
import { build, expectForm, textField } from './helpers.js';

function holder(): { dom: ReturnType<typeof build>['dom']; group: ReturnType<ReturnType<typeof build>['dom']['createDataNode']> } {
  const { dom } = build(textField('F'));
  const group = dom.createDataNode('dataGroup', 'LOVFile');
  dom.datasets.nodes.append(group);
  return { dom, group };
}

describe('loadXML memory is bounded over a run (F1)', () => {
  it('the loaded-text ceiling is 4 MiB, a few times the real 0.5 MB list of values (it was 64 MiB, so ten 0.8 MB loads kept 1.5 GB)', () => {
    expect(MAX_LOADED_CHARS).toBe(4 * 1024 * 1024);
  });

  it('two loads of 3 MiB each hit LIMIT on the second', () => {
    const { dom, group } = holder();
    const big = `<a>${'x'.repeat(3 * 1024 * 1024)}</a>`;
    dom.call(group, 'loadXML', [big, 0, 1]);
    expectForm(() => dom.call(group, 'loadXML', [big, 0, 1]), 'LIMIT');
  });

  it('imported elements are charged too: many small loads of element-heavy XML hit LIMIT after a handful, long before the text ceiling', () => {
    const { dom, group } = holder();
    const many = `<a>${'<b/>'.repeat(60_000)}</a>`;
    let loads = 0;
    expectForm(() => {
      for (; loads < 20; loads += 1) dom.call(group, 'loadXML', [many, 0, 1]);
    }, 'LIMIT');
    expect(loads).toBeLessThanOrEqual(4);
  });

  it('a real-sized list of values (about 9,000 elements, 0.5 MB) can still be loaded several times, as the Clear button does', () => {
    const { dom, group } = holder();
    const lov = `<LOV>${'<I lic="a">Some label text</I>'.repeat(9_000)}</LOV>`;
    expect(lov.length).toBeGreaterThan(250_000);
    for (let i = 0; i < 5; i += 1) dom.call(group, 'loadXML', [lov, 0, 1]);
    expect(group.children).toHaveLength(1);
  });
});
