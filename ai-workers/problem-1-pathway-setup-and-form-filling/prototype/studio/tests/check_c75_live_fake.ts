// C7.5 the Live path of the independent review, end to end at US$0 (runtime lane; P-192, P-110, P-121, P-232, P-295; Lead 35
// question 6 on #1368, done in the paid-result PR). The copy runs with STUDIO_AI_LIVE=approved and STUDIO_FAKE_LAUNCHER
// (tests/fixtures/fake-launch.mjs stands in for p2/launch.ts: no network, no model, no cost; the server honours it only on
// an isolated copy). The fake answers each round with the saved paid review's own record (run b4936d0b, committed in
// p2/runs), so a Live run of the pack's case must give exactly what Saved gives. Each rule with a passing and a failing case:
//   refused before anything is launched (409, nothing in the fake launcher's log): a run card that is not the one read (a
//   checksum that is wrong, or none), the answers changed after the card was read (a tampered sheet), two forms at once;
//   a Live run of the card read: two rounds (each a free stub pass, then the live call), 201, Live (not Replayed), US$0.86
//   as recorded, the same four findings as the replay (two High, two Low with both rounds' reasons), its run files kept in
//   the copy's own folder (never p2/runs), no ai_batch row;
//   two Live runs of one case at once: one runs, the other is refused (409 "Already running");
//   Stop during the first round: that round ends, the checker round is never launched, nothing is added, the stop audited;
//   Stop of a run that is not going: 404.
//   zsh studio/tools/isolated.sh runtime_c75lv 4438 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_c75_live_fake.ts 4438 xr_studio_runtime_c75lv
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts";
import { RUNS } from "../api/src/rounds.ts";
import { packLikeCase, type Plan } from "./fixtures/c75-made-up-run.ts";

const { ok, summary } = recorder();
const { call, sql } = m3;
const STUDIO = join(import.meta.dirname, "..");
const VAR = join(STUDIO, "var", `isolated-${m3.DB.replace(/^xr_studio_/, "")}`);
const LOG = join(VAR, "fake-launch.log");
type F = { id: string; field: string | null; severity: string; source: string; agreement: string | null; reasons: string[]; replayed: boolean; state: string };
const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(m3.PORT), m3.DB], { encoding: "utf8", timeout: 900_000 });
const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);
const launches = () => existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { job: string; mode: string }) : [];
const saved = (check: boolean) => JSON.parse(readFileSync(join(RUNS, readdirSync(RUNS).find((f) => /^studio-form-review-.+-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/.test(f) && f.startsWith("studio-form-review-check-") === check)!), "utf8"));
/** The fake launcher's answers: per round (the longest job-id prefix wins), a stub pass, then the saved round's own record. */
const scenario = (draftLive: Record<string, unknown> = {}, checkLive: Record<string, unknown> = {}) => {
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: {
    "studio-form-review-": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: saved(false), ...draftLive } },
    "studio-form-review-check-": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: saved(true), ...checkLive } },
  } }));
  rmSync(LOG, { force: true });
};
const planOf = async (caseId: string, subject: string, forms = ["IMM 5257"]) => (await call("POST", `/runtime/cases/${caseId}/review-runs/plan`, { forms, subject })).body as Plan;
const findings = async (caseId: string) => ((await call("GET", `/runtime/cases/${caseId}/findings?source=ai`)).body?.findings ?? []) as F[];
const until = async (fn: () => boolean, ms: number) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };

