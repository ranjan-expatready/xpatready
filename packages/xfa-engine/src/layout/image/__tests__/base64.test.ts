import { describe, expect, it } from 'vitest';
import { decodeBase64 } from '../base64.js';
import { DEFAULT_IMAGE_LIMITS } from '../limits.js';
import { expectImageError, limitsOf } from './helpers.js';

const decode = (text: string, over = {}): Uint8Array => decodeBase64(text, limitsOf(over));

describe('decodeBase64: bounded base64 of an image element', () => {
  it('decodes padded, unpadded and line-wrapped text to the same bytes as the platform decoder', () => {
    const bytes = Uint8Array.from({ length: 200 }, (_, i) => (i * 37 + 11) & 0xff);
    for (let length = 0; length <= 7; length += 1) {
      const slice = bytes.subarray(0, length);
      const text = Buffer.from(slice).toString('base64');
      expect([...decode(text)]).toEqual([...slice]);
      expect([...decode(text.replace(/=+$/, ''))]).toEqual([...slice]);
    }
    const wrapped = Buffer.from(bytes).toString('base64').replace(/(.{76})/g, '$1\r\n  ');
    expect([...decode(wrapped)]).toEqual([...bytes]);
  });

  it('refuses a character outside the alphabet, data after padding, wrong padding and an impossible length, as malformed', () => {
    expectImageError(() => decode('AAA*'), 'malformed', /alphabet/);
    expectImageError(() => decode('AAA-'), 'malformed', /alphabet/);
    expectImageError(() => decode('AAAé'), 'malformed', /alphabet/);
    expectImageError(() => decode('AA=A'), 'malformed', /after its padding/);
    expectImageError(() => decode('AAAA='), 'malformed', /padding/);
    expectImageError(() => decode('A==='), 'malformed', /whole bytes/);
    expectImageError(() => decode('AAAAA'), 'malformed', /whole bytes/);
  });

  it('is refused as over the limit by character count before anything is scanned, and by decoded size before anything is allocated', () => {
    expectImageError(() => decode('A'.repeat(101), { maxBase64Chars: 100 }), 'limit', /characters/);
    expectImageError(() => decode('AAAA'.repeat(10), { maxEncodedBytes: 29 }), 'limit', /bytes encoded/);
    expect(decode('AAAA'.repeat(10), { maxEncodedBytes: 30 })).toHaveLength(30);
  });

  it('counts only data characters against the byte ceiling, so a long run of white space costs nothing', () => {
    const padded = `AAAA${' '.repeat(5000)}`;
    expect(decode(padded, { maxBase64Chars: 6000 })).toHaveLength(3);
    expect(DEFAULT_IMAGE_LIMITS.maxBase64Chars).toBe((DEFAULT_IMAGE_LIMITS.maxEncodedBytes / 3) * 8);
  });

  it('allocates exactly the decoded size, not a size taken from the text length (a hostile "=" run is rejected without one)', () => {
    const before = process.memoryUsage().arrayBuffers;
    expectImageError(() => decode('='.repeat(1_000_000)), 'malformed', /padding/);
    expect(process.memoryUsage().arrayBuffers - before).toBeLessThan(1_000_000);
  });
});
