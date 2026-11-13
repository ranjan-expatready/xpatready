// The common renderer: one pure function from a stored configuration snapshot (draft or released) plus the people of
// a combination and any known facts, to the questionnaire, document checklist, forms and form coverage. Nothing here
// names a form, box, document or question; every screen that shows these reads this output. Conditions use the
// team's closed operator vocabulary through contracts/rules.ts (deterministic; no AI call per answer).
import { CALCULATIONS, evaluate, type PredicateNode, type Truth } from "../../contracts/rules.ts";
import type { Snapshot } from "./snapshot.ts";
import { documentFacts, SIGNED_SCAN } from "./sources.ts";
import { lineOf } from "./channels.ts";
import { pdfMapInUse } from "./programs.ts";
import { factName } from "./fact-name.ts";
import { NEVER_ASKED, NotWorkedOut } from "./not-worked-out.ts";

// SH3 (P-258): who a line, a condition, a box and a signature are about comes from the one resolver (engine/resolver.ts,
// contract contracts/resolver.ts); its functions are re-exported here for their callers.
import { aboutOf, conditionSubjects, factsOf, formSigners, isFilingFact, kkey, lineHolders, peopleFor, signsForOthers, subjectsFor, type Known, type Person } from "./resolver.ts";
import { FILING, PRINCIPAL_CHILDREN_WHEN, ROLE } from "../contracts/resolver.ts";
import { isListRelation, listBoxWords, relativeOf } from "./runtime/relatives.ts";
export { aboutOf, conditionSubjects, formSigners, kkey, lineHolders, peopleFor, signsForOthers, subjectsFor };
export type { Known, Person, Role } from "./resolver.ts";

/** A line's condition for one holder: true when it holds on any of its subjects, false when it fails on all, else
 *  cannot tell (with the missing facts of the first undecided subject). */
export function lineCondition(s: Snapshot, known: Known, people: Person[], holder: string, tree: { subjectKind?: string } | null | undefined): Cond & { about?: string; document?: true; nobody?: string } {
  if (!tree) return { applies: true, missing: [] };
  const subjects = conditionSubjects(people, holder, tree.subjectKind);
  if (subjects === "document") return { applies: "cannot_tell", missing: [], document: true };
  if (!subjects.length) return { applies: false, missing: [], nobody: tree.subjectKind === "SPOUSE" ? "spouse or partner" : "children" };
  const rs = subjects.map((about) => ({ about, ...evalCondition(s, known, tree, about) }));
  if (rs.some((r) => r.applies === true)) return { applies: true, missing: [] };
  const open = rs.find((r) => r.applies !== false);
  return open ? { applies: "cannot_tell", missing: open.missing, about: open.about } : { applies: false, missing: [] };
}

export type Cond = { applies: Truth; missing: string[] };
export function evalCondition(s: Snapshot, known: Known, tree: any, about: string): Cond {
  if (!tree) return { applies: true, missing: [] };
  const { subjectKind: _k, ...node } = tree;
  const text = JSON.stringify(node);
  const derived = (s.derived_fields ?? []).filter((d: any) => d.executable && CALCULATIONS[d.calculation] && text.includes(`"${d.id}"`));
  try { const e = evaluate(node as PredicateNode, factsOf(known, about), derived); return { applies: e.result, missing: e.missing }; }
  catch (e) { return { applies: "cannot_tell", missing: [`(not executable: ${(e as Error).message.slice(0, 80)})`] }; }
}


export type Coverage = "confirmed fact" | "answered on screen" | "document reading" | "client question" | "client profile" | "staff working view" | "unresolved"
  /** B86: set on a case's copy only (engine/runtime/forms.ts formCoverage), never by render. */
  | "not needed";
export type BoxRow = { box: string; caption: string; fact: string | null; meaning: string | null; about: string | null; about_label: string; row: number | null; coverage: Coverage; detail: string; value?: unknown; transform?: string | null; origin?: string;
  /** C7.2 cause 3 (set on a case copy only, engine/runtime/forms.ts markNothingRecorded): a derived "is anything recorded?"
   *  Yes/No whose facts sit in a repeating group with no entries and a confirmed "none apply". */
  nothing_recorded?: true;
  /** Review M1 on #1620 (QA-415): a worked-out fact the case cannot work out for this person yet: why, in words. The form
   *  field is written by hand with it (engine/form-values.ts), never blank in silence (engine/not-worked-out.ts). */
  by_hand?: string;
  /** QA-395 (set on a case copy only, engine/runtime/forms.ts markNothingRecorded, samples/recorded-counts.json): a "recorded"
   *  Yes/No whose form counts only some entries: true or false as the entries count, null when a person must decide. */
  counted?: boolean | null };

