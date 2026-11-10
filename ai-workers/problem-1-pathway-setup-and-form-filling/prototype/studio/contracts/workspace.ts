// S5 Combination workspace (runtime lane, W1-08, P-123): its tabs, the person roles, "Who can be in this application",
// the form line an author edits, the Sample families Preview offers, and what GET /combinations/:id/workspace?tab=
// answers. Pure; shared by the API, the web app and the tests (STANDARDS §6: contract first, zod).
import { z } from "zod";
import type { FormStepChip } from "./form-progress.ts";
import type { QuestionnaireView } from "./runtime.ts";

/** BR-1: the tabs in setup order (walkthrough v2 S5, P-118 Q5). */
export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "forms", label: "Forms" },
  { key: "questionnaires", label: "Smart questionnaire (SQR)" },
  { key: "documents", label: "Documents" },
  { key: "preview", label: "Preview" },
  { key: "tests", label: "Tests" }, // G4 (forms lane, C5.7): answer-key tests
  { key: "review", label: "Review and release" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
/** The old Configuration tab's parts, and the tab that now holds each. */
const AREA_TAB: Record<string, TabKey> = { forms: "forms", documents: "documents", rules: "questionnaires", checks: "questionnaires", questions: "questionnaires" };
/** BR-1 fail: an unknown tab is Overview. Old addresses open the tab that now holds their part (m5). */
export const tabOf = (t: string | undefined, area?: string | null): TabKey =>
  t === "configuration" ? (AREA_TAB[area ?? ""] ?? "forms") : t === "sources" ? "forms" : TABS.some((x) => x.key === t) ? (t as TabKey) : "overview";

/** IRCC's words as a person reads them (drift check 6). The checklist reader joined a line and the note under it with
 *  no break ("…, if applicableNote: Complete this form…"), so the note's label reads as a code glued to a word: it is
 *  shown as two sentences. The stored quote stays as read (the release fingerprint covers it).
 *  QA-107: the page reader also kept a link's screen-reader text ("Declaration (IMM 5646) (opens in a new tab) . Pages 1"):
 *  that text is not IRCC's sentence, so it is dropped with the space it left before a full stop, comma or semicolon
 *  (only there: review m3, "Version 1 .5" elsewhere is kept as read). */
export const irccWords = (q: string | null | undefined): string | null => (q && !ourWords(q)
  ? q.replace(/\s*\(opens in a new (?:tab|window)\)(?:\s+(?=[.,;]))?/gi, "").replace(/([a-z)])(Note|Notes|Important):\s*/g, "$1. $2: ")
  : null);
/** QA-105: the dialog's description says what the chosen way does (Rules only uses no AI and attaches nothing). */
export const FIND_DESCRIPTION: Record<"replay" | "rules" | "live", string> = {
  replay: "The answers AI gave before for these exact canada.ca pages are replayed at US$0; the forms both rounds agreed on are attached.",
  rules: "Reads the application's canada.ca pages and lists every form number printed on them for you to add by hand. No AI, nothing is attached, US$0.",
  live: "AI reads the application's canada.ca pages and its guide, names each form with IRCC's words, and attaches the ones both rounds agree on.",
};
/** QA-107: "today at 11:15 p.m." already ends a sentence; never a second full stop. */
export const endSentence = (t: string) => (/[.!?]$/.test(t) ? t : `${t}.`);

/** QA-78: the channel choice says what Online means today in a person's words (P-113: the case officer types it into the
 *  portal from the answer sheet), never the plan word "later wave". */
export const ONLINE_OPTION = " (typed in by hand for now)";
/** Lead check L11: the words the product itself writes on a line added by a person ("IMM 5257: added from the library"),
 *  which are never shown as IRCC's; said instead as how the line was added. */
