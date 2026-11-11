import { isPdfName, isPdfString, type PdfDict, type PdfString, type PdfValue } from '../types.js';

const typeOf = (dict: PdfDict): string | undefined => {
  const t = dict.get('Type');
  return isPdfName(t) ? t.value : undefined;
};

/** ISO 32000-1 7.6.1: a signature dictionary's /Contents is never encrypted. /Type is optional, so /ByteRange also marks one. */
function isSignatureDict(dict: PdfDict): boolean {
  const type = typeOf(dict);
  return type === 'Sig' || type === 'DocTimeStamp' || dict.has('ByteRange');
}

/**
 * Returns a copy of `v` with `fn` applied to every string, also those nested in arrays and dictionaries, except a
 * signature dictionary's /Contents. Strictly sequential and in document order (AES calls must not fan out).
 * The input is not modified. Shared by decryption and re-encryption so both treat exactly the same strings.
 */
export async function mapStrings(v: PdfValue, fn: (s: PdfString) => Promise<PdfValue>): Promise<PdfValue> {
  if (isPdfString(v)) return fn(v);
  if (Array.isArray(v)) {
    const out: PdfValue[] = [];
    for (const e of v) out.push(await mapStrings(e, fn));
    return out;
  }
  if (v instanceof Map) {
    const out: PdfDict = new Map();
    const signature = isSignatureDict(v);
    for (const [k, e] of v) out.set(k, signature && k === 'Contents' ? e : await mapStrings(e, fn));
    return out;
  }
  return v;
}
