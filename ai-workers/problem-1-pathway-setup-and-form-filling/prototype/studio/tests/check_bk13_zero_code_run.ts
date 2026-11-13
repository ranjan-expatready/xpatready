// BK-13 step 2 (Bake plan row 27; P-448, P-449, P-452, P-541): the zero-code run for the Bake's exit (b), "a pathway
// (Study permit) reaching filled, checked forms with data changes only, no engine or screen code change". One script
// replays it all on a fresh isolated copy, through the product's own routes only:
//   1. no code change on this branch: `git diff origin/main` touches nothing under engine/, api/src/, web/src/ or
//      prototype/p5/ (P-452; the tech lead's ruling on #1574 §8 adds p5, the filler);
//   2. Demo › Load the configured checkpoint: the six set up from the data files, the Study permit released (row 10);
//   3. the Study permit's seeded rows CHECKED against their data files, not assumed (P-449): its form lines and who
//      files each (samples/form-setup.json), its document lines (documentsCited, samples/conditional-documents.json), a
//      published field map for every form line, each fee line's amount and source (samples/fee-table.json);
//   4. Demo › open the Study permit's Sample case: the walk's family (student, spouse, child), samples/sample-cases.json
//      and samples/sample-student-answers.json; the parents for IMM 5707 answered and confirmed on the officer's own
//      routes from tests/fixtures/bk13/parents.json (a Sample file cannot name relatives yet, dry-run gap C2);
//   5. every copy: generated, the filler's own read-back equal, and read back again from the PDF with the project's XFA
//      reader (every written form field holds a value; every list field holds one of its export values); counted;
//   6. row 12's bar (the tech lead on #1574 §8): nothing by hand, no "needs a fix"; fill trials are the Mac's (BK-20, D1),
//      reported as WAIT, not judged here; fees worked out from the table with each line's source.
// Sample people, made up; US$0 (saved AI answers only, live AI off). Exit 0 only when every check passes.
//   zsh studio/tools/isolated.sh forms_bk13 4452 start && tsx studio/tests/check_bk13_zero_code_run.ts 4452 xr_studio_forms_bk13
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const { call, until } = client(PORT, DB);
const { ok, summary } = recorder();
const json = (f: string) => JSON.parse(readFileSync(join(STUDIO, f), "utf8"));
const OFFICER = "user-O", AUTHOR = "user-A", KEY = "sp.outside";
const waits: string[] = [];

