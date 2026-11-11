import { describe, expect, it, vi } from 'vitest';
import { MAX_ISSUES } from '../../limits.js';
import { OnceIssueSink } from '../context.js';
import { DEFAULT_TEXT_STYLE } from '../style.js';
import { build, emptyTextContext, find } from './helpers.js';

describe('OnceIssueSink', () => {
  it('records a (node, feature) pair once, and the same feature again for another node or another feature for the same node', () => {
    const { dom } = build('<draw name="a" w="1pt" h="1pt"/><draw name="b" w="1pt" h="1pt"/>');
    const a = find(dom, 'draw', 'a');
    const b = find(dom, 'draw', 'b');
    const sink = new OnceIssueSink();
    sink.add(a, 'x');
    sink.add(a, 'x');
    sink.add(b, 'x');
    sink.add(a, 'y');
    expect(sink.issues.map((i) => i.feature)).toEqual(['x', 'x', 'y']);
    expect(sink.issues[0]?.som).not.toBe(sink.issues[1]?.som);
  });

  it('stops remembering what it has reported once the sink is full: the set stays at MAX_ISSUES however many distinct features follow', () => {
    const { dom } = build('<draw name="a" w="1pt" h="1pt"/>');
    const a = find(dom, 'draw', 'a');
    const sink = new OnceIssueSink();
    for (let i = 0; i < MAX_ISSUES + 500; i += 1) sink.add(a, `feature ${i}`);
    expect(sink.full).toBe(true);
    expect(sink.issues).toHaveLength(MAX_ISSUES);
    expect(sink.tracked).toBe(MAX_ISSUES);
    expect(sink.dropped).toBe(500);
  });
});

describe('TextContext.resolve', () => {
  it('20,000 distinct unknown typefaces: every font issue reaches the sink exactly once, the sink keeps MAX_ISSUES and counts the rest as dropped (SF-2)', () => {
    const { dom } = build('<draw name="a" w="1pt" h="1pt"/>');
    const a = find(dom, 'draw', 'a');
    const ctx = emptyTextContext();
    const count = 20_000;
    // The old resolver handed back a copy of its whole growing list on every miss and the context sliced it: count the array copies
    // (restored in `finally`, so a failing assertion cannot leave the spy on the prototype for the next test).
    const slice = vi.spyOn(Array.prototype, 'slice');
    let copies: number;
    try {
      for (let i = 0; i < count; i += 1) ctx.resolve(a, { ...DEFAULT_TEXT_STYLE, typeface: `Unknown${i}` });
      copies = slice.mock.calls.length;
    } finally {
      slice.mockRestore();
    }
    expect(copies).toBeLessThan(count / 100);
    expect(ctx.sink.issues).toHaveLength(MAX_ISSUES);
    expect(ctx.sink.issues[0]?.feature).toBe('font.Unknown0');
    expect(ctx.sink.dropped).toBe(count - MAX_ISSUES);
    expect(ctx.sink.tracked).toBe(MAX_ISSUES);
  });

  it('reports a fallback against the first node that needed it, and a later node using the same typeface adds nothing', () => {
    const { dom } = build('<draw name="a" w="1pt" h="1pt"/><draw name="b" w="1pt" h="1pt"/>');
    const ctx = emptyTextContext();
    ctx.resolve(find(dom, 'draw', 'a'), { ...DEFAULT_TEXT_STYLE, typeface: 'Arial' });
    ctx.resolve(find(dom, 'draw', 'b'), { ...DEFAULT_TEXT_STYLE, typeface: 'Arial' });
    expect(ctx.sink.issues).toHaveLength(1);
    expect(ctx.sink.issues[0]?.som).toContain('a');
  });
});
