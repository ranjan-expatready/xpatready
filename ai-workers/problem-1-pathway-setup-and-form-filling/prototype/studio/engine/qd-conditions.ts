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
import { isSentence, matchFact, sameText } from "./pqr-picks.ts";
import type { ProposalItem } from "../contracts/proposal-item.ts";
type RoundReading = NonNullable<ProposalItem["rounds"]["draft"]>;

export const CONDITIONS_STEP = "qd_conditions";
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

/** "yes"/"no" are the yes-no answer; anything else is compared as the answer's own words. */
export const answerOf = (when: string): boolean | string => { const w = when.trim().toLowerCase(); return w === "yes" || w === "true" ? true : w === "no" || w === "false" ? false : w.slice(0, 80); };

/** The questions this combination asks (placed), per person: the ones a condition may name. */
const asked = (s: Snapshot): FactSourceView[] => factSources(s).filter((f) => f.placed && f.forms.length > 0);

/** C1–C5 on one round's condition; null when it passes, else the reason in words. */
export function conditionProblem(s: Snapshot, guideText: string, guideCode: string, c: CondAnswer["conditions"][number]): { why: string } | { target: FactSourceView; decider: FactSourceView; tree: Record<string, unknown>; warn: string | null } {
  const qs = asked(s);
  const target = matchFact(qs, c.role, c.asks), decider = matchFact(qs, c.role, c.depends_on);
  if (!target) return { why: `"${c.asks}" is not exactly one question this combination asks of this person, so it is not guessed.` };
  if (!decider) return { why: `"${c.depends_on}" (what decides "${target.label}") is not exactly one question this combination asks of this person, so it is not guessed.` };
  if (target.fact === decider.fact) return { why: `"${target.label}" cannot decide itself.` };
  if (!isSentence(c.quote) || !sameText(guideText).includes(sameText(c.quote))) return { why: `Its sentence is not in ${guideCode}'s text, so it is not proposed.` };
  const reason = c.why.trim();
  if (reason.length > 300 || (reason.match(/\p{L}/gu) ?? []).length < 3) return { why: "It has no reason in words of 3 to 300 characters." };
  const tree = { subjectKind: subjectKindOf(decider.fact), op: "eq", field: decider.fact, value: answerOf(c.when) };
  const types = new Map((s.canonical_fields as { id: string; value_type?: string }[]).map((f) => [f.id, f.value_type ?? "text"]));
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
  return { target, decider, tree, warn: hides ? hides.message.slice(0, 300) : null };
}

/** The two rounds into queue items (C1–C6). `guide` is the file the rounds read. */
export function conditionsFromRounds(s: Snapshot, rounds: { draft: CondRound; check: CondRound }, guide: { file: string; sha256: string; text: string; code: string },
  at: { runId: string; combinationId: string }): { items: NewCondition[]; dropped: CondDropped[]; unresolved: { passage: string; reason: string }[] } {
  const dropped: CondDropped[] = [];
  type Kept = { target: FactSourceView; decider: FactSourceView; tree: Record<string, unknown>; warn: string | null; c: CondAnswer["conditions"][number] };
  const kept = (r: CondRound, which: string) => {
    const out = new Map<string, Kept>();
    for (const c of r.output.conditions) {
      const x = conditionProblem(s, guide.text, guide.code, c);
      if ("why" in x) { dropped.push({ role: c.role, asks: c.asks, why: `${x.why} (${which})` }); continue; }
      const k = `${x.target.role}|${x.target.fact}|${x.decider.fact}`;
      if (!out.has(k)) out.set(k, { ...x, c });
    }
    return out;
  };
  const d = kept(rounds.draft, "first reading"), k2 = kept(rounds.check, "second reading");
  const payload = (x: Kept) => ({ kind: "condition" as const, target: { kind: "question" as const, key: x.target.fact }, roles: [x.target.role],
    condition: { sentence: `Asked only when "${x.decider.label}" is ${x.c.when.trim().slice(0, 60)}.`.slice(0, 300), tree: x.tree, sharedConditionKey: null, examples: [] } });
  const reading = (r: CondRound, x: Kept): RoundReading => ({ reading: `${x.target.label}: when ${x.decider.label} is ${x.c.when}`.slice(0, 300), payload: payload(x), from: r.from, runFile: r.runFile, costUsd: r.costUsd });
  const items: NewCondition[] = [];
  for (const key of [...new Set([...d.keys(), ...k2.keys()])]) {
    const a = d.get(key), b = k2.get(key), x = (a ?? b)!;
    const agree = !!a && !!b && JSON.stringify(a.tree) === JSON.stringify(b.tree), same = agree && !x.warn;
    items.push({
      kind: "condition", runId: at.runId, step: CONDITIONS_STEP, scope: { formEdition: null, combinationId: at.combinationId }, landsOn: "combination", reuse: { match: "new", existingKey: null },
      payload: payload(x), source: { file: guide.file, sha256: guide.sha256, edition: null, page: null, quote: x.c.quote.slice(0, 1000), quoteFound: true, rule: null },
      rounds: { draft: a ? reading(rounds.draft, a) : null, check: b ? reading(rounds.check, b) : null },
      rules: [{ rule: "one_question_each", passed: true, why: null }, { rule: "quote_found", passed: true, why: null }, { rule: "valid_condition", passed: true, why: null }, { rule: "asked_first", passed: true, why: null }, { rule: "form_still_reads", passed: !x.warn, why: x.warn }],
      agreement: agree ? "agreed" : a && b ? "differ" : "one_round", confidence: same ? "ready" : a && b ? "check" : "decide",
      reason: same ? null : agree ? `Both readings agree, but a form still reads this answer when the question is hidden: ${x.warn}`.slice(0, 500) : a && b ? `The readings give different answers for "${x.decider.label}" ("${a.c.when}" and "${b.c.when}"). Check which one the guide means.` : `Only the ${a ? "first" : "second"} reading found this condition. Decide: keep it or remove it.`,
      origin: "ai", identity: { key, near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
    });
  }
  const unresolved = [...rounds.draft.output.unresolved, ...rounds.check.output.unresolved.filter((u) => !rounds.draft.output.unresolved.some((v) => sameText(v.passage) === sameText(u.passage)))];
  return { items, dropped, unresolved };
}
