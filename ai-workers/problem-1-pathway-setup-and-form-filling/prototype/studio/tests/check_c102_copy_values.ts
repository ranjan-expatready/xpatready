// C10.2 (Adobe Acrobat's own Validate on the finished story's Paper IMM 5257, 9 Nov 2026, 17:13–17:45 IST): Validate
// refused "7. Current country of residence (status)" must contain a value though the page showed "Citizen", after two
// "You entered information that is not required, please review". Cause, read from the copy and the form's own script:
// the stored status was "01", one of its export values (so not an export-value fault), but the copy also held "Other"
// details and From and To dates beside it, and IMM 5257's validateCOR empties the status for either ("negative case").
// The fix is data (P-319): IMM 5257 (09-2023)'s form-field gates in samples/form-field-gates.json (B107), so those boxes
// are written, and their questions asked, only for the statuses the form takes them for.
// This check loads the finished story once (about 4 minutes; replays only, US$0) and reads every copy it filled (Paper,
// PDF upload, and the case copies of the Online lines) with the project's XFA reader (tests/fixtures/read_choice_values.py):
//   1. every choice-list field's stored value is one of its export values (all forms, all copies);
//   2. on every IMM 5257 copy, nothing the form's own Validate empties the status for: no From or To date beside
//      Citizen, Permanent resident, Protected Person or Refugee Claimant (01, 02, 07, 08), no "Other" details beside a
//      status other than Other (06), in question 7 and in question 9 B;
//   3. the release the case files on carries those gates, and the copy says why each such box is empty.
// Each has a fail case on a test-only copy with one value changed (the reader must catch it).
//   zsh studio/tools/isolated.sh rt_c102v 4431 start && tsx studio/tests/check_c102_copy_values.ts 4431 xr_studio_rt_c102v
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_rt_c102v";
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
if (PORT === 4400 || DB === "xr_studio_demo") { console.log("refused: this check loads the finished story; run it on an isolated copy, never the demo (:4400, xr_studio_demo)"); process.exit(2); }
const sql = (q: string) => execFileSync(process.env.PSQL ?? "/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as { story?: { state: string } | null; checkpoint?: string | null } | null };
};
type Choice = { path: string; caption: string; wrote: string; is_export: boolean; is_display: boolean; exports: number };
type Read = { file: string; choices: Choice[]; values: Record<string, string> };
const readCopies = (files: string[]): Read[] => execFileSync(PY, ["-I", READER, ...files], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

// IMM 5257 (09-2023) p. 1, its own Validate script: validateCOR (question 7) and validateCWA (question 9 B) set the status to
// null on a date beside 01/02/07/08 (validateCOR only) or "Other" details beside any status but 06. Test-side reading of
// the official form, independent of the gate data it checks.
const PD = "form1[0].Page1[0].PersonalDetails[0].";
const NO_DATES = ["01", "02", "07", "08"];
const ROWS = [{ q: "7", row: `${PD}CurrentCOR[0].Row2[0].`, dates: true }, { q: "9 B", row: `${PD}CountryWhereApplying[0].Row2[0].`, dates: false }];
function cleared(v: Record<string, string>): string[] {
  const out: string[] = [];
  for (const r of ROWS) {
    const status = v[`${r.row}Status[0]`] ?? "";
    if (r.dates && NO_DATES.includes(status)) for (const d of ["FromDate", "ToDate"]) if (v[`${r.row}${d}[0]`]) out.push(`question ${r.q}: ${d} "${v[`${r.row}${d}[0]`]}" beside status ${status}`);
    if (status !== "06" && v[`${r.row}Other[0]`]) out.push(`question ${r.q}: Other "${v[`${r.row}Other[0]`]}" beside status ${status || "(empty)"}`);
  }
  return out;
}

const tmp = mkdtempSync(join(tmpdir(), "xr-c102v-"));
try {
  let r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" });
  ok("setup: the finished story starts (202)", r.status === 202, r.status);
  let done = false;
  for (const until = Date.now() + 900_000; r.status === 202 && Date.now() < until && !done;) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = (await call("GET", "/demo/status")).body;
    done = s?.story?.state === "done" && s?.checkpoint === "finished_story";
    if (s?.story?.state === "failed") break;
  }
  ok("setup: the finished story is loaded", done);

  // Every copy the story filled, with the channel of its line: the person's own (a moved line, C11.6), else the release's,
  // else PDF upload (release 1 names none). An Online line is entered from its answer sheet, so it has no copy here; its
  // filing's other forms (Schedule 1, IMM 5645, IMM 5476 on release 2) are PDF uploads and are read like the rest.
  const rows = (sql(`select f.form_number || '|' || coalesce(i.channel::text, (select x->>'channel' from config_release c, jsonb_array_elements(c.snapshot->'forms') x where c.id=f.config_release_id and x->>'form_number'=f.form_number limit 1), 'PDF_UPLOAD') || '|' || f.path || '|' || f.config_release_id from form_instance f left join filing_item i on i.case_id=f.case_id and i.subject_id=f.subject_id and i.item_key=f.form_number and i.active where f.status='GENERATED' and f.path is not null order by f.created_at`) || "").split("\n").filter(Boolean)
    .map((l) => { const [form, channel, path, release] = l.split("|"); return { form, channel, path: join(ROOT, path), release }; });
  const reads = rows.length ? readCopies(rows.map((x) => x.path)) : [];
  const copies = rows.map((x, i) => ({ ...x, read: reads[i] }));
  const paper = copies.filter((c) => c.form === "IMM 5257" && c.channel === "PAPER");
  // The Paper copy the case files: the newest, made on the release the case is on (release 2; the first was on release 1).
  const filed = paper[paper.length - 1];
  const onRelease = copies.filter((c) => c.release === filed?.release && c !== filed);
  ok("setup: the story filled copies, each read back: the Paper IMM 5257 and, on the same release, the PDF uploads filed with the Online filings", copies.length > 0 && reads.length === copies.length && !!filed && onRelease.length > 0 && onRelease.every((c) => c.channel === "PDF_UPLOAD"),
    { copies: copies.length, paper: paper.length, onRelease: onRelease.map((c) => `${c.form} ${c.channel}`) });
  if (!filed) throw new Error("no Paper IMM 5257 copy: nothing to check (the story's Paper line is in samples/finished-story.json, paper_line)");

  // 1. Choice values (the first suspect on 9 Nov): every stored value is one of its field's export values.
  const notExport = copies.flatMap((c) => (c.read?.choices ?? []).filter((x) => !x.is_export).map((x) => ({ form: c.form, channel: c.channel, field: x.path.split(".").slice(-3).join("."), wrote: x.wrote, display: x.is_display })));
  const choices = copies.reduce((n, c) => n + (c.read?.choices.length ?? 0), 0);
  ok(`C10.2-v1 pass: every choice field on every copy (${choices} values, ${copies.length} copies: Paper and PDF upload, both releases) holds one of its export values`, choices > 0 && notExport.length === 0, notExport);
  const statusPath = `${PD}CurrentCOR[0].Row2[0].Status[0]`;
  const badChoice = join(tmp, "bad-choice.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badChoice, `${statusPath}=Citizen`], { stdio: ["ignore", "pipe", "pipe"] });
  const bc = readCopies([badChoice])[0].choices.find((x) => x.path === statusPath);
  ok("C10.2-v1 fail: a status stored as its display word (\"Citizen\", not \"01\") is caught as not an export value", !!bc && !bc.is_export && bc.is_display, bc);

  // 2. IMM 5257's own Validate: nothing it empties the status for.
  const i5257 = copies.filter((c) => c.form === "IMM 5257");
  const hits = i5257.flatMap((c) => cleared(c.read?.values ?? {}).map((w) => `${c.channel || "copy"}: ${w}`));
  ok(`C10.2-v2 pass (IMM 5257 validateCOR, validateCWA): no date beside 01/02/07/08 and no "Other" details beside a status but 06, on every IMM 5257 copy (${i5257.length})`, i5257.length > 0 && i5257.every((c) => !!c.read?.values[statusPath]) && hits.length === 0, hits);
  const badRule = join(tmp, "bad-rule.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badRule, `${statusPath}=01`, `${PD}CurrentCOR[0].Row2[0].Other[0]=SAMPLE`, `${PD}CurrentCOR[0].Row2[0].FromDate[0]=2024-01-15`], { stdio: ["ignore", "pipe", "pipe"] });
  const br = cleared(readCopies([badRule])[0].values);
  ok("C10.2-v2 fail: Citizen with \"Other\" details and a From date (the 9 Nov Paper copy) is caught twice", br.length === 2, br);

  // 3. The gates the fix adds are in the release the Paper copy was made on, and the copy says why each box is empty.
  const gated = ["CurrentCOR[0].Row2[0].Other[0]", "CurrentCOR[0].Row2[0].FromDate[0]", "CurrentCOR[0].Row2[0].ToDate[0]", "CountryWhereApplying[0].Row2[0].Other[0]"].map((x) => PD + x);
  const inRelease = Number(sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where r.id='${filed.release}' and m->>'form_number'='IMM 5257' and e->'condition_rule'->'gate' is not null and e->>'data_path' in (${gated.map((g) => `'${g}'`).join(",")})`) || 0);
  ok("C10.2-v3 pass (B107 data, samples/form-field-gates.json): the Paper copy's release carries IMM 5257's four gates", inRelease === 4, inRelease);
  const boxes: { box: string; result: string; why: string | null }[] = JSON.parse(sql(`select coalesce(result_json->'boxes', '[]') from form_instance where path='${filed.path.replace(`${ROOT}/`, "")}' order by created_at desc limit 1`) || "[]");
  const said = gated.slice(0, 3).map((g) => boxes.find((b) => b.box === g)).filter(Boolean) as { result: string; why: string | null }[];
  ok("C10.2-v3 pass: on the Paper copy (a Citizen) the status row's Other, From and To are not written, each saying \"Not needed\"", said.length === 3 && said.every((b) => b.result !== "written" && /^Not needed/.test(b.why ?? "")), said);
} catch (e) {
  ok("the check ran to its end", false, (e as Error).message);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
