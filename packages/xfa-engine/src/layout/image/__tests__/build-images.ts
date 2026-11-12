import { concatBytes } from '../../../pdf/concat-bytes.js';

/** Test-only builders of synthetic BMP, TIFF and JPEG files from plain numbers: nothing here is read from a file. */

export const concat = (...parts: readonly (readonly number[] | Uint8Array)[]): Uint8Array => concatBytes(parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p))));
const le16 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff];
const le32 = (v: number): number[] => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
const be16 = (v: number): number[] => [(v >>> 8) & 0xff, v & 0xff];
const be32 = (v: number): number[] => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];

export interface BmpOptions {
  readonly width: number;
  /** Negative: top-down. */
  readonly height: number;
  readonly bitsPerPixel: number;
  /** Pixel rows in file order, already padded to a multiple of four bytes. */
  readonly rows: readonly (readonly number[])[];
  /** Palette entries as [r, g, b]; written blue, green, red, 0. */
  readonly palette?: readonly (readonly [number, number, number])[];
  readonly compression?: number;
  /** Masks for compression 3 / 6. */
  readonly masks?: readonly number[];
  /** DIB header size: 12, 40 (default) or 108. */
  readonly headerSize?: number;
  readonly perMetre?: number;
  readonly planes?: number;
  readonly colourCount?: number;
  /** Overrides `bfOffBits`. */
  readonly pixelsAt?: number;
}

export function buildBmp(o: BmpOptions): Uint8Array {
  const headerSize = o.headerSize ?? 40;
  const palette = (o.palette ?? []).flatMap(([r, g, b]) => (headerSize === 12 ? [b, g, r] : [b, g, r, 0]));
  const inlineMasks = headerSize === 40 && (o.compression === 3 || o.compression === 6) ? (o.masks ?? []).flatMap(le32) : [];
  const dib =
    headerSize === 12
      ? [...le32(12), ...le16(o.width), ...le16(Math.abs(o.height)), ...le16(o.planes ?? 1), ...le16(o.bitsPerPixel)]
      : [
          ...le32(headerSize),
          ...le32(o.width),
          ...le32(o.height),
          ...le16(o.planes ?? 1),
          ...le16(o.bitsPerPixel),
          ...le32(o.compression ?? 0),
          ...le32(0),
          ...le32(o.perMetre ?? 0),
          ...le32(o.perMetre ?? 0),
          ...le32(o.colourCount ?? 0),
          ...le32(0),
          ...(headerSize > 40 ? (o.masks ?? [0, 0, 0, 0]).flatMap(le32) : []),
          ...new Array<number>(Math.max(0, headerSize - 40 - (headerSize > 40 ? 16 : 0))).fill(0),
        ];
  const pixelsAt = o.pixelsAt ?? 14 + dib.length + inlineMasks.length + palette.length;
  const pixels = o.rows.flat();
  return concat([0x42, 0x4d], le32(pixelsAt + pixels.length), le32(0), le32(pixelsAt), dib, inlineMasks, palette, pixels);
}

export interface TiffTag {
  readonly tag: number;
  readonly type: 3 | 4 | 5;
  readonly values: readonly number[];
}

export interface TiffOptions {
  readonly littleEndian?: boolean;
  readonly tags: readonly TiffTag[];
  /** Strip data in file order; offsets of `StripOffsets` must be set by the caller or left to `strips`. */
  readonly strips?: readonly (readonly number[])[];
  /** Append raw bytes after everything (for truncation tests the caller slices the result instead). */
  readonly extra?: readonly number[];
}

/**
 * A TIFF whose strip data follows the 8-byte header, then the out-of-line tag values, then the directory. A tag named
 * `STRIP_OFFSETS` (273) with `values: []` is filled from `strips`, and 279 likewise.
 */
export function buildTiff(o: TiffOptions): Uint8Array {
  const little = o.littleEndian ?? true;
  const u16 = little ? le16 : be16;
  const u32 = little ? le32 : be32;
  const strips = o.strips ?? [];
  const stripData = strips.flat();
  const cursor = 8 + stripData.length;
  const stripAt: number[] = [];
  strips.reduce((at, strip) => {
    stripAt.push(at);
    return at + strip.length;
  }, 8);
  const external: number[] = [];
  const entries = [...o.tags]
    .map((t) => (t.tag === 273 && t.values.length === 0 ? { ...t, values: stripAt } : t.tag === 279 && t.values.length === 0 ? { ...t, values: strips.map((s) => s.length) } : t))
    .sort((a, b) => a.tag - b.tag)
    .map((t) => {
      const size = t.type === 3 ? 2 : t.type === 4 ? 4 : 8;
      const bytes = t.values.flatMap((v) => (t.type === 3 ? u16(v) : t.type === 4 ? u32(v) : u32(v)));
      if (t.values.length * size <= 4) return [...u16(t.tag), ...u16(t.type), ...u32(t.values.length), ...bytes, ...new Array<number>(4 - bytes.length).fill(0)];
      const offset = cursor + external.length;
      external.push(...bytes);
      return [...u16(t.tag), ...u16(t.type), ...u32(t.values.length), ...u32(offset)];
    });
  const directoryAt = cursor + external.length;
  return concat(little ? [0x49, 0x49, 0x2a, 0x00] : [0x4d, 0x4d, 0x00, 0x2a], u32(directoryAt), stripData, external, u16(entries.length), entries.flat(), u32(0), o.extra ?? []);
}

/** Tag helpers. */
export const short = (tag: number, ...values: number[]): TiffTag => ({ tag, type: 3, values });
export const long = (tag: number, ...values: number[]): TiffTag => ({ tag, type: 4, values });
export const rational = (tag: number, numerator: number, denominator: number): TiffTag => ({ tag, type: 5, values: [numerator, denominator] });

export interface JpegOptions {
  readonly width: number;
  readonly height: number;
  readonly components?: number;
  readonly precision?: number;
  /** SOF marker byte: 0xc0 baseline, 0xc2 progressive, ... */
  readonly frame?: number;
  readonly jfif?: { readonly units: number; readonly x: number; readonly y: number };
  /** Bytes after the frame header (scan, EOI). */
  readonly tail?: readonly number[];
}

export function buildJpeg(o: JpegOptions): Uint8Array {
  const app0 = o.jfif === undefined ? [] : [0xff, 0xe0, ...be16(16), 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, o.jfif.units, ...be16(o.jfif.x), ...be16(o.jfif.y), 0, 0];
  const components = o.components ?? 3;
  const componentSpecs = Array.from({ length: components }, (_, i) => [i + 1, 0x11, 0]).flat();
  const sof = [0xff, o.frame ?? 0xc0, ...be16(8 + components * 3), o.precision ?? 8, ...be16(o.height), ...be16(o.width), components, ...componentSpecs];
  return concat([0xff, 0xd8], app0, sof, o.tail ?? [0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
