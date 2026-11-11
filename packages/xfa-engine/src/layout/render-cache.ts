import { safeText } from '../pdf/safe-text.js';
import { XfaLayoutError } from './errors.js';
import { MAX_RENDER_CACHE_ENTRIES, MAX_RENDER_CACHE_ENTRY_CHARS } from './limits.js';
import { parseMeasure } from './units.js';

/**
 * Reader for the `<?renderCache.* ?>` processing instructions a template carries (kept by the template model on
 * `TemplateNode.renderCache`). They are the authoring tool's own measurements of the nodes it drew, used here only as
 * an oracle to test the layout against: nothing in the layout reads them to decide where to put a box.
 *
 * Every number is an integer count of millipoints (1/1000 pt). The meaning of each field was established by comparing
 * the records with the template's own `w`, `h`, `margin`, `font` and `para` on both government forms (see the corpus test
 * `render-cache.test.ts` and the evidence line of card W01-T01), not assumed. A field whose meaning was NOT confirmed
 * (it is constant in every sample, or no sample exercises it) is exposed only as a raw number and must not be used as an
 * oracle:
 *   bounds   `widthMp heightMp ? ? leftInsetMp topInsetMp ? ?`        confirmed: 0, 1, 4, 5. Unconfirmed: 2, 3, 6, 7 (always 0).
 *   textRun  `<utf8Bytes> <text> <?> xMp baselineYMp r g b "face" bold italic sizeMp encoding`
 *            confirmed: text, x, baselineY, colour, face, bold, size. Unconfirmed: `?` (always 0), italic (always 0).
 *   line     `x1Mp y1Mp x2Mp y2Mp r g b ?`                              confirmed: endpoints, colour. Unconfirmed: last (always 280).
 *   subset   kept as raw text (font subset bookkeeping; no oracle value).
 */

export interface RenderCacheBounds {
  /** Width of the draw less its left and right insets, in points. */
  readonly widthPt: number;
  /** Height of the draw less its top and bottom insets, in points. */
  readonly heightPt: number;
  /** The draw's left inset, in points. */
  readonly leftInsetPt: number;
  /** The draw's top inset, in points. */
  readonly topInsetPt: number;
  /** All eight numbers as written, in millipoints. Fields 2, 3, 6 and 7 are unconfirmed and must not be used as an oracle. */
  readonly rawMp: readonly number[];
}

export interface RenderCacheTextRun {
  readonly text: string;
  /** Left end of the run, from the left edge of the draw (insets included), in points. */
  readonly xPt: number;
  /** Baseline of the run, from the top edge of the draw (insets included), in points. */
  readonly baselineYPt: number;
  readonly colour: readonly [number, number, number];
  readonly typeface: string;
  readonly bold: boolean;
  readonly sizePt: number;
  readonly encoding: string;
  /** The second flag after the size is always 0 in the corpus: unconfirmed (probably italic). Raw. */
  readonly rawItalicFlag: number;
  /** The number between the text and `x` is always 0 in the corpus: unconfirmed. Raw. */
  readonly rawLeadingFlag: number;
}

export interface RenderCacheLine {
  readonly x1Pt: number;
  readonly y1Pt: number;
  readonly x2Pt: number;
  readonly y2Pt: number;
  readonly colour: readonly [number, number, number];
  /** The last number is 280 in every corpus sample: unconfirmed. Raw, in millipoints. */
  readonly rawLastMp: number;
}

export interface RenderCache {
  readonly bounds: RenderCacheBounds | undefined;
  readonly textRuns: readonly RenderCacheTextRun[];
  readonly lines: readonly RenderCacheLine[];
  /** `subset` entries, the text after the target. */
  readonly subsets: readonly string[];
  /** Entries of any other target, whole. */
  readonly unrecognised: readonly string[];
}

const BOUNDS_FIELDS = 8;
const LINE_FIELDS = 8;
// Fifteen digits stay exact as a double; a longer field is a malformed record, not a length.
const INTEGER = /^-?\d{1,15}$/;
const TEXT_RUN_TAIL = /^ (-?\d+) (-?\d+) (-?\d+) (\d+) (\d+) (\d+) "([^"]*)" (\d+) (\d+) (\d+) (\S+)$/;
/** FD-38 exemption (correctness constant): the largest value of an 8-bit colour channel, a fact of the `r g b` colour format, not a setting. */
const MAX_CHANNEL = 255;

function bad(entry: string, why: string): XfaLayoutError {
  return new XfaLayoutError('INVALID_ARGUMENT', `renderCache: ${why} (${safeText(entry, 60)})`);
}

/** Millipoints to points, through the one unit conversion. */
const mpToPt = (mp: number): number => parseMeasure(String(mp), 'mp', 'renderCache');

function integersOf(entry: string, data: string, count: number): readonly number[] {
  const parts = data.split(' ');
  if (parts.length !== count || !parts.every((part) => INTEGER.test(part))) throw bad(entry, `expected ${count} integers`);
  return parts.map(Number);
}

