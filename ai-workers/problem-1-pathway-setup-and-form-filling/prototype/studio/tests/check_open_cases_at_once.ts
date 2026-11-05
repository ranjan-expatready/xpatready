// Opening cases at once (POST /api/runtime/cases; tech lead's ruling on #1116): several people opening cases together queue
// for a connection. The route's transaction waited Prisma's default 2 s, and past that answered a 500 (P2028, "Unable to start
// a transaction in the given time"), with nothing a person could act on. Now it waits as long as its neighbours do. Each
// part runs on a small connection pool, so the queue a slower machine has shows here too: 12 at once on 2 connections (1 to 7
// of 120 opens answered 500 before the fix, so this part alone can miss it), 24 at once on 5 (28 to 69 of 96). It restarts its own copy to set the pool. It checks the
// answer only, never the time. It does not claim every load is safe: 48 at once on 5 connections still answers 500. US$0.
//   zsh studio/tools/isolated.sh runtime_ocw 4484 start && tsx studio/tests/check_open_cases_at_once.ts 4484 xr_studio_runtime_ocw
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4484), DB = process.argv[3] ?? "xr_studio_runtime_ocw";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P";
const STUDIO = join(import.meta.dirname, ".."), run = Date.now().toString(36);

(async () => {
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0";
  if (!released()) {
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("setup: the Visitor visa released on this copy by setup_visitor_visa.ts", released());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const pool = async (n: number) => {
    execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart", `DATABASE_URL=postgresql://xr_studio@127.0.0.1:54329/${DB}?connection_limit=${n}`], { cwd: STUDIO, stdio: ["ignore", "ignore", "pipe"] });
    let up = false; for (let i = 0; i < 240 && !up; i++) { up = (await call("GET", "/session").catch(() => ({ status: 0 }))).status === 200; if (!up) await new Promise((res) => setTimeout(res, 500)); }
    if (!up) throw new Error("the copy did not come back after the restart");
  };
  const open = (reference: string) => call("POST", "/runtime/cases", { combinationId: vv, reference, clientActor: CLIENT, principal: { displayName: "Sample Client A" } }, OFFICER);
  const made = () => [Number(sql("select count(*) from pack_work_pin")), Number(sql("select count(*) from audit_event where action='opened' and entity='case'"))];
  const statuses = (rs: { status: number }[]) => rs.reduce<Record<number, number>>((t, x) => ({ ...t, [x.status]: (t[x.status] ?? 0) + 1 }), {});

  for (const { connections, atOnce, rounds } of [{ connections: 2, atOnce: 12, rounds: 10 }, { connections: 5, atOnce: 24, rounds: 4 }]) {
    await pool(connections);
    const before = made(), all: { status: number; body: any }[] = [];
    for (let round = 0; round < rounds; round++) all.push(...await Promise.all(Array.from({ length: atOnce }, (_, i) => open(`OCW-${connections}-${round}-${i}-${run}`))));
    const bad = all.find((r) => r.status !== 201);
    ok(`pass: ${atOnce} cases opened at once on ${connections} connections, ${rounds} rounds: every one answers 201`, !bad, { statuses: statuses(all), first_refusal: bad?.body });
    ok("pass: each answer is its own case, with its people", new Set(all.map((r) => r.body?.id)).size === all.length && all.every((r) => r.body?.people?.some((p: { role: string }) => p.role === "principal")));
    const after = made();
    ok("pass (data): one pin and one audit line per case, nothing half made", after[0] - before[0] === all.length && after[1] - before[1] === all.length, { cases: all.length, pins: after[0] - before[0], audit: after[1] - before[1] });
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
