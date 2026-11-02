// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): the filings and fees a case's people
// make, derived from the case and never created by hand. Visitor visa (vv.single) only in this slice: each person who
// applies files their own application (temporary residence, BR-1), the family's filings go in one submission group
// (same time and place, BR-16), and the fee lines follow IRCC's fee list with its family maximums (BR-18): a capped line
// is carried by the principal's filing and the others are marked exempt ("Family Rate"), so the filings' lines always
// add up to the group's total. Each group is priced on its own (a filing split out pays alone), and biometrics count only
// the people aged 14 to 79 when ages are given (VV-R15). Other combinations answer "not derived yet", never a guess.
// Pure: no database, no clock; tests/runtime/check_vv_filings.ts. Shape: contracts/runtime.ts CaseFilings (r5c §"New").
//
// Filing modes per role come from the release ("Who can be in this application", M3-0) when it says them, else this
// table; the amounts are data with their source (P-170), Sample until the immigration expert confirms (P-171). Paying is
// not built.
import { createHash } from "node:crypto";
import type { CaseFiling, CaseFilings, FeeLine, FeeSource, NotFiling, SubmissionGroup } from "../../contracts/runtime.ts";
import type { Participant } from "./case.ts";
import FEES from "../../samples/fee-table.json" with { type: "json" };

/** R2 (P-230 (7)): the dated fee table is data (samples/fee-table.json: amounts, family maximums, ages and each line's
 *  source with page, quote and date), never code; a fee change is an edit there with its test. Part 2 moves it into a
 *  stored library table frozen with each release (setup S7a). */
/** P-247 (founder, 2 Nov): how a fee line is charged. per_position is not worked out yet: a combination using it is not
 *  derived, never guessed. */
export const FEE_BASES = ["per_application", "per_person_by_role", "per_position", "family_maximum"] as const;
export type FeeBasis = (typeof FEE_BASES)[number];
type TableLine = { key: string; label: string; status: string; basis: FeeBasis; per_person_cad: number; family_max?: { cad: number; from_people: number } | null; roles?: string[];
  exempt?: { under_age: number; over_age: number; source: FeeSource } | null; source: FeeSource };
type TableCombination = { label: string; lines: string[]; checklist?: boolean; modes?: Record<string, CaseFiling["mode"]>; group_why?: string };
export type FeeTable = { as_of: string; read: string; status: string; lines: TableLine[]; combinations: Record<string, TableCombination> };
export const FEE_TABLE = FEES as unknown as FeeTable;
// A line removed from the table leaves these undefined; the module never throws on load (break r1 B: a deleted line
// stopped the whole API).
const line = (key: string) => (Array.isArray(FEE_TABLE.lines) ? FEE_TABLE.lines.find((l) => l?.key === key) : undefined);
export const VISITOR_FEE_SOURCE = line("visitor_visa")?.source as FeeSource;
export const BIOMETRICS_FEE_SOURCE = line("biometrics")?.source as FeeSource;
/** VV-R15 (compliance-trace): who gives no biometrics, in IRCC's words with the page and its date. "Over 79" is read as
 *  80 or older, and age is counted as at today until the group is recorded (FQ-7, open). */
export const BIOMETRICS_EXEMPT_SOURCE = line("biometrics")?.exempt?.source as FeeSource;

/** Whether a fee line can be charged soundly (break r1, R2): an amount that is a number of zero or more, a basis the
 *  engine works out (not per_position), a family maximum with a positive amount from 2 people when the basis is
 *  family_maximum, a non-empty list of roles when it is per_person_by_role (and a list whenever roles are given), and
 *  whole-number age limits for an exemption. Anything else makes its combination not derived: never a wrong total. */
export function soundLine(l: TableLine | undefined): l is TableLine {
  if (!l || typeof l !== "object" || typeof l.key !== "string" || !FEE_BASES.includes(l.basis) || l.basis === "per_position") return false;
  if (typeof l.per_person_cad !== "number" || !Number.isFinite(l.per_person_cad) || l.per_person_cad < 0) return false;
  if (l.roles !== undefined && (!Array.isArray(l.roles) || !l.roles.length || l.roles.some((r) => typeof r !== "string"))) return false;
  if (l.basis === "per_person_by_role" && !l.roles?.length) return false;
  const m = l.family_max;
  if (l.basis === "family_maximum" && !(m && typeof m.cad === "number" && m.cad > 0 && Number.isInteger(m.from_people) && m.from_people >= 2)) return false;
  if (l.exempt && !(Number.isInteger(l.exempt.under_age) && Number.isInteger(l.exempt.over_age) && l.exempt.source)) return false;
  return true;
}

