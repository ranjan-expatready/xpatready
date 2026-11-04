// QA-144 part 1 (P-318 (6), P-322): the Smart questionnaire tab's step for the shared placement rules
// (api/src/form-part-placements.ts). Each answer the combination's forms need and nobody is asked goes into the library
// section that groups its form field, from the form's own parts. Rules only: no AI, US$0. The author only.
import * as React from "react";
import { ListPlus } from "lucide-react";
import { api, useAction, useSessionView } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { factName } from "../../../engine/fact-name";

type Placed = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[]; selected: string[]; sections: number };

const TIP = "Rules only (no AI, US$0): each answer a form of this combination needs and nobody is asked is put in the library section that groups its form field, drafted from the form's own parts. Who answers it: the client's questionnaire. You can move or remove any question afterwards.";

export function PlaceFromFormParts({ id, offer = true }: { id: string; offer?: boolean }) {
  const { canAuthor } = useSessionView();
  const [result, setResult] = React.useState<Placed | null>(null);
  const run = useAction(() => api<Placed>(`/combinations/${id}/place-from-form-parts`, { method: "POST", json: {} }), {
    success: (r) => r.placed.length ? `${r.placed.length} answer${r.placed.length === 1 ? "" : "s"} now asked in ${r.sections} section${r.sections === 1 ? "" : "s"}` : "Nothing was placed",
    onDone: (r) => setResult(r),
  });
  if (!canAuthor || (!offer && !result)) return null;
  const few = (xs: string[]) => `${xs.slice(0, 5).join(", ")}${xs.length > 5 ? ` and ${xs.length - 5} more` : ""}`;
  return (
    <div className="mt-2 space-y-2" data-place-from-parts>
      {offer ? <Tip tip={TIP}><Button size="sm" variant="secondary" busy={run.isPending} onClick={() => run.mutate(undefined)} data-place-from-parts-run><ListPlus /> Ask them in their form's sections</Button></Tip> : null}
      {result ? (
        <Notice tone={result.refused.length || result.noSection.length ? "warn" : result.placed.length ? "ok" : "info"} title={result.placed.length ? `${result.placed.length} answer${result.placed.length === 1 ? "" : "s"} now asked in ${result.sections} section${result.sections === 1 ? "" : "s"}` : "Nothing was placed"} className="text-sm">
          <div data-place-from-parts-result>
            {!result.placed.length && !result.noSection.length && !result.refused.length ? <p>Every answer the applied forms need is already asked, or no form's field map is applied yet (Forms tab).</p> : null}
            {result.noSection.length ? <p>{result.noSection.length} answer{result.noSection.length === 1 ? " has" : "s have"} no section that groups {result.noSection.length === 1 ? "its" : "their"} form field: {few(result.noSection.map(factName))}. Draft sections from the form's parts on the Forms tab, or add a library section here.</p> : null}
            {result.refused.length ? <p>{result.refused.length} refused by a rule: {few(result.refused)}</p> : null}
          </div>
        </Notice>
      ) : null}
    </div>
  );
}
