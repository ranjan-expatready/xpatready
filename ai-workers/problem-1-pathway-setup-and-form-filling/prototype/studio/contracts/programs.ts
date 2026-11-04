// Screen 01 (Programs) contract, shared by the API and the web app (STANDARDS §6: contract first, zod). Requests are
// parsed with these schemas on the server; the web app types its calls and shows field errors from the same shapes.
// Errors are RFC 9457 Problem Details with field-level messages (ProblemDetails below).
import { z } from "zod";
import type { CardSetup, SetupChecklist, ViewerChecklist } from "./setup-checklist.ts";

export const PATHWAYS = ["INDIVIDUAL", "CORPORATE"] as const;
export const STATUSES = ["IN_SETUP", "NOT_READY", "READY"] as const;
export type Status = (typeof STATUSES)[number];
/** Filters: the page's chips All · Not started · In progress · Live (· Retired) read the setup checklist's chip (P-180);
 *  the older status filters stay for API callers. */
export const FILTERS = ["needs", "live", "all", "ready", "not_ready", "in_setup", "in_progress", "not_started", "ai_proposals", "retired"] as const;
export const SORTS = ["path", "status", "-status"] as const;
export type Filter = (typeof FILTERS)[number];

/** Node kinds stored with the team's ProgramNodeKind; the business names are an adapter (STREAM = Category,
 *  CATEGORY = Sub-category, PRODUCT.md §4). */
export const NODE_KINDS = ["PROGRAM", "STREAM", "CATEGORY"] as const;
export const LEVEL_NAME: Record<string, string> = { PATHWAY: "Pathway", PROGRAM: "Program", STREAM: "Category", CATEGORY: "Sub-category" };

/** BR-6: two names under the same parent are the same when they match ignoring case, spaces and punctuation
 *  ("Open work permit", "open  work-permit"). No fuzzy matching. */
export function normalizeLabel(label: string): string {
  // Combining marks stay (break m2): Hindi or Thai vowel signs make different names ("किसान" is not "कसान").
  return label.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/\p{Default_Ignorable_Code_Point}/gu, "").replace(/[^\p{L}\p{N}\p{M}]+/gu, "");
}
/** Spaces tidied; invisible direction, format and ignorable characters removed, so a name shows as it is stored and an
 *  invisible character never makes a look-alike twin (break m2, round 3). */
export const cleanLabel = (label: string) => label.normalize("NFKC").replace(/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "").trim().replace(/\s+/g, " ");

/** The limits a name must meet, in the words the field shows (the path builder checks them as you type, QA-6/QA-7). */
export const LABEL_MAX = 120;
export function labelProblem(raw: string): string | null {
  const s = cleanLabel(raw);
  if (!s) return "Give it a name.";
  if (s.length > LABEL_MAX) return `Keep the name under ${LABEL_MAX} characters.`;
  if (!/[\p{L}\p{N}]/u.test(s)) return "Use letters or digits in the name, not only punctuation.";
  return null;
}
const label = z.string().transform(cleanLabel).superRefine((s, ctx) => { const m = labelProblem(s); if (m) ctx.addIssue({ code: "custom", message: m }); });

export const CatalogueQuery = z.object({
  pathway: z.enum(PATHWAYS).default("INDIVIDUAL"),
  filter: z.enum(FILTERS).default("all"),
  /** Longer text is cut to 120 characters, never refused (break m4). */
  q: z.string().trim().transform((s) => s.slice(0, 120)).default(""),
  /** A program's node key: only that program's combinations (the "Program ▾" filter). */
  program: z.string().trim().transform((s) => s.slice(0, 400)).default(""),
  /** Any program, category or sub-category key: only the combinations under it (the clickable path on a combination). */
  under: z.string().trim().transform((s) => s.slice(0, 400)).default(""),
  /** S2: a Pathway's node key (a Pathway card): only its combinations, and the counts are its own; sections keep every Pathway's counts. */
  pathwayKey: z.string().trim().transform((s) => s.slice(0, 400)).default(""),
  /** path (Program › Category › Sub-category, the default) or the Status column, ascending or descending. */
  sort: z.enum(SORTS).default("path"),
});
export type CatalogueQuery = z.infer<typeof CatalogueQuery>;

