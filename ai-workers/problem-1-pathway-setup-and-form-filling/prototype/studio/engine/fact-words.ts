// QA-162 (C4.7, C4.11 step 5; P-227, P-76): which ONE question of a combination an AI round's short words name. An AI
// round writes a fact in its own few words ("Purpose of visit", "Criminal record"); the combination asks it in the
// library's words ("Purpose of the visit to Canada", key case.visit_purpose). Pure: no database, no AI.
// The rule, in order (never guessed: two or more equally good questions → none, and the reason names every one):
//   W1 exact: the words equal a question's label, the last part of its key, one of its other names, or the key itself;
//   W2 words (a pick of two meaningful words or more): every meaningful word of the pick (after plain-word normalising and the short synonym list below; the
//      person's own role words like "spouse" dropped) is found in one question's label, key, question text or aliases;
//      when several questions hold them all, none (QA-194: the shorter key never wins; the person picks from the named ones);
//      a lone holder whose key ends in "_from" or "_to" (or "_from_date", "_to_date") is refused when the pick says only the other end ("Intended stay
//      to" never lands on the first day). "to" stays filler in prose ("Relationship to applicant"), so it never decides.
//   A pick for the principal may name a question about the application itself (role "case": purpose of the visit, funds,
//   dates), since the principal answers those; never another person's question.
import type { FactSourceView } from "./sources.ts";

/** Words that never decide which question is meant. */
const STOP = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "for", "or", "and", "any", "ever", "whether", "person", "persons", "this", "that", "these", "is", "are", "was", "were", "be", "been", "has", "have", "had", "with", "by", "as", "if", "your", "their", "his", "her", "its", "one", "s"]);
/** The short synonym list (reviewed with the PR, extended only with a reason): IRCC's and the library's words for the
 *  same thing. Abbreviations are written out first. Each maps to the library's word. */
const SAME: Record<string, string> = { record: "history", condition: "disorder", description: "detail", pr: "permanent resident", id: "identity", nationality: "citizenship", dob: "birth day", date: "day" };
/** The person's own role in words: "Accompanying spouse or partner" for the spouse says "Accompanying". */
const ROLE_WORDS: Record<string, string[]> = { spouse_or_partner: ["spouse", "partner", "common", "law"], child: ["child", "children", "dependent", "dependant"], principal: ["applicant", "principal"] };

/** A plain stem: plurals, -ing, -ed, -ly and a final e off, a doubled last letter single ("planned" = "plan"). */
export function stem(w: string): string {
  let x = w;
  if (x.length > 4 && x.endsWith("ies")) x = `${x.slice(0, -3)}y`;
  else if (x.length > 3 && x.endsWith("s") && !x.endsWith("ss") && !x.endsWith("us")) x = x.slice(0, -1);
  if (x.length > 5 && x.endsWith("ing")) x = x.slice(0, -3);
  else if (x.length > 4 && x.endsWith("ed")) x = x.slice(0, -2);
  else if (x.length > 6 && x.endsWith("ly")) x = x.slice(0, -2);
  if (x.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(x)) x = x.slice(0, -1);
  if (x.length > 3 && x.endsWith("e")) x = x.slice(0, -1);
  return x;
}
const SAME_STEMS = new Map(Object.entries(SAME).map(([k, v]) => [stem(k), v]));
/** The meaningful words of a text, normalised: lower case, letters and digits only, stop words out, synonyms in. */
export function wordsOf(text: string): string[] {
  const raw = text.toLowerCase().normalize("NFKD").replace(/[_.]/g, " ").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of raw) {
    if (STOP.has(w)) continue;
    const s = stem(w), same = SAME_STEMS.get(s);
    for (const x of same ? same.split(" ").map(stem) : [s]) out.push(x);
  }
  return out;
}
const plain = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const lastPart = (fact: string) => fact.split(".").pop()!.replace(/_/g, " ");

/** Extra names of a fact beyond its label and key: its question text on this combination and the library's aliases. */
export type Names = Map<string, string[]>;
export type Found = { fact: FactSourceView; how: "exact" | "words" } | { fact: null; why: "none" | "several"; several: FactSourceView[] };

/** The roles a pick for this person may name (see the header). */
const rolesFor = (role: string) => role === "principal" ? ["principal", "case"] : [role];

/** W1–W2: the one question of `facts` that `asks` names for this person, or why none. */
export function findFact(facts: FactSourceView[], role: string, asks: string, names: Names = new Map()): Found {
  const want = plain(asks);
  if (!want) return { fact: null, why: "none", several: [] };
  const mine = facts.filter((f) => f.role === role), near = facts.filter((f) => rolesFor(role).includes(f.role));
  // W1 on the person's own questions first, as before QA-162 (an exact name is never overruled by a wider search).
  const exact = (pool: FactSourceView[]) => pool.filter((f) => f.fact === asks.trim() || plain(f.label) === want || plain(lastPart(f.fact)) === want || (names.get(f.fact) ?? []).some((n) => plain(n) === want));
  for (const pool of [mine, near]) {
    const hit = exact(pool);
    if (hit.length === 1) return { fact: hit[0], how: "exact" };
    if (hit.length > 1) return { fact: null, why: "several", several: hit };
  }
  // W2: every meaningful word of the pick, the person's own role words dropped.
  const drop = new Set((ROLE_WORDS[role] ?? []).map(stem));
  const said = [...new Set(wordsOf(asks))], pick = said.filter((w) => !drop.has(w));
  // Review m1: one word ("Marriage", "Police", "Health") is too little to tie to a long label: exact only (W1).
  if (!pick.length || said.length < 2) return { fact: null, why: "none", several: [] };
  const all = (f: FactSourceView) => { const have = new Set([f.label, lastPart(f.fact), ...(names.get(f.fact) ?? [])].flatMap(wordsOf)); return pick.every((w) => have.has(w)); };
  const hits = near.filter(all);
  // QA-194: the end a key names ("_to"/"_from") against the ends the pick says; the pick's own "to" is only ever a veto.
  const said2 = new Set(want.split(" ")), end = (f: FactSourceView) => /_(to|from)(?:_date)?$/.exec(f.fact)?.[1];
  const otherEnd = (f: FactSourceView) => { const e = end(f); return !!e && !said2.has(e) && said2.has(e === "to" ? "from" : "to"); };
  if (hits.length === 1) return otherEnd(hits[0]) ? { fact: null, why: "none", several: [] } : { fact: hits[0], how: "words" };
  // QA-194: several hold every word ("Purpose of visit": the purpose and its 'other' details) → none, every one named.
  return hits.length ? { fact: null, why: "several", several: hits } : { fact: null, why: "none", several: [] };
}

/** The names a person sees for the questions a pick could be: every one (QA-194: the person picks among them). */
export const listed = (fs: FactSourceView[]) => fs.map((f) => `"${f.label}"`).join(", ");

/** The other names of each fact on this combination: its question text where placed, and the library's aliases (P-65:
 *  the labels a field carries on forms and screens) when the caller has them. */
export function namesOf(placements: { fact: string; question_text?: string | null }[], aliases: { key: string; aliases: string[] }[] = []): Names {
  const out: Names = new Map();
  const add = (k: string, n: string | null | undefined) => { if (n && n.trim()) out.set(k, [...(out.get(k) ?? []), n.trim()]); };
  for (const p of placements) add(p.fact, p.question_text);
  for (const a of aliases) for (const n of a.aliases) add(a.key, n);
  return out;
}
