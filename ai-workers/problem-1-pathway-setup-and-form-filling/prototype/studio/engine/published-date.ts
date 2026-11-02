// C3.12 (K3, QA-148): what the Forms list says for a form edition's dates, pure rules.
// "Published" is IRCC's own date for the edition (AGENTS rule 4: an immigration value from an official source): the month
// printed on the form ("IMM 1295 (09-2023)"), else the "Last updated" month of its canada.ca page, by the one rule the
// library already uses for "newer on canada.ca" (engine/library-index.ts fileMonth). It is never the PDF file's own date.
// The file's own date (FormEdition.published: the PDF's ModDate, else CreationDate; #313) is kept and shown apart as
// "File saved": null = not read yet; "" = the PDF names no date; "?" = the file could not be read; else the date read.
import { fileMonth } from "./library-index.ts";

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

/** K3 (QA-148): IRCC's published month for a form or checklist edition and where it was read. The month printed on the
 *  form first (the same order as fileMonth: a page edit never re-dates an old file); canada.ca's "Last updated" month only
 *  when the label prints none (break m3: a label whose printed date is not a real month never borrows a page's date, which
 *  may belong to another file). A guide has none (break M1: its page's "Date modified" is not an edition's publication). */
export type PublishedFrom = "printed" | "canada_page";
export type IrcPublishedState = "date" | "none" | "not_a_month";
export function ircPublished(e: { canadaUpdated?: string | null; editionLabel: string }, kind: "form" | "guide" | "checklist" = "form"): { published: string | null; published_from: PublishedFrom | null; published_state: IrcPublishedState } {
  if (kind === "guide") return { published: null, published_from: null, published_state: "none" };
  const lb = /\((\d{2})-(\d{4})\)\s*$/.exec(e.editionLabel);
  if (lb) {
    // Break m2: a printed month IRCC could print (01-12, 1990 to next year; fileMonth's "not after this month" is for index
    // dating, not for saying what is printed).
    const y = Number(lb[2]), mo = Number(lb[1]);
    return mo >= 1 && mo <= 12 && y >= 1990 && y <= new Date().getUTCFullYear() + 1 ? { published: `${lb[2]}-${lb[1]}`, published_from: "printed", published_state: "date" } : { published: null, published_from: null, published_state: "not_a_month" };
  }
  const page = fileMonth({ editionLabel: e.editionLabel, canadaUpdated: e.canadaUpdated });
  return page ? { published: page, published_from: "canada_page", published_state: "date" } : { published: null, published_from: null, published_state: "none" };
}

/** The file's own date (#313), kept apart from IRCC's: the same words as before, under its own names. */
export function fileDateOf(v: string | null | undefined): { file_date: string | null; file_date_state: PublishedState } {
  const p = publishedOf(v);
  return { file_date: p.published, file_date_state: p.published_state };
}
