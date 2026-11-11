import { describe, expect, it } from 'vitest';
import { dec, enc } from './bytes.js';
import { XfaPdfError } from '../errors.js';
import { PdfLexer } from '../lexer.js';
import { parseIndirectAt, parseValue } from '../object-parser.js';
import type { PdfDict, PdfStream, PdfValue } from '../types.js';

const parse = (s: string): PdfValue => parseValue(new PdfLexer(enc(s)));

describe('parseValue', () => {
  it('"12 0 R" is a reference but "12 0" alone stays two numbers (lookahead must not eat them)', () => {
    expect(parse('12 0 R')).toEqual({ kind: 'ref', num: 12, gen: 0 });
    const lexer = new PdfLexer(enc('12 0 '));
    expect(parseValue(lexer)).toBe(12);
    expect(parseValue(lexer)).toBe(0);
  });

  it('numbers inside an array are not mis-grouped into a reference', () => {
    expect(parse('[1 0 R 2 0 3 0 R]')).toEqual([
      { kind: 'ref', num: 1, gen: 0 },
      2,
      0,
      { kind: 'ref', num: 3, gen: 0 },
    ]);
  });

  it('a real number or negative number is never the head of a reference', () => {
    expect(() => parse('[1.5 0 R]')).toThrow(XfaPdfError);
    expect(() => parse('[-1 0 R]')).toThrow(XfaPdfError);
  });

  it('scalars: true, false, null, numbers', () => {
    expect(parse('true')).toBe(true);
    expect(parse('false')).toBe(false);
    expect(parse('null')).toBeNull();
    expect(parse('-.5')).toBe(-0.5);
  });

  it('nested dict and array keep structure and key order, keys without the slash', () => {
    const v = parse('<</Type/Catalog /Kids[1 0 R <</K (x)>>] /N null>>') as PdfDict;
    expect(v).toBeInstanceOf(Map);
    expect([...v.keys()]).toEqual(['Type', 'Kids', 'N']);
    expect(v.get('Type')).toEqual({ kind: 'name', value: 'Catalog' });
    const kids = v.get('Kids') as PdfValue[];
    expect(kids[0]).toEqual({ kind: 'ref', num: 1, gen: 0 });
    expect((kids[1] as PdfDict).get('K')).toMatchObject({ kind: 'string', hex: false });
    expect(v.get('N')).toBeNull();
  });

  it('a duplicate dictionary key keeps the last value instead of throwing', () => {
    expect((parse('<</A 1 /A 2>>') as PdfDict).get('A')).toBe(2);
  });

  it('a non-name dictionary key or missing value is MALFORMED', () => {
    expect(() => parse('<<1 2>>')).toThrow(XfaPdfError);
    expect(() => parse('<</A>>')).toThrow(XfaPdfError);
  });

  it('truncated dictionaries and arrays are MALFORMED, never an infinite loop', () => {
    expect(() => parse('<</A 1')).toThrow(XfaPdfError);
    expect(() => parse('<</A')).toThrow(XfaPdfError);
    expect(() => parse('[1 2')).toThrow(XfaPdfError);
    expect(() => parse('')).toThrow(XfaPdfError);
  });

  it('an unknown keyword or stray closer in value position is MALFORMED', () => {
    expect(() => parse('endobj')).toThrow(XfaPdfError);
    expect(() => parse(']')).toThrow(XfaPdfError);
    expect(() => parse('>>')).toThrow(XfaPdfError);
  });

  it('"{" or "}" in value position is MALFORMED (PostScript braces are not PDF objects)', () => {
    expect(() => parse('{')).toThrow(XfaPdfError);
    expect(() => parse('}')).toThrow(XfaPdfError);
    expect(() => parse('[{]')).toThrow(XfaPdfError);
  });

  it('"." or "+" alone as a value is MALFORMED', () => {
    expect(() => parse('.')).toThrow(XfaPdfError);
    expect(() => parse('[+]')).toThrow(XfaPdfError);
  });

  it('names /#FF and /#FE are distinct dictionary keys and both survive', () => {
    const d = parse('<</#FF 1 /#FE 2>>') as PdfDict;
    expect(d.size).toBe(2);
    expect([...d.values()]).toEqual([1, 2]);
  });

  it('deep nesting is rejected as MALFORMED instead of overflowing the stack', () => {
    expect(() => parse('['.repeat(100000))).toThrow(XfaPdfError);
    expect(() => parse('<</A '.repeat(100000))).toThrow(XfaPdfError);
  });
});

