// qa (2 Nov, P-227/P-275 Saved check on #603, R-146 IMM 5532): the saved live field map of IMM 5532 (02-2021) is offered
// by Saved (Replay) at US$0, replays to completion from exactly that run file after Demo › Reset to the six, writes its
// proposals with the file's edition, shows none silently dropped (every answer entry is mapped, unresolved or never
// filled, and the job says how many fields it reports), costs US$0 with no model call and no ledger line. The run file is
// well-formed and referenced by its job; its cost matches usage x price; no secret in it. Run on a copy of the PR head.
//   zsh studio/tools/isolated.sh qa603 4475 start && tsx studio/tests/qa/check_qa_p227_imm5532_saved.ts 4475 xr_studio_qa603
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4475), DB = process.argv[3] ?? "xr_studio_qa603";
const P2 = join(import.meta.dirname, "..", "..", "..", "p2"), RUNS = join(P2, "runs");
const FORM = "imm5532e", JOB_ID = "studio-fieldmap-imm5532e";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ledgerFile = join(LEDGER_DIR, "spend.jsonl");
const ledger = () => (existsSync(ledgerFile) ? readFileSync(ledgerFile, "utf8") : "");
const before = ledger();

// 1. The run file and its job (static, from the committed files).
const job = JSON.parse(readFileSync(join(P2, "jobs", `${JOB_ID}.json`), "utf8"));
const runs = readdirSync(RUNS).filter((x) => x.startsWith(`${JOB_ID}-live-`) && x.endsWith(".json") && !x.includes("reconverted"));
ok("the job has exactly one saved live run file in p2/runs", runs.length === 1, runs);
const run = runs[0];
const saved = JSON.parse(readFileSync(join(RUNS, run), "utf8"));
const d = saved.drafting_run, entries: { data_path: string; outcome: string }[] = d.entries;
const count = (o: string) => entries.filter((e) => e.outcome === o).length;
ok("run file: contract valid, no errors, status completed_with_unresolved, one attempt", saved.contract_valid === true && saved.contract_errors == null && saved.output_errors == null && d.status === "completed_with_unresolved" && d.attempts?.length === 1, [d.status, d.attempts?.length]);
ok("run file: references the job (kind field_map, id in run_id) and the job's inventory checksum", d.kind === "field_map" && String(d.run_id).startsWith(JOB_ID) && JSON.stringify(d.inputs).includes(job.inputs[0].sha256), job.inputs[0].sha256.slice(0, 8));
ok("run file: inventory checksum equals the inventory on disk", createHash("sha256").update(readFileSync(join(P2, "..", job.inputs[0].file.replace(/^prototype\//, "")))).digest("hex") === job.inputs[0].sha256);
ok("run file: raw output SHA-256 equals the recorded output_sha256", createHash("sha256").update(saved.raw_output).digest("hex") === d.output_sha256);
ok("run file: 314 entries on 314 unique paths (75 mapped, 229 unresolved, 10 never filled)", entries.length === 314 && new Set(entries.map((e) => e.data_path)).size === 314 && count("mapped") === 75 && count("unresolved") === 229 && count("never_filled") === 10, { mapped: count("mapped"), unresolved: count("unresolved"), never_filled: count("never_filled") });
const u = d.usage ?? {}, tin = u.input_tokens ?? u.tokens_in, tout = u.output_tokens ?? u.tokens_out;
ok("run file: cost US$1.607568 = 70,082 in x US$4/M + 66,362 out x US$20/M (claude-opus-5-5)", tin === 70082 && tout === 66362 && Math.abs((tin * 4 + tout * 20) / 1e6 - 1.607568) < 1e-9 && Math.abs((u.cost_usd ?? -1) - 1.607568) < 1e-9, u);
ok("run file: no key, bearer token or e-mail", !/sk-ant|x-api-key|anthropic-version|bearer |[\w.-]+@[\w-]+\.\w+/i.test(readFileSync(join(RUNS, run), "utf8")));
const stub = readFileSync(join(RUNS, "stub-pass", `${JOB_ID}.json`), "utf8");
ok("committed files: no machine path in the stub pass", !/\/Users\/|\/home\//.test(stub));
const paths = (readFileSync(join(RUNS, run), "utf8").match(/"\/(Users|home)\/[^"]*"/g) ?? []);
// Not counted as a failure: the launcher's own absolute paths (reviewer m4, carried from every earlier saved run) are reported for the record.
console.log(`NOTE  run file carries ${paths.length} launcher machine path(s) (account name inside): ${JSON.stringify(paths.map((x) => x.replace(/^"\/(Users|home)\/[^/]+/, '"/$1/<account>')))}`);

// 2. The app: Demo › Reset to the six replays it, at US$0.
await call("POST", "/demo/reset", { confirm: "RESET" });
const six = await call("POST", "/demo/load", { sample: "six" });
ok("setup: Demo › Reset to the six loads", six.status < 300, six.body?.message ?? six.status);
ok("the load does not list IMM 5532 as waiting for Draft with AI (other forms may wait until their own saved runs land)", Array.isArray(six.body?.drafts?.waiting_for_draft_with_ai) && !six.body.drafts.waiting_for_draft_with_ai.some((x: string) => /IMM 5532/.test(x)) && six.body.drafts.replayed >= 14, six.body?.drafts);
const att = sql(`select a.id || '|' || a.combination_id || '|' || coalesce(a.edition,'') from source_attachment a where a.official_file = '${FORM}.pdf' and a.combination_id is not null order by a.created_at limit 1`);
const [attId, comb, edition] = att.split("|");
ok("the six hold IMM 5532 on a combination", !!attId, att);
const opts = await call("GET", `/attachments/${attId}/draft-options`);
const listed = (opts.body?.saved_runs ?? []).find((r: { file?: string }) => r.file === run);
ok("IMM 5532's Draft dialog lists the saved run as usable (same input)", listed?.valid === true && listed?.same_input === true, opts.body?.saved_runs ?? opts.status);
const j = sql(`select id || '|' || status || '|' || mode || '|' || coalesce(cost_usd::text,'') from drafting_job where attachment_id = '${attId}' and kind = 'field_map'`).split("\n");
ok("exactly one field-map job for the form, a REPLAY, COMPLETED, cost US$0", j.length === 1 && j[0].split("|")[1] === "COMPLETED" && j[0].split("|")[2] === "REPLAY" && Number(j[0].split("|")[3]) === 0, j);
const jobId = j[0].split("|")[0];
const row = sql(`select run_file || '|' || message from drafting_job where id = '${jobId}'`), msg = row.split("|").slice(1).join("|");
ok("the replay used exactly this run file and says no model call, US$0", row.startsWith(`${run}`.replace(/\.json$/, "")) || row.includes(run.replace(/\.json$/, "")), row.slice(0, 300));
ok("the job message says no model call, US$0", /no model call, US\$0/.test(msg), msg);
const reported = Number(/(\d+) fields: /.exec(msg)?.[1] ?? -1);
const nProp = Number(sql(`select count(*) from proposal_item where run_id = '${jobId}'`));
ok("the job reports N fields and exactly N proposals are on the queue (none silently dropped)", nProp > 0 && nProp === reported, { reported, proposals: nProp, msg });
const facts = new Set(d.entries.filter((e: { outcome: string }) => e.outcome === "mapped").map((e: { fact: unknown }) => JSON.stringify(e.fact))).size;
ok("the 75 mapped boxes land as one proposal per distinct fact (nothing dropped)", count("mapped") === 75 && nProp === facts, { mapped: count("mapped"), distinct_facts: facts, proposals: nProp });
ok("the proposals carry the file's edition and wait for a person (origin ai)", sql(`select distinct form_edition from proposal_item where run_id = '${jobId}'`) === edition && Number(sql(`select count(*) from proposal_item where run_id = '${jobId}' and status = 'waiting' and origin = 'ai'`)) === nProp, edition);
const plan = await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [comb] }, mode: "REPLAY" });
const t = (plan.body?.targets ?? []).find((x: { attachmentId?: string }) => x.attachmentId === attId);
ok("Saved again skips it while its draft waits (no second set, worst US$0)", t?.action === "skip" && plan.body?.totals?.worst_usd === 0, t);
ok("no live job and no spend recorded in the database", Number(sql(`select count(*) from drafting_job where mode = 'LIVE'`)) === 0 && Number(sql(`select coalesce(sum(cost_usd),0) from drafting_job`)) === 0);
ok("no model call: the shared spend ledger is unchanged", ledger() === before);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
