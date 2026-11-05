// C6.9 part 1 (M3-D, concept screens/C6.9/concept.md §3 BR-1…BR-6): eligibility gates as data on a combination's draft,
// frozen into its release as snapshot.eligibility. Pure: the checks a save runs (BR-2, BR-2a), what the snapshot
// carries (BR-1, BR-6), the release check (BR-5) and the change-summary lines (BR-4). Nothing about any program is
// written here; the runs that read the gates (the stand-in adapter, SI-1) come in part 2 (engine/runtime/eligibility.ts).
import { canonical } from "../../contracts/rules.ts";
import { INVISIBLE, LONE } from "../contracts/runtime.ts";
import { checkCondition } from "./validate.ts";

/** `whenNotMet` (P-230 (1), BACKLOG R4): what a gate not met means, as data. Absent: Not eligible (the default).
 *  "needs_review": the representative reviews it, so the result is Possibly eligible, never Not eligible (the background
 *  question: rehabilitation, record suspension and a temporary resident permit exist). Stored only when set, so the
 *  releases made before it keep their fingerprints. */
export type WhenNotMet = "not_eligible" | "needs_review";
export type Gate = { key: string; label: string; condition: Record<string, unknown>; whenNotMet?: "needs_review" };
/** What the combination row stores (combination.eligibility). `disclaimer` null: the Sample default goes into the release. */
export type StoredEligibility = { gates: Gate[]; judgement: string[]; disclaimer: string | null; version: number; by: string; at: string };
/** What a release carries (snapshot.eligibility), frozen with it. */
export type SnapshotEligibility = { gates: Gate[]; judgement: string[]; disclaimer: string };
export type FieldError = { field: string; message: string };

/** BR-6 default, Sample (ASSUMPTIONS C8; Unconfirmed: no counsel). Q1 taken as recommended: the disclaimer lives on the
 *  release, set and reviewed with the gates (concept §9 Q1, the tech lead's approval on #391). */
export const DEFAULT_DISCLAIMER = "Indicative only. This check compares the answers on file with this application's rules as at the date shown. It is not a guarantee of approval: an IRCC officer decides, including on money, health, ties and leaving Canada.";
export const JUDGEMENT_MAX = 120, DISCLAIMER_MIN = 21, DISCLAIMER_MAX = 2000, LABEL_MAX = 160, DEPTH_MAX = 20, KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
export const PER_PERSON = "Eligibility is checked per person";

/** Lengths in characters (code points), not UTF-16 units: an emoji is one character (break report m6). */
const chars = (x: string) => [...x].length;
/** Break report m1, m5: one line of printable text, the same rule as the runtime contract's typed text (NUL and other
 *  controls, zero-width marks, bidi overrides, lone surrogates refused), plus no line break or tab in a one-line text. */
