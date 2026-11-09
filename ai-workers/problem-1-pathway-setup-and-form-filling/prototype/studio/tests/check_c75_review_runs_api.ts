// C7.5 part 2 The independent AI review (runtime lane, M3-E; BR-19; P-110, P-121, P-227, P-71, P-168; AG-11-70): the
// review-run routes on an isolated copy started with STUDIO_MADE_UP_REVIEW_RUNS=1, which reads saved reviews from the
// copy's own folder (var/isolated-<name>/made-up-review-runs) instead of p2/runs. THE SAVED RUN HERE IS MADE UP FOR THIS
// TEST: written by this file into that folder, labelled "test_fixture" in each record, named c75fixture, never a real
// answer, never in p2/runs and never committed, so neither the product nor a pack can count it; the folder goes with the
// copy at stop. The real saved run is the tech lead's one paid run on the Mac (P-295); until it is committed, pack steps
// C7.5-6b onward stay red on every copy without this switch.
// It proves the replay path end to end: pack 4's acceptance/C7.5.test.ts passes all 16 steps on this copy (its case's
// values give the same review sheet the made-up run was written for); then each rule with a passing and a failing case:
// who may plan and run (client 403, another firm 404), the body (400) and the person and form (422), Live refused while
// live AI is off (409, nothing changed), the plan checksum (409), replay without a saved run of these values (409, US$0),
// findings Replayed with High or Low and both reasons, a dismissed finding not raised again, two runs at once add each
// finding once, a finding whose quoted words left the form resolved by the rules on the next run, no ai_batch row, audit
// lines without a value, a quote or a reason, Stop. Then the job of a live run admitted by the guarded launcher in a stub
// pass (US$0; its stub records removed after). No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c75rr 4436 start STUDIO_MADE_UP_REVIEW_RUNS=1 && tsx studio/tests/check_c75_review_runs_api.ts 4436 xr_studio_runtime_c75rr
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recorder } from "./runtime/api.ts";
import * as m3 from "../acceptance/lib/m3.ts";
import { FORM_REVIEW, madeUpRuns } from "../api/src/review-runs.ts";
import { answersFor, inputsOf, MADE_UP, packLikeCase, writeMadeUp, type Plan } from "./fixtures/c75-made-up-run.ts";
import { roundJob, RUNS } from "../api/src/rounds.ts";
import { sheetText } from "../engine/runtime/form-review.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_c75rr";
const { call, sql } = m3; // the pack's helpers on this same copy (officer by default)
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), SOLUTION = join(PROTOTYPE, "..");
const tsx = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { encoding: "utf8", timeout: 900_000 });
const releases = () => Number(sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") ?? 0);
type F = { id: string; filing: string | null; subject: string; form: string | null; field: string | null; severity: string; source: string; state: string; quote: string; agreement: "high" | "low" | null; reasons: string[]; replayed: boolean };
(async () => {
  if (releases() === 0) ok("setup: release 1 of the Visitor visa", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && releases() === 1);
  if (releases() === 1) { tsx("acceptance/lib/setup_vv_m3.ts"); ok("setup: release 2 (pack 4 setup)", releases() === 2); }
  const spend0 = sql("select count(*) from ai_batch");

  // ── the made-up run for the pack's values, then the pack itself ──
  const { c: c0, P: P0 } = await packLikeCase();
  const plan0 = (await call("POST", `/runtime/cases/${c0.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P0 })).body as Plan;
  ok("C7.5-5 here: the run card before any saved run: no Saved yet, with the reason; Live not allowed; cost first", plan0?.replay_available === false && /No saved review/.test(plan0.forms[0].saved.why ?? "") && plan0.live_allowed === false && plan0.estimate.live_usd > 0 && plan0.estimate.replay_usd === 0 && plan0.stand_in === "SI-6", plan0);
  ok("C7.5 cost (P-110, P-232): the live estimate's usual is about US$1 and its worst within the US$5 job cap", plan0.estimate.live_usd >= 0.5 && plan0.estimate.live_usd <= 2 && plan0.estimate.live_worst_usd <= plan0.estimate.job_cap_usd && plan0.estimate.job_cap_usd === 5, plan0.estimate);
  const { a, b, draft, check } = answersFor(plan0);
  writeMadeUp("", inputsOf(plan0), draft, check);
  ok("C7.5 the made-up run is in the copy's own folder, never in p2/runs", readdirSync(MADE_UP).length === 2 && !readdirSync(RUNS).some((f) => f.includes("c75fixture")));
  const pack = tsx("acceptance/C7.5.test.ts");
  const lines = pack.stdout.split("\n").filter((l) => /^(PASS|FAIL) +C7\.5-/.test(l));
  const failing = lines.filter((l) => l.startsWith("FAIL"));
  ok("C7.5 pack on the made-up saved run: every step but C7.5-6b passes (the replay path end to end: -7 to -15 read the replayed findings)", lines.length === 16 && failing.length === 1, failing.join("\n") || pack.stdout.slice(-600));
  ok("C7.5 pack fail: C7.5-6b stays red on a made-up run (it never counts as the saved run; the real one is the tech lead's paid run)", failing.length === 1 && failing[0].startsWith("FAIL  C7.5-6b ") && /"made_up":true/.test(failing[0]), failing[0]);

  // ── who, the body, the person and the form ──
  const f = await m3.firms(), officer = f.officer ?? m3.OFFICER;
  const { c, P } = await packLikeCase();
  const planOf = async (body: unknown, actor = officer) => call("POST", `/runtime/cases/${c.id}/review-runs/plan`, body, actor);
  ok("C7.5 fail: a client cannot see the run card (403)", (await planOf({ forms: ["IMM 5257"], subject: P }, m3.CLIENT)).status === 403);
  ok("C7.5 fail: another firm's officer does not find the case (404)", (await planOf({ forms: ["IMM 5257"], subject: P }, m3.FIRM_READERS.solo)).status === 404);
  ok("C7.5 fail: a client cannot run a review (403)", (await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay" }, m3.CLIENT)).status === 403);
  let r = await planOf({ forms: [], subject: P });
  ok("C7.5 fail: no form named is refused on the field (400)", r.status === 400 && JSON.stringify(r.body).includes("Choose a form to review"), r.body);
  r = await planOf({ forms: ["IMM 5257"], subject: "nope" });
  ok("C7.5 fail: a person that is not an id is refused on the field (400)", r.status === 400, r.status);
  r = await planOf({ forms: ["IMM 5257"], subject: c.caseSubject });
  ok("C7.5 fail: the case itself is not a person whose form is reviewed (422)", r.status === 422 && /person on this case/.test(JSON.stringify(r.body)), r.body);
  r = await planOf({ forms: ["IMM 9999"], subject: P });
  ok("C7.5 fail: a form that is not this person's is refused in words (422)", r.status === 422 && /not one of Sample Client A's forms/.test(JSON.stringify(r.body)), r.body);
  const plan = (await planOf({ forms: ["IMM 5257"], subject: P })).body as Plan;
  ok("C7.5 pass: the same values on another case give the same sheet, so the saved run is found (keyed on edition and values, not the case or the PDF)", plan.replay_available === true && plan.forms[0].sheet_sha256 === plan0.forms[0].sheet_sha256 && plan.forms[0].saved.files.length === 2, plan.forms[0]);
  ok("C7.5 made-up runs are said on the card (made_up, its words, the file names)", plan.made_up === true && /Made-up test runs/.test(plan.made_up_words ?? "") && plan.forms[0].saved.made_up && plan.forms[0].saved.files.every((x) => x.startsWith("made-up-review-runs/")), plan);
  ok("C7.5 the made-up switch counts only on an isolated copy (STUDIO_VAR set)", (() => { const was = process.env.STUDIO_VAR, sw = process.env.STUDIO_MADE_UP_REVIEW_RUNS; process.env.STUDIO_MADE_UP_REVIEW_RUNS = "1"; delete process.env.STUDIO_VAR; const off = !madeUpRuns(); process.env.STUDIO_VAR = "/x"; const on = madeUpRuns(); if (was === undefined) delete process.env.STUDIO_VAR; else process.env.STUDIO_VAR = was; if (sw === undefined) delete process.env.STUDIO_MADE_UP_REVIEW_RUNS; else process.env.STUDIO_MADE_UP_REVIEW_RUNS = sw; return off && on; })());

  // ── Live, the plan checksum, replay ──
  const findings = async (q = "?source=ai") => ((await call("GET", `/runtime/cases/${c.id}/findings${q}`, undefined, officer)).body?.findings ?? []) as F[];
  const runAs = (body: Record<string, unknown>, actor = officer) => call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, ...body }, actor);
  r = await runAs({ mode: "live", planSha256: plan.plan_sha256 });
  ok("C7.5 fail (P-227, P-295): Live is refused while live AI is off (409), in words, nothing added", r.status === 409 && /A live review needs approval first, with its cost stated/.test(JSON.stringify(r.body)) && (await findings()).length === 0, r.body);
  r = await runAs({ mode: "replay", planSha256: "0".repeat(64) });
  ok("C7.5 fail: a run on a run card that is not the one now (another checksum) is refused (409), nothing added", r.status === 409 && /Look at the run card again/.test(JSON.stringify(r.body)) && (await findings()).length === 0, r.body);
  r = await runAs({ mode: "replay", planSha256: plan.plan_sha256 });
  let fs = await findings();
  const fa = fs.find((x) => x.field === a.fact), fb = fs.find((x) => x.field === b.fact);
  ok("C7.5 pass: a Saved run adds the saved findings at US$0, each Replayed, on the person's filing, with its run id", r.status === 201 && r.body?.cost_usd === 0 && r.body?.added === 2 && fs.length === 2 && fs.every((x) => x.replayed && x.source === "ai" && x.form === "IMM 5257" && !!x.filing) && Number(sql(`select count(distinct run_id) from review_finding where case_id='${c.id}' and source='ai' and run_id is not null`)) === 1, { body: r.body, fs });
  ok("C7.5 P-121 pass: the fact both rounds raised with one severity is High, with both rounds' reasons", fa?.agreement === "high" && fa.severity === "MAJOR" && fa.reasons.length === 2 && /^Round 1: MAJOR/.test(fa.reasons[0]) && /^Round 2 \(blind checker\): MAJOR · Made-up checker reason/.test(fa.reasons[1]), fa);
  ok("C7.5 P-121 fail: the fact only one round raised is Low, with both rounds' reasons", fb?.agreement === "low" && fb.reasons.length === 2 && /^Round 1: MINOR/.test(fb.reasons[0]) && /^Round 2 \(blind checker\): raised nothing/.test(fb.reasons[1]), fb);
  ok("C7.5 AG-11-70 fail: the checker's finding whose quote is not on the form is dropped, with the reason, never added", (r.body?.forms?.[0]?.dropped ?? []).some((d: { why: string }) => /not in what the form says/.test(d.why)) && !fs.some((x) => x.quote.includes("not on this form")), r.body?.forms?.[0]?.dropped);
  ok("C7.5 AG-11-70: a box a round could not judge is listed with why and the round, never guessed", (r.body?.forms?.[0]?.unreadable ?? []).some((u: { box: string; round: string }) => u.box === "Made-up unreadable box" && /Round 2/.test(u.round)), r.body?.forms?.[0]?.unreadable);
  const rd = m3.readinessOf((await m3.prepare(c.id)).p, fa?.filing ?? undefined) as { warns?: { code: string; words?: string }[]; blocks?: { code: string }[] } | undefined;
  ok("C7.5 P-71, P-168: on Ready to file each open AI finding is a warning saying it is the AI review's, with its agreement and quote; never a block", (rd?.warns ?? []).filter((w) => w.code === "finding").some((w) => /the AI review \(High\) flags what the form says, “/.test(w.words ?? "")) && (rd?.warns ?? []).some((w) => /the AI review \(Low: the two rounds disagree\)/.test(w.words ?? "")) && !(rd?.blocks ?? []).some((x) => x.code === "finding"), rd?.warns?.filter((w) => w.code === "finding"));
  ok("C7.5 no ai_batch row and no model call (US$0)", sql("select count(*) from ai_batch") === spend0);

  // ── break M1: a run id runs once, one after the other and at the same moment ──
  const rid = "11111111-2222-4333-8444-555555555555";
  const once1 = await runAs({ mode: "replay", runId: rid }), once2 = await runAs({ mode: "replay", runId: rid });
  ok("C7.5 break M1 fail: the same run id sent again after it ran (even when it added nothing) is refused (409), nothing runs", once1.status === 201 && once2.status === 409 && /started already/.test(JSON.stringify(once2.body)) && Number(sql(`select count(*) from audit_event where entity_key='${c.id}' and action='reviewed' and detail->>'run'='${rid}'`)) === 1, [once1.status, once2.status]);
  const rid2 = "11111111-2222-4333-8444-666666666666";
  const twin = await Promise.all([runAs({ mode: "replay", runId: rid2 }), runAs({ mode: "replay", runId: rid2 })]);
  ok("C7.5 break M1/M2 fail: the same run id sent twice at once runs once (claimed before the first wait); the other is refused (409)", twin.map((x) => x.status).sort().join() === "201,409" && Number(sql(`select count(*) from audit_event where entity_key='${c.id}' and action='reviewed' and detail->>'run'='${rid2}'`)) === 1, twin.map((x) => x.status));
  const rUp = await runAs({ mode: "replay", runId: rid.toUpperCase() });
  ok("C7.5 review n2 fail: the same run id in upper case is the same run (409), never a slot of its own", rUp.status === 409, rUp.status);
  ok("C7.5 review n3: a Saved run reports both rounds read (the steps show what ran)", once1.body?.forms?.[0]?.rounds === 2, once1.body?.forms?.[0]);
  const l5257 = (plan.forms[0] as unknown as { lines: { value: string }[] }).lines;
  ok("C7.5 review n1: no IMM 5257 value keeps the form's required mark (\"* No\")", !l5257.some((x) => /^\*/.test(x.value)), l5257.filter((x) => /^\*/.test(x.value)));
  ok("C7.5 break m: a plan or a Saved run leaves no copy of the answers on disk (the sheet file is written only for a live run)", !existsSync(join(SOLUTION, plan.forms[0].sheet)), plan.forms[0].sheet);

  // ── dismiss, again, at once ──
  await call("POST", `/runtime/findings/${fb!.id}/dismiss`, { reason: "Not relevant (Sample)" }, officer);
  r = await runAs({ mode: "replay" });
  fs = await findings();
  ok("C7.5 pass: a dismissed AI finding is not raised again on the next run (same person, form, fact and quote)", r.status === 201 && r.body?.added === 0 && r.body?.forms?.[0]?.kept === 2 && fs.length === 2 && fs.find((x) => x.id === fb!.id)?.state === "dismissed", { body: r.body, fs });
  const both = await Promise.all([runAs({ mode: "replay" }), runAs({ mode: "replay" })]);
  ok("C7.5 pass: two runs at once add each finding once (one lock per case)", both.every((x) => x.status === 201) && (await findings()).length === 2, both.map((x) => x.body?.added));

  // ── the values change: no saved run of them; a made-up run of the new values resolves what left the form ──
  const newValue = a.value === "Canada" ? "France" : "Canada";
  await m3.answer(c.id, P, a.fact!, newValue); await m3.confirmAll(c.id, P);
  const plan2 = (await planOf({ forms: ["IMM 5257"], subject: P })).body as Plan;
  r = await runAs({ mode: "replay" });
  ok("C7.5 fail: changed values have no saved run: Saved is refused (409) in words (No saved review of this form edition with these values yet.), US$0, nothing changed", plan2.replay_available === false && plan2.forms[0].sheet_sha256 !== plan.forms[0].sheet_sha256 && r.status === 409 && /No saved review/.test(JSON.stringify(r.body)) && Number(sql(`select count(*) from review_finding where case_id='${c.id}' and source='ai'`)) === 2, r.body);
  writeMadeUp("b", inputsOf(plan2), { form_edition: plan2.forms[0].edition, findings: [], unreadable: [] }, { form_edition: plan2.forms[0].edition, findings: [], unreadable: [] });
  r = await runAs({ mode: "replay" });
  fs = await findings();
  ok("C7.5 pass: the finding whose quoted words left the form is resolved by the rules (on read, before this run), the dismissed one stays dismissed, and a run of the new values adds nothing", r.status === 201 && r.body?.added === 0 && fs.find((x) => x.id === fa!.id)?.state === "resolved" && sql(`select resolved_by from review_finding where id='${fa!.id}'`) === "rules" && fs.find((x) => x.id === fb!.id)?.state === "dismissed", { body: r.body, fs: fs.map((x) => [x.field, x.state]) });

  // ── a stale AI finding resolves on read (challenge M6): the quoted value changes, no run needed ──
  const { c: c3, P: P3 } = await packLikeCase();
  const plan3 = (await call("POST", `/runtime/cases/${c3.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P3 })).body as Plan;
  r = await call("POST", `/runtime/cases/${c3.id}/review-runs`, { forms: ["IMM 5257"], subject: P3, mode: "replay", planSha256: plan3.plan_sha256 });
  const f3 = ((await call("GET", `/runtime/cases/${c3.id}/findings?source=ai`)).body?.findings ?? []) as F[];
  await m3.answer(c3.id, P3, a.fact!, newValue); await m3.confirmAll(c3.id, P3);
  const after3 = ((await call("GET", `/runtime/cases/${c3.id}/findings?source=ai`)).body?.findings ?? []) as F[];
  ok("C7.5 pass (challenge M6): once the form no longer says what an AI finding quoted, reading the findings resolves it by the rules (US$0); the others stay", r.status === 201 && f3.length === 2 && after3.find((x) => x.field === a.fact)?.state === "resolved" && after3.find((x) => x.field === b.fact)?.state === "open", after3.map((x) => [x.field, x.state]));

  // ── review M1: IMM 5707 reads in words, and a row about someone else says whose it is ──
  const p5707 = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5707"], subject: P });
  const l5707 = (p5707.body?.forms?.[0]?.lines ?? []) as { box: string; caption: string; fact: string | null; value: string }[];
  ok("C7.5 review M1 pass: IMM 5707's choices read as their words (marital status, Yes/No), never a bare code", p5707.status === 200 && l5707.some((x) => x.fact === "person.marital_status" && /[A-Za-z]{4}/.test(x.value)) && !l5707.some((x) => /^\d$/.test(x.value)), l5707.filter((x) => /^\d$/.test(x.value) || x.fact === "person.marital_status"));
  ok("C7.5 review M1 pass: a row about a relative names whose it is; the person's own rows do not", l5707.some((x) => /parent 1: Date of birth/.test(x.caption)) && l5707.some((x) => x.caption === "Date of birth"), l5707.filter((x) => x.fact === "person.date_of_birth").map((x) => x.caption));
  ok("C7.5 review M1: a tick box reads Ticked or Not ticked, and a box with no printed caption names itself", l5707.filter((x) => /form field "/.test(x.caption)).every((x) => /^(Not )?[Tt]icked$|^[^0-9]/.test(x.value)), l5707.filter((x) => /form field "/.test(x.caption)));

  // ── audit, stop (readiness: pack step C7.5-9 above) ──
  const audit = sql(`select string_agg(summary || ' ' || coalesce(detail::text, ''), ' | ') from audit_event where entity_key='${c.id}' and action='reviewed'`) ?? "";
  ok("C7.5 audit: each run is one line naming the forms, the mode and the cost; never a value, a quote or a reason", /ran the independent review of IMM 5257/.test(audit) && /Saved \(made-up test run\), US\$0\.00/.test(audit) && !audit.includes(a.value) && !audit.includes("Made-up test finding") && !audit.includes("Round 1"), audit.slice(0, 600));
  ok("C7.5 Stop fail: a run that is not going is not found (404); a client is refused", (await call("POST", `/runtime/review-runs/00000000-0000-4000-8000-000000000000/stop`, {}, officer)).status === 404 && (await call("POST", `/runtime/review-runs/nope/stop`, {}, m3.CLIENT)).status !== 200);

  // ── the job of a live run, admitted by the guarded launcher (stub pass, US$0), as check_c91_impact_ai.ts does ──
  const CANARY = join(PROTOTYPE, "p2", "screening", "canary-digest.json"), STUBS = join(RUNS, "stub-pass"), JOBS = join(PROTOTYPE, "p2", "jobs");
  const canary = existsSync(CANARY) ? readFileSync(CANARY, "utf8") : null;
  const stubsBefore = new Map((existsSync(STUBS) ? readdirSync(STUBS) : []).map((x) => [x, readFileSync(join(STUBS, x))]));
  try {
    // A live run writes the sheet the launcher reads (review-runs.ts writeSheet); here the check writes the same text.
    writeFileSync(join(SOLUTION, plan0.forms[0].sheet), sheetText({ contract: "review-sheet/v1", form_edition: plan0.forms[0].edition, fields: plan0.forms[0].lines }));
    for (const isCheck of [false, true]) {
      const job = roundJob(FORM_REVIEW, isCheck, { trail: plan0.forms[0].edition, contextKey: "edition:IMM 5257:09-2023", inputs: inputsOf(plan0), batchId: `c75check${process.pid}` });
      writeFileSync(join(JOBS, `${job.job_id}.json`), JSON.stringify(job, null, 1) + "\n");
      const before = new Set(readdirSync(RUNS));
      const stub = spawnSync(process.execPath, [join(PROTOTYPE, "p2", "launch.ts"), "--job", job.job_id, "--stub"], { cwd: join(SOLUTION, "..", ".."), encoding: "utf8", timeout: 120_000 });
      const made = readdirSync(RUNS).filter((x) => !before.has(x) && x.startsWith(job.job_id));
      let rec: { caller?: string; contract_valid?: boolean; drafting_run?: { status?: string; usage?: { cost_usd?: number } } } = {};
      try { rec = JSON.parse(readFileSync(join(RUNS, made[0]), "utf8")); } catch { /* reported below */ }
      for (const x of made) rmSync(join(RUNS, x), { force: true });
      rmSync(join(JOBS, `${job.job_id}.json`), { force: true });
      ok(`C7.5 P-227: the guarded launcher admits the ${isCheck ? "checker" : "first"} round's job (the inventory and the review sheet, the edition known) in a stub pass, US$0, run cap US$${job.settings.budget_usd}`, stub.status === 0 && rec.caller === "stub" && rec.contract_valid === true && rec.drafting_run?.status === "completed" && (rec.drafting_run?.usage?.cost_usd ?? 0) === 0 && job.settings.budget_usd * 2 <= 5, { exit: stub.status, out: stub.stdout?.slice(-300), status: rec.drafting_run?.status });
    }
  } finally {
    rmSync(join(SOLUTION, plan0.forms[0].sheet), { force: true });
    if (canary !== null) writeFileSync(CANARY, canary);
    for (const x of existsSync(STUBS) ? readdirSync(STUBS) : []) { const was = stubsBefore.get(x); if (was === undefined) rmSync(join(STUBS, x), { force: true }); else writeFileSync(join(STUBS, x), was); }
  }
  process.exitCode = summary() ? 1 : 0;
})();
