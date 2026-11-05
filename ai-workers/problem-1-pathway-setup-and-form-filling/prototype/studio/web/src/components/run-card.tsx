// W1-07 shared run experience (P-110; S4 slice 2): the one run card every background run uses (form finder, Upload PDF,
// field-map drafting), shown where the run was started, and the top-bar chip that follows the person while a run goes
// on. Real steps only (EXPERIENCE §4): a bar in step segments, real counts inside a step where they exist, elapsed time
// and "usually about" from the last finished run of the same kind; no percentage, no countdown. Stop really ends it.
import * as React from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, CircleDashed, CircleSlash, Loader2, Sparkles, Square, X } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Notice } from "@/components/ui/controls";
import { Tip, TipProvider } from "@/components/status";
import { cn } from "@/lib/utils";
import { costWords } from "../../../contracts/start-setup";

type RunStep = { n: number; kind: string; label: string; uses: "rules" | "ai"; status: string; message: string | null; usd: number; started_at: string | null; finished_at: string | null; details?: string | null; counts: { done: number; total: number; unit: string } | null };
export type RunView = { id: string; operation: string; label: string; scope: string | null; status: string; status_word: string; message: string | null; step: { n: number; m: number; label: string } | null; steps: RunStep[];
  elapsed_ms: number; usual_ms: number | null; usd: { spent: number; worst: number; usual: number | null; about?: number | null }; can_stop: boolean; error: { what: string; next: { label: string; href: string } | null } | null; href: string };

