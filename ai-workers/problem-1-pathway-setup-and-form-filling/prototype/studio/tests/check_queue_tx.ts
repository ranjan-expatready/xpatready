// Cross-lane fix (runtime lane, Lead choice (a), 30 Oct): the review queue's transactions get room for their work
// (QUEUE_TX in api/src/proposals.ts). Under load the S7 six load lost the IMM 5257 Schedule 1 and IMM 5707 replays with
// "Transaction API error": a field-map draft's proposals go into the queue in one transaction (sources.ts ingest) with a
// library query per item, and Prisma's 5 s default ran out. The step is slowed on purpose (STUDIO_SLOW_TX, isolated
// test server only) to prove both sides: 6.5 s inside the transaction now completes; past the 60 s room the step fails
// alone, writes nothing, and its siblings keep their proposals. US$0: replays only, no live AI call.
// R-146 (2 Nov): IMM 5406, 5562, 5604 and 5646 got saved answers (#502), so the six replayed ten forms, and thirteen
// with IMM 0008, 1294 and 5710 (second batch); the test names them, so a replay lost under load still fails it.
// QA-163 (2 Nov): IMM 5257 is listed on Visitor visa without a field map, so the six now replays its saved answer too
// (fourteen forms; before, the plan skipped any listed form, mapped or not). R-146: fifteen with IMM 5532 (its re-run on
// the inventory row PD fixed, #603). Sixteen with IMM 5645, replayed from the four saved parts of the C11.8 live run (#746).
//   tsx studio/tests/check_queue_tx.ts [port=4434] [name=runtime_qtx]   (starts its own isolated copy)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
const STUDIO = join(import.meta.dirname, "..");

const PORT = Number(process.argv[2] ?? 4434), NAME = (process.argv[3] ?? "runtime_qtx").replace(/^xr_studio_/, ""), DB = `xr_studio_${NAME}`;
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
const server = (action: "start" | "stop", env: string[] = []) => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), action, ...env], { encoding: "utf8" });
const load = async () => {
  const r = await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ sample: "six" }) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
/** Each field-map step of the load: its form file, status, message and how many proposals it put on the queue. */
const steps = () => sql(`select a.file_name || '§' || j.status || '§' || regexp_replace(coalesce(j.message, ''), '\\s+', ' ', 'g') || '§' || (select count(*) from proposal_item p where p.run_id = j.id and p.status = 'waiting')
  from drafting_job j join source_attachment a on a.id = j.attachment_id where j.kind = 'field_map' order by a.file_name`).split("\n").filter(Boolean)
  .map((l) => { const [file, status, message, items] = l.split("§"); return { file, status, message, items: Number(items), said: Number(/(\d+) fields: /.exec(message)?.[1] ?? -1) }; });
// QA-90: the one shared spend ledger (p2/policy.ts LEDGER_DIR); not there yet = nothing spent.
/** The sample's forms with a saved field-map answer, in file order (six before R-146's saved maps, ten after #502, thirteen
 *  after R-146's second batch, fourteen after QA-163 drafts the listed but unmapped IMM 5257, fifteen after IMM 5532's
 *  re-run on the inventory row PD fixed, sixteen with IMM 5645 by its four saved parts, eighteen with IMM 0008 DEP and
 *  IMM 5669 since the C11.7 paid runs, 3 Nov; nineteen with IMM 1295, the spouse's form on the Study permit, BK-16 PR 2,
 *  P-490). */
const SAVED = ["imm0008depe.pdf", "imm0008e.pdf", "imm1294e.pdf", "imm1295e.pdf", "imm1344e.pdf", "imm5257_1e.pdf", "imm5257e.pdf", "imm5406e.pdf", "imm5409e.pdf", "imm5475e.pdf", "imm5476e.pdf", "imm5532e.pdf", "imm5562e.pdf", "imm5604e.pdf", "imm5645e.pdf", "imm5646e.pdf", "imm5669e.pdf", "imm5707e.pdf", "imm5710e.pdf"];
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };

(async () => {
  const before = ledger();
  try {
    // Pass: the IMM 5707 step spends 6.5 s inside its transaction (past Prisma's 5 s default) and still completes.
    server("start", ["STUDIO_SLOW_TX=imm5707e.pdf:6500"]);
    const a = await load();
    if (a.status >= 300) { console.error("STOP  the six did not load", a.body); process.exit(2); }
    const s1 = steps();
    ok("C11.7 pass (queue transaction room): every saved field-map answer of the sample replays (the nineteen forms), the slowed IMM 5707 one included", s1.map((s) => s.file).join() === SAVED.join() && s1.every((s) => s.status === "COMPLETED") && a.body.drafts.replayed === SAVED.length, s1.map((s) => `${s.file} ${s.status}`));
    ok("C11.7 pass: each replay puts exactly the fields it reports on the review queue (IMM 5257 Schedule 1: 29, IMM 5707: 9)", s1.every((s) => s.items === s.said && s.items > 0) && s1.find((s) => s.file === "imm5257_1e.pdf")?.items === 29 && s1.find((s) => s.file === "imm5707e.pdf")?.items === 9, s1.map((s) => `${s.file} ${s.items}/${s.said}`));
    ok("C11.7 pass: the queue holds every replayed proposal", n(`select count(*) from proposal_item where status = 'waiting' and origin = 'ai'`) === s1.reduce((t, s) => t + s.items, 0) && a.body.drafts.proposals_waiting === s1.reduce((t, s) => t + s.items, 0), a.body.drafts);
    ok("C11.7 pass: the load reports where its time goes, step by step", typeof a.body.timings === "object" && Object.keys(a.body.timings).length >= 5, a.body.timings);

    // Fail: past the 60 s room the step fails alone, with nothing of it on the queue; the other eighteen keep theirs.
    server("start", ["STUDIO_SLOW_TX=imm5707e.pdf:61000"]);
    const b = await load();
    const s2 = steps();
    const slow = s2.find((s) => s.file === "imm5707e.pdf"), rest = s2.filter((s) => s.file !== "imm5707e.pdf");
    ok("C11.7 fail: a step that runs past the transaction room fails and leaves nothing half-written on the queue", b.status < 300 && slow?.status === "FAILED" && slow.items === 0 && n(`select count(*) from proposal_item p join drafting_job j on j.id = p.run_id join source_attachment a on a.id = j.attachment_id where a.file_name = 'imm5707e.pdf'`) === 0, slow);
    ok("C11.7 fail: the failed step says why in plain words (no Prisma text, no file path)", /took longer than 60 s, so none was added/.test(slow?.message ?? "") && !/Invalid|prisma|\/Users\//i.test(slow?.message ?? ""), slow?.message);
    ok("C11.7 fail: its eighteen siblings still complete with their proposals (a failed step never discards the others)", rest.map((s) => s.file).join() === SAVED.filter((f) => f !== "imm5707e.pdf").join() && rest.every((s) => s.status === "COMPLETED" && s.items === s.said && s.items > 0), rest.map((s) => `${s.file} ${s.status} ${s.items}`));
    ok("R-143: no live AI call, the spend ledger unchanged", ledger() === before && n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0);
  } finally { server("stop"); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server("stop"); process.exit(1); });
