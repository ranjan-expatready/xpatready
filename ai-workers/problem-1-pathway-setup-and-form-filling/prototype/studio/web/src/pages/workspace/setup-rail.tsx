// F2 C2.12 slice 3 (forms lane; the agreed F3 board design/draft-wizard.html, PDF views only since P-102): one form's guided
// path on this combination. The chip on each row comes in the Forms tab's one workspace response (review 28b3bba3 Major 1:
// never one request per row); the rail reads GET /combinations/:id/forms/:code/progress (#186) for the form it opens. The
// rail only reads and links (BR-1): every step opens the screen already built; it has no write action and copies no rule.
// Addressable as ?setup=<form number> (a reload or a shared link lands on the same form, BR-4 resume).
import * as React from "react";
import { Link } from "react-router-dom";
import { ApiError, useApi } from "@/lib/api";
import { Button, Notice, Panel, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { Tip } from "@/components/status";
import type { FormProgress, FormStepChip, ProgressState } from "../../../../contracts/form-progress";

export const STATE_WORDS: Record<ProgressState, string> = { done: "Done", needs_you: "Your step", waiting_others: "Waiting on someone else", running: "Running", not_started: "Not started" };
const STATE_TONE: Record<ProgressState, "ok" | "warn" | "ai" | "neutral"> = { done: "ok", needs_you: "warn", waiting_others: "neutral", running: "ai", not_started: "neutral" };
const progressPath = (id: string, code: string) => `/combinations/${id}/forms/${encodeURIComponent(code)}/progress`;
/** Under the ["combination", id] key (review Major 3): every row action that refreshes the combination refreshes the rail. */
export const progressKey = (id: string, code: string) => ["combination", id, "form-progress", code];
/** The chip's words: the step's number and short name and where it stands (board: "Step 3 of 6 · Review"). */
export const chipWords = (c: FormStepChip) => (c.current === null ? "Set up · all 6 steps done" : `Step ${c.n} of 6 · ${c.label} · ${STATE_WORDS[c.state]}`);
const CHIP_TIP = "Worked out from what has been done. You never tick a step. Open it to see each step and what is left.";

/** The step chip on a form's row: where the form stands, as a button that opens its guided path. */
export function StepChip({ code, chip, onOpen }: { code: string; chip: FormStepChip | undefined; onOpen: () => void }) {
  if (!chip) return null;
  const label = chipWords(chip);
  return <Tip tip={CHIP_TIP}><Button size="sm" variant="ghost" className="h-auto whitespace-normal px-1 py-0.5 text-left text-xs" onClick={onOpen} aria-label={`Guided setup of ${code}: ${label}`} data-step-chip={code} data-current={chip.current ?? "done"}>{label}</Button></Tip>;
}

/** The guided path of one form: six steps, the person's next step, what is left. */
export function SetupRail({ id, code, onClose }: { id: string; code: string; onClose: () => void }) {
  // Concept m6: refetched on focus and on return; while a step runs, it follows it.
  const p = useApi<FormProgress>(progressKey(id, code), progressPath(id, code), { refetchOnWindowFocus: true, refetchInterval: (q) => (q.state.data?.steps.some((s) => s.state === "running") ? 4000 : false) });
  const data = p.data;
  // Review Minor 6: the title names the form as the library spells it (never the raw address value), at most 40 characters.
  const name = data?.form ?? (code.length > 40 ? `${code.slice(0, 40)}…` : code);
  const gone = p.error instanceof ApiError && [400, 404].includes(p.error.status);
  const current = data?.steps.find((s) => s.key === data.current);
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`Set up ${name} on this combination`} bodyLabel={`Where ${name} stands`}
      description="Six steps from the PDF to a complete field map. Each step opens the page where it is done; this panel only shows where things stand."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {p.isLoading ? <Spinner label="Reading where this form stands" />
        : p.isError ? <Notice tone="danger" title="Where this form stands could not be read" action={gone ? undefined : <Button size="sm" variant="secondary" onClick={() => void p.refetch()}>Try again</Button>}>{(p.error as Error).message}</Notice>
        : data ? <div className="space-y-4 text-sm" data-setup-rail={data.form}>
          {data.next_for_you
            ? <div className="rounded-lg border border-primary/40 bg-primary/5 p-3" data-next-for-you><p className="text-xs font-medium uppercase tracking-wide text-text-muted">Your next step</p><Link className="mt-1 inline-block font-medium text-text-link underline" to={data.next_for_you.href}>{data.next_for_you.label}</Link></div>
            : data.current === null ? <Notice tone="ok" title="Every step is done">The field map of {data.form} is complete for this combination.</Notice>
            // Review Minor 3: while the AI draft runs, say so (not "someone else acts").
            : current?.state === "running" ? <p className="text-text-muted" data-next-for-you="running">Nothing for you to do here now: {current.words}</p>
            : <p className="text-text-muted" data-next-for-you="none">Nothing for you to do here now: {current?.who ?? "someone else acts next."}</p>}
          <ol className="space-y-2" aria-label={`Steps to set up ${data.form}`}>
            {data.steps.map((s) => (
              <li key={s.key} className={`rounded-lg border p-3 ${s.key === data.current ? "border-primary" : "border-border"}`} data-step={s.key} data-state={s.state} aria-current={s.key === data.current ? "step" : undefined}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{s.n}. {s.label}</span><Pill tone={STATE_TONE[s.state]}>{STATE_WORDS[s.state]}</Pill></div>
                <p className="mt-1 text-text-muted">{s.words}</p>
                {s.who ? <p className="mt-1 text-xs text-text-muted" data-who>{s.who}</p> : null}
                {s.next ? <Link className="mt-1 inline-block text-text-link underline" to={s.next.href} data-step-link>{s.next.label}</Link> : null}
              </li>
            ))}
          </ol>
          {/* Review Minor 1 (BR-5): what's left is the open things only, each with who acts and a link where there is one. */}
          {data.whats_left.length ? <div data-whats-left><h3 className="font-medium">What's left ({data.whats_left.length})</h3><ul className="mt-1 list-disc space-y-1 pl-5">{data.whats_left.map((w) => <li key={w.step}>{w.href ? <Link className="text-text-link underline" to={w.href}>{w.what}</Link> : w.what}{w.who ? <span className="text-text-muted"> · {w.who}</span> : null}</li>)}</ul></div> : null}
        </div> : null}
    </Panel>
  );
}
