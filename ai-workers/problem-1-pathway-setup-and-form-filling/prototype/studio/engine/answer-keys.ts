// G4 (C5.7; P-240; SA-01B v2.1 SA-1B-296 field 7, SA-1B-181, SA-1B-199): answer-key families and the runner. A family
// is made up (never a client: Sample until the immigration expert signs); a key holds what one item should give for
// it, per person; a run fills the item for the family the way a case does and says pass or fail per value. Pure (P-249
// lift-ready): no database, file, clock, network or model call; the API passes the snapshot, the form's field list and
// the family's reference date. Items: a form's field map, or a combination's eligibility rule set. Scoring tables do
// not exist in this product yet (C6.9 SI-1: "no score"), so the kind is refused, never faked (concept Q1).
import { canonical, sha256 } from "../../contracts/rules.ts";
import { INVISIBLE, LONE } from "../contracts/runtime.ts";
import { byAPerson } from "./form-steps.ts";
import { formValues, type Inventory, type InventoryBox } from "./form-values.ts";
import { pdfOptions } from "./options.ts";
import type { BoxRow } from "./render.ts";
import { content, snapshotHash, type Snapshot } from "./snapshot.ts";
import { caseView, knownOf, type Answer, type GroupAnswer, type Participant, type Row } from "./runtime/case.ts";
import { formCoverage, markNothingRecorded, type GatePlacement } from "./runtime/forms.ts";
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
/** `label`: the form field's printed caption qualified by its meaning (labelsOf; never a data path: `target` holds the
 *  path, for an author's tooltip); `says`: a failing line in one sentence (concept §5). */
export type Line = { person: string; person_label: string; target: string; label: string; expected: string; got: string; pass: boolean; why?: string; says?: string };
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

/** A form's PDF field map; with `edition`, that edition's (G2, Devin on #568: a snapshot carries every mapped PDF
 *  edition of a form, oldest first, so "the first one" would test and fingerprint an older edition than the key's). */
const pdfMap = (s: Snapshot, form: string, edition?: string | null) => (s.field_maps as { form_number: string; form_edition: string; channel?: string; entries: { data_path: string; caption?: string | null; heading?: string | null; outcome?: string; fact?: string | null }[] }[]).find((m) => m.form_number === form && m.channel !== "ONLINE" && (!edition || m.form_edition === edition));

/** BR-5 (challenge M2): the fingerprint of the item a key tests, and of everything the run read: the whole snapshot
 *  (answer lists, form lines, derived fields, placements, formats) and, for a map, the form field list (the snapshot
 *  names it only by its path). Wider than needed, never narrower: a change elsewhere reads "Not run", never a stale Passed. */
export function fingerprintOf(s: Snapshot, kind: ItemKind, ref: string, inv?: Inventory | null, known?: Known): Fingerprint {
  const snap = known?.snapshot ?? snapshotHash(s);
  return { item: itemFingerprint(s, kind, ref, known?.edition), inputs: inv ? sha256(`${snap}|${known?.inventory ?? inventoryHash(inv)}`) : snap };
}
/** G2 (C5.5, concept BR-2): the item part alone (form, edition and entries; or the gates), so a release can tell an item
 *  new or changed since the released snapshot without hashing the whole snapshot. */
export function itemFingerprint(s: Snapshot, kind: ItemKind, ref: string, edition?: string | null): string {
  const item = kind === "field_map" ? (() => { const m = pdfMap(s, ref, edition); return m ? { form: m.form_number, edition: m.form_edition, entries: m.entries } : null; })() : kind === "rule_set" ? (s.eligibility?.gates ?? null) : null;
  // G2 (build discovery 1): the content only, as the snapshot hash reads it (engine/snapshot.ts content()): a release
  // turns each entry's status from Draft to Published and keeps its version count, which is bookkeeping, not the map.
  return sha256(canonical(content({ kind, ref, item }) as never));
}
/** BK-26: the field list's own content; the dependent lists read beside it (Inventory.dependent_lists) are left out, so a
 *  key's fingerprint stays that of the form's field list. */
export const inventoryHash = (inv: Inventory) => { const { dependent_lists: _lists, ...own } = inv; void _lists; return sha256(canonical(own as never)); };
/** G2 (challenge m5): hashes the caller already holds (the draft's sha256, a form field list's hash), so one gate pass
 *  hashes the snapshot once, not once per key. Omitted, they are worked out here as before. */
