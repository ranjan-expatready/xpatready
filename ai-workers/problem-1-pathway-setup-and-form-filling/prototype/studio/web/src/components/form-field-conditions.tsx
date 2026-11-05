// B86 (QA-237, C4.11): "Form fields that read this answer", on a condition's card and under a "Hiding a value a form reads"
// problem. Each form field with its own words; an author says they say the same as the condition, and a second person
// approves on To review. The condition is the server's, never typed here. Every condition is Sample until the expert confirms.
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Tip } from "@/components/status";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";

type Row = { form: string; edition: string; form_edition_id: string; data_path: string; caption: string; words: string; state: "not_confirmed" | "waiting" | "returned" | "confirmed" | "different" | "no_words" | "worked_out"; change_id: string | null; why: string | null; warning: string | null; can_confirm: boolean; can_undo: boolean };
type View = { fact: string; question: string; sentence: string | null; why: string | null; rows: Row[]; spread: string | null };
const STATE: Record<Row["state"], { word: string; tone: string }> = {
  not_confirmed: { word: "Not confirmed", tone: "warn" }, waiting: { word: "Waiting for a second person", tone: "info" }, returned: { word: "Returned", tone: "warn" }, confirmed: { word: "Confirmed: same condition", tone: "ok" },
  different: { word: "Holds a different condition", tone: "warn" }, no_words: { word: "No words on the form field", tone: "neutral" }, worked_out: { word: "A worked-out Yes/No", tone: "neutral" },
};
const TIP = "A form field that is filled only in some cases. If it says the same as this condition, the client is not asked and the form leaves it empty when the answer is No.";

export function FormFieldConditions({ combinationId, fact, item }: { combinationId: string; fact: string; item?: string }) {
  const key = ["form-field-conditions", combinationId, fact, item ?? ""];
  const q = useApi<View>(key, `/combinations/${combinationId}/questions/${encodeURIComponent(fact)}/form-fields${item ? `?item=${item}` : ""}`);
  const act = useAction((v: { row: Row; clear?: boolean }) => api<{ id: string; spread: string | null }>("/library/form-field-conditions", { method: "POST", json: { combinationId, fact, formEditionId: v.row.form_edition_id, dataPath: v.row.data_path, ...(item && !v.clear ? { item } : {}), ...(v.clear ? { clear: true } : {}) } }),
    { invalidate: [key, ["combination", combinationId], ["review"], ["review-queue"]], success: "Sent to a second person on To review." });
  if (q.isLoading) return <Spinner label="Loading the form fields" />;
  if (q.isError) return <ErrorState title="The form fields could not be read" description={(q.error as Error).message} />;
  const v = q.data!;
  return (
    <section aria-label="Form fields that read this answer" data-form-field-conditions={fact}>
      <h3 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Form fields that read this answer <Tip tip={TIP} focusable><span role="img" aria-label="What this means"><Info className="size-3.5" aria-hidden /></span></Tip></h3>
      {v.why ? <p className="mt-1 text-sm text-text-muted">{v.why}</p> : null}
      {!v.rows.length ? <p className="mt-1 text-sm text-text-muted">No form reads this answer.</p> : (
        <ul className="mt-1 space-y-2">
          {v.rows.map((r) => (
            <li key={`${r.form_edition_id}:${r.data_path}`} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" data-form-field-row data-state={r.state}>
              <p className="font-medium">{r.edition} · {r.caption || "A form field with no printed name"}</p>
              {r.words ? <p className="mt-0.5 [overflow-wrap:anywhere]">“{r.words}”</p> : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Pill tone={STATE[r.state].tone}>{STATE[r.state].word}</Pill>
                {r.can_confirm ? <Button size="sm" variant="secondary" busy={act.isPending} onClick={() => act.mutate({ row: r })}>Says the same as this condition</Button> : null}
                {r.can_undo ? <Button size="sm" variant="ghost" busy={act.isPending} aria-label={`Take the condition off ${r.caption || "this form field"}`} onClick={() => act.mutate({ row: r, clear: true })}>Undo</Button> : null}
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
