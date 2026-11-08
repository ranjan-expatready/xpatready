// Form copies from a case (runtime lane, R1d, plan §8 RT-13…RT-15): which facts one form reads for one person, a hash
// of them, what changed since a copy was made, and whether the form can be filed (P-71). Pure: the API writes the copy
// (api/src/fill-case.ts) through the shared filler. Every declared or confirmed answer is written at once, marked by who
// gave it (P-242, P-411, amending P-72's "confirmed facts only"); filing still waits for confirmation (readiness).
import { answerSheetOnly } from "../../contracts/forms.ts";
import { createHash } from "node:crypto";
import { evalCondition, kkey, render, type BoxRow, type Person, type Role } from "../render.ts";
import { boxGate, notNeededWords, rulesInForce, showCondition } from "../form-field-condition.ts";
import type { Snapshot } from "../snapshot.ts";
import { groupLabel, type QuestionnaireView, type Readiness } from "../../contracts/runtime.ts";
import { checkValue, knownOf, type Answer, type Participant, type Row } from "./case.ts";
import { recordedDerivation } from "../../../p5/transforms.ts";
import { gateOf, type GatePlacement } from "./gates.ts";
import { firmRecordFact, formsNamingRepresentative } from "./team.ts";
import { openLines } from "./open-lines.ts";
export { gateOf, type GatePlacement } from "./gates.ts";

/** One confirmed fact a copy reads: which form field, which fact about whom, which row, which value. */
export type FormFact = { box: string; fact: string; about: string; row: number | null; value: unknown };
/** QA-165: a gate's confirmed answer kept with a copy (box "<box>#gate:<fact>"): it decides a box, it is not one. */
export const isGateFact = (f: FormFact) => f.box.includes("#gate:");

/** What one form would read today for one person on the case: every form field with its coverage (the shared
 *  renderer's, so a case fills exactly what the release preview shows), and the confirmed facts among them. */
