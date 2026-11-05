// Draft validation and release differences. Problems are stated in plain words with where they are; errors block
// submission, warnings are shown and recorded. Conditions are checked against the portable copy of the team's
// closed predicate contract (contracts/predicate.v0.schema.json) and against the library's field types.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, CALCULATIONS, validatePredicate } from "../../contracts/rules.ts";
import type { Snapshot } from "./snapshot.ts";
import { askedChoiceProblems, channelProblems, fingerprintLine, type Accepts } from "./channels.ts";
import { duplicateValidity, validityProblems } from "./runtime/case-checklist.ts";
import { COVERAGE_FIXES, coverageGaps } from "./coverage.ts";
import { factSourceProblems, factWords, who } from "./sources.ts";
import { oathMappedProblems } from "./form-steps.ts";
import { eligibilityChanges, gateProblems } from "./eligibility-gates.ts";
import { sourceKey } from "../contracts/resolver.ts"; // SH3 R8
import { NO_FIELD_MAP } from "./setup-checklist.ts";
import { formsWithoutFieldMap } from "./programs.ts"; // QA-180: one rule for release and Open a case
import { FAMILY_INFORMATION } from "./form-completeness.ts";
import { sourceChanges } from "./source-register.ts"; // G1 BR-9: the "Source" lines only; the gate stays out of validate()

// C-11: a field map's form field list, read once per file (paths are relative to the Solution 1 folder, as in fill.ts).
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const inventories = new Map<string, { data_path?: string; caption?: string; ui?: string }[] | null>();
const inventoryFields = (file: string) => {
  if (!inventories.has(file)) { try { inventories.set(file, JSON.parse(readFileSync(join(SOLUTION, file), "utf8")).fields ?? null); } catch { inventories.set(file, null); } }
  return inventories.get(file) ?? null;
};
const schema = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "contracts", "predicate.v0.schema.json"), "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addSchema(schema); // the same lookup as tests/check_conditions.ts
const nodeValid = ajv.getSchema(`${schema.$id}#/definitions/node`)!;
export const isNode = (n: unknown) => nodeValid(n) as boolean;

/** `label` is the item in words (a question's meaning) where `item` is a field code; screens show it, never the code. */
export type Problem = { level: "error" | "warning"; where: string; item: string; message: string; label?: string; /** The person role it is about (W1-15 slice 2: "Needs you" puts it on its row). */ role?: string; /** V3 B1: "no_field_map" (engine/setup-checklist.ts waitsForMap). */ code?: string };
const ORDERED = new Set(["gt", "gte", "lt", "lte"]);
const isFamilyForm = (f: { form_role?: string | null }) => f.form_role === FAMILY_INFORMATION; // P-319: the released role
const BIRTH = "person.date_of_birth";

export function checkCondition(tree: any, fieldTypes: Map<string, string>, derived: Set<string>): string[] {
  if (!tree) return [];
  const errs = validatePredicate(tree, isNode);
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (n.field) {
      if (!fieldTypes.has(n.field) && !derived.has(n.field)) errs.push(`reads ${n.field}, which is not in the library`);
      else if (ORDERED.has(n.op) && !derived.has(n.field) && !["date", "number"].includes(fieldTypes.get(n.field) ?? "")) errs.push(`compares ${n.field} with "${n.op}", but it is a ${fieldTypes.get(n.field)} field`);
    }
    (n.args ?? []).forEach(walk); if (n.arg) walk(n.arg);
  };
  const { subjectKind: _k, ...node } = tree;
  walk(node);
  return errs;
}

