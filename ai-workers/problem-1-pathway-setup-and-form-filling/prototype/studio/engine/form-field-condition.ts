// B86 (QA-237, C4.11; concept BR-1b, BR-2, BR-5): a form field that holds its question's condition, in a form the rule can
// read. A person says its words say the same as the condition, and a second person approves (api/src/form-field-condition.ts).
// The words themselves are never parsed into a condition. Every condition stays Sample until the immigration expert confirms it.
// Pure: no database, no AI.
import type { Snapshot } from "./snapshot.ts";
import { bareCond } from "./validate.ts";

type Placement = { fact: string; condition?: unknown; condition_effect?: string | null };
type Entry = { data_path: string; fact?: string | null; outcome?: string; condition_rule?: unknown };
type FieldMap = { form_number: string; form_edition?: string; entries: Entry[] };

/** A question's own condition when it is shown only under it (a SHOW condition); null for any other. */
export function showCondition(placements: Placement[], fact: string): unknown {
  const p = placements.find((x) => x.fact === fact);
  return p?.condition && typeof p.condition === "object" && (p.condition_effect ?? "SHOW") === "SHOW" ? p.condition : null;
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
 *  "only when Yes" (BR-2). The two spellings are the saved maps' own. */
export const isWorkedOutYesNo = (transform: string | null | undefined) => /^derive/i.test(transform ?? "") && /y\/n|yes_no|\by if\b/i.test(transform ?? "");

/** Why a form field holding a rule is not written, in the deciding question's words (never its field code). */
export function notNeededWords(c: { applies: unknown; missing: string[] }, rule: unknown, words: (fact: string) => string): string {
  const missing = c.missing.find((m) => !m.startsWith("("));
  if (c.applies !== false) return missing ? `Waiting for "${words(missing)}"` : "Waiting for its deciding answer";
  const r = rule as { op?: string; field?: unknown; value?: unknown };
  if (r?.op === "eq" && typeof r.field === "string" && r.value === true) return `Not needed: "${words(r.field)}" is No`;
  if (r?.op === "eq" && typeof r.field === "string" && r.value === false) return `Not needed: "${words(r.field)}" is Yes`;
  return "Not needed: its condition is not met";
}

/** BR (no field codes, PRODUCT §4): a form field's words as a person reads them. Only an identifier-shaped token (a capital
 *  inside a word: `natIDIndicator`) is touched: matching exactly one data-path segment of this edition, it reads as that
 *  form field's question; otherwise "another form field". Never its caption: a form's inventory can carry a wrong one.
 *  A worked-out Yes/No reading the target itself is "another form field" too. Plain words stay as they are. */
export function plainWords(words: string, entries: Entry[], labelOf: (fact: string) => string, target?: string): { text: string; names: string[] } {
  const names: string[] = [];
  const text = words.replace(/\b[a-z]*[a-z0-9][A-Z][A-Za-z0-9]*\b|\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/g, (tok) => {
    const hit = entries.filter((e) => e.outcome === "mapped" && e.fact && e.fact !== target && e.data_path.split(".").some((seg) => seg.replace(/\[\d+\]$/, "") === tok));
    const facts = [...new Set(hit.map((e) => e.fact!))];
    if (facts.length !== 1) return "another form field";
    names.push(facts[0]);
    return `"${labelOf(facts[0])}"`;
  });
  return { text, names };
}
