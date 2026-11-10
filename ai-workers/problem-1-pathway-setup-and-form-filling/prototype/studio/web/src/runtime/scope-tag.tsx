// C3.16 (SA-1B-130 rule 3; concept screens/C3.16-field-scope/concept.md r4 BR-4): a household or employer fact is asked
// once, in the application's own parts, with a tag and the people it is read for; each member's part shows it read-only
// ("Answered for the household by … on … · Change it in For the household"), with no second edit (challenge M6).
import * as React from "react";
import type { QuestionnaireView, ViewQuestion } from "../../../contracts/runtime";

type Scoped = ViewQuestion & { scope_tag?: string | null; read_for?: { subjectId: string; label: string }[] };
/** How the case page already says who, when and what (questionnaire.tsx passes its own, review m3: one set of words). */
export type Words = { who: Record<string, string>; when: (at: string) => string; shown: (q: ViewQuestion, value: unknown) => string };

/** The tag next to a question asked once for the household or the employer, with whom it is read for. */
export function ScopeTag({ q }: { q: ViewQuestion }) {
  const s = q as Scoped;
  if (!s.scope_tag) return null;
  const names = (s.read_for ?? []).map((r) => r.label);
  return (
    <span data-scope-tag className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle text-[12px] font-normal">
      <span className="rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-primary">{s.scope_tag}</span>
      {names.length ? <span className="text-text-muted">Read for: {names.join(", ")}</span> : null}
    </span>
  );
}

/** On a member's part: the household facts read for this person, read-only, with where to change them. */
export function HouseholdReads({ view, subjectId, words, onChange }: { view: QuestionnaireView; subjectId: string; words: Words; onChange?: (caseSubjectId: string, fact: string) => void }) {
  const qs = view.sections.flatMap((s) => s.questions as Scoped[]).filter((q) => q.scope_tag && q.subjectId !== subjectId && (q.read_for ?? []).some((r) => r.subjectId === subjectId));
  if (!qs.length) return null;
  return (
    <div data-household-reads className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
      <p className="font-medium">Answered once for everyone it concerns</p>
      <ul className="mt-1 space-y-1">
        {qs.map((q) => (
          <li key={q.fact} data-household-read={q.fact}>
            <span className="font-medium">{q.label}</span>: {q.answer ? words.shown(q, q.answer.value) : <span className="text-text-muted">not answered yet</span>}
            <span className="block text-xs text-text-muted">
              {q.answer ? `Answered ${q.scope_tag === "For the household" ? "for the household" : "for the employer"} by ${words.who[(q.answer.answered ?? q.answer).by] ?? "someone on the case"} · ${words.when((q.answer.answered ?? q.answer).at)} · ` : ""}
              {onChange ? <button type="button" className="underline" onClick={() => onChange(q.subjectId, q.fact)}>Change it in {q.scope_tag}</button> : <>Change it in {q.scope_tag}</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
