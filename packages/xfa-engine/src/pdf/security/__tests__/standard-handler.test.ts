import { describe, expect, it } from 'vitest';
import { enc } from '../../__tests__/bytes.js';
import { expectXfaError } from '../../__tests__/expect-malformed.js';
import type { PdfDict, PdfValue } from '../../types.js';
import { createStandardHandler } from '../standard-handler.js';
import { AESV2_SAMPLE, CLEARTEXT_METADATA_SAMPLE, encryptDictFor, hex, nodeAesEncrypt, nodeObjectKey, unhex } from './vectors.js';

const rejected = expectXfaError;

const open = (k = AESV2_SAMPLE, dict: PdfDict = encryptDictFor(k)) => createStandardHandler(dict, unhex(k.id0));
const iv = Uint8Array.from({ length: 16 }, (_, i) => i + 1);

describe('createStandardHandler: key derivation (Alg. 2) and verification (Alg. 5)', () => {
  it('derives the same file key as qpdf (MD5 padding, 50 rounds, /P little-endian)', async () => {
    expect(hex((await open()).fileKey)).toBe(AESV2_SAMPLE.key);
  });

  it('appends 0xFFFFFFFF to the key input when /EncryptMetadata is false, matching qpdf', async () => {
    const h = await open(CLEARTEXT_METADATA_SAMPLE);
    expect(hex(h.fileKey)).toBe(CLEARTEXT_METADATA_SAMPLE.key);
    expect(h.encryptMetadata).toBe(false);
  });

  it('accepts /P written as an unsigned 32-bit number (some producers do) as the same key', async () => {
    const unsigned = encryptDictFor(AESV2_SAMPLE, { P: 4294967292 });
    expect(hex((await createStandardHandler(unsigned, unhex(AESV2_SAMPLE.id0))).fileKey)).toBe(AESV2_SAMPLE.key);
  });

  it('rejects a /U that differs in the last compared byte (byte 15) with WRONG_PASSWORD', async () => {
    const u = unhex(AESV2_SAMPLE.u);
    u[15] = (u[15] ?? 0) ^ 1;
    const dict = encryptDictFor(AESV2_SAMPLE, { U: { kind: 'string', bytes: u, hex: true } });
    expect((await rejected(createStandardHandler(dict, unhex(AESV2_SAMPLE.id0)))).code).toBe('WRONG_PASSWORD');
  });

  it('rejects a /U that differs in the first byte with WRONG_PASSWORD', async () => {
    const u = unhex(AESV2_SAMPLE.u);
    u[0] = (u[0] ?? 0) ^ 0x80;
    const dict = encryptDictFor(AESV2_SAMPLE, { U: { kind: 'string', bytes: u, hex: true } });
    expect((await rejected(createStandardHandler(dict, unhex(AESV2_SAMPLE.id0)))).code).toBe('WRONG_PASSWORD');
  });

  it('ignores /U bytes 16..31, which are arbitrary padding (comparing all 32 would reject real files)', async () => {
    const u = unhex(AESV2_SAMPLE.u);
    u.fill(0xaa, 16);
    const dict = encryptDictFor(AESV2_SAMPLE, { U: { kind: 'string', bytes: u, hex: true } });
    expect(hex((await createStandardHandler(dict, unhex(AESV2_SAMPLE.id0))).fileKey)).toBe(AESV2_SAMPLE.key);
  });

  it('a different document /ID is a different key, hence WRONG_PASSWORD (the ID is bound into Alg. 5)', async () => {
    const err = await rejected(createStandardHandler(encryptDictFor(AESV2_SAMPLE), unhex(CLEARTEXT_METADATA_SAMPLE.id0)));
    expect(err.code).toBe('WRONG_PASSWORD');
  });

  it('an unsupported dictionary is UNSUPPORTED_SECURITY before any key work (/R 6)', async () => {
    const err = await rejected(createStandardHandler(encryptDictFor(AESV2_SAMPLE, { R: 6 }), unhex(AESV2_SAMPLE.id0)));
    expect(err.code).toBe('UNSUPPORTED_SECURITY');
  });
});

