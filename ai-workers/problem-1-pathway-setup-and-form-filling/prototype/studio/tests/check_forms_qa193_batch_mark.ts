// QA-193 (Major; P-121: "the second person at release sees what was bulk-accepted", P-288 (2)): field-map items ticked
// together on To review reached the approver as separate changes with no mark: applying the form's draft wrote each new
// field's library change with no batch. Since P-296 (1)/P-299 only High reuse matches are accepted together (they add
// nothing to the library), and a new field is accepted on its own; the change applying writes now carries the decision
// it came from, so To review's batch view and the release list carry it. With a checker round recorded (planted here as
// the paid runner records it, as check_gcore_b5_field_map_bulk.ts does; Sample), no browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_q193 4455 start && tsx studio/tests/check_forms_qa193_batch_mark.ts 4455 xr_studio_forms_q193
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkerJob, FIELD_MAP_CHECK } from "../api/src/field-map-check.ts";
import { roundJob, RUNS } from "../api/src/rounds.ts";
import { PROTOTYPE } from "../api/src/core.ts";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4455), DB = process.argv[3] ?? "xr_studio_forms_q193";
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
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");

// The planted checker run: the draft's own answer (every field agreed), recorded as the paid runner records it.
const DRAFT_FILE = "studio-fieldmap-imm5257e-live-20261021t060247723z.json", EDITION = "IMM 5257 (09-2023)";
const draft = JSON.parse(readFileSync(join(RUNS, DRAFT_FILE), "utf8"));
const j = checkerJob(draft, EDITION)!, job = roundJob(j.step, true, j.ctx);
const record = { caller: "live", contract_valid: true, raw_output: draft.raw_output,
  drafting_run: { run_id: `${job.job_id}-live-q193test`, status: "completed_with_unresolved", kind: "field_map", inputs: { combination: job.combination, official_files: job.inputs, configuration_version: "studio-add-form" }, usage: { cost_usd: 0, input_tokens: 0, output_tokens: 0 }, attempts: [{ n: 1, outcome: "ok" }] },
  launch_evidence: { template_sha256: sha(readFileSync(join(PROTOTYPE, "p2", "prompts", FIELD_MAP_CHECK.check))) } };
const planted = join(RUNS, `${job.job_id}-live-20261103t000000000z-q193test${PORT}.json`);

