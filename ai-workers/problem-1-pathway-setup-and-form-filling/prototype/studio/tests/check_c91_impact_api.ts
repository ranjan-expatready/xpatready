// C9.1 (row C9.1-AI; P-138, P-175, P-121, BR-12): Draft with AI on a held new edition, through the API, a passing and a
// failing case per rule. Setup: an empty library takes IMM 5476's 2021 edition, then Load sample six holds the 11-2025
// edition as new over it on Visitor visa (the comparison of DEMO.md row 17). Live AI is off for every step but one, where
// this copy restarts on the fake launcher (the server honours it only on an isolated copy) with the live switch, so no
// model is reached; the shared spend ledger is never changed. Saved runs written for this check are removed after. US$0.
//   zsh studio/tools/isolated.sh forms_c91 4451 start && tsx studio/tests/check_c91_impact_api.ts 4451 xr_studio_forms_c91
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { client, recorder } from "./runtime/api.ts";
import { RUNS } from "../api/src/rounds.ts";
import { impactPart } from "../api/src/impact-ai.ts";
import { C91, c91Jobs } from "../tools/c91-impact-job.ts";
import { answer, ctx, putBackReal, removeSaved, runRecord, SAVED, setAsideReal, step, writeSaved } from "./fixtures/c91-saved-run.ts";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_c91";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const VARDIR = join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc");
const n = (q: string) => Number(sql(q) || 0);
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
const restart = async (env: string[]) => {
  try { execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart", ...env], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return true; }
  catch { return until(async () => (await fetch(`http://localhost:${PORT}/api/session`).catch(() => null))?.status === 200, 120_000); }
};
const setup = async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(OFFICIAL, "previous-editions", "imm5476e-2021.pdf")))]), "imm5476e-2021.pdf");
  await fetch(`http://127.0.0.1:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  await call("POST", "/demo/load", { sample: "six" });
  return sql(`select id from intake_item where outcome = 'new_edition_held' and status = 'HELD' and code = 'IMM 5476' limit 1`);
};

const { changed, rows } = c91Jobs();
const written: string[] = [];
const saveRun = (name: string, rec: unknown) => { writeFileSync(join(RUNS, name), JSON.stringify(rec)); written.push(name); };
// The committed real saved run of this comparison is set aside while the rules are proved with this check's own runs.
setAsideReal(); process.on("exit", putBackReal);
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => process.exit(code));

(async () => {
  const ledgerBefore = ledger();
  try {
    const id = await setup();
    ok("setup: IMM 5476 11-2025 is held as a new edition over the library's 2021 edition, used by Visitor visa", id !== "" && n(`select count(*) from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5476'`) === 1, id);
    const props0 = n(`select count(*) from proposal_item`);
    let imp = (await call("GET", `/intake/held/${id}/impact`)).body;
    ok("C9.1 P-138 pass: the review offers Draft with AI for the 23 new and reworded boxes with its cost in words; opening it starts no AI", imp.ai.offer.boxes === 23 && /^Draft with AI \(about US\$\d+\.\d\d · at most US\$\d+\.\d\d\)/.test(imp.ai.offer.words) && imp.ai.saved === false && imp.ai.live.open === false && n(`select count(*) from drafting_job where kind = 'field_map_impact'`) === 0, imp.ai);
    ok("C9.1 P-32: the review names the combination that files IMM 5476 (Visitor visa) and lists sections, document types, rules and checks", imp.combinations.some((c: { label: string }) => c.label === "Visitor visa") && ["sections", "document_types", "rules", "checks"].every((k) => Array.isArray(imp.components[k])), imp.combinations);
    const q = (await call("GET", "/review-queue")).body.items.find((x: { kind: string; id: string }) => x.kind === "new_edition" && x.id === `held:${id}`);
    ok("C9.1 BR-12 pass: To review lists IMM 5476 as a newer edition (Review impact) with the combinations it touches, in its words and its list", q && /^A newer edition of a form in the library: .*; it touches Visitor visa\.$/.test(q.what) && q.next?.label === "Review impact" && JSON.stringify(q.combinations) === JSON.stringify(["Visitor visa"]), q);

    // P-32 with data (review Major 2): the 2021 edition's two reworded and two removed boxes are mapped to shared fields
    // that a rule, a check, a document line and a section question of Visitor visa read (seeded: the six has none), and
    // a decoy rule reads a field only an unchanged box fills. Test data, named c91.*.
    const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`), ws = sql(`select workspace_id from combination where id = '${vv}'`);
    const ed21 = sql(`select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5476' and e.edition_label like '%2021%' limit 1`);
    const [rw1, rw2] = rows.filter((x) => x.change === "reworded"), [rm1, rm2] = rows.filter((x) => x.change === "removed"), same = rows.find((x) => x.change === "unchanged")!;
    const box = (b: { dataPath: string; caption: string }, f: string) => `(gen_random_uuid(), '${ws}', '${ed21}', '${b.dataPath}', '${b.caption.replace(/'/g, "''")}', 'mapped', '${f}', 1, 'DRAFT', 'HUMAN', 'c91check')`;
    const cond = (f: string) => `'{"op":"eq","field":"${f}","value":true}'`;
    sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, caption, outcome, canonical_field_key, version, status, origin, updated_by) values ${[box(rw1, "c91.rep_name"), box(rw2, "c91.rep_uci"), box(rm1, "c91.rep_email"), box(rm2, "c91.rep_phone"), box(same, "c91.unchanged")].join(", ")};
      insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${vv}', 'c91_rule', ${cond("c91.rep_name")}, 'Ask for the representative letter', 'applicant', 1, 'DRAFT', 'HUMAN', 'c91check'), (gen_random_uuid(), '${ws}', '${vv}', 'c91_decoy', ${cond("c91.unchanged")}, 'A rule on an unchanged box', 'applicant', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into check_def (id, workspace_id, combination_id, check_key, check_group, severity, predicate_json, message, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${vv}', 'c91_check', 'c91', 'error', ${cond("c91.rep_uci")}, 'The representative UCI is given', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into document_type (id, workspace_id, document_type_key, name, category, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', 'c91_letter', 'Representative letter (test)', 'other', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into document_requirement (id, workspace_id, combination_id, lineage_key, document_type_key, attach_mode, predicate_json, applies_to_roles, provided_by, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${vv}', 'c91_doc', 'c91_letter', 'ANSWER_CONDITIONAL', ${cond("c91.rep_email")}, 'applicant', 'applicant', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into logical_section (id, workspace_id, section_key, title, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', 'c91_rep', 'Representative (test)', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into section_question (id, workspace_id, lineage_key, section_key, canonical_field_key, display_order, repeats, tier, collected_from, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', 'c91_q', 'c91_rep', 'c91.rep_phone', 1, 'no', 'core', 'applicant', 1, 'DRAFT', 'HUMAN', 'c91check');
      insert into sqr_section_selection (id, workspace_id, combination_id, section_key, section_order) values (gen_random_uuid(), '${ws}', '${vv}', 'c91_rep', 99);`);
    const withData = (await call("GET", `/intake/held/${id}/impact`)).body;
    const comp = withData.components as Record<string, { key: string; label: string; combination: string; why: string; boxes: string[] }[]>;
    const one = (k: string, key: string) => comp[k].find((x) => x.key === key);
    ok("C9.1 P-32 pass (with data): a reworded box's rule and check, a removed box's document line and section are listed, each in Visitor visa, with its name", one("rules", "c91_rule")?.label === "Ask for the representative letter" && one("checks", "c91_check")?.label === "The representative UCI is given" && one("document_types", "c91_letter")?.label === "Representative letter (test)" && one("sections", "c91_rep")?.label === "Representative (test)" && Object.values(comp).flat().every((x) => x.combination === "Visitor visa"), comp);
    ok("C9.1 P-32 pass (with data): each says why in words: which box, old and new caption or removed, which field", /reworded in .*11-2025/.test(one("rules", "c91_rule")?.why ?? "") && one("rules", "c91_rule")!.why.includes(rw1.was!.slice(0, 40)) && /removed in/.test(one("document_types", "c91_letter")?.why ?? "") && one("sections", "c91_rep")!.why.includes("c91.rep_phone") && one("sections", "c91_rep")!.boxes[0] === rm2.dataPath, { rule: one("rules", "c91_rule")?.why, doc: one("document_types", "c91_letter")?.why });
    ok("C9.1 P-32 fail (with data): a rule that reads a field only an unchanged box fills is not listed", !one("rules", "c91_decoy") && comp.rules.length === 1, comp.rules.map((x) => x.key));

    // P-175: live refused without the switch, in plain words, US$0, nothing proposed (the default of a click is live).
    let r = await call("POST", `/intake/held/${id}/impact/draft`, {});
    ok("C9.1 fail (break m1): a request that names no mode is refused (400), never taken as a paid call", r.status === 400 && /"replay".*"live"/.test(words(r)), words(r));
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "live" });
    ok("C9.1 P-175 fail: without the live switch Draft with AI is refused in plain words with its cost; US$0, no job, nothing proposed", r.status === 409 && /live AI is off/.test(words(r)) && /US\$/.test(words(r)) && n(`select count(*) from drafting_job where kind = 'field_map_impact'`) === 0 && n(`select count(*) from proposal_item`) === props0, words(r));
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" }, "user-B");
    ok("C9.1 fail: only an author drafts (the approver is refused, 403)", r.status === 403, r.status);
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "now" });
    ok("C9.1 fail: an unknown mode is refused in words (400)", r.status === 400 && /replay|live/.test(words(r)), words(r));
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    ok("C9.1 fail: Saved with no saved run of this comparison is refused, saying what a run would cost; nothing proposed", r.status === 409 && /No saved AI run for this comparison/.test(words(r)) && n(`select count(*) from proposal_item`) === props0, words(r));

    // A saved run of another comparison of this edition (one box fewer) is out of date: never replayed.
    const other = impactPart(C91.held, changed.slice(1));
    saveRun(`${step.jobBase}-c91api-other-live-20261103t100000000z-c91api.json`, runRecord(false, [{ file: other.rel, sha256: other.sha256 }], answer));
    imp = (await call("GET", `/intake/held/${id}/impact`)).body;
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    ok("C9.1 fail: a saved run of another comparison is out of date (409, in words), nothing proposed", imp.ai.saved === false && /out of date/.test(imp.ai.saved_words) && r.status === 409 && /out of date/.test(words(r)) && n(`select count(*) from proposal_item`) === props0, words(r));

    // The saved run of exactly this comparison (draft and blind checker) replays at US$0 into proposals for a person.
    // Review Major 1 fail: the draft round of one saved run and a checker round of another run of the same comparison
    // are never paired: with no checker of its own run, the draft is used alone (each proposal waits as Decide).
    writeSaved();
    rmSync(join(RUNS, SAVED[1]), { force: true });
    saveRun(`${step.jobBase}-check-c91api-otherrun-live-20261103t100200000z-c91api.json`, runRecord(true, ctx.inputs, answer));
    imp = (await call("GET", `/intake/held/${id}/impact`)).body;
    ok("C9.1 P-138: a saved run of this comparison shows as Saved (US$0) before anything runs", imp.ai.saved === true && /US\$0/.test(imp.ai.saved_words), imp.ai.saved_words);
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    ok("C9.1 fail (review Major 1): a checker round of another saved run is not paired with this draft round; the draft is used alone, every proposal Decide", r.status < 300 && /from the draft round only/.test(String(r.body?.message)) && sql(`select string_agg(distinct confidence, ',') from proposal_item p join drafting_job j on j.id = p.run_id where j.kind = 'field_map_impact'`) === "decide", r.body?.message);
    // Round 2 Major A fail: two paid runs of the one committed job share a stem; the later run's draft (12:00, no checker)
    // never pairs with the earlier run's checker (10:05).
    sql(`delete from proposal_item where run_id in (select id from drafting_job where kind = 'field_map_impact'); delete from drafting_job where kind = 'field_map_impact'`);
    for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true });
    removeSaved();
    saveRun(`${step.jobBase}-c91api-paid-live-20261103t100000000z-runone.json`, runRecord(false, ctx.inputs, answer));
    saveRun(`${step.jobBase}-check-c91api-paid-live-20261103t100500000z-runone.json`, runRecord(true, ctx.inputs, answer));
    saveRun(`${step.jobBase}-c91api-paid-live-20261103t120000000z-runtwo.json`, runRecord(false, ctx.inputs, answer));
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    ok("C9.1 fail (round 2 Major A): a later run's draft is never paired with an earlier run's checker of the same job: the draft is used alone, every proposal Decide", r.status < 300 && /from the draft round only/.test(String(r.body?.message)) && sql(`select string_agg(distinct confidence, ',') from proposal_item p join drafting_job j on j.id = p.run_id where j.kind = 'field_map_impact'`) === "decide", r.body?.message);
    for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true });
    // Then the saved run with its own checker round, on a fresh comparison (the first result stays: one per comparison).
    sql(`delete from proposal_item where run_id in (select id from drafting_job where kind = 'field_map_impact'); delete from drafting_job where kind = 'field_map_impact'`);
    writeSaved();
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    const job = sql(`select id || '|' || mode || '|' || status || '|' || cost_usd from drafting_job where kind = 'field_map_impact'`) || '00000000-0000-0000-0000-000000000000';
    const props = sql(`select confidence || '|' || status || '|' || (payload::text) from proposal_item where run_id = '${job.split("|")[0]}'`).split("\n").filter(Boolean);
    ok("C9.1 pass (replay): proposals land on To review for a person, from both rounds, US$0, no live call", r.status < 300 && r.body.proposals === 3 && job.endsWith("|REPLAY|COMPLETED|0") && props.length === 3 && props.every((p) => p.split("|")[1] === "waiting"), { status: r.status, body: r.body, job });
    const reasonOf = (label: string) => sql(`select confidence || '|' || coalesce((select string_agg(x->>'why', ' ') from jsonb_array_elements(rules) x where x->>'rule' = 'quote_on_the_form'), '') from proposal_item where run_id = '${job.split("|")[0]}' and payload->>'label' like '${label}%'`);
    ok("C9.1 P-170: every evidence quote is looked for on the form: the proposal quoting words not on it waits as Decide and says so; a quoted one with no near library field reads Ready", /^decide\|/.test(reasonOf("Membership")) && /are not printed on this form edition/.test(reasonOf("Membership")) && /^ready\|/.test(reasonOf("Email")), { membership: reasonOf("Membership").slice(0, 200), email: reasonOf("Email").slice(0, 120) });
    imp = (await call("GET", `/intake/held/${id}/impact`)).body;
    ok("C9.1: the review shows the drafted proposals next to the changed boxes", imp.ai.drafted?.proposals === 3 && imp.ai.drafted.waiting === 3, imp.ai.drafted);
    r = await call("POST", `/intake/held/${id}/impact/draft`, { mode: "replay" });
    ok("C9.1 fail: a second click does not draft again (one result per comparison)", r.status < 300 && r.body.again === true && n(`select count(*) from drafting_job where kind = 'field_map_impact'`) === 1 && n(`select count(*) from proposal_item`) === props0 + 3, r.body);
    r = await call("POST", `/intake/held/${id}/reject`, { note: "check: set aside" }, "user-B");
    ok("C9.1 fail (break M4): setting the edition aside withdraws its waiting AI proposals; none can be accepted later", r.status < 300 && sql(`select string_agg(distinct p.status, ',') from proposal_item p join drafting_job j on j.id = p.run_id where j.kind = 'field_map_impact'`) === "rejected", { status: r.status, words: words(r) });
    ok("C9.1 (R-143): no live call so far; the spend ledger is unchanged", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && ledger() === ledgerBefore);

    // P-138 live, on the fake launcher (no model): the worst case is said first and must match what the person saw.
    for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true });
    removeSaved();
    writeFileSync(join(VARDIR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: runRecord(false, ctx.inputs, answer, 0.11) } }));
    rmSync(join(VARDIR, "fake-launch.count"), { force: true }); writeFileSync(join(VARDIR, "fake-launch.log"), "");
    const up = await restart(["STUDIO_AI_LIVE=approved", "STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs"]);
    const id2 = up ? await setup() : "";
    imp = id2 ? (await call("GET", `/intake/held/${id2}/impact`)).body : null;
    ok("setup: the copy restarted on the fake launcher with the live switch; Draft with AI is open", up && imp?.ai?.live?.open === true, imp?.ai?.live);
    r = await call("POST", `/intake/held/${id2}/impact/draft`, { mode: "live" });
    ok("C9.1 P-138 fail: a live click without the worst case the person saw is refused before anything runs (no launch)", r.status === 409 && /Look at the cost again/.test(words(r)) && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", words(r));
    r = await call("POST", `/intake/held/${id2}/impact/draft`, { mode: "live", expected_worst_usd: (imp?.ai?.offer?.at_most_usd ?? 0) + 1 });
    ok("C9.1 P-138 fail: a worst case other than the plan's is refused (the plan changed), nothing launched", r.status === 409 && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", words(r));
    r = await call("POST", `/intake/held/${id2}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    const log = readFileSync(join(VARDIR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { job: string; mode: string });
    const lj = sql(`select mode || '|' || status || '|' || cost_usd from drafting_job where kind = 'field_map_impact'`);
    ok("C9.1 pass (live, fake launcher): a stub pass before each live round, a draft round then a blind checker round, both on the part of the changed boxes; proposals for a person; the cost recorded", r.status < 300 && r.body.proposals === 3 && log.map((x) => x.mode).join(",") === "stub,live,stub,live" && log[1].job.startsWith(`${step.jobBase}-imm5476e`) && log[3].job.startsWith(`${step.jobBase}-check-imm5476e`) && lj === "LIVE|COMPLETED|0.22", { status: r.status, body: r.body, log, lj });
    // P-121: a live answer that cannot be used ends the run after the draft round (no checker spend), and the comparison
    // gets no second paid run from here.
    const id3 = await setup();
    writeFileSync(join(VARDIR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 0, record: { ...runRecord(false, ctx.inputs, { ...answer, form_edition: "IMM 5476 (11-2021)" }, 0.13) } } }));
    writeFileSync(join(VARDIR, "fake-launch.log"), "");
    imp = (await call("GET", `/intake/held/${id3}/impact`)).body;
    r = await call("POST", `/intake/held/${id3}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    const log3 = readFileSync(join(VARDIR, "fake-launch.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as { mode: string });
    const j3 = sql(`select mode || '|' || status || '|' || cost_usd from drafting_job where kind = 'field_map_impact'`);
    ok("C9.1 P-121 fail: an answer for another edition is never used; the run ends after the draft round (no checker call), its cost recorded, nothing proposed", r.status === 409 && /another form edition|could not be used|expected shape/.test(words(r)) && log3.map((x) => x.mode).join(",") === "stub,live" && j3 === "LIVE|FAILED|0.13" && n(`select count(*) from proposal_item p join drafting_job j on j.id = p.run_id where j.kind = 'field_map_impact'`) === 0, { status: r.status, words: words(r), log3, j3 });
    writeFileSync(join(VARDIR, "fake-launch.log"), "");
    r = await call("POST", `/intake/held/${id3}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    ok("C9.1 P-121 fail: a second paid run of the same comparison is refused in words, nothing launched", r.status === 409 && /already had a paid AI run \(counted at US\$0\.13\)/.test(words(r)) && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", words(r));
    // Break B1: a live run stopped by a restart is left FAILED with no cost recorded: it may have been sent, so it counts.
    const id4 = await setup();
    imp = (await call("GET", `/intake/held/${id4}/impact`)).body;
    sql(`insert into drafting_job (id, workspace_id, kind, mode, status, started_by, started_at, finished_at, message, detail) select gen_random_uuid(), workspace_id, 'field_map_impact', 'LIVE', 'FAILED', 'user-A', now(), now(), 'The server restarted while this ran.', '{"held":"${id4}","part":"${ctx.inputs[0].sha256}"}'::jsonb from intake_item where id = '${id4}'`);
    writeFileSync(join(VARDIR, "fake-launch.log"), "");
    r = await call("POST", `/intake/held/${id4}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    ok("C9.1 fail (break B1): after a live run stopped by a restart (no cost recorded) a second paid run is refused, nothing launched", r.status === 409 && /already had a paid AI run/.test(words(r)) && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", words(r));
    // Break M1: a demo reset clears the database, not the launcher's run records: a failed live run of this comparison
    // in p2/runs still counts, so the reset does not reopen a paid attempt.
    const id5 = await setup();
    saveRun(`${step.jobBase}-c91api-failed-live-20261103t100300000z-c91api.json`, { ...runRecord(false, ctx.inputs, answer, 0.13), contract_valid: false, raw_output: null, drafting_run: { status: "failed", usage: { cost_usd: 0.13 }, inputs: { official_files: ctx.inputs, combination: ctx.contextKey } } });
    imp = (await call("GET", `/intake/held/${id5}/impact`)).body;
    r = await call("POST", `/intake/held/${id5}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    ok("C9.1 fail (break M1): after a demo reset, the paid run recorded in p2/runs still counts: the offer is closed with why, and a click is refused, nothing launched", imp?.ai?.live?.open === false && /already had a paid AI run \(counted at US\$0\.13\)/.test(imp?.ai?.live?.why ?? "") && r.status === 409 && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", { live: imp?.ai?.live, words: words(r) });
    for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true });
    // Break M2: with a saved run of this comparison, a paid run is refused (use it at US$0), even with the live switch on.
    writeSaved();
    imp = (await call("GET", `/intake/held/${id5}/impact`)).body;
    r = await call("POST", `/intake/held/${id5}/impact/draft`, { mode: "live", expected_worst_usd: imp?.ai?.offer?.at_most_usd });
    ok("C9.1 fail (break M2): a saved run of this comparison closes the paid path: live refused, nothing launched; Saved is offered at US$0", imp?.ai?.saved === true && imp?.ai?.live?.open === false && r.status === 409 && /use it at US\$0/.test(words(r)) && readFileSync(join(VARDIR, "fake-launch.log"), "utf8") === "", { live: imp?.ai?.live, words: words(r) });
    removeSaved();
    // Round 2 Major B pass: a launcher record of a call refused at US$0 (the provider's usage limit) does not close the
    // paid path: the offer stays open.
    saveRun(`${step.jobBase}-c91api-limit-live-20261103t100400000z-c91api.json`, { ...runRecord(false, ctx.inputs, answer, 0), contract_valid: false, raw_output: null, drafting_run: { status: "failed", usage: { cost_usd: 0 }, attempts: [{ outcome: "refused_by_provider", error: "400 usage limit reached" }], inputs: { official_files: ctx.inputs, combination: ctx.contextKey } } });
    imp = (await call("GET", `/intake/held/${id5}/impact`)).body;
    ok("C9.1 pass (round 2 Major B): a call refused at US$0 leaves the paid path open (a refusal may be started again)", imp?.ai?.live?.open === true && imp?.ai?.live?.why === null, imp?.ai?.live);
    for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true });
    ok("C9.1 (R-143): the fake launcher reached no model; the shared spend ledger is unchanged", ledger() === ledgerBefore);
  } finally {
    for (const f of written) rmSync(join(RUNS, f), { force: true });
    removeSaved();
    rmSync(join(VARDIR, "fake-launch.json"), { force: true });
    await restart([]);
  }
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
