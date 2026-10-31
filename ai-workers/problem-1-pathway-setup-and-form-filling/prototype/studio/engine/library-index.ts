// X5 slice a (P-156 (1); plan-p156 P156-1, P156-2): the form library filled once from IRCC's forms-and-guides index, US$0:
// no AI, no PDF download. Pure: it says what the fill does to the library; the API applies it. Every number on the index
// becomes a library form (a new one is "Listed by IRCC · no file yet"); a form already there is matched by its number,
// never duplicated, and keeps its file. A later read whose date modified differs, for a form that has a file, marks it
// "Newer edition on canada.ca": a person checks it; the file is never replaced here.
import type { IndexRow } from "./canada.ts";

export type LibraryForm = { formKey: string; indexDateModified: string | null; hasFile: boolean; formPageUrl: string | null; /** canada.ca's month for the library's newest edition (YYYY-MM), if known */ editionDated?: string | null;
  /** X5 break m13, M9: a printed file waits for a second person (a held upload, or an unapproved edition) and no approved one
   *  exists yet: a later date still marks the form, so the mark is there once the file is approved (before: the date moved
   *  on silently and the form read Ready on an old file). */
  hasHeldFile?: boolean;
  /** canada.ca's month for the newest held edition, if known: a held file dated at or after the index answers it already. */
  heldDated?: string | null };
export type IndexFill = {
  /** New library forms, listed with no file yet. */
  create: { formKey: string; title: string; kind: "data_form" | "checklist"; pageUrl: string; dateModified: string | null }[];
  /** Forms already in the library: now marked as listed by IRCC; their page filled in only where the library had none. */
  listed: { formKey: string; pageUrl: string | null; dateModified: string | null }[];
  /** Forms with a file whose index date changed since the last read: "Newer edition on canada.ca". */
  newer: string[];
  /** Forms with no approved file yet (only a held one) marked the same way: not said as "newer" (the list says "Needs your
   *  OK" or "No file yet" for them), the mark waits for the approval (review dc93b60f q2). */
  pending: string[];
  /** Break / review (dc93b60f) M8: forms whose current edition is dated at or after the index's date: an earlier mark is
   *  answered and cleared, the list's own rule written down (before: any step back cleared it, even one still later than
   *  the file). */
  clear: string[];
};

/** X5 break m2: a date is newer only when it is later (canada.ca writes YYYY-MM or YYYY-MM-DD; compared month first). A
 *  date that went back, or one in another shape, marks nothing. */
export function isLaterDate(next: string, before: string): boolean {
  const ok = /^\d{4}-\d{2}(-\d{2})?$/;
  if (!ok.test(next) || !ok.test(before)) return false;
  return `${next}-00`.slice(0, 10) > `${before}-00`.slice(0, 10);
}

export function planIndexFill(rows: IndexRow[], library: LibraryForm[]): IndexFill {
  const have = new Map(library.map((f) => [f.formKey, f]));
  // X5 break m6, Devin on #138: a number the index lists twice (a form and its checklist link) is one form; if any of its
  // rows is a form, that row is the one kept, whole (its title, page and date as well as its kind), never the checklist's.
  // X5 break m15, dc93b60f m26: the same number listed twice (another spacing, read as one number) is one form: the row kept
  // whole is a form row if there is one, and of those the one with the latest date (its title, page and date together).
  const best = new Map<string, IndexRow>();
  const later = (a: IndexRow, b: IndexRow) => !!a.dateModified && (!b.dateModified || isLaterDate(a.dateModified, b.dateModified));
  for (const r of rows) {
    const b = best.get(r.code);
    if (!b || (r.kind === "form" && b.kind !== "form") || (r.kind === b.kind && later(r, b))) best.set(r.code, r);
  }
  const out: IndexFill = { create: [], listed: [], newer: [], pending: [], clear: [] };
  for (const r of best.values()) {
    const f = have.get(r.code);
    if (!f) { out.create.push({ formKey: r.code, title: r.title, kind: r.kind === "checklist" ? "checklist" : "data_form", pageUrl: r.pageUrl, dateModified: r.dateModified }); continue; }
    out.listed.push({ formKey: r.code, pageUrl: f.formPageUrl ? null : r.pageUrl, dateModified: r.dateModified });
    // X5 review (86f9447c) m2: the same rule the list applies: not newer when the library's edition is already dated at or
    // after the index's date (the fill's words then agree with the list's count).
    const month = r.dateModified?.slice(0, 7);
    const answered = !!(f.editionDated && month && f.editionDated >= month);
    const changed = !!(f.indexDateModified && r.dateModified && isLaterDate(r.dateModified, f.indexDateModified));
    if (f.hasFile && changed && !answered) out.newer.push(r.code);
    else if (!f.hasFile && f.hasHeldFile && changed && !(f.heldDated && month && f.heldDated >= month)) out.pending.push(r.code);
    else if (answered) out.clear.push(r.code);
  }
  return out;
}
