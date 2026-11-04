// One launch dialog for every AI entry point (D280): catalogue selection, a program, a combination or a source. It shows
// the plan the server made (targets, eligible sources, reuse, skips, reasons, cost) before anything starts. Starting sends
// the plan's fingerprint and a launch key: the server re-plans and refuses if the work changed, and the same key sent
// twice (double click, retry after a network error) returns the same work instead of starting it again.
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api, ApiError, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCostGate } from "@/components/cost-warning";
import { COST_WORDS } from "../../../contracts/cost-check";
/** C11.8 (review m3): the live-off notice under its title "Live AI is off on this copy": what cannot start and the free choice. */
export const LIVE_OFF_NEXT = "No paid AI call can start here. Choose Saved (US$0) to use the result of earlier real runs.";

export type AiScope = { kind: "catalogue" | "program" | "combination" | "source"; ids: string[]; label?: string };
const MODES = [
  ["LIVE", "Live", "Reads each form with AI; unchanged forms reuse what was read before; the cost is shown below before it starts"],
  ["REPLAY", "Saved", "No model call, US$0: the saved result of earlier real runs, shown through the same steps"],
] as const;
const WORK_CHANGED = "The work changed since you reviewed it (a source, a draft or a running step changed). Review the updated plan, then start again.";
const TONE: Record<string, string> = { draft: "ai", reuse_saved_output: "info", reuse_library: "ok", skip: "neutral", not_eligible: "warn" };

