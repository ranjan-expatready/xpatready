// S5 Combination workspace (runtime lane, W1-08, P-123): its tabs, the person roles, "Who can be in this application",
// the form line an author edits, the Sample families Preview offers, and what GET /combinations/:id/workspace?tab=
// answers. Pure; shared by the API, the web app and the tests (STANDARDS §6: contract first, zod).
import { z } from "zod";
import type { QuestionnaireView } from "./runtime.ts";

/** BR-1: the tabs in setup order (walkthrough v2 S5, P-118 Q5). */
export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "forms", label: "Forms" },
  { key: "questionnaires", label: "Questionnaires" },
  { key: "documents", label: "Documents" },
  { key: "preview", label: "Preview" },
  { key: "review", label: "Review and release" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
/** The old Configuration tab's parts, and the tab that now holds each. */
const AREA_TAB: Record<string, TabKey> = { forms: "forms", documents: "documents", rules: "questionnaires", checks: "questionnaires", questions: "questionnaires" };
/** BR-1 fail: an unknown tab is Overview. Old addresses open the tab that now holds their part (m5). */
export const tabOf = (t: string | undefined, area?: string | null): TabKey =>
  t === "configuration" ? (AREA_TAB[area ?? ""] ?? "forms") : t === "sources" ? "forms" : TABS.some((x) => x.key === t) ? (t as TabKey) : "overview";

// ------------------------------------------------------------------ person roles (M3) and who can be (P-119, M4)

/** One person role of the shared library (GET /library/roles). */
export type PersonRoleView = { key: string; label: string; meaning: string; takesPartInCase: boolean; mayBeApplicant: boolean; basis: string; builtIn: boolean; retired: boolean };

/** One line of "Who can be in this application". `quote` and `origin` say where it came from (AI from the guide in
 *  slice 3, or a person); `basis` is Sample until the immigration expert confirms the numbers. */
export const PeopleLine = z.object({
  role: z.string({ error: "Choose a person." }).trim().regex(/^[a-z][a-z0-9_]{1,40}$/, "Choose a person from the list."),
  label: z.string().trim().max(60).optional(),
  min: z.number({ error: "How many: the fewest is a whole number from 0 to 9." }).int("How many: the fewest is a whole number from 0 to 9.").min(0, "How many: the fewest is a whole number from 0 to 9.").max(9, "How many: the fewest is a whole number from 0 to 9."),
  max: z.number({ error: "How many: the most is a whole number from 0 to 9." }).int("How many: the most is a whole number from 0 to 9.").min(0, "How many: the most is a whole number from 0 to 9.").max(9, "How many: the most is a whole number from 0 to 9."),
  applies: z.boolean({ error: "Say whether this person files their own application." }),
  preview: z.number().int().min(0).max(9).optional(),
  quote: z.string().trim().max(400).nullable().optional(),
  origin: z.enum(["HUMAN", "AI_PROPOSAL", "SAMPLE"]).optional(),
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
  lines: (PeopleLine & { label: string; roleLabel: string; meaning: string; mayBeApplicant: boolean; answeredBy: string })[];
  roles: PersonRoleView[];
};

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

/** PATCH /combinations/:id/forms/:form: the line fields S5 adds (who, only if, filed as stay on their existing routes). */
export const FormLineEdit = z.object({
  minAge: z.number({ error: "Minimum age is a whole number from 1 to 99, or empty." }).int("Minimum age is a whole number from 1 to 99, or empty.").min(1, "Minimum age is a whole number from 1 to 99, or empty.").max(99, "Minimum age is a whole number from 1 to 99, or empty.").nullable().optional(),
  signedBy: z.enum(SIGNED_BY.map((x) => x.key) as [string, ...string[]], { error: "Choose who signs it from the list." }).nullable().optional(),
});

/** How a line's "Only if" stands (M1): none (always), a rule, or words with no rule yet (Preview: cannot tell). */
export type OnlyIf = { kind: "always" } | { kind: "rule"; words: string } | { kind: "words_only"; words: string };

/** One form line as the Forms tab shows it. `revision` is the line's optimistic-concurrency token. */
export type WorkspaceFormLine = {
  line: string; code: string; title: string; document: boolean; edition: string | null; boxes: number;
  who: string; minAge: number | null; onlyIf: OnlyIf; condition: unknown;
  channel: string; channelWords: string; signature: string | null; accepted: string[]; acceptedBasis: string;
  signedBy: string | null; signedByLabel: string; origin: string; quote: string | null; revision: string; status: string;
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
  fact: string; wording: string; meaning: string; help: string | null; answerType: string; filledBy: FilledBy; onlyIf: string | null;
  neededBy: string[]; group: boolean; required: boolean; whereUsed: number; collectedFrom: string | null;
};
export type QuestionnaireSection = { id: string; title: string; questions: QuestionnaireQuestion[] };
export type QuestionnaireRole = { role: string; label: string; questions: number; gaps: number };
export type QuestionnairesView = {
  roles: QuestionnaireRole[]; role: string;
  coverage: { needed: number; client: number; officer: number; gaps: { fact: string; meaning: string; forms: string[]; boxes: number }[] };
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

export type PreviewPerson = { subjectId: string; role: string; label: string; questions: number; documents: number; forms: number };
export type PreviewDocument = { requirement: string; status: string; why: string; provided_by: string };
export type PreviewForm = { form: string; title: string; applies: boolean | "cannot_tell"; why: string; channel: string; channelWords: string; noRule: boolean };
/** An answer that changes what applies (yes/no facts only): the author tries it to see what changes. */
export type PreviewTweak = { key: string; subjectId: string; fact: string; label: string; about: string; value: boolean | null };
export type PreviewView = {
  label: string; families: { key: FamilyKey; label: string }[]; family: FamilyKey; person: string;
  people: PreviewPerson[]; questionnaire: QuestionnaireView; documents: PreviewDocument[]; forms: PreviewForm[]; tweaks: PreviewTweak[];
};

/** GET /combinations/:id/workspace?tab= — one request per tab view. Overview, Documents and Review read the combination
 *  page's existing reads. */
export type WorkspaceView =
  | { tab: "forms"; asked: string; lines: WorkspaceFormLine[]; filing: string; filingDetail: string; problems: { level: "error" | "warning"; item: string; message: string }[] }
  | { tab: "questionnaires"; asked: string; people: PeopleView; questionnaire: QuestionnairesView | null; available: { key: string; title: string }[] }
  | { tab: "preview"; asked: string; preview: PreviewView | null; empty: string | null }
  | { tab: Exclude<TabKey, "forms" | "questionnaires" | "preview">; asked: string };
