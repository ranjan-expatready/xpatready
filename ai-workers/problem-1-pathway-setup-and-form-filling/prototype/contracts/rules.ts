// Domain rules the contracts cannot express in JSON Schema. Plain functions, no framework,
// so the team can lift them into its services (CountryPackDraft already carries the same ideas).
import { createHash } from "node:crypto";
import { historyGaps } from "./history.ts";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Stable JSON: object keys sorted, so the same content always hashes the same. */
export function canonical(v: Json): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Computes the key a run store looks up so that a repeated request with the same inputs, settings and
 *  prompt hash can return the stored run. Only the computation is executed here; the store lookup that
 *  prevents a second draft is planned (comparison S6/S7) and not yet proved. */
export function idempotencyKey(run: { inputs: Json; settings: Json }): string {
  return sha256(canonical({ inputs: run.inputs, settings: run.settings }));
}

export type ReleaseCheck = { ok: true } | { ok: false; reason: string };
export type Actor = { user_id: string; role: string };

/** D254 second-person rule: the pack's author or submitter can never approve or publish it, whatever
 *  their role (the Platform Owner included). No role is consulted, so no role can bypass the rule. */
export function canRelease(
  r: { author: Actor; submitter: Actor; approver: Actor; publisher?: Actor; configuration_sha256: string },
  submittedHash: string,
): ReleaseCheck {
  for (const [duty, who] of [["approver", r.approver], ["publisher", r.publisher]] as const) {
    if (!who) continue;
    if (who.user_id === r.author.user_id) return { ok: false, reason: `self-approval refused: ${duty} is the author` };
    if (who.user_id === r.submitter.user_id) return { ok: false, reason: `self-approval refused: ${duty} is the submitter` };
  }
  if (r.configuration_sha256 !== submittedHash) return { ok: false, reason: "approved hash differs from the submitted configuration" };
  return { ok: true };
}

/** A released configuration is stale when any source file it was drafted from has changed. */
export function staleSources(released: { file: string; sha256: string }[], current: Record<string, string>): string[] {
  return released.filter((s) => current[s.file] !== s.sha256).map((s) => s.file);
}

// ---------------------------------------------------------------------------------------------------
// Conditions (AIW-D264): the team's closed 11-operator vocabulary, comparisons kept apart from
// calculations. A calculated input is a named derived field; only the calculations below have a tested
// helper and are executable. Anything else is a recorded dependency, never evaluated or guessed.
// ---------------------------------------------------------------------------------------------------

export const PREDICATE_OPS = ["eq", "neq", "in", "gt", "gte", "lt", "lte", "exists", "and", "or", "not"] as const;
export type PredicateNode =
  | { op: "eq" | "neq"; field: string; value: string | number | boolean; enumSetRef?: string }
  | { op: "in"; field: string; value: (string | number | boolean)[]; enumSetRef?: string }
  | { op: "gt" | "gte" | "lt" | "lte"; field: string; value: string | number }
  | { op: "exists"; field: string }
  | { op: "and" | "or"; args: PredicateNode[] }
  | { op: "not"; arg: PredicateNode };

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
function parseDate(s: unknown): { y: number; m: number; d: number; t: number } | undefined {
  if (typeof s !== "string") return undefined;
  const m = ISO.exec(s);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return undefined; // e.g. 2023-02-29
  return { y, m: mo, d, t };
}

/** Completed years of age at the reference date: the age goes up on the anniversary of the date of birth.
 *  A person born on 29 February reaches the next age on 1 March in a year without 29 February (Assumption:
 *  the plain calendar comparison; Unconfirmed: no counsel, AIW-D94). Missing or invalid dates, or a date of
 *  birth after the reference date, give undefined: the caller reports "cannot tell", never a guess. */
export function ageInYears(dateOfBirth: unknown, referenceDate: unknown): number | undefined {
  const b = parseDate(dateOfBirth), r = parseDate(referenceDate);
  if (!b || !r || b.t > r.t) return undefined;
  const beforeBirthday = r.m < b.m || (r.m === b.m && r.d < b.d);
  return r.y - b.y - (beforeBirthday ? 1 : 0);
}

/** Whole days from the reference date to the target date (negative when the target is past). */
export function daysUntil(targetDate: unknown, referenceDate: unknown): number | undefined {
  const a = parseDate(targetDate), r = parseDate(referenceDate);
  if (!a || !r) return undefined;
  return Math.round((a.t - r.t) / 86_400_000);
}

