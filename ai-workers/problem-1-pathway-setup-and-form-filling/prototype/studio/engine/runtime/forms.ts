// Form copies from a case (runtime lane, R1d, plan §8 RT-13…RT-15): which confirmed facts one form reads for one
// person, a hash of them, what changed since a copy was made, and whether the form can be filed (P-71). Pure: the API
// writes the copy (api/src/fill-case.ts) through the shared filler. Only confirmed facts are ever written (P-72).
import { createHash } from "node:crypto";
import { render, type BoxRow, type Person, type Role } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import type { QuestionnaireView, Readiness } from "../../contracts/runtime.ts";
import { knownOf, type Answer, type Participant, type Row } from "./case.ts";

/** One confirmed fact a copy reads: which form field, which fact about whom, which row, which value. */
export type FormFact = { box: string; fact: string; about: string; row: number | null; value: unknown };

/** What one form would read today for one person on the case: every form field with its coverage (the shared
 *  renderer's, so a case fills exactly what the release preview shows), and the confirmed facts among them. */
export function formCoverage(s: Snapshot, people: Participant[], answers: Answer[], rows: Row[], form: string, subjectId: string, today = new Date()) {
  const renderPeople: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
  const { known } = knownOf(s, people, answers, rows, today);
  const cov = render(s, renderPeople, known).coverage.find((c) => c.form === form && c.person === subjectId);
  if (!cov) return null;
  return { ...cov, facts: factsOf(cov.boxes) };
}

/** The confirmed facts among a form's boxes, in form-field order. */
export function factsOf(boxes: BoxRow[]): FormFact[] {
  return boxes.filter((b) => b.coverage === "confirmed fact" && b.fact).map((b) => ({ box: b.box, fact: b.fact!, about: b.about ?? "", row: b.row, value: b.value }))
    .sort((a, b) => a.box.localeCompare(b.box));
}

/** The input hash of a copy: the same confirmed facts give the same hash, whatever order they were read in. */
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
 *  would be written wrong: review and break report M2). Optional facts left empty do not block. */
export function readiness(view: QuestionnaireView, form: string, subjectId: string): Readiness {
  const reads = view.sections.flatMap((s) => s.questions).filter((q) => q.fills.some((f) => f.form === form && f.subject === subjectId) && !q.hidden);
  const reason = (a: { confirmed: boolean; problems: string[] } | null | undefined) => (!a ? "not answered" as const : a.problems.length ? "needs a fix" as const : !a.confirmed ? "not confirmed" as const : null);
  const missing = reads.filter((q) => q.required).flatMap((q) => {
    const r = q.group ? q.rows.map((x) => reason(x.answer)).find(Boolean) ?? null : reason(q.answer);
    return r ? [{ fact: q.fact, label: q.label, about: q.about_label, reason: r }] : [];
  });
  const empty_groups = [...new Set(reads.filter((q) => q.group && q.required && q.rows.length === 0).map((q) => q.section_title))];
  return { ready: missing.length === 0, missing, empty_groups };
}
