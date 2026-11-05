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
import { lineCondition, lineHolders, type Known, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import { isFilingFact } from "../resolver.ts";
import { FILING } from "../../contracts/resolver.ts";
import { WHO_WORDS } from "../../contracts/lines-bulk.ts";
import type { Participant } from "./case.ts";
import { FEE_TABLE } from "./filings.ts";

/** R2 (P-230 (7)): the combinations whose checklist is worked out are data (samples/fee-table.json "checklist": true),
 *  so another combination is a data edit once its requirements are checked, never code. */
export const DERIVED_FOR = new Set(Object.entries(FEE_TABLE.combinations).filter(([, c]) => c.checklist).map(([k]) => k));
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
export type ValidityRule = { kind: "issued_within_months"; check: string; months: number; before: string; text: string; status: string;
  source: { page: string; url: string; quote: string; read: string } };
type CheckRow = { id: string; group: string; applies_to: string | null; condition: unknown; message: string | null; source_quote: string | null };
export const MAX_VALIDITY_MONTHS = 120;

export type Need = "needed" | "not_needed" | "answer_first";
/** A question to answer first; `answered`: it is answered, but with the others it does not work out (e.g. a birth date
 *  after the application date), so it is to check rather than to answer. */
export type Missing = { key: string; question: string; answered: boolean;
  /** C6.4 (a): whose question it is, so a link reaches it: the case's own (asked once for the application) or a person's,
   *  and which person (Devin on #1073: the person whose answer decides the line may not be the line's holder). */
  on: "case" | "person"; subject: string | null };
/** M3-CONTRACT (pack 4, C6.4): a line's id, document type, label, the team's state (SI-14: storage, requests and file
 *  status are AG-09's; every derived line is Not requested until C6.4's storage slice), reason and required; plus this
 *  slice's detail. A line is in `lines` when the person needs it, in `waiting` when an answer decides it first, and in
 *  `not_needed` with the answer that decided it. */
export type PersonLine = { id: string; document_type: string; label: string; state: "not_requested"; reason: string; required: boolean; documents: never[];
  need: Need; lineage: string; also_from: string[]; document: { key: string; name: string }; missing: Missing[]; base: boolean;
  provided_by: string; alternatives: { key: string; name: string }[]; quote: string | null; rule: ValidityRule | null;
  /** C6.4 (a), challenge r2 M1: whose line it is (the release's "whose document") and its words, for the Documents panel. */
  who: string; who_words: string };
export type PersonChecklist = { subject: string; label: string; role: string; applies: boolean; lines: PersonLine[]; waiting: PersonLine[]; not_needed: PersonLine[]; needed: number; answer_first: number };
export type CaseChecklist =
  | { derived: true; stand_in: "SI-14"; combination: string; people: PersonChecklist[]; basis: string; empty_release: boolean; ages_on: string; ages_on_why: string }
  | { derived: false; combination: string; why: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const plainText = (x: unknown) => typeof x === "string" && x.trim().length > 0 && !/[<>]/.test(x);
/** Why a document_validity check cannot be used, or [] when it can. One test for the release check (engine/validate.ts)
 *  and for the case (validityRules), so a rule the release calls "not used" is never used (break M2). `isField`: is the
 *  date it is measured to a known field; `types`: the document type keys in the release. */
export function validityProblems(c: CheckRow, isField: (k: string) => boolean, types: Set<string>): string[] {
  const k = isObj(c.condition) ? c.condition : {}, cite = isObj(k.cite) ? k.cite : {}, why: string[] = [];
  if (k.op !== "issued_within_months") why.push("it is not an \"issued within months\" rule");
  if (!Number.isInteger(k.months) || (k.months as number) < 1 || (k.months as number) > MAX_VALIDITY_MONTHS) why.push(`its months are not a whole number from 1 to ${MAX_VALIDITY_MONTHS}`);
  if (typeof k.before !== "string" || !isField(k.before)) why.push("the date it is measured to is not a field in the library");
  if (!c.applies_to || !types.has(c.applies_to)) why.push("it names no document type in this release");
  if (!plainText(c.source_quote) || !plainText(cite.page) || typeof cite.url !== "string" || !/^https:\/\/[^\s<>"]+$/.test(cite.url) || typeof cite.read !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cite.read))
    why.push("it has no source quote, page, https address and date read (P-170)");
  return why;
}
/** The release's usable validity rules by document type key. Two rules for one document type: neither is used (the
 *  release check says so), so the case never picks one silently (break m1). */
export function validityRules(s: Snapshot): Map<string, ValidityRule> {
  const fields = new Set(((s.canonical_fields ?? []) as { id: string }[]).map((f) => f.id)), types = new Set(((s.document_types ?? []) as DocType[]).map((t) => t.key));
  const rows = ((s.checks ?? []) as CheckRow[]).filter((c) => c.group === "document_validity" && validityProblems(c, (f) => fields.has(f), types).length === 0);
  const out = new Map<string, ValidityRule>();
  const twice = new Set(duplicateValidity((s.checks ?? []) as CheckRow[]));
  for (const c of rows) {
    if (twice.has(c.applies_to!)) continue;
    const k = c.condition as { months: number; before: string; cite: { page: string; url: string; read: string } };
    out.set(c.applies_to!, { kind: "issued_within_months", check: c.id, months: k.months, before: k.before, status: "Sample until the immigration expert confirms (P-171)",
      text: plainText(c.message) ? c.message! : `Issued no more than ${k.months} months before the application is submitted.`,
      source: { page: k.cite.page, url: k.cite.url, quote: c.source_quote!, read: k.cite.read } });
  }
  return out;
}
/** Document types with more than one usable validity rule (the release check warns). */
export function duplicateValidity(rows: CheckRow[]): string[] {
  const keys = rows.filter((c) => c.group === "document_validity" && c.applies_to).map((c) => c.applies_to!);
  return [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
}

/** Whole months after `from` (calendar months; a day the month does not have falls back to its last day). */
const addMonths = (d: Date, n: number) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())); if (x.getUTCDate() !== d.getUTCDate()) x.setUTCDate(0); return x; };
const day = (s: unknown) => { const m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim()) : null; if (!m) return null; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null; };
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
export function caseChecklist(s: Snapshot, combinationKey: string, people: Participant[], answers: Known, today: Date): CaseChecklist {
  if (!DERIVED_FOR.has(combinationKey)) return { derived: false, combination: combinationKey, why: "The document checklist per person is not derived yet for this combination (it is worked out once its requirements are checked). Nothing is guessed." };
  // Break M1: an answer saved with spaces around it (" 1980-01-01 ") passes its checks, which trim; it is read trimmed.
  const known: Known = new Map([...answers].map(([k, v]) => [k, typeof v.value === "string" ? { ...v, value: v.value.trim() } : v]));
  const persons: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const types = (s.document_types ?? []) as DocType[], reqs = (s.document_requirements ?? []) as Req[], rules = validityRules(s);
  const derived = (s.derived_fields ?? []) as Derived[];
  const words = questionWords(s);
  // Ages are worked out on the application date when it is answered (as the release's person.age_years), else today.
  const appDate = known.get(`case|${APPLICATION_DATE}`)?.value;
  const agesOn = day(appDate) ? String(appDate) : today.toISOString().slice(0, 10);
  const agesOnWhy = day(appDate) ? "Ages are worked out on the application date." : "Until the application date is answered, ages for the 18-or-older lines are worked out on today's date (UTC); a line whose condition reads the release's age asks for the application date first.";
  const placed = new Map<string, { fact: string; repeats?: string | null }>(); // the first placement of a fact, as render.ts reads it
  for (const p of (s.placements ?? []) as { fact: string; repeats?: string | null }[]) if (!placed.has(p.fact)) placed.set(p.fact, p);
  /** The questions to answer first: a calculated field is replaced by the questions it is worked out from (B-M3). */
  const toAsk = (keys: string[], about: string): Missing[] => {
    const out = new Map<string, Missing>();
    for (const k of keys) {
      const d = derived.find((x) => x.id === k);
      // SH3 R5 with the placement (C7.7, contract item (c)); an answer saved on the person before its placement became once
      // per case still counts (Devin on #680, as render's keepAnswered, review r2-m1).
      const has = (f: string) => known.has(`${isFilingFact(f, placed.get(f)) ? FILING : about}|${f}`) || known.has(`${isFilingFact(f) ? FILING : about}|${f}`);
      const all = d ? [...(d.inputs ?? []), ...(d.reference ? [d.reference] : [])] : [k];
      const open = all.filter((f) => !has(f));
      for (const f of open.length ? open : all) { const onCase = isFilingFact(f, placed.get(f)) || about === FILING; out.set(f, { key: f, question: words(f), answered: !open.length, on: onCase ? "case" : "person", subject: onCase ? null : about }); }
    }
    return [...out.values()];
  };
  const say = (m: Missing[], what: string) => m.length && m.every((x) => x.answered)
    ? `${what}: check ${m.map((x) => x.question).join(" and ")}; together they do not give an answer (for example a birth date after the application date).`
    : `${what}: answer ${m.length ? m.map((x) => x.question).join(", ") : "the questions it depends on"} first.`;
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
    const holders = [...new Set(lineHolders(persons, r.who).map((h) => (h === "case" ? principal : h)))].filter((h): h is string => !!h && applying.has(h));
    for (const h of holders) {
      const plain = inReason(r.condition_plain);
      let state: Need = "needed", missing: Missing[] = [];
      let why = r.base_or_conditional === "base" ? "Always needed for this application." : `Needed: ${plain ?? "its condition holds"}.`;
      if (r.who === "each_adult_18_plus") {
        const age = ageInYears(known.get(`${h}|${MINOR.birthDateField}`)?.value, agesOn);
        if (age === undefined) {
          state = "answer_first";
          const born = known.has(`${h}|${MINOR.birthDateField}`);
          missing = born ? [{ key: MINOR.birthDateField, question: words(MINOR.birthDateField), answered: true, on: "person" as const, subject: h }, ...(day(appDate) ? [{ key: APPLICATION_DATE, question: words(APPLICATION_DATE), answered: true, on: "case" as const, subject: null }] : [])] : toAsk([MINOR.birthDateField], h);
          why = say(missing, "Needed from age 18");
        }
        else if (age < 18) { state = "not_needed"; why = `Only for people 18 or older; this person is ${age} on ${agesOn}.`; }
      }
      if (state === "needed" && r.base_or_conditional !== "base" && r.condition) {
        const c = conditionFor(s, known, r.condition, h, persons);
        if (c.applies === false) { state = "not_needed"; why = c.why ?? `Not needed: the answers show it is not the case that ${plain ?? "its condition holds"}.`; }
        else if (c.applies !== true) {
          state = "answer_first"; missing = c.document ? [] : toAsk(c.missing, c.about ?? h);
          why = c.document ? `May be needed (${plain ?? "it depends on another document"}): it depends on a document's contents, which are read once uploads arrive; check it by hand for now.`
            : say(missing, `May be needed (${plain ?? "it depends on an answer"})`);
        }
      }
      const line: PersonLine = { id: `${h}:${r.lineage}`, document_type: document.key, label: document.name, state: "not_requested", reason: why, required: state === "needed", documents: [],
        need: state, lineage: r.lineage, also_from: [], document, missing, base: r.base_or_conditional === "base", provided_by: r.provided_by,
        alternatives: (r.alternatives ?? []).map((k) => ({ key: k, name: types.find((x) => x.key === k)?.name ?? k })), quote: r.source_quote ?? null, rule: rules.get(document.key) ?? null,
        who: r.who, who_words: whoWords(r.who) };
      // Minor: two requirements for the same document on one person (e.g. a case line and the principal's own) are one
      // line: the strongest state wins and the other requirement is named in also_from.
      // Break m7: the merged line is "always" when either requirement is.
      const list = byPerson.get(h)!, same = list.findIndex((x) => x.document.key === line.document.key);
      if (same < 0) list.push(line);
      else { const keep = ORDER[line.need] < ORDER[list[same].need] ? line : list[same], drop = keep === line ? list[same] : line; keep.also_from = [...new Set([...keep.also_from, drop.lineage, ...drop.also_from])].sort(); keep.base ||= drop.base; list[same] = keep; }
    }
  }
  return { derived: true, stand_in: "SI-14", combination: combinationKey, empty_release: reqs.length === 0, ages_on: agesOn, ages_on_why: agesOnWhy,
    basis: reqs.length === 0 ? "The case's release has no document lines yet: an empty list here does not mean nothing is needed. Ask the configuration team." : "From the case's release; each line rechecked against the case's answers on every read (answers with problems are not used). Sample until the immigration expert confirms.",
    people: persons.map((p) => {
      const all = byPerson.get(p.id)!.sort((a, b) => a.document.name.localeCompare(b.document.name) || a.lineage.localeCompare(b.lineage));
      const of = (n: Need) => all.filter((l) => l.need === n);
      return { subject: p.id, label: p.label, role: p.role, applies: p.applies, lines: of("needed"), waiting: of("answer_first"), not_needed: of("not_needed"), needed: of("needed").length, answer_first: of("answer_first").length };
    }) };
}
const ORDER: Record<Need, number> = { needed: 0, answer_first: 1, not_needed: 2 };