const ACTIVE = new Set(["queued", "running", "stopping"]);
/** "9 s", "1 min 5 s": plain elapsed time. */
export function fmtDuration(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`; }
const STEP_ICON: Record<string, React.ReactElement> = {
  COMPLETED: <CircleCheck className="size-4 text-ok" aria-hidden />, APPLIED: <CircleCheck className="size-4 text-ok" aria-hidden />,
  RUNNING: <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden />,
  FAILED: <CircleAlert className="size-4 text-danger" aria-hidden />, BLOCKED: <CircleAlert className="size-4 text-danger" aria-hidden />, PARTIAL: <CircleAlert className="size-4 text-text-warn" aria-hidden />,
  NEEDS_PERSON: <CircleAlert className="size-4 text-text-warn" aria-hidden />, CANCELLED: <CircleSlash className="size-4 text-text-muted" aria-hidden />, SKIPPED: <CircleSlash className="size-4 text-text-muted" aria-hidden />, NOT_YET: <CircleDashed className="size-4 text-text-muted" aria-hidden />,
};
const STEP_WORD: Record<string, string> = { COMPLETED: "Done", APPLIED: "Done", RUNNING: "Running", FAILED: "Failed", BLOCKED: "Blocked", PARTIAL: "Done with problems", NEEDS_PERSON: "Waiting for you", CANCELLED: "Stopped", SKIPPED: "Not needed", NOT_YET: "Not available yet", WAITING: "Waiting", QUEUED: "Waiting" };
const STOP_TIP = "Ends this run now. Steps already finished keep their results. An AI call already sent is ended too; it stays counted at its reserved worst case because the provider may still bill it.";

/** About first, then the ceiling, then what it spent (P-123 cost line), in the same words as the button that started it
 *  (S3 early look (4)): "about US$0.31 · at most US$5.58 · US$0.00 spent". */
export function costLine(r: Pick<RunView, "usd"> & { steps?: RunView["steps"] }, active: boolean) {
  if (r.usd.worst === 0 && r.usd.spent === 0) return r.steps?.some((s) => s.uses === "ai") ? "US$0 · Saved, no new call" : "US$0 · rules only, no AI";
  return `${costWords(r.usd.about !== undefined ? r.usd.about : r.usd.usual, r.usd.worst)} · US$${r.usd.spent.toFixed(2)} ${active ? "so far" : "spent"}`;
}

/** The run card: shown where the run was started; polls every 1.5 s while the run is active. */
/** `onDismiss`: where a page lists several runs (Form library uploads), a finished card can be put away (DV-bb-1). */
export function RunCard({ runId, className, onEnded, onDismiss }: { runId: string; className?: string; onEnded?: (r: RunView) => void; onDismiss?: () => void }) {
  const q = useApi<RunView>(["run", runId], `/runs/${runId}`, { refetchInterval: (s) => (s.state.data && !ACTIVE.has(s.state.data.status) ? false : 1500) });
  const stop = useAction(() => api(`/runs/${runId}/stop`, { method: "POST" }), { success: "Stopping: no step starts after this", invalidate: [["run", runId], ["runs-active"]] });
  const ended = React.useRef(false);
  React.useEffect(() => { if (q.data && !ACTIVE.has(q.data.status) && !ended.current) { ended.current = true; onEnded?.(q.data); } }, [q.data, onEnded]);
  if (q.isLoading) return <div className={cn("rounded-xl border border-border bg-surface-raised p-4 text-sm text-text-muted", className)}>Starting the run…</div>;
  if (q.isError || !q.data) return <Notice tone="danger" title="This run could not be read" className={className}>{(q.error as Error)?.message ?? "Try again."}</Notice>;
  const r = q.data;
  const active = ACTIVE.has(r.status);
  const slow = active && r.usual_ms !== null && r.elapsed_ms > 2 * r.usual_ms;
  return (
    <TipProvider><section aria-label={`${r.label}${r.scope ? `: ${r.scope}` : ""}`} aria-live="polite" className={cn("space-y-3 rounded-xl border border-border bg-surface-raised p-4 shadow-sm", className)} data-run-status={r.status}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{r.label}{r.scope ? <span className="font-normal text-text-muted"> · {r.scope}</span> : null}</p>
          <p className="mt-0.5 text-sm text-text-muted" data-run-line>
            {r.step ? `Step ${r.step.n} of ${r.step.m} · ` : ""}{r.status_word} · {fmtDuration(r.elapsed_ms)}{r.usual_ms !== null ? ` · usually about ${fmtDuration(r.usual_ms)}` : active ? " · first run of this kind, no usual time yet" : ""}
            {" · "}<Tip tip="About: what a run like this usually costs. At most: the most it can cost (its worst case, stated before it started). Then what it has spent. Rules steps cost nothing."><span tabIndex={0} className="tabular-nums underline decoration-dotted" data-run-cost>{costLine(r, active)}</span></Tip>
          </p>
          {slow ? <p className="mt-1 text-sm text-text-warn">Taking longer than usual.</p> : null}
        </div>
        {active ? <Tip tip={STOP_TIP}><Button size="sm" variant="secondary" onClick={() => stop.mutate(undefined)} busy={stop.isPending} disabled={!r.can_stop}><Square /> {r.status === "stopping" ? "Stopping" : "Stop"}</Button></Tip>
          : onDismiss ? <Tip tip="Put this result away. The run stays listed on AI work."><Button size="sm" variant="ghost" data-run-dismiss onClick={onDismiss} aria-label={`Dismiss: ${r.label}${r.scope ? `, ${r.scope}` : ""}`}><X /></Button></Tip> : null}
      </div>
      <ol className="flex gap-1" aria-hidden>{r.steps.map((s) => <li key={s.n} className={cn("h-1.5 flex-1 rounded-full", ["COMPLETED", "APPLIED"].includes(s.status) ? "bg-ok" : s.status === "RUNNING" ? "animate-pulse bg-primary motion-reduce:animate-none" : ["FAILED", "BLOCKED"].includes(s.status) ? "bg-danger" : s.status === "NEEDS_PERSON" || s.status === "PARTIAL" ? "bg-warn" : "bg-border")} />)}</ol>
      <ol className="space-y-2 text-sm">
        {r.steps.map((s) => (
          <li key={s.n} className="flex gap-2" data-step={s.kind} data-step-status={s.status}>
            <span className="mt-0.5 shrink-0">{STEP_ICON[s.status] ?? <CircleDashed className="size-4 text-text-muted" aria-hidden />}</span>
            <div className="min-w-0">
              <p><span className="sr-only">{STEP_WORD[s.status] ?? s.status}: </span>{s.label}{s.uses === "ai" ? <Tip tip="This step calls AI. Its answer is checked by rules and by a second AI round that does not see the first answer."><span tabIndex={0} className="ml-2 inline-flex items-center gap-1 rounded bg-[#7c3aed]/12 px-1.5 text-xs text-[#6d28d9] dark:text-[#c4b5fd]"><Sparkles className="size-3" aria-hidden />AI</span></Tip> : <span className="ml-2 text-xs text-text-muted">rules · US$0</span>}
                {s.counts ? <span className="ml-2 tabular-nums text-text-muted">{s.counts.done} of {s.counts.total} {s.counts.unit}</span> : null}
                {s.usd > 0 ? <span className="ml-2 tabular-nums text-text-muted">US${s.usd.toFixed(2)}</span> : null}</p>
              {s.message && s.status !== "WAITING" ? <p className="text-text-muted">{s.message}</p> : null}
              {/* QA-162 (C4.11): what a finished step left out, each with its reason and what to do, is shown, never only
                  counted. Review m3: a failed step's message says why; its details (a request id) are not shown. */}
              {s.details && s.status === "COMPLETED" ? <StepDetails text={s.details} /> : null}
            </div>
          </li>
        ))}
      </ol>
      {!active && r.error ? <Notice tone={r.status === "needs_person" ? "warn" : "danger"} title={r.status_word} action={r.error.next ? <Link className="text-sm text-text-link underline" to={r.error.next.href}>{r.error.next.label}</Link> : undefined}>{r.error.what}</Notice> : null}
      {!active && !r.error && r.message ? <p className="text-sm">{r.message}</p> : null}
    </section></TipProvider>
  );
}

/** A step's reasons, one per line, folded under its message (QA-162: "14 left out with the reason" shows each reason). */
function StepDetails({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <details className="mt-1" data-step-details>
      <summary className="cursor-pointer text-text-link underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">See {lines.length === 1 ? "the reason" : `the ${lines.length} reasons`}</summary>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-text-muted">{lines.map((l, i) => <li key={i} className="break-words">{l}</li>)}</ul>
    </details>
  );
}

/** The top-bar chip: the newest run going on now, with its step; follows the person to any page. */
export function RunChip() {
  const q = useApi<{ runs: { id: string; label: string; scope: string | null; status_word: string; step: { n: number; m: number } | null; href: string }[] }>(["runs-active"], "/runs?active=1", { refetchInterval: (s) => (s.state.data?.runs.length ? 2000 : 6000) });
  const r = q.data?.runs[0];
  if (!r) return null;
  const more = (q.data?.runs.length ?? 1) - 1;
  return (
    <TipProvider><Tip tip={`${r.label}${r.scope ? ` for ${r.scope}` : ""}: ${r.status_word.toLowerCase()}. Open it to watch its steps or stop it.${more ? ` ${more} more run${more === 1 ? "" : "s"} going on.` : ""}`}>
      <Link to={r.href} aria-label={`${r.label}${r.step ? ` · step ${r.step.n} of ${r.step.m}` : ""}${more ? ` · +${more}` : ""}`} className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:px-3" data-run-chip>
        <Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
        <span className="hidden max-w-64 truncate md:inline">{r.label}{r.step ? ` · step ${r.step.n} of ${r.step.m}` : ""}{more ? ` · +${more}` : ""}</span>
      </Link>
    </Tip></TipProvider>
  );
}
