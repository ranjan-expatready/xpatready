// C3.4 AI step, Live (forms; P-175, P-179, P-227; review M1 on #C3.4): the Live path of draft-masters on a copy whose live
// switch is paired with the stand-in launcher on the usage line (P-192): no network, no model call, US$0 on the real
// ledger. The stand-in answers each round with a run record that names a cost, as a paid run would.
//   V  Live without looking at the plan is refused (cost first); with the plan's checksum it runs both rounds, records
//      their cost and run files on the job, and puts IMM 5257's items on To review;
//   M1 a failure AFTER the paid rounds (here the queue refuses the write) keeps the rounds' cost and run files on the job,
//      FAILED, and says the run was counted; a later click is never told it was free;
//   F  a Live round that fails costs what it recorded and offers Saved only when a Saved result exists (none here).
//   zsh studio/tools/isolated.sh forms_c34live 4452 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c34_ai_live.ts 4452 xr_studio_forms_c34live
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FORM_ANSWER, GUIDE_ANSWER } from "./fixtures/c34-answers.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_c34live";
const STUDIO = join(import.meta.dirname, ".."), VAR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
/** A finished live round as the guarded launcher records it (only what rounds.ts reads), costing `usd`. */
const record = (answer: unknown, usd: number) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify(answer), drafting_run: { status: "completed", usage: { cost_usd: usd }, attempts: [] } });
const scenario = (jobs: Record<string, unknown>) => { writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs })); rmSync(join(VAR, "fake-launch.count"), { force: true }); };
const live = (answer: unknown, usd: number) => ({ stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: record(answer, usd) } });
const TRIGGER = "c34_live_check_refuse";
// The C3.4 v2 rerun (3 Nov) committed the Mac paid runner's real C3.4 runs, and with them F's "no Saved exists" no longer
// holds. This check proves the Live path with the stand-in launcher (the saved result itself is acceptance/C3.4.test.ts),
// so the real runs are set aside in the copy's var folder while it runs and put back when it exits, also on Ctrl-C or a
// stop; a folder a killed check left is put back first. As tests/check_forms_c34_ai.ts.
const RUNS = join(STUDIO, "..", "p2", "runs"), MASTERS_LIVE = /^studio-masters-.+-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
const aside = join(STUDIO, "var", `c34-real-runs-${process.pid}`);
const putBack = (dir = aside) => { if (!existsSync(dir)) return; for (const f of readdirSync(dir)) renameSync(join(dir, f), join(RUNS, f)); rmSync(dir, { recursive: true, force: true }); };
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
for (const d of existsSync(join(STUDIO, "var")) ? readdirSync(join(STUDIO, "var")).filter((x) => /^c34-real-runs-\d+$/.test(x)) : []) if (!alive(Number(d.slice(14)))) putBack(join(STUDIO, "var", d));
mkdirSync(aside, { recursive: true });
for (const f of readdirSync(RUNS).filter((x) => MASTERS_LIVE.test(x) && !x.includes("pacheck"))) renameSync(join(RUNS, f), join(aside, f));
process.on("exit", () => putBack());
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => process.exit(code));

