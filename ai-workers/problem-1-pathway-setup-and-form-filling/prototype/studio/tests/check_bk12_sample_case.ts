// BK-12 checks (P-448, P-449, P-452; Bake plan row 26): the Sample case a pathway opens is chosen in data
// (samples/sample-cases.json, by combination key), never in code. Pure checks of the data reader first (each rule a pass
// and a fail), then on an isolated copy with the configured checkpoint loaded: the Study permit opens ITS OWN Sample case
// through POST /api/demo/sample-case with no engine, API or screen code naming it (B164's guard reads sample-case.ts and
// demo-sample-case.ts), the Visitor visa's family case still loads as before (rows 11 and 12), and a combination whose
// data names no Sample case is refused in words. Made-up people (Sample). No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_bk12 4432 start && tsx studio/tests/check_bk12_sample_case.ts 4432 xr_studio_runtime_bk12
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sampleAnswersFile, sampleCasesFrom, SAMPLE_CASES_FILE } from "../api/src/sample-cases.ts";
import { FORM_SETUP } from "../api/src/form-setup.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4432), DB = process.argv[3] ?? "xr_studio_runtime_bk12";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");

// (1) The data, read as it is.
const data = sampleCasesFrom();
const vv = data.cases["vv.single"], sp = data.cases["sp.outside"];
ok("BK-12 pass: the demo story's Sample case is the one the data's story names (vv.single)", data.story === "vv.single" && !!vv);
ok("BK-12 pass: the Visitor visa's Sample case is today's family of four (reference, the three people, the record, the made-up facts, its answers and read-backs)",
  vv.reference === "SAMPLE-VV-FAMILY-1" && vv.principal === "Client A (Sample)" && vv.people.map((p) => `${p.id}/${p.role}`).join(",") === "spouse_or_partner/spouse_or_partner,child-1/child,child-2/child"
  && vv.record?.join(",") === "case,principal,spouse_or_partner,child-1" && vv.made_up?.["child-1"]?.["person.date_of_birth"] === "2016-05-20" && vv.made_up?.["child-2"]?.["person.date_of_birth"] === "2007-03-14"
  && vv.family_name_from_principal?.join() === "child-2" && vv.answers === "sample-family-imm5257.json" && vv.validated === "samples/validated-imm5257.json", vv);
ok("BK-12 pass: the Study permit has its own Sample case: its own reference, principal and answers file, labelled Sample",
  !!sp && sp.reference !== vv.reference && sp.answers !== vv.answers && /\(Sample\)/.test(sp.principal) && /^Sample/.test((sampleAnswersFile(sp.answers) as unknown as { label: string }).label), sp);
ok("BK-12 pass: every name in the people's display names is labelled Sample (AGENTS rule 4)", Object.values(data.cases).every((c) => /\(Sample\)/.test(c.principal) && c.people.every((p) => /\(Sample\)/.test(p.displayName))));
ok("BK-12 pass: the application form whose copies are counted comes from form-setup.json (IMM 1294 for the Study permit)", FORM_SETUP["sp.outside"]?.application === "IMM 1294");

