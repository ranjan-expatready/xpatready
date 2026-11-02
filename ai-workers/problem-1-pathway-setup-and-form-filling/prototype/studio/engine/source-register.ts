// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2 BR-1, BR-2, BR-4, BR-5, BR-6, BR-8): every number a
// release publishes, and which of them have no source entry. Pure (no database, no file, no model call): the caller
// passes the snapshot, the combination's fee lines and the stored entries. Kept outside validate() on purpose
// (challenge M1): a released snapshot is never re-judged, so this runs on the draft only, beside filingProblems.
// Not wired into the API or the release path yet (the source_entry table waits for the tech lead, PR 1).
import { factName } from "./render.ts";
import { duplicateValidity, validityProblems } from "./runtime/case-checklist.ts";
import type { Problem } from "./validate.ts";

/** The agreed kinds of the source register (tech lead, PR #469). A form-line, document-line, question or gate
 *  condition is a `rule`; "From age" is a `threshold`; a fee line is a `fee`. */
export type NumberKind = "rule" | "check" | "threshold" | "fee";
/** Where an item lives: a `where` WHERE_STEP already routes (engine/setup-checklist.ts). */
type Where = "Forms" | "Documents" | "Questions" | "Rules" | "Checks" | "Eligibility" | "People";

/** One published number. `key` carries the combination (rule keys like R-01 repeat across combinations, import.ts:104);
 *  `address` is by meaning (BR-2): `<field>|<op>|<k>` = the k-th leaf with that field and operator in the item's
 *  condition, or `min_age`, `months`, or a fee field. `value` is canonical (BR-5). `hint` is the JSON path, for display
 *  and debugging only (never matched). `sourced_by`: a record that already cites it (BR-4), so no entry is needed. */
export type PublishedNumber = {
  kind: NumberKind; key: string; address: string; value: string; where: Where; item_words: string; words: string; hint: string;
  sourced_by?: "fee_table" | "validity_cite";
};

/** A stored source entry (the source_entry row, PR 1): cited (URL, page, quote, date read) or "None published". */
export type SourceEntry = {
  kind: string; key: string; address: string; value: string | number;
  cited?: { url: string; page?: string | null; quote: string; date: string } | null;
  none_published?: { reason: string } | boolean | null;
};

/** A fee line as samples/fee-table.json holds it (engine/runtime/filings.ts TableLine), read loosely: a line may be a
 *  fixture with its source missing. */
type FeeSourceLike = { page?: unknown; url?: unknown; quote?: unknown; read?: unknown } | null | undefined;
export type FeeLineInput = {
  key: string; label: string; per_person_cad?: number;
  family_max?: { cad?: number; from_people?: number } | null;
  exempt?: { under_age?: number; over_age?: number; source?: FeeSourceLike } | null;
  source?: FeeSourceLike;
};

