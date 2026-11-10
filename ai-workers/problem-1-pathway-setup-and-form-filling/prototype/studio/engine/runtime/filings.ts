// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): the filings and fees a case's people
// make, derived from the case and never created by hand. Any combination the fee table and its release describe (P-425:
// no combination is named in this code): who files what follows the filing modes (BR-1), the family's filings go in one
// submission group (same time and place, BR-16), and the fee lines follow IRCC's fee list with its family maximums
// (BR-18): a capped line is carried by the principal's filing and the others are marked exempt ("Family Rate"), so the
// filings' lines always add up to the group's total. Each group is priced on its own (a filing split out pays alone), and
// an age-limited line counts only the people its ages reach when ages are given (VV-R15). A co-filed application (M3-S1)
// carries its own fees: a per_application line naming its role. With neither table nor release modes: not derived.
// Pure: no database, no clock; tests/runtime/check_vv_filings.ts. Shape: contracts/runtime.ts CaseFilings (r5c §"New").
//
// Filing modes per role come from the release ("Who can be in this application", M3-0) when it says them, else this
// table; the amounts are data with their source (P-170), Sample until the immigration expert confirms (P-171). Paying is
// not built.
import { createHash } from "node:crypto";
import type { CaseFiling, CaseFilings, FeeLine, FeeSource, NotFiling, SubmissionGroup } from "../../contracts/runtime.ts";
import type { Participant } from "./case.ts";
import type { LineMode } from "../../contracts/workspace.ts";
import { filingPlan, isLineMode, noFeeLines, type PlanPerson } from "../filing-modes.ts";
import { CO_FILING_ROLE } from "../people.ts";
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
/** A combination's row (M3-S1, P-425: every setting a combination needs is here, never a branch on its key):
 *  `group_why` the family group's reason; `co_filed_why` the reason a co-filed application and the principal's are sent
 *  together (IRCC's words); `each_files_own` IRCC's words, with their source, where each family member files their own
 *  application (BR-7's warning); `basis_note` what the priced total leaves out, in words on the case (M3-S1 review M2). */
type TableCombination = { label: string; lines: string[]; checklist?: boolean; modes?: Record<string, LineMode>; group_why?: string; co_filed_why?: string; basis_note?: string;
  each_files_own?: { says: string; source: FeeSource } | null };
export type FeeTable = { as_of: string; read: string; status: string; lines: TableLine[]; combinations: Record<string, TableCombination> };
export const FEE_TABLE = FEES as unknown as FeeTable;
// A line removed from the table leaves these undefined; the module never throws on load (break r1 B: a deleted line
// stopped the whole API).
const line = (key: string) => (Array.isArray(FEE_TABLE.lines) ? FEE_TABLE.lines.find((l) => l?.key === key) : undefined);
export const BIOMETRICS_FEE_SOURCE = line("biometrics")?.source as FeeSource;
/** VV-R15 (compliance-trace): who gives no biometrics, in IRCC's words with the page and its date. "Over 79" is read as
 *  80 or older, and age is counted as at today until the group is recorded (FQ-7, open). */
export const BIOMETRICS_EXEMPT_SOURCE = line("biometrics")?.exempt?.source as FeeSource;

/** Whether a fee line can be charged soundly (break r1, R2): an amount that is a number of zero or more, a basis the
 *  engine works out (not per_position), a family maximum with a positive amount from 2 people when the basis is
 *  family_maximum, a non-empty list of roles when it is per_person_by_role (and a list whenever roles are given), and
 *  whole-number age limits for an exemption. Anything else makes its combination not derived: never a wrong total. */
/** The shared role library (samples/person-roles.json): a line charges people of roles that may apply; a co-filing role
 *  is one that takes part in a case but never applies (the sponsor): only a per_application line may name it (M3-S1). Break on #500: a role the library does not know
 *  (a typo such as "spouse") would charge nobody in silence. */
const ROLE_LIB = (ROLES as { roles: { key: string; takesPartInCase: boolean; mayBeApplicant: boolean }[] }).roles;
const APPLICANT_ROLES = new Set(ROLE_LIB.filter((r) => r.mayBeApplicant).map((r) => r.key));
/** M3-S1: the roles that may co-file, by the studio's own save rule (BR-3, BR-4: in the library, takes part in a case,
 *  never applies, and the co-filing role): a per_application line may name one, and is then charged once on that
 *  person's co-filed application, which carries its own fees. */
