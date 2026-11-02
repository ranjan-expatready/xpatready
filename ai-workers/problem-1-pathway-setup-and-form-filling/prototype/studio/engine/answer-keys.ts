// G4 (C5.7; P-240; SA-01B v2.1 SA-1B-296 field 7, SA-1B-181, SA-1B-199): answer-key families and the runner. A family
// is made up (never a client: Sample until the immigration expert signs); a key holds what one item should give for
// it, per person; a run fills the item for the family the way a case does and says pass or fail per value. Pure (P-249
// lift-ready): no database, file, clock, network or model call; the API passes the snapshot, the form's field list and
// the family's reference date. Items: a form's field map, or a combination's eligibility rule set. Scoring tables do
// not exist in this product yet (C6.9 SI-1: "no score"), so the kind is refused, never faked (concept Q1).
import { canonical, sha256 } from "../../contracts/rules.ts";
import { INVISIBLE, LONE } from "../contracts/runtime.ts";
import { byAPerson } from "./form-steps.ts";
import { formValues, type Inventory } from "./form-values.ts";
import type { BoxRow } from "./render.ts";
import { snapshotHash, type Snapshot } from "./snapshot.ts";
import { caseView, knownOf, type Answer, type GroupAnswer, type Participant, type Row } from "./runtime/case.ts";
import { formCoverage, markNothingRecorded } from "./runtime/forms.ts";
import { assess, type GateState, type Outcome } from "./runtime/eligibility.ts";

