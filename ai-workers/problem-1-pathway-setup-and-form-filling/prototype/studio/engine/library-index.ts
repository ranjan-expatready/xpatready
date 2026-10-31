// X5 slice a (P-156 (1); plan-p156 P156-1, P156-2): the form library filled once from IRCC's forms-and-guides index, US$0:
// no AI, no PDF download. Pure: it says what the fill does to the library; the API applies it. Every number on the index
// becomes a library form (a new one is "Listed by IRCC · no file yet"); a form already there is matched by its number,
// never duplicated, and keeps its file. A later read whose date modified differs, for a form that has a file, marks it
// "Newer edition on canada.ca": a person checks it; the file is never replaced here.
import type { IndexRow } from "./canada.ts";

export type LibraryForm = { formKey: string; indexDateModified: string | null; hasFile: boolean; formPageUrl: string | null };
export type IndexFill = {
  /** New library forms, listed with no file yet. */
  create: { formKey: string; title: string; kind: "data_form" | "checklist"; pageUrl: string; dateModified: string | null }[];
  /** Forms already in the library: now marked as listed by IRCC; their page filled in only where the library had none. */
  listed: { formKey: string; pageUrl: string | null; dateModified: string | null }[];
  /** Forms with a file whose index date changed since the last read: "Newer edition on canada.ca". */
  newer: string[];
};

export function planIndexFill(rows: IndexRow[], library: LibraryForm[]): IndexFill {
  const have = new Map(library.map((f) => [f.formKey, f]));
  const out: IndexFill = { create: [], listed: [], newer: [] }, seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.code)) continue; // the index lists a few numbers twice (a form and its checklist link): once is enough
    seen.add(r.code);
    const f = have.get(r.code);
    if (!f) { out.create.push({ formKey: r.code, title: r.title, kind: r.kind === "checklist" ? "checklist" : "data_form", pageUrl: r.pageUrl, dateModified: r.dateModified }); continue; }
    out.listed.push({ formKey: r.code, pageUrl: f.formPageUrl ? null : r.pageUrl, dateModified: r.dateModified });
    if (f.hasFile && f.indexDateModified && r.dateModified && r.dateModified !== f.indexDateModified) out.newer.push(r.code);
  }
  return out;
}
