import { describe, expect, it } from 'vitest';
import { build, datasetsXml } from '../../form/__tests__/helpers.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { formChecksum, MAX_SAVED_ELEMENTS, readSavedState, type SavedState } from '../index.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** Reads a saved form packet whose root subform `form1` holds `inner`, against a template whose root subform holds `body`. */
function read(body: string, inner: string, limits?: { maxElements?: number }): SavedState {
  const { dom } = build(body, '<form1/>');
  const template = enc(tpl(body));
  const datasets = enc(datasetsXml('<form1/>'));
  const form = `<form checksum="${formChecksum([template, datasets])}" xmlns="http://www.xfa.org/schema/xfa-form/2.8/"><subform name="form1">${inner}</subform></form>`;
  return readSavedState(dom, { template, datasets, form }, limits);
}

describe('readSavedState: the work of reading a saved packet is linear in the packet, however wide the form is (L2-F1)', () => {
  it('90,000 empty <variables/> over a root of 100,000 fields is read in under 5 seconds (it took 41 s: each one rescanned every child)', () => {
    const body = '<field name="F"/>'.repeat(100_000);
    const started = performance.now();
    const saved = read(body, '<variables/>'.repeat(90_000));
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 0 });
  }, 120_000);

  it('19,999 <border/> entries over a 180,000-wide node are read in under 5 seconds (it took 23 s: each one rescanned every child)', () => {
    const body = '<draw/>'.repeat(180_000);
    const started = performance.now();
    const saved = read(body, '<border/>'.repeat(19_999));
    expect(performance.now() - started).toBeLessThan(5_000);
    // The first border is the node's default one; every later one has no slot to go to.
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 19_998 });
  }, 120_000);

  it('the n-th saved <variables> goes to the n-th variables block, and the entries of a surplus one are skipped, as before', () => {
    const body = '<variables><text name="a"/></variables><variables><text name="b"/></variables>';
    const saved = read(body, '<variables><text>one</text></variables><variables><text>two</text></variables><variables><text>three</text></variables>');
    expect(saved.summary).toEqual({ status: 'restorable', deltas: 2, skipped: 1 });
    expect(saved.deltas.map((d) => [d.target, d.savedValue])).toEqual([['a', 'one'], ['b', 'two']]);
  });

  it('a border edge past the written ones is answered with its default slot, and one past the fourth is skipped, as before', () => {
    const body = '<field name="F"><border><edge/></border></field>';
    const edges = (n: number): string => `<field name="F"><border>${'<edge thickness="2mm"/>'.repeat(n)}</border></field>`;
    expect(read(body, edges(4)).summary).toEqual({ status: 'restorable', deltas: 4, skipped: 0 });
    expect(read(body, edges(5)).summary).toEqual({ status: 'restorable', deltas: 4, skipped: 1 });
  });
});

describe('readSavedState: a packet that makes the reader visit more elements than the ceiling is rejected whole (L2-F1)', () => {
  const BODY = '<field name="F"><ui><textEdit/></ui></field>';
  const entries = (n: number): string => '<variables/>'.repeat(n);

  it('the ceiling counts every saved element visited, empty ones too', () => {
    // The root subform is one element, so 1 + 9 reaches the ceiling exactly.
    expect(read(BODY, entries(9), { maxElements: 10 }).summary).toEqual({ status: 'restorable', deltas: 0, skipped: 0 });
    expect(read(BODY, entries(10), { maxElements: 10 })).toEqual({ summary: { status: 'rejected', deltas: 0, skipped: 0 }, deltas: [] });
  });

  it('elements below a property count as well as those directly below a container', () => {
    const inner = `<field name="F"><caption>${'<value/>'.repeat(20)}</caption></field>`;
    expect(read(BODY, inner, { maxElements: 100 }).summary.status).toBe('restorable');
    expect(read(BODY, inner, { maxElements: 10 }).summary.status).toBe('rejected');
  });

  it('the default ceiling is applied when the caller sets none', () => {
    expect(read(BODY, entries(MAX_SAVED_ELEMENTS)).summary.status).toBe('rejected');
    expect(read(BODY, entries(MAX_SAVED_ELEMENTS - 1)).summary.status).toBe('restorable');
  });
});
