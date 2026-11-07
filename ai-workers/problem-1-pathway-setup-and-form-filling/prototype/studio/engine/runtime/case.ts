// The case engine (runtime lane, R1): pure functions from a pinned release snapshot, the people on a case and their
// current answers, to what each person is asked, how each answer checks, whether it is confirmed (P-72) and which form
// boxes it fills. The questionnaire itself comes from the common renderer (engine/render.ts), so a case asks exactly
// what the release preview shows. No I/O; every output says why.
import { evalCondition, kkey, render, type Known, type Person, type Role } from "../render.ts";
import { subjectKindOf, type Snapshot } from "../snapshot.ts";
import { checkFormat, snapshotFieldFormat } from "../field-format.ts";
import { isCodeRange } from "../options.ts";
import { z } from "zod";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { gateOf, type GatePlacement } from "./gates.ts";
import { SCOPE_TAG } from "../field-scope.ts";
import type { Period } from "../../../contracts/history.ts";
import { Address, CONFIRM_WORDS, groupLabel, MINOR, Phone, type QuestionnaireView, type SectionProblem, type ViewCheck, type ViewGroup } from "../../contracts/runtime.ts";

export type Participant = { subjectId: string; role: Role | "case"; label: string; applies: boolean };
export type Answer = { id: string; subjectId: string; field: string; rowKey: string | null; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string; origin?: { channel: string; actor: string; at: string } | null };
export type Row = { rowKey: string; subjectId: string; group: string; order: number };
/** A repeating group's own answer (client_group_answer): none apply (true) or entries apply (false). */
export type GroupAnswer = { id: string; subjectId: string; group: string; noneApply: boolean; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string; origin?: { channel: string; actor: string; at: string } | null };
export type Confirmation = { confirmed: boolean; why: string };

/** Fields the client answers (P-72 "the client's fields"): placed in the questionnaire or the client's profile, and
 *  about a person, a relationship or the application (never the representative's own facts). */
const CLIENT_SOURCES = new Set(["client_questionnaire", "profile_record"]);
const CLIENT_KINDS = new Set(["PERSON", "RELATIONSHIP", "CASE"]);

/** The parts of a released placement and field this engine reads (the snapshot keeps them as loose JSON). */
type Placement = { fact: string; section_id: string; order?: number; repeats: string; collected_from: string; condition?: unknown; condition_effect?: string | null; scope?: string };
type FieldDef = { id: string; value_type?: string; meaning?: string; item_version?: number; answer_list?: { key: string; values: { key: string; label: string }[] } };
const placementOf = (s: Snapshot, field: string): Placement | undefined => (s.placements as Placement[]).find((p) => p.fact === field);
const fieldOf = (s: Snapshot, field: string): FieldDef | undefined => (s.canonical_fields as FieldDef[]).find((f) => f.id === field);
export const isClientField = (s: Snapshot, field: string) => CLIENT_SOURCES.has(placementOf(s, field)?.collected_from ?? "") && CLIENT_KINDS.has(subjectKindOf(field));

/** P-47 types (C4.4). Long text with no form box limit: a generous cap so a pasted document is not saved as an answer. */
const LONG_TEXT_MAX = 4000;
const PersonName = z.object({ family_name: z.string().optional(), given_names: z.string().optional(), no_given_name: z.boolean().optional() }).strict();
/** P-130 amends P-47: an upload is a document checklist line, not a question (C4.5). A field typed "document" is never asked. */
export const DOCUMENT_NOT_A_QUESTION = "An upload is a line of the document checklist, not a question: add it on the Documents tab.";

const realDate = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d && y >= 1900 && y <= 2100; };

/** Age in whole years on a day, from an ISO date; null when the date is not a real date or is after that day
 *  (PR 7 review D2: an impossible or future birth date never gives an age). */
export function ageOn(birth: unknown, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birth ?? ""));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!realDate(y, mo, d) || Date.UTC(y, mo - 1, d) > Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age--;
  return age;
}

/** P-72 and P-78: VERIFIED is confirmed; the client's (principal's) typed answer on a client field counts as confirmed
 *  for the principal, the application and a minor child; for an adult it is "answered by the principal" until that
 *  adult or the officer confirms; everything else waits for "Confirm section". */
