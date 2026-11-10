// C10.2 (DEMO.md checkpoint 3): Demo › Load the finished story. The dialog says what the load does, asks for RESET when
// the demo has content (it empties it first), starts the job (POST /demo/checkpoints/finished-story, 202) and follows it
// on GET /demo/status until it is done; then each stage of the family case's story in plain words, with what still
// waits and why, and a link to the case. US$0: no live AI call.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Stage = { key: string; title: string; status: "done" | "partial" | "waiting"; shows: string; why: string | null };
type Story = { state: "idle" | "running" | "done" | "failed"; started_at?: string; seconds?: number; error?: string; stages?: Stage[]; cases?: { family: string | null; thin: string | null } };
type Status = { programsExist: boolean; checkpoint: string | null; story: Story };
const TONE: Record<Stage["status"], string> = { done: "ok", partial: "warn", waiting: "warn" };
const WORD: Record<Stage["status"], string> = { done: "Done", partial: "Partly", waiting: "Waiting" };
/** Review m5: what each status means, on hover and focus. */
const TIP: Record<Stage["status"], string> = { done: "Every part of this step is done.", partial: "Done in part: what still waits, and why, is said under the step.", waiting: "Not done: why is said under the step." };

/** The words of the Demo menu item's tooltip (plain words, what it loads and that it empties the demo first). */
export const FINISHED_STORY_TIP = "Loads the Visitor visa family case all the way through: moved to release 2, facts answered, forms filled, IMM 5476 signed, every filing Ready to file and the submission recorded, plus a second case left on release 1. Empties the demo first. All Sample, US$0.";

export function FinishedStoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = React.useState("");
  const [started, setStarted] = React.useState(false);
  // Review m1: the last story's result shows in any tab and after a reload (the status holds it); "Load again" goes on.
  const [again, setAgain] = React.useState(false);
  const status = useApi<Status>(["demo-status", "finished-story", open], open ? "/demo/status" : null, { refetchInterval: (q) => (q.state.data?.story?.state === "running" ? 3000 : false) });
  const story = status.data?.story, running = story?.state === "running";
  const needsReset = !!status.data?.programsExist && !running;
  const load = useAction(() => api("/demo/checkpoints/finished-story", { method: "POST", json: needsReset ? { confirm } : {} }), { invalidate: [["demo-status"]], onDone: () => { setStarted(true); setConfirm(""); } });
  // Break m: "Load again" keeps the form until the new run shows as running, so the old result never flashes back.
  React.useEffect(() => { if (running) setAgain(false); }, [running]);
  React.useEffect(() => { if (started && story?.state === "done") void qc.invalidateQueries(); }, [started, story?.state, qc]);
  const finished = !again && ((story?.state === "done" && status.data?.checkpoint === "finished_story") || (started && story?.state === "failed"));
  // The job runs on the server: closing the dialog while it runs leaves it running; opening it again shows its state.
  const close = () => { if (!load.isPending) { setStarted(false); setAgain(false); onOpenChange(false); } };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }} wide={finished} title={finished ? (story?.state === "done" ? "Finished story loaded" : "The finished story stopped") : "Load the finished story?"}
      description={finished ? "Each step of the family case, done through the same screens' rules by the people who act. No live AI call was made (US$0)." : "The configured checkpoint, then the Visitor visa family case taken to a recorded submission by the people who act. US$0: no live AI call."}
      footer={finished ? <><Button variant="ghost" onClick={() => setAgain(true)} data-finished-story-again>Load again…</Button><Button onClick={close}>Continue</Button></> : <><Button variant="ghost" disabled={load.isPending} onClick={close}>{running ? "Close (it keeps loading)" : "Cancel"}</Button><Button busy={running || load.isPending} disabled={status.isPending || (needsReset && confirm !== "RESET")} onClick={() => load.mutate(undefined)} data-finished-story-load>Load the finished story</Button></>}>
      {/* Walk on #1394 (9 Nov): until the demo's state is read, say so, never the intro that the last result then replaces. */}
      {status.isPending ? <p className="inline-flex items-center gap-2 text-sm text-text-muted" data-finished-story-reading><Spinner /> Reading the demo's state…</p> : finished ? <StoryResult story={story!} onOpen={close} /> : (
        <div className="space-y-3 text-sm" data-finished-story-brings>
          <ul className="list-disc space-y-1 pl-5">
            <li>Everything the configured checkpoint brings: the six combinations, Visitor visa released twice <Pill tone="warn">Sample</Pill></li>
            <li>The family case moves to release 2 (IMM 5257 filed Online); the client and the case officer answer what release 2 asks; the case officer confirms each section</li>
            <li>The Online answer sheet ticked "Entered in the portal"; PDF copies filled; IMM 5476 printed, signed and its scan uploaded; passports received</li>
            <li>The representative of record reviews each filing; every filing Ready to file; the submission recorded with Sample numbers</li>
            <li>A second, thin case stays on release 1</li>
          </ul>
          <p className="text-text-muted">A step a rule refuses stays where it is and says why; nothing is faked. This takes a few minutes.</p>
          {running ? <Notice tone="info" title="Loading the finished story…"><span className="inline-flex items-center gap-2" data-finished-story-running><Spinner /> Started {story?.started_at ? new Date(story.started_at).toLocaleTimeString() : ""}. You can close this: it keeps loading, and Demo › Load the finished story shows its result.</span></Notice> : null}
          {needsReset ? (
            <label className="block space-y-1">
              <span>The demo has content: it is emptied first. Type <b>RESET</b> to confirm.</span>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type RESET to confirm" data-finished-story-confirm />
            </label>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}

function StoryResult({ story, onOpen }: { story: Story; onOpen: () => void }) {
  if (story.state === "failed") return <Notice tone="danger" title="Loading stopped">{story.error}</Notice>;
  return (
    <TooltipProvider delayDuration={200}><div className="space-y-3 text-sm" data-finished-story-result>
      <table className="w-full table-fixed border-collapse text-left">
        <thead><tr className="border-b border-border text-text-muted"><th className="py-1 pr-2 font-medium">Step</th><th className="w-28 py-1 font-medium">Status</th></tr></thead>
        <tbody>{(story.stages ?? []).map((s) => (
          <tr key={s.key} className="border-b border-border align-top" data-story-stage={s.key} data-status={s.status}>
            <td className="break-words py-1.5 pr-3"><div className="font-medium">{s.title}</div><div className="text-text-muted">{s.shows}</div>{s.why ? <div className="mt-0.5 text-text-muted" data-story-why>Still waits: {s.why}</div> : null}</td>
            <td className="py-1.5"><Tooltip><TooltipTrigger asChild><span tabIndex={0} className="rounded-md focus-visible:outline focus-visible:outline-2" aria-label={`${WORD[s.status]}: ${TIP[s.status]}`}><Pill tone={TONE[s.status]}>{WORD[s.status]}</Pill></span></TooltipTrigger><TooltipContent>{TIP[s.status]}</TooltipContent></Tooltip></td>
          </tr>))}</tbody>
      </table>
      <p>{story.cases?.family ? <Link className="text-text-link underline" to={`/cases/${story.cases.family}`} onClick={onOpen} data-story-open-case>Open the family case</Link> : null}{story.cases?.thin ? <> · <Link className="text-text-link underline" to={`/cases/${story.cases.thin}`} onClick={onOpen}>Open the case left on release 1</Link></> : null}</p>
      <p className="text-text-muted">Loaded in {story.seconds?.toFixed(0)} s.</p>
    </div></TooltipProvider>
  );
}
