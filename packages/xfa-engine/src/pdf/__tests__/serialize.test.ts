import { describe, expect, it } from 'vitest';
import { PdfLexer } from '../lexer.js';
import { parseValue } from '../object-parser.js';
import { serializeValue } from '../serialize.js';
import type { PdfDict, PdfValue } from '../types.js';
import { enc } from './bytes.js';
import { expectMalformed } from './expect-malformed.js';

const roundTrip = (v: PdfValue): PdfValue => parseValue(new PdfLexer(enc(serializeValue(v)), 0));
const name = (value: string): PdfValue => ({ kind: 'name', value });
const bytesOf = (...n: number[]): Uint8Array => Uint8Array.from(n);

describe('serializeValue: names', () => {
  it('re-escapes delimiters, whitespace, "#", NUL and high bytes so a re-read name is identical (an unescaped "/" or space would split the key)', () => {
    const names = ['A B', 'a/b', 'x#y', '(p)', 'é', '\u0000', '[]<>{}%', 'tab\there', 'cr\rlf\n', 'ÿ\u007f'];
    for (const n of names) expect(roundTrip(name(n)), JSON.stringify(n)).toEqual(name(n));
  });

  it('writes the exact #xx escapes and leaves regular characters (including "~" and "-") alone', () => {
    expect(serializeValue(name('A B'))).toBe('/A#20B');
    expect(serializeValue(name('x#y'))).toBe('/x#23y');
    expect(serializeValue(name('a/b'))).toBe('/a#2fb');
    expect(serializeValue(name('é'))).toBe('/#e9');
    expect(serializeValue(name('Plain-Name_1.~'))).toBe('/Plain-Name_1.~');
  });

  it('round-trips the empty name (a dictionary key "/" followed by a value must not swallow the next token)', () => {
    const d: PdfDict = new Map<string, PdfValue>([['', 1], ['B', 2]]);
    expect(roundTrip(d)).toEqual(d);
  });

  it('rejects a name character above U+00FF (names are byte sequences here; guessing an encoding would corrupt the key)', async () => {
    await expectMalformed(Promise.resolve().then(() => serializeValue(name('€'))));
  });
});

describe('serializeValue: strings', () => {
  it('writes every string as hex so ")", "\\" and "(" in the content cannot corrupt the output, and all 256 byte values survive', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const parsed = roundTrip({ kind: 'string', bytes: all, hex: false });
    expect(parsed).toEqual({ kind: 'string', bytes: all, hex: true });
    expect(serializeValue({ kind: 'string', bytes: bytesOf(0x28, 0x29, 0x5c), hex: false })).toBe('<28295c>');
    expect(serializeValue({ kind: 'string', bytes: new Uint8Array(0), hex: true })).toBe('<>');
  });
});

describe('serializeValue: numbers', () => {
  it('writes integers as integers (a "5.0" would change an object number or /Length into a real)', () => {
    expect(serializeValue(42)).toBe('42');
    expect(serializeValue(-7)).toBe('-7');
    expect(serializeValue(0)).toBe('0');
    expect(serializeValue(9007199254740991)).toBe('9007199254740991');
  });

  it('writes reals with fixed decimals and never an exponent (the PDF number syntax has none)', () => {
    expect(serializeValue(0.5)).toBe('0.5');
    expect(serializeValue(-3.25)).toBe('-3.25');
    expect(serializeValue(0.0000001)).toBe('0.0000001');
    expect(serializeValue(123456.789)).toBe('123456.789');
    expect(serializeValue(0.1 + 0.2)).toBe('0.3');
    expect(serializeValue(1e20)).toBe('100000000000000000000');
    expect(serializeValue(1234567890123.5)).toBe('1234567890123.5');
  });

  it('never writes "-0" (negative zero and values that round to zero both become "0")', () => {
    expect(serializeValue(-0)).toBe('0');
    expect(serializeValue(-1e-12)).toBe('0');
    expect(serializeValue(1e-12)).toBe('0');
  });

  it('rejects NaN, infinities and values whose fixed notation would need an exponent (silent "null" or "1e+21" would corrupt the file)', async () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e21, -1e21]) {
      await expectMalformed(Promise.resolve().then(() => serializeValue(bad)));
    }
  });

  it('round-trips representative numbers through the existing parser', () => {
    for (const n of [0, 1, -1, 612, 0.5, -0.25, 3.14159, 1e-7, 123456.789]) expect(roundTrip(n), String(n)).toBe(n);
  });
});

