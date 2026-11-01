// C3.12 (forms lane): what the Forms list says for a form edition's published date (FormEdition.published), pure rules.
// Stored: null = not read yet; "" = the PDF names no date; "?" = the file could not be read; else the date read.

/** Break m1: a real calendar date, from 1990 to next year (a file's clock can say anything). */
export function realDate(v: string | null | undefined): string | null {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 1990 && +m[1] <= new Date().getUTCFullYear() + 1 ? v! : null;
}

/** What the API says for the column: the date, and why there is none (break M2: "not read yet" and "could not be read"
 *  are never said as "the file names no date"). */
export type PublishedState = "date" | "none" | "unread" | "unreadable";
export function publishedOf(v: string | null | undefined): { published: string | null; published_state: PublishedState } {
  const d = realDate(v);
  return { published: d, published_state: d ? "date" : v === null || v === undefined ? "unread" : v === "?" ? "unreadable" : "none" };
}
