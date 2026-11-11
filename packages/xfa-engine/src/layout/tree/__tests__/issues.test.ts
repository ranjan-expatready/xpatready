import { describe, expect, it } from 'vitest';
import { MAX_ISSUES, MAX_SHORT_TEXT_CHARS } from '../../limits.js';
import { renderTreeSchema, RENDER_TREE_VERSION } from '../../render-tree.js';
import { mergeIssues } from '../issues.js';

const issue = (som: string, feature: string) => ({ som, feature });
const many = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => issue('s', `${prefix}${i}`));

describe('mergeIssues: one list from every layer', () => {
  it('keeps the sources in the order given and drops an exact repeat (same som and feature)', () => {
    const merged = mergeIssues([[issue('a', 'x'), issue('b', 'y')], [issue('a', 'x'), issue('c', 'z')], [issue('', 'font.program.F1')]], 0);
    expect(merged).toEqual([issue('a', 'x'), issue('b', 'y'), issue('c', 'z'), issue('', 'font.program.F1')]);
  });

  it('the same feature on two nodes is two issues', () => {
    expect(mergeIssues([[issue('a', 'x'), issue('b', 'x')]], 0)).toHaveLength(2);
  });

  it('at the cap the list ends with one entry counting what was lost, and still parses', () => {
    const merged = mergeIssues([many(MAX_ISSUES - 1, 'a'), many(5, 'b')], 3);
    expect(merged).toHaveLength(MAX_ISSUES);
    expect(merged.slice(0, MAX_ISSUES - 1)).toEqual(many(MAX_ISSUES - 1, 'a'));
    // 4 over the cap, 3 the layers dropped themselves, and the entry the summary took the place of: 8.
    expect(merged[MAX_ISSUES - 1]).toEqual(issue('', '8 further issue(s) were not kept'));
    expect(renderTreeSchema.safeParse({ version: RENDER_TREE_VERSION, pages: [], resources: { fonts: [], images: [] }, issues: merged }).success).toBe(true);
  });

  it('a layer that dropped issues of its own is counted even when the list is short', () => {
    expect(mergeIssues([[issue('a', 'x')]], 4)).toEqual([issue('a', 'x'), issue('', '4 further issue(s) were not kept')]);
  });

  it('exactly the cap, nothing lost, adds nothing', () => {
    expect(mergeIssues([many(MAX_ISSUES, 'a')], 0)).toHaveLength(MAX_ISSUES);
  });

  it('an empty feature and an over-long text are made valid, never passed on to fail the tree', () => {
    const [empty, long] = mergeIssues([[issue('a', ''), issue('b'.repeat(MAX_SHORT_TEXT_CHARS + 10), 'c'.repeat(MAX_SHORT_TEXT_CHARS + 10))]], 0);
    expect(empty?.feature.length).toBeGreaterThan(0);
    expect(long?.som).toHaveLength(MAX_SHORT_TEXT_CHARS);
    expect(long?.feature).toHaveLength(MAX_SHORT_TEXT_CHARS);
  });
});
