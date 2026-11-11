// AI work (D280): every scoped launch with its steps, persisted on the server, so a reload or another screen never loses
// it. Progress is per step and stated as it is (queued, running, done, failed, cancelled); no invented percentage or ETA.
import * as React from "react";
import { RunCard, type RunView } from "@/components/run-card";
import { fmtWhen } from "@/components/status";
import { Link, useParams } from "react-router-dom";
import { CircleStop, RotateCw, Sparkles } from "lucide-react";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { useWhere } from "@/components/frame";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { BatchPart } from "../../../contracts/screen02";

const STATUS: Record<string, [string, string]> = { QUEUED: ["neutral", "Queued"], RUNNING: ["ai", "Running"], COMPLETED: ["ok", "Done"], APPLIED: ["ok", "Added to draft"], PARTIAL: ["warn", "Done with problems"], FAILED: ["danger", "Failed"], BLOCKED: ["warn", "Blocked"], CANCELLED: ["neutral", "Cancelled"], NEEDS_PERSON: ["warn", "Waiting for you"], WAITING: ["neutral", "Waiting"], SKIPPED: ["neutral", "Skipped"], NOT_YET: ["neutral", "Not available yet"] }; // QA-62: no code on screen
export const BatchStatus = ({ s }: { s: string }) => { const [t, l] = STATUS[s] ?? ["neutral", s]; return <Pill tone={t}>{l}</Pill>; };
const MODE: Record<string, string> = { LIVE: "Live", REPLAY: "Saved", STUB: "Stub pass", LOCAL: "No AI (library)", RULES: "Rules only (no AI)", live: "Live", replay: "Saved", rules: "Rules only (no AI)" };
const active = (s: string) => s === "QUEUED" || s === "RUNNING";

export function AiWorkPage() {
  const list = useApi<any[]>(["ai-batches"], "/ai/batches", { refetchInterval: (q: any) => (q.state.data?.some((b: any) => active(b.status)) ? 3000 : false) });
  if (list.isLoading) return <Spinner label="Loading AI work" />;
  if (list.isError) return <ErrorState title="AI work could not be loaded" description={(list.error as Error).message} />;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h1 className="text-xl font-semibold">AI work</h1><p className="mt-1 text-sm text-text-muted">Every AI launch from the catalogue, a program, a combination or a source, with what each step did and cost. Decisions happen in <Link className="text-text-link underline" to="/review">To review</Link>: nothing reaches a draft until a person decides.</p></div>
      {!list.data!.length ? <EmptyState title="No AI work yet" description="Start it from a combination on Immigration programs, a program's menu, a combination, or a form on its Forms tab." /> : (
        <Table head={["Scope", "How", "Steps and parts", "Status", "Spent / worst case", "Started"]}>
          {list.data!.map((b) => (
            <tr key={b.id}>
              <td><Link className="font-medium text-text-link hover:underline" to={`/ai/${b.id}`}>{b.scopeLabel}</Link><p className="text-xs text-text-muted">{b.scopeKind}</p></td>
              <td>{MODE[b.mode] ?? b.mode}</td>
              <td className="text-xs">{b.steps} step{b.steps === 1 ? "" : "s"} · {Object.entries(b.counts).map(([k, n]) => `${n} ${(STATUS[k]?.[1] ?? k).toLowerCase()}`).join(", ")}{b.parts ? <p className="text-text-muted">{b.parts}</p> : null}</td>
              <td><BatchStatus s={b.status} /></td>
              <td className="whitespace-nowrap text-xs">US${b.spent_usd.toFixed(2)} / US${b.worstCaseUsd.toFixed(2)}</td>
              <td className="whitespace-nowrap text-xs text-text-muted">{fmtWhen(b.startedAt)} · {b.started_by_name}</td>
            </tr>))}
        </Table>)}
    </div>
  );
}

