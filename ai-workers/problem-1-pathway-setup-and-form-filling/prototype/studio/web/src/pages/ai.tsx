// AI work (D280): every scoped launch with its steps, persisted on the server, so a reload or another screen never loses
// it. Progress is per step and stated as it is (queued, running, done, failed, cancelled); no invented percentage or ETA.
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, CircleStop, RotateCw, Sparkles } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS: Record<string, [string, string]> = { QUEUED: ["neutral", "Queued"], RUNNING: ["ai", "Running"], COMPLETED: ["ok", "Done"], APPLIED: ["ok", "Added to draft"], PARTIAL: ["warn", "Partly done"], FAILED: ["danger", "Failed"], BLOCKED: ["warn", "Blocked"], CANCELLED: ["neutral", "Cancelled"] };
export const BatchStatus = ({ s }: { s: string }) => { const [t, l] = STATUS[s] ?? ["neutral", s]; return <Pill tone={t}>{l}</Pill>; };
const MODE: Record<string, string> = { LIVE: "Live AI", REPLAY: "Replay of saved runs", STUB: "Stub pass", LOCAL: "No AI (library)" };
const active = (s: string) => s === "QUEUED" || s === "RUNNING";

export function AiWorkPage() {
  const list = useApi<any[]>(["ai-batches"], "/ai/batches", { refetchInterval: (q: any) => (q.state.data?.some((b: any) => active(b.status)) ? 3000 : false) });
  if (list.isLoading) return <Spinner label="Loading AI work" />;
  if (list.isError) return <ErrorState title="AI work could not be loaded" description={(list.error as Error).message} />;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">AI work</h1><p className="mt-1 text-sm text-text-muted">Every AI launch from the catalogue, a program, a combination or a source, with what each step did and cost. Proposals still need a person's decision before they reach a draft.</p></div>
      {!list.data!.length ? <EmptyState title="No AI work yet" description="Start it from Programs (select combinations, then AI configuration…), a program's menu, a combination, or a form on Sources and forms." /> : (
        <Table head={["Scope", "How", "Steps", "Status", "Spent / worst case", "Started"]}>
          {list.data!.map((b) => (
            <tr key={b.id}>
              <td><Link className="font-medium text-text-link hover:underline" to={`/ai/${b.id}`}>{b.scopeLabel}</Link><p className="text-xs text-text-muted">{b.scopeKind}</p></td>
              <td>{MODE[b.mode] ?? b.mode}</td>
              <td className="text-xs">{b.steps} · {Object.entries(b.counts).map(([k, n]) => `${n} ${(STATUS[k]?.[1] ?? k).toLowerCase()}`).join(", ")}</td>
              <td><BatchStatus s={b.status} /></td>
              <td className="whitespace-nowrap text-xs">US${b.spent_usd.toFixed(2)} / US${b.worstCaseUsd.toFixed(2)}</td>
              <td className="whitespace-nowrap text-xs text-text-muted">{new Date(b.startedAt).toLocaleString()} · {b.startedBy}</td>
            </tr>))}
        </Table>)}
    </div>
  );
}

