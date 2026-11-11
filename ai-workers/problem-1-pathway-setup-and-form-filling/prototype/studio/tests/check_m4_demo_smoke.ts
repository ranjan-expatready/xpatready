// M4 (A19 (j), master plan 08-monitoring.md): the smoke walk the demo update runs after every merge
// (tools/demo-smoke.mjs, .github/workflows/demo-update.yml). On an isolated copy with the finished story loaded (the
// demo's story, C10.2): the walk passes, every screen named, within 3 minutes; then, with one journey screen broken on
// purpose, it fails and names that screen. The breaks are made by a small proxy in front of the copy, so the walk and the
// app are the ones that ship: (1) the case page's own read answers a case with no body (the page crashes) → "Case page";
// (2) the forms read answers 500 (Prepare application shows its error) → "Forms", the case page itself still passing;
// (3) the web app's script is missing (every page blank) → the first screen, "Immigration programs"; (4) the database
// down → "Health". No button is pressed, live AI is off; US$0, no model call.
//   zsh studio/tools/isolated.sh m4smoke 4433 start && tsx studio/tests/check_m4_demo_smoke.ts 4433 xr_studio_m4smoke
import { spawn, spawnSync } from "node:child_process";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_m4smoke";
const STUDIO = join(import.meta.dirname, ".."), SMOKE = join(STUDIO, "tools", "demo-smoke.mjs");
const { call, until, sql } = client(PORT, DB);
const { ok, summary } = recorder();

type Break = "none" | "case" | "forms" | "bundle";
let mode: Break = "none";
/** A proxy to the copy that breaks one thing on purpose (the mode). */
function proxy(): Promise<Server> {
  const s = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0], q = (req.url ?? "").split("?")[1] ?? "";
    if (mode === "case" && req.method === "GET" && /^\/api\/runtime\/cases\/[^/]+\/questionnaire$/.test(path) && /mode=agent/.test(q)) {
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ case: null })); return;
    }
    if (mode === "forms" && req.method === "GET" && /^\/api\/runtime\/cases\/[^/]+\/forms$/.test(path)) {
      res.writeHead(500, { "content-type": "application/problem+json" }); res.end(JSON.stringify({ title: "Internal server error", status: 500, detail: "broken on purpose (M4 test)" })); return;
    }
    if (mode === "bundle" && /\.js$/.test(path) && !path.startsWith("/api/")) { res.writeHead(404); res.end(); return; }
    const up = request({ host: "127.0.0.1", port: PORT, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${PORT}` } }, (r) => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res); });
    up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  });
  return new Promise((ok) => s.listen(0, "127.0.0.1", () => ok(s)));
}
/** Runs the walk as the demo update does, in its own process (asynchronously: the proxy lives in this one). */
const smoke = (port: number): Promise<{ code: number | null; out: string; s: number }> => new Promise((done) => {
  const t = Date.now();
  let out = "";
  const ch = spawn(process.execPath, [SMOKE, "--base", `http://127.0.0.1:${port}`, "--timeout-ms", "15000"], { env: { ...process.env, GITHUB_STEP_SUMMARY: "" } });
  const kill = setTimeout(() => ch.kill("SIGKILL"), 300_000);
  ch.stdout.on("data", (d) => { out += d; }); ch.stderr.on("data", (d) => { out += d; });
  ch.on("close", (code) => { clearTimeout(kill); done({ code, out, s: Math.round((Date.now() - t) / 1000) }); });
});
const tail = (o: string) => o.trim().split("\n").slice(-4).join(" | ");

let server: Server | null = null;
try {
  // Set-up: the finished story, as on the demo (Demo › Load the finished story; the story empties the copy first).
  const r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, "user-A");
  const loaded = r.status === 202 && await until(async () => { const b = (await call("GET", "/demo/status", undefined, "user-A")).body; return b?.story?.state === "done" || b?.story?.state === "failed"; }, 900_000);
  const story = (await call("GET", "/demo/status", undefined, "user-A")).body?.story;
  ok("M4 set-up: the finished story is loaded on the copy", loaded && story?.state === "done" && !!sql(`select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'`), { status: r.status, state: story?.state, error: story?.error });

  const a = await smoke(PORT);
  console.log(a.out.trim().split("\n").map((l) => `      ${l}`).join("\n"));
  ok("M4 pass: on main's finished story the walk passes (exit 0)", a.code === 0 && /SMOKE PASS/.test(a.out), tail(a.out));
  ok("M4 pass: it walked every screen of the journey by role (health, programs, cases, the story's case, its forms, the client's questionnaire)",
    ["PASS  Health", "PASS  Immigration programs", "PASS  Cases (/cases)", "PASS  Case page", "PASS  Forms (Prepare application on SAMPLE-VV-FAMILY-1)", "PASS  Client questionnaire"].every((x) => a.out.includes(x)), tail(a.out));
  ok("M4: the walk adds under 3 minutes to the demo update", a.s < 180, `${a.s} s`);
  ok("M4: the walk's pages wrote nothing (read-only)", !/write\(s\)/.test(a.out), a.out.match(/NOTE  the pages made.*/)?.[0]);

  server = await proxy();
  const via = (server.address() as AddressInfo).port;
  mode = "none";
  const p = await smoke(via);
  ok("M4 (the proxy itself breaks nothing): through the proxy with no break, the walk passes", p.code === 0, tail(p.out));

  mode = "case";
  const c = await smoke(via);
  ok("M4 fail (case page broken on purpose): the walk fails (exit 1) and names the Case page", c.code === 1 && /SMOKE FAIL: broke at Case page \(\/cases\/[^ ]+, SAMPLE-VV-FAMILY-1\)/.test(c.out), tail(c.out));
  ok("M4 (case page): the screens before it are said to work", /PASS  Cases \(\/cases\)/.test(c.out) && !/PASS  Case page/.test(c.out), tail(c.out));

  mode = "forms";
  const f = await smoke(via);
  ok("M4 fail (forms broken on purpose): the walk fails and names Forms, with the server error, the case page itself passing",
    f.code === 1 && /SMOKE FAIL: broke at Forms \(Prepare application on SAMPLE-VV-FAMILY-1\)/.test(f.out) && /PASS  Case page/.test(f.out) && /forms answered 500/.test(f.out), tail(f.out));

  mode = "bundle";
  const b = await smoke(via);
  ok("M4 fail (the web app's script missing): the walk fails at the first screen, Immigration programs", b.code === 1 && /SMOKE FAIL: broke at Immigration programs/.test(b.out), tail(b.out));

  // The database down: the copy's own health (M1) is the first thing the walk reads.
  mode = "none";
  const psql = (q: string) => spawnSync("/opt/homebrew/opt/postgresql@18/bin/psql", ["postgresql://xr_studio@127.0.0.1:54329/postgres", "-XAtc", q], { encoding: "utf8" });
  psql(`alter database "${DB}" with allow_connections false`);
  psql(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DB}' and pid <> pg_backend_pid()`);
  const d = await smoke(via);
  psql(`alter database "${DB}" with allow_connections true`);
  ok("M4 fail (database down): the walk fails at Health, naming the database", d.code === 1 && /SMOKE FAIL: broke at Health \(\/api\/health\)/.test(d.out) && /database — The database does not answer/.test(d.out), tail(d.out));
} catch (e) { ok(`M4: the check ran to its end (crashed: ${(e as Error).message})`, false); }
finally { server?.close(); }
process.exitCode = summary() ? 1 : 0;
