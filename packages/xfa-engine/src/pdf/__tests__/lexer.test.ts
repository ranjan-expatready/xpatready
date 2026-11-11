import { describe, expect, it } from 'vitest';
import { enc } from './bytes.js';
import { XfaPdfError } from '../errors.js';
import { MAX_NAME_BYTES, MAX_REGULAR_TOKEN_BYTES, MAX_STRING_BYTES, PdfLexer, type PdfToken } from '../lexer.js';

const tokens = (s: string): PdfToken[] => {
  const lexer = new PdfLexer(enc(s));
  const out: PdfToken[] = [];
  for (;;) {
    const t = lexer.nextToken();
    if (t.kind === 'eof') return out;
    out.push(t);
  }
};
const str = (s: string): string => {
  const t = tokens(s)[0];
  if (t?.kind !== 'string') throw new Error('not a string token');
  return String.fromCharCode(...t.bytes);
};

describe('PdfLexer', () => {
  it('escaped parens inside a string must not end the string early', () => {
    expect(str('(a\\(b\\)c\\\\)')).toBe('a(b)c\\');
  });

  it('balanced unescaped parens nest instead of terminating the string', () => {
    expect(str('(a(b)c)')).toBe('a(b)c');
  });

  it('octal escapes decode to the byte, so non-ASCII string bytes are not lost', () => {
    expect(str('(\\101)')).toBe('A');
    expect(str('(\\0533)')).toBe('+3');
    expect(str('(\\5)')).toBe('\x05');
  });

  it('single-character escapes decode to control characters', () => {
    expect(str('(\\n\\r\\t\\b\\f)')).toBe('\n\r\t\b\f');
  });

  it('a backslash-EOL line continuation is dropped rather than injecting a newline', () => {
    expect(str('(ab\\\ncd)')).toBe('abcd');
    expect(str('(ab\\\r\ncd)')).toBe('abcd');
    expect(str('(ab\\\rcd)')).toBe('abcd');
  });

  it('a raw CRLF or CR inside a string reads as a single LF per ISO 32000-1 §7.3.4.2', () => {
    expect(str('(a\r\nb\rc)')).toBe('a\nb\nc');
  });

  it('an unknown escape keeps the character instead of the backslash', () => {
    expect(str('(\\q)')).toBe('q');
  });

  it('an unterminated literal string is MALFORMED, not an out-of-range read', () => {
    expect(() => tokens('(abc')).toThrow(XfaPdfError);
    expect(() => tokens('(abc\\')).toThrow(XfaPdfError);
  });

  it('hex strings decode, ignore whitespace and are tagged hex', () => {
    const t = tokens('<48 65 6C6C6F>')[0];
    expect(t).toMatchObject({ kind: 'string', hex: true });
    expect(t?.kind === 'string' && String.fromCharCode(...t.bytes)).toBe('Hello');
  });

  it('an odd hex digit count pads a trailing 0, so <486> is 0x48 0x60 not 0x48 0x06', () => {
    const t = tokens('<486>')[0];
    expect(t?.kind === 'string' && Array.from(t.bytes)).toEqual([0x48, 0x60]);
  });

  it('a non-hex character or missing > in a hex string is MALFORMED', () => {
    expect(() => tokens('<48ZZ>')).toThrow(XfaPdfError);
    expect(() => tokens('<4865')).toThrow(XfaPdfError);
  });

  it('#xx name escapes decode so /A#20B is the name "A B"', () => {
    expect(tokens('/A#20B')[0]).toEqual({ kind: 'name', value: 'A B' });
  });

  it('a name ends at a delimiter, so /Type/Page yields two names', () => {
    expect(tokens('/Type/Page')).toEqual([
      { kind: 'name', value: 'Type' },
      { kind: 'name', value: 'Page' },
    ]);
  });

  it('name bytes map 1:1, so non-ASCII escapes are never decoded as UTF-8', () => {
    expect(tokens('/#C3#A9')[0]).toEqual({ kind: 'name', value: '\u00c3\u00a9' });
  });

  it('a name at the MAX_NAME_BYTES ceiling parses instead of crashing the lexer with a RangeError (longer ones are MALFORMED, see below)', () => {
    const name = tokens(`/${'A'.repeat(MAX_NAME_BYTES)}`)[0];
    expect(name?.kind).toBe('name');
    expect(name?.kind === 'name' ? name.value.length : 0).toBe(MAX_NAME_BYTES);
  });

  it('a lone slash is the empty name and a malformed #-escape stays literal', () => {
    expect(tokens('/ ')[0]).toEqual({ kind: 'name', value: '' });
    expect(tokens('/A#zz')[0]).toEqual({ kind: 'name', value: 'A#zz' });
  });

  it('signed and fractional numbers parse: -.5, +3, 4., 007', () => {
    expect(tokens('-.5 +3 4. 007')).toEqual([
      { kind: 'number', value: -0.5, integer: false },
      { kind: 'number', value: 3, integer: true },
      { kind: 'number', value: 4, integer: false },
      { kind: 'number', value: 7, integer: true },
    ]);
  });

  it('a malformed number such as 1.2.3 or a bare sign is MALFORMED, not NaN', () => {
    expect(() => tokens('1.2.3')).toThrow(XfaPdfError);
    expect(() => tokens('-')).toThrow(XfaPdfError);
  });

  it('% comments are skipped to end of line and never become tokens', () => {
    expect(tokens('1 %ignore (me\n2')).toEqual([
      { kind: 'number', value: 1, integer: true },
      { kind: 'number', value: 2, integer: true },
    ]);
    expect(tokens('%only a comment')).toEqual([]);
  });

  it('delimiters tokenise individually, with << and >> as dictionary brackets', () => {
    expect(tokens('<</A[1]>>')).toEqual([
      { kind: 'delim', value: '<<' },
      { kind: 'name', value: 'A' },
      { kind: 'delim', value: '[' },
      { kind: 'number', value: 1, integer: true },
      { kind: 'delim', value: ']' },
      { kind: 'delim', value: '>>' },
    ]);
  });

  it('keywords stop at delimiters and whitespace, so "true]" and "R>>" split correctly', () => {
    expect(tokens('true] R>>')).toEqual([
      { kind: 'keyword', value: 'true' },
      { kind: 'delim', value: ']' },
      { kind: 'keyword', value: 'R' },
      { kind: 'delim', value: '>>' },
    ]);
  });

  it('octal overflow (\\777) wraps to the single byte 0xFF, not a multi-byte value', () => {
    const t = tokens('(\\777)')[0];
    expect(t?.kind === 'string' && Array.from(t.bytes)).toEqual([0xff]);
  });

  it('a lone "." or "+" is MALFORMED, not NaN or a keyword', () => {
    expect(() => tokens('.')).toThrow(XfaPdfError);
    expect(() => tokens('+')).toThrow(XfaPdfError);
  });

  it('a stray ) or a lone > is MALFORMED', () => {
    expect(() => tokens(')')).toThrow(XfaPdfError);
    expect(() => tokens('>')).toThrow(XfaPdfError);
  });

  it('empty input and an out-of-range start offset yield eof forever without throwing', () => {
    const lexer = new PdfLexer(new Uint8Array(0), 99);
    expect(lexer.nextToken().kind).toBe('eof');
    expect(lexer.nextToken().kind).toBe('eof');
  });

  it('pos can be saved and restored for lookahead', () => {
    const lexer = new PdfLexer(enc('1 2 3'));
    lexer.nextToken();
    const mark = lexer.pos;
    lexer.nextToken();
    lexer.pos = mark;
    expect(lexer.nextToken()).toEqual({ kind: 'number', value: 2, integer: true });
  });
});

