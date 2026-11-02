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
import { filingPlan, notWorkedOut, type PlanPerson } from "../filing-modes.ts";

/** IRCC fee list, as read and checked by the Lead on 29 Oct (product/screens/W1-baseline/immigration-facts-2026-10-29.md
 *  row 19; P-171). Not re-read on 1 Nov: canada.ca and ircc.canada.ca are outside this cloud session's network. */
const FEE_PAGE = { page: "IRCC fee list", url: "https://ircc.canada.ca/english/information/fees/fees.asp", read: "2026-10-29",
  checked: "Lead-checked record (immigration-facts-2026-10-29.md row 19); amounts Sample until the immigration expert confirms (P-171)" };
export const VISITOR_FEE_SOURCE: FeeSource = { ...FEE_PAGE, quote: "maximum fee for a family of 5 or more people applying at the same time and place", quote_kind: "IRCC's words" };
export const BIOMETRICS_FEE_SOURCE: FeeSource = { ...FEE_PAGE, quote: "biometrics CAD 85, CAD 170 for a family of 2 or more", quote_kind: "summary of the Lead-checked record" };
/** VV-R15 (compliance-trace): who gives no biometrics, in IRCC's words with the page and its date. "Over 79" is read as
 *  80 or older, and age is counted as at today until the group is recorded (FQ-7, open). */
export const BIOMETRICS_EXEMPT_SOURCE: FeeSource = { page: "When to give biometrics: temporary residents", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics/when-to-give-temporary-residence.html",
  quote: "a child under the age of 14; an applicant over the age of 79", quote_kind: "IRCC's words", read: "2026-03-30 (page date)", checked: "compliance-trace.md VV-R15; age as at today until the group is recorded (FQ-7 open)" };

/** A fee line nobody outside these ages pays (biometrics, VV-R15): under `underAge` or over `overAge`. */
export type AgeExempt = { underAge: number; overAge: number; source: FeeSource };
export type FeeRule = { key: string; label: string; perPersonCents: number; familyMaxCents: number; familyFrom: number; source: FeeSource; exempt?: AgeExempt };
type Rules = { label: string; modes: Map<string, LineMode>; fees: FeeRule[] };
/** What the case adds (C6.12, the stored prepare view): each person's age in whole years (null: no date of birth yet),
 *  the filing modes the release says per role (M3-0; a role it leaves out falls back to the table below), and the
 *  submission group each person's filing is in (a split is stored; default the family group). */
export type FilingOptions = { ages?: Map<string, number | null>; modes?: Map<string, LineMode | null>; label?: string; groupOf?: (subject: string) => string; groupKind?: (group: string) => SubmissionGroup["kind"] };
export const FAMILY_GROUP = "group-family";

/** Visitor visa (outside Canada): every role files its own application (BR-1); fees from the fee list (P-171). */
const RULES = new Map<string, Rules>([
  ["vv.single", {
    label: "Visitor visa",
    modes: new Map([["principal", "files_own"], ["spouse_or_partner", "files_own"], ["child", "files_own"]]),
    fees: [
      { key: "visitor_visa", label: "Visitor visa fee", perPersonCents: 100_00, familyMaxCents: 500_00, familyFrom: 5, source: VISITOR_FEE_SOURCE },
      { key: "biometrics", label: "Biometrics fee", perPersonCents: 85_00, familyMaxCents: 170_00, familyFrom: 2, source: BIOMETRICS_FEE_SOURCE, exempt: { underAge: 14, overAge: 79, source: BIOMETRICS_EXEMPT_SOURCE } },
    ],
  }],
]);

/** C11.12 review M2: the built-in filing mode a case falls back to for a role its release gives none (Sample). */
export const defaultModeOf = (combinationKey: string, role: string) => RULES.get(combinationKey)?.modes.get(role);
/** C11.12: whether a combination's fees are worked out at all (else its words say "not worked out yet"). */
export const hasFeeRules = (combinationKey: string) => !!RULES.get(combinationKey)?.fees.length;
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
  const why = capApplied
    ? `${people} people applying together: the family maximum ${cad(rule.familyMaxCents)} applies instead of ${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}.`
    : people >= rule.familyFrom
      ? `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}, not above the family maximum ${cad(rule.familyMaxCents)}.`
      : `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}; the family maximum ${cad(rule.familyMaxCents)} starts at ${rule.familyFrom} people applying together.`;
  return { line: rule.key, label: rule.label, people, per_person_cents: rule.perPersonCents, list_cents: listCents, family_max_cents: rule.familyMaxCents, family_from: rule.familyFrom, total_cents: totalCents, cap_applied: capApplied, why, source: rule.source };
}

