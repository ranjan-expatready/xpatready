// C6.19 (P-419; concept product/screens/C6.19/concept.md): a returning client's confirmed facts from an earlier case,
// offered on their next case, re-confirmed before use and never copied silently (P-65: copies, not live links). Pure
// rules, no database: who is the same person (BR-1, BR-2), which facts are offered (BR-2), their state against this
// case (BR-5) and the expiry flags (BR-6), read from samples/fact-expiry-rules.json (rules as data with their source,
// P-425: no combination key or program branch here).
import { factState } from "./employer.ts";
import { inStoredOrder } from "./team.ts";
import { checkValue, type Participant } from "./case.ts";
import { scopeOf } from "../resolver.ts";
import { subjectKindOf, type Snapshot } from "../snapshot.ts";
import RULES from "../../samples/fact-expiry-rules.json" with { type: "json" };

/** The source written on a re-confirmed copy (BR-3), shown as "earlier case". */
export const EARLIER_CASE = "earlier_case";

export type RuleSource = { page: string; url: string; quote: string; recorded: string; file: string; applies_to?: string[] } | { sample: true; why: string };
export type ExpiryRule = { key: string; fact: string; kind: "expires_before_today" | "expires_within_months" | "issued_more_than_months_ago"; months?: number; blocks: boolean; covers: string[]; words: string; source: RuleSource };
export const EXPIRY_RULES = RULES.rules as ExpiryRule[];
export type ExpiryFlag = { status: "expired" | "soon" | "unknown"; rule: string; words: string; blocks: boolean; date: string | null; source: RuleSource };

