// C4.7 (P-76, P-121, P-149 one door; forms lane): "Draft pre-qualification picks" on the Questionnaires tab's
// Pre-qualification view. The plan (steps and cost) shows before anything runs; the picks go to To review, where a
// person accepts or removes each (nothing is ticked here). AI now stays greyed until the server says it is approved.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Dialog, Notice, Pill } from "@/components/ui/controls";

type Mode = "rules" | "replay" | "live";
type Plan = { mode: Mode; guide: { code: string; title: string } | null; steps: { n: number; label: string; uses_ai: boolean }[]; candidates: number; totals: { worst_usd: number; remaining_usd: number }; note: string; live: { approved: boolean; why: string | null }; plan_sha256: string };
type Result = { runId: string; from: string | null; proposed: number; ready: number; check: number; decide: number; already: number; dropped: { role: string; asks: string; why: string }[]; unresolved: { passage: string; reason: string }[]; usd: number; note: string };
const MODES: [Mode, string, string][] = [
  ["rules", "Rules only", "No AI: the facts this combination's rules read. US$0."],
  ["replay", "Saved AI answers", "The answers AI gave before for this exact guide and prompt, replayed. US$0."],
  ["live", "AI now", "Two AI rounds read the guide; Ready only when both pick the same question."],
];

export function DraftPqrPicks({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-pqr-draft><Sparkles /> Draft pre-qualification picks</Button>
      {open ? <DraftDialog id={id} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function DraftDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = React.useState<Mode>("rules");
  const plan = useQuery<Plan, ApiError>({ queryKey: ["pqr-plan", id, mode], queryFn: () => api<Plan>(`/combinations/${id}/pqr-picks/plan`, { method: "POST", json: { mode } }), retry: false });
  const rules = useQuery<Plan, ApiError>({ queryKey: ["pqr-plan", id, "rules"], queryFn: () => api<Plan>(`/combinations/${id}/pqr-picks/plan`, { method: "POST", json: { mode: "rules" } }), retry: false });
  const live = rules.data?.live ?? { approved: false, why: null };
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const run = async () => {
    if (!plan.data) return;
    setBusy(true); setError(null);
    try {
      setResult(await api<Result>(`/combinations/${id}/pqr-picks/draft`, { method: "POST", json: { mode, planSha256: plan.data.plan_sha256 } }));
      for (const k of [["proposals"], ["review-queue"], ["setup-checklist"]]) void qc.invalidateQueries({ queryKey: k });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const to = `/review/proposals?group=${encodeURIComponent(`combination:${id}`)}`;
  const footer = result
    ? <><Button variant="ghost" onClick={onClose}>Done</Button>{result.proposed || result.already ? <Button asChild><Link to={to} data-pqr-open-review>Open To review</Link></Button> : null}</>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data}><Sparkles /> Draft</Button></>;
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o) onClose(); }} title="Draft pre-qualification picks" description="Each pick goes to To review with its reason; you accept or remove each there. Nothing is asked until a pick is accepted. Sample until the immigration expert confirms." footer={footer}>
      {result ? (
        <div className="space-y-3 text-sm" data-pqr-result>
          <p>{result.note}</p>
          {result.proposed ? <p data-pqr-counts>Ready to accept {result.ready} · Check {result.check} · Decide {result.decide}{result.from === "replay" ? " · saved AI answers, US$0" : result.from === "live" ? ` · AI now, US$${result.usd.toFixed(2)}` : " · rules, US$0"}</p> : null}
          {result.dropped.length ? <Notice tone="info" title={`Left out (${result.dropped.length})`}><ul className="space-y-0.5">{result.dropped.map((x, i) => <li key={i}>{x.asks}: {x.why}</li>)}</ul></Notice> : null}
          {result.unresolved.length ? <p className="text-xs text-text-muted">Passages for a person to read: {result.unresolved.map((x) => `"${x.passage}" (${x.reason})`).join(" · ")}</p> : null}
        </div>
      ) : (
        <div className="space-y-4" data-pqr-plan>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">How to draft them</legend>
            {MODES.map(([m, label, hint]) => { const off = m === "live" && !live.approved; return <label key={m} className={`flex gap-2 text-sm${off ? " text-text-muted" : ""}`} data-pqr-mode={m}><input type="radio" name="pqr-mode" checked={mode === m} onChange={() => setMode(m)} disabled={off} className="mt-1" /><span><span className="font-medium">{off ? "AI now (not approved yet)" : label}</span><br /><span className="text-xs text-text-muted">{off ? live.why ?? "Checking whether AI now is approved…" : hint}</span></span></label>; })}
          </fieldset>
          {plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p> : plan.error ? <Notice tone="warn" title="It cannot be drafted this way yet">{plan.error.message}</Notice> : plan.data ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              {plan.data.guide ? <p className="mb-1 text-xs text-text-muted">Reads {plan.data.guide.code}: {plan.data.guide.title}.</p> : null}
              <ol className="list-decimal space-y-0.5 pl-5">{plan.data.steps.map((x) => <li key={x.n}>{x.label} {x.uses_ai ? <Pill tone="ai">AI</Pill> : <Pill>rules</Pill>}</li>)}</ol>
              <p className="mt-2 font-medium" data-pqr-cost>{mode === "live" ? `At most US$${plan.data.totals.worst_usd.toFixed(2)}, inside the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)} left).` : "Cost: US$0 (no AI call)."}</p>
              <p className="mt-1 text-xs text-text-muted">{plan.data.note} {plan.data.candidates} question{plan.data.candidates === 1 ? "" : "s"} a prospect could be asked.</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