export type Known = { snapshot?: string; inventory?: string; /** a field map's edition (the key's): that edition's map */ edition?: string | null };

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
    // G2 (Devin on #568): checked against the edition the key names when the combination has it (each edition is its
    // own item); otherwise against the form's first map, which a save then moves the key to (the editor says so first).
    const m = pdfMap(s, ref, str(b.edition).trim() || null) ?? pdfMap(s, ref);
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
        if (!boxes.has(box)) { errors.push({ field: `expected.people.${id}.${box}`, message: `${(invBox.get(box)?.caption ?? "").trim() || "This form field"} is not on the ${m.form_edition} field map: leave it out of the key.` }); continue; }
        // Challenge M5 (c): a box a person fills (a signature, the oath) is never written by the product, so no key holds it.
        const person = inv ? byAPerson(inv.fields, invBox.get(box) ?? { data_path: box }) : null;
        if (person) { errors.push({ field: `expected.people.${id}.${box}`, message: `${m.entries.find((e) => e.data_path === box)?.caption || "This form field"} is filled by a person (${person}), never by the product: leave it out of the key.` }); continue; }
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

const meaningsOf = (s: Snapshot) => new Map((s.canonical_fields as { id: string; meaning?: string; label?: string }[]).map((f) => [f.id, f.label || f.meaning || ""]));
/** P-63 (the founder's glossary): a person reads "form field", never "box", and never a data path. */
export const UNNAMED = "Unnamed form field";
/** The filler's own reasons (p5/transforms.ts, shared with the case filler) say "box"; a line says "form field". */
export const inWords = (x: string) => x.replace(/\bboxes\b/g, "form fields").replace(/\bbox\b/g, "form field").replace(/\bBox\b/g, "Form field");
/** Review of 917066dc: how a person reads a form field, in the Expected editor and the run's lines alike: its printed
 *  caption qualified by the library field's meaning ("City/Town — Current residential (home) address", "YYYY — Date
 *  of birth"), so no two form fields of the map read the same; a repeating row adds "row n", and form fields still
 *  alike (a phone's two "No." fields) add "1 of 2" in the form's order. Never a data path; no guess from the printed
 *  text around a field (its field list's heading runs on past its group). */
export function labelsOf(s: Snapshot, m: { entries: { data_path: string; caption?: string | null; fact?: string | null; row?: number | null }[] }, inv?: Inventory | null): Map<string, string> {
  const meaning = meaningsOf(s), at = new Map((inv?.fields ?? []).map((f, i) => [f.data_path ?? "", i] as const));
  const entries = [...m.entries].map((e, i) => ({ e, i })).sort((a, b) => (at.get(a.e.data_path) ?? 1e6 + a.i) - (at.get(b.e.data_path) ?? 1e6 + b.i)).map(({ e }) => e);
  const base = new Map(entries.map((e) => {
    // Devin review of 53149ff8: the form's required marker ("* ") stays in front, so a required form field reads required.
    const req = /^\s*\*/.test(e.caption ?? ""), c = (e.caption ?? "").trim().replace(/^\*\s*/, ""), w = e.fact ? (meaning.get(e.fact) ?? "").trim() : "";
    const label = (req ? "* " : "") + (!c ? w || UNNAMED : !w || c.toLowerCase().includes(w.toLowerCase()) ? c : `${c} — ${w}`);
    return [e.data_path, typeof e.row === "number" ? `${label} (row ${e.row + 1})` : label];
  }));
  const alike = new Map<string, string[]>();
  for (const e of entries) alike.set(base.get(e.data_path)!, [...(alike.get(base.get(e.data_path)!) ?? []), e.data_path]);
  return new Map(entries.map((e) => { const l = base.get(e.data_path)!, same = alike.get(l)!; return [e.data_path, same.length > 1 ? `${l} (${same.indexOf(e.data_path) + 1} of ${same.length})` : l]; }));
}

/** A form field's own choices (code, label) as the form defines them: its resolved list or its map's code list
 *  (engine/options.ts pdfOptions, as the filler reads them), else the field list's own: a drop-down's labels and codes
 *  (two lists side by side), a yes/no group's [label, code] pairs, a tick box's on, off and neither values. None: a text
 *  box. A blank code is left out (an empty box is "stays blank" in the editor). */
