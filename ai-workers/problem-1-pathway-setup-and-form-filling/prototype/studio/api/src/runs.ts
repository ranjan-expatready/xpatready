// W1-07 shared run experience (P-110; S4 slice 2, challenge M7, m4): one read and one Stop for every background run —
// the form finder, Upload PDF and field-map drafting — so the run card and the top-bar chip look and behave the same
// everywhere (EXPERIENCE §4: real steps, no invented percentages). A run is an AiBatch with its steps (DraftingJob).
//  - GET /api/runs/:id → label, status (in words), step n of m, every step with its kind (rules or AI), times, counts and
//    cost, elapsed time, "usually about" from the newest finished run of the same kind, cost spent and worst case, and
//    where to see the result;
//  - POST /api/runs/:id/stop → Stop really ends it (no step or call starts after it; a running AI call is ended);
//  - GET /api/runs?active=1 → the runs going on now, for the chip that follows the person.
import { Controller, Get, Headers, HttpException, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import type { AiBatch, DraftingJob } from "@prisma/client";
import { actorOf, Db, Workspace, type Actor } from "./core.ts";
import { Ai } from "./ai.ts";
import { detailsOf, Finder, FINDER_OPERATION, FINDER_STEPS } from "./finder.ts";
import { UPLOAD_OPERATION, UPLOAD_STEPS, UploadRuns } from "./upload-run.ts";
import { statedUsd } from "./finder-cost.ts";

const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const ACTIVE = ["QUEUED", "RUNNING"];
const LABEL: Record<string, string> = { [FINDER_OPERATION]: "Finding forms", [UPLOAD_OPERATION]: "Reading an uploaded PDF", draft_field_maps: "Drafting field maps" };
/** The run's status in the words the card shows (EXPERIENCE §4 running, error, done states). */
export function runStatus(b: Pick<AiBatch, "status" | "cancelRequested">): { code: string; word: string } {
  if (ACTIVE.includes(b.status) && b.cancelRequested) return { code: "stopping", word: "Stopping" };
  const m: Record<string, [string, string]> = { QUEUED: ["queued", "Queued"], RUNNING: ["running", "Running"], CANCELLED: ["stopped", "Stopped"], FAILED: ["failed", "Failed"], COMPLETED: ["done", "Done"], PARTIAL: ["done_with_problems", "Done with problems"], NEEDS_PERSON: ["needs_person", "Waiting for you"] };
  const [code, word] = m[b.status] ?? ["running", b.status];
  return { code, word };
}
/** S3 early look (1): a run never shows raw technical text (an error code, a stack, a server path), whatever wrote it;
 *  such a message is replaced by plain words and the detail stays in the server log. */
const TECH = /\b(E(NOENT|ACCES|PERM|CONN[A-Z]+|ADDRINUSE|TIMEDOUT|PIPE|NOTDIR|ISDIR|EXIST)|errno|syscall|Node\.js v\d)|\/(Users|home|private|tmp|var)\/|[A-Za-z]:\\|\bat \S+:\d+:\d+|\.(m?[jt]s|json):\d+/;
export function plainRunText(t: string | null): string | null {
  if (!t || !TECH.test(t)) return t;
  console.warn("run message kept from the page:", t.slice(0, 600));
  return "Something went wrong on this computer; what the run spent is on this card. Try again, or attach the forms from the Form library by hand.";
}
type Step = { n: number; kind: string; label: string; uses: "rules" | "ai"; status: string; message: string | null; usd: number; started_at: Date | null; finished_at: Date | null; details: string | null; counts: { done: number; total: number; unit: string } | null };

@Injectable()
export class Runs {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Finder) private readonly finder: Finder, @Inject(Ai) private readonly ai: Ai, @Inject(UploadRuns) private readonly uploads: UploadRuns) {}

  private steps(b: AiBatch & { jobs: DraftingJob[] }): Step[] {
    const plan = (b.plan ?? {}) as { steps?: { kind: string; uses_ai?: boolean }[] };
    const defs = b.operation === FINDER_OPERATION ? FINDER_STEPS.map((s) => ({ kind: s.kind, label: s.label, ai: !!plan.steps?.find((p) => p.kind === s.kind)?.uses_ai }))
      : b.operation === UPLOAD_OPERATION ? UPLOAD_STEPS.map((s) => ({ kind: s.kind, label: s.label, ai: false }))
      : b.jobs.map((j) => ({ kind: j.kind, label: j.kind === "field_map" ? "AI drafts the form's field map" : j.kind === "reuse_map" ? "Add the reviewed field map from the library" : "Read the form on this computer", ai: j.kind === "field_map" && j.mode === "LIVE" }));
    return defs.map((d, i) => {
      const j = b.operation === FINDER_OPERATION || b.operation === UPLOAD_OPERATION ? b.jobs.find((x) => x.kind === d.kind) : b.jobs[i];
      const c = j?.detail && typeof j.detail === "object" ? (j.detail as { done?: number; total?: number }) : null;
      return { n: i + 1, kind: d.kind, label: d.label, uses: d.ai && !(j?.status === "COMPLETED" && !(j.costUsd ?? 0) && /no ai call/i.test(j.message ?? "")) ? "ai" : "rules", status: j?.status ?? "WAITING", message: plainRunText(j?.message ?? null), usd: j?.costUsd ?? 0, started_at: j && j.status !== "WAITING" && j.status !== "QUEUED" ? j.startedAt : null, finished_at: j?.finishedAt ?? null, details: detailsOf(j?.detail), counts: c?.total ? { done: c.done ?? 0, total: c.total, unit: b.operation === FINDER_OPERATION ? "forms" : "parts" } : null };
    });
  }

  /** "Usually about" time and cost: the newest finished run of the same kind and mode; null on a first run (never invented). */
  private async usual(b: AiBatch): Promise<{ ms: number | null; usd: number | null }> {
    const prev = await this.db.aiBatch.findFirst({ where: { workspaceId: b.workspaceId, operation: b.operation, mode: b.mode, id: { not: b.id }, status: { in: ["COMPLETED", "PARTIAL"] }, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, include: { jobs: { select: { costUsd: true } } } });
    if (!prev?.finishedAt) return { ms: null, usd: null };
    return { ms: prev.finishedAt.getTime() - prev.startedAt.getTime(), usd: Math.round(prev.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0) * 100) / 100 };
  }

  async view(id: string) {
    const b = await this.db.aiBatch.findUnique({ where: { id }, include: { jobs: { orderBy: { startedAt: "asc" } } } });
    if (!b) throw problem(404, "Not found", "This run no longer exists (the demo workspace may have been reset).");
    const steps = this.steps(b);
    const st = runStatus(b);
    const usual = await this.usual(b);
    const cur = steps.find((s) => s.status === "RUNNING") ?? null;
    const last = Math.max(b.startedAt.getTime(), ...b.jobs.map((j) => Math.max(j.startedAt.getTime(), j.finishedAt?.getTime() ?? 0)));
    const failedStep = steps.find((s) => ["FAILED", "BLOCKED", "NEEDS_PERSON"].includes(s.status));
    // Where the run's card is: the library for an upload; its own page otherwise (S5 points a finder run at its Forms tab).
    const href = b.operation === UPLOAD_OPERATION ? "/library/forms" : `/ai/${b.id}`;
    return { id: b.id, operation: b.operation, label: LABEL[b.operation] ?? b.operation, scope: b.operation === FINDER_OPERATION ? b.scopeLabel.split("|")[1] ?? null : b.scopeLabel, status: st.code, status_word: st.word, message: plainRunText(b.message),
      step: cur ? { n: cur.n, m: steps.length, label: cur.label } : null, steps, started_at: b.startedAt, finished_at: b.finishedAt, elapsed_ms: (b.finishedAt ?? new Date()).getTime() - b.startedAt.getTime(), usual_ms: usual.ms, last_activity_at: new Date(last),
      usd: { spent: Math.round(b.jobs.reduce((a, j) => a + (j.costUsd ?? 0), 0) * 100) / 100, worst: b.worstCaseUsd, usual: usual.usd, about: b.operation === FINDER_OPERATION ? statedUsd(b, usual.usd).about : usual.usd }, can_stop: ACTIVE.includes(b.status) && !b.cancelRequested,
      error: failedStep ? { what: b.message && plainRunText(b.message) !== failedStep.message ? plainRunText(b.message)! : `${failedStep.label}: see the step above.`, next: this.nextOf(b, href) } : null, href };
  }

  /** The one next step a stopped or waiting run offers (never a link to the page already open). */
  private nextOf(b: AiBatch, href: string): { label: string; href: string } | null {
    const plan = (b.plan ?? {}) as { held_id?: string; held_unread?: boolean };
    // QA-63 / S3 item 5 (replaces the interim link to the Sources page now that the Forms tab chooses the page): the finder's next step is on the combination's Forms tab, never this card: a run that could not
    // pick the application page opens the Find dialog at the page choice; any other opens it to find again.
    if (b.operation === FINDER_OPERATION) {
      const cid = (plan as { combination?: { id?: string } }).combination?.id ?? b.scopeLabel.split("|")[0], page = !!(b.plan as { result?: { guide_choice?: unknown } } | null)?.result?.guide_choice;
      return page ? { label: "Choose the application page", href: `/c/${cid}/forms?find=page` } : { label: "Find again", href: `/c/${cid}/forms?find=again` };
    }
    // Round 4 review should: a file the rules could not read can never be approved: say so, and what to do instead.
    if (b.operation === UPLOAD_OPERATION) return plan.held_id ? (plan.held_unread ? { label: "Open it on To review", href: `/review/held/${plan.held_id}` } : { label: "Record the IRCC page it came from", href: `/review/held/${plan.held_id}` }) : null;
    return { label: "See the details", href };
  }

  /** Stop, whatever the run: the finder and Upload PDF end their running step; field-map drafting ends its running calls. */
  async stop(actor: Actor, id: string) {
    const b = await this.db.aiBatch.findUnique({ where: { id } });
    if (!b) throw problem(404, "Not found", "This run no longer exists.");
    if (!ACTIVE.includes(b.status)) throw problem(409, "Already ended", `This run has already ended (${runStatus(b).word.toLowerCase()}).`);
    if (b.operation === FINDER_OPERATION) await this.finder.stop(actor, id);
    else if (b.operation === UPLOAD_OPERATION) await this.uploads.stop(actor, id);
    else await this.ai.cancel(actor, id);
    return this.view(id);
  }

  /** The runs going on now (newest first), for the top-bar chip. */
  async active() {
    const workspaceId = await this.ws.id();
    const bs = await this.db.aiBatch.findMany({ where: { workspaceId, status: { in: ACTIVE } }, orderBy: { startedAt: "desc" }, take: 5, select: { id: true } });
    return { runs: await Promise.all(bs.map(async (b) => { const v = await this.view(b.id); return { id: v.id, label: v.label, scope: v.scope, status: v.status, status_word: v.status_word, step: v.step, elapsed_ms: v.elapsed_ms, usual_ms: v.usual_ms, href: v.href }; })) };
  }
}

@Controller("api")
export class RunsController {
  constructor(@Inject(Runs) private readonly runs: Runs) {}
  @Get("runs") list(@Query("active") a?: string) { if (a !== "1") throw problem(400, "Check the request", "Ask for the runs going on now: ?active=1."); return this.runs.active(); }
  @Get("runs/:id") one(@Param("id") id: string) { return this.runs.view(id); }
  @Post("runs/:id/stop") stop(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { return this.runs.stop(actorOf(a), id); }
}
