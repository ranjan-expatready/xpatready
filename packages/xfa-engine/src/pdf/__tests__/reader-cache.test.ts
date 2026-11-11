import { describe, expect, it, vi } from 'vitest';
import { buildLargePdf } from '../../__tests__/fixtures/build-pdf.js';
import { PdfReader } from '../reader.js';
import { isPdfString } from '../types.js';
import { dec } from './bytes.js';

vi.mock('../flate.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../flate.js')>();
  return { ...actual, inflate: vi.fn(actual.inflate) };
});
const { inflate } = await import('../flate.js');


describe('PdfReader object-stream cache', () => {
  it('reading every object of a ~1 MB PDF inflates each object stream exactly once', async () => {
    const pdf = buildLargePdf();
    expect(pdf.bytes.length).toBeGreaterThan(1_000_000);
    vi.mocked(inflate).mockClear();
    const reader = await PdfReader.open(pdf.bytes);
    const afterOpen = vi.mocked(inflate).mock.calls.length; // the xref stream only
    expect(afterOpen).toBe(1);

    for (const num of pdf.memberNums) {
      const v = await reader.get(num);
      expect(v).toMatchObject({ kind: 'string', hex: true });
    }
    expect(vi.mocked(inflate).mock.calls.length - afterOpen).toBe(pdf.objStmCount);

    // a second full pass, in reverse and fully concurrent, must be served from cache
    const second = await Promise.all([...pdf.memberNums].reverse().map((n) => reader.get(n)));
    expect(second.length).toBe(pdf.memberNums.length);
    expect(vi.mocked(inflate).mock.calls.length - afterOpen).toBe(pdf.objStmCount);
  }, 20000);

  it('concurrent first reads of members of one object stream share a single inflate', async () => {
    const pdf = buildLargePdf();
    const reader = await PdfReader.open(pdf.bytes);
    vi.mocked(inflate).mockClear();
    const got = await Promise.all([1, 2, 3, 4, 5].map((n) => reader.get(n)));
    expect(got.length).toBe(5);
    expect(vi.mocked(inflate).mock.calls.length).toBe(1);
  }, 20000);

  it('members decode to the exact bodies that were written', async () => {
    const pdf = buildLargePdf();
    const reader = await PdfReader.open(pdf.bytes);
    const v = await reader.get(777);
    if (!isPdfString(v)) throw new Error('not a string');
    const hex = Array.from(v.bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe(pdf.memberBody(777).slice(1, -1).toLowerCase());
    expect(dec(v.bytes).length).toBe(1000);
  }, 20000);
});
