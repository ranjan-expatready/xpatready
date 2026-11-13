// Form copies from a case (runtime lane, R1d, plan §8 RT-13…RT-15): which facts one form reads for one person, a hash
// of them, what changed since a copy was made, and whether the form can be filed (P-71). Pure: the API writes the copy
// (api/src/fill-case.ts) through the shared filler. Every declared or confirmed answer is written at once, marked by who
// gave it (P-242, P-411, amending P-72's "confirmed facts only"); filing still waits for confirmation (readiness).
import { answerSheetOnly, type Accepts } from "../channels.ts";
import { createHash } from "node:crypto";
import { evalCondition, kkey, lineCondition, render, type BoxRow, type Person, type Role } from "../render.ts";
import { boxGate, notNeededWords, rulesInForce, showCondition, whenWords } from "../form-field-condition.ts";
import type { Snapshot } from "../snapshot.ts";
import { PRINCIPAL_CHILDREN_WHEN, ROLE } from "../../contracts/resolver.ts";
import { groupLabel, type QuestionnaireView, type Readiness } from "../../contracts/runtime.ts";
import { checkValue, knownOf, type Answer, type Participant, type Row } from "./case.ts";
import { proseRecorded, recordedDerivation } from "../../../p5/transforms.ts";
import COUNTS from "../../samples/recorded-counts.json" with { type: "json" };
import { gateOf, type GatePlacement } from "./gates.ts";
import { FIRM_PHONE_FACTS, firmRecordFact, formsNamingRepresentative, phoneInOneBox, REPRESENTATIVE, writesAsIs } from "./team.ts";
import { comparedFacts } from "./compared.ts";
import { openLines } from "./open-lines.ts";
import { cellAsked, entriesOffForm, isListRelative } from "./relatives.ts";
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
  const readHere = new Set(cov.boxes.filter((b) => b.fact && b.about).map((b) => `${b.about}|${b.fact}`));
  const boxes = cov.boxes.map((b) => {
    const rule = b.about ? rules.get(b.box) : undefined;
    if (rule) {
      const c = evalCondition(s, known, rule, subjectOf(b.about!));
      // B107: a gate says why in the form's own words ("Not needed: written only when the representative is … CICC").
      const said = gateWords.get(b.box);
      if (c.applies !== true) { const { value: _kept, ...rest } = b; void _kept; return { ...rest, coverage: "not needed" as const, detail: said && c.applies === false ? `Not needed: written only when ${said.replace(/[.\s]+$/, "")}` : notNeededWords(c, rule, words) }; }
    }
    // Review M3 on #1620 (QA-415): a worked-out fact not worked out yet is no answer to check (nobody is asked it): it
    // stays by hand with its own reason (BoxRow.by_hand), never "answered with a problem".
    if (b.coverage !== "confirmed fact" || !b.fact || b.by_hand) return b;
    const problems = checkValue(s, b.fact, b.value, today, form); // QA-355 (a): judged by the release's maps and this form's own
    if (problems.length) return { ...b, coverage: "answered on screen" as const, fix: `answered with a problem, not written: ${problems.join(" ")}` };
    // A No to the gate (declared or confirmed) with a detail still recorded contradicts itself: never written as Yes (nor No). B52: a
    // box that reads its gate itself (asked as its own question) checks the facts its "worked out" step names.
    const recorded = (g: string) => [b.fact!, ...(recordedDerivation(b.transform)?.facts ?? [])].find((f) => f !== g && (f === b.fact || !hiddenNow(b.about!, f)) && present(confirmedAt(b.about!, f)?.value));
    const no = b.about ? gatesOf(b).find((g) => confirmedAt(b.about!, g)?.value === false && recorded(g)) : undefined;
    if (no) return { ...b, coverage: "answered on screen" as const, fix: `"${words(no)}" is answered No, but "${words(recorded(no)!)}" is recorded: correct one of them before this is written` };
    // BK-23 (#1695 C4): the firm record's phone, given as a phone where the release's question reads one, goes into a form
    // field that writes its value as it is as the text it always held there (the number and its extension).
    const oneBox = b.about === REPRESENTATIVE && (FIRM_PHONE_FACTS as readonly string[]).includes(b.fact) && writesAsIs(b.transform) && firmRecordFact(kkey(b.about, b.fact), known.get(kkey(b.about, b.fact))?.source);
    // BK-23 (Lead 36 on #1698): the facts its "A equals B" step compares, confirmed for the same person, go with it to the
    // filler, which reads only this form's own form fields otherwise; a fact a form field of this form reads itself is
    // read from there, as before (so such a form's copies keep their facts, and their validated copies stay current).
    const compared = b.about && b.row === null ? Object.fromEntries(comparedFacts(b.transform, b.fact).filter((f) => !readHere.has(`${b.about}|${f}`)).flatMap((f) => { const v = confirmedAt(b.about!, f); return v ? [[f, v.value]] : []; })) : {};
    return { ...b, ...(oneBox ? { value: phoneInOneBox(b.value) } : {}), ...(Object.keys(compared).length ? { compared } : {}) };
  });
  // The gates' confirmed answers decide these boxes, so a copy keeps them with its facts: a gate changed after the copy
  // (No to Yes, or a No confirmed) makes the copy out of date, as a changed fact does.
  const gateFacts: FormFact[] = cov.boxes.flatMap((b) => (b.about ? gatesOf(b).filter((g) => g !== b.fact) : []).flatMap((g) => { const v = confirmedAt(b.about!, g); return v ? [{ box: `${b.box}#gate:${g}`, fact: g, about: b.about!, row: null, value: v.value }] : []; }));
  // BK-23: so do the facts a form field compares (`compared`): a change to one makes the copy out of date.
  gateFacts.push(...boxes.flatMap((b) => Object.entries(b.compared ?? {}).map(([f, value]) => ({ box: `${b.box}#compared:${f}`, fact: f, about: b.about!, row: null, value }))));
  return { ...cov, boxes, facts: [...factsOf(boxes), ...gateFacts].sort((x, y) => x.box.localeCompare(y.box)) };
}

