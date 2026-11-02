// C4.11 (P-130, P-131, P-121; W1-questions-and-documents concept §4; forms lane): "Draft questions and documents" on
// the Questionnaires tab: one run of seven steps. The plan (each step, how it runs, the cost) shows before anything
// runs; the run then shows on the shared run card (Stop included), and its items go to To review, where a person
// accepts or removes each. P-227 (live wiring 5a): exactly two ways, Live and Saved, as on C4.7's dialog: Live greyed until
// the server opens it, Saved until an AI step has a Saved result; the worst case shows first; a failed Live step offers Saved.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Dialog, Notice, Pill } from "@/components/ui/controls";
import { RunCard, type RunView } from "@/components/run-card";

type Mode = "replay" | "live";
type Plan = { mode: Mode; steps: { n: number; kind: string; label: string; how: "rules" | "saved" | "live" | "not_yet" | "ai_only"; uses_ai: boolean }[]; facts: { total: number; roles: { role: string; label: string; facts: number }[] }; totals: { worst_usd: number; remaining_usd: number }; note: string; live: { approved: boolean; why: string | null }; saved: { available: boolean; why: string | null; steps: Record<string, boolean> } | null; plan_sha256: string };
type Finding = { rule: string; level: "error" | "warning"; message: string };
type Result = { runId: string; status: string; offer_saved?: boolean; proposed: number; findings: Finding[]; rules: Record<string, string>; note: string };
const MODES: [Mode, string, string][] = [
  ["live", "Live", "Steps 5 and 6 each run a first AI round and a blind checker round now. Cost shown first."],
  ["replay", "Saved", "Each AI step replays both rounds of one earlier Live run for this combination; a step with none saved says so. US$0."],
];
const HOW: Record<Plan["steps"][number]["how"], [string, "ai" | "neutral" | undefined]> = { rules: ["rules", undefined], saved: ["Saved", "ai"], live: ["Live", "ai"], not_yet: ["not available yet", "neutral"], ai_only: ["AI work", "neutral"] };