export const ITEM_KINDS = ["field_map", "rule_set", "scoring"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
export const NO_SCORING = "No scoring tables exist in this product yet: a scoring answer key comes with the first scoring table.";
export const SAMPLE_WORDS = "Sample: made-up family; expected values not signed by the immigration expert (P-240)";
export const OUTCOMES: Outcome[] = ["LIKELY_ELIGIBLE", "ELIGIBLE_BELOW_CUTOFF", "POSSIBLY_ELIGIBLE", "NOT_ELIGIBLE"];
export const GATE_STATES: GateState[] = ["met", "not_met", "not_answered"];
/** Relatives a form describes but who are not on the case (render.ts aboutOf: `<subject>/parent_1`, …). */
export const RELATIONS = ["parent_1", "parent_2", "sibling"] as const;
export const LIMITS = { people: 12, facts: 600, value: 500, label: 120, boxes: 2000, reason: 300, edition: 60, depth: 4 } as const;
const KEY = /^[a-z][a-z0-9_-]{1,39}$/, PERSON_ID = /^[a-z][a-z0-9_]{0,23}$/, FACT = /^[a-z]+(\.[a-z0-9_]+)+$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The case's own subject in a family (facts about the application, `case.*`). */
export const CASE = "case";

/** `applies` false: on the family but not travelling (a spouse who stays home is still named on the form). */
export type FamilyPerson = { id: string; role: string; label: string; applies: boolean };
export type FamilyFact = { about: string; fact: string; row?: number | null; value: unknown };
/** A repeating group (its section id) for which the person confirmed "none apply" (the IMM 5257 "N" boxes, C7.2). */
export type FamilyNone = { about: string; group: string };
export type Family = { key: string; label: string; reference_date: string; people: FamilyPerson[]; facts: FamilyFact[]; none_apply: FamilyNone[] };
/** Field map: per person, form field (data path) → the value the form field must hold ("" = stays blank). */
export type MapExpected = { edition: string; people: Record<string, Record<string, string>> };
/** Rule set: per person, the outcome and (optionally) each gate's state. */
export type RuleExpected = { people: Record<string, { outcome: Outcome; gates?: Record<string, GateState> }> };
export type Expected = MapExpected | RuleExpected;
export type Line = { person: string; person_label: string; target: string; label: string; expected: string; got: string; pass: boolean; why?: string };
export type RunResult = { result: "PASSED" | "FAILED"; lines: Line[]; passed: number; failed: number; fingerprint: Fingerprint };
/** BR-5: what a run read. `item`: the map (form, edition, entries) or the gates; `inputs`: the whole snapshot. */
export type Fingerprint = { item: string; inputs: string };
export type FieldError = { field: string; message: string };

const str = (x: unknown) => (typeof x === "string" ? x : "");
/** Break m5, m7: text with control or invisible characters (NUL, zero-width, bidi overrides) or a lone surrogate. */
export const unclean = (x: string) => INVISIBLE.test(x) || LONE.test(x);
/** No letter or digit once invisible characters are set aside (break m7: "\u200b" is not a name). */
export const blank = (x: string) => !/[\p{L}\p{N}]/u.test(x);
/** Break m4: how deep a value goes, without recursion (a 10,000-deep value overflowed JSON.stringify), and whether any
 *  text inside it is unclean. Values are scalars or small objects (an address, a phone): 4 levels is plenty. */
function valueProblem(v: unknown): string | null {
  const stack: [unknown, number][] = [[v, 1]];
  while (stack.length) {
    const [n, d] = stack.pop()!;
    if (d > LIMITS.depth) return "This value is nested too deeply for a form.";
    if (typeof n === "string" && unclean(n)) return "This value holds control or invisible characters.";
    // Devin review (PR #513): an object's keys are text too.
    if (n && typeof n === "object") for (const [k, x] of Object.entries(n)) { if (!Array.isArray(n) && (unclean(k) || [...k].length > 60)) return "This value has a part whose name holds control or invisible characters, or is too long."; stack.push([x, d + 1]); }
  }
  return null;
}
/** Break m8: an own entry only ("constructor" is not a person of every object). */
const own = <T>(o: Record<string, T>, k: string): T | undefined => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const realDate = (x: string) => DATE.test(x) && !Number.isNaN(Date.parse(`${x}T00:00:00Z`)) && new Date(`${x}T00:00:00Z`).toISOString().startsWith(x);

/** BR-1: a family as typed, checked. `fields`: the library's field ids (a fact must be one of them); `roles`: the
 *  library's person roles (S5 person_role keys). A fact is about a person, "case", or a relative a form describes
 *  (`<person>/parent_1`, `/parent_2`, `/sibling`). */
export function checkFamily(input: unknown, fields: Set<string>, roles: Set<string>): { family: Family; errors: FieldError[] } {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const key = str(b.key).trim(), label = str(b.label).trim(), ref = str(b.reference_date).trim();
  if (!KEY.test(key)) errors.push({ field: "key", message: "Give the family a short key: lower-case letters, digits, - or _ (2 to 40), starting with a letter." });
  if (!label || blank(label) || unclean(label) || [...label].length > LIMITS.label) errors.push({ field: "label", message: `Give the family a name of 1 to ${LIMITS.label} characters, with no control or invisible characters.` });
  if (!realDate(ref)) errors.push({ field: "reference_date", message: "Give the date the family is read on (YYYY-MM-DD): ages are worked out on it." });
  const rawPeople = Array.isArray(b.people) ? b.people : [];
  if (!rawPeople.length || rawPeople.length > LIMITS.people) errors.push({ field: "people", message: `A family has 1 to ${LIMITS.people} people.` });
  const people: FamilyPerson[] = rawPeople.map((p, i) => {
    const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const id = str(o.id).trim(), role = str(o.role).trim(), l = str(o.label).trim();
    if (!PERSON_ID.test(id) || id === CASE || id in Object.prototype) errors.push({ field: `people[${i}].id`, message: "Give each person a short id: lower-case letters, digits or _, starting with a letter (not \"case\")." });
    if (!roles.has(role)) errors.push({ field: `people[${i}].role`, message: `Choose a role of the library: ${[...roles].sort().join(", ")}.` });
    if (o.applies !== undefined && typeof o.applies !== "boolean") errors.push({ field: `people[${i}].applies`, message: "Say whether the person is travelling (true or false)." });
    if (!l || blank(l) || unclean(l) || [...l].length > LIMITS.label) errors.push({ field: `people[${i}].label`, message: `Give each person a made-up name of 1 to ${LIMITS.label} characters, with no control or invisible characters.` });
    return { id, role, label: l, applies: o.applies !== false };
  });
  const ids = people.map((p) => p.id);
  ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errors.push({ field: `people[${i}].id`, message: `Two people have the id "${id}".` }); });
  if (people.filter((p) => p.role === "principal").length !== 1) errors.push({ field: "people", message: "A family has exactly one principal applicant." });
  else if (people.find((p) => p.role === "principal")!.applies === false) errors.push({ field: "people", message: "The principal applicant travels: only other people can stay home (break m11)." });
  const rawFacts = Array.isArray(b.facts) ? b.facts : [];
  // Break m6: too many facts is said once, before any fact is read.
  if (rawFacts.length > LIMITS.facts) return { family: { key, label, reference_date: ref, people, facts: [], none_apply: [] }, errors: [...errors, { field: "facts", message: `A family has at most ${LIMITS.facts} facts.` }] };
  const seen = new Set<string>();
  const facts: FamilyFact[] = rawFacts.map((f, i) => {
    const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
    const about = str(o.about).trim(), fact = str(o.fact).trim(), row = o.row === undefined || o.row === null ? null : o.row;
    const [who, rel, ...more] = about.split("/");
    if (about !== CASE && !(ids.includes(who) && !more.length && (rel === undefined || (RELATIONS as readonly string[]).includes(rel)))) errors.push({ field: `facts[${i}].about`, message: `"${about}" is not a person of this family, "case" for the application, or a relative a form describes (${RELATIONS.map((r) => `<person>/${r}`).join(", ")}).` });
    if (!FACT.test(fact) || !fields.has(fact)) errors.push({ field: `facts[${i}].fact`, message: `"${fact}" is not a field of the library.` });
    // Break m11: a person's field is about a person, an application's field about the application.
    if (FACT.test(fact) && ((about === CASE && fact.startsWith("person.")) || (about !== CASE && fact.startsWith("case.")))) errors.push({ field: `facts[${i}].about`, message: `${fact} is ${about === CASE ? "about a person, not the application" : "about the application: give it with about \"case\""}.` });
    if (row !== null && !(Number.isInteger(row) && (row as number) >= 0 && (row as number) < 50)) errors.push({ field: `facts[${i}].row`, message: "A row is a whole number from 0 to 49." });
    if (o.value === undefined || o.value === null || o.value === "") errors.push({ field: `facts[${i}].value`, message: "Give the value (leave the fact out when the family has none)." });
    else if (valueProblem(o.value)) errors.push({ field: `facts[${i}].value`, message: valueProblem(o.value)! });
    else if (JSON.stringify(o.value).length > LIMITS.value * 4) errors.push({ field: `facts[${i}].value`, message: "This value is too long for a form." });
    const k = `${about}|${fact}|${row ?? ""}`;
    if (seen.has(k)) errors.push({ field: `facts[${i}]`, message: `${fact} is given twice for ${about}${row === null ? "" : ` (row ${row})`}.` });
    seen.add(k);
    return { about, fact, row: row as number | null, value: o.value };
  });
  // Rows count from 0 with no gap, so row n of a family is row n on the form (a case's rows are ordered the same way).
  const rowsOf = new Map<string, number[]>();
  for (const f of facts) if (f.row !== null && f.row !== undefined) rowsOf.set(`${f.about}|${f.fact}`, [...(rowsOf.get(`${f.about}|${f.fact}`) ?? []), f.row]);
  for (const [k, rows] of rowsOf) { const s = [...new Set(rows)].sort((x, y) => x - y); if (s.some((r, i) => r !== i)) errors.push({ field: "facts", message: `${k.replace("|", ": ")} has rows ${s.join(", ")}: rows start at 0 with no gap.` }); }
  const none_apply: FamilyNone[] = (Array.isArray(b.none_apply) ? b.none_apply : []).map((n, i) => {
    const o = (n && typeof n === "object" ? n : {}) as Record<string, unknown>;
    const about = str(o.about).trim(), group = str(o.group).trim();
    if (!ids.includes(about)) errors.push({ field: `none_apply[${i}].about`, message: `"${about}" is not a person of this family.` });
    if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(group)) errors.push({ field: `none_apply[${i}].group`, message: "Name the repeating group (its section)." });
    else if ((b.none_apply as { about?: unknown; group?: unknown }[]).slice(0, i).some((x) => x?.about === about && x?.group === group)) errors.push({ field: `none_apply[${i}]`, message: `"None apply" is given twice for ${group}.` });
    return { about, group };
  });
  return { family: { key, label, reference_date: ref, people, facts, none_apply }, errors };
}

