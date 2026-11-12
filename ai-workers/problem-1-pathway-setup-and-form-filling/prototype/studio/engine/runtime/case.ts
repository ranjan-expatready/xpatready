// The case engine (runtime lane, R1): pure functions from a pinned release snapshot, the people on a case and their
// current answers, to what each person is asked, how each answer checks, whether it is confirmed (P-72) and which form
// boxes it fills (every current answer, marked by who gave it: P-242, P-411). The questionnaire itself comes from the common renderer (engine/render.ts), so a case asks exactly
// what the release preview shows. No I/O; every output says why.
import { evalCondition, kkey, render, type Known, type Person, type Role } from "../render.ts";
import { subjectKindOf, type Snapshot } from "../snapshot.ts";
import { isFilingFact } from "../resolver.ts";
import { checkFormat, snapshotFieldFormat, writesParts } from "../field-format.ts";
import { namesNoValues } from "../options.ts";
import { z } from "zod";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { gateOf, type GatePlacement } from "./gates.ts";
import { gatesInForce } from "../form-field-condition.ts";
import { SCOPE_TAG } from "../field-scope.ts";
import { firmRecordFact, formsNamingRepresentative } from "./team.ts";
import { CLIENT_RECONFIRM } from "./background.ts";
import { APPLICATION_TYPE, APPLICATION_TYPE_SOURCE, applicationKindsOf, NotWorkedOut } from "./application-kind.ts";
import { cellAsked, isAskedRelative, isListRelative, listWords, relativeLabel, relativeOf } from "./relatives.ts";
import type { Period } from "../../../contracts/history.ts";
import { Address, byClientFor, byPrincipalFor, CONFIRM_WORDS, groupLabel, type AnswerMark, MINOR, Phone, type QuestionnaireView, type SectionProblem, type ViewCheck, type ViewGroup } from "../../contracts/runtime.ts";

export type Participant = { subjectId: string; role: Role | "case"; label: string; applies: boolean;
  /** C6.13 BR-3b: whether this person is the client who answers the questionnaire (set by the runtime; absent in pure
   *  checks, where the principal is the client). After Make principal the client stays the same person. */
  client?: boolean };
export type Answer = { id: string; subjectId: string; field: string; rowKey: string | null; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string; origin?: { channel: string; actor: string; at: string } | null /** C6.18 (P-244): a background answer (engine/runtime/background.ts), and one an officer recorded that the client has
 *  not re-confirmed yet; set by the case's reader (api/src/runtime.ts state). */
  background?: boolean; awaitsClient?: boolean;
  /** C6.18: the staff member who recorded this background answer and when ("Officer"), through any later re-confirmation
   *  or confirmation of it; absent when the client gave it. */
  officerRecorded?: { by: string; at: string } | null;
  /** C6.19: a copy from an earlier case of the same client: that case's reference, who re-confirmed it here and when. */
  copiedFrom?: { reference: string; by: string; at: string } | null };
export type Row = { rowKey: string; subjectId: string; group: string; order: number };
/** A repeating group's own answer (client_group_answer): none apply (true) or entries apply (false). */
export type GroupAnswer = { id: string; subjectId: string; group: string; noneApply: boolean; status: "DECLARED" | "VERIFIED"; channel: string; actor: string; at: string; origin?: { channel: string; actor: string; at: string } | null };
/** `confirmed`: off the officer's Confirm list (P-72, P-78). `fills`: written to the forms now (P-242, P-411: every
 *  declared answer fills at once, whoever typed it; a document's read value is a proposal, never an answer, until
 *  "Confirm & use"). `mark`: who gave it, shown beside it. */
export type Confirmation = { confirmed: boolean; why: string; fills: boolean; mark: AnswerMark };
/** C6.16: the channel of an answer a person saves on their own link (source actor "person:<subject id>"). */
export const OWN_LINK = "own_link";

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

/** P-72 and P-78 as P-242 and P-411 amend them. Every current answer fills the forms at once (`fills`), marked by who
 *  gave it; `confirmed` says whether it is off the officer's Confirm list. VERIFIED is confirmed. The client's
 *  (principal's) own typed answer on a client field is Declared and needs no officer confirmation for the principal, the
 *  application and a minor child; for an adult it is "answered by the principal for <name>" until that adult or the
 *  officer confirms (P-411 (1)); an answer staff typed or corrected is "entered by staff" and stays on the Confirm list
 *  (P-411 (2)), so a correction never empties a filled form field. */