const OURS = /: (added from the library|reused from the library|uploaded for this combination)$/;
export const ourWords = (q: string | null | undefined): string | null => {
  const m = q ? OURS.exec(q) : null;
  return m ? (m[1] === "uploaded for this combination" ? "Uploaded for this combination by a person" : "Added from the library by a person") : null;
};

// ------------------------------------------------------------------ person roles (M3) and who can be (P-119, M4)

/** One person role of the shared library (GET /library/roles). */
export type PersonRoleView = { key: string; label: string; meaning: string; takesPartInCase: boolean; mayBeApplicant: boolean; basis: string; builtIn: boolean; retired: boolean };

/** C11.12 (P-135, P-233): a line's filing mode. Files own application · On the principal's application · Declared only
 *  (not accompanying), for roles that may be applicants; co_files only for a never-applicant role (the sponsor). */
export const LINE_MODES = ["files_own", "on_principal", "declared_only", "co_files"] as const;
export type LineMode = (typeof LINE_MODES)[number];
export const FILING_CHOICE = "Filing: choose Files own application, On the principal's application or Declared only.";
/** The acceptance pack's names (C11.12.test.ts) → the line modes. */
export const FILING_ALIAS = { own_application: "files_own", on_principal_applying: "on_principal", declared_only: "declared_only" } as const satisfies Record<string, LineMode>;
export const ALIAS_OF: Partial<Record<LineMode, keyof typeof FILING_ALIAS>> = { files_own: "own_application", on_principal: "on_principal_applying", declared_only: "declared_only" };

/** One line of "Who can be in this application". `quote` and `origin` say where it came from (AI from the guide in
 *  slice 3, or a person); `basis` is Sample until the immigration expert confirms the numbers. */
export const PeopleLine = z.object({
  role: z.string({ error: "Choose a person." }).trim().regex(/^[a-z][a-z0-9_]{1,40}$/, "Choose a person from the list."),
  label: z.string().trim().max(60).optional(),
  min: z.number({ error: "How many: the fewest is a whole number from 0 to 9." }).int("How many: the fewest is a whole number from 0 to 9.").min(0, "How many: the fewest is a whole number from 0 to 9.").max(9, "How many: the fewest is a whole number from 0 to 9."),
  max: z.number({ error: "How many: the most is a whole number from 0 to 9." }).int("How many: the most is a whole number from 0 to 9.").min(0, "How many: the most is a whole number from 0 to 9.").max(9, "How many: the most is a whole number from 0 to 9."),
  applies: z.boolean({ error: "Say whether this person files their own application." }),
  preview: z.number().int().min(0).max(9).optional(),
  // C11.12 (P-135, P-233): how this person's application is filed. Released with the people, read by the case's filings
  // (C6.12); left out on a line saved before C11.12, the case uses the combination's built-in default (Sample).
  filingMode: z.enum(LINE_MODES, { error: FILING_CHOICE }).nullable().optional(),
  /** The acceptance pack's own names for the same choice (C11.12.test.ts); read as filingMode when that is not sent. */
  filing: z.enum(["own_application", "on_principal_applying", "declared_only"], { error: FILING_CHOICE }).nullable().optional(),
  quote: z.string().trim().max(400).nullable().optional(),
  origin: z.enum(["HUMAN", "AI_PROPOSAL", "CODE_MATCH", "SAMPLE"]).optional(), // CODE_MATCH: found by rules from the guide, no AI (Lead check L3)
});
export type PeopleLine = z.infer<typeof PeopleLine>;
/** PATCH /combinations/:id/people. `version` is the one read (a stale save is a 409); `confirmRemove` answers the
 *  question "these form lines name a person you removed". */
export const PeopleBody = z.object({
  participants: z.array(PeopleLine, { error: "Send the list of people." }).min(1, "Add at least the principal applicant.").max(12, "At most 12 kinds of person."),
  version: z.number({ error: "Reload the page: the version you read is missing." }).int(),
  confirmRemove: z.boolean().optional(),
});
export const UndoBody = z.object({ version: z.number({ error: "Reload the page: the version you read is missing." }).int() });