/** The family as a case's people, answers, rows and group answers (every answer confirmed: VERIFIED), so the runner
 *  reads it through the same engine a case uses (knownOf, render, caseView). Rows: one per (person, fact, row), in the
 *  fact's repeating group (its placement's section), ordered by row. */
export function asCase(s: Snapshot, f: Family) {
  const at = `${f.reference_date}T00:00:00.000Z`;
  const people: Participant[] = [{ subjectId: CASE, role: "case", label: "The application", applies: true }, ...f.people.map((p) => ({ subjectId: p.id, role: p.role, label: p.label, applies: p.applies !== false }))];
  const groupOf = (fact: string) => (s.placements as { fact: string; section_id: string }[]).find((p) => p.fact === fact)?.section_id ?? fact;
  const rows: Row[] = [], answers: Answer[] = [], seen = new Set<string>();
  f.facts.forEach((x, i) => {
    const rowKey = x.row === null || x.row === undefined ? null : `${x.about}|${groupOf(x.fact)}|${x.row}`;
    if (rowKey && !seen.has(rowKey)) { seen.add(rowKey); rows.push({ rowKey, subjectId: x.about, group: groupOf(x.fact), order: x.row! }); }
    answers.push({ id: `k${i}`, subjectId: x.about, field: x.fact, rowKey, value: x.value, status: "VERIFIED", channel: "answer_key", actor: "answer-key family", at });
  });
  const groups: GroupAnswer[] = f.none_apply.map((n, i) => ({ id: `n${i}`, subjectId: n.about, group: n.group, noneApply: true, status: "VERIFIED", channel: "answer_key", actor: "answer-key family", at }));
  return { people, answers, rows, groups, today: new Date(at) };
}