// (2) A changed copy of the data: a combination gets a Sample case by data alone; a bad entry is refused naming it.
const dir = mkdtempSync(join(tmpdir(), "bk12-"));
const raw = JSON.parse(readFileSync(SAMPLE_CASES_FILE, "utf8"));
const copy = (change: (d: typeof raw) => void) => { const d = structuredClone(raw); change(d); const f = join(dir, `c${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify(d)); return f; };
const refusal = (f: string) => { try { sampleCasesFrom(f); return ""; } catch (e) { return (e as Error).message; } };
ok("BK-12 pass: a new combination's Sample case is read from data alone (x.any)", sampleCasesFrom(copy((d) => { d.cases["x.any"] = { reference: "SAMPLE-X-1", principal: "Person X (Sample)", people: [], answers: "sample-student-answers.json" }; })).cases["x.any"]?.reference === "SAMPLE-X-1");
const fails: [string, (d: typeof raw) => void, RegExp][] = [
  ["an entry without its reference", (d) => { delete d.cases["sp.outside"].reference; }, /sp\.outside: needs its reference/],
  ["an entry without its answers file", (d) => { d.cases["sp.outside"].answers = " "; }, /sp\.outside: needs its answers/],
  ["an entry without its people", (d) => { delete d.cases["sp.outside"].people; }, /sp\.outside: needs its people/],
  ["a field the reader does not know", (d) => { d.cases["sp.outside"].made_upp = {}; }, /sp\.outside: "made_upp" is not a known name/],
  ["two cases with one reference", (d) => { d.cases["sp.outside"].reference = "SAMPLE-VV-FAMILY-1"; }, /reference SAMPLE-VV-FAMILY-1 is also vv\.single's/],
  ["a person without a role", (d) => { delete d.cases["vv.single"].people[0].role; }, /vv\.single: each person needs an id, a role and a displayName/],
  ["a person's id given twice", (d) => { d.cases["vv.single"].people[1].id = "spouse_or_partner"; }, /vv\.single: a person's id is given twice/],
  ["made-up facts for an id on no one", (d) => { d.cases["vv.single"].made_up["child-9"] = { "person.given_names": "X" }; }, /vv\.single: child-9 is on no one/],
  ["a reference that differs only in case (review m4)", (d) => { d.cases["sp.outside"].reference = "sample-vv-family-1"; }, /reference sample-vv-family-1 is also vv\.single's \(ignoring case\)/],
  ["a misspelt answers file, before any case opens (review m2)", (d) => { d.cases["sp.outside"].answers = "sample-studnet-answers.json"; }, /sp\.outside: answers file samples\/sample-studnet-answers\.json is not there/],
  ["a validated file that is not there (review m2)", (d) => { d.cases["vv.single"].validated = "samples/nothing-here.json"; }, /vv\.single: validated file samples\/nothing-here\.json is not there/],
  ["a story that names no case", (d) => { d.story = "x.none"; }, /story: "x\.none" names no case/],
];
for (const [what, change, words] of fails) { const said = refusal(copy(change)); ok(`BK-12 fail: ${what} is refused, naming it`, words.test(said), said); }

// (3) The code names no pathway: the B164 guard reads both files (neither is a fixture any more).
const b164 = readFileSync(join(STUDIO, "tests/check_b164_no_engine_keys.ts"), "utf8");
ok("BK-12 pass: B164's allow-list has no entry for sample-case.ts, sample-cases.ts or demo-sample-case.ts (all three are read by the guard)", !/"file": "api\/src\/(demo-sample-case|sample-cases?)\.ts"/.test(b164));
const code = ["api/src/sample-case.ts", "api/src/sample-cases.ts", "api/src/demo-sample-case.ts"].map((f) => readFileSync(join(STUDIO, f), "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ""));
ok("BK-12 pass: none of the three files' code names a combination of the data or a form number", code.every((c) => !Object.keys(data.cases).some((k) => c.includes(`"${k}"`)) && !/IMM ?\d{4}/.test(c)));

(async () => {
  // (4) The configured checkpoint: the Visitor visa's family case opens as before.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  let r = await call("POST", "/demo/load", { sample: "configured" });
  ok("setup: the configured checkpoint loads", r.status === 200 || r.status === 201, typeof r.body === "object" ? r.body?.detail : r.body);
  const rows: { row: string; status: string; shows: string }[] = r.body?.checkpoint ?? [];
  const row = (n: string) => rows.find((x) => x.row === n);
  ok("BK-12 pass: row 11 as before: the family case SAMPLE-VV-FAMILY-1 on release 1 with 4 people and the record's answers", row("11")?.status === "done" && /^Case SAMPLE-VV-FAMILY-1 on release 1: 4 people/.test(row("11")?.shows ?? ""), row("11"));
  ok("BK-12 pass: row 12 as before: IMM 5257 made for each of the 4 applicants", /^IMM 5257 generated for 4 of 4 applicants on release 1/.test(row("12")?.shows ?? ""), row("12"));
  const famId = sql("select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'");
  const vvId = sql("select id from combination where combination_key='vv.single'"), spId = sql("select id from combination where combination_key='sp.outside'");
  const lmia = sql("select id from combination where combination_key='wp.lmia_inside'");
  ok("setup: the Study permit is released by the checkpoint (row 10)", (r.body?.released ?? []).some((l: string) => /Study permit/.test(l)), r.body?.released);

  // (5) The Study permit opens its own Sample case, from its data.
  r = await call("POST", "/demo/sample-case", { combinationId: spId });
  const spCase = r.body?.caseId;
  ok("BK-12 pass: the Study permit's Sample case opens from its data (reference, combination, application form)", (r.status === 200 || r.status === 201) && r.body.reference === "SAMPLE-SP-FAMILY-1" && r.body.combination === "sp.outside" && r.body.applicationForm === "IMM 1294", r.body);
  // P-598 (tech lead on #1747): the Study permit's newest release is 2 (its questions on IMM 5707, a form other combinations
  // file too, released after every combination's release 1); a case opens on the newest release.
  ok("BK-12 pass: it is on the Study permit's newest release (2, P-598), with its own principal and its own family of three (BK-13), not the Visitor visa's family",
    sql(`select c.combination_id || '|' || s.label from runtime_case c join case_participant p on p.case_id=c.id and p.role='principal' join answer_subject s on s.id=p.subject_id where c.id='${spCase}'`) === `${spId}|Student A (Sample)` && r.body.people === 3
    && r.body.release === Number(sql(`select max(version) from config_release where combination_id='${spId}'`)) && r.body.release === 2, r.body);
  ok("BK-12 pass: every answer of its own file is taken by its release (none refused) and its sections confirmed", r.body.sampleAnswers > 20 && r.body.answerRefused?.length === 0 && r.body.confirmed > 0 && r.body.fromRecord === 0, { answers: r.body.sampleAnswers, refused: r.body.answerRefused });
  ok("BK-12 pass: its application form is copied for its one applicant (IMM 1294: the student; the child does not study, BK-13)", r.body.applicants === 1 && r.body.applicationCopies === 1 && r.body.copies.some((c: string) => /^IMM 1294 /.test(c)), r.body.copies);
  r = await call("POST", "/demo/sample-case", { combinationId: spId });
  ok("BK-12 pass: opening it again gives the same case (no second case)", r.body?.caseId === spCase && sql("select count(*) from runtime_case where reference='SAMPLE-SP-FAMILY-1'") === "1", r.body?.caseId);
  r = await call("POST", "/demo/sample-case", { combinationId: vvId });
  ok("BK-12 pass: the Visitor visa's Sample case, asked the same way, is the story's family case", r.body?.caseId === famId && r.body?.reference === "SAMPLE-VV-FAMILY-1" && r.body?.people === 4, { famId, got: r.body?.caseId });

  // (6) The refusals.
  r = await call("POST", "/demo/sample-case", { combinationId: lmia });
  ok("BK-12 fail: a combination whose data names no Sample case is refused in words, and no case opens", r.status === 409 && /No Sample case is set for .*samples\/sample-cases\.json names none/.test(r.body?.detail ?? r.body?.message ?? "") && sql(`select count(*) from runtime_case where combination_id='${lmia}'`) === "0", r.body);
  r = await call("POST", "/demo/sample-case", { combinationId: spId }, "user-O");
  ok("BK-12 fail: someone without the author duty is refused (403)", r.status === 403, r.status);
  r = await call("POST", "/demo/sample-case", { combinationId: "not-an-id" });
  ok("BK-12 fail: a combination id that is not one is refused (400)", r.status === 400, r.body);
  r = await call("POST", "/demo/sample-case", { combinationId: "00000000-0000-4000-8000-000000000000" });
  ok("BK-12 fail: an unknown combination is refused (404)", r.status === 404, r.body);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
