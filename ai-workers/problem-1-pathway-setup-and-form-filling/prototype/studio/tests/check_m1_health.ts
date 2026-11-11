// M1 (A19 (j), master plan 08-monitoring.md): GET /api/health says whether a copy is well, and answers 503 naming the
// part that is not. Part 1, no server: each rule of the verdict (api/src/health-verdict.ts judgeHealth) with a pass and a fail.
// Part 2, an isolated copy: healthy → 200 with every part named and the commit; its database made unreachable (new
// connections to this copy's database refused and its open ones ended; every other database untouched) → 503 naming
// "database"; the database back → 200 again. Open: no person header needed. US$0, no model call.
//   zsh studio/tools/isolated.sh m1health 4434 start && tsx studio/tests/check_m1_health.ts 4434 xr_studio_m1health
import { execFileSync } from "node:child_process";
import { judgeHealth, limitOf, within, type HealthProbes } from "../api/src/health-verdict.ts";
import { recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_m1health";
const { ok, summary } = recorder();
const GB = 1024 ** 3, LIMITS = { minFreeGb: 2, fillMaxAgeMin: 15, dbTimeoutMs: 2000 };
const now = new Date("2026-11-11T10:00:00Z"), started = new Date("2026-11-11T09:00:00Z");
const well: HealthProbes = { database: { ok: true, ms: 3 }, freeBytes: 50 * GB, fill: { waiting: 0, oldestCreatedAt: null } };
const judge = (p: Partial<HealthProbes>) => judgeHealth({ ...well, ...p }, LIMITS, now, "abc123", started);

// ---- Part 1: the verdict, rule by rule
{
  const h = judge({});
  ok("M1 pass: every part well → ok, nothing failing, commit and uptime given", h.status === "ok" && !h.failing.length && h.sha === "abc123" && h.uptime_s === 3600, h);
  const d = judge({ database: { ok: false, error: "connect ECONNREFUSED" } });
  ok("M1 fail (database): the database does not answer → bad, failing names database, in words", d.status === "bad" && d.failing.join() === "database" && /does not answer: connect ECONNREFUSED/.test(d.checks.database.words), d);
  ok("M1 (database down): the fill queue is not checked (null), never counted as a second failure", d.checks.fill_queue.ok === null, d.checks.fill_queue);
  const low = judge({ freeBytes: 1.5 * GB });
  ok("M1 fail (disk): 1.5 GB free under the 2 GB limit → bad, failing names disk, with the numbers", low.status === "bad" && low.failing.join() === "disk" && low.checks.disk.free_gb === 1.5 && /Only 1.5 GB free/.test(low.checks.disk.words), low.checks.disk);
  ok("M1 pass (disk): exactly the limit free → well", judge({ freeBytes: 2 * GB }).status === "ok");
  ok("M1 fail (disk): free space unreadable → bad (never assumed well)", judge({ freeBytes: null }).failing.join() === "disk");
  const stuck = judge({ fill: { waiting: 2, oldestCreatedAt: new Date(now.getTime() - 16 * 60_000) } });
  ok("M1 fail (fill queue): the oldest copy waiting 16 min, over the 15 min limit → bad, failing names fill_queue", stuck.status === "bad" && stuck.failing.join() === "fill_queue" && stuck.checks.fill_queue.oldest_age_s === 960 && /waited 16 min/.test(stuck.checks.fill_queue.words), stuck.checks.fill_queue);
  const busy = judge({ fill: { waiting: 1, oldestCreatedAt: new Date(now.getTime() - 40_000) } });
  ok("M1 pass (fill queue): one copy being made for 40 s → well, with its count and age", busy.status === "ok" && busy.checks.fill_queue.waiting === 1 && busy.checks.fill_queue.oldest_age_s === 40, busy.checks.fill_queue);
  const two = judge({ database: { ok: false, error: "x" }, freeBytes: 0 });
  ok("M1 fail: two parts bad → both named, in a fixed order", two.failing.join() === "database,disk", two.failing);
  // Review m7: a database that hangs (a lock, a server that keeps the socket) is refused within the ping limit.
  const t = Date.now(), hung = await within(300, new Promise<never>(() => {})).then(() => "answered", (e: Error) => e.message);
  ok("M1 fail (database hangs): a ping that never answers is refused at the limit, in words, never waited on", hung === "no answer within 300 ms" && Date.now() - t < 1500, { hung, ms: Date.now() - t });
  ok("M1 pass: a ping that answers within the limit passes through", await within(300, Promise.resolve(7)) === 7);
  // Review m9: a limit that is not a positive number falls back to its default (NaN would make a part that cannot fail).
  ok("M1 (limits): a set number is used; \"abc\", \"\", 0, -1 and unset fall back to the default", limitOf("5", 2) === 5 && limitOf("2.5", 2) === 2.5 && ["abc", "", " ", "0", "-1", undefined].every((r) => limitOf(r, 2) === 2));
}

// ---- Part 2: a live copy
const psql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", ["postgresql://xr_studio@127.0.0.1:54329/postgres", "-XAtc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const health = async () => {
  const t = performance.now();
  try { const r = await fetch(`http://127.0.0.1:${PORT}/api/health`); return { status: r.status, body: await r.json().catch(() => null), ms: Math.round(performance.now() - t), cache: r.headers.get("cache-control") }; }
  catch (e) { return { status: 0, body: { error: (e as Error).message }, ms: 0, cache: null }; }
};
let cut = false;
try {
  await health(); // the first call warms the route (module load); the second is the one timed
  const a = await health();
  ok("M1 pass (live): a healthy copy answers 200, status ok, with no person header", a.status === 200 && a.body?.status === "ok", a);
  ok("M1 (live): the answer names database, disk and fill_queue, the commit (40 hex) and is never cached", ["database", "disk", "fill_queue"].every((k) => a.body?.checks?.[k]) && /^[0-9a-f]{40}$/.test(a.body?.sha ?? "") && a.cache === "no-store", { sha: a.body?.sha, cache: a.cache });
  // The plan's bar is <100 ms on the Mac (measured 10 ms here); 500 ms leaves room for a busy CI machine so a slow runner
  // never fails a check that is about whether the copy is well (review m8: kept, with this reason).
  ok("M1 (live): a healthy answer within 500 ms (plan: <100 ms on the Mac; measured in the NOTE below)", a.ms < 500, a.ms);
  console.log(`NOTE  healthy answer in ${a.ms} ms; disk ${a.body?.checks?.disk?.free_gb} GB free`);
  // The database made unreachable for this copy only: no new connection, and the pool's open ones ended.
  psql(`alter database "${DB}" with allow_connections false`); cut = true;
  psql(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DB}' and pid <> pg_backend_pid()`);
  const b = await health();
  ok("M1 fail (live): database unreachable → 503, status bad, failing names database", b.status === 503 && b.body?.status === "bad" && (b.body?.failing ?? []).includes("database"), b);
  ok("M1 (live): the words say what is wrong and never show the connection string", /does not answer/.test(b.body?.checks?.database?.words ?? "") && !/postgres(ql)?:\/\//.test(JSON.stringify(b.body)), b.body?.checks?.database);
  ok("M1 (live): a down database still answers within 5 s (the 2 s ping limit), never hangs the check", b.ms < 5000, b.ms);
  psql(`alter database "${DB}" with allow_connections true`); cut = false;
  let c = await health();
  for (let i = 0; i < 20 && c.status !== 200; i++) { await new Promise((r) => setTimeout(r, 500)); c = await health(); }
  ok("M1 pass (live): the database back → 200 again, without a restart", c.status === 200 && c.body?.status === "ok", c);
} catch (e) { ok(`M1: the live part ran to its end (crashed: ${(e as Error).message})`, false); }
finally { if (cut) { try { psql(`alter database "${DB}" with allow_connections true`); } catch { /* stop drops it anyway */ } } }
process.exitCode = summary() ? 1 : 0;
