import { isPdfName, type PdfDict, type PdfString, type PdfValue } from '../types.js';
import { mapStrings } from './map-strings.js';
import type { SecurityHandler } from './standard-handler.js';

/**
 * Encrypts every string of a stream dictionary with the key of the indirect object (`num`, `gen`) that holds it,
 * the mirror of the string handling in `decryptIndirect` (same strings, same signature /Contents exemption).
 * Returns a new value; the input is not modified.
 */
export function encryptStrings(h: SecurityHandler, num: number, gen: number, v: PdfValue): Promise<PdfValue> {
  return mapStrings(v, async (s): Promise<PdfString> => ({ kind: 'string', bytes: await h.encryptString(num, gen, s.bytes), hex: true }));
}

/** True for a stream dictionary whose content stays in clear in a document with `/EncryptMetadata false`. */
export function isCleartextMetadata(h: SecurityHandler, dict: PdfDict): boolean {
  const type = dict.get('Type');
  return isPdfName(type) && type.value === 'Metadata' && !h.encryptMetadata;
}
