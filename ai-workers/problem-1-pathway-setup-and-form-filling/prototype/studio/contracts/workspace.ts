// Screen 03, the combination workspace (runtime lane, slice S1): its tabs, the form line an author edits, the Sample
// families Preview by person offers, and what GET /combinations/:id/workspace?tab= answers. Pure; shared by the API,
// the web app and the tests.
import { z } from "zod";
import type { CombinationSummary, CombinationView } from "./programs.ts";
import type { QuestionnaireView } from "./runtime.ts";

/** BR-1: the tabs in their order (P-35, SCREENS row 03). `slice` says which slice rebuilds a tab that still shows
 *  today's page; "sources" stays until Screen 02 merges (challenge point 5), then its content lives on Overview. */
export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "forms", label: "Forms" },
  { key: "pqr", label: "PQR", slice: "S4" },
  { key: "sqr", label: "SQR" },
  { key: "documents", label: "Documents", slice: "S3" },
  { key: "rules", label: "Rules", slice: "S4" },
  { key: "preview", label: "Preview by person" },
  { key: "review", label: "Review and release" },
  { key: "sources", label: "Sources", slice: "Screen 02" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
/** BR-1 fail: an unknown tab is Overview. An old "configuration" address opens the tab that now holds its part. */
export const tabOf = (t: string | undefined, area?: string | null): TabKey => (t === "configuration" ? (AREA_TAB[area ?? ""] ?? "sqr") : TABS.some((x) => x.key === t) ? (t as TabKey) : "overview");
/** The old Configuration tab's parts and the Screen 03 tab that now holds each. */
const AREA_TAB: Record<string, TabKey> = { forms: "forms", documents: "documents", rules: "rules", checks: "rules", questions: "sqr" };

/** Q2 (Lead, 25 Oct; SA-1B-102): who signs a form line. Values are Sample until the immigration expert confirms them;
 *  how it is signed stays worked out from the channel (P-61). */
export const SIGNED_BY = [
  { key: "person", label: "The person the form is about" },
  { key: "parent_for_minor", label: "A parent, for a minor" },
  { key: "principal_for_family", label: "The principal applicant, for the family" },
  { key: "person_and_representative", label: "The person and the representative" },
  { key: "none", label: "No signature" },
] as const;
export const signedByLabel = (k: string | null | undefined) => SIGNED_BY.find((x) => x.key === k)?.label ?? "Not set";

/** PATCH /combinations/:id/forms/:line, the line fields Screen 03 adds (channel and portal stay F1's routes). */
export const FormLineEdit = z.object({
  copies: z.number({ error: "Copies is a whole number from 1 to 9." }).int("Copies is a whole number from 1 to 9.").min(1, "Copies is a whole number from 1 to 9.").max(9, "Copies is a whole number from 1 to 9.").optional(),
  minAge: z.number({ error: "Minimum age is a whole number from 1 to 99, or empty." }).int("Minimum age is a whole number from 1 to 99, or empty.").min(1, "Minimum age is a whole number from 1 to 99, or empty.").max(99, "Minimum age is a whole number from 1 to 99, or empty.").nullable().optional(),
  signedBy: z.enum(SIGNED_BY.map((x) => x.key) as [string, ...string[]], { error: "Choose who signs it from the list." }).nullable().optional(),
});

/** B2, RD-6: who fills a question is its placement's source (S2 FIX: the interim library "filled by" is gone; a change
 *  goes through the shared library as an approved library change): the client for a questionnaire or profile
 *  placement, and always for a background or declaration section; the case officer for a document, record or working view. */
export const FILLED_BY = { CLIENT: "Client", CASE_OFFICER: "Case officer" } as const;
export type FilledBy = keyof typeof FILLED_BY;
export const filledByOf = (placement: { collected_from?: string; section_id?: string } | undefined): FilledBy =>
  placement && ((CLIENT_ONLY_SECTIONS as readonly string[]).includes(placement.section_id ?? "") || ["client_questionnaire", "profile_record"].includes(placement.collected_from ?? "")) ? "CLIENT" : "CASE_OFFICER";
/** Background and declaration questions stay with the client (concept BR-9). Sample list until the immigration expert
 *  confirms which library sections these are. */
export const CLIENT_ONLY_SECTIONS = ["background_declarations", "background_medical", "security_history"] as const;

/** Sample families for Preview by person (P-37: preset families, then tweaks). Each is offered when the combination's
 *  people allow it; the people are Sample, never a real household. */
export const FAMILIES = [
  { key: "single", label: "Single, no children", spouse: 0, children: 0 },
  { key: "couple", label: "Couple, no children", spouse: 1, children: 0 },
  { key: "family1", label: "Couple, one child", spouse: 1, children: 1 },
  { key: "family2", label: "Couple, two children", spouse: 1, children: 2 },
] as const;
export type FamilyKey = (typeof FAMILIES)[number]["key"];

/** One form line as the Forms tab shows it (concept §4: Form · Who and copies · Only if · Channel · Signature · Version
 *  and field map). `revision` is the line's optimistic-concurrency token (STANDARDS §4: a stale save is a 409). */
export type WorkspaceFormLine = CombinationSummary["forms"][number] & {
  line: string; copies: number; minAge: number | null; signedBy: string | null; signedByLabel: string; revision: string; version: number; status: string;
};

/** One person of a previewed family: their counts for the person chips. */
export type PreviewPerson = { subjectId: string; role: string; label: string; questions: number; documents: number; forms: number };
export type PreviewDocument = { requirement: string; status: string; why: string; provided_by: string };
export type PreviewForm = { form: string; title: string; applies: boolean | "cannot_tell"; why: string; channel: string; channelWords: string };
/** A deciding question the author can answer to see what changes (the tweaks); boolean facts only in S1. */
export type PreviewTweak = { key: string; subjectId: string; fact: string; label: string; about: string; value: boolean | null };

export type PreviewView = {
  label: string; families: { key: FamilyKey; label: string }[]; family: FamilyKey; person: string; mode: "sqr" | "agent";
  people: PreviewPerson[]; questionnaire: QuestionnaireView; documents: PreviewDocument[]; forms: PreviewForm[]; tweaks: PreviewTweak[];
};

/** The SQR tab (S2): one role's questions as a case asks them; coverage per role (BR-7). */
export type SqrQuestion = { fact: string; label: string; asked_as: string | null; meaning: string; filled_by: FilledBy; client_only: boolean; needed_by: string[]; rule: string | null; group: boolean; required: boolean; where_used: number };
export type SqrSection = { id: string; title: string; selected: boolean; questions: SqrQuestion[] };
export type SqrRole = { role: string; label: string; person: string; questions: number; gaps: number };
export type SqrView = {
  roles: SqrRole[]; role: string; person: string;
  coverage: { needed: number; client: number; officer: number; gaps: { fact: string; role: string; forms: string[]; boxes: number; why: string }[] };
  sections: SqrSection[]; not_asked: number;
};


/** GET /combinations/:id/workspace?tab= — one request per tab view (concept §6). */
export type WorkspaceView =
  | { tab: "overview"; asked: string; view: CombinationView; summary: CombinationSummary }
  | { tab: "forms"; asked: string; summary: CombinationSummary; lines: WorkspaceFormLine[] }
  | { tab: "preview"; asked: string; preview: PreviewView | null; empty: string | null }
  | { tab: "sqr"; asked: string; sqr: SqrView | null; available: { key: string; title: string }[]; phone: QuestionnaireView | null; empty: string | null }
  | { tab: Exclude<TabKey, "overview" | "forms" | "preview" | "sqr">; asked: string };
