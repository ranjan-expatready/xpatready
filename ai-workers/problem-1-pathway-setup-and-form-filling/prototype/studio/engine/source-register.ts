// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2 BR-1, BR-2, BR-4, BR-5, BR-6, BR-8): every number a
// release publishes, and which of them have no source entry. Pure (no database, no file, no model call): the caller
// passes the snapshot, the combination's fee lines and the stored entries. Kept outside validate() on purpose
// (challenge M1): a released snapshot is never re-judged, so this runs on the draft only, beside filingProblems.
// Wired in PR 2a: api/src/studio.ts problems() and api/src/programs.ts draftProblems (the draft only), engine/snapshot.ts
// (the entries frozen as snapshot.sources) and engine/import.ts (the sample load's own citations).
import { factName } from "./render.ts";
import { duplicateValidity, validityProblems } from "./runtime/case-checklist.ts";
import type { Change, Problem } from "./validate.ts";

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
  /** The item as validate() names it in a problem's `item` (a form number, a document's name, a rule or check id, a gate
   *  key, a question's fact, a fee line's key), so a problem routes and filters like every other (C2.12). */
  item: string;
  sourced_by?: "fee_table" | "validity_cite";
};

/** A stored source entry (the source_entry row, PR 1): exactly one answer: cited (URL, page, quote, date read), "None
 *  published" with its reason, or Sample (the demo seed's honest answer: passes only in the demo workspace, and the
 *  release that freezes it is a Demo release; tech lead's condition on Decision 1, #558; reviewer MJ-1 on #569). */
