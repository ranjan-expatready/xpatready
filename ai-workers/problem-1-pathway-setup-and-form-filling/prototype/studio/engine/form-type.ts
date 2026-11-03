// What a library entry is (C11.11): a form that is filed, or a guide or checklist that AI reads and nobody files. One
// rule for the library, the finder, every path that makes a form line and the release import (#274 review M2, C11.11 F4).

/** Library type. Rows made before S4 say only "document": a filed form when its title says so (IMM 5802, an employer's
 *  offer of employment form; review major 9), otherwise a checklist or instructions, read by AI and never filed (IMM 5881,
 *  IMM 5905; round 2 major 4). */
export const libraryType = (kind: string, title = ""): "form" | "guide" | "checklist" => (kind === "guide" ? "guide" : kind === "checklist" || (kind === "document" && !(/\bform\b/i.test(title) && !/checklist/i.test(title))) ? "checklist" : "form");

/** Why a guide or checklist is never one of a combination's forms, in words (null for a filed form). The product rule
 *  (P-118, QA-101): a combination's form lines are what is filed; guides and checklists are its sources, read by AI.
 *  canada.ca on IMM 5484 and IMM 5488 (form pages, recorded 19 Oct 2026, official-sources/ircc/web-pages): "If you're
 *  applying online: … You do not need to submit this PDF checklist." */
export const notFiledWords = (code: string, kind: string, title = "") => {
  const t = libraryType(kind, title);
  return t === "form" ? null : `${code} is a ${t}: it is read by AI and never filed, so it is not one of a combination's forms. It stays in the library, and a combination uses it as a source.`;
};