/** What the Questionnaires tab shows for "Who can be in this application". */
export type PeopleView = {
  version: number; savedBy: string | null; savedAt: string | null; canUndo: boolean;
  lines: (PeopleLine & { label: string; roleLabel: string; meaning: string; mayBeApplicant: boolean; answeredBy: string } & FilingWords)[];
  roles: PersonRoleView[];
  /** C11.12 BR-7: saved, but worth a look (a mode IRCC's guide contradicts). */
  warnings: string[];
  /** C11.12 "What a case gets": the filings a case of the preview family gets, and how they are sent. */
  filings: PreviewFiling[];
  submissions: { filings: string[]; splittable: boolean; words: string }[];
  /** In words: "3 filings in one submission". */
  gets: string;
  /** C11.12 PR 3: what the editor needs to work out the preview and the warnings as the author edits (the same pure
   *  functions as the server, engine/filing-modes.ts): the combination, whether its fees are worked out, and the
   *  built-in filing mode a case falls back to per role (Sample). `eachFilesOwn` (M3-S1, P-425): IRCC's words where
   *  each family member files their own application, from the fee table (BR-7's warning), or null. */
  combinationKey: string; combinationLabel: string; feesKnown: boolean; defaults: Record<string, LineMode>; eachFilesOwn: string | null;
};
/** C11.12 (concept §6): the read-only words of a line's filing mode. */
export type FilingWords = { filingWords: string; ifNotTravelling: string | null; fees: string | null; tip: string | null };
/** One filing of the preview: whose it is (`principal` is that person's role) and the roles on it. */
export type PreviewFiling = { id: string; principal: string; roles: string[]; kind: "own" | "family" | "co_filed"; people: number; declaredOnly: number; fee: string; words: string };

/** P-78 (MINOR, Sample age): who types a person's answers. Read-only here; not a per-combination setting (m6). */
export const answeredBy = (role: string) => (role === "child" ? "Principal, under 18" : role === "representative" ? "The firm" : "Themselves");

// ------------------------------------------------------------------ form lines (Forms tab)

/** Who signs a form line. Values are Sample until the immigration expert confirms them; how it is signed stays worked
 *  out from the channel (P-61). */
export const SIGNED_BY = [
  { key: "person", label: "The person the form is about" },
  { key: "parent_for_minor", label: "A parent, for a minor" },
  { key: "principal_for_family", label: "The principal applicant, for the family" },
  { key: "person_and_representative", label: "The person and the representative" },
  { key: "none", label: "No signature" },
] as const;
export const signedByLabel = (k: string | null | undefined) => SIGNED_BY.find((x) => x.key === k)?.label ?? "Not set";

export const COPIES_WORDS = "Copies is a whole number from 1 to 9.";
/** C1.8: the copies a line asks for, in words ("" for the default single copy, so most rows stay quiet). */
export const copiesWords = (n: number | null | undefined) => (n && n > 1 ? `${n} copies each` : "");

/** PATCH /combinations/:id/forms/:form: the line fields S5 adds (who, only if, filed as stay on their existing routes). */
export const FormLineEdit = z.object({
  minAge: z.number({ error: "Minimum age is a whole number from 1 to 99, or empty." }).int("Minimum age is a whole number from 1 to 99, or empty.").min(1, "Minimum age is a whole number from 1 to 99, or empty.").max(99, "Minimum age is a whole number from 1 to 99, or empty.").nullable().optional(),
  signedBy: z.enum(SIGNED_BY.map((x) => x.key) as [string, ...string[]], { error: "Choose who signs it from the list." }).nullable().optional(),
  /** C1.8: copies of this form for each person it names (1 to 9; 1 is the default, so it is never empty). */
  copies: z.number({ error: COPIES_WORDS }).refine((n) => Number.isInteger(n) && n >= 1 && n <= 9, COPIES_WORDS).optional(), // one rule, one message (break m4)
});

