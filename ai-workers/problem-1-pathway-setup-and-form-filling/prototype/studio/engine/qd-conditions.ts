// C4.11 step 5 (W1-ai-drafting plan §1 step 6, rules R-3, R-4, R-5; P-121): the two AI rounds' conditional questions
// ("asked only when an earlier answer makes it needed") into queue items of kind `condition`. Pure: no database, no AI.
// The rules on every condition, whoever proposed it:
//   C1 the question and its deciding question each tie to exactly one question this combination asks of that person
//      (never guessed); C2 the quote is a sentence found in the guide; C3 a reason in words; C4 the condition is valid in
//      the condition language and reads only a shared (library) field; C5 the deciding answer is asked before it is
//      needed (no unreachable question, no loop, engine/validate.ts askedInOrder); C6 Ready only when both rounds give
//      the same question, deciding question and answer; Check when the answer differs; Decide with one round only.
// Every condition is Sample until the immigration expert confirms it (AGENTS rule 4).
import { subjectKindOf, type Snapshot } from "./snapshot.ts";
import { factSources, type FactSourceView } from "./sources.ts";
import { askedInOrder, checkCondition } from "./validate.ts";
import { isSentence, sameText, takenAs } from "./pqr-picks.ts";
import { findFact, listed, wordsOf, type Names } from "./fact-words.ts";
import type { ProposalItem } from "../contracts/proposal-item.ts";
type RoundReading = NonNullable<ProposalItem["rounds"]["draft"]>;

export const CONDITIONS_STEP = "qd_conditions";
/** Cut to at most n characters at a word boundary, with an ellipsis (review m3: never mid-word). */
const cut = (t: string, n: number) => t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
export type CondAnswer = { conditions: { role: string; asks: string; depends_on: string; when: string; quote: string; why: string }[]; unresolved: { passage: string; reason: string }[] };
export type CondRound = { output: CondAnswer; from: "live" | "replay"; runFile: string; costUsd: number };
export type NewCondition = Omit<ProposalItem, "id" | "status" | "decision">;
export type CondDropped = { role: string; asks: string; why: string };

export const conditionsShapeOk = (o: unknown): o is CondAnswer => {
  const x = o as CondAnswer | null;
  const str = (v: unknown) => typeof v === "string";
  return !!x && Array.isArray(x.conditions) && Array.isArray(x.unresolved) && x.conditions.every((c) => c && ["role", "asks", "depends_on", "when", "quote", "why"].every((k) => str((c as Record<string, unknown>)[k])))
    && x.unresolved.every((u) => u && str(u.passage) && str(u.reason));
};

/** Review M1 (part 2): the deciding answer as the value the rules engine compares (===), for the deciding field's type:
 *  a yes-no field takes yes/no; a field with an answer list takes one of its answers (matched on its key or words, the
 *  key is stored; round 2 M2: the snapshot's list values are { key, label }); any other field (free text, a number, a date) cannot decide a question by one answer here. */
export function answerOf(field: { value_type?: string; answer_list?: { values?: { key: string; label: string }[] } } | undefined, when: string): { value: boolean | string } | { why: string } {
  const w = when.trim(), low = w.toLowerCase(), norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const values = field?.answer_list?.values ?? [];
  if (field?.value_type === "yes_no" || field?.value_type === "boolean") return low === "yes" || low === "true" ? { value: true } : low === "no" || low === "false" ? { value: false } : { why: `"${w}" is not yes or no, and the deciding question is answered yes or no.` };
  if (values.length) { const hit = values.find((v) => norm(String(v.key ?? "")) === norm(w) || norm(String(v.label ?? "")) === norm(w)); return hit ? { value: hit.key } : { why: `"${w}" is not one of the deciding question's answers (${values.slice(0, 5).map((v) => v.label).join(", ")}${values.length > 5 ? ", …" : ""}).` }; }
  return { why: `The deciding question is answered in ${field?.value_type ?? "free"} form, so "${w}" cannot decide by one answer; a person sets this condition.` };
}

/** Why words name no one question: several tie, none holds them, or the one named is not asked yet (data, not words). */
type Miss = { why: string; several?: FactSourceView[]; miss: "several" | "none" | "unplaced" };
/** The questions this combination asks (placed), per person: the ones a condition may name. */
const isAsked = (f: FactSourceView) => f.placed && f.forms.length > 0;

