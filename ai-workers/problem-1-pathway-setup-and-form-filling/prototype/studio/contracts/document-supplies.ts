// C4.5 (P-130; Lead 9's ruling, option 1, 5 Nov): "Facts this document supplies", a person's step at US$0. Shared by the
// API and the web app. An author proposes the whole set of facts a library document type supplies, each with the
// official words that say the document shows it (P-170: form, page, quote); a second person approves it through the one
// door (To review), and it goes out with the next release. Sample until the immigration expert confirms.
import { z } from "zod";
import { DOCUMENT_ABOUTS } from "./resolver.ts";

export const SUPPLIES_KIND = "document_supplies", SUPPLIES_ACTION = "SET_SUPPLIES";
/** Whom a supplied fact is about, in words: the holder of the document (the person whose checklist line names it), or
 *  someone the document also shows. */
export const ABOUT_WORDS: Record<(typeof DOCUMENT_ABOUTS)[number], string> = { holder: "the holder", "holder.spouse": "the holder's spouse or partner", "holder.parent": "the holder's parent" };

const Supply = z.object({
  fact: z.string({ error: "Choose a shared field." }).trim().min(1, "Choose a shared field.").max(120),
  about: z.enum(DOCUMENT_ABOUTS, { message: "Say whom it is about: the holder, the holder's spouse or partner, or parent." }).default("holder"),
  source: z.string({ error: "Name the official words' source (form, edition and page)." }).trim().min(3, "Name the official words' source (form, edition and page).").max(120, "Keep the source under 120 characters."),
  quote: z.string({ error: "Quote the official words that say the document shows it." }).trim().min(3, "Quote the official words that say the document shows it.").max(400, "Keep the quote under 400 characters."),
  // P-170: page, quote and the date the words were read (never later than today).
  readOn: z.string({ error: "Say when the official words were read (YYYY-MM-DD)." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Say when the official words were read (YYYY-MM-DD).")
    // A day's room: the date is the reader's own (IST is ahead of the server's UTC clock, P-302).
    .refine((d) => !Number.isNaN(Date.parse(d)) && Date.parse(d) <= Date.now() + 86_400_000, "The date the words were read cannot be in the future."),
}).strict();

/** POST /library/document-types/:key/supplies: the whole new set (an empty set: the document supplies no fact). */
export const SuppliesBody = z.object({
  facts: z.array(Supply, { error: "List the facts this document supplies (or none)." }).max(100, "At most 100 facts per document."),
  reason: z.string({ error: "Say why it changes for every combination." }).trim().min(5, "Write at least 5 characters: why it changes for every combination.").max(300, "Keep the reason under 300 characters."),
}).strict();
export type SuppliesInput = z.infer<typeof SuppliesBody>;
export type SupplyCite = { fact: string; label: string; about: (typeof DOCUMENT_ABOUTS)[number]; source: string; quote: string; readOn: string };

/** What the second person compares on To review and what the API answers. */
export type SuppliesView = { document: string; before: string[]; after: string[]; added: string[]; removed: string[]; cites: SupplyCite[]; uses: number; reason: string };
/** Said with an answer when a supplied fact has no question placed: it cannot be asked when the document is missing. */
export type SuppliesWarning = { fact: string; label: string; why: string };