export function confirmation(s: Snapshot, a: Answer, who: Participant | undefined, birthDate: unknown, today: Date): Confirmation {
  if (a.status === "VERIFIED") return { confirmed: true, why: CONFIRM_WORDS.officer };
  if (a.channel !== "questionnaire") return { confirmed: false, why: `${CONFIRM_WORDS.waits} (entered by the case officer)` };
  if (!isClientField(s, a.field)) return { confirmed: false, why: `${CONFIRM_WORDS.waits} (a fact the officer confirms from a document or record)` };
  if (who?.role === "principal" || who?.role === "case") return { confirmed: true, why: CONFIRM_WORDS.client_own };
  if (who?.role === "child") {
    const age = ageOn(birthDate, today);
    if (age !== null && age < MINOR.underAge) return { confirmed: true, why: `${CONFIRM_WORDS.client_own} (for a child under ${MINOR.underAge})` };
    return { confirmed: false, why: age === null ? `${CONFIRM_WORDS.waits} (the child's date of birth is not answered yet, or is not a real past date)` : `${CONFIRM_WORDS.by_principal} (the child is ${age})` };
  }
  return { confirmed: false, why: CONFIRM_WORDS.by_principal };
}

/** How the forms that read a field write it (from the release's field maps): the precision and limits a value needs. */
export function shapeOf(s: Snapshot, field: string) {
  const ts = (s.field_maps as { entries: { fact?: string | null; transform?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field).map((e) => e.transform ?? ""));
  const maxes = ts.map((t) => /max (\d+) char/.exec(t)?.[1]).filter(Boolean).map(Number);
  const dayNeeded = ts.some((t) => /date(_part)?:DD|date:YYYY-MM-DD|^date$|date:DD/.test(t)) || !ts.some((t) => /date(_part)?:MM/.test(t));
  // A short code list written in the map itself, "code_list:imm5257.visa_type (VisitorVisa, Transit)": the values a
  // choice field without an answer list may take (labels before any "=code").
  // QA-272: "(01..09)" names no values: on a release that kept it the answer stays open, never one choice called "01..09".
  const listed = ts.map((t) => /^code_list:\S+ \(([^)]*)\)/.exec(t)?.[1]).find((x) => x && !isCodeRange(x));
  const choices = listed ? listed.split(",").map((x) => x.split("=")[0].trim()).filter(Boolean) : null;
  // C3.1 AT-10 (IRCC-F07, P-162): the form's own box limit for the whole answer (read from the PDF) counts too.
  const boxMax = snapshotFieldFormat(s as never, field).rules.filter((r) => r.check === "max_length" && !r.part).map((r) => Number(r.params.n)).filter((n) => n > 0);
  maxes.push(...boxMax);
  return { maxLength: maxes.length ? Math.min(...maxes) : fieldOf(s, field)?.value_type === "long_text" ? LONG_TEXT_MAX : 500, datePrecision: dayNeeded ? "day" as const : "month" as const, phone: ts.some((t) => /phone_part/.test(t)), money: ts.some((t) => /CAD/.test(t)), choices };
}


/** "VisitorVisa" → "Visitor visa": a PDF export value written as joined words, read as a person writes it. */
const words = (x: string) => /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(x) ? x.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ ([A-Z])/g, (_, c: string) => ` ${c.toLowerCase()}`) : x;

/** The labels a field's answers carry on its forms (the first form that labels them): from a field map's
 *  "code_list:… (Label=code, …)" through its option map (answer key → code). A list without "=code" names its codes
 *  by their labels ("Female", "VisitorVisa"). Where no map labels an answer, the answer list's own label stays. */
export function optionsOf(s: Snapshot, field: string): { key: string; label: string }[] | null {
  const entries = (s.field_maps as { entries: { fact?: string | null; transform?: string | null; option_map?: { map?: Record<string, string> } | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field));
  const labelOf = (key: string) => {
    for (const e of entries) {
      const list = /^code_list:\S+ \(([^)]*)\)/.exec(e.transform ?? "")?.[1];
      if (!list) continue;
      const pairs = list.split(";")[0].split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [l, c] = x.split("="); return { label: l.trim(), code: (c ?? l).trim() }; });
      const code = e.option_map?.map?.[key] ?? key;
      const hit = pairs.find((p) => p.code === code);
      if (hit && !/^\d+$/.test(hit.label)) return words(hit.label);
    }
    return null;
  };
  const listed = fieldOf(s, field)?.answer_list?.values;
  if (listed) return listed.map((v) => ({ key: v.key, label: labelOf(v.key) ?? v.label }));
  const choices = shapeOf(s, field).choices;
  return choices ? choices.map((c) => ({ key: c, label: labelOf(c) ?? words(c) })) : null;
}

/** Characters as a person counts them (an emoji is one), not UTF-16 units. */
const chars = (x: string) => [...x].length;