describe('PdfLexer regular-token bounds (hostile numbers and keywords)', () => {
  it('a 1,000,000-digit token followed by a letter is MALFORMED in under 200 ms (no quadratic regex backtracking)', () => {
    const hostile = '1'.repeat(1_000_000) + 'a';
    const started = performance.now();
    let caught: unknown;
    try {
      tokens(hostile);
    } catch (e) {
      caught = e;
    }
    const elapsed = performance.now() - started;
    expect(caught).toBeInstanceOf(XfaPdfError);
    expect((caught as XfaPdfError).code).toBe('MALFORMED');
    expect(elapsed).toBeLessThan(200);
  });

  it('a number or keyword of exactly MAX_REGULAR_TOKEN_BYTES lexes; one byte more is MALFORMED', () => {
    expect(tokens('1'.repeat(MAX_REGULAR_TOKEN_BYTES))[0]?.kind).toBe('number');
    expect(tokens('k'.repeat(MAX_REGULAR_TOKEN_BYTES))[0]?.kind).toBe('keyword');
    expect(() => tokens('1'.repeat(MAX_REGULAR_TOKEN_BYTES + 1))).toThrow(XfaPdfError);
    expect(() => tokens('k'.repeat(MAX_REGULAR_TOKEN_BYTES + 1))).toThrow(XfaPdfError);
  });

  it('the ceiling is 255 bytes', () => {
    expect(MAX_REGULAR_TOKEN_BYTES).toBe(255);
  });

  it('valid numbers still lex: signs, leading and trailing dots, long fractions', () => {
    const kinds = tokens('+1 -2 .5 3. 007 -.25 12345.67890').map((t) => (t.kind === 'number' ? t.value : NaN));
    expect(kinds).toEqual([1, -2, 0.5, 3, 7, -0.25, 12345.6789]);
  });

  it('malformed numbers are still rejected: double dot, sign in the middle, trailing letter', () => {
    for (const bad of ['1.2.3', '1-2', '1a', '--1', '+-1', '1e5']) {
      expect(() => tokens(bad), bad).toThrow(XfaPdfError);
    }
  });
});

