import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../errors.js';
import { enc } from '../../__tests__/bytes.js';
import { rc4 } from '../rc4.js';
import { hex } from './vectors.js';

describe('rc4', () => {
  it.each([
    ['Key', 'Plaintext', 'bbf316e8d940af0ad3'],
    ['Wiki', 'pedia', '1021bf0420'],
    ['Secret', 'Attack at dawn', '45a01f645fc35b383552544b9bf5'],
  ])('matches the published RC4 vector for key %s (a wrong swap or index step would corrupt every /U check)', (key, plain, expected) => {
    expect(hex(rc4(enc(key), enc(plain)))).toBe(expected);
  });

  it('is its own inverse, so the 19 verification rounds can reuse one routine', () => {
    const data = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) & 255);
    expect(rc4(enc('k3y'), rc4(enc('k3y'), data))).toEqual(data);
  });

  it('does not mutate its input', () => {
    const data = enc('abc');
    rc4(enc('k'), data);
    expect(data).toEqual(enc('abc'));
  });

  it.each([[0], [257]])('rejects a %i-byte key with XfaPdfError, not a hang or RangeError', (len) => {
    expect(() => rc4(new Uint8Array(len), enc('x'))).toThrow(XfaPdfError);
  });
});