describe('createStandardHandler: per-object AES-128-CBC (Alg. 1)', () => {
  it('decrypts what an independent implementation encrypted, with num as 3 and gen as 2 little-endian bytes', async () => {
    const h = await open();
    const plain = enc('The quick brown fox, 33 bytes long.');
    const num = 0x010203;
    const gen = 0x0405;
    const cipher = nodeAesEncrypt(nodeObjectKey(h.fileKey, num, gen), iv, plain);
    expect(await h.decryptStream(num, gen, cipher)).toEqual(plain);
    expect(await h.decryptString(num, gen, cipher)).toEqual(plain);
  });

  it('decrypts an empty plaintext (one full padding block) to zero bytes', async () => {
    const h = await open();
    const cipher = nodeAesEncrypt(nodeObjectKey(h.fileKey, 7, 0), iv, new Uint8Array(0));
    expect(cipher.length).toBe(32);
    expect(await h.decryptString(7, 0, cipher)).toEqual(new Uint8Array(0));
  });

  it('an IV-only ciphertext (16 bytes, no data block) decodes to zero bytes, as in Acrobat-written signature /DigestValue strings and as qpdf does', async () => {
    expect(await (await open()).decryptString(7, 0, new Uint8Array(16).fill(9))).toEqual(new Uint8Array(0));
    expect(await (await open()).decryptStream(7, 0, new Uint8Array(16).fill(9))).toEqual(new Uint8Array(0));
  });

  it('a zero-byte ciphertext decodes to zero bytes (producers write empty strings unencrypted), not an error', async () => {
    expect(await (await open()).decryptString(7, 0, new Uint8Array(0))).toEqual(new Uint8Array(0));
  });

  it('uses a different key per object: another object number does not decrypt to the plaintext', async () => {
    const h = await open();
    const plain = enc('per-object key check');
    const cipher = nodeAesEncrypt(nodeObjectKey(h.fileKey, 5, 0), iv, plain);
    const other = await h.decryptStream(6, 0, cipher).then((b) => b, (e: unknown) => e);
    expect(other).not.toEqual(plain);
  });

  it('encryptStream output decrypts back, and the same input encrypts byte-identically (D5 deterministic IV)', async () => {
    const h = await open();
    const plain = enc('<xfa:datasets>x</xfa:datasets>');
    const a = await h.encryptStream(9, 0, plain);
    const b = await h.encryptStream(9, 0, plain);
    expect(a).toEqual(b);
    expect(a.length).toBe(16 + 32);
    expect(await h.decryptStream(9, 0, a)).toEqual(plain);
    expect(await h.encryptStream(9, 0, enc('other'))).not.toEqual(a);
  });

  it('encryptStream is readable by an independent AES implementation (not just self-consistent)', async () => {
    const h = await open();
    const plain = enc('independent check');
    const a = await h.encryptStream(11, 2, plain);
    const re = nodeAesEncrypt(nodeObjectKey(h.fileKey, 11, 2), a.subarray(0, 16), plain);
    expect(re).toEqual(a);
  });

  it('encryptString output decrypts back, is deterministic, and matches an independent AES-CBC implementation (a plaintext string in an encrypted object leaks data)', async () => {
    const h = await open();
    const plain = enc('String in a stream dictionary');
    const a = await h.encryptString(11, 0, plain);
    expect(await h.encryptString(11, 0, plain)).toEqual(a);
    expect(a).not.toEqual(plain);
    expect(await h.decryptString(11, 0, a)).toEqual(plain);
    expect(nodeAesEncrypt(nodeObjectKey(h.fileKey, 11, 0), a.subarray(0, 16), plain)).toEqual(a);
    expect(await h.encryptString(12, 0, plain)).not.toEqual(a);
  });

  it('encryptString of an empty string stays decryptable to empty (an empty /Note must not turn into a MALFORMED read)', async () => {
    const h = await open();
    const sealed = await h.encryptString(11, 0, new Uint8Array(0));
    expect(await h.decryptString(11, 0, sealed)).toEqual(new Uint8Array(0));
  });

  describe('ciphertext that cannot be AES-CBC with PKCS#5 padding is MALFORMED (A3), with no WebCrypto exception leaking', () => {
    const cases: [string, (good: Uint8Array) => Uint8Array][] = [
      ['one byte too long', (g) => Uint8Array.of(...g, 0)],
      ['one byte too short', (g) => g.subarray(0, g.length - 1)],
      ['shorter than an IV', () => new Uint8Array(15)],
      ['padding byte larger than the block', (g) => {
        const bad = g.slice();
        bad[15] = (bad[15] ?? 0) ^ 0xff; // flips the last plaintext byte (the pad length) via CBC
        return bad;
      }],
    ];
    for (const [title, mutate] of cases) {
      for (const kind of ['stream', 'string'] as const) {
        it(`${title} (${kind})`, async () => {
          const h = await open();
          const good = nodeAesEncrypt(nodeObjectKey(h.fileKey, 4, 0), iv, enc('abcd'));
          const bad = mutate(good);
          const err = await rejected(kind === 'stream' ? h.decryptStream(4, 0, bad) : h.decryptString(4, 0, bad));
          expect(err.code).toBe('MALFORMED');
        });
      }
    }

    it('padding bytes that are not all equal (valid final byte, corrupted byte 14) are MALFORMED: the runtime must check every pad byte', async () => {
      const h = await open();
      const good = nodeAesEncrypt(nodeObjectKey(h.fileKey, 4, 0), iv, enc('abcd')); // 12 pad bytes of 0x0c
      good[14] = (good[14] ?? 0) ^ 0x01; // CBC: flips plaintext byte 14 only, the last byte stays 0x0c
      expect((await rejected(h.decryptStream(4, 0, good), 'MALFORMED')).code).toBe('MALFORMED');
    });

    it('bad padding keeps the WebCrypto failure as `cause` for diagnosis', async () => {
      const h = await open();
      const good = nodeAesEncrypt(nodeObjectKey(h.fileKey, 4, 0), iv, enc('abcd'));
      good[15] = (good[15] ?? 0) ^ 0xff;
      const err = await rejected(h.decryptStream(4, 0, good));
      expect(err.cause).toBeDefined();
    });
  });
});

