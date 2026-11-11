import { dpiFromPerMetre } from './dpi.js';
import { imageView, malformed, overLimit, unsupported } from './errors.js';
import type { ByteView } from '../font/bytes.js';
import type { PixelBudget, DecodedRaster } from './types.js';

const FILE_HEADER_BYTES = 14;
const CORE_HEADER_BYTES = 12;
/** The DIB header sizes read: OS/2 core, `BITMAPINFOHEADER`, the two undocumented intermediates (V2, V3), `BITMAPV4HEADER`, `BITMAPV5HEADER`. */
const INFO_HEADER_SIZES: ReadonlySet<number> = new Set([40, 52, 56, 108, 124]);
const BI_RGB = 0;
const BI_BITFIELDS = 3;
const BI_ALPHABITFIELDS = 6;
const COMPRESSION_NAMES: ReadonlyMap<number, string> = new Map([
  [1, 'RLE8'],
  [2, 'RLE4'],
  [4, 'JPEG'],
  [5, 'PNG'],
]);
const SUPPORTED_BIT_DEPTHS: ReadonlySet<number> = new Set([1, 4, 8, 16, 24, 32]);

interface Header {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly topDown: boolean;
  readonly bitsPerPixel: number;
  readonly compression: number;
  readonly perMetreX: number;
  readonly perMetreY: number;
  readonly colourCount: number;
  readonly paletteAt: number;
  readonly paletteEntryBytes: number;
  readonly pixelsAt: number;
  /** Channel masks (red, green, blue, alpha) for 16 and 32 bits per pixel; undefined for the plain layouts. */
  readonly masks: readonly [number, number, number, number] | undefined;
}

/** A channel mask as a shift and a width in bits; a mask that is not one run of ones is `unsupported`. */
function channelOf(mask: number): { readonly shift: number; readonly bits: number } {
  if (mask === 0) return { shift: 0, bits: 0 };
  let shift = 0;
  while (((mask >>> shift) & 1) === 0) shift += 1;
  const run = mask >>> shift;
  let bits = 0;
  while (bits < 32 && ((run >>> bits) & 1) === 1) bits += 1;
  if (bits < 32 && run >>> bits !== 0) throw unsupported('bmp channel mask is not one run of bits');
  return { shift, bits };
}

/** The channel value scaled from `bits` bits to 8, rounded. */
const scaled = (value: number, bits: number): number => (bits === 8 ? value : Math.round((value * 255) / (2 ** bits - 1)));

function readHeader(r: ByteView): Header {
  r.need(0, FILE_HEADER_BYTES + 4, 'header');
  const dibSize = r.u32(FILE_HEADER_BYTES);
  const pixelsAt = r.u32(10);
  const isCore = dibSize === CORE_HEADER_BYTES;
  if (!isCore && !INFO_HEADER_SIZES.has(dibSize)) throw unsupported(`bmp header of ${dibSize} bytes`);
  r.need(FILE_HEADER_BYTES, dibSize, 'header');
  if (pixelsAt < FILE_HEADER_BYTES + dibSize) throw malformed('bmp pixel data starts inside the header');
  const widthPx = isCore ? r.u16(18) : r.i32(18);
  const rawHeight = isCore ? r.u16(20) : r.i32(22);
  if (r.u16(isCore ? 22 : 26) !== 1) throw malformed('bmp plane count is not 1');
  const bitsPerPixel = r.u16(isCore ? 24 : 28);
  const compression = isCore ? BI_RGB : r.u32(30);
  if (widthPx < 1 || rawHeight === 0) throw malformed('bmp has a zero or negative width, or a zero height');
  if (!SUPPORTED_BIT_DEPTHS.has(bitsPerPixel)) throw unsupported(`bmp with ${bitsPerPixel} bits per pixel`);
  const named = COMPRESSION_NAMES.get(compression);
  if (named !== undefined) throw unsupported(`bmp ${named} compression`);
  if (compression !== BI_RGB && compression !== BI_BITFIELDS && compression !== BI_ALPHABITFIELDS) throw unsupported(`bmp compression ${compression}`);
  if (compression !== BI_RGB && bitsPerPixel !== 16 && bitsPerPixel !== 32) throw malformed('bmp bit fields on an image that is not 16 or 32 bits per pixel');
  const paletted = bitsPerPixel <= 8;
  const colourCount = !paletted ? 0 : Math.min(isCore ? 2 ** bitsPerPixel : r.u32(46) || 2 ** bitsPerPixel, 2 ** bitsPerPixel);
  return {
    widthPx,
    heightPx: Math.abs(rawHeight),
    topDown: rawHeight < 0,
    bitsPerPixel,
    compression,
    perMetreX: isCore ? 0 : r.i32(38),
    perMetreY: isCore ? 0 : r.i32(42),
    colourCount,
    paletteAt: FILE_HEADER_BYTES + dibSize,
    paletteEntryBytes: isCore ? 3 : 4,
    pixelsAt,
    masks: masksOf(r, dibSize, bitsPerPixel, compression),
  };
}

