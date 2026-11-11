import { md5 } from '@noble/hashes/legacy.js';
import { concatBytes } from '../concat-bytes.js';
import { XfaPdfError } from '../errors.js';
import type { PdfDict } from '../types.js';
import { parseEncryptDict } from './encrypt-dict.schema.js';
import { rc4 } from './rc4.js';

/** Per-object decryption/encryption for one open document. Plain AES-128-CBC; the object key binds num and gen. */
export interface SecurityHandler {
  /** The Alg. 2 file key. Exposed for the writer (W01-T05); never put it in messages or logs. */
  readonly fileKey: Uint8Array;
  readonly encryptMetadata: boolean;
  decryptString(num: number, gen: number, bytes: Uint8Array): Promise<Uint8Array>;
  decryptStream(num: number, gen: number, bytes: Uint8Array): Promise<Uint8Array>;
  /** Deterministic: IV = first 16 bytes of SHA-256(objectKey || plaintext), so equal input gives equal output. */
  encryptStream(num: number, gen: number, plaintext: Uint8Array): Promise<Uint8Array>;
  /** Same rule and key as `encryptStream`; strings and streams of one object share the object key. */
  encryptString(num: number, gen: number, plaintext: Uint8Array): Promise<Uint8Array>;
}

/** ISO 32000-1 Algorithm 2 padding string. */
const PAD = Uint8Array.of(
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff, 0xfa, 0x01, 0x08,
  0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c, 0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
);
const SALT = Uint8Array.of(0x73, 0x41, 0x6c, 0x54); // "sAlT"
const KEY_BYTES = 16;
const BLOCK = 16;

/** Algorithm 2 with the empty user password. */
function deriveFileKey(o: Uint8Array, p: number, id0: Uint8Array, encryptMetadata: boolean): Uint8Array {
  const pLe = new Uint8Array(4);
  new DataView(pLe.buffer).setUint32(0, p >>> 0, true);
  let h = md5(concatBytes([PAD, o, pLe, id0, encryptMetadata ? new Uint8Array(0) : Uint8Array.of(255, 255, 255, 255)]));
  for (let i = 0; i < 50; i++) h = md5(h.subarray(0, KEY_BYTES));
  return h.slice(0, KEY_BYTES);
}

/** Algorithm 5: is `u` (first 16 bytes) the value produced by this key and document ID? */
function verifyUserEntry(key: Uint8Array, id0: Uint8Array, u: Uint8Array): boolean {
  let x = rc4(key, md5(concatBytes([PAD, id0])));
  for (let i = 1; i <= 19; i++) x = rc4(key.map((b) => b ^ i), x);
  let diff = 0;
  for (let i = 0; i < KEY_BYTES; i++) diff |= (x[i] ?? 0) ^ (u[i] ?? 0);
  return diff === 0;
}

/** Algorithm 1 for AES: the key is MD5(fileKey || num(3 LE) || gen(2 LE) || "sAlT"), already 16 bytes. */
function objectKey(fileKey: Uint8Array, num: number, gen: number): Uint8Array {
  const ids = Uint8Array.of(num & 255, (num >> 8) & 255, (num >> 16) & 255, gen & 255, (gen >> 8) & 255);
  return md5(concatBytes([fileKey, ids, SALT])).slice(0, KEY_BYTES);
}

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey('raw', raw.slice(), 'AES-CBC', false, ['encrypt', 'decrypt']);
  } catch (cause) {
    throw new XfaPdfError('MALFORMED', 'AES key import failed', { cause });
  }
}

async function aesDecrypt(raw: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  // Zero bytes: an empty string some producers leave unencrypted. IV only (16 bytes): an empty value with no
  // data block, which Acrobat-produced files contain (signature /DigestValue) and qpdf reads as empty.
  // Otherwise: IV + at least one padded block.
  if (data.length === 0 || data.length === BLOCK) return new Uint8Array(0);
  if (data.length < 2 * BLOCK || data.length % BLOCK !== 0) {
    throw new XfaPdfError('MALFORMED', 'Encrypted data is not a 16-byte IV followed by whole AES blocks');
  }
  const key = await aesKey(raw);
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: data.slice(0, BLOCK) }, key, data.slice(BLOCK)));
  } catch (cause) {
    throw new XfaPdfError('MALFORMED', 'Encrypted data has invalid AES padding', { cause });
  }
}

async function aesEncrypt(raw: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  try {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', concatBytes([raw, plaintext])));
    const iv = digest.slice(0, BLOCK);
    const key = await aesKey(raw);
    const body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, plaintext.slice()));
    return concatBytes([iv, body]);
  } catch (cause) {
    if (cause instanceof XfaPdfError) throw cause;
    throw new XfaPdfError('MALFORMED', 'AES encryption failed', { cause });
  }
}

/**
 * Opens a V4/R4/AESV2 document with the empty user password (ISO 32000-1 §7.6.3). An unsupported
 * dictionary is UNSUPPORTED_SECURITY; a /U that does not verify (non-empty password, or wrong document ID)
 * is WRONG_PASSWORD. Messages never contain key material.
 */
export function createStandardHandler(encryptDict: PdfDict, id0: Uint8Array): Promise<SecurityHandler> {
  // Deferred so every failure, including a thrown one, reaches the caller as a rejection.
  return Promise.resolve().then(() => buildHandler(encryptDict, id0));
}

function buildHandler(encryptDict: PdfDict, id0: Uint8Array): SecurityHandler {
  const d = parseEncryptDict(encryptDict);
  const fileKey = deriveFileKey(d.O, d.P, id0, d.EncryptMetadata);
  if (!verifyUserEntry(fileKey, id0, d.U)) {
    throw new XfaPdfError('WRONG_PASSWORD', 'The document requires a non-empty password (the empty user password did not verify)');
  }
  return {
    fileKey,
    encryptMetadata: d.EncryptMetadata,
    decryptString: (num, gen, bytes) => aesDecrypt(objectKey(fileKey, num, gen), bytes),
    decryptStream: (num, gen, bytes) => aesDecrypt(objectKey(fileKey, num, gen), bytes),
    encryptStream: (num, gen, plaintext) => aesEncrypt(objectKey(fileKey, num, gen), plaintext),
    encryptString: (num, gen, plaintext) => aesEncrypt(objectKey(fileKey, num, gen), plaintext),
  };
}
