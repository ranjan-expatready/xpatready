import { beforeEach, describe, expect, it, vi } from 'vitest';
import { somExpressionOf } from '../../../model/som/expression.js';
import { layoutFlow } from '../../flow/layout-flow.js';
import { MAX_ISSUES } from '../../limits.js';
import { RENDER_TREE_VERSION, renderTreeSchema } from '../../render-tree.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { peekPresence } from '../build.js';
import { discardingSink, IssueSink } from '../issues.js';
import { build, field, find, nodeOf } from './helpers.js';

// A counting wrapper over the real SOM resolver: the sink must call it lazily, once per node, and never for a discarded probe.
vi.mock('../../../model/som/expression.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../model/som/expression.js')>();
  return { ...actual, somExpressionOf: vi.fn(actual.somExpressionOf) };
});
const somCalls = (): number => vi.mocked(somExpressionOf).mock.calls.length;
beforeEach(() => {
  vi.mocked(somExpressionOf).mockClear();
});

describe('IssueSink', () => {
  it('names the node by its SOM expression and the feature', () => {
    const sink = new IssueSink();
    sink.add(nodeOf(field('w="2pt" h="2pt"'), 'field', 'f'), 'comb');
    expect(sink.issues).toEqual([{ som: 'xfa[0].form[0].form1[0].f[0]', feature: 'comb' }]);
  });

  it('produces entries the render tree accepts as its issues', () => {
    const sink = new IssueSink();
    sink.add(nodeOf(field('w="2pt" h="2pt"'), 'field', 'f'), 'overflow');
    expect(renderTreeSchema.safeParse({ version: RENDER_TREE_VERSION, pages: [], resources: { fonts: [], images: [] }, issues: sink.issues }).success).toBe(true);
  });

  it('keeps at most MAX_ISSUES entries and counts the rest, so a hostile form cannot grow the list without bound', () => {
    const sink = new IssueSink();
    const node = nodeOf(field('w="2pt" h="2pt"'), 'field', 'f');
    for (let i = 0; i < MAX_ISSUES + 5; i += 1) sink.add(node, 'x');
    expect(sink.issues).toHaveLength(MAX_ISSUES);
    expect(sink.dropped).toBe(5);
  });
});

describe('IssueSink: the SOM is worked out lazily, once per node (SF-3)', () => {
  it('adding an issue computes no SOM; reading the issues computes one per node however many issues it has, and reading again computes none for what was read', () => {
    const sink = new IssueSink();
    const node = nodeOf(field('w="2pt" h="2pt"'), 'field', 'f');
    sink.add(node, 'a');
    sink.add(node, 'b');
    sink.add(node, 'c');
    expect(somCalls()).toBe(0);
    expect(sink.issues.map((i) => i.feature)).toEqual(['a', 'b', 'c']);
    expect(somCalls()).toBe(1);
    expect(sink.issues).toHaveLength(3);
    expect(somCalls()).toBe(1);
    sink.add(node, 'd');
    expect(sink.issues.map((i) => i.feature)).toEqual(['a', 'b', 'c', 'd']);
    // A later read works out only the entries it has not read, and does not trust an expression from an earlier read.
    expect(somCalls()).toBe(2);
    expect(sink.issues[3]?.som).toBe('xfa[0].form[0].form1[0].f[0]');
  });

  it('a sink reused after the form changed reads the current SOM: an issue added after an earlier sibling was removed names the node by its new index', () => {
    const { dom } = build('<field name="f" w="2pt" h="2pt"/><field name="f" w="2pt" h="2pt"/>');
    const [first, second] = dom.root.children.filter((child) => child.className === 'field');
    if (first === undefined || second === undefined) throw new Error('two fields expected');
    const sink = new IssueSink();
    sink.add(second, 'before');
    expect(sink.issues).toEqual([{ som: 'xfa[0].form[0].form1[0].f[1]', feature: 'before' }]);
    dom.root.nodes.remove(first);
    sink.add(second, 'after');
    // The entry read earlier keeps what it said when it was read; the new one names the node where it is now.
    expect(sink.issues).toEqual([
      { som: 'xfa[0].form[0].form1[0].f[1]', feature: 'before' },
      { som: 'xfa[0].form[0].form1[0].f[0]', feature: 'after' },
    ]);
  });

  it('a created node that was never appended still reads as class:name', () => {
    const { dom } = build('<field name="f" w="2pt" h="2pt"/>');
    const sink = new IssueSink();
    const created = dom.createNode('field', 'loose');
    sink.add(created, 'x');
    expect(sink.issues).toEqual([{ som: 'field:loose', feature: 'x' }]);
  });

  it('the discarding sink keeps nothing and computes no SOM, however many probes add to it', () => {
    const { dom } = build('<field name="f" w="2pt" h="2pt"/>');
    const node = find(dom, 'field', 'f');
    const sink = discardingSink();
    for (let i = 0; i < 1_000; i += 1) sink.add(node, `probe ${i}`);
    expect(sink.issues).toEqual([]);
    expect(sink.dropped).toBe(0);
    expect(somCalls()).toBe(0);
  });

  it('a row of 300 cells with an unmodelled relevant: the presence probes compute no SOM, and the layout computes one per cell that is reported', () => {
    const cells = Array.from({ length: 300 }, (_, i) => `<field name="c${i}" w="10pt" h="10pt" relevant="x"><ui><textEdit/></ui></field>`).join('');
    const { dom } = build(`<subform name="r" layout="row">${cells}</subform>`);
    const row = find(dom, 'subform', 'r');
    for (const cell of row.children.filter((child) => child.className === 'field')) peekPresence(cell, 'visible');
    expect(somCalls()).toBe(0);
    const layout = layoutFlow(dom, emptyTextContext());
    const relevantIssues = layout.issues.filter((issue) => issue.feature.startsWith('relevant='));
    expect(relevantIssues).toHaveLength(300);
    expect(relevantIssues[7]?.som).toBe('xfa[0].form[0].form1[0].r[0].c7[0]');
    // One SOM per reported cell (and none for the probes the row made to count the cells that take room).
    expect(somCalls()).toBeLessThanOrEqual(300 + 10);
  });
});