/** The channel masks: in the header from 52 bytes on, after a 40-byte header when the compression asks for them, else the plain 5-5-5 / 8-8-8 layouts. */
function masksOf(r: ByteView, dibSize: number, bitsPerPixel: number, compression: number): Header['masks'] {
  if (bitsPerPixel !== 16 && bitsPerPixel !== 32) return undefined;
  const at = FILE_HEADER_BYTES + 40;
  if (compression === BI_RGB) return bitsPerPixel === 16 ? [0x7c00, 0x03e0, 0x001f, 0] : [0x00ff0000, 0x0000ff00, 0x000000ff, 0];
  const count = compression === BI_ALPHABITFIELDS ? 4 : 3;
  if (dibSize === 40) {
    r.need(at, count * 4, 'bit masks');
    return [r.u32(at), r.u32(at + 4), r.u32(at + 8), count === 4 ? r.u32(at + 12) : 0];
  }
  return [r.u32(at), r.u32(at + 4), r.u32(at + 8), dibSize >= 56 ? r.u32(at + 12) : 0];
}

/** The palette as `[r, g, b]` triples, read once. A missing entry cannot be read past the file: it is `truncated`. */
function paletteOf(r: ByteView, h: Header): Uint8Array {
  const bytes = new Uint8Array(h.colourCount * 3);
  r.need(h.paletteAt, h.colourCount * h.paletteEntryBytes, 'palette');
  for (let i = 0; i < h.colourCount; i += 1) {
    const at = h.paletteAt + i * h.paletteEntryBytes;
    bytes[i * 3] = r.u8(at + 2);
    bytes[i * 3 + 1] = r.u8(at + 1);
    bytes[i * 3 + 2] = r.u8(at);
  }
  return bytes;
}

/** Writes row `y` (an index counted from the top of the picture) of a paletted image. An index past the palette is black. */
function indexedRow(r: ByteView, h: Header, palette: Uint8Array, at: number, y: number, out: Uint8Array): void {
  const bits = h.bitsPerPixel;
  const mask = (1 << bits) - 1;
  for (let x = 0; x < h.widthPx; x += 1) {
    const bitOffset = x * bits;
    const byte = r.bytes[at + (bitOffset >>> 3)] ?? 0;
    const index = (byte >>> (8 - bits - (bitOffset & 7))) & mask;
    const into = (y * h.widthPx + x) * 4;
    out[into] = index < h.colourCount ? (palette[index * 3] ?? 0) : 0;
    out[into + 1] = index < h.colourCount ? (palette[index * 3 + 1] ?? 0) : 0;
    out[into + 2] = index < h.colourCount ? (palette[index * 3 + 2] ?? 0) : 0;
    out[into + 3] = 255;
  }
}

/** One channel of a masked pixel: where its bits sit and how many there are (0 bits: the channel is absent). */
interface Channel {
  readonly mask: number;
  readonly divisor: number;
  readonly bits: number;
}

const channelsOf = (masks: readonly number[]): Channel[] =>
  masks.map((mask) => {
    const { shift, bits } = channelOf(mask);
    return { mask, divisor: 2 ** shift, bits };
  });

