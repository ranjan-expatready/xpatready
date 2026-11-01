// F2 C2.12 slice 3 (forms lane; the agreed F3 board design/draft-wizard.html, PDF views only since P-102): one form's guided
// path on this combination, read from GET /combinations/:id/forms/:code/progress (#186). The rail only reads and links
// (BR-1): every step opens the screen already built; it has no write action and copies no rule. Addressable as
// ?setup=<form number> (a reload or a shared link lands on the same form, BR-4 resume).
import * as React from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/lib/api";
import { Button, Notice, Panel, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import type { FormProgress, ProgressState } from "../../../../contracts/form-progress";

const STATE_WORDS: Record<ProgressState, string> = { done: "Done", needs_you: "Your step", waiting_others: "Waiting on someone else", running: "Running", not_started: "Not started" };
const STATE_TONE: Record<ProgressState, "ok" | "warn" | "ai" | "neutral"> = { done: "ok", needs_you: "warn", waiting_others: "neutral", running: "ai", not_started: "neutral" };
const progressPath = (id: string, code: string) => `/combinations/${id}/forms/${encodeURIComponent(code)}/progress`;
export const progressKey = (id: string, code: string) => ["form-progress", id, code];

/** The step chip on a form's row: where the form stands, as a button that opens its guided path. */
export function StepChip({ id, code, onOpen }: { id: string; code: string; onOpen: () => void }) {
  const p = useApi<FormProgress>(progressKey(id, code), progressPath(id, code));
  if (p.isError) return null;
  const done = p.data && p.data.current === null;
  const cur = p.data?.steps.find((s) => s.key === p.data!.current);
  const label = !p.data ? "Guided setup" : done ? "Set up · all 6 steps done" : `Step ${cur!.n} of 6 · ${STATE_WORDS[cur!.state]}`;
  return <Button size="sm" variant="ghost" className="h-auto px-1 py-0.5 text-xs" onClick={onOpen} aria-label={`Guided setup of ${code}: ${label}`} data-step-chip={code} data-current={p.data?.current ?? (p.data ? "done" : "")}>{label}</Button>;
}

/** The guided path of one form: six steps, the person's next step, what is left. */
export function SetupRail({ id, code, onClose }: { id: string; code: string; onClose: () => void }) {
  const p = useApi<FormProgress>(progressKey(id, code), progressPath(id, code), { refetchInterval: (q) => (q.state.data?.steps.some((s) => s.state === "running") ? 4000 : false) });
  const data = p.data;
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`Set up ${code} on this combination`} description="Six steps from the PDF to a complete field map. Each step opens the page where it is done; this panel only shows where things stand."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {p.isLoading ? <Spinner label="Reading where this form stands" />
        : p.isError ? <Notice tone="danger" title="Where this form stands could not be read" action={<Button size="sm" variant="secondary" onClick={() => void p.refetch()}>Try again</Button>}>{(p.error as Error).message}</Notice>
        : data ? <div className="space-y-4 text-sm" data-setup-rail={code}>
          {data.next_for_you
            ? <div className="rounded-lg border border-primary/40 bg-primary/5 p-3" data-next-for-you><p className="text-xs font-medium uppercase tracking-wide text-text-muted">Your next step</p><Link className="mt-1 inline-block font-medium text-text-link underline" to={data.next_for_you.href}>{data.next_for_you.label}</Link></div>
            : data.current === null ? <Notice tone="ok" title="Every step is done">The field map of {code} is complete for this combination.</Notice>
            : <p className="text-text-muted" data-next-for-you="none">Nothing for you to do here now: {data.steps.find((s) => s.key === data.current)?.who ?? "someone else acts next"}</p>}
          <ol className="space-y-2" aria-label={`Steps to set up ${code}`}>
            {data.steps.map((s) => (
              <li key={s.key} className={`rounded-lg border p-3 ${s.key === data.current ? "border-primary" : "border-border"}`} data-step={s.key} data-state={s.state} aria-current={s.key === data.current ? "step" : undefined}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{s.n}. {s.label}</span><Pill tone={STATE_TONE[s.state]}>{STATE_WORDS[s.state]}</Pill></div>
                <p className="mt-1 text-text-muted">{s.words}</p>
                {s.who ? <p className="mt-1 text-xs text-text-muted">{s.who}</p> : null}
                {s.next ? <Link className="mt-1 inline-block text-text-link underline" to={s.next.href}>{s.next.label}</Link> : null}
              </li>
            ))}
          </ol>
          {data.whats_left.length ? <div data-whats-left><h3 className="font-medium">What's left ({data.whats_left.length})</h3><ul className="mt-1 list-disc space-y-1 pl-5">{data.whats_left.map((w) => <li key={w.step}>{w.href ? <Link className="text-text-link underline" to={w.href}>{w.what}</Link> : w.what}{w.count > 1 ? ` · ${w.count} open` : ""}{w.who ? <span className="text-text-muted"> · {w.who}</span> : null}</li>)}</ul></div> : null}
        </div> : null}
    </Panel>
  );
}