/** Field checks (P-47 tier 1): the value's type, list and limits, then (P-162, C3.1) the format its forms' own boxes
 *  enforce (engine/field-format.ts: digits only for a UCI, a Canadian postal code, …). Plain messages; empty when fine. */
export function checkValue(s: Snapshot, field: string, value: unknown, today = new Date()): string[] {
  const typed = checkType(s, field, value, today);
  return typed.length ? typed : checkFormat(snapshotFieldFormat(s as never, field), value, { today });
}

function checkType(s: Snapshot, field: string, value: unknown, today: Date): string[] {
  const f = fieldOf(s, field);
  if (!f) return ["This question is not in the release the case works from."];
  const shape = shapeOf(s, field), type = String(f.value_type ?? "text");
  const str = typeof value === "string" ? value.trim() : null;
  const list = f.answer_list?.values ?? [];
  switch (type) {
    case "yes_no": return typeof value === "boolean" ? [] : ["Answer yes or no."];
    case "number": {
      if (typeof value !== "number" && !/^\d+(\.\d+)?$/.test(str ?? "")) return ["Enter a number of 0 or more, digits only."];
      const n = typeof value === "number" ? value : Number(str);
      if (!Number.isFinite(n) || n < 0 || n > 1e12) return ["Enter a number of 0 or more."];
      if (shape.money && !Number.isInteger(n)) return ["Enter whole dollars, without cents."];
      return String(n).length > 12 ? ["That number is too long for the form (12 characters at most)."] : [];
    }
    case "date": {
      if (shape.datePrecision === "month") { const m = /^(\d{4})-(\d{2})$/.exec(str ?? ""); return m && realDate(Number(m[1]), Number(m[2]), 1) ? [] : ["Enter a month and year, for example 2019-06."]; }
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str ?? "");
      if (!m || !realDate(Number(m[1]), Number(m[2]), Number(m[3]))) return ["Enter a real date as day, month and year."];
      if (field === MINOR.birthDateField && str! > today.toISOString().slice(0, 10)) return ["A date of birth cannot be in the future."];
      // C6.4 B-M3: an application is submitted near today; a date years away (1900, 2200) is a typing mistake, and ages
      // worked out on it would be impossible. Within 5 years either side (Sample bound, not an IRCC rule).
      if (field === "case.application_date") {
        const y = today.getUTCFullYear(), md = today.toISOString().slice(4, 10), from = `${y - 5}${md}`, to = `${y + 5}${md}`;
        if (str! < from || str! > to) return ["Enter the date the application is submitted: within 5 years of today."];
      }
      return [];
    }
    case "code": case "country":
      if (str === null || !str) return ["Choose an answer."];
      if (list.length) return list.some((v) => v.key === str) ? [] : ["Choose one of the listed answers."];
      if (shape.choices) return shape.choices.some((c) => c.toLowerCase() === str.toLowerCase()) ? [] : [`Choose one of: ${shape.choices.join(", ")}.`];
      return chars(str) > 120 ? ["Keep the answer to 120 characters."] : [];
    case "multi_choice": {
      if (!Array.isArray(value) || !value.length || !value.every((v) => typeof v === "string")) return ["Choose at least one answer."];
      if (new Set(value).size !== value.length) return ["Choose each answer once."];
      return !list.length || value.every((v) => list.some((x) => x.key === v)) ? [] : ["Choose only from the listed answers."];
    }
    case "long_text": {
      if (str === null) return ["Enter text."];
      if (!str) return ["Enter an answer."];
      return chars(str) > shape.maxLength ? [`Keep it to ${shape.maxLength} characters (it is ${chars(str)}).`] : [];
    }
    case "person_name": {
      const parsed = PersonName.safeParse(value);
      if (!parsed.success) return ["Enter the name in its parts: family name, and given names or \"no given name\"."];
      const n = parsed.data, family = (n.family_name ?? "").trim(), given = (n.given_names ?? "").trim(), out: string[] = [];
      if (!family) out.push("Enter the family name, as on the passport.");
      if (n.no_given_name && given) out.push("Leave the given names empty, or untick \"no given name\".");
      else if (!n.no_given_name && !given) out.push("Enter the given names, or tick \"no given name\" if the passport shows none.");
      for (const [w, x] of [["family name", family], ["given names", given]] as const) if (chars(x) > shape.maxLength) out.push(`Keep the ${w} to ${shape.maxLength} characters.`);
      return out;
    }
    case "period_history": {
      if (!Array.isArray(value)) return ["Add each period with its start month, end month and what you did."];
      if (!value.length) return ["Add at least one period."];
      const now = today.getUTCFullYear() * 100 + today.getUTCMonth() + 1, out: string[] = [];
      value.forEach((row: Period, i) => {
        const at = `Period ${i + 1}`;
        const month = (x: unknown) => { const m = typeof x === "string" ? /^(\d{4})-(\d{2})$/.exec(x.trim()) : null; return m && realDate(Number(m[1]), Number(m[2]), 1) ? Number(m[1]) * 100 + Number(m[2]) : null; };
        const from = month(row?.from), open = row?.to === undefined || row?.to === null || row?.to === "", to = open ? now : month(row?.to);
        const early = (x: unknown) => typeof x === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(x.trim()) && Number(x.slice(0, 4)) < 1900;
        if (from === null) out.push(early(row?.from) ? `${at}: the start is before 1900; check the year.` : `${at}: enter the start as month and year, for example 2019-06.`);
        if (to === null) out.push(early(row?.to) ? `${at}: the end is before 1900; check the year.` : `${at}: enter the end as month and year, or leave it empty if it goes on today.`);
        if (from !== null && from > now) out.push(`${at}: the start is in the future; a history covers what has already happened.`);
        else if (from !== null && to !== null && to < from) out.push(`${at}: the end is before the start; check both months.`);
        if (to !== null && to > now) out.push(`${at}: the end is in the future; leave it empty if it goes on today.`);
        if (typeof row?.what !== "string" || !row.what.trim()) out.push(`${at}: say what you did (work, study, unemployed, travel).`);
      });
      return out;
    }
    case "declaration": return value === true ? [] : ["Tick the box to make the declaration; the application cannot be filed without it."];
    case "document": return [DOCUMENT_NOT_A_QUESTION];
    case "address": {
      const parsed = Address.strict().safeParse(value);
      if (!parsed.success) return ["Enter the address in its parts (street, city, country), as text."];
      const a = parsed.data, out: string[] = [];
      for (const [k, w] of [["street_name", "street"], ["city", "city or town"], ["country", "country"]] as const) if (!String(a[k] ?? "").trim()) out.push(`Enter the ${w}.`);
      return out;
    }
    default: {
      if (shape.phone) {
        const parsed = Phone.strict().safeParse(value);
        if (!parsed.success) return ["Enter the country code and the number."];
        const p = parsed.data;
        const out: string[] = [];
        if (!/^\d{1,3}$/.test(String(p.country_code ?? ""))) out.push("Enter a country code of 1 to 3 digits, for example 91.");
        if (!/^\d{4,15}$/.test(String(p.number ?? "").replace(/[\s-]/g, ""))) out.push("Enter the number with digits only (4 to 15).");
        return out;
      }
      if (str === null) return ["Enter text."];
      if (!str) return ["Enter an answer."];
      if (type === "email" || /email/.test(field)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str) ? [] : ["Enter an email address like name@example.com."];
      return chars(str) > shape.maxLength ? [`Keep it to ${shape.maxLength} characters (it is ${chars(str)}); the form has no room for more.`] : [];
    }
  }
}

