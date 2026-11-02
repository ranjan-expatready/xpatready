// G4 answer-key families and runner (forms lane, C5.7; concept screens/G4-answer-keys/concept.md §6). The request
// envelopes the API parses and the web sends, and the shapes it answers. The shape only: the rules that refuse a family
// or an expected value against the item it tests (BR-1, BR-2: boxes on the map, gates in the rule set, people in the
// family) are in engine/answer-keys.ts, so the API and the tests share them (STANDARDS §6: contract first, zod).
import { z } from "zod";
import { INVISIBLE, LONE } from "./runtime.ts";

const version = z.number({ error: "Reload the page: the version you read is not a number." }).int();
const oneLine = (x: string) => !INVISIBLE.test(x) && !LONE.test(x) && !/[\t\n\r]/.test(x);
const reason = z.string({ error: "Give the reason as text." }).trim().refine((x) => [...x].length <= 300, "Keep the reason to 300 characters.").refine(oneLine, "Write the reason as one line of plain text.").optional();
const list = (what: string) => z.array(z.unknown(), { error: `Send ${what} as a list.` });

/** POST /answer-keys/families; PUT /answer-keys/families/:id adds `version` and, when a signed key uses it, `reason`. */
export const FamilyBody = z.object({
  key: z.unknown().optional(), label: z.unknown(), reference_date: z.unknown(),
  people: list("the people"), facts: list("the facts").default([]), none_apply: list("the \"none apply\" groups").default([]),
  version: version.optional(), reason,
}, { error: "Send the family as { key, label, reference_date, people, facts, none_apply }." });

/** POST /combinations/:id/answer-keys. `expected` is checked against the item by the engine (BR-2). */
export const KeyCreateBody = z.object({
  family_id: z.string({ error: "Choose the test family (its id)." }),
  item_kind: z.string({ error: "Choose what the key tests: field_map or rule_set." }),
  item_ref: z.string({ error: "Name the item: the form number, or \"eligibility\"." }),
  expected: z.record(z.string(), z.unknown(), { error: "Send the expected values as { edition?, people: { <person>: … } }." }),
});
/** PUT /answer-keys/:id. A signed key needs `reason` (BR-7). */
export const KeyUpdateBody = z.object({ expected: KeyCreateBody.shape.expected, version, reason });
/** POST /answer-keys/:id/sign: the version the expert read (BR-7). */
export const SignBody = z.object({ version });

/** What the API answers. Written out here (not imported from the engine) so the web reads no engine file; the engine's
 *  own types (engine/answer-keys.ts Line, engine/runtime/eligibility.ts Outcome and GateState) are the same shapes. */
export type Outcome = "LIKELY_ELIGIBLE" | "ELIGIBLE_BELOW_CUTOFF" | "POSSIBLY_ELIGIBLE" | "NOT_ELIGIBLE";
export type GateState = "met" | "not_met" | "not_answered";
export type Line = { person: string; person_label: string; target: string; label: string; expected: string; got: string; pass: boolean; why?: string; says?: string };
export type FamilyView = { id: string; key: string; label: string; reference_date: string; people: { id: string; role: string; label: string; applies: boolean }[];
  facts: { about: string; fact: string; row?: number | null; value: unknown }[]; none_apply: { about: string; group: string }[]; version: number; sample: string; saved_by: string | null; saved_at: string | null };
export type RunState = "NOT_RUN" | "PASSED" | "FAILED";
export type KeyView = {
  id: string; item_kind: "field_map" | "rule_set"; item_ref: string; family: { id: string; key: string; label: string };
  expected: { edition?: string; people: Record<string, Record<string, string> | { outcome: Outcome; gates?: Record<string, GateState> }> };
  version: number; state: "DRAFT" | "SIGNED"; sample: string | null; signed_by: string | null; signed_at: string | null; change_reason: string | null; saved_by: string | null; saved_at: string | null;
  run: { state: RunState; why: string; last: { result: "PASSED" | "FAILED"; passed: number; failed: number; ran_by: string | null; ran_at: string | null; lines?: Line[] } | null };
};
export type TestItem = { item_kind: "field_map" | "rule_set"; item_ref: string; label: string; edition: string | null };
export type AnswerKeysView = { combination: { id: string; label: string }; sample: string; scoring: string; items: TestItem[]; keys: KeyView[] };
export type RunView = { id: string; result: "PASSED" | "FAILED"; passed: number; failed: number; lines: Line[]; key: KeyView };
/** GET /combinations/:id/answer-keys/boxes?form=…: the Expected editor's boxes (engine/answer-keys.ts KeyBox), in the
 *  form's order. A choice box carries the form's own options; `by_a_person` boxes (signature, oath) take no value. */
export type KeyBox = { data_path: string; caption: string; meaning: string; fact: string | null; whose: string; row: number | null; options: { code: string; label: string }[]; by_a_person: boolean; by_a_person_why: string | null };
export type BoxesView = { form: string; edition: string; boxes: KeyBox[]; captions: Record<string, string> };
/** GET /answer-keys/fields: the family editor's field picker (a choice field's answer list values; null otherwise).
 *  `parts`: the value is written as parts (an address, or a phone the forms read part by part). */
export type LibraryField = { id: string; label: string; value_type: string; values: { key: string; label: string }[] | null; parts: boolean };
export type FieldsView = { fields: LibraryField[] };
