import { describe, expect, it } from 'vitest';
import { latin1 } from '../latin1.js';

describe('latin1: one byte per UTF-16 unit', () => {
  it('maps every byte value to the code point of the same number (not windows-1252)', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect([...latin1(all)].map((c) => c.charCodeAt(0))).toEqual([...all]);
    expect(latin1(Uint8Array.of(0x80, 0x9f, 0xe9))).toBe('\u0080\u009fé');
  });

  it('is safe at any length (no argument-count overflow) and for the empty input', () => {
    expect(latin1(new Uint8Array(0))).toBe('');
    expect(latin1(new Uint8Array(1_000_000).fill(65))).toHaveLength(1_000_000);
  });
});