/** C1 (QA-162): the one question these words name for this person (engine/fact-words.ts), among every fact of the
 *  combination so that a near one is never taken in place of the one meant; it must be a question this combination asks. */
function named(all: FactSourceView[], role: string, asks: string, names: Names, what: (x: string) => string, asked: (f: FactSourceView) => boolean = isAsked, quote = ""): { f: FactSourceView; loose: string | null } | Miss {
  const found = findFact(all, role, asks, names);
  // QA-162 (C4.11): when the words tie several questions, the guide's own sentence may name exactly one of them (quoteNames).
  const tied = !found.fact && found.why === "several" ? found.several : [];
  const byQuote = tied.length && quote ? quoteNames(tied, quote) : null;
  if (byQuote && asked(byQuote)) return { f: byQuote, loose: `The AI wrote "${asks.trim().slice(0, 80)}", which fits ${tied.length} questions of this person; the guide's sentence it quotes names only "${byQuote.label.slice(0, 120)}", so it is taken, for a person to check.` };
  // Opus review m1/m2 on #744: the tied questions are returned as data, so a caller chooses only among them (never by the reason's words).
  if (!found.fact) return found.why === "several" ? { why: `${what(`"${asks}"`)} could be ${found.several.length} questions of this person (${listed(found.several)}), so it is not guessed.`, several: found.several, miss: "several" } : { why: `${what(`"${asks}"`)} is not a question this combination asks of this person, so it is not guessed.`, miss: "none" };
  if (!asked(found.fact)) return { why: `${what(`"${found.fact.label}"`)} is not asked by a question of this combination yet, so it is not guessed. Once it is placed for this combination (Library › Fields › its placement), draft again with Saved (US$0).`, miss: "unplaced" };
  return { f: found.fact, loose: found.how === "words" ? takenAs(asks, found.fact) : null };
}

/** QA-162 (C4.11 step 5): the one question, among those the AI's words tie, that the guide's sentence it quotes names.
 *  Each tied question's own words are those of its label no other tied question has ("family" for "Family name of any
 *  other name ever used", "given" for "Given name(s) of any other name ever used"); the sentence names a question when it
 *  holds at least one of that question's own words and none of any other's. Two or none named → null (never guessed). */
export function quoteNames(several: FactSourceView[], quote: string): FactSourceView | null {
  if (several.length < 2 || !isSentence(quote)) return null;
  const said = new Set(wordsOf(quote));
  const words = several.map((f) => new Set(wordsOf(f.label)));
  const own = words.map((w, i) => [...w].filter((x) => words.every((o, j) => j === i || !o.has(x))));
  const named = several.filter((_, i) => own[i].some((x) => said.has(x)) && own.every((o, j) => j === i || !o.some((x) => said.has(x))));
  return named.length === 1 ? named[0] : null;
}

/** Explanation only (never used to land anything): how many of the meaningful words of `asks` a form field's caption
 *  holds, number words as digits and a long word's first 7 letters enough ("residence" in "residential"). */
const NUM: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", ten: "10" };
const near = (text: string, asks: string) => {
  const norm = (t: string) => wordsOf(t.replace(/\b(one|two|three|four|five|six|ten)\b/gi, (w) => NUM[w.toLowerCase()]));
  const have = norm(text), want = [...new Set(norm(asks))];
  const held = want.filter((w) => have.some((h) => h === w || (w.length >= 7 && h.length >= 7 && h.slice(0, 7) === w.slice(0, 7)))).length;
  return { held, want: want.length };
};
/** Every meaningful word of `asks` is in `text` (two words at least). */
const holds = (text: string, asks: string) => { const n = near(text, asks); return n.want >= 2 && n.held === n.want; };
type BoxEntry = { caption?: string | null; outcome?: string | null; fact?: string | null; transform?: string | null };
type FormMap = { form_number: string; entries: BoxEntry[] };
/** A form of the forms library (the API passes them; the snapshot holds only this combination's forms). */
export type FormLine = { form_number: string; title?: string | null; status?: string; condition_plain?: string | null };
const HAND = (label?: string) => `set it by hand on ${label ? `"${label.slice(0, 120)}"` : "that question"} (Library › Fields › its placement › Condition on the question)`;
const q = (t: string, n = 120) => `"${t.trim().slice(0, n)}"`;