/** QA-391 (P-65, C9.5: kept and listed, never filed): why a form listed for a person (it has copies) no longer applies, in
 *  words, for "This form no longer applies to <person>: <why>" (so "they", never the name twice). The person is not travelling; the form is not asked of
 *  them; the form's own rule reads No on the case's answers (named by its deciding question, `words`: the screens' label,
 *  never a field code, and by whose answer it is); or the person is under the form's age (review M2: the rule and the age
 *  are read apart, as render decides them, so an age is never given as a rule nor a rule as an age). */
export function notApplyingWhy(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], form: string, subjectId: string, words: (fact: string) => string, today = new Date()): string {
  return notApplyingWords(s, people, answers, rows, words, today)(form, subjectId);
}

/** notApplyingWhy for a whole list: the case's answers are read and the release rendered once, on the first form that
 *  needs it (GET …/forms asks for every kept form; the case page's first view stays within its budget). */
export function notApplyingWords(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], words: (fact: string) => string, today = new Date()): (form: string, subjectId: string) => string {
  const renderPeople: Person[] = people.filter((x) => x.role !== "case").map((x) => ({ id: x.subjectId, role: x.role as Role, label: x.label, applies: x.applies }));
  let once: { known: ReturnType<typeof knownOf>["known"]; forms: ReturnType<typeof render>["forms"] } | null = null;
  const read = () => { if (!once) { const { known } = knownOf(s, people, answers, rows, today, { forForms: true }); once = { known, forms: render(s, renderPeople, known, { today }).forms }; } return once; };
  return (form, subjectId) => {
    const p = people.find((x) => x.subjectId === subjectId);
    if (p && !p.applies) return "they are not travelling with this application";
    const { known, forms } = read();
    const line = forms.find((f) => f.form === form && f.person === subjectId);
    if (!line) return "this release does not ask it of them";
    const f = (s.forms as { form_number: string; status?: string; who?: string; condition?: { subjectKind?: string } | null; min_age?: number | null }[]).find((x) => x.form_number === form);
    const rule = f?.condition ? lineCondition(s, known, renderPeople, subjectId, f.condition) : null;
    // BK-16 (P-490): a "principal, and each child while its condition holds" line gives a child no form until it holds.
    if (f?.who === PRINCIPAL_CHILDREN_WHEN && p?.role === ROLE.child) {
      if (!f.condition) return "it is asked of a child only when its line's condition holds, and the line has no condition";
      if (rule?.applies === "cannot_tell") {
        const when = whenWords(f.condition, (fact) => words(fact).replace(/[.\s]+$/, ""));
        return `it is needed for a child only when ${when || "its rule holds"}; their answer is not given yet`;
      }
    }
    if (rule?.applies === false) {
      const when = whenWords(f!.condition, (fact) => words(fact).replace(/[.\s]+$/, ""));
      const whose = f!.condition!.subjectKind === "CASE" ? "the application's answer" : "their answer";
      const v = (f!.condition as { value?: unknown }).value, said = v === true ? "Yes" : v === false ? "No" : `"${String(v)}"`;
      return when ? `it is needed only when ${when}; ${whose} is not ${said}` : "its own rule reads No on this case's answers";
    }
    if (f?.min_age && rule?.applies !== "cannot_tell") return `they are under ${f.min_age}, and this form is asked of them only from age ${f.min_age}`;
    return "its own rule reads No on this case's answers";
  };
}