export function validate(s: Snapshot, library: { key: string; valueType: string }[], derivedRows: { id: string; calculation: string }[], accepts?: Accepts): Problem[] {
  const out: Problem[] = [];
  const types = new Map(library.map((f) => [f.key, f.valueType]));
  const derived = new Set(derivedRows.map((d) => d.id));
  const placed = new Set(s.placements.map((p) => p.fact));
  const docFacts = new Set((s.document_types ?? []).flatMap((t) => t.supplies_facts ?? []));
  const sectionIds = new Set(s.sections.map((x) => x.id));
  // No forms is not a warning here: the missing list (BR-8, engine/programs.ts) says it once, with its next step.
  const unmapped = new Map(formsWithoutFieldMap(s).map((u) => [u.form_number, u]));
  for (const f of s.forms) {
    for (const e of checkCondition(f.condition, types, derived)) out.push({ level: "error", where: "Forms", item: f.form_number, message: `Condition ${e}.` });
    // S5 (challenge M1): "Only if" in words with no rule cannot be evaluated on a case, so it is never released as is.
    if (f.status === "conditional" && !f.condition) out.push({ level: "error", where: "Forms", item: f.form_number, message: `Turn "${f.condition_plain ?? "only if"}" into a rule: the condition is in words only, so a case cannot tell whom ${f.form_number} applies to. Open the form on the Forms tab and build the rule.` });
    // Lead check L5: a minimum age is decided by each person's date of birth (engine/render.ts ageGate asks it as a
    // deciding question); with nobody asked for it the form could never be decided, so release is refused.
    if (f.min_age && !placed.has(BIRTH) && !docFacts.has(BIRTH)) out.push({ level: "error", where: "Forms", item: f.form_number, message: `${f.form_number} applies from age ${f.min_age}${f.who === "principal_partner_adult_children" ? " for a dependent child" : ""}, so ${f.who === "principal_partner_adult_children" ? "each child's" : "each person's"} date of birth decides it, but nobody is asked for a date of birth in this combination. Add the date of birth question to this combination's questionnaire, or clear the minimum age.` });
    // V3 B1, QA-180 (P-297 (3)): the case gate's own rule (engine/programs.ts formsWithoutFieldMap: the edition in use has
    // form fields mapped), so a release is never one no firm can open a case on.
    // Review m3: the title goes in the words (the item stays the number), so a list names each form one way.
    // Review m1: the only family information form of the package (C3.8) cannot be removed, so its fix is mapping only.
    const u = unmapped.get(f.form_number);
    const named = f.title ? `the form "${f.title}"` : "this form";
    const fix = isFamilyForm(f) && !s.forms.some((o: { form_number: string; form_role?: string | null }) => o !== f && isFamilyForm(o))
      ? "Map its form fields (Draft setup). It is this combination's family information form, which IRCC requires when the application package lists one, so remove it only if the package does not." : "Map its form fields (Draft setup), or remove the form.";
    if (u) out.push({ level: "error", where: "Forms", item: f.form_number, code: NO_FIELD_MAP,
      message: u.edition ? `No form fields mapped yet: ${u.edition}, the newest edition and the one a case fills, has none${u.olderMapped ? " (an older edition's map is not used)" : ""}, so firms could not open cases on a release with ${named}. ${fix}`
        : `No form fields mapped yet: a case could not fill ${named}, so firms could not open cases on a release with it. ${fix}` });
  }
  const unplaced = new Map<string, number>();
  for (const m of s.field_maps) for (const e of m.entries) {
    if (e.outcome !== "mapped" || !e.fact) continue;
    if (!types.has(e.fact)) out.push({ level: "error", where: `Field map ${m.form_edition}`, item: e.data_path, message: `The form field reads ${e.fact}, which is not in the library.` });
    else if (!placed.has(e.fact) && !docFacts.has(e.fact)) unplaced.set(e.fact, (unplaced.get(e.fact) ?? 0) + 1);
  }
  // S5 slice 2 (coverage gate; Screen 03 challenge point 3, Lead 25 Oct): every fact a form field needs for a person the
  // combination has is asked of someone or filled by the case officer; otherwise release is blocked, per person, naming
  // the question's meaning, the forms that need it and the fix.
  const roleWord = new Map(((s.combination.participants ?? []) as { role: string; label?: string }[]).map((p) => [p.role, p.label ?? p.role]));
  const meaningOf = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? f.id]));
  const gaps = coverageGaps(s);
  for (const g of gaps) out.push({ level: "error", where: "Questionnaires", item: g.fact, message: `${g.role === "the application" ? "The application" : roleWord.get(g.role) ?? g.role}: "${meaningOf.get(g.fact) ?? g.fact}" is needed by ${g.forms.join(", ")}, but nobody is asked for it. Fix: ${COVERAGE_FIXES}.` });
  for (const g of gaps) unplaced.delete(g.fact);
  for (const [fact, n] of unplaced) out.push({ level: "warning", where: "Library", item: fact, message: `${n} form field${n > 1 ? "s read" : " reads"} this field, but nobody is asked for it and no supported document supplies it: in a case it stays unresolved until a placement is added.` });
  // C4.2 (P-294 (B), P-91): forms pull their questions, so a question placed in a section this combination did not choose
  // is still asked. Said once per section, by its title, never its key.
  const pulled = new Map<string, number>();
  for (const p of s.placements) if (!sectionIds.has(p.section_id)) pulled.set(p.section_id, (pulled.get(p.section_id) ?? 0) + 1);
  const pulledTitle = new Map((s.section_titles ?? []).map((x) => [x.id, x.title]));
  // Round 2 (review): the label is the title, and the message starts with it, so Review prints it once, never the key.
  for (const [id, n] of pulled) { const t = pulledTitle.get(id) ?? "A library section"; out.push({ level: "warning", where: "Questions", item: id, label: t, message: `${t}: not chosen for this combination, but forms or rules still need ${n} of its question${n === 1 ? "" : "s"}, so ${n === 1 ? "it is" : "they are"} asked after the chosen sections. Add the section on the Smart questionnaire (SQR) tab to give ${n === 1 ? "it" : "them"} a place.` }); }
  for (const p of s.placements) {
    for (const e of checkCondition(p.condition, types, derived)) out.push({ level: "error", where: "Questions", item: p.fact, message: `Condition ${e}.` });
    if (p.condition && !p.condition_effect) out.push({ level: "error", where: "Questions", item: p.fact, message: "A condition needs an effect (show, hide, require or optional)." });
  }
  for (const d of s.document_requirements) {
    for (const e of checkCondition(d.condition, types, derived)) out.push({ level: "error", where: "Documents", item: d.document_type, message: `Condition ${e}.` });
    if (d.base_or_conditional === "conditional" && !d.condition) out.push({ level: "error", where: "Documents", item: d.document_type, message: "A conditional requirement needs a condition." });
  }
  for (const r of s.rules) for (const e of checkCondition(r.when, types, derived)) out.push({ level: "error", where: "Rules", item: r.id, message: `Condition ${e}.` });
  for (const c of s.checks.filter((x) => x.condition && typeof x.condition === "object" && x.group !== "document_validity")) for (const e of checkCondition(c.condition, types, derived)) out.push({ level: "warning", where: "Checks", item: c.id, message: `Condition ${e}; the check is not evaluated.` });
  // C6.4: a document validity rule (engine/runtime/case-checklist.ts) names a document type, whole months, the date it
  // is measured to and its citation (P-170); one that does not is never used, so the release says why.
  const docKeys = new Set((s.document_types ?? []).map((t: { key: string }) => t.key));
  for (const c of s.checks.filter((x) => x.group === "document_validity")) {
    const why = validityProblems(c, (f) => types.has(f), docKeys);
    if (why.length) out.push({ level: "warning", where: "Checks", item: c.id, message: `Document validity rule not used: ${why.join("; ")}.` });
  }
  for (const k of duplicateValidity(s.checks)) out.push({ level: "warning", where: "Checks", item: k, message: `Two document validity rules name ${k}: neither is used until one is removed.` });
  out.push(...reachability(s, placed, docFacts, derived, (f) => `"${(meaningOf.get(f) ?? (s.derived_fields as { id: string; plain?: string | null }[]).find((d) => d.id === f)?.plain ?? f).trim().replace(/\.$/, "")}"`));
  // Only the derived definitions this combination reads (Lead check item 3): the library holds every definition, and
  // one nobody here uses is not this combination's warning.
  const reads = derivedRead(s);
  out.push(...gateProblems(s.eligibility, placed, reads, types, derived, (f) => `"${(s.derived_fields as { id: string; plain?: string | null }[]).find((d) => d.id === f)?.plain?.trim().replace(/\.$/, "") || factWords(s, f)}"`, s.placements)); // C6.9 BR-5
  for (const d of derivedRows) if (reads.has(d.id) && !CALCULATIONS[d.calculation]) out.push({ level: "warning", where: "Derived fields", item: d.id, message: `Calculation ${d.calculation} has no tested helper: recorded, never evaluated.` });
  out.push(...channelProblems(s, accepts));
  out.push(...askedChoiceProblems(s, (m) => (m.inventory_file ? inventoryFields(m.inventory_file) ?? [] : []))); // B81: a code on an answer the form prints twice
  out.push(...oathMappedProblems(s.field_maps, inventoryFields)); // C-11 (P-171 c): a mapped oath box is by a person
  out.push(...factSourceProblems(s)); // W1-15 slice 1 (C4.10): where each answer comes from, and the PQR ticks // F1 (forms lane): filing channels, a form with no PDF edition, and option maps
  // Drift check 2: an item that is a field code also carries its words (the question's meaning, a derived field's plain
  // words), so Review and the refusals never lead with the code.
  const plainOf = new Map((s.derived_fields as { id: string; plain?: string | null }[]).map((d) => [d.id, d.plain ?? ""]));
  for (const p of out) {
    const m = p.where === "Derived fields" ? plainOf.get(p.item) : ["Questionnaires", "Questions", "Library"].includes(p.where) ? meaningOf.get(p.item) : undefined;
    if (m && m !== p.item) p.label = m.trim().replace(/\.$/, "");
  }
  return out;
}

