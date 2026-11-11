import { malformed, overLimit } from './errors.js';
import type { ImageLimits } from './limits.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const INVALID = 255;
const VALUE_OF: Uint8Array = (() => {
  const table = new Uint8Array(128).fill(INVALID);
  for (let i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charCodeAt(i)] = i;
  // The URL-safe alphabet is not base64 for XFA (`transferEncoding="base64"`), so `-` and `_` stay invalid.
  return table;
})();

const isSpace = (code: number): boolean => code === 0x20 || code === 0x0a || code === 0x0d || code === 0x09;

/**
 * Decodes the base64 text of an `image` element. Bounded before it allocates: the text may not exceed
 * `limits.maxBase64Chars`, the output size is counted from the characters first and may not exceed
 * `limits.maxEncodedBytes`, and only then is the output allocated, once, at its exact size. White space (the line breaks
 * the template writer inserts) is skipped; anything else outside the alphabet, a misplaced `=`, or a length that cannot
 * come from whole bytes is `malformed`. The result is the encoded image file, not pixels.
 *
 * Own decoder rather than `atob`: `atob` allocates the whole output before any size can be checked and throws away the
 * position of the error.
 */
export function decodeBase64(text: string, limits: Pick<ImageLimits, 'maxBase64Chars' | 'maxEncodedBytes'>): Uint8Array {
  if (text.length > limits.maxBase64Chars) throw overLimit(`image text is ${text.length} characters, over the ${limits.maxBase64Chars} character ceiling`);
  // Pass 1: count the data characters and find the padding, touching nothing but integers.
  let data = 0;
  let padding = 0;
  for (let at = 0; at < text.length; at += 1) {
    const code = text.charCodeAt(at);
    if (isSpace(code)) continue;
    if (code === 0x3d) {
      padding += 1;
      continue;
    }
    if (padding > 0) throw malformed('image base64 has data after its padding');
    if (code >= 128 || VALUE_OF[code] === INVALID) throw malformed(`image base64 has a character outside the alphabet at index ${at}`);
    data += 1;
  }
  const remainder = data % 4;
  if (remainder === 1) throw malformed('image base64 length cannot come from whole bytes');
  if (padding > 0 && (padding > 2 || (data + padding) % 4 !== 0)) throw malformed('image base64 padding is wrong');
  const size = Math.floor(data / 4) * 3 + (remainder === 0 ? 0 : remainder - 1);
  if (size > limits.maxEncodedBytes) throw overLimit(`image is ${size} bytes encoded, over the ${limits.maxEncodedBytes} byte ceiling`);
  // Pass 2: the allocation is now exactly `size`.
  const out = new Uint8Array(size);
  let bits = 0;
  let held = 0;
  let written = 0;
  for (let at = 0; at < text.length && written < size; at += 1) {
    const code = text.charCodeAt(at);
    if (isSpace(code) || code === 0x3d) continue;
    bits = (bits << 6) | (VALUE_OF[code] ?? 0);
    held += 6;
    if (held >= 8) {
      held -= 8;
      out[written] = (bits >>> held) & 0xff;
      written += 1;
      bits &= (1 << held) - 1;
    }
  }
  return out;
}