const unclean = (x: string, oneLine: boolean) => INVISIBLE.test(x) || LONE.test(x) || (oneLine && /[\t\n\r]/.test(x));
/** Empty once invisible characters and lone combining marks are set aside: no letter and no digit (break report m5). */
const blank = (x: string) => !/[\p{L}\p{N}]/u.test(x);
/** Two labels or lines that read the same: case, spacing and Unicode form ignored (break report m6). */
const same = (x: string) => x.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** How deep a condition goes, without recursion (a 1000-deep body overflowed ajv's stack: break report m2). */
function depthOf(root: unknown): number {
  let max = 0;
  const stack: [unknown, number][] = [[root, 1]];
  while (stack.length) {
    const [n, d] = stack.pop()!;
    if (!n || typeof n !== "object") continue;
    max = Math.max(max, d);
    if (d > DEPTH_MAX) return d;
    const o = n as { args?: unknown; arg?: unknown };
    if (Array.isArray(o.args)) for (const a of o.args) stack.push([a, d + 1]);
    if (o.arg) stack.push([o.arg, d + 1]);
  }
  return max;
}

/** The value a fact of this type can equal, in words, or null when `v` fits (break report M1 (b)): `evaluate` compares
 *  with ===, so a yes/no fact never equals the text "false". Derived values are numbers (contracts/rules.ts CALCULATIONS). */
function misfit(type: string | undefined, v: unknown): string | null {
  if (type === "yes_no" || type === "declaration") return typeof v === "boolean" ? null : "true or false";
  if (type === "number" || type === "derived") return typeof v === "number" && Number.isFinite(v) ? null : "a number";
  if (type === "date") return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "a date written YYYY-MM-DD";
  return typeof v === "string" ? null : "text";
}
export const TYPE_WORDS: Record<string, string> = { yes_no: "a yes/no question", declaration: "a yes/no declaration", number: "a number", derived: "a worked-out number", date: "a date" };

/** Break report M1 (b), (c) and m1 inside a condition: each compared value fits its fact's type, no text value carries
 *  invisible characters, and an "and" never asks one fact to equal two different values. What is not caught: a
 *  contradiction across "or"/"not", ranges that cannot meet (gt 5 and lt 3), and an answer-list code that is not on the
 *  fact's list (the list is checked by nobody yet at save). */
export function valueProblems(tree: unknown, fieldTypes: Map<string, string>, derived: Set<string>): string[] {
  const out: string[] = [];
  const typeOf = (f: string) => fieldTypes.get(f) ?? (derived.has(f) ? "derived" : undefined);
  const stack: unknown[] = [tree];
  while (stack.length) {
    const n = stack.pop() as { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown } | null;
    if (!n || typeof n !== "object") continue;
    if (n.field && ["eq", "neq", "in", "gt", "gte", "lt", "lte"].includes(n.op ?? "")) {
      const t = typeOf(n.field);
      const values = n.op === "in" && Array.isArray(n.value) ? n.value : [n.value];
      for (const v of values) {
        if (typeof v === "string" && unclean(v, true)) out.push(`compares ${n.field} with a text holding control or invisible characters`);
        else if (t) { const want = misfit(t, v); if (want) out.push(`compares ${n.field} with ${JSON.stringify(v)}, but it is ${TYPE_WORDS[t] ?? "a text question"}: use ${want}`); }
      }
    }
    if (n.op === "and" && Array.isArray(n.args)) {
      const eqs = new Map<string, string>();
      for (const a of n.args as { op?: string; field?: string; value?: unknown }[]) if (a?.op === "eq" && a.field) {
        const v = canonical(a.value as never);
        if (eqs.has(a.field) && eqs.get(a.field) !== v) out.push(`asks ${a.field} to be both ${eqs.get(a.field)} and ${v}, so it can never be true`);
        eqs.set(a.field, v);
      }
    }
    if (Array.isArray(n.args)) stack.push(...n.args);
    if (n.arg) stack.push(n.arg);
  }
  return [...new Set(out)];
}

/** One line of text for a label or a judgement line: the refusal in words, or null. */
function lineProblem(x: string, what: string, max: number): string | null {
  if (unclean(x, true)) return `Remove the control or invisible characters (or line breaks) from the ${what}.`;
  if (!x || blank(x)) return null; // the caller says it is empty
  if (chars(x) > max) return `Keep the ${what} to ${max} characters.`;
  return null;
}

/** BR-2, BR-2a: the gates, judgement lines and disclaimer a save may store, or the refusals on their fields. A condition
 *  with no root subjectKind is stored with PERSON and only then checked (contracts/rules.ts validatePredicate needs a
 *  root kind); another root kind is refused. `fieldTypes`/`derived` are the library's live fields and derived keys. */
export function checkGates(input: { gates: { key?: unknown; label?: unknown; condition?: unknown; whenNotMet?: unknown }[]; judgement: unknown[]; disclaimer?: unknown }, fieldTypes: Map<string, string>, derived: Set<string>): { gates: Gate[]; judgement: string[]; disclaimer: string | null; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const seen = new Set<string>(), labels = new Map<string, number>();
  const gates: Gate[] = input.gates.map((g, i) => {
    const key = typeof g.key === "string" ? g.key.trim() : "", label = typeof g.label === "string" ? g.label.trim() : "";
    if (!key) errors.push({ field: `gates.${i}.key`, message: "Give the gate a key, such as vv.travel_document." });
    else if (!KEY_PATTERN.test(key) || key.length > 80) errors.push({ field: `gates.${i}.key`, message: `"${key}" is not a gate key: lower-case words joined by dots or underscores, at most 80 characters.` });
    else if (seen.has(key)) errors.push({ field: `gates.${i}.key`, message: `Two gates share the key ${key}: give each gate its own.` });
    seen.add(key);
    const lp = lineProblem(label, "label", LABEL_MAX);
    if (lp) errors.push({ field: `gates.${i}.label`, message: lp });
    else if (!label || blank(label)) errors.push({ field: `gates.${i}.label`, message: "Give the gate a label: what a person reads beside its result." });
    else if (labels.has(same(label))) errors.push({ field: `gates.${i}.label`, message: `Gate ${labels.get(same(label))! + 1} already reads "${label}": give each gate its own label, so a person can tell them apart.` });
    else labels.set(same(label), i);
    // P-230 (1): "when not met" is data; only the two words are taken, and the default is not stored.
    if (g.whenNotMet !== undefined && g.whenNotMet !== null && g.whenNotMet !== "not_eligible" && g.whenNotMet !== "needs_review") errors.push({ field: `gates.${i}.whenNotMet`, message: 'When a gate is not met it means "not_eligible" (the default) or "needs_review" (the representative reviews it).' });
    const review = g.whenNotMet === "needs_review" ? { whenNotMet: "needs_review" as const } : {};
    const raw = g.condition;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw) || !Object.keys(raw).length) {
      errors.push({ field: `gates.${i}.condition`, message: "A gate needs a rule the answers on file can settle. Anything only an officer can weigh goes under Officer's judgement." });
      return { key, label, condition: {} };
    }
    const given = raw as Record<string, unknown>;
    if (depthOf(given) > DEPTH_MAX) {
      errors.push({ field: `gates.${i}.condition`, message: `The rule is nested too deep: at most ${DEPTH_MAX} levels.` });
      return { key, label, condition: {} };
    }
    if (given.subjectKind !== undefined && given.subjectKind !== "PERSON") {
      errors.push({ field: `gates.${i}.condition`, message: `${PER_PERSON}: this rule is about ${String(given.subjectKind).toLowerCase()}, not each person.` });
      return { key, label, condition: given };
    }
    const condition = { ...given, subjectKind: "PERSON" }; // BR-2a
    const ruleErrors = checkCondition(condition, fieldTypes, derived);
    for (const e of ruleErrors.length ? ruleErrors : valueProblems(condition, fieldTypes, derived)) errors.push({ field: `gates.${i}.condition`, message: `The rule ${e}.` });
    return { key, label, condition, ...review };
  });
  const lines = new Map<string, number>();
  const judgement = input.judgement.map((l, i) => {
    const line = typeof l === "string" ? l.trim() : "";
    const lp = lineProblem(line, "officer's judgement line", JUDGEMENT_MAX);
    if (lp) errors.push({ field: `judgement.${i}`, message: lp });
    else if (!line || blank(line)) errors.push({ field: `judgement.${i}`, message: "An officer's judgement line cannot be empty." });
    else if (lines.has(same(line))) errors.push({ field: `judgement.${i}`, message: `Line ${lines.get(same(line))! + 1} already says "${line}".` });
    else lines.set(same(line), i);
    return line;
  });
  let disclaimer: string | null = null;
  if (input.disclaimer != null) {
    disclaimer = typeof input.disclaimer === "string" ? input.disclaimer.trim() : "";
    if (unclean(disclaimer, false)) errors.push({ field: "disclaimer", message: "Remove the control or invisible characters from the disclaimer." });
    else if (chars(disclaimer) < DISCLAIMER_MIN || blank(disclaimer)) errors.push({ field: "disclaimer", message: `A disclaimer needs more than ${DISCLAIMER_MIN - 1} characters; leave it out to use the default.` });
    else if (chars(disclaimer) > DISCLAIMER_MAX) errors.push({ field: "disclaimer", message: `Keep the disclaimer to ${DISCLAIMER_MAX} characters.` });
    // A release carries a disclaimer only with gates or judgement lines (snapshotEligibility), so one alone is refused
    // here rather than stored and then dropped without a word (review minor 5).
    else if (!gates.length && !judgement.length) errors.push({ field: "disclaimer", message: "A disclaimer goes with eligibility gates: add a gate or an officer's judgement line, or leave the disclaimer out." });
  }
  return { gates, judgement, disclaimer, errors };
}

