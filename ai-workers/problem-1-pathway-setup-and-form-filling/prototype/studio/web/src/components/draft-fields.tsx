// C11.13 "Draft fields" (S6 plan slice 1b item 6, P-138; forms lane): the form's one AI button for its shared fields, in
// the Form library drawer. A saved AI draft of the form's current edition is used at once at US$0 and its fields wait on
// To review › Proposals, matched reuse or new; with no saved draft the form says so, with the cost of a live run, and the
// button is greyed with the reason (live AI is off on this copy). Drafted once per edition: then it links the queue.
import * as React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api, ApiError, useAction, useApi } from "@/lib/api";
import { Tip } from "@/components/status";
import { Button } from "@/components/ui/controls";

/** "cannot": an ordinary state where there is nothing to draft (no approved edition, not read, a checklist), in words. */
export type DraftFieldsPlan = { code: string; edition: null; state: "cannot"; words: string } | {
  code: string; edition: string; boxes: number; state: "no_saved" | "saved" | "drafted"; words: string;
  saved: { draft: boolean; check: boolean }; cost: { about_usd: number; at_most_usd: number; words: string };
  live: { open: boolean; why: string }; drafted: { job_id: string; proposals: number; waiting: number; group: string; message: string | null } | null;
};
const queueHref = (group: string) => `/review/proposals?group=${encodeURIComponent(group)}`;

export function DraftFields({ code, canAuthor }: { code: string; canAuthor: boolean }) {
  const plan = useApi<DraftFieldsPlan>(["draft-fields", code], `/library/forms/${encodeURIComponent(code)}/draft-fields`, { retry: false });
  const [done, setDone] = React.useState<{ group: string; text: string } | null>(null);
  const draft = useAction(() => api<{ proposals: number; group: string; message: string }>(`/library/forms/${encodeURIComponent(code)}/draft-fields`, { method: "POST", json: { mode: "replay" } }),
    { success: (r) => r.message, invalidate: [["draft-fields", code], ["proposals"], ["review-queue"]], onDone: (r) => setDone({ group: r.group, text: r.message }) });
  const p = plan.data;
  return (
    <section className="mt-4 space-y-2 text-sm" aria-labelledby="fd-draft" data-draft-fields={p?.state ?? (plan.isError ? "refused" : "loading")}>
      <h3 id="fd-draft" className="font-semibold">Fields drafted by AI</h3>
      {plan.isLoading ? <p className="text-text-muted">Loading…</p>
        : plan.isError ? <p className="text-text-muted" data-draft-fields-why>{plan.error instanceof ApiError ? plan.error.message : "Could not read whether this form has a saved AI draft."}</p>
        : p?.state === "cannot" ? <p className="text-text-muted" data-draft-fields-why>{p.words}</p>
        : p ? <>
          <p data-draft-fields-words>{p.words}</p>
          {/* Review of #427: the queue shows only waiting items, so the link is offered only while some still wait. */}
          {p.state === "drafted" && p.drafted ? (p.drafted.waiting > 0 ? <p><Link className="text-text-link underline" to={queueHref(p.drafted.group)}>Open its fields on To review › Proposals</Link></p> : <p className="text-text-muted" data-draft-fields-all-decided>All its drafted fields are decided: see Shared library › Fields.</p>)
            : done ? <p role="status"><Link className="text-text-link underline" to={queueHref(done.group)}>Open its fields on To review › Proposals</Link></p>
            : p.state === "saved" ? (canAuthor
              ? <Button size="sm" onClick={() => draft.mutate(undefined)} busy={draft.isPending}><Sparkles aria-hidden />Draft fields with AI (saved draft, US$0)</Button>
              : <p className="text-xs text-text-muted">Read-only: a person with the author duty drafts the fields.</p>)
            : <Tip tip={p.live.why}><span tabIndex={0} className="inline-block rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-describedby="fd-draft-why">
                <Button size="sm" variant="secondary" disabled><Sparkles aria-hidden />Draft fields with AI ({p.cost.words})</Button>
              </span></Tip>}
          {p.state === "no_saved" ? <p id="fd-draft-why" className="text-xs text-text-muted" data-draft-fields-live>{p.live.why}</p> : null}
          <p className="text-xs text-text-muted">{p.boxes} form field{p.boxes === 1 ? "" : "s"} on {p.edition} · drafted once for the edition and reused by every combination that files it · Sample until the immigration expert confirms.</p>
        </> : null}
    </section>
  );
}