/** The case's filings, submission groups and fee lines, from the combination's key and the people on the case. Each
 *  group is priced on its own; an age-limited line counts only the people who pay it, and a person with no date of birth
 *  yet has a line that waits for it, never charged or exempt in silence (G15).
 *
 *  C11.12 (P-233, concept r2 BR-6, BR-10): who is on which filing comes from the same plan as the studio's "What a case
 *  gets" preview (engine/filing-modes.ts filingPlan): On the principal's and Declared only people are applicants on the
 *  principal's filing (applying when travelling, declared only when not), a co-filing role (the sponsor) has its own
 *  filing that is always in the principal's submission and never split. Fees count paying PEOPLE across a group's
 *  filings, one line per applicant; a declared-only person has no fee line. A combination with filing modes in its
 *  release but no fee rule gets its filings and groups with "Fees not worked out yet", never an amount. */
export function deriveFilings(combinationKey: string, people: Participant[], rulesFor: (key: string) => Rules | undefined = (k) => RULES.get(k), opts: FilingOptions = {}): CaseFilings {
  const rules = rulesFor(combinationKey);
  const released = !!opts.modes?.size;
  if (!rules && !released) return { derived: false, combination: combinationKey, why: `Filings and fees are worked out for the Visitor visa only so far; this combination's are not derived yet. Nothing is guessed.` };
  const label = rules?.label ?? opts.label ?? combinationKey;
  const fees0 = rules?.fees ?? [];
  const modeOf = (role: string): LineMode | null | undefined => (role === "principal" ? "files_own" : opts.modes?.get(role) ?? rules?.modes.get(role));
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
  const groups: SubmissionGroup[] = [], fees: FeeLine[] = [];
  for (const gid of [...new Set(filings.map((f) => f.group))]) {
    const mine = filings.filter((f) => f.group === gid);
    const payers = mine.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => ({ filing: f.id, who: a })));
    const totals: SubmissionGroup["totals"] = [];
    for (const rule of fees0) {
      const check = new Map(payers.map((x) => [x.who.subject, ageCheck(rule, opts.ages?.get(x.who.subject))]));
      const paying = payers.filter((x) => { const c = check.get(x.who.subject)!; return "pays" in c && c.pays; });
      const t = familyFee(rule, paying.length);
      totals.push(t);
      // The group's payer: the principal when the principal pays this line, else the first person who pays.
      const lead = paying.find((x) => x.who.role === "principal") ?? paying[0];
      const leadFiling = lead ? filings.find((f) => f.id === lead.filing)! : null;
      for (const x of payers) {
        const c = check.get(x.who.subject)!, who = x.who, what = t.label.toLowerCase().replace(/ fee$/, "");
        if ("waits" in c) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: rule.perPersonCents, exempt: false, waiting: "person.date_of_birth", why: `Waits for ${who.label}'s date of birth: no ${what} under ${rule.exempt!.underAge} or over ${rule.exempt!.overAge}. Not counted until it is answered.`, source: rule.exempt!.source });
        else if (!c.pays) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: c.why, source: rule.exempt!.source });
        else if (!t.cap_applied) fees.push({ filing: x.filing, person: who.subject, payer: who.subject, line: t.line, label: t.label, amount_cents: t.per_person_cents, exempt: false, why: `${cad(t.per_person_cents)} for ${who.label}.` });
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
      why: kind === "separate" ? (fees0.length ? "Split out with a reason: priced on its own, so the other group's family maximums do not cover it." : "Split out with a reason: sent on its own.")
        : coFiled ? "The sponsorship and the principal's application are sent together and cannot be split (IRCC: the principal \"will submit both applications together online\")."
        : mine.length === 1 ? (mine[0].applicants.length > 1 ? "One application for the family." : "One person applying.")
        : rules ? `A family's ${label.toLowerCase()} applications go together, at the same time and place, so the family maximums apply (BR-16).` : "These applications go together in one submission.",
      // C11.12 BR-10 (review M2): no amount at all where the fees are not worked out, never 0.
      totals, total_cents: fees0.length ? totals.reduce((s, t) => s + t.total_cents, 0) : null });
  }
  // Break m3: a sponsorship's fees have no rule yet, even where the rest of the case's fees do: said, never left silent.
  const feesKnown = fees0.length > 0 && !filings.some((f) => f.mode === "co_filed");
  const body = { filings, groups, fees, not_filing: notFiling };
  return { derived: true, combination: combinationKey, label, ...body, currency: "CAD", fees_worked_out: feesKnown,
    fees_why: feesKnown ? null : fees0.length ? `The sponsorship's fees are not worked out yet for ${label}; nothing is guessed. The other lines are worked out.` : notWorkedOut(label),
    basis: fees0.length ? `Fees from the ${FEE_PAGE.page} (read ${FEE_PAGE.read}); Sample until the immigration expert confirms (P-171). ${opts.ages ? "Biometrics: none under 14 or over 79 (VV-R15), age as at today (FQ-7)." : "Biometrics exemptions (for example by age) are not checked yet: every person applying is charged."} Paying is not built.`
      : `Filings from the release's filing modes (Sample until the immigration expert confirms). ${notWorkedOut(label)} Paying is not built.`,
    why: filings.length ? null : "Nobody on this case is applying, so there is no filing and no fee.",
    version: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16) };
}
