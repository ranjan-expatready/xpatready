// C4.7 (P-76, P-121, P-149 one door; forms lane): "Draft pre-qualification picks" on the Questionnaires tab's
// Pre-qualification view. The plan (steps and cost) shows before anything runs; the picks go to To review, where a
// person accepts or removes each (nothing is ticked here). P-227: exactly two ways, Live and Saved; Live stays greyed
// until the server says it is open, Saved until a Saved result exists, and a failed Live run offers Saved when there is one.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Dialog, Notice, Pill } from "@/components/ui/controls";

type Mode = "replay" | "live";
type Plan = { mode: Mode; guide: { code: string; title: string } | null; steps: { n: number; label: string; uses_ai: boolean }[]; candidates: number; totals: { worst_usd: number; remaining_usd: number }; note: string; live: { approved: boolean; why: string | null }; saved: { available: boolean; why: string | null } | null; plan_sha256: string };
type Result = { runId: string; from: string | null; offer_saved?: boolean; proposed: number; ready: number; check: number; decide: number; already: number; dropped: { role: string; asks: string; why: string }[]; unresolved: { passage: string; reason: string }[]; usd: number; note: string };
const MODES: [Mode, string, string][] = [
  ["live", "Live", "Two AI rounds read the guide now; Ready only when both pick the same question. Cost shown first."],
  ["replay", "Saved", "Both AI rounds of one earlier Live run for this guide, replayed through the same steps. US$0."],
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
  // The Saved plan says what is open: Live (the server's switch) and Saved (a checked result exists). It needs the guide,
  // so with no guide it says how to get one and nothing can start.
  const base = useQuery<Plan, ApiError>({ queryKey: ["pqr-plan", id, "replay"], queryFn: () => api<Plan>(`/combinations/${id}/pqr-picks/plan`, { method: "POST", json: { mode: "replay" } }), retry: false });
  const liveOpen = !!base.data?.live.approved, savedOpen = !!base.data?.saved?.available;
  const [chosen, setMode] = React.useState<Mode | null>(null);
  const mode: Mode = chosen ?? (savedOpen || !liveOpen ? "replay" : "live");
  const livePlan = useQuery<Plan, ApiError>({ queryKey: ["pqr-plan", id, "live"], queryFn: () => api<Plan>(`/combinations/${id}/pqr-picks/plan`, { method: "POST", json: { mode: "live" } }), retry: false, enabled: mode === "live" && liveOpen });
  const plan = mode === "live" ? livePlan : base;
  const closed = (m: Mode) => !base.data || (m === "live" ? !liveOpen : !savedOpen);
  const nothing = base.isSuccess && closed("live") && closed("replay");
  // C4.11 review m2: a Live worst case above what is left of the cap is said before the click, and Live cannot start.
  const overCap = mode === "live" && !!plan.data && plan.data.totals.worst_usd > plan.data.totals.remaining_usd + 1e-9;
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  // Break B10: the result is announced and takes focus; after "Use Saved" focus goes to the Saved choice, not to Draft.
  const resultRef = React.useRef<HTMLDivElement>(null), savedRef = React.useRef<HTMLInputElement>(null), [toSaved, setToSaved] = React.useState(false);
  React.useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);
  React.useEffect(() => { if (toSaved && !result && base.data) { savedRef.current?.focus(); setToSaved(false); } }, [toSaved, result, base.data]);
  const run = async () => {
    if (!plan.data || closed(mode)) return;
    setBusy(true); setError(null);
    try {
      setResult(await api<Result>(`/combinations/${id}/pqr-picks/draft`, { method: "POST", json: { mode, planSha256: plan.data.plan_sha256 } }));
      for (const k of [["proposals"], ["review-queue"], ["setup-checklist"]]) void qc.invalidateQueries({ queryKey: k });
    } catch (e) {
      setError((e as Error).message);
      // A refusal (a changed plan, the cap) reads the plans again so the next Draft shows today's figures.
      if (e instanceof ApiError) void qc.invalidateQueries({ queryKey: ["pqr-plan", id] });
    } finally { setBusy(false); }
  };
  // P-227 (D2 part 4): after a failed Live run with a Saved result, one click goes back to the plan on Saved.
  const useSaved = () => { setResult(null); setError(null); setMode("replay"); setToSaved(true); void qc.invalidateQueries({ queryKey: ["pqr-plan", id] }); };
  const to = `/review/proposals?group=${encodeURIComponent(`combination:${id}`)}`;
  const footer = result
    ? <><Button variant="ghost" onClick={onClose}>Done</Button>{result.offer_saved ? <Button variant="secondary" onClick={useSaved} data-pqr-use-saved>Use Saved (US$0)</Button> : null}{result.proposed || result.already ? <Button asChild><Link to={to} data-pqr-open-review>Open To review</Link></Button> : null}</>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data || closed(mode) || overCap} aria-describedby={(base.isSuccess || base.isError) && closed(mode) ? "pqr-none" : overCap ? "pqr-cost" : undefined} data-pqr-start data-mode={mode}><Sparkles /> {closed(mode) ? "Draft" : mode === "replay" ? "Draft with Saved (US$0)" : "Draft Live"}</Button></>;
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o) onClose(); }} title="Draft pre-qualification picks" description="Each pick goes to To review with its reason; you accept or remove each there. Nothing is asked until a pick is accepted. Sample until the immigration expert confirms." footer={footer}>
      {result ? (
        <div className="space-y-3 text-sm outline-none" data-pqr-result ref={resultRef} tabIndex={-1} role="status">
          <p data-pqr-note>{result.note}</p>
          {!result.proposed && result.usd > 0 ? <p data-pqr-spent>Live, US${result.usd.toFixed(2)} counted.</p> : null}
          {result.proposed ? <p data-pqr-counts>Ready to accept {result.ready} · Check {result.check} · Decide {result.decide}{result.from === "replay" ? " · Saved, US$0" : result.from === "live" ? ` · Live, US$${result.usd.toFixed(2)}` : " · rules, US$0"}</p> : null}
          {result.dropped.length ? <Notice tone="info" title={`Left out (${result.dropped.length})`}><ul className="space-y-0.5">{result.dropped.map((x, i) => <li key={i}>{x.asks}: {x.why}</li>)}</ul></Notice> : null}
          {result.unresolved.length ? <p className="text-xs text-text-muted">Passages for a person to read: {result.unresolved.map((x) => `"${x.passage}" (${x.reason})`).join(" · ")}</p> : null}
        </div>
      ) : (
        <div className="space-y-4" data-pqr-plan data-plan-loaded={base.isSuccess || base.isError ? "true" : "false"}>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">How to draft them</legend>
            {MODES.map(([m, label, hint]) => {
              const off = closed(m);
              const why = !base.data ? null : m === "live" ? (liveOpen ? null : base.data.live.why) : (savedOpen ? null : base.data.saved?.why ?? null);
              return <label key={m} className={`flex gap-2 text-sm${off ? " text-text-muted" : ""}`} data-pqr-mode={m}><input type="radio" name="pqr-mode" ref={m === "replay" ? savedRef : undefined} checked={mode === m && !off} onChange={() => setMode(m)} disabled={off} className="mt-1" /><span><span className="font-medium">{label}{off && base.data ? (m === "live" ? " (not open)" : " (none yet)") : ""}</span><br /><span className="text-xs text-text-muted">{why ?? hint}</span></span></label>;
            })}
          </fieldset>
          {base.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p>
            : base.error ? <Notice tone="warn" title="It cannot be drafted yet"><span id="pqr-none" data-pqr-none>{base.error.message}</span></Notice>
            : nothing ? <p id="pqr-none" className="text-sm" role="status" data-pqr-none>Nothing can start for this combination yet: Live is not open and it has no Saved result.</p>
            : closed(mode) ? <p id="pqr-none" className="text-sm" role="status" data-pqr-none>{mode === "replay" ? "It has no Saved result yet, so choose Live." : "Live is not open, so choose Saved."}</p>
            : plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p>
            : plan.error ? <Notice tone="warn" title="It cannot be drafted this way yet">{plan.error.message}</Notice>
            : plan.data ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              {plan.data.guide ? <p className="mb-1 text-xs text-text-muted">Reads {plan.data.guide.code}: {plan.data.guide.title}.</p> : null}
              <ol className="list-decimal space-y-0.5 pl-5">{plan.data.steps.map((x) => <li key={x.n}>{x.label} {x.uses_ai ? <Pill tone="ai">AI</Pill> : <Pill>rules</Pill>}</li>)}</ol>
              <p className="mt-2 font-medium" id="pqr-cost" data-pqr-cost>{mode !== "live" ? "Cost: US$0 (no AI call)." : overCap ? `At most US$${plan.data.totals.worst_usd.toFixed(2)}: over what is left of the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)}), so Live cannot start.` : `At most US$${plan.data.totals.worst_usd.toFixed(2)}, inside the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)} left).`}</p>
              <p className="mt-1 text-xs text-text-muted">{plan.data.note} {plan.data.candidates} question{plan.data.candidates === 1 ? "" : "s"} a prospect could be asked.</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
