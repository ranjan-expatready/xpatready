// QA-144, P-319 (moved out of demo.ts for B71, so a pack's setup can read it without the loader's Nest services): the
// one per-combination table of what IRCC's own words set on a combination's form lines, read by the configured
// checkpoint's loader (api/src/features/checkpoint/) and by the six's people's steps in the packs (acceptance/lib/pack2.ts).
// No decorators and no Nest imports, on purpose. BK-10 (P-448, P-452): every combination's words are data,
// samples/form-setup.json (cited, Sample, "Unconfirmed: expert", AGENTS rule 4); this file names no combination and no
// form, so a combination's form rules change by data alone (tests/check_bk10_form_rules_data.ts, B164's guard).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OWN_YES_NO, type OwnYesNo } from "./own-yes-no.ts";
/** `channel`: how IRCC takes the form on this combination when its words say so (B79b: a form "now digital", filled in
 *  IRCC's portal), set on the Forms tab's channel route; otherwise the line keeps the library's channel. */
export type FormRule = { form: string; condition?: object; minAge?: number; who?: string; channel?: "ONLINE"; retire?: true; cite: string };
/** QA-144 slice 1 (P-319): the family information form the application form's channel picks, and the other one, taken off
 *  the combination's draft with the reason; `cite` says who fills it. */
export type FamilyForm = { form: string; other: string; cite: string };
/** A fact only a rule reads, added through C3.6's door for its rule and asked beside `beside` (fact keys) when given. */
export type RuleFact = { fact: string; rule: string; cite: string; label: string; valueType: string; meaning: string; beside?: string[] };
/** G5 (C5.1, P-248; tech lead's ruling on #868): a document line the checkpoint sets from an official checklist's own
 *  words, cited (P-170): the document type (an existing library name is reused), whose it is, and the page and quote.
 *  `reuse`: the type must already be in the library, and the line uses it rather than proposing a new one. */
export type CitedDocumentLine = { type: string; who: "principal_applicant" | "each_applicant"; quote: string; reuse?: true };
/** C6.17 (P-444, QA-375): a combination whose document lines come from a reviewed release written for another
 *  checklist: a line its own checklist lists goes in with that checklist's words (`cited`), any other keeps its quote,
 *  labelled Sample with where it comes from (`sample`), so no line claims a source it does not have (AGENTS rule 4). */
export type SourcedDocuments = { checklist: string; cited: Record<string, string>; sample: (quote: string, from: string | null) => string };
/** QA-144 slice 4 (B81): an answer a form prints no choice for, marked Not on this form on each of its form fields that
 *  read the fact; cited with the form's printed choices. */
export type NotOnFormMark = { form: string; fact: string; values: string[]; cite: string };
/** One combination's setup. `family`: why each person 18 or older fills the family information form that the application
 *  form's channel picks (FAMILY_FORM_BY_CHANNEL); absent, no family form is picked by channel (a permanent residence
 *  application names its own family form among its rules, QA-144 slice 4). */
export type FormSetup = { application: string; rules: FormRule[]; notOnForm?: NotOnFormMark[]; family?: string; ruleFacts?: RuleFact[]; ownYesNo?: OwnYesNo[]; documentsFromReviewedRelease?: boolean; documentSources?: SourcedDocuments; documentsFromChecklist?: string; documentsCited?: CitedDocumentLine[] };
type CombinationData = { application: string; rules: FormRule[]; ruleFacts?: (string | RuleFact)[]; familyByChannel?: string; notOnForm?: NotOnFormMark[]; documentsCited?: CitedDocumentLine[];
  documentsFromChecklist?: string; documentsFromReviewedRelease?: boolean; documentSources?: { checklist: string; cited: Record<string, string>; sampleSources: Record<string, string> } };
export type SetupData = { familyFormByChannel: { paper: FamilyForm; online: FamilyForm }; ruleFacts: (RuleFact & { about?: string })[]; combinations: Record<string, CombinationData> };
export const FORM_SETUP_FILE = join(import.meta.dirname, "..", "..", "samples", "form-setup.json");
/** B79b: a rule fact is checked as C3.6's door would take it, so a bad entry fails the read: a person. or case. key, the
 *  form of one of this combination's rules (review m1), a label, a meaning, a cite, yes_no, and `beside` (where it is
 *  asked) a list of fact keys when given. Exported for its pure check (check_qa144_fs_release.ts). */