/** C1.8 (review m2): a checklist (document) line is never filed, so it keeps one copy; the screen does not offer it. */
export const DocumentLineEdit = z.object({ copies: z.literal(1, { error: "A checklist is not filed, so it has no copies." }).optional() });

/** How a line's "Only if" stands (M1): none (always), a rule, or words with no rule yet (Preview: cannot tell). */
export type OnlyIf = { kind: "always" } | { kind: "rule"; words: string } | { kind: "words_only"; words: string };

/** One form line as the Forms tab shows it. `revision` is the line's optimistic-concurrency token. */
export type WorkspaceFormLine = {
  line: string; code: string; title: string; document: boolean; edition: string | null; boxes: number;
  /** QA-103: the form's current edition in the Form library (PDF), whatever the line's field map says; null when the
   *  library holds no file for it. */
  libraryEdition?: string | null;
  /** B81: the PDF editions whose field maps the release check reads for this form (the one in use first), for its choices step. */
  choiceEditions?: { id: string; label: string }[];
  who: string; minAge: number | null; copies: number; onlyIf: OnlyIf; condition: unknown;
  channel: string; channelWords: string; signature: string | null; accepted: string[]; acceptedBasis: string;
  /** P-143 (W1-10 slice 1): the line's signature value, the signatures that fit its channel (C-2), and every channel
   *  offered or refused with the reason (C-3, C-4). */
  signatureKind: string; signatures: { kind: string; words: string }[]; channelOptions: { channel: string; words: string; ok: boolean; why: string | null }[];
  signedBy: string | null; signedByLabel: string; origin: string; quote: string | null; revision: string; status: string;
  /** How a person added the line when there is no IRCC quote ("Added from the library by a person"; Lead check L11). */
  added?: string | null;
  /** The line's version number: Remove and Replace edition send it (the forms lane refuses a stale one with 409). */
  version: number;
};

// ------------------------------------------------------------------ Questionnaires per person (slice 2)

/** Who fills a question is its placement's source, read-only here (C4.9 changes it in the shared library): the client
 *  for a questionnaire or profile placement, the case officer for a document, record or working view. */
export const FILLED_BY = { CLIENT: "Client", CASE_OFFICER: "Case officer" } as const;
export type FilledBy = keyof typeof FILLED_BY;
export const filledByOf = (placement: { collected_from?: string } | undefined): FilledBy =>
  placement && ["client_questionnaire", "profile_record"].includes(placement.collected_from ?? "") ? "CLIENT" : "CASE_OFFICER";

/** One question as the tab shows it: the wording first; the field code (`fact`) only for the side panel (fix 3). */
export type QuestionnaireQuestion = {
  /** QA-82: false when no question has been written; then `wording` is the field's short name, never its meaning. */
  fact: string; wording: string; asked: boolean; meaning: string; help: string | null; answerType: string; filledBy: FilledBy; onlyIf: string | null;
  neededBy: string[]; group: boolean; required: boolean; whereUsed: number; collectedFrom: string | null;
};
/** `stillAsked` (C4.2, P-294 (B)): the section is not chosen for this combination (taken out, or never chosen), yet it
 *  asks this person questions because forms or rules pull them; the forms that need them (none: a rule or condition
 *  reads them). Absent on a chosen section. */
export type QuestionnaireSection = { id: string; title: string; questions: QuestionnaireQuestion[]; stillAsked?: { forms: string[] } };
/** C4.2: why a section not chosen here still shows, in words ("Still asked: IMM 5257 needs these answers."). */
export function stillAskedWords(x: { forms: string[] }): string {
  const f = x.forms;
  if (!f.length) return "Still asked: a rule or condition reads these answers.";
  const list = f.length === 1 ? f[0] : `${f.slice(0, -1).join(", ")} and ${f.at(-1)}`;
  return `Still asked: ${list} need${f.length === 1 ? "s" : ""} these answers.`;
}
export type QuestionnaireRole = { role: string; label: string; questions: number; gaps: number };
export type QuestionnairesView = {
  roles: QuestionnaireRole[]; role: string;
  coverage: { needed: number; client: number; officer: number; gaps: { fact: string; meaning: string; forms: string[]; boxes: number }[];
    /** B82: facts a document line's condition reads that nobody is asked (engine/coverage.ts). */
    conditionFacts: number };
  sections: QuestionnaireSection[]; notAsked: number;
};