/** C7.2 cause 3 (P-72, as P-242 and P-411 amend it): a derived "is anything recorded?" Yes/No box is "N" only when a
 *  person answered "none apply" (declared or confirmed: a declared answer fills at once): every fact it names was asked
 *  of that person (not hidden) in a repeating group that has no entries and whose "none apply" is answered (IMM 5257:
 *  post-secondary education, previous countries of residence).
 *  An empty question in a confirmed section is not an answer (Confirm section vouches only for the answers shown;
 *  review r1 B1); "other names", the national identity document and the US card are "N" once their own Yes/No question
 *  (the facts' gate, gateOf) is answered No (QA-165). Marked on a copy's boxes only; a later entry or a changed "none apply" makes
 *  the copy out of date through its group facts (changedGroups). */
export function markNothingRecorded(boxes: BoxRow[], view: QuestionnaireView, placements: GatePlacement[] = [], today = new Date()): BoxRow[] {
  return boxes.map((b) => {
    // QA-395: a "recorded" Yes/No whose form counts only some entries (samples/recorded-counts.json) is worked out from them.
    const count = b.coverage === "confirmed fact" ? countedOf(b, view, today) : null;
    if (count) return { ...b, counted: count.counted, detail: count.detail };
    // B155: an empty box of a list relative (a brother or sister's row) says why it stays empty: "none apply" answered,
    // or no such entry; else (no entries and no "none apply" yet) the entry it waits for, as render words it.
    const list = b.about && b.coverage !== "confirmed fact" && isListRelative(b.about) ? listRowWhy(b, view) : null;
    if (list) return { ...b, detail: list };
    // QA-318: the prose spelling of the same Yes/No (proseRecorded) names no other fact: the box's own fact is the one asked.
    const d = b.coverage === "confirmed fact" || !b.fact || !b.about || b.about === "case" ? null : recordedDerivation(b.transform) ?? (proseRecorded(b.transform) ? { facts: [] } : null);
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

/** QA-395 (P-319): the rules for a "recorded" Yes/No whose form counts only some entries, from the form's own words (data). */
export type CountRule = { form: string; box: string; quote: string; entry: string; from: string; to: string; other_than: string[]; past_years: number; more_than_months: number };
const COUNT_RULES = (COUNTS as { rules: CountRule[] }).rules;
/** A date answer as the first ("from") or last ("to") day it names (YYYY-MM-DD, or YYYY-MM to the month). */
function dayOf(v: unknown, end: boolean): Date | null {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(v ?? "").trim());
  if (!m) return null;
  return m[3] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(Date.UTC(+m[1], +m[2] - (end ? 0 : 1), end ? 0 : 1));
}
/** n calendar months later, the day kept or, past the month's end, its last day (31 Aug + 6 months = 28 or 29 Feb; review m2). */
const addMonths = (d: Date, n: number) => { const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n + 1, 0)).getUTCDate(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, Math.min(d.getUTCDate(), last))); };
const sameText = (a: unknown, b: unknown) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
/** QA-395: whether a person's entries count for a box under its rule (`rules`, samples/recorded-counts.json): an entry counts
 *  when its country is none of the rule's `other_than` facts and its period covers more than `more_than_months` months of the
 *  past `past_years` years (the part inside them). True when one counts; false when every entry is complete and none does;
 *  null (a person decides) when one could still count but lacks its country or dates, or a fact it is compared with is
 *  not answered. Null for a box no rule names. Answers count once they fill (declared or confirmed, P-411). Pure. */
export function countedOf(b: BoxRow, view: QuestionnaireView, today: Date, rules: CountRule[] = COUNT_RULES): { counted: boolean | null; detail: string } | null {
  const rule = rules.find((r) => r.box === b.box && r.entry === b.fact);
  if (!rule || !b.about || b.about.includes("/") || b.about === "case") return null;
  const qs = view.sections.flatMap((s) => s.questions.filter((q) => q.subjectId === b.about));
  const own = (fact: string) => { const a = qs.find((q) => q.fact === fact)?.answer; return a?.fills ? a.value : undefined; };
  const cell = (fact: string, row: string) => { const a = qs.find((q) => q.fact === fact)?.rows.find((r) => r.row === row)?.answer; return a?.fills ? a.value : undefined; };
  const others = rule.other_than.map(own);
  const rows = qs.find((q) => q.fact === rule.entry)?.rows ?? [];
  const since = addMonths(today, -12 * rule.past_years), asked = `"${rule.quote}"`;
  const missing: string[] = []; // review m6: which entry a person checks, and why
  for (const r of rows) {
    const country = cell(rule.entry, r.row), from = dayOf(cell(rule.from, r.row), false), to = dayOf(cell(rule.to, r.row), true);
    if (country !== undefined && others.some((o) => o !== undefined && sameText(o, country))) continue; // the person's own country never counts
    if (country === undefined || !from || !to || others.some((o) => o === undefined)) { missing.push(`${country === undefined ? "an entry" : String(country)} lacks ${country === undefined ? "its country" : !from || !to ? "its dates" : "a fact it is compared with"}`); continue; }
    // Review M1: an end before its start is a slip a person corrects, never a stay that does not count.
    if (to < from) { missing.push(`${String(country)} ends (${String(cell(rule.to, r.row))}) before it starts (${String(cell(rule.from, r.row))})`); continue; }
    const start = from > since ? from : since, end = to < today ? to : today;
    if (end > addMonths(start, rule.more_than_months)) return { counted: true, detail: `Yes to ${asked}: ${String(country)} from ${String(cell(rule.from, r.row))} to ${String(cell(rule.to, r.row))}` };
  }
  return missing.length ? { counted: null, detail: `${asked}: ${missing.join("; ")}: a person checks the entries and decides Yes or No` }
    : { counted: false, detail: `No to ${asked}: no entry is another country for more than ${rule.more_than_months} months of the past ${rule.past_years} years` };
}

