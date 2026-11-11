/** PDF object model (ISO 32000-1 §7.3). Names/strings carry a `kind` tag so they never collide with JS strings/arrays. */

export interface PdfName {
  readonly kind: 'name';
  readonly value: string;
}

export interface PdfString {
  readonly kind: 'string';
  readonly bytes: Uint8Array;
  /** True when written as a hex string `<...>`; false for a literal string `(...)`. */
  readonly hex: boolean;
}

export interface PdfRef {
  readonly kind: 'ref';
  readonly num: number;
  readonly gen: number;
}

export type PdfValue = null | boolean | number | PdfName | PdfString | PdfValue[] | PdfDict | PdfRef;

/** Dictionary keys are stored without the leading `/`. */
export type PdfDict = Map<string, PdfValue>;

export interface PdfStream {
  readonly dict: PdfDict;
  /** Bytes between `stream` and `endstream`, still filter-encoded; already decrypted when read through an encrypted document's PdfReader. */
  readonly raw: Uint8Array;
}

export interface PdfIndirect {
  readonly num: number;
  readonly gen: number;
  readonly value: PdfValue | PdfStream;
}

export function isPdfStream(v: PdfValue | PdfStream | undefined): v is PdfStream {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && 'raw' in v && 'dict' in v;
}

export function isPdfName(v: PdfValue | undefined): v is PdfName {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && 'kind' in v && v.kind === 'name';
}

export function isPdfString(v: PdfValue | PdfStream | undefined): v is PdfString {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && 'kind' in v && v.kind === 'string';
}

export function isPdfRef(v: PdfValue | undefined): v is PdfRef {
  return v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Map) && 'kind' in v && v.kind === 'ref';
}

/** The value if it is a non-negative safe integer, else undefined (sizes, offsets, widths, counts). */
export function asNonNegInt(v: PdfValue | undefined): number | undefined {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined;
}
