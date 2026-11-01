// C4.7 (P-76, P-121, P-130 step 6, P-149 one door; forms lane, swarm builder B4): AI drafts a combination's
// pre-qualification picks with a reason per pick into the one review queue; a person accepts or removes each. A passing
// and a failing case per rule, through the API on an isolated copy with the sample loaded (Work permit, family: Guide
// 5487). Saved AI answers are written for this check into p2/runs and removed after; AI now runs on the stand-in launcher
// (tests/fixtures/fake-launch.mjs, P-192). NO model call: US$0.
//   R1 PQR ⊂ SQR (a question asks it, a prospect can answer it, not ticked) · R2 quote in the guide · R3 a reason in words
//   R4 Ready only when both rounds pick it · R5 one item per person and fact; words tied to exactly one question
//   Q1 accept writes the tick through the queue (origin AI) · Q2 remove needs a reason, nothing ticked · Q3 Undo restores
//   Q4 bulk accept for Ready only · Q5 roles · P plan first (cost, plan checksum) · L live only with the switch
//   zsh studio/tools/isolated.sh forms_c47 4461 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_forms_c47_pqr_picks.ts 4461 xr_studio_forms_c47
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4461), DB = process.argv[3] ?? "xr_studio_forms_c47", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", ".."), RUNS = join(SOLUTION, "prototype", "p2", "runs"), PROMPTS = join(SOLUTION, "prototype", "p2", "prompts");
const VAR = join(STUDIO, "var", `isolated-${NAME}`);
const log: any[] = []; let pass = 0, fail = 0; const written: string[] = [];
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? r.body?.note ?? "");
const QUOTE = "You must show the officer that you are eligible under Canada’s Immigration law and that you will be in Canada for a temporary stay.";
const pick = (asks: string, why = "The officer tests it to decide eligibility, so a prospect is asked it first.", quote = QUOTE, role = "principal") => ({ role, asks, quote, why });

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`), lm = sql(`select id from combination where combination_key='lm.high_wage'`);
  const plan = (id: string, mode: string, actor = "user-A") => call("POST", `/combinations/${id}/pqr-picks/plan`, { mode }, actor);
  const draft = async (id: string, mode: string, actor = "user-A") => { const p = await plan(id, mode); return call("POST", `/combinations/${id}/pqr-picks/draft`, { mode, planSha256: p.body?.plan_sha256 }, actor); };
  const waiting = (origin: string) => sql(`select count(*) from proposal_item where combination_id='${wp}' and kind='pqr_pick' and status='waiting' and origin='${origin}'`);
  const item = (key: string) => sql(`select id || '|' || confidence || '|' || agreement || '|' || status from proposal_item where combination_id='${wp}' and kind='pqr_pick' and identity_key='${key}' order by created_at desc limit 1`).split("|");
  const tick = (key: string) => sql(`select status || '|' || origin || '|' || prequalification || '|' || coalesce(reason,'') from fact_source where combination_id='${wp}' and lineage_key='${key}' order by version desc limit 1`);

  // ---------------------------------------------------------------- P: the plan first, with its cost
  let r = await plan(wp, "rules");
  ok("C4.7 P pass: rules only states its steps, no AI and US$0 before anything runs", r.status === 200 && r.body.totals.worst_usd === 0 && r.body.steps.every((s: any) => !s.uses_ai) && r.body.candidates > 0 && /^[0-9a-f]{64}$/.test(r.body.plan_sha256), r.body?.totals);
  r = await call("POST", `/combinations/${wp}/pqr-picks/draft`, { mode: "rules", planSha256: "0".repeat(64) });
  ok("C4.7 P fail: a run whose plan was not looked at (another checksum) is refused in words (409)", r.status === 409 && /plan again/.test(words(r)), words(r));
  r = await plan(wp, "fast");
  ok("C4.7 P fail: an unknown way is refused in words (400)", r.status === 400 && /rules only, saved AI answers or AI now/.test(words(r)), words(r));
  r = await plan("00000000-0000-4000-8000-000000000000", "rules");
  ok("C4.7 P fail: an unknown combination is refused in words (404)", r.status === 404 && /does not exist/.test(words(r)), words(r));
  r = await plan(lm, "replay");
  ok("C4.7 P fail: AI needs the combination's guide: with none linked it says how to get one (409)", r.status === 409 && /no IRCC guide/.test(words(r)), words(r));
  r = await plan(wp, "replay");
  ok("C4.7 P pass: saved AI answers name the guide the rounds read, at US$0", r.status === 200 && r.body.guide?.code === "Guide 5487" && r.body.totals.worst_usd === 0 && r.body.steps.some((s: any) => s.uses_ai), r.body?.guide);
  const guideFile: string = r.body.guide.file;

  // ---------------------------------------------------------------- Q5: roles
  r = await draft(wp, "rules", "user-B");
  ok("C4.7 Q5 fail: the approver (no author duty) cannot draft picks (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- rules only (the stand-in producer, now routed)
  r = await draft(wp, "rules");
  const nRules = Number(waiting("rules"));
  ok("C4.7 pass: rules only puts picks on the one review queue, each a contract item from the rules with its reason, US$0", r.status === 201 && r.body.proposed > 0 && r.body.proposed === nRules && r.body.usd === 0 && r.body.check === r.body.proposed, { proposed: r.body?.proposed, nRules });
  r = await draft(wp, "rules");
  ok("C4.7 R5 fail: drafting again does not put the same pick on the queue twice", r.status === 201 && r.body.proposed === 0 && r.body.already === nRules && Number(waiting("rules")) === nRules, r.body?.note);
  const q = (await call("GET", `/review/proposals?c=${wp}`)).body;
  ok("C4.7 pass: the picks show on To review under this combination", JSON.stringify(q).includes("pqr_pick"), Object.keys(q ?? {}));

  // ---------------------------------------------------------------- replay: none saved, then two saved answers
  r = await draft(wp, "replay");
  ok("C4.7 replay fail: with no saved AI answer for this guide and prompt it says so, proposes nothing, US$0", r.status === 201 && r.body.proposed === 0 && r.body.usd === 0 && /No saved AI answer/.test(r.body.note), r.body?.note);
  const inputs = [{ file: guideFile, sha256: sha(readFileSync(join(SOLUTION, guideFile))) }];
  const save = (check: boolean, picks: unknown[], combination = "wp.family") => {
    const f = `studio-pqr-picks${check ? "-check" : ""}-c47-test-live-20261101t120000000z-${check ? "c" : "d"}${Date.now().toString(36)}.json`;
    mkdirSync(RUNS, { recursive: true });
    writeFileSync(join(RUNS, f), JSON.stringify({ caller: "live", contract_valid: true, launch_evidence: { template_sha256: sha(readFileSync(join(PROMPTS, check ? "pqr-picks-check.v1.md" : "pqr-picks.v1.md"))) }, drafting_run: { status: "completed", inputs: { official_files: inputs, combination }, usage: { cost_usd: 0.4 } }, raw_output: JSON.stringify({ picks, unresolved: [{ passage: "be law-abiding", reason: "Two facts in one line." }] }) }));
    written.push(join(RUNS, f));
  };
  // Another combination's saved answer is never replayed here.
  save(false, [pick("Date of birth")], "vv.single"); save(true, [pick("Date of birth")], "vv.single");
  r = await draft(wp, "replay");
  ok("C4.7 replay fail: a saved answer of another combination is never replayed for this one", r.status === 201 && r.body.proposed === 0 && /No saved AI answer/.test(r.body.note), r.body?.note);
  // Reject the rules' picks first, so the AI's picks are not already waiting (one item per person and fact).
  const ids = sql(`select string_agg(id::text, ',') from proposal_item where combination_id='${wp}' and kind='pqr_pick' and status='waiting'`).split(",");
  r = await call("POST", "/review/proposals/decide", { ids, action: "reject", reason: "Cleared for the AI's reading (test)." });
  ok("C4.7 Q2 pass: Remove takes picks off the queue with a reason; nothing is ticked", r.status === 201 || r.status === 200 ? Number(waiting("rules")) === 0 && sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification`) === "0" : false, r.status);
  save(false, [pick("Date of birth"), pick("Country of citizenship"), pick("criminal history"), pick("uci"), pick("Favourite colour"), pick("Country of birth", "Asked first.", "A sentence that is not in the guide at all."), pick("Marital status", "x")]);
  save(true, [pick("Date of birth", "The guide tests age-related eligibility."), pick("Criminal history")]);
  r = await draft(wp, "replay");
  const body = r.body;
  ok("C4.7 replay pass: the saved answers replay at US$0 and name their run files; nothing is ticked yet", r.status === 201 && body.from === "replay" && body.usd === 0 && body.run_files.length === 2 && sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification`) === "0", { from: body?.from, files: body?.run_files });
  const dob = item("principal|person.date_of_birth"), cit = item("principal|person.citizenship"), crim = item("principal|person.criminal_history");
  ok("C4.7 R4 pass: a pick both rounds make is Ready to accept (agreed)", dob[1] === "ready" && dob[2] === "agreed" && crim[1] === "ready", { dob, crim });
  ok("C4.7 R4 fail: a pick only one round makes is Decide, with the reason in words", cit[1] === "decide" && cit[2] === "one_round" && /Only the first reading/.test(sql(`select reason from proposal_item where id='${cit[0]}'`)), cit);
  ok("C4.7 R5 pass: words tie to exactly one question (\"criminal history\" → the fact person.criminal_history)", crim[0]?.length === 36, crim);
  ok("C4.7 R1 fail: a case officer's fact is left out with the reason (a prospect cannot answer it)", body.dropped.some((d: any) => d.asks === "uci" && /case officer/.test(d.why)), body.dropped);
  ok("C4.7 R1/R5 fail: a fact no question asks is left out, never guessed", body.dropped.some((d: any) => d.asks === "Favourite colour" && /No question/.test(d.why)));
  ok("C4.7 R2 fail: a pick whose sentence is not in the guide is left out with the reason", body.dropped.some((d: any) => d.asks === "Country of birth" && /not in Guide 5487/.test(d.why)));
  ok("C4.7 R3 fail: a pick with no reason in words is left out", body.dropped.some((d: any) => d.asks === "Marital status" && /reason in words/.test(d.why)));
  ok("C4.7 R2 pass: each pick keeps the guide's sentence, its file and the reason a person reads", (() => { const x = JSON.parse(sql(`select json_build_object('s', source, 'p', payload, 'o', origin, 'b', basis) from proposal_item where id='${dob[0]}'`)); return x.s.quote === QUOTE && x.s.file === guideFile && x.s.quoteFound === true && x.p.reason.length >= 3 && x.o === "ai" && x.b === "SAMPLE"; })());
  ok("C4.7 passages the rounds could not turn into one fact are listed", body.unresolved.length === 1, body.unresolved);
  const view = (await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${wp}`)}`)).body;
  const shown = [...(view?.group?.bands?.ready ?? []), ...(view?.group?.bands?.decide ?? []), ...(view?.bands?.ready ?? []), ...(view?.bands?.decide ?? [])].filter((x: any) => x.kind === "pqr_pick");
  ok("C4.7 To review pass: each pick reads in words with its reason (\"Ask in pre-qualification: Date of birth (Principal applicant)\")", shown.some((x: any) => x.title === "Ask in pre-qualification: Date of birth (Principal applicant)" && x.meaning === "The officer tests it to decide eligibility, so a prospect is asked it first." && x.source?.quote === QUOTE), shown.map((x: any) => x.title));
  ok("C4.7 To review fail: no pick shows a field key or a role key to a person", shown.length > 0 && shown.every((x: any) => !/\b[a-z_]+\.[a-z_]+\b|principal\b/.test(x.title)), shown.map((x: any) => x.title));

  // ---------------------------------------------------------------- Q4, Q1, Q3, Q5 through the queue
  r = await call("POST", "/review/proposals/decide", { ids: [dob[0], cit[0]], action: "accept" });
  ok("C4.7 Q4 fail: a Decide pick cannot be accepted together with others; nothing was accepted (409)", r.status === 409 && /Only Ready items/.test(words(r)) && tick("principal|person.date_of_birth") === "", words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [dob[0]], action: "accept" }, "user-C");
  ok("C4.7 Q5 fail: a content reviewer without the author duty cannot accept a pick (403); nothing ticked", r.status === 403 && tick("principal|person.date_of_birth") === "" && item("principal|person.date_of_birth")[3] === "waiting", r.status);
  r = await call("POST", "/review/proposals/decide", { ids: [dob[0], crim[0]], action: "accept" });
  const batch = r.body?.batchId;
  ok("C4.7 Q1 pass: accepting Ready picks writes each tick as a draft, origin AI, with the pick's reason", (r.status === 201 || r.status === 200) && tick("principal|person.date_of_birth") === "DRAFT|AI_PROPOSAL|true|The officer tests it to decide eligibility, so a prospect is asked it first." && tick("principal|person.criminal_history").startsWith("DRAFT|AI_PROPOSAL|true"), tick("principal|person.date_of_birth"));
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  ok("C4.7 Q1 pass: the Questionnaires tab now shows both as pre-qualification questions", fs.counts.prequalification === 2 && fs.facts.some((f: any) => f.fact === "person.date_of_birth" && f.role === "principal" && f.prequalification), fs.counts);
  r = await call("POST", "/review/proposals/decide", { ids: [dob[0]], action: "accept" });
  ok("C4.7 Q1 fail: a pick already decided is refused (409)", r.status === 409, words(r));
  r = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-B");
  ok("C4.7 Q3 fail: only the person who decided can undo it (403)", r.status === 403, r.status);
  r = await call("POST", `/review/proposals/undo/${batch}`);
  ok("C4.7 Q3 pass: Undo takes both ticks back and the picks wait again", (r.status === 201 || r.status === 200) && tick("principal|person.date_of_birth") === "" && item("principal|person.date_of_birth")[3] === "waiting" && item("principal|person.criminal_history")[3] === "waiting", { status: r.status, t: tick("principal|person.date_of_birth") });
  // A person's own draft change before the accept comes back with Undo; a change after the accept blocks Undo.
  const ver = (key: string) => Number(sql(`select coalesce(max(version),0) from fact_source where combination_id='${wp}' and lineage_key='${key}'`));
  r = await call("PUT", `/combinations/${wp}/fact-sources/principal/person.date_of_birth`, { reason: "A person's own note (test).", version: ver("principal|person.date_of_birth") });
  const own = tick("principal|person.date_of_birth");
  r = await call("POST", "/review/proposals/decide", { ids: [dob[0]], action: "accept" });
  const b2 = r.body?.batchId;
  r = await call("POST", `/review/proposals/undo/${b2}`);
  ok("C4.7 Q3 pass: Undo puts back the person's own draft row the accept replaced", own.startsWith("DRAFT|HUMAN|false") && tick("principal|person.date_of_birth") === own, { own, now: tick("principal|person.date_of_birth") });
  r = await call("POST", "/review/proposals/decide", { ids: [crim[0]], action: "accept" });
  const b3 = r.body?.batchId;
  r = await call("PUT", `/combinations/${wp}/fact-sources/principal/person.criminal_history`, { prequalification: false, version: ver("principal|person.criminal_history") });
  if (r.status >= 300) ok("C4.7 setup: the tick changes by hand after the accept", false, words(r));
  r = await call("POST", `/review/proposals/undo/${b3}`);
  ok("C4.7 Q3 fail: once the tick was changed after the accept, Undo refuses in words and erases nothing (409)", r.status === 409 && /changed or released after it was accepted/.test(words(r)) && tick("principal|person.criminal_history").includes("|false|"), words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [cit[0]], action: "reject" });
  ok("C4.7 Q2 fail: Remove without a reason is refused in words (400)", r.status === 400 && /Say why/.test(words(r)), words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [cit[0]], action: "reject", reason: "Citizenship is asked in the client questionnaire." });
  ok("C4.7 Q2 pass: Remove with a reason; the fact is not ticked", (r.status === 201 || r.status === 200) && item("principal|person.citizenship")[3] === "rejected" && !tick("principal|person.citizenship").includes("|true|"), item("principal|person.citizenship"));
  // R1 at accept: a pick whose question was ticked meanwhile by hand is refused in the tick's own words.
  await call("POST", "/review/proposals/decide", { ids: [crim[0]], action: "reject", reason: "Reset for the next step (test)." });

  // ---------------------------------------------------------------- L: AI now, on the stand-in launcher only
  mkdirSync(VAR, { recursive: true });
  for (const f of ["fake-launch.log", "fake-launch.count"]) rmSync(join(VAR, f), { force: true });
  const rec = (picks: unknown[]) => ({ caller: "live", contract_valid: true, raw_output: JSON.stringify({ picks, unresolved: [] }), drafting_run: { status: "completed", usage: { cost_usd: 0 }, attempts: [{ n: 1, outcome: "ok" }] } });
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-pqr-picks-check": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: rec([pick("Country of citizenship")]) } }, "studio-pqr-picks": { stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: rec([pick("Country of citizenship")]) } } } }));
  r = await plan(wp, "live");
  ok("C4.7 L pass: AI now states its worst case before it runs", r.status === 200 && r.body.totals.worst_usd > 0 && r.body.live.approved === true, r.body?.totals);
  r = await draft(wp, "live");
  ok("C4.7 L pass: AI now runs a draft and a blind checker round (stub pass first) and both picks agree → Ready", r.status === 201 && r.body.from === "live" && r.body.proposed === 1 && r.body.ready === 1 && existsSync(join(VAR, "fake-launch.log")) && readFileSync(join(VAR, "fake-launch.log"), "utf8").trim().split("\n").length === 4, r.body?.note);
  // L fail: the same copy restarted without the switch: AI now is refused before anything runs, US$0, no live call.
  let said = "";
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", "STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs"], { cwd: join(SOLUTION, "..", ".."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e: any) { said = String(e?.stderr ?? e).slice(-400); }
  let up = false; for (let i = 0; i < 240 && !up; i++) { up = (await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).then((x) => x.status === 200, () => false)); if (!up) await new Promise((res) => setTimeout(res, 500)); }
  if (!up) throw new Error(`the copy did not come back after the restart: ${said}`);
  const calls = readFileSync(join(VAR, "fake-launch.log"), "utf8");
  r = await plan(wp, "live");
  const rp = await plan(wp, "rules");
  ok("C4.7 L fail: without the switch AI now is refused in words before anything runs (409); the plan says it is off", r.status === 409 && /waits for the founder's Go/.test(words(r)) && rp.body?.live?.approved === false, words(r));
  r = await call("POST", `/combinations/${wp}/pqr-picks/draft`, { mode: "live", planSha256: "0".repeat(64) });
  ok("C4.7 L fail: a live draft is refused (409) and the launcher is never asked", r.status === 409 && readFileSync(join(VAR, "fake-launch.log"), "utf8") === calls, r.status);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  for (const f of written) rmSync(f, { force: true });
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c47_pqr_picks.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
