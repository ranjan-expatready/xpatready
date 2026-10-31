// X5 slice a (P-156 (1); plan-p156 P156-1, P156-2): the form library filled once from IRCC's forms-and-guides index, US$0:
// no AI, no PDF download. Pure: it says what the fill does to the library; the API applies it. Every number on the index
// becomes a library form (a new one is "Listed by IRCC · no file yet"); a form already there is matched by its number,
// never duplicated, and keeps its file. A later read whose date modified differs, for a form that has a file, marks it
// "Newer edition on canada.ca": a person checks it; the file is never replaced here.
import { indexTitleOk, type IndexRow } from "./canada.ts";

export type LibraryForm = { formKey: string; indexDateModified: string | null; hasFile: boolean; formPageUrl: string | null;
  /** The month the library's current (approved, printed) edition is from (editionMonth), if known. */
  editionMonth?: string | null;
  /** The index date last seen as current for the library's file (see newerOnIndex). */
  seenCurrent?: string | null };
export type IndexFill = {
  /** New library forms, listed with no file yet. */
  create: { formKey: string; title: string; kind: "data_form" | "checklist"; pageUrl: string; dateModified: string | null }[];
  /** Forms already in the library: now marked as listed by IRCC; their page filled in only where the library had none.
   *  `before` is the index date the library had (a fill names a form newer only if it is the one that moved it);
   *  `seenCurrent` is set where this read becomes the form's baseline. */
  listed: { formKey: string; pageUrl: string | null; dateModified: string | null; before: string | null; seenCurrent: string | null }[];
  /** Forms with a file this read makes newer (they were not before it): said in the fill's words. */
  newer: string[];
};

/** Review / break (e466adb1) M10, M11, Devin: the month a library edition is from: canada.ca's "last updated" month when
 *  known, else the edition's own month printed in its label ("IMM 1295 (09-2023)"). Intake and the finder both write that
 *  label, so a hand upload or an approved held file is dated too. */
export function editionMonth(e: { canadaUpdated?: string | null; editionLabel: string }): string | null {
  if (e.canadaUpdated && /^\d{4}-\d{2}/.test(e.canadaUpdated)) return e.canadaUpdated.slice(0, 7);
  const m = /\((\d{2})-(\d{4})\)\s*$/.exec(e.editionLabel);
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${m[1]}` : null;
}

/** P156-2, one rule for the list, the fill and the check: "Newer edition on canada.ca" when IRCC's index date has moved past
 *  the date last seen as current for the library's file (`seenCurrent`) and, where the file's own month is known, is later
 *  than it. The index date is the form page's, not the PDF's (the automated review on 89cccd71): a page edited without a new
 *  edition moves it, so a successful "Check against canada.ca" sets `seenCurrent` and answers it. With no baseline (the form
 *  got its file after the first read: a held upload approved later) the dates alone decide; an undated file always has one.
 *  Nothing else is stored, so an approval, a rejected upload or a fill running meanwhile cannot leave it wrong. */
export function newerOnIndex(indexDate: string | null | undefined, fileMonth: string | null | undefined, seenCurrent?: string | null): boolean {
  if (!indexDate || !/^\d{4}-\d{2}/.test(indexDate)) return false;
  if (seenCurrent && !isLaterDate(indexDate, seenCurrent)) return false;
  return fileMonth ? indexDate.slice(0, 7) > fileMonth : !!seenCurrent;
}

/** X5 break m2: a date is newer only when it is later (canada.ca writes YYYY-MM or YYYY-MM-DD; compared month first). A
 *  date that went back, or one in another shape, marks nothing. */
export function isLaterDate(next: string, before: string): boolean {
  const ok = /^\d{4}-\d{2}(-\d{2})?$/;
  if (!ok.test(next) || !ok.test(before)) return false;
  return `${next}-00`.slice(0, 10) > `${before}-00`.slice(0, 10);
}

/** Break m15 / m23, review (dc93b60f, e466adb1): the index rows the library fill takes: those with a title it can show
 *  (indexTitleOk). A number left with no good row is counted as unreadable, once; one that also has a good row is not. */
export function libraryRows(rows: IndexRow[], unreadable: string[] = []): { rows: IndexRow[]; unreadable: string[] } {
  const good = rows.filter((r) => indexTitleOk(r.title)), kept = new Set(good.map((r) => r.code));
  return { rows: good, unreadable: [...unreadable, ...new Set(rows.filter((r) => !kept.has(r.code)).map((r) => r.code))] };
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
  const out: IndexFill = { create: [], listed: [], newer: [] };
  for (const r of best.values()) {
    const f = have.get(r.code);
    if (!f) { out.create.push({ formKey: r.code, title: r.title, kind: r.kind === "checklist" ? "checklist" : "data_form", pageUrl: r.pageUrl, dateModified: r.dateModified }); continue; }
    // The baseline: the first read of a form that already had a file takes that file as current (P156-2: "a later read whose
    // date changed"); an undated file, with no month to judge by, takes the read before this one (else this one). A dated
    // form that got its file after the first read has none: its dates decide (a held upload approved later).
    const baseline = f.seenCurrent || !f.hasFile || !r.dateModified ? null : !f.editionMonth ? (f.indexDateModified ?? r.dateModified) : !f.indexDateModified ? r.dateModified : null;
    out.listed.push({ formKey: r.code, pageUrl: f.formPageUrl ? null : r.pageUrl, dateModified: r.dateModified, before: f.indexDateModified, seenCurrent: baseline });
    if (f.hasFile && r.dateModified && !newerOnIndex(f.indexDateModified, f.editionMonth, f.seenCurrent) && newerOnIndex(r.dateModified, f.editionMonth, baseline ?? f.seenCurrent)) out.newer.push(r.code);
  }
  return out;
}