/** `edition`: read that PDF edition of the form (an answer key's own, break B1); otherwise the edition in use (P-32). */
export function formCoverage(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], form: string, subjectId: string, today = new Date(), edition?: string | null) {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const { known: all } = knownOf(s, people, answers, rows, today, { forForms: true });
  // QA-296: the firm record's facts about the representative fill only a form that names the representative of record.
  const known = formsNamingRepresentative(s.field_maps).has(form) ? all : new Map([...all].filter(([k, v]) => !firmRecordFact(k, v.source)));
  const cov = render(s, renderPeople, known, { today, ...(edition ? { editions: new Map([[form, edition]]) } : {}) }).coverage.find((c) => c.form === form && c.person === subjectId);
  if (!cov) return null;
  // QA-122 (P-71, P-72): an answer (declared or confirmed) that fails its checks is never written; its form field is "not written"
  // with the problem as the reason, and readiness lists the fact as "needs a fix".
  // QA-165 (Devin on #715): a "recorded" Yes/No box whose facts are asked under their own Yes/No question (gateOf).
  const placements = s.placements as (GatePlacement & { question_text?: string | null })[];
  const present = (x: unknown) => !(x === undefined || x === null || x === "" || x === false || (Array.isArray(x) && !x.length));
  // B52: a box asked as its own question reads its gate itself (its fact is not among the facts its step names).
  const gatesOf = (b: BoxRow) => { const d = recordedDerivation(b.transform); return d && b.fact ? [...new Set([...(d.facts.length && !d.facts.includes(b.fact) ? [b.fact] : []), ...[b.fact, ...d.facts].map((f) => gateOf(placements, f)).filter((x): x is string => !!x)])] : []; };
  const confirmedAt = (about: string, fact: string) => { const v = known.get(kkey(about.split("/")[0], fact)); return v?.status === "confirmed" ? v : undefined; };
  const words = (fact: string) => placements.find((p) => p.fact === fact)?.question_text || (s.canonical_fields as { id: string; meaning?: string }[]).find((f) => f.id === fact)?.meaning || fact;
  // B86 BR-5 (here, not in render: the preview, the question list and "fills" read render and must not move): a form field
  // that holds its question's condition is written only while that condition is true, whatever answer is stored.
  const rules = rulesInForce(s, form, cov.edition);
  const gateWords = new Map(((s.field_maps as { form_number: string; form_edition?: string; entries: { data_path: string; condition_rule?: unknown }[] }[]).find((m) => m.form_number === form && m.form_edition === cov.edition)?.entries ?? [])
    .filter((e) => boxGate(e.condition_rule)).map((e) => [e.data_path, String((e.condition_rule as { words?: unknown }).words ?? "")]));
  const subjectOf = (about: string) => (about === "case" ? "case" : about.split("/")[0]);
  // BR-5b: an answer whose question a SHOW condition now hides is "kept and not used" (the screen's own words), so it does
  // not count as recorded. A question that stays visible (REQUIRE) keeps QA-165, and so does a box reading the hidden answer
  // itself (it would write Y from it).
  const hiddenNow = (about: string, fact: string) => { const own = showCondition(placements, fact); return !!own && evalCondition(s, known, own, subjectOf(about)).applies !== true; };
  const boxes = cov.boxes.map((b) => {
    const rule = b.about ? rules.get(b.box) : undefined;
    if (rule) {
      const c = evalCondition(s, known, rule, subjectOf(b.about!));
      // B107: a gate says why in the form's own words ("Not needed: written only when the representative is … CICC").
      const said = gateWords.get(b.box);
      if (c.applies !== true) { const { value: _kept, ...rest } = b; void _kept; return { ...rest, coverage: "not needed" as const, detail: said && c.applies === false ? `Not needed: written only when ${said.replace(/[.\s]+$/, "")}` : notNeededWords(c, rule, words) }; }
    }
    if (b.coverage !== "confirmed fact" || !b.fact) return b;
    const problems = checkValue(s, b.fact, b.value, today);
    if (problems.length) return { ...b, coverage: "answered on screen" as const, fix: `answered with a problem, not written: ${problems.join(" ")}` };
    // A No to the gate (declared or confirmed) with a detail still recorded contradicts itself: never written as Yes (nor No). B52: a
    // box that reads its gate itself (asked as its own question) checks the facts its "worked out" step names.
    const recorded = (g: string) => [b.fact!, ...(recordedDerivation(b.transform)?.facts ?? [])].find((f) => f !== g && (f === b.fact || !hiddenNow(b.about!, f)) && present(confirmedAt(b.about!, f)?.value));
    const no = b.about ? gatesOf(b).find((g) => confirmedAt(b.about!, g)?.value === false && recorded(g)) : undefined;
    return no ? { ...b, coverage: "answered on screen" as const, fix: `"${words(no)}" is answered No, but "${words(recorded(no)!)}" is recorded: correct one of them before this is written` } : b;
  });
  // The gates' confirmed answers decide these boxes, so a copy keeps them with its facts: a gate changed after the copy
  // (No to Yes, or a No confirmed) makes the copy out of date, as a changed fact does.
  const gateFacts: FormFact[] = cov.boxes.flatMap((b) => (b.about ? gatesOf(b).filter((g) => g !== b.fact) : []).flatMap((g) => { const v = confirmedAt(b.about!, g); return v ? [{ box: `${b.box}#gate:${g}`, fact: g, about: b.about!, row: null, value: v.value }] : []; }));
  return { ...cov, boxes, facts: [...factsOf(boxes), ...gateFacts].sort((x, y) => x.box.localeCompare(y.box)) };
}

/** C7.2 cause 3 (P-72, as P-242 and P-411 amend it): a derived "is anything recorded?" Yes/No box is "N" only when a
 *  person answered "none apply" (declared or confirmed: a declared answer fills at once): every fact it names was asked
 *  of that person (not hidden) in a repeating group that has no entries and whose "none apply" is answered (IMM 5257:
 *  post-secondary education, previous countries of residence).
 *  An empty question in a confirmed section is not an answer (Confirm section vouches only for the answers shown;
 *  review r1 B1); "other names", the national identity document and the US card are "N" once their own Yes/No question
 *  (the facts' gate, gateOf) is answered No (QA-165). Marked on a copy's boxes only; a later entry or a changed "none apply" makes
 *  the copy out of date through its group facts (changedGroups). */