/** B155: why a list relative's form field (row `b.row`) holds nothing although its group is answered: "none apply" (declared
 *  or confirmed: it counts at once, P-411), or fewer entries than the form has rows. Null when the group is not answered. */
function listRowWhy(b: BoxRow, view: QuestionnaireView): string | null {
  const sec = view.sections.find((x) => x.subjectId === b.about && x.group);
  if (!sec?.group) return null;
  const n = sec.group.rows;
  if (n === 0 && sec.group.none_apply?.value) return `nothing to write: "none apply" answered for ${sec.about_label}`;
  if (n > 0 && typeof b.row === "number" && b.row >= n) return `nothing to write: ${sec.about_label} ${n === 1 ? "has 1 entry" : `have ${n} entries`}, none for row ${b.row + 1}`;
  return null;
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
 *  is made from the same confirmed facts, "Copy, not for filing". A form the Form library records IRCC accepts through the
 *  case's account only Online is not (M3-S5, P-171 (3): answer sheet only; `accepts` is the library's, acceptsOf). */
export function copyOnlyForms(s: Snapshot, accepts: Accepts): Set<string> {
  const online = new Set((s.forms as { form_number: string; channel?: string }[]).filter((f) => f.channel === "ONLINE" && !answerSheetOnly(accepts.get(f.form_number), s.combination.portal)).map((f) => f.form_number));
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
    // B155: an entry of a list relative (a brother or sister) waits only for what it asks (cellAsked: its row's boxes, or
    // everything when the entry has no row on the form).
    const grouped = isListRelative(q.subjectId) ? view.sections.find((s) => s.subjectId === q.subjectId && s.section === q.section)?.questions.filter((x) => x.group) ?? [q] : [];
    const r = q.group ? q.rows.filter((_, i) => !grouped.length || cellAsked(grouped, q, i)).map((x) => why(x.answer)).find(Boolean) ?? null : why(q.answer);
    return r ? [{ fact: q.fact, label: q.label, about: q.about_label, reason: r, subject: q.subjectId }] : [];
  });
  const read = new Set(reads.map((q) => `${q.subjectId}|${q.section}`));
  for (const sec of view.sections) {
    if (!sec.group?.required || sec.group.rows > 0 || !read.has(`${sec.subjectId}|${sec.section}`)) continue;
    const na = sec.group.none_apply, r = !na || !na.value ? "not answered" as const : !na.confirmed ? "not confirmed" as const : null;
    if (r) missing.push({ fact: `group:${sec.section}`, label: groupLabel(sec.title), about: sec.about_label, reason: r, subject: sec.subjectId }); // QA-309 m2: whose group, by id
  }
  // B155 (break M1 on #1367): an entry of a list relative with no row on the form (an eighth brother or sister on IMM 5645's
  // seven rows) is never filed silently: one line each, "left empty on the form" (it never holds a copy's lock back and is
  // passed with a reason on Ready to file, as a by-hand field is), saying it goes on an extra sheet.
  for (const sec of view.sections) {
    if (!sec.group || !isListRelative(sec.subjectId) || !read.has(`${sec.subjectId}|${sec.section}`)) continue;
    const qs = sec.questions.filter((q) => q.group), room = qs.find((q) => q.capacity)?.capacity ?? 0;
    for (const i of entriesOffForm(qs)) missing.push({ fact: `entry:${sec.section}:${i + 1}`, label: `Entry ${i + 1} of ${sec.about_label}`, about: sec.about_label, reason: "left empty on the form", why: `the form has room for ${room} entries: write this one on an extra sheet`, subject: sec.subjectId });
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
