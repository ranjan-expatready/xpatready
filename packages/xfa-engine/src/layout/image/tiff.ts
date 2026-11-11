import { dpiFromPerCm, saneDpi } from './dpi.js';
import { DEFAULT_IMAGE_DPI, MAX_TIFF_SAMPLE_VALUES, MAX_TIFF_STRIPS } from './limits.js';
import { imageView, malformed, overLimit, truncated, unsupported } from './errors.js';
import type { ByteView } from '../font/bytes.js';
import type { PixelBudget, DecodedRaster } from './types.js';

const TAG = {
  width: 256,
  height: 257,
  bitsPerSample: 258,
  compression: 259,
  photometric: 262,
  fillOrder: 266,
  stripOffsets: 273,
  orientation: 274,
  samplesPerPixel: 277,
  rowsPerStrip: 278,
  stripByteCounts: 279,
  xResolution: 282,
  yResolution: 283,
  planarConfiguration: 284,
  resolutionUnit: 296,
  tileWidth: 322,
  extraSamples: 338,
  sampleFormat: 339,
} as const;

const TYPE_BYTES: ReadonlyMap<number, number> = new Map([
  [1, 1], // BYTE
  [2, 1], // ASCII
  [3, 2], // SHORT
  [4, 4], // LONG
  [5, 8], // RATIONAL
  [6, 1],
  [7, 1],
  [8, 2],
  [9, 4],
  [10, 8],
  [11, 4],
  [12, 8],
]);
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;
const ENTRY_BYTES = 12;
/** FD-38 exemption (correctness constant): the largest value a TIFF LONG field can hold (2^32 - 1), fixed by the TIFF 6.0 format. */
const MAX_UINT32 = 0xffffffff;
const COMPRESSION_NAMES: ReadonlyMap<number, string> = new Map([
  [2, 'CCITT RLE'],
  [3, 'CCITT Group 3'],
  [4, 'CCITT Group 4'],
  [5, 'LZW'],
  [6, 'old JPEG'],
  [7, 'JPEG'],
  [8, 'Deflate'],
  [32773, 'PackBits'],
  [32946, 'Deflate'],
]);
const WHITE_IS_ZERO = 0;
const BLACK_IS_ZERO = 1;
const RGB = 2;

interface Entry {
  readonly type: number;
  readonly count: number;
  /** Where the values start: inside the entry when they fit in four bytes, else at the offset the entry holds. */
  readonly at: number;
}

/** The first image file directory: tag to entry. Only the entries are indexed; no value is read until it is asked for. */
function directoryOf(r: ByteView): ReadonlyMap<number, Entry> {
  const first = r.u32(4);
  if (first < 8) throw malformed('tiff directory offset is inside the header');
  const count = r.u16(first);
  if (count === 0) throw malformed('tiff directory has no entries');
  r.need(first + 2, count * ENTRY_BYTES, 'directory');
  const entries = new Map<number, Entry>();
  for (let i = 0; i < count; i += 1) {
    const at = first + 2 + i * ENTRY_BYTES;
    const type = r.u16(at + 2);
    const values = r.u32(at + 4);
    const size = TYPE_BYTES.get(type);
    if (size === undefined || entries.has(r.u16(at))) continue;
    // Safe integers: `values` is below 2^32 and `size` is 8 at most.
    const inline = values * size <= 4;
    entries.set(r.u16(at), { type, count: values, at: inline ? at + 8 : r.u32(at + 8) });
  }
  return entries;
}

/** The unsigned integer values of an entry (SHORT or LONG), at most `max` of them, all inside the file. */
function numbersOf(r: ByteView, entries: ReadonlyMap<number, Entry>, tag: number, max: number): number[] | undefined {
  const entry = entries.get(tag);
  if (entry === undefined) return undefined;
  if (entry.type !== SHORT && entry.type !== LONG) throw malformed(`tiff tag ${tag} is not an integer`);
  if (entry.count > max) throw overLimit(`tiff tag ${tag} holds ${entry.count} values, over the ${max} value ceiling`);
  const size = entry.type === SHORT ? 2 : 4;
  r.need(entry.at, entry.count * size, `tag ${tag}`);
  return Array.from({ length: entry.count }, (_, i) => (entry.type === SHORT ? r.u16(entry.at + i * 2) : r.u32(entry.at + i * 4)));
}

/** A tag that holds exactly one integer, else `fallback` when absent. */
function oneNumber(r: ByteView, entries: ReadonlyMap<number, Entry>, tag: number, fallback?: number): number {
  const entry = entries.get(tag);
  if (entry !== undefined && entry.count !== 1) throw malformed(`tiff tag ${tag} holds ${entry.count} values, not one`);
  const value = numbersOf(r, entries, tag, 1)?.[0];
  if (value !== undefined) return value;
  if (fallback === undefined) throw malformed(`tiff is missing required tag ${tag}`);
  return fallback;
}