type Node = { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown; subjectKind?: string };
type Line = { condition?: unknown };
/** What the walk reads from a snapshot (engine/snapshot.ts Snapshot fits it). */
export type WalkedSnapshot = {
  combination: { key: string };
  forms?: (Line & { form_number: string; min_age?: number | null })[];
  document_requirements?: (Line & { lineage?: string; document_type?: string; document_type_key?: string })[];
  placements?: (Line & { lineage?: string; fact?: string; question_text?: string | null })[];
  rules?: { id: string; when?: unknown; then?: string | null }[];
  checks?: (Line & { id: string; group?: string; applies_to?: string | null; message?: string | null; source_quote?: string | null })[];
  eligibility?: { gates?: { key: string; label?: string; condition?: unknown }[] } | null;
  canonical_fields?: { id: string }[];
  document_types?: { key: string }[];
};
export type PublishedOptions = {
  /** Cut-off and in-force dates count as published numbers (founder, P-279, 2 Nov): on unless a caller turns them off. */
  dates?: boolean;
  /** The combination's fee lines (samples/fee-table.json until R2 S7a puts fees in the release). */
  feeLines?: FeeLineInput[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const COMPARED = new Set(["eq", "neq", "gt", "gte", "lt", "lte"]);

/** BR-5: one canonical text per value, so 13757 and "13757.0" are equal: `String(Number(x))` for a number, the ISO date
 *  text for a date. Anything else is its own text. */
export function canonicalValue(x: unknown): string {
  if (typeof x === "number") return String(Number(x));
  if (typeof x === "string") {
    const t = x.trim();
    if (ISO_DATE.test(t.slice(0, 10)) && (t.length === 10 || t[10] === "T")) return t.slice(0, 10);
    if (t !== "" && Number.isFinite(Number(t))) return String(Number(t));
    return t;
  }
  return String(x);
}

const NUMBER_OP: Record<string, string> = { gte: "at least", gt: "more than", lte: "at most", lt: "less than", eq: "exactly", neq: "not" };
const DATE_OP: Record<string, string> = { gte: "on or after", gt: "after", lte: "on or before", lt: "before", eq: "on", neq: "not on" };
/** §4 (m6): a number in words, never a field code: the field's short name (QA-82, engine/render.ts factName), the
 *  operator in words and the value, e.g. "Age years: at least 18". */
export const numberWords = (field: string, op: string, value: string, isDate: boolean) =>
  `${field ? factName(field) : field}: ${(isDate ? DATE_OP : NUMBER_OP)[op] ?? op} ${value}`;

const text = (x: unknown) => (typeof x === "string" ? x.trim() : "");
/** An item in words as the refusal leads with it ("<item>: …"): its own text without a closing full stop. */
const itemText = (x: unknown) => text(x).replace(/\.$/, "");
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** BR-1, BR-2: the published numbers in one item's condition. Every leaf comparing a field with a number (eq, neq, gt,
 *  gte, lt, lte) counts, except 0 ("already passed", "none"), booleans and answer-list codes; a date counts only with
 *  `dates`. The k in the address counts every leaf with the same field and operator, in reading order, whatever its
 *  value, so a clause added elsewhere in the tree leaves the address as it was. */
const ORDERED = new Set(["gt", "gte", "lt", "lte"]);
function conditionNumbers(tree: unknown, dates: boolean): { address: string; value: string; words: string; hint: string }[] {
  const out: { address: string; value: string; words: string; hint: string }[] = [];
  const seen = new Map<string, number>();
  const walk = (n: unknown, path: string) => {
    if (!isObj(n)) return;
    const x = n as Node;
    if (x.field && x.op && COMPARED.has(x.op)) {
      const k = `${x.field}|${x.op}`, nth = (seen.get(k) ?? 0) + 1;
      seen.set(k, nth);
      const v = x.value;
      // Review MJ-1 on #558: the predicate contract allows text on gt/gte/lt/lte and the save check does not test value
      // types, so "18" on gte is a published number too; text on eq/neq stays an answer code.
      const numericText = ORDERED.has(x.op) && typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) !== 0 && !ISO_DATE.test(v.trim());
      const isNumber = (typeof v === "number" && Number.isFinite(v) && v !== 0) || numericText;
      const isDate = dates && typeof v === "string" && ISO_DATE.test(v);
      if (isNumber || isDate) {
        const value = canonicalValue(v);
        out.push({ address: `${k}|${nth}`, value, words: numberWords(x.field, x.op, value, isDate), hint: `${path}.value` });
      }
    }
    if (Array.isArray(x.args)) x.args.forEach((a, i) => walk(a, `${path}.args[${i}]`));
    if (x.arg) walk(x.arg, `${path}.arg`);
  };
  walk(tree, "condition");
  return out;
}

/** A fee line's source counts when it has a page, an address, IRCC's words and the date read (BR-4; CI's own test is
 *  tests/check_r2_fee_table.ts). */
const feeSourced = (s: FeeSourceLike) => !!s && ["page", "url", "quote", "read"].every((k) => text((s as Record<string, unknown>)[k]).length > 0);

/** BR-1: every number the release publishes, walking every condition the snapshot carries (forms, document lines,
 *  question placements, rules, checks, eligibility gates), plus each form's "From age", each document validity rule's
 *  months and the combination's fee lines. Left out: field-map box conditions and limits (how a box is filled, not who
 *  files), UI numbers, versions, positions and copies. */
