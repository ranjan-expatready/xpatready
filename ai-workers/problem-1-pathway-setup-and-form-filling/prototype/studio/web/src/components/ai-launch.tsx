// One launch dialog for every AI entry point (D280): catalogue selection, a program, a combination or a source. It shows
// the plan the server made (targets, eligible sources, reuse, skips, reasons, cost) before anything starts. Starting sends
// the plan's fingerprint and a launch key: the server re-plans and refuses if the work changed, and the same key sent
// twice (double click, retry after a network error) returns the same work instead of starting it again.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api, ApiError, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type AiScope = { kind: "catalogue" | "program" | "combination" | "source"; ids: string[]; label?: string };
const MODES = [
  ["LIVE", "Live AI", "Guarded route, Claude Opus 5.5; reuses saved output for unchanged forms; costs shown below"],
  ["REPLAY", "Replay saved runs", "No model call, US$0; uses earlier real runs, labelled as replays"],
  ["STUB", "Stub pass", "No network, no cost, no AI content: proves the path only"],
] as const;
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
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const b = await api("/ai/batches", { method: "POST", json: { scope: { kind: scope.kind, ids: scope.ids }, mode, draftAgain: again, idempotencyKey: key, planSha256: p.plan_sha256, spendLimitUsd: Number(limit) } });
      toast.push({ tone: "ok", text: `AI work started: ${b.jobs.length} step${b.jobs.length === 1 ? "" : "s"}` });
      onClose(); nav(`/ai/${b.id}`);
    } catch (e) {
      setErr((e as Error).message);
      if (e instanceof ApiError && e.status === 409) void plan.refetch();
    } finally { setBusy(false); }
  };
  const runnable = p ? p.totals.steps : 0;
  const groups = p ? Object.values(p.targets.reduce((m: any, t: any) => { (m[t.combinationId] ??= { label: t.combination, program: t.program, items: [] }).items.push(t); return m; }, {})) as any[] : [];
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title="AI configuration" description={p ? `${p.operation_label} · ${p.scope.label}` : scope.label ?? "Preparing the plan"}
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
        {err ? <Notice tone="danger" title="Not started">{err}</Notice> : null}
        <p className="text-xs text-text-muted">AI output is a proposal: a person decides each item, applies it to the draft, and release stays a separate approval. A sent AI call cannot be recalled by Cancel.</p>
      </div>
    </Dialog>
  );
}

function Count({ n, l, tone }: { n: React.ReactNode; l: string; tone?: string }) {
  return <div className={cn("rounded-lg border border-border px-3 py-2", tone === "ai" && "border-[#7c3aed]/40")}><p className="text-base font-semibold">{n}</p><p className="text-[11px] text-text-muted">{l}</p></div>;
}
