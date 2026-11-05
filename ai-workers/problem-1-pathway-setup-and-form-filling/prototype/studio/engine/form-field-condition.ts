// B86 (QA-237, C4.11; concept BR-1b, BR-2, BR-5): a form field that holds its question's condition, in a form the rule can
// read. A person says its words say the same as the condition, and a second person approves (api/src/form-field-condition.ts).
// The words themselves are never parsed into a condition. Every condition stays Sample until the immigration expert confirms it.
// Pure: no database, no AI.
import type { Snapshot } from "./snapshot.ts";
import { bareCond } from "./validate.ts";
import { recordedDerivation } from "../../p5/transforms.ts";

type Placement = { fact: string; condition?: unknown; condition_effect?: string | null };
type Entry = { data_path: string; fact?: string | null; outcome?: string; condition_rule?: unknown };
type FieldMap = { form_number: string; form_edition?: string; entries: Entry[] };

/** A question's own condition when it is shown only under it (a SHOW condition); null for any other. */
export function showCondition(placements: Placement[], fact: string): unknown {
  // As the rule: every placement of the question with a condition counts, so an unconditioned twin never hides one.
  const conditioned = placements.filter((x) => x.fact === fact && x.condition && typeof x.condition === "object");
  return conditioned.length && conditioned.every((p) => (p.condition_effect ?? "SHOW") === "SHOW") ? conditioned[0].condition : null;
}

/** BR-1b: a form field's rule counts only while it equals its question's own SHOW condition. Otherwise (a rejected card, a
 *  condition removed or changed since) the box behaves as if it held none, so nothing can blank an answer unseen. */
export function ruleInForce(placements: Placement[], fact: string | null | undefined, rule: unknown): boolean {
  if (!fact || !rule) return false;
  const own = showCondition(placements, fact);
  return !!own && bareCond(own) === bareCond(rule);
}

/** The rules in force on one form edition, by form field. */
export function rulesInForce(s: Snapshot, form: string, edition: string | null | undefined): Map<string, unknown> {
  const map = (s.field_maps as FieldMap[]).find((m) => m.form_number === form && m.form_edition === edition);
  const placements = s.placements as Placement[];
  return new Map((map?.entries ?? []).filter((e) => e.outcome === "mapped" && ruleInForce(placements, e.fact, e.condition_rule)).map((e) => [e.data_path, e.condition_rule]));
}

/** A Yes/No form field worked out from other answers: it must write No when the answer is No, so it can never be filled
 *  "only when Yes" (BR-2). The executor's own reading (api/src/own-question.ts), or the other spelling in the saved maps. */
export const isWorkedOutYesNo = (transform: string | null | undefined) => (!!recordedDerivation(transform) && /\byes_no_code\b/.test(transform ?? "")) || (/^derive/i.test(transform ?? "") && /y\/n|yes_no|\by if\b/i.test(transform ?? ""));

/** Why a form field holding a rule is not written, in the deciding question's words (never its field code). */
export function notNeededWords(c: { applies: unknown; missing: string[] }, rule: unknown, words: (fact: string) => string): string {
  const missing = c.missing.find((m) => !m.startsWith("("));
  if (c.applies !== false) return missing ? `Waiting for "${words(missing)}"` : "Waiting for its deciding answer";
  const r = rule as { op?: string; field?: unknown; value?: unknown };
  if (r?.op === "eq" && typeof r.field === "string" && r.value === true) return `Not needed: "${words(r.field)}" is No`;
  if (r?.op === "eq" && typeof r.field === "string" && r.value === false) return `Not needed: "${words(r.field)}" is Yes`;
  return "Not needed: its condition is not met";
}

/** The condition as the rest of a sentence ("filled only when …"), in the deciding question's words. */
export function whenWords(tree: unknown, words: (fact: string) => string): string | null {
  const r = tree as { op?: string; field?: unknown; value?: unknown } | null;
  if (r?.op !== "eq" || typeof r.field !== "string") return null;
  return `"${words(r.field)}" is ${r.value === true ? "Yes" : r.value === false ? "No" : `"${String(r.value)}"`}`;
}

/** BR (no field codes, PRODUCT §4): a form field's words as a person reads them. Only an identifier-shaped token (a capital
 *  inside a word: `natIDIndicator`, `PCRIndicator`; snake_case; a dotted key; a path or a name with its row, `uncompensated[0]`) is touched: matching
 *  exactly one data-path segment of this edition, it reads as that form field's question; otherwise "another form field".
 *  Never its caption: a form's inventory can carry a wrong one.
 *  A worked-out Yes/No reading the target itself is "another form field" too. Plain words stay as they are. */
export function plainWords(words: string, entries: Entry[], labelOf: (fact: string) => string, target?: string): { text: string; names: string[] } {
  const names: string[] = [];
  const text = words.replace(/\b\w+\[\d+\](?:\.\w+(?:\[\d+\])?)*|\b[a-z_]+\.[a-z_.]*[a-z_]\b|\b[a-z]+(?:_[a-z0-9]+)+\b|\b(?:[a-z]*[a-z0-9][A-Z][A-Za-z0-9]*|[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*|[A-Z]{2,}[a-z]{2,}[A-Za-z0-9]*|Row\d+)\b/g, (raw) => {
    const tok = raw.split(".").pop()!.replace(/(\[\d+\])+$/, "");
    const hit = entries.filter((e) => e.outcome === "mapped" && e.fact && e.fact !== target && e.data_path.split(".").some((seg) => seg.replace(/\[\d+\]$/, "") === tok));
    const facts = [...new Set(hit.map((e) => e.fact!))];
    if (facts.length !== 1) return "another form field";
    names.push(facts[0]);
    return `"${labelOf(facts[0])}"`;
  });
  return { text, names };
}