/** A RATIONAL as a number, or undefined when absent, malformed or with a zero denominator. */
function rationalOf(r: ByteView, entries: ReadonlyMap<number, Entry>, tag: number): number | undefined {
  const entry = entries.get(tag);
  if (entry === undefined || entry.type !== RATIONAL || entry.count < 1 || !r.has(entry.at, 8)) return undefined;
  const denominator = r.u32(entry.at + 4);
  return denominator === 0 ? undefined : r.u32(entry.at) / denominator;
}

/** The resolution unit: 2 (inches) when the tag is absent; undefined when it is there but unreadable (wrong type, several values, outside the file). Never throws: the resolution must not cost the picture. */
function resolutionUnitOf(r: ByteView, entries: ReadonlyMap<number, Entry>): number | undefined {
  const entry = entries.get(TAG.resolutionUnit);
  if (entry === undefined) return 2;
  if (entry.count !== 1 || (entry.type !== SHORT && entry.type !== LONG)) return undefined;
  const size = entry.type === SHORT ? 2 : 4;
  if (!r.has(entry.at, size)) return undefined;
  return entry.type === SHORT ? r.u16(entry.at) : r.u32(entry.at);
}

/** The stated resolution in pixels per inch: the default for no resolution, a unit of "none" or an unreadable or unknown one, or a value out of range. Lenient, like `rationalOf`. */
function dpiOf(r: ByteView, entries: ReadonlyMap<number, Entry>, tag: number): number {
  const value = rationalOf(r, entries, tag);
  if (value === undefined) return DEFAULT_IMAGE_DPI;
  const unit = resolutionUnitOf(r, entries);
  if (unit === 2) return saneDpi(value);
  return unit === 3 ? dpiFromPerCm(value) : DEFAULT_IMAGE_DPI;
}

interface Layout {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly photometric: number;
  readonly samples: number;
  readonly bits: number;
  readonly rowBytes: number;
  readonly rowsPerStrip: number;
  readonly strips: readonly { readonly at: number; readonly rows: number }[];
}

/** Refuses what the decoder does not do, with a reason that names the tag. */
function checkSupported(r: ByteView, entries: ReadonlyMap<number, Entry>): void {
  const compression = oneNumber(r, entries, TAG.compression, 1);
  if (compression !== 1) throw unsupported(`tiff ${COMPRESSION_NAMES.get(compression) ?? `compression ${compression}`}`);
  if (entries.has(TAG.tileWidth)) throw unsupported('tiff tiles');
  if (oneNumber(r, entries, TAG.planarConfiguration, 1) !== 1) throw unsupported('tiff planar configuration');
  if (oneNumber(r, entries, TAG.fillOrder, 1) !== 1) throw unsupported('tiff fill order');
  if (oneNumber(r, entries, TAG.orientation, 1) !== 1) throw unsupported('tiff orientation');
  if (oneNumber(r, entries, TAG.sampleFormat, 1) !== 1) throw unsupported('tiff sample format');
  if (entries.has(TAG.extraSamples)) throw unsupported('tiff extra samples');
}

