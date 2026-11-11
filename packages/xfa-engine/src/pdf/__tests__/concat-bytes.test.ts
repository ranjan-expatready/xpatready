import { describe, expect, it } from 'vitest';
import { concatBytes } from '../concat-bytes.js';
import { enc } from './bytes.js';

describe('concatBytes', () => {
  it('joins parts in order and tolerates empty parts (a dropped or reordered part would corrupt keys and objects)', () => {
    expect(concatBytes([enc('ab'), new Uint8Array(0), enc('c'), enc('def')])).toEqual(enc('abcdef'));
    expect(concatBytes([])).toEqual(new Uint8Array(0));
  });

  it('returns a fresh buffer that does not alias any input (mutating the result must not change a caller-owned part)', () => {
    const a = enc('abc');
    const out = concatBytes([a]);
    out[0] = 0x7a;
    expect(a).toEqual(enc('abc'));
  });

  it('takes an array so a hundred thousand chunks never become call arguments', () => {
    const chunks = Array.from({ length: 100_000 }, () => Uint8Array.of(7));
    const out = concatBytes(chunks);
    expect(out.length).toBe(100_000);
    expect(out[99_999]).toBe(7);
  });
});
