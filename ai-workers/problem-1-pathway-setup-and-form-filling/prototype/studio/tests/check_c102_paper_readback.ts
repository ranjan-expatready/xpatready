// C10.2 (Lead 37, 9 Nov; P-349 row 12b's method): the finished story reads back the Paper IMM 5257 copy a person validated
// in Adobe, through the product's own upload door, then prints and signs it in pen, so the Paper, forms, ready and record
// stages complete and the family's four filings are recorded together. Without a saved read-back the story waits in
// words (the fail case). TEST ONLY: Adobe is not here, so this isolated copy's "validated" file is the acceptance
// helpers' asValidated (tests/runtime/validated.ts: the form's own Validate result written into the copy), kept in this
// copy's own temporary folder (STUDIO_VALIDATED_DIR) with its own saved read-back (STUDIO_VALIDATED_PAPER); never in
// demo data, never under samples/. The real file is the Lead's, from Adobe on the Mac. Two story loads (about 10 minutes). The refusal of a file whose checksum is not the saved one: tests/check_qa285_validated_files.ts.
//   zsh studio/tools/isolated.sh rt_c102p 4431 start STUDIO_VALIDATED_DIR=/tmp/xr_c102p STUDIO_VALIDATED_PAPER=/tmp/xr_c102p/paper.json && tsx studio/tests/check_c102_paper_readback.ts 4431 xr_studio_rt_c102p
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { adobeValidated } from "./runtime/validated.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_rt_c102p";
const DIR = "/tmp/xr_c102p", PAPER = join(DIR, "paper.json"), STUDIO = join(import.meta.dirname, "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
// Review m2: never the demo (its port and database), and psql from PSQL where the Mac's path is not.
if (PORT === 4400 || DB === "xr_studio_demo") { console.log("refused: this check loads the finished story and writes a test-only validated file; run it on an isolated copy, never the demo (:4400, xr_studio_demo)"); process.exit(2); }
const sql = (q: string) => execFileSync(process.env.PSQL ?? "/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as Record<string, any> | null }; // eslint-disable-line @typescript-eslint/no-explicit-any -- route answers read loosely, as the other API checks do
};
type Stage = { key: string; status: string; shows: string; why: string | null };
async function loadStory(): Promise<Stage[]> {
  const r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" });
  if (r.status !== 202) throw new Error(`the story did not start: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  for (const until = Date.now() + 900_000; Date.now() < until;) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = (await call("GET", "/demo/status")).body?.story;
    if (s?.state === "done") return s.stages as Stage[];
    if (s?.state === "failed") throw new Error(`the story failed: ${s.error}`);
  }
  throw new Error("the story did not finish in 15 minutes");
}
const st = (stages: Stage[], k: string) => stages.find((x) => x.key === k);

try {
  rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
  const paperPerson: string = JSON.parse(readFileSync(join(STUDIO, "samples", "finished-story.json"), "utf8")).paper_line.person;

  // 1. No saved read-back yet: the Paper copy waits for its validated copy, in words; its filing is split out.
  let stages = await loadStory();
  ok("C10.2 fail (no read-back saved): the Paper stage waits and says so, with no fixed count of form fields (QA-316)", st(stages, "paper")?.status === "partial" && /No validated copy of .* is saved yet/.test(st(stages, "paper")?.why ?? "") && !/16 of/.test(JSON.stringify(stages)), st(stages, "paper"));
  ok("C10.2 fail (no read-back saved): ready and record stay partial (P-315), the Paper filing split out", st(stages, "ready")?.status === "partial" && st(stages, "record")?.status === "partial");

  // 2. A person validates that copy (here, TEST ONLY: asValidated) and reads it back through the upload door; then the
  //    read-back is recorded with the Mac tool's --paper mode into this copy's own saved file.
  const caseId = sql("select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'");
  const subject = ((await call("GET", `/runtime/cases/${caseId}`, undefined, "user-O")).body?.people ?? []).find((p: { label: string }) => p.label === paperPerson)?.subject_id;
  const copyId = sql(`select id from form_instance where case_id='${caseId}' and subject_id='${subject}' and form_number='IMM 5257' and status='GENERATED' order by created_at desc limit 1`);
  const bytes = Buffer.from(await (await fetch(`http://localhost:${PORT}/api/runtime/form-copies/${copyId}/file`, { headers: { "x-actor": "user-O" } })).arrayBuffer());
  const validated = adobeValidated(bytes);
  writeFileSync(join(DIR, "paper-validated-test.pdf"), validated);
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(validated)], { type: "application/pdf" }), "paper-validated-test.pdf");
  const up = await fetch(`http://localhost:${PORT}/api/runtime/form-copies/${copyId}/validated`, { method: "POST", headers: { "x-actor": "user-O" }, body: fd });
  ok("setup: the validated copy is read back through the upload door (201)", up.status === 201, up.status);
  const rec = execFileSync(process.execPath, ["--import", "tsx", "tools/record-validated-samples.ts", "--paper", "a check on an isolated copy (TEST ONLY: asValidated, never Adobe)"],
    { cwd: STUDIO, encoding: "utf8", env: { ...process.env, DATABASE_URL: `postgresql://xr_studio@127.0.0.1:54329/${DB}`, TSX_TSCONFIG_PATH: "api/tsconfig.json", STUDIO_VALIDATED_DIR: DIR, STUDIO_VALIDATED_PAPER: PAPER } });
  const saved = JSON.parse(readFileSync(PAPER, "utf8"));
  ok("C10.2 pass (record --paper): one saved read-back, for the Paper person, naming its file in the folder", saved.copies?.length === 1 && saved.copies[0].person === paperPerson && saved.copies[0].file === "paper-validated-test.pdf", rec.trim());

  // 3. The story again: it finds the file, reads it back through the upload door, prints and signs it in pen; every
  //    stage that waited on it completes, and the family's four filings are recorded together.
  stages = await loadStory();
  ok("C10.2 pass (row 12b's method): the Paper stage reads back the validated copy, prints it and signs it in pen (done)", st(stages, "paper")?.status === "done" && /read back/.test(st(stages, "paper")?.shows ?? ""), st(stages, "paper"));
  ok("C10.2 pass: forms, ready and record are done too", ["forms", "ready", "record"].every((k) => st(stages, k)?.status === "done"), stages.map((x) => `${x.key}:${x.status}`).join(" "));
  const fam = sql("select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'");
  ok("C10.2 pass: the four filings are recorded together in one group, each Ready to file first", sql(`select count(*) from filing_record r join filing f on f.id=r.filing_id where f.case_id='${fam}'`) === "4" && sql(`select count(distinct submission_group_id) from filing where case_id='${fam}' and active`) === "1"
    && sql(`select count(*) from filing_record r where r.filing_id in (select id from filing where case_id='${fam}') and exists (select 1 from audit_event a where a.action='ready_to_file' and a.entity_key=r.filing_id::text)`) === "4");
  const paperItem = ((await call("GET", `/runtime/cases/${fam}/prepare`, undefined, "user-O")).body?.items ?? []).find((i: { kind: string; channel?: string; subject: string }) => i.kind === "form" && i.channel === "PAPER");
  const steps: { key: string; done: { by: string } | null }[] = (await call("GET", `/runtime/items/${paperItem?.id}`, undefined, "user-O")).body?.sign_steps ?? [];
  ok("C10.2 pass: the read-back went through the upload door (a validated copy of the new Paper copy) and Printed, Signed in pen were recorded by the case officer",
    Number(sql(`select count(*) from validated_copy v join form_instance f on f.id=v.form_instance_id where f.case_id='${fam}' and f.form_number='IMM 5257'`)) >= 1
    && steps.length === 2 && steps.every((x) => x.done?.by === "user-O"), steps);

} catch (e) { ok(`the check ran to its end (crashed: ${(e as Error).message})`, false); }
finally { rmSync(DIR, { recursive: true, force: true }); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
