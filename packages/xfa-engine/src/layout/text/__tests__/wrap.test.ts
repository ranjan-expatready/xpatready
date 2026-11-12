import { describe, expect, it } from 'vitest';
import { breakParagraph, breakRanges, normalizeLineBreaks, withoutTrailingSpaces } from '../wrap.js';

/** Every character is 5 pt wide, a space included. */
const widthOf = (text: string): number => text.length * 5;
const brk = (text: string, first: number, rest = first, wrap = true, max = 100): ReturnType<typeof breakParagraph> => breakParagraph(text, widthOf, first, rest, wrap, max);

describe('breakParagraph', () => {
  it('breaks at the last space that fits and keeps the spaces after a word on the line it ends', () => {
    expect(brk('ab cd ef', 15).lines).toEqual(['ab ', 'cd ', 'ef']);
  });

  it('a space that would overflow does not count: a hanging run of spaces stays on the line however long', () => {
    expect(brk('ab     cd', 10).lines).toEqual(['ab     ', 'cd']);
  });

  it('a word wider than the line is broken between characters, at least one character per line', () => {
    expect(brk('abcdefghij', 20).lines).toEqual(['abcd', 'efgh', 'ij']);
    expect(brk('abc', 1).lines).toEqual(['a', 'b', 'c']);
  });

  it('breaks a long word after the words before it have been put on their own line', () => {
    expect(brk('ab cdefghij', 20).lines).toEqual(['ab ', 'cdef', 'ghij']);
  });

  it('leading spaces count and stay: a long word after them breaks after the spaces', () => {
    expect(brk('  abcdef', 20).lines).toEqual(['  ab', 'cdef']);
  });

  it('uses the first-line room for the first line and the rest room for every other', () => {
    expect(brk('ab cd ef gh', 10, 25).lines).toEqual(['ab ', 'cd ef ', 'gh']);
  });

  it('no wrapping, empty text and a single fitting word stay one line', () => {
    expect(brk('a very long line indeed', 10, 10, false).lines).toEqual(['a very long line indeed']);
    expect(brk('', 10).lines).toEqual(['']);
    expect(brk('abc', 15).lines).toEqual(['abc']);
  });

  it('a fit within the slack is a fit', () => {
    expect(brk('abcd', 20 - 0.005).lines).toEqual(['abcd']);
    expect(brk('abcd', 20 - 0.5).lines).toEqual(['abc', 'd']);
  });

  it('stops at the line ceiling and says so, bounding the work by lines', () => {
    const cut = brk('a b c d e f g h', 5, 5, true, 3);
    expect(cut.lines).toEqual(['a ', 'b ', 'c ']);
    expect(cut.truncated).toBe(true);
    expect(brk('a b', 5, 5, true, 3).truncated).toBe(false);
  });

  it('terminates on a hostile room of zero or less', () => {
    expect(brk('abc def', 0).lines.join('')).toBe('abc def');
    expect(brk('abc def', -5).lines.join('')).toBe('abc def');
  });
});

describe('line breaks and trailing spaces', () => {
  it('every kind of line end becomes a line feed', () => {
    expect(normalizeLineBreaks('a\r\nb\rc d e\nf')).toBe('a\nb\nc\nd\ne\nf');
  });

  it('withoutTrailingSpaces drops only spaces at the end', () => {
    expect(withoutTrailingSpaces('  a b  ')).toBe('  a b');
    expect(withoutTrailingSpaces('a\t')).toBe('a\t');
  });
});

describe('breakParagraph work bound', () => {
  it('a long line of many words and a long run of one word are laid out by counting widths once each, not by re-measuring the line', () => {
    let calls = 0;
    const counted = (text: string): number => {
      calls += 1;
      return text.length * 5;
    };
    const words = 'a '.repeat(20_000);
    expect(breakParagraph(words, counted, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, true, 10).lines).toEqual([words]);
    expect(calls).toBeLessThanOrEqual(40_001);
    calls = 0;
    const long = 'x'.repeat(30_000);
    const broken = breakParagraph(long, counted, 100, 100, true, 100_000);
    expect(broken.lines.join('')).toBe(long);
    expect(broken.lines).toHaveLength(1_500);
    expect(calls).toBeLessThanOrEqual(30_001);
  });
});

describe('breakRanges', () => {
  const ranges = (text: string, first: number, rest = first, wrap = true, max = 100): [number, number][] =>
    breakRanges(text, (start, end) => (end - start) * 5, first, rest, wrap, max).ranges.map((r) => [r.start, r.end]);

  it('answers the lines as literal offset ranges: contiguous, covering the whole paragraph, hanging spaces kept', () => {
    // widthOf is 5 pt a character; offsets are into the paragraph.
    expect(ranges('ab cd ef', 15)).toEqual([[0, 3], [3, 6], [6, 8]]);
    expect(ranges('abcdefghij', 20)).toEqual([[0, 4], [4, 8], [8, 10]]);
    expect(ranges('  abcdef', 20)).toEqual([[0, 4], [4, 8]]);
    expect(ranges('ab cdefghij', 20)).toEqual([[0, 3], [3, 7], [7, 11]]);
    expect(ranges('ab     cd', 10)).toEqual([[0, 7], [7, 9]]);
    expect(ranges('abcdefgh ij', 12, 30)).toEqual([[0, 2], [2, 9], [9, 11]]);
  });

  it('keeps a code point whole when it breaks a long word, and an empty paragraph is one empty range', () => {
    expect(ranges('\u{1F600}\u{1F600}\u{1F600}', 7)).toEqual([[0, 2], [2, 4], [4, 6]]);
    expect(ranges('', 10)).toEqual([[0, 0]]);
  });
});
