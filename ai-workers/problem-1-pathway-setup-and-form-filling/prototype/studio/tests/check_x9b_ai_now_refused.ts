// X9b (#113 review m7; P-175, P-192): the fake launcher alone never opens AI now. The live switch (STUDIO_AI_LIVE) is the
// one door: a copy started with the test fixture as its launcher but without the switch must refuse "AI now" on Who can be
// (409, in words) and say live.approved is false, while rules only still runs. check_qa91_who_can_be_run.ts proves the
// paired copy opens it; this one proves the server itself, not only the pure whoCanBeLiveOpen, keeps it shut. If
// LIVE_APPROVED were ever widened to "… || usesFakeLauncher()", this suite fails. No model call, nothing launched (US$0).
//   zsh studio/tools/isolated.sh runtime_m7 4434 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_x9b_ai_now_refused.ts 4434 xr_studio_runtime_m7
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FAKE_LAUNCHER, launcherFor } from "../api/src/sources.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_m7";
const VAR = join(import.meta.dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as any };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  // The server's environment: /proc on Linux (CI), "ps -E" on macOS. This check needs the fake launcher on and every live
  // switch off; any other start proves nothing, so it stops.
  const pid = execFileSync("lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n")[0];
  const env = !pid ? "" : existsSync(`/proc/${pid}/environ`) ? readFileSync(`/proc/${pid}/environ`, "utf8").split("\0").join(" ") : execFileSync("ps", ["-E", "-ww", "-p", pid, "-o", "command="], { encoding: "utf8" });
  const fake = env.match(/STUDIO_FAKE_LAUNCHER=(\S+)/)?.[1], varRoot = env.match(/STUDIO_VAR=(\S+)/)?.[1] ?? "";
  if (!fake || launcherFor(fake, varRoot) !== FAKE_LAUNCHER) { console.error(`STOP  the server on :${PORT} does not run the fake launcher (${fake ?? "not set"}). Start it as the usage line says.`); process.exit(2); }
  const live = [...env.matchAll(/\b(\w+_LIVE)=approved\b/g)].map((m) => m[1]);
  if (live.length) { console.error(`STOP  the server on :${PORT} has a live switch on (${live.join(", ")}): this check needs the fake launcher alone.`); process.exit(2); }
  ok("setup: this copy runs the fake launcher and no live switch (STUDIO_AI_LIVE and every other *_LIVE off)", true, fake);
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  rmSync(join(VAR, "fake-launch.log"), { force: true });

  const rules = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "rules" });
  ok("X9b m7 pass: on this copy, rules only still plans (Who can be from the guide, no AI)", rules.status < 300 && rules.body?.mode === "rules", rules.status >= 300 ? words(rules) : rules.body?.mode);
  ok("X9b m7 fail: the plan says AI now is not approved, with why (live.approved false)", rules.body?.live?.approved === false && typeof rules.body?.live?.why === "string" && rules.body.live.why.length > 0, rules.body?.live);
  const plan = await call("POST", `/combinations/${vv}/people/propose/plan`, { mode: "live" });
  ok("X9b m7 fail: the fake launcher alone never opens AI now — its plan is refused (409, in words)", plan.status === 409 && /not approved/i.test(String(plan.body?.title ?? "") + words(plan)), { status: plan.status, title: plan.body?.title, detail: words(plan) });
  const run = await call("POST", `/combinations/${vv}/people/propose`, { mode: "live", planSha256: rules.body?.plan_sha256 });
  ok("X9b m7 fail: starting AI now is refused too (409), and no run is started", run.status === 409 && !run.body?.runId, { status: run.status, title: run.body?.title });
  ok("X9b m7 fail-guard: nothing was launched, not even the fake launcher (no launch log)", !existsSync(join(VAR, "fake-launch.log")) || !readFileSync(join(VAR, "fake-launch.log"), "utf8").trim());

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
