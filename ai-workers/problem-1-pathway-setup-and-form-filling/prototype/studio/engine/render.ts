// The common renderer: one pure function from a stored configuration snapshot (draft or released) plus the people of
// a combination and any known facts, to the questionnaire, document checklist, forms and form coverage. Nothing here
// names a form, box, document or question; every screen that shows these reads this output. Conditions use the
// team's closed operator vocabulary through contracts/rules.ts (deterministic; no AI call per answer).
import { CALCULATIONS, evaluate, type PredicateNode, type Truth } from "../../contracts/rules.ts";
import type { Snapshot } from "./snapshot.ts";

export type Role = "principal" | "spouse_or_partner" | "child" | "representative" | "parent";
export type Person = { id: string; role: Role; label: string; applies: boolean };
/** Known values: key `${about}|${fact}` or `${about}|${fact}|${row}`. status: confirmed (existing sample record or
 *  staff-verified) or answered (a preview answer typed on screen; never confirmed). */
export type Known = Map<string, { value: unknown; status: "confirmed" | "answered"; source: string }>;
export const kkey = (about: string, fact: string, row?: number | null) => `${about}|${fact}${row === undefined || row === null ? "" : `|${row}`}`;

export function peopleFor(participants: any[]): Person[] {
  const out: Person[] = [];
  for (const p of participants ?? []) {
    const n = Math.max(p.preview ?? p.min ?? 0, 0);
    for (let i = 0; i < n; i++) out.push({ id: n > 1 || p.role === "child" ? `${p.role}-${i + 1}` : p.role, role: p.role, label: n > 1 ? `${p.label} ${i + 1}` : p.label, applies: p.applies !== false });
  }
  return out;
}

const find = (people: Person[], role: Role) => people.filter((p) => p.role === role);
export function subjectsFor(people: Person[], who: string, subjectKind?: string): string[] {
  const principal = find(people, "principal").map((p) => p.id), partner = find(people, "spouse_or_partner").map((p) => p.id), children = find(people, "child").map((p) => p.id);
  const applicants = people.filter((p) => p.applies && p.role !== "representative").map((p) => p.id);
  if (subjectKind === "CASE") return ["case"];
  if (subjectKind === "PRINCIPAL") return principal;
  if (subjectKind === "SPOUSE") return partner;
  if (subjectKind === "DEPENDENT") return children;
  switch (who) {
    case "each_applicant": case "each_adult_18_plus": return applicants;
    case "principal_applicant": return principal;
    case "spouse_or_partner": case "couple_once": return partner;
    case "each_dependent_child": return children;
    case "each_person": return people.filter((p) => p.role !== "representative").map((p) => p.id);
    case "representative": return find(people, "representative").map((p) => p.id);
    case "case": return ["case"];
    default: return [];
  }
}

function factsOf(known: Known, about: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of known) { const [a, f, row] = k.split("|"); if (row === undefined && (a === "case" || a === about)) out[f] = v.value; }
  return out;
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

/** Whose value a box reads, relative to the form's subject (the AI states it relative to the subject; the case decides
 *  who that is). Returns null when that person is not on the case. */
export function aboutOf(people: Person[], subject: string, entry: any, placement: any): string | null {
  const fact: string = entry.fact ?? "";
  if (placement?.repeats === "once_per_case" || fact.startsWith("case.")) return "case";
  if (fact.startsWith("organisation.")) return subject; // the prospective employer of the form's subject (P5 finding D33)
  const subj = people.find((p) => p.id === subject);
  switch (entry.person) {
    case "form_subject": return subject;
    case "subject_spouse_or_partner": {
      if (subj?.role === "principal") return find(people, "spouse_or_partner")[0]?.id ?? null;
      if (subj?.role === "spouse_or_partner") return find(people, "principal")[0]?.id ?? null;
      return null;
    }
    case "subject_child": { const kids = find(people, "child"); const r = entry.row ?? 0; return kids[r]?.id ?? (kids.length ? null : null); }
    case "subject_parent_1": case "subject_parent_2": return `${subject}/${entry.person.slice(8)}`;
    case "subject_sibling": return `${subject}/sibling`;
    case "representative": return find(people, "representative")[0]?.id ?? "representative";
    case "none": case null: case undefined: return "case";
    default: return null;
  }
}

export type Coverage = "confirmed fact" | "answered on screen" | "document reading" | "client question" | "client profile" | "staff working view" | "unresolved";
export type BoxRow = { box: string; caption: string; fact: string | null; meaning: string | null; about: string | null; about_label: string; row: number | null; coverage: Coverage; detail: string; value?: unknown; transform?: string | null; origin?: string };

