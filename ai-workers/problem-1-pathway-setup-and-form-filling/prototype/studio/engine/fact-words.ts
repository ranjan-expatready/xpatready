// QA-162 (C4.7, C4.11 step 5; P-227, P-76): which ONE question of a combination an AI round's short words name. An AI
// round writes a fact in its own few words ("Purpose of visit", "Criminal record"); the combination asks it in the
// library's words ("Purpose of the visit to Canada", key case.visit_purpose). Pure: no database, no AI.
// The rule, in order (never guessed: two or more equally good questions → none, and the reason names them):
//   W1 exact: the words equal a question's label, the last part of its key, one of its other names, or the key itself;
//   W2 words: every meaningful word of the pick (after plain-word normalising and the short synonym list below; the
//      person's own role words like "spouse" dropped) is found in one question's label, key, question text or aliases;
//      when several questions hold them all, the one whose key says nothing more than the pick wins, else none.
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
  const pick = [...new Set(wordsOf(asks))].filter((w) => !drop.has(w));
  if (!pick.length) return { fact: null, why: "none", several: [] };
  const all = (f: FactSourceView) => { const have = new Set([f.label, lastPart(f.fact), ...(names.get(f.fact) ?? [])].flatMap(wordsOf)); return pick.every((w) => have.has(w)); };
  const hits = near.filter(all);
  if (hits.length === 1) return { fact: hits[0], how: "words" };
  if (!hits.length) return { fact: null, why: "none", several: [] };
  // Several hold every word: the one whose key adds nothing to the pick ("visit purpose", not "visit purpose other").
  const set = new Set(pick);
  const tight = hits.filter((f) => wordsOf(lastPart(f.fact)).every((w) => set.has(w)));
  return tight.length === 1 ? { fact: tight[0], how: "words" } : { fact: null, why: "several", several: hits };
}

/** The names a person sees for the questions a pick could be (at most three, then "and n more"). */
export const listed = (fs: FactSourceView[]) => `${fs.slice(0, 3).map((f) => `"${f.label}"`).join(", ")}${fs.length > 3 ? ` and ${fs.length - 3} more` : ""}`;

/** The other names of each fact on this combination: its question text where placed, and the library's aliases (P-65:
 *  the labels a field carries on forms and screens) when the caller has them. */
export function namesOf(placements: { fact: string; question_text?: string | null }[], aliases: { key: string; aliases: string[] }[] = []): Names {
  const out: Names = new Map();
  const add = (k: string, n: string | null | undefined) => { if (n && n.trim()) out.set(k, [...(out.get(k) ?? []), n.trim()]); };
  for (const p of placements) add(p.fact, p.question_text);
  for (const a of aliases) for (const n of a.aliases) add(a.key, n);
  return out;
}
