// C6.4 (M3-B, runtime lane; P-171, P-172; M3 case view r5c "checklist per person"): a case's document checklist, one
// list per person on the case, from the pinned release's document requirements. Each line says whether this person needs
// it now (Needed), not (Not needed, with the answer that decided it) or cannot tell yet (Answer first, naming the
// questions still to answer), so the list changes as the case's answers change. A line whose document type has a
// validity rule in the release (a `document_validity` check, applies_to = the document type key; e.g. the police
// certificate's 6 months, P-171) carries that rule with its citation: the rule is release data, never an engine constant
// (STANDARDS §3.1; Lead on #283). Visitor visa (vv.single) only in this slice; others answer "not derived yet". Pure:
// no database, no clock (the date is passed in). Tests: tests/runtime/check_vv_checklist.ts. Uploads and AI reading are
// C6.5; waiving (P-171 (6)) and the Express Entry block (P-172) are permanent-residence rules, not this combination's.
import { ageInYears } from "../../../contracts/rules.ts";
import { MINOR } from "../../contracts/runtime.ts";
import { evalCondition, subjectsFor, type Known, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import type { Participant } from "./case.ts";

export const DERIVED_FOR = new Set(["vv.single"]);
/** The fact a Visitor visa's ages are worked out on (the release's person.age_years uses the same reference). */
export const APPLICATION_DATE = "case.application_date";

/** A requirement row as the snapshot carries it (engine/snapshot.ts document_requirements). */
type Req = { lineage: string; document_type: string; document_type_key?: string; who: string; base_or_conditional: string; provided_by: string;
  condition?: Cond | null; condition_plain?: string | null; source_quote?: string | null; alternatives?: string[] | null };
type Cond = { subjectKind?: string; [k: string]: unknown };
type DocType = { key: string; name: string };
type Derived = { id: string; inputs?: string[]; reference?: string };

/** A document validity rule from the release: a `document_validity` check whose condition is
 *  `{ op: "issued_within_months", months, before, cite: { page, url, read } }` and whose applies_to is a document type key. */
export type ValidityRule = { kind: "issued_within_months"; check: string; months: number; before: string; text: string;
  source: { page: string; url: string; quote: string; read: string } };
type CheckRow = { id: string; group: string; applies_to: string | null; condition: unknown; message: string | null; source_quote: string | null };

export type LineState = "needed" | "not_needed" | "answer_first";
export type Missing = { key: string; question: string };
export type PersonLine = { lineage: string; also_from: string[]; document: { key: string; name: string }; state: LineState; why: string; missing: Missing[]; base: boolean;
  provided_by: string; alternatives: { key: string; name: string }[]; quote: string | null; rule: ValidityRule | null };
export type PersonChecklist = { subject: string; label: string; role: string; applies: boolean; lines: PersonLine[]; needed: number; answer_first: number };
export type CaseChecklist =
  | { derived: true; combination: string; people: PersonChecklist[]; basis: string; empty_release: boolean; ages_on: string; ages_on_why: string }
  | { derived: false; combination: string; why: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
/** The release's validity rules by document type key; a row that is not well formed is not used (and says nothing). */
export function validityRules(s: Snapshot): Map<string, ValidityRule> {
  const out = new Map<string, ValidityRule>();
  for (const c of (s.checks ?? []) as CheckRow[]) {
    const k = c.condition;
    if (c.group !== "document_validity" || !c.applies_to || !isObj(k) || k.op !== "issued_within_months") continue;
    const cite = isObj(k.cite) ? k.cite : {};
    if (!Number.isInteger(k.months) || (k.months as number) < 1 || typeof k.before !== "string" || !c.source_quote) continue;
    out.set(c.applies_to, { kind: "issued_within_months", check: c.id, months: k.months as number, before: k.before, text: c.message ?? `Issued no more than ${k.months} months before the application is submitted.`,
      source: { page: String(cite.page ?? ""), url: String(cite.url ?? ""), quote: c.source_quote, read: String(cite.read ?? "") } });
  }
  return out;
}

/** Whole months after `from` (calendar months; a day the month does not have falls back to its last day). */
const addMonths = (d: Date, n: number) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())); if (x.getUTCDate() !== d.getUTCDate()) x.setUTCDate(0); return x; };
const day = (s: unknown) => { const m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null; if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null; };
/** A document issued on `issuedOn` is good for an application submitted on `submitOn` when it was issued no more than the
 *  rule's months before that date (and not after it). Dates are YYYY-MM-DD. Used by uploads (C6.5). */
