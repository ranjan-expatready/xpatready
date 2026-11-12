// QA-392b (C7.3, Major; qa on #1553's review P1; tech lead Lead 17, 11 Nov): the Yes side of QA-392. On the configured
// checkpoint's release 2 IMM 5257 is filed Online. Its "recorded" Yes/No boxes (Question 8 A PCRIndicator, Education
// Question 1 EducationIndicator, and the other names, national identity document and US card Yes/Nos) are written by the
// PDF copy from whether something is recorded. With an education entry and a previous residence entry the copy writes Y;
// before this fix the answer sheet had no Yes line, only the entry's own value again ("Name of the school …: SAMPLE"), so
// the officer was never told to answer Yes in the portal. Now the sheet carries each such box's own answer, Yes or No,
// labelled with the form's own question, for every recorded box the copy writes: one rule with the copy (the sheet runs
// the copy's own value step, engine/form-values.ts formValues, and reads each box back through its own yes/no code;
// engine/form-values.ts recordedYesNo). The copy is read back from its own PDF (the proven E5 reader). Pass and fail per
// rule; the fail case is the "none apply" case (QA-392's No) on the spouse. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh forms_q392b 4452 start && tsx studio/tests/check_qa392b_recorded_yes_no.ts 4452 xr_studio_forms_q392b
// It resets its copy and loads the configured checkpoint itself (as check_c73_parts_checkpoint.ts), so the suite runner
// runs it on its own copy.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { proseRecorded, recordedDerivation } from "../../p5/transforms.ts";
import { AUTHOR, CLIENT, OFFICER, PORT, agent, call, confirmAll, copyBytes, fillEverything, generateCopy, itemsOf, needVisitorVisa, ok, openCase, prepare, rec, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every value a filled PDF holds, by its form field's data path (the proven E5 reader, as check_b155_siblings.ts). */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "q392b-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type Line = { label: string; fact: string; subject: string; row: number | null; value: unknown; copy_text: string };
type Sheet = { sections: { key: string; title: string; answers: Line[] }[] };
type Box = { box: string; fact: string | null; about: string | null; transform?: string | null; caption?: string };
const FORM = "IMM 5257";

if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR), load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (reset.status >= 300 || load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status}`); process.exit(2); }
const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
// The principal has one post-secondary education entry and one previous residence; the spouse answers "none apply" (QA-392).
const sections = ((await agent(c.id))?.sections ?? []) as { subjectId: string; section: string; questions: { fact: string }[] }[];
const groupOf = (subject: string, fact: string) => sections.find((x) => x.subjectId === subject && x.questions.some((q) => q.fact === fact))?.section;
for (const fact of ["person.education_school_name", "person.previous_residence_country"]) {
  const g = groupOf(P, fact);
  ok(`setup: the principal's list for ${fact} takes an entry`, !!g && (await call("POST", `/runtime/cases/${c.id}/groups/${P}/rows`, { group: g }, OFFICER)).status < 300, g);
}
ok("setup: every fact answered and confirmed (the principal's entries, the spouse's lists \"none apply\")", await fillEverything(c.id));
// QA-395 (#1566): Q8 A counts only another country for more than 6 months of the past 5 years, so the principal's previous
// residence is made one that counts (the Sample family's own country, India, would rightly give No).
{
  type Row = { row: string; answer: { id: string } | null };
  const qOf = async (fact: string) => (((await agent(c.id))?.sections ?? []) as { questions: { subjectId: string; fact: string; rows: Row[] }[] }[]).flatMap((x) => x.questions).find((q) => q.subjectId === P && q.fact === fact);
  for (const [fact, value] of [["person.previous_residence_country", "United States"], ["person.previous_residence_from", yearsAgo(3)], ["person.previous_residence_to", yearsAgo(1)]] as const) {
    const r = (await qOf(fact))?.rows[0];
    await call("PUT", `/runtime/cases/${c.id}/answers/${P}/${fact}`, { value, expectedId: r?.answer?.id ?? null, row: r?.row }, CLIENT);
  }
  await confirmAll(c.id, P);
}
const item = async (who: string) => itemsOf((await prepare(c.id)).p, who, FORM).find((i) => i.channel === "ONLINE");

