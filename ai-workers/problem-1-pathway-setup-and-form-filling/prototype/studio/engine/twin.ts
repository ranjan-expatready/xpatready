// Labels and PDF section groups shared by the forms engine (F1 slice 1, F3a-0 plan D1): labels compared as people read
// them, and the section group and plain label of a PDF form field. W1-02 (P-102): screen-map drafting from online
// versions (no AI and the guarded AI job) and online screen coverage are parked with the browser extension on branch
// lead/parked-extension-2026-10-26.
import PDF_SECTIONS from "../contracts/pdf-sections.json" with { type: "json" };

/** Labels compared as people read them: no "*", question numbers, list letters, qualifiers in brackets or punctuation. */
export function normLabel(s: string | null | undefined) {
  // Unicode forms (full-width letters, composed accents), curly apostrophes and invisible spaces compare as people read
  // them (break m9).
  return (s ?? "").normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").replace(/[\u2018\u2019\u02BC\u2032]/g, "'").toLowerCase().replace(/\(s\)/g, "s").replace(/\([^)]*\)/g, " ").replace(/^\s*\*+\s*/, "").replace(/^\s*question\s+\d+\s*[a-z]?\b\.?/, "")
    .replace(/^\s*[a-z]\)\s*/, "").replace(/[*:?.,;/\\›»>-]+/g, " ").replace(/\brequired\b/g, " ").replace(/\s+/g, " ").trim();
}

// ───────────────────────────────────────────── F3a-0 (plan D1): PDF section groups
/** The PDF section group of a form field: its subform path without the page ("Page2.MaritalStatus.SectionA" →
 *  "MaritalStatus", "page1.SectionB.Child" → "SectionB"); a path with no page is its own first part. */
export function sectionGroupOf(path: string | null | undefined): string | null {
  const parts = (path ?? "").split(".").map((p) => p.replace(/\[\d+\]$/, "").trim()).filter(Boolean);
  if (parts.length > 1 && /^page\d+$/i.test(parts[0])) parts.shift();
  return parts[0] ?? null;
}
/** The plain label of a section group (Sample, contracts/pdf-sections.json; the immigration expert confirms), never the
 *  path itself (BR-16). */
export function sectionLabel(form: string, group: string | null): string {
  const labels = (PDF_SECTIONS as unknown as Record<string, Record<string, string>>)[form] ?? {};
  return (group && labels[group]) || `Other questions of ${form}`;
}
/** An entry's group: from its section, else from its own form path (a repeated row such as "Row2" has no section of
 *  its own in the inventory: "form1[0].Page1[0].PersonalDetails[0].PreviousCOR[0].Row2[0]…" → "PersonalDetails"). */
export const groupOfEntry = (e: { data_path: string; heading: string | null }) =>
  sectionGroupOf(e.heading) ?? sectionGroupOf(e.data_path.split(".").slice(1).join(".")) ?? "";