/** A condition in words, with its values, for the change summary (break report M1: the expert sees what is signed). */
export function conditionWords(n: unknown): string {
  const x = n as { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown } | null;
  if (!x || typeof x !== "object") return "";
  const v = (y: unknown) => (typeof y === "string" ? `"${y}"` : JSON.stringify(y));
  const ops: Record<string, string> = { gt: ">", gte: "≥", lt: "<", lte: "≤" };
  switch (x.op) {
    case "exists": return `${x.field} is answered`;
    case "eq": return `${x.field} is ${v(x.value)}`;
    case "neq": return `${x.field} is not ${v(x.value)}`;
    case "in": return `${x.field} is one of ${(Array.isArray(x.value) ? x.value : []).map(v).join(", ")}`;
    case "and": case "or": return (x.args ?? []).map((a) => { const w = conditionWords(a); return /^(.+ (and|or) .+)$/.test(w) ? `(${w})` : w; }).join(` ${x.op} `);
    case "not": return `not (${conditionWords(x.arg)})`;
    default: return x.op && x.field ? `${x.field} ${ops[x.op] ?? x.op} ${v(x.value)}` : "";
  }
}
/** P-230 (1): the change summary says when a gate not met only asks for the representative's review. */
const whenWords = (g: Gate) => (g.whenNotMet === "needs_review" ? " — when not met: the representative reviews it (never Not eligible)" : "");
const shortWords = (c: unknown) => { const w = conditionWords(c); return w.length > 300 ? `${w.slice(0, 297)}…` : w; };

