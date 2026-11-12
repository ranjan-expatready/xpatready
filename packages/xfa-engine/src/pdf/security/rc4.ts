import { XfaPdfError } from '../errors.js';

/**
 * FD-38 exemption (correctness constant): RC4's key schedule is defined for keys of 1 to 256 bytes
 * (the S-box has 256 entries); this is the algorithm's own limit, not a tunable ceiling.
 */
const MAX_KEY_BYTES = 256;

/**
 * RC4 (also its own inverse). Used only by the Standard handler's /U verification (ISO 32000-1 Alg. 5);
 * WebCrypto has no RC4 and file content is never RC4-encrypted by this engine.
 */
export function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (key.length === 0 || key.length > MAX_KEY_BYTES) throw new XfaPdfError('MALFORMED', 'RC4 key must be 1 to 256 bytes');
  const s = Uint8Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + (s[i] ?? 0) + (key[i % key.length] ?? 0)) & 255;
    const t = s[i] ?? 0;
    s[i] = s[j] ?? 0;
    s[j] = t;
  }
  const out = new Uint8Array(data.length);
  let a = 0;
  let b = 0;
  for (let n = 0; n < data.length; n++) {
    a = (a + 1) & 255;
    b = (b + (s[a] ?? 0)) & 255;
    const t = s[a] ?? 0;
    s[a] = s[b] ?? 0;
    s[b] = t;
    out[n] = (data[n] ?? 0) ^ (s[((s[a] ?? 0) + (s[b] ?? 0)) & 255] ?? 0);
  }
  return out;
}
