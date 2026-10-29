// S3 Start setup (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct). The one way to begin a
// combination's setup, from Immigration programs or Program structure:
//  - POST /combinations/start creates the combination of a last-level name (idempotent; refused with the one guard's words
//    under a retired name or a waiting change, M3) and, when a saved AI answer exists for its trail, replays the form finder
//    at US$0 (M1: a saved result is loaded by itself);
//  - GET /combinations/:id/start-setup is what the landing ("Sources and forms") shows above the forms list (runtime's slice
//    3 owns that list, M4): the finder's newest run, or the one offer to find the forms. Live AI starts only on the person's
//    click (founder, 28 Oct: wait for a click), with the worst case shown first; rules only is the fallback when AI can't run.
// The finder itself (plan, fingerprint, launch, cap, Stop) is the forms lane's (api/src/finder.ts); this file only calls it.
import { Body, Controller, Get, Headers, Inject, Injectable, Param, Post, Res } from "@nestjs/common";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { START, StartSetupBody, type FinderOffer, type StartSetupResult } from "../../contracts/start-setup.ts";
import { actorOf, Db, need, PROTOTYPE, STUDIO, Workspace, type Actor } from "./core.ts";
import { Finder } from "./finder.ts";
import { parse, Programs } from "./programs.ts";

type H = string | undefined;
const RUNS = join(PROTOTYPE, "p2", "runs");
const ACTIVE = ["QUEUED", "RUNNING"];

/** Whether a saved live answer of the form finder was made for this combination, by the finder's own rule (finder.ts
 *  runKey: the key the run records, or the saved-runs list for runs made before keys were recorded). A replay may still
 *  stop when the pages differ; its run card then says so and the offer shows again. */
function savedFor(combinationKey: string): boolean {
  if (!existsSync(RUNS)) return false;
  let legacy: Record<string, string> = {};
  try { legacy = JSON.parse(readFileSync(join(STUDIO, "samples", "finder-saved-runs.json"), "utf8")).runs ?? {}; } catch { /* none */ }
  return readdirSync(RUNS).filter((f) => f.startsWith("studio-finder-forms-") && !f.startsWith("studio-finder-forms-check-") && /-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/.test(f)).some((f) => {
    try { const c = JSON.parse(readFileSync(join(RUNS, f), "utf8"))?.drafting_run?.inputs?.combination; return (c && !String(c).includes(" › ") ? c : legacy[f]) === combinationKey; } catch { return false; }
  });
}

@Injectable()
export class StartSetup {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Programs) private readonly programs: Programs, @Inject(Finder) private readonly finder: Finder) {}

  async start(actor: Actor, body: unknown): Promise<StartSetupResult> {
    need(actor, "author");
    const b = parse(StartSetupBody, body);
    const r = await this.programs.createCombination(actor, { nodeKey: b.nodeKey });
    const id = r.combination.id;
    if (!r.created) return { created: false, combination: { id, label: r.combination.label }, run: (await this.finder.latest(id))?.id ?? null, saved: false };
    // A saved answer made for this combination: replay it now, free (M1). Otherwise nothing runs until the click.
    if (!savedFor(r.combination.combinationKey)) return { created: true, combination: { id, label: r.combination.label }, run: null, saved: false };
    const replay = await this.finder.plan(id, { mode: "replay" });
    const run = await this.finder.launch(actor, id, { mode: "replay", planSha256: replay.plan_sha256, idempotencyKey: `start-setup:${id}` });
    return { created: true, combination: { id, label: r.combination.label }, run: run.id, saved: true };
  }

  async offer(combinationId: string): Promise<FinderOffer> {
    const workspaceId = await this.ws.id();
    const last = await this.finder.latest(combinationId);
    const forms = await this.db.combinationForm.count({ where: { workspaceId, combinationId } });
    const ended = !!last && !ACTIVE.includes(last.status) && forms === 0;
    if (last && !ended) return { run: last.id, ended: false, offer: null };
    if (forms) return { run: last?.id ?? null, ended: false, offer: null }; // forms came another way (by hand, Load sample)
    const live = await this.finder.plan(combinationId, { mode: "live" });
    const worst = live.totals.worst_usd, left = live.ledger.remaining_usd;
    if (worst <= left + 1e-9) {
      // The plan's "about" (finder-cost.ts): the same rule as the run card, so button, tip and card say one cost.
      const about = live.totals.about_usd;
      return { run: last?.id ?? null, ended, offer: { mode: "live", planSha256: live.plan_sha256, label: START.findLive(about, worst), tip: START.findLiveTip(about, worst), why: null } };
    }
    const rules = await this.finder.plan(combinationId, { mode: "rules" });
    return { run: last?.id ?? null, ended, offer: { mode: "rules", planSha256: rules.plan_sha256, label: START.rulesOnly, tip: START.rulesTip, why: START.overCap(worst, left) } };
  }
}

@Controller("api")
export class StartSetupController {
  constructor(@Inject(StartSetup) private readonly s: StartSetup) {}
  @Post("combinations/start") start(@Headers("x-actor") a: H, @Body() b: unknown, @Res({ passthrough: true }) res: { status: (n: number) => void }) { return this.s.start(actorOf(a), b).then((r) => { res.status(r.created ? 201 : 200); return r; }); }
  @Get("combinations/:id/start-setup") offer(@Param("id") id: string) { return this.s.offer(id); }
}