export function render(s: Snapshot, people: Person[], known: Known, opts: { documentFacts?: Map<string, string[]> } = {}) {
  const field = new Map(s.canonical_fields.map((f) => [f.id, f]));
  const place = new Map<string, any>();
  for (const p of s.placements) if (!place.has(p.fact)) place.set(p.fact, p);
  const sectionTitle = new Map(s.sections.map((x) => [x.id, x.title]));
  const sectionOrder = new Map(s.sections.map((x, i) => [x.id, i]));
  const label = (about: string | null) => {
    if (!about) return "nobody on this case";
    if (about === "case") return "The application";
    const [id, rel] = about.split("/");
    const p = people.find((x) => x.id === id);
    if (!rel) return p?.label ?? about;
    return `${p?.label ?? id}: ${rel.replace("_", " ")}`;
  };
  // Which supported document type can supply a fact (DocumentType.suppliesFacts; a reader profile, Proposal).
  const docFacts = opts.documentFacts ?? new Map<string, string[]>();
  for (const t of s.document_types ?? []) for (const f of t.supplies_facts ?? []) docFacts.set(f, [...new Set([...(docFacts.get(f) ?? []), t.name])]);

  // ------------------------------------------------------------ forms for each person
  const forms = s.forms.filter((f) => f.form_kind !== "document" || true).flatMap((f) => {
    const kind = f.condition?.subjectKind;
    return subjectsFor(people, f.who).map((person) => {
      const c = evalCondition(s, known, f.condition, kind === "CASE" ? "case" : person);
      return { form: f.form_number, title: f.title, form_kind: f.form_kind ?? "data_form", person, person_label: label(person), status: f.status, applies: c.applies, missing: c.missing, why: f.condition_plain ?? (f.status === "always" ? "always required for this combination" : "conditional"), origin: f.origin };
    });
  });

  // ------------------------------------------------------------ coverage of each box, per applicable form
  const needs = new Map<string, { fact: string; about: string; rows: Set<number>; forms: Set<string>; boxes: number; maybe: boolean }>();
  const coverage = forms.filter((f) => f.applies !== false).map((f) => {
    const map = s.field_maps.find((m) => m.form_number === f.form);
    if (!map) return { form: f.form, person: f.person, person_label: f.person_label, applies: f.applies, edition: null, boxes: [] as BoxRow[], counts: {} as Record<string, number>, mapped: 0, unresolved_boxes: 0 };
    const boxes: BoxRow[] = [];
    let unresolvedBoxes = 0;
    for (const e of map.entries) {
      if (e.outcome === "unresolved") { unresolvedBoxes++; boxes.push({ box: e.data_path, caption: e.caption ?? "", fact: null, meaning: null, about: null, about_label: "—", row: e.row, coverage: "unresolved", detail: `box needs review: ${e.unresolved_reason ?? "unresolved"}`.slice(0, 220), origin: e.origin }); continue; }
      if (e.outcome !== "mapped" || !e.fact) continue;
      const p = place.get(e.fact);
      const about = aboutOf(people, f.person, e, p);
      const base = { box: e.data_path, caption: e.caption ?? "", fact: e.fact, meaning: field.get(e.fact)?.meaning ?? null, about, about_label: label(about), row: e.row ?? null, transform: e.transform, origin: e.origin };
      if (!about) { boxes.push({ ...base, coverage: "unresolved", detail: "that person is not part of this combination; the box stays blank" }); continue; }
      const k = kkey(about, e.fact, e.row), n = needs.get(`${about}|${e.fact}`) ?? { fact: e.fact, about, rows: new Set<number>(), forms: new Set<string>(), boxes: 0, maybe: false };
      if (e.row !== null && e.row !== undefined) n.rows.add(e.row);
      n.forms.add(f.form); n.boxes++; if (f.applies === "cannot_tell") n.maybe = true; needs.set(`${about}|${e.fact}`, n);
      const kv = known.get(k) ?? (e.row === 0 ? known.get(kkey(about, e.fact)) : undefined);
      if (kv) { boxes.push({ ...base, coverage: kv.status === "confirmed" ? "confirmed fact" : "answered on screen", detail: kv.source, value: kv.value }); continue; }
      if (!field.has(e.fact)) { boxes.push({ ...base, coverage: "unresolved", detail: "the box reads a field that is not in the library" }); continue; }
      const docs = docFacts.get(e.fact);
      if (p?.collected_from === "verified_document" || (docs && !p)) { boxes.push({ ...base, coverage: docs ? "document reading" : "unresolved", detail: docs ? `a supported document can supply it: ${docs.join(", ")}` : "collected from a document, but no supported document type supplies it" }); continue; }
      if (!p) { boxes.push({ ...base, coverage: "unresolved", detail: "no question placement: nobody is asked for this value yet" }); continue; }
      const cov: Coverage = p.collected_from === "client_questionnaire" ? "client question" : p.collected_from === "profile_record" || p.collected_from === "existing_record" ? "client profile" : "staff working view";
      boxes.push({ ...base, coverage: cov, detail: `${sectionTitle.get(p.section_id) ?? p.section_id}${docs ? `; a supported document can also supply it (${docs.join(", ")})` : ""}` });
    }
    const counts: Record<string, number> = {};
    for (const b of boxes) counts[b.coverage] = (counts[b.coverage] ?? 0) + 1;
    return { form: f.form, person: f.person, person_label: f.person_label, applies: f.applies, edition: map.form_edition, boxes, counts, mapped: boxes.filter((b) => b.fact).length, unresolved_boxes: unresolvedBoxes };
  });

  // ------------------------------------------------------------ conditions: facts that decide what applies
  const deciders = new Map<string, { fact: string; about: string; decides: Set<string> }>();
  const addDecider = (missing: string[], about: string, what: string) => { for (const m of missing) { if (m.startsWith("(")) continue; const a = m.startsWith("case.") ? "case" : about; const k = `${a}|${m}`; const d = deciders.get(k) ?? { fact: m, about: a, decides: new Set<string>() }; d.decides.add(what); deciders.set(k, d); } };
  for (const f of forms) if (f.applies === "cannot_tell") addDecider(f.missing, f.person, `whether ${f.form} applies to ${f.person_label}`);

  // ------------------------------------------------------------ document checklist
  const checklist = s.document_requirements.flatMap((d) => {
    const kind = d.condition?.subjectKind;
    if (kind === "DOCUMENT") return [];
    const people0 = kind === "CASE" ? subjectsFor(people, d.who) : subjectsFor(people, d.who, kind === "EACH_APPLICANT" || kind === "EACH_PERSON" ? undefined : kind);
    return people0.map((person) => {
      const c = evalCondition(s, known, d.condition, kind === "CASE" ? "case" : person);
      if (c.applies === "cannot_tell") addDecider(c.missing, person, `whether "${d.document_type}" is needed`);
      return { lineage: d.lineage, requirement: d.document_type, person, person_label: label(person), base_or_conditional: d.base_or_conditional, provided_by: d.provided_by, applies: c.applies, missing: c.missing,
        status: c.applies === false ? "Not needed" : c.applies === "cannot_tell" ? "Cannot tell yet" : "Needed", why: d.condition_plain ?? (d.base_or_conditional === "base" ? "required for every person it names" : d.note ?? ""), source_quote: d.source_quote, origin: d.origin, item_status: d.status };
    });
  });

  // ------------------------------------------------------------ rules (plain effects), evaluated per subject
  const rules = s.rules.map((r) => {
    const kind = r.when?.subjectKind;
    const subjects = kind === "CASE" ? ["case"] : subjectsFor(people, r.for_whom, kind === "EACH_APPLICANT" || kind === "EACH_PERSON" ? undefined : kind);
    const results = subjects.map((person) => { const c = evalCondition(s, known, r.when, person); if (c.applies === "cannot_tell") addDecider(c.missing, person, r.then); return { person, person_label: label(person), applies: c.applies, missing: c.missing }; });
    return { id: r.id, then: r.then, when_plain: r.when_plain, for_whom: r.for_whom, results, origin: r.origin, item_status: r.status };
  });

  // ------------------------------------------------------------ questionnaire: what each person is asked
  type Q = { fact: string; label: string; meaning: string; value_type: string; about: string; about_label: string; section: string; section_title: string; collected_from: string; status: "answered" | "confirmed" | "needs an answer" | "may be needed" | "hidden by a condition"; value?: unknown; why: string; rows: number[]; decides: string[]; rule_only: boolean; required: boolean };
  const questions: Q[] = [];
  const seen = new Set<string>();
  const pushQ = (fact: string, about: string, why: string, rows: number[], decides: string[], maybe: boolean) => {
    const key = `${about}|${fact}`;
    if (seen.has(key)) { const q = questions.find((x) => `${x.about}|${x.fact}` === key); if (q) for (const d of decides) if (!q.decides.includes(d)) q.decides.push(d); return; }
    seen.add(key);
    const p = place.get(fact), f = field.get(fact);
    if (!p) return;
    let status: Q["status"] = maybe ? "may be needed" : "needs an answer", required = true;
    if (p.condition) {
      const subject = about === "case" ? "case" : about.split("/")[0];
      const c = evalCondition(s, known, p.condition, subject);
      const eff = p.condition_effect ?? "SHOW";
      if ((eff === "SHOW" && c.applies !== true) || (eff === "HIDE" && c.applies === true)) { status = "hidden by a condition"; why = `${p.condition_plain ?? "condition"} (${c.applies === "cannot_tell" ? `waiting for ${c.missing.join(", ")}` : String(c.applies)})`; }
      if (eff === "OPTIONAL" && c.applies === true) required = false;
      // Grounding audit finding 3: a question's own condition is decided by other answers; those questions are asked
      // (for the same person, or once for the case) so the dependent question can become reachable.
      if (c.applies === "cannot_tell") addDecider(c.missing, subject, `whether "${p.question_text || f?.meaning || fact}" is asked`);
    }
    const kv = known.get(kkey(about, fact)) ?? (rows.length ? known.get(kkey(about, fact, rows[0])) : undefined);
    if (kv && status !== "hidden by a condition") status = kv.status === "confirmed" ? "confirmed" : "answered";
    questions.push({ fact, label: p.question_text || f?.meaning || fact, meaning: f?.meaning ?? fact, value_type: f?.value_type ?? "text", about, about_label: label(about), section: p.section_id, section_title: sectionTitle.get(p.section_id) ?? p.section_id, collected_from: p.collected_from, status, value: kv?.value, why, rows, decides, rule_only: !needs.has(key), required });
  };
  for (const d of [...deciders.values()]) pushQ(d.fact, d.about, `decides ${[...d.decides].slice(0, 3).join("; ")}`, [], [...d.decides], false);
  for (const n of needs.values()) pushQ(n.fact, n.about, `read by ${[...n.forms].join(", ")} (${n.boxes} box${n.boxes > 1 ? "es" : ""})`, [...n.rows].sort(), [], n.maybe);
  // A section the row selects is a line on the row (SA-1B-58): its placed questions are asked even when no form reads
  // them yet, each with its reason (SA-1B-59). Once per case, or for each person who applies.
  const applicants = people.filter((x) => x.applies && x.role !== "representative").map((x) => x.id);
  const selected = new Set(s.sections.map((x) => x.id));
  for (const p of s.placements) if (selected.has(p.section_id) && !p.rule_only) for (const about of p.repeats === "once_per_case" || p.fact.startsWith("case.") ? ["case"] : applicants)
    pushQ(p.fact, about, `asked in "${sectionTitle.get(p.section_id) ?? p.section_id}", a section this row selects`, [], [], false);
  // Deciding questions last, repeatedly: a question's condition can add deciders, whose own conditions can add more.
  // "seen" stops repeats, so a circular chain ends (and the validator reports it before release).
  for (let pass = 0; pass < 20; pass++) {
    const before = seen.size;
    for (const d of [...deciders.values()]) pushQ(d.fact, d.about, `decides ${[...d.decides].slice(0, 3).join("; ")}`, [], [...d.decides], false);
    if (seen.size === before) break;
  }
  questions.sort((a, b) => (sectionOrder.get(a.section) ?? 99) - (sectionOrder.get(b.section) ?? 99) || a.about.localeCompare(b.about) || a.label.localeCompare(b.label));

  // ------------------------------------------------------------ checks that the known facts trigger
  const checks = (s.checks ?? []).filter((c) => c.condition && c.group !== "form_native").flatMap((c) => {
    const kind = c.condition?.subjectKind;
    const subjects = kind === "CASE" ? ["case"] : people.filter((p) => p.applies).map((p) => p.id);
    return subjects.map((person) => ({ c, person, r: evalCondition(s, known, c.condition, person) })).filter((x) => x.r.applies === true)
      .map(({ c, person }) => ({ id: c.id, severity: c.severity, group: c.group, person, person_label: label(person), applies_to: c.applies_to, message: c.message ?? c.applies_to, illustrative: !!c.illustrative }));
  });

  const unplaced = [...needs.values()].filter((n) => !place.has(n.fact)).map((n) => ({ fact: n.fact, about: n.about, about_label: label(n.about), forms: [...n.forms], in_library: field.has(n.fact) }));
  const total = coverage.reduce((a, c) => { for (const [k, v] of Object.entries(c.counts)) a[k] = (a[k] ?? 0) + v; return a; }, {} as Record<string, number>);
  return {
    people: [{ id: "case", label: "The application" }, ...people.map((p) => ({ id: p.id, label: p.label, role: p.role, applies: p.applies }))],
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