/** The facts a combination reads (its boxes and every condition on forms, questions, documents, rules and checks), then
 *  the inputs of the derived definitions among them, until nothing new is added. */
export function derivedRead(s: Snapshot): Set<string> {
  const fieldsOf = (c: unknown) => c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : [];
  const out = new Set<string>([...s.field_maps.flatMap((m) => m.entries.map((e: { fact?: string | null }) => e.fact ?? "")).filter(Boolean),
    ...[...s.forms.map((f) => f.condition), ...s.placements.map((p) => p.condition), ...s.document_requirements.map((d) => d.condition), ...s.rules.map((r) => r.when), ...(s.checks ?? []).map((c) => c.condition)].flatMap(fieldsOf)]);
  for (let grew = true; grew;) {
    grew = false;
    for (const d of s.derived_fields) if (out.has(d.id)) for (const i of [...(d.inputs ?? []), d.reference].filter(Boolean)) if (!out.has(i)) { out.add(i); grew = true; }
  }
  return out;
}

/** C4.11 step 7 (W1 concept §4, "every deciding fact is asked before what depends on it"): the same reachability and
 *  loop rules validate() runs, on the snapshot alone (derived definitions from the snapshot), for the drafting run. */
export function askedInOrder(s: Snapshot): Problem[] {
  const placed = new Set(s.placements.map((p) => p.fact));
  const docFacts = new Set((s.document_types ?? []).flatMap((t) => t.supplies_facts ?? []));
  const derived = new Set((s.derived_fields as { id: string }[]).map((d) => d.id));
  return reachability(s, placed, docFacts, derived, (f) => `"${factWords(s, f)}"`);
}

