// One launch dialog for every AI entry point (D280): catalogue selection, a program, a combination or a source. It shows
// the plan the server made (targets, eligible sources, reuse, skips, reasons, cost) before anything starts. Starting sends
// the plan's fingerprint and a launch key: the server re-plans and refuses if the work changed, and the same key sent
// twice (double click, retry after a network error) returns the same work instead of starting it again.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api, ApiError, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCostGate } from "@/components/cost-warning";
import { COST_WORDS } from "../../../contracts/cost-check";

export type AiScope = { kind: "catalogue" | "program" | "combination" | "source"; ids: string[]; label?: string };
const MODES = [
  ["LIVE", "Live AI", "Reads each form with AI; unchanged forms reuse what was read before; the cost is shown below before it starts"],
  ["REPLAY", "Replay saved runs", "No model call, US$0; uses earlier real runs, labelled as replays"],
  ["STUB", "Stub pass", "No network, no cost, no AI content: proves the path only"],
] as const;
const WORK_CHANGED = "The work changed since you reviewed it (a source, a draft or a running step changed). Review the updated plan, then start again.";
const TONE: Record<string, string> = { draft: "ai", reuse_saved_output: "info", reuse_library: "ok", skip: "neutral", not_eligible: "warn" };

export function AiLaunchDialog({ scope, onClose, initialMode = "LIVE" }: { scope: AiScope; onClose: () => void; initialMode?: "LIVE" | "REPLAY" | "STUB" }) {
  const nav = useNavigate();
  const toast = useToast();
  const [mode, setMode] = React.useState<"LIVE" | "REPLAY" | "STUB">(initialMode);
  const [again, setAgain] = React.useState(false);
  const [limit, setLimit] = React.useState<string>("");
  const [key] = React.useState(() => (globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  const plan = useQuery<any>({ queryKey: ["ai-plan", scope.kind, scope.ids.join(","), mode, again], queryFn: () => api("/ai/plan", { method: "POST", json: { scope: { kind: scope.kind, ids: scope.ids }, mode, draftAgain: again } }), staleTime: 0 });
  const p = plan.data;
  React.useEffect(() => { if (p) setLimit(p.totals.worst_usd.toFixed(2)); }, [p?.plan_sha256]);
  const cost = useCostGate(); // P-179: over a limit, the cost warning first (Continue or Cancel)
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const sc = { kind: scope.kind, ids: scope.ids };
      // N6 follow-up: a live start makes its plan again first (spend may have come from another copy since this panel made
      // it), so the warning shows today's figures. The launch still sends the fingerprint of the plan shown here: if the
      // work itself changed, the server refuses and the panel shows the new plan.
      // Review Minor 2: the work itself changed (not only spend): say so before any warning, so no Continue is recorded for a
      // plan this launch would not use; the panel already shows the new plan.
      const planAgain = async () => { const r = await plan.refetch(); if (r.error) throw r.error; if (r.data.plan_sha256 !== p.plan_sha256) throw new Error(WORK_CHANGED); return r.data; };
      const b: any = await cost.gate(mode === "LIVE" ? planAgain : p, { kind: "draft_field_maps", scope: sc, mode, draftAgain: again }, (overrideId) => api("/ai/batches", { method: "POST", json: { scope: sc, mode, draftAgain: again, idempotencyKey: key, planSha256: p.plan_sha256, spendLimitUsd: Number(limit), ...(overrideId ? { overrideId } : {}) } }));
      if (!b) { toast.push({ tone: "info", text: COST_WORDS.cancelled }); return; }
      toast.push({ tone: "ok", text: `AI work started: ${b.jobs.length} step${b.jobs.length === 1 ? "" : "s"}` });
      onClose(); nav(`/ai/${b.id}`);
    } catch (e) {
      setErr((e as Error).message);
      // Break 3 m1: any refusal (a cost refusal is a 400) makes the plan again, so the next Start shows today's warning.
      if (e instanceof ApiError) void plan.refetch();
    } finally { setBusy(false); }
  };
  const runnable = p ? p.totals.steps : 0;
  const groups = p ? Object.values(p.targets.reduce((m: any, t: any) => { (m[t.combinationId] ??= { label: t.combination, program: t.program, items: [] }).items.push(t); return m; }, {})) as any[] : [];
  return (
    // Screen 02 board view 2 (Draft setup): the team's right panel (P-48), the plan and its cost before any paid run (BR-3).
    <Panel open onOpenChange={(o) => !o && onClose()} title={scope.kind === "combination" ? "Draft setup" : "AI configuration"} description={p ? `${p.operation_label} · ${p.scope.label}` : scope.label ?? "Preparing the plan"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={start} busy={busy} disabled={!p || !runnable || plan.isFetching || !(Number(limit) >= 0)}><Sparkles /> {p ? `Start ${runnable} step${runnable === 1 ? "" : "s"}${p.totals.worst_usd ? `, up to US$${p.totals.worst_usd.toFixed(2)}` : ", US$0"}` : "Start"}</Button></>}>
      <div className="space-y-4">
        <fieldset className="grid gap-2 md:grid-cols-3" aria-label="How the AI runs">
          {MODES.map(([k, l, d]) => (
            <label key={k} className={cn("cursor-pointer rounded-lg border p-3 text-sm", mode === k ? "border-primary bg-primary/5" : "border-border")}>
              <span className="flex items-center gap-2 font-medium"><input type="radio" name="ai-mode" checked={mode === k} onChange={() => setMode(k)} />{l}</span>
              <span className="mt-1 block text-xs text-text-muted">{d}</span>
            </label>
          ))}
        </fieldset>
        {p ? <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" data-cost-line>{mode === "LIVE" ? <>Expected {p.totals.expected_usd === null ? "unknown" : `US$${p.totals.expected_usd.toFixed(2)}`} · worst case US${p.totals.worst_usd.toFixed(2)} (each form capped at US${p.per_run_cap_usd}; at most {p.max_paid_attempts_per_form} paid attempts per form, a retry included) · Spent so far US${p.ledger.committed_usd.toFixed(2)} of US${p.ledger.cap_usd.toFixed(2)}.</> : mode === "REPLAY" ? "Replay of saved real runs: no model call, US$0." : "Stub pass: no network, no cost, no AI content."}</p> : null}
        {p ? <p className="text-xs text-text-muted">{p.capability_note}</p> : null}
        {plan.isLoading ? <Spinner label="Working out what would run" /> : plan.isError ? <Notice tone="danger" title="The plan could not be made">{(plan.error as Error).message}</Notice> : p ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
              <Count n={p.totals.model_calls} l="model calls" tone={p.totals.model_calls ? "ai" : undefined} />
              <Count n={p.totals.reuse} l="reused (no model call)" />
              <Count n={p.totals.skipped} l="skipped" />
              <Count n={p.totals.not_eligible} l="not eligible" />
              <Count n={p.totals.expected_usd === null ? "unknown" : `US$${p.totals.expected_usd.toFixed(2)}`} l={`expected · worst US$${p.totals.worst_usd.toFixed(2)}`} />
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-text-muted"><tr><th className="px-3 py-2 font-medium">Combination and source</th><th className="px-3 py-2 font-medium">What happens</th><th className="px-3 py-2 text-right font-medium">Cost</th></tr></thead>
                <tbody>
                  {groups.map((g) => g.items.map((t: any, i: number) => (
                    <tr key={`${t.combinationId}-${t.attachmentId}`} className="border-t border-border align-top">
                      <td className="px-3 py-2">{i === 0 ? <p className="font-medium">{g.label} <span className="font-normal text-text-muted">· {g.program}</span></p> : null}<p className="text-text-muted">{t.source}</p></td>
                      <td className="px-3 py-2"><Pill tone={TONE[t.action]}>{t.action_label}</Pill><p className="mt-1 text-xs text-text-muted">{t.why}</p></td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-xs">{t.action === "draft" && mode === "LIVE" ? <>{t.expected_usd !== null ? `~US$${t.expected_usd.toFixed(2)}` : "unknown"}<br /><span className="text-text-muted">max US${t.worst_usd.toFixed(2)}</span></> : "US$0"}</td>
                    </tr>)))}
                  {!p.targets.length ? <tr><td colSpan={3} className="px-3 py-6 text-center text-text-muted">No forms in this scope. Attach official forms on a combination's Sources and forms first.</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              {mode === "LIVE" ? <Field label="Limit for this launch (US$)" hint={`Experiment cap US$${p.ledger.cap_usd}: US$${p.ledger.remaining_usd.toFixed(2)} left · US$${p.per_run_cap_usd} per form`} className="w-64"><Input type="number" min={0} step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field> : null}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} /> Draft again even where saved output or a waiting draft exists</label>
            </div>
          </>
        ) : null}
        {scope.kind === "combination" && scope.ids.length === 1 ? <Checklists combinationId={scope.ids[0]} onOpen={(jobId) => { onClose(); nav(`/c/${scope.ids[0]}/jobs/${jobId}`); }} /> : null}
        {err ? <Notice tone="danger" title="Not started">{err}</Notice> : null}
        {cost.dialog}
        <p className="text-xs text-text-muted">AI output is a proposal: a person decides each item on To review, applies it to the draft, and release stays a separate approval. A sent AI call cannot be recalled by Cancel.</p>
      </div>
    </Panel>
  );
}

function Count({ n, l, tone }: { n: React.ReactNode; l: string; tone?: string }) {
  return <div className={cn("rounded-lg border border-border px-3 py-2", tone === "ai" && "border-[#7c3aed]/40")}><p className="text-base font-semibold">{n}</p><p className="text-[11px] text-text-muted">{l}</p></div>;
}

/** K2 (Screen 02 slice 3): the combination's official checklists, drafted into document requirements on the same review
 *  path. Only the stub pass runs until the founder agrees the live run's cost. */
function Checklists({ combinationId, onOpen }: { combinationId: string; onOpen: (jobId: string) => void }) {
  const list = useQuery<{ id: string; recognised: boolean; kind: string; edition: string | null; fileName: string }[]>({ queryKey: ["attachments", combinationId], queryFn: () => api(`/combinations/${combinationId}/attachments`) });
  const [busy, setBusy] = React.useState<string | null>(null), [err, setErr] = React.useState<string | null>(null);
  const checklists = (list.data ?? []).filter((a) => a.recognised && a.kind === "Document checklist");
  if (!checklists.length) return null;
  const run = async (id: string) => { setBusy(id); setErr(null); try { const j = await api<{ id: string }>(`/attachments/${id}/draft-checklist`, { method: "POST", json: { mode: "stub" } }); onOpen(j.id); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); } };
  return (
    <section aria-labelledby="ck-h" className="space-y-2 rounded-lg border border-border p-3" data-checklists>
      <h3 id="ck-h" className="text-sm font-semibold">Checklists: document requirements</h3>
      <p className="text-xs text-text-muted">AI drafts each checklist's document requirements with its own words beside them; a person decides each one. A live draft waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5): until then the stub pass shows the path, with no AI content.</p>
      <ul className="space-y-1 text-sm">{checklists.map((a) => <li key={a.id} className="flex items-center justify-between gap-2"><span>{a.edition ?? a.fileName}</span><Button size="sm" variant="secondary" busy={busy === a.id} onClick={() => void run(a.id)}>Stub pass · US$0</Button></li>)}</ul>
      {err ? <p role="alert" className="text-sm text-text-danger">{err}</p> : null}
    </section>
  );
}
