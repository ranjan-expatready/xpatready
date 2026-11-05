// C3.16 (L-SA4; SA-1B-130; concept screens/C3.16-field-scope/concept.md r4, approved on #1054): the library field's
// "Asked about" choice (the team's "Scope"). Four choices, each with a Sample example; a choice that cannot be made says
// why under it; a published field is read-only. A change that would move saved AI results warns first (Q6 on #1054).
import * as React from "react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCanAuthor } from "@/pages/library-item-actions";

type Choice = { scope: string; label: string; short: string; example: string; current: boolean; refused: string | null };
type ScopeView = { key: string; name: string; scope: string; published: boolean; choices: Choice[]; warning: string | null };

/** The pill under a field's name: whom it is about, in words (C3.16; was "once per case" / "about a person"). */
export const SCOPE_PILL: Record<string, string> = { CLIENT_LEVEL: "about each person", CASE_LEVEL: "once for the application", HOUSEHOLD: "once for the household", ORGANISATION: "once for the employer" };

export function FieldScopePanel({ fieldKey, retired }: { fieldKey: string; retired: boolean }) {
  const canAuthor = useCanAuthor();
  const v = useApi<ScopeView>(["field-scope", fieldKey], `/library/fields/${encodeURIComponent(fieldKey)}/scope`);
  const [pick, setPick] = React.useState<string | null>(null);
  React.useEffect(() => { if (v.data) setPick(v.data.scope); }, [v.data?.scope]);
  const save = useAction(() => api(`/library/fields/${encodeURIComponent(fieldKey)}/scope`, { method: "PUT", json: { scope: pick, expected: v.data?.scope } }),
    { success: "Saved on the draft: it goes out with the next release", invalidate: [["field-scope", fieldKey], ["field", fieldKey], ["fields"], ["preview"], ["config"], ["combination"]] });
  if (v.isLoading) return <Spinner label="Loading whom this field is about" />;
  if (v.isError || !v.data) return <Notice tone="danger" title="Could not load whom this field is about">{(v.error as Error)?.message ?? "Try again."}</Notice>;
  const d = v.data, locked = d.published || retired || !canAuthor;
  const chosen = d.choices.find((c) => c.scope === pick);
  return (
    <section data-field-scope className="space-y-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="field-scope-title">
      <h2 id="field-scope-title" className="font-semibold">Asked about</h2>
      <p className="text-sm text-text-muted">Whom this fact is about. A case asks it once at that level, and every form that reads it gets the one value.</p>
      {d.published ? <Notice tone="info" title="Published">A published field's scope cannot change. Create a new field.</Notice> : null}
      {!d.published && !canAuthor ? <Notice tone="info" title="Read only">The configuration author chooses whom a field is about; you can see it here.</Notice> : null}
      {!d.published && canAuthor && retired ? <Notice tone="info" title="Read only">A retired or merged field takes no change.</Notice> : null}
      <fieldset className="grid gap-2 sm:grid-cols-2" disabled={locked}>
        <legend className="sr-only">Asked about</legend>
        {d.choices.map((c) => {
          const off = !!c.refused && !c.current;
          return (
            <label key={c.scope} data-scope-choice={c.scope} className={cn("flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm", pick === c.scope ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border-strong hover:bg-text/5", (off || locked) && "cursor-not-allowed opacity-70")}>
              <input type="radio" className="mt-1 size-4 accent-[var(--color-primary)]" name={`scope-${fieldKey}`} value={c.scope} checked={pick === c.scope} disabled={off || locked} onChange={() => setPick(c.scope)} aria-describedby={`scope-${c.scope}-help`} />
              <span>
                <span className="font-medium">{c.label}</span> <span className="text-text-muted">({c.short})</span>
                <span id={`scope-${c.scope}-help`} className="block text-xs text-text-muted">{off ? c.refused : `For example: ${c.example} (Sample).`}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {d.warning && pick !== d.scope ? <Notice tone="warn" title="Saved AI results">{d.warning}</Notice> : null}
      {!locked ? <div className="flex justify-end"><Button data-scope-save onClick={() => save.mutate(undefined)} busy={save.isPending} disabled={!chosen || pick === d.scope || !!chosen.refused}>Save as draft</Button></div> : null}
    </section>
  );
}
