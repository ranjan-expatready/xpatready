// BK-5 PR 1 (P-447 (2), Bake plan row 5; squeeze S3, P-481; concept rev 2 approved, P-484): Demo › Starting points.
// One page, three starting points (doors) and the reset, so whoever runs the demo or a walk picks where the story
// starts in plain words and lands on its first screen. Demo chrome (P-35), not for porting (EXPERIENCE §1): it calls
// only the existing demo routes, each behind the author duty and the demo-workspace guard (api/src/demo.ts), so the
// server refuses whatever this page shows.
//   Door 1 "Nothing set up": POST /demo/reset.
//   Door 2 "Pathways released, ready to walk" (E1's door, P-484 (1)): two calls, POST /demo/reset then
//     POST /demo/load {sample:"configured"} (P-484 (2)); a load that stops after the reset says so in BR-6's words.
//   Door 3 "The finished story": POST /demo/checkpoints/finished-story, a job that empties under its own lock; its
//     progress comes from GET /demo/status `story` and survives a reload.
// US$0: no door calls a live AI route (BR-7).
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { enterCasesAsStaff } from "@/components/frame";
import { useQueryClient } from "@tanstack/react-query";
import { DoorOpen, RotateCcw } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { FinishedStoryDialog } from "@/components/demo-finished-story";
import { cn } from "@/lib/utils";

type DoorKey = "blank" | "configured" | "story";
type Kept = { label: string; files: number; sha256: string };
type Status = {
  programsExist: boolean; checkpoint: "configured" | "finished_story" | null;
  scope: { total_rows: number; built_in_rows: number; files: number }; preserved: Kept[];
  story: { state: "idle" | "running" | "done" | "failed"; started_at?: string; seconds?: number; error?: string; cases?: { family: string | null; thin: string | null } };
};
type Session = { actor?: { id: string; name: string; duties: string[] }; actors?: { id: string; name: string; duties: string[] }[]; workspace?: { demo: boolean } };
type ResetResult = { removed_rows: number; removed_files: number; preserved_unchanged: boolean; seconds: number };

/** Each door's words (concept §4; board-bk5.html). `comes`: what the confirm dialog says comes back. */
const DOORS: { key: DoorKey; name: string; shows: string; typical: string; button: string; comes: string[] }[] = [
  { key: "blank", name: "Nothing set up", shows: "An empty Studio: add a program, find its forms, let AI draft from saved answers.", typical: "Typically a few seconds", button: "Start from nothing",
    comes: ["An empty Studio with its built-in person roles", "Nothing else: you add the first program"] },
  { key: "configured", name: "Pathways released, ready to walk", shows: "Five of the six pathways released, a family case open on Visitor visa. The walk starts here: change one thing on a pathway and release it through both checks.", typical: "Typically 2 minutes", button: "Start here",
    comes: ["The six pathways (5 Retail + 1 Corporate, Sample), their official PDFs and saved AI answers reviewed", "Five of them submitted, signed and released by the people who hold each duty; High-wage position has no form and stays unreleased", "A family case open on Visitor visa"] },
  { key: "story", name: "The finished story", shows: "The family case all the way through: forms filled, signed, every filing ready to file.", typical: "Typically a few minutes, in the background", button: "Load the finished story",
    comes: ["Everything the pathways door brings", "The Visitor visa family case taken to a recorded submission, and a second case left on release 1"] },
];
const NAME: Record<DoorKey, string> = { blank: DOORS[0].name, configured: DOORS[1].name, story: DOORS[2].name };

/** BR-4: which door the demo was last loaded from, only from GET /demo/status; anything else is "another state". */
function lastLoaded(s: Status | undefined): DoorKey | "other" | null {
  if (!s) return null;
  if (s.story?.state === "running") return "other"; // the story's job is still writing (its own card says so)
  if (!s.programsExist) return "blank";
  if (s.checkpoint === "finished_story") return "story";
  if (s.checkpoint === "configured") return "configured";
  return "other";
}

/** Whole seconds since `from` (ms), ticking each second while `on`. */
function useElapsed(from: number | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { if (from == null) return; setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [from]);
  return from == null ? 0 : Math.max(0, Math.floor((now - from) / 1000));
}

