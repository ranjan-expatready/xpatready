import { XfaPdfError } from './errors.js';
import { FlateLimitError, inflate, MAX_INFLATED_BYTES } from './flate.js';
import { isWhitespace } from './lexer.js';
import { safeText } from './safe-text.js';
import { asNonNegInt, isPdfName, type PdfDict, type PdfStream, type PdfValue } from './types.js';

export { deflate, inflate } from './flate.js';

/**
 * FD-38 exemption (security invariant): ceiling on the TOTAL memory one reader
 * materialises, in bytes AND parsed structure: every raw stream slice it copies
 * out of the file, every decrypted copy, every decoded (inflated / predicted)
 * result, and every parsed object node and cross-reference entry (charged at
 * PARSE_NODE_COST each, so about 4 million nodes). Many streams each under the
 * per-stream cap, one stream referenced many times, or a huge array split
 * across objects therefore cannot exhaust memory. A denial-of-service guard on
 * hostile uploads; no firm or operator has a reason to vary it.
 */
export const MAX_TOTAL_DECODED_BYTES = 256 * 1024 * 1024;

/**
 * Bytes tolerated after the zlib stream: up to 2 EOL bytes of /Length slack plus
 * the 4-byte Adler-32 trailer, whose last byte can itself be a whitespace byte.
 */
const TRAILER_SLACK = 6;

const fail = (message: string): XfaPdfError => new XfaPdfError('MALFORMED', message);

/**
 * Reverses the PNG row predictors (/Predictor 10-15): each row is one tag byte
 * (None/Sub/Up/Average/Paeth) followed by `ceil(columns*colors*bpc/8)` bytes.
 */
export function undoPngPredictor(bytes: Uint8Array, columns: number, colors = 1, bpc = 8): Uint8Array {
  const positive = (n: number): boolean => Number.isSafeInteger(n) && n >= 1;
  if (!positive(columns) || !positive(colors) || ![1, 2, 4, 8, 16].includes(bpc)) {
    throw fail(`Invalid predictor parameters (Columns ${columns}, Colors ${colors}, BitsPerComponent ${bpc})`);
  }
  const bitsPerRow = columns * colors * bpc;
  if (!Number.isSafeInteger(bitsPerRow)) throw fail('Predictor row size overflows');
  const rowBytes = Math.ceil(bitsPerRow / 8);
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const stride = rowBytes + 1;
  if (bytes.length % stride !== 0) throw fail(`Predictor data length ${bytes.length} is not a whole number of ${stride}-byte rows`);
  const rows = bytes.length / stride;
  const out = new Uint8Array(rows * rowBytes);
  for (let r = 0; r < rows; r++) {
    const tag = bytes[r * stride] ?? 0;
    const src = r * stride + 1;
    const dst = r * rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const x = bytes[src + i] ?? 0;
      const a = i >= bpp ? (out[dst + i - bpp] ?? 0) : 0;
      const b = r > 0 ? (out[dst - rowBytes + i] ?? 0) : 0;
      const c = r > 0 && i >= bpp ? (out[dst - rowBytes + i - bpp] ?? 0) : 0;
      out[dst + i] = (x + predict(tag, a, b, c, dst + i)) & 0xff;
    }
  }
  return out;
}

function predict(tag: number, a: number, b: number, c: number, at: number): number {
  switch (tag) {
    case 0:
      return 0;
    case 1:
      return a;
    case 2:
      return b;
    case 3:
      return (a + b) >> 1;
    case 4: {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      return pb <= pc ? b : c;
    }
    default:
      throw fail(`Invalid PNG predictor row tag ${tag} (output byte ${at})`);
  }
}

function filterNames(value: PdfValue | undefined): string[] {
  if (value === undefined || value === null) return [];
  const one = (v: PdfValue): string => {
    if (isPdfName(v)) return v.value;
    throw fail('Stream /Filter must be a name or an array of names (indirect filters need PdfReader.decodedStream)');
  };
  return Array.isArray(value) ? value.map(one) : [one(value)];
}