/** Calculations with a tested helper (executable). Any other calculation is a recorded dependency.
 *  `months_uncovered_10y` (C4.4): the months of the 10 years before the reference date a period history leaves out, so a
 *  section check "history covers 10 years" stays a rule of the closed vocabulary (`gt 0`), held as data. */
export const CALCULATIONS: Record<string, (inputs: unknown[], reference: unknown) => number | undefined> = {
  age_in_years: ([dob], ref) => ageInYears(dob, ref),
  days_until: ([date], ref) => daysUntil(date, ref),
  months_uncovered_10y: ([history], ref) => { const d = parseDate(ref); return d ? historyGaps(history, ref as string, 10)?.reduce((n, g) => n + g.months, 0) : undefined; },
};

export type DerivedField = { id: string; calculation: string; inputs: string[]; reference: string };
export type Truth = true | false | "cannot_tell";

/** Evaluates a predicate over one subject's facts. Kleene logic: a leaf over a missing fact is
 *  "cannot_tell" (except `exists`, which is false), so a missing answer never passes or fails silently.
 *  Derived fields are computed first; a derived field whose calculation has no helper refuses evaluation. */
export function evaluate(tree: PredicateNode, facts: Record<string, unknown>, derived: DerivedField[] = []): { result: Truth; missing: string[] } {
  const missing = new Set<string>();
  const values: Record<string, unknown> = { ...facts };
  for (const d of derived) {
    const calc = CALCULATIONS[d.calculation];
    if (!calc) throw new Error(`derived field ${d.id}: calculation ${d.calculation} has no tested helper; not executable (AIW-D264)`);
    const v = calc(d.inputs.map((i) => facts[i]), facts[d.reference]);
    if (v === undefined) { for (const i of [...d.inputs, d.reference]) if (facts[i] === undefined || facts[i] === null || facts[i] === "") missing.add(i); if (!missing.size) missing.add(d.id); }
    else values[d.id] = v;
  }
  const has = (f: string) => values[f] !== undefined && values[f] !== null && values[f] !== "";
  const cmp = (a: unknown, b: unknown) => (typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
  const walk = (n: PredicateNode): Truth => {
    switch (n.op) {
      case "exists": return has(n.field);
      case "and": { const r = n.args.map(walk); return r.includes(false) ? false : r.includes("cannot_tell") ? "cannot_tell" : true; }
      case "or": { const r = n.args.map(walk); return r.includes(true) ? true : r.includes("cannot_tell") ? "cannot_tell" : false; }
      case "not": { const r = walk(n.arg); return r === "cannot_tell" ? r : !r; }
    }
    if (!has(n.field)) { if (!derived.some((d) => d.id === n.field)) missing.add(n.field); return "cannot_tell"; }
    const v = values[n.field];
    switch (n.op) {
      case "eq": return v === n.value;
      case "neq": return v !== n.value;
      case "in": return n.value.includes(v as never);
      case "gt": return cmp(v, n.value) > 0;
      case "gte": return cmp(v, n.value) >= 0;
      case "lt": return cmp(v, n.value) < 0;
      case "lte": return cmp(v, n.value) <= 0;
    }
  };
  return { result: walk(tree), missing: [...missing] };
}

/** Validates a root condition against the portable copy of the team's contract: subjectKind on the root
 *  only, the rest a strict node of the closed vocabulary. Returns the errors, empty when valid. */
export function validatePredicate(root: unknown, nodeValidator: (n: unknown) => boolean): string[] {
  if (!root || typeof root !== "object" || Array.isArray(root)) return ["condition is not an object"];
  const { subjectKind, ...node } = root as Record<string, unknown>;
  const errs: string[] = [];
  if (typeof subjectKind !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(subjectKind) || subjectKind.length > 64) errs.push("root needs an UPPER_SNAKE subjectKind");
  const walk = (n: any) => { if (n && typeof n === "object") { if ("subjectKind" in n) errs.push("only the root carries subjectKind"); (n.args ?? []).forEach(walk); if (n.arg) walk(n.arg); } };
  (node.args as unknown[] | undefined)?.forEach(walk); if (node.arg) walk(node.arg);
  if (!nodeValidator(node)) errs.push("not a node of the closed 11-operator vocabulary");
  return errs;
}