const pdfMap = (s: Snapshot, form: string) => (s.field_maps as { form_number: string; form_edition: string; channel?: string; entries: { data_path: string; caption?: string | null; heading?: string | null; outcome?: string; fact?: string | null }[] }[]).find((m) => m.form_number === form && m.channel !== "ONLINE");

/** BR-5 (challenge M2): the fingerprint of the item a key tests, and of everything the run read: the whole snapshot
 *  (answer lists, form lines, derived fields, placements, formats) and, for a map, the form field list (the snapshot
 *  names it only by its path). Wider than needed, never narrower: a change elsewhere reads "Not run", never a stale Passed. */
export function fingerprintOf(s: Snapshot, kind: ItemKind, ref: string, inv?: Inventory | null): Fingerprint {
  const item = kind === "field_map" ? (() => { const m = pdfMap(s, ref); return m ? { form: m.form_number, edition: m.form_edition, entries: m.entries } : null; })() : kind === "rule_set" ? (s.eligibility?.gates ?? null) : null;
  return { item: sha256(canonical({ kind, ref, item } as never)), inputs: inv ? sha256(`${snapshotHash(s)}|${sha256(canonical(inv as never))}`) : snapshotHash(s) };
}

/** BR-2: an expected result as typed, checked against the item it tests (every box on the map, every gate in the set,
 *  every person in the family). */