function colourOf(entry: string, r: number, g: number, b: number): readonly [number, number, number] {
  if (![r, g, b].every((c) => Number.isInteger(c) && c >= 0 && c <= MAX_CHANNEL)) throw bad(entry, 'colour channel out of range');
  return [r, g, b];
}

function readBounds(entry: string, data: string): RenderCacheBounds {
  const raw = integersOf(entry, data, BOUNDS_FIELDS);
  const at = (i: number): number => raw[i] ?? 0;
  return { widthPt: mpToPt(at(0)), heightPt: mpToPt(at(1)), leftInsetPt: mpToPt(at(4)), topInsetPt: mpToPt(at(5)), rawMp: raw };
}

function readLine(entry: string, data: string): RenderCacheLine {
  const v = integersOf(entry, data, LINE_FIELDS);
  const at = (i: number): number => v[i] ?? 0;
  return {
    x1Pt: mpToPt(at(0)),
    y1Pt: mpToPt(at(1)),
    x2Pt: mpToPt(at(2)),
    y2Pt: mpToPt(at(3)),
    colour: colourOf(entry, at(4), at(5), at(6)),
    rawLastMp: at(7),
  };
}

/** UTF-8 length of one code point. */
const utf8Length = (codePoint: number): number => (codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4);

/** The end index of the first `bytes` UTF-8 bytes of `data` from `start`, or undefined when the data is too short or the count ends inside a character. */
function endOfUtf8(data: string, start: number, bytes: number): number | undefined {
  let index = start;
  let seen = 0;
  while (seen < bytes) {
    const codePoint = data.codePointAt(index);
    if (codePoint === undefined) return undefined;
    seen += utf8Length(codePoint);
    index += codePoint > 0xffff ? 2 : 1;
  }
  return seen === bytes ? index : undefined;
}

function readTextRun(entry: string, data: string): RenderCacheTextRun {
  const head = /^(\d+) /.exec(data);
  if (head === null) throw bad(entry, 'textRun needs a byte count');
  const bytes = Number(head[1]);
  const textStart = head[0].length;
  const textEnd = endOfUtf8(data, textStart, bytes);
  if (textEnd === undefined) throw bad(entry, 'textRun length does not fit the text');
  const tail = TEXT_RUN_TAIL.exec(data.slice(textEnd));
  if (tail === null) throw bad(entry, 'textRun fields are malformed');
  const field = (i: number): string => tail[i] ?? '';
  const number = (i: number): number => Number(field(i));
  const boldFlag = number(8);
  const italicFlag = number(9);
  const sizeMp = number(10);
  if (boldFlag > 1 || italicFlag > 1) throw bad(entry, 'style flag is not 0 or 1');
  if (sizeMp < 1) throw bad(entry, 'size must be positive');
  return {
    text: data.slice(textStart, textEnd),
    xPt: mpToPt(number(2)),
    baselineYPt: mpToPt(number(3)),
    colour: colourOf(entry, number(4), number(5), number(6)),
    typeface: field(7),
    bold: boldFlag === 1,
    sizePt: mpToPt(sizeMp),
    encoding: field(11),
    rawItalicFlag: italicFlag,
    rawLeadingFlag: number(1),
  };
}

/**
 * Decodes the `renderCache` entries of one template node (`TemplateNode.renderCache`). A malformed record of a known
 * kind is `INVALID_ARGUMENT`; an unknown kind is kept whole in `unrecognised`.
 */
export function readRenderCache(entries: readonly string[]): RenderCache {
  if (entries.length > MAX_RENDER_CACHE_ENTRIES) throw bad(String(entries.length), `more than ${MAX_RENDER_CACHE_ENTRIES} entries`);
  let bounds: RenderCacheBounds | undefined;
  const textRuns: RenderCacheTextRun[] = [];
  const lines: RenderCacheLine[] = [];
  const subsets: string[] = [];
  const unrecognised: string[] = [];
  for (const entry of entries) {
    if (entry.length > MAX_RENDER_CACHE_ENTRY_CHARS) throw bad(entry, `entry longer than ${MAX_RENDER_CACHE_ENTRY_CHARS} characters`);
    const space = entry.indexOf(' ');
    const kind = space < 0 ? entry : entry.slice(0, space);
    const data = space < 0 ? '' : entry.slice(space + 1);
    switch (kind) {
      case 'bounds':
        if (bounds !== undefined) throw bad(entry, 'a node has one bounds record');
        bounds = readBounds(entry, data);
        break;
      case 'textRun':
        textRuns.push(readTextRun(entry, data));
        break;
      case 'line':
        lines.push(readLine(entry, data));
        break;
      case 'subset':
        subsets.push(data);
        break;
      default:
        unrecognised.push(entry);
    }
  }
  return { bounds, textRuns, lines, subsets, unrecognised };
}