export function StartPage() {
  const actorId = useActorId();
  const session = useApi<Session>(["session", actorId], "/session");
  const status = useApi<Status>(["demo-status", "start"], "/demo/status", { refetchInterval: (q) => {
    // The story's job: every 3 s. Break m3: "Another state" with programs may be a load running elsewhere (another tab, or
    // this one before a reload): read again every 10 s, so "Last loaded" follows when it finishes.
    const d = q.state.data; return d?.story?.state === "running" ? 3000 : d && d.programsExist && !d.checkpoint ? 10_000 : false;
  } });
  const [door, setDoor] = React.useState<DoorKey | null>(null);
  const [storyOpen, setStoryOpen] = React.useState(false);

  const me = session.data?.actor, author = !!me?.duties?.includes("author"), demo = session.data?.workspace?.demo !== false;
  const authorPerson = session.data?.actors?.find((a) => a.duties.includes("author"));
  const s = status.data, last = lastLoaded(s), story = s?.story;
  // When the story's job stops, every screen reads again, this one included: GET /demo/status reads the checkpoint line
  // before the job's state, so the answer that first says "done" can still carry the checkpoint from before the job's
  // last line (seen in this page's check, 11 Nov), and polling stops there.
  const qc = useQueryClient(), wasRunning = React.useRef(false);
  React.useEffect(() => { const running = story?.state === "running"; if (wasRunning.current && !running) void qc.invalidateQueries(); wasRunning.current = running; }, [story?.state, qc]);
  // BR-3: only the author duty, only in the demo workspace; both known up front, never after a click.
  const off = !session.data ? "Reading who is acting…" : !demo ? "This workspace is not the demo: starting points would empty real work, so they are off." : !author ? "Only the Configuration author loads a starting point." : null;
  // P-473/BIC-11: one filled button: the last-loaded card's Continue when a door's state is loaded, else E1's door.
  const filled: DoorKey = last === "configured" || last === "story" ? last : "configured";

  return (
    <div className="mx-auto max-w-5xl space-y-5" data-start-page>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">Starting points <Pill tone="warn" title="Demo chrome: not part of the product">Demo</Pill></h1>
        <p className="mt-1 text-sm text-text-muted">Each starting point empties the demo workspace and loads a known state. Saved AI answers, official PDFs and the spend record are kept and checked. US$0.</p>
        <p className="mt-2 text-sm" data-last-loaded>
          {status.isPending ? <span className="inline-flex items-center gap-2 text-text-muted"><Spinner /> Reading the demo's state…</span>
            : status.isError ? null
            : <>Last loaded: <b>{last === "other" || last === null ? "Another state (for example the six, or a load not finished)" : NAME[last]}</b></>}
        </p>
      </div>
      {status.isError ? <Notice tone="danger" title="The demo's state could not be read">{(status.error as Error).message}. The starting points need it: reload this page once the studio answers.</Notice> : null}
      {off && session.data ? (
        <Notice tone="warn" title={off} action={demo && authorPerson ? /* BK-5 PR 2: the one place a person is chosen is the sign-in page (BK-4a BR-1); the author lands back here */ <Button asChild size="sm" variant="secondary"><Link to="/sign-in" data-start-as-author>Sign in as the Configuration author</Link></Button> : undefined}>
          <span data-start-off>{demo ? `${me?.name ?? "This person"} (simulated) can look, not start. The server refuses a start from anyone else too.` : "Nothing here can run in this workspace."}</span>
        </Notice>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3" data-start-doors>
        {DOORS.map((d) => {
          const isLast = last === d.key, storyRunning = d.key === "story" && story?.state === "running";
          return (
            <section key={d.key} aria-labelledby={`door-${d.key}`} data-door={d.key} data-last={isLast ? "" : undefined}
              className={cn("flex flex-col gap-3 rounded-xl border bg-surface-raised p-4", isLast ? "border-ok/60" : d.key === "configured" ? "border-primary/40" : "border-border")}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={`door-${d.key}`} className="text-base font-semibold">{d.name}</h2>
                {isLast ? <Pill tone="ok">Last loaded</Pill> : null}
              </div>
              <p className="text-sm">{d.shows}</p>
              <p className="text-xs text-text-muted">{d.typical}</p>
              {storyRunning ? <StoryRunning startedAt={story?.started_at} onOpen={() => setStoryOpen(true)} /> : null}
              {d.key === "story" && story?.state === "failed" ? <Notice tone="danger" title="The finished story stopped"><span data-story-failed>{story.error}</span></Notice> : null}
              {d.key === "story" && isLast && story?.cases?.family ? <Link className="text-sm text-text-link underline" to={`/cases/${story.cases.family}`} onClick={enterCasesAsStaff /* BK-4a: a link into Cases names its person (P-484 (4)) */}>Open the family case (as Case officer)</Link> : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {isLast ? <>
                  <Button asChild variant={filled === d.key ? "default" : "secondary"}><Link to="/" data-start-continue>Continue to Immigration programs</Link></Button>
                  <Button variant="ghost" disabled={!!off || !s || storyRunning} onClick={() => setDoor(d.key)} data-start-door={d.key}><RotateCcw /> Start again from here</Button>
                </> : <Button variant={filled === d.key ? "default" : "secondary"} disabled={!!off || !s || storyRunning} onClick={() => setDoor(d.key)} data-start-door={d.key}><DoorOpen /> {d.button}</Button>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">The six on their own and "With an LMIA from its reviewed release" stay in the Demo menu.</p>
      {door ? <StartDialog door={door} status={s} onClose={() => {
        // Break m4: the dialog is unmounted on close, so focus goes back to the door that opened it (when it is still there).
        const k = door; setDoor(null); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-start-door="${k}"]`)?.focus());
      }} onStory={() => setStoryOpen(true)} /> : null}
      <FinishedStoryDialog open={storyOpen} onOpenChange={setStoryOpen} />
    </div>
  );
}

function StoryRunning({ startedAt, onOpen }: { startedAt?: string; onOpen: () => void }) {
  const secs = useElapsed(startedAt ? Date.parse(startedAt) : null);
  return (
    <Notice tone="info" title="Loading the finished story…">
      <span className="inline-flex flex-wrap items-center gap-2" data-story-running><Spinner /> {secs} s so far. It keeps loading if you leave or reload this page.
        <button type="button" className="text-text-link underline" onClick={onOpen}>Show progress</button></span>
    </Notice>
  );
}

/** The confirm dialog of one door (concept §4): what goes, what comes back, what is kept; RESET only when the workspace
 *  has programs (BR-2); running with real elapsed seconds (BR-5); the server's own words on a refusal; door 2's
 *  part-way failure (BR-6). */
function StartDialog({ door, status, onClose, onStory }: { door: DoorKey; status: Status | undefined; onClose: () => void; onStory: () => void }) {
  const d = DOORS.find((x) => x.key === door)!;
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = React.useState("");
  const [phase, setPhase] = React.useState<null | "checking" | "emptying" | "loading" | "starting">(null);
  const [since, setSince] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState<{ title: string; words: string; retry: boolean } | null>(null);
  const once = React.useRef(false); // a double click sends one start
  const secs = useElapsed(phase ? since : null);
  // Review M1: an unknown state asks for RESET (never "nothing to lose" without having read it); go() reads it again.
  const needsReset = status ? status.programsExist : true;
  const ready = !phase && (!needsReset || confirm === "RESET");
  const kept = (r: ResetResult) => (r.preserved_unchanged ? "Kept files checked unchanged." : "Kept files CHANGED: investigate before continuing.");

  const go = async () => {
    if (once.current || !ready) return;
    once.current = true; setFailed(null); setSince(Date.now());
    let emptied: ResetResult | null = null;
    try {
      // Review M1: the demo is read again just before anything is emptied: programs loaded meanwhile (another tab, a
      // stale or unread page) are never emptied without RESET typed. The server asks for RESET as the person's guard
      // against losing work; only when this read finds no programs, so nothing they made is lost, does the page send it
      // for them (BR-2: an empty workspace starts at once).
      setPhase("checking");
      const now = await api<Status>("/demo/status");
      if (now.programsExist && confirm !== "RESET") {
        await qc.invalidateQueries({ queryKey: ["demo-status"] });
        setFailed({ title: "The demo has changed", words: "The demo has programs now (loaded meanwhile, for example in another tab): nothing was emptied. Type RESET to confirm.", retry: false });
        return;
      }
      const sure = { confirm: now.programsExist ? confirm : "RESET" };
      if (door === "story") {
        setPhase("starting");
        await api("/demo/checkpoints/finished-story", { method: "POST", json: now.programsExist ? sure : {} });
        void qc.invalidateQueries();
        toast.push({ tone: "info", text: "The finished story is loading in the background: its card shows how far it is." });
        onClose(); onStory();
        return;
      }
      setPhase("emptying");
      emptied = await api<ResetResult>("/demo/reset", { method: "POST", json: sure });
      if (door === "blank") {
        void qc.invalidateQueries();
        toast.push({ tone: emptied.preserved_unchanged ? "ok" : "danger", text: `${NAME.blank}: emptied in ${emptied.seconds.toFixed(1)} s (${emptied.removed_rows} rows removed). ${kept(emptied)}` });
        onClose(); nav("/");
        return;
      }
      setPhase("loading");
      const t1 = Date.now();
      await api("/demo/load", { method: "POST", json: { sample: "configured" } });
      void qc.invalidateQueries();
      const total = emptied.seconds + (Date.now() - t1) / 1000;
      toast.push({ tone: emptied.preserved_unchanged ? "ok" : "danger", text: `${NAME.configured}: loaded in ${total.toFixed(0)} s. ${kept(emptied)} Pick the pathway to change, then Review and release.` });
      onClose(); nav("/");
    } catch (e) {
      const words = (e as Error).message, refused = e instanceof ApiError && e.status === 409;
      void qc.invalidateQueries(); // whatever happened, every screen reads the demo again
      // BR-6: the reset ran, the load did not finish: the demo is not empty and not loaded, and Start again empties it first.
      // Break m1: a load refused (409) before it began wrote nothing: the demo is emptied, not part loaded.
      // Break m2: a retry refused before anything ran leaves the demo as the last try left it, and says so.
      setFailed(emptied ? (refused ? { title: "Emptied, not loaded", words: `Emptied; the configured load did not start: ${words} Start again empties it first.`, retry: true }
          : { title: "Stopped part way", words: `Emptied; the configured load stopped part way: ${words} Start again empties it first.`, retry: true })
        : { title: "Not started", words: failed?.title === "Stopped part way" || failed?.title === "Emptied, not loaded" ? `${words} Nothing more was done: the demo is still as the last try left it (emptied, not fully loaded).` : words, retry: true });
    } finally { once.current = false; setPhase(null); }
  };

  const running = !!phase;
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !running) onClose(); }} wide title={`Empty the demo and start from ${d.name}?`}
      description={door === "configured" ? "Two steps: the demo is emptied, then the configured checkpoint loads. Keep this page open until it finishes. US$0: no live AI call." : door === "story" ? "One job on the server: it empties the demo, then loads the story. It keeps going if you leave this page. US$0: no live AI call." : "One step: the demo is emptied. US$0: no live AI call."}
      footer={<><Button variant="ghost" disabled={running} onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={!ready} busy={running} onClick={() => void go()} data-start-go>{failed?.retry ? "Try again" : "Empty and start"}</Button></>}>
      {failed ? <Notice tone="danger" title={failed.title} className="mb-3"><span data-start-failed>{failed.words}</span></Notice> : null}
      <div className="grid gap-4 text-sm sm:grid-cols-3" data-start-confirm={door}>
        <div><p className="mb-1 font-medium">Goes</p><ul className="list-disc space-y-1 pl-5" data-start-goes>
          {/* Review m1: on a demo with no programs the rows left are the last reset's own record lines, not anyone's work. */}
          {status && !status.programsExist ? <li>No programs: only {status.scope.total_rows} record line{status.scope.total_rows === 1 ? "" : "s"}, such as the last reset's activity line</li>
            : <li>All configuration, releases and cases: {status ? <b>{status.scope.total_rows} row{status.scope.total_rows === 1 ? "" : "s"}</b> : "the rows in the demo"}</li>}
          <li>The demo's working files{status ? ` (${status.scope.files})` : ""}</li></ul></div>
        <div><p className="mb-1 font-medium">Comes back</p><ul className="list-disc space-y-1 pl-5" data-start-comes>{d.comes.map((c) => <li key={c}>{c}</li>)}</ul></div>
        <div><p className="mb-1 font-medium">Kept</p><ul className="list-disc space-y-1 pl-5" data-start-kept>
          <li>Saved AI answers, so they replay at US$0</li><li>The official PDF copies and the spend record</li><li>All checked byte-identical after emptying{status ? ` (${status.preserved.reduce((a, p) => a + p.files, 0)} files)` : ""}</li></ul></div>
      </div>
      {running ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm" role="status" data-start-running>
          <Spinner /> {phase === "checking" ? "Reading the demo's state…" : phase === "emptying" ? "Emptying…" : phase === "loading" ? "Loading the configured checkpoint…" : "Starting the finished story…"} {secs} s{door === "configured" ? ". Keep this page open until it finishes." : ""}
        </p>
      ) : null}
      {needsReset ? (
        <label className="mt-3 flex flex-col gap-1.5 text-sm"><span>The demo has programs. Type <b>RESET</b> to confirm.</span>
          <Input className="w-48" value={confirm} disabled={running} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void go(); }} aria-label="Type RESET to confirm" data-start-confirm-input /></label>
      ) : <p className="mt-3 text-sm text-text-muted" data-start-no-reset>The demo has no programs, so nothing you made is lost: no RESET needed.</p>}
    </Dialog>
  );
}