describe('PdfLexer error messages never echo raw file text (F5)', () => {
  const messageOf = (s: string): string => {
    try {
      tokens(s);
    } catch (e) {
      if (e instanceof XfaPdfError) return e.message;
      throw e;
    }
    throw new Error('expected the lexer to throw');
  };
  const hasControl = (m: string): boolean => /[\x00-\x1f\x7f-\xff]/.test(m);

  it('a 200-byte invalid number full of ESC bytes yields a bounded message with no raw control bytes', () => {
    const m = messageOf(`1\x1b`.repeat(100));
    expect(m.length).toBeLessThan(260);
    expect(hasControl(m)).toBe(false);
  });

  it('a 10,000-byte token with ESC bytes yields a bounded message with no raw control bytes', () => {
    const m = messageOf(`1\x1b`.repeat(5_000));
    expect(m.length).toBeLessThan(260);
    expect(hasControl(m)).toBe(false);
  });
});

describe('PdfLexer /Name length bound', () => {
  const nameOf = (s: string): string => {
    const t = tokens(s)[0];
    if (t?.kind !== 'name') throw new Error('not a name token');
    return t.value;
  };

  it('a 1,000,000-byte name is MALFORMED quickly, with a bounded message', () => {
    const started = performance.now();
    let caught: unknown;
    try {
      tokens(`/${'N\x1b'.repeat(500_000)}`);
    } catch (e) {
      caught = e;
    }
    const elapsed = performance.now() - started;
    expect(caught).toBeInstanceOf(XfaPdfError);
    expect((caught as XfaPdfError).code).toBe('MALFORMED');
    expect((caught as XfaPdfError).message.length).toBeLessThan(300);
    expect(/[\x00-\x1f\x7f-\xff]/.test((caught as XfaPdfError).message)).toBe(false);
    expect(elapsed).toBeLessThan(200);
  });

  it('a name of exactly MAX_NAME_BYTES still parses; one byte more is MALFORMED', () => {
    expect(nameOf(`/${'a'.repeat(MAX_NAME_BYTES)}`)).toHaveLength(MAX_NAME_BYTES);
    expect(() => tokens(`/${'a'.repeat(MAX_NAME_BYTES + 1)}`)).toThrow(XfaPdfError);
  });

  it('a #xx escape counts as ONE output byte, so an escaped name at the limit parses', () => {
    expect(nameOf(`/${'#41'.repeat(MAX_NAME_BYTES)}`)).toBe('A'.repeat(MAX_NAME_BYTES));
    expect(() => tokens(`/${'#41'.repeat(MAX_NAME_BYTES + 1)}`)).toThrow(XfaPdfError);
  });

  it('the ceiling is 64 KiB', () => {
    expect(MAX_NAME_BYTES).toBe(65536);
  });
});