export function checkExpected(s: Snapshot, kind: ItemKind, ref: string, family: Family, input: unknown, inv?: Inventory | null): { expected: Expected | null; errors: FieldError[] } {
  if (kind === "scoring") return { expected: null, errors: [{ field: "item_kind", message: NO_SCORING }] };
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const raw = (b.people && typeof b.people === "object" && !Array.isArray(b.people) ? b.people : {}) as Record<string, unknown>;
  const ids = new Set(family.people.map((p) => p.id));
  for (const id of Object.keys(raw)) if (!ids.has(id) || id in Object.prototype) errors.push({ field: `expected.people.${id}`, message: `"${id}" is not a person of the family ${family.label}.` });
  if (!Object.keys(raw).length) errors.push({ field: "expected.people", message: "Give the expected result for at least one person." });
  if (kind === "field_map") {
    const m = pdfMap(s, ref);
    if (!m) return { expected: null, errors: [{ field: "item_ref", message: `${ref} has no PDF field map in this combination.` }] };
    const boxes = new Set(m.entries.map((e) => e.data_path));
    const invBox = new Map((inv?.fields ?? []).filter((x) => x.data_path).map((x) => [x.data_path!, x]));
    const edition = str(b.edition).trim() || m.form_edition;
    if (unclean(edition) || [...edition].length > LIMITS.edition) errors.push({ field: "expected.edition", message: `Name the form edition as the library does (at most ${LIMITS.edition} characters), e.g. "${m.form_edition}".` });
    const people: Record<string, Record<string, string>> = {};
    let count = 0;
    for (const [id, v] of Object.entries(raw)) {
      const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
      people[id] = {};
      for (const [box, val] of Object.entries(o)) {
        count++;
        if (!boxes.has(box)) { errors.push({ field: `expected.people.${id}.${box}`, message: `${m.form_edition} has no form field ${box}.` }); continue; }
        // Challenge M5 (c): a box a person fills (a signature, the oath) is never written by the product, so no key holds it.
        const person = inv ? byAPerson(inv.fields, invBox.get(box) ?? { data_path: box }) : null;
        if (person) { errors.push({ field: `expected.people.${id}.${box}`, message: `${m.entries.find((e) => e.data_path === box)?.caption || box} is filled by a person (${person}), never by the product: leave it out of the key.` }); continue; }
        if (typeof val !== "string" || unclean(val) || [...val].length > LIMITS.value) { errors.push({ field: `expected.people.${id}.${box}`, message: `Write the value the form field holds, as text of at most ${LIMITS.value} characters ("" when it stays blank).` }); continue; }
        people[id][box] = val;
      }
    }
    if (count > LIMITS.boxes) errors.push({ field: "expected.people", message: `At most ${LIMITS.boxes} form fields in one key.` });
    return { expected: errors.length ? null : { edition, people }, errors };
  }
  if (ref !== "eligibility") return { expected: null, errors: [{ field: "item_ref", message: "A rule set key tests the combination's eligibility rules (item_ref \"eligibility\")." }] };
  const gates = new Set((s.eligibility?.gates ?? []).map((g) => g.key));
  if (!gates.size) return { expected: null, errors: [{ field: "item_ref", message: "This combination has no eligibility rules to test." }] };
  const people: RuleExpected["people"] = {};
  for (const [id, v] of Object.entries(raw)) {
    // C6.9 BR-7: eligibility is checked for the people who travel; one who stays home gets no result.
    if (family.people.find((p) => p.id === id)?.applies === false) { errors.push({ field: `expected.people.${id}`, message: `${family.people.find((p) => p.id === id)!.label} is not travelling on this application: eligibility is checked only for the people who travel.` }); continue; }
    const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
    if (!OUTCOMES.includes(o.outcome as Outcome)) { errors.push({ field: `expected.people.${id}.outcome`, message: `Choose the outcome: ${OUTCOMES.join(", ")}.` }); continue; }
    const g = (o.gates && typeof o.gates === "object" && !Array.isArray(o.gates) ? o.gates : {}) as Record<string, unknown>;
    for (const [k, st] of Object.entries(g)) {
      if (!gates.has(k)) errors.push({ field: `expected.people.${id}.gates.${k}`, message: `The eligibility rules have no gate "${k}".` });
      else if (!GATE_STATES.includes(st as GateState)) errors.push({ field: `expected.people.${id}.gates.${k}`, message: `Choose ${GATE_STATES.join(", ")}.` });
    }
    people[id] = { outcome: o.outcome as Outcome, ...(Object.keys(g).length ? { gates: g as Record<string, GateState> } : {}) };
  }
  return { expected: errors.length ? null : { people }, errors };
}

const finish = (lines: Line[], fingerprint: Fingerprint): RunResult => {
  const failed = lines.filter((l) => !l.pass).length;
  // Failures first (concept §4), then the order of the form or the rules.
  return { result: failed || !lines.length ? "FAILED" : "PASSED", lines: [...lines.filter((l) => !l.pass), ...lines.filter((l) => l.pass)], passed: lines.length - failed, failed, fingerprint };
};