(async () => {
  if (releases() === 0) ok("setup: release 1 of the Visitor visa", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && releases() === 1);
  if (releases() === 1) { tsx("acceptance/lib/setup_vv_m3.ts"); ok("setup: release 2 (pack 4 setup)", releases() === 2); }
  const spend0 = sql("select count(*) from ai_batch");
  const runsBefore = readdirSync(RUNS).sort().join();
  scenario();

  // ── refused before anything is launched ──
  const { c, P } = await packLikeCase();
  const plan = await planOf(c.id, P);
  ok("C7.5 live: on this copy the run card allows Live (the switch is on) and states its cost first: worst US$4.80 within the US$5 job cap", (plan as unknown as { live_allowed: boolean }).live_allowed === true && plan.estimate.live_worst_usd === 4.8 && plan.estimate.job_cap_usd === 5, plan.estimate);
  let r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "live", planSha256: "0".repeat(64) });
  ok("C7.5 live fail: a run card that is not the one read (wrong checksum) is refused (409); nothing is launched", r.status === 409 && /Look at the run card again/.test(JSON.stringify(r.body)) && launches().length === 0, r.body);
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "live" });
  ok("C7.5 live fail: a live run with no run card checksum (its cost not read) is refused (409); nothing is launched", r.status === 409 && launches().length === 0, r.body);
  const two = await planOf(c.id, P, ["IMM 5257", "IMM 5707"]);
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257", "IMM 5707"], subject: P, mode: "live", planSha256: two.plan_sha256 });
  ok("C7.5 live fail: two forms in one live run are refused (409: over the job cap together); nothing is launched", r.status === 409 && /one form at a time/.test(JSON.stringify(r.body)) && launches().length === 0, r.body);
  const { c: ct, P: Pt } = await packLikeCase();
  const planT = await planOf(ct.id, Pt);
  await m3.answer(ct.id, Pt, "person.applying_from_country", "Canada"); await m3.confirmAll(ct.id, Pt);
  r = await call("POST", `/runtime/cases/${ct.id}/review-runs`, { forms: ["IMM 5257"], subject: Pt, mode: "live", planSha256: planT.plan_sha256 });
  ok("C7.5 live fail (a tampered sheet): the answers changed after the run card was read, so its checksum no longer holds (409); nothing is launched", r.status === 409 && /Look at the run card again/.test(JSON.stringify(r.body)) && launches().length === 0, r.body);

  // ── a Live run of the card read: two rounds through the fake launcher, the saved run's own answers ──
  r = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "live", planSha256: plan.plan_sha256 });
  const live = await findings(c.id);
  const L = launches();
  ok("C7.5 live pass: the run ends 201 as Live, both rounds answered, at the recorded cost (US$0.86)", r.status === 201 && r.body?.mode === "live" && r.body?.forms?.[0]?.from === "live" && r.body?.forms?.[0]?.rounds === 2 && r.body?.cost_usd === 0.86, r.body);
  ok("C7.5 live pass: each round is a free stub pass, then the live call; first round, then the checker (P-110, P-232)", L.map((x) => `${x.job.startsWith("studio-form-review-check-") ? "check" : "draft"}:${x.mode}`).join() === "draft:stub,draft:live,check:stub,check:live", L);
  ok("C7.5 live pass (P-121): the same four findings as the saved review: two High, two Low each with both rounds' reasons; Live, not Replayed", live.length === 4 && live.filter((x) => x.agreement === "high").length === 2 && live.filter((x) => x.agreement === "low").every((x) => x.reasons.length === 2) && live.every((x) => x.replayed === false && x.source === "ai"), live.map((x) => [x.field, x.severity, x.agreement]));
  const { c: cs, P: Ps } = await packLikeCase();
  await call("POST", `/runtime/cases/${cs.id}/review-runs`, { forms: ["IMM 5257"], subject: Ps, mode: "replay" });
  const rep = await findings(cs.id);
  const key = (fs: F[]) => fs.map((x) => `${x.field}|${x.severity}|${x.agreement}|${x.reasons.join("/")}`).sort().join("\n");
  ok("C7.5 live pass: a Saved run of another pack case gives exactly the same findings (the live answer and the saved one agree)", rep.length === 4 && key(rep) === key(live) && rep.every((x) => x.replayed), key(rep));
  ok("C7.5 live: the run's files stay in the copy's own folder; p2/runs is unchanged; no ai_batch row", readdirSync(RUNS).sort().join() === runsBefore && (r.body?.forms?.[0]?.run_files ?? []).every((f: string) => f.includes("/var/isolated-")) && sql("select count(*) from ai_batch") === spend0, r.body?.forms?.[0]?.run_files);

  // ── two Live runs of one case at once ──
  const { c: c2, P: P2 } = await packLikeCase();
  const plan2 = await planOf(c2.id, P2);
  scenario({ sleep_ms: 2500 });
  const both = await Promise.all([1, 2].map(() => call("POST", `/runtime/cases/${c2.id}/review-runs`, { forms: ["IMM 5257"], subject: P2, mode: "live", planSha256: plan2.plan_sha256 })));
  ok("C7.5 live fail (break M2): two Live runs of one case at once: one runs (201), the other is refused (409 Already running) before anything is launched", both.map((x) => x.status).sort().join() === "201,409" && both.some((x) => /Already running/.test(JSON.stringify(x.body))) && launches().filter((x) => x.mode === "live").length === 2, both.map((x) => x.status));

  // ── Stop during the first round ──
  const { c: c3, P: P3 } = await packLikeCase();
  const plan3 = await planOf(c3.id, P3);
  scenario({ sleep_ms: 8000 });
  const runId = randomUUID();
  const going = call("POST", `/runtime/cases/${c3.id}/review-runs`, { forms: ["IMM 5257"], subject: P3, mode: "live", planSha256: plan3.plan_sha256, runId });
  const started = await until(() => launches().some((x) => x.mode === "live" && !x.job.startsWith("studio-form-review-check-")), 15_000);
  const stop = await call("POST", `/runtime/review-runs/${runId}/stop`, {});
  const ended = await going;
  ok("C7.5 live pass (P-110): Stop during the first round ends it: the run says cancelled, no round answered, nothing added", started && stop.status === 200 && ended.status === 201 && ended.body?.cancelled === true && ended.body?.forms?.[0]?.rounds === 0 && ended.body?.added === 0 && (await findings(c3.id)).length === 0, { stop: stop.status, ended: ended.body });
  ok("C7.5 live pass: after Stop the checker round is never launched", !launches().some((x) => x.job.startsWith("studio-form-review-check-")), launches());
  ok("C7.5 live: the stop is audited (who, which case), never a value", Number(sql(`select count(*) from audit_event where action='stopped' and entity_key='${c3.id}'`)) === 1);
  ok("C7.5 live fail: Stop of a run that is not going is not found (404)", (await call("POST", `/runtime/review-runs/${runId}/stop`, {})).status === 404);
  process.exitCode = summary() ? 1 : 0;
})();