/** A condition without whose answer it is read from, to compare two of them; null for anything that is not a condition
 *  (a form field's words are never one, B86). */
export const bareCond = (c: any) => { if (!c || typeof c !== "object") return null; const { subjectKind: _k, ...n } = c; return canonical(n); };

/** Grounding audit finding 3 (W1 3.4, 3.5): a question's condition must never hide a value that something applicable
 *  still reads, every value that decides a question must be obtainable, and questions must not decide each other in a
 *  loop. Errors block submission and release. A form or box that applies under the same condition is compatible. */
// C3.8: the messages name each question by its meaning (`words`), never by its field code.
function reachability(s: Snapshot, placed: Set<string>, docFacts: Set<string>, derived: Set<string>, words: (fact: string) => string): Problem[] {
  const out: Problem[] = [];
  const fieldsOf = (c: any) => c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : [];
  const readers = new Map<string, { form: string; formCond: any; boxCond: any }[]>();
  for (const m of s.field_maps) { const f = s.forms.find((x) => x.form_number === m.form_number); if (!f) continue; for (const e of m.entries) if (e.outcome === "mapped" && e.fact) readers.set(e.fact, [...(readers.get(e.fact) ?? []), { form: f.form_number, formCond: f.condition, boxCond: e.condition_rule }]); }
  const conditions = [...s.rules.map((r) => ({ what: `rule ${r.id}`, tree: r.when })), ...s.document_requirements.map((d) => ({ what: `document "${d.document_type}"`, tree: d.condition })), ...s.forms.map((f) => ({ what: `form ${f.form_number}`, tree: f.condition })), ...(s.checks ?? []).filter((c) => c.condition && typeof c.condition === "object").map((c) => ({ what: `check ${c.id}`, tree: c.condition }))];
  for (const p of s.placements) {
    if (!p.condition) continue;
    const eff = p.condition_effect ?? "SHOW";
    if (eff === "SHOW" || eff === "HIDE") {
      const own = bareCond(p.condition), when = p.condition_plain ?? "its condition";
      const forms = new Map<string, boolean>();
      for (const r of readers.get(p.fact) ?? []) { const ok = eff === "SHOW" && [r.formCond, r.boxCond].some((c) => bareCond(c) === own); forms.set(r.form, (forms.get(r.form) ?? true) && ok); }
      for (const [form, ok] of forms) if (!ok) out.push({ level: "error", where: "Questions", item: p.fact, message: `Hiding a value a form reads: the question ${words(p.fact)} is ${eff === "HIDE" ? "hidden when" : "shown only when"} "${when}", but ${form} reads it ${s.forms.find((x) => x.form_number === form)?.condition ? "under a different condition" : "whenever the form applies"}. Make the form or its form fields apply under the same condition, or remove the question's condition.` });
      for (const c of conditions) if (fieldsOf(c.tree).includes(p.fact) && !(eff === "SHOW" && own && canonical(c.tree).includes(own))) out.push({ level: "error", where: "Questions", item: p.fact, message: `Hiding a value a condition reads: ${c.what} reads the answer to ${words(p.fact)}, whose question is ${eff === "HIDE" ? "hidden when" : "shown only when"} "${when}". The condition could never be decided while the question is hidden.` });
    }
    for (const f of fieldsOf(p.condition)) if (!placed.has(f) && !docFacts.has(f) && !derived.has(f)) out.push({ level: "error", where: "Questions", item: p.fact, message: `Unreachable question: ${words(p.fact)} depends on ${words(f)}, which no question, supported document or derived definition supplies, so it can never be decided.` });
  }
  // Loops: question A depends on B, which depends (directly or through others) on A.
  const dep = new Map<string, string[]>();
  for (const p of s.placements) if (p.condition) dep.set(p.fact, [...new Set([...(dep.get(p.fact) ?? []), ...fieldsOf(p.condition)])]);
  const reported = new Set<string>();
  const visit = (start: string, at: string, path: string[]) => {
    for (const next of dep.get(at) ?? []) {
      if (next === start) { const loop = [...path, start]; const k = [...loop].sort().join(","); if (!reported.has(k)) { reported.add(k); out.push({ level: "error", where: "Questions", item: start, message: `Questions decide each other in a loop: ${loop.map(words).join(" → ")}. None of them can be shown first.` }); } }
      else if (!path.includes(next) && path.length < 12) visit(start, next, [...path, next]);
    }
  };
  for (const f of dep.keys()) visit(f, f, [f]);
  return out;
}