/** A fee line nobody outside these ages pays (biometrics, VV-R15): under `underAge` or over `overAge`. */
export type AgeExempt = { underAge: number; overAge: number; source: FeeSource };
/** A fee line: `roles` limits it to the filings of those roles (spouse and PNP fees); none means every filing. Without a
 *  family maximum the cap never applies (familyFrom is then beyond any household). */
export type FeeRule = { key: string; label: string; basis?: FeeBasis; perPersonCents: number; familyMaxCents: number; familyFrom: number; source: FeeSource; exempt?: AgeExempt; roles?: string[] };
type Rules = { label: string; modes: Map<string, CaseFiling["mode"]>; fees: FeeRule[]; groupWhy?: string;
  /** The table these rules were priced from (outside check on #455: the basis names that table, never the shipped one). */
  table?: { as_of: string; read: string } };
/** What the case adds (C6.12, the stored prepare view): each person's age in whole years (null: no date of birth yet),
 *  the filing modes the release says per role (M3-0; a role it leaves out falls back to the table below), and the
 *  submission group each person's filing is in (a split is stored; default the family group). */
export type FilingOptions = { ages?: Map<string, number | null>; modes?: Map<string, CaseFiling["mode"]>; groupOf?: (subject: string) => string; groupKind?: (group: string) => SubmissionGroup["kind"] };
export const FAMILY_GROUP = "group-family";

/** A combination's rules from the fee table (an own property only: "constructor" or "__proto__" is no combination). */
export function rulesFrom(table: FeeTable, key: string): Rules | undefined {
  const c = Object.hasOwn(table.combinations, key) ? table.combinations[key] : undefined;
  if (!c) return undefined;
  // A combination lists its lines once each, at least one; the table holds each key once (break r1 B).
  if (!Array.isArray(c.lines) || !c.lines.length || new Set(c.lines).size !== c.lines.length || !Array.isArray(table.lines)) return undefined;
  const keys = table.lines.map((l) => l?.key);
  if (new Set(keys).size !== keys.length) return undefined;
  const lines = c.lines.map((k) => table.lines.find((l) => l.key === k));
  if (!lines.every(soundLine)) return undefined;
  // A line the engine cannot charge soundly makes the combination not derived: a missing line, a basis not worked out
  // (per_position), a family maximum without its cap, or a per-role line naming no role.
  const fees = (lines as TableLine[]).map((l): FeeRule => ({
    key: l.key, label: l.label, basis: l.basis, perPersonCents: Math.round(l.per_person_cad * 100),
    // Only the family_maximum basis caps a line (P-247): any other basis charges each person or application in full.
    familyMaxCents: l.basis === "family_maximum" ? Math.round(l.family_max!.cad * 100) : 0, familyFrom: l.basis === "family_maximum" ? l.family_max!.from_people : Number.MAX_SAFE_INTEGER,
    source: l.source, ...(l.exempt ? { exempt: { underAge: l.exempt.under_age, overAge: l.exempt.over_age, source: l.exempt.source } } : {}), ...(l.roles ? { roles: l.roles } : {}) }));
  return { label: c.label, modes: new Map(Object.entries(c.modes ?? {})), fees, groupWhy: c.group_why, table: { as_of: table.as_of, read: table.read } };
}
const RULES = { get: (key: string) => rulesFrom(FEE_TABLE, key) };

/** The fee rule of a combination by its key (biometrics: its ages, VV-R15), for the items and words that need it. */
export const feeRule = (combinationKey: string, key: string): FeeRule | undefined => RULES.get(combinationKey)?.fees.find((f) => f.key === key);

