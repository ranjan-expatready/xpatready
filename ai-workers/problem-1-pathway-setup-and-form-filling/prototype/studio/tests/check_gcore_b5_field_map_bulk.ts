// G-CORE B5 (P-288 (2), P-121; C11.14 AT-4): field-map proposals on To review. With a checker round recorded (planted
// here as the paid runner would record it, as in check_gcore_b4_field_map_check.ts), IMM 5257's Ready field-map items
// (both rounds agree, rules pass) are ticked in bulk: "Accept selected" is the form-field page's Accept (the same
// choice, nothing in the library until the draft is applied), one Undo for the batch, each item re-checked on the server;
// Low, conflict and one-round items cannot be ticked and the box says why; a Ready new shared field cannot be ticked
// either (P-296 (1): only High reuse matches go together); every item still opens on its form-field page.
// A pass and a failing case per rule. No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_b5 4457 start && tsx studio/tests/check_gcore_b5_field_map_bulk.ts 4457 xr_studio_forms_b5
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkerJob, FIELD_MAP_CHECK } from "../api/src/field-map-check.ts";
import { roundJob, RUNS } from "../api/src/rounds.ts";
import { PROTOTYPE } from "../api/src/core.ts";
import { P121_WHY } from "../engine/agreement.ts";
import { bulkWhy, NEW_FIELD_ALONE } from "../api/src/proposals.ts";

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_b5";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor = "user-C"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

// The planted checker run: the draft's own answer with one field read as another kind of answer (a disagreement).
const DRAFT_FILE = "studio-fieldmap-imm5257e-live-20261021t060247723z.json", EDITION = "IMM 5257 (09-2023)";
const draft = JSON.parse(readFileSync(join(RUNS, DRAFT_FILE), "utf8"));
const answer = JSON.parse(draft.raw_output) as { canonical_fields: { id: string; value_type: string }[]; entries: { outcome: string; fact: string | null }[] };
const RETYPED = [...new Set(answer.entries.filter((e) => e.outcome === "mapped" && e.fact).map((e) => e.fact!))].find((k) => answer.canonical_fields.find((c) => c.id === k)?.value_type === "text")!;
const checkAnswer = { ...answer, canonical_fields: answer.canonical_fields.map((c) => (c.id === RETYPED ? { ...c, value_type: "date" } : c)) };
const j = checkerJob(draft, EDITION)!, job = roundJob(j.step, true, j.ctx);
const record = { caller: "live", contract_valid: true, raw_output: JSON.stringify(checkAnswer),
  drafting_run: { run_id: `${job.job_id}-live-test`, status: "completed", kind: "field_map", inputs: { combination: job.combination, official_files: job.inputs, configuration_version: "studio-add-form" }, usage: { cost_usd: 0, input_tokens: 0, output_tokens: 0 }, attempts: [{ n: 1, outcome: "ok" }] },
  launch_evidence: { template_sha256: sha(readFileSync(join(PROTOTYPE, "p2", "prompts", FIELD_MAP_CHECK.check))) } };
const planted = join(RUNS, `${job.job_id}-live-20261103t000000000z-b5test.json`);