/** BR-1: two names are the same person's when they read the same, trimmed, inner spaces collapsed, in any letter case. */
export const sameName = (a: string, b: string) => norm(a) === norm(b) && norm(a) !== "";
const norm = (s: string) => String(s ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase(); // breaker m7: one Unicode form

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const dayOf = (v: unknown): number | null => {
  const m = ISO.exec(String(v ?? ""));
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? t : null;
};
const addMonths = (t: number, n: number) => { const d = new Date(t); d.setUTCMonth(d.getUTCMonth() + n); return d.getTime(); };
const dateWords = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Challenge M3: a cited rule speaks for the combinations its page covers (data); on any other combination the same
 *  check runs, labelled Sample with the page it was cited from. With no combination named, the source stays as cited. */
export function sourceOn(src: RuleSource, combinationKey?: string): RuleSource {
  if ("sample" in src || !combinationKey || !src.applies_to || src.applies_to.includes(combinationKey)) return src;
  return { sample: true, why: `Sample on this combination: canada.ca states it on "${src.page}" (recorded ${src.recorded}): "${src.quote}"` };
}

/** BR-6: the expiry flags on one person's earlier facts, by fact. Every fact a triggered rule covers takes its flag; a
 *  blocking flag wins over a warning. No valid today means no check can pass: refused (fail closed, never "not expired").
 *  Challenge m1: a blocking expiry rule whose date is not known on the earlier case warns on the facts it covers. */
export function expiryFlags(facts: Map<string, unknown>, today: Date, rules: ExpiryRule[] = EXPIRY_RULES, combinationKey?: string): Map<string, ExpiryFlag> {
  if (!(today instanceof Date) || Number.isNaN(today.getTime())) throw new Error("No date for today: expiry cannot be checked, so nothing is offered.");
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const out = new Map<string, ExpiryFlag>();
  const put = (f: string, flag: ExpiryFlag) => { const had = out.get(f); const rank = (x: ExpiryFlag) => (x.blocks ? 2 : x.status === "soon" ? 1 : 0); if (!had || rank(flag) > rank(had)) out.set(f, flag); };
  for (const r of rules) {
    const t = dayOf(facts.get(r.fact));
    if (t === null) {
      if (r.kind === "expires_before_today" && r.blocks) for (const f of r.covers) if (f !== r.fact) put(f, { status: "unknown", rule: r.key, words: "The expiry date is not known on the earlier case: check the document before re-confirming.", blocks: false, date: null, source: sourceOn(r.source, combinationKey) });
      continue;
    }
    const hit = r.kind === "expires_before_today" ? t < now
      : r.kind === "expires_within_months" ? t >= now && t < addMonths(now, r.months ?? 0)
      : t < addMonths(now, -(r.months ?? 0));
    if (!hit) continue;
    const flag: ExpiryFlag = { status: r.blocks ? "expired" : "soon", rule: r.key, words: r.words.replace("{date}", dateWords(t)), blocks: r.blocks, date: String(facts.get(r.fact)), source: sourceOn(r.source, combinationKey) };
    for (const f of r.covers) put(f, flag);
  }
  return out;
}

type Placement = { fact: string; repeats?: string | null; scope?: string | null; order?: number };
/** BR-2: the facts this case's pinned release asks about a person, once each (not a repeating row, not the
 *  application's, not a background question: P-244 asks those fresh on each application), in question order. */
export function personFactsAsked(s: Snapshot, background: Set<string> = new Set()): { fact: string; label: string; order: number }[] {
  const labels = new Map(((s.canonical_fields ?? []) as { id: string; label?: string | null; meaning?: string }[]).map((f) => [f.id, f.label || f.meaning || f.id]));
  const seen = new Map<string, { fact: string; label: string; order: number }>();
  for (const p of (s.placements ?? []) as Placement[]) {
    if (!p.fact || seen.has(p.fact) || p.repeats === "per_row" || background.has(p.fact)) continue;
    if (subjectKindOf(p.fact) !== "PERSON" || scopeOf(p.fact, p) !== "person") continue;
    seen.set(p.fact, { fact: p.fact, label: labels.get(p.fact) ?? p.fact, order: p.order ?? 0 });
  }
  return [...seen.values()].sort((a, b) => a.order - b.order || a.fact.localeCompare(b.fact));
}

/** BR-2: each person on this case matched to one person on the earlier case: the principal to its principal (BR-1 chose
 *  the earlier case by the principal's name), anyone else by the same role and the same name. Each earlier person once. */
export function matchPeople(here: Participant[], earlier: Participant[]): Map<string, string> {
  const out = new Map<string, string>(), used = new Set<string>();
  for (const p of here) {
    if (p.role === "case") continue;
    const m = earlier.find((e) => !used.has(e.subjectId) && e.role === p.role && (p.role === "principal" || sameName(e.label, p.label)));
    if (m) { out.set(p.subjectId, m.subjectId); used.add(m.subjectId); }
  }
  return out;
}

/** One earlier answer as the offer reads it: confirmed on the earlier case (confirmation().confirmed) or not. */
export type EarlierAnswer = { id: string; subjectId: string; field: string; value: unknown; confirmed: boolean; confirmedAt: string; confirmedBy: string; seenAt?: string };
/** QA-338 (review m3): when the firm last vouched for an answer: a copy's re-confirmation, else the answer's own time. */
const seenOf = (a: EarlierAnswer) => a.seenAt ?? a.confirmedAt;
export type CurrentAnswer = { id: string; subjectId: string; field: string; value: unknown };
/** QA-338: a value confirmed later on another earlier case of the same person, which makes this case's copy out of date. */
export type NewerValue = { case_id: string; reference: string; value: unknown; confirmed_at: string; words: string };
export type OfferFact = { fact: string; label: string; value: unknown; from_answer: string; confirmed_at: string; confirmed_by: string; state: "new" | "different"; current: { answer_id: string; value: unknown } | null; expiry: ExpiryFlag | null; newer: NewerValue | null; problems: string[]; usable: boolean };

/** QA-338 (BR-6; concept §1, "an expired passport is caught before it reaches a form"): the newest value for each person
 *  on this case across every earlier case read, keyed "<this case's subject>|<fact>". Two earlier cases can disagree (a
 *  copy kept on case B, BR-3, while case A was corrected later). Confirmed answers only by default (the Out of date flag);
 *  with confirmedOnly false, also answers typed and not yet confirmed (the expiry check, as on one case: review M1).
 *  Pure: the reads are the earlier cases' answers with each case's person match (matchPeople). */
export type Latest = { case_id: string; reference: string; value: unknown; at: string };
export function latestConfirmed(reads: { case_id: string; reference: string; match: Map<string, string>; answers: EarlierAnswer[] }[], confirmedOnly = true): Map<string, Latest> {
  const out = new Map<string, Latest>();
  for (const r of reads) {
    for (const [here, from] of r.match) {
      for (const a of r.answers) {
        if (a.subjectId !== from || (confirmedOnly && !a.confirmed)) continue;
        const k = `${here}|${a.field}`, had = out.get(k);
        if (!had || seenOf(a) > had.at) out.set(k, { case_id: r.case_id, reference: r.reference, value: a.value, at: seenOf(a) });
      }
    }
  }
  return out;
}
const strength = (f?: ExpiryFlag) => (!f ? -1 : f.blocks ? 2 : f.status === "soon" ? 1 : 0);
/** The newer value from another earlier case that differs from this one, or null. */
const newerThan = (latest: Latest | undefined, caseId: string | undefined, value: unknown, at: string): Latest | null =>
  latest && caseId && latest.case_id !== caseId && latest.at > at && factState(latest.value, { value }) === "different" ? latest : null;
export type OfferPerson = { subject_id: string; label: string; role: string; from_subject_id: string | null; from_label: string | null; facts: OfferFact[] };

/** BR-2, BR-5, BR-6: what one earlier case offers each person on this case. A fact this case already holds with the same
 *  value is not offered (Same); a different one is shown with both values (Different); an expired or unfit value is
 *  shown and not usable. Earlier people with no match are listed by name and role (nothing of theirs moves). */
/** QA-338: with `latest` (latestConfirmed over every earlier case read), `latestAny` (the same with unconfirmed answers)
 *  and this earlier case's id, a fact confirmed differently later on another earlier case is shown with that value and
 *  reason and is not usable, and a date this case holds is also checked as the newest one held for the person elsewhere
 *  (the stricter flag wins), so a stale copy of a corrected, expired passport is caught. A date this case lacks is not borrowed (review m1: it may be
 *  another passport's; BR-6's "not known" warning stays). */
export function offerFrom(input: { snapshot: Snapshot; here: Participant[]; current: CurrentAnswer[]; earlier: Participant[]; earlierAnswers: EarlierAnswer[]; background?: Set<string>; today: Date; rules?: ExpiryRule[]; combinationKey?: string; caseId?: string; latest?: Map<string, Latest>; latestAny?: Map<string, Latest> }): { people: OfferPerson[]; unmatched: { label: string; role: string }[] } {
  const asked = personFactsAsked(input.snapshot, input.background);
  const match = matchPeople(input.here, input.earlier);
  const people: OfferPerson[] = [];
  for (const p of input.here) {
    if (p.role === "case") continue;
    const from = match.get(p.subjectId) ?? null, fromP = input.earlier.find((e) => e.subjectId === from);
    const all = from ? input.earlierAnswers.filter((a) => a.subjectId === from) : [], theirs = all.filter((a) => a.confirmed);
    // An expiry date read even when it was not confirmed there: a confirmed passport number never escapes an expired date.
    // QA-338: a newer date on another earlier case, confirmed or only typed, can add a stricter flag and never lift one
    // (review R1, R4: a renewal elsewhere, drafted or with no number, must not release this case's expired passport; the
    // officer re-confirms the valid passport from the case that holds it). The strongest flag per fact wins.
    const datedBy = (l?: Map<string, Latest>) => {
      const d = new Map(all.map((a) => [a.field, a.value]));
      for (const a of all) { const n = newerThan(l?.get(`${p.subjectId}|${a.field}`), input.caseId, a.value, seenOf(a)); if (n) d.set(a.field, n.value); }
      return d;
    };
    const flags = expiryFlags(datedBy(), input.today, input.rules, input.combinationKey);
    for (const l of [input.latest, input.latestAny]) for (const [f, flag] of expiryFlags(datedBy(l), input.today, input.rules, input.combinationKey)) if (strength(flag) > strength(flags.get(f))) flags.set(f, flag);
    const facts: OfferFact[] = [];
    for (const q of asked) {
      const a = theirs.find((x) => x.field === q.fact);
      if (!a) continue;
      const cur = input.current.find((x) => x.subjectId === p.subjectId && x.field === q.fact) ?? null;
      const state = factState(a.value, cur);
      if (state === "same") continue;
      const problems = checkValue(input.snapshot, q.fact, a.value, input.today), expiry = flags.get(q.fact) ?? null;
      const n = newerThan(input.latest?.get(`${p.subjectId}|${q.fact}`), input.caseId, a.value, seenOf(a));
      const newer: NewerValue | null = n ? { case_id: n.case_id, reference: n.reference, value: inStoredOrder(n.value), confirmed_at: n.at, words: `Out of date: ${n.reference}, another earlier case, confirmed a different value later. Check with the client which is true before using either.` } : null;
      facts.push({ fact: q.fact, label: q.label, value: inStoredOrder(a.value), from_answer: a.id, confirmed_at: a.confirmedAt, confirmed_by: a.confirmedBy, state, current: cur ? { answer_id: cur.id, value: inStoredOrder(cur.value) } : null, expiry, newer, problems, usable: !problems.length && !expiry?.blocks && !newer });
    }
    people.push({ subject_id: p.subjectId, label: p.label, role: p.role, from_subject_id: from, from_label: fromP?.label ?? null, facts });
  }
  const matched = new Set(match.values());
  return { people, unmatched: input.earlier.filter((e) => e.role !== "case" && !matched.has(e.subjectId)).map((e) => ({ label: e.label, role: e.role })) };
}