/** BR-1, BR-6: what a release carries, or nothing when no gate and no judgement line is set (so a combination without
 *  them keeps its snapshot and fingerprint). The disclaimer is the one saved, or the Sample default. */
export function snapshotEligibility(stored: unknown): SnapshotEligibility | undefined {
  const e = stored as Partial<StoredEligibility> | null | undefined;
  if (!e || (!(e.gates ?? []).length && !(e.judgement ?? []).length)) return undefined;
  return { gates: (e.gates ?? []).map((g) => ({ key: g.key, label: g.label, condition: g.condition, ...(g.whenNotMet === "needs_review" ? { whenNotMet: g.whenNotMet } : {}) })), judgement: [...(e.judgement ?? [])], disclaimer: e.disclaimer ?? DEFAULT_DISCLAIMER };
}

/** The facts a set of gates reads, in gate order, once each. */
export function gateFacts(e: Pick<SnapshotEligibility, "gates"> | undefined): string[] {
  return [...new Set((e?.gates ?? []).flatMap((g) => [...JSON.stringify(g.condition).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1])))];
}

/** BR-5 (and BR-2 again at release, since the library may have changed): a gate's rule is still valid, and every fact
 *  it reads is one a case of this application actually asks, i.e. placed and read by a form box or a rule (P-62).
 *  `words` names a fact by its meaning. */
export type GatePlacement = { fact: string; condition?: unknown; condition_effect?: string | null; condition_plain?: string | null };
export function gateProblems(e: SnapshotEligibility | undefined, placed: Set<string>, read: Set<string>, fieldTypes: Map<string, string>, derived: Set<string>, words: (fact: string) => string, placements: GatePlacement[] = []) {
  const out: { level: "error"; where: "Eligibility"; item: string; message: string }[] = [];
  // The placement a case uses for a fact: the first one (engine/render.ts place).
  const asked = new Map<string, GatePlacement>(); for (const p of placements) if (!asked.has(p.fact)) asked.set(p.fact, p);
  for (const g of e?.gates ?? []) {
    const ruleErrors = checkCondition(g.condition, fieldTypes, derived);
    for (const x of ruleErrors.length ? ruleErrors : valueProblems(g.condition, fieldTypes, derived)) out.push({ level: "error", where: "Eligibility", item: g.key, message: `"${g.label}": the rule ${x}.` });
    for (const f of gateFacts({ gates: [g] })) {
      // Only a plain asked fact can settle a gate: a derived (worked-out) value is never asked of anyone, so it is refused
      // too (review Major on 5120b6f2; allowing derived gates whose inputs are asked would be a later, separate choice).
      if (derived.has(f) && !fieldTypes.has(f)) out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, a value worked out from other answers, not one a case is asked ("${g.label}"). A gate reads only answers to this application's questions: use the question it is worked out from, or change the gate.` });
      else if (fieldTypes.has(f) && !(placed.has(f) && read.has(f))) out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, which no case of this application is asked ("${g.label}"). Ask it in this application's questionnaire for a form field or rule that reads it, or change the gate.` });
      // Break report M1 (a): a gate fact is asked of every traveller and must be answered. A question shown only under a
      // condition (or hidden by one), or optional, leaves the gate waiting for ever for some people.
      else if (fieldTypes.has(f)) {
        const p = asked.get(f);
        if (p?.condition) out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, which is asked only when "${p.condition_plain ?? "its condition"}" (${p.condition_effect === "HIDE" ? "hidden otherwise" : p.condition_effect === "OPTIONAL" ? "optional then" : p.condition_effect === "REQUIRE" ? "required only then" : "shown only then"}), so for some travellers it is never answered ("${g.label}"). A gate needs a question every traveller is asked and must answer: change the gate, or the question's condition.` });
        else if (p?.condition_effect === "OPTIONAL" || p?.condition_effect === "HIDE") out.push({ level: "error", where: "Eligibility", item: g.key, message: `This gate reads ${words(f)}, which is ${p.condition_effect === "HIDE" ? "hidden" : "optional"} in this application's questionnaire, so a traveller may never answer it ("${g.label}"). A gate needs a question every traveller is asked and must answer.` });
      }
      // A fact in neither list is already named by checkCondition above ("not in the library").
    }
  }
  return out;
}

