// Lead Critical 29 Oct (qa spent US$0.27 by one click on a test copy): no live AI call starts unless the server was
// started with STUDIO_AI_LIVE=approved. On an isolated copy with the stand-in launcher (tests/fixtures/fake-launch.mjs,
// which logs every call it gets) and NO switch: Start setup offers rules only and says why, the finder's live plan says
// AI now is off, a live find and a live field-map draft are refused at US$0 and the launcher is never asked for a live
// call. Then the same copy restarted WITH the switch: the plan and the offer are as today. US$0 throughout.
//   zsh studio/tools/isolated.sh forms_live 4479 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_ai_live_switch.ts 4479 xr_studio_forms_live
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4479), DB = process.argv[3] ?? "xr_studio_forms_live", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const VAR = join(STUDIO, "var", `isolated-${NAME}`), LOG = join(VAR, "fake-launch.log");
const FAKE = "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const liveCalls = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const restart = async (...env: string[]) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", ...env], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { /* waited for below */ }
  for (let i = 0; i < 240; i++) { if ((await fetch(`http://localhost:${PORT}/api/session`).catch(() => null))?.status === 200) return; await sleep(500); }
};

(async () => {
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  await call("POST", "/demo/load");
  // A new name with no saved finder answer, set up from Program structure, so nothing runs until a click (as S3).
  const path = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { label: "Live switch check pathway" }, program: { label: "Live switch check program" }, category: { label: "Live switch check category" }, subCategory: null, allowedLocations: ["outside_canada"] });
  const started = await call("POST", "/combinations/start", { nodeKey: path.body?.leaf?.key });
  const cid: string = started.body?.combination?.id;
  ok("set-up: a new combination with no forms and no run", started.status === 201 && !!cid && started.body?.run === null, started.body);
  const before = liveCalls(), batches = () => sql(`select count(*) from ai_batch where mode = 'LIVE'`);

  // ── no switch
  const plan = await call("POST", `/combinations/${cid}/forms/find/plan`, { mode: "live" });
  ok("C11.15 Lead Critical fail: with no switch the live plan says AI now is switched off, in plain words", plan.status < 300 && plan.body?.live?.on === false && /switched off/.test(plan.body?.live?.why ?? ""), plan.body?.live);
  const launch = await call("POST", `/combinations/${cid}/forms/find`, { mode: "live", planSha256: plan.body?.plan_sha256 ?? "x", idempotencyKey: `live-off-${process.pid}` });
  ok("C11.15 Lead Critical fail: a live find is refused (409, plain words); no run is created, nothing spent", launch.status === 409 && /switched off/.test(JSON.stringify(launch.body)) && batches() === "0", launch.body?.detail ?? launch.status);
  const offer = await call("GET", `/combinations/${cid}/start-setup`);
  ok("C11.15 Lead Critical fail: Start setup offers rules only (free) and says why AI now is off", offer.body?.offer?.mode === "rules" && /switched off/.test(offer.body?.offer?.why ?? ""), offer.body?.offer);
  const att = sql("select a.id from source_attachment a join combination c on c.id=a.combination_id where c.label='Visitor visa' and a.file_name='imm5257e.pdf' limit 1");
  const draft = att ? await call("POST", `/attachments/${att}/draft`, { mode: "live" }) : { status: 0, body: null };
  for (let i = 0; i < 40 && att && sql(`select count(*) from drafting_job where attachment_id='${att}' and status in ('QUEUED','RUNNING')`) !== "0"; i++) await sleep(500);
  const job = att ? sql(`select status::text || '|' || coalesce(cost_usd, 0) || '|' || coalesce(message, '') from drafting_job where attachment_id='${att}' order by started_at desc limit 1`) : "";
  ok("C3.4 Lead Critical fail: a live field-map draft is refused or ends without a live call, at US$0", !!att && (/switched off/.test(JSON.stringify(draft.body)) || (/\|0(\.0+)?\|/.test(job) && !/^COMPLETED/.test(job))), { status: draft.status, job });
  ok("C11.15 Lead Critical fail: the launcher was never asked for a live call (its own log), US$0", liveCalls() === before, { before, after: liveCalls() });

  // ── with the switch: the plan as today
  await restart("STUDIO_AI_LIVE=approved", `STUDIO_FAKE_LAUNCHER=${FAKE}`);
  const planOn = await call("POST", `/combinations/${cid}/forms/find/plan`, { mode: "live" });
  ok("C11.15 Lead Critical pass: with STUDIO_AI_LIVE=approved the live plan is on, its cost stated as today", planOn.body?.live?.on === true && planOn.body?.live?.why === null && planOn.body?.totals?.worst_usd > 0, { live: planOn.body?.live, worst: planOn.body?.totals?.worst_usd });
  const offerOn = await call("GET", `/combinations/${cid}/start-setup`);
  ok("C11.15 Lead Critical pass: Start setup offers 'Find forms with AI (… at most US$…)' again", offerOn.body?.offer?.mode === "live" && /^Find forms with AI \(/.test(offerOn.body?.offer?.label ?? ""), offerOn.body?.offer?.label);
  const launchOn = await call("POST", `/combinations/${cid}/forms/find`, { mode: "live", planSha256: planOn.body?.plan_sha256, idempotencyKey: `live-on-${process.pid}` });
  for (let i = 0; i < 60 && liveCalls() === before; i++) await sleep(500);
  ok("C11.15 Lead Critical pass: a live find starts and reaches the (stand-in) launcher", launchOn.status < 300 && liveCalls() > before, { status: launchOn.status, live_calls: liveCalls() - before });
  await restart(`STUDIO_FAKE_LAUNCHER=${FAKE}`); // leave the copy as its usage line started it
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