(async () => {
  const health = await call("GET", "/session");
  if (health.status !== 200) { console.error(`STOP  no server on port ${PORT}: start the copy with its usage line`); process.exit(2); }
  const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  if (reset.status >= 300) { console.error("STOP  Reset to the six did not finish", reset.body); process.exit(2); }
  mkdirSync(VAR, { recursive: true });
  const att = (file: string) => sql(`select a.id from source_attachment a join combination c on c.id=a.combination_id where c.combination_key='vv.single' and a.file_name='${file}'`);
  const form = att("imm5257e.pdf"), guide = att("guide-5256.html");
  const job = (id: string) => JSON.parse(sql(`select row_to_json(j) from (select status, cost_usd, run_file, message, detail from drafting_job where id='${id}') j`) || "null");

  // ---------------------------------------------------------------- V: cost first, then both rounds
  scenario({ "studio-masters-form": live(FORM_ANSWER, 0.4) });
  let r = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live" });
  ok("C3.4 V fail: Live without looking at the plan is refused (cost first), nothing sent", r.status === 409 && /plan/i.test(r.body?.detail ?? "") && !sql(`select count(*) from drafting_job where kind='masters_edition' and mode='LIVE'`).startsWith("1"), r.body?.detail);
  const plan = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "live" });
  // The plan bounds a round by the raw inventory (roundBudgetUsd, as C4.7 and C4.11 do): US$7.27 for IMM 5257's two
  // rounds at the 16,000 output limit (P-296 (3)), above the US$5.03 the runner reserves for the slimmed request
  // (tools/track-a-jobs.ts); never below it.
  ok("C3.4 V pass: the Live plan states the worst case of both rounds before anything runs, never below the runner's reservation", plan.status === 200 && plan.body?.totals?.worst_usd >= 5.03 && plan.body?.totals?.worst_usd <= 7.3 && plan.body?.live?.approved === true, plan.body?.totals);
  r = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live", planSha256: "0".repeat(64) });
  ok("C3.4 V fail: Live with another plan's checksum is refused", r.status === 409 && /plan/i.test(r.body?.detail ?? ""), r.body?.detail);
  r = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live", planSha256: plan.body?.plan_sha256 });
  const j = r.body?.id ? job(r.body.id) : null;
  ok("C3.4 V pass: Live runs both rounds, records their cost (US$0.80) and both run files, and proposes IMM 5257's items", r.status === 201 && r.body?.status === "COMPLETED" && r.body?.from === "live" && r.body?.usd === 0.8 && j?.cost_usd === 0.8 && j?.detail?.run_files?.length === 2 && r.body?.proposals > 2, { status: r.status, usd: r.body?.usd, note: r.body?.message });
  const again = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live", planSha256: plan.body?.plan_sha256 });
  ok("C3.4 V pass: a second Live click returns the edition's one draft, no second paid run (P-138)", again.status === 201 && again.body?.id === r.body?.id && again.body?.proposals === 0, again.body?.id);

  // ---------------------------------------------------------------- M1: a failure after the paid rounds keeps their cost
  sql(`create or replace function ${TRIGGER}() returns trigger language plpgsql as $$ begin if new.step = 'masters_guide' then raise exception 'refused by the check'; end if; return new; end $$`);
  sql(`drop trigger if exists ${TRIGGER} on proposal_item; create trigger ${TRIGGER} before insert on proposal_item for each row execute function ${TRIGGER}()`);
  scenario({ "studio-masters-guide": live(GUIDE_ANSWER, 0.3) });
  const gp = await call("POST", `/attachments/${guide}/draft-masters/plan`, { mode: "live" });
  r = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "live", planSha256: gp.body?.plan_sha256 });
  const failed = JSON.parse(sql(`select row_to_json(j) from (select status, cost_usd, run_file, message, detail from drafting_job where kind='masters_edition' and detail->>'guide' is not null order by started_at desc limit 1) j`) || "null");
  ok("C3.4 M1 fail→pass: when the write after two paid rounds fails, the job is FAILED with their cost (US$0.60) and both run files kept", r.status >= 500 && failed?.status === "FAILED" && failed?.cost_usd === 0.6 && failed?.detail?.run_files?.length === 2 && !!failed?.run_file, failed);
  ok("C3.4 M1 fail→pass: its words say the run was counted, never that nothing was charged", /cost US\$0\.60 \(counted\)/.test(failed?.message ?? "") && !/nothing was charged/i.test(failed?.message ?? ""), failed?.message);
  sql(`drop trigger if exists ${TRIGGER} on proposal_item; drop function if exists ${TRIGGER}()`);

  // ---------------------------------------------------------------- F: a Live round that fails
  scenario({ "studio-masters-guide": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: { caller: "live", contract_valid: false, drafting_run: { status: "failed", usage: { cost_usd: 0.25 }, attempts: [] } } } } });
  const gp2 = await call("POST", `/attachments/${guide}/draft-masters/plan`, { mode: "live" });
  r = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "live", planSha256: gp2.body?.plan_sha256 });
  ok("C3.4 F pass: a Live round that fails ends FAILED at the cost it recorded, says so, and offers no Saved when none exists", r.status === 201 && r.body?.status === "FAILED" && r.body?.usd === 0.25 && r.body?.offer_saved === false && /US\$0\.25 \(counted\)/.test(r.body?.message ?? ""), { status: r.body?.status, usd: r.body?.usd, note: r.body?.message });
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  try { sql(`drop trigger if exists ${TRIGGER} on proposal_item; drop function if exists ${TRIGGER}()`); } catch { /* the copy may be gone */ }
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c34_ai_live.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