// ------------------------------------------------------------------ Preview (one Sample family, person chips)

/** Sample families for Preview (P-37: preset families). Each is offered when the combination's people allow it; the
 *  people are Sample, never a real household. */
export const FAMILIES = [
  { key: "single", label: "Single, no children", spouse: 0, children: 0 },
  { key: "couple", label: "Couple, no children", spouse: 1, children: 0 },
  { key: "family1", label: "Couple, one child", spouse: 1, children: 1 },
  { key: "family2", label: "Couple, two children", spouse: 1, children: 2 },
] as const;
export type FamilyKey = (typeof FAMILIES)[number]["key"];

/** questions: the one count, the same as this person's chip on the Questionnaires tab (journey item 8); asked: of those,
 *  what the client is asked once documents fill theirs. */
export type PreviewPerson = { subjectId: string; role: string; label: string; questions: number; asked: number; documents: number; forms: number };
export type PreviewDocument = { requirement: string; status: string; why: string; provided_by: string };
/** C4.6: what a person gets, by channel; a form filed once for the application or once per couple is its own group. */
export const OUTPUT_GROUPS = [
  { key: "ONLINE", title: "Filled on the portal (Online)" },
  { key: "PDF_UPLOAD", title: "Filled PDF to upload" },
  { key: "PAPER", title: "PDF to print, sign and mail" },
  { key: "NOT_NEEDED", title: "Asked by the IRCC account itself: nothing to file" },
  { key: "COUPLE", title: "Filed once for the couple" },
  { key: "APPLICATION", title: "Filed once for the application" },
] as const;
export type OutputGroup = (typeof OUTPUT_GROUPS)[number]["key"];
/** C4.6 (IRCC-P2-06, P2-09): who signs a form for this person and how, in words ("A parent or legal guardian, for them
 *  (under 18)" · "By hand on the printed PDF, then scanned and uploaded"); null when nobody signs it. */
export type PreviewSign = { by: string; how: string };
export type PreviewForm = { form: string; title: string; applies: boolean | "cannot_tell"; why: string; channel: string; channelWords: string; noRule: boolean; group: OutputGroup;
  /** C4.6 extras (engine/runtime/preview.ts outputOf): the line's signature, whether it is a PDF to sign, the later-wave words of an Online line, a checklist. */
  signature?: string; signatureWords?: string; toSign?: boolean; laterWave?: string | null; checklist?: boolean;
  sign: PreviewSign | null };
/** C4.3 (board v2 frame 4): the three sets for one person. PQR: the ticked pre-qualification questions (no verdict shown,
 *  P-77). SQR: the client's questionnaire (`questionnaire`), with what documents fill instead. Agent view: every question
 *  for the person with where its answer comes from. `from` is in words: "Client", "Case officer", "Document · Passport". */
export type PreviewSets = {
  pqr: { fact: string; label: string; from: string }[];
  /** C4.5: `missing` lists the person's needed documents that supply facts; marking one tries it missing or unreadable,
   *  so its facts are asked instead (its key goes in the preview's tweaks as true). */
  sqr: { asked: number; fromDocuments: { document: string; facts: string[] }[]; missing: { key: string; document: string; marked: boolean }[] };
  agent: { questions: number; sections: { section: string; title: string; about: string; questions: { fact: string; label: string; from: string; hidden: boolean }[] }[] };
};
/** An answer that changes what applies (yes/no facts only): the author tries it to see what changes. */
export type PreviewTweak = { key: string; subjectId: string; fact: string; label: string; about: string; value: boolean | null };
export type PreviewView = {
  label: string; families: { key: FamilyKey; label: string }[]; family: FamilyKey; person: string;
  people: PreviewPerson[]; questionnaire: QuestionnaireView; documents: PreviewDocument[]; forms: PreviewForm[]; tweaks: PreviewTweak[];
  sets: PreviewSets;
};

