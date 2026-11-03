// W1 setup checklist contract (P-157, P-161, P-176, P-180; concept v4 §8): one derived checklist per combination, read
// by the Programs card, the Overview, the tab headers and the "need you" counts. Nothing in it is stored: every state is
// worked out from data on each read (engine/setup-checklist.ts). zod, shared by the API, the web app and the checks.
import { z } from "zod";

/** The five steps, in dependency order (P-161 (1)). */
export const STEP_KEYS = ["pages", "people", "forms", "questions_documents", "release"] as const;
export type StepKey = (typeof STEP_KEYS)[number];
export const STEP_LABEL: Record<StepKey, string> = { pages: "Official pages", people: "Who can be in this application", forms: "Forms", questions_documents: "Questions and documents", release: "Review and release" };
/** The tab each step opens (P-161 (2): Official pages and people sit in "Before forms" on Forms). Slice C1 put
 *  them there; the 30 Oct interim (people on Questionnaires) is reverted. */
export const STEP_TAB: Record<StepKey, "forms" | "documents" | "questionnaires" | "review"> = { pages: "forms", people: "forms", forms: "forms", questions_documents: "documents", release: "review" };

/** ✓ Done · ● Next · ○ To do · ◐ AI at work · ⧗ Waiting for someone else (the viewer overlay turns "next" into
 *  "waiting" when the first open item is not this person's). */
export const MARKS = ["done", "next", "todo", "ai", "waiting"] as const;
/** The duty that acts on an open item (api/src/core.ts ACTORS duties); null = nobody (View AI progress). */
/** Who acts on an open item; "review" is a content publisher's duty (AI proposals, people proposals: Lead 5's ruling on
 *  #616 Question 0, 2 Nov: P-121's review screen, To review, decides them). */
export const ACTS = ["author", "sme", "approve", "review"] as const;
/** P-176: who confirms an item: "author" when the rules or both AI readings are sure, "expert" for anything else. */
export const TIERS = ["author", "expert"] as const;
export type Tier = (typeof TIERS)[number];

/** Every open item, with the words its button says (concept §4) and who acts on it (§5). */
export const ITEM_KINDS = ["confirm_pages", "choose_pages", "review_people", "confirm_people", "find_forms", "add_forms_found", "map_forms", "review_proposals", "fix_problems",
  "review_edition", "draft", "unasked", "submit", "sign", "release", "view_ai"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const OpenItem = z.object({
  kind: z.enum(ITEM_KINDS),
  count: z.number().int().min(0),
  text: z.string().min(1),
  /** What the page outlines when it lands (`?focus=`), e.g. "forms:lines" or "review:people". */
  focus: z.string().min(1),
  acts: z.enum(ACTS).nullable(),
  tier: z.enum(TIERS).optional(),
  reason: z.string().optional(),
  /** A problem of the released snapshot (Not ready): shown first, before any draft item. */
  fromRelease: z.boolean(),
  /** A cause of the startable check on the released version (no validator error: e.g. no questions yet), said in its own
   *  words where it lands, never as "this draft no longer has it" (Devin on #622). */
  startable: z.boolean().optional(),
  /** The second-person rule: people who may not act on it even with the duty (the submitter for Sign; the submitter and
   *  the draft's authors for Release). */
  notBy: z.array(z.string()).optional(),
});
export type OpenItem = z.infer<typeof OpenItem>;

export const Step = z.object({
  key: z.enum(STEP_KEYS),
  label: z.string(),
  state: z.enum(MARKS),
  summary: z.string(),
  confirmed: z.object({ by: z.string().nullable(), as: z.enum(TIERS) }).optional(),
  /** Step 4 only: 4a documents, 4b questions (P-130: documents first). */
  parts: z.array(z.object({ key: z.enum(["documents", "questions"]), done: z.boolean() })).optional(),
  open: z.array(OpenItem),
  tab: z.enum(["forms", "documents", "questionnaires", "review"]),
});
export type Step = z.infer<typeof Step>;

export const CHIP_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "NOT_READY", "LIVE", "RETIRED"] as const;
export type ChipStatus = (typeof CHIP_STATUSES)[number];

