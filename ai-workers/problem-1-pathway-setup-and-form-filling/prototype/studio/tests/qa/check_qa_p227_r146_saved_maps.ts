// qa (2 Nov, P-227 Saved check on #502, R-146 part 1): the saved live field maps of IMM 5604, 5562, 5406 and 5646 are
// offered by Saved (Replay) at US$0, replay to completion from exactly those run files, and write proposals that carry
// the file's edition; no model call (the spend ledger is unchanged). Demo › Reset to the six replays them itself (P-108),
// so a second Saved plan skips them (a draft is waiting). Run on a copy of the PR head (or main once merged).
//   zsh studio/tools/isolated.sh qa_502 4477 start && tsx studio/tests/qa/check_qa_p227_r146_saved_maps.ts 4477 xr_studio_qa_502
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4477), DB = process.argv[3] ?? "xr_studio_qa_502";
const RUNS = join(import.meta.dirname, "..", "..", "..", "p2", "runs");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8") : ""; };
const FORMS = ["imm5604e", "imm5562e", "imm5406e", "imm5646e"];

const before = ledger();
await call("POST", "/demo/reset", { confirm: "RESET" });
const six = await call("POST", "/demo/load", { sample: "six" });
ok("setup: Demo › Reset to the six loads", six.status < 300, six.body?.message ?? six.status);
for (const f of FORMS) {
  const run = readdirSync(RUNS).find((x) => x.startsWith(`studio-fieldmap-${f}-live-202611`) && x.endsWith(".json") && !x.includes("reconverted"));
  ok(`${f}: the PR's saved live run is in p2/runs`, !!run, run);
  if (!run) continue;
  const saved = JSON.parse(readFileSync(join(RUNS, run), "utf8"));
  const att = sql(`select a.id || '|' || a.combination_id || '|' || coalesce(a.edition,'') from source_attachment a where a.official_file = '${f}.pdf' and a.combination_id is not null order by a.created_at limit 1`);
  const [attId, comb, edition] = att.split("|");
  ok(`${f}: the six hold the form on a combination`, !!attId, att);
  if (!attId) continue;
  const opts = await call("GET", `/attachments/${attId}/draft-options`);
  const listed = (opts.body?.saved_runs ?? []).find((r: { file?: string }) => r.file === run);
  ok(`${f}: the form's Draft dialog lists the saved run as usable (same input)`, listed?.valid === true && listed?.same_input === true, opts.body?.saved_runs ?? opts.status);
  const job = sql(`select id || '|' || status from drafting_job where mode = 'REPLAY' and run_file like '%${run.replace(/\.json$/, "")}%' limit 1`);
  const [jobId, status] = job.split("|");
  const cost = jobId ? sql(`select cost_usd from drafting_job where id = '${jobId}'`) : "";
  const msg = jobId ? sql(`select message from drafting_job where id = '${jobId}'`) : "";
  ok(`${f}: Reset to the six replayed exactly this run, completed at US$0`, status === "COMPLETED" && Number(cost) === 0 && /no model call, US\$0/.test(msg), [status, cost, msg]);
  const plan = await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [comb] }, mode: "REPLAY" });
  const t = (plan.body?.targets ?? []).find((x: { attachmentId?: string }) => x.attachmentId === attId);
  ok(`${f}: Saved again skips it while its draft waits for review (no second set, US$0)`, t?.action === "skip" && /waiting for review/.test(t?.why ?? "") && plan.body?.totals?.worst_usd === 0, t);
  const n = Number(jobId ? sql(`select count(*) from proposal_item where run_id = '${jobId}'`) : "0");
  const eds = jobId ? sql(`select distinct form_edition from proposal_item where run_id = '${jobId}'`) : "";
  ok(`${f}: its proposals are written and carry the file's edition (${edition})`, n > 0 && eds === edition, { proposals: n, editions: eds, drafted: saved?.drafting_run?.form_edition ?? null, msg });
}
ok("no model call: the spend ledger is unchanged", ledger() === before);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
