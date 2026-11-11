/**
 * FD-38 exemption (correctness constant): the slack, in points, allowed when asking whether a width fits. Acrobat fits a
 * line a few millipoints wider than the space it has: renderCache `bounds` rounds the box and its insets to whole
 * millipoints, and two real lines are accepted at 0.003 pt and 0.001 pt over the exact width (W01-T05 evidence; the
 * narrowest rejected overflow in the corpus is 0.55 pt). 0.01 pt sits between the two and is far below any visible size.
 * It is not a setting. It is deliberately not the millipoint of `SIZE_EPSILON_PT` and `LINE_HEIGHT_EPSILON_PT`: see the note at
 * the top of `box/limits.ts`.
 */
export const FIT_EPSILON_PT = 0.01;

const LINE_BREAKS = /\r\n|[\r\u2028\u2029]/g;
const TOKENS = /[ ]+|[^ ]+/g;
const TRAILING_SPACES = / +$/;

/** Line ends of every kind (`\r\n`, `\r`, U+2028, U+2029) become `\n`; text is then split on `\n` only. */
export const normalizeLineBreaks = (text: string): string => text.replace(LINE_BREAKS, '\n');

export interface BrokenParagraph {
  /** The lines in order. A wrapped line keeps the spaces that follow its last word (they hang past the right edge). */
  readonly lines: readonly string[];
  /** True when `maxLines` stopped the breaking early. */
  readonly truncated: boolean;
}

/** A line of a paragraph as a half-open range of UTF-16 offsets. */
export interface LineRange {
  readonly start: number;
  readonly end: number;
}

export interface BrokenRanges {
  readonly ranges: readonly LineRange[];
  readonly truncated: boolean;
}

/**
 * Breaks one paragraph (no line feed in it) into lines no wider than the space it has, as ranges of offsets, so a caller
 * that keeps a style per character (rich text, W01-T06) can cut its own runs at the same places.
 *
 * Origin (PA-4): semantic port of pdf.js v4.10.38 `src/core/xfa/text.js` `TextMeasure.compute` (Apache-2.0). Kept from it:
 * a break is taken at the last space that fits, a space that would overflow does not count, a word with no space before
 * it is broken between characters, and a space-free word always puts at least one character on a line. Changed because the
 * renderCache oracle disagrees with pdf.js: pdf.js multiplies every measured width by `WIDTH_FACTOR = 1.02` and leaves the
 * breaking space out of the line (it ends the line without being counted); the oracle fits the exact `hmtx` width
 * (within `FIT_EPSILON_PT`) and keeps the spaces after the last word on the line they follow (a wrapped oracle line ends
 * in its trailing spaces: "violence ", "parliament,  ").
 *
 * `widthOf(start, end)` is the advance width of `paragraph.slice(start, end)`; `first` and `rest` are the room for the first
 * and for every other line (`Infinity` for no wrapping needed). With `wrap` false the paragraph is one line however wide.
 */
export function breakRanges(paragraph: string, widthOf: (start: number, end: number) => number, first: number, rest: number, wrap: boolean, maxLines: number): BrokenRanges {
  if (!wrap || paragraph === '' || maxLines < 1) return { ranges: [{ start: 0, end: paragraph.length }], truncated: false };
  const ranges: LineRange[] = [];
  const room = (): number => (ranges.length === 0 ? first : rest) + FIT_EPSILON_PT;
  // Widths add (no kerning), so the line width is kept as a running sum: re-measuring the growing line for every word
  // would make a long line quadratic in its length.
  let lineStart = 0;
  let lineEnd = 0;
  let width = 0;
  let hasWord = false;
  let truncated = false;
  const push = (end: number): void => {
    ranges.push({ start: lineStart, end });
  };
  for (const match of paragraph.matchAll(TOKENS)) {
    if (ranges.length >= maxLines) {
      truncated = true;
      break;
    }
    const start = match.index;
    const end = start + match[0].length;
    const tokenWidth = widthOf(start, end);
    if (match[0].startsWith(' ')) {
      lineEnd = end;
      width += tokenWidth;
    } else if (width + tokenWidth <= room()) {
      lineEnd = end;
      width += tokenWidth;
      hasWord = true;
    } else {
      const moved = hasWord;
      if (hasWord) {
        push(lineEnd);
        lineStart = start;
        width = 0;
        hasWord = false;
        if (ranges.length >= maxLines) {
          truncated = true;
          break;
        }
      }
      if (moved && tokenWidth <= room()) {
        lineEnd = end;
        width = tokenWidth;
        hasWord = true;
      } else {
        // The word alone is wider than a line: break it between characters, at least one character per line.
        let pieceStart = start;
        let at = start;
        for (const character of match[0]) {
          const next = at + character.length;
          const advance = widthOf(at, next);
          if (at > pieceStart && width + advance > room()) {
            push(at);
            lineStart = at;
            width = 0;
            pieceStart = at;
            if (ranges.length >= maxLines) {
              truncated = true;
              break;
            }
          }
          width += advance;
          at = next;
        }
        lineEnd = at;
        hasWord = at > pieceStart;
      }
    }
  }
  if (!truncated && (lineEnd > lineStart || ranges.length === 0)) push(lineEnd);
  return { ranges, truncated };
}

/** `breakRanges` over a string: the lines as text. `widthOf(text)` is the advance width of a string. */
export function breakParagraph(paragraph: string, widthOf: (text: string) => number, first: number, rest: number, wrap: boolean, maxLines: number): BrokenParagraph {
  const broken = breakRanges(paragraph, (start, end) => widthOf(paragraph.slice(start, end)), first, rest, wrap, maxLines);
  return { lines: broken.ranges.map((range) => paragraph.slice(range.start, range.end)), truncated: broken.truncated };
}

/** `text` without the spaces at its end (the part of a wrapped line that had to fit). */
export const withoutTrailingSpaces = (text: string): string => text.replace(TRAILING_SPACES, '');