/** C6.4 (a), challenge r2 M1: a release's plain condition as it reads inside a reason ("Needed: …."): its last full stop
 *  removed, and its first word lower-cased only when it is a common opening word ("The applicant is married." → "the
 *  applicant is married"), so the reason never reads "married.." or "the case that The applicant". Any other first word
 *  (a name, a nationality, IMM, IRCC) is kept as written (review minor 2). */
const OPENERS = new Set(["The", "A", "An", "This", "That", "These", "Those", "Only", "If", "When", "Each", "Every", "Any", "Applicant", "Applicants", "Person", "Someone", "Anyone"]);
export function inReason(plain: string | null | undefined): string | null {
  const t = (plain ?? "").trim().replace(/[.\s]+$/, "");
  if (!t) return null;
  const first = t.split(/\s/)[0];
  return OPENERS.has(first) ? t[0].toLowerCase() + t.slice(1) : t;
}
/** Whose line it is, in the words of the Forms and Documents tabs (contracts/lines-bulk.ts WHO_WORDS), as a note
 *  ("For each applicant", "Once for the couple"); an unknown "who" is named as it is, never hidden. */
export function whoWords(who: string): string {
  if (who === "couple_once") return "Once for the couple";
  if (who === "case") return "Once for the application";
  const w = WHO_WORDS[who];
  return w ? `For ${w}` : `For: ${who}`;
}

/** A condition decided on its own subject, by the one rule Preview and the Documents tab use (render.ts lineCondition;
 *  Q2 on #325), with the case checklist's words for "nobody on the case". */
function conditionFor(s: Snapshot, known: Known, tree: Cond, holder: string, persons: Person[]): { applies: boolean | "cannot_tell"; missing: string[]; about?: string; why?: string; document?: true } {
  const c = lineCondition(s, known, persons, holder, tree);
  return c.nobody ? { applies: false, missing: [], why: `Not needed: it depends on the ${c.nobody}, and there is none on the case.` } : c;
}

/** The words a person sees for a fact: its question on the release, else its meaning, else the key. */
function questionWords(s: Snapshot): (key: string) => string {
  const q = new Map<string, string>();
  for (const p of (s.placements ?? []) as { fact: string; question_text?: string | null }[]) if (p.question_text && !q.has(p.fact)) q.set(p.fact, p.question_text);
  for (const f of (s.canonical_fields ?? []) as { id: string; meaning?: string | null }[]) if (f.meaning && !q.has(f.id)) q.set(f.id, f.meaning);
  return (key) => { const w = (q.get(key) ?? key).trim().replace(/[.?:]$/, ""); return `"${w}"`; };
}
