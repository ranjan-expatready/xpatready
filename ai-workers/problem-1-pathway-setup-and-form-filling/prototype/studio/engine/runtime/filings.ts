// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): the filings and fees a case's people
// make, derived from the case and never created by hand. Visitor visa (vv.single) only in this slice: each person who
// applies files their own application (temporary residence, BR-1), the family's filings go in one submission group
// (same time and place, BR-16), and the fee lines follow IRCC's fee list with its family maximums (BR-18): a capped line
// is carried by the principal's filing and the others are marked exempt ("Family Rate"), so the filings' lines always
// add up to the group's total. Other combinations answer "not derived yet", never a guess. Pure: no database, no clock;
// tests/runtime/check_vv_filings.ts. Shape: contracts/runtime.ts CaseFilings (r5c §"New").
//
// Filing modes per role are a table here until M3-0 puts them in configuration ("Who can be in this application");
// the amounts are data with their source (P-170), Sample until the immigration expert confirms (P-171). Paying is not built.
import { createHash } from "node:crypto";
import type { CaseFiling, CaseFilings, FeeLine, FeeSource, NotFiling, SubmissionGroup } from "../../contracts/runtime.ts";
import type { Participant } from "./case.ts";

/** IRCC fee list, as read and checked by the Lead on 29 Oct (product/screens/W1-baseline/immigration-facts-2026-10-29.md
 *  row 19; P-171). Not re-read on 1 Nov: canada.ca and ircc.canada.ca are outside this cloud session's network. */
const FEE_PAGE = { page: "IRCC fee list", url: "https://ircc.canada.ca/english/information/fees/fees.asp", read: "2026-10-29",
  checked: "Lead-checked record (immigration-facts-2026-10-29.md row 19); amounts Sample until the immigration expert confirms (P-171)" };
export const VISITOR_FEE_SOURCE: FeeSource = { ...FEE_PAGE, quote: "maximum fee for a family of 5 or more people applying at the same time and place", quote_kind: "IRCC's words" };
export const BIOMETRICS_FEE_SOURCE: FeeSource = { ...FEE_PAGE, quote: "biometrics CAD 85, CAD 170 for a family of 2 or more", quote_kind: "summary of the Lead-checked record" };

export type FeeRule = { key: string; label: string; perPersonCents: number; familyMaxCents: number; familyFrom: number; source: FeeSource };
type Rules = { label: string; modes: Map<string, CaseFiling["mode"]>; fees: FeeRule[] };

/** Visitor visa (outside Canada): every role files its own application (BR-1); fees from the fee list (P-171). */
const RULES = new Map<string, Rules>([
  ["vv.single", {
    label: "Visitor visa",
    modes: new Map([["principal", "files_own"], ["spouse_or_partner", "files_own"], ["child", "files_own"]]),
    fees: [
      { key: "visitor_visa", label: "Visitor visa fee", perPersonCents: 100_00, familyMaxCents: 500_00, familyFrom: 5, source: VISITOR_FEE_SOURCE },
      { key: "biometrics", label: "Biometrics fee", perPersonCents: 85_00, familyMaxCents: 170_00, familyFrom: 2, source: BIOMETRICS_FEE_SOURCE },
    ],
  }],
]);

export const cad = (cents: number) => `CAD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

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

/** The case's filings, submission group and fee lines, from the combination's key and the people on the case. */
export function deriveFilings(combinationKey: string, people: Participant[], rulesFor: (key: string) => Rules | undefined = (k) => RULES.get(k)): CaseFilings {
  const rules = rulesFor(combinationKey);
  if (!rules) return { derived: false, combination: combinationKey, why: `Filings and fees are worked out for the Visitor visa only so far; this combination's are not derived yet. Nothing is guessed.` };
  const persons = people.filter((p) => p.role !== "case");
  const notFiling: NotFiling[] = [];
  const filers: Participant[] = [];
  for (const p of persons) {
    if (!rules.modes.has(p.role)) notFiling.push({ subject: p.subjectId, label: p.label, role: p.role, why: `The ${rules.label} has no filing for the role "${p.role}".` });
    else if (!p.applies) notFiling.push({ subject: p.subjectId, label: p.label, role: p.role, why: "Not travelling (not applying on this case): no filing and no fee." });
    else filers.push(p);
  }
  const groupId = "group-family";
  // Keyed by the person, so a filing keeps its id when someone else stops travelling.
  const filings: CaseFiling[] = filers.map((p) => ({ id: `filing-${p.subjectId}`, combination: combinationKey, label: `${rules.label}: ${p.label}`, mode: rules.modes.get(p.role)!,
    applicants: [{ subject: p.subjectId, label: p.label, role: p.role, mode: "applying" }], group: groupId, status: "NOT_STARTED", number: null }));
  const groups: SubmissionGroup[] = [], fees: FeeLine[] = [];
  if (filings.length) {
    const totals = rules.fees.map((f) => familyFee(f, filings.length));
    // The family's payer: the principal's filing when the principal applies, else the first filing.
    const lead = filings.find((f) => f.applicants[0].role === "principal") ?? filings[0];
    for (const t of totals) for (const f of filings) {
      const payer = f.applicants[0].subject;
      if (!t.cap_applied) fees.push({ filing: f.id, payer, line: t.line, label: t.label, amount_cents: t.per_person_cents, exempt: false, why: `${cad(t.per_person_cents)} for ${f.applicants[0].label}.` });
      else if (f === lead) fees.push({ filing: f.id, payer, line: t.line, label: t.label, amount_cents: t.total_cents, exempt: false, why: `Family maximum ${cad(t.total_cents)} for the ${t.people} people applying together, paid on this filing.` });
      else fees.push({ filing: f.id, payer: lead.applicants[0].subject, line: t.line, label: t.label, amount_cents: 0, exempt: true, why: `Covered by the family maximum on ${lead.applicants[0].label}'s filing.` });
    }
    groups.push({ id: groupId, kind: "family", label: filings.length === 1 ? "One submission" : `One submission for ${filings.length} people`, filings: filings.map((f) => f.id), splittable: filings.length > 1,
      why: filings.length === 1 ? "One person applying." : "A family's visitor visa applications go together, at the same time and place, so the family maximums apply (BR-16).",
      totals, total_cents: totals.reduce((s, t) => s + t.total_cents, 0) });
  }
  const body = { filings, groups, fees, not_filing: notFiling };
  return { derived: true, combination: combinationKey, label: rules.label, ...body, currency: "CAD",
    basis: `Fees from the ${FEE_PAGE.page} (read ${FEE_PAGE.read}); Sample until the immigration expert confirms (P-171). Biometrics exemptions (for example by age) are not checked yet: every person applying is charged. Paying is not built.`,
    why: filings.length ? null : "Nobody on this case is applying, so there is no filing and no fee.",
    version: createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16) };
}
