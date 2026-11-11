// M1 (A19 (j), master plan 08-monitoring.md): GET /api/health, one answer to "is this copy well?", for the demo update
// (M4, .github/workflows/demo-update.yml) and anyone checking a copy. Four parts: the database answers, the disk has
// room, no form copy waits too long in the fill queue (api/src/fill-case.ts: one job at a time, in memory, its rows
// QUEUED or RUNNING in form_instance), and the code's git commit. 200 when every part is well; 503 naming each part
// that is not, in words. Open (no person header): a copy is checked before anyone is chosen, and the answer holds no
// case or person data. Never calls a model; US$0.
import { Controller, Get, Inject, Injectable, Res } from "@nestjs/common";
import { execFileSync } from "node:child_process";
import { existsSync, statfsSync } from "node:fs";
import { Db, OpenRead, STUDIO, VAR_ROOT } from "./core.ts";

/** The limits, each overridable by the copy's environment (whole numbers). */
export const HEALTH_LIMITS = {
  /** Below this many GB free, new copies, uploads and the database's own writes may fail. */
  minFreeGb: Number(process.env.HEALTH_MIN_FREE_GB ?? 2),
  /** A form copy queued or running longer than this many minutes is stuck (one fill takes seconds to a minute). */
  fillMaxAgeMin: Number(process.env.HEALTH_FILL_MAX_AGE_MIN ?? 15),
  /** The database ping waits this long before it counts as not answering. */
  dbTimeoutMs: Number(process.env.HEALTH_DB_TIMEOUT_MS ?? 2000),
};
export type HealthLimits = typeof HEALTH_LIMITS;

/** What the probes found; null where a probe could not run (the queue cannot be read while the database is down). */
export type HealthProbes = {
  database: { ok: true; ms: number } | { ok: false; error: string };
  freeBytes: number | null;
  fill: { waiting: number; oldestCreatedAt: Date | null } | null;
};
export type HealthPart = { ok: boolean | null; words: string } & Record<string, unknown>;
export type Health = {
  status: "ok" | "bad"; failing: string[];
  checks: { database: HealthPart; disk: HealthPart; fill_queue: HealthPart };
  sha: string; started_at: string; uptime_s: number; ms?: number;
};

const GB = 1024 ** 3;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The verdict from what the probes found: pure, so each rule has its own pass and fail test (tests/check_m1_health.ts). */
export function judgeHealth(p: HealthProbes, limits: HealthLimits, now: Date, sha: string, startedAt: Date): Health {
  const database: HealthPart = p.database.ok
    ? { ok: true, ms: p.database.ms, words: "The database answers." }
    : { ok: false, words: `The database does not answer: ${p.database.error}`.slice(0, 300) };
  const freeGb = p.freeBytes == null ? null : round1(p.freeBytes / GB);
  const disk: HealthPart = freeGb == null
    ? { ok: false, free_gb: null, min_gb: limits.minFreeGb, words: "The free disk space could not be read." }
    : freeGb < limits.minFreeGb
      ? { ok: false, free_gb: freeGb, min_gb: limits.minFreeGb, words: `Only ${freeGb} GB free on the disk; at least ${limits.minFreeGb} GB is needed.` }
      : { ok: true, free_gb: freeGb, min_gb: limits.minFreeGb, words: `${freeGb} GB free on the disk.` };
  let fill_queue: HealthPart;
  if (!p.fill) fill_queue = { ok: null, waiting: null, oldest_age_s: null, max_age_s: limits.fillMaxAgeMin * 60, words: "Not checked: the fill queue is read from the database." };
  else {
    const age = p.fill.oldestCreatedAt ? Math.max(0, Math.round((now.getTime() - p.fill.oldestCreatedAt.getTime()) / 1000)) : 0;
    const stuck = age > limits.fillMaxAgeMin * 60;
    fill_queue = {
      ok: !stuck, waiting: p.fill.waiting, oldest_age_s: p.fill.waiting ? age : null, max_age_s: limits.fillMaxAgeMin * 60,
      words: !p.fill.waiting ? "No form copy is waiting." : stuck
        ? `A form copy has waited ${Math.round(age / 60)} min in the fill queue; at most ${limits.fillMaxAgeMin} min is expected.`
        : `${p.fill.waiting} form ${p.fill.waiting === 1 ? "copy is" : "copies are"} being made; the oldest for ${age} s.`,
    };
  }
  const checks = { database, disk, fill_queue };
  const failing = (Object.keys(checks) as (keyof typeof checks)[]).filter((k) => checks[k].ok === false);
  return { status: failing.length ? "bad" : "ok", failing, checks, sha, started_at: startedAt.toISOString(), uptime_s: Math.round((now.getTime() - startedAt.getTime()) / 1000) };
}

/** The commit this copy runs, read once at start-up ("unknown" outside a git checkout). */
function gitSha(): string {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: STUDIO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim() || "unknown"; } catch { return "unknown"; }
}

const within = <T,>(ms: number, p: Promise<T>): Promise<T> => {
  let t: NodeJS.Timeout | undefined;
  return Promise.race([p, new Promise<never>((_, no) => { t = setTimeout(() => no(new Error(`no answer within ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
};

@Injectable()
export class HealthService {
  private readonly sha = gitSha();
  private readonly startedAt = new Date();
  constructor(@Inject(Db) private readonly db: Db) {}

  async check(limits: HealthLimits = HEALTH_LIMITS): Promise<Health> {
    const t0 = performance.now();
    let database: HealthProbes["database"];
    try { await within(limits.dbTimeoutMs, this.db.$queryRawUnsafe("select 1")); database = { ok: true, ms: Math.round(performance.now() - t0) }; }
    catch (e) { database = { ok: false, error: oneLine(e) }; }
    let fill: HealthProbes["fill"] = null;
    if (database.ok) {
      try {
        const where = { status: { in: ["QUEUED", "RUNNING"] } };
        const [waiting, oldest] = await within(limits.dbTimeoutMs, Promise.all([
          this.db.formInstance.count({ where }),
          this.db.formInstance.findFirst({ where, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
        ]));
        fill = { waiting, oldestCreatedAt: oldest?.createdAt ?? null };
      } catch { fill = null; }
    }
    let freeBytes: number | null = null;
    try { const s = statfsSync(existsSync(VAR_ROOT) ? VAR_ROOT : STUDIO); freeBytes = Number(s.bavail) * Number(s.bsize); } catch { freeBytes = null; }
    const h = judgeHealth({ database, freeBytes, fill }, limits, new Date(), this.sha, this.startedAt);
    return { ...h, ms: Math.round(performance.now() - t0) };
  }
}

/** A driver error's first line, without the connection string (it names the database user and host). */
function oneLine(e: unknown): string {
  const m = (e instanceof Error ? e.message : String(e)).split("\n").map((l) => l.trim()).filter(Boolean);
  return (m.find((l) => !/^invalid `?prisma/i.test(l) && !/^\s*→/.test(l)) ?? m[0] ?? "unknown error").replace(/postgres(ql)?:\/\/\S+/g, "<database>").slice(0, 240);
}

@Controller("api")
export class HealthController {
  constructor(@Inject(HealthService) private readonly h: HealthService) {}
  @OpenRead("is this copy well: the demo update and anyone checking a copy, before a person is chosen") @Get("health") async health(@Res({ passthrough: true }) res: { status: (code: number) => unknown; setHeader: (k: string, v: string) => unknown }) {
    const out = await this.h.check();
    res.setHeader("Cache-Control", "no-store");
    if (out.status !== "ok") res.status(503);
    return out;
  }
}
