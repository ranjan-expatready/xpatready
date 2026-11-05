// B88 (breaker M2): the questions whose form fields already follow their condition (held, asked, or waiting for a second
// person), on Review and release, so their panel and its Undo stay reachable once no "Hiding a value" problem shows them.
import { useApi } from "@/lib/api";
import { FormFieldConditions } from "@/components/form-field-conditions";

type View = { questions: { fact: string; question: string; form_fields: number }[] };

export function FormFieldFollowers({ combinationId, shown }: { combinationId: string; shown: Set<string> }) {
  const q = useApi<View>(["form-field-followers", combinationId], `/combinations/${combinationId}/form-field-followers`);
  const list = (q.data?.questions ?? []).filter((x) => !shown.has(x.fact));
  if (!list.length) return null;
  return (
    <details className="rounded-xl border border-border bg-surface-raised p-4" data-form-field-followers>
      <summary className="cursor-pointer font-medium">Form fields that follow a question's condition ({list.reduce((n, x) => n + x.form_fields, 0)})</summary>
      <p className="mt-1 text-xs text-text-muted">Each was confirmed or asked by a person and approved by a second person. Undo here, the same way.</p>
      <div className="mt-2 space-y-3">{list.map((x) => <FormFieldConditions key={x.fact} combinationId={combinationId} fact={x.fact} />)}</div>
    </details>
  );
}
