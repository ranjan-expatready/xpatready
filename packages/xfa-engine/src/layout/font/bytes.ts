import { XfaPdfError } from '../../pdf/errors.js';

/** Builds the error for a read of `length` bytes at `at` that runs past the end; `what` names the data being read. */
export type ByteViewFailure = (at: number, length: number, what: string) => Error;

export interface ByteViewOptions {
  /** Byte order of multi-byte reads; big-endian (the font default) when absent. */
  readonly littleEndian?: boolean;
  /** The error raised by a read past the end; the font layer's `MALFORMED` `XfaPdfError` when absent. */
  readonly fail?: ByteViewFailure;
}

const fontDataEnds: ByteViewFailure = (at, length) => new XfaPdfError('MALFORMED', `Font data ends before byte ${at + length} (read of ${length} at ${at})`);

/**
 * Bounds-checked reads over font bytes. Every offset and length in a font file is attacker-controlled, so no table is
 * read through a raw `DataView`: an out-of-range read raises `MALFORMED` (or answers `undefined` from the `try*` forms,
 * for lookups that must not throw). The image layer reads little-endian BMP and either-order TIFF through the same
 * class, with its own error. Only `Uint8Array` and `DataView` are used, so the reader runs in a browser worker.
 */
export class ByteView {
  readonly length: number;
  readonly bytes: Uint8Array;
  readonly littleEndian: boolean;
  private readonly data: DataView;
  private readonly fail: ByteViewFailure;

  constructor(bytes: Uint8Array, options: ByteViewOptions = {}) {
    this.bytes = bytes;
    this.length = bytes.length;
    this.littleEndian = options.littleEndian ?? false;
    this.fail = options.fail ?? fontDataEnds;
    this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /** True when `length` bytes starting at `at` lie inside the data; arithmetic is on safe integers, so it cannot wrap. */
  has(at: number, length: number): boolean {
    return Number.isSafeInteger(at) && Number.isSafeInteger(length) && at >= 0 && length >= 0 && at + length <= this.length;
  }

  /** Throws the view's error unless `length` bytes at `at` lie inside the data. */
  need(at: number, length: number, what = 'data'): void {
    if (!this.has(at, length)) throw this.fail(at, length, what);
  }

  u8(at: number): number {
    this.need(at, 1);
    return this.data.getUint8(at);
  }

  u16(at: number): number {
    this.need(at, 2);
    return this.data.getUint16(at, this.littleEndian);
  }

  i16(at: number): number {
    this.need(at, 2);
    return this.data.getInt16(at, this.littleEndian);
  }

  u32(at: number): number {
    this.need(at, 4);
    return this.data.getUint32(at, this.littleEndian);
  }

  i32(at: number): number {
    this.need(at, 4);
    return this.data.getInt32(at, this.littleEndian);
  }

  tryU16(at: number): number | undefined {
    return this.has(at, 2) ? this.data.getUint16(at, this.littleEndian) : undefined;
  }

  /** Four bytes as a Latin-1 tag. */
  tag(at: number): string {
    this.need(at, 4);
    return String.fromCharCode(this.bytes[at] ?? 0, this.bytes[at + 1] ?? 0, this.bytes[at + 2] ?? 0, this.bytes[at + 3] ?? 0);
  }

  /** An independent copy of `length` bytes at `at`, so a parsed font never aliases the caller's buffer. */
  copy(at: number, length: number): Uint8Array {
    this.need(at, length);
    return this.bytes.slice(at, at + length);
  }
}