export function DraftQuestionsDocuments({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-qd-draft><ListChecks /> Draft questions and documents</Button>
      {open ? <QdDialog id={id} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function QdDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  // The Saved plan says what is open: Live (the server's switch) and Saved (an AI step has a Saved result).
  const base = useQuery<Plan, ApiError>({ queryKey: ["qd-plan", id, "replay"], queryFn: () => api<Plan>(`/combinations/${id}/draft-qd/plan`, { method: "POST", json: { mode: "replay" } }), retry: false });
  const liveOpen = !!base.data?.live.approved, savedOpen = !!base.data?.saved?.available;
  const [chosen, setMode] = React.useState<Mode | null>(null);
  const mode: Mode = chosen ?? (savedOpen || !liveOpen ? "replay" : "live");
  const livePlan = useQuery<Plan, ApiError>({ queryKey: ["qd-plan", id, "live"], queryFn: () => api<Plan>(`/combinations/${id}/draft-qd/plan`, { method: "POST", json: { mode: "live" } }), retry: false, enabled: mode === "live" && liveOpen });
  const plan = mode === "live" ? livePlan : base;
  const closed = (m: Mode) => !base.data || (m === "live" ? !liveOpen : !savedOpen);
  const nothing = base.isSuccess && closed("live") && closed("replay");
  // C4.11 review m2: a Live worst case above what is left of the cap is said before the click, and Live cannot start.
  const overCap = mode === "live" && !!plan.data && plan.data.totals.worst_usd > plan.data.totals.remaining_usd + 1e-9;
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const run = async () => {
    if (!plan.data || closed(mode)) return;
    setBusy(true); setError(null);
    try {
      // Review M1: the run goes on in the background; its card (with Stop) shows at once, the result when it ends.
      const r = await api<{ runId: string }>(`/combinations/${id}/draft-qd`, { method: "POST", json: { mode, planSha256: plan.data.plan_sha256 } });
      setResult({ runId: r.runId, status: "running", proposed: 0, findings: [], rules: {}, note: "" });
    } catch (e) {
      // Break m5: a run already going on for this combination: show its card here instead of words alone.
      const runId = e instanceof ApiError && e.status === 409 ? (e.problem as { runId?: string }).runId : undefined;
      if (runId) setResult({ runId, status: "running", proposed: 0, findings: [], rules: {}, note: e instanceof Error ? e.message : "" });
      else setError((e as Error).message);
      // Break L5: any refusal (a changed plan, the cap) reads the plans again, so the next Draft uses today's plan.
      if (e instanceof ApiError) void qc.invalidateQueries({ queryKey: ["qd-plan", id] });
    } finally { setBusy(false); }
  };
  /** When the card says the run ended: read its result (the server writes it just after the last step). */
  const ended = React.useCallback(async (v: RunView) => {
    for (const k of [["proposals"], ["review-queue"], ["setup-checklist"], ["fact-sources"]]) void qc.invalidateQueries({ queryKey: k });
    for (let i = 0; i < 10; i++) {
      try { const r = await api<Result>(`/combinations/${id}/draft-qd/${v.id}`); setResult(r); return; }
      catch (e) { if (!(e instanceof ApiError) || e.status !== 409) break; if (v.status === "failed" || v.status === "stopped") { setResult((x) => x && { ...x, status: v.status, note: v.message ?? e.message }); return; } await new Promise((res) => setTimeout(res, 300)); }
    }
  }, [id, qc]);
  // P-227: after a run whose Live AI step failed with a Saved result for it, one click goes back to the plan on Saved.
  const savedRef = React.useRef<HTMLInputElement>(null), [toSaved, setToSaved] = React.useState(false);
  React.useEffect(() => { if (toSaved && !result && base.data) { savedRef.current?.focus(); setToSaved(false); } }, [toSaved, result, base.data]);
  const useSaved = () => { setResult(null); setError(null); setMode("replay"); setToSaved(true); void qc.invalidateQueries({ queryKey: ["qd-plan", id] }); };
  const to = `/review/proposals?group=${encodeURIComponent(`combination:${id}`)}`;
  const ran = !!result && result.status !== "running";
  const footer = result
    ? <><Button variant="ghost" onClick={onClose}>Done</Button>{ran && result.offer_saved ? <Button variant="secondary" onClick={useSaved} data-qd-use-saved>Use Saved (US$0)</Button> : null}{result.proposed ? <Button asChild><Link to={to} data-qd-open-review>Open To review</Link></Button> : null}</>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data || closed(mode) || overCap} aria-describedby={(base.isSuccess || base.isError) && closed(mode) ? "qd-none" : overCap ? "qd-cost" : undefined} data-qd-start data-mode={mode}><ListChecks /> {closed(mode) ? "Draft" : mode === "replay" ? "Draft with Saved (US$0)" : "Draft Live"}</Button></>;
  return (
    <Dialog open wide onOpenChange={(o) => { if (!o) onClose(); }} title="Draft questions and documents" description="One run of seven steps. What needs a person goes to To review, where you accept or remove each; nothing changes the draft until then. Sample until the immigration expert confirms." footer={footer}>
      {result ? (
        <div className="space-y-3 text-sm" data-qd-result>
          <RunCard runId={result.runId} onEnded={(v) => void ended(v)} />
          {result.note ? <p data-qd-note>{result.note}</p> : null}
          {result.status === "running" || result.status === "stopped" || result.status === "failed" ? null : result.findings.length ? (
            <Notice tone="warn" title={`The rules found ${result.findings.length} thing${result.findings.length === 1 ? "" : "s"} to fix`}>
              <ul className="space-y-1" data-qd-findings>{result.findings.map((f, i) => <li key={i}><span className="font-medium">{result.rules[f.rule] ?? f.rule}:</span> {f.message}</li>)}</ul>
            </Notice>
          ) : <p className="text-text-muted" data-qd-clean>All four rules pass.</p>}
        </div>
      ) : (
        <div className="space-y-4" data-qd-plan>
          <fieldset className="space-y-2"><legend className="text-xs font-medium">How to draft</legend>
            {MODES.map(([m, label, hint]) => {
              const off = closed(m), why = !base.data ? null : m === "live" ? (liveOpen ? null : base.data.live.why) : (savedOpen ? null : base.data.saved?.why ?? null);
              return <label key={m} className={`flex gap-2 text-sm${off ? " text-text-muted" : ""}`} data-qd-mode={m}><input type="radio" name="qd-mode" ref={m === "replay" ? savedRef : undefined} checked={mode === m && !off} onChange={() => setMode(m)} disabled={off} className="mt-1" /><span><span className="font-medium">{label}{off && base.data ? (m === "live" ? " (not open)" : " (none yet)") : ""}</span><br /><span className="text-xs text-text-muted">{why ?? hint}</span></span></label>;
            })}
          </fieldset>
          {base.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p>
            : base.error ? <Notice tone="warn" title="It cannot be drafted yet"><span id="qd-none" data-qd-none>{base.error.message}</span></Notice>
            : nothing ? <p id="qd-none" className="text-sm" role="status" data-qd-none>Nothing can start for this combination yet: Live is not open and no AI step has a Saved result.</p>
            : closed(mode) ? <p id="qd-none" className="text-sm" role="status" data-qd-none>{mode === "replay" ? "No AI step has a Saved result yet, so choose Live." : "Live is not open, so choose Saved."}</p>
            : plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p>
            : plan.error ? <Notice tone="warn" title="It cannot be drafted this way yet">{plan.error.message}</Notice>
            : plan.data ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 text-xs text-text-muted">{plan.data.facts.total} fact{plan.data.facts.total === 1 ? "" : "s"} the forms need: {plan.data.facts.roles.map((r) => `${r.label} ${r.facts}`).join(" · ")}.</p>
              <ol className="list-decimal space-y-0.5 pl-5" data-qd-steps>{plan.data.steps.map((x) => <li key={x.n} data-qd-step={x.kind}>{x.label} {mode === "replay" && x.uses_ai && plan.data?.saved && !plan.data.saved.steps[x.kind] ? <><Pill tone="neutral">None saved</Pill><span className="text-xs text-text-muted"> (proposes nothing)</span></> : <Pill tone={HOW[x.how][1]}>{HOW[x.how][0]}</Pill>}</li>)}</ol>
              <p className="mt-2 font-medium" id="qd-cost" data-qd-cost>{mode !== "live" ? "Cost: US$0 (no AI call)." : overCap ? `At most US$${plan.data.totals.worst_usd.toFixed(2)}: over what is left of the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)}), so Live cannot start.` : `At most US$${plan.data.totals.worst_usd.toFixed(2)}, inside the AI spending cap (US$${plan.data.totals.remaining_usd.toFixed(2)} left).`}</p>
              <p className="mt-1 text-xs text-text-muted">{plan.data.note}</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
