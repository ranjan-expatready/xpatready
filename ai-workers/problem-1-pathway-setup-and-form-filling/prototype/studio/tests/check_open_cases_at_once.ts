// Opening cases at once (POST /api/runtime/cases; tech lead's ruling on #1116): when the connections are all busy, opening a
// case waits for one. The route's transaction took Prisma's defaults, 2 s to get a connection and 5 s to finish, lock waits
// included, and past either it answered a 500 (P2028), with nothing a person could act on. Now it takes what its neighbours
// do. So the check rests less on the machine's speed, it makes the wait itself: from its own session it holds a lock that
// stops new cases being written, until the connections are all stuck on it (the pool holds 10; PrismaPg ignores a
// connection_limit in the URL), then 4 s more, or until the oldest has waited 12 s, whichever is first: past the old limits
// and inside the new 10 s and 15 s. A much slower machine could still pass those; about 3 times the Mac is an estimate, not
// measured. It says nothing about load in general: with no lock, 48 at once on the Mac still answers 500 (the PR's
// out-of-scope list). US$0.
//   zsh studio/tools/isolated.sh runtime_ocw 4484 start && tsx studio/tests/check_open_cases_at_once.ts 4484 xr_studio_runtime_ocw
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4484), DB = process.argv[3] ?? "xr_studio_runtime_ocw";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P", POOL = 10, HOLD_MS = 4000, OLDEST_S = 12;
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
  const oldest = () => Number(sql("select coalesce(extract(epoch from now() - min(xact_start)), 0) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'"));
  await open(`OCW-WARM-${run}`); // the first open of a server costs more than the rest; they arrive closer together after it

  for (const atOnce of [12, 16]) {
    const before = made();
    // SHARE stops the writes of a new case and lets the reads before them through; the connection it holds is the check's own.
    const holder = spawn("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-X", "-q"], { stdio: ["pipe", "ignore", "inherit"] });
    holder.stdin.write("begin; lock table party in share mode;\n");
    const locked = await until(async () => sql("select count(*) from pg_locks where relation = 'party'::regclass and mode = 'ShareLock' and granted and database = (select oid from pg_database where datname = current_database())") !== "0", 15_000);
    const answers = Promise.all(Array.from({ length: atOnce }, (_, i) => open(`OCW-${atOnce}-${i}-${run}`)));
    let fullAt = 0, age = 0;
    await until(async () => { age = oldest(); if (!fullAt && stuck() >= POOL) fullAt = Date.now(); return (!!fullAt && Date.now() - fullAt >= HOLD_MS) || age >= OLDEST_S; }, 60_000);
    ok(`setup: ${atOnce} at once, the writes are held by the lock`, locked && age > 0, { every_connection_stuck: !!fullAt, oldest_waited_s: Math.round(age * 10) / 10 });
    if (!fullAt) console.log(`NOTE  ${atOnce} at once: the oldest reached ${OLDEST_S} s before every connection was stuck (a slow machine), so this part tests less here`);
    holder.stdin.end("commit;\n");
    const all = await answers;
    const bad = all.find((r) => r.status !== 201);
    ok(`pass: ${atOnce} cases opened at once with the connections busy: every one answers 201`, !bad, { statuses: statuses(all), first_refusal: bad?.body });
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
