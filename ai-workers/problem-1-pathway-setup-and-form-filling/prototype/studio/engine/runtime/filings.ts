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
import type { LineMode } from "../../contracts/workspace.ts";
import { filingPlan, isLineMode, notWorkedOut, type PlanPerson } from "../filing-modes.ts";
import FEES from "../../samples/fee-table.json" with { type: "json" };
import ROLES from "../../samples/person-roles.json" with { type: "json" };

/** R2 (P-230 (7)): the dated fee table is data (samples/fee-table.json: amounts, family maximums, ages and each line's
 *  source with page, quote and date), never code; a fee change is an edit there with its test. Part 2 moves it into a
 *  stored library table frozen with each release (setup S7a). */
/** P-247 (founder, 2 Nov): how a fee line is charged. per_position is not worked out yet: a combination using it is not
 *  derived, never guessed. */
export const FEE_BASES = ["per_application", "per_person_by_role", "per_position", "family_maximum"] as const;
export type FeeBasis = (typeof FEE_BASES)[number];
type TableLine = { key: string; label: string; status: string; basis: FeeBasis; per_person_cad: number; family_max?: { cad: number; from_people: number } | null; roles?: string[];
  exempt?: { under_age: number; over_age: number; source: FeeSource } | null; source: FeeSource };
/** C6.12-22 (P-171 (4); M3 design rows.md C6.12 "Done when"; board frame 7b): a combination whose table modes co-file a
 *  role (the sponsor) says where that filing's fees are charged, in words with their source. "principal": the table's
 *  lines are charged on the sponsored person's application (spouse sponsorship's CAD 1,260 bundles the sponsorship,
 *  processing and right of permanent residence fees), and the co-filed sponsorship filing carries none, so nothing is
 *  charged twice. Without it, a co-filing combination is not priced from the table (break on #500 M2). */
type CoFiledFees = { on: "principal"; why: string };
type TableCombination = { label: string; lines: string[]; checklist?: boolean; modes?: Record<string, LineMode>; group_why?: string; co_filed_fees?: CoFiledFees };
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
/** The shared role library (samples/person-roles.json): a line charges people of roles that may apply; a co-filing role
 *  is one that takes part in a case but never applies (the sponsor), which the table cannot price yet. Break on #500: a role the library does not know
 *  (a typo such as "spouse") would charge nobody in silence. */
const ROLE_LIB = (ROLES as { roles: { key: string; takesPartInCase: boolean; mayBeApplicant: boolean }[] }).roles;
const APPLICANT_ROLES = new Set(ROLE_LIB.filter((r) => r.mayBeApplicant).map((r) => r.key));
/** The role that may co-file, as the studio's save rule BR-4 says it (engine/people.ts: "only the sponsor files the
 *  sponsorship"), and only while the role library has it as taking part without applying. A table may name it co-filing
 *  only with its fees placed (co_filed_fees). */
const CO_FILING_ROLES = new Set(ROLE_LIB.filter((r) => r.key === "sponsor" && r.takesPartInCase && !r.mayBeApplicant).map((r) => r.key));
export function soundLine(l: TableLine | undefined): l is TableLine {
  if (!l || typeof l !== "object" || typeof l.key !== "string" || !FEE_BASES.includes(l.basis) || l.basis === "per_position") return false;
  // Break on #500 m1: a line without its words or its source would throw while it is priced; refused instead.
  if (typeof l.label !== "string" || !l.label.trim() || !l.source || typeof l.source !== "object" || typeof l.source.page !== "string") return false;
  // Amounts are whole cents: a sub-cent value would round to a different (even zero) fee (outside check on #455).
  const cents = (cad: unknown) => typeof cad === "number" && Number.isFinite(cad) && cad >= 0 && /^\d+(\.\d{1,2})?$/.test(String(cad)) && Number.isSafeInteger(Math.round(cad * 100));
  if (!cents(l.per_person_cad)) return false;
  if (l.roles !== undefined && (!Array.isArray(l.roles) || !l.roles.length || l.roles.some((r) => typeof r !== "string" || !APPLICANT_ROLES.has(r)))) return false;
  if (l.basis === "per_person_by_role" && !l.roles?.length) return false;
  const m = l.family_max;
  if (l.basis === "family_maximum" && !(m && cents(m.cad) && m.cad > 0 && Number.isInteger(m.from_people) && m.from_people >= 2)) return false;
  // Break on #500 M1: ages in order and never negative (swapped ages exempted everyone); m3: an age exemption belongs to
  // a person, so a line charged once per application cannot carry one (the owner's age would decide for everyone on it).
  if (l.exempt && !(Number.isInteger(l.exempt.under_age) && Number.isInteger(l.exempt.over_age) && l.exempt.under_age >= 0 && l.exempt.under_age <= l.exempt.over_age && l.exempt.source)) return false;
  if (l.exempt && l.basis === "per_application") return false;
  return true;
}