export function formOptions(box: InventoryBox, transform: string | null | undefined): { code: string; label: string }[] {
  const own = pdfOptions(box, transform);
  if (own.length) return own;
  const o = (Array.isArray(box.options) ? (box.options as unknown[]) : []).filter(Array.isArray).map((x) => (x as unknown[]).map((y) => String(y ?? "")));
  const tidy = (code: string, label: string) => ({ code, label: label.replace(/^\*\s*/, "").trim() || code });
  let out: { code: string; label: string }[] = [];
  if (box.ui === "checkButton" && o[0]) out = o[0].map((code, i) => ({ code, label: ["Ticked", "Not ticked", "Neither"][i] ?? code }));
  else if (box.ui === "choiceList" && o.length === 2 && o[0].length === o[1].length) out = o[1].map((code, i) => tidy(code, o[0][i]));
  else if (box.ui === "exclGroup" && o.every((x) => x.length === 2)) out = o.map((x) => tidy(x[1], x[0]));
  return out.filter((x) => x.code.trim() !== "");
}

/** One box the Expected editor offers (concept §4, challenge M5 b). `whose`: the map's person (form_subject, the
 *  subject's spouse, …, "none" for the application); `by_a_person`: a signature or the oath, which no key holds. */
export type KeyBox = { data_path: string; caption: string; meaning: string; fact: string | null; whose: string; row: number | null; options: { code: string; label: string }[]; by_a_person: boolean; by_a_person_why: string | null };
/** BR-2, BR-4, §4 (STANDARDS §3.2 pick, don't type): every mapped box of a form's PDF map, in the form's own order (its
 *  field list; a box the list lacks after, in map order), with its caption, the fact it reads and whose, and the form's
 *  own options for a choice box. It reads the map and the form only, never a run: the key must not copy the product's
 *  output. null: the combination has no PDF map of that form. */
export function keyBoxes(s: Snapshot, form: string, inv: Inventory, edition?: string | null): { form: string; edition: string; boxes: KeyBox[]; captions: Record<string, string> } | null {
  const m = pdfMap(s, form, edition) ?? (edition ? undefined : pdfMap(s, form));
  if (!m) return null;
  const caption = labelsOf(s, m, inv), meaning = meaningsOf(s);
  const at = new Map(inv.fields.map((f, i) => [f.data_path ?? "", i] as const)), boxOf = new Map(inv.fields.filter((f) => f.data_path).map((f) => [f.data_path!, f] as const));
  const entries = (m.entries as { data_path: string; outcome?: string; fact?: string | null; person?: string | null; row?: number | null; transform?: string | null }[])
    .map((e, i) => ({ e, i })).filter(({ e }) => e.outcome === "mapped")
    .sort((a, b) => (at.get(a.e.data_path) ?? inv.fields.length + a.i) - (at.get(b.e.data_path) ?? inv.fields.length + b.i));
  return {
    form: m.form_number, edition: m.form_edition,
    // Every form field's printed caption on this edition, so a value for one the map no longer has is named, not a path.
    captions: Object.fromEntries(inv.fields.filter((f) => f.data_path && (f.caption ?? "").trim()).map((f) => [f.data_path!, (f.caption ?? "").trim()])),
    boxes: entries.map(({ e }) => {
      const box = boxOf.get(e.data_path) ?? { data_path: e.data_path };
      const why = byAPerson(inv.fields, box);
      const means = e.fact ? meaning.get(e.fact) ?? "" : "";
      return { data_path: e.data_path, caption: caption.get(e.data_path) || UNNAMED, meaning: means, fact: e.fact ?? null, whose: e.person ?? "none", row: e.row ?? null, options: formOptions(box, e.transform), by_a_person: !!why, by_a_person_why: why };
    }),
  };
}

/** BR-3, BR-4, BR-6: a field map run. Every form field the key lists is compared with what the filler would write; a
 *  form field the run writes that the key does not list fails ("written, not expected": a wrong-person wire); a person
 *  the form applies to with no expected values fails on each form field written for them. */
