// P-134 ("AI never reads identity documents"), P-153 (1) (code is the guard): which document names are identity
// documents, decided by a code list, never by a model's flag. One list for every path that names a document type (C2.6
// checklist lines, the C3.4 masters step, the author's own add) and for the one door that lands it (QA-195).

/** The readers that never send a document to AI (coded lines, the printed layout, a person). */
export const NOT_AI_READERS: readonly string[] = ["coded_lines", "printed_layout", "person_only"];

/** Common Cyrillic and Greek letters that look like Latin ones (break B4 on QA-195: "Pаssport" with a Cyrillic а). */
const LOOK_ALIKE: Record<string, string> = { "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s", "к": "k", "м": "m", "т": "t", "в": "b", "н": "h", "ο": "o", "α": "a", "ρ": "p", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "τ": "t" };
/** A name as the list reads it (break B4): compatibility forms folded (full-width letters), accents and invisible
 *  characters dropped, look-alike letters read as Latin, curly apostrophes straight, underscores, hyphens and any run of
 *  spaces as one space, lower case. */
export function identityWords(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ­​-‏⁠﻿]/g, "").toLowerCase()
    .replace(/[Ͱ-ӿ]/g, (c) => LOOK_ALIKE[c] ?? c).replace(/[‘’ʼ`]/g, "'").replace(/[_\-‐-―]+/g, " ").replace(/\s+/g, " ").trim();
}

/** A passport or travel document: an identity document read by its coded (machine-readable) lines (C2.6). */
export const CODED_IDENTITY = /\bpassport\b|\btravel document\b/i;
/** Every identity document by its name (QA-195; break B3, B5): a passport (misspelt, e-, or in French, Spanish,
 *  Italian, German), a travel document or ID, an identity or identification card or document in any language
 *  ("identit…"), an ID or photo ID, a birth, citizenship or naturalization certificate, proof of citizenship, a
 *  certificate of identity, a citizenship or permanent resident card, a Confirmation of Permanent Residence, a driver's
 *  or driving licence, and national IDs by their own names (cédula, Personalausweis, Aadhaar, hukou, DNI). */
const IDENTITY_NAME = new RegExp([
  String.raw`pas+ ?[ea]?ports?\b`, String.raw`\bpasaportes?\b`, String.raw`\bpassaport[oie]\b`, String.raw`\breisepass`,
  String.raw`\btravel (documents?|docs?|id)\b`, String.raw`\bidentit\w*`, String.raw`\bidentification\b`, String.raw`\bids?\b`,
  String.raw`\b(birth|citizenship|naturali[sz]ation) certificates?\b`, String.raw`\bproof of citizenship\b`, String.raw`\b(citizenship|permanent resident|pr) cards?\b`,
  String.raw`\bconfirmation of permanent residen`, String.raw`\bcopr\b`, String.raw`\bdriv(er'?s?|ing) licen[cs]es?\b`,
  String.raw`\bcedula\b`, String.raw`ausweis\b`, String.raw`\baadhaa?r\b`, String.raw`\bhukou\b`, String.raw`\bdni\b`,
].join("|"));
/** A photo the size of a passport photo is not the passport (C2.6 break m2: "visa_application_photos"); a name that
 *  also names the passport's own page is (break B3: "Passport photo and information page"). */
const PHOTO_ONLY = /\bpassport (size|sized|style)\b|\bpassport photo(graph)?s?\b/g;
const OWN_PAGE = /\b(page|data|bio|biographic|biographical|information)\b/;

/** Whether a document type's name names an identity document (QA-195: "Passport" in category "travel" is one). */
export function isIdentityName(name: string): boolean {
  const w = identityWords(name);
  return IDENTITY_NAME.test(OWN_PAGE.test(w) ? w : w.replace(PHOTO_ONLY, " "));
}
/** Whether a name is only a photo of passport size (C2.6: a person looks at it; never its coded lines). */
export function isPassportPhoto(name: string): boolean {
  const w = identityWords(name);
  return !OWN_PAGE.test(w) && w.replace(PHOTO_ONLY, " ") !== w;
}

/** P-134 on every path and at the one door (break B1): a document type is an identity document when it is flagged, its
 *  category is identity, or its name is on the list; then only a reader that is not AI may read it. */
export const identityOf = (d: { name: string; category?: string | null; identityDocument?: boolean | null }): boolean =>
  !!d.identityDocument || /identity/i.test(d.category ?? "") || isIdentityName(d.name);
export const aiReadsIdentity = (d: { name: string; category?: string | null; identityDocument?: boolean | null; readerKind: string }): boolean =>
  identityOf(d) && !NOT_AI_READERS.includes(d.readerKind);