/** A fee line nobody outside these ages pays (biometrics, VV-R15): under `underAge` or over `overAge`. */
export type AgeExempt = { underAge: number; overAge: number; source: FeeSource };
/** A fee line: `roles` limits it to the filings of those roles (spouse and PNP fees); none means every filing. Without a
 *  family maximum the cap never applies (familyFrom is then beyond any household). */
export type FeeRule = { key: string; label: string; basis?: FeeBasis; perPersonCents: number; familyMaxCents: number; familyFrom: number; source: FeeSource; exempt?: AgeExempt; roles?: string[] };
type Rules = { label: string; modes: Map<string, LineMode>; fees: FeeRule[]; groupWhy?: string;
  /** C6.12-22: where a co-filed filing's fees are charged (the table says so in words), else none is priced. */
  coFiledFees?: { why: string };
  /** The table these rules were priced from (outside check on #455: the basis names that table, never the shipped one). */
  table?: { as_of: string; read: string } };
/** What the case adds (C6.12, the stored prepare view): each person's age in whole years (null: no date of birth yet),
 *  the filing modes the release says per role (M3-0; a role it leaves out falls back to the table below), and the
 *  submission group each person's filing is in (a split is stored; default the family group). */
export type FilingOptions = { ages?: Map<string, number | null>; modes?: Map<string, LineMode | null>; label?: string; groupOf?: (subject: string) => string; groupKind?: (group: string) => SubmissionGroup["kind"] };
export const FAMILY_GROUP = "group-family";

/** A combination's rules from the fee table (an own property only: "constructor" or "__proto__" is no combination). */
export function rulesFrom(table: FeeTable, key: string): Rules | undefined {
  const c = table.combinations && typeof table.combinations === "object" && Object.hasOwn(table.combinations, key) ? table.combinations[key] : undefined;
  if (!c) return undefined;
  // A combination lists its lines once each, at least one; the table holds each key once (break r1 B).
  if (!Array.isArray(c.lines) || !c.lines.length || new Set(c.lines).size !== c.lines.length || !Array.isArray(table.lines)) return undefined;
  const keys = table.lines.map((l) => l?.key);
  if (new Set(keys).size !== keys.length) return undefined;
  const lines = c.lines.map((k) => table.lines.find((l) => l.key === k));
  if (!lines.every(soundLine)) return undefined;
  // C11.12 (BR-1, BR-2): a mode the engine knows on every role, and the principal files their own application. Anything
  // else (the principal "on the principal's", a misspelt mode) makes the combination not derived, never guessed.
  const modes = Object.entries(c.modes ?? {});
  if (modes.some(([role, m]) => !isLineMode(m) || (role === "principal" && m !== "files_own"))) return undefined;
  // Break on #500 m2: the same rules as the studio's save (BR-3, BR-4): a role the library knows; an applicant mode only
  // on a role that may apply. M2: the table cannot price a sponsorship (no basis reaches the co-filing sponsor, so a
  // sponsorship line would land on the sponsored person), so a combination whose table modes co-file is not derived from
  // the table; its filings still come from its release, with "Fees not worked out yet".
  // C6.12-22: a co-filing role is priced only when the table says where its fees go (co_filed_fees, in words), and only
  // on a role that takes part in a case without applying (the sponsor); an applicant role never co-files (BR-4).
  const coFiled = c.co_filed_fees;
  const coFiledSound = !!coFiled && typeof coFiled === "object" && coFiled.on === "principal" && typeof coFiled.why === "string" && !!coFiled.why.trim();
  if (coFiled !== undefined && !coFiledSound) return undefined;
  // Break m6: co_filed_fees belongs to a combination whose table modes co-file (one copy-paste must not lift the guard).
  if (coFiledSound && !modes.some(([, m]) => m === "co_files")) return undefined;
  if (modes.some(([role, m]) => (m === "co_files" ? !(coFiledSound && CO_FILING_ROLES.has(role)) : !APPLICANT_ROLES.has(role)))) return undefined;
  // A line the engine cannot charge soundly makes the combination not derived: a missing line, a basis not worked out
  // (per_position), a family maximum without its cap, or a per-role line naming no role.
  const fees = (lines as TableLine[]).map((l): FeeRule => ({
    key: l.key, label: l.label, basis: l.basis, perPersonCents: Math.round(l.per_person_cad * 100),
    // Only the family_maximum basis caps a line (P-247): any other basis charges each person or application in full.
    familyMaxCents: l.basis === "family_maximum" ? Math.round(l.family_max!.cad * 100) : 0, familyFrom: l.basis === "family_maximum" ? l.family_max!.from_people : Number.MAX_SAFE_INTEGER,
    source: l.source, ...(l.exempt ? { exempt: { underAge: l.exempt.under_age, overAge: l.exempt.over_age, source: l.exempt.source } } : {}), ...(l.roles ? { roles: l.roles } : {}) }));
  return { label: c.label, modes: new Map(modes), fees, groupWhy: c.group_why, ...(coFiledSound ? { coFiledFees: { why: coFiled!.why } } : {}), table: { as_of: table.as_of, read: table.read } };
}
const RULES = { get: (key: string) => rulesFrom(FEE_TABLE, key) };