describe('parseIndirectAt', () => {
  const stream = (r: ReturnType<typeof parseIndirectAt>): PdfStream => r.value as PdfStream;

  it('reads a CRLF stream body of /Length bytes', () => {
    const r = parseIndirectAt(enc('7 0 obj <</Length 5>> stream\r\nHELLOendstream endobj'), 0);
    expect([r.num, r.gen]).toEqual([7, 0]);
    expect(dec(stream(r).raw)).toBe('HELLO');
    expect(stream(r).dict.get('Length')).toBe(5);
  });

  it('reads an LF-only stream body without swallowing the first data byte', () => {
    const r = parseIndirectAt(enc('7 0 obj <</Length 5>> stream\nHELLOendstream endobj'), 0);
    expect(dec(stream(r).raw)).toBe('HELLO');
  });

  it('a body that itself starts with CR/LF bytes is preserved after the single EOL', () => {
    const r = parseIndirectAt(enc('7 0 obj <</Length 3>> stream\n\r\nXendstream\nendobj'), 0);
    expect(dec(stream(r).raw)).toBe('\r\nX');
  });

  it('binary bytes that look like "endstream" or parens inside the body are kept by length, not scanned', () => {
    const r = parseIndirectAt(enc('1 0 obj <</Length 14>> stream\n(endstream) ((\nendstream endobj'), 0);
    expect(dec(stream(r).raw)).toBe('(endstream) ((');
  });

  it('an indirect /Length is resolved through the callback', () => {
    const seen: number[] = [];
    const r = parseIndirectAt(enc('7 0 obj <</Length 9 0 R>> stream\nHELLOendstream endobj'), 0, (ref) => {
      seen.push(ref.num);
      return 5;
    });
    expect(seen).toEqual([9]);
    expect(dec(stream(r).raw)).toBe('HELLO');
  });

  it('an indirect /Length with no callback, or a bad callback result, is MALFORMED', () => {
    const src = enc('7 0 obj <</Length 9 0 R>> stream\nHELLOendstream endobj');
    expect(() => parseIndirectAt(src, 0)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(src, 0, () => -1)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(src, 0, () => 1.5)).toThrow(XfaPdfError);
  });

  it('a missing, negative or non-integer /Length is MALFORMED', () => {
    for (const len of ['', '/Length -1', '/Length 2.5', '/Length (5)']) {
      expect(() => parseIndirectAt(enc(`7 0 obj <<${len}>> stream\nHELLOendstream endobj`), 0)).toThrow(XfaPdfError);
    }
  });

  it('a /Length past the end of the file is MALFORMED, not a short or out-of-range read', () => {
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 999>> stream\nHELLOendstream endobj'), 0)).toThrow(XfaPdfError);
  });

  it('a /Length that does not land on endstream is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 3>> stream\nHELLOendstream endobj'), 0)).toThrow(XfaPdfError);
  });

  it('a /Length that undershoots by non-EOL bytes is MALFORMED, not a silently truncated stream', () => {
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 4>> stream\nHELLOendstream endobj'), 0)).toThrow(XfaPdfError);
  });

  it('a /Length that leaves more than one EOL before endstream is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 5>> stream\nHELLO\n\nendstream endobj'), 0)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 5>> stream\nHELLO endstream endobj'), 0)).toThrow(XfaPdfError);
  });

  it('a single EOL (CRLF, LF or CR) between data and endstream is accepted', () => {
    for (const eol of ['\r\n', '\n', '\r']) {
      const r = parseIndirectAt(enc(`7 0 obj <</Length 5>> stream\nHELLO${eol}endstream endobj`), 0);
      expect(dec((r.value as PdfStream).raw)).toBe('HELLO');
    }
  });

  it('"stream" followed by neither CRLF nor LF is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 obj <</Length 5>> streamHELLOendstream endobj'), 0)).toThrow(XfaPdfError);
  });

  it('a zero-length stream is valid', () => {
    const r = parseIndirectAt(enc('7 0 obj <</Length 0>> stream\nendstream endobj'), 0);
    expect(stream(r).raw.length).toBe(0);
  });

  it('parses a non-stream object at a non-zero offset and honours the generation', () => {
    const src = enc('%PDF-1.7\n3 2 obj\n<</Type/Page>>\nendobj\n');
    const r = parseIndirectAt(src, 9);
    expect([r.num, r.gen]).toEqual([3, 2]);
    expect((r.value as PdfDict).get('Type')).toEqual({ kind: 'name', value: 'Page' });
  });

  it('a bare scalar object parses', () => {
    expect(parseIndirectAt(enc('4 0 obj 42 endobj'), 0).value).toBe(42);
  });

  it('a missing "obj" header, wrong header, or missing endobj is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 <<>> endobj'), 0)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(enc('x 0 obj <<>> endobj'), 0)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(enc('7 0 obj <</A 1>>'), 0)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(enc('7 0 obj <</A 1>> junk'), 0)).toThrow(XfaPdfError);
  });

  it('truncated input at every prefix length throws MALFORMED only, never another error or a hang', () => {
    const full = '7 0 obj <</Length 5>> stream\r\nHELLOendstream endobj';
    for (let n = 0; n < full.length; n++) {
      try {
        parseIndirectAt(enc(full.slice(0, n)), 0);
        throw new Error(`prefix ${n} unexpectedly parsed`);
      } catch (e) {
        expect(e).toBeInstanceOf(XfaPdfError);
        expect((e as XfaPdfError).code).toBe('MALFORMED');
      }
    }
  });

  it('an offset beyond the file or negative is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 obj 1 endobj'), 500)).toThrow(XfaPdfError);
    expect(() => parseIndirectAt(enc('7 0 obj 1 endobj'), -1)).toThrow(XfaPdfError);
  });

  it('a stream keyword after a non-dictionary value is MALFORMED', () => {
    expect(() => parseIndirectAt(enc('7 0 obj 5 stream\nendstream endobj'), 0)).toThrow(XfaPdfError);
  });
});
