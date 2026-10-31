// P-179 (C11.8): the API side of a cost warning a person may continue past. Every forms plan carries `cost_check` and
// `run_key`; POST /ai/overrides records a person's Continue (author only, the plan made again must match, never past
// US$132); a launch over a limit starts only with an unused Continue for that run (once, within 10 minutes); attempts per
// form (Q2) allow exactly one more run per click. The check starts its own isolated copy with no live AI switch and the
// queue held, on a scratch ledger of its own that it seeds (test spend and test overrides never reach the ledger every
// copy shares, QA-90): no AI call, no launcher, US$0. Every rule has a passing and a failing case.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_cost_override.ts [port=4454] [name=forms_co]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { launchArgs, overrideOf } from "../api/src/sources.ts";

const PORT = Number(process.argv[2] ?? 4454), NAME = process.argv[3] ?? "forms_co", DB = `xr_studio_${NAME}`;
const SCRATCH = mkdtempSync(join(tmpdir(), "p2-ledger-p179-"));
const LEDGER = join(SCRATCH, "spend.jsonl");
const ISOLATED = join(import.meta.dirname, "..", "tools", "isolated.sh");
execFileSync("zsh", [ISOLATED, NAME, String(PORT), "start", `P2_LEDGER_DIR=${SCRATCH}`, "STUDIO_HOLD_QUEUE=1"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, STUDIO_AI_LIVE: "" } });
const stop = () => { try { execFileSync("zsh", [ISOLATED, NAME, String(PORT), "stop"], { stdio: "ignore" }); } catch { /* already stopped */ } rmSync(SCRATCH, { recursive: true, force: true }); };
const lines = () => (existsSync(LEDGER) ? readFileSync(LEDGER, "utf8") : "").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any -- ledger lines are read loosely
let seq = 0;
/** Seeds committed spend before Wave 1 started (so only the experiment cap moves), settled at that amount. */
const seed = (usd: number) => { const id = `seed-p179-${++seq}`; appendFileSync(LEDGER, JSON.stringify({ type: "reserve", id, run_id: id, attempt: 1, worst_usd: usd, caller: "check_cost_override seed", at: "2026-10-20T00:00:00.000Z" }) + "\n"); };

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.message ?? r.body?.detail ?? "");