export function AiBatchPage() {
  const { batchId } = useParams();
  const b = useApi<any>(["ai-batch", batchId], `/ai/batches/${batchId}`, { refetchInterval: (q: any) => (q.state.data && (active(q.state.data.status) || q.state.data.jobs.some((j: any) => active(j.status))) ? 2500 : false) });
  const cancel = useAction(() => api(`/ai/batches/${batchId}/cancel`, { method: "POST" }), { success: (r: any) => `Cancelled: ${r.stopped} queued step${r.stopped === 1 ? "" : "s"} stopped${r.still_running ? `; ${r.still_running} already running` : ""}`, invalidate: [["ai-batch", batchId], ["ai-batches"], ["catalogue"]] });
  // C3.3 review m3: Retry is the author's; other people are not offered a button the server refuses.
  const actorId = useActorId();
  const session = useApi<{ actor?: { duties?: string[] } }>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  useWhere(b.data ? [{ label: "History" }, { label: "AI work", to: "/ai" }, { label: b.data.scopeLabel }] : null); // BK-3: the frame's line
  const retry = useAction(() => api(`/ai/batches/${batchId}/retry`, { method: "POST" }), { success: "Retrying the failed steps only", invalidate: [["ai-batch", batchId], ["ai-batches"], ["catalogue"]] });
  // C11.8 review m4 (AT-3 on the page): an ended field-map run with a failure says what went wrong in words (the run
  // view's error line), not only the count; its way out on this page is the Retry button or the Saved link.
  const ended = !!b.data && b.data.operation === "draft_field_maps" && !active(b.data.status) && !(b.data.jobs as { status: string }[]).some((j) => active(j.status));
  const view = useApi<RunView>(["run-view", batchId, b.data?.status, b.data?.jobs?.length], ended ? `/runs/${batchId}` : null);
  if (b.isLoading) return <Spinner label="Loading AI work" />;
  if (b.isError) return <ErrorState title="This AI work could not be opened" description={(b.error as Error).message} action={<Link className="text-text-link underline" to="/ai">All AI work</Link>} />;
  const d = b.data;
  // S4 slice 2: the form finder and Upload PDF are shown with the shared run card (their steps are not field-map steps).
  // QA-80: the same breadcrumb, heading and left edge as every other page.
  if (d.operation === "find_forms" || d.operation === "upload_form" || d.operation === "draft_questions_documents") return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {d.operation_label}</h1>
      <RunCard runId={d.id} />
    </div>
  );
  const running = active(d.status) || d.jobs.some((j: any) => active(j.status));
  const latest = new Map<string, any>(); for (const j of d.jobs) { const k = `${j.attachmentId}|${j.kind}`; const cur = latest.get(k); if (!cur || j.attempt > cur.attempt) latest.set(k, j); }
  // The server says which steps its retry runs again (cancelled part-way included, screen-map work never).
  const failed = [...latest.values()].filter((j) => j.retryable);
  // C3.3 review m2 (P-110): a step that reached its attempts is not offered again; the page says it needs a person and what to do.
  const stuck = [...latest.values()].filter((j) => j.needs_person);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="size-5 text-[#7c3aed]" /> {d.operation_label}</h1>
          <p className="mt-1 text-sm text-text-muted">{d.scopeLabel} · {d.mode === "LIVE" && d.jobs.length && (d.jobs as { mode: string; kind: string }[]).every((j) => j.mode !== "LIVE" || j.kind === "reuse_map") ? "Saved and the library reused: no model call (US$0)" : MODE[d.mode]} · started by {d.started_by_name}, {fmtWhen(d.startedAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><BatchStatus s={d.status} /><Pill>{d.jobs.length} step{d.jobs.length === 1 ? "" : "s"}</Pill><Pill>Spent US${d.spent_usd.toFixed(2)} · worst case US${d.worstCaseUsd.toFixed(2)} · limit US${d.spendLimitUsd.toFixed(2)}</Pill></div>
        </div>
        <div className="flex gap-2">
          {running ? <Button variant="secondary" onClick={() => cancel.mutate(undefined)} busy={cancel.isPending}><CircleStop /> Cancel</Button> : null}
          {!running && failed.length && canAuthor ? <Button variant="secondary" onClick={() => retry.mutate(undefined)} busy={retry.isPending}><RotateCw /> Retry {failed.length} failed step{failed.length === 1 ? "" : "s"}</Button> : null}
        </div>
      </div>
      {running ? <Notice tone="ai" title="Running" action={<Spinner label="Working" />}>Steps run two at a time. This page updates by itself; leaving it does not stop the work. Cancel stops queued steps; a call already sent to the AI cannot be recalled, and its output will not be applied.</Notice> : null}
      {!running && view.data?.error ? <Notice tone="danger" title="What went wrong" action={view.data.error.next && view.data.error.next.href !== `/ai/${d.id}` ? <Link className="text-sm font-medium text-text-link hover:underline" to={view.data.error.next.href}>{view.data.error.next.label}</Link> : undefined}>{view.data.error.what}</Notice> : null}
      {d.message ? <p className="text-sm">{d.message}</p> : null}
      {!running && stuck.length ? <Notice tone="warn" title={`${stuck.map((j) => j.source).join(", ")} needs a person`}>It failed three times, so it is not tried again. Add the form from the Form library by hand, or start its draft again once the cause is fixed.</Notice> : null}
      <Table head={["Combination", "Source", "Step", "Status", "What happened", "Cost", ""]}>
        {d.jobs.map((j: any) => (
          <tr key={j.id}>
            <td><Link className="text-text-link hover:underline" to={`/c/${j.combinationId}/sources`}>{j.combination}</Link><p className="text-xs text-text-muted">{j.program}</p></td>
            <td>{j.source}</td>
            <td className="text-xs">{j.kind === "reuse_map" ? "Add from library" : MODE[j.mode] ?? j.mode}{j.attempt > 1 ? ` · attempt ${j.attempt}` : ""}</td>
            <td><BatchStatus s={j.status} /></td>
            <td className="max-w-md text-xs text-text-muted">{j.said ?? j.message}</td>
            <td className="whitespace-nowrap text-xs">{j.costUsd === null ? (active(j.status) ? "pending" : "n/a") : `US$${Number(j.costUsd).toFixed(2)}`}</td>
            <td>{j.kind === "field_map" && j.status === "COMPLETED" && j.mode !== "STUB" ? <Link className="whitespace-nowrap text-sm font-medium text-text-link hover:underline" to={`/c/${j.combinationId}/jobs/${j.id}`}>Review proposals</Link> : j.status === "APPLIED" && j.kind === "field_map" ? <Link className="text-xs text-text-link hover:underline" to={`/c/${j.combinationId}/jobs/${j.id}`}>Applied</Link> : null}</td>
          </tr>))}
      </Table>
      {d.jobs.filter((j: PartsJob) => j.parts.length).map((j: PartsJob) => <Parts key={j.id} job={j} />)}
      <p className="text-xs text-text-muted">{d.capability_note}</p>
    </div>
  );
}

