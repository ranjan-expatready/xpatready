// QA-144 part 1 (P-318 (6), P-322): the Smart questionnaire tab's step for the shared placement rules
// (api/src/form-part-placements.ts). Each answer the combination's forms need and nobody is asked goes into the library
// section that groups its form field, from the form's own parts. Rules only: no AI, US$0. The author only.
import * as React from "react";
import { ListPlus } from "lucide-react";
import { api, useAction, useSessionView } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { factName } from "../../../engine/fact-name";

type Placed = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[]; selected: string[]; unselected: string[]; sections: number };

const TIP = "Rules only (no AI, US$0): each answer a form of this combination needs and nobody is asked is put in the library section that groups its form field, drafted from the form's own parts. An answer only a document line's condition reads goes beside the person's date of birth, sex or gender. Who answers it: the Client questionnaire. You can move or remove any question afterwards.";
/** Review m2: a refusal starts with the fact's or section's key; a person reads its name. */
const named = (line: string) => line.replace(/^(section )?([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*):/, (_, sec: string | undefined, key: string) => `${sec ?? ""}${factName(key)}:`);

export function PlaceFromFormParts({ id, offer = true }: { id: string; offer?: boolean }) {
  const { canAuthor } = useSessionView();
  const [result, setResult] = React.useState<Placed | null>(null);
  // Review m1: the pressed button goes busy, then away; the keyboard lands on the result instead of the page.
  const shown = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (result) shown.current?.focus(); }, [result]);
  const run = useAction(() => api<Placed>(`/combinations/${id}/place-from-form-parts`, { method: "POST", json: {} }), {
    success: (r) => r.placed.length ? `${r.placed.length} answer${r.placed.length === 1 ? "" : "s"} now asked in ${r.sections} section${r.sections === 1 ? "" : "s"}` : "Nothing was placed",
    onDone: (r) => setResult(r),
  });
  if (!canAuthor || (!offer && !result)) return null;
  const few = (xs: string[]) => `${xs.slice(0, 5).join(", ")}${xs.length > 5 ? ` and ${xs.length - 5} more` : ""}`;
  return (
    <div className="mt-2 space-y-2" data-place-from-parts>
      {offer ? <Tip tip={TIP}><Button size="sm" variant="secondary" busy={run.isPending} onClick={() => run.mutate(undefined)} data-place-from-parts-run><ListPlus /> Ask them in their forms' sections</Button></Tip> : null}
      {result ? (
        <div ref={shown} tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        <Notice tone={result.refused.length || result.noSection.length ? "warn" : result.placed.length ? "ok" : "info"} title={result.placed.length ? `${result.placed.length} answer${result.placed.length === 1 ? "" : "s"} now asked in ${result.sections} section${result.sections === 1 ? "" : "s"}` : "Nothing was placed"} className="text-sm">
          <div data-place-from-parts-result>
            {!result.placed.length && !result.noSection.length && !result.refused.length ? <p>Every answer the applied forms need is already asked, or no form's field map is applied yet (Forms tab).</p> : null}
            {result.noSection.length ? <p>{result.noSection.length} answer{result.noSection.length === 1 ? " has" : "s have"} no section that groups {result.noSection.length === 1 ? "its" : "their"} form field, or no section asks about the person yet: {few(result.noSection.map(factName))}. Draft sections from the form's parts on the Forms tab, or add a library section here.</p> : null}
            {result.unselected.length ? <p>{result.unselected.length} section{result.unselected.length === 1 ? " is" : "s are"} no longer chosen, because not every person answers {result.unselected.length === 1 ? "it" : "them"} now: {few(result.unselected.map(named))}. {result.unselected.length === 1 ? "Its" : "Their"} questions still go to whom they apply.</p> : null}
            {result.refused.length ? <p>{result.refused.length} refused by a rule: {few(result.refused.map(named))}</p> : null}
          </div>
        </Notice>
        </div>
      ) : null}
    </div>
  );
}