export function publishedNumbers(s: WalkedSnapshot, opts: PublishedOptions = {}): PublishedNumber[] {
  const dates = opts.dates !== false, combo = s.combination.key, out: PublishedNumber[] = [];
  const add = (kind: NumberKind, key: string, where: Where, item_words: string, tree: unknown, hintRoot: string) => {
    for (const n of conditionNumbers(tree, dates)) out.push({ kind, key: `${combo}/${key}`, address: n.address, value: n.value, where, item_words, words: n.words, hint: `${hintRoot}.${n.hint}` });
  };
  (s.forms ?? []).forEach((f, i) => {
    const words = `Form ${f.form_number}`;
    add("rule", `form:${f.form_number}`, "Forms", words, f.condition, `forms[${i}]`);
    if (typeof f.min_age === "number" && f.min_age > 0) out.push({ kind: "threshold", key: `${combo}/form:${f.form_number}`, address: "min_age", value: canonicalValue(f.min_age), where: "Forms", item_words: words, words: `From age: ${canonicalValue(f.min_age)}`, hint: `forms[${i}].min_age` });
  });
  (s.document_requirements ?? []).forEach((d, i) => add("rule", `doc:${d.lineage ?? d.document_type_key ?? d.document_type ?? i}`, "Documents", text(d.document_type) || text(d.document_type_key), d.condition, `document_requirements[${i}]`));
  (s.placements ?? []).forEach((p, i) => add("rule", `question:${p.lineage ?? p.fact ?? i}`, "Questions", text(p.question_text) || (p.fact ? factName(p.fact) : ""), p.condition, `placements[${i}]`));
  (s.rules ?? []).forEach((r, i) => add("rule", r.id, "Rules", itemText(r.then) || r.id, r.when, `rules[${i}]`));
  // C6.4: a document validity rule is not a field comparison; its months are its number, and a usable rule (with its
  // own quote, page, https address and date read) already cites them (BR-4, challenge m5).
  const fields = new Set((s.canonical_fields ?? []).map((f) => f.id)), types = new Set((s.document_types ?? []).map((t) => t.key));
  const checkRows = (s.checks ?? []).map((c) => ({ id: c.id, group: c.group ?? "", applies_to: c.applies_to ?? null, condition: c.condition, message: c.message ?? null, source_quote: c.source_quote ?? null }));
  const twice = new Set(duplicateValidity(checkRows));
  checkRows.forEach((c, i) => {
    const words = itemText(c.message) || c.id;
    if (c.group !== "document_validity") return add("check", c.id, "Checks", words, c.condition, `checks[${i}]`);
    const months = isObj(c.condition) ? c.condition.months : undefined;
    if (typeof months !== "number" || !Number.isFinite(months) || months === 0) return;
    const usable = validityProblems(c, (f) => fields.has(f), types).length === 0 && !(c.applies_to && twice.has(c.applies_to));
    out.push({ kind: "check", key: `${combo}/${c.id}`, address: "months", value: canonicalValue(months), where: "Checks", item_words: words, words: `Issued within months: at most ${canonicalValue(months)}`, hint: `checks[${i}].condition.months`, ...(usable ? { sourced_by: "validity_cite" as const } : {}) });
  });
  (s.eligibility?.gates ?? []).forEach((g, i) => add("rule", `gate:${g.key}`, "Eligibility", text(g.label) || g.key, g.condition, `eligibility.gates[${i}]`));
  // BR-4: fee lines carry their own source in the fee table. They follow the filing modes of "Who can be in this
  // application", so a fee problem routes to that step (challenge m4: "Fees" is not a where).
  for (const l of opts.feeLines ?? []) {
    const fee = (address: string, v: unknown, src: FeeSourceLike, label: string) => {
      if (typeof v !== "number" || !Number.isFinite(v) || v === 0) return;
      const value = canonicalValue(v);
      out.push({ kind: "fee", key: `${combo}/fee:${l.key}`, address, value, where: "People", item_words: text(l.label) || l.key, words: `${label}: ${value}`, hint: `fee:${l.key}.${address}`, ...(feeSourced(src) ? { sourced_by: "fee_table" as const } : {}) });
    };
    fee("per_person_cad", l.per_person_cad, l.source, "Per person (CAD)");
    fee("family_max.cad", l.family_max?.cad, l.source, "Family maximum (CAD)");
    fee("family_max.from_people", l.family_max?.from_people, l.source, "Family maximum from (people)");
    fee("exempt.under_age", l.exempt?.under_age, l.exempt?.source, "None under age");
    fee("exempt.over_age", l.exempt?.over_age, l.exempt?.source, "None over age");
  }
  return out;
}

const NONE = "'None published – set by ExpatReady'";
/** §5 copy, one place. */
export const NO_SOURCE = (item: string, words: string) => `${item}: ${words} has no source entry. Add the official source, or mark ${NONE}.`;
export const CHANGED = (item: string, was: string, now: string) => `${item}: the source was written for ${was}; the number is now ${now}. Check the source again, or mark ${NONE}.`;

export type SourceProblem = Problem & { level: "error"; kind: NumberKind; key: string; address: string; state: "missing" | "changed" };
const answered = (e: SourceEntry) => !!(e.cited && text(e.cited.url) && text(e.cited.quote) && text(e.cited.date)) || !!e.none_published;

/** BR-6, BR-8: each published number with no entry, or whose entry was written for another value, is an error naming
 *  the item and the number. A number a record already cites (a fee line with its source, a usable validity rule) needs
 *  no entry (BR-4). Every problem is listed, never only the first. */
export function sourceProblems(numbers: PublishedNumber[], entries: SourceEntry[]): SourceProblem[] {
  const by = new Map(entries.map((e) => [`${e.kind}\u0000${e.key}\u0000${e.address}`, e]));
  const out: SourceProblem[] = [];
  for (const n of numbers) {
    const e = by.get(`${n.kind}\u0000${n.key}\u0000${n.address}`);
    const base = { level: "error" as const, where: n.where, item: n.key, label: n.item_words, kind: n.kind, key: n.key, address: n.address };
    // A record that cites its own number (BR-4) wins over an older register entry (Devin on #558: a validity rule that
    // gained its citation and new months stayed refused by its stale entry).
    if (n.sourced_by) continue;
    if (e && answered(e)) {
      const was = canonicalValue(e.value);
      if (was !== n.value) out.push({ ...base, state: "changed", message: CHANGED(n.item_words, was, n.value) });
      continue;
    }
    out.push({ ...base, state: "missing", message: NO_SOURCE(n.item_words, n.words) });
  }
  return out;
}