/** QA-162 (C4.11 step 5): a Yes/No form field of this combination that the words name and whose answer the form's field
 *  map works out from another answer (IMM 5257's "Is your residential address the same as your mailing address?" is
 *  filled from the two addresses), so no question asks it. Only the one best caption, all words held (one may be missing
 *  from four or more); a tie is none. Used only to say why, never to land a condition. */
export function workedOut(s: Snapshot, words: string): { form: string; caption: string; from: string } | null {
  const label = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, (f.meaning ?? f.id).replace(/\.$/, "")]));
  const boxes = (s.field_maps as FormMap[]).flatMap((m) => m.entries.filter((e) => e.outcome === "mapped" && e.fact && /^derive/i.test(e.transform ?? "") && /y\/n|yes_no|\by if\b/i.test(e.transform ?? ""))
    .map((e) => ({ form: m.form_number, e, n: near(e.caption ?? "", words) })))
    .filter((x) => x.n.want >= 2 && x.n.held >= x.n.want - (x.n.want >= 4 ? 1 : 0));
  const best = Math.max(0, ...boxes.map((x) => x.n.held)), top = boxes.filter((x) => x.n.held === best);
  // The same form field read twice (two map rows of one box) is one field.
  const one = [...new Map(top.map((x) => [`${x.form}|${x.e.caption}`, x])).values()];
  if (one.length !== 1) return null;
  return { form: one[0].form, caption: (one[0].e.caption ?? "").replace(/^(?:[a-z ]{0,40}\s)?question\s+\d+\s*[a-z]?\.?\s*/i, "").trim().slice(0, 140), from: label.get(one[0].e.fact!) ?? one[0].e.fact! };
}

/** The deciding question can take the condition's answer (a yes-no question "yes", a list one of its answers). */
const canAnswer = (s: Snapshot, f: FactSourceView, when: string) => !("why" in answerOf((s.canonical_fields as { id: string; value_type?: string; answer_list?: { values?: { key: string; label: string }[] } }[]).find((x) => x.id === f.fact), when));
/** The deciding question a condition names, or why not (only to say where its question would be). */
function deciderOf(s: Snapshot, all: FactSourceView[], c: CondAnswer["conditions"][number], names: Names): { f: FactSourceView; loose: string | null } | Miss {
  return named([...all, ...askedOnly(s, all)], c.role, c.depends_on, names, (x) => x, (f) => f.placed);
}

/** QA-162 (C4.11 step 5): why a condition's question is not one this combination asks, with what a person can do. Never
 *  silent and never a guess: each reason rests on the combination's forms, the forms library and the field maps. */
export function targetNotAsked(s: Snapshot, c: CondAnswer["conditions"][number], decider: { f: FactSourceView } | Miss, library: FormLine[] = []): string {
  const a = q(c.asks, 80);
  // The words name a form: when a form is needed is set on the form, not as a question's condition.
  const mine = (s.forms as FormLine[]).find((f) => holds(`${f.form_number} ${f.title ?? ""}`, c.asks));
  if (mine) return `${a} names a form, not a question: ${mine.form_number}${mine.title ? ` (${mine.title})` : ""} is one of this combination's forms${mine.status === "conditional" ? `, needed only ${mine.condition_plain ? `when ${mine.condition_plain}` : "in some cases"}` : ""}. When a form is needed is set on the Forms tab, so nothing is proposed here.`;
  const lib = library.find((f) => holds(`${f.form_number} ${f.title ?? ""}`, c.asks));
  if (lib) return `${a} names a form, not a question: ${lib.form_number}${lib.title ? ` (${lib.title})` : ""} is in the forms library but not one of this combination's forms. Whether this combination needs it, and when (here: ${q(c.depends_on, 60)} is ${q(c.when, 40)}), is set on the Forms tab, so nothing is proposed here.`;
  const why = [`No question of this combination asks ${a} of this person, so it is not guessed.`];
  if ("f" in decider) {
    const on = decider.f.forms?.length ? decider.f.forms.join(" or ") : null;
    why.push(on ? `Its deciding question "${decider.f.label.slice(0, 120)}" is on ${on}: if ${a} is asked there too, map those form fields to questions (Forms › ${decider.f.forms[0]} › Field map) and place them, then draft again with Saved (US$0).`
      : `If a form asks it, map that form field to a question (Forms › the form › Field map) and place it, then draft again with Saved (US$0).`);
  } else {
    why.push(`If a form asks it, map that form field to a question (Forms › the form › Field map) and place it, then draft again with Saved (US$0).`);
    const w = decider.miss === "none" || (decider.miss === "several" && !decider.several?.some((f) => canAnswer(s, f, c.when))) ? workedOut(s, c.depends_on) : null;
    if (w) why.push(`Its deciding answer ${q(c.depends_on, 80)} is not a question either: ${w.form} works "${w.caption}" out from "${w.from}" (its field map), so a Yes/No question for it is needed first.`);
    else if (decider.miss === "several") why.push(`Its deciding words ${q(c.depends_on, 80)} ${decider.why.replace(/^"[^"]*"\s*/, "")}`);
  }
  return why.join(" ");
}