export const CreateNodeBody = z.object({
  kind: z.enum(NODE_KINDS, { message: "Choose program, category or sub-category." }),
  parentKey: z.string().min(1, "Choose where it belongs."),
  label,
});
export type CreateNodeBody = z.infer<typeof CreateNodeBody>;

const LOCATIONS = ["inside_canada", "outside_canada"] as const;
export const Participant = z.object({
  role: z.enum(["principal", "spouse_or_partner", "child", "representative", "parent"]),
  label: z.string().trim().min(1).max(60),
  min: z.number().int().min(0).max(9),
  max: z.number().int().min(0).max(9),
  preview: z.number().int().min(0).max(9).optional(),
  applies: z.boolean().optional(),
});
export const DEFAULT_PARTICIPANTS = [
  { role: "principal", label: "Principal applicant", min: 1, max: 1, preview: 1, applies: true },
  { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: 0, applies: true },
  { role: "child", label: "Child", min: 0, max: 6, preview: 0, applies: true },
  { role: "representative", label: "Representative", min: 0, max: 1, preview: 0, applies: false },
] as const;

/** POST /combinations: the path is chosen from masters (the last level present). Step 3 of the dialog is optional and
 *  prefilled; what it does not say keeps the defaults. Creating the same path again returns the existing combination. */
export const CreateCombinationBody = z.object({
  nodeKey: z.string().min(1, "Choose the category, or its sub-category."),
  allowedLocations: z.array(z.enum(LOCATIONS)).min(1, "Choose at least one place a case can be opened from.").optional(),
  participants: z.array(Participant).min(1).optional(),
});
export type CreateCombinationBody = z.infer<typeof CreateCombinationBody>;

/** POST /combinations/:id/lines: "+ Add" picks a library form (never a new one; uploads go through POST /intake). */
export const AddLineBody = z.object({ kind: z.literal("FORM"), formKey: z.string().min(1, "Choose a form from the library.") });
export type AddLineBody = z.infer<typeof AddLineBody>;


export const ReleaseBody = z.object({ expectedChanges: z.number().int().min(0) });

export type ProblemDetails = { type: string; title: string; status: number; detail: string; errors?: { field: string; message: string }[]; existing?: { id: string; label: string } };

/** zod issues → Problem Details field errors (the web app shows each one on its field). */
export function problemFromZod(e: z.ZodError, title = "Some details need fixing"): ProblemDetails {
  const errors = e.issues.map((i) => ({ field: i.path.join(".") || "body", message: i.message }));
  return { type: "https://expatready.local/problems/validation", title, status: 400, detail: errors.map((x) => x.message).join(" "), errors };
}

// ------------------------------------------------------------------ catalogue response (GET /catalogue)
/** One cause per line; step is the action that moves it, in the next step's words (the row's next step while a setup
 *  step is waiting), and text is the whole sentence shown (without the step when every line shares it: sharedStep). */
export type MissingItem = { code: "no_forms" | "form_without_edition" | "role_without_questions" | "filing_problem" | "rule_problem" | "not_started" | "filing_not_set"; step: string; text: string };
/** The one step every missing line shares, when there is more than one line and they all name it; null otherwise. The
 *  lines then carry only their causes and the screen names the step once under the list (Lead note 23 Oct). */