export function confirmation(s: Snapshot, a: Answer, who: Participant | undefined, birthDate: unknown, today: Date): Confirmation {
  const fills = true;
  // C6.18 (P-244) with P-411 (Lead 31, 16:18 IST on #1246): a background answer the officer recorded fills the forms at
  // once, marked as staff's, but never counts as confirmed until the client re-confirms it, even after the officer's
  // "Confirm section": readiness, Ready to file and signing wait for the client.
  if (a.awaitsClient) return { confirmed: false, why: CONFIRM_WORDS.awaits_client, fills, mark: "by_staff" };
  if (a.status === "VERIFIED") return { confirmed: true, why: CONFIRM_WORDS.officer, fills, mark: "confirmed" };
  // C6.16 (P-78, challenge M2): saved by the person on their own link: their own answer (client fields only reach it).
  if (a.channel === OWN_LINK) return isClientField(s, a.field) ? { confirmed: true, why: CONFIRM_WORDS.person_own, fills, mark: "declared" } : { confirmed: false, why: CONFIRM_WORDS.staff, fills, mark: "by_staff" };
  // The client's re-confirmation of an officer's answer counts as the client's own answer (C6.18).
  if (a.channel !== "questionnaire" && a.channel !== CLIENT_RECONFIRM) return { confirmed: false, why: CONFIRM_WORDS.staff, fills, mark: "by_staff" };
  if (!isClientField(s, a.field)) return { confirmed: false, why: `Declared: it fills the forms now and waits for the officer's "Confirm section" (a fact the officer confirms from a document or record)`, fills, mark: "declared" };
  // C6.13 BR-3b: the client's own answers, whatever role the client has now (the principal unless roles were swapped).
  const own = who?.client ?? who?.role === "principal";
  if (own || who?.role === "case") return { confirmed: true, why: CONFIRM_WORDS.client_own, fills, mark: "declared" };
  // C6.13 (review, break M1): after a swap (`client` is set) the client answered for this adult, whoever the principal
  // is; the mark stays "by_principal" (answered for the adult by the person who fills the questionnaire), the words say who.
  const byClient = who?.client === false;
  const forAdult = (note?: string): Confirmation => ({ confirmed: false, why: `${who?.label ? (byClient ? byClientFor : byPrincipalFor)(who.label) : byClient ? CONFIRM_WORDS.by_client : CONFIRM_WORDS.by_principal}${note ? ` (${note})` : ""}`, fills, mark: "by_principal" });
  if (who?.role === "child") {
    const age = ageOn(birthDate, today);
    if (age !== null && age < MINOR.underAge) return { confirmed: true, why: `${CONFIRM_WORDS.client_own} (for a child under ${MINOR.underAge})`, fills, mark: "declared" };
    return forAdult(age === null ? "the child's date of birth is not answered yet, or is not a real past date" : `the child is ${age}`);
  }
  return forAdult();
}

/** C6.18 (P-244): on a background answer, who on the staff recorded it and when ("Officer"), whether they recorded this
 *  version or the one the client re-confirmed or the officer confirmed, and whether it still waits for the client. */
function officerMark(a: Answer): { officer?: { by: string; at: string } | null; awaits_client?: boolean } {
  if (!a.background) return {};
  return { officer: a.officerRecorded ?? null, awaits_client: !!a.awaitsClient };
}

const judging = new WeakMap<object, Map<string, unknown>>();
/** QA-355 (a), the guard (tech lead's ruling on #1446): the field maps that judge an answer. A form added to one filing
 *  (a map marked `added`, engine/runtime/added-forms.ts withAdditions) judges only its own copy: `form` names the copy
 *  being judged; without it (the question, the case's own checks) only the release's maps judge. So adding a form never
 *  changes another form's lines: its lists, limits and box formats apply to its copy alone. The same object per snapshot
 *  and added form (one for everything else), so snapshotFieldFormat's cache still holds; with no added form, the
 *  snapshot itself. */
export function judgingMaps<S extends { field_maps: unknown[] }>(s: S, form?: string | null): S {
  const maps = s.field_maps as { form_number?: string; added?: boolean }[];
  if (!maps.some((m) => m.added)) return s;
  let per = judging.get(s);
  if (!per) { per = new Map(); judging.set(s, per); }
  // Review m4: a release form's copy is judged as the case is (one shared key); only an added form gets its own view.
  const key = form && maps.some((m) => m.added && m.form_number === form) ? form : "";
  if (!per.has(key)) per.set(key, { ...s, field_maps: maps.filter((m) => !m.added || (!!form && m.form_number === form)) });
  return per.get(key) as S;
}

