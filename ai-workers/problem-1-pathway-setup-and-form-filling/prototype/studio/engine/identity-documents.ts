// P-134 ("AI never reads identity documents"), P-153 (1) (code is the guard): which document names are identity
// documents, decided by a code list, never by a model's flag. One list for every step that names document types
// (C2.6 checklist lines, C3.4 masters step; QA-195).

/** A passport or travel document: an identity document read by its coded (machine-readable) lines (C2.6). */
export const CODED_IDENTITY = /\bpassport\b|\btravel document\b/i;
/** Every identity document by its name (QA-195): a passport or travel document, an identity or ID card (national or
 *  not), a birth, citizenship or naturalization certificate, a citizenship or permanent resident card, a driver's
 *  licence. Words are compared with underscores and hyphens read as spaces. */
const IDENTITY_NAME = /\bpassports?\b|\btravel documents?\b|\bidentity (cards?|documents?)\b|\bid cards?\b|\bnational id\b|\b(birth|citizenship|naturali[sz]ation) certificates?\b|\b(citizenship|permanent resident|pr) cards?\b|\bdriver'?s? licen[cs]es?\b/i;
/** A photo the size of a passport photo is not the passport (C2.6 break m2: "visa_application_photos"); the passport's
 *  own photo page is. */
const PHOTO_ONLY = /\bpassport[ -]?(size|style)\b|\bpassport photo(graph)?s?\b(?! (page|data|bio))/gi;

/** Whether a document type's name names an identity document (QA-195: "Passport" in category "travel" is one). */
export const isIdentityName = (name: string): boolean => IDENTITY_NAME.test(name.replace(/[_-]+/g, " ").replace(PHOTO_ONLY, " "));