function decodeParms(dict: PdfDict): PdfDict | undefined {
  let v = dict.get('DecodeParms') ?? dict.get('DP');
  if (Array.isArray(v)) {
    if (v.length > 1) throw fail('Multiple /DecodeParms entries are not supported');
    v = v[0];
  }
  if (v === undefined || v === null) return undefined;
  if (v instanceof Map) return v;
  throw fail('/DecodeParms must be a dictionary (indirect parameters need PdfReader.decodedStream)');
}

function intParam(parms: PdfDict | undefined, key: string, fallback: number): number {
  const v = parms?.get(key);
  if (v === undefined) return fallback;
  const n = asNonNegInt(v);
  if (n === undefined) throw fail(`/${key} must be a non-negative integer`);
  return n;
}

/**
 * Inflates, tolerating whitespace after the zlib stream (a /Length that includes
 * the EOL). Runtimes differ on trailing bytes, so this is explicit: try the data
 * as given, then drop one trailing whitespace byte at a time. Never strips
 * blindly: an Adler-32 trailer may legitimately end in a whitespace byte.
 */
async function inflateTrimmed(raw: Uint8Array, limit: number): Promise<Uint8Array> {
  let first: XfaPdfError | undefined;
  let end = raw.length;
  for (let attempt = 0; attempt <= TRAILER_SLACK; attempt++) {
    try {
      return await inflate(raw.subarray(0, end), limit);
    } catch (e) {
      if (!(e instanceof XfaPdfError) || e instanceof FlateLimitError) throw e;
      first ??= e;
    }
    if (end === 0 || !isWhitespace(raw[end - 1] ?? 0)) break;
    end -= 1;
  }
  throw first ?? fail('Flate inflate failed');
}

/** Decodes a stream's /Filter chain. Supports no filter or a single /FlateDecode (+ PNG predictor). Output is capped at `limit`. */
export async function decodeStream(stream: PdfStream, limit: number = MAX_INFLATED_BYTES): Promise<Uint8Array> {
  const names = filterNames(stream.dict.get('Filter'));
  if (names.length === 0) return stream.raw;
  if (names.length > 1) throw fail(`Unsupported filter chain: ${safeText(names.join(', '))}`);
  if (names[0] !== 'FlateDecode') throw fail(`Unsupported stream filter: ${safeText(names[0] ?? '')}`);
  const inflated = await inflateTrimmed(stream.raw, limit);
  const parms = decodeParms(stream.dict);
  const predictor = intParam(parms, 'Predictor', 1);
  if (predictor === 1) return inflated;
  if (predictor < 10 || predictor > 15) throw fail(`Unsupported /Predictor ${predictor}`);
  return undoPngPredictor(
    inflated,
    intParam(parms, 'Columns', 1),
    intParam(parms, 'Colors', 1),
    intParam(parms, 'BitsPerComponent', 8),
  );
}

/**
 * Cumulative ceiling on the stream bytes one reader materialises (see MAX_TOTAL_DECODED_BYTES). The reader
 * `charge`s every raw slice and decrypted copy when it creates it; `decode` charges a result only when it is a
 * NEW buffer, so an unfiltered stream (whose raw bytes were charged when they were read) is not charged twice.
 * The budget is checked, not reserved: callers must decode sequentially (concurrent fan-out can
 * overshoot by fan-out x MAX_INFLATED_BYTES).
 */
export class DecodeBudget {
  private remaining: number;

  constructor(total: number = MAX_TOTAL_DECODED_BYTES) {
    this.remaining = total;
  }

  /** Bytes still available (read-only; exposed so tests can assert what was charged). */
  get remainingBytes(): number {
    return this.remaining;
  }

  /** Charges `bytes` of newly materialised stream data; MALFORMED once the total would exceed the ceiling. */
  charge(bytes: number): void {
    if (bytes > this.remaining) throw fail('Document exceeds the per-reader memory budget (stream bytes and parsed structure)');
    this.remaining -= bytes;
  }

  async decode(stream: PdfStream): Promise<Uint8Array> {
    const out = await decodeStream(stream, Math.min(MAX_INFLATED_BYTES, this.remaining));
    if (out !== stream.raw) this.remaining -= out.length;
    return out;
  }
}