/** How the forms that read a field write it (from the release's field maps; `form`: also that added form's own, for its
 *  copy, QA-355): the precision and limits a value needs. */
export const shapeOf = (s: Snapshot, field: string, form?: string | null) => shapeIn(judgingMaps(s, form), field);
function shapeIn(s: Snapshot, field: string) {
  const ts = (s.field_maps as { entries: { fact?: string | null; transform?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field).map((e) => e.transform ?? ""));
  const maxes = ts.map((t) => /max (\d+) char/.exec(t)?.[1]).filter(Boolean).map(Number);
  const dayNeeded = ts.some((t) => /date(_part)?:DD|date:YYYY-MM-DD|^date$|date:DD/.test(t)) || !ts.some((t) => /date(_part)?:MM/.test(t));
  // A short code list written in the map itself, "code_list:imm5257.visa_type (VisitorVisa, Transit)": the values a
  // choice field without an answer list may take (labels before any "=code").
  // QA-272: "(01..09)" names no values: on a release that kept it the answer stays open, never one choice called "01..09".
  // QA-355: nor does "(codes as listed in the inventory)" (namesNoValues): an added form's note never closes a shared fact.
  const listed = ts.map((t) => /^code_list:\S+ \(([^)]*)\)/.exec(t)?.[1]).find((x) => x && !namesNoValues(x));
  const choices = listed ? listed.split(",").map((x) => x.split("=")[0].trim()).filter(Boolean) : null;
  // C3.1 AT-10 (IRCC-F07, P-162): the form's own box limit for the whole answer (read from the PDF) counts too.
  const boxMax = snapshotFieldFormat(s as never, field).rules.filter((r) => r.check === "max_length" && !r.part).map((r) => Number(r.params.n)).filter((n) => n > 0);
  maxes.push(...boxMax);
  // QA-289: a field is a phone where any form's map says "phone_part" (as before), and also where the fill writes it part by
  // part with "phone:" steps (field-format.ts writesParts), so the question, its answer and the form's boxes agree (IMM 5476's
  // "phone:" boxes wrote nothing from text). Only ever adds the phone kind: no question that had it loses it (pre-flight, C4.4).
  return { maxLength: maxes.length ? Math.min(...maxes) : fieldOf(s, field)?.value_type === "long_text" ? LONG_TEXT_MAX : 500, datePrecision: dayNeeded ? "day" as const : "month" as const, phone: ts.some((t) => /phone_part/.test(t) || (writesParts(t) && /\bphone:/.test(t))), money: ts.some((t) => /CAD/.test(t)), choices };
}


/** "VisitorVisa" → "Visitor visa": a PDF export value written as joined words, read as a person writes it. */
const words = (x: string) => /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(x) ? x.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ ([A-Z])/g, (_, c: string) => ` ${c.toLowerCase()}`) : x;

/** The labels a field's answers carry on its forms (the first form that labels them): from a field map's
 *  "code_list:… (Label=code, …)" through its option map (answer key → code). A list without "=code" names its codes
 *  by their labels ("Female", "VisitorVisa"). Where no map labels an answer, the answer list's own label stays. */