export function sharedStep(missing: { step: string }[]): string | null {
  return missing.length > 1 && missing.every((m) => m.step === missing[0].step) ? missing[0].step : null;
}
export type CatalogueLeaf = {
  kind: "combination";
  nodeKey: string;
  label: string;
  level: "Category" | "Sub-category";
  path: string[];
  linkLabel: string | null;
  combinationId: string | null;
  /** Not started: why Start setup cannot run (S3 M3: retired, or a change waits), null when it can. */
  startWhy?: string | null;
  /** drafted: the form's boxes are mapped (or it is a checklist, which has none); false = attached, not set up yet.
   *  inLibrary (attached sources only): its boxes are already mapped in the library, so it is added without AI. */
  forms: { code: string; drafted: boolean; document: boolean; inLibrary?: boolean; channel?: "PDF_UPLOAD" | "ONLINE" | "PAPER" | "NOT_NEEDED" }[];
  /** How the application is filed, worked out from its lines (C1.6, engine/channels.ts filingKind): "PDF only", "Online only" or "Mixed: online and PDF"; null with no lines. */
  filing: string | null;
  /** C1.6 (P-143): the IRCC account the combination files through (contracts/forms.ts IRCC_ACCOUNTS), null when not set:
   *  the portal an Online line is typed into. */
  account?: string | null;
  /** questions: the one question count (contracts/counts.ts), the sum of questionsByRole (the Questionnaires chips). */
  counts: { documents: number; documentsAlways: number; documentsIf: number; questions: number; questionsByRole?: { role: string; label: string; questions: number }[]; sections: number; rules: number } | null;
  status: Status;
  statusText: string;
  missing: MissingItem[];
  aiProposals: number;
  aiRunning: string | null;
  release: { pack: number; at: string } | null;
  checked: { at: string; nextReview: string; overdue: boolean } | null;
  nextAction: NextAction | null;
  matches: string[];
  /** The program it belongs to (the "Program ▾" filter). */
  programKey: string;
  /** "Needs work" (P-49): firms cannot use it yet, or it has a next step. */
  needs: boolean;
  /** "Need you" (S2 fix 6): waiting on a person — something to review, something missing, or Not ready (engine waitsForPerson). */
  needsYou: boolean;
  /** Live (founder finding F1): its status is Live (firms can open cases on it), with or without a next step. */
  live: boolean;
  /** New editions of its forms held for impact review (P-32), never used silently. */
  held: { code: string; edition: string }[];
  /** Keys of its program, category (and sub-category): the clickable path on the combination page. */
  pathKeys: string[];
  /** One short line under the path: its link or route step, AI proposals when the next step is something else, "New today". */
  note: string;
  /** W1-03/04 (BR-7): the Pathway it sits in and the full five-part trail: Pathway type › Pathway › Program › Category ›
   *  Sub-category ("No sub-category" when the category is the combination, never blank). */
  pathwayType: (typeof PATHWAYS)[number];
  pathwayKey: string;
  pathwayLabel: string;
  trail: string[];
  /** QA-184: the setup checklist's five steps (P-157), the same as the card and the Overview: the step its next item is
   *  on, which steps are done, Live (the chip) and the card's words. */
  progress: { step: number; of: 5; label: string; done: boolean[]; live: boolean };
  /** "Filed:" (addendum A4): PDF · PDF + answer sheet (later wave) · No forms yet. */
  filed: string;
  /** P-116: retired by a release (left out of All; shown under the Retired status). */
  retired: boolean;
  /** W1 setup checklist (slice A, P-180): the card's part with the viewer's overlay (GET /catalogue with x-actor). */
  setup?: CardSetup;
};
export type CatalogueGroup = { kind: "program" | "category"; nodeKey: string; label: string; linkLabel: string | null; children: CatalogueNode[]; summary: Record<Status, number> & { ai_proposals: number; combinations: number } };
export type CatalogueNode = CatalogueGroup | CatalogueLeaf;
export type NextAction = { kind: "start" | "add_forms" | "add_from_library" | "draft_ai" | "view_progress" | "review_proposals" | "release" | "see_missing" | "see_new_edition"; label: string; jobId?: string; batchId?: string; forms?: string[] };