const KINDS: [keyof Snapshot, (x: any) => string, string][] = [
  ["canonical_fields", (x) => x.id, "Field"], ["sections", (x) => x.id, "Section"], ["placements", (x) => x.lineage, "Question placement"], ["forms", (x) => x.form_number, "Form"],
  ["document_requirements", (x) => x.lineage, "Document requirement"], ["rules", (x) => x.id, "Rule"], ["checks", (x) => x.id, "Check"],
];
// C-8 (W1-10 slice 1): a line released as "Signed PDF upload" and now PDF upload + signed by hand and scanned is unchanged.
const bare = (x: any) => { const { item_version, status, origin, ...r } = fingerprintLine(x); void item_version; void status; void origin; return canonical(r); };
export type Change = { kind: string; key: string; change: "added" | "changed" | "removed"; origin?: string; needs_sme: boolean; label: string };
export function diff(prev: Snapshot | null, next: Snapshot): Change[] {
  const out: Change[] = [];
  const sme = (kind: string, x: any) => ["Rule", "Document requirement", "Check"].includes(kind) || x?.origin === "AI_PROPOSAL" || (kind === "Form" && !!x?.condition);
  for (const [k, id, label] of KINDS) {
    const a = new Map(((prev?.[k] as any[]) ?? []).map((x) => [id(x), x])), b = new Map(((next[k] as any[]) ?? []).map((x) => [id(x), x]));
    for (const [key, x] of b) if (!a.has(key)) out.push({ kind: label, key, change: "added", origin: x.origin, needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? x.question_text ?? x.fact ?? key });
      else if (bare(a.get(key)) !== bare(x)) {
        // C4.9 (P-97): who fills a question for every combination is named once, in words, for the immigration expert.
        const was = a.get(key);
        if (k === "placements" && was.collected_from !== x.collected_from) {
          const fills = (v: string) => (v === "staff_working_view" ? "the case officer" : v === "client_questionnaire" ? "the client" : v.replace(/_/g, " "));
          out.push({ kind: "Who fills a question", key, change: "changed", origin: x.origin, needs_sme: true, label: `${factWords(next, x.fact)}: filled by ${fills(x.collected_from)}, was ${fills(was.collected_from)} (shared library, every combination)` });
          if (bare({ ...was, collected_from: null }) === bare({ ...x, collected_from: null })) continue;
        }
        // P-319 (Lead 4 on #833): a form's role to IRCC's rules is named in words and needs the immigration expert's sign-off.
        if (k === "forms" && (was.form_role ?? null) !== (x.form_role ?? null)) {
          const fam = (r: unknown) => r === FAMILY_INFORMATION;
          out.push({ kind: "Family information form rule", key, change: "changed", origin: x.origin, needs_sme: true, label: fam(x.form_role) ? `${key} is now this combination's family information form ([IRCC-F09]: it fills the family information line)` : fam(was.form_role) ? `${key} is no longer a family information form ([IRCC-F09]: it no longer fills the family information line)` : `${key}'s role changed` });
          if (bare({ ...was, form_role: null }) === bare({ ...x, form_role: null })) continue;
        }
        out.push({ kind: label, key, change: "changed", origin: x.origin, needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? x.fact ?? key });
      }
    for (const [key, x] of a) if (!b.has(key)) out.push({ kind: label, key, change: "removed", needs_sme: sme(label, x), label: x.meaning ?? x.title ?? x.document_type ?? x.then ?? key });
  }
  // C4.1 (P-216): the combination's own section order is part of its release. A move changes no section, so the lines
  // above miss it; it is named once, in words, with each moved section's new place among the sections kept.
  if (prev) {
    const ids = (x: Snapshot) => ((x.sections as { id: string }[]) ?? []).map((y) => y.id);
    const kept = new Set(ids(prev).filter((k) => ids(next).includes(k)));
    const was = ids(prev).filter((k) => kept.has(k)), now = ids(next).filter((k) => kept.has(k));
    const moved = now.map((k, i) => ({ k, i })).filter(({ k, i }) => was[i] !== k);
    if (moved.length) {
      const title = (k: string) => (next.sections as { id: string; title?: string }[]).find((y) => y.id === k)?.title ?? k;
      out.push({ kind: "Section order", key: next.combination?.key ?? "sections", change: "changed", needs_sme: false, label: `Sections reordered: ${moved.map(({ k, i }) => `"${title(k)}" now ${ordinal(i + 1)}`).join(", ")}` });
    }
  }
  // C4.2 (M2 of #866's review): the title of a section a pulled question sits in is released with the combination, so a
  // new or renamed one is a change in words (a section taken out keeps the title it had, so it is not listed twice).
  if (next.section_titles?.length) {
    const had = new Map([...((prev?.sections ?? []) as { id: string; title: string }[]), ...(prev?.section_titles ?? [])].map((x) => [x.id, x.title]));
    for (const x of next.section_titles) if (had.get(x.id) !== x.title) out.push({ kind: "Section name", key: x.id, change: had.has(x.id) ? "changed" : "added", needs_sme: false, label: had.has(x.id) ? `"${had.get(x.id)}" is now named "${x.title}" (a section not chosen here whose questions forms still need)` : `"${x.title}" named for the questions forms still need from it (the section is not chosen here)` });
  }
  const boxes = (s: Snapshot | null) => new Map<string, any>((s?.field_maps ?? []).flatMap((m: any) => m.entries.map((e: any) => [`${m.form_edition}|${e.data_path}`, e] as [string, any])));
  const a = boxes(prev), b = boxes(next);
  const byForm = new Map<string, { added: number; changed: number; removed: number; ai: number }>();
  const bump = (k: string, f: "added" | "changed" | "removed", ai: boolean) => { const form = k.split("|")[0]; const x = byForm.get(form) ?? { added: 0, changed: 0, removed: 0, ai: 0 }; x[f]++; if (ai) x.ai++; byForm.set(form, x); };
  // B86 BR-8: a form field's condition rule is named once, in words, for the immigration expert (what a case fills changes
  // with it); a box whose only change is that rule is not counted again in its form's "Field map" line.
  const noRule = (e: Record<string, unknown>) => { const { condition_rule: _r, ...rest } = e; return rest; };
  const ruleWords = (k: string, e: { caption?: string | null; fact: string }, had: boolean) => `${k.split("|")[0]}, form field "${e.caption ?? "unnamed"}": ${had ? "is filled whenever the form applies again, not only under its question's condition" : `is filled only under the condition of its question "${factWords(next, e.fact)}"`} (shared library; Sample, Unconfirmed: expert)`;
  for (const [k, e] of b) {
    const was = a.get(k), rule = e.condition_rule ?? null, wasRule = was?.condition_rule ?? null;
    if (canonical(rule) !== canonical(wasRule)) out.push({ kind: "Form field condition", key: k, change: !wasRule ? "added" : !rule ? "removed" : "changed", origin: e.origin, needs_sme: true, label: ruleWords(k, e, !rule) });
  }
  for (const [k, e] of a) if (e.condition_rule && !b.has(k)) out.push({ kind: "Form field condition", key: k, change: "removed", origin: e.origin, needs_sme: true, label: ruleWords(k, e, true) });
  for (const [k, e] of b) if (!a.has(k)) bump(k, "added", e.origin === "AI_PROPOSAL"); else if (bare(noRule(a.get(k))) !== bare(noRule(e))) bump(k, "changed", e.origin === "AI_PROPOSAL");
  for (const k of a.keys()) if (!b.has(k)) bump(k, "removed", false);
  for (const [form, x] of byForm) out.push({ kind: "Field map", key: form, change: x.added && !x.changed && !x.removed ? "added" : "changed", origin: x.ai ? "AI_PROPOSAL" : undefined, needs_sme: x.ai > 0, label: `${x.added} form fields added, ${x.changed} changed, ${x.removed} removed${x.ai ? ` (${x.ai} AI-proposed)` : ""}` });

  // Grounding audit finding 2: everything the release carries is reviewed. Who the row covers (its people and roles)
  // changes which forms, documents and questions apply, so it needs the SME duty; names and source labels are shown as
  // name-only changes. Document types (what a document supplies) and derived definitions change behaviour.
  const ca = (prev?.combination ?? null) as any, cb = next.combination as any;
  if (ca && canonical(ca.participants ?? []) !== canonical(cb.participants ?? [])) out.push({ kind: "People on this row", key: cb.key, change: "changed", needs_sme: true, label: `who this row covers: ${(cb.participants ?? []).map((p: any) => `${p.label} (${p.min}–${p.max})`).join(", ")}` });
  if (ca) { const meta = (x: any) => canonical({ key: x.key, label: x.label, program: x.program, pathway: x.pathway, source_basis: x.source_basis, basis_note: x.basis_note, path: x.path ?? null, client_type: x.client_type ?? null, allowed_locations: x.allowed_locations ?? null, portal: x.portal ?? null }); // the portal decides how lines are filed (break round 2 M1)
    if (meta(ca) !== meta(cb)) out.push({ kind: "Row details", key: cb.key, change: "changed", needs_sme: canonical(ca.allowed_locations ?? null) !== canonical(cb.allowed_locations ?? null) || ca.source_basis !== cb.source_basis, label: "name, path, portal, source basis or allowed locations (no line changed)" }); }
  // C4.5 (challenge m2): the facts a document type supplies by name on the release line the expert signs, never keys.
  const factName = (f: string) => { const d = ((next.canonical_fields ?? []) as { id: string; meaning?: string | null; label?: string | null }[]).find((x) => x.id === f); return String(d?.meaning ?? d?.label ?? f).trim().replace(/\.$/, ""); };
  for (const [k, id, label, behaviour] of [["document_types", (x: any) => x.key, "Document type", true], ["derived_fields", (x: any) => x.id, "Derived definition", true]] as const) {
    const a = new Map(((prev?.[k] as any[]) ?? []).map((x) => [id(x), x])), b = new Map(((next[k] as any[]) ?? []).map((x) => [id(x), x]));
    for (const [key, x] of b) if (!a.has(key)) out.push({ kind: label, key, change: "added", needs_sme: behaviour, label: x.name ?? x.plain ?? key });
      else if (canonical(a.get(key)) !== canonical(x)) out.push({ kind: label, key, change: "changed", needs_sme: behaviour, label: `${x.name ?? x.plain ?? key}: ${label === "Document type" ? `supplies ${(x.supplies_facts ?? []).map(factName).join(", ") || "no facts"}` : `inputs ${(x.inputs ?? []).join(", ") || "none"}`}` });
    for (const [key, x] of a) if (!b.has(key)) out.push({ kind: label, key, change: "removed", needs_sme: behaviour, label: x.name ?? x.plain ?? key });
  }
  // W1-15 slice 1 (challenge M5): each choice over the rules' source and each Pre-qualification tick is named on Review,
  // and needs the immigration expert's sign-off (P-76: PQR picks are approved in the combination's one review).
  {
    // Lead check W1: the fact's own words and the role's label, never system keys.
    const docName = (key: string) => [...(next.document_types as any[]), ...((prev?.document_types ?? []) as any[])].find((t) => t.key === key)?.name ?? key;
    const words = (x: any) => [x.source ? `comes from ${x.source === "DOCUMENT" ? `the ${docName(x.document_type)}` : x.source === "CLIENT" ? "the client" : `the case officer${x.source_reason ? ` (why: ${x.source_reason})` : ""}`}` : "", x.prequalification ? "Prospect questionnaire (PQR)" : ""].filter(Boolean).join(", ") || "back to the rules' source";
    const line = (s: Snapshot, x: any, rest: string) => `${factWords(s, x.fact)} (${who(s, x.role)}): ${rest}`;
    const a = new Map(((prev?.fact_sources ?? []) as any[]).map((x) => [sourceKey(x.role, x.fact), x])), b = new Map(((next.fact_sources ?? []) as any[]).map((x) => [sourceKey(x.role, x.fact), x]));
    for (const [key, x] of b) if (!a.has(key)) out.push({ kind: "Where an answer comes from", key, change: "added", origin: x.origin, needs_sme: true, label: line(next, x, words(x)) });
      else if (canonical(a.get(key)) !== canonical(x)) out.push({ kind: "Where an answer comes from", key, change: "changed", origin: x.origin, needs_sme: true, label: line(next, x, words(x)) });
    for (const [key, x] of a) if (!b.has(key)) out.push({ kind: "Where an answer comes from", key, change: "removed", needs_sme: true, label: line(prev!, x, "back to the rules' source, not in the Prospect questionnaire (PQR)") });
  }
  out.push(...eligibilityChanges(prev?.eligibility, next.eligibility)); // C6.9 BR-4
  out.push(...sourceChanges(prev, next)); // G1 BR-9: a source added, changed or removed, for the expert
  // Completeness guard: any other part of the released content that differs is listed rather than silently passed.
  const covered = new Set(["canonical_fields", "sections", "placements", "forms", "document_requirements", "rules", "checks", "field_maps", "combination", "document_types", "derived_fields", "fact_sources", "eligibility", "sources", "mode", "row_versions", "section_titles"]);
  for (const k of new Set([...Object.keys(prev ?? {}), ...Object.keys(next)])) if (prev && !covered.has(k) && canonical((prev as any)[k] ?? null) !== canonical((next as any)[k] ?? null)) out.push({ kind: "Configuration", key: k, change: "changed", needs_sme: true, label: `${k} changed` });
  return out;
}

