// C4.7 (P-76, P-121, P-130 step 6, P-149 one door; forms lane, swarm builder B4): AI drafts a combination's
// pre-qualification (PQR) picks from its IRCC guide, a reason and the guide's own sentence per pick; a person accepts or
// removes each on the one review queue. Pure: no database, no AI. The step runner (api/src/rounds.ts) gives the two
// rounds' answers (a draft and a blind checker, live or a saved real run replayed at US$0); this file applies the rules
// that hold whoever proposed (P-153: code is the guard, the prompt is not):
//   R1 PQR ⊂ SQR: a pick names a fact a question of this combination asks this person, that a prospect can answer
//      (Client or Document, never the case officer) and that is not ticked already;
//   R2 the quote is found in the guide's text, or the pick is dropped and listed;
//   R3 a pick has a reason in words (3 to 300 characters);
//   R4 Ready only when both rounds pick the same fact for the same person; one round only → Decide, with both readings;
//   R5 one item per person and fact; a fact the rounds cannot tie to exactly one question is listed, never guessed.
// Every pick is Sample until the immigration expert confirms it at release (AGENTS rule 4).
import type { ProposalItem } from "../contracts/proposal-item.ts";
type RoundReading = NonNullable<ProposalItem["rounds"]["draft"]>;
import { factSources, type FactSourceView } from "./sources.ts";
import type { Snapshot } from "./snapshot.ts";
import { sourceKey } from "../contracts/resolver.ts"; // SH3 R8

export const PQR_STEP = "pqr_picks";
/** One pick as an AI round gives it (p2/prompts/pqr-picks-output.v1.schema.json). */
export type PqrAnswerPick = { role: string; asks: string; quote: string; why: string };
export type PqrAnswer = { picks: PqrAnswerPick[]; unresolved: { passage: string; reason: string }[] };
export type Round = { output: PqrAnswer; from: "live" | "replay"; runFile: string; costUsd: number };
export type Dropped = { role: string; asks: string; why: string };
export type NewPick = Omit<ProposalItem, "id" | "status" | "decision">;

export const pqrShapeOk = (o: unknown): o is PqrAnswer => {
  const x = o as PqrAnswer;
  return !!x && Array.isArray(x.picks) && Array.isArray(x.unresolved) && x.picks.every((p) => p && typeof p.role === "string" && typeof p.asks === "string" && typeof p.quote === "string" && typeof p.why === "string");
};

/** The same text, whatever its quotes, dashes, case and spaces (the guide's text inventory vs a copied sentence). */
export const sameText = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const words = (s: string) => sameText(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** R2: a quote long enough to be the guide's sentence: at least 5 words and 25 letters. */
export const isSentence = (q: string) => (q.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).length >= 5) && (q.match(/\p{L}/gu) ?? []).length >= 25;

/** R1: the facts a prospect may be asked in pre-qualification, per person role. */
export function pqrCandidates(s: Snapshot): FactSourceView[] {
  return factSources(s).filter((f) => f.placed && f.source !== "AGENT" && !f.prequalification && f.forms.length > 0);
}

/** R5: the one question a round's words name for that person: the fact whose words (label or key) are exactly those
 *  words; else null (none, or more than one). */
export function matchFact(candidates: FactSourceView[], role: string, asks: string): FactSourceView | null {
  const w = words(asks);
  if (!w) return null;
  const hits = namedBy(candidates, role, asks);
  return hits.length === 1 ? hits[0] : null;
}
/** The facts of that person whose words (label, or the last part of the key) are exactly those words, or whose key it is. */
function namedBy(facts: FactSourceView[], role: string, asks: string): FactSourceView[] {
  const w = words(asks);
  return w ? facts.filter((f) => f.role === role && (words(f.label) === w || words(f.fact.split(".").pop()!.replace(/_/g, " ")) === w || f.fact === asks.trim())) : [];
}

