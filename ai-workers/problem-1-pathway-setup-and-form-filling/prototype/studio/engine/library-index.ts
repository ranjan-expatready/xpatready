// X5 slice a (P-156 (1); plan-p156 P156-1, P156-2): the form library filled once from IRCC's forms-and-guides index, US$0:
// no AI, no PDF download. Pure: it says what the fill does to the library; the API applies it. Every number on the index
// becomes a library form (a new one is "Listed by IRCC · no file yet"); a form already there is matched by its number,
// never duplicated, and keeps its file. A later read whose date modified differs, for a form that has a file, marks it
// "Newer edition on canada.ca": a person checks it; the file is never replaced here.
import { indexTitleOk, type IndexRow } from "./canada.ts";

export type LibraryForm = { formKey: string; indexDateModified: string | null; hasFile: boolean; formPageUrl: string | null;
  /** The month the library's current (approved, printed) edition is from (editionMonth), if known. */
  editionMonth?: string | null;
  /** The current edition (its id) and the index date last seen as current for that file (see newerOnIndex). */
  currentId?: string | null; seenCurrent?: string | null };
export type IndexFill = {
  /** New library forms, listed with no file yet. */
  create: { formKey: string; title: string; kind: "data_form" | "checklist"; pageUrl: string; dateModified: string | null }[];
  /** Forms already in the library: now marked as listed by IRCC; their page filled in only where the library had none.
   *  `before` is the index date the library had (a fill names a form newer only if it is the one that moved it);
   *  `seenCurrent` is set where this read becomes the baseline of the current file (`editionId`; an undated file only). */
  listed: { formKey: string; pageUrl: string | null; dateModified: string | null; before: string | null; editionId: string | null; seenCurrent: string | null }[];
  /** Forms with a file this read makes newer (they were not before it): said in the fill's words. */
  newer: string[];
};

/** Review / break (e466adb1) M10, M11, Devin: the month a library edition is from: the later of canada.ca's "last updated"
 *  month and the edition's own month printed in its label ("IMM 1295 (09-2023)"). Intake and the finder both write that
 *  label, so a hand upload or an approved held file is dated too. */
export function editionMonth(e: { canadaUpdated?: string | null; editionLabel: string }): string | null {
  // Break (89cccd71) m31: a month IRCC could print (1990 to next year, 01-12); break note: the later of the two months, so
  // canada.ca's page month never makes a file read older than its own printed edition.
  const ok = (y: number, mo: number) => mo >= 1 && mo <= 12 && y >= 1990 && y <= new Date().getUTCFullYear() + 1;
  const ca = /^(\d{4})-(\d{2})/.exec(e.canadaUpdated ?? ""), lb = /\((\d{2})-(\d{4})\)\s*$/.exec(e.editionLabel);
  const months = [ca && ok(Number(ca[1]), Number(ca[2])) ? `${ca[1]}-${ca[2]}` : null, lb && ok(Number(lb[2]), Number(lb[1])) ? `${lb[2]}-${lb[1]}` : null].filter((x): x is string => !!x);
  return months.length ? months.sort().pop()! : null;
}

/** P156-2, one rule for the list, the fill and the check: "Newer edition on canada.ca" when IRCC's index date is later than
 *  the month of the library's current file and has moved past the date last seen as current for that file (`seenCurrent`,
 *  kept on the edition, so a replacement file starts without one). The index date is the form page's, not the PDF's (the
 *  automated review on 89cccd71): a page edited without a new edition reads newer until a "Check against canada.ca" finds
 *  the PDF current and sets `seenCurrent`. A dated file is never taken as current on trust (the review on c5b8be03): its dates
 *  decide until a check. An undated file is judged by change only: its baseline is the read before. Nothing is written at an
 *  approval or a rejection, so they and a fill running meanwhile cannot leave it wrong. */
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
    // An undated file, with no month to judge by, takes the read before this one (else this one) as its baseline: it is judged
    // by change (P156-2). A dated file gets none from a fill: its dates decide until a check.
    const baseline = f.seenCurrent || !f.hasFile || f.editionMonth || !r.dateModified ? null : (f.indexDateModified ?? r.dateModified);
    out.listed.push({ formKey: r.code, pageUrl: f.formPageUrl ? null : r.pageUrl, dateModified: r.dateModified, before: f.indexDateModified, editionId: f.currentId ?? null, seenCurrent: baseline });
    if (f.hasFile && r.dateModified && !newerOnIndex(f.indexDateModified, f.editionMonth, f.seenCurrent) && newerOnIndex(r.dateModified, f.editionMonth, baseline ?? f.seenCurrent)) out.newer.push(r.code);
  }
  return out;
}