describe('createStandardHandler: error text never carries secrets (A4)', () => {
  it('no failure message contains the file key, /O, /U, the document ID or decrypted bytes', async () => {
    const h = await open();
    const secret = enc('TOP-SECRET');
    const good = nodeAesEncrypt(nodeObjectKey(h.fileKey, 4, 0), iv, secret);
    good[15] = (good[15] ?? 0) ^ 0xff;
    const u = unhex(AESV2_SAMPLE.u);
    u[3] = (u[3] ?? 0) ^ 1;
    const wrongU: PdfValue = { kind: 'string', bytes: u, hex: true };
    const errors = [
      await rejected(h.decryptStream(4, 0, good)),
      await rejected(h.decryptString(4, 0, good.subarray(0, 20))),
      await rejected(createStandardHandler(encryptDictFor(AESV2_SAMPLE, { U: wrongU }), unhex(AESV2_SAMPLE.id0))),
      await rejected(createStandardHandler(encryptDictFor(AESV2_SAMPLE, { R: 6 }), unhex(AESV2_SAMPLE.id0))),
    ];
    for (const e of errors) {
      for (const s of [AESV2_SAMPLE.key, AESV2_SAMPLE.o, AESV2_SAMPLE.u, hex(u), AESV2_SAMPLE.id0, 'TOP-SECRET']) {
        expect(e.message.toLowerCase()).not.toContain(s.toLowerCase());
      }
    }
  });
});