export type SourceEntry = {
  kind: string; key: string; address: string; value: string | number;
  cited?: { url: string; page?: string | null; quote: string; date: string } | null;
  none_published?: { reason: string } | null;
  sample?: boolean;
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

/** Who wrote the sample load's own entries (created_by; chip "From the sample load"): the same id as api/src/lifecycle.ts
 *  SAMPLE_CREATOR, never a person (challenge m7). */
export const SAMPLE_LOADER = "sample-inputs";
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
const FIELD_CODE = /\b(?:person|case|relationship|organisation|representative)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*\b/g;
/** An item in words as the refusal leads with it ("<item>: …"): its own text without a closing full stop, any field code
 *  in it said by its short name (QA-82: never a field code on the main path; a rule's "then" may name one). */
const itemText = (x: unknown) => text(x).replace(FIELD_CODE, (k) => factName(k)).replace(/\.$/, "");
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
  const add = (kind: NumberKind, key: string, where: Where, item: string, item_words: string, tree: unknown, hintRoot: string) => {
    for (const n of conditionNumbers(tree, dates)) out.push({ kind, key: `${combo}/${key}`, address: n.address, value: n.value, where, item, item_words, words: n.words, hint: `${hintRoot}.${n.hint}` });
  };
  (s.forms ?? []).forEach((f, i) => {
    const words = `Form ${f.form_number}`;
    add("rule", `form:${f.form_number}`, "Forms", f.form_number, words, f.condition, `forms[${i}]`);
    if (typeof f.min_age === "number" && f.min_age > 0) out.push({ kind: "threshold", key: `${combo}/form:${f.form_number}`, address: "min_age", value: canonicalValue(f.min_age), where: "Forms", item: f.form_number, item_words: words, words: `From age: ${canonicalValue(f.min_age)}`, hint: `forms[${i}].min_age` });
  });
  (s.document_requirements ?? []).forEach((d, i) => add("rule", `doc:${d.lineage ?? d.document_type_key ?? d.document_type ?? i}`, "Documents", text(d.document_type) || text(d.document_type_key) || String(d.lineage ?? i), text(d.document_type) || text(d.document_type_key), d.condition, `document_requirements[${i}]`));
  (s.placements ?? []).forEach((p, i) => add("rule", `question:${p.lineage ?? p.fact ?? i}`, "Questions", p.fact ?? String(p.lineage ?? i), text(p.question_text) || (p.fact ? factName(p.fact) : ""), p.condition, `placements[${i}]`));
  (s.rules ?? []).forEach((r, i) => add("rule", r.id, "Rules", r.id, itemText(r.then) || r.id, r.when, `rules[${i}]`));
  // C6.4: a document validity rule is not a field comparison; its months are its number, and a usable rule (with its
  // own quote, page, https address and date read) already cites them (BR-4, challenge m5).
  const fields = new Set((s.canonical_fields ?? []).map((f) => f.id)), types = new Set((s.document_types ?? []).map((t) => t.key));
  const checkRows = (s.checks ?? []).map((c) => ({ id: c.id, group: c.group ?? "", applies_to: c.applies_to ?? null, condition: c.condition, message: c.message ?? null, source_quote: c.source_quote ?? null }));
  const twice = new Set(duplicateValidity(checkRows));
  checkRows.forEach((c, i) => {
    const words = itemText(c.message) || c.id;
    if (c.group !== "document_validity") return add("check", c.id, "Checks", c.id, words, c.condition, `checks[${i}]`);
    const months = isObj(c.condition) ? c.condition.months : undefined;
    if (typeof months !== "number" || !Number.isFinite(months) || months === 0) return;
    // Tech lead's decision 4 on #558 (build note 10): a usable rule counts as cited only when its own quote holds its
    // months in digits, so a rule moved from 6 to 12 months whose quote still says 6 is listed again.
    const usable = validityProblems(c, (f) => fields.has(f), types).length === 0 && !(c.applies_to && twice.has(c.applies_to)) && statesInDigits(c.source_quote, canonicalValue(months));
    out.push({ kind: "check", key: `${combo}/${c.id}`, address: "months", value: canonicalValue(months), where: "Checks", item: c.id, item_words: words, words: `Issued within months: at most ${canonicalValue(months)}`, hint: `checks[${i}].condition.months`, ...(usable ? { sourced_by: "validity_cite" as const } : {}) });
  });
  (s.eligibility?.gates ?? []).forEach((g, i) => add("rule", `gate:${g.key}`, "Eligibility", g.key, text(g.label) || g.key, g.condition, `eligibility.gates[${i}]`));
  // BR-4: fee lines carry their own source in the fee table. They follow the filing modes of "Who can be in this
  // application", so a fee problem routes to that step (challenge m4: "Fees" is not a where).
  for (const l of opts.feeLines ?? []) {
    const fee = (address: string, v: unknown, src: FeeSourceLike, label: string) => {
      if (typeof v !== "number" || !Number.isFinite(v) || v === 0) return;
      const value = canonicalValue(v);
      out.push({ kind: "fee", key: `${combo}/fee:${l.key}`, address, value, where: "People", item: l.key, item_words: text(l.label) || l.key, words: `${label}: ${value}`, hint: `fee:${l.key}.${address}`, ...(feeSourced(src) ? { sourced_by: "fee_table" as const } : {}) });
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
/** §5 copy, one place: the whole sentence (problemWords() gives it from a problem: its label, then its message). */
export const NO_SOURCE = (item: string, words: string) => `${item}: ${NO_SOURCE_TAIL(words)}`;
export const CHANGED = (item: string, was: string, now: string) => `${item}: ${CHANGED_TAIL(was, now)}`;
export const SAMPLE_ONLY = (item: string, words: string) => `${item}: ${SAMPLE_TAIL(words)}`;
const NO_SOURCE_TAIL = (words: string) => `${words} has no source entry. Add the official source, or mark ${NONE}.`;
const CHANGED_TAIL = (was: string, now: string) => `the source was written for ${was}; the number is now ${now}. Check the source again, or mark ${NONE}.`;
/** The tech lead's condition on Decision 1 (#558): a Sample entry is refused outside the demo workspace, said so. */
const SAMPLE_TAIL = (words: string) => `${words} has only a Sample source, which passes only in the demo workspace as a Demo release. Add the official source, or mark ${NONE}.`;

/** Where a number stands (§6 GET …/sources `state`; "sample" is the tech lead's Sample entry). */
export type NumberState = "missing" | "cited" | "none_published" | "sample" | "changed" | "fee_table" | "validity_cite";
export type SourceProblem = Problem & { level: "error"; kind: NumberKind; key: string; address: string; value: string; state: "missing" | "changed" | "sample" };
const answered = (e: SourceEntry) => !!(e.cited && text(e.cited.url) && text(e.cited.quote) && text(e.cited.date)) || text(e.none_published?.reason).length >= 10;
const sampleOnly = (e: SourceEntry) => !!e.sample && !answered(e);
export const entryKey = (x: { kind: string; key: string; address: string }) => `${x.kind}\u0000${x.key}\u0000${x.address}`;

/** One number's state against its entry. `demo`: the workspace is the demo workspace, where a Sample entry passes. A
 *  record that cites its own number (BR-4) wins over an older register entry (Devin on #558). */
export function numberState(n: PublishedNumber, e: SourceEntry | undefined, demo = false): { state: NumberState; passes: boolean; was?: string } {
  if (n.sourced_by) return { state: n.sourced_by, passes: true };
  if (!e || (!answered(e) && !e.sample)) return { state: "missing", passes: false };
  const was = canonicalValue(e.value);
  if (was !== n.value) return { state: "changed", passes: false, was };
  if (sampleOnly(e)) return { state: "sample", passes: demo };
  return { state: e.cited && text(e.cited.url) ? "cited" : "none_published", passes: true };
}

/** BR-6, BR-8: each published number with no entry, whose entry was written for another value, or (outside the demo
 *  workspace) whose only answer is Sample, is an error naming the item and the number. `message` is the sentence after
 *  the item's words (`label`), so problemWords() reads §5's sentence. Every problem is listed, never only the first. */
export function sourceProblems(numbers: PublishedNumber[], entries: SourceEntry[], opts: { demo?: boolean } = {}): SourceProblem[] {
  const by = new Map(entries.map((e) => [entryKey(e), e]));
  const out: SourceProblem[] = [];
  for (const n of numbers) {
    const st = numberState(n, by.get(entryKey(n)), !!opts.demo);
    if (st.passes) continue;
    const base = { level: "error" as const, where: n.where, item: n.item, label: n.item_words, kind: n.kind, key: n.key, address: n.address, value: n.value };
    if (st.state === "changed") out.push({ ...base, state: "changed", message: CHANGED_TAIL(st.was!, n.value) });
    else if (st.state === "sample") out.push({ ...base, state: "sample", message: SAMPLE_TAIL(n.words) });
    else out.push({ ...base, state: "missing", message: NO_SOURCE_TAIL(n.words) });
  }
  return out;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Whether a quote states a value in digits (M4 scaffolding; decision 4): a number as its own digits ("18 years", not
 *  "180" or "eighteen"), a date as IRCC writes it with its day and year in digits ("November 1, 2024", "1 November
 *  2024") or as its ISO text. */
export function statesInDigits(quote: unknown, value: string): boolean {
  const q = text(quote);
  if (!q || !value) return false;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [y, m, d] = [iso[1], MONTHS[Number(iso[2]) - 1], String(Number(iso[3]))];
    return q.includes(value) || new RegExp(`\\b${m}\\s+${d},?\\s+${y}\\b`).test(q) || new RegExp(`\\b${d}\\s+${m},?\\s+${y}\\b`).test(q);
  }
  return new RegExp(`(?<![\\d.,])${value.replace(/\./g, "\\.")}(?![\\d]|[.,]\\d)`).test(q);
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** A whole number from 1 to 99 in English words ("five", "ninety", "twenty-one"); null outside that range. */
function inWords(value: string): string | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  return n < 20 ? ONES[n] : n % 10 ? `${TENS[Math.floor(n / 10)]}[- ]${ONES[n % 10]}` : TENS[n / 10];
}
/** Devin on #587 (BR-3, concept §5 "Copy the words that state the number"): whether a citation's words state this
 *  number, in digits (as statesInDigits) or, for a whole number from 1 to 99, in English words ("five years", "ninety
 *  days", "twenty-one"), which IRCC often writes. A quote for another number never sources this one. */
export function statesValue(quote: unknown, value: string): boolean {
  if (statesInDigits(quote, value)) return true;
  const w = inWords(value);
  if (!w) return false;
  // Devin on #587: the whole written number, never part of a bigger one: "twenty-one" never states 20, "five hundred"
  // or "twenty-five" never state 5 (no number word joined before or after it by a hyphen or a space). "and" joins a
  // compound only after hundred/thousand/million ("one hundred and five"); in a range ("between two and five years")
  // it separates two numbers, so the five there is stated.
  const NUM = `(?:${[...ONES.slice(1), ...TENS.slice(2), "hundred", "thousand", "million"].join("|")})`;
  return new RegExp(`(?<!\\b${NUM}[-\\s]+)(?<!\\b(?:hundred|thousand|million)\\s+and\\s+)\\b${w}\\b(?![-\\s]+${NUM}\\b)`, "i").test(text(quote));
}

/** BR-9: the entries frozen with a snapshot: those that answer a number it publishes, in one canonical shape and order
 *  (no version, no who or when: bookkeeping), so the fingerprint moves only when a source does. */
export type FrozenSource = { kind: string; key: string; address: string; value: string; url?: string; page?: string; quote?: string; date?: string; none_published?: string; sample?: true };
export function frozenSources(numbers: PublishedNumber[], entries: SourceEntry[]): FrozenSource[] {
  const used = new Set(numbers.map(entryKey));
  return entries.filter((e) => used.has(entryKey(e))).map((e): FrozenSource => ({
    kind: e.kind, key: e.key, address: e.address, value: canonicalValue(e.value),
    ...(e.cited ? { url: e.cited.url, ...(text(e.cited.page) ? { page: text(e.cited.page) } : {}), quote: e.cited.quote, date: canonicalValue(e.cited.date) } : {}),
    ...(e.none_published ? { none_published: e.none_published.reason } : {}),
    ...(e.sample ? { sample: true as const } : {}),
  })).sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
}
/** A frozen source read back as an entry (the gate reads the draft's own snapshot.sources). */
export const entryOf = (f: FrozenSource): SourceEntry => ({ kind: f.kind, key: f.key, address: f.address, value: f.value,
  cited: f.url ? { url: f.url, page: f.page ?? null, quote: f.quote ?? "", date: f.date ?? "" } : null, none_published: f.none_published ? { reason: f.none_published } : null, sample: !!f.sample });

/** BR-9: the "Source" lines of a change summary (validate.ts diff()): one per entry added, changed or removed between
 *  two frozen copies, in words (the item, the number, the answer), each for the immigration expert to sign. */
/** Two frozen sources hold the same answer, whatever their key order (a release's snapshot comes back from jsonb with
 *  its keys reordered). */
const SOURCE_FIELDS = ["kind", "key", "address", "value", "url", "page", "quote", "date", "none_published", "sample"] as const;
const sameSource = (a: FrozenSource, b: FrozenSource) => SOURCE_FIELDS.every((k) => (a[k] ?? null) === (b[k] ?? null));
export function sourceChanges(prev: { sources?: FrozenSource[] } & WalkedSnapshot | null, next: { sources?: FrozenSource[] } & WalkedSnapshot): Change[] {
  const a = new Map((prev?.sources ?? []).map((x) => [entryKey(x), x])), b = new Map((next.sources ?? []).map((x) => [entryKey(x), x]));
  if (!a.size && !b.size) return [];
  const words = new Map<string, PublishedNumber>();
  for (const s of [prev, next]) if (s) for (const n of publishedNumbers(s)) words.set(entryKey(n), n);
  const answer = (x: FrozenSource) => (x.url ? `Official source${x.page ? ` (${x.page})` : ""}` : x.none_published ? "None published – set by ExpatReady" : "Sample");
  const line = (x: FrozenSource) => { const n = words.get(entryKey(x)); return `${n ? `${n.item_words}: ${n.words}` : `${x.key} ${x.address}: ${x.value}`}: ${answer(x)}`; };
  const ref = (x: FrozenSource) => `${x.key}|${x.address}`;
  const out: Change[] = [];
  for (const [k, x] of b) {
    const was = a.get(k);
    if (!was) out.push({ kind: "Source", key: ref(x), change: "added", needs_sme: true, label: line(x) });
    else if (sameSource(was, x) === false) out.push({ kind: "Source", key: ref(x), change: "changed", needs_sme: true, label: line(x) });
  }
  for (const [k, x] of a) if (!b.has(k)) out.push({ kind: "Source", key: ref(x), change: "removed", needs_sme: true, label: line(x) });
  return out;
}