/** A form removed from the combination since its last release: Undo puts the same line back while the draft is open (P-116).
 *  `fromLibrary` (Forms tab) lists the attached form files the library has already matched: added from the library, no AI. */
export type RemovedForm = { code: string; title: string; at: string };
/** Slice 3: "Who can be in this application" filled from the combination's guide (api/src/people-ai.ts). The plan says
 *  the steps and the most it can cost first; the proposal is never saved by itself (the person accepts it and saves). */
export const ProposePeopleBody = z.object({ mode: z.enum(["rules", "replay", "live"], { error: "Choose how to fill it." }), planSha256: z.string().regex(/^[0-9a-f]{64}$/).optional() });
export type PeoplePlan = { mode: "rules" | "replay" | "live"; guide: { code: string; title: string; url: string }; steps: { n: number; label: string; uses_ai: boolean }[]; totals: { worst_usd: number; remaining_usd: number }; note: string; plan_sha256: string;
  /** Whether AI now may run (the founder approved a live trial) and, when not, why: the page greys the choice from this;
   *  the API refuses a live run either way (Lead check L2, Devin Review on PR #71). */
  live: { approved: boolean; why: string | null } };
export type ProposedPerson = { role: string; label: string; min: number; max: number; applies: boolean; quote: string; why: string | null; agreed: boolean };
export type PeopleProposal = {
  mode: PeoplePlan["mode"]; guide: PeoplePlan["guide"]; people: ProposedPerson[];
  to_decide: { role: string; draft: string; check: string; why: string }[]; dropped: { role: string; why: string }[];
  usd: number; from: "rules" | "replay" | "live" | null; run_files: string[]; note: string;
};

/** Slice 3: the newest change on the combination's forms that Undo can still reverse (one Undo for the page, P-116). */
export type LastFormChange = { id: string; action: "attach" | "remove" | "finder_attach" | "edit"; codes: string[]; by: string; at: string };
/** The words for a last change, for the Undo bar ("Removed IMM 5475"). */
export const changeWords = (c: LastFormChange) => `${({ attach: "Added", remove: "Removed", finder_attach: "AI attached", edit: "Changed" } as const)[c.action] ?? "Changed"} ${c.codes.join(", ")}`;

/** GET /combinations/:id/workspace?tab= — one request per tab view. Overview, Documents and Review read the combination
 *  page's existing reads. */
export type WorkspaceView =
  | { tab: "forms"; asked: string; people: PeopleView; lines: WorkspaceFormLine[]; filing: string; filingDetail: string; /** P-143: the IRCC account it files through, in words (null: not set) */ account?: string | null; /** Review M2: its key, for the picker */ accountKey?: string | null; problems: { level: "error" | "warning"; item: string; message: string }[]; removed: RemovedForm[]; /** UX-A part 1 (break 2): every form whose newest line is removed (in this draft or before a release), never "attached and waiting" */ removedEver?: string[]; fromLibrary: string[]; lastChange: LastFormChange | null; /** F2 C2.12 slice 3 (forms lane, review 28b3bba3 Major 1): each form's step chip, by form number (lines and attached forms; none for document lines) */ progress?: Record<string, FormStepChip> }
  | { tab: "questionnaires"; asked: string; people: PeopleView; questionnaire: QuestionnairesView | null; available: { key: string; title: string }[] }
  | { tab: "preview"; asked: string; preview: PreviewView | null; empty: string | null }
  | { tab: Exclude<TabKey, "forms" | "questionnaires" | "preview">; asked: string };