/** BR-3, BR-4, BR-6: a field map run. Every form field the key lists is compared with what the filler would write; a
 *  form field the run writes that the key does not list fails ("written, not expected": a wrong-person wire); a person
 *  the form applies to with no expected values fails on each form field written for them. */
export function runFieldMap(s: Snapshot, family: Family, form: string, inv: Inventory, expected: MapExpected): RunResult {
  const fp = fingerprintOf(s, "field_map", form, inv), m = pdfMap(s, form), lines: Line[] = [];
  const nameOf = (id: string) => family.people.find((p) => p.id === id)?.label ?? id;
  if (!m) return finish([{ person: "", person_label: "", target: form, label: form, expected: "a PDF field map", got: "none", pass: false, why: `${form} has no PDF field map in this combination.` }], fp);
  if (expected.edition !== m.form_edition) return finish([{ person: "", person_label: "", target: "edition", label: `${form} edition`, expected: expected.edition, got: m.form_edition, pass: false, why: `This key is for edition ${expected.edition}; the map is edition ${m.form_edition}. One good edition proves nothing about another.` }], fp);
  // Review minor 6: a caption alone can be "YYYY"; a short one is said with its field's meaning ("Date of birth: YYYY").
  // The map's heading is a path ("Page1.PersonalDetails"), never words, so it is not used.
  const meaning = new Map((s.canonical_fields as { id: string; meaning?: string; label?: string }[]).map((f) => [f.id, f.label || f.meaning || ""]));
  const caption = new Map(m.entries.map((e) => { const c = (e.caption ?? "").trim(), w = e.fact ? meaning.get(e.fact) : ""; return [e.data_path, c.length > 4 || !w ? c || w || e.data_path : `${w}: ${c}`]; }));
  const c = asCase(s, family);
  const view = caseView(s, c.people, c.answers, c.rows, "agent", c.today, c.groups);
  for (const p of family.people) {
    const want = own(expected.people, p.id);
    const cov = formCoverage(s, c.people, c.answers, c.rows, form, p.id, c.today);
    // Devin review (PR #513): a form whose condition cannot be told for this family (a fact it reads is missing) is
    // never a pass: the family must settle whether the form applies.
    if (cov && cov.applies === "cannot_tell") { lines.push({ person: p.id, person_label: p.label, target: form, label: `${form} for ${p.label}`, expected: want ? "applies" : "does not apply", got: "cannot tell", pass: false, why: `Whether ${form} applies to ${p.label} cannot be told: the family has no answer for ${(cov as { missing?: string[] }).missing?.join(", ") || "a fact its condition reads"}.` }); continue; }
    const applies = !!cov && cov.applies !== false;
    if (!applies) {
      if (want) lines.push({ person: p.id, person_label: p.label, target: form, label: `${form} for ${p.label}`, expected: "applies", got: "does not apply", pass: false, why: `${form} does not apply to ${p.label} in this combination.` });
      continue;
    }
    const { values, boxes } = formValues(s, m, inv, markNothingRecorded(cov!.boxes as BoxRow[], view));
    const why = new Map(boxes.map((x) => [x.box, x.why]));
    for (const [box, exp] of Object.entries(want ?? {})) {
      const got = values[box] ?? "";
      lines.push({ person: p.id, person_label: p.label, target: box, label: caption.get(box) || box, expected: exp, got, pass: got === exp, ...(got !== exp && why.get(box) ? { why: why.get(box) } : {}) });
    }
    for (const [box, got] of Object.entries(values)) if (!want || !(box in want)) lines.push({ person: p.id, person_label: nameOf(p.id), target: box, label: caption.get(box) || box, expected: "(not in the key)", got, pass: false, why: want ? "written, not expected: add it to the key or fix the map" : `${form} applies to ${p.label} but the key has no expected values for them` });
  }
  return finish([...gone(family, expected), ...lines], fp);
}

/** Break M2: expected values for a person the family no longer has (or who stopped travelling, for rules) fail, never
 *  silently skipped. */