export function markNothingRecorded(boxes: BoxRow[], view: QuestionnaireView, placements: GatePlacement[] = []): BoxRow[] {
  return boxes.map((b) => {
    const d = b.coverage === "confirmed fact" || !b.fact || !b.about || b.about === "case" ? null : recordedDerivation(b.transform);
    if (!d) return b;
    const subject = b.about!.split("/")[0], facts = new Set([b.fact!, ...d.facts]);
    const asked = view.sections.flatMap((s) => s.questions.filter((q) => q.subjectId === subject && facts.has(q.fact)).map((q) => ({ s, q })));
    if (!asked.length || new Set(asked.map(({ q }) => q.fact)).size !== facts.size) return b;
    if (asked.some(({ q }) => q.answer || q.rows.some((r) => r.answer))) return b;
    const settled = (s: QuestionnaireView["sections"][number]) => !!s.group && s.group.rows === 0 && !!s.group.none_apply?.value && s.group.none_apply.fills;
    if (!asked.some(({ q }) => q.hidden) && asked.every(({ s }) => settled(s))) {
      const titles = [...new Set(asked.map(({ s }) => s.title))].join(", ");
      return { ...b, nothing_recorded: true as const, detail: `nothing recorded: "none apply" answered in ${titles}` };
    }
    // QA-165 (C7.2): a "No" (declared or confirmed, P-411) to the Yes/No question that each of these facts is asked under (IMM 5257's own
    // "Have you ever used any other name…?", "Do you have a national identity document?", "Are you a lawful permanent
    // resident of the United States…?") vouches that nothing is recorded, as an answered "none apply" does.
    const gates = asked.map(({ q }) => gateNo(view, placements, subject, q.fact));
    if (gates.every((g): g is string => !!g)) return { ...b, nothing_recorded: true as const, detail: `nothing recorded: "${[...new Set(gates)].join('", "')}" answered No` };
    return b;
  });
}

/** QA-165: the gate's question label when this person answered it No (declared or confirmed: it fills, P-411); else null. */
export function gateNo(view: QuestionnaireView, placements: GatePlacement[], subject: string, fact: string): string | null {
  const g = gateOf(placements, fact);
  if (!g) return null;
  const q = view.sections.flatMap((s) => s.questions).find((x) => x.subjectId === subject && x.fact === g && !x.hidden);
  return q?.answer && q.answer.value === false && q.answer.fills ? q.label : null;
}

/** The forms a case fills as PDFs: the release files them as a PDF (its filing line is not Online) and has their
 *  official file and form field map. A form filed Online goes on its portal sheet, never in a PDF (PR #12 review 1). */
export function pdfForms(s: Snapshot): Set<string> {
  // C-4 (W1-10 slice 1): a Not needed line is never filled either.
  const online = new Set((s.forms as { form_number: string; channel?: string }[]).filter((f) => f.channel === "ONLINE" || f.channel === "NOT_NEEDED").map((f) => f.form_number));
  return new Set((s.field_maps as { form_number: string; channel?: string; official_file?: string }[]).filter((m) => m.channel !== "ONLINE" && m.official_file && !online.has(m.form_number)).map((m) => m.form_number));
}

/** P-145: the forms filed Online that have IRCC's PDF in the release (an official file and its form field map): a PDF copy
 *  is made from the same confirmed facts, "Copy, not for filing". Express Entry's IMM 5669 and IMM 5406 are not (P-171 (3)). */
export function copyOnlyForms(s: Snapshot): Set<string> {
  const online = new Set((s.forms as { form_number: string; channel?: string }[]).filter((f) => f.channel === "ONLINE" && !answerSheetOnly(f.form_number, s.combination.portal)).map((f) => f.form_number));
  return new Set((s.field_maps as { form_number: string; channel?: string; official_file?: string }[]).filter((m) => m.channel !== "ONLINE" && m.official_file && online.has(m.form_number)).map((m) => m.form_number));
}