/** A 24-bit row: blue, green, red. */
function row24(r: ByteView, h: Header, at: number, y: number, out: Uint8Array): void {
  for (let x = 0; x < h.widthPx; x += 1) {
    const from = at + x * 3;
    const into = (y * h.widthPx + x) * 4;
    out[into] = r.bytes[from + 2] ?? 0;
    out[into + 1] = r.bytes[from + 1] ?? 0;
    out[into + 2] = r.bytes[from] ?? 0;
    out[into + 3] = 255;
  }
}

/** A 16- or 32-bit row through channel masks. A channel with no bits is 0 (colour) or 255 (alpha). */
function maskedRow(r: ByteView, h: Header, channels: readonly Channel[], at: number, y: number, out: Uint8Array): void {
  const bytesPerPixel = h.bitsPerPixel / 8;
  const [red, green, blue, alpha] = channels;
  const read = (pixel: number, c: Channel | undefined, absent: number): number =>
    c === undefined || c.bits === 0 ? absent : scaled(Math.floor(((pixel & c.mask) >>> 0) / c.divisor), c.bits);
  for (let x = 0; x < h.widthPx; x += 1) {
    const from = at + x * bytesPerPixel;
    const low = (r.bytes[from] ?? 0) | ((r.bytes[from + 1] ?? 0) << 8);
    const pixel = bytesPerPixel === 2 ? low : (low | ((r.bytes[from + 2] ?? 0) << 16) | ((r.bytes[from + 3] ?? 0) << 24)) >>> 0;
    const into = (y * h.widthPx + x) * 4;
    out[into] = read(pixel, red, 0);
    out[into + 1] = read(pixel, green, 0);
    out[into + 2] = read(pixel, blue, 0);
    out[into + 3] = read(pixel, alpha, 255);
  }
}

/**
 * Decodes an uncompressed Windows or OS/2 bitmap (1, 4, 8, 16, 24 or 32 bits per pixel, bottom-up or top-down) to RGBA.
 * 32-bit pixels without bit fields carry no alpha (the fourth byte is unused, as in GDI), so they are opaque. RLE, JPEG and
 * PNG compression, other bit depths and header sizes are `unsupported`; a header that contradicts the data is `malformed`;
 * pixel data shorter than the header says is `truncated`. Every ceiling is checked, and the data length verified, before
 * the output is allocated, so a header claiming a huge picture over a few bytes costs nothing.
 */
export function decodeBmp(bytes: Uint8Array, budget: PixelBudget): DecodedRaster {
  const r = imageView(bytes, true);
  const h = readHeader(r);
  if (h.widthPx > budget.maxSidePx || h.heightPx > budget.maxSidePx) throw overLimit(`bmp is ${h.widthPx} x ${h.heightPx} pixels, over the ${budget.maxSidePx} pixel side ceiling`);
  if (h.widthPx * h.heightPx > budget.maxPixels) throw overLimit(`bmp has ${h.widthPx * h.heightPx} pixels, over the ${budget.maxPixels} pixel ceiling`);
  const stride = Math.floor((h.bitsPerPixel * h.widthPx + 31) / 32) * 4;
  r.need(h.pixelsAt, stride * h.heightPx, 'pixel data');
  const palette = h.bitsPerPixel <= 8 ? paletteOf(r, h) : new Uint8Array(0);
  const channels = h.masks === undefined ? [] : channelsOf(h.masks);
  const out = new Uint8Array(h.widthPx * h.heightPx * 4);
  for (let row = 0; row < h.heightPx; row += 1) {
    const y = h.topDown ? row : h.heightPx - 1 - row;
    const at = h.pixelsAt + row * stride;
    if (h.bitsPerPixel <= 8) indexedRow(r, h, palette, at, y, out);
    else if (h.bitsPerPixel === 24) row24(r, h, at, y, out);
    else maskedRow(r, h, channels, at, y, out);
  }
  return { format: 'rgba', widthPx: h.widthPx, heightPx: h.heightPx, dpiX: dpiFromPerMetre(h.perMetreX), dpiY: dpiFromPerMetre(h.perMetreY), bytes: out };
}
