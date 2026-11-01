// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): the filings and fees a case's people
// make, derived from the case and never created by hand. Visitor visa (vv.single) only in this slice: each person who
// applies files their own application (temporary residence, BR-1), the family's filings go in one submission group
// (same time and place, BR-16), and the fee lines follow IRCC's fee list with its family maximums (BR-18). Other
// combinations answer "not derived yet", never a guess. Pure: no database, no clock; tests/runtime/check_vv_filings.ts.
//
// Filing modes per role are a table here until M3-0 puts them in configuration ("Who can be in this application");
// the amounts are data with their source (P-170), Sample until the immigration expert confirms (P-171). Paying is not built.
import type { Participant } from "./case.ts";

/** Where a value comes from (P-170): the official page, its words, when it was read and by whom. */
export type Source = { page: string; url: string; quote: string; read: string; checked: string };

/** IRCC fee list, as read and checked by the Lead on 29 Oct (product/screens/W1-baseline/immigration-facts-2026-10-29.md
 *  row 19; P-171). Not re-read on 1 Nov: canada.ca and ircc.canada.ca are outside this cloud session's network. */
export const FEE_LIST: Source = {
  page: "IRCC fee list",
  url: "https://ircc.canada.ca/english/information/fees/fees.asp",
  quote: "Visitor visa CAD 100 per person, CAD 500 \"maximum fee for a family of 5 or more people applying at the same time and place\"; biometrics CAD 85, CAD 170 for a family of 2 or more",
  read: "2026-10-29",
  checked: "Lead-checked record (immigration-facts-2026-10-29.md row 19); amounts Sample until the immigration expert confirms (P-171)",
};

export type FilingMode = "files_own" | "on_principal_applying" | "on_principal_declared";
type FeeRule = { key: "visitor_visa" | "biometrics"; label: string; perPersonCents: number; familyMaxCents: number; familyFrom: number; source: Source };
type Rules = { label: string; modes: Record<string, FilingMode>; fees: FeeRule[] };

/** Visitor visa (outside Canada): every role files its own application (BR-1); fees from the fee list (P-171). */
const RULES: Record<string, Rules> = {
  "vv.single": {
    label: "Visitor visa",
    modes: { principal: "files_own", spouse_or_partner: "files_own", child: "files_own" },
    fees: [
      { key: "visitor_visa", label: "Visitor visa fee", perPersonCents: 100_00, familyMaxCents: 500_00, familyFrom: 5, source: FEE_LIST },
      { key: "biometrics", label: "Biometrics fee", perPersonCents: 85_00, familyMaxCents: 170_00, familyFrom: 2, source: FEE_LIST },
    ],
  },
};

export type Filing = { key: string; label: string; mode: FilingMode; subjectId: string; role: string; person: string; group: string; applicationNumber: null;
  fees: { key: string; label: string; amountCents: number }[] };
export type FeeTotal = { key: string; label: string; people: number; perPersonCents: number; listCents: number; familyMaxCents: number; familyFrom: number;
  totalCents: number; capApplied: boolean; why: string; source: Source };
export type Group = { key: string; kind: "family"; label: string; filings: string[]; fees: FeeTotal[]; totalCents: number; why: string };
export type Derived =
  | { derived: true; combination: string; label: string; filings: Filing[]; groups: Group[]; notFiling: { subjectId: string; role: string; person: string; why: string }[];
      currency: "CAD"; basis: string }
  | { derived: false; combination: string; why: string };

export const cad = (cents: number) => `CAD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** A fee line over the people applying together: the per-person amount each, capped at the family maximum once the group
 *  has at least `familyFrom` people (IRCC: "applying at the same time and place", so within one submission group only). */
export function familyFee(rule: FeeRule, people: number): FeeTotal {
  const listCents = rule.perPersonCents * people;
  const capApplied = people >= rule.familyFrom && listCents > rule.familyMaxCents;
  const totalCents = capApplied ? rule.familyMaxCents : listCents;
  const why = capApplied
    ? `${people} people applying together: the family maximum ${cad(rule.familyMaxCents)} applies instead of ${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}.`
    : people >= rule.familyFrom
      ? `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}, not above the family maximum ${cad(rule.familyMaxCents)}.`
      : `${people} × ${cad(rule.perPersonCents)} = ${cad(listCents)}; the family maximum ${cad(rule.familyMaxCents)} starts at ${rule.familyFrom} people applying together.`;
  return { key: rule.key, label: rule.label, people, perPersonCents: rule.perPersonCents, listCents, familyMaxCents: rule.familyMaxCents, familyFrom: rule.familyFrom, totalCents, capApplied, why, source: rule.source };
}

/** The case's filings, submission groups and fee lines, from the combination's key and the people on the case. */
export function deriveFilings(combinationKey: string, people: Participant[]): Derived {
  const rules = RULES[combinationKey];
  if (!rules) return { derived: false, combination: combinationKey, why: `Filings and fees are derived for the Visitor visa only so far; "${combinationKey}" is not derived yet (C6.12, later slices). Nothing is guessed.` };
  const persons = people.filter((p) => p.role !== "case");
  const notFiling: { subjectId: string; role: string; person: string; why: string }[] = [];
  const filers: Participant[] = [];
  for (const p of persons) {
    const mode = rules.modes[p.role];
    if (!mode) notFiling.push({ subjectId: p.subjectId, role: p.role, person: p.label, why: `The ${rules.label} has no filing for the role "${p.role}".` });
    else if (!p.applies) notFiling.push({ subjectId: p.subjectId, role: p.role, person: p.label, why: "Not applying on this case: no filing and no fee." });
    else filers.push(p);
  }
  const groupKey = "group-1";
  const filings: Filing[] = filers.map((p, i) => ({
    key: `filing-${i + 1}`, label: `${rules.label}: ${p.label}`, mode: rules.modes[p.role], subjectId: p.subjectId, role: p.role, person: p.label, group: groupKey, applicationNumber: null,
    fees: rules.fees.map((f) => ({ key: f.key, label: f.label, amountCents: f.perPersonCents })),
  }));
  const groups: Group[] = [];
  if (filings.length) {
    const fees = rules.fees.map((f) => familyFee(f, filings.length));
    groups.push({ key: groupKey, kind: "family", label: filings.length === 1 ? "One submission" : `One submission for ${filings.length} people`, filings: filings.map((f) => f.key), fees,
      totalCents: fees.reduce((s, f) => s + f.totalCents, 0),
      why: filings.length === 1 ? "One person applying." : "A family's visitor visa applications go together, at the same time and place, so the family maximums apply (BR-16)." });
  }
  return { derived: true, combination: combinationKey, label: rules.label, filings, groups, notFiling, currency: "CAD",
    basis: `Fees from the ${FEE_LIST.page} (read ${FEE_LIST.read}); Sample until the immigration expert confirms (P-171). Paying is not built.` };
}