/** The renderer's known facts from current answers: confirmed ones as "confirmed", the rest as "answered". Row answers
 *  take the row's place among the subject's live rows of that group; a box with no row reads the first row. */
export function knownOf(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], today: Date): { known: Known; confirm: Map<string, Confirmation> } {
  const known: Known = new Map(), confirm = new Map<string, Confirmation>();
  const about = (subjectId: string) => (people.find((p) => p.subjectId === subjectId)?.role === "case" ? "case" : subjectId);
  const index = new Map<string, number>();
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(`${r.subjectId}|${r.group}`, [...(groups.get(`${r.subjectId}|${r.group}`) ?? []), r]);
  for (const list of groups.values()) [...list].sort(byOrder).forEach((r, i) => index.set(r.rowKey, i));
  const birth = (subjectId: string) => answers.find((a) => a.subjectId === subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value;
  for (const a of answers) {
    if (a.rowKey && !index.has(a.rowKey)) continue; // a removed row's answers stay stored and are never read
    const c = confirmation(s, a, people.find((p) => p.subjectId === a.subjectId), birth(a.subjectId), today);
    confirm.set(a.id, c);
    // A number answered as digits ("000", "0.0") is read as the number it is, so rules compare numbers (break report m9).
    const value = fieldOf(s, a.field)?.value_type === "number" && typeof a.value === "string" && /^\d+(\.\d+)?$/.test(a.value.trim()) ? Number(a.value) : a.value;
    const v = { value, status: c.confirmed ? "confirmed" as const : "answered" as const, source: `${a.channel} by ${a.actor}` };
    const row = a.rowKey ? index.get(a.rowKey)! : undefined;
    known.set(kkey(about(a.subjectId), a.field, row), v);
    if (row === 0 && !known.has(kkey(about(a.subjectId), a.field))) known.set(kkey(about(a.subjectId), a.field), v);
  }
  // C7.7 (G25): "has any children" is worked out from the people on the case, never left by hand when the case holds them.
  for (const [subjectId, value] of hasChildrenOf(people)) known.set(kkey(subjectId, HAS_CHILDREN), { value, status: "confirmed", source: HAS_CHILDREN_SOURCE });
  return { known, confirm };
}

/** C7.7 (G25, QA-139): `person.has_children` is derived for the principal and the spouse or partner: Yes when the case
 *  holds a child. With no child on the case it stays a question (a child may exist who is not on this application), so
 *  only Yes is ever derived. A derived Yes overrides an answer of No. */
export const HAS_CHILDREN = "person.has_children", HAS_CHILDREN_SOURCE = "worked out: the case holds this family's children";
export function hasChildrenOf(people: Participant[]): Map<string, true> {
  if (!people.some((p) => p.role === "child")) return new Map();
  return new Map(people.filter((p) => p.role === "principal" || p.role === "spouse_or_partner").map((p) => [p.subjectId, true as const]));
}

/** C3.16: the tag and the people a household or employer question asked once on the case is read for. */
function scopeTagOf(about: string, p: Placement | undefined, fills: Map<string, { person: string; subject: string }> | undefined) {
  const mark = about === "case" && (p?.scope === "household" || p?.scope === "organisation") ? p.scope : null;
  if (!mark) return {}; // unmarked questions keep their shape (every view without a scope stays as before)
  return { scope_tag: SCOPE_TAG[mark], read_for: [...new Map([...(fills?.values() ?? [])].map((f) => [f.subject, { subjectId: f.subject, label: f.person }])).values()] };
}

/** Rows in their order; equal orders (never written by the API) fall back to the row id, so a form's first row is stable. */
const byOrder = (a: Row, b: Row) => a.order - b.order || a.rowKey.localeCompare(b.rowKey);

export type Mode = "sqr" | "agent";

/** The questionnaire view of a case: sections, each question once per person, with the current answer, its checks,
 *  its confirmation and the form boxes it fills. A case asks only what someone on it needs (P-62): a fact that fills a
 *  box of a form that applies, or decides whether a form, document or question applies. Questions the release places in
 *  a selected section but nothing of this case reads are not asked (counted in the summary). SQR mode shows the
 *  client's fields only; agent mode shows every needed fact.
 *  `skipDocumentFacts` (Preview only for now, Lead Q2 29 Oct; the case default with M3's documents-first intake, C6.5):
 *  a fact a document on that person's checklist supplies is not asked (P-130); it names the document, or null to ask.
 *  What it skips is listed per person and document in `from_documents`. */
export function caseView(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], mode: Mode, today = new Date(), groupAnswers: GroupAnswer[] = [], opts: { skipDocumentFacts?: (subjectId: string, fact: string) => string | null } = {}): QuestionnaireView {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const caseSubject = people.find((p) => p.role === "case")!;
  const { known, confirm } = knownOf(s, people, answers, rows, today);
  const r = render(s, renderPeople, known, { today });
  const subjectOf = (about: string) => (about === "case" ? caseSubject.subjectId : about.split("/")[0]);
  const fills = new Map<string, Map<string, { form: string; person: string; subject: string; boxes: number }>>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about) {
    const k = `${b.about}|${b.fact}`, m = fills.get(k) ?? new Map(); const e = m.get(`${c.form}|${c.person}`) ?? { form: c.form, person: c.person_label, subject: c.person, boxes: 0 }; e.boxes++; m.set(`${c.form}|${c.person}`, e); fills.set(k, m);
    // QA-165: a "recorded" Yes/No box is written by its facts' own Yes/No question (a confirmed No writes "N"), so that
    // question fills the box too (P-62: every question asked fills a box or decides something).
    const d = recordedDerivation(b.transform);
    for (const g of new Set(d ? [b.fact, ...d.facts].map((f) => gateOf(s.placements as GatePlacement[], f)).filter((x): x is string => !!x && x !== b.fact) : [])) { // B52: a box asked as its own question counts once
      const gk = `${b.about}|${g}`, gm = fills.get(gk) ?? new Map(); const ge = gm.get(`${c.form}|${c.person}`) ?? { form: c.form, person: c.person_label, subject: c.person, boxes: 0 }; ge.boxes++; gm.set(`${c.form}|${c.person}`, ge); fills.set(gk, gm);
    }
  }
  // Within one section for one person, questions follow the release's placement order (purpose before its "other"
  // details, "from" before "to"); the common renderer lists them by label.
  const first = new Map<string, number>();
  r.questions.forEach((q, i) => { if (!first.has(`${q.section}|${q.about}`)) first.set(`${q.section}|${q.about}`, i); });
  const placed = (fact: string) => placementOf(s, fact)?.order ?? Number.MAX_SAFE_INTEGER;
  const countries = (s.canonical_fields as FieldDef[]).find((f) => f.answer_list?.key === "country")?.answer_list?.values.map((v) => v.label) ?? null;
  const derivedYes = hasChildrenOf(people);
  const needed = r.questions.filter((q) => !q.about.includes("/") && !(q.fact === HAS_CHILDREN && derivedYes.has(q.about)) && (fills.has(`${q.about}|${q.fact}`) || q.decides.length > 0))
    .sort((a, b) => first.get(`${a.section}|${a.about}`)! - first.get(`${b.section}|${b.about}`)! || placed(a.fact) - placed(b.fact));
  const notAsked = r.questions.filter((q) => !q.about.includes("/")).length - needed.length;
  const fromDocuments = new Map<string, { subjectId: string; document: string; facts: string[] }>();
  const skipped = (q: (typeof needed)[number]) => {
    const doc = opts.skipDocumentFacts?.(subjectOf(q.about), q.fact);
    if (!doc) return false;
    const k = `${subjectOf(q.about)}|${doc}`, e = fromDocuments.get(k) ?? { subjectId: subjectOf(q.about), document: doc, facts: [] };
    if (!e.facts.includes(q.label)) e.facts.push(q.label);
    fromDocuments.set(k, e);
    return true;
  };
  // C7.7: the representative's parts (from the firm record) are the firm's, never in the client's questionnaire.
  const questions = needed.filter((q) => (mode === "agent" || (isClientField(s, q.fact) && q.about !== "representative")) && !skipped(q)).map((q) => {
    const subjectId = subjectOf(q.about), p = placementOf(s, q.fact);
    let required = q.required, hidden = q.status === "hidden by a condition";
    if (p?.condition && p.condition_effect === "REQUIRE") { const c = evalCondition(s, known, p.condition, q.about === "case" ? "case" : subjectId); required = c.applies === true; }
    if (!p?.condition && p?.condition_effect === "OPTIONAL") required = false; // optional for everyone (no condition)
    const group = p?.repeats === "per_row" ? q.section : null;
    const current = answers.filter((a) => a.subjectId === subjectId && a.field === q.fact);
    const live = group ? rows.filter((x) => x.subjectId === subjectId && x.group === group).sort(byOrder) : [];
    const one = (a: Answer | undefined) => a ? { id: a.id, value: a.value, status: a.status, channel: a.channel, by: a.actor, at: a.at, answered: a.origin ? { channel: a.origin.channel, by: a.origin.actor, at: a.origin.at } : null, problems: checkValue(s, q.fact, a.value, today), ...confirm.get(a.id)! } : null;
    const options = optionsOf(s, q.fact);
    return {
      subjectId, about_label: q.about_label, fact: q.fact, label: q.label, meaning: q.meaning, value_type: q.value_type, shape: shapeOf(s, q.fact), section: q.section, section_title: q.section_title,
      collected_from: q.collected_from, required, hidden, why: q.why, group, capacity: q.rows.length || null,
      answer: group ? null : one(current.find((a) => !a.rowKey)),
      rows: group ? live.map((x, i) => ({ row: x.rowKey, index: i, fits: q.rows.length ? i < q.rows.length : true, answer: one(current.find((a) => a.rowKey === x.rowKey)) })) : [],
      options,
      note: !options && (q.value_type === "code" || q.value_type === "country" || q.value_type === "multi_choice") ? "No fixed list for this answer yet: check it before confirming the section." : null,
      fills: [...(fills.get(`${q.about}|${q.fact}`)?.values() ?? [])],
      // C3.16 BR-4: a household or employer fact asked once on the case says so, and names whom it is read for (each
      // member's part shows it read-only from these, challenge M6).
      ...scopeTagOf(q.about, p, fills.get(`${q.about}|${q.fact}`)),
      countries: !options && (q.value_type === "country" || q.value_type === "address") ? countries : null,
    };
  });
  // A repeating group's "none apply" (Lead, break M3): confirmed by the same rule as an answer to the group's facts
  // (P-72, P-78), read as an answer to its first client fact (else its first fact).
  const birthOf = (subjectId: string) => answers.find((a) => a.subjectId === subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value;
  const groupOf = (qs: typeof questions): ViewGroup | null => {
    const g = qs.find((q) => q.group); if (!g) return null;
    const inGroup = qs.filter((q) => q.group), clientFact = inGroup.find((q) => isClientField(s, q.fact))?.fact;
    const a = groupAnswers.find((x) => x.subjectId === g.subjectId && x.group === g.group);
    const none_apply = a ? (() => {
      const c = confirmation(s, { id: a.id, subjectId: a.subjectId, field: clientFact ?? inGroup[0].fact, rowKey: null, value: a.noneApply, status: a.status, channel: a.channel, actor: a.actor, at: a.at }, people.find((p) => p.subjectId === a.subjectId), birthOf(a.subjectId), today);
      return { id: a.id, value: a.noneApply, status: a.status, channel: a.channel, by: a.actor, at: a.at, answered: a.origin ? { channel: a.origin.channel, by: a.origin.actor, at: a.origin.at } : null, problems: [], ...c };
    })() : null;
    return { required: inGroup.some((q) => q.required && !q.hidden), client: !!clientFact, rows: Math.max(0, ...inGroup.map((q) => q.rows.length)), none_apply };
  };
  const sections = [...new Map(questions.map((q) => [`${q.subjectId}|${q.section}`, { subjectId: q.subjectId, about_label: q.about_label, section: q.section, title: q.section_title }])).values()].map((sec) => {
    const qs = questions.filter((q) => q.subjectId === sec.subjectId && q.section === sec.section);
    const answered = qs.flatMap((q) => (q.group ? q.rows.map((x) => x.answer) : [q.answer])).filter((a): a is NonNullable<typeof a> => !!a);
    // A repeating group may have no rows (no previous country, no job); a started row needs all its required answers.
    const missing = qs.filter((q) => q.required && !q.hidden && (q.group ? q.rows.some((x) => !x.answer) : !q.answer)).map((q) => q.label);
    // A required group with no entries is answered by "none apply" (Lead, break M3): until then the part is not done
    // (review r1d-none-apply M1); "none apply" counts as an answer of the part.
    const group = groupOf(qs), na = group && group.rows === 0 ? group.none_apply : null;
    if (group?.required && group.rows === 0 && !na?.value) missing.push(groupLabel(sec.title));
    const all = na ? [...answered, na] : answered;
    return { ...sec, questions: qs, answered: all.length, confirmed: all.filter((a) => a.confirmed).length, invalid: answered.filter((a) => a.problems.length).length, missing, group };
  });
  // Checks the answers trigger, on the question they concern; in the client's view only those on the client's parts.
  const shown = new Set(sections.map((x) => `${x.subjectId}|${x.section}`));
  const checks: ViewCheck[] = (r.checks as { id: string; severity: string; group: string; message: string; person: string; person_label: string; applies_to: string | null; illustrative: boolean }[]).map((c) => {
    const subjectId = c.person === "case" ? caseSubject.subjectId : c.person, fact = c.applies_to && placementOf(s, c.applies_to) ? c.applies_to : null;
    return { id: c.id, severity: c.severity, group: c.group, message: c.message, subjectId, about_label: c.person === "case" ? caseSubject.label : c.person_label, fact, section: fact ? placementOf(s, fact)!.section_id : null, illustrative: c.illustrative };
  }).filter((c) => mode === "agent" || (c.section !== null && shown.has(`${c.subjectId}|${c.section}`)));
  // D4 (P-229 (3), #357 m3): a worked-out Yes on "has any children" that overrides the client's own No is never silent:
  // the officer sees it as a check on that person (the question itself is not asked then). Staff view only.
  if (mode === "agent") for (const [subjectId] of hasChildrenOf(people)) {
    const said = answers.find((a) => a.subjectId === subjectId && a.field === HAS_CHILDREN && !a.rowKey);
    if (said?.value !== false) continue;
    const who = people.find((p) => p.subjectId === subjectId)!;
    // Review minors on 0d5589a4: the form's own words for the question; "warn" as every other check; and the note says
    // what the officer can do, and that it stays as a record while the child is on the case (the question is not asked).
    // The library's meaning, without its note on how the value is worked out (that is internal).
    // Devin on #501: the answer may be the client's or entered by staff, so the words never say who gave it.
    const asked = (fieldOf(s, HAS_CHILDREN)?.meaning ?? "Whether the person has any children").replace(/,\s*derived from .*$/i, "");
    checks.push({ id: `derived.${HAS_CHILDREN}.overrides_no`, severity: "warn", group: "derived", message: `${who.label}'s answer to "${asked}" is No, but a child is on this case, so the forms say Yes. Check with the client before filing. This note stays while the child is on the case: the forms take the Yes from the case, so there is no answer to change (a step-child counts as a child of the family: Unconfirmed, waiting for the immigration expert).`, subjectId, about_label: who.label, fact: HAS_CHILDREN, section: null, illustrative: false });
  }
  // P-47 tier 2 (C4.4 part 2): each section's error summary, GOV.UK pattern: every answer that fails its checks and every
  // section check that fired on the section, each naming the field (and row) it links to, in the order of the questions.
  const withProblems = sections.map((sec) => {
    const order = new Map(sec.questions.map((q, i) => [q.fact, i]));
    const fieldProblems: SectionProblem[] = sec.questions.flatMap((q) => (q.group ? q.rows.map((x) => ({ a: x.answer, row: x.row as string | null })) : [{ a: q.answer, row: null }])
      .flatMap(({ a, row }) => (a?.problems ?? []).map((message) => ({ kind: "field" as const, field: q.fact, subjectId: sec.subjectId, row, label: q.label, message }))));
    const checkProblems: SectionProblem[] = checks.filter((c) => c.subjectId === sec.subjectId && c.section === sec.section && c.fact)
      .map((c) => ({ kind: "check" as const, field: c.fact!, subjectId: sec.subjectId, row: null, label: sec.questions.find((q) => q.fact === c.fact)?.label ?? c.fact!, message: c.message, check: c.id }));
    const problems = [...fieldProblems, ...checkProblems].sort((a, b) => (order.get(a.field) ?? 1e9) - (order.get(b.field) ?? 1e9));
    return { ...sec, problems };
  });
  return { mode, sections: withProblems, checks, forms: r.forms.map((f) => ({ form: f.form, person: f.person_label, applies: f.applies })), ...(opts.skipDocumentFacts ? { from_documents: [...fromDocuments.values()] } : {}), summary: { not_asked: notAsked, questions: questions.length, answered: sections.reduce((n, x) => n + x.answered, 0), confirmed: sections.reduce((n, x) => n + x.confirmed, 0), missing: sections.reduce((n, x) => n + x.missing.length, 0) } };
}
export type CaseView = ReturnType<typeof caseView>;

