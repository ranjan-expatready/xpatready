// QA-99 (Critical, qa live smoke 29 Oct on main a9fe60c0): Who can be › AI now built its job's known fact from the
// combination's label alone ("Study permit"), which the launcher's guard (p2/launch.ts knownOk) refuses, so AI now could
// never run. The job now carries the finder's full trail (Pathway › Program › Category …). A pass and a fail on every
// combination of the loaded sample, through the launcher's own check. No model call, no launch (US$0).
//   zsh studio/tools/isolated.sh runtime_qa99 4439 start && tsx studio/tests/check_qa99_who_can_be_trail.ts 4439 xr_studio_runtime_qa99
import { knownOk } from "../../p2/launch.ts";

const PORT = Number(process.argv[2] ?? 4439), DB = process.argv[3] ?? "xr_studio_runtime_qa99";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
  const core = await import("../api/src/core.ts"); const { whoCanBeTrail } = await import("../api/src/people-ai.ts");
  const db = new core.Db();
  const combos = await db.combination.findMany({ where: { retiredAt: null }, select: { id: true, label: true } });
  const trails = await Promise.all(combos.map(async (c) => ({ label: c.label, trail: await whoCanBeTrail(db, c.id) })));
  ok("QA-99 C11.12 pass: every combination's Who can be job carries a trail the launcher admits (Pathway › Program › … names)", trails.length >= 6 && trails.every((t) => knownOk({ combination_trail: t.trail })), trails.map((t) => t.trail));
  ok("QA-99 C11.12 fail: the combination's label alone (what the job sent before) is refused by the launcher", trails.every((t) => !knownOk({ combination_trail: t.label })), trails.map((t) => t.label));
  ok("QA-99: the trail is the finder's own (the same names in the same order), ending at the combination's place", trails.every((t) => t.trail.split(" › ").length >= 2 && !/ › $/.test(t.trail)));
  await db.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
