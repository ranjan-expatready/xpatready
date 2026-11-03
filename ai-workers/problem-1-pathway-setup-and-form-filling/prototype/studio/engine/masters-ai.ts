// C3.4 AI step (P-149 (5), P-158, P-134, P-227; forms lane): the rules that hold over the two AI rounds that draft a form
// edition's checks and document types (p2/prompts/masters-form.v2.md) and a combination guide's checks
// (masters-guide.v2.md), whoever proposed them (P-153: code is the guard, the prompt is not). Pure: no database, no AI.
// The step runner (api/src/rounds.ts) gives the rounds' answers (a draft and a blind checker, live or a saved real run).
//   M1 the quote is the source's own words: found in the form's printed captions and headings, or a sentence of the guide;
//   M2 a check is a condition tree in the 11 operators (contracts/rules.ts) that reads only its own boxes or answers; a
//      form check's boxes are visible boxes of this edition, and a value it compares a choice box with is one of that
//      box's printed choices, written in its printed words (P-296 (3));
//   M3 every check carries two or three worked examples that parse; each is run through the condition (evaluate) and one
//      that gives another outcome than the AI said makes the check "Check", with the example named;
//   M4 Ready only when both rounds give the same item (same boxes or answers and the same tree; a document type by name);
//      the same boxes with another tree is "Check" with both readings; one round only is "Decide";
//   M5 an identity document is never read by AI (P-134): its reader is coded lines, printed layout or a person;
//   M6 a guide check whose answers are not all questions of the library, that needs a calculation, or that needs an
//      immigration value the guide does not state is "Decide", with the reason.
// Sections and answer lists stay rules only (P-158: from the form's parts and its boxes' printed choices; form-masters.ts).
// Every item is Sample until the immigration expert confirms it (AGENTS rule 4); examples wait for the expert (P-149 (5)).
import { createHash } from "node:crypto";
import { canonical, evaluate, validatePredicate, type PredicateNode } from "../../contracts/rules.ts";
import type { ProposalItem, ProposalPayload } from "../contracts/proposal-item.ts";
import { isSentence, sameText } from "./pqr-picks.ts";
import { isNode } from "./validate.ts";

export const MASTERS_FORM_STEP = "masters_form", MASTERS_GUIDE_STEP = "masters_guide";
type Example = { facts_json: string; expected: boolean };
type Unresolved = { passage: string; reason: string };
export type FormCheckDraft = { sentence: string; reads: string[]; subject_kind: string; tree_json: string; quote: string; examples: Example[] };
export type DocTypeDraft = { name: string; proves: string; category: string; supplies: string[]; reader: string; identity_document: boolean; quote: string };
export type FormAnswer = { checks: FormCheckDraft[]; document_types: DocTypeDraft[]; unresolved: Unresolved[] };
export type GuideCheckDraft = { group: string; sentence: string; reads: string[]; subject_kind: string; tree_json: string; severity: string; needs_calculation: string | null; quote: string; examples: Example[] };
export type GuideAnswer = { checks: GuideCheckDraft[]; unresolved: Unresolved[] };
export type MRound<T> = { output: T; from: "live" | "replay"; runFile: string; costUsd: number };
export type NewItem = Omit<ProposalItem, "id" | "status" | "decision"> & { work?: unknown };
export type Dropped = { item: string; why: string };

const str = (x: unknown) => typeof x === "string";
const strs = (x: unknown) => Array.isArray(x) && x.every(str);
const examplesOk = (x: unknown) => Array.isArray(x) && x.every((e) => e && str(e.facts_json) && typeof e.expected === "boolean");
const unresolvedOk = (x: unknown) => Array.isArray(x) && x.every((u) => u && str(u.passage) && str(u.reason));
export const formShapeOk = (o: unknown): o is FormAnswer => {
  const x = o as FormAnswer;
  return !!x && Array.isArray(x.checks) && Array.isArray(x.document_types) && unresolvedOk(x.unresolved)
    && x.checks.every((c) => c && str(c.sentence) && strs(c.reads) && str(c.subject_kind) && str(c.tree_json) && str(c.quote) && examplesOk(c.examples))
    && x.document_types.every((d) => d && str(d.name) && str(d.proves) && str(d.category) && strs(d.supplies) && str(d.reader) && typeof d.identity_document === "boolean" && str(d.quote));
};
export const guideShapeOk = (o: unknown): o is GuideAnswer => {
  const x = o as GuideAnswer;
  return !!x && Array.isArray(x.checks) && unresolvedOk(x.unresolved)
    && x.checks.every((c) => c && str(c.group) && str(c.sentence) && strs(c.reads) && str(c.subject_kind) && str(c.tree_json) && str(c.severity) && (c.needs_calculation === null || str(c.needs_calculation)) && str(c.quote) && examplesOk(c.examples));
};