const PART: Record<string, [string, string]> = { queued: ["neutral", "Queued"], running: ["ai", "Running"], done: ["ok", "Done"], failed: ["danger", "Failed"], "not started": ["neutral", "Not started"] };
/** A4 (board view 3): one count bar and the parts table of a step drafted in parts, in real counts. */
type PartsJob = { id: string; source: string | null; parts: BatchPart[]; a4: { total: number; reused: number; leftover: number } | null };
function Parts({ job }: { job: PartsJob }) {
  const done = job.parts.filter((p) => p.status === "done"), fields = done.reduce((s, p) => s + p.fields, 0), total = job.a4?.leftover ?? job.parts.reduce((s, p) => s + p.fields, 0);
  return (
    <section aria-label={`Parts of ${job.source}`} className="space-y-2 rounded-lg border border-border bg-surface-raised p-4" data-parts>
      <h2 className="font-semibold">{job.source}: part {done.length} of {job.parts.length} · {fields} of {total} form fields</h2>
      {job.a4?.reused ? <p className="text-sm text-text-muted">{job.a4.reused} of {job.a4.total} form fields reused from the library without AI.</p> : null}
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-label="Form fields drafted" aria-valuemin={0} aria-valuemax={total} aria-valuenow={fields}><div className="h-full bg-primary" style={{ width: `${total ? Math.round((fields / total) * 100) : 0}%` }} /></div>
      <Table dense head={["Part", "Sections", "Form fields", "Status", "Cost"]}>
        {job.parts.map((p) => { const [t, w] = PART[p.status] ?? ["neutral", p.status]; return <tr key={p.index}><td>{p.index}</td><td className="text-xs">{p.sections.join(", ")}</td><td className="tabular-nums">{p.fields}</td><td><Pill tone={t}>{w}</Pill>{p.message ? <p className="max-w-xs text-xs text-text-muted">{p.message}</p> : null}</td><td className="text-xs">US${Number(p.cost_usd).toFixed(2)}</td></tr>; })}
      </Table>
    </section>
  );
}