/** BR-4: one change-summary line per gate added, changed or removed, plus one for the officer's judgement and one for
 *  the disclaimer; kind "Eligibility", each needing the immigration expert's sign-off. */
export function eligibilityChanges(prev: SnapshotEligibility | undefined, next: SnapshotEligibility | undefined) {
  const out: { kind: "Eligibility"; key: string; change: "added" | "changed" | "removed"; needs_sme: true; label: string }[] = [];
  const line = (key: string, change: "added" | "changed" | "removed", label: string) => out.push({ kind: "Eligibility", key, change, needs_sme: true, label });
  const a = new Map((prev?.gates ?? []).map((g) => [g.key, g])), b = new Map((next?.gates ?? []).map((g) => [g.key, g]));
  for (const [k, g] of b) {
    const was = a.get(k);
    if (!was) { line(k, "added", `Gate: ${g.label} — rule: ${shortWords(g.condition)}${whenWords(g)}`); continue; }
    if (canonical(was as never) === canonical(g as never)) continue;
    // Review minor 7 and break report M1: the SME sees the old label and, when the rule changed, the rule in words with
    // its values, before and after.
    const rule = canonical(was.condition as never) !== canonical(g.condition as never);
    const when = (was.whenNotMet ?? null) !== (g.whenNotMet ?? null);
    line(k, "changed", `Gate: ${was.label === g.label ? g.label : `${was.label} → ${g.label}`}${rule ? ` (rule changed: ${shortWords(g.condition)}; was: ${shortWords(was.condition)})` : ""}${when ? ` (when not met: ${g.whenNotMet === "needs_review" ? "the representative reviews it" : "not eligible"}; was: ${was.whenNotMet === "needs_review" ? "the representative reviews it" : "not eligible"})` : ""}`);
  }
  // Break report m4: gate order is content (missing facts are listed in gate order), so a reorder is reviewed.
  const keptA = [...a.keys()].filter((k) => b.has(k)), keptB = [...b.keys()].filter((k) => a.has(k));
  if (keptA.join("|") !== keptB.join("|")) line("gate_order", "changed", `Gates reordered: ${(next?.gates ?? []).map((g) => g.label).join(" · ")}`);
  for (const [k, g] of a) if (!b.has(k)) line(k, "removed", `Gate: ${g.label}`);
  const ja = prev?.judgement ?? [], jb = next?.judgement ?? [];
  if (canonical(ja) !== canonical(jb)) line("officers_judgement", !ja.length ? "added" : !jb.length ? "removed" : "changed", jb.length ? `Officer's judgement, not checked by rules: ${jb.join("; ")}` : "Officer's judgement: no lines");
  const da = prev?.disclaimer ?? null, db = next?.disclaimer ?? null;
  if (da !== db) line("disclaimer", da === null ? "added" : db === null ? "removed" : "changed", db ? `Disclaimer: ${db}` : "Disclaimer: none");
  return out;
}