/** QA-235: every form number the release writes, as it writes it: its form lines and its field maps, schedules and
 *  dependants included ("IMM 5257 SCH1", "IMM 0008 DEP"). */
export function releaseForms(s: Pick<Snapshot, "forms" | "field_maps">): Set<string> {
  return new Set([...(s.forms as { form_number: string }[]), ...(s.field_maps as { form_number: string }[])].map((f) => f.form_number));
}

/** The confirmed facts among a form's boxes, in form-field order. */
export function factsOf(boxes: BoxRow[]): FormFact[] {
  return boxes.filter((b) => b.coverage === "confirmed fact" && b.fact).map((b) => ({ box: b.box, fact: b.fact!, about: b.about ?? "", row: b.row, value: b.value }))
    .sort((a, b) => a.box.localeCompare(b.box));
}

/** The input hash of a copy: the same confirmed facts give the same hash, whatever order they were read in. Facts
 *  only: the groups a copy read are kept beside them (GroupFact) and compared by changedGroups, not hashed. */
export function inputHash(facts: FormFact[]): string {
  const sorted = [...facts].sort((a, b) => a.box.localeCompare(b.box)).map((f) => [f.box, f.fact, f.about, f.row, f.value]);
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

/** The facts whose value a copy read differs from today's (changed, added or no longer confirmed), each named once. */
export function changedFacts(then: FormFact[], now: FormFact[]): string[] {
  const key = (f: FormFact) => f.box;
  const a = new Map(then.map((f) => [key(f), f])), b = new Map(now.map((f) => [key(f), f]));
  const out = new Set<string>();
  for (const [k, f] of a) if (!b.has(k) || JSON.stringify(b.get(k)!.value) !== JSON.stringify(f.value)) out.add(f.fact);
  for (const [k, f] of b) if (!a.has(k)) out.add(f.fact);
  return [...out].sort();
}

/** P-71: a form is blocked from filing only by its own Validate (steps a person does on the PDF: shown, not computed
 *  here) and by missing or conflicting facts it needs: a required question (not hidden) that fills this form for this
 *  person (matched by the person's id) with an answer that is missing, not confirmed, or confirmed with a problem (it
 *  would be written wrong: review and break report M2). A required repeating group the form reads with no entries
 *  blocks too, until "none apply" is answered and confirmed for it (Lead, break M3). Optional facts left empty, or answered
 *  validly and not confirmed (written at once since P-411, confirmed before filing only when required), do not; an optional fact answered with a problem does (QA-122).
 *  A section check that fired on a fact the form reads blocks it as well (P-47 tier 2). */
/** Whether a fired check blocks "ready to file": only a section check at severity warn or block. */
export const blocksFiling = (c: { group?: string; severity: string }) => c.group === "section_check" && (c.severity === "warn" || c.severity === "block");

/** QA-165 (P-71; diagnosis on #1256, cause 2): what the form itself would write, for readiness: the copy's form fields
 *  (formCoverage's, each refused one with its `fix`) and the fields IRCC's form marks mandatory that a copy made now
 *  leaves empty (engine/runtime/mandatory.ts mandatoryOpen, as GET …/forms lists them). */
export type OnForm = { boxes: (BoxRow & { fix?: string })[]; open: { box: string; label: string; reason: string; why: string }[] };

export function readiness(view: QuestionnaireView, form: string, subjectId: string, onForm?: OnForm): Readiness {
  const reads = view.sections.flatMap((s) => s.questions).filter((q) => q.fills.some((f) => f.form === form && f.subject === subjectId) && !q.hidden);
  // C6.18 (P-244): a background answer staff recorded is named as waiting for the client, who re-confirms it.
  const reason = (a: { confirmed: boolean; problems: string[]; awaits_client?: boolean } | null | undefined) => (!a ? "not answered" as const : a.problems.length ? "needs a fix" as const : a.awaits_client ? "waits for the client to re-confirm" as const : !a.confirmed ? "not confirmed" as const : null);
  // QA-122: an optional fact counts only when it is answered with a problem (it would be written wrong, P-71).
  const optional = (a: { problems: string[] } | null | undefined) => (a && a.problems.length ? "needs a fix" as const : null);
  const missing: Readiness["missing"] = reads.flatMap((q) => {
    const why = q.required ? reason : optional;
    const r = q.group ? q.rows.map((x) => why(x.answer)).find(Boolean) ?? null : why(q.answer);
    return r ? [{ fact: q.fact, label: q.label, about: q.about_label, reason: r, subject: q.subjectId }] : [];
  });
  const read = new Set(reads.map((q) => `${q.subjectId}|${q.section}`));
  for (const sec of view.sections) {
    if (!sec.group?.required || sec.group.rows > 0 || !read.has(`${sec.subjectId}|${sec.section}`)) continue;
    const na = sec.group.none_apply, r = !na || !na.value ? "not answered" as const : !na.confirmed ? "not confirmed" as const : null;
    if (r) missing.push({ fact: `group:${sec.section}`, label: groupLabel(sec.title), about: sec.about_label, reason: r, subject: sec.subjectId }); // QA-309 m2: whose group, by id
  }
  // P-47 tier 2 (C4.4 part 2): a section check (a conflict in the answers) that fired on a fact this form reads for this
  // person blocks filing too, named by its own words (it never blocks saving, P-71). Advice, readiness warnings, official
  // rules and checks still waiting for the expert only warn (P-168, P-136; review c44-part2 M1).
  const readFacts = new Set(reads.map((q) => `${q.subjectId}|${q.fact}`));
  for (const c of view.checks) if (blocksFiling(c) && c.fact && readFacts.has(`${c.subjectId}|${c.fact}`) && !missing.some((m) => m.fact === `check:${c.id}` && m.about === c.about_label))
    missing.push({ fact: `check:${c.id}`, label: c.message, about: c.about_label, reason: "a check fired", subject: c.subjectId }); // QA-309 m2
  if (onForm) missing.push(...formHoldsBack(view, subjectId, onForm, missing));
  return { ready: missing.length === 0, missing };
}

/** QA-165 (#1318 review M2): what holds a copy's lock back: every readiness line but a mandatory form field left empty. Those
 *  are the person's own steps in Adobe, or a configuration gap no screen of the case can close; they stay on the forms card
 *  and as a CRITICAL line on Ready to file (passed with a reason, or fixed, P-315), so locking is never a dead end. */
export const blocksLock = (m: { reason: string }) => m.reason !== "left empty on the form";

/** QA-165 (P-71: a fact that would be written wrong blocks; "Ready" is never said over a mandatory form field that will be
 *  empty). Beside the questions: (1) each form field formCoverage refuses with a fix ("…is answered No, but … is recorded",
 *  a confirmed answer with a problem), as "needs a fix" in the fix's own words; (2) each field IRCC's form marks mandatory
 *  that a copy made now leaves empty and no question above already explains (filled by hand, a value the box's own list
 *  cannot hold, "none apply" on a group whose first row the form requires, nothing fills it yet), as "left empty on the
 *  form" with why. One line per fact for (1), per form field for (2). */
function formHoldsBack(view: QuestionnaireView, subjectId: string, onForm: OnForm, already: Readiness["missing"]): Readiness["missing"] {
  const qs = view.sections.flatMap((s) => s.questions);
  const said = new Set(already.map((m) => `${m.subject ?? subjectId}|${m.fact}`));
  const person = view.sections.find((s) => s.subjectId === subjectId)?.about_label ?? "";
  const aboutOf = (about: string | null) => (about ? view.sections.find((s) => s.subjectId === about)?.about_label ?? person : person);
  const out: Readiness["missing"] = [];
  const boxOf = new Map(onForm.boxes.map((b) => [b.box, b]));
  for (const b of onForm.boxes) {
    if (!b.fix || !b.fact) continue;
    // QA-309 (review m1): a box about the application is "case" on the form, while its question is asked on the case's own
    // subject: that subject names it, so a case fact with a problem is one line, "about" the application, never two. The
    // form's own key is kept as said too, so what is left empty on the form below is decided as before.
    const own = b.about ?? subjectId, subject = own === "case" ? qs.find((q) => q.fact === b.fact)?.subjectId ?? own : own, k = `${subject}|${b.fact}`;
    if (said.has(k)) { said.add(`${own}|${b.fact}`); continue; }
    said.add(k); said.add(`${own}|${b.fact}`);
    out.push({ fact: b.fact, label: qs.find((q) => q.subjectId === subject && q.fact === b.fact)?.label ?? (b.meaning || b.caption || b.fact), about: aboutOf(subject === own ? b.about : subject), reason: "needs a fix", why: b.fix, subject });
  }
  // Named as the forms card names them (openLines: a date's parts are one line; two fields with one caption, such as IMM
  // 5257's Taiwan PIN and Israel passport boxes, are told apart by the field's own name).
  const left = onForm.open.filter((o) => { const b = boxOf.get(o.box); return !b?.fix && !(b?.fact && said.has(`${b.about ?? subjectId}|${b.fact}`)); });
  for (const o of openLines(left)) {
    const b = boxOf.get(o.box);
    out.push({ fact: `box:${o.box}`, label: o.label, about: aboutOf(b?.about ?? null), reason: "left empty on the form", why: `${o.reason}: ${o.why}`, subject: b?.about ?? subjectId, boxes: o.boxes });
  }
  return out;
}

/** The repeating groups a form reads for one person, as a copy saw them (break r1d-none-apply M1): whether "none apply"
 *  was confirmed and whether there were entries. A group answer fills no form field, so it is kept beside the facts. */
export type GroupFact = { key: string; title: string; none: boolean; entries: boolean;
  /** Whose entries (break r1d-pr13 m2: a form can read another person's group); absent on older copies. */
  about?: string;
  /** The live entries (their row ids), so an entry added or removed after the copy is a change (PR 13 review); absent on
   *  copies made before it was kept (those still miss an added blank entry). Errs safe: an entry removed and added again
   *  with the same answers, or one past the form's room, is a change though the PDF would read the same. */
  rows?: string[] };
export function groupFacts(view: QuestionnaireView, form: string, subjectId: string): GroupFact[] {
  const read = new Set(view.sections.flatMap((s) => s.questions).filter((q) => q.fills.some((f) => f.form === form && f.subject === subjectId) && !q.hidden).map((q) => `${q.subjectId}|${q.section}`));
  return view.sections.filter((s) => s.group && read.has(`${s.subjectId}|${s.section}`))
    .map((s) => ({ key: `${s.subjectId}|${s.section}`, title: s.title, about: s.about_label, none: s.group!.rows === 0 && !!s.group!.none_apply?.value && s.group!.none_apply.fills, entries: s.group!.rows > 0,
      rows: [...new Set(s.questions.flatMap((q) => q.rows.map((r) => r.row)))].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
/** The groups whose "none apply" or entries changed since a copy was made, named as the forms panel names them. A copy
 *  made before groups were kept (no record) compares nothing. */
export function changedGroups(then: GroupFact[] | undefined, now: GroupFact[]): string[] {
  if (!then) return [];
  const a = new Map(then.map((g) => [g.key, g])), b = new Map(now.map((g) => [g.key, g]));
  const out = new Set<string>();
  for (const k of new Set([...a.keys(), ...b.keys()])) { const x = a.get(k), y = b.get(k); if (!x || !y || x.none !== y.none || x.entries !== y.entries || (x.rows && y.rows && x.rows.join() !== y.rows.join())) { const g = (y ?? x)!; out.add(`Entries in "${g.title}"${g.about ? ` for ${g.about}` : ""}`); } }
  return [...out].sort();
}