/** QA-162 (C4.11 step 5): why a condition's deciding question is not one this combination asks, with what a person can do. */
export function deciderNotAsked(s: Snapshot, dependsOn: string, target: FactSourceView, tie = false): string {
  const d = q(dependsOn, 80), t = q(target.label);
  const w = workedOut(s, dependsOn);
  if (!w && tie) return `${d} (what decides ${t}) fits several questions of this person, none of which can take that answer, so it is not guessed. ${HAND(target.label)[0].toUpperCase()}${HAND(target.label).slice(1)}.`;
  if (w) return `${w.form} asks ${d} ("${w.caption}") but works its answer out from "${w.from}" (its field map), so no question asks it and it cannot decide ${t}. To ask ${t} only after that answer: add a Yes/No question for it to the library, map that form field to it and place it, then draft again with Saved (US$0); or ${HAND(target.label)}. Until then ${t} is asked whenever its form applies.`;
  return `No question of this combination asks ${d} of this person, so it cannot decide ${t} and is not guessed. Add that question to the library and place it, then draft again with Saved (US$0); or ${HAND(target.label)}.`;
}

/** QA-162 after QA-194 (no tie-break between twins): the deciding question. The usual search first, so an exact name is
 *  never overruled (fresh review m1 on #744); only when the words fit several questions does the condition's own answer
 *  decide among them: it says the decider is answered "yes" (or one of a list's answers), so only a question that can
 *  take that answer can decide it ("Ever used other name" is the Yes/No question, never the name questions sharing its
 *  words). Two such questions are still none, every one named, never guessed. */
export function pickDecider(pool: FactSourceView[], canTake: (f: FactSourceView) => boolean, role: string, asks: string, names: Names, what: (x: string) => string, when = ""): { f: FactSourceView; loose: string | null } | Miss {
  const first = named(pool, role, asks, names, what, (f) => f.placed);
  if (!("why" in first) || !first.several?.length) return first;
  // Opus review m1 on #744: only among the questions the words tied, exactly one of which can take the answer; such a
  // choice is never Ready (loose: a person checks it), even when the tie was of exact names.
  const can = first.several.filter((f) => f.placed && canTake(f));
  if (can.length !== 1) return first;
  return { f: can[0], loose: `The AI wrote "${asks.trim().slice(0, 80)}", which fits ${first.several.length} questions of this person; only "${can[0].label.slice(0, 120)}" can be answered "${when.trim().slice(0, 40)}", so it is taken, for a person to check.` };
}

/** QA-162: the questions this combination asks that no form box reads (so `factSources` does not list them), as the
 *  people they are asked of: once for the application ("case"), or of each person who applies. A deciding question only. */
export function askedOnly(s: Snapshot, all: FactSourceView[]): FactSourceView[] {
  const have = new Set(all.map((f) => `${f.role}|${f.fact}`));
  const parts = ((s.combination as { participants?: { role: string; max?: number | null; applies?: boolean | null }[] }).participants ?? []).filter((p) => (p.max ?? 0) > 0 && p.applies !== false && p.role !== "representative").map((p) => p.role);
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? f.id]));
  const out: FactSourceView[] = [];
  for (const p of s.placements as { fact: string; repeats?: string; rule_only?: boolean }[]) {
    if (p.rule_only) continue;
    for (const role of p.repeats === "once_per_case" || p.fact.startsWith("case.") ? ["case"] : parts) {
      if (have.has(`${role}|${p.fact}`)) continue;
      have.add(`${role}|${p.fact}`);
      out.push({ role, fact: p.fact, label: (meaning.get(p.fact) ?? p.fact).trim().replace(/\.$/, ""), forms: [], placed: true } as unknown as FactSourceView);
    }
  }
  return out;
}