export function AiBatchPage() {
  const { batchId } = useParams();
  const b = useApi<any>(["ai-batch", batchId], `/ai/batches/${batchId}`, { refetchInterval: (q: any) => (q.state.data && (active(q.state.data.status) || q.state.data.jobs.some((j: any) => active(j.status))) ? 2500 : false) });
  const cancel = useAction(() => api(`/ai/batches/${batchId}/cancel`, { method: "POST" }), { success: (r: any) => `Cancelled: ${r.stopped} queued step${r.stopped === 1 ? "" : "s"} stopped${r.still_running ? `; ${r.still_running} already running` : ""}`, invalidate: [["ai-batch", batchId], ["ai-batches"], ["catalogue"]] });
  const retry = useAction(() => api(`/ai/batches/${batchId}/retry`, { method: "POST" }), { success: "Retrying the failed steps only", invalidate: [["ai-batch", batchId], ["ai-batches"], ["catalogue"]] });
  if (b.isLoading) return <Spinner label="Loading AI work" />;
  if (b.isError) return <ErrorState title="This AI work could not be opened" description={(b.error as Error).message} action={<Link className="text-text-link underline" to="/ai">All AI work</Link>} />;
  const d = b.data;
  const running = active(d.status) || d.jobs.some((j: any) => active(j.status));
  const latest = new Map<string, any>(); for (const j of d.jobs) { const k = `${j.attachmentId}|${j.kind}`; const cur = latest.get(k); if (!cur || j.attempt > cur.attempt) latest.set(k, j); }
  const failed = [...latest.values()].filter((j) => j.status === "FAILED" || j.status === "BLOCKED" || (j.status === "CANCELLED" && j.message?.startsWith("Cancelled before")));
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <nav className="flex items-center gap-1 text-xs text-text-muted"><Link to="/ai" className="hover:underline">AI work</Link><ChevronRight className="size-3" /><span>{d.scopeLabel}</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {d.operation_label}</h1>
          <p className="mt-1 text-sm text-text-muted">{d.scopeLabel} · {MODE[d.mode]} · started by {d.startedBy} at {new Date(d.startedAt).toLocaleTimeString()}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><BatchStatus s={d.status} /><Pill>{d.jobs.length} step{d.jobs.length === 1 ? "" : "s"}</Pill><Pill>Spent US${d.spent_usd.toFixed(2)} · worst case US${d.worstCaseUsd.toFixed(2)} · limit US${d.spendLimitUsd.toFixed(2)}</Pill></div>
        </div>
        <div className="flex gap-2">
          {running ? <Button variant="secondary" onClick={() => cancel.mutate(undefined)} busy={cancel.isPending}><CircleStop /> Cancel</Button> : null}
          {!running && failed.length ? <Button variant="secondary" onClick={() => retry.mutate(undefined)} busy={retry.isPending}><RotateCw /> Retry {failed.length} failed step{failed.length === 1 ? "" : "s"}</Button> : null}
        </div>
      </div>
      {running ? <Notice tone="ai" title="Running" action={<Spinner label="Working" />}>Steps run two at a time. This page updates by itself; leaving it does not stop the work. Cancel stops queued steps; a call already sent to the AI cannot be recalled, and its output will not be applied.</Notice> : null}
      {d.message ? <p className="text-sm">{d.message}</p> : null}
      <Table head={["Combination", "Source", "Step", "Status", "What happened", "Cost", ""]}>
        {d.jobs.map((j: any) => (
          <tr key={j.id}>
            <td><Link className="text-text-link hover:underline" to={`/c/${j.combinationId}/sources`}>{j.combination}</Link><p className="text-xs text-text-muted">{j.program}</p></td>
            <td>{j.source}</td>
            <td className="text-xs">{j.kind === "reuse_map" ? "Add from library" : MODE[j.mode] ?? j.mode}{j.attempt > 1 ? ` · attempt ${j.attempt}` : ""}</td>
            <td><BatchStatus s={j.status} /></td>
            <td className="max-w-md text-xs text-text-muted">{j.message}</td>
            <td className="whitespace-nowrap text-xs">{j.costUsd === null ? (active(j.status) ? "pending" : "n/a") : `US$${Number(j.costUsd).toFixed(2)}`}</td>
            <td>{j.kind === "field_map" && j.status === "COMPLETED" && j.mode !== "STUB" ? <Link className="whitespace-nowrap text-sm font-medium text-text-link hover:underline" to={`/c/${j.combinationId}/jobs/${j.id}`}>Review proposals</Link> : j.status === "APPLIED" && j.kind === "field_map" ? <Link className="text-xs text-text-link hover:underline" to={`/c/${j.combinationId}/jobs/${j.id}`}>Applied</Link> : null}</td>
          </tr>))}
      </Table>
      <p className="text-xs text-text-muted">{d.capability_note}</p>
    </div>
  );
}