// ------------------------------------------------------------------ W1-15 Questions and documents (slice 2, P-147)
/** Where one fact's answer comes from for one person role (api GET /combinations/:id/fact-sources). */
export type AnswerSource = "DOCUMENT" | "CLIENT" | "AGENT";
export type FactSupplier = { key: string; name: string; base: boolean };
export type FactSourceRow = {
  role: string; fact: string; label: string; forms: string[];
  source: AnswerSource; document: FactSupplier | null; also: FactSupplier[];
  proposedBy: "Rules" | "Person"; ruleSource: AnswerSource; ruleDocument: FactSupplier | null;
  prequalification: boolean; reason: string | null; clientOnly: boolean; placed: boolean; version: number;
  /** The case officer is offered as its source by default (one rule: engine/sources.ts agentRefusal); any other fact
   *  takes the case officer only with a written reason (P-155(3)). */
  agentOffered: boolean;
  sourceReason: string | null;
  /** The newest saved choice: none (the rules), a draft (its author may undo it at once) or published. */
  change: { status: "DRAFT" | "PUBLISHED"; by: string; at: string; batchId: string | null } | null;
  /** C4.9 (P-97): who fills the question for every combination (the library placement; null: not a client or case
   *  officer question), and an open change of it (waiting on To review, returned, or approved for the next release). */
  fills: { library: "CLIENT" | "CASE_OFFICER" | null; change: { id: string; to: "CLIENT" | "CASE_OFFICER"; status: "WAITING" | "RETURNED" | "APPROVED"; by: string; reason: string } | null };
};
export type FactSourcesView = {
  counts: { facts: number; document: number; client: number; agent: number; prequalification: number };
  facts: FactSourceRow[];
  problems: { level: "error" | "warning"; where: string; item: string; label?: string; role?: string; message: string }[];
  basis: string;
};
/** P-132: the country PQR, a view of the newest releases (GET /api/combinations/:id/pqr/country). */
export type CountryPqrView = {
  lines: { role: string; roleLabel: string; fact: string; label: string; combinations: { id: string; label: string; release: number }[] }[];
  /** Released combinations that ask at least one PQR question, and all released ones. */
  combinations: number; released: number;
  thisCombination: { draftAdds: { role: string; fact: string; label: string }[]; draftRemoves: { role: string; fact: string; label: string }[] };
  basis: string;
};
export type BulkSourceResult = { saved: number; batchId: string | null; what: string; refused: { role: string; fact: string; label: string; message: string }[] };

// ------------------------------------------------------------------ W1-15 slice 3: each person's checklist (board v2 frame 3)
export type ChecklistFactRow = { fact: string; label: string; about: "holder" | "holder.spouse" | "holder.parent"; aboutRole: string | null; takenOut: boolean };
export type ChecklistLineRow = {
  lineage: string; role: string; document: { key: string; name: string }; who: string; base: boolean; when: string;
  providedBy: string; alternatives: { key: string; name: string }[]; supplies: ChecklistFactRow[]; aboutOthers: number;
  quote: string | null; status: string; origin: string; position: number | null; rank: number; by: string | null;
  /** C6.15 (SA-1B-20): the substitute set the line picks (null: "Standard"). */
  setName?: string | null;
  /** C3.11: worked out from a form line filed as Signed PDF upload (never stored), with why; changed on that line only. */
  automatic?: { form: string; reason: string };
};
export type ChecklistView = {
  roles: { role: string; label: string; lines: ChecklistLineRow[] }[];
  /** Lines removed in this draft: put back with Undo by the person who removed them, or they go with the next release. */
  removed: { lineage: string; document: string; who: string; by: string; at: string }[];
  problems: { level: "error" | "warning"; where: string; item: string; label?: string; role?: string; message: string }[];
  basis: string;
};