function gone(family: Family, expected: Expected, travelling = false): Line[] {
  return Object.keys(expected.people).filter((id) => { const p = family.people.find((x) => x.id === id); return !p || (travelling && p.applies === false); })
    .map((id) => ({ person: id, person_label: id, target: "person", label: "Person", expected: "in the family", got: "not in the family", pass: false, why: `The key has expected values for "${id}", who is not ${travelling ? "a travelling person" : "a person"} of the family ${family.label} now: change the key or the family.` }));
}

/** BR-3, BR-4: a rule set run: the combination's eligibility rules for each travelling person (engine/runtime/
 *  eligibility.ts assess, the one a case uses; C6.9 BR-7); a travelling person with no expected result fails. */
export function runRuleSet(s: Snapshot, family: Family, expected: RuleExpected): RunResult {
  const fp = fingerprintOf(s, "rule_set", "eligibility"), lines: Line[] = [];
  const c = asCase(s, family);
  const { known } = knownOf(s, c.people, c.answers, c.rows, c.today);
  const gateLabel = new Map((s.eligibility?.gates ?? []).map((g) => [g.key, g.label]));
  for (const p of family.people.filter((x) => x.applies !== false)) {
    const want = own(expected.people, p.id);
    if (!want) { lines.push({ person: p.id, person_label: p.label, target: "outcome", label: "Outcome", expected: "(not in the key)", got: "", pass: false, why: `the key has no expected result for ${p.label}` }); continue; }
    const r = assess(s, known, p.id);
    if (!r) { lines.push({ person: p.id, person_label: p.label, target: "outcome", label: "Outcome", expected: want.outcome, got: "no result", pass: false, why: "the combination has no eligibility rules" }); continue; }
    lines.push({ person: p.id, person_label: p.label, target: "outcome", label: "Outcome", expected: want.outcome, got: r.outcome, pass: r.outcome === want.outcome });
    for (const [k, st] of Object.entries(want.gates ?? {})) {
      const g = r.gates.find((x) => x.key === k);
      lines.push({ person: p.id, person_label: p.label, target: `gate:${k}`, label: gateLabel.get(k) ?? k, expected: st, got: g?.state ?? "(gate removed)", pass: g?.state === st, ...(g && g.state !== st && g.missing.length ? { why: `missing: ${g.missing.join(", ")}` } : {}) });
    }
  }
  return finish([...gone(family, expected, true), ...lines], fp);
}

/** BR-5: the state of a key's last run against the item now. */
export function runState(last: { result: string; itemFingerprint: string; inputsFingerprint: string; keyVersion: number } | null, now: Fingerprint, keyVersion: number): { state: "NOT_RUN" | "PASSED" | "FAILED"; why: string } {
  if (!last) return { state: "NOT_RUN", why: "Not run yet." };
  if (last.keyVersion !== keyVersion) return { state: "NOT_RUN", why: "Not run since the expected values changed." };
  if (last.itemFingerprint !== now.item) return { state: "NOT_RUN", why: "Not run since the item changed." };
  if (last.inputsFingerprint !== now.inputs) return { state: "NOT_RUN", why: "Not run since the combination changed." };
  return last.result === "PASSED" ? { state: "PASSED", why: "Passed on the item as it is now." } : { state: "FAILED", why: "Failed on the item as it is now." };
}

/** BR-7: whether a key may be signed now: by the expert, on the version shown. The expert may have entered the values
 *  (SA-1B-296 r2: "entered and signed by the expert"; challenge M3); the second person approves key changes with the
 *  draft (G2). */
export function signProblem(key: { state: string; version: number }, by: { id: string; duties: readonly string[] }, version: unknown): string | null {
  if (!by.duties.includes("sme")) return "Only the immigration expert signs expected values.";
  if (version !== key.version) return "The expected values changed since you opened them: reload, read them again, then sign.";
  if (key.state === "SIGNED") return "These expected values are already signed.";
  return null;
}

/** BR-7: a change to signed expected values needs a one-line reason and returns the key to Draft. */
export function changeProblem(state: string, reason: unknown): string | null {
  if (state !== "SIGNED") return null;
  const r = str(reason).trim();
  return !r || blank(r) || unclean(r) || /[\n\r]/.test(r) || [...r].length > LIMITS.reason ? `These expected values are signed: give a one-line reason (up to ${LIMITS.reason} characters) to change them; they go back to Draft.` : null;
}

