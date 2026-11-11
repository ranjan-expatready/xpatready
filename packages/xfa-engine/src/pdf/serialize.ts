import { XfaPdfError } from './errors.js';
import { isPdfName, isPdfRef, isPdfString, type PdfName, type PdfString, type PdfValue } from './types.js';

/**
 * FD-38 exemption (correctness constant): digits after the decimal point written for a real. Fixed notation
 * (the PDF number syntax has no exponent); ten places keep every coordinate-sized value exact to the
 * precision any PDF reader keeps. No firm or operator has a reason to vary it.
 */
const REAL_DECIMALS = 10;
/**
 * FD-38 exemption (correctness constant): beyond this magnitude `toFixed` switches to exponent notation,
 * which PDF cannot express. A property of the number syntax; no firm or operator has a reason to vary it.
 */
const MAX_NUMBER_MAGNITUDE = 1e21;

const fail = (message: string): XfaPdfError => new XfaPdfError('MALFORMED', message);

const HEX_DIGITS = new TextEncoder().encode('0123456789abcdef');
const ASCII = new TextDecoder();

/** Regular characters other than "#" are written as-is (ISO 32000-1 §7.3.5): printable ASCII except delimiters. */
function needsEscape(code: number): boolean {
  if (code <= 0x20 || code >= 0x7f || code === 0x23) return true;
  return '()<>[]{}/%'.includes(String.fromCharCode(code));
}

/** Written into one byte buffer and decoded once: a `+=` per character would build ~30 bytes of rope per input character. */
function serializeName(n: PdfName): string {
  const out = new Uint8Array(1 + n.value.length * 3);
  let used = 0;
  out[used++] = 0x2f; // '/'
  for (let i = 0; i < n.value.length; i++) {
    const code = n.value.charCodeAt(i);
    if (code > 0xff) throw fail('Name contains a character above U+00FF');
    if (needsEscape(code)) {
      out[used++] = 0x23; // '#'
      out[used++] = HEX_DIGITS[code >> 4] ?? 0;
      out[used++] = HEX_DIGITS[code & 15] ?? 0;
    } else {
      out[used++] = code;
    }
  }
  return ASCII.decode(out.subarray(0, used));
}

/** Hex digits are written into one byte buffer and decoded once: a `+=` per byte would build ~30 bytes of rope per input byte. */
function serializeString(s: PdfString): string {
  const digits = new Uint8Array(s.bytes.length * 2);
  s.bytes.forEach((b, i) => {
    digits[2 * i] = HEX_DIGITS[b >> 4] ?? 0;
    digits[2 * i + 1] = HEX_DIGITS[b & 15] ?? 0;
  });
  return `<${ASCII.decode(digits)}>`;
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) >= MAX_NUMBER_MAGNITUDE) throw fail(`Number ${String(n)} cannot be written in PDF syntax`);
  if (Number.isInteger(n)) return String(n === 0 ? 0 : n);
  const fixed = n.toFixed(REAL_DECIMALS).replace(/0+$/, '').replace(/\.$/, '');
  return fixed === '-0' ? '0' : fixed;
}

/**
 * Writes a PDF value as ASCII object syntax: names re-escaped (`#xx`), strings hex-encoded, numbers without
 * exponent, references as `n g R`. The result parses back to a deep-equal value (strings become hex strings).
 */
export function serializeValue(v: PdfValue): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return serializeNumber(v);
  if (isPdfName(v)) return serializeName(v);
  if (isPdfString(v)) return serializeString(v);
  if (isPdfRef(v)) return `${v.num} ${v.gen} R`;
  if (Array.isArray(v)) return `[${v.map((e) => serializeValue(e)).join(' ')}]`;
  const parts: string[] = [];
  for (const [key, value] of v) parts.push(serializeName({ kind: 'name', value: key }), serializeValue(value));
  return `<<${parts.join(' ')}>>`;
}
