// X5 slice a (P-156 (1); plan-p156 P156-1, P156-2): the form library filled once from IRCC's forms-and-guides index, US$0:
// no AI, no PDF download. Pure: it says what the fill does to the library; the API applies it. Every number on the index
// becomes a library form (a new one is "Listed by IRCC · no file yet"); a form already there is matched by its number,
// never duplicated, and keeps its file. A later read whose date modified differs, for a form that has a file, marks it
// "Newer edition on canada.ca": a person checks it; the file is never replaced here.
import type { IndexRow } from "./canada.ts";

export type LibraryForm = { formKey: string; indexDateModified: string | null; hasFile: boolean; formPageUrl: string | null; /** canada.ca's month for the library's newest edition (YYYY-MM), if known */ editionDated?: string | null;
  /** X5 break m13: a printed file waits for a second person (no approved one yet): a later date still marks it, so the mark is
   *  there once the file is approved (before: the date moved on silently and the form read Ready on an old file). */
  hasHeldFile?: boolean };
export type IndexFill = {
  /** New library forms, listed with no file yet. */
  create: { formKey: string; title: string; kind: "data_form" | "checklist"; pageUrl: string; dateModified: string | null }[];
  /** Forms already in the library: now marked as listed by IRCC; their page filled in only where the library had none. */
  listed: { formKey: string; pageUrl: string | null; dateModified: string | null }[];
  /** Forms with a file whose index date changed since the last read: "Newer edition on canada.ca". */
  newer: string[];
  /** Devin on #145: forms whose index date went back to or before the date the library had: an earlier "newer" mark is
   *  cleared (the change that set it is gone). */
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
  const formRow = new Map<string, IndexRow>();
  for (const r of rows) if (r.kind === "form" && !formRow.has(r.code)) formRow.set(r.code, r);
  // X5 break m15: the same number listed twice (another spacing, read as one number) keeps the latest date of its kind.
  const latest = new Map<string, string>();
  for (const r of rows) if (r.dateModified) { const k = `${r.code}|${r.kind}`, d = latest.get(k); if (!d || isLaterDate(r.dateModified, d)) latest.set(k, r.dateModified); }
  const out: IndexFill = { create: [], listed: [], newer: [], clear: [] }, seen = new Set<string>();
  for (const r0 of rows) {
    if (seen.has(r0.code)) continue;
    seen.add(r0.code);
    const r1 = formRow.get(r0.code) ?? r0, r = { ...r1, dateModified: latest.get(`${r1.code}|${r1.kind}`) ?? r1.dateModified };
    const f = have.get(r.code);
    if (!f) { out.create.push({ formKey: r.code, title: r.title, kind: r.kind === "checklist" ? "checklist" : "data_form", pageUrl: r.pageUrl, dateModified: r.dateModified }); continue; }
    out.listed.push({ formKey: r.code, pageUrl: f.formPageUrl ? null : r.pageUrl, dateModified: r.dateModified });
    // X5 review (86f9447c) m2: the same rule the list applies: not newer when the library's edition is already dated at or
    // after the index's date (the fill's words then agree with the list's count).
    const answered = !!(f.editionDated && r.dateModified && f.editionDated >= r.dateModified.slice(0, 7));
    if ((f.hasFile || f.hasHeldFile) && f.indexDateModified && r.dateModified && isLaterDate(r.dateModified, f.indexDateModified) && !answered) out.newer.push(r.code);
    else if (f.indexDateModified && r.dateModified && isLaterDate(f.indexDateModified, r.dateModified)) out.clear.push(r.code);
  }
  return out;
}