export function optionsOf(s: Snapshot, field: string): { key: string; label: string }[] | null {
  const entries = (judgingMaps(s).field_maps as { entries: { fact?: string | null; transform?: string | null; option_map?: { map?: Record<string, string> } | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.fact === field));
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
export function checkValue(sIn: Snapshot, field: string, value: unknown, today = new Date(), form?: string | null): string[] {
  const s = judgingMaps(sIn, form); // QA-355 (a): `form` is the copy being judged; without it, the release's maps only
  const typed = checkType(s, field, value, today);
  return typed.length ? typed : checkFormat(snapshotFieldFormat(s as never, field), value, { today });
}

function checkType(s: Snapshot, field: string, value: unknown, today: Date): string[] {
  const f = fieldOf(s, field);
  if (!f) return ["This question is not in the release the case works from."];
  const shape = shapeIn(s, field), type = String(f.value_type ?? "text");
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
 *  take the row's place among the subject's live rows of that group; a box with no row reads the first row.
 *  `forForms` (P-242, P-411): what a form writes, so every answer that fills (every declared answer, whoever typed it)
 *  is "confirmed" to the renderer, whose "confirmed fact" is the form field it writes. Without it (the case check C6.9,
 *  the checklist, the questionnaire's counts) "confirmed" stays the officer's Confirm list (P-72, P-78). */
export function knownOf(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], today: Date, opts: { forForms?: boolean } = {}): { known: Known; confirm: Map<string, Confirmation> } {
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
    const v = { value, status: (opts.forForms ? c.fills : c.confirmed) ? "confirmed" as const : "answered" as const, source: `${a.channel} by ${a.actor}` };
    const row = a.rowKey ? index.get(a.rowKey)! : undefined;
    known.set(kkey(about(a.subjectId), a.field, row), v);
    if (row === 0 && !known.has(kkey(about(a.subjectId), a.field))) known.set(kkey(about(a.subjectId), a.field), v);
  }
  // C7.7 (G25): "has any children" is worked out from the people on the case, never left by hand when the case holds them.
  for (const [subjectId, value] of hasChildrenOf(people)) known.set(kkey(subjectId, HAS_CHILDREN), { value, status: "confirmed", source: HAS_CHILDREN_SOURCE });
  // QA-400 (P-485): whether each person is the principal applicant is worked out from their role on the case, never asked.
  for (const [subjectId, value] of principalOf(people)) known.set(kkey(subjectId, IS_PRINCIPAL), { value, status: "confirmed", source: IS_PRINCIPAL_SOURCE });
  // QA-415 (P-486): each person's kind of application is worked out from their own filing (application-kind.ts), never
  // asked; read after the answers, since a filing a person's line adds follows their own answers.
  // One it cannot work out yet (NotWorkedOut) is no answer: its form fields go by hand with the reason (form-values.ts).
  for (const [subjectId, value] of applicationKindsOf(s, known, people)) known.set(kkey(subjectId, APPLICATION_TYPE), { value, status: "confirmed", source: value instanceof NotWorkedOut ? `not worked out yet: ${value.why}` : APPLICATION_TYPE_SOURCE });
  return { known, confirm };
}

/** QA-400 (P-485, the C7.7 pattern): `person.is_principal_applicant` is worked out for every person on the case from
 *  their role: Yes for the principal applicant, No for everyone else (a spouse or partner, a child, any other applicant).
 *  It is never asked (each fact asked once: the role is already on the case), and it names no form or program: any
 *  form's box that says whether its person is the principal applicant reads it per person. */
export const IS_PRINCIPAL = "person.is_principal_applicant", IS_PRINCIPAL_SOURCE = "worked out: the person's role on the case";
export function principalOf(people: Participant[]): Map<string, boolean> {
  return new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, p.role === "principal"]));
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
export function caseView(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], mode: Mode, today = new Date(), groupAnswers: GroupAnswer[] = [], opts: { skipDocumentFacts?: (subjectId: string, fact: string) => string | null; background?: ReadonlySet<string>; partOrder?: false; decides?: Decides } = {}): QuestionnaireView {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const caseSubject = people.find((p) => p.role === "case")!;
  const { known, confirm } = knownOf(s, people, answers, rows, today);
  const r = render(s, renderPeople, known, { today });
  // B128 (QA-153): a parent a form describes is asked on their own key (`<person>/parent_1`), so their answers never land
  // on the person whose parent they are, and only for a form that applies to that person (not while it may be needed:
  // a child's form waiting for a date of birth asks no parents). B155: a list relative (`<person>/sibling`) the same way,
  // as one repeating group with a row per brother or sister (engine/runtime/relatives.ts).
  const subjectOf = (about: string) => (about === "case" ? caseSubject.subjectId : isAskedRelative(about) ? about : about.split("/")[0]);
  const applies = new Set<string>(), boxesOf = new Map<string, string[]>();
  // B155: a list relative's questions follow its boxes in the form's order (name, then status, …), and its group holds as
  // many rows as the form's boxes do (row n of the map is entry n + 1).
  const boxAt = new Map<string, number>(), listRows = new Map<string, number>();
  const asked = (q: { about: string; fact: string }) => !q.about.includes("/") || (isAskedRelative(q.about) && applies.has(`${q.about}|${q.fact}`));
  const fills = new Map<string, Map<string, { form: string; person: string; subject: string; boxes: number }>>();
  // QA-296: a form that does not name the representative of record is never said to be filled by the firm record's facts.
  const namingRep = formsNamingRepresentative(s.field_maps);
  // B107 (QA-299, QA-300): a form field whose gate does not hold writes nothing (engine/runtime/forms.ts formCoverage), so
  // its question is not asked for that form either: IMM 5476's membership boxes of the other bodies, its uncompensated part
  // for a compensated representative, its student-at-law and fax boxes. A gate that cannot tell yet keeps it asked.
  const gates = new Map<string, Map<string, unknown>>();
  const gatedOff = (c: { form: string; edition: string | null }, b: { box: string; about: string | null }) => {
    const k = `${c.form}|${c.edition}`, g = (gates.get(k) ?? gates.set(k, gatesInForce(s, c.form, c.edition)).get(k)!).get(b.box);
    return !!g && evalCondition(s, known, g, b.about === "case" ? "case" : b.about!.split("/")[0]).applies === false;
  };
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about && !gatedOff(c, b) && (namingRep.has(c.form) || !firmRecordFact(kkey(b.about, b.fact), known.get(kkey(b.about, b.fact))?.source))) {
    const k = `${b.about}|${b.fact}`, m = fills.get(k) ?? new Map(); if (c.applies === true) { applies.add(k); if (isAskedRelative(b.about)) boxesOf.set(b.about, [...(boxesOf.get(b.about) ?? []), b.box]); }
    if (isListRelative(b.about)) { if (!boxAt.has(k)) boxAt.set(k, boxAt.size); if (typeof b.row === "number") listRows.set(b.about, Math.max(listRows.get(b.about) ?? 0, b.row + 1)); } const e = m.get(`${c.form}|${c.person}`) ?? { form: c.form, person: c.person_label, subject: c.person, boxes: 0 }; e.boxes++; m.set(`${c.form}|${c.person}`, e); fills.set(k, m);
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
  // B155: a list relative is one section, placed where its first question would be, its questions in the form's order.
  const firstList = new Map<string, number>();
  r.questions.forEach((q, i) => { if (isListRelative(q.about) && !firstList.has(q.about)) firstList.set(q.about, i); });
  const firstOf = (q: { about: string; section: string }) => (isListRelative(q.about) ? firstList.get(q.about)! : first.get(`${q.section}|${q.about}`)!);
  const orderIn = (q: { about: string; fact: string }) => (isListRelative(q.about) ? boxAt.get(`${q.about}|${q.fact}`) ?? Number.MAX_SAFE_INTEGER : placed(q.fact));
  const countries = (s.canonical_fields as FieldDef[]).find((f) => f.answer_list?.key === "country")?.answer_list?.values.map((v) => v.label) ?? null;
  const derivedYes = hasChildrenOf(people), derivedPrincipal = principalOf(people);
  const needed = r.questions.filter((q) => asked(q) && !(q.fact === HAS_CHILDREN && derivedYes.has(q.about)) && !(q.fact === IS_PRINCIPAL && derivedPrincipal.has(q.about)) && q.fact !== APPLICATION_TYPE /* QA-415: never asked */ && (fills.has(`${q.about}|${q.fact}`) || q.decides.length > 0))
    .sort((a, b) => firstOf(a) - firstOf(b) || orderIn(a) - orderIn(b));
  const notAsked = r.questions.filter((q) => asked(q)).length - needed.length;
  // Review Major 1 (#1256): a parent is named by the boxes the person's forms write them into ("Sample Client W's
  // mother"), so nobody types the father where the form wants the mother; "first parent" when the boxes do not say.
  const labelOf = (q: { about: string; about_label: string }) => { const rel = relativeOf(q.about); return rel ? relativeLabel(people.find((p) => p.subjectId === rel.owner)?.label ?? rel.owner, rel.relation, boxesOf.get(q.about) ?? []) : q.about_label; };
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
  const inForms = needed.filter((q) => (mode === "agent" || (isClientField(s, q.fact) && q.about !== "representative")) && !skipped(q)).map((q) => {
    const subjectId = subjectOf(q.about), p = placementOf(s, q.fact);
    let required = q.required, hidden = q.status === "hidden by a condition";
    if (p?.condition && p.condition_effect === "REQUIRE") { const c = evalCondition(s, known, p.condition, q.about === "case" ? "case" : subjectId.split("/")[0]); required = c.applies === true; }
    if (!p?.condition && p?.condition_effect === "OPTIONAL") required = false; // optional for everyone (no condition)
    // B155: a list relative's facts are one repeating group on its key, named by the relation (its section too), whatever
    // section each fact's placement sits in for a person; each question's own rows are the rows the form has boxes for.
    const list = isListRelative(q.about) ? relativeOf(q.about)!.relation : null;
    const group = list ?? (p?.repeats === "per_row" ? q.section : null);
    const fitsRow = (i: number) => (list ? q.rows.includes(i) : q.rows.length ? i < q.rows.length : true);
    const current = answers.filter((a) => a.subjectId === subjectId && a.field === q.fact);
    const live = group ? rows.filter((x) => x.subjectId === subjectId && x.group === group).sort(byOrder) : [];
    const one = (a: Answer | undefined) => a ? { id: a.id, value: a.value, status: a.status, channel: a.channel, by: a.actor, at: a.at, answered: a.origin ? { channel: a.origin.channel, by: a.origin.actor, at: a.origin.at } : null, ...(a.copiedFrom ? { copied_from: a.copiedFrom } : {}), problems: checkValue(s, q.fact, a.value, today), ...confirm.get(a.id)!, ...officerMark(a),
      // Review m6 (#1256): a parent has no link of their own, so their answer waits for the officer, in those words.
      // B150 (P-411): it is on the forms at once, so the words say so; an answer waiting for the client keeps its own words.
      ...(isAskedRelative(q.about) && !confirm.get(a.id)!.confirmed && !a.awaitsClient ? { why: `Declared: it fills the forms now and waits for the officer's "Confirm section" (${list ? `${listWords(list).one} has` : "a parent has"} no link of their own)` } : {}) } : null;
    const options = optionsOf(s, q.fact);
    return {
      subjectId, about_label: labelOf(q), fact: q.fact, label: q.label, meaning: q.meaning, value_type: q.value_type, shape: shapeOf(s, q.fact), section: list ?? q.section, section_title: list ? listWords(list).title : q.section_title,
      collected_from: q.collected_from, required, hidden, why: q.why, group, capacity: (list ? listRows.get(q.about) : q.rows.length) || null,
      answer: group ? null : one(current.find((a) => !a.rowKey)),
      rows: group ? live.map((x, i) => ({ row: x.rowKey, index: i, fits: fitsRow(i), answer: one(current.find((a) => a.rowKey === x.rowKey)) })) : [],
      options,
      note: !options && (q.value_type === "code" || q.value_type === "country" || q.value_type === "multi_choice") ? "No fixed list for this answer yet: check it before confirming the section." : null,
      fills: [...(fills.get(`${q.about}|${q.fact}`)?.values() ?? [])],
      // C6.18 (P-244): a background question (the client's; staff may record it, marked Officer, the client re-confirms).
      ...(opts.background?.has(q.fact) ? { background: true } : {}),
      // C3.16 BR-4: a household or employer fact asked once on the case says so, and names whom it is read for (each
      // member's part shows it read-only from these, challenge M6).
      ...scopeTagOf(q.about, p, fills.get(`${q.about}|${q.fact}`)),
      countries: !options && (q.value_type === "country" || q.value_type === "address") ? countries : null,
    };
  });
  // QA-439 (P-498, A25 sweep): a question that decides whether others are asked comes before them, so a person's date of
  // birth and marital status come before the parts a form's age limit or condition drops (a 0-4 child never meets
  // Military service first). What decides what is read from the release with no answers given, so the order never moves
  // while the client answers.
  // People come in the case's order (the principal first, then the spouse, children; a relative after the person they
  // belong to), never by their id. The application's own parts (the visit, its contact) come right after the principal's
  // own (Lead 26's done-when 3, "main applicant first"; Lead 27, #1643: the forms' readiness reasons, read in this order,
  // keep naming the person's facts first), unless one of them decides a question asked earlier.
  const principalAt = people.findIndex((p) => p.role === "principal");
  const rankOf = new Map(people.map((p, i) => [p.subjectId, p.role === "case" ? (principalAt < 0 ? -1 : principalAt + 0.25) : i]));
  const rank = (id: string) => { const [owner, rel] = id.split("/"); return (rankOf.get(owner) ?? people.length) + (rel ? 0.5 : 0); };
  // The sections the combination's author chose and ordered (C4.1, P-216) keep that order.
  const authored = new Set((s.sections as { id: string }[]).map((x) => x.id));
  // Review M2 (#1643): a question every form field of which is written only while a condition holds (B107's form-field
  // gates, e.g. a form's "other" box written only when the purpose is "Other") is decided by that condition's facts.
  const boxGates = new Map<string, { all: boolean; keys: Set<string> }>();
  for (const c of r.coverage) for (const b of c.boxes) if (b.fact && b.about) {
    const k = `${subjectOf(b.about)}|${b.fact}`, e = boxGates.get(k) ?? boxGates.set(k, { all: true, keys: new Set() }).get(k)!;
    const fk = `${c.form}|${c.edition}`, g = (gates.get(fk) ?? gates.set(fk, gatesInForce(s, c.form, c.edition)).get(fk)!).get(b.box);
    if (!g) { e.all = false; continue; }
    const owner = b.about === "case" ? caseSubject.subjectId : b.about.split("/")[0];
    for (const f of readsOf(s, g)) e.keys.add(`${isFilingFact(f, placementOf(s, f)) ? caseSubject.subjectId : owner}|${f}`);
  }
  // Worked out once per view (review m2): the order with no answers given reuses it.
  const decides = opts.decides ?? whatDecides(s, people, renderPeople, caseSubject.subjectId, today, (k) => { const e = boxGates.get(k); return e?.all ? [...e.keys] : []; });
  const ordered = decidersFirst(inForms, decides, rank, (section) => authored.has(section));
  // The parts keep one order while the client answers (an answer never sends a part behind the one the client is on, where
  // "Save and continue" would pass it): the order of this questionnaire with no answers given; a part only an answer adds
  // keeps its place after the part before it.
  const questions = opts.partOrder === false ? ordered : inPartOrder(ordered, noAnswerOrder(s, people, mode, today, () => caseView(s, people, [], [], mode, today, [], { partOrder: false, decides }).sections.map((x) => `${x.subjectId}|${x.section}`)));
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
    // B155: an entry of a list relative asks only what the form has a box for in its row; an entry with no row on the form
    // asks everything (it goes on an extra sheet; break M1 on #1367).
    const listed = isListRelative(sec.subjectId), grouped = qs.filter((q) => q.group);
    const missing = qs.filter((q) => q.required && !q.hidden && (q.group ? q.rows.some((x, i) => (!listed || cellAsked(grouped, q, i)) && !x.answer) : !q.answer)).map((q) => q.label);
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

/** QA-439 (P-498): for each question (`<subject>|<fact>`), the questions whose answers decide whether it is asked, read
 *  from the release with no answers given (so the result never changes while the client answers): a question is decided
 *  by its own condition's facts (same subject), and, when every form that needs it waits for an answer before it applies
 *  (a form's condition, a form's age limit), by the facts those forms wait for. A question also read by a form that
 *  always applies is never decided by a form. Generic: no form, section, combination or fact named here. */
type Decides = (q: { subjectId: string; fact: string; fills: { form: string; subject: string }[] }) => Set<string>;
/** The facts a condition reads; a calculated field counts as the answers it is worked out from. */
function readsOf(s: Snapshot, tree: unknown): string[] {
  const derived = new Map(((s.derived_fields ?? []) as { id: string; inputs?: string[]; reference?: string }[]).map((d) => [d.id, [...(d.inputs ?? []), ...(d.reference ? [d.reference] : [])]]));
  const out = new Set<string>(), walk = (f: string) => { if (out.has(f)) return; out.add(f); for (const x of derived.get(f) ?? []) walk(x); };
  for (const m of JSON.stringify(tree ?? null).matchAll(/"field":"([^"]+)"/g)) walk(m[1]);
  return [...out].filter((f) => !derived.has(f));
}
function whatDecides(s: Snapshot, people: Participant[], renderPeople: Person[], caseSubjectId: string, today: Date, boxGated: (key: string) => string[]): Decides {
  const r = render(s, renderPeople, knownOf(s, people, [], [], today).known, { today });
  const subjectOf = (about: string) => (about === "case" ? caseSubjectId : about);
  const waits = new Map(r.forms.map((f) => [`${f.form}|${f.person}`, f.applies === true ? [] : f.missing.filter((m) => !m.startsWith("(")).map((m) => `${isFilingFact(m, placementOf(s, m)) ? caseSubjectId : subjectOf(f.person)}|${m}`)]));
  return (q: { subjectId: string; fact: string; fills: { form: string; subject: string }[] }) => {
    const owner = q.subjectId.split("/")[0], out = new Set<string>();
    const p = placementOf(s, q.fact);
    if (p?.condition) for (const f of readsOf(s, p.condition)) out.add(`${isFilingFact(f, placementOf(s, f)) ? caseSubjectId : owner}|${f}`);
    const forms = q.fills.map((f) => waits.get(`${f.form}|${f.subject}`));
    if (forms.length && forms.every((w) => w?.length)) for (const w of forms) for (const k of w!) out.add(k);
    for (const k of boxGated(`${q.subjectId}|${q.fact}`)) out.add(k);
    out.delete(`${q.subjectId}|${q.fact}`);
    return out;
  };
}

/** QA-439 (r1c's 1 s budget for the case page): the order with no answers given depends only on the release, the people
 *  and the mode, so it is worked out once per process for them (a release is read by its items' versions, its forms and
 *  its form maps; a key that misses only costs the work again). Documents a case skips are not part of it: they only drop
 *  parts, and a part the order does not name keeps its place (inPartOrder). */
const ORDERS = new Map<string, string[]>();
function noAnswerOrder(s: Snapshot, people: Participant[], mode: Mode, today: Date, work: () => string[]): string[] {
  const key = JSON.stringify([mode, today.toISOString().slice(0, 10), people.map((p) => [p.subjectId, p.role, p.applies]), s.row_versions ?? null,
    (s.forms as { form_number: string; edition?: string }[]).map((f) => f.form_number), (s.field_maps as { form_edition?: string; entries?: unknown[] }[]).map((m) => `${m.form_edition}:${m.entries?.length}`)]);
  const got = ORDERS.get(key);
  if (got) return got;
  const order = work();
  if (ORDERS.size >= 200) ORDERS.delete(ORDERS.keys().next().value!);
  ORDERS.set(key, order);
  return order;
}

/** QA-439: `qs` with its parts in the order `order` gives (stable: a part `order` does not name stays right after the part
 *  before it); the questions inside each part keep their order. */
export function inPartOrder<T extends { subjectId: string; section: string }>(qs: T[], order: string[]): T[] {
  const at = new Map(order.map((k, i) => [k, i])), parts = new Map<string, T[]>();
  for (const q of qs) { const k = `${q.subjectId}|${q.section}`; (parts.get(k) ?? parts.set(k, []).get(k)!).push(q); }
  let last = -1, step = 0;
  const pos = [...parts.keys()].map((k, i) => { const p = at.get(k); if (p !== undefined) { last = p; step = 0; return { k, i, p }; } step++; return { k, i, p: last + step / 1e4 }; });
  return pos.sort((a, b) => a.p - b.p || a.i - b.i).flatMap((x) => parts.get(x.k)!);
}

/** QA-439 (P-498): the questions in their order, by person (`rank`): each person's sections the author ordered first, in
 *  that order (`authored`), then their parts that hold a deciding question, then the rest; then each moved only as far as
 *  it must: a part comes after the parts that hold what decides it (another person's too, and even past the author's
 *  order: a question is never asked before what decides it), and inside a part a question comes after the questions that
 *  decide it. Everything else keeps its place; a circle of deciders keeps the order it had. */
export function decidersFirst<T extends { subjectId: string; section: string; fact: string }>(qs: T[], decidedBy: (q: T) => Set<string>, rank: (subjectId: string) => number = () => 0, authored: (section: string) => boolean = () => false): T[] {
  const partOf = (q: T) => `${q.subjectId}|${q.section}`;
  const parts = new Map<string, T[]>(), at = new Map<string, string>();
  for (const q of qs) { (parts.get(partOf(q)) ?? parts.set(partOf(q), []).get(partOf(q))!).push(q); const k = `${q.subjectId}|${q.fact}`; if (!at.has(k)) at.set(k, partOf(q)); }
  const by = new Map(qs.map((q) => [q, [...decidedBy(q)].filter((k) => at.has(k))]));
  const deciding = new Set([...by.values()].flat().map((k) => at.get(k)!));
  const keys = [...parts.keys()].map((k, i) => ({ k, i, r: rank(parts.get(k)![0].subjectId), d: authored(parts.get(k)![0].section) ? 0 : deciding.has(k) ? 1 : 2 })).sort((a, b) => a.r - b.r || a.d - b.d || a.i - b.i).map((x) => x.k);
  // A circle (each decides the other, directly or through others) is not reordered: a dependency is followed only when it
  // does not lead back.
  const reaches = <N,>(next: (n: N) => N[], from: N, to: N) => { const seen = new Set<N>(), stack = [from]; while (stack.length) { const n = stack.pop()!; if (n === to) return true; if (seen.has(n)) continue; seen.add(n); stack.push(...next(n)); } return false; };
  const partDeps = (key: string) => [...new Set(parts.get(key)!.flatMap((q) => by.get(q)!.map((k) => at.get(k)!)).filter((d) => d !== key))];
  const out: T[] = [], doneParts = new Set<string>();
  const emitPart = (key: string) => {
    if (doneParts.has(key)) return;
    doneParts.add(key);
    const list = parts.get(key)!;
    for (const d of partDeps(key)) if (!reaches(partDeps, d, key)) emitPart(d);
    const facts = new Map(list.map((q) => [`${q.subjectId}|${q.fact}`, q])), done = new Set<T>();
    const qDeps = (q: T) => by.get(q)!.map((k) => facts.get(k)).filter((d): d is T => !!d && d !== q);
    const emit = (q: T) => { if (done.has(q)) return; done.add(q); for (const d of qDeps(q)) if (!reaches(qDeps, d, q)) emit(d); out.push(q); };
    for (const q of list) emit(q);
  };
  for (const key of keys) emitPart(key);
  return out;
}

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