(async () => {
  try {
    writeFileSync(planted, JSON.stringify(record));
    ok("setup: the sample inputs load", (await call("POST", "/demo/load", undefined, "user-A")).status === 201);
    const att = sql("select a.id from source_attachment a join combination c on c.id = a.combination_id where a.file_name = 'imm5257e.pdf' order by c.label limit 1");
    const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, "user-A");
    const run = d.body?.id as string;
    let st = ""; for (let i = 0; i < 240 && st !== "COMPLETED" && st !== "FAILED"; i++) { await sleep(500); st = (await call("GET", `/jobs/${run}`)).body?.status ?? ""; }
    const readyOf = (outcome: string) => sql(`select string_agg(id::text, ',' order by id) from proposal_item where run_id = '${run}' and confidence = 'ready' and status = 'waiting' and ${outcome === "REUSE" ? "work->>'outcome' = 'REUSE'" : "work->>'outcome' = 'NEW' and coalesce(jsonb_array_length(identity->'near'), 0) = 0"}`).split(",").filter(Boolean);
    const reuse = readyOf("REUSE"), fresh = readyOf("NEW");
    ok("setup: with both rounds agreeing, IMM 5257's draft has Ready reuse matches and Ready new fields (US$0)", st === "COMPLETED" && reuse.length >= 2 && fresh.length >= 2, { st, reuse: reuse.length, fresh: fresh.length });

    // ── the QA-193 scenario: new fields ticked together reach the approver as separate, unmarked changes
    const lib0 = sql("select count(*) from library_change");
    let r = await call("POST", "/review/proposals/decide", { ids: [fresh[0], fresh[1]], action: "accept" });
    ok("QA-193 fail (P-296 (1)/P-299): two Ready new fields are never accepted together on To review (409, decided on its own), so they cannot reach the approver as unmarked separate changes", r.status === 409 && /decided on its own/.test(words(r)) && sql(`select string_agg(status, ',') from proposal_item where id in ('${fresh[0]}', '${fresh[1]}')`) === "waiting,waiting" && sql("select count(*) from library_change") === lib0, [r.status, words(r)]);
    r = await call("POST", "/review/proposals/decide", { ids: [reuse[0], reuse[1]], action: "accept" });
    const together = r.body?.batchId as string;
    ok("setup: two Ready reuse matches are accepted together (one decision)", r.status === 201 && !!together, [r.status, words(r)]);
    r = await call("POST", "/review/proposals/decide", { ids: [fresh[0]], action: "accept" });
    const alone = r.body?.batchId as string;
    ok("setup: a Ready new field is accepted on its own (its own decision)", r.status === 201 && !!alone, [r.status, words(r)]);
    const newKey = sql(`select decided_key from proposal_item where id = '${fresh[0]}'`);

    // Devin on #740 (2): comparing the draft again keeps a kept decision's batch (the items are written anew).
    r = await call("POST", `/jobs/${run}/recompare`, {}, "user-A");
    const kept = sql(`select coalesce(batch_id::text, '-') from proposal_item where run_id = '${run}' and decided_key = '${newKey}' and status <> 'waiting'`);
    ok("QA-193 pass (Devin on #740): a re-compare keeps the decision's batch on the decision it keeps", r.status < 300 && kept === alone, [r.status, kept, alone, words(r)]);
    // Devin on #740 (1): a decision on the form-field page supersedes the To review batch it was accepted in.
    const fresh2 = readyOf("NEW");
    r = await call("POST", "/review/proposals/decide", { ids: [fresh2[0]], action: "accept" });
    const superseded = r.body?.batchId as string;
    const back = await call("POST", `/jobs/${run}/items/${fresh2[0]}`, { decision: "PENDING" });
    ok("QA-193 pass (Devin on #740): putting a queue-accepted item back on its form-field page clears the batch it was accepted in", r.status === 201 && !!superseded && back.status < 300 && sql(`select status || '|' || coalesce(batch_id::text, '-') from proposal_item where id = '${fresh2[0]}'`) === "waiting|-", [r.status, back.status, words(back)]);

    // The rest of the draft decided one by one on its page, then applied by the author.
    await acceptCleanOneByOne(call, run, ["REUSE", "NEW"], "user-C");
    for (const i of ((await call("GET", `/jobs/${run}`)).body?.items ?? []).filter((x: { decision: string }) => x.decision === "PENDING"))
      await call("POST", `/jobs/${run}/items/${i.id}`, { decision: "RETURNED", note: "Left for a person (QA-193 check)." });
    r = await call("POST", `/jobs/${run}/apply`, {}, "user-A");
    ok("setup: the decided draft is applied by the author", r.status === 201 && r.body?.new_fields > 0, [r.status, words(r)]);

    // ── the pass: the change applying writes carries the decision it came from, and the approver and release see it
    const change = sql(`select batch_id || '|' || status from library_change where key = '${newKey}' and action = 'ADD' limit 1`);
    ok("QA-193 pass: the new field's library change carries the decision it came from (never null)", change === `${alone}|WAITING`, { change, alone });
    ok("QA-193 pass: the reuse matches accepted together add nothing to the library (nothing unmarked reaches the approver)", sql(`select count(*) from library_change where batch_id = '${together}'`) === "0");
    const nulls = Number(sql(`select count(*) from library_change c join proposal_item p on p.id = c.proposal_item_id where p.run_id = '${run}' and p.batch_id is not null and c.batch_id is null`));
    ok("QA-193 pass: no change applying writes for an item decided on To review is left without its decision", nulls === 0, nulls);
    const batches = (await call("GET", "/review/changes?group=batch", undefined, "user-B")).body?.batches ?? [];
    const b = batches.find((x: { id: string }) => x.id === alone);
    ok("QA-193 pass: To review's batch view shows the change under its decision, with who decided", !!b && (b.items ?? []).some((x: { key: string }) => x.key === newKey) && /Content reviewer|reviewer/i.test(String(b.by ?? "")), { found: !!b, by: b?.by });
    const rel = ((await call("GET", "/draft", undefined, "user-B")).body?.library ?? []).find((x: { key: string }) => x.key === newKey);
    ok("QA-193 pass: the release list carries the decision each change came from (batch id)", rel?.batch_id === alone, rel && { batch_id: rel.batch_id });
    ok("QA-193: no live call, US$0", sql(`select coalesce(sum(cost_usd), 0)::numeric(10,2) from drafting_job where id = '${run}'`) === "0.00");
  } finally { rmSync(planted, { force: true }); }
  ok("cleanup: the planted checker run is removed", !existsSync(planted));
  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { rmSync(planted, { force: true }); console.error("STOP", e); process.exit(1); });
