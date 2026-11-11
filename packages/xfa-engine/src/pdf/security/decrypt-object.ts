import { XfaPdfError } from '../errors.js';
import { isPdfName, isPdfStream, type PdfDict, type PdfStream, type PdfString, type PdfValue } from '../types.js';
import { mapStrings } from './map-strings.js';
import type { SecurityHandler } from './standard-handler.js';

const typeOf = (dict: PdfDict): string | undefined => {
  const t = dict.get('Type');
  return isPdfName(t) ? t.value : undefined;
};

/** Strings (also nested in arrays and dictionaries) decrypt with the key of the indirect object that holds them. */
const decryptStrings = (h: SecurityHandler, num: number, gen: number, v: PdfValue): Promise<PdfValue> =>
  mapStrings(v, async (str): Promise<PdfString> => ({ kind: 'string', bytes: await h.decryptString(num, gen, str.bytes), hex: str.hex }));

/**
 * Decrypts one top-level indirect object (ISO 32000-1 §7.6.2). Stream bytes are decrypted here, so the
 * returned `raw` is ready for the filter chain (decrypt first, then Flate). Cross-reference streams are
 * never encrypted; /Metadata is left alone when the document says so.
 */
export async function decryptIndirect(h: SecurityHandler, num: number, gen: number, value: PdfValue | PdfStream): Promise<PdfValue | PdfStream> {
  if (!isPdfStream(value)) return decryptStrings(h, num, gen, value);
  const type = typeOf(value.dict);
  if (type === 'XRef') return value;
  const filter = value.dict.get('Filter');
  if ((Array.isArray(filter) ? filter : [filter]).some((f) => isPdfName(f) && f.value === 'Crypt')) {
    throw new XfaPdfError('UNSUPPORTED_SECURITY', 'Crypt filters are not supported');
  }
  const dict = await decryptStrings(h, num, gen, value.dict);
  if (!(dict instanceof Map)) return value;
  const clear = type === 'Metadata' && !h.encryptMetadata;
  return { dict, raw: clear ? value.raw : await h.decryptStream(num, gen, value.raw) };
}
