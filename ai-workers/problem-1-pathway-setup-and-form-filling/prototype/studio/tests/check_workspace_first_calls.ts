// The workspace's first calls at once (the C3.13 browser check's red setup: nightly 41381724752, #493's CI 41419363380).
// On an empty database the page's first calls and the sample load each created the workspace; the ones that lost the race
// answered 409 "Already in progress or already exists" (a duplicate, P2002), and when the load lost, its setup failed.
// Each round starts a fresh copy and sends the load with 24 first calls at the same moment: every call answers, the load
// with 201, nothing with 409 or 500, and there is one workspace. No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_wsfirst 4466 start && tsx studio/tests/check_workspace_first_calls.ts 4466 xr_studio_runtime_wsfirst
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.argv[2] ?? 4466), DB = process.argv[3] ?? "xr_studio_runtime_wsfirst", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), ".."), BASE = `http://localhost:${PORT}/api`;
const H = { "x-actor": "user-A", "content-type": "application/json" };
let pass = 0, fail = 0;
const ok = (name: string, good: boolean, detail?: unknown) => { good ? pass++ : fail++; console.log(`${good ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-tAc", q], { encoding: "utf8" }).trim();
const fresh = () => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "start"], { encoding: "utf8", cwd: join(STUDIO, ".."), stdio: "pipe" });
const FIRST = ["/demo/status", "/session", "/library/sections", "/library/fields", "/catalogue", "/structure"];

const ROUNDS = 3;
for (let round = 1; round <= ROUNDS; round++) {
  if (round > 1) fresh(); // the copy the usage line started is round 1's
  const gets = FIRST.flatMap((p) => Array(4).fill(p) as string[]);
  const all = await Promise.all([fetch(`${BASE}/demo/load`, { method: "POST", headers: H }), ...gets.map((p) => fetch(BASE + p, { headers: H }))]);
  const said = await Promise.all(all.map(async (r, i) => ({ call: i === 0 ? "POST /demo/load" : `GET ${gets[i - 1]}`, status: r.status, detail: r.status >= 400 ? ((await r.json().catch(() => null)) as { detail?: string } | null)?.detail : undefined })));
  const refused = said.filter((x) => x.status === 409 || x.status >= 500);
  ok(`round ${round} pass: on an empty database the sample load and 24 first calls at once all answer; none 409 "Already in progress or already exists" or 500`, refused.length === 0, refused);
  ok(`round ${round} pass: the sample load answers 201`, said[0].status === 201, said[0]);
  ok(`round ${round} fail-guard: one workspace and its six starting person roles, never two`, sql("select count(*) from workspace") === "1" && sql("select count(*) from person_role where built_in") === "6", { workspaces: sql("select count(*) from workspace"), roles: sql("select count(*) from person_role where built_in") });
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
