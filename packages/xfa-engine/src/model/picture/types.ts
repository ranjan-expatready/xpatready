export type PictureCategory = 'date' | 'num' | 'text' | 'null';

export type PictureParse =
  | { readonly ok: true; readonly canonical: string | null; readonly category: PictureCategory }
  | { readonly ok: false };

export type PictureFormat = { readonly ok: true; readonly text: string } | { readonly ok: false };

export interface Picture {
  readonly source: string;
  /** User/data text -> canonical. First clause that parses wins. Empty input (after no trimming) parses OK as canonical null for ANY picture. */
  parse(input: string): PictureParse;
  /** Canonical -> display text. null/'' canonical: use the `null{}` clause if present (text ''), else ok with ''. Non-empty: first non-null clause that can format it wins. */
  format(canonical: string | null): PictureFormat;
}

/** One compiled `category{pattern}` clause. `undefined` means "this clause does not apply"; the picture tries the next. */
export interface PictureClause {
  readonly category: PictureCategory;
  /** Non-empty display/entry text -> canonical, or undefined when the text does not match this clause exactly. */
  parse(input: string): string | undefined;
  /** Non-empty canonical -> display text, or undefined when this clause cannot show it. */
  format(canonical: string): string | undefined;
}
