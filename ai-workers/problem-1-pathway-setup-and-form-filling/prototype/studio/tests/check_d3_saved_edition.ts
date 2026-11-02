// D3 (P-225, P-227, QA-144): Visitor visa's IMM 5257 field map from its Saved AI answer (the 21 Oct whole-form run,
// prompt v1), at US$0. The form edition is a fact of the file, never the model's reading (p2/convert.ts): that run's
// answer says "IMM 5257 (06-2018)" while the file is (09-2023), so its proposals must carry the file's edition, or the
// Form library counts none of them for IMM 5257 (09-2023) ("Not mapped yet" beside 84 waiting proposals). The model's
// reading stays visible on the job. No model call; the ledger is not written.
//   zsh studio/tools/isolated.sh forms_d3 4474 start && tsx studio/tests/check_d3_saved_edition.ts 4474 xr_studio_forms_d3
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4474), DB = process.argv[3] ?? "xr_studio_forms_d3";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
const SAVED = "studio-fieldmap-imm5257e-live-20261021t060247723z.json";

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const before = ledger();
  const l = await call("POST", "/demo/load");
  if (l.status >= 300) { console.error("STOP  Load sample failed", l.body); process.exit(2); }
  const vv = sql(`select id from combination where label = 'Visitor visa'`);
  ok("D3 setup: Load sample has Visitor visa with IMM 5257 (09-2023) read", !!vv && sql(`select edition from source_attachment where combination_id = '${vv}' and official_file = 'imm5257e.pdf'`) === "IMM 5257 (09-2023)");

  const scope = { kind: "combination", ids: [vv] };
  const plan = await call("POST", "/ai/plan", { scope, mode: "REPLAY" });
  const t = (plan.body?.targets ?? []).find((x: any) => /^IMM 5257 \(/.test(x.source ?? ""));
  ok("D3: Saved offers the 21 Oct whole-form answer for IMM 5257 (no model call, US$0)", t?.action === "reuse_saved_output" && t?.run_file === SAVED && plan.body?.totals?.model_calls === 0 && plan.body?.totals?.worst_usd === 0, t);

  const go = await call("POST", "/ai/batches", { scope, mode: "REPLAY", idempotencyKey: "d3-saved-edition-1", planSha256: plan.body?.plan_sha256 });
  ok("D3: the Saved batch starts", go.status < 300, go.body?.message);
  let job = "";
  for (let i = 0; i < 120; i++) {
    job = sql(`select id || '|' || status from drafting_job where mode = 'REPLAY' and run_file like '%${SAVED.replace(/\.json$/, "")}%'`);
    if (/\|(COMPLETED|FAILED)$/.test(job)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const [jobId, status] = job.split("|");
  const msg = sql(`select message from drafting_job where id = '${jobId}'`);
  ok("D3: the replay completes at US$0 with every form field accounted for (161 of 242 mapped, 84 fields)", status === "COMPLETED" && sql(`select cost_usd from drafting_job where id = '${jobId}'`) === "0" && /161 of 242 form fields mapped; 84 fields/.test(msg), msg);

  // The fix: the proposals carry the file's edition, never the model's reading.
  const editions = sql(`select form_edition || ':' || count(*) from proposal_item where run_id = '${jobId}' group by form_edition`);
  ok("D3 fail-first: all 84 proposals carry the file's edition IMM 5257 (09-2023), not the AI's reading (06-2018)", editions === "IMM 5257 (09-2023):84", editions);
  const detail = JSON.parse(sql(`select detail from drafting_job where id = '${jobId}'`));
  ok("D3: the AI's own reading of the edition stays visible on the job (06-2018 vs the file's 09-2023)", detail.form_edition_drafted === "IMM 5257 (06-2018)" && detail.conversion?.edition_note?.manifest === "IMM 5257 (09-2023)", detail.conversion);

  const lib = await call("GET", "/library/forms/list");
  const row = (lib.body?.rows ?? []).find((r: any) => r.code === "IMM 5257");
  ok("D3 fail-first: the Form library shows IMM 5257's AI draft waiting (84 to review), not \"Not mapped yet\"", row?.field_map?.kind === "proposed" && /84 to review/.test(row?.field_map?.words ?? ""), row?.field_map);

  ok("D3: no model call: the spend ledger is unchanged", ledger() === before);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