async function check(who: string, name: string, expectYes: boolean) {
  const it = await item(who);
  const sheet = it ? (await call("GET", `/runtime/items/${it.id}/answer-sheet`, undefined, OFFICER)).body as Sheet : null;
  const copyId = await generateCopy(c.id, FORM, who);
  const values = copyId ? pdfValues(await copyBytes(copyId)) : {};
  const boxes = JSON.parse(sql(`select s.facts_json->'boxes' from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = '${copyId}'`) ?? "[]") as Box[];
  const recorded = boxes.filter((b) => b.about && b.about !== "case" && (recordedDerivation(b.transform) || proseRecorded(b.transform)));
  const lines = (sheet?.sections ?? []).flatMap((x) => x.answers);
  ok(`setup: ${name}'s Online ${FORM} has a sheet and a PDF copy, and the copy carries "recorded" Yes/No boxes`, !!sheet && Object.keys(values).length > 0 && recorded.length >= 2, { sheet: !!sheet, values: Object.keys(values).length, recorded: recorded.length });
  // What the PDF holds for each recorded box, by its data path (the reader's paths drop the [0] of the last step at most).
  const pdfOf = (box: string) => values[box] ?? values[box.replace(/\[0\]$/, "")] ?? Object.entries(values).find(([k]) => k.replace(/\[0\]/g, "") === box.replace(/\[0\]/g, ""))?.[1];
  const yesNo = (b: Box, v: string | undefined) => { const m = /(?:yes_no_code|check_code):([^/;\s]+)\/([^;\s]+)\s*$/.exec(b.transform ?? ""); return !v || !m ? undefined : v === m[1] ? true : v === m[2] ? false : undefined; };
  // Review M1: the form's caption labels the line only when no other form field of the copy shares it (IMM 5257's field
  // list gives the US card's Yes/No the national identity document's caption); else the release's own question.
  const shared = (caption?: string) => !!caption && boxes.filter((x) => x.caption === caption).length > 1;
  const labelOk = (b: Box, label: string) => (shared(b.caption) ? label !== b.caption && label.length > 3 : label === b.caption);
  const written = recorded.map((b) => ({ b, pdf: pdfOf(b.box) })).filter((x) => yesNo(x.b, x.pdf) !== undefined);
  const wrong = written.filter(({ b, pdf }) => { const l = lines.find((x) => x.subject === b.about && x.fact === b.fact && x.row === null); const want = yesNo(b, pdf); return !l || l.value !== want || l.copy_text !== (want ? "Yes" : "No") || !labelOk(b, l.label); })
    .map(({ b, pdf }) => { const l = lines.find((x) => x.subject === b.about && x.fact === b.fact && x.row === null); return `${b.box.split(".").slice(-2).join(".")}: PDF ${pdf}, sheet ${l ? `${l.label.slice(0, 40)}… = ${l.copy_text}` : "no line"}`; });
  ok(`QA-392b${expectYes ? "" : " (fail: \"none apply\")"}: for every "recorded" Yes/No box the PDF copy of ${name}'s ${FORM} writes (${written.length}), the answer sheet carries the same answer, Yes or No, on that person's line for the box's fact, labelled with the form's own question`, written.length >= 2 && wrong.length === 0, wrong);
  for (const [path, label] of [["PCRIndicator", "Question 8 A"], ["EducationIndicator", "Education Section Question 1"]] as const) {
    const b = recorded.find((x) => x.box.includes(path)), pdf = b ? pdfOf(b.box) : undefined, l = b ? lines.find((x) => x.subject === b.about && x.fact === b.fact && x.row === null) : undefined;
    ok(`QA-392b${expectYes ? "" : " (fail)"}: ${name}'s ${path}: the PDF writes ${expectYes ? "Y" : "N"} and the sheet's "${label} …?" reads ${expectYes ? "Yes" : "No"}`, pdf === (expectYes ? "Y" : "N") && l?.copy_text === (expectYes ? "Yes" : "No") && l.label.startsWith(label), { pdf, line: l ? [l.label.slice(0, 50), l.copy_text] : null });
  }
  const lineOf = (path: string) => { const b = recorded.find((x) => x.box.includes(path)); return b ? lines.find((x) => x.subject === b.about && x.fact === b.fact && x.row === null) : undefined; };
  const us = lineOf("usCardIndicator"), nat = lineOf("natIDIndicator");
  ok(`QA-392b review M1 (fail): ${name}'s US card line never asks the national identity document's question (the two boxes share one caption on IMM 5257's field list)`, !!us && !!nat && us.label !== nat.label && !/national identity/i.test(us.label), { us: us?.label, nat: nat?.label });
  return lines;
}
const linesP = await check(P, "Sample Client A", true);
await check(S, "Sample Spouse A", false);
// The entry's own value stays on its own row line (the officer types the school in the portal's list), never instead of the Yes.
ok("QA-392b: the principal's school name is still on the sheet, on its entry's own line (row 1)", linesP.some((l) => l.fact === "person.education_school_name" && l.row === 0 && l.copy_text === "SAMPLE"), linesP.filter((l) => l.fact === "person.education_school_name").map((l) => [l.row, l.copy_text]));
process.exit(rec.summary() ? 1 : 0);