// 1. No code change (P-452 and the ruling on #1574 §8).
const CODE = ["engine/", "api/src/", "web/src/"].map((p) => `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/${p}`).concat("ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p5/");
let changed: string[] | null = null;
try { changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only", "origin/main", "--", ...CODE], { encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch { /* no origin/main here */ }
ok("BK-13 (P-452): this branch changes nothing under engine/, api/src/, web/src/ or prototype/p5/ against origin/main", changed !== null && changed.length === 0, changed ?? "git diff origin/main did not run");

// 2. The configured checkpoint (a copy that already holds it is used as it is).
const released = () => sql(`select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='${KEY}'`) !== "0";
if (!released()) {
  const r = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  ok("setup: Demo › Load the configured checkpoint", r.status < 300, r.status < 300 ? undefined : r.body);
  const ten = ((r.body?.checkpoint ?? []) as { row: string; status: string }[]).find((x) => x.row === "10");
  ok("BK-13: row 10 released the Study permit through submit, the SME's ticks and a different person's approval", ten?.status === "done" && (r.body?.released ?? []).some((l: string) => /Study permit/.test(l)), r.body?.released);
}
ok("BK-13: the Study permit has a release", released());
const combo = sql(`select id from combination where combination_key='${KEY}'`);
const snap = (part: string) => JSON.parse(sql(`select r.snapshot->'${part}' from config_release r where r.combination_id='${combo}' order by r.version desc limit 1`) || "null");

// 3. The seeded rows, checked against their data files (P-449: checked, not assumed).
const setup = json("samples/form-setup.json").combinations[KEY] as { rules: { form: string; who?: string }[]; documentsCited: { type: string; quote: string }[] };
const lines = snap("forms") as { form_number: string; who: string }[];
const missingForms = setup.rules.filter((r) => !lines.some((l) => l.form_number === r.form && (!r.who || l.who === r.who))).map((r) => `${r.form}/${r.who ?? "any"}`);
ok(`BK-13 data: every form rule of samples/form-setup.json is a form line of the release, with its who (${setup.rules.length})`, missingForms.length === 0, missingForms);
const maps = snap("field_maps") as { form_number: string; entries: { outcome: string }[] }[];
const unmapped = lines.filter((l) => !maps.some((m) => m.form_number === l.form_number && m.entries.some((e) => e.outcome === "mapped"))).map((l) => l.form_number);
ok(`BK-13 data: every form line has a published field map on the release (${lines.length} lines)`, unmapped.length === 0, unmapped);
const docs = snap("document_requirements") as { document_type: string; source_quote: string | null }[];
const cond = (json("samples/conditional-documents.json")[KEY]?.lines ?? []) as { type: string }[];
const wantDocs = [...setup.documentsCited.map((d) => d.type), ...cond.map((d) => d.type)];
const docsGone = wantDocs.filter((t) => !docs.some((d) => d.document_type === t && !!d.source_quote));
ok(`BK-13 data: every cited document line is on the release with its quote (${wantDocs.length}: documentsCited and the CAQ line)`, docsGone.length === 0, docsGone);

// 4. The Sample case: the walk's family, by data.
const opened = await call("POST", "/demo/sample-case", { combinationId: combo }, AUTHOR);
const sc = opened.body ?? {};
const want = json("samples/sample-cases.json").cases[KEY];
ok(`BK-13: the Study permit's Sample case opens from its data (${want.reference}, ${1 + want.people.length} people)`, opened.status < 300 && sc.reference === want.reference && sc.people === 1 + want.people.length, { status: opened.status, ref: sc.reference, people: sc.people });
ok("BK-13: every answer of the Sample file is taken (none refused) and no copy is refused", (sc.answerRefused ?? []).length === 0 && (sc.copiesRefused ?? []).length === 0 && sc.sampleAnswers > 100, { refused: sc.answerRefused, copies: sc.copiesRefused });
const caseId: string = sc.caseId;
const people = ((await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people ?? []) as { role: string; subject_id: string; label: string }[];
const name = new Map(people.map((p) => [p.subject_id, p.label]));

// The parents (IMM 5707), answered and confirmed on the officer's own routes.
type Sec = { subjectId: string; section: string; questions: { fact: string; answer?: { id?: string } | null }[] };
const view = async () => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []) as Sec[];
const rel = json("tests/fixtures/bk13/parents.json").relatives as Record<string, Record<string, unknown>>;
let v = await view();
const relSubjects = [...new Set(v.map((s) => s.subjectId).filter((s) => /\/parent_[12]$/.test(s)))];
const refusedRel: string[] = [];
for (const s of relSubjects) {
  const [subject, relation] = s.split("/");
  for (const [fact, value] of Object.entries(rel[relation] ?? {})) {
    if (!v.some((x) => x.subjectId === s && x.questions.some((q) => q.fact === fact))) continue;
    const r = await call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${relation}/${fact}`, { value, expectedId: null }, OFFICER);
    if (r.status >= 300) refusedRel.push(`${s} ${fact}: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
  }
}
v = await view();
for (const sec of v.filter((x) => relSubjects.includes(x.subjectId))) {
  const seen = sec.questions.map((q) => q.answer?.id).filter((x): x is string => !!x);
  if (!seen.length) continue;
  const r = await call("POST", `/runtime/cases/${caseId}/sections/${sec.section}/confirm`, { subjectId: sec.subjectId, seen }, OFFICER);
  if (r.status >= 300) refusedRel.push(`confirm ${sec.subjectId} ${sec.section}: ${r.status}`);
}
ok(`BK-13: the parents of the student and the spouse are answered and confirmed on the officer's routes (${relSubjects.length} relatives)`, relSubjects.length === 4 && refusedRel.length === 0, refusedRel);

// Every form each person files, generated again now that everything is answered (the Sample case made the first copies).
type Form = { form: string; subject_id: string; person: string; applies: boolean | "cannot_tell"; for_filing: boolean; channel: string; trial_passed: boolean; trial_why: string | null;
  readiness?: { missing?: { reason: string; fact: string; label: string }[] } };
const forms = ((await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body?.forms ?? []) as Form[];
const filed = forms.filter((f) => f.applies === true && f.for_filing);
const by = (s: string) => filed.filter((f) => f.subject_id === s).map((f) => f.form).sort().join(", ");
const role = (r: string) => people.find((p) => p.role === r)?.subject_id ?? "";
ok("BK-13: the student files IMM 1294, IMM 5476, IMM 5707; the spouse IMM 1295, IMM 5476, IMM 5707; the child IMM 5257, IMM 5476 (each their own application, BK-16)",
  by(role("principal")) === "IMM 1294, IMM 5476, IMM 5707" && by(role("spouse_or_partner")) === "IMM 1295, IMM 5476, IMM 5707" && by(role("child")) === "IMM 5257, IMM 5476",
  people.filter((p) => p.role !== "case").map((p) => `${p.label}: ${by(p.subject_id)}`));

// 5. Each copy: generated, read back by the filler and again from the PDF.
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
type Copy = { status: string; intact: boolean; file_ok: boolean; counts: Record<string, number>; by_hand: { label: string; why: string }[] };
const table: string[] = [];
let allByHand = 0, allNeedsFix = 0;
for (const f of filed) {
  const g = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(f.form)}/${f.subject_id}/generate`, { idempotencyKey: `bk13-${f.form}-${f.subject_id}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 80) }, OFFICER);
  const id: string = g.body?.id;
  await until(async () => !["QUEUED", "RUNNING"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body?.status), 120_000);
  const c = (await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body as Copy;
  const row = JSON.parse(sql(`select json_build_object('path', path, 'rb', result_json->'read_back_equal', 'boxes', result_json->'boxes') from form_instance where id='${id}'`)) as { path: string; rb: number; boxes: { box: string; result: string; why: string | null }[] };
  const who = `${f.form} for ${name.get(f.subject_id)}`;
  ok(`BK-13: ${who} is generated, its file intact, and the filler's read-back equals what it wrote (${c?.counts?.written} form fields)`, g.status === 202 && c?.status === "GENERATED" && c.intact && c.file_ok && row.rb === c.counts.written, { status: c?.status, intact: c?.intact, rb: row.rb, written: c?.counts?.written });
  const read = JSON.parse(execFileSync(PY, ["-I", READER, join(ROOT, row.path)], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim()) as { values: Record<string, string>; choices: { path: string; wrote: string; is_export: boolean }[] };
  const written = row.boxes.filter((b) => b.result === "written");
  const empty = written.filter((b) => !(read.values[b.box] ?? "").trim()).map((b) => b.box), badChoice = read.choices.filter((x) => !x.is_export).map((x) => `${x.path}=${x.wrote}`);
  ok(`BK-13: ${who} read back from the PDF: each of its ${written.length} written form fields holds a value; each list field holds one of its export values`, empty.length === 0 && badChoice.length === 0, { empty, badChoice });
  for (const b of badChoice) console.log(`      not an export value: ${b}`);
  // 6. Row 12's bar.
  const hand = c.by_hand ?? [], needsFix = (f.readiness?.missing ?? []).filter((m) => m.reason === "needs a fix");
  allByHand += hand.length; allNeedsFix += needsFix.length;
  ok(`BK-13 bar (row 12, #1574 §8): ${who}: nothing by hand`, hand.length === 0, row.boxes.filter((b) => b.result === "by hand").map((b) => b.why));
  ok(`BK-13 bar (row 12, #1574 §8): ${who}: no answer it writes "needs a fix"`, needsFix.length === 0, needsFix.map((m) => `${m.label}: ${m.fact}`));
  if (!f.trial_passed) waits.push(`${who}: ${f.trial_why}`);
  table.push(`| ${f.form} | ${name.get(f.subject_id)} | ${f.channel} | ${c.counts.written} | ${hand.length} | ${c.counts.blank} | ${c.counts.not_written} | ${row.rb === c.counts.written && empty.length === 0 && badChoice.length === 0 ? "equal" : `NOT equal (${badChoice.length} list values not an export value)`} | ${f.trial_passed ? "passed" : "none recorded"} |`);
}

// Fees, from the table, each line with its source.
type Fee = { key: string; amount: number; exempt: boolean; reason?: string; source_detail?: { quote?: string; read?: string } };
const prep = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body as { fees_worked_out: boolean; fees_why: string | null; fees: Fee[]; groups: { total_cents: number | null }[]; filings: { label: string }[] };
type Line = { key: string; basis: string; per_person_cad: number; family_max?: { cad: number; from_people: number }; source: { quote: string }; exempt?: { source: { quote: string } } };
const tableLines: Record<string, Line> = Object.fromEntries((json("samples/fee-table.json").lines as Line[]).map((l) => [l.key, l]));
// Each line cites its table row. A per-person line is its table amount; a line with a family maximum is carried whole by
// the principal's filing and marked exempt ("Family Rate") on the others (engine/runtime/filings.ts, BR-18), so it is
// checked through the total. A person the table exempts by age (biometrics: under 14) pays nothing on that line.
const fees = prep.fees ?? [];
const cites = (x: Fee) => [tableLines[x.key]?.source.quote, ...(x.exempt ? [tableLines[x.key]?.exempt?.source.quote] : [])].includes(x.source_detail?.quote);
const wrong = fees.filter((x) => !cites(x) || (!tableLines[x.key]?.family_max && x.amount !== (x.exempt ? 0 : tableLines[x.key]?.per_person_cad))).map((x) => `${x.key}: ${x.amount}${x.exempt ? " exempt" : ""} (${x.reason ?? ""}) quote ${JSON.stringify(x.source_detail?.quote ?? null)}`);
const ageExempt = (x: Fee) => x.exempt && !/family/i.test(x.reason ?? "");
const expected = Object.values(tableLines).reduce((sum, l) => {
  const n = fees.filter((x) => x.key === l.key && !ageExempt(x)).length;
  return sum + (l.family_max && n >= l.family_max.from_people ? l.family_max.cad : n * l.per_person_cad);
}, 0);
const total = prep.groups?.reduce((s, x) => s + (x.total_cents ?? 0), 0) / 100;
ok(`BK-13: fees worked out from samples/fee-table.json, each line its table amount and source; total CAD ${total} = the table's CAD ${expected}`, prep.fees_worked_out && wrong.length === 0 && total === expected && prep.groups.length === 1, { why: prep.fees_why, wrong, total, expected });
ok("BK-13: one filing per person, named by the document it is for", prep.filings.map((x) => x.label.split(":")[0]).sort().join(", ") === "Study permit (outside Canada), Visitor visa, Work permit", prep.filings.map((x) => x.label));

console.log("\n| Form | Person | Channel | Written | By hand | Blank | Not written | Read back | Fill trial |\n|---|---|---|---|---|---|---|---|---|\n" + table.join("\n"));
console.log(`\nCopies: ${table.length}; by hand: ${allByHand}; "needs a fix": ${allNeedsFix}; fees CAD ${total}.`);
for (const w of waits) console.log(`WAIT  (the Mac's evidence, BK-20 / dry-run D1, not judged here) ${w}`);
process.exit(summary() ? 1 : 0);