/** UX-A part 1 (contracts/counts.ts): `forms` counts the forms on the combination (lines and attached forms not set up
 *  yet, each once), `formsSetUp` its lines; `questions` the one question count (the Questionnaires chips' sum). */
export const Counts = z.object({
  forms: z.number().int().min(0), formsSetUp: z.number().int().min(0), people: z.number().int().min(0), applicants: z.number().int().min(0), documents: z.number().int().min(0), questions: z.number().int().min(0),
  proposals: z.record(z.enum(STEP_KEYS), z.number().int().min(0)), problems: z.record(z.enum(STEP_KEYS), z.number().int().min(0)), held: z.number().int().min(0),
});
export type Counts = z.infer<typeof Counts>;

export const NextItem = z.object({ item: OpenItem, step: z.enum(STEP_KEYS), href: z.string(), line: z.string() });

/** setupChecklistOf's answer: the same for every viewer (cached per combination); forViewer adds the duty overlay. */
export const SetupChecklist = z.object({
  combinationId: z.string().nullable(),
  chip: z.object({ status: z.enum(CHIP_STATUSES), release: z.number().int().nullable() }),
  steps: z.array(Step).length(5),
  current: z.enum(STEP_KEYS).nullable(),
  next: NextItem.nullable(),
  /** `next`: on a Live combination, what its next release still needs (status-words nextReleaseWords; QA-184). */
  bar: z.object({ done: z.number().int().min(0).max(5), of: z.literal(5), text: z.string(), next: z.string().nullable().optional() }),
  counts: Counts,
  /** The cache key it was worked out for (concept §8). */
  key: z.string(),
});
export type SetupChecklist = z.infer<typeof SetupChecklist>;

/** The card's one button (P-180): Start setup · Resume setup · Open; "Open" for anyone without the author duty. */
export const BUTTONS = ["Start setup", "Resume setup", "Open"] as const;
export const ViewerOverlay = z.object({
  button: z.enum(BUTTONS),
  /** Q1: an item on this viewer's duty and tier waits for a review or a confirmation. */
  needsYou: z.object({ count: z.number().int().min(1), text: z.string() }).nullable(),
  /** The Next line in this viewer's words ("Waiting for the immigration expert: …" when it is not theirs). */
  nextLine: z.string().nullable(),
  /** The first open item is this viewer's to act on (the filled button on the combination's pages). */
  filled: z.boolean(),
});
export type ViewerOverlay = z.infer<typeof ViewerOverlay>;
export const ViewerChecklist = SetupChecklist.extend({ viewer: ViewerOverlay });
export type ViewerChecklist = z.infer<typeof ViewerChecklist>;
/** GET /catalogue cards: the steps without their open items (the summary carries the full checklist). */
export type CardSetup = Pick<ViewerChecklist, "chip" | "bar" | "next" | "current" | "viewer"> & { steps: Omit<Step, "open">[] };

/** W1 setup checklist slice C2 (X1): the tab each open item lands on. Before forms' official pages and people sit on
 *  Forms (P-161 (2)); a proposal ("review:<part>") and a step-level key ("<step>:problems", the Not ready items) take
 *  the tab of their step, as the board counts them. The tab headers count from this, never recount (concept §8). */