export const ruleFactOf = (key: string, f: RuleFact, rules: FormRule[]): RuleFact => {
  const bad = !/^(person|case)\.[a-z0-9_]+$/.test(f.fact ?? "") || !f.rule || !rules.some((r) => r.form === f.rule && !r.retire) || !f.label || !f.meaning || !f.cite || f.valueType !== "yes_no"
    || (f.beside !== undefined && (!Array.isArray(f.beside) || !f.beside.length || !f.beside.every((b) => typeof b === "string" && /^(person|case)\.[a-z0-9_]+$/.test(b))));
  if (bad) throw new Error(`samples/form-setup.json, ${key}: the rule fact ${f.fact ?? "(no key)"} needs a person. or case. key, the form of one of this combination's rules, a label, a meaning, a cite, valueType yes_no, and "beside" as a list of fact keys when given`);
  return f;
};
/** BK-10: a combination's own words, checked so a bad entry fails the read (never a line without its rule's words): an
 *  application form, rules each with a form and a cite, and at most one place its document lines come from. */
const combinationOf = (key: string, c: CombinationData, facts: RuleFact[]): FormSetup => {
  const where = [c.documentsFromChecklist, c.documentsFromReviewedRelease, c.documentsCited].filter((x) => x !== undefined).length;
  if (!c.application || !Array.isArray(c.rules) || !c.rules.every((r) => r.form && r.cite) || where > 1 || (c.documentSources && !c.documentsFromReviewedRelease))
    throw new Error(`samples/form-setup.json, ${key}: a combination needs its application form, rules each with a form and a cite, at most one of documentsFromChecklist, documentsFromReviewedRelease and documentsCited, and documentSources only with documentsFromReviewedRelease`);
  const ds = c.documentSources;
  return { application: c.application, rules: c.rules, ...(c.notOnForm ? { notOnForm: c.notOnForm } : {}),
    ...(c.familyByChannel ? { family: c.familyByChannel } : {}),
    ...(c.documentsCited ? { documentsCited: c.documentsCited } : {}),
    ...(c.documentsFromChecklist ? { documentsFromChecklist: c.documentsFromChecklist } : {}),
    ...(c.documentsFromReviewedRelease ? { documentsFromReviewedRelease: true } : {}),
    ...(ds ? { documentSources: { checklist: ds.checklist, cited: ds.cited, sample: (quote: string, from: string | null) => {
      const stem = (from ?? "").replace(/^.*\/|\.text\.inventory\.json$/g, "");
      return `Sample: not on ${ds.checklist}, the checklist for this combination; the reviewed release took it from ${ds.sampleSources[stem] ?? (stem || "a source it does not name")}, so the immigration expert confirms it (Unconfirmed: expert). Its words there: "${quote}"`;
    } } } : {}),
    ruleFacts: (c.ruleFacts ?? []).map((k) => ruleFactOf(key, typeof k === "object" ? k : facts.find((f) => f.fact === k) ?? (() => { throw new Error(`samples/form-setup.json, ${key}: no rule fact ${k} in its ruleFacts`); })(), c.rules)) };
};
/** BK-10: the whole table from one data file (exported, pure, so a test reads a changed copy: a combination's form rules
 *  change by data alone). The family form needs both channels, each a form, the other one and a cite. */
export const formSetupFrom = (file = FORM_SETUP_FILE): { setup: Record<string, FormSetup>; family: SetupData["familyFormByChannel"] } => {
  const d = JSON.parse(readFileSync(file, "utf8")) as SetupData;
  const fam = d.familyFormByChannel;
  if (!(["paper", "online"] as const).every((ch) => fam?.[ch]?.form && fam[ch].other && fam[ch].cite)) throw new Error("samples/form-setup.json: familyFormByChannel needs paper and online, each with its form, the other form and a cite");
  const facts = (d.ruleFacts ?? []).map(({ about: _about, ...f }) => f);
  const setup = Object.fromEntries(Object.entries(d.combinations).map(([key, c]) => [key, combinationOf(key, c, facts)]));
  // B88 (P-319): the Yes/No form fields asked as their own questions come from their table (samples/own-yes-no.json), by
  // combination, never named here.
  for (const [key, own] of Object.entries(OWN_YES_NO)) if (setup[key] && own.application === setup[key].application) setup[key].ownYesNo = own.boxes;
  return { setup, family: { paper: { form: fam.paper.form, other: fam.paper.other, cite: fam.paper.cite }, online: { form: fam.online.form, other: fam.online.other, cite: fam.online.cite } } };
};
const DATA = formSetupFrom();
/** QA-144 (P-319): the one per-combination table of what the checkpoint sets from IRCC's words: the application form
 *  whose channel picks the family information form (FAMILY_FORM_BY_CHANNEL), the form rules, why each person 18 or older
 *  fills the family information form there, and a fact only a rule reads (C3.6). The configured checkpoint sets up from
 *  its forms exactly the combinations this table holds (features/checkpoint/060-sections-from-forms.ts). */
export const FORM_SETUP: Record<string, FormSetup> = DATA.setup;
/** QA-144 slice 1 (tech lead, 4 Nov; the RCIC walk #782): filed on paper or as a PDF upload, or filed online. */
export const FAMILY_FORM_BY_CHANNEL = DATA.family;