describe('serializeValue: structure', () => {
  it('writes references, booleans and null in their PDF spellings', () => {
    expect(serializeValue({ kind: 'ref', num: 5, gen: 0 })).toBe('5 0 R');
    expect(serializeValue(true)).toBe('true');
    expect(serializeValue(false)).toBe('false');
    expect(serializeValue(null)).toBe('null');
  });

  it('keeps an integer followed by a reference apart in arrays (a merged "1 2 4 0 R" must not turn a number into part of the reference)', () => {
    const v: PdfValue = [1, 2, { kind: 'ref', num: 4, gen: 0 }, { kind: 'ref', num: 7, gen: 3 }, 9];
    expect(roundTrip(v)).toEqual(v);
  });

  it('round-trips a nested dictionary with every value kind (serialize then the existing parser gives a deep-equal value)', () => {
    const inner: PdfDict = new Map<string, PdfValue>([
      ['Rect', [0, 0, 612.5, 792]],
      ['Odd Key#', name('A/B')],
      ['S', { kind: 'string', bytes: bytesOf(0, 255, 40, 41), hex: true }],
    ]);
    const outer: PdfDict = new Map<string, PdfValue>([
      ['Type', name('Sig')],
      ['Ref', { kind: 'ref', num: 12, gen: 2 }],
      ['Flag', true],
      ['Nothing', null],
      ['Nested', inner],
      ['List', [inner, [], new Map(), [name('x'), -1.5]]],
    ]);
    expect(roundTrip(outer)).toEqual(outer);
  });

  it('serializes a very large array without recursion or spread overflow', () => {
    const big: PdfValue[] = Array.from({ length: 200_000 }, (_, i) => i);
    const text = serializeValue(big);
    expect(text.startsWith('[0 1 2')).toBe(true);
    expect(text.endsWith('199999]')).toBe(true);
  });
});

describe('serializeValue: large strings (L2 sweep)', () => {
  it('a 16 MiB string serialises quickly and reads back byte-for-byte', () => {
    const big = new Uint8Array(16 * 1024 * 1024);
    for (let i = 0; i < big.length; i += 4099) big[i] = (i / 4099) & 0xff;
    const heapBefore = process.memoryUsage().heapUsed;
    const started = performance.now();
    const text = serializeValue({ kind: 'string', bytes: big, hex: true });
    expect(text.length).toBe(2 * big.length + 2);
    expect(performance.now() - started).toBeLessThan(2000);
    // one `+=` per byte builds ~30 bytes of rope per input byte (~1 GB here); the result itself is ~33 MB
    expect(process.memoryUsage().heapUsed - heapBefore).toBeLessThan(250 * 1024 * 1024);
    const back = parseValue(new PdfLexer(new TextEncoder().encode(text), 0));
    expect(back).toMatchObject({ kind: 'string' });
    expect(back !== null && typeof back === 'object' && 'bytes' in back && Buffer.compare(Buffer.from(back.bytes), Buffer.from(big))).toBe(0);
  }, 20_000);
});

describe('serializeValue: many long names (L2 sweep)', () => {
  it('a dictionary of 300 keys of 65,536 characters (~20 MB of names) serialises in bounded memory and reads back', () => {
    const dict: PdfDict = new Map();
    for (let k = 0; k < 300; k++) dict.set(`k${String(k).padStart(3, '0')}${'x#'.repeat(32_766)}`, k);
    const heapBefore = process.memoryUsage().heapUsed;
    const text = serializeValue(dict);
    // per-character `+=` leaves a rope of ~30 bytes per character until the parts are joined (~600 MB here)
    expect(process.memoryUsage().heapUsed - heapBefore).toBeLessThan(250 * 1024 * 1024);
    const back = parseValue(new PdfLexer(new TextEncoder().encode(text), 0));
    expect(back instanceof Map && back.size).toBe(300);
    expect(back instanceof Map && back.get(`k042${'x#'.repeat(32_766)}`)).toBe(42);
  }, 20_000);
});