/** S5: a line with a minimum age applies to a person once they have reached it on `today`; until their date of birth
 *  is known it cannot be told (and the date of birth is asked, as a deciding question). QA-221 (ruling C): on a line for
 *  "the principal applicant, a spouse or partner, and each dependent child 18 or older" the age gates dependent children
 *  only; the principal applicant and a spouse or partner fill it at any age (IMM 5257 SCH1 (09-2023) p. 1). */
const BIRTH = "person.date_of_birth";
const ADULT_CHILDREN = "principal_partner_adult_children";
function ageGate(known: Known, about: string, minAge: number | null | undefined, today: Date, role?: string, who?: string): Cond {
  if (!minAge || about === FILING) return { applies: true, missing: [] };
  if (who === ADULT_CHILDREN && role !== ROLE.child) return { applies: true, missing: [] };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(known.get(kkey(about, BIRTH))?.value ?? ""));
  if (!m) return { applies: "cannot_tell", missing: [BIRTH] };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age--;
  return { applies: age >= minAge, missing: [] };
}
/** BK-16 (P-490; contracts/resolver.ts PRINCIPAL_CHILDREN_WHEN): on a "principal, and each child while its condition
 *  holds" line the condition is never read for the principal applicant, and a child gets the form only while it holds
 *  for them. No condition on the line, a No, or no answer yet each give that child no form: never an error and never
 *  "cannot tell". An unanswered rule is kept as `pending`, so its question is still asked of the child. */
function childrenWhen(rule: Cond & { about?: string }, role: string | undefined, hasCondition: boolean): { rule: Cond & { about?: string }; pending: (Cond & { about?: string }) | null } {
  if (role !== ROLE.child) return { rule: { applies: true, missing: [] }, pending: null };
  if (!hasCondition) return { rule: { applies: false, missing: [] }, pending: null };
  if (rule.applies === true) return { rule, pending: null };
  return { rule: { applies: false, missing: [] }, pending: rule.applies === "cannot_tell" ? rule : null };
}
/** BK-16: the reason words of such a line, for one holder. */
function childrenWhenWhy(plain: string | null | undefined, role: string | undefined, hasCondition: boolean, decided: Cond, pending: boolean): string {
  const when = plain ?? "its condition holds";
  if (role !== ROLE.child) return hasCondition ? `always for the principal applicant; for a child, only when ${when}` : "always for the principal applicant";
  if (!hasCondition) return "for a child, only when the line's condition holds, and the line has no condition";
  return decided.applies === true ? `for a child, when ${when}` : `for a child, only when ${when}${pending ? " (not answered yet)" : ""}`;
}
/** Both must hold: false wins, then cannot tell (with both lists of missing facts). */
const both = (a: Cond, b: Cond): Cond => a.applies === false || b.applies === false ? { applies: false, missing: [] } : a.applies === "cannot_tell" || b.applies === "cannot_tell" ? { applies: "cannot_tell", missing: [...a.missing, ...b.missing] } : { applies: true, missing: [] };
/** S5 (challenge M1): a conditional line whose "Only if" is words with no rule yet never applies by default: it cannot
 *  be told until a person turns the words into a rule (release refuses it until then). */
export const NO_RULE = "(no rule yet)";
/** QA-82: a field's name in words from its key ("person.official_language" → "Official language"), as Shared library
 *  names fields. A question with no written wording shows this, never the field's meaning (its definition). */
// QA-172: moved to its own pure module so the web can use it; kept exported here for every existing caller.
export { factName };
export const wordsOnly = (line: { status?: string; condition?: unknown; condition_plain?: string | null }) => line.status === "conditional" && !line.condition;

/** `editions` (break B1 on the edition-in-use fix): the PDF edition to read per form, when a caller tests one edition on
 *  purpose (an answer key runs its own edition, engine/answer-keys.ts runFieldMap); every other reader takes the
 *  edition in use (P-32, pdfMapInUse). An edition the snapshot lacks falls back to the edition in use. */
