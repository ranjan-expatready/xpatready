// QA-361 (Bug · Major; C10.2, C7.2), qa lane, main 7e32ee210, 9 Nov: the finished story's Paper IMM 5257 cannot pass
// Adobe's own Validate on the case's facts. Its AltPhone and Fax blocks are written "Canada/US" (CanadaUS = 1, country
// code 1) with no North American number parts (AreaCode, FirstThree, LastFive): the story's Sample phone by kind is
// "+1 5550100" (samples/finished-story.json by_kind.phone, 7 digits) and the writer does not write those parts ("not in
// the executable set yet"). IMM 5257 (09-2023) p. 2, its own script: validateAlternateTelephone and validateFaxNumber
// ("Negative Case: When Canada US is checked, and NA fields arent visible" clears the switch and shows "negative_case";
// the Canada/US box's click marks AreaCode, FirstThree and LastFive required), so Validate stops there unless a person
// types a number the case does not hold. The copy's person step also says "The number is already written" for each block.
// Expected: on the Paper copy, a phone block written Canada/US carries its number parts, or the block is written as an
// international number (Other + IntlNumber); and no person step says "already written" for a block with no number parts.
// FAILS today (QA-361-1, -2); PASSES when the story's Sample phone or the writer is fixed. US$0, no model call.
//   tsx studio/tests/qa/check_qa361_paper_phone.ts <port> <database>     (an isolated copy; the story empties it first)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, OFFICER, call, main, ok, sql, until } from "../../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
const C = "form1[0].Page2[0].ContactInformation[0].contact[0].";
const BLOCKS = [{ name: "main telephone", at: `${C}PhoneNumbers[0].Phone[0].` }, { name: "alternate telephone", at: `${C}PhoneNumbers[0].AltPhone[0].` }, { name: "fax", at: `${C}FaxEmail[0].Phone[0].` }];

await main("QA-361", "the finished story's Paper IMM 5257: its phone blocks can pass Adobe's Validate", async () => {
  const r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, AUTHOR);
  const done = r.status === 202 && await until(async () => { const b = (await call("GET", "/demo/status", undefined, AUTHOR)).body; return b?.story?.state === "done" && b?.checkpoint === "finished_story"; }, 900_000);
  ok("QA-361 setup: the finished story is loaded", done, r.status);
  const person: string = JSON.parse(readFileSync(join(STUDIO, "samples", "finished-story.json"), "utf8")).paper_line.person;
  const caseId = sql(`select id from runtime_case where reference='SAMPLE-VV-FAMILY-1'`) ?? "";
  const prep = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body as { people?: { subject: string; label: string }[] } | null;
  const subject = (prep?.people ?? []).find((x) => x.label === person)?.subject ?? "";
  const row = (sql(`select id || '|' || path from form_instance where case_id='${caseId}' and subject_id='${subject}' and form_number='IMM 5257' and status='GENERATED' and path is not null order by created_at desc limit 1`) ?? "").split("|");
  ok("QA-361 setup: the Paper IMM 5257 copy of the story's Paper person exists", !!row[1], { person, caseId, subject });
  if (!row[1]) return;
  const read = JSON.parse(execFileSync(PY, ["-I", READER, join(ROOT, row[1])], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n")[0]) as { values: Record<string, string> };
  const v = read.values;
  const naParts = (at: string) => ["AreaCode", "FirstThree", "LastFive"].filter((p) => v[`${at}NANumber[0].${p}[0]`]).length;
  const blocks = BLOCKS.map((b) => ({ name: b.name, canadaUS: v[`${b.at}CanadaUS[0]`] ?? "", country: v[`${b.at}NumberCountry[0]`] ?? "", na: naParts(b.at), intl: v[`${b.at}IntlNumber[0].IntlNumber[0]`] ?? "" }));
  const stuck = blocks.filter((b) => b.canadaUS === "1" && b.na < 3);
  ok("QA-361-1: every phone block written \"Canada/US\" carries its North American number parts (else Adobe's Validate requires them and the case holds no such number)", stuck.length === 0, blocks);
  const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body;
  // This copy's own steps: the object in the forms list whose id is the copy's (person_steps, api/src/fill-case.ts).
  const find = (x: unknown): { person_steps?: string[] } | null => { if (!x || typeof x !== "object") return null; const o = x as Record<string, unknown>; if (o.id === row[0] && Array.isArray(o.person_steps)) return o as { person_steps: string[] }; for (const y of Object.values(o)) { const f = find(y); if (f) return f; } return null; };
  const copy = find(forms);
  const steps = (copy?.person_steps ?? []).filter((s) => s.includes("The number is already written"));
  const sayWritten = steps.length, haveParts = blocks.filter((b) => b.canadaUS === "1" && b.na === 3).length;
  ok("QA-361-2: no person step says \"The number is already written\" for a Canada/US block with no number parts", sayWritten <= haveParts, { copyFound: !!copy, sayWritten, haveParts, step: steps[0]?.slice(0, 160) });
});
