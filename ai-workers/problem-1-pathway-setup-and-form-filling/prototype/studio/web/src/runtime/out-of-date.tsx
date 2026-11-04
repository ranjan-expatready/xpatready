// C9.2 Out of date (runtime lane, M3-F; r5c BR-12, BR-20; P-65, P-136): the finished items of a case (a validated copy
// read back, a form signed by hand and scanned, a section entered in the portal) that a later change made out of date,
// each with its words from the Prepare view (the fact, the person, the old and new value, the date, the next step) and
// "Undo this change" per changed fact. The items themselves are never changed. Shown above the case's forms; nothing
// shows when nothing is out of date, or for someone who is not the case officer (the Prepare view is staff only).
import * as React from "react";
import { AlertCircle, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, useActorId, useApi, useToast } from "@/lib/api";
import { Button } from "@/components/ui/controls";
import { noRetryOnRefusal } from "./questionnaire";

/** `restores`: what Undo puts back (the newest earlier value that differs, the route's own rule); `expected_id`: the answer
 *  this screen saw, sent with Undo so a change made meanwhile (another tab) is refused, never undone blind. */
type Change = { subject: string; fact: string; label: string; person: string; was: unknown; now: unknown; at: string | null; undo: boolean; expected_id: string | null; restores: unknown };
type Item = { id: string; kind: string; form?: string; person: string; state: string; reason?: string; changes?: Change[] };

const shown = (v: unknown) => { const t = v === null || v === undefined || v === "" ? "no answer" : typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "object" ? Object.values(v as Record<string, unknown>).filter((x) => x !== null && x !== "").join(" ") : String(v); return t.length > 40 ? `${t.slice(0, 39)}…` : t; };
const short = (label: string) => (label.length > 40 ? `${label.slice(0, 39)}…` : label);

export function OutOfDate({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<{ items: Item[] }>(["runtime", "view", caseId, "prepare", actor], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const items = (q.data?.items ?? []).filter((i) => i.state === "out_of_date");
  if (!items.length) return null;
  return (
    <section aria-labelledby="ood-h" className="border-b border-border bg-surface px-4 py-3" data-out-of-date={items.length}>
      <h3 id="ood-h" tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold text-text-warn outline-none"><AlertCircle className="size-4" aria-hidden />Out of date ({items.length}): changed after they were finished</h3>
      <p className="text-[13px] text-text-muted">These were validated, signed or entered with earlier answers. They are kept exactly as they were. Prepare them again, or undo the change.</p>
      <ul className="mt-2 space-y-2">{items.map((i) => <OutOfDateItem key={i.id} caseId={caseId} item={i} />)}</ul>
    </section>
  );
}

function OutOfDateItem({ caseId, item }: { caseId: string; item: Item }) {
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  // One Undo per person and fact (an item can list a fact twice when two of its sections show it).
  const undoable = [...new Map((item.changes ?? []).filter((c) => c.undo).map((c) => [`${c.subject}|${c.fact}`, c])).values()];
  async function undo(c: Change) {
    setBusy(`${c.subject}|${c.fact}`);
    try { const r = await api<{ message: string }>(`/runtime/cases/${caseId}/changes/undo`, { method: "POST", json: { subjectId: c.subject, fact: c.fact, expectedId: c.expected_id } }); toast.push({ tone: "ok", text: r.message }); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); setBusy(null);
    // Review S3: the button may be gone; the focus goes to the list's heading, or the panel's when the list is empty.
    requestAnimationFrame(() => (document.getElementById("ood-h") ?? document.getElementById("forms-h"))?.focus());
  }
  return (
    <li className="rounded-lg border border-border border-l-4 border-l-warn bg-surface-raised px-3 py-2" data-out-of-date-item={item.form}>
      <p className="text-sm font-medium"><span className="mono">{item.form}</span> <span className="font-normal text-text-muted">for</span> <span className="[overflow-wrap:anywhere]">{item.person}</span></p>
      <p className="text-[13px] text-text-muted [overflow-wrap:anywhere]">{item.reason}</p>
      {undoable.length ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {undoable.map((c) => {
            // Review M1, M3: the words say what Undo really puts back, and the accessible name starts with them (WCAG 2.5.3).
            const text = `Undo: ${short(c.label)} back to ${shown(c.restores)}`;
            return (
              <Button key={`${c.subject}|${c.fact}`} size="sm" variant="secondary" className="h-auto min-h-8 max-w-full whitespace-normal py-1 text-left" busy={busy === `${c.subject}|${c.fact}`} disabled={!!busy} onClick={() => void undo(c)}
                aria-label={`${text}, for ${c.person}`} data-undo={c.fact}>
                <Undo2 aria-hidden />{text}
              </Button>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}
