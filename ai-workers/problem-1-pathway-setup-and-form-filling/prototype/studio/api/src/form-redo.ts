// C11.15 Redo with AI on one form, per stage (P-123: "Every form on a combination: Redo with AI (find, read, match) …
// each of the AI stages can be redone or stopped"). Forms lane.
//   POST /api/combinations/:id/forms/:code/redo {stage}                → the plan and its cost; nothing runs.
//   POST /api/combinations/:id/forms/:code/redo {stage, mode, planSha256[, idempotencyKey]} → starts that plan.
//   Stop: POST /api/runs/:id/stop (the shared run card's Stop, api/src/runs.ts).
// Every stage runs on the form finder (api/src/finder.ts) for this one form (`only`): it is the one engine that redoes an
// attached line (the field-map draft skips a form already on the combination, ai.ts). The stages differ in where it starts:
//  - find: the application page is found again (rules, or AI's pick), never the remembered one; then read, match, fetch;
//  - read, match: the remembered application page and guide are read again and both AI rounds decide again whether this
//    form applies (reading and matching are one pass of the finder today: said in the plan, Question for the tech lead).
// Money (P-192): the cost is the finder's own plan (replay and rules US$0); live starts only with the server's live switch
// open, through the guarded launcher and its ledger. A form a person removed is never attached back (finder.ts).
import { Body, Controller, Headers, HttpCode, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { RedoBody, normaliseCode, type RedoStage } from "../../contracts/form-library.ts";
import { START } from "../../contracts/start-setup.ts";
import { actorOf, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { Finder } from "./finder.ts";
import { aiLive } from "./sources.ts";

const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const WHAT: Record<RedoStage, string> = {
  find: "Find again: the application page is found again on canada.ca (not the one used before), read, and both AI rounds decide whether this form applies; its file is taken from the library or downloaded from canada.ca.",
  read: "Read again: the application page and guide used before are read again, and both AI rounds decide again whether this form applies (reading and matching are one pass of the finder today).",
  match: "Match again: both AI rounds decide again, on the application page and guide used before, whether this form applies and under what condition (reading and matching are one pass of the finder today).",
};

@Injectable()
export class FormRedo {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Finder) private readonly finder: Finder, @Inject(Audit) private readonly audit: Audit) {}

  async redo(actor: Actor, id: string, code: string, body: unknown) {
    need(actor, "author");
    // Break B1: one spelling of the combination's id, so the finder's one-run lock and keys see one combination.
    const combinationId = id.toLowerCase();
    // Break B6: a form number is short; anything else is refused without echoing it back.
    if (!/^[A-Z0-9][A-Z0-9 ]{1,30}$/i.test(code)) throw problem(400, "Check the request", "That is not a form number: a form number looks like IMM 5257.");
    const r = RedoBody.safeParse(body ?? {});
    if (!r.success) throw problem(400, "Check the request", r.error.issues[0]?.message ?? "Choose the stage to redo: find, read or match.");
    const b = r.data;
    await this.lineOf(combinationId, code);
    // With live off a plan is shown as saved answers (US$0); a live plan is shown when asked, but never starts (below).
    const mode = b.mode ?? (aiLive() ? "live" : "replay");
    const fresh = b.stage === "find";
    const plan = await this.finder.plan(combinationId, { mode, only: [code] }, { fresh });
    // Break B4: read and match reuse the page an earlier find used; with none, only Find can look for one.
    if (!fresh && !plan.page_url) throw problem(409, "No page from an earlier find", `This combination has no application page from an earlier find yet, so there is nothing to read or match again: choose Find for ${code}.`);
    // The fingerprint names the stage too: a plan seen for "read" never starts "find".
    const planSha256 = createHash("sha256").update(`${b.stage}|${code}|${plan.plan_sha256}`).digest("hex");
    const words = { stage: b.stage, code, what: WHAT[b.stage], mode, steps: plan.steps, totals: plan.totals, ledger: plan.ledger, live: plan.live, note: plan.note, cost_check: plan.cost_check, page_url: plan.page_url };
    if (!b.planSha256) return { ...words, planSha256, plan_sha256: planSha256 };
    if (b.mode === undefined) throw problem(400, "Check the request", "Say how to run it (live, replay or rules), as in the plan you looked at.");
    // Live AI starts only when the server's live switch is open (P-192): refused before anything is written.
    if (mode === "live" && !aiLive()) throw problem(409, "AI now is switched off", START.liveOff);
    if (b.planSha256 !== planSha256) throw problem(409, "Look at the plan again", "Something changed since you looked at the plan (the stage, the pages, the mode or the cost). Look at it again before starting.");
    // Break B2: a launch key already used by another run (another form, stage or find) is refused, never answered with it.
    let again: { planSha256: string } | null = null;
    if (b.idempotencyKey) {
      again = await this.db.aiBatch.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: await this.ws.id(), idempotencyKey: b.idempotencyKey } }, select: { planSha256: true } });
      if (again && again.planSha256 !== plan.plan_sha256) throw problem(409, "Key already used", "This launch key belongs to another run. Look at the plan again to start a new one.");
    }
    const run = await this.finder.launch(actor, combinationId, { mode, only: [code], planSha256: plan.plan_sha256, idempotencyKey: b.idempotencyKey ?? `redo:${b.stage}:${randomUUID()}` }, { fresh });
    // Break B5: the audit says which form and which stage (the finder's own line says the run started); a start sent
    // again with its key is the same run, logged once.
    if (!again) await this.audit.log(await this.ws.id(), actor.id, "redo", "form", code, `${actor.name} started Redo with AI (${b.stage}) for ${code} (${mode === "live" ? "live AI" : mode === "replay" ? "saved AI answers, US$0" : "rules only, US$0"})`, { stage: b.stage, run_id: run.id }, combinationId);
    return { ...words, planSha256, id: run.id, runId: run.id, status: run.status };
  }

  /** Refused unless the form is on this combination now: a removed one (409: add it back first), one never on it (404). */
  private async lineOf(combinationId: string, code: string) {
    const workspaceId = await this.ws.id();
    if (!/^[0-9a-f-]{36}$/i.test(combinationId) || !(await this.db.combination.count({ where: { id: combinationId, workspaceId } }))) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const line = await this.db.combinationForm.findFirst({ where: { workspaceId, combinationId, lineageKey: code }, orderBy: { version: "desc" }, select: { status: true } });
    if (!line) throw problem(404, "Not on this combination", `${code} is not on this combination: use Find again, or add it from the library.`);
    if (line.status === "RETIRED") throw problem(409, "Removed from this combination", `${code} was removed from this combination: add it back first, then redo it.`);
  }
}

type H = string | undefined;
@Controller("api")
export class FormRedoController {
  constructor(@Inject(FormRedo) private readonly r: FormRedo) {}
  @Post("combinations/:id/forms/:code/redo") @HttpCode(200) redo(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.r.redo(actorOf(a), id, code, b); }
}