/** The two rounds into queue items (R1–R5). `guide` is the file the rounds read; its text is where quotes must be. */
export function pqrPicksFromRounds(s: Snapshot, rounds: { draft: Round; check: Round }, guide: { file: string; sha256: string; text: string; code: string },
  at: { runId: string; combinationId: string }): { items: NewPick[]; dropped: Dropped[]; unresolved: { passage: string; reason: string }[] } {
  const candidates = pqrCandidates(s);
  const all = factSources(s);
  const text = sameText(guide.text);
  const dropped: Dropped[] = [];
  /** A round's picks that pass R1–R3, by "role|fact"; the rest dropped with the reason. */
  const kept = (r: Round, which: string) => {
    const out = new Map<string, { f: FactSourceView; p: PqrAnswerPick }>();
    for (const p of r.output.picks) {
      const f = matchFact(candidates, p.role, p.asks);
      if (!f) {
        const named = namedBy(all, p.role, p.asks), one = named.length === 1 ? named[0] : null;
        const why = named.length > 1 ? `"${p.asks}" could be ${named.length} questions of this person, so it is not guessed: pick it by hand (${which}).`
          : !one ? `No question of this combination asks "${p.asks}" of this person, so a prospect cannot be asked it (${which}).`
          : one.prequalification ? `"${one.label}" is already asked in the Prospect questionnaire (PQR) (${which}).`
          : one.source === "AGENT" ? `"${one.label}" comes from the case officer: a prospect is asked only what they can answer (${which}).`
          : `"${one.label}" is not asked by a question of this combination yet (${which}).`;
        dropped.push({ role: p.role, asks: p.asks, why }); continue;
      }
      // Break B4: a quote is a sentence (at least 5 words and 25 letters), not a word that is found anywhere.
      if (!isSentence(p.quote) || !text.includes(sameText(p.quote))) { dropped.push({ role: p.role, asks: p.asks, why: `Its sentence is not in ${guide.code}'s text, so it is not proposed (${which}).` }); continue; }
      const reason = p.why.trim();
      if (reason.length > 300 || (reason.match(/\p{L}/gu) ?? []).length < 3) { dropped.push({ role: p.role, asks: p.asks, why: `It has no reason in words of 3 to 300 characters (${which}).` }); continue; }
      const k = sourceKey(f.role, f.fact);
      if (!out.has(k)) out.set(k, { f, p });
    }
    return out;
  };
  const d = kept(rounds.draft, "first reading"), c = kept(rounds.check, "second reading");
  const reading = (r: Round, x: { f: FactSourceView; p: PqrAnswerPick }): RoundReading => ({
    reading: x.p.why.slice(0, 300), payload: { kind: "pqr_pick", factKey: x.f.fact, role: x.f.role, reason: x.p.why.trim().slice(0, 300) }, from: r.from, runFile: r.runFile, costUsd: r.costUsd });
  const items: NewPick[] = [];
  for (const k of [...new Set([...d.keys(), ...c.keys()])]) {
    const a = d.get(k), b = c.get(k), x = (a ?? b)!;
    const both = !!a && !!b;
    items.push({
      kind: "pqr_pick", runId: at.runId, step: PQR_STEP, scope: { formEdition: null, combinationId: at.combinationId }, landsOn: "combination", reuse: { match: "new", existingKey: null },
      payload: { kind: "pqr_pick", factKey: x.f.fact, role: x.f.role, reason: x.p.why.trim().slice(0, 300) },
      source: { file: guide.file, sha256: guide.sha256, edition: null, page: null, quote: x.p.quote.slice(0, 1000), quoteFound: true, rule: null },
      rounds: { draft: a ? reading(rounds.draft, a) : null, check: b ? reading(rounds.check, b) : null },
      rules: [{ rule: "pqr_subset_of_sqr", passed: true, why: null }, { rule: "quote_found", passed: true, why: null }],
      agreement: both ? "agreed" : "one_round", confidence: both ? "ready" : "decide",
      reason: both ? null : `Only the ${a ? "first" : "second"} reading picked "${x.f.label}"; the other did not. Decide: keep it or remove it.`,
      origin: "ai", identity: { key: k, near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE",
    });
  }
  const unresolved = [...rounds.draft.output.unresolved, ...rounds.check.output.unresolved.filter((u) => !rounds.draft.output.unresolved.some((v) => sameText(v.passage) === sameText(u.passage)))];
  return { items, dropped, unresolved };
}
