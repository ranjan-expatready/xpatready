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
export const ACTS = ["author", "sme", "approve"] as const;
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

export const Counts = z.object({
  forms: z.number().int().min(0), people: z.number().int().min(0), applicants: z.number().int().min(0), documents: z.number().int().min(0), questions: z.number().int().min(0),
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
  bar: z.object({ done: z.number().int().min(0).max(5), of: z.literal(5), text: z.string() }),
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

/** W1 setup checklist slice C2 (X1): the tab each open item lands on, from its focus key (Before forms' official pages
 *  and people sit on Forms, P-161 (2)). The tab headers count from this, never recount (concept §8: one counts object). */
export type BadgeTab = "forms" | "documents" | "questionnaires";
export const tabOfFocus = (focus: string): BadgeTab | null => {
  const head = focus.split(/[:\s]/)[0];
  return head === "forms" || head === "pages" || head === "people" ? "forms" : head === "documents" ? "documents" : head === "questionnaires" ? "questionnaires" : null;
};
/** Open items per tab, from the setup checklist's steps (an item that lands nowhere on these tabs is not counted). */
export function tabCounts(setup: { steps: { open: { focus: string }[] }[] } | null | undefined): Record<BadgeTab, number> {
  const out: Record<BadgeTab, number> = { forms: 0, documents: 0, questionnaires: 0 };
  for (const s of setup?.steps ?? []) for (const i of s.open) { const t = tabOfFocus(i.focus); if (t) out[t]++; }
  return out;
}
