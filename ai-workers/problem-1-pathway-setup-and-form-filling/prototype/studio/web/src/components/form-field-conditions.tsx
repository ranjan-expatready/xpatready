// B86 (QA-237, C4.11): "Form fields that read this answer", on a condition's card, under a "Hiding a value a form reads" problem,
// and for a form field already holding one (its Undo). Each form field with its own words; an author says they say the same as
// the condition, and a second person approves on To review. The condition is the server's, never typed here. Every condition is
// Sample until the expert confirms.
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import type { FormFieldRow, FormFieldState, FormFieldsOfCombination, FormFieldsOfQuestion } from "../../../contracts/form-field-conditions";
import { api, useAction, useApi, useSessionView } from "@/lib/api";
import { Tip } from "@/components/status";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";

const STATE: Record<FormFieldState, { word: string; tone: string; tip: string }> = {
  not_confirmed: { word: "Not confirmed", tone: "warn", tip: "Nobody has said yet that this form field's words say the same as the condition, so the draft cannot be released." },
  waiting: { word: "Waiting for a second person", tone: "info", tip: "A change of this form field waits on To review. Nothing changes until a second person approves it." },
  returned: { word: "Returned", tone: "warn", tip: "A second person returned this change. Withdraw it, then confirm the form field again." },
  confirmed: { word: "Confirmed: same condition", tone: "ok", tip: "This form field holds the question's condition, so the form leaves it empty when the condition is not met." },
  different: { word: "Holds a different condition", tone: "warn", tip: "What this form field holds is not this question's condition, so it counts for nothing: the form field behaves as if it held none." },
  no_words: { word: "No words on the form field", tone: "neutral", tip: "Nothing on this form field's map says it is conditional, so it cannot be confirmed." },
  worked_out: { word: "A worked-out Yes/No", tone: "neutral", tip: "This Yes/No must write No when the answer is No, so it cannot be filled only under the condition." },
};
const TIP = "A form field that is filled only in some cases. If it says the same as this condition, the client is not asked and the form leaves it empty when the answer is No.";
const allKey = (combinationId: string) => ["form-field-conditions", combinationId];

/** The panel for one question, from what the page already read. */
export function FormFieldsPanel({ combinationId, view: v, item }: { combinationId: string; view: FormFieldsOfQuestion; item?: string }) {
  const { canAuthor } = useSessionView();
  const act = useAction((x: { row: FormFieldRow; clear?: boolean }) => api<{ id: string; spread: string | null }>("/library/form-field-conditions", { method: "POST", json: { combinationId, fact: v.fact, formEditionId: x.row.form_edition_id, dataPath: x.row.data_path, ...(item && !x.clear ? { item } : {}), ...(x.clear ? { clear: true } : {}) } }),
    { invalidate: [allKey(combinationId), ["combination", combinationId], ["review"], ["review-queue"]], success: "Sent to a second person on To review." });
  return (
    <section aria-label={`Form fields that read the answer to ${v.question}`} data-form-field-conditions={v.fact}>
      <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Form fields that read this answer <Tip tip={TIP} focusable><span role="img" aria-label="What this means"><Info className="size-3.5" aria-hidden /></span></Tip></h3>
      {v.why ? <p className="mt-1 text-sm text-text-muted">{v.why}</p> : null}
      {!v.rows.length ? <p className="mt-1 text-sm text-text-muted">No form reads this answer.</p> : (
        <ul className="mt-1 space-y-2">
          {v.rows.map((r) => (
            <li key={`${r.form_edition_id}:${r.data_path}`} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" data-form-field-row data-state={r.state}>
              <p className="font-medium">{r.edition} · {r.caption || "A form field with no printed name"}</p>
              {r.words ? <p className="mt-0.5 [overflow-wrap:anywhere]">“{r.words}”</p> : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Tip tip={STATE[r.state].tip} focusable><span><Pill tone={STATE[r.state].tone}>{STATE[r.state].word}</Pill></span></Tip>
                {r.can_confirm && canAuthor ? <Button size="sm" variant="secondary" busy={act.isPending} onClick={() => act.mutate({ row: r })}>Says the same as this condition</Button> : null}
                {r.can_undo && canAuthor ? <Button size="sm" variant="ghost" busy={act.isPending} aria-label={`Take the condition off ${r.caption || "this form field"}`} onClick={() => act.mutate({ row: r, clear: true })}>Undo</Button> : null}
                {r.change_id ? <Link className="text-text-link underline" to={`/review/change/${r.change_id}`}>Open on To review</Link> : null}
              </div>
              {r.why ? <p className="mt-1 text-xs text-text-muted">{r.why}</p> : null}
              {r.warning ? <p className="mt-1 text-xs font-medium text-text-warn" data-form-field-warning>{r.warning}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {v.spread ? <div className="mt-2" data-form-field-spread><Notice tone="warn" title="Other combinations">{v.spread}</Notice></div> : null}
      {v.rows.length ? <p className="mt-1 text-xs text-text-muted">For every combination that files the form · A second person approves · Sample, Unconfirmed: expert</p> : null}
    </section>
  );
}

/** On a condition's card: the panel for its question, compared with the card's condition. */
export function FormFieldConditions({ combinationId, fact, item }: { combinationId: string; fact: string; item?: string }) {
  const q = useApi<FormFieldsOfQuestion>([...allKey(combinationId), fact, item ?? ""], `/combinations/${combinationId}/questions/${encodeURIComponent(fact)}/form-fields${item ? `?item=${item}` : ""}`);
  if (q.isLoading) return <Spinner label="Loading the form fields" />;
  if (q.isError) return <ErrorState title="The form fields could not be read" description={(q.error as Error).message} />;
  return <FormFieldsPanel combinationId={combinationId} view={q.data!} item={item} />;
}

/** Review and release's one request for every question's form fields (STANDARDS: one request per screen view, not per row). */
export const useFormFieldsOfCombination = (combinationId: string) => useApi<FormFieldsOfCombination>(allKey(combinationId), `/combinations/${combinationId}/form-field-conditions`);

const HOLDS = new Set<FormFieldState>(["confirmed", "different", "waiting", "returned"]);
/** BR-7: the way back. A form field holding a condition has no problem to sit under, so its Undo is listed here. */
export function FormFieldsHeld({ combinationId, questions, shown }: { combinationId: string; questions: FormFieldsOfQuestion[]; shown: Set<string> }) {
  const held = questions.filter((q) => !shown.has(q.fact) && q.rows.some((r) => HOLDS.has(r.state)));
  if (!held.length) return null;
  return (
    <details className="rounded-xl border border-border bg-surface-raised p-4" data-form-fields-held>
      <summary className="cursor-pointer font-medium">Form fields holding a question's condition ({held.length} question{held.length === 1 ? "" : "s"})</summary>
      <div className="mt-2 space-y-3">{held.map((q) => <FormFieldsPanel key={q.fact} combinationId={combinationId} view={q} />)}</div>
    </details>
  );
}