export function issuedWithin(rule: Pick<ValidityRule, "months">, issuedOn: string, submitOn: string): { fresh: boolean; why: string } {
  const issued = day(issuedOn), submit = day(submitOn);
  if (!issued || !submit) return { fresh: false, why: "Give both dates as year-month-day." };
  if (issued > submit) return { fresh: false, why: "The document is dated after the submission date. Check the date." };
  const last = addMonths(issued, rule.months);
  return submit <= last
    ? { fresh: true, why: `Issued ${issuedOn}: good for an application submitted by ${last.toISOString().slice(0, 10)}.` }
    : { fresh: false, why: `Issued ${issuedOn}: more than ${rule.months} months before ${submitOn}. Ask for a new one.` };
}

/** Each person's checklist on this case, from the release's requirements and what is known about each person. `known`
 *  holds only answers without problems (the caller drops the others, B-M2), so a rejected answer never decides a line. */
export function caseChecklist(s: Snapshot, combinationKey: string, people: Participant[], known: Known, today: Date): CaseChecklist {
  if (!DERIVED_FOR.has(combinationKey)) return { derived: false, combination: combinationKey, why: "The document checklist per person is worked out for the Visitor visa only so far; this combination's is not derived yet. Nothing is guessed." };
  const persons: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const types = (s.document_types ?? []) as DocType[], reqs = (s.document_requirements ?? []) as Req[], rules = validityRules(s);
  const derived = (s.derived_fields ?? []) as Derived[];
  const words = questionWords(s);
  // Ages are worked out on the application date when it is answered (as the release's person.age_years), else today.
  const appDate = known.get(`case|${APPLICATION_DATE}`)?.value;
  const agesOn = day(appDate) ? String(appDate) : today.toISOString().slice(0, 10);
  const agesOnWhy = day(appDate) ? "Ages are worked out on the application date." : "Ages are worked out on today's date (UTC) until the application date is answered.";
  /** The questions to answer first: a calculated field is replaced by the questions it is worked out from (B-M3). */
  const toAsk = (keys: string[], about: string): Missing[] => {
    const out = new Map<string, Missing>();
    for (const k of keys) {
      const d = derived.find((x) => x.id === k);
      const inputs = d ? [...(d.inputs ?? []), ...(d.reference ? [d.reference] : [])].filter((f) => !known.has(`${f.startsWith("case.") ? "case" : about}|${f}`)) : [k];
      for (const f of inputs.length ? inputs : d ? [...(d.inputs ?? [])] : [k]) out.set(f, { key: f, question: words(f) });
    }
    return [...out.values()];
  };
  const byPerson = new Map<string, PersonLine[]>(persons.map((p) => [p.id, []]));
  const applying = new Set(persons.filter((p) => p.applies).map((p) => p.id));
  const principal = persons.find((p) => p.role === "principal")?.id;
  for (const r of reqs) {
    const t = types.find((x) => x.key === r.document_type_key || x.name === r.document_type);
    const document = { key: t?.key ?? r.document_type_key ?? r.document_type, name: t?.name ?? r.document_type };
    const kind = r.condition?.subjectKind;
    // R3 / B-M1: whose list a line goes on is the line's own "whose document"; only a case-level line ("case") goes on
    // the principal's. The condition's subject says whose answers decide it (below), never whose list it is on.
    // A person not applying has no filing on a Visitor visa (C6.12), so no lines of their own.
    const holders = [...new Set(subjectsFor(persons, r.who).map((h) => (h === "case" ? principal : h)))].filter((h): h is string => !!h && applying.has(h));
    for (const h of holders) {
      const plain = r.condition_plain ?? null;
      let state: LineState = "needed", missing: Missing[] = [];
      let why = r.base_or_conditional === "base" ? "Always needed for this application." : `Needed: ${plain ?? "its condition holds"}.`;
      if (r.who === "each_adult_18_plus") {
        const age = ageInYears(known.get(`${h}|${MINOR.birthDateField}`)?.value, agesOn);
        if (age === undefined) { state = "answer_first"; missing = toAsk([MINOR.birthDateField], h); why = `Needed from age 18: answer ${missing.map((m) => m.question).join(", ")} first.`; }
        else if (age < 18) { state = "not_needed"; why = `Only for people 18 or older; this person is ${age} on ${agesOn}.`; }
      }
      if (state === "needed" && r.base_or_conditional !== "base" && r.condition) {
        const c = conditionFor(s, known, r.condition, h, persons);
        if (c.applies === false) { state = "not_needed"; why = c.why ?? `Not needed: the answers show it is not the case that ${plain ?? "its condition holds"}.`; }
        else if (c.applies !== true) {
          state = "answer_first"; missing = c.document ? [] : toAsk(c.missing, c.about ?? h);
          why = c.document ? `May be needed (${plain ?? "it depends on another document"}): it depends on a document's contents, which are read once uploads arrive; check it by hand for now.`
            : `May be needed (${plain ?? "it depends on an answer"}): answer ${missing.length ? missing.map((m) => m.question).join(", ") : "the questions it depends on"} first.`;
        }
      }
      const line: PersonLine = { lineage: r.lineage, also_from: [], document, state, why, missing, base: r.base_or_conditional === "base", provided_by: r.provided_by,
        alternatives: (r.alternatives ?? []).map((k) => ({ key: k, name: types.find((x) => x.key === k)?.name ?? k })), quote: r.source_quote ?? null, rule: rules.get(document.key) ?? null };
      // Minor: two requirements for the same document on one person (e.g. a case line and the principal's own) are one
      // line: the strongest state wins and the other requirement is named in also_from.
      const list = byPerson.get(h)!, same = list.findIndex((x) => x.document.key === line.document.key);
      if (same < 0) list.push(line);
      else { const keep = ORDER[line.state] < ORDER[list[same].state] ? line : list[same], drop = keep === line ? list[same] : line; keep.also_from = [...new Set([...keep.also_from, drop.lineage, ...drop.also_from])].sort(); list[same] = keep; }
    }
  }
  return { derived: true, combination: combinationKey, empty_release: reqs.length === 0, ages_on: agesOn, ages_on_why: agesOnWhy,
    basis: reqs.length === 0 ? "The case's release has no document lines yet: an empty list here does not mean nothing is needed. Ask the configuration team." : "From the case's release; each line rechecked against the case's answers on every read (answers with problems are not used). Sample until the immigration expert confirms.",
    people: persons.map((p) => {
      const lines = byPerson.get(p.id)!.sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.document.name.localeCompare(b.document.name) || a.lineage.localeCompare(b.lineage));
      return { subject: p.id, label: p.label, role: p.role, applies: p.applies, lines, needed: lines.filter((l) => l.state === "needed").length, answer_first: lines.filter((l) => l.state === "answer_first").length };
    }) };
}
const ORDER: Record<LineState, number> = { needed: 0, answer_first: 1, not_needed: 2 };