/** P-47 mode 1, PQR (C4.4 part 2): only the questions the release flags pre-qualification (W1-15's tick, per person role
 *  and fact: snapshot.fact_sources), in the agent view's order, and one plain result line. The result is never a verdict
 *  on eligibility: it says what is left to answer, or that a check fired, or that the answers raise nothing so far. */
export function pqrView(s: Snapshot, people: Participant[], view: CaseView) {
  const ticked = new Set((s.fact_sources ?? []).filter((x) => x.prequalification).map((x) => `${x.role}|${x.fact}`));
  const roleOf = (subjectId: string) => people.find((p) => p.subjectId === subjectId)?.role ?? "";
  const questions = view.sections.flatMap((sec) => sec.questions).filter((q) => ticked.has(`${roleOf(q.subjectId)}|${q.fact}`) && !q.hidden)
    .map((q) => ({ ...q, pre_qualification: true as const }));
  const open = questions.filter((q) => (q.group ? !q.rows.length || q.rows.some((x) => !x.answer) : !q.answer)).length;
  const fixes = questions.filter((q) => (q.group ? q.rows.some((x) => x.answer?.problems.length) : q.answer?.problems.length)).length;
  const fired = view.checks.filter((c) => c.fact && questions.some((q) => q.fact === c.fact && q.subjectId === c.subjectId));
  const result = !questions.length ? "No Prospect questionnaire (PQR) questions in this release yet: tick them on the combination's Smart questionnaire (SQR) tab."
    : open ? `${open} of ${questions.length} Prospect questionnaire (PQR) question${questions.length === 1 ? "" : "s"} still to answer before a result.`
    : fixes ? `${fixes} answer${fixes === 1 ? " needs" : "s need"} a fix before a result.`
    : fired.length ? `Needs a closer look: ${fired.map((c) => c.message).join(" ")} Next: talk it through with the representative.`
    : "Looks eligible so far · next: book a consultation. This is not a decision on the application.";
  return { mode: "pqr" as const, questions, result, checks: fired };
}
