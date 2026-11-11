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
import { HEALTH_LIMITS, judgeHealth, type Health, type HealthLimits, type HealthProbes } from "./health-verdict.ts";

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
