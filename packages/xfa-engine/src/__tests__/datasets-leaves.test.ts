import { describe, expect, it } from 'vitest';
import { datasetsLeaves, leafDifferences } from './datasets-leaves.js';

const wrap = (inner: string): string => `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data>${inner}</xfa:data></xfa:datasets>`;
const BASE = wrap('<form1><Page1><Name> Ann </Name><Name>Bob</Name><Age>7</Age></Page1></form1>');

describe('datasets leaf comparison (the helper of the Acrobat datasets oracle)', () => {
  it('keys each leaf by its indexed path and trims the text', () => {
    expect([...datasetsLeaves(BASE)]).toEqual([
      ['/form1[0]/Page1[0]/Name[0]', 'Ann'],
      ['/form1[0]/Page1[0]/Name[1]', 'Bob'],
      ['/form1[0]/Page1[0]/Age[0]', '7'],
    ]);
  });

  it('reports no difference for equal documents', () => {
    expect(leafDifferences(datasetsLeaves(BASE), datasetsLeaves(BASE))).toEqual([]);
  });

  it('reports a difference for two documents that differ in one leaf value', () => {
    const changed = wrap('<form1><Page1><Name> Ann </Name><Name>Bobby</Name><Age>7</Age></Page1></form1>');
    expect(leafDifferences(datasetsLeaves(BASE), datasetsLeaves(changed))).toEqual(['/form1[0]/Page1[0]/Name[1]: expected "Bob", actual "Bobby"']);
  });

  it('reports a leaf present on one side only, in both directions', () => {
    const fewer = wrap('<form1><Page1><Name>Ann</Name><Name>Bob</Name></Page1></form1>');
    expect(leafDifferences(datasetsLeaves(BASE), datasetsLeaves(fewer))).toEqual(['/form1[0]/Page1[0]/Age[0]: missing from actual']);
    expect(leafDifferences(datasetsLeaves(fewer), datasetsLeaves(BASE))).toEqual(['/form1[0]/Page1[0]/Age[0]: not in expected']);
  });

  it('reports a leaf that moved to another index', () => {
    const swapped = wrap('<form1><Page1><Name>Bob</Name><Name> Ann </Name><Age>7</Age></Page1></form1>');
    expect(leafDifferences(datasetsLeaves(BASE), datasetsLeaves(swapped))).toHaveLength(2);
  });
});