export type BadgeTab = "forms" | "documents" | "questionnaires";
const BADGE_TABS: readonly string[] = ["forms", "documents", "questionnaires"];
export const tabOfFocus = (focus: string, stepTab?: string): BadgeTab | null => {
  const [head, tail] = focus.split(/[:\s]/);
  if (head === "forms" || head === "pages" || head === "people") return "forms";
  if (head === "documents" || head === "questionnaires") return head;
  if (head === "review") return tail === "documents" ? "documents" : tail === "questions" ? "questionnaires" : tail === "forms" || tail === "people" ? "forms" : null;
  return stepTab && BADGE_TABS.includes(stepTab) ? (stepTab as BadgeTab) : null;
};
/** Open setup work per tab: the sum of each item's count (board v3: "Forms 5" = 3 forms found + 1 proposal + 1 problem). */
export function tabCounts(setup: { steps: { tab?: string; open: { focus: string; count: number }[] }[] } | null | undefined): Record<BadgeTab, number> {
  const out: Record<BadgeTab, number> = { forms: 0, documents: 0, questionnaires: 0 };
  for (const s of setup?.steps ?? []) for (const i of s.open) { const t = tabOfFocus(i.focus, s.tab); if (t) out[t] += i.count; }
  return out;
}
/** QA-184: the Review and release tab's "to fix", the problems its own step lists (the Overview's "Fix N problems" on
 *  Review and release), so the tab and the step say one number; problems on other steps count on their own tabs. */
export function reviewFixCount(setup: { steps: { key: StepKey; open: { kind: string; count: number }[] }[] } | null | undefined): number {
  return (setup?.steps.find((s) => s.key === "release")?.open ?? []).filter((i) => i.kind === "fix_problems").reduce((t, i) => t + i.count, 0);
}
/** UX-A part 1 (review m1): the steps whose open items land on each tab, in step order, so a tab's badge can say whose
 *  items it counts ("Official pages, Who can be in this application"). */
export function tabSteps(setup: { steps: { key: StepKey; tab?: string; open: { focus: string }[] }[] } | null | undefined): Record<BadgeTab, StepKey[]> {
  const out: Record<BadgeTab, StepKey[]> = { forms: [], documents: [], questionnaires: [] };
  for (const s of setup?.steps ?? []) for (const i of s.open) { const t = tabOfFocus(i.focus, s.tab); if (t && !out[t].includes(s.key)) out[t].push(s.key); }
  return out;
}
/** X1 slice C3: where an open item's link goes, one definition for the engine's `next.href` and the Overview strip.
 *  A proposal opens the review queue filtered to the combination and step (F4), AI progress the jobs page, anything
 *  else lands on its place (`?focus=`) on the tab that holds it (`tabOfFocus`; the step's own tab otherwise). */
export function itemHref(id: string, step: StepKey, stepTab: string, i: Pick<OpenItem, "kind" | "focus">): string {
  if (i.kind === "review_proposals" && i.focus.startsWith("review:")) return `/review/proposals?c=${id}&step=${STEP_KEYS.indexOf(step) + 1}`;
  if (i.kind === "view_ai") return `/c/${id}/jobs`;
  return `/c/${id}/${tabOfFocus(i.focus, stepTab) ?? stepTab}?focus=${encodeURIComponent(i.focus)}`;
}
/** QA-119: the focus keys a tab has a landing place for (an element with `data-focus` or `data-focus-also` there). The
 *  header's "Next step" takes the checklist's next item now, before forms F2; an item with no landing place yet
 *  (forms:sources, forms:lines, forms:problems, forms:held, forms:finder, the review keys) opens its tab, without a
 *  `?focus=` that nothing would answer. Add a key here when its tab draws the place. */
export const LANDED_FOCUS: readonly string[] = ["pages:record", "people:card", "documents:lines", "documents:problems", "questionnaires:problems", "questionnaires:gaps", "questions_documents:problems"];
export function nextStepHref(id: string, next: { item: Pick<OpenItem, "kind" | "focus">; step: StepKey }, stepTab: string): string {
  const h = itemHref(id, next.step, stepTab, next.item);
  return h.includes("?focus=") && !LANDED_FOCUS.includes(next.item.focus) ? h.slice(0, h.indexOf("?")) : h;
}
