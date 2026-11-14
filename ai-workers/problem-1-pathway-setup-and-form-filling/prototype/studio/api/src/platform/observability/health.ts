// PF-23 (NFR5-14: "liveness/readiness health endpoints"): GET /api/health/live and GET /api/health/ready, for the
// container's checks in the cloud (PF-8's task definition) and anyone checking a copy. Open (no person header), never
// cached, no case or person data, never a model call (US$0).
//  * live: the process answers (200, always, while it runs).
//  * ready: the database answers within its ping limit and the job queue is well; 503 naming each part that is not,
//    in words. The job queue is PF-14's: it provides JOB_QUEUE_PROBE; until it does, ready names the queue as "not on
//    this copy yet" and does not count it (ok: null).
// M1's GET /api/health (api/src/health.ts: database, disk, fill queue, commit) stays as it is.
import { Controller, Get, Inject, Injectable, Optional, Res } from "@nestjs/common";
import { Db, OpenRead } from "../../core.ts";
import { HEALTH_LIMITS, within } from "../../health-verdict.ts";
import { log } from "./log.ts";

export const JOB_QUEUE_PROBE = "PF23_JOB_QUEUE_PROBE";
export type JobQueueProbe = { ready(): Promise<{ ok: boolean; words: string }> };
export type Part = { ok: boolean | null; words: string; ms?: number };
export type Ready = { status: "ok" | "bad"; failing: string[]; checks: { database: Part; job_queue: Part } };

/** The words an open route gives: what is wrong and what to do, never the driver's detail (it names the database's
 *  address: review m12). The detail goes to the server's log, redacted. */
const notAnswering = (part: string, e: unknown) => { log().write("warn", "ready_part_down", { part, error: e }); return `The ${part} does not answer${/no answer within/.test(e instanceof Error ? e.message : "") ? " in time" : ""}.`; };

// Decorators are applied by hand below: api/tsconfig.json's experimentalDecorators reaches src/*.ts and src/features/
// only, and this folder is outside both (as PF-4's identity module does).
export class Readiness {
  constructor(private readonly db: Db, private readonly jobs?: JobQueueProbe) {}

  async ready(dbTimeoutMs = HEALTH_LIMITS.dbTimeoutMs): Promise<Ready> {
    const t0 = performance.now();
    let database: Part;
    try { await within(dbTimeoutMs, this.db.$queryRawUnsafe("select 1")); database = { ok: true, words: "The database answers.", ms: Math.round(performance.now() - t0) }; }
    catch (e) { database = { ok: false, words: `${notAnswering("database", e)} Start it (start.sh) or check its connection setting.` }; }
    let job_queue: Part;
    if (!this.jobs) job_queue = { ok: null, words: "No job queue on this copy yet (PF-14 adds it); not counted." };
    else {
      try { const j = await within(dbTimeoutMs, this.jobs.ready()); job_queue = { ok: j.ok, words: j.words }; }
      catch (e) { job_queue = { ok: false, words: notAnswering("job queue", e) }; }
    }
    const failing = (["database", "job_queue"] as const).filter((k) => ({ database, job_queue })[k].ok === false);
    return { status: failing.length ? "bad" : "ok", failing, checks: { database, job_queue } };
  }
}

type HttpRes = { status(code: number): unknown; setHeader(name: string, value: string): unknown };
const started = Date.now();

export class LiveReadyController {
  constructor(private readonly r: Readiness) {}
  live(res: HttpRes) { res.setHeader("Cache-Control", "no-store"); return { status: "ok", uptime_s: Math.round((Date.now() - started) / 1000) }; }
  async ready(res: HttpRes) {
    res.setHeader("Cache-Control", "no-store");
    const r = await this.r.ready();
    res.status(r.status === "ok" ? 200 : 503);
    return r;
  }
}

Injectable()(Readiness);
Inject(Db)(Readiness, undefined, 0);
Optional()(Readiness, undefined, 1);
Inject(JOB_QUEUE_PROBE)(Readiness, undefined, 1);
Controller("api/health")(LiveReadyController);
Inject(Readiness)(LiveReadyController, undefined, 0);
for (const [method, path, why] of [["live", "live", "the container's liveness check; no person, no data"], ["ready", "ready", "the container's readiness check; no person, no data"]] as const) {
  const proto = LiveReadyController.prototype, d = Object.getOwnPropertyDescriptor(proto, method)!;
  Res({ passthrough: true })(proto, method, 0);
  for (const dec of [OpenRead(why), Get(path)]) dec(proto, method, d);
}