/** "1st", "2nd", "3rd", "11th": a section's place said in words (C4.1; Review line and history line). */
export function ordinal(n: number) { const t = n % 100, u = n % 10; return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`; }

/** C5.6 (P-240, row G3): a release is a "Demo release" when what it froze holds Sample content: a Sample combination
 *  (source_basis ILLUSTRATIVE) or any value marked Sample (a check saved without an official source is illustrative; a
 *  number whose source entry is Sample, G1).
 *  Read from the release's own snapshot, so a later change to the combination never relabels a past release. */
export function isDemoSnapshot(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const snap = raw as { combination?: { source_basis?: string | null } | null; checks?: unknown };
  const checks = Array.isArray(snap.checks) ? (snap.checks as ({ illustrative?: boolean | null } | null)[]) : [];
  // G1 (tech lead's condition on Decision 1, #558): a number answered only by a Sample source entry is Sample content.
  const sources = Array.isArray((raw as { sources?: unknown }).sources) ? ((raw as { sources: ({ sample?: boolean } | null)[] }).sources) : [];
  return snap.combination?.source_basis === "ILLUSTRATIVE" || checks.some((c) => !!c?.illustrative) || sources.some((x) => !!x?.sample);
}

/** C5.5 (G2 BR-3, P-240; Opus re-review of #568, M2): outside the demo workspace every release is real, so each check
 *  saved without an official source (illustrative) refuses it, named. A number with only a Sample source is the source
 *  gate's own line (G1, draftSourceProblems), never listed twice. The combination's own basis is not a line here: the
 *  Structure screens save every name as Sample (structure.ts) and nothing changes it, so it would refuse every
 *  combination set up on the screens (breaker F1 on this PR). The caller asks only for a draft outside the demo workspace. */
export function sampleContentProblems(s: Snapshot): (Problem & { gate: "sample-content" })[] {
  return s.checks.filter((x) => x.illustrative).map((c) => ({ level: "error" as const, where: "Checks", item: c.id, label: `Check "${String(c.message ?? c.id).trim()}"`, gate: "sample-content" as const,
    message: "Sample (saved without an official source quote). Sample content releases only in the demo workspace, as a Demo release. A real release needs its official source." }));
}