export function runFieldMap(s: Snapshot, family: Family, form: string, inv: Inventory, expected: MapExpected, hashes?: Known): RunResult {
  // G2 (Devin on #568): the key's own edition is run when the combination has it; otherwise the edition check below
  // fails in words (BR-6).
  const m = pdfMap(s, form, expected.edition) ?? pdfMap(s, form), fp = fingerprintOf(s, "field_map", form, inv, { ...hashes, edition: m?.form_edition }), lines: Line[] = [];
  const nameOf = (id: string) => family.people.find((p) => p.id === id)?.label ?? id;
  if (!m) return finish([{ person: "", person_label: "", target: form, label: form, expected: "a PDF field map", got: "none", pass: false, why: `${form} has no PDF field map in this combination.` }], fp);
  if (expected.edition !== m.form_edition) return finish([{ person: "", person_label: "", target: "edition", label: `${form} edition`, expected: expected.edition, got: m.form_edition, pass: false, why: `This key is for edition ${expected.edition}; the map is edition ${m.form_edition}. One good edition proves nothing about another.` }], fp);
  const caption = labelsOf(s, m, inv);
  const named = (box: string) => ({ label: caption.get(box) || UNNAMED });
  const c = asCase(s, family);
  const view = caseView(s, c.people, c.answers, c.rows, "agent", c.today, c.groups);
  for (const p of family.people) {
    const want = own(expected.people, p.id);
    // Break B1 (edition in use, P-32): the coverage of the key's own edition (m), never the edition cases fill now: the
    // boxes compared are the boxes of the map under test.
    const cov = formCoverage(s, c.people, c.answers, c.rows, form, p.id, c.today, m.form_edition);
    // Devin review (PR #513): a form whose condition cannot be told for this family (a fact it reads is missing) is
    // never a pass: the family must settle whether the form applies.
    if (cov && cov.applies === "cannot_tell") { lines.push({ person: p.id, person_label: p.label, target: form, label: `${form} for ${p.label}`, expected: want ? "applies" : "does not apply", got: "cannot tell", pass: false, why: `Whether ${form} applies to ${p.label} cannot be told: the family has no answer for ${(cov as { missing?: string[] }).missing?.join(", ") || "a fact its condition reads"}.` }); continue; }
    const applies = !!cov && cov.applies !== false;
    if (!applies) {
      if (want) lines.push({ person: p.id, person_label: p.label, target: form, label: `${form} for ${p.label}`, expected: "applies", got: "does not apply", pass: false, why: `${form} does not apply to ${p.label} in this combination.` });
      continue;
    }
    const { values, boxes } = formValues(s, m, inv, markNothingRecorded(cov!.boxes as BoxRow[], view, s.placements as GatePlacement[]));
    const why = new Map(boxes.map((x) => [x.box, x.why ? inWords(x.why) : x.why]));
    for (const [box, exp] of Object.entries(want ?? {})) {
      const got = values[box] ?? "";
      lines.push({ person: p.id, person_label: p.label, target: box, ...named(box), expected: exp, got, pass: got === exp, ...(got !== exp && why.get(box) ? { why: why.get(box) } : {}) });
    }
    for (const [box, got] of Object.entries(values)) if (!want || !(box in want)) lines.push({ person: p.id, person_label: nameOf(p.id), target: box, ...named(box), expected: "(not in the key)", got, pass: false, why: want ? "written, not expected: add it to the key or fix the field map" : `${form} applies to ${p.label} but the key has no expected values for them` });
  }
  return finish([...gone(family, expected), ...lines].map((l) => (l.pass ? l : { ...l, says: `${form}, ${l.label}${l.person_label ? ` (${l.person_label})` : ""}: expected ${l.expected === "(not in the key)" ? "nothing (not in the key)" : `'${l.expected}'`}, got '${l.got}'` })), fp);
}

/** Break M2: expected values for a person the family no longer has (or who stopped travelling, for rules) fail, never
 *  silently skipped. */
function gone(family: Family, expected: Expected, travelling = false): Line[] {
  return Object.keys(expected.people).filter((id) => { const p = family.people.find((x) => x.id === id); return !p || (travelling && p.applies === false); })
    .map((id) => ({ person: id, person_label: id, target: "person", label: "Person", expected: "in the family", got: "not in the family", pass: false, why: `The key has expected values for "${id}", who is not ${travelling ? "a travelling person" : "a person"} of the family ${family.label} now: change the key or the family.` }));
}

/** BR-3, BR-4: a rule set run: the combination's eligibility rules for each travelling person (engine/runtime/
 *  eligibility.ts assess, the one a case uses; C6.9 BR-7); a travelling person with no expected result fails. */
export function runRuleSet(s: Snapshot, family: Family, expected: RuleExpected, hashes?: Known): RunResult {
  const fp = fingerprintOf(s, "rule_set", "eligibility", null, hashes), lines: Line[] = [];
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