export const cad = (cents: number) => `CAD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
/** Whole years between a date of birth (YYYY-MM-DD) and today; null without one. */
export function ageOn(dob: string | null | undefined, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob ?? "");
  if (!m) return null;
  const t = today.toISOString().slice(0, 10);
  const years = Number(t.slice(0, 4)) - Number(m[1]);
  return t.slice(5) >= `${m[2]}-${m[3]}` ? years : years - 1;
}

/** Whether a person pays an age-limited line: yes, no (with IRCC's reason), or it waits for the date of birth. Without
 *  ages (the pure checks of #283) everyone pays. */
export function ageCheck(rule: FeeRule, age: number | null | undefined): { pays: true } | { pays: false; why: string } | { waits: true } {
  if (!rule.exempt || age === undefined) return { pays: true };
  if (age === null) return { waits: true };
  const what = rule.label.toLowerCase().replace(/ fee$/, "");
  if (age < rule.exempt.underAge) return { pays: false, why: `Under ${rule.exempt.underAge}: no ${what} (IRCC: "a child under the age of ${rule.exempt.underAge}").` };
  if (age > rule.exempt.overAge) return { pays: false, why: `Over ${rule.exempt.overAge}: no ${what} (IRCC: "an applicant over the age of ${rule.exempt.overAge}").` };
  return { pays: true };
}

/** A fee line over the people applying together: the per-person amount each, capped at the family maximum once the group
 *  has at least `familyFrom` people (IRCC: "applying at the same time and place", so within one submission group only). */
export function familyFee(rule: FeeRule, people: number): SubmissionGroup["totals"][number] {
  const listCents = rule.perPersonCents * people;
  const capApplied = people >= rule.familyFrom && listCents > rule.familyMaxCents;
  const totalCents = capApplied ? rule.familyMaxCents : listCents;
  // P-247: a line on any basis but family_maximum has no cap, so its words never name one (outside check on #455).
  const capped = !rule.basis || rule.basis === "family_maximum";
  const why = !capped
    ? `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)} (${rule.basis === "per_application" ? "per application" : "per person"}; no family maximum).`
    : capApplied
    ? `${people} people applying together: the family maximum ${cad(rule.familyMaxCents)} applies instead of ${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}.`
    : people >= rule.familyFrom
      ? `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}, not above the family maximum ${cad(rule.familyMaxCents)}.`
      : `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}; the family maximum ${cad(rule.familyMaxCents)} starts at ${rule.familyFrom} people applying together.`;
  return { line: rule.key, label: rule.label, people, per_person_cents: rule.perPersonCents, list_cents: listCents, family_max_cents: rule.familyMaxCents, family_from: rule.familyFrom, total_cents: totalCents, cap_applied: capApplied, why, source: rule.source };
}

/** The age exemptions of a combination's lines in words, from the table (no age is written in code). */
function ageWords(rules: Rules, ages: boolean): string {
  const limited = rules.fees.filter((f) => f.exempt);
  if (!limited.length) return "";
  if (!ages) return `${limited.map((f) => f.label.replace(/ fee$/, "")).join(", ")} exemptions (for example by age) are not checked yet: every person applying is charged.`;
  return limited.map((f) => `${f.label.replace(/ fee$/, "")}: none under ${f.exempt!.underAge} or over ${f.exempt!.overAge}, age as at today (FQ-7).`).join(" ");
}

/** The case's filings, submission groups and fee lines, from the combination's key and the people on the case. Each
 *  group is priced on its own; an age-limited line counts only the people who pay it, and a person with no date of birth
 *  yet has a line that waits for it, never charged or exempt in silence (G15). */
export function deriveFilings(combinationKey: string, people: Participant[], rulesFor: (key: string) => Rules | undefined = (k) => RULES.get(k), opts: FilingOptions = {}): CaseFilings {
  const rules = rulesFor(combinationKey);
  if (!rules) return { derived: false, combination: combinationKey, why: `Filings and fees are not derived yet for this combination (they are worked out once its fee lines and filing modes are in the fee table). Nothing is guessed.` };
  const modeOf = (role: string) => opts.modes?.get(role) ?? rules.modes.get(role);
  const persons = people.filter((p) => p.role !== "case");
  const notFiling: NotFiling[] = [];
  const filers: Participant[] = [];
  for (const p of persons) {
    if (!rules.modes.has(p.role) && !opts.modes?.has(p.role)) notFiling.push({ subject: p.subjectId, label: p.label, role: p.role, why: `The ${rules.label} has no filing for the role "${p.role}".` });
    else if (!p.applies) notFiling.push({ subject: p.subjectId, label: p.label, role: p.role, why: "Not travelling (not applying on this case): no filing and no fee." });
    else filers.push(p);
  }
  // Break r1 B16: on_principal filings with no application of their own on the case (the principal not travelling) have
  // no application to be charged on: a per_application line then is not derived, never guessed.
  if (rules.fees.some((f) => f.basis === "per_application") && filers.length && filers.every((p) => modeOf(p.role) === "on_principal"))
    return { derived: false, combination: combinationKey, why: "Everyone applying is on another person's application, and that person is not applying: the application fee cannot be worked out. Nothing is guessed." };
  const groupOf = opts.groupOf ?? (() => FAMILY_GROUP);
  // Keyed by the person, so a filing keeps its id when someone else stops travelling.
  const filings: CaseFiling[] = filers.map((p) => ({ id: `filing-${p.subjectId}`, combination: combinationKey, label: `${rules.label}: ${p.label}`, mode: modeOf(p.role)!,
    applicants: [{ subject: p.subjectId, label: p.label, role: p.role, mode: "applying" }], group: groupOf(p.subjectId), status: "NOT_STARTED", number: null }));
  const groups: SubmissionGroup[] = [], fees: FeeLine[] = [];
  for (const gid of [...new Set(filings.map((f) => f.group))]) {
    const all = filings.filter((f) => f.group === gid), mine = all;
    const totals: SubmissionGroup["totals"] = [];
    for (const rule of rules.fees) {
      // A per_application line is charged once per application: a filing on the principal's application (on_principal)
      // is covered by it when that application is in the same group, never charged twice; split out alone, it pays its
      // own (outside check on #455).
      const ownInGroup = all.some((f) => f.mode !== "on_principal");
      const matching = all.filter((f) => !rule.roles || rule.roles.includes(f.applicants[0].role));
      // With no own application in the group, its on_principal filings are still one application: charged once.
      const firstDependent = matching.find((f) => f.mode === "on_principal");
      const mine = rule.basis !== "per_application" ? matching : matching.filter((f) => f.mode !== "on_principal" || (!ownInGroup && f === firstDependent));
      if (!mine.length) continue;
      const check = new Map(mine.map((f) => [f.id, ageCheck(rule, opts.ages?.get(f.applicants[0].subject))]));
      const paying = mine.filter((f) => { const c = check.get(f.id)!; return "pays" in c && c.pays; });
      const t = familyFee(rule, paying.length);
      totals.push(t);
      // The group's payer: the principal's filing when the principal pays this line, else the first that pays.
      const lead = paying.find((f) => f.applicants[0].role === "principal") ?? paying[0];
      for (const f of mine) {
        const c = check.get(f.id)!, who = f.applicants[0], what = t.label.toLowerCase().replace(/ fee$/, "");
        if ("waits" in c) fees.push({ filing: f.id, payer: who.subject, line: t.line, label: t.label, amount_cents: rule.perPersonCents, exempt: false, waiting: "person.date_of_birth", why: `Waits for ${who.label}'s date of birth: no ${what} under ${rule.exempt!.underAge} or over ${rule.exempt!.overAge}. Not counted until it is answered.`, source: rule.exempt!.source });
        else if (!c.pays) fees.push({ filing: f.id, payer: who.subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: c.why, source: rule.exempt!.source });
        else if (!t.cap_applied) fees.push({ filing: f.id, payer: who.subject, line: t.line, label: t.label, amount_cents: t.per_person_cents, exempt: false, why: `${cad(t.per_person_cents)} for ${who.label}.` });
        else if (f === lead) fees.push({ filing: f.id, payer: who.subject, line: t.line, label: t.label, amount_cents: t.total_cents, exempt: false, why: `Family maximum ${cad(t.total_cents)} for the ${t.people} people applying together, paid on this filing.` });
        else fees.push({ filing: f.id, payer: lead!.applicants[0].subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: `Covered by the family maximum on ${lead!.applicants[0].label}'s filing.` });
      }
    }
    const kind = opts.groupKind?.(gid) ?? "family";
    groups.push({ id: gid, kind, label: mine.length === 1 ? "One submission" : `One submission for ${mine.length} people`, filings: mine.map((f) => f.id), splittable: mine.length > 1,
      why: kind === "separate" ? "Split out with a reason: priced on its own, so the other group's family maximums do not cover it." : mine.length === 1 ? "One person applying." : rules.groupWhy ?? "The family's applications go together, so the family maximums apply.",
      totals, total_cents: totals.reduce((s, t) => s + t.total_cents, 0) });
  }
  const body = { filings, groups, fees, not_filing: notFiling };
  return { derived: true, combination: combinationKey, label: rules.label, ...body, currency: "CAD",
    basis: `Fees from the ${rules.fees[0]?.source.page ?? "fee table"} (fee table as of ${rules.table?.as_of ?? FEE_TABLE.as_of}, read ${rules.table?.read ?? FEE_TABLE.read}); Sample until the immigration expert confirms (P-171). ${ageWords(rules, !!opts.ages)} Paying is not built.`,
    why: filings.length ? null : "Nobody on this case is applying, so there is no filing and no fee.",
    version: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16) };
}
