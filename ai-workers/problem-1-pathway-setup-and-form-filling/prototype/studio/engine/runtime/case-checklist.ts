// C6.4 (M3-B, runtime lane; P-171, P-172; M3 case view r5c "checklist per person"): a case's document checklist, one
// list per person on the case, from the pinned release's document requirements. Each line says whether this person needs
// it now (Needed), not (Not needed, with the answer that decided it) or cannot tell yet (Answer first, naming the facts
// still missing), so the list changes as the case's answers change. A police certificate line carries IRCC's age rule
// for the current country: issued no more than 6 months before the application is submitted (P-171). Visitor visa
// (vv.single) only in this slice; others answer "not derived yet". Pure: no database, no clock (today is passed in).
// Tests: tests/runtime/check_vv_checklist.ts. Uploads and AI reading are C6.5; waiving (P-171 (6)) and the Express Entry
// block (P-172) are permanent-residence rules, not this combination's.
import { MINOR } from "../../contracts/runtime.ts";
import { evalCondition, subjectsFor, type Known, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import type { Participant } from "./case.ts";

/** P-170: IRCC's words for the police certificate's age, as read and checked by the Lead on 29 Oct (immigration-facts
 *  row 20; P-171). Not re-read on 1 Nov: canada.ca is outside this cloud session's network. */
export const POLICE_AGE_SOURCE = {
  page: "Police certificates: when you need them", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/police-certificates/when.html",
  quote: "no more than 6 months before the date you submit your application", quote_kind: "IRCC's words" as const, read: "2026-10-29",
  checked: "Lead-checked record (immigration-facts-2026-10-29.md row 20); Sample until the immigration expert confirms (P-171)",
};
export const POLICE_MONTHS = 6;
export const DERIVED_FOR = new Set(["vv.single"]);

export type LineState = "needed" | "not_needed" | "answer_first";
export type PersonLine = { lineage: string; document: { key: string; name: string }; state: LineState; why: string; missing: string[]; base: boolean;
  provided_by: string; alternatives: { key: string; name: string }[]; quote: string | null;
  rule: null | { kind: "police_age"; months: number; text: string; source: typeof POLICE_AGE_SOURCE } };
export type PersonChecklist = { subject: string; label: string; role: string; applies: boolean; lines: PersonLine[]; needed: number; answer_first: number };
export type CaseChecklist =
  | { derived: true; combination: string; people: PersonChecklist[]; basis: string }
  | { derived: false; combination: string; why: string };

/** Whole months after `from` (calendar months; the day of the month counts). */
const addMonths = (d: Date, n: number) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())); if (x.getUTCDate() !== d.getUTCDate()) x.setUTCDate(0); return x; };
const day = (s: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 ? d : null; };
/** P-171: a police certificate for the current country is good for an application submitted on `submitOn` when it was
 *  issued no more than 6 months before that date (and not after it). Dates are YYYY-MM-DD. */
export function policeCertificateFresh(issuedOn: string, submitOn: string): { fresh: boolean; why: string } {
  const issued = day(issuedOn), submit = day(submitOn);
  if (!issued || !submit) return { fresh: false, why: "Give both dates as year-month-day." };
  if (issued > submit) return { fresh: false, why: "The certificate is dated after the submission date. Check the date." };
  const last = addMonths(issued, POLICE_MONTHS);
  return submit <= last
    ? { fresh: true, why: `Issued ${issuedOn}: good for an application submitted by ${last.toISOString().slice(0, 10)}.` }
    : { fresh: false, why: `Issued ${issuedOn}: more than 6 months before ${submitOn}. Ask for a new certificate.` };
}
const isPolice = (key: string, name: string) => /police/i.test(key) || /police/i.test(name);

