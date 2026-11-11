/**
 * Known-answer inputs taken from files written by qpdf 12.3.2 (an independent implementation),
 * see src/__tests__/fixtures/README.md. `key` is `qpdf --show-encryption --show-encryption-key`.
 */
import { createCipheriv, createHash } from 'node:crypto';
import type { PdfDict, PdfValue } from '../../types.js';

export const unhex = (s: string): Uint8Array => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16));
export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export interface KnownEncryption {
  readonly o: string;
  readonly u: string;
  readonly p: number;
  readonly id0: string;
  readonly key: string;
  readonly encryptMetadata: boolean;
}

export const AESV2_SAMPLE: KnownEncryption = {
  o: 'da2f3bd6bd5dcf2dc51f18c57232a76c841b0b8495f692a84279445edf13e170',
  u: '7f0bda178c862997349204a9394dcf3f0021446990b9e4114071a4d9104984c1',
  p: -4,
  id0: 'ea9d4d062ebb33eb3dc4677e5f1aca76',
  key: '15a2bad869ea20d6b6a3e46ca010d355',
  encryptMetadata: true,
};

export const CLEARTEXT_METADATA_SAMPLE: KnownEncryption = {
  o: 'da2f3bd6bd5dcf2dc51f18c57232a76c841b0b8495f692a84279445edf13e170',
  u: 'e05e0710ae68b16ab9d0c65a2027fc4d0021446990b9e4114071a4d9104984c1',
  p: -4,
  id0: '28003184344098324437a789765033f2',
  key: '564b55de6f4248ae3d043faa1bc18f49',
  encryptMetadata: false,
};

export const name = (value: string): PdfValue => ({ kind: 'name', value });
export const str = (b: Uint8Array): PdfValue => ({ kind: 'string', bytes: b, hex: true });

/** A valid V4/R4/AESV2 /Encrypt dictionary for `k`; `override` replaces (or, with `undefined`, removes) top-level entries. */
export function encryptDictFor(k: KnownEncryption, override: Readonly<Record<string, PdfValue | undefined>> = {}): PdfDict {
  const stdCf: PdfDict = new Map<string, PdfValue>([['CFM', name('AESV2')], ['AuthEvent', name('DocOpen')], ['Length', 16]]);
  const d: PdfDict = new Map<string, PdfValue>([
    ['Filter', name('Standard')],
    ['V', 4],
    ['R', 4],
    ['Length', 128],
    ['CF', new Map<string, PdfValue>([['StdCF', stdCf]])],
    ['StmF', name('StdCF')],
    ['StrF', name('StdCF')],
    ['O', str(unhex(k.o))],
    ['U', str(unhex(k.u))],
    ['P', k.p],
  ]);
  if (!k.encryptMetadata) d.set('EncryptMetadata', false);
  for (const [key, v] of Object.entries(override)) {
    if (v === undefined) d.delete(key);
    else d.set(key, v);
  }
  return d;
}

/** Independent (node:crypto) Alg. 1 object key for AES: MD5(fileKey || num(3 LE) || gen(2 LE) || "sAlT"). */
export function nodeObjectKey(fileKey: Uint8Array, num: number, gen: number): Uint8Array {
  const tail = Uint8Array.from([num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255, 0x73, 0x41, 0x6c, 0x54]);
  return new Uint8Array(createHash('md5').update(fileKey).update(tail).digest()).subarray(0, 16);
}

/** Independent (node:crypto) AES-128-CBC encrypt with a caller-chosen IV; output = IV || ciphertext (PKCS#7). */
export function nodeAesEncrypt(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const c = createCipheriv('aes-128-cbc', key, iv);
  return new Uint8Array(Buffer.concat([iv, c.update(plaintext), c.final()]));
}