export function AiLaunchDialog({ scope, onClose, initialMode = "LIVE" }: { scope: AiScope; onClose: () => void; initialMode?: "LIVE" | "REPLAY" }) {
  const nav = useNavigate();
  const toast = useToast();
  const [mode, setMode] = React.useState<"LIVE" | "REPLAY">(initialMode);
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
  // C11.8 (P-175, J2 step 10): on a copy without the live switch a live start that would call the model is not offered;
  // the panel says so and what to use instead, as the server refuses it at the door (the plan's one rule, live.blocked).
  const liveOff = !!p && mode === "LIVE" && p.live?.blocked === true;
  const groups = p ? Object.values(p.targets.reduce((m: any, t: any) => { (m[t.combinationId] ??= { label: t.combination, program: t.program, items: [] }).items.push(t); return m; }, {})) as any[] : [];
  return (
    // Screen 02 board view 2 (Draft setup): the team's right panel (P-48), the plan and its cost before any paid run (BR-3).
    <Panel open onOpenChange={(o) => !o && onClose()} title={scope.kind === "combination" ? "Draft setup" : "AI configuration"} description={p ? `${p.operation_label} · ${p.scope.label}` : scope.label ?? "Preparing the plan"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={start} busy={busy} disabled={!p || !runnable || liveOff || plan.isFetching || !(Number(limit) >= 0)}><Sparkles /> {p ? `Start ${runnable} step${runnable === 1 ? "" : "s"}${p.totals.worst_usd ? `, up to US$${p.totals.worst_usd.toFixed(2)}` : ", US$0"}` : "Start"}</Button></>}>
      <div className="space-y-4">
        <fieldset className="grid gap-2 md:grid-cols-2" aria-label="How the AI runs">
          {MODES.map(([k, l, d]) => (
            <label key={k} className={cn("cursor-pointer rounded-lg border p-3 text-sm", mode === k ? "border-primary bg-primary/5" : "border-border")}>
              <span className="flex items-center gap-2 font-medium"><input type="radio" name="ai-mode" checked={mode === k} onChange={() => setMode(k)} />{l}</span>
              <span className="mt-1 block text-xs text-text-muted">{d}</span>
            </label>
          ))}
        </fieldset>
        {p ? <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" data-cost-line>{mode === "LIVE" ? <>Expected {p.totals.expected_usd === null ? "unknown" : `US$${p.totals.expected_usd.toFixed(2)}`} · worst case US${p.totals.worst_usd.toFixed(2)} (each form capped at US${p.per_run_cap_usd}; at most {p.max_paid_attempts_per_form} paid attempts per form, a retry included) · Spent so far US${p.ledger.committed_usd.toFixed(2)} of US${p.ledger.cap_usd.toFixed(2)}.</> : mode === "REPLAY" ? "Saved: no model call, US$0." : "Stub pass: no network, no cost, no AI content."}</p> : null}
        {liveOff ? <Notice tone="warn" title="Live AI is off on this copy">{LIVE_OFF_NEXT}</Notice> : null}
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
        {scope.kind === "combination" && scope.ids.length === 1 ? <FormMasters combinationId={scope.ids[0]} /> : null}
        {scope.kind === "source" && scope.ids.length === 1 ? <FormMasters source={{ id: scope.ids[0], edition: scope.label ?? null, fileName: ".pdf", recognised: true, kind: "form" }} /> : null}
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

/** K2 (Screen 02 slice 3) and C2.6: the combination's official checklists, read into document requirements on the same
 *  review path. A checklist with a saved real AI reading replays it (US$0); live waits for the founder's OK on its cost,
 *  so the others say so (P-227: only Live and Saved are shown; the stub pass stays an API path for tests). */
function Checklists({ combinationId, onOpen }: { combinationId: string; onOpen: (jobId: string) => void }) {
  const list = useQuery<{ id: string; recognised: boolean; kind: string; edition: string | null; fileName: string }[]>({ queryKey: ["attachments", combinationId], queryFn: () => api(`/combinations/${combinationId}/attachments`) });
  const readings = useQuery<{ attachmentId: string; saved: boolean; lines: number }[]>({ queryKey: ["checklist-readings", combinationId], queryFn: () => api(`/combinations/${combinationId}/checklist-readings`) });
  const [busy, setBusy] = React.useState<string | null>(null), [err, setErr] = React.useState<string | null>(null);
  const checklists = (list.data ?? []).filter((a) => a.recognised && a.kind === "Document checklist");
  if (!checklists.length) return null;
  const run = async (id: string, mode: "replay") => { setBusy(`${id}:${mode}`); setErr(null); try { const j = await api<{ id: string }>(`/attachments/${id}/draft-checklist`, { method: "POST", json: { mode } }); onOpen(j.id); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); } };
  const savedOf = (id: string) => (readings.data ?? []).find((r) => r.attachmentId === id && r.saved);
  return (
    <section aria-labelledby="ck-h" className="space-y-2 rounded-lg border border-border p-3" data-checklists>
      <h3 id="ck-h" className="text-sm font-semibold">Checklists: document requirements</h3>
      <p className="text-xs text-text-muted">AI reads each checklist's document requirements with its own words beside them; a person decides each one. Where AI has read a checklist before, its Saved reading is used at US$0. A live reading waits for the founder's OK on its cost (Sample estimate under US$0.50, capped at US$5): until then the stub pass shows the path, with no AI content.</p>
      <ul className="space-y-1 text-sm">{checklists.map((a) => { const saved = savedOf(a.id); return (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2" data-checklist-row={a.edition ?? a.fileName}><span>{a.edition ?? a.fileName}{saved ? <span className="ml-2 text-xs text-text-muted">Saved reading: {saved.lines} line{saved.lines === 1 ? "" : "s"}</span> : null}</span>
          <span className="flex gap-2">{saved ? <Button size="sm" busy={busy === `${a.id}:replay`} onClick={() => void run(a.id, "replay")}>Saved · US$0</Button> : null}
            {saved ? null : <span className="text-xs text-text-muted" data-no-saved>No Saved reading yet; Live waits for the founder's OK on its cost.</span>}</span></li>); })}</ul>
      {err ? <p role="alert" className="text-sm text-text-danger">{err}</p> : null}
    </section>
  );
}

/** C3.4 (P-158, P-138; QA-218): a form's sections and answer lists drafted by the rules from the official file (no AI,
 *  US$0), and, beside each form and guide that has one, the Saved AI draft of its checks and document types (US$0, no model
 *  call): the server's plan says whether a saved run exists (POST /attachments/:id/draft-masters/plan {mode:"replay"}),
 *  and Saved posts {mode:"replay"} through the same door as the API (P-149 (1), P-120). Live is never started here. */
type Att = { id: string; recognised: boolean; kind: string; edition: string | null; fileName: string };
type MastersPlan = { source: { kind: "form" | "guide"; title: string }; saved: { available: boolean; why: string | null } };
type MastersDone = { status?: string; message?: string; proposals: number; group: string; already?: boolean };
export function FormMasters({ combinationId, source }: { combinationId?: string; source?: Att }) {
  const qc = useQueryClient();
  const list = useQuery<Att[]>({ queryKey: ["attachments", combinationId], queryFn: () => api(`/combinations/${combinationId}/attachments`), enabled: !!combinationId, initialData: source ? [source] : undefined });
  const [busy, setBusy] = React.useState<string | null>(null), [err, setErr] = React.useState<string | null>(null), [done, setDone] = React.useState<Record<string, { text: string; group: string }>>({});
  // A form is a recognised PDF that is not a checklist; anything else recognised (the combination's guide page) is asked
  // too, and shown only when the server's plan names it a guide.
  const asked = (list.data ?? []).filter((a) => a.recognised && a.kind !== "Document checklist");
  const plans = useQueries({ queries: asked.map((a) => ({ queryKey: ["masters-saved", a.id], retry: false, staleTime: 0,
    queryFn: () => api<MastersPlan>(`/attachments/${a.id}/draft-masters/plan`, { method: "POST", json: { mode: "replay" } }) })) });
  const planOf = (id: string) => plans[asked.findIndex((a) => a.id === id)];
  const isForm = (a: Att) => /\.pdf$/i.test(a.fileName);
  const rows = asked.filter((a) => isForm(a) || planOf(a.id)?.data?.source.kind === "guide");
  if (!rows.length) return null;
  const say = (a: Att, text: string, group: string) => setDone((d) => ({ ...d, [a.id]: { text, group } }));
  const run = async (a: Att) => {
    setBusy(`${a.id}:rules`); setErr(null);
    try { const j = await api<{ proposals: number; message: string; group: string }>(`/attachments/${a.id}/draft-masters`, { method: "POST", json: { mode: "rules" } }); say(a, j.proposals ? `${j.proposals} proposals wait on To review.` : `Already drafted for this edition: ${j.message}`, j.group); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  const replay = async (a: Att) => {
    setBusy(`${a.id}:replay`); setErr(null);
    try {
      const j = await api<MastersDone>(`/attachments/${a.id}/draft-masters`, { method: "POST", json: { mode: "replay" } });
      if (j.status === "FAILED" || j.status === "CANCELLED") setErr(j.message ?? "The Saved AI draft did not finish; nothing of it is proposed.");
      else say(a, j.already ? `Already drafted with AI: ${j.message ?? "its proposals are on To review."}` : `Saved AI draft (US$0): ${j.proposals} proposal${j.proposals === 1 ? "" : "s"} wait on To review.`, j.group);
      void qc.invalidateQueries({ queryKey: ["masters-saved"] });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <section aria-labelledby="fm-h" className="space-y-2 rounded-lg border border-border p-3" data-form-masters>
      <h3 id="fm-h" className="text-sm font-semibold">Forms and guide: sections, answer lists and checks</h3>
      <p className="text-xs text-text-muted">The rules read each form's own parts and drop-down lists into library proposals, once per edition (no AI, US$0). Where AI has drafted a form's checks and document types, or a guide's checks, before, its Saved draft is used at US$0 with no model call. A person checks each item on To review and a second person approves it. A Live AI draft waits for the founder's OK on its cost.</p>
      <ul className="space-y-1 text-sm">{rows.map((a) => { const pl = planOf(a.id), saved = pl?.data?.saved.available === true; return (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2" data-form-masters-row={a.edition ?? a.fileName} data-masters-saved={saved ? "yes" : pl?.isFetching ? "asking" : "no"}><span className="min-w-0 break-words">{a.edition ?? a.fileName}{isForm(a) ? null : <span className="ml-2 text-xs text-text-muted">Guide</span>}
          {done[a.id] ? <span className="block text-xs" role="status">{done[a.id].text} <Link className="text-text-link underline" to={`/review/proposals?group=${encodeURIComponent(done[a.id].group)}`}>Open Proposals</Link></span>
            : pl && !pl.isFetching && !saved ? <span className="block text-xs text-text-muted" data-no-saved-masters>No Saved AI draft of its checks yet; Live waits for the founder's OK on its cost.</span> : null}</span>
          <span className="flex flex-wrap gap-2">{saved ? <Button size="sm" busy={busy === `${a.id}:replay`} disabled={!!busy && busy !== `${a.id}:replay`} onClick={() => void replay(a)}>Saved · US$0</Button> : null}
            {isForm(a) ? <Button size="sm" variant="secondary" busy={busy === `${a.id}:rules`} disabled={!!busy && busy !== `${a.id}:rules`} onClick={() => void run(a)}>Draft sections and lists · US$0</Button> : null}</span></li>); })}</ul>
      {err ? <p role="alert" className="text-sm text-text-danger">{err}</p> : null}
    </section>
  );
}