/** A condition decided on its own subject: the case, the principal, the spouse, the holder's own answers (each
 *  applicant / each person) or the children (any child). A condition about a document waits for its contents (C6.5). */
function conditionFor(s: Snapshot, known: Known, tree: Cond, holder: string, persons: Person[]): { applies: boolean | "cannot_tell"; missing: string[]; about?: string; why?: string; document?: true } {
  const kind = tree.subjectKind;
  if (kind === "DOCUMENT") return { applies: "cannot_tell", missing: [], document: true };
  const role = kind === "PRINCIPAL" ? "principal" : kind === "SPOUSE" ? "spouse_or_partner" : kind === "DEPENDENT" ? "child" : null;
  const holderRole = persons.find((p) => p.id === holder)?.role;
  const subjects = kind === "CASE" ? ["case"] : !role || role === holderRole ? [holder] : persons.filter((p) => p.role === role).map((p) => p.id);
  if (!subjects.length) return { applies: false, missing: [], why: `Not needed: it depends on the ${role === "spouse_or_partner" ? "spouse or partner" : "children"}, and there is none on the case.` };
  const rs = subjects.map((about) => ({ about, ...evalCondition(s, known, tree, about) }));
  const yes = rs.find((x) => x.applies === true);
  if (yes) return { applies: true, missing: [] };
  const open = rs.find((x) => x.applies !== false);
  return open ? { applies: "cannot_tell", missing: open.missing, about: open.about } : { applies: false, missing: [] };
}

/** The words a person sees for a fact: its question on the release, else its meaning, else the key. */
function questionWords(s: Snapshot): (key: string) => string {
  const q = new Map<string, string>();
  for (const p of (s.placements ?? []) as { fact: string; question_text?: string | null }[]) if (p.question_text && !q.has(p.fact)) q.set(p.fact, p.question_text);
  for (const f of (s.canonical_fields ?? []) as { id: string; meaning?: string | null }[]) if (f.meaning && !q.has(f.id)) q.set(f.id, f.meaning);
  return (key) => { const w = (q.get(key) ?? key).trim().replace(/[.?:]$/, ""); return `"${w}"`; };
}