(async () => {
  // ──────────────────────────────────────────── unit: what the launcher is given
  const ov = { id: "override-1-ab", run_key: "a".repeat(40) };
  ok("C11.8 P-179 pass: a live launch carries --override-id and --run-key", launchArgs("L", "job", "live", [], ov).join(" ") === `L --job job --live --override-id override-1-ab --run-key ${"a".repeat(40)}`);
  ok("C11.8 P-179 fail: the free stub pass never carries an override, and a launch with none carries nothing", !launchArgs("L", "job", "stub", [], ov).includes("--override-id") && !launchArgs("L", "job", "live", []).includes("--override-id"));
  ok("C11.8 P-179 pass: a run's plan names its override; a plan with none or a broken one names nothing", overrideOf({ override: { ...ov, limits: ["run"] } })?.id === ov.id && overrideOf({}) === undefined && overrideOf({ override: { id: "x" } }) === undefined && overrideOf(null) === undefined);

  // ──────────────────────────────────────────── setup: IMM 5409 on the Visitor visa, one whole-form live draft (as check_ai_launch_paths)
  await call("POST", "/demo/load");
  const vv = sql("select id from combination where combination_key='vv.single'");
  await call("POST", `/combinations/${vv}/attachments/sample`, { officialFile: "imm5409e.pdf" });
  const src = sql(`select id from source_attachment where file_name='imm5409e.pdf' and combination_id='${vv}'`);
  sql("update form_edition set sha256 = repeat('1', 64) where edition_label = 'IMM 5409 (01-2023)'");
  sql("update form_field_map set status = 'DRAFT' where form_edition_id = (select id from form_edition where edition_label = 'IMM 5409 (01-2023)')");
  sql(`update source_attachment set status = 'RECOGNISED' where id = '${src}'`);
  const scope = { kind: "source", ids: [src] };
  const planNow = async () => (await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true })).body;
  const start = { kind: "draft_field_maps", scope, mode: "LIVE", draftAgain: true };
  const cont = (p: any, extra: object = {}, actor: string | null = "user-A") => call("POST", "/ai/overrides", { run_key: p.run_key, worst_usd: p.cost_check.worst_usd, limits: p.cost_check.over.map((o: any) => o.limit), start, ...extra }, actor); // eslint-disable-line @typescript-eslint/no-explicit-any
  const draft = (overrideId?: string) => call("POST", `/attachments/${src}/draft`, { mode: "live", idempotencyKey: `p179-${Date.now()}-${Math.random()}`, ...(overrideId ? { overrideId } : {}) });
  const cancelOpen = async () => { for (const b of (await call("GET", "/ai/batches")).body) if (["QUEUED", "RUNNING"].includes(b.status)) await call("POST", `/ai/batches/${b.id}/cancel`); };

  // ──────────────────────────────────────────── a start that fits
  let p = await planNow();
  const worst = p.cost_check?.worst_usd;
  ok("C11.8 P-179 pass: the field-map plan carries the cost check (worst case = the plan's) and a run key", p.targets?.[0]?.action === "draft" && worst > 0 && worst === p.totals.worst_usd && /^[0-9a-f]{40}$/.test(p.run_key) && p.cost_check.ok && p.cost_check.cap_usd === 120 && p.cost_check.ceiling_usd === 132, { cc: p.cost_check, key: p.run_key });
  let r = await call("POST", "/ai/overrides", { run_key: p.run_key, worst_usd: worst, limits: ["experiment"], start });
  ok("C11.8 P-179 fail: a Continue for a start that fits is refused (409), nothing recorded", r.status === 409 && /nothing to continue past/.test(msg(r)) && !lines().some((l) => l.type === "override"), { status: r.status, m: msg(r) });

  // ──────────────────────────────────────────── Q2: a form that used its paid attempts
  for (let i = 0; i < 2; i++) sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, cost_usd, started_by, message) select gen_random_uuid(), workspace_id, combination_id, id, 'field_map', 'LIVE', 'FAILED', 0.42, 'user-A', 'earlier paid run (check seed)' from source_attachment where id = '${src}'`);
  p = await planNow();
  ok("C11.8 P-179 pass (Q2): a form with no paid attempt left is a draft over 'attempts', Continue offered, its worst case shown", p.targets?.[0]?.action === "draft" && p.targets[0].over_attempts === true && p.cost_check.over.map((o: any) => o.limit).join() === "attempts" && p.cost_check.can_continue && p.cost_check.worst_usd === worst && /Continue allows exactly one more run/.test(p.cost_check.words), p.cost_check); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await draft();
  ok("C11.8 P-179 fail (Q2): without a Continue that start is refused before anything is queued (hard limits stay the default)", r.status === 400 && /used its 4 paid AI attempts/.test(msg(r)) && /needs a person's Continue/.test(msg(r)) && sql(`select count(*) from drafting_job where attachment_id='${src}' and status='QUEUED'`) === "0", { status: r.status, m: msg(r) });
  for (const [who, why] of [["user-C", "content reviewer (SME)"], ["user-B", "approver"], ["user-O", "case officer"], ["user-P", "client"]]) {
    r = await cont(p, {}, who);
    ok(`C11.8 P-179 fail: the ${why} cannot Continue past a cost limit (403)`, r.status === 403, { status: r.status, m: msg(r) });
  }
  r = await cont(p, {}, null);
  ok("C11.8 P-179 fail: nobody (no person named) cannot Continue (401), and none of these wrote a line", r.status === 401 && !lines().some((l) => l.type === "override"), r.status);
  r = await cont(p, { worst_usd: worst + 1 });
  ok("C11.8 P-179 fail: a Continue for another worst case than the plan's now is refused (409 stale), nothing recorded", r.status === 409 && /worst case is now/.test(msg(r)) && !lines().some((l) => l.type === "override"), msg(r));
  r = await cont(p, { limits: ["experiment"] });
  ok("C11.8 P-179 fail: a Continue naming other limits than the plan passes is refused (409)", r.status === 409 && /limits this start passes changed/.test(msg(r)), msg(r));
  r = await cont(p, { run_key: "b".repeat(40) });
  ok("C11.8 P-179 fail: a Continue for another run key (a changed plan) is refused (409)", r.status === 409 && /work changed/.test(msg(r)), msg(r));
  r = await cont(p);
  const o1 = r.body?.override_id as string;
  const line = lines().find((l) => l.type === "override" && l.id === o1);
  ok("C11.8 P-179 pass: the author's Continue is recorded in the shared ledger (who, which run, which limit, worst case, 10 minutes) and answered", r.status === 201 && line?.by === "user-A" && line.run_key === p.run_key && line.limits.join() === "attempts" && line.worst_usd === worst && Date.parse(r.body.expires_at) - Date.parse(line.at) === 600_000, { status: r.status, body: r.body, line });
  ok("C11.8 P-179 pass: the Continue is in the audit trail (ai_override, the person and the limit)", sql(`select count(*) from audit_event where action='ai_override' and entity_key='${o1}' and summary like '%past attempts%'`) === "1");
  r = await draft(o1);
  const job1 = r.body?.id as string;
  const batch1 = job1 ? sql(`select batch_id from drafting_job where id='${job1}'`) : "";
  const planOv = batch1 ? JSON.parse(sql(`select plan::text from ai_batch where id='${batch1}'`)).override : null;
  ok("C11.8 P-179 pass (Q2): with the Continue exactly one more run is queued, the Continue used once and kept on its run for the launcher", r.status === 201 && planOv?.id === o1 && planOv.run_key === p.run_key && lines().filter((l) => l.type === "override_use" && l.id === o1).length === 1, { status: r.status, m: msg(r), planOv });
  ok("C11.8 P-179 pass: the start's audit line names the Continue", sql(`select count(*) from audit_event where entity_key='${batch1}' and summary like '%continued past attempts%'`) === "1");
  await cancelOpen();
  // P-179 follow-up (31 Oct; question in the PR): a run started with a Continue past "attempts" may be retried: the
  // Continue covers that run, retries included, within the worst case the person accepted (the ledger holds it there).
  r = await call("POST", `/ai/batches/${batch1}/retry`, {});
  const retried = sql(`select max(attempt) from drafting_job where batch_id='${batch1}' and status='QUEUED'`);
  ok("C11.8 P-179 follow-up pass: the Continue run, stopped before it was sent, is retried (before: 400 'used its 4 paid AI attempts … needs a person'), and the retry keeps the run's Continue", r.status === 201 && retried === "2" && JSON.parse(sql(`select plan::text from ai_batch where id='${batch1}'`)).override?.id === o1, { status: r.status, m: msg(r), retried });
  await cancelOpen();
  const snapLedger = readFileSync(LEDGER, "utf8"); seed(140);
  r = await call("POST", `/ai/batches/${batch1}/retry`, {});
  // #131 review m1: this Continue names "attempts" only, so its retry is held to the cap, not the ceiling.
  ok("C11.8 P-179 follow-up fail: past the cap, a retry under a Continue that did not name the cap is refused (409, what is left of the cap), nothing queued", r.status === 409 && /more than is left of the experiment cap/.test(msg(r)) && sql(`select count(*) from drafting_job where batch_id='${batch1}' and status='QUEUED'`) === "0", { status: r.status, m: msg(r) });
  writeFileSync(LEDGER, snapLedger);
  // #131 review M1: the run already reserved the whole worst case the person accepted (its first run was sent): no retry.
  appendFileSync(LEDGER, JSON.stringify({ type: "reserve", id: `run-o1#1#${Date.now()}`, run_id: "run-o1", attempt: 1, worst_usd: worst, caller: "paid", override_id: o1, at: new Date().toISOString() }) + "\n");
  r = await call("POST", `/ai/batches/${batch1}/retry`, {});
  ok("C11.8 #131 review M1 fail: once the run reserved the worst case its Continue accepted, a retry is refused up front (409, start again and Continue again), nothing queued (before: queued, ~3 runs per click)", r.status === 409 && /only US\$0\.00 is left of the US\$\d+\.\d\d the person accepted/.test(msg(r)) && sql(`select count(*) from drafting_job where batch_id='${batch1}' and status='QUEUED'`) === "0", { status: r.status, m: msg(r) });
  writeFileSync(LEDGER, snapLedger);
  const keptOverride = JSON.stringify(JSON.parse(sql(`select plan::text from ai_batch where id='${batch1}'`)).override);
  sql(`update ai_batch set plan = plan - 'override' where id='${batch1}'`);
  r = await call("POST", `/ai/batches/${batch1}/retry`, {});
  ok("C11.8 P-179 follow-up fail: a run with no Continue for a form past its paid attempts is still not retried (400, needs a person)", r.status === 400 && /needs a person, not another paid retry/.test(msg(r)), { status: r.status, m: msg(r) });
  sql(`update ai_batch set plan = jsonb_set(plan, '{override}', '${keptOverride}'::jsonb) where id='${batch1}'`); // the run's Continue back, as it was
  p = await planNow();
  r = await draft(o1);
  ok("C11.8 P-179 fail (Q2): one click is one run: the same Continue again is refused (409 used), nothing queued", p.targets?.[0]?.over_attempts === true && r.status === 409 && /already used/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", "/ai/overrides", { run_key: p.run_key, worst_usd: p.cost_check.worst_usd, limits: ["attempts"], start });
  const o2 = r.body?.override_id as string;
  // An override that has run out of time: its expiry moved back in the scratch ledger (as 10 minutes passing).
  const raw = readFileSync(LEDGER, "utf8").replace(new RegExp(`("id":"${o2}"[^\\n]*"expires_at":")[^"]+`), "$12026-10-01T00:00:00.000Z");
  writeFileSync(LEDGER, raw);
  r = await draft(o2);
  ok("C11.8 P-179 fail: an expired Continue is refused (409), nothing queued", r.status === 409 && /expired/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await draft("override-0-nosuch");
  ok("C11.8 P-179 fail: an unknown Continue is refused (409)", r.status === 409 && /No such Continue/.test(msg(r)), msg(r));
  sql(`delete from drafting_job where attachment_id='${src}' and message='earlier paid run (check seed)'`);

  // ──────────────────────────────────────────── the experiment cap (US$120) and the ceiling (US$132)
  await cancelOpen();
  const committed = lines().filter((l) => l.type === "reserve").reduce((a, l) => a + l.worst_usd, 0);
  seed(120 - committed - worst / 2);
  p = await planNow();
  ok("C11.8 P-179 pass: past the experiment cap the plan says so, where this run could take spend against the cap, Continue offered", !p.cost_check.ok && p.cost_check.over.map((o: any) => o.limit).join() === "experiment" && p.cost_check.can_continue && /could reach US\$\d+\.\d\d, past the US\$120\.00 AI spending cap/.test(p.cost_check.words), p.cost_check); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await draft();
  ok("C11.8 P-179 fail: without a Continue the start over the cap is refused as before (nothing queued)", r.status === 400 && /experiment cap/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await cont(p);
  const o3 = r.body?.override_id as string;
  r = await draft(o3);
  ok("C11.8 P-179 pass: with the author's Continue the start over the cap is queued, for this run's worst case only", r.status === 201 && lines().find((l) => l.type === "override" && l.id === o3)?.worst_usd === worst, { status: r.status, m: msg(r) });
  // Review m6: the Continue's audit line says what was over and why, not the dialog's instructions.
  const auditO3 = sql(`select summary from audit_event where action='ai_override' and entity_key='${o3}'`);
  ok("C11.8 review m6: the ai_override audit line names the limit and why (the cap's words), not 'Continue records…; Cancel starts nothing'", /AI spending cap/.test(auditO3) && !/Cancel starts nothing|Continue records your name/.test(auditO3), auditO3);
  await cancelOpen();

  // ──────────────────────────────────────────── review m1, break m1/m2/m5/m7: a Continue is used only by the run it starts
  const used = (id: string) => lines().filter((l) => l.type === "override_use" && l.id === id).length;
  const expire = (id: string) => writeFileSync(LEDGER, readFileSync(LEDGER, "utf8").replace(new RegExp(`("id":"${id}"[^\\n]*"expires_at":")[^"]+`), "$12026-10-01T00:00:00.000Z"));
  const draftKey = (key: string, overrideId?: string) => call("POST", `/attachments/${src}/draft`, { mode: "live", idempotencyKey: key, ...(overrideId ? { overrideId } : {}) });
  let pm = await planNow();
  // A second Continue for the same run by the same person: written into the scratch ledger, because the API now uses that
  // person's unused Continue again instead of recording a second one (N6, review N2; checked below).
  const oa = (await cont(pm)).body?.override_id as string, ob = `override-${Date.now()}-m1b`;
  appendFileSync(LEDGER, JSON.stringify({ type: "override", id: ob, run_key: pm.run_key, limits: pm.cost_check.over.map((o: any) => o.limit), worst_usd: pm.cost_check.worst_usd, by: "user-A", at: new Date().toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString() }) + "\n"); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [ra, rb] = await Promise.all([draftKey(`p179-m1a-${Date.now()}`, oa), draftKey(`p179-m1b-${Date.now()}`, ob)]);
  const won = ra.status === 201 ? oa : ob, lost = ra.status === 201 ? ob : oa;
  ok("C11.8 review m1 fail: two starts of one form at once, each with its own Continue: one is queued, the other refused (409)", [ra.status, rb.status].sort().join() === "201,409", { a: ra.status, b: rb.status, m: msg(ra) + msg(rb) });
  ok("C11.8 review m1 pass: only the started run's Continue is used; the refused one stays unused (before: both were used)", used(won) === 1 && used(lost) === 0, { won: used(won), lost: used(lost) });
  await cancelOpen();
  pm = await planNow();
  r = await draft(lost);
  ok("C11.8 review m1 pass: that unused Continue then starts its run", r.status === 201 && used(lost) === 1, { status: r.status, m: msg(r) });
  await cancelOpen();
  pm = await planNow();
  const oc = (await cont(pm)).body?.override_id as string, sameKey = `p179-m2-${Date.now()}`;
  const [rc1, rc2] = await Promise.all([draftKey(sameKey, oc), draftKey(sameKey, oc)]);
  ok("C11.8 break m2 pass: a double click (the same launch key and Continue at once) answers the same run twice, the Continue used once", rc1.status === 201 && rc2.status === 201 && rc1.body?.id === rc2.body?.id && used(oc) === 1, { s: [rc1.status, rc2.status], ids: [rc1.body?.id, rc2.body?.id], m: msg(rc2) });
  r = await draftKey(sameKey, oc);
  ok("C11.8 break m2 pass: a later retry with that key gets the same run (before: 409 'already queued or running')", r.status === 201 && r.body?.id === rc1.body?.id, { status: r.status, m: msg(r) });
  const src2 = sql(`select id from source_attachment where combination_id='${vv}' and kind='Form' and id <> '${src}' limit 1`);
  r = await call("POST", `/attachments/${src2}/draft`, { mode: "stub", idempotencyKey: sameKey });
  ok("C11.8 N6 PR review (security) fail: another form's launch key is refused (409), never answered with that form's run", !!src2 && r.status === 409 && /belongs to another run/.test(msg(r)) && r.body?.id !== rc1.body?.id, { src2, status: r.status, m: msg(r) });
  r = await draftKey(`p179-m2-other-${Date.now()}`, oc);
  ok("C11.8 break m2 fail: the same Continue with another launch key is refused (409 already used)", r.status === 409 && /already (used|queued or running)/.test(msg(r)), { status: r.status, m: msg(r) });
  await cancelOpen();
  pm = await planNow();
  // Break m7: a Continue recorded by another person (written into the scratch ledger: one author persona exists).
  const oz = `override-${Date.now()}-zz`;
  appendFileSync(LEDGER, JSON.stringify({ type: "override", id: oz, run_key: pm.run_key, limits: pm.cost_check.over.map((o: any) => o.limit), worst_usd: pm.cost_check.worst_usd, by: "user-Z", at: new Date().toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString() }) + "\n"); // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await draft(oz);
  ok("C11.8 break m7 fail: another person's Continue does not start this person's run (409), and stays unused", r.status === 409 && /another person/.test(msg(r)) && used(oz) === 0, { status: r.status, m: msg(r) });
  expire(oz);
  r = await cont(pm, { surprise: "x".repeat(1000) });
  ok("C11.8 break m5 fail: a Continue with a field the server does not know is refused in words (400), nothing recorded", r.status === 400 && /field the server does not know/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await cont(pm, { start: { ...start, extra: true } });
  ok("C11.8 break m5 fail: ... also inside its start", r.status === 400 && /field the server does not know/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await cont(pm, { reason: "Founder's demo on 31 Oct" });
  const or = r.body?.override_id as string;
  ok("C11.8 break m5 pass: the optional reason is taken and kept on the ledger line and in the audit", r.status === 201 && lines().find((l) => l.id === or)?.reason === "Founder's demo on 31 Oct" && /Reason: Founder's demo on 31 Oct/.test(sql(`select summary from audit_event where entity_key='${or}'`)), { status: r.status, m: msg(r) });
  expire(or);
  // N6 break n3: a control character in the reason was written to the ledger, then the audit failed and the answer was
  // 404 "Not found" with the Continue left holding US$ for 10 minutes. It is refused in words before anything is written.
  const beforeNul = lines().length;
  r = await cont(pm, { reason: "a\u0000b" });
  ok("C11.8 N6 break n3 fail: a NUL in the reason is refused in words (400), no ledger line, no audit (before: line written, then 404)", r.status === 400 && /control character/.test(msg(r)) && lines().length === beforeNul, { status: r.status, m: msg(r) });
  r = await cont(pm, { reason: "half \uD83D of an emoji" });
  ok("C11.8 N6 break 3 m5 fail: a lone surrogate in the reason is refused in words (400), nothing written (before: line written, then 500)", r.status === 400 && /cannot be stored/.test(msg(r)) && lines().length === beforeNul, { status: r.status, m: msg(r) });
  r = await cont(pm, { reason: "Line one\nline two\tand a tab" });
  ok("C11.8 N6 break n3 pass: a line break and a tab in the reason are kept", r.status === 201 && lines().find((l) => l.id === r.body?.override_id)?.reason === "Line one\nline two\tand a tab", { status: r.status, m: msg(r) });
  expire(r.body?.override_id);
  const big = await fetch(`http://localhost:${PORT}/api/ai/overrides`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ run_key: pm.run_key, pad: "x".repeat(6 * 1024 * 1024) }) });
  const bigBody = await big.json().catch(() => ({})) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.8 break m6 fail: a 6 MB body is refused as too large (413) in words, not a server error", big.status === 413 && /5 MB/.test(String(bigBody.detail)), { status: big.status, b: bigBody });
  await cancelOpen();

  // ──────────────────────────────────────────── N6 review N2: a person's own unused Continue no longer blocks their retry
  // Spend at US$132 - 1.5 × worst: one run fits under the ceiling, two would not. Before the fix, the person's own unused
  // Continue was held against their retry, which was refused "… held by other Continues …; the founder must raise the cap".
  // N6 (break n2): the Continues the sections above used started runs that were then stopped before they reserved. A used
  // Continue holds its worst case until its run reserves or ends: these runs ended, so they hold nothing.
  const pEnded = await planNow();
  ok("C11.8 N6 break n2 pass: Continues whose runs were stopped hold nothing (held US$0), though used within 10 minutes and never reserved", pEnded.cost_check.held_usd === 0 && lines().some((l) => l.type === "override_use" && Date.now() - Date.parse(l.at) < 600_000), pEnded.cost_check);
  const reservedNow = () => lines().filter((l) => l.type === "reserve").reduce((a, l) => a + l.worst_usd, 0);
  seed(132 - 1.5 * worst - reservedNow());
  const pn = await planNow();
  r = await cont(pn);
  const on = r.body?.override_id as string;
  ok("C11.8 N6 review N2 setup: within US$132 the author's Continue is recorded", pn.cost_check.can_continue && r.status === 201 && !!on, { cc: pn.cost_check, status: r.status, m: msg(r) });
  r = await call("POST", `/attachments/${src}/draft`, { mode: "stub", idempotencyKey: `p179-n2-stub-${Date.now()}` });
  const stubQueued = r.status === 201;
  ok("C11.8 N6 pass: with spend past the cap, a stub pass of the form (US$0) is still queued (before: 400 'The worst case (US$0.00) is above what is left of the experiment cap (US$-…)')", stubQueued && reservedNow() > 120, { status: r.status, m: msg(r) });
  r = await draft(on);
  ok("C11.8 N6 review N2 setup: the launch after the click is refused (a stub pass of the form is already queued), its Continue stays unused", stubQueued && r.status === 409 && used(on) === 0, { stubQueued, status: r.status, m: msg(r) });
  await cancelOpen();
  const pn2 = await planNow(), overridesBefore = lines().filter((l) => l.type === "override").length;
  r = await cont(pn2);
  ok("C11.8 N6 review N2 pass: the retry's Continue is the same one, used again (201, same id, no second line; before: 409 'held … the founder must raise the cap')", pn2.run_key === pn.run_key && pn2.cost_check.can_continue && r.status === 201 && r.body?.override_id === on && lines().filter((l) => l.type === "override").length === overridesBefore, { same_key: pn2.run_key === pn.run_key, status: r.status, m: msg(r) });
  ok("C11.8 N6 review N2 pass: the audit says it is the same Continue again", /chose Continue past experiment .* again \(their Continue from a moment ago/.test(sql(`select summary from audit_event where action='ai_override' and entity_key='${on}' order by at desc limit 1`)), sql(`select summary from audit_event where action='ai_override' and entity_key='${on}' order by at desc limit 1`));
  r = await draft(on);
  ok("C11.8 N6 review N2 pass: and it starts the run, once", r.status === 201 && used(on) === 1, { status: r.status, m: msg(r) });
  await cancelOpen();
  // Another start's Continue from a moment ago (written in the scratch ledger: one author persona) holds its worst case.
  const oh = `override-${Date.now()}-held`;
  appendFileSync(LEDGER, JSON.stringify({ type: "override", id: oh, run_key: "c".repeat(40), limits: ["experiment"], worst_usd: worst, by: "user-Z", at: new Date().toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString() }) + "\n");
  const ph = await planNow();
  ok("C11.8 N6 review N2 fail: with another start's Continue held, the plan offers no Continue and says wait (costCheck and the ledger agree; not 'the founder must raise the cap')", !ph.cost_check.can_continue && ph.cost_check.held_usd === worst && /still hold US\$\d+\.\d\d until their runs start.*Wait a few minutes, then look at the cost again\./.test(ph.cost_check.words) && !/founder/.test(ph.cost_check.words), ph.cost_check);
  r = await cont(ph);
  ok("C11.8 N6 review N2 fail: and a Continue then is refused (409) in the same wait words, nothing recorded", r.status === 409 && /Wait a few minutes/.test(msg(r)) && !/founder/.test(msg(r)) && lines().filter((l) => l.type === "override").length === overridesBefore + 1, { status: r.status, m: msg(r) });
  expire(oh);
  // N6 break n1: the ledger's short lock held by a live process: the API waits 2 s (not 10 s) and says busy, not "ask the
  // Lead to fix the ledger line".
  const lockPath = join(SCRATCH, "spend.reserve.lock");
  writeFileSync(lockPath, `${hostname()}:${process.pid}:abc123`);
  const tb = Date.now(); r = await cont(await planNow());
  ok("C11.8 N6 break n1 fail: with the ledger busy the Continue answers 503 in 2-4 s, in busy words (before: 10 s, 'Ask the Lead to fix the ledger line')", r.status === 503 && /busy with another start\. Try again in a moment/.test(msg(r)) && !/fix the ledger line/.test(msg(r)) && Date.now() - tb < 4_000, { status: r.status, ms: Date.now() - tb, m: msg(r) });
  rmSync(lockPath, { force: true });
  // Break M2 (CHECK 30 Oct): a Continue recorded within US$132, then spend arrives (another copy) so the same run, same run
  // key, would now pass the ceiling: the start is refused in the founder's words and nothing is queued.
  const pM2 = await planNow(); r = await cont(pM2);
  const oM2 = r.body?.override_id as string;
  ok("C11.8 break M2 setup: a Continue is recorded while the start is within US$132", r.status === 201 && !!oM2, { status: r.status, m: msg(r) });
  seed(12.01); // committed is now 132.01 - worst/2: this run could take total spend past the ceiling
  p = await planNow();
  r = await draft(oM2);
  ok("C11.8 break M2 fail: that Continue no longer starts the run once it is past US$132 (409, the founder must raise the cap), nothing queued", p.run_key === pM2.run_key && !p.cost_check.can_continue && r.status === 409 && /founder must raise the cap/.test(msg(r)), { same_key: p.run_key === pM2.run_key, status: r.status, m: msg(r) });
  const before = lines().filter((l) => l.type === "override").length;
  ok("C11.8 P-179 pass: past US$132 the check offers no Continue and says the founder must raise the cap", !p.cost_check.can_continue && /founder must raise the cap/.test(p.cost_check.words) && /could reach US\$\d+\.\d\d, past the US\$132\.00/.test(p.cost_check.words), p.cost_check);
  r = await cont(p);
  ok("C11.8 P-179 fail: a Continue past US$132 is refused (409) and no line is written", r.status === 409 && /founder must raise the cap/.test(msg(r)) && lines().filter((l) => l.type === "override").length === before, { status: r.status, m: msg(r) });

  // ──────────────────────────────────────────── the form finder's start carries the same check
  const fp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body;
  ok("C11.8 P-179 pass: the finder's live plan carries the cost check (its worst case) and a run key", fp.cost_check?.worst_usd === fp.totals?.worst_usd && /^[0-9a-f]{40}$/.test(fp.run_key) && !fp.cost_check.ok && !fp.cost_check.can_continue, fp.cost_check);
  const rp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "rules" })).body;
  ok("C11.8 P-179 pass: rules only costs US$0 and fits even past the ceiling", rp.cost_check?.ok === true && rp.cost_check.worst_usd === 0, rp.cost_check);
  r = await call("POST", "/ai/overrides", { run_key: fp.run_key, worst_usd: fp.cost_check.worst_usd, limits: fp.cost_check.over.map((o: any) => o.limit), start: { kind: "find_forms", combinationId: vv, mode: "live" } }); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.8 P-179 fail: a finder Continue past US$132 is refused too (409), nothing recorded", r.status === 409 && /founder must raise the cap/.test(msg(r)), { status: r.status, m: msg(r) });
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: fp.plan_sha256, idempotencyKey: `p179-find-${Date.now()}`, overrideId: o3 });
  ok("C11.8 P-179 fail: with no live AI switch the finder refuses before any Continue is used (US$0)", r.status === 409 && lines().filter((l) => l.type === "override_use" && l.id === o3).length === 1, { status: r.status, m: msg(r) });
  r = await call("POST", "/ai/overrides", { run_key: fp.run_key, worst_usd: fp.cost_check.worst_usd, limits: ["run"], start: { kind: "find_page" } });
  ok("C11.8 P-179 fail: a Continue for an unknown kind of start is a plain 400", r.status === 400 && /Say which start/.test(msg(r)), { status: r.status, m: msg(r) });

  // ──────────────────────────────────────────── break m4, review m4: one spend total; break m6: a bad ledger line in words
  const ledgerText = readFileSync(LEDGER, "utf8");
  appendFileSync(LEDGER, JSON.stringify({ type: "settle", id: "orphan-no-reserve", actual_usd: 3, outcome: "check_cost_override orphan", at: new Date().toISOString() }) + "\n");
  p = await planNow();
  ok("C11.8 break m4 + review m4 pass: a settle with no reservation is counted by neither total; the page and the dialog show the same cents",
    p.ledger?.committed_usd?.toFixed(2) === p.cost_check?.spent_usd?.toFixed(2) && Math.abs(p.ledger.committed_usd - lines().filter((l) => l.type === "reserve").reduce((a, l) => a + (lines().find((s) => s.type === "settle" && s.id === l.id)?.actual_usd ?? l.worst_usd), 0)) < 0.006, { page: p.ledger?.committed_usd, dialog: p.cost_check?.spent_usd });
  appendFileSync(LEDGER, "this is not a ledger line\n");
  r = await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true });
  ok("C11.8 break m6 fail: a line that is not a ledger entry stops AI starts in words (503), not 'Something went wrong'", r.status === 503 && /not a ledger entry/.test(msg(r)) && /nothing was started/.test(msg(r)), { status: r.status, m: msg(r) });
  writeFileSync(LEDGER, ledgerText);
  r = await call("POST", "/ai/plan", { scope, mode: "LIVE", draftAgain: true });
  ok("C11.8 break m6 pass: with the line fixed the plan answers again", r.status === 201 || r.status === 200, { status: r.status, m: msg(r) });

  ok("US$0: no AI call was made (no reserve line other than this check's seeds)", lines().filter((l) => l.type === "reserve" && !String(l.id).startsWith("seed-p179")).every((l) => l.caller === "stub" || l.worst_usd === 0), lines().filter((l) => l.type === "reserve").length);
  console.log(`\n${pass} passed, ${fail} failed`);
  stop(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); stop(); process.exit(1); });