/** Age in whole years on `today` from a YYYY-MM-DD birth date, or null when unknown. */
function ageOn(birth: unknown, today: Date): number | null {
  const b = typeof birth === "string" ? day(birth) : null;
  if (!b) return null;
  let a = today.getUTCFullYear() - b.getUTCFullYear();
  if (today.getUTCMonth() < b.getUTCMonth() || (today.getUTCMonth() === b.getUTCMonth() && today.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

/** Each person's checklist on this case, from the release's requirements and what is known about each person. */
export function caseChecklist(s: Snapshot, combinationKey: string, people: Participant[], known: Known, today: Date): CaseChecklist {
  if (!DERIVED_FOR.has(combinationKey)) return { derived: false, combination: combinationKey, why: "The document checklist per person is worked out for the Visitor visa only so far; this combination's is not derived yet. Nothing is guessed." };
  const persons: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const types = (s.document_types ?? []) as { key?: string; name?: string }[];
  const byPerson = new Map<string, PersonLine[]>(persons.map((p) => [p.id, []]));
  for (const r of (s.document_requirements ?? []) as any[]) {
    const t = types.find((x) => x.key === r.document_type_key || x.name === r.document_type);
    const document = { key: t?.key ?? r.document_type_key, name: t?.name ?? r.document_type };
    const kind = r.condition?.subjectKind;
    if (kind === "DOCUMENT") continue;
    // A case-level line ("case") belongs to the principal's list; everyone else by whose document it is. A person not
    // applying has no filing on a Visitor visa (C6.12), so no lines of their own.
    const holders = (kind === "CASE" ? ["case"] : subjectsFor(persons, r.who, kind === "EACH_APPLICANT" || kind === "EACH_PERSON" ? undefined : kind))
      .map((h) => (h === "case" ? persons.find((p) => p.role === "principal")?.id : h)).filter((h): h is string => !!h && byPerson.has(h) && persons.find((p) => p.id === h)!.applies);
    for (const h of new Set(holders)) {
      let state: LineState = "needed", why = r.base_or_conditional === "base" ? "Always needed for this application." : `Needed: ${r.condition_plain ?? "its condition holds"}.`, missing: string[] = [];
      if (r.who === "each_adult_18_plus") {
        const age = ageOn(known.get(`${h}|${MINOR.birthDateField}`)?.value, today);
        if (age === null) { state = "answer_first"; missing = [MINOR.birthDateField]; why = "Needed from 18: answer the birth date first."; }
        else if (age < 18) { state = "not_needed"; why = `Only for people 18 or older; this person is ${age}.`; }
      }
      if (state === "needed" && r.base_or_conditional !== "base" && r.condition) {
        const c = evalCondition(s, known, r.condition, kind === "CASE" ? "case" : h);
        if (c.applies === false) { state = "not_needed"; why = `Not needed: ${r.condition_plain ?? "its condition does not hold"} is not the case.`; }
        else if (c.applies !== true) { state = "answer_first"; missing = c.missing; why = `May be needed (${r.condition_plain ?? "it depends on an answer"}): answer ${c.missing.length ? c.missing.join(", ") : "the questions it depends on"} first.`; }
      }
      const rule = isPolice(document.key ?? "", document.name ?? "")
        ? { kind: "police_age" as const, months: POLICE_MONTHS, text: "For the country where the person lives now: issued no more than 6 months before the application is submitted.", source: POLICE_AGE_SOURCE }
        : null;
      byPerson.get(h)!.push({ lineage: r.lineage, document, state, why, missing, base: r.base_or_conditional === "base", provided_by: r.provided_by,
        alternatives: ((r.alternatives ?? []) as string[]).map((k) => ({ key: k, name: types.find((x) => x.key === k)?.name ?? k })), quote: r.source_quote ?? null, rule });
    }
  }
  const order: Record<LineState, number> = { needed: 0, answer_first: 1, not_needed: 2 };
  return { derived: true, combination: combinationKey, basis: "From the case's release; each line rechecked against the case's answers on every read. Sample until the immigration expert confirms.",
    people: persons.map((p) => {
      const lines = byPerson.get(p.id)!.sort((a, b) => order[a.state] - order[b.state] || a.document.name.localeCompare(b.document.name) || a.lineage.localeCompare(b.lineage));
      return { subject: p.id, label: p.label, role: p.role, applies: p.applies, lines, needed: lines.filter((l) => l.state === "needed").length, answer_first: lines.filter((l) => l.state === "answer_first").length };
    }) };
}