/** The pixel layout and strip table, validated against the file but before any output exists. */
function layoutOf(r: ByteView, entries: ReadonlyMap<number, Entry>, budget: PixelBudget): Layout {
  checkSupported(r, entries);
  const widthPx = oneNumber(r, entries, TAG.width);
  const heightPx = oneNumber(r, entries, TAG.height);
  if (widthPx < 1 || heightPx < 1) throw malformed('tiff has a zero dimension');
  if (widthPx > budget.maxSidePx || heightPx > budget.maxSidePx) throw overLimit(`tiff is ${widthPx} x ${heightPx} pixels, over the ${budget.maxSidePx} pixel side ceiling`);
  if (widthPx * heightPx > budget.maxPixels) throw overLimit(`tiff has ${widthPx * heightPx} pixels, over the ${budget.maxPixels} pixel ceiling`);
  const photometric = oneNumber(r, entries, TAG.photometric);
  const samples = oneNumber(r, entries, TAG.samplesPerPixel, 1);
  const expected = photometric === RGB ? 3 : 1;
  if (photometric !== WHITE_IS_ZERO && photometric !== BLACK_IS_ZERO && photometric !== RGB) throw unsupported(`tiff photometric interpretation ${photometric}`);
  if (samples !== expected) throw unsupported(`tiff with ${samples} samples per pixel for photometric interpretation ${photometric}`);
  const perSample = numbersOf(r, entries, TAG.bitsPerSample, MAX_TIFF_SAMPLE_VALUES) ?? [1];
  if (perSample.length < samples) throw malformed('tiff bits per sample lists fewer values than samples per pixel');
  const bits = perSample[0] ?? 1;
  if (perSample.slice(0, samples).some((b) => b !== bits)) throw unsupported('tiff with different bit depths per sample');
  const allowed = photometric === RGB ? [8, 16] : [1, 2, 4, 8, 16];
  if (!allowed.includes(bits)) throw unsupported(`tiff with ${bits} bits per sample`);
  const rowBytes = Math.ceil((widthPx * samples * bits) / 8);
  const rowsPerStrip = Math.min(oneNumber(r, entries, TAG.rowsPerStrip, MAX_UINT32), heightPx);
  if (rowsPerStrip < 1) throw malformed('tiff has zero rows per strip');
  const stripCount = Math.ceil(heightPx / rowsPerStrip);
  if (stripCount > MAX_TIFF_STRIPS) throw overLimit(`tiff has ${stripCount} strips, over the ${MAX_TIFF_STRIPS} strip ceiling`);
  const offsets = numbersOf(r, entries, TAG.stripOffsets, MAX_TIFF_STRIPS);
  const counts = numbersOf(r, entries, TAG.stripByteCounts, MAX_TIFF_STRIPS);
  if (offsets === undefined || offsets.length < stripCount) throw malformed('tiff strip offsets do not cover the image');
  if (counts === undefined && stripCount > 1) throw malformed('tiff strip byte counts are missing');
  const strips = Array.from({ length: stripCount }, (_, i) => {
    const rows = Math.min(rowsPerStrip, heightPx - i * rowsPerStrip);
    const at = offsets[i] ?? 0;
    const declared = counts?.[i];
    if (declared !== undefined && declared < rows * rowBytes) throw malformed(`tiff strip ${i} is shorter than its rows`);
    r.need(at, rows * rowBytes, `strip ${i}`);
    return { at, rows };
  });
  return { widthPx, heightPx, photometric, samples, bits, rowBytes, rowsPerStrip, strips };
}

/** The sample at index `i` of a row starting at `at`, scaled to 8 bits (16-bit samples keep their high byte). */
function sampleAt(r: ByteView, at: number, i: number, bits: number): number {
  if (bits === 8) return r.bytes[at + i] ?? 0;
  if (bits === 16) return r.bytes[at + i * 2 + (r.littleEndian ? 1 : 0)] ?? 0;
  const bitOffset = i * bits;
  const value = ((r.bytes[at + (bitOffset >>> 3)] ?? 0) >>> (8 - bits - (bitOffset & 7))) & ((1 << bits) - 1);
  return Math.round((value * 255) / ((1 << bits) - 1));
}

/**
 * Decodes an uncompressed TIFF (first image only, strips, 1/2/4/8/16-bit bilevel and grey, 8/16-bit RGB, either byte
 * order) to opaque RGBA. Compression, tiles, planar data, palettes, CMYK, extra samples, other bit depths and orientations
 * are `unsupported`; a directory that contradicts the file is `malformed`; strips that reach past the file are `truncated`.
 * Every ceiling is checked, and every strip verified to lie inside the file, before the output is allocated.
 */
export function decodeTiff(bytes: Uint8Array, budget: PixelBudget): DecodedRaster {
  if (bytes.length < 8) throw truncated('tiff is shorter than its header');
  const order = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0);
  if (order !== 'II' && order !== 'MM') throw malformed('tiff byte order mark is neither II nor MM');
  const r = imageView(bytes, order === 'II');
  const version = r.u16(2);
  if (version === 43) throw unsupported('BigTIFF');
  if (version !== 42) throw malformed('tiff version is not 42');
  const entries = directoryOf(r);
  const layout = layoutOf(r, entries, budget);
  const out = new Uint8Array(layout.widthPx * layout.heightPx * 4);
  let y = 0;
  for (const strip of layout.strips) {
    for (let row = 0; row < strip.rows; row += 1, y += 1) {
      const at = strip.at + row * layout.rowBytes;
      for (let x = 0; x < layout.widthPx; x += 1) {
        const into = (y * layout.widthPx + x) * 4;
        if (layout.photometric === RGB) {
          out[into] = sampleAt(r, at, x * 3, layout.bits);
          out[into + 1] = sampleAt(r, at, x * 3 + 1, layout.bits);
          out[into + 2] = sampleAt(r, at, x * 3 + 2, layout.bits);
        } else {
          const grey = sampleAt(r, at, x, layout.bits);
          const shade = layout.photometric === WHITE_IS_ZERO ? 255 - grey : grey;
          out[into] = shade;
          out[into + 1] = shade;
          out[into + 2] = shade;
        }
        out[into + 3] = 255;
      }
    }
  }
  return { format: 'rgba', widthPx: layout.widthPx, heightPx: layout.heightPx, dpiX: dpiOf(r, entries, TAG.xResolution), dpiY: dpiOf(r, entries, TAG.yResolution), bytes: out };
}
