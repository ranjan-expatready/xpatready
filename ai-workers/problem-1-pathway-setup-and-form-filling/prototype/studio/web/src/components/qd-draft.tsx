// C4.11 (P-130, P-131, P-121; W1-questions-and-documents concept §4; forms lane): "Draft questions and documents" on
// the Questionnaires tab: one run of seven steps. The plan (each step, how it runs, the cost) shows before anything
// runs; the run then shows on the shared run card (Stop included), and its items go to To review, where a person
// accepts or removes each. Only US$0 ways here; AI now waits for the founder's live trial (P-131).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Dialog, Notice, Pill } from "@/components/ui/controls";
import { RunCard, type RunView } from "@/components/run-card";

type Mode = "rules" | "replay";
type Plan = { mode: Mode; steps: { n: number; kind: string; label: string; how: "rules" | "saved" | "not_yet" | "ai_only"; uses_ai: boolean }[]; facts: { total: number; roles: { role: string; label: string; facts: number }[] }; note: string; live: { approved: boolean; why: string | null }; plan_sha256: string };
type Finding = { rule: string; level: "error" | "warning"; message: string };
type Result = { runId: string; status: string; proposed: number; findings: Finding[]; rules: Record<string, string>; note: string };
const MODES: [Mode, string, string][] = [
  ["rules", "Rules only", "No AI: rules work out each step. US$0."],
  ["replay", "Saved", "The answers AI gave before for this combination's files, replayed; a step with none saved says so. US$0."],
];
const HOW: Record<Plan["steps"][number]["how"], [string, "ai" | "neutral" | undefined]> = { rules: ["rules", undefined], saved: ["Saved", "ai"], not_yet: ["not available yet", "neutral"], ai_only: ["AI work: Saved only", "neutral"] };

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
  const [mode, setMode] = React.useState<Mode>("rules");
  const plan = useQuery<Plan, ApiError>({ queryKey: ["qd-plan", id, mode], queryFn: () => api<Plan>(`/combinations/${id}/draft-qd/plan`, { method: "POST", json: { mode } }), retry: false });
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState<string | null>(null);
  const run = async () => {
    if (!plan.data) return;
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
  const to = `/review/proposals?group=${encodeURIComponent(`combination:${id}`)}`;
  const footer = result
    ? <><Button variant="ghost" onClick={onClose}>Done</Button>{result.proposed ? <Button asChild><Link to={to} data-qd-open-review>Open To review</Link></Button> : null}</>
    : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void run()} busy={busy} disabled={!plan.data}><ListChecks /> Draft</Button></>;
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
            {MODES.map(([m, label, hint]) => <label key={m} className="flex gap-2 text-sm" data-qd-mode={m}><input type="radio" name="qd-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1" /><span><span className="font-medium">{label}</span><br /><span className="text-xs text-text-muted">{hint}</span></span></label>)}
            <p className="flex gap-2 text-sm text-text-muted" data-qd-mode="live"><input type="radio" disabled aria-label="Live (not approved yet)" className="mt-1" /><span><span className="font-medium">Live (not approved yet)</span><br /><span className="text-xs">{plan.data?.live.why ?? "Waits for the founder's Go for the live trial."}</span></span></p>
          </fieldset>
          {plan.isPending ? <p className="text-sm text-text-muted">Working out the steps and their cost…</p> : plan.error ? <Notice tone="warn" title="It cannot be drafted yet">{plan.error.message}</Notice> : plan.data ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 text-xs text-text-muted">{plan.data.facts.total} fact{plan.data.facts.total === 1 ? "" : "s"} the forms need: {plan.data.facts.roles.map((r) => `${r.label} ${r.facts}`).join(" · ")}.</p>
              <ol className="list-decimal space-y-0.5 pl-5" data-qd-steps>{plan.data.steps.map((x) => <li key={x.n} data-qd-step={x.kind}>{x.label} <Pill tone={HOW[x.how][1]}>{HOW[x.how][0]}</Pill></li>)}</ol>
              <p className="mt-2 font-medium" data-qd-cost>Cost: US$0 (no AI call).</p>
              <p className="mt-1 text-xs text-text-muted">{plan.data.note}</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-text-danger">{error}</p> : null}
        </div>
      )}
    </Dialog>
  );
}