/** "Passport expiry date" → "passport_expiry_date" (the guide prompt's field names). */
export const snake = (s: string) => s.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
const plain = (s: string) => sameText(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** A key within the contract's 300 characters (a long one is named by a hash, as listIdentity does). */
const keyOf = (s: string) => (s.length <= 300 ? s : `${s.slice(0, 200)}#${createHash("sha256").update(s).digest("hex").slice(0, 40)}`);
const ROLE_WORDS: Record<string, string> = { PRINCIPAL: "the person applying", SPOUSE: "the spouse or partner", DEPENDENT: "each child", EACH_APPLICANT: "each person applying" };

/** The fields a condition reads (leaves only). */
/** A condition node read loosely (an AI's tree before it is checked against the contract). */
type Loose = { field?: unknown; args?: unknown; arg?: unknown; [k: string]: unknown };
const looseOf = (x: unknown): Loose | null => (x && typeof x === "object" && !Array.isArray(x) ? (x as Loose) : null);
export function fieldsOf(n: unknown): string[] {
  const out: string[] = [];
  const walk = (x: unknown) => { const o = looseOf(x); if (!o) return; if (typeof o.field === "string") out.push(o.field); if (Array.isArray(o.args)) o.args.forEach(walk); if (o.arg) walk(o.arg); };
  walk(n);
  return [...new Set(out)];
}
/** Rewrites a condition's fields (and leaves the rest as it is). */
function renamed<T>(n: T, to: (f: string) => string): T {
  const o = looseOf(n);
  if (!o) return n;
  return { ...o, ...(typeof o.field === "string" ? { field: to(o.field) } : {}), ...(Array.isArray(o.args) ? { args: o.args.map((a) => renamed(a, to)) } : {}), ...(o.arg ? { arg: renamed(o.arg, to) } : {}) } as T;
}

type Tree = { root: Record<string, unknown>; node: PredicateNode };
/** M2: the tree as the contract wants it (subjectKind on the root, a strict node of the 11 operators), or why not. */
export function treeOf(treeJson: string, subjectKind: string, allowed: Set<string>): Tree | { why: string } {
  let node: unknown; try { node = JSON.parse(treeJson); } catch { return { why: "its condition is not readable" }; }
  if (!node || typeof node !== "object" || Array.isArray(node)) return { why: "its condition is not a condition" };
  const { subjectKind: _ignored, ...bare } = node as Record<string, unknown>;
  const root = { subjectKind, ...bare };
  const errs = validatePredicate(root, isNode);
  if (errs.length) return { why: `its condition is not in the 11 operators (${errs[0]})` };
  const outside = fieldsOf(bare).filter((f) => !allowed.has(f));
  if (outside.length) return { why: `its condition reads ${outside.slice(0, 2).join(", ")}, which it does not name among what it reads` };
  if (!fieldsOf(bare).length) return { why: "its condition reads nothing" };
  return { root, node: bare as unknown as PredicateNode };
}

type Ran = { examples: { facts: Record<string, unknown>; expected: boolean; confirmedBy: null }[]; wrong: string | null } | { why: string };
/** M3: two or three examples that parse, each run through the condition; the first that gives another outcome is named. */
export function runExamples(t: Tree, examples: Example[], to: (f: string) => string = (f) => f): Ran {
  const parsed: { facts: Record<string, unknown>; expected: boolean; confirmedBy: null }[] = [];
  for (const e of examples) {
    let f: unknown; try { f = JSON.parse(e.facts_json); } catch { continue; }
    if (!f || typeof f !== "object" || Array.isArray(f)) continue;
    const facts = Object.fromEntries(Object.entries(f as Record<string, unknown>).map(([k, v]) => [to(k).slice(0, 120), v]));
    parsed.push({ facts, expected: e.expected, confirmedBy: null });
  }
  if (parsed.length < 2) return { why: "it has fewer than two worked examples a person can check (P-149 (5))" };
  const kept = parsed.slice(0, 3);
  // Break B5: one passing and one failing example, both holding, so a check that is always true or never true is never Ready.
  if (!kept.some((e) => e.expected) || !kept.some((e) => !e.expected)) return { why: "its examples do not show both a passing and a failing case, so a person cannot see the check work (P-149 (5))" };
  let wrong: string | null = null;
  kept.forEach((e, i) => {
    if (wrong) return;
    const r = evaluate(t.node, e.facts).result;
    if (r !== e.expected) wrong = `Example ${i + 1} gives ${r === "cannot_tell" ? "\"cannot tell\" (an answer is missing)" : r ? "pass" : "fail"} by its condition, but the AI said ${e.expected ? "pass" : "fail"}: check the condition or the example.`;
  });
  return { examples: kept, wrong };
}

type Kept<P> = { key: string; same: string; payload: P; quote: string; reading: string; rules: { rule: string; passed: boolean; why: string | null }[]; problem: string | null; work: Record<string, unknown> };

/** M4: the two rounds' items into queue items, one per identity: Ready when both agree, Check when they differ, Decide when
 *  one round only (or a rule asks a person), with both readings kept. */
function merge<P extends ProposalPayload>(d: Map<string, Kept<P>>, k: Map<string, Kept<P>>, rounds: { draft: MRound<unknown>; check: MRound<unknown> },
  base: Pick<NewItem, "runId" | "step" | "scope" | "landsOn" | "kind">, source: (quote: string) => NonNullable<NewItem["source"]>, name: (p: P) => string): NewItem[] {
  const out: NewItem[] = [];
  const reading = (r: MRound<unknown>, x: Kept<P>) => ({ reading: x.reading.slice(0, 300), payload: x.payload, from: r.from, runFile: r.runFile, costUsd: r.costUsd });
  for (const key of [...new Set([...d.keys(), ...k.keys()])]) {
    const a = d.get(key), b = k.get(key), x = (a ?? b)!;
    const both = !!a && !!b, same = both && a.same === b.same;
    const problem = a?.problem ?? b?.problem ?? null;
    const agreement = !both ? "one_round" : same ? "agreed" : "differ";
    const confidence = !both ? "decide" : problem && /^Decide/.test(problem) ? "decide" : !same || problem ? "check" : "ready";
    const reason = !both ? `Only the ${a ? "first" : "second"} reading proposed "${name(x.payload)}"; the other did not. Decide: keep it or remove it.${problem ? ` ${problem}` : ""}`
      : !same ? `The two readings differ on "${name(x.payload)}": compare both and keep the right one.${problem ? ` ${problem}` : ""}` : problem;
    out.push({ ...base, reuse: { match: "new", existingKey: null }, payload: x.payload, source: source(x.quote),
      rounds: { draft: a ? reading(rounds.draft, a) : null, check: b ? reading(rounds.check, b) : null }, rules: x.rules, agreement, confidence,
      reason: reason?.slice(0, 500) ?? null, origin: "ai", identity: { key, near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE", work: x.work });
  }
  return out;
}

const READERS = ["coded_lines", "printed_layout", "letter_or_record", "person_only"] as const;
type Reader = (typeof READERS)[number];
const NOT_AI: string[] = ["coded_lines", "printed_layout", "person_only"];

export type FormSource = { file: string; sha256: string; edition: string; printed: string;
  /** Visible boxes of this edition (hidden, barcode and machine boxes left out by the caller) with their printed words and,
   *  for a box with choices, each choice as printed: [words, export code]. */
  boxes: { path: string; words: string; choices?: [string, string][] | "check_box" }[] };

/** P-296 (3), review M1 and break M1 on the v2 prompts: the value a check compares a choice box with is one of that box's
 *  printed choices (P-153: code is the guard, not the prompt). A reading may write the printed words, a spacing variant of
 *  them ("*Yes" for "* Yes") or the box's export code ("Y"): each names the same choice and is written as its printed
 *  words, so two readings of one check agree. Any other value can never equal an answer, so the check could never fail:
 *  it is not proposed. Boxes without choices are left as they are. */
const looseChoice = (v: string) => v.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
export function choiceOf(choices: [string, string][], v: unknown): string | null {
  if (typeof v !== "string") return null;
  return (choices.find(([w]) => w === v) ?? choices.find(([w]) => looseChoice(w) === looseChoice(v) && looseChoice(v) !== "") ?? choices.find(([, c]) => c !== "" && c === v))?.[0] ?? null;
}
export function withPrintedChoices(n: unknown, choicesOf: (field: string) => [string, string][] | "check_box" | undefined): { node: unknown } | { why: string } {
  const o = looseOf(n);
  if (!o) return { node: n };
  if (Array.isArray(o.args)) {
    const args: unknown[] = [];
    for (const a of o.args) { const r = withPrintedChoices(a, choicesOf); if ("why" in r) return r; args.push(r.node); }
    return { node: { ...o, args } };
  }
  if (o.arg) { const r = withPrintedChoices(o.arg, choicesOf); return "why" in r ? r : { node: { ...o, arg: r.node } }; }
  const kind = typeof o.field === "string" ? choicesOf(o.field) : undefined;
  // Review round 2 M1: a check box's stored on/off states are not printed choices, and an unticked box may still hold
  // "0" (so `exists` says nothing either); what "ticked" is in an answer is not settled, so a check that reads one is not
  // proposed (the prompts send it to unresolved) rather than guessed.
  if (kind === "check_box") return { why: `its condition reads the check box ${o.field}; whether a check box is ticked is not read by these rules yet` };
  const choices = ["eq", "neq", "in"].includes(String(o.op)) ? kind : undefined;
  if (!choices?.length) return { node: n };
  const values = Array.isArray(o.value) ? o.value : [o.value];
  const printed = values.map((v) => choiceOf(choices, v));
  const bad = values.find((_, i) => printed[i] === null);
  if (bad !== undefined || !values.length) return { why: `its condition compares ${o.field} with ${JSON.stringify(bad)}, which is not one of that box's printed choices (${choices.map(([w]) => `"${w}"`).slice(0, 6).join(", ")})` };
  return { node: { ...o, value: Array.isArray(o.value) ? printed : printed[0] } };
}

/** C3.4 form step: a form edition's checks and document types from its two rounds (M1–M5). */
export function formMastersFromRounds(rounds: { draft: MRound<FormAnswer>; check: MRound<FormAnswer> }, f: FormSource, at: { runId: string }) {
  const boxes = new Set(f.boxes.map((b) => b.path));
  const choicesOf = new Map(f.boxes.filter((b) => b.choices === "check_box" || b.choices?.length).map((b) => [b.path, b.choices!]));
  // M1 (break minor): the quote is whole words of ONE box's printed caption or heading, at least two words and ten letters
  // ("Passport number"), never a fragment found across captions ("ort numb", "of the").
  const printed = f.boxes.map((b) => ` ${plain(b.words)} `);
  const quoteFound = (q: string) => { const w = plain(q); return w.split(" ").length >= 2 && (w.match(/[a-z]/g) ?? []).length >= 10 && printed.some((p) => p.includes(` ${w} `)); };
  const dropped: Dropped[] = [];
  const checks = (r: MRound<FormAnswer>, which: string) => {
    const out = new Map<string, Kept<Extract<ProposalPayload, { kind: "form_check" }>>>();
    for (const c of r.output.checks) {
      const reads = [...new Set(c.reads)];
      const drop = (why: string) => dropped.push({ item: c.sentence.slice(0, 120), why: `${why} (${which})` });
      if (!reads.length || reads.length > 20 || reads.some((p) => !boxes.has(p) || p.length > 120)) { drop(`It reads a box that is not a visible box of ${f.printed}, so it is not proposed`); continue; }
      if (!quoteFound(c.quote)) { drop(`Its words are not printed on ${f.printed}, so it is not proposed`); continue; }
      const sentence = c.sentence.trim();
      if (sentence.length < 3 || sentence.length > 300) { drop("It has no sentence of 3 to 300 characters"); continue; }
      const t0 = treeOf(c.tree_json, c.subject_kind, new Set(reads));
      if ("why" in t0) { drop(`Not proposed: ${t0.why}`); continue; }
      const pc = withPrintedChoices(t0.node, (p) => choicesOf.get(p));
      if ("why" in pc) { drop(`Not proposed: ${pc.why}`); continue; }
      const t = { root: { subjectKind: t0.root.subjectKind, ...(pc.node as object) }, node: pc.node as PredicateNode };
      // An example's answer to a choice box is the same choice in its printed words (an unknown one is left as written).
      const examples = c.examples.map((e) => { try { const f = JSON.parse(e.facts_json); if (!f || typeof f !== "object" || Array.isArray(f)) return e;
        return { ...e, facts_json: JSON.stringify(Object.fromEntries(Object.entries(f).map(([k, v]) => { const ch = choicesOf.get(k); return [k, Array.isArray(ch) ? (choiceOf(ch, v) ?? v) : v]; }))) }; } catch { return e; } });
      const ex = runExamples(t, examples);
      if ("why" in ex) { drop(`Not proposed: ${ex.why}`); continue; }
      const sorted = [...reads].sort();
      const key = keyOf(`${f.edition}|${sorted.join(",")}`);
      if (out.has(key)) { drop("Another check of this reading reads the same boxes; the first is kept"); continue; }
      out.set(key, { key, same: canonical(t.root as never), quote: c.quote, reading: `${sentence} (${ROLE_WORDS[c.subject_kind] ?? c.subject_kind.toLowerCase()})`, problem: ex.wrong,
        payload: { kind: "form_check", sentence, tree: t.root, reads: sorted, examples: ex.examples },
        rules: [{ rule: "quote_printed_on_form", passed: true, why: null }, { rule: "condition_in_11_operators", passed: true, why: null }, { rule: "examples_hold", passed: !ex.wrong, why: ex.wrong?.slice(0, 300) ?? null }], work: { boxes: sorted } });
    }
    return out;
  };
  const docs = (r: MRound<FormAnswer>, which: string) => {
    const out = new Map<string, Kept<Extract<ProposalPayload, { kind: "document_type" }>>>();
    for (const d of r.output.document_types) {
      const drop = (why: string) => dropped.push({ item: d.name.slice(0, 120), why: `${why} (${which})` });
      const name = d.name.trim(), proves = d.proves.trim();
      if (name.length < 1 || name.length > 120 || proves.length < 3 || proves.length > 200) { drop("It has no name, or does not say what it proves"); continue; }
      if (!quoteFound(d.quote)) { drop(`Its words are not printed on ${f.printed}, so it is not proposed`); continue; }
      const supplies = [...new Set(d.supplies)].filter((p) => boxes.has(p));
      const key = plain(name);
      if (!key) continue;
      if (out.has(key)) { drop(`"${name}" is named twice in one reading; the first is kept`); continue; }
      out.set(key, { key, same: `${key}|${d.reader}`, quote: d.quote, reading: `${name}: proves ${proves}`, problem: null,
        payload: { kind: "document_type", name, proves, category: d.category.slice(0, 60), suppliesFacts: [], readerKind: d.reader as Reader, identityDocument: d.identity_document },
        rules: [{ rule: "quote_printed_on_form", passed: true, why: null }], work: { boxes: supplies.slice(0, 50) } });
    }
    return out;
  };
  /** M5 (P-134; review M2): a document type is an identity document when either reading says so or its category is
   *  identity, never on one model flag; then its reader is never AI (coded lines, printed layout or a person). A reader
   *  the contract does not know is a person's. Applied to both readings, so the payload a person accepts holds it. */
  const identityGuard = (a: ReturnType<typeof docs>, b: ReturnType<typeof docs>) => {
    for (const key of new Set([...a.keys(), ...b.keys()])) {
      const xs = [a.get(key), b.get(key)].filter((x): x is NonNullable<typeof x> => !!x);
      const identity = xs.some((x) => x.payload.identityDocument || /identity/i.test(x.payload.category));
      for (const x of xs) {
        const known = (READERS as readonly string[]).includes(x.payload.readerKind);
        const aiRead = identity && !NOT_AI.includes(x.payload.readerKind);
        if (aiRead || !known) x.payload.readerKind = "person_only";
        x.payload.identityDocument = identity;
        x.same = `${key}|${x.payload.readerKind}|${identity}`;
        x.rules.push({ rule: "identity_not_read_by_ai", passed: !aiRead, why: aiRead ? "The AI named a reader that is not allowed for an identity document." : null });
        if (aiRead) x.problem = "An identity document is never read by AI (P-134): its reader is set to a person; check it.";
      }
    }
  };
  const source = (quote: string) => ({ file: f.file.slice(0, 300), sha256: f.sha256, edition: f.edition.slice(0, 60), page: null, quote: quote.slice(0, 1000), quoteFound: true, rule: null });
  const scope = { formEdition: f.edition.slice(0, 60), combinationId: null };
  const items: NewItem[] = [
    ...merge(checks(rounds.draft, "first reading"), checks(rounds.check, "second reading"), rounds, { kind: "form_check", runId: at.runId, step: MASTERS_FORM_STEP, scope, landsOn: "library" }, source, (p) => p.sentence),
  ];
  const dd = docs(rounds.draft, "first reading"), dk = docs(rounds.check, "second reading");
  identityGuard(dd, dk);
  items.push(...merge(dd, dk, rounds, { kind: "document_type", runId: at.runId, step: MASTERS_FORM_STEP, scope, landsOn: "library" }, source, (p) => p.name));
  return { items, dropped, unresolved: unresolvedOf(rounds) };
}

export type GuideSource = { file: string; sha256: string; text: string; code: string };
/** The library's questions a guide check may read: each by its key and the names it goes by. */
export type Fact = { key: string; names: string[] };

/** C3.4 guide step: a combination guide's checks from its two rounds (M1–M4, M6). A check over two or more answers is a
 *  cross-answer check (it only warns, contract); over one, a check on that answer. Both land on the combination. */
export function guideMastersFromRounds(rounds: { draft: MRound<GuideAnswer>; check: MRound<GuideAnswer> }, g: GuideSource, facts: Fact[], at: { runId: string; combinationId: string }) {
  const text = sameText(g.text);
  const dropped: Dropped[] = [];
  /** A read's question in the library: the one fact whose name (or key's last part) is exactly those words; else null. */
  const factOf = (words: string) => {
    const w = plain(words);
    const hits = facts.filter((f) => f.names.some((n) => plain(n) === w) || plain(f.key.split(".").pop()!.replace(/_/g, " ")) === w || f.key === words.trim());
    return new Set(hits.map((h) => h.key)).size === 1 ? hits[0].key : null;
  };
  type Payload = Extract<ProposalPayload, { kind: "form_check" | "cross_check" }>;
  const kept = (r: MRound<GuideAnswer>, which: string) => {
    const out = new Map<string, Kept<Payload>>();
    for (const c of r.output.checks) {
      const drop = (why: string) => dropped.push({ item: c.sentence.slice(0, 120), why: `${why} (${which})` });
      const reads = [...new Set(c.reads.map((x) => x.trim()).filter(Boolean))];
      if (!reads.length || reads.length > 20) { drop("It reads no answer, or more than 20"); continue; }
      if (!isSentence(c.quote) || !text.includes(sameText(c.quote))) { drop(`Its sentence is not in ${g.code}'s text, so it is not proposed`); continue; }
      const sentence = c.sentence.trim();
      if (sentence.length < 3 || sentence.length > 300) { drop("It has no sentence of 3 to 300 characters"); continue; }
      const calc = c.needs_calculation?.trim() || null;
      // A field the tree reads is one of its answers (in lower snake case); a check that needs a calculation may also read
      // the calculated value (M6: kept for a person, never dropped because it needs one).
      const named = new Set(reads.map(snake));
      const all = (() => { try { return fieldsOf(JSON.parse(c.tree_json)); } catch { return []; } })();
      const t = treeOf(c.tree_json, c.subject_kind, calc ? new Set([...named, ...all]) : named);
      if ("why" in t) { drop(`Not proposed: ${t.why}`); continue; }
      // The answers as the library's questions where each is exactly one; the rest stay in words, and the check is Decide.
      const mapped = new Map(reads.map((x) => [snake(x), factOf(x)]));
      const missing = reads.filter((x) => !mapped.get(snake(x)));
      const to = (f: string) => mapped.get(f) ?? f;
      const root = renamed(t.root, to), node = renamed(t.node, to);
      const ex = runExamples({ root, node }, c.examples, to);
      if ("why" in ex) { drop(`Not proposed: ${ex.why}`); continue; }
      const readKeys = [...new Set(reads.map((x) => to(snake(x)).slice(0, 120)))].sort();
      const cross = readKeys.length >= 2;
      const problem = calc ? `Decide: it needs a calculation the library does not run yet (${calc}); a person adds it or keeps it in words.`
        : c.severity === "sme_pending" ? "Decide: it needs an immigration value the guide does not state; the immigration expert gives it."
        : missing.length ? `Decide: ${missing.slice(0, 3).map((m) => `"${m}"`).join(", ")} ${missing.length === 1 ? "is" : "are"} not a question of the library yet, so the check reads ${missing.length === 1 ? "it" : "them"} in words.` : ex.wrong;
      const kind = cross ? "cross_check" : "form_check";
      const key = keyOf(`${kind}|${readKeys.join(",")}`);
      if (out.has(key)) { drop("Another check of this reading reads the same answers; the first is kept"); continue; }
      const severity = cross ? "warn" : ["block", "warn", "advise"].includes(c.severity) ? c.severity : "warn";
      const payload: Payload = cross ? { kind: "cross_check", sentence, tree: root, reads: readKeys, severity: "warn", examples: ex.examples } : { kind: "form_check", sentence, tree: root, reads: readKeys, examples: ex.examples };
      out.set(key, { key, same: canonical(root as never), quote: c.quote, reading: `${sentence} (${severity}${cross && c.severity === "block" ? ": a cross-answer check only warns" : ""})`, problem, payload,
        rules: [{ rule: "quote_found", passed: true, why: null }, { rule: "condition_in_11_operators", passed: true, why: null }, { rule: "reads_library_questions", passed: !missing.length, why: missing.length ? `Not questions yet: ${missing.join(", ")}`.slice(0, 300) : null },
          { rule: "examples_hold", passed: !ex.wrong, why: ex.wrong?.slice(0, 300) ?? null }], work: { group: c.group, severity, needsCalculation: calc } });
    }
    return out;
  };
  const source = (quote: string) => ({ file: g.file.slice(0, 300), sha256: g.sha256, edition: null, page: null, quote: quote.slice(0, 1000), quoteFound: true, rule: null });
  const d = kept(rounds.draft, "first reading"), k = kept(rounds.check, "second reading");
  const scope = { formEdition: null, combinationId: at.combinationId };
  const of = (kind: string, m: Map<string, Kept<Payload>>) => new Map([...m].filter(([, x]) => x.payload.kind === kind));
  const items = (["form_check", "cross_check"] as const).flatMap((kind) => merge(of(kind, d), of(kind, k), rounds, { kind, runId: at.runId, step: MASTERS_GUIDE_STEP, scope, landsOn: "combination" }, source, (p) => p.sentence));
  return { items, dropped, unresolved: unresolvedOf(rounds) };
}

/** Both rounds' unresolved passages, each once. */
function unresolvedOf(rounds: { draft: MRound<{ unresolved: Unresolved[] }>; check: MRound<{ unresolved: Unresolved[] }> }): Unresolved[] {
  const a = rounds.draft.output.unresolved, b = rounds.check.output.unresolved;
  return [...a, ...b.filter((u) => !a.some((v) => sameText(v.passage) === sameText(u.passage)))];
}
