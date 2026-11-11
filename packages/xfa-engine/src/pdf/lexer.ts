import { ByteSink } from './byte-sink.js';
import { malformed } from './errors.js';
import { MAX_ECHO_CHARS, safeText } from './safe-text.js';

export type PdfDelimiter = '[' | ']' | '<<' | '>>' | '{' | '}';

export type PdfToken =
  | { readonly kind: 'number'; readonly value: number; readonly integer: boolean }
  | { readonly kind: 'name'; readonly value: string }
  | { readonly kind: 'string'; readonly bytes: Uint8Array; readonly hex: boolean }
  | { readonly kind: 'keyword'; readonly value: string }
  | { readonly kind: 'delim'; readonly value: PdfDelimiter }
  | { readonly kind: 'eof' };

const NUL = 0x00;
const TAB = 0x09;
export const LF = 0x0a;
const FF = 0x0c;
export const CR = 0x0d;
const SPACE = 0x20;
const HASH = 0x23;
const PERCENT = 0x25;
const LPAREN = 0x28;
const RPAREN = 0x29;
const SOLIDUS = 0x2f;
const LT = 0x3c;
const GT = 0x3e;
const LBRACKET = 0x5b;
const BACKSLASH = 0x5c;
const RBRACKET = 0x5d;
const LBRACE = 0x7b;
const RBRACE = 0x7d;

/**
 * FD-38 exemption (security invariant): longest run of regular characters accepted as one number or
 * keyword. A real PDF number or keyword is a few dozen bytes at most, so 255 is far above anything legitimate; the
 * ceiling stops a hostile megabyte-long token from costing a megabyte of work and memory. No firm or operator has a
 * reason to vary it.
 */
export const MAX_REGULAR_TOKEN_BYTES = 255;

/**
 * FD-38 exemption (security invariant): longest /Name accepted, counted in decoded bytes (a `#xx` escape is one
 * byte). ISO 32000-1 Annex C sets an implementation limit of 127 bytes; 64 KiB is generous enough never to reject a
 * real file while bounding the per-byte array a hostile unterminated name would otherwise grow to the file size.
 * No firm or operator has a reason to vary it.
 */
export const MAX_NAME_BYTES = 65536;
/**
 * FD-38 exemption (security invariant): longest literal or hex string accepted, counted in decoded bytes. Real
 * strings are small (a signature /Contents is tens of KB, an outline title a few dozen bytes); 16 MiB is hundreds of
 * times the largest legitimate value yet well under the 50 MiB file ceiling, and it bounds the buffer a hostile
 * unterminated string can grow. No firm or operator has a reason to vary it.
 */
export const MAX_STRING_BYTES = 16 * 1024 * 1024;

/** Unambiguous (no overlapping quantifiers), so matching is linear in the token length. */
const NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function isWhitespace(b: number): boolean {
  return b === NUL || b === TAB || b === LF || b === FF || b === CR || b === SPACE;
}

function isDelimiter(b: number): boolean {
  return (
    b === LPAREN || b === RPAREN || b === LT || b === GT || b === LBRACKET || b === RBRACKET ||
    b === LBRACE || b === RBRACE || b === SOLIDUS || b === PERCENT
  );
}

function isRegular(b: number): boolean {
  return !isWhitespace(b) && !isDelimiter(b);
}

/** Value of a hex digit byte, or -1. */
function hexValue(b: number | undefined): number {
  if (b === undefined) return -1;
  if (b >= 0x30 && b <= 0x39) return b - 0x30;
  if (b >= 0x41 && b <= 0x46) return b - 0x41 + 10;
  if (b >= 0x61 && b <= 0x66) return b - 0x61 + 10;
  return -1;
}

/** Tokenizer over PDF object syntax (ISO 32000-1 §7.2). Every read is bounds-checked. */
export class PdfLexer {
  readonly bytes: Uint8Array;
  pos: number;

  constructor(bytes: Uint8Array, pos = 0) {
    this.bytes = bytes;
    this.pos = pos;
  }

  nextToken(): PdfToken {
    this.skipWhitespaceAndComments();
    const b = this.bytes[this.pos];
    if (b === undefined) return { kind: 'eof' };
    switch (b) {
      case SOLIDUS:
        return this.readName();
      case LPAREN:
        return this.readLiteralString();
      case LT:
        if (this.bytes[this.pos + 1] === LT) {
          this.pos += 2;
          return { kind: 'delim', value: '<<' };
        }
        return this.readHexString();
      case GT:
        if (this.bytes[this.pos + 1] === GT) {
          this.pos += 2;
          return { kind: 'delim', value: '>>' };
        }
        throw malformed('Unexpected ">"', this.pos);
      case LBRACKET:
        this.pos += 1;
        return { kind: 'delim', value: '[' };
      case RBRACKET:
        this.pos += 1;
        return { kind: 'delim', value: ']' };
      case LBRACE:
        this.pos += 1;
        return { kind: 'delim', value: '{' };
      case RBRACE:
        this.pos += 1;
        return { kind: 'delim', value: '}' };
      case RPAREN:
        throw malformed('Unexpected ")"', this.pos);
      default:
        return this.readRegular();
    }
  }

  private skipWhitespaceAndComments(): void {
    for (;;) {
      const b = this.bytes[this.pos];
      if (b === undefined) return;
      if (isWhitespace(b)) {
        this.pos += 1;
      } else if (b === PERCENT) {
        while (this.pos < this.bytes.length && this.bytes[this.pos] !== LF && this.bytes[this.pos] !== CR) {
          this.pos += 1;
        }
      } else {
        return;
      }
    }
  }