/** C1–C5 on one round's condition; null when it passes, else the reason in words. */
export function conditionProblem(s: Snapshot, guideText: string, guideCode: string, c: CondAnswer["conditions"][number], names: Names = new Map(), all: FactSourceView[] = factSources(s), library: FormLine[] = []): { why: string } | { target: FactSourceView; decider: FactSourceView; tree: Record<string, unknown>; warn: string | null; loose: string | null } {
  // QA-162: the guide's sentence may break a tie of words for the question (quoteNames); never for the deciding question.
  const t = named(all, c.role, c.asks, names, (x) => x, isAsked, c.quote);
  if ("why" in t) return { why: t.miss === "none" ? targetNotAsked(s, c, deciderOf(s, all, c, names), library) : t.miss === "several" ? `${t.why} If one of them is meant, ${HAND()}.` : t.why };
  const target = t.f;
  // QA-162: the deciding question need not fill a form box itself (IMM 5257's "Have you ever used any other name…?"
  // decides whether the names are needed): any question this combination asks of the person may decide.
  const pool = [...all, ...askedOnly(s, all)];
  // QA-162 after QA-194: the decider; the condition's own answer only breaks a tie of words (pickDecider).
  const fieldOf = new Map((s.canonical_fields as { id: string; value_type?: string; answer_list?: { values?: { key: string; label: string }[] } }[]).map((f) => [f.id, f]));
  const canTake = (f: FactSourceView) => !("why" in answerOf(fieldOf.get(f.fact), c.when));
  const what = (x: string) => `${x} (what decides "${target.label}")`;
  const d = pickDecider(pool, canTake, c.role, c.depends_on, names, what, c.when);
  // A tie of detail questions none of which can take the answer, when the form works that Yes/No out itself: said so.
  const worked = d && "why" in d && (d.miss === "none" || (d.miss === "several" && !d.several?.some(canTake)));
  if ("why" in d) return { why: worked ? deciderNotAsked(s, c.depends_on, target, d.miss === "several") : d.miss === "several" ? `${d.why} If one of them decides it, ${HAND(target.label)}.` : d.why };
  const decider = d.f, loose = t.loose ?? d.loose;
  if (target.fact === decider.fact) return { why: `"${target.label}" cannot decide itself.` };
  if (!isSentence(c.quote) || !sameText(guideText).includes(sameText(c.quote))) return { why: `Its sentence is not in ${guideCode}'s text, so it is not proposed.` };
  const reason = c.why.trim();
  if (reason.length > 300 || (reason.match(/\p{L}/gu) ?? []).length < 3) return { why: "It has no reason in words of 3 to 300 characters." };
  const fields = s.canonical_fields as { id: string; value_type?: string; answer_list?: { values?: { key: string; label: string }[] } }[];
  const ans = answerOf(fields.find((f) => f.id === decider.fact), c.when);
  if ("why" in ans) return { why: `Its condition is not valid: ${ans.why}` };
  const tree = { subjectKind: subjectKindOf(decider.fact), op: "eq", field: decider.fact, value: ans.value };
  const types = new Map(fields.map((f) => [f.id, f.value_type ?? "text"]));
  const errs = checkCondition(tree, types, new Set());
  if (errs.length) return { why: `Its condition is not valid: it ${errs[0]}.` };
  // C5: with this condition on the question, is the deciding answer still asked first (no new unreachable question or loop)?
  const before = new Set(askedInOrder(s).map((p) => p.message));
  const placements = (s.placements as { fact: string; condition?: unknown }[]).map((p) => p.fact === target.fact ? { ...p, condition: tree, condition_effect: "SHOW", condition_plain: `${decider.label} is ${c.when}` } : p);
  const after = askedInOrder({ ...s, placements } as Snapshot).filter((p) => !before.has(p.message));
  const order = after.filter((p) => /^Unreachable question|^Questions decide each other in a loop/.test(p.message));
  if (order.length) return { why: `"${decider.label}" would not be asked before "${target.label}" needs it: ${order[0].message}` };
  // A form that reads the answer whenever it applies would lose it while the question is hidden: kept, but for a person
  // to check (never Ready), with the reason, since the form or its box may need the same condition first.
  const hides = after.find((p) => /^Hiding a value/.test(p.message));
  return { target, decider, tree, warn: hides ? hides.message.slice(0, 300) : null, loose };
}