describe('PdfLexer string length bound and memory (L2-F2)', () => {
  const MIB = 1024 * 1024;
  /** `(` + n filler bytes + `)` built directly as bytes (a string of 20M characters would dominate the test). */
  const literal = (n: number): Uint8Array => {
    const b = new Uint8Array(n + 2).fill(0x61);
    b[0] = 0x28;
    b[n + 1] = 0x29;
    return b;
  };
  /** `<` + 2n hex digits (n output bytes) + `>`. */
  const hex = (n: number): Uint8Array => {
    const b = new Uint8Array(2 * n + 2).fill(0x61);
    b[0] = 0x3c;
    b[2 * n + 1] = 0x3e;
    return b;
  };
  const first = (bytes: Uint8Array): PdfToken => new PdfLexer(bytes).nextToken();
  const malformedFor = (bytes: Uint8Array): XfaPdfError => {
    try {
      first(bytes);
    } catch (e) {
      if (e instanceof XfaPdfError) return e;
      throw e;
    }
    throw new Error('expected the lexer to throw');
  };

  it('the ceiling is 16 MiB', () => {
    expect(MAX_STRING_BYTES).toBe(16 * MIB);
  });

  it('a 20 MiB literal string is MALFORMED quickly', () => {
    const started = performance.now();
    const err = malformedFor(literal(20 * MIB));
    expect(err.code).toBe('MALFORMED');
    expect(err.message).toContain('String longer than');
    expect(performance.now() - started).toBeLessThan(2000);
  }, 10_000);

  it('a 20 MiB hex string (20 MiB of output bytes) is MALFORMED quickly', () => {
    const started = performance.now();
    expect(malformedFor(hex(20 * MIB)).code).toBe('MALFORMED');
    expect(performance.now() - started).toBeLessThan(2000);
  }, 10_000);

  it('a 1 MiB literal string and a 1 MiB hex string parse to exactly that many bytes', () => {
    const lit = first(literal(MIB));
    const hx = first(hex(MIB));
    expect(lit.kind === 'string' && lit.bytes.length).toBe(MIB);
    expect(hx.kind === 'string' && hx.bytes.length).toBe(MIB);
    expect(hx.kind === 'string' && hx.bytes[MIB - 1]).toBe(0xaa);
  }, 10_000);

  it('exactly MAX_STRING_BYTES parses (literal); one byte more is MALFORMED', () => {
    const ok = first(literal(MAX_STRING_BYTES));
    expect(ok.kind === 'string' && ok.bytes.length).toBe(MAX_STRING_BYTES);
    expect(malformedFor(literal(MAX_STRING_BYTES + 1)).code).toBe('MALFORMED');
  }, 20_000);

  it('exactly MAX_STRING_BYTES parses (hex); one byte more is MALFORMED', () => {
    const ok = first(hex(MAX_STRING_BYTES));
    expect(ok.kind === 'string' && ok.bytes.length).toBe(MAX_STRING_BYTES);
    expect(malformedFor(hex(MAX_STRING_BYTES + 1)).code).toBe('MALFORMED');
  }, 20_000);

  it('string contents are unchanged by the growable buffer: escapes, odd hex digit, nesting', () => {
    const a = first(enc('(a\\n(b)\\101)'));
    expect(a.kind === 'string' && Array.from(a.bytes)).toEqual([0x61, 0x0a, 0x28, 0x62, 0x29, 0x41]);
    const h = first(enc('<4 1 4>'));
    expect(h.kind === 'string' && Array.from(h.bytes)).toEqual([0x41, 0x40]);
    const empty = first(enc('()'));
    expect(empty.kind === 'string' && empty.bytes.length).toBe(0);
  });
});