  /** Number or bare keyword: a maximal run of regular characters. */
  private readRegular(): PdfToken {
    const start = this.pos;
    while (this.pos < this.bytes.length && isRegular(this.bytes[this.pos] ?? NUL)) {
      this.pos += 1;
      if (this.pos - start > MAX_REGULAR_TOKEN_BYTES) throw malformed(`Token longer than ${MAX_REGULAR_TOKEN_BYTES} bytes`, start);
    }
    let text = '';
    for (let i = start; i < this.pos; i++) text += String.fromCharCode(this.bytes[i] ?? 0);
    const first = text.charCodeAt(0);
    const numeric = (first >= 0x30 && first <= 0x39) || first === 0x2b || first === 0x2d || first === 0x2e;
    if (!numeric) return { kind: 'keyword', value: text };
    if (!NUMBER_RE.test(text)) throw malformed(`Invalid number "${safeText(text)}"`, start);
    return { kind: 'number', value: Number(text), integer: !text.includes('.') };
  }

  private readName(): PdfToken {
    const start = this.pos;
    this.pos += 1; // '/'
    const out: number[] = [];
    while (this.pos < this.bytes.length) {
      const b = this.bytes[this.pos] ?? NUL;
      if (!isRegular(b)) break;
      const hi = b === HASH ? hexValue(this.bytes[this.pos + 1]) : -1;
      const lo = b === HASH ? hexValue(this.bytes[this.pos + 2]) : -1;
      if (hi >= 0 && lo >= 0) {
        out.push(hi * 16 + lo);
        this.pos += 3;
      } else {
        out.push(b);
        this.pos += 1;
      }
      if (out.length > MAX_NAME_BYTES) {
        const shown = out.slice(0, MAX_ECHO_CHARS).map((byte) => String.fromCharCode(byte)).join('');
        throw malformed(`Name longer than ${MAX_NAME_BYTES} bytes: /${safeText(shown)}`, start);
      }
    }
    // Names are byte sequences (ISO 32000-1 §7.3.5): map bytes 1:1 so distinct names never collide.
    // Built incrementally: spreading a hostile, unbounded name into fromCharCode overflows the stack.
    let value = '';
    for (const byte of out) value += String.fromCharCode(byte);
    return { kind: 'name', value };
  }

  private readHexString(): PdfToken {
    const start = this.pos;
    this.pos += 1; // '<'
    const out = new ByteSink(MAX_STRING_BYTES, () => malformed(`String longer than ${MAX_STRING_BYTES} bytes`, start));
    let pending = -1;
    for (;;) {
      const b = this.bytes[this.pos];
      if (b === undefined) throw malformed('Unterminated hex string', start);
      this.pos += 1;
      if (b === GT) break;
      if (isWhitespace(b)) continue;
      const v = hexValue(b);
      if (v < 0) throw malformed('Invalid hex string digit', this.pos - 1);
      if (pending < 0) {
        pending = v;
      } else {
        out.push(pending * 16 + v);
        pending = -1;
      }
    }
    if (pending >= 0) out.push(pending * 16);
    return { kind: 'string', bytes: out.toBytes(), hex: true };
  }

  private readLiteralString(): PdfToken {
    const start = this.pos;
    this.pos += 1; // '('
    const out = new ByteSink(MAX_STRING_BYTES, () => malformed(`String longer than ${MAX_STRING_BYTES} bytes`, start));
    let depth = 1;
    for (;;) {
      const b = this.bytes[this.pos];
      if (b === undefined) throw malformed('Unterminated literal string', start);
      this.pos += 1;
      if (b === LPAREN) {
        depth += 1;
        out.push(b);
      } else if (b === RPAREN) {
        depth -= 1;
        if (depth === 0) break;
        out.push(b);
      } else if (b === BACKSLASH) {
        this.readEscape(out, start);
      } else if (b === CR) {
        if (this.bytes[this.pos] === LF) this.pos += 1;
        out.push(LF);
      } else {
        out.push(b);
      }
    }
    return { kind: 'string', bytes: out.toBytes(), hex: false };
  }

  /** Handles the byte(s) after a backslash in a literal string (ISO 32000-1 Table 3). */
  private readEscape(out: ByteSink, stringStart: number): void {
    const c = this.bytes[this.pos];
    if (c === undefined) throw malformed('Unterminated literal string', stringStart);
    this.pos += 1;
    switch (c) {
      case 0x6e: out.push(LF); return; // \n
      case 0x72: out.push(CR); return; // \r
      case 0x74: out.push(TAB); return; // \t
      case 0x62: out.push(0x08); return; // \b
      case 0x66: out.push(FF); return; // \f
      case CR:
        if (this.bytes[this.pos] === LF) this.pos += 1;
        return; // line continuation
      case LF:
        return; // line continuation
      default:
        break;
    }
    if (c >= 0x30 && c <= 0x37) {
      let value = c - 0x30;
      for (let i = 0; i < 2; i++) {
        const d = this.bytes[this.pos];
        if (d === undefined || d < 0x30 || d > 0x37) break;
        value = value * 8 + (d - 0x30);
        this.pos += 1;
      }
      out.push(value & 0xff);
      return;
    }
    out.push(c); // \( \) \\ and unknown escapes: the character itself
  }
}
