// Opening cases at once (POST /api/runtime/cases; tech lead's ruling on #1116): when the connections are all busy, opening a
// case waits for one. The route's transaction waited Prisma's default 2 s, and past that answered a 500 (P2028, "Unable to
// start a transaction in the given time"), with nothing a person could act on. Now it waits as long as its neighbours do.
// So the check does not depend on how fast the machine is, it makes the wait itself: from its own session it holds a lock
// that stops new cases being written, until the connections really are all stuck on it (the pool holds 10; PrismaPg ignores a
// connection_limit in the URL), then 4 s more. That is past the old 2 s every time and far below the new 10 s. It says
// nothing about load in general: with no lock, 48 at once on the Mac still answers 500 (the PR's out-of-scope list). US$0.
//   zsh studio/tools/isolated.sh runtime_ocw 4484 start && tsx studio/tests/check_open_cases_at_once.ts 4484 xr_studio_runtime_ocw
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4484), DB = process.argv[3] ?? "xr_studio_runtime_ocw";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", POOL = 10, HOLD_MS = 4000;
const STUDIO = join(import.meta.dirname, ".."), run = Date.now().toString(36);

(async () => {
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0";
  if (!released()) {
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("setup: the Visitor visa released on this copy by setup_visitor_visa.ts", released());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const open = (reference: string) => call("POST", "/runtime/cases", { combinationId: vv, reference, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER);
  const made = () => [Number(sql("select count(*) from pack_work_pin")), Number(sql("select count(*) from audit_event where action='opened' and entity='case'"))];
  const statuses = (rs: { status: number }[]) => rs.reduce<Record<number, number>>((t, x) => ({ ...t, [x.status]: (t[x.status] ?? 0) + 1 }), {});
  const stuck = () => Number(sql("select count(*) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'"));

  for (const atOnce of [12, 16]) {
    const before = made();
    // SHARE stops the writes of a new case and lets the reads before them through; the connection it holds is the check's own.
    const holder = spawn("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-X", "-q"], { stdio: ["pipe", "ignore", "inherit"] });
    holder.stdin.write("begin; lock table party in share mode; select pg_advisory_lock(hashtext('check_open_cases_at_once'));\n");
    const locked = await until(async () => sql("select count(*) from pg_locks where locktype = 'advisory' and granted") !== "0", 15_000);
    const answers = Promise.all(Array.from({ length: atOnce }, (_, i) => open(`OCW-${atOnce}-${i}-${run}`)));
    const full = await until(async () => stuck() >= POOL, 60_000);
    ok(`setup: ${atOnce} at once, every connection is stuck waiting`, locked && full, { locked, stuck: stuck() });
    await new Promise((res) => setTimeout(res, HOLD_MS));
    holder.stdin.end("commit;\n");
    const all = await answers;
    const bad = all.find((r) => r.status !== 201);
    ok(`pass: ${atOnce} cases opened at once with the connections busy for ${HOLD_MS / 1000} s: every one answers 201`, !bad, { statuses: statuses(all), first_refusal: bad?.body });
    ok("pass: each answer is its own case, with its people", new Set(all.map((r) => r.body?.id)).size === all.length && all.every((r) => r.body?.people?.some((p: { role: string }) => p.role === "principal")));
    const after = made();
    ok("pass (data): one pin and one audit line per case, nothing half made", after[0] - before[0] === all.length && after[1] - before[1] === all.length, { cases: all.length, pins: after[0] - before[0], audit: after[1] - before[1] });
    await until(async () => stuck() === 0, 15_000);
  }

  // Waiting longer never lets a second case through under one reference.
  const before = made();
  const same = await Promise.all(Array.from({ length: 12 }, () => open(`OCW-SAME-${run}`)));
  const refused = same.filter((r) => r.status !== 201);
  ok("fail: 12 at once under one reference: one case is made, the other 11 are refused (409) in words", same.length - refused.length === 1 && refused.every((r) => r.status === 409 && /already exists/.test(String(r.body?.detail))), { statuses: statuses(same), first_refusal: refused[0]?.body });
  const after = made();
  ok("fail (data): the refused ones leave nothing behind", after[0] - before[0] === 1 && after[1] - before[1] === 1, { pins: after[0] - before[0], audit: after[1] - before[1] });
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