// ------------------------------------------------------------------ responses the Screen 01 pages read
/** One person role on a combination (stored as JSON on the combination; see Participant above for the request shape). */
export type ParticipantLine = { role: string; label: string; min: number; max: number; preview?: number; applies?: boolean };
export type CatalogueCounts = Record<"needs" | "live" | "all" | "ready" | "not_ready" | "in_setup" | "in_progress" | "not_started" | "ai_proposals" | "retired", number>;
/** W1-04 (design D): one section per Pathway of the tab, in Structure order, with its combinations' tree and counts. */
export type CatalogueSection = { pathwayKey: string; label: string; combinations: number; needs: number; live: number; tree: CatalogueGroup[] };
/** GET /catalogue. */
export type CatalogueResponse = {
  pathway: (typeof PATHWAYS)[number]; filter: Filter; requestedFilter: Filter; fellBack: boolean; q: string; program: string; under: string; sort: (typeof SORTS)[number];
  /** S2: the Pathway card this answer is for ("" = All pathways, also for a key that is not a Pathway of this type), so the
   *  page never pairs one Pathway's name with another view's counts. */
  pathwayKey: string;
  underPath: string[] | null;
  rows: CatalogueLeaf[];
  /** live: how many of its combinations are Live (the Program header's "n of m live", P-180). */
  programs: { key: string; label: string; combinations: number; live: number }[];
  pathways: { value: string; label: string; combinations: number }[];
  counts: CatalogueCounts;
  totals: { programs: number; categories: number; combinations: number };
  /** Every program of every Pathway of the tab (the flat tree the current page reads). */
  tree: CatalogueGroup[];
  sections: CatalogueSection[];
  otherPathwayMatches: number;
  timing_ms: { rows: number; total: number };
};
/** GET /session: who is acting, and what they may do. */
export type SessionView = { actor: { id: string; name: string; role: string; duties: readonly string[] }; preferences?: import("./session.ts").Preferences };
/** A file held by the form intake (P-51) that concerns a combination. */
export type HeldFile = { id: string; file: string; code: string | null; edition: string | null; outcome: string | null; reason: string | null; at: string | Date };
/** GET /combinations/:id/summary (P-50): the combination page's header and Overview. */
type Channel = "PDF_UPLOAD" | "ONLINE" | "PAPER" | "NOT_NEEDED";
export type CombinationSummary = {
  /** W1 setup checklist (slice A): the full checklist (open items per step); `viewer` when the request names a person. */
  setup: SetupChecklist | ViewerChecklist | null;
  row: CatalogueLeaf | null; changes: number; allowedLocations: string[]; participants: unknown;
  forms: { code: string; title: string; document: boolean; who: string; when: string; edition: string | null; boxes: number; channel: Channel; channelWords: string; signature: string | null; signatureKind?: string }[];
  /** C1.6's words: "PDF only", "Online only", "Mixed: online and PDF"; filingDetail says it line by line. */
  filing: string; filingDetail: string;
  channelProblems: ProblemLine[];
  sources: { id: string; kind: string | null; name: string; status: string; detail: string | null; at: string | Date }[];
  held: HeldFile[];
};
/** A validator finding (engine/validate.ts): errors block release, warnings are shown and recorded. */
export type ProblemLine = { level: "error" | "warning"; where: string; item: string; message: string; label?: string; role?: string; /** C2.12: the forms the problem touches (a Forms problem: its own form) */ forms?: string[] };
/** A problem in words for a person (drift check 2): a coverage gap's message already names the question, so it stands
 *  alone; any other problem leads with its item's words (`label`, a question's meaning) or its item when it has none (a
 *  form number, a rule id). Never a field code on its own. */
export const problemWords = (p: ProblemLine) => (p.where === "Questionnaires" || !(p.label ?? p.item) ? p.message : `${p.label ?? p.item}: ${p.message}`); // F8: a problem about the whole combination names no item
/** GET /combinations/:id, the parts the combination page reads (the tabs below it read the rest until Screen 03). */
export type CombinationView = {
  combination: { id: string; key: string; label: string; description: string | null; participants: ParticipantLine[]; source_basis: string; basis_note: string | null };
  pathway: { key: string; label: string; client_type: string | null } | null;
  path: { key: string; label: string; level: string }[];
  allowed_locations: string[];
  jobs: { id: string; kind: string; mode: string; status: string; message: string | null; startedAt: string }[];
  releases: { id: string; release: number; status: string; released_at: string; approver: string; basis: string | null; /** C5.6: Sample content, a Demo release */ demo?: boolean }[];
  draft: { problems: ProblemLine[]; counts: { forms: number; map_boxes: number; sections: number; fields: number; document_requirements: number; rules: number; checks: number } };
  submission: { status: string; stale: boolean } | null;
};
