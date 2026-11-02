// G-CORE (P-253, concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): one guarded change pipeline.
// The shapes a change set, its check result and its preview take, shared by the engine (engine/change-set.ts), the API
// (api/src/change-sets.ts) and the web. Held (P-251): "create" by hand and the co-pilot's drafting have a shape here so
// they plug in later; no endpoint accepts them.
import { z } from "zod";

const Key = z.string().trim().min(1).max(200);
const Name = z.string().trim();
/** Where a new item or a meaning change comes from (P-252 (3), P-170): a form box, an official page with its quote, or
 *  "set by ExpatReady" with a reason. */
export const Source = z.object({ kind: z.enum(["form_box", "official_page", "expatready", "ai_run"]), ref: z.string().trim().min(1).max(500), quote: z.string().max(1000).nullish() });

export const ChangeItem = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), kind: z.enum(["field", "section"]), key: Key, name: Name }),
  z.object({ action: z.literal("alias"), kind: z.literal("field"), key: Key, alias: Name }),
  z.object({ action: z.literal("merge"), kind: z.literal("field"), key: Key, into: Key }),
  /** A condition put on (or changed on) one target: a question, a form line, a document line, a rule or a check. */
  z.object({ action: z.literal("set_condition"), kind: z.literal("condition"), key: Key, target: z.enum(["question", "form_line", "document_line", "rule", "check"]), tree: z.unknown() }),
  /** A new library item an AI proposal (P-121 rounds) brings, accepted by a person. */
  z.object({ action: z.literal("accept_proposal"), kind: z.enum(["field", "section", "answer_list", "document_type"]), key: Key, name: Name, valueType: z.string().nullish(), answerListKey: z.string().nullish(), values: z.array(z.string()).nullish(), proves: z.string().nullish(), aliases: z.array(z.string()).default([]), source: Source.nullish(), reason: z.string().nullish() }),
  /** Held (P-251, P-252 (3)): a new item made by hand. The type exists for the seam; the API answers 410. */
  z.object({ action: z.literal("create"), kind: z.enum(["field", "section", "answer_list", "document_type"]), key: Key, name: Name, source: Source.nullish(), reason: z.string().nullish() }),
]);
export type ChangeItem = z.infer<typeof ChangeItem>;

/** Who made it (P-253 step 7): a person, the AI, or the AI's item a person edited before accepting. "ai_draft" is the
 *  held co-pilot (L-SA11). */
export const MadeBy = z.enum(["person", "ai", "ai_edited", "ai_draft"]);
export type MadeBy = z.infer<typeof MadeBy>;
export const ChangeSetBody = z.object({ items: z.array(ChangeItem).min(1).max(50), expected: z.string().nullish() });
export type ChangeSetBody = z.infer<typeof ChangeSetBody>;

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";
export type CheckProblem = { rule: RuleId; item: number; message: string };
export type Tier = "direct" | "second_person";
export type TierResult = { tier: Tier; expert_at_release: boolean; words: string; why: string[] };
export type PreviewItem = {
  item: number; kind: string; key: string; name: string | null; before: string | null; after: string | null;
  sections: { key: string; title: string }[]; forms: string[];
  rules: { kind: string; key: string; combination: string }[];
  combinations: { id: string; label: string }[];
  releases: { combination: string; version: number }[];
  open_cases: { combination: string; release: number | null; cases: number }[];
};
export type CheckResult = { ok: boolean; problems: CheckProblem[]; not_checked: string[]; tier: TierResult; preview: PreviewItem[]; fingerprint: string };
export const NOT_CHECKED = ["Ranges that can never meet (more than 5 and less than 3)", "Contradictions across \"or\" and \"not\"", "Coverage gaps (an answer no rule covers)"];