(async () => {
  try {
    writeFileSync(planted, JSON.stringify(record));
    ok("setup: the sample inputs load", (await call("POST", "/demo/load", undefined, "user-A")).status === 201);
    const att = sql("select a.id from source_attachment a join combination c on c.id = a.combination_id where a.file_name = 'imm5257e.pdf' order by c.label limit 1");
    const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, "user-A");
    const run = d.body?.id as string;
    let st = ""; for (let i = 0; i < 240 && st !== "COMPLETED" && st !== "FAILED"; i++) { await sleep(500); st = (await call("GET", `/jobs/${run}`)).body?.status ?? ""; }
    ok("setup: IMM 5257's saved draft replays with the recorded checker round (US$0)", st === "COMPLETED" && Number(sql(`select count(*) from proposal_item where run_id = '${run}' and rounds->'check' <> 'null'::jsonb`)) > 0, st);

    // ── the bands and their boxes
    const q = (await call("GET", "/review/proposals")).body;
    const g = q?.groups?.find((x: { id: string; title: string }) => /IMM 5257 \(09-2023\)/.test(`${x.id} ${x.title}`));
    const gv = (await call("GET", `/review/proposals?group=${encodeURIComponent(g?.id ?? "")}`)).body?.group;
    const mine = (band: string) => ((gv?.bands?.[band] ?? []) as { id: string; bulk_why: string | null; decide_on: string | null; agreement: string }[]).filter((x) => sql(`select run_id from proposal_item where id = '${x.id}'`) === run);
    const outcome = (id: string) => sql(`select work->>'outcome' from proposal_item where id = '${id}'`);
    const readyAll = mine("ready"), low = [...mine("check"), ...mine("decide")];
    const ready = readyAll.filter((x) => outcome(x.id) === "REUSE"), readyNew = readyAll.filter((x) => outcome(x.id) !== "REUSE");
    ok("C11.14 AT-4 / P-288 (2) pass: the field-map Ready reuse matches are on To review and can be ticked in bulk (no \"decided on its page\" exception)", ready.length >= 2 && ready.every((x) => x.bulk_why === null), { ready: ready.length, why: ready.find((x) => x.bulk_why)?.bulk_why });
    ok("P-296 (1) fail: a Ready field-map item that makes a new shared field cannot be ticked with others; the box says it is decided on its own", readyNew.length > 0 && readyNew.every((x) => x.bulk_why === NEW_FIELD_ALONE), { readyNew: readyNew.length, why: readyNew.find((x) => x.bulk_why !== NEW_FIELD_ALONE)?.bulk_why });
    ok("P-288 (2): every field-map item still opens on its form-field page", [...ready, ...low].length > 0 && [...ready, ...low].every((x) => /\/jobs\//.test(x.decide_on ?? "")));
    const differ = low.find((x) => sql(`select payload->>'label' from proposal_item where id = '${x.id}'`) === RETYPED);
    ok("P-121 fail: a conflict (the rounds read it differently) cannot be ticked; the box says why", !!differ && /readings differ/.test(differ.bulk_why ?? ""), differ);

    // ── Accept selected: the form-field page's Accept, nothing in the library before apply
    const [a1, a2] = ready.map((x) => x.id);
    const lib0 = sql("select (select count(*) from canonical_field) || '|' || (select count(*) from library_change)");
    let r = await call("POST", "/review/proposals/decide", { ids: [a1, readyNew[0]?.id], action: "accept" });
    ok("P-296 (1) fail: a batch with a Ready new shared field is refused in words (409) on To review, nothing is accepted, both stay queued", r.status === 409 && /decided on its own/.test(r.body?.detail ?? r.body?.message) && sql(`select string_agg(status, ',') from proposal_item where id in ('${a1}', '${readyNew[0]?.id}')`) === "waiting,waiting", [r.status, r.body?.detail]);
    r = await call("POST", "/review/proposals/decide", { ids: [a1, differ!.id], action: "accept" });
    ok("P-121 fail: a batch with a conflict is refused in words (409), nothing is accepted, the items stay queued", r.status === 409 && /Only Ready items are accepted together/.test(r.body?.detail ?? r.body?.message) && sql(`select string_agg(status, ',') from proposal_item where id in ('${a1}', '${differ!.id}')`) === "waiting,waiting", [r.status, r.body?.detail]);
    sql(`update proposal_item set rules = jsonb_set(rules, '{0,passed}', 'false') where id = '${a2}'`);
    r = await call("POST", "/review/proposals/decide", { ids: [a1, a2], action: "accept" });
    ok("P-121 fail: each item is re-checked by the rules on the server: one whose rule now fails refuses the batch in words, nothing accepted", r.status === 409 && /rule did not pass/.test(r.body?.detail ?? r.body?.message) && sql(`select count(*) from proposal_item where id in ('${a1}', '${a2}') and status = 'waiting'`) === "2", [r.status, r.body?.detail]);
    sql(`update proposal_item set rules = jsonb_set(rules, '{0,passed}', 'true') where id = '${a2}'`);
    r = await call("POST", "/review/proposals/decide", { ids: [a1, a2], action: "accept" });
    const batch = r.body?.batchId;
    ok("P-288 (2) pass: \"Accept selected (2)\" accepts both as one batch", r.status === 201 && r.body.items?.length === 2 && !!batch, [r.status, r.body?.detail]);
    ok("P-288 (2): accepted as on the form-field page (the same choice and key), nothing added to the library before the draft is applied", sql(`select string_agg(status || '|' || choice || '|' || (decided_key is not null)::text, ',') from proposal_item where id in ('${a1}', '${a2}')`) === "accepted|ACCEPTED|true,accepted|ACCEPTED|true" && sql("select (select count(*) from canonical_field) || '|' || (select count(*) from library_change)") === lib0);
    const page = (await call("GET", `/jobs/${run}`)).body?.items as { id: string; decision: string }[];
    ok("P-288 (2): the form-field page shows them accepted", page.filter((x) => x.id === a1 || x.id === a2).every((x) => x.decision === "ACCEPTED"), page.filter((x) => x.id === a1 || x.id === a2));
    r = await call("POST", "/review/proposals/decide", { ids: [differ!.id], action: "reject", reason: "not this one" });
    ok("P-288 (2) fail: a field-map item is rejected or edited on its form-field page, not here (409, in words)", r.status === 409 && /form-field page/.test(r.body?.detail ?? r.body?.message), [r.status, r.body?.detail]);

    // ── one Undo for the batch
    r = await call("POST", `/review/proposals/undo/${batch}`, {}, "user-A");
    ok("P-121 fail: only the person who decided can Undo (403); they stay accepted", r.status === 403 && sql(`select count(*) from proposal_item where batch_id = '${batch}' and status = 'accepted'`) === "2", r.status);
    r = await call("POST", `/review/proposals/undo/${batch}`, {});
    ok("P-288 (2) pass: one Undo puts both back as proposed (waiting, no choice, no key); the form-field page shows them undecided", r.status < 300 && sql(`select string_agg(status || '|' || coalesce(choice, '-') || '|' || coalesce(decided_key, '-'), ',') from proposal_item where id in ('${a1}', '${a2}')`) === "waiting|-|-,waiting|-|-" && ((await call("GET", `/jobs/${run}`)).body?.items as { id: string; decision: string }[]).filter((x) => x.id === a1).every((x) => x.decision === "PENDING"), [r.status, r.body]);
    // Undo refused after the item was decided again on its page.
    r = await call("POST", "/review/proposals/decide", { ids: [a1], action: "accept" });
    const b2 = r.body?.batchId;
    await call("POST", `/jobs/${run}/items/${a1}`, { decision: "RETURNED", note: "decided again on the page" });
    const viaPage = sql(`select coalesce(choice, '-') from proposal_item where id = '${a1}'`);
    r = await call("POST", `/review/proposals/undo/${b2}`, {});
    ok("P-288 (2) fail: an item decided again on its form-field page since is not undone here (409, in words); the page's decision stays", viaPage === "RETURNED" ? r.status === 409 && /decided again on its form-field page/.test(r.body?.detail ?? r.body?.message) && sql(`select choice from proposal_item where id = '${a1}'`) === "RETURNED" : true, [viaPage, r.status, r.body?.detail]);

    // ── a one-round field-map item (no checker recorded for its form) cannot be ticked: the box words (pure)
    const fm = { confidence: "decide" as const, origin: "ai" as const, landsOn: "library" as const, step: "field_map", work: { outcome: "REUSE" } };
    ok("P-121 fail: a one-round field-map item cannot be ticked; the box says it needs a checker round", bulkWhy({ ...fm, agreement: "one_round" }) === P121_WHY.oneRound);
    ok("P-121 fail: a field-map item stored Ready with one round only is not ticked either (re-rated from what is stored)", bulkWhy({ ...fm, confidence: "ready", agreement: "one_round", rounds: { draft: {}, check: null }, rules: [{ rule: "key_shape", passed: true, why: null }] }) === P121_WHY.oneRound);
    ok("P-288 (2) pass: a Ready field-map item with both rounds agreeing and its rules passed can be ticked", bulkWhy({ ...fm, confidence: "ready", agreement: "agreed", rounds: { draft: {}, check: {} }, rules: [{ rule: "key_shape", passed: true, why: null }] }) === null);
    ok("P-296 (1) fail (pure): a High field-map item that is a new definition, or an unclear match, cannot be ticked", bulkWhy({ ...fm, confidence: "ready", agreement: "agreed", rounds: { draft: {}, check: {} }, rules: [{ rule: "key_shape", passed: true, why: null }], work: { outcome: "NEW" } }) === NEW_FIELD_ALONE && bulkWhy({ ...fm, confidence: "ready", agreement: "agreed", rounds: { draft: {}, check: {} }, rules: [{ rule: "key_shape", passed: true, why: null }], work: { outcome: "AMBIGUOUS" } }) === NEW_FIELD_ALONE);
    ok("P-121: no live call, US$0", sql(`select coalesce(sum(cost_usd), 0)::numeric(10,2) from drafting_job where id = '${run}'`) === "0.00");
  } finally { rmSync(planted, { force: true }); }
  ok("cleanup: the planted checker run is removed", !existsSync(planted));
  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { rmSync(planted, { force: true }); console.error("STOP", e); process.exit(1); });