export function render(s: Snapshot, people: Person[], known: Known, opts: { documentFacts?: Map<string, string[]>; today?: Date; editions?: ReadonlyMap<string, string> } = {}) {
  const today = opts.today ?? new Date();
  const field = new Map(s.canonical_fields.map((f) => [f.id, f]));
  const place = new Map<string, any>();
  for (const p of s.placements) if (!place.has(p.fact)) place.set(p.fact, p);
  // C4.2 (P-91): a pulled question's section not chosen here is named by its title too (snapshot section_titles).
  const sectionTitle = new Map([...(s.section_titles ?? []), ...s.sections].map((x) => [x.id, x.title]));
  const sectionOrder = new Map(s.sections.map((x, i) => [x.id, i]));
  const label = (about: string | null) => {
    if (!about) return "nobody on this case";
    if (about === FILING) return "The application";
    // QA-76: a form that reads the representative when no representative is on the case names the role, never its key.
    if (about === "representative") return "The representative";
    const [id, rel] = about.split("/");
    const p = people.find((x) => x.id === id);
    if (!rel) return p?.label ?? about;
    return `${p?.label ?? id}: ${rel.replace("_", " ")}`;
  };
  // Which supported document type can supply a fact (DocumentType.suppliesFacts; a reader profile, Proposal): per person
  // (W1-15 challenge M3), from the checklist lines that name that person; `opts.documentFacts` adds by fact for everyone.
  const perPerson = documentFacts(s, people);
  const extra = opts.documentFacts ?? new Map<string, string[]>();
  const docsFor = (about: string, fact: string) => { const names = [...(perPerson.get(about)?.get(fact) ?? []).map((x) => x.name), ...(extra.get(fact) ?? [])]; return names.length ? [...new Set(names)] : undefined; };

  // ------------------------------------------------------------ forms for each person
  // C7.7 (SH3 R3, contract item (a)): a form's condition is decided like a document line's (lineCondition): CASE on the
  // filing; PRINCIPAL, SPOUSE or DEPENDENT on the holder when the holder has that role, else on every person with it
  // (none → the form is not needed); otherwise on the holder. Whose answers each part waits for is kept for the deciders.
  const formWaits = new Map<string, { rule: Cond & { about?: string }; age: Cond; pending?: (Cond & { about?: string }) | null }>();
  const forms = s.forms.filter((f) => f.form_kind !== "document" || true).flatMap((f) => {
    return subjectsFor(people, f.who).map((person) => {
      const role = people.find((p) => p.id === person)?.role;
      const read: Cond & { about?: string } = wordsOnly(f) ? { applies: "cannot_tell", missing: [NO_RULE] } : lineCondition(s, known, people, person, f.condition);
      // BK-16: a "principal, and each child while its condition holds" line decides its rule by role first.
      const gated = f.who === PRINCIPAL_CHILDREN_WHEN ? childrenWhen(read, role, !!f.condition) : null;
      const rule = gated?.rule ?? read;
      const age = ageGate(known, person, f.min_age, today, role, f.who);
      const c = both(rule, age);
      formWaits.set(`${f.form_number}|${person}`, { rule, age, pending: gated?.pending ?? null });
      const why = gated ? childrenWhenWhy(f.condition_plain, role, !!f.condition, rule, !!gated.pending) : wordsOnly(f) ? `Cannot tell yet: no rule ("${f.condition_plain ?? "only if"}" is in words only)` : f.condition_plain ?? (f.status === "always" ? "always required for this combination" : "conditional");
      return { form: f.form_number, title: f.title, form_kind: f.form_kind ?? "data_form", person, person_label: label(person), status: f.status, applies: c.applies, missing: c.missing, why: f.min_age ? (f.who === ADULT_CHILDREN ? (people.find((p) => p.id === person)?.role === ROLE.child ? `${why}; for a dependent child, from age ${f.min_age}` : `${why}; at any age for the principal applicant and a spouse or partner`) : `${why}; from age ${f.min_age}`) : why, origin: f.origin, no_rule: wordsOnly(f), ...((f as { added?: unknown }).added ? { added: true as const } : {}) };
    });
  });

  // ------------------------------------------------------------ coverage of each box, per applicable form
  const needs = new Map<string, { fact: string; about: string; rows: Set<number>; forms: Set<string>; boxes: number; maybe: boolean }>();
  const coverage = forms.filter((f) => f.applies !== false).map((f) => {
    // P-32: the PDF edition in use (the newest mapped), as the fill writes it; else the line's online map, as before.
    const asked = opts.editions?.get(f.form);
    const map = (asked ? s.field_maps.find((m) => m.form_number === f.form && m.channel !== "ONLINE" && m.form_edition === asked) : undefined) ?? pdfMapInUse(s.field_maps, f.form) ?? s.field_maps.find((m) => m.form_number === f.form);
    if (!map) return { form: f.form, person: f.person, person_label: f.person_label, applies: f.applies, edition: null, boxes: [] as BoxRow[], counts: {} as Record<string, number>, mapped: 0, unresolved_boxes: 0 };
    const boxes: BoxRow[] = [];
    let unresolvedBoxes = 0;
    for (const e of map.entries) {
      if (e.outcome === "unresolved") { unresolvedBoxes++; boxes.push({ box: e.data_path, caption: e.caption ?? "", fact: null, meaning: null, about: null, about_label: "—", row: e.row, coverage: "unresolved", detail: `form field needs review: ${e.unresolved_reason ?? "unresolved"}`.slice(0, 220), origin: e.origin }); continue; }
      if (e.outcome !== "mapped" || !e.fact) continue;
      const p = place.get(e.fact);
      const about = aboutOf(people, f.person, e, p);
      const base = { box: e.data_path, caption: e.caption ?? "", fact: e.fact, meaning: field.get(e.fact)?.meaning ?? null, about, about_label: label(about), row: e.row ?? null, transform: e.transform, origin: e.origin };
      if (!about) { boxes.push({ ...base, coverage: "unresolved", detail: "that person is not part of this combination; the form field stays blank" }); continue; }
      // B155 (QA-153 probe 2, 8 Nov): a `subject_child` box's row picks the child (R4: the case's n-th child), so the
      // child's own answer, which has no row, is what it reads: the second child's boxes read the second child's facts.
      // Review m2 on #1367: only for a fact the child answers once; a repeating one keeps the map's row (IMM 5562's trips).
      const factRow = e.person === "subject_child" && p?.repeats !== "per_row" ? null : e.row;
      const k = kkey(about, e.fact, factRow), n = needs.get(`${about}|${e.fact}`) ?? { fact: e.fact, about, rows: new Set<number>(), forms: new Set<string>(), boxes: 0, maybe: false };
      // C7.8 (Q1; review M1 on #1248): a form the case officer added asks nothing new: it joins only a question the case's
      // own forms already ask (added lines come after the release's, withAdditions), and its other boxes stay "Not on file".
      if (!("added" in f && f.added) || needs.has(`${about}|${e.fact}`)) {
        if (factRow !== null && factRow !== undefined) n.rows.add(factRow);
        n.forms.add(f.form); n.boxes++; if (f.applies === "cannot_tell") n.maybe = true; needs.set(`${about}|${e.fact}`, n);
      }
      const kv = known.get(k) ?? (factRow === 0 ? known.get(kkey(about, e.fact)) : undefined);
      // Review M1 on #1620: a worked-out fact not worked out yet keeps its reason as text on the row (by hand, never blank).
      if (kv?.value instanceof NotWorkedOut) { boxes.push({ ...base, coverage: "confirmed fact", detail: kv.source, value: null, by_hand: kv.value.why }); continue; }
      if (kv) { boxes.push({ ...base, coverage: kv.status === "confirmed" ? "confirmed fact" : "answered on screen", detail: kv.source, value: kv.value }); continue; }
      if (!field.has(e.fact)) { boxes.push({ ...base, coverage: "unresolved", detail: "the form field reads a field that is not in the library" }); continue; }
      const docs = docsFor(about, e.fact);
      if (p?.collected_from === "verified_document" || (docs && !p)) { boxes.push({ ...base, coverage: docs ? "document reading" : "unresolved", detail: docs ? `a supported document can supply it: ${docs.join(", ")}` : "collected from a document, but no supported document type supplies it" }); continue; }
      if (!p) { boxes.push({ ...base, coverage: "unresolved", detail: "no question placement: nobody is asked for this value yet" }); continue; }
      const cov: Coverage = p.collected_from === "client_questionnaire" ? "client question" : p.collected_from === "profile_record" || p.collected_from === "existing_record" ? "client profile" : "staff working view";
      // B155: a list relative's box (a brother or sister, row n) says whose entry it waits for, never the section a
      // placement happens to sit in ("Your parent 1").
      const rel = relativeOf(about), where = rel && isListRelation(rel.relation) ? listBoxWords(people.find((x) => x.id === rel.owner)?.label ?? rel.owner, rel.relation, e.row) : sectionTitle.get(p.section_id) ?? p.section_id;
      boxes.push({ ...base, coverage: cov, detail: `${where}${docs ? `; a supported document can also supply it (${docs.join(", ")})` : ""}` });
    }
    const counts: Record<string, number> = {};
    for (const b of boxes) counts[b.coverage] = (counts[b.coverage] ?? 0) + 1;
    return { form: f.form, person: f.person, person_label: f.person_label, applies: f.applies, edition: map.form_edition, boxes, counts, mapped: boxes.filter((b) => b.fact).length, unresolved_boxes: unresolvedBoxes };
  });

  // ------------------------------------------------------------ conditions: facts that decide what applies
  const deciders = new Map<string, { fact: string; about: string; decides: Set<string> }>();
  const addDecider = (missing: string[], about: string, what: string) => { for (const m of missing) { if (m.startsWith("(")) continue; const a = isFilingFact(m, place.get(m)) ? FILING : about; const k = `${a}|${m}`; const d = deciders.get(k) ?? { fact: m, about: a, decides: new Set<string>() }; d.decides.add(what); deciders.set(k, d); } };
  // QA-149: an answered fact that a condition reads still decides it, decided or not, so it stays on the case and can be
  // changed (a child's "travelling alone" answered yes added a line, then the question was gone and could not be undone).
  // A calculated field is kept by the answers it is worked out from. Unanswered facts a decided condition does not need
  // are not asked (they decide nothing now).
  const inputsOf = new Map(((s.derived_fields ?? []) as { id: string; inputs?: string[]; reference?: string }[]).map((d) => [d.id, [...(d.inputs ?? []), ...(d.reference ? [d.reference] : [])]]));
  const readsOf = (tree: unknown): string[] => {
    const out = new Set<string>(), walk = (f: string) => { if (out.has(f)) return; out.add(f); for (const x of inputsOf.get(f) ?? []) walk(x); };
    for (const m of JSON.stringify(tree ?? null).matchAll(/"field":"([^"]+)"/g)) walk(m[1]);
    return [...out].filter((f) => !inputsOf.has(f)); // a calculated field is asked through its inputs, never itself
  };
  // Kept apart from `deciders` (review M2): they are asked, but are not "deciding questions" still to answer (the
  // Preview's count and list stay as on main).
  const answeredDeciders = new Map<string, { fact: string; about: string; decides: Set<string> }>();
  const keepAnswered = (tree: unknown, subjects: string[] | "document", what: string) => {
    if (!tree || subjects === "document") return;
    const reads = readsOf(tree);
    for (const about of subjects) for (const f of reads) {
      // C7.7 (contract item (c)): an answer is kept where it is stored: the placement's subject (R5 with the placement),
      // else by the id rule, so an answer saved on the person before its placement became once per case stays (r2-m1).
      const a = [isFilingFact(f, place.get(f)) ? FILING : about, isFilingFact(f) ? FILING : about].find((x) => known.has(kkey(x, f)));
      if (!a) continue;
      const k = kkey(a, f);
      const d = answeredDeciders.get(k) ?? { fact: f, about: a, decides: new Set<string>() }; d.decides.add(what); answeredDeciders.set(k, d);
    }
  };
  for (const f of forms) if (f.applies === "cannot_tell") {
    const w = formWaits.get(`${f.form}|${f.person}`)!, what = `whether ${f.form} applies to ${f.person_label}`;
    if (w.rule.applies === "cannot_tell") addDecider(w.rule.missing, w.rule.about ?? f.person, what);
    if (w.age.applies === "cannot_tell") addDecider(w.age.missing, f.person, what);
  }
  // BK-16: a child not yet answered for a "principal, and each child while its condition holds" line has no form, but
  // the question that decides it is still asked of them (else nothing would ever give them the form).
  for (const f of forms) {
    const w = formWaits.get(`${f.form}|${f.person}`)!;
    if (w.pending?.applies === "cannot_tell") addDecider(w.pending.missing, w.pending.about ?? f.person, `whether ${f.form} applies to ${f.person_label}`);
  }
  // BK-16 review m2: on a "principal, and each child while its condition holds" line the condition decides children only,
  // so an answer is kept as deciding it for a child, never for the principal (rule R1: never read for them).
  const decidedBy = (f: { who: string }, person: string) => f.who !== PRINCIPAL_CHILDREN_WHEN || people.find((p) => p.id === person)?.role === ROLE.child;
  for (const f of s.forms) if (f.condition) for (const row of forms.filter((x) => x.form === f.form_number && decidedBy(f, x.person))) keepAnswered(f.condition, conditionSubjects(people, row.person, f.condition.subjectKind), `whether ${f.form_number} applies to ${row.person_label}`);

  // M3-S2 (P-425): a "Who can be in this application" line's rule that adds a filing decides it for each person of the
  // line who applies (engine/runtime/added-filings.ts reads the same rule), so its question is asked of them and kept once
  // answered, like a form's or a document line's condition.
  for (const l of (s.combination?.participants ?? []) as { role: string; addsFiling?: { filing?: unknown; condition?: { subjectKind?: string } } | null }[]) {
    const tree = l?.addsFiling?.condition;
    if (!tree || typeof tree !== "object") continue;
    for (const person of people.filter((x) => x.role === l.role && x.applies)) {
      const what = `whether ${person.label} files their own ${String(l.addsFiling!.filing ?? "application").toLowerCase()} application`;
      const c = lineCondition(s, known, people, person.id, tree);
      if (c.applies === "cannot_tell") addDecider(c.missing, c.about ?? person.id, what);
      keepAnswered(tree, conditionSubjects(people, person.id, tree.subjectKind), what);
    }
  }

  // ------------------------------------------------------------ document checklist
  // Q2 (#325): whose list a line is on comes from its own "who" (lineHolders); its condition is decided on its subject.
  const checklist = s.document_requirements.flatMap((d) => {
    return lineHolders(people, d.who).map((person) => {
      const c = lineCondition(s, known, people, person, d.condition);
      if (c.applies === "cannot_tell") addDecider(c.missing, c.about ?? person, `whether "${d.document_type}" is needed`);
      keepAnswered(d.condition, d.condition ? conditionSubjects(people, person, d.condition.subjectKind) : [], `whether "${d.document_type}" is needed`);
      return { lineage: d.lineage, requirement: d.document_type, document_type_key: (d as { document_type_key?: string }).document_type_key ?? null, person, person_label: label(person), base_or_conditional: d.base_or_conditional, provided_by: d.provided_by, applies: c.applies, missing: c.missing,
        status: c.applies === false ? "Not needed" : c.applies === "cannot_tell" ? "Cannot tell yet" : "Needed", why: d.condition_plain ?? (d.base_or_conditional === "base" ? "required for every person it names" : d.note ?? ""), source_quote: d.source_quote, origin: d.origin, item_status: d.status };
    });
  });

  // C3.11 (PR #113 review M2): a form line filed as PDF upload, signed by hand and scanned, asks each person who signs it
  // for the signed scan, by the one "Signed by" rule (formSigners, shared with the Documents tab's sources.ts signedScanLines), so Preview by
  // person and the case list it. Needed when the form applies to someone the signer signs for; never stored.
  for (const f of s.forms as { form_number: string; who: string; form_kind?: string | null; status?: string; channel?: string; signature?: string; signed_by?: string }[]) {
    const { channel, signature } = lineOf(f);
    if (channel !== "PDF_UPLOAD" || signature !== "HAND_SCANNED" || (f.form_kind ?? "data_form") === "document") continue;
    const formRows = forms.filter((x) => x.form === f.form_number);
    const bySigner = new Map([...formSigners(people, f.who, f.signed_by)].map(([id, about]) => [id, formRows.filter((x) => about.includes(x.person))] as const));
    for (const [person, rows] of bySigner) {
      const applies = rows.some((x) => x.applies === true) ? true : rows.some((x) => x.applies === "cannot_tell") ? "cannot_tell" as const : false;
      if (!rows.length) continue;
      const forOthers = signsForOthers(person, rows.map((x) => x.person));
      checklist.push({ lineage: `${SIGNED_SCAN}:${f.form_number}`, requirement: `${f.form_number} signed by hand and scanned`, document_type_key: `${SIGNED_SCAN}.${f.form_number}`, person, person_label: label(person),
        base_or_conditional: f.status === "always" ? "base" : "conditional", provided_by: "client", applies, missing: applies === "cannot_tell" ? [...new Set(rows.flatMap((x) => x.missing))] : [],
        status: applies === false ? "Not needed" : applies === "cannot_tell" ? "Cannot tell yet" : "Needed",
        why: `${f.form_number} is filed as PDF upload, signed by hand and scanned: it is printed, signed by hand${forOthers ? " (for the family members it is about)" : ""}, scanned and uploaded.`,
        source_quote: null, origin: "FORM_LINE", item_status: "AUTOMATIC" } as (typeof checklist)[number]);
    }
  }

  // ------------------------------------------------------------ rules (plain effects), evaluated per subject
  const rules = s.rules.map((r) => {
    const kind = r.when?.subjectKind;
    // R2: a rule's condition subject kind (CASE → the filing, a role → its people) wins over its "for whom".
    const subjects = subjectsFor(people, r.for_whom, kind === "EACH_APPLICANT" || kind === "EACH_PERSON" ? undefined : kind);
    const results = subjects.map((person) => { const c = evalCondition(s, known, r.when, person); if (c.applies === "cannot_tell") addDecider(c.missing, person, r.then); keepAnswered(r.when, [person], r.then); return { person, person_label: label(person), applies: c.applies, missing: c.missing }; });
    return { id: r.id, then: r.then, when_plain: r.when_plain, for_whom: r.for_whom, results, origin: r.origin, item_status: r.status };
  });

  // ------------------------------------------------------------ questionnaire: what each person is asked
  type Q = { fact: string; label: string; asked: boolean; meaning: string; value_type: string; about: string; about_label: string; section: string; section_title: string; collected_from: string; status: "answered" | "confirmed" | "needs an answer" | "may be needed" | "hidden by a condition"; value?: unknown; why: string; rows: number[]; decides: string[]; rule_only: boolean; required: boolean };
  const questions: Q[] = [];
  const seen = new Set<string>();
  const pushQ = (fact: string, about: string, why: string, rows: number[], decides: string[], maybe: boolean) => {
    const key = `${about}|${fact}`;
    if (seen.has(key)) { const q = questions.find((x) => `${x.about}|${x.fact}` === key); if (q) for (const d of decides) if (!q.decides.includes(d)) q.decides.push(d); return; }
    seen.add(key);
    // QA-415 (B78): a fact the case always works out is never a question, here (Preview) or on a case.
    if (NEVER_ASKED.has(fact)) return;
    const p = place.get(fact), f = field.get(fact);
    if (!p) return;
    let status: Q["status"] = maybe ? "may be needed" : "needs an answer", required = true;
    if (p.condition) {
      const subject = about === FILING ? FILING : about.split("/")[0];
      const c = evalCondition(s, known, p.condition, subject);
      const eff = p.condition_effect ?? "SHOW";
      if ((eff === "SHOW" && c.applies !== true) || (eff === "HIDE" && c.applies === true)) { status = "hidden by a condition"; why = `${p.condition_plain ?? "condition"} (${c.applies === "cannot_tell" ? `waiting for ${c.missing.join(", ")}` : String(c.applies)})`; }
      if (eff === "OPTIONAL" && c.applies === true) required = false;
      // Grounding audit finding 3: a question's own condition is decided by other answers; those questions are asked
      // (for the same person, or once for the case) so the dependent question can become reachable.
      if (c.applies === "cannot_tell") addDecider(c.missing, subject, `whether "${p.question_text || f?.meaning || fact}" is asked`);
      keepAnswered(p.condition, [subject], `whether "${p.question_text || f?.meaning || fact}" is asked`);
    }
    const kv = known.get(kkey(about, fact)) ?? (rows.length ? known.get(kkey(about, fact, rows[0])) : undefined);
    if (kv && status !== "hidden by a condition") status = kv.status === "confirmed" ? "confirmed" : "answered";
    questions.push({ fact, label: p.question_text || f?.meaning || fact, asked: !!p.question_text?.trim(), meaning: f?.meaning ?? fact, value_type: f?.value_type ?? "text", about, about_label: label(about), section: p.section_id, section_title: sectionTitle.get(p.section_id) ?? p.section_id, collected_from: p.collected_from, status, value: kv?.value, why, rows, decides, rule_only: !needs.has(key), required });
  };
  for (const d of [...deciders.values(), ...answeredDeciders.values()]) pushQ(d.fact, d.about, `decides ${[...d.decides].slice(0, 3).join("; ")}`, [], [...d.decides], false);
  for (const n of needs.values()) pushQ(n.fact, n.about, `read by ${[...n.forms].join(", ")} (${n.boxes} form field${n.boxes > 1 ? "s" : ""})`, [...n.rows].sort(), [], n.maybe);
  // A section the row selects is a line on the row (SA-1B-58): its placed questions are asked even when no form reads
  // them yet, each with its reason (SA-1B-59). Once per case, or for each person who applies.
  const applicants = subjectsFor(people, "each_applicant"); // R2
  const selected = new Set(s.sections.map((x) => x.id));
  for (const p of s.placements) if (selected.has(p.section_id) && !p.rule_only) for (const about of isFilingFact(p.fact, p) ? [FILING] : applicants)
    pushQ(p.fact, about, `asked in "${sectionTitle.get(p.section_id) ?? p.section_id}", a section this row selects`, [], [], false);
  // Deciding questions last, repeatedly: a question's condition can add deciders, whose own conditions can add more.
  // "seen" stops repeats, so a circular chain ends (and the validator reports it before release).
  for (let pass = 0; pass < 20; pass++) {
    const before = seen.size;
    for (const d of [...deciders.values(), ...answeredDeciders.values()]) pushQ(d.fact, d.about, `decides ${[...d.decides].slice(0, 3).join("; ")}`, [], [...d.decides], false);
    if (seen.size === before) break;
  }
  // Within a section for one person, the release's placement order (F-R1c-1: "started on" before "ends on"); the label
  // only breaks a tie, so the studio preview and a case list questions the same way.
  const placed = (fact: string) => place.get(fact)?.order ?? Number.MAX_SAFE_INTEGER;
  questions.sort((a, b) => (sectionOrder.get(a.section) ?? 99) - (sectionOrder.get(b.section) ?? 99) || a.about.localeCompare(b.about) || placed(a.fact) - placed(b.fact) || a.label.localeCompare(b.label));

  // ------------------------------------------------------------ checks that the known facts trigger
  // A document_validity check is a rule about a document's dates (engine/runtime/case-checklist.ts), not a predicate.
  const checks = (s.checks ?? []).filter((c) => c.condition && c.group !== "form_native" && c.group !== "document_validity").flatMap((c) => {
    // C7.7 (SH3 R3, contract item (a)): a check is decided for each applicant (R2) on R3's subjects: CASE → the filing;
    // a role → that role's people (none → it never fires); DOCUMENT → a document's contents, not answers (never fires
    // here); otherwise the applicant. Before, every person who applies (an applying representative too) read their own
    // answers, so a principal-only check could fire for a spouse or a child.
    const holders = subjectsFor(people, "each_applicant");
    const per = (holders.length ? holders : [FILING]).map((h) => conditionSubjects(people, h, c.condition?.subjectKind));
    const subjects = [...new Set(per.flatMap((x) => (x === "document" ? [] : x)))];
    return subjects.map((person) => ({ c, person, r: evalCondition(s, known, c.condition, person) })).filter((x) => x.r.applies === true)
      .map(({ c, person }) => ({ id: c.id, severity: c.severity, group: c.group, person, person_label: label(person), applies_to: c.applies_to, message: c.message ?? c.applies_to, illustrative: !!c.illustrative }));
  });

  const unplaced = [...needs.values()].filter((n) => !place.has(n.fact)).map((n) => ({ fact: n.fact, about: n.about, about_label: label(n.about), forms: [...n.forms], in_library: field.has(n.fact) }));
  const total = coverage.reduce((a, c) => { for (const [k, v] of Object.entries(c.counts)) a[k] = (a[k] ?? 0) + v; return a; }, {} as Record<string, number>);
  return {
    people: [{ id: FILING, label: "The application" }, ...people.map((p) => ({ id: p.id, label: p.label, role: p.role, applies: p.applies }))],
    forms, coverage, checklist, rules, questions, checks, unplaced,
    deciders: [...deciders.values()].map((d) => ({ fact: d.fact, about: d.about, about_label: label(d.about), meaning: field.get(d.fact)?.meaning ?? d.fact, value_type: field.get(d.fact)?.value_type ?? "text", decides: [...d.decides] })),
    summary: {
      forms_applying: forms.filter((f) => f.applies === true).length, forms_undecided: forms.filter((f) => f.applies === "cannot_tell").length, forms_not_applying: forms.filter((f) => f.applies === false).length,
      documents_needed: checklist.filter((c) => c.status === "Needed").length, documents_undecided: checklist.filter((c) => c.status === "Cannot tell yet").length, documents_not_needed: checklist.filter((c) => c.status === "Not needed").length,
      questions_to_ask: questions.filter((q) => q.status === "needs an answer" || q.status === "may be needed").length, questions_answered: questions.filter((q) => q.status === "answered" || q.status === "confirmed").length,
      deciding_questions: deciders.size, coverage: total, unplaced: unplaced.length, triggered_checks: checks.length,
    },
  };
}
export type Rendered = ReturnType<typeof render>;