/** The two rounds into queue items (C1–C6). `guide` is the file the rounds read. */
export function conditionsFromRounds(s: Snapshot, rounds: { draft: CondRound; check: CondRound }, guide: { file: string; sha256: string; text: string; code: string },
  at: { runId: string; combinationId: string }, names: Names = new Map(), library: FormLine[] = []): { items: NewCondition[]; dropped: CondDropped[]; unresolved: { passage: string; reason: string }[] } {
  const dropped: CondDropped[] = [];
  const all = factSources(s);
  type Kept = { target: FactSourceView; decider: FactSourceView; tree: Record<string, unknown>; warn: string | null; loose: string | null; c: CondAnswer["conditions"][number] };
  const kept = (r: CondRound, which: string) => {
    const out = new Map<string, Kept>();
    for (const c of r.output.conditions) {
      const x = conditionProblem(s, guide.text, guide.code, c, names, all, library);
      if ("why" in x) { dropped.push({ role: c.role, asks: c.asks, why: `${x.why} (${which})` }); continue; }
      const k = `${x.target.role}|${x.target.fact}|${x.decider.fact}`;
      // Review m3: the same condition twice in one reading is listed, never dropped silently.
      if (out.has(k)) { dropped.push({ role: c.role, asks: c.asks, why: `"${x.target.label}" asked when "${x.decider.label}" is answered is already proposed once in this reading (${which}).` }); continue; }
      out.set(k, { ...x, c });
    }
    return out;
  };
  const d = kept(rounds.draft, "first reading"), k2 = kept(rounds.check, "second reading");
  const payload = (x: Kept) => ({ kind: "condition" as const, target: { kind: "question" as const, key: x.target.fact }, roles: [x.target.role],
    condition: { sentence: cut(`"${x.target.label}" is asked only when "${x.decider.label}" is ${x.c.when.trim().slice(0, 60)}.`, 300), tree: x.tree, sharedConditionKey: null, examples: [] } });
  const reading = (r: CondRound, x: Kept): RoundReading => ({ reading: `${x.target.label}: when ${x.decider.label} is ${x.c.when}`.slice(0, 300), payload: payload(x), from: r.from, runFile: r.runFile, costUsd: r.costUsd });
  const items: NewCondition[] = [];
  for (const key of [...new Set([...d.keys(), ...k2.keys()])]) {
    const a = d.get(key), b = k2.get(key), x = (a ?? b)!;
    const agree = !!a && !!b && JSON.stringify(a.tree) === JSON.stringify(b.tree);
    // QA-162: a question or deciding question named in other words than its own is never Ready (no bulk accept unseen).
    const loose = a?.loose ?? b?.loose ?? null, same = agree && !x.warn && !loose;
    items.push({
      kind: "condition", runId: at.runId, step: CONDITIONS_STEP, scope: { formEdition: null, combinationId: at.combinationId }, landsOn: "combination", reuse: { match: "new", existingKey: null },
      payload: payload(x), source: { file: guide.file, sha256: guide.sha256, edition: null, page: null, quote: x.c.quote.slice(0, 1000), quoteFound: true, rule: null },
      rounds: { draft: a ? reading(rounds.draft, a) : null, check: b ? reading(rounds.check, b) : null },
      rules: [{ rule: "one_question_each", passed: true, why: null }, { rule: "quote_found", passed: true, why: null }, { rule: "valid_condition", passed: true, why: null }, { rule: "asked_first", passed: true, why: null }, { rule: "form_still_reads", passed: !x.warn, why: x.warn }, { rule: "named_exactly", passed: !loose, why: loose ? loose.slice(0, 300) : null }],
      agreement: agree ? "agreed" : a && b ? "differ" : "one_round", confidence: same ? "ready" : a && b ? "check" : "decide",
      reason: same ? null : cut([agree ? (x.warn ? `Both readings agree, but a form still reads this answer when the question is hidden: ${x.warn}` : "Both readings agree.") : a && b ? `The readings give different answers for "${x.decider.label}" ("${a.c.when}" and "${b.c.when}"). Check which one the guide means.` : `Only the ${a ? "first" : "second"} reading found this condition. Decide: keep it or remove it.`, loose ? `${loose} Check it is this question.` : ""].filter(Boolean).join(" "), 500),
      origin: "ai", identity: { key, near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
    });
  }
  const unresolved = [...rounds.draft.output.unresolved, ...rounds.check.output.unresolved.filter((u) => !rounds.draft.output.unresolved.some((v) => sameText(v.passage) === sameText(u.passage)))];
  return { items, dropped, unresolved };
}