const CO_FILING_ROLES = new Set(ROLE_LIB.filter((r) => r.takesPartInCase && !r.mayBeApplicant && r.key === CO_FILING_ROLE).map((r) => r.key));
export function soundLine(l: TableLine | undefined): l is TableLine {
  if (!l || typeof l !== "object" || typeof l.key !== "string" || !FEE_BASES.includes(l.basis) || l.basis === "per_position") return false;
  // Break on #500 m1: a line without its words or its source would throw while it is priced; refused instead.
  if (typeof l.label !== "string" || !l.label.trim() || !l.source || typeof l.source !== "object" || typeof l.source.page !== "string") return false;
  // Amounts are whole cents: a sub-cent value would round to a different (even zero) fee (outside check on #455).
  const cents = (cad: unknown) => typeof cad === "number" && Number.isFinite(cad) && cad >= 0 && /^\d+(\.\d{1,2})?$/.test(String(cad)) && Number.isSafeInteger(Math.round(cad * 100));
  if (!cents(l.per_person_cad)) return false;
  // M3-S1: a co-filing role only on a per_application line (it is charged per application; a co-filer never applies,
  // so no per-person basis reaches them).
  if (l.roles !== undefined && (!Array.isArray(l.roles) || !l.roles.length || l.roles.some((r) => typeof r !== "string" || !(APPLICANT_ROLES.has(r) || (l.basis === "per_application" && CO_FILING_ROLES.has(r)))))) return false;
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
type Rules = { label: string; modes: Map<string, LineMode>; fees: FeeRule[]; groupWhy?: string; coFiledWhy?: string; basisNote?: string;
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
  // on a role that may apply, co_files only on one that takes part and never applies (M3-S1: its fees are the
  // per_application lines naming its role, charged on its own filing, never on the person it is filed with).
  if (modes.some(([role, m]) => (m === "co_files" ? !CO_FILING_ROLES.has(role) : !APPLICANT_ROLES.has(role)))) return undefined;
  // A line the engine cannot charge soundly makes the combination not derived: a missing line, a basis not worked out
  // (per_position), a family maximum without its cap, or a per-role line naming no role.
  const fees = (lines as TableLine[]).map((l): FeeRule => ({
    key: l.key, label: l.label, basis: l.basis, perPersonCents: Math.round(l.per_person_cad * 100),
    // Only the family_maximum basis caps a line (P-247): any other basis charges each person or application in full.
    familyMaxCents: l.basis === "family_maximum" ? Math.round(l.family_max!.cad * 100) : 0, familyFrom: l.basis === "family_maximum" ? l.family_max!.from_people : Number.MAX_SAFE_INTEGER,
    source: l.source, ...(l.exempt ? { exempt: { underAge: l.exempt.under_age, overAge: l.exempt.over_age, source: l.exempt.source } } : {}), ...(l.roles ? { roles: l.roles } : {}) }));
  return { label: c.label, modes: new Map(modes), fees, groupWhy: c.group_why, coFiledWhy: typeof c.co_filed_why === "string" ? c.co_filed_why : undefined, basisNote: typeof c.basis_note === "string" && c.basis_note.trim() ? c.basis_note : undefined, table: { as_of: table.as_of, read: table.read } };
}
const RULES = { get: (key: string) => rulesFrom(FEE_TABLE, key) };

/** C11.12 review M2: the built-in filing mode a case falls back to for a role its release gives none (Sample). Never
 *  co_files (BR-4, M3-S1 review M1): a line that is never an applicant and has no mode files nothing, so the table's
 *  co-filing mode never stands in for a release line saved without it. */
export const defaultModeOf = (combinationKey: string, role: string): LineMode | undefined => { const m = RULES.get(combinationKey)?.modes.get(role); return m === "co_files" ? undefined : m; };
/** M3-S1: whether a fee line reaches a co-filing role's own application (a per_application line naming the role). */
const reachesCoFiled = (fees: FeeRule[], role: string) => fees.some((f) => f.basis === "per_application" && !!f.roles?.includes(role));
/** C11.12: whether a combination's fees are worked out from the table: it has fee lines, and one reaches each co-filing
 *  role given (M3-S1; else the case charges nothing and its words say why). */
export const hasFeeRules = (combinationKey: string, coFilingRoles: string[] = []) => {
  const fees = RULES.get(combinationKey)?.fees ?? [];
  return fees.length > 0 && coFilingRoles.every((r) => reachesCoFiled(fees, r));
};
/** BR-7 (M3-S1, P-425): IRCC's words where each family member of a combination files their own application, from the
 *  table (a combination's `each_files_own`); null where it says none. engine/filing-modes.ts filingWarnings reads them. */
export function eachFilesOwnOf(combinationKey: string): string | null {
  const c = FEE_TABLE.combinations && typeof FEE_TABLE.combinations === "object" && Object.hasOwn(FEE_TABLE.combinations, combinationKey) ? FEE_TABLE.combinations[combinationKey] : undefined;
  const says = c?.each_files_own?.says;
  return typeof says === "string" && says.trim() ? says : null;
}
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

/** A submission's line total with its basis (B133, P-247: "Every fee line carries a basis"), so a reader names the basis
 *  from the table's own word, never from these words or the maximum. Additive to the contract's total (studio/contracts/
 *  is M2-hot: the field rides in the JSON and in this engine type until the contract can take it). */
export type FeeTotal = SubmissionGroup["totals"][number] & { basis: FeeBasis };

/** A fee line over the people applying together: the per-person amount each, capped at the family maximum once the group
 *  has at least `familyFrom` people (IRCC: "applying at the same time and place", so within one submission group only). */
export function familyFee(rule: FeeRule, people: number): FeeTotal {
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
  // A rule with no basis is capped as a family maximum (above), so it says so; every table line has one (soundLine).
  return { line: rule.key, label: rule.label, basis: rule.basis ?? "family_maximum", people, per_person_cents: rule.perPersonCents, list_cents: listCents, family_max_cents: rule.familyMaxCents, family_from: rule.familyFrom, total_cents: totalCents, cap_applied: capApplied, why, source: rule.source };
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
 *  but no fee rule gets its filings and groups with words that say no fee line is set, never an amount.
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
  // M3-S1 review M1 (BR-4): once a release says its lines, the table's co-filing mode never stands in for a line saved
  // without one (that person files nothing); with no release modes (the table alone) the table's modes are the plan.
  const tableMode = (role: string) => { const m = rules?.modes.get(role); return m === "co_files" && released ? undefined : m; };
  const modeOf = (role: string): LineMode | null | undefined => (role === "principal" ? "files_own" : opts.modes?.get(role) ?? tableMode(role));
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
  // M3-S1 (P-425; was review on #500 M1): a co-filed application carries its own fees, the table's per_application
  // lines naming its owner's role, charged on that filing and paid by its owner, never on the person it is filed with.
  // Where no line reaches a co-filed application, its fees are unknown, so the case charges nothing at all (never a
  // total that leaves one application out) and says so (BR-10). This follows the data, never the combination.
  const unreached = filings.filter((f) => f.mode === "co_filed" && !reachesCoFiled(fees0, f.owner!.role));
  const priced = unreached.length ? [] : fees0;
  const groups: SubmissionGroup[] = [], fees: FeeLine[] = [];
  for (const gid of [...new Set(filings.map((f) => f.group))]) {
    const mine = filings.filter((f) => f.group === gid);
    const payers = mine.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => ({ filing: f.id, who: a, covers: 1 })));
    const totals: FeeTotal[] = [];
    for (const rule of priced) {
      const ofRole = (role: string) => !rule.roles || rule.roles.includes(role);
      // per_application: one unit per application filed (its owner, who applies), covering everyone applying on it. A
      // co-filed application is charged only by a line naming its owner's role (M3-S1): its owner pays, covering nobody
      // else (a line with no roles charges the applications of people who apply, as before).
      const units = rule.basis === "per_application"
        ? mine.filter((f) => (f.mode === "co_filed" ? !!rule.roles?.includes(f.owner!.role) : ofRole(f.owner!.role))).flatMap((f) => {
            if (f.mode === "co_filed") return [{ filing: f.id, who: { subject: f.owner!.subject, label: f.owner!.label, role: f.owner!.role, mode: "applying" as const }, covers: 0 }];
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
          why: rule.basis === "per_application" ? `${cad(t.per_person_cents)} for ${who.label}'s ${x.covers === 0 ? "co-filed application (sent with the principal's), paid on it" : "application"}${x.covers > 1 ? `, covering the ${x.covers} people applying on it` : ""}.` : `${cad(t.per_person_cents)} for ${who.label}.` });
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
        : coFiled ? rules?.coFiledWhy ?? "The co-filed application and the principal's are sent together and cannot be split."
        : mine.length === 1 ? (mine[0].applicants.length > 1 ? "One application for the family." : "One person applying.")
        : rules ? rules.groupWhy ?? "The family's applications go together, so the family maximums apply." : "These applications go together in one submission.",
      // C11.12 BR-10 (review M2): no amount at all where the fees are not worked out, never 0.
      totals, total_cents: priced.length ? totals.reduce((s, t) => s + t.total_cents, 0) : null });
  }
  const feesKnown = priced.length > 0;
  const body = { filings, groups, fees, not_filing: notFiling };
  const unpriced = unreached.length && fees0.length ? `The fee table has no fee line for ${unreached.map((f) => `${f.owner!.label}'s co-filed application`).join(" or ")} (a per-application line naming its role), so no fee is charged on this case; nothing is guessed.` : noFeeLines(label);
  return { derived: true, combination: combinationKey, label, ...body, currency: "CAD", fees_worked_out: feesKnown,
    fees_why: feesKnown ? null : unpriced,
    basis: priced.length ? `Fees from the ${rules!.fees[0]?.source.page ?? "fee table"} (fee table as of ${rules!.table?.as_of ?? FEE_TABLE.as_of}, read ${rules!.table?.read ?? FEE_TABLE.read}); Sample until the immigration expert confirms (P-171). ${ageWords(rules!, !!opts.ages)}${rules!.basisNote ? ` ${rules!.basisNote}` : ""} Paying is not built.`
      : `Filings from the release's filing modes (Sample until the immigration expert confirms). ${unpriced} Paying is not built.`,
    why: filings.length ? null : "Nobody on this case is applying, so there is no filing and no fee.",
    version: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16) };
}