/** C11.12 review M2: the built-in filing mode a case falls back to for a role its release gives none (Sample). */
export const defaultModeOf = (combinationKey: string, role: string) => tableDefault(RULES.get(combinationKey), role);
/** A role's built-in mode from the table, when its release gives none. Never co_files (C6.12-22): a sponsorship is filed
 *  only when the release says so (the author's co-filing line, BR-4); the table's co_files says only how it is priced,
 *  so the studio's preview and a case never gain a sponsorship filing nobody set. */
function tableDefault(rules: Rules | undefined, role: string): LineMode | undefined {
  const m = rules?.modes.get(role);
  return m === "co_files" ? undefined : m;
}
/** C11.12: whether a combination's fees are worked out at all (else its words say "not worked out yet"). */
export const hasFeeRules = (combinationKey: string) => { const r = RULES.get(combinationKey); return !!r?.fees.length && !r.coFiledFees; };
// Review M1 on #1074: a combination priced only with a co-filed sponsorship (coFiledFees) keeps the studio's words "Fees not
// worked out yet": the studio's fee words (engine/filing-modes.ts filingWords, previewFilings) name family maximums and know
// no co-filed fees, so they would be wrong for it. Its case prices it; the studio's words for it are a follow-up row.
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
  // The source's own words, never a sentence made from the table's numbers (review r1 m6).
  const said = `(${rule.exempt.source.page}: "${rule.exempt.source.quote}")`;
  if (age < rule.exempt.underAge) return { pays: false, why: `Under ${rule.exempt.underAge}: no ${what} ${said}.` };
  if (age > rule.exempt.overAge) return { pays: false, why: `Over ${rule.exempt.overAge}: no ${what} ${said}.` };
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
 *  yet has a line that waits for it, never charged or exempt in silence (G15).
 *
 *  C11.12 (P-233, concept r2 BR-6, BR-10): who is on which filing comes from the same plan as the studio's "What a case
 *  gets" preview (engine/filing-modes.ts filingPlan): On the principal's and Declared only people are applicants on the
 *  principal's filing (applying when travelling, declared only when not), a co-filing role (the sponsor) has its own
 *  filing that is always in the principal's submission and never split. A combination with filing modes in its release
 *  but no fee rule gets its filings and groups with "Fees not worked out yet", never an amount.
 *
 *  R2 (P-247) over that plan, per a line's basis: per_application is charged once per filing (its owner pays; it covers
 *  everyone on it, so a person on the principal's application is never charged it again); per_person_by_role and
 *  family_maximum are charged per person applying (of the line's roles, when it names them), the family maximum capped
 *  within one submission group. A declared-only person has no fee line on any basis. */
export function deriveFilings(combinationKey: string, people: Participant[], rulesFor: (key: string) => Rules | undefined = (k) => RULES.get(k), opts: FilingOptions = {}): CaseFilings {
  const rules = rulesFor(combinationKey);
  const released = !!opts.modes?.size;
  if (!rules && !released) return { derived: false, combination: combinationKey, why: `Filings and fees are not derived yet for this combination (they are worked out once its fee lines and filing modes are in the fee table). Nothing is guessed.` };
  const label = rules?.label ?? opts.label ?? combinationKey;
  const fees0 = rules?.fees ?? [];
  // BR-2: the principal always files their own application, whatever a table or release says.
  const modeOf = (role: string): LineMode | null | undefined => (role === "principal" ? "files_own" : opts.modes?.get(role) ?? tableDefault(rules, role));
  const persons = people.filter((p) => p.role !== "case");
  const notFiling: NotFiling[] = [];
  const planned: PlanPerson[] = [];
  for (const p of persons) {
    if (modeOf(p.role) === undefined) notFiling.push({ subject: p.subjectId, label: p.label, role: p.role, why: `${label}: no filing is set for a ${p.role.replace(/_/g, " ")} (Who can be in this application), so nothing is filed for ${p.label}.` });
    else planned.push({ subject: p.subjectId, role: p.role, label: p.label, travelling: p.applies });
  }
  const plan = filingPlan(planned, modeOf);
  for (const n of plan.notFiling) notFiling.push({ subject: n.person.subject, label: n.person.label, role: n.person.role, why: n.why });
  const groupOf = opts.groupOf ?? (() => FAMILY_GROUP);
  const principal = plan.filings.find((f) => f.owner.role === "principal");
  // Keyed by the owner, so a filing keeps its id when someone else stops travelling. A co-filed filing is always in the
  // principal's group (it cannot be sent alone).
  const filings: CaseFiling[] = plan.filings.map((f) => ({ id: f.id, combination: combinationKey, label: f.kind === "co_filed" ? `${label}: sponsorship (${f.owner.label})` : `${label}: ${f.owner.label}`,
    mode: f.kind === "co_filed" ? "co_filed" : "files_own", owner: { subject: f.owner.subject, label: f.owner.label, role: f.owner.role },
    applicants: f.applicants.map((a) => ({ subject: a.person.subject, label: a.person.label, role: a.person.role, mode: a.mode })),
    group: f.kind === "co_filed" && principal ? groupOf(principal.owner.subject) : groupOf(f.owner.subject), status: "NOT_STARTED", number: null }));
  // Review on #500 M1 (break M2 through the release): with a co-filed sponsorship on the case, no table line is charged.
  // No basis reaches the co-filing sponsor, and the table cannot say which of its lines are the sponsorship's, so a
  // sponsorship fee would land on the sponsored person. The filings stand; the fees are "not worked out yet" (BR-10).
  // Break M1, m3, m5: a combination whose table prices a co-filed sponsorship (coFiledFees) is priced only when the case
  // carries exactly that: one sponsorship, filed by the sponsor, beside the sponsored person's application, in one
  // submission. Otherwise no line is charged and the words say what is missing (never the bundle without a sponsorship).
  const coFiled = filings.filter((f) => f.mode === "co_filed");
  const coFiling = coFiled.length > 0;
  const coMissing = !rules?.coFiledFees ? null
    : !principal ? `no sponsored person's application is on this case (the principal applicant is not applying)`
    : coFiled.length !== 1 || !CO_FILING_ROLES.has(coFiled[0].owner!.role) ? `its fees are worked out with the sponsor's sponsorship filed beside the sponsored person's application, and ${coFiled.length ? "this case's co-filed application is not the sponsor's alone" : "no sponsorship is filed on this case yet (add the sponsor; Who can be in this application sets the sponsor's filing)"}`
    : new Set(filings.map((f) => f.group)).size > 1 ? `an application is split out from the sponsorship's submission, and the sponsorship's fees cover one submission only`
    // Review m3: someone applying whom no line of the table charges (a spouse on the sponsored person's application) is
    // never shown as worked out at no fee.
    : (() => { const free = filings.flatMap((f) => f.applicants.filter((a) => a.mode === "applying" && !fees0.some((r) => !r.roles || r.roles.includes(a.role)))); return free.length ? `no fee line of the table charges ${free.map((a) => `${a.label} (${a.role.replace(/_/g, " ")})`).join(", ")}` : null; })();
  const coPriced = coFiling && !!rules?.coFiledFees && !coMissing;
  const priced = rules?.coFiledFees ? (coMissing ? [] : fees0) : coFiling ? [] : fees0;
  const groups: SubmissionGroup[] = [], fees: FeeLine[] = [];
  for (const gid of [...new Set(filings.map((f) => f.group))]) {
    const mine = filings.filter((f) => f.group === gid);
    const payers = mine.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => ({ filing: f.id, who: a, covers: 1 })));
    const totals: SubmissionGroup["totals"] = [];
    for (const rule of priced) {
      const ofRole = (role: string) => !rule.roles || rule.roles.includes(role);
      // per_application: one unit per application filed (its owner, who applies), covering everyone applying on it.
      const units = rule.basis === "per_application"
        ? mine.filter((f) => f.mode !== "co_filed" && ofRole(f.owner!.role)).flatMap((f) => {
            const owner = f.applicants.find((a) => a.subject === f.owner!.subject && a.mode === "applying");
            return owner ? [{ filing: f.id, who: owner, covers: f.applicants.filter((a) => a.mode === "applying").length }] : [];
          })
        : payers.filter((x) => ofRole(x.who.role));
      if (!units.length) continue;
      const check = new Map(units.map((x) => [x.who.subject, ageCheck(rule, opts.ages?.get(x.who.subject))]));
      const paying = units.filter((x) => { const c = check.get(x.who.subject)!; return "pays" in c && c.pays; });
      const t = familyFee(rule, paying.length);
      totals.push(t);
      // The group's payer: the principal when the principal pays this line, else the first person who pays.
      const lead = paying.find((x) => x.who.role === "principal") ?? paying[0];
      const leadFiling = lead ? filings.find((f) => f.id === lead.filing)! : null;
      for (const x of units) {
        const c = check.get(x.who.subject)!, who = x.who, what = t.label.toLowerCase().replace(/ fee$/, "");
        if ("waits" in c) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: rule.perPersonCents, exempt: false, waiting: "person.date_of_birth", why: `Waits for ${who.label}'s date of birth: no ${what} under ${rule.exempt!.underAge} or over ${rule.exempt!.overAge}. Not counted until it is answered.`, source: rule.exempt!.source });
        else if (!c.pays) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: c.why, source: rule.exempt!.source });
        else if (!t.cap_applied) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: t.per_person_cents, exempt: false,
          why: rule.basis === "per_application" ? `${cad(t.per_person_cents)} for ${who.label}'s application${x.covers > 1 ? `, covering the ${x.covers} people applying on it` : ""}.` : `${cad(t.per_person_cents)} for ${who.label}.` });
        else if (x === lead) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: t.total_cents, exempt: false, why: `Family maximum ${cad(t.total_cents)} for the ${t.people} people applying together, paid on this filing.` });
        else fees.push({ filing: x.filing, person: who.subject, payer: lead!.who.subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: `Covered by the family maximum, paid by ${lead!.who.label} on ${leadFiling!.owner!.label}'s filing.` });
      }
    }
    const kind = opts.groupKind?.(gid) ?? "family";
    const coFiled = mine.some((f) => f.mode === "co_filed");
    // Review m3: people applying (a declared-only person and the sponsor are named on it but are not counted).
    const count = new Set(mine.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => a.subject))).size;
    groups.push({ id: gid, kind, label: count <= 1 ? "One submission" : `One submission for ${count} people applying`, filings: mine.map((f) => f.id),
      // Review n1: beside a sponsorship, another own filing (the spouse's) may still be split out; the pair never is.
      splittable: mine.length > 1 && (!coFiled || mine.some((f) => f.mode !== "co_filed" && f.owner!.role !== "principal")),
      why: kind === "separate" ? (priced.length ? "Split out with a reason: priced on its own, so the other group's family maximums do not cover it." : "Split out with a reason: sent on its own.")
        : coFiled ? "The sponsorship and the principal's application are sent together and cannot be split (IRCC: the principal \"will submit both applications together online\")."
        : mine.length === 1 ? (mine[0].applicants.length > 1 ? "One application for the family." : "One person applying.")
        : rules ? rules.groupWhy ?? "The family's applications go together, so the family maximums apply." : "These applications go together in one submission.",
      // C11.12 BR-10 (review M2): no amount at all where the fees are not worked out, never 0.
      totals, total_cents: priced.length ? totals.reduce((s, t) => s + t.total_cents, 0) : null });
  }
  const feesKnown = priced.length > 0;
  const body = { filings, groups, fees, not_filing: notFiling };
  return { derived: true, combination: combinationKey, label, ...body, currency: "CAD", fees_worked_out: feesKnown,
    fees_why: feesKnown ? null : coMissing && fees0.length ? `Fees not worked out yet for ${label}: ${coMissing}; no fee line is charged, nothing is guessed.` : coFiling && fees0.length ? `Fees not worked out yet for ${label} with a sponsorship: who pays the sponsorship's fees is not built, so no fee line is charged; nothing is guessed.` : notWorkedOut(label),
    basis: priced.length ? `Fees from the ${rules!.fees[0]?.source.page ?? "fee table"} (fee table as of ${rules!.table?.as_of ?? FEE_TABLE.as_of}, read ${rules!.table?.read ?? FEE_TABLE.read}); Sample until the immigration expert confirms (P-171). ${coPriced ? `${rules!.coFiledFees!.why} ` : ""}${ageWords(rules!, !!opts.ages)} Paying is not built.`
      : `Filings from the release's filing modes (Sample until the immigration expert confirms). ${notWorkedOut(label)} Paying is not built.`,
    why: filings.length ? null : "Nobody on this case is applying, so there is no filing and no fee.",
    version: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16) };
}
