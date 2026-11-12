// qa retest of QA-395 (12 Nov, C7.3 re-score; the fresh reader's point): the person's own country ALONE, inside the past
// 5 years and longer than 6 months, so no other condition can explain a No. Copied from tests/check_qa395_q8a_counts.ts
// (the fix's own check), its cases replaced. Fails before #1566 (any entry gave Y), passes after.
//   zsh studio/tools/isolated.sh qa_q395b 4479 start && tsx studio/tests/qa/check_qa395_own_country.ts 4479 xr_studio_qa_q395b
// Original header follows.
// QA-395 (C7.1, C7.2, Major; qa on #1557; tech lead Lead 18, 11 Nov): IMM 5257 (09-2023) p. 1 asks "Question 8 A. During the
// past 5 years have you lived in any country other than your country of citizenship or your current country of residence
// for more than 6 months?" (the form's own caption, p1/inventory/imm5257e.inventory.json, PCRIndicator). Before this fix the
// copy wrote Y for any previous-residence entry, even the person's own country for one day in 2015. Now a previous
// residence counts only when its country is neither the person's citizenship nor their current country of residence, and
// it covers more than 6 months of the past 5 years. Pass and fail per rule, on one person's one entry changed step by
// step; the copy is read back from its own PDF (the proven E5 reader). Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh forms_q395 4452 start && tsx studio/tests/check_qa395_q8a_counts.ts 4452 xr_studio_forms_q395
// It resets its copy and loads the configured checkpoint itself (as check_c73_parts_checkpoint.ts), so the suite runner
// runs it on its own copy.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUTHOR, CLIENT, OFFICER, PORT, agent, call, confirmAll, copyBytes, fillEverything, generateCopy, needVisitorVisa, ok, openCase, rec, yearsAgo } from "../../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every value a filled PDF holds, by its form field's data path (the proven E5 reader, as check_b155_siblings.ts). */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "q395-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type Q = { subjectId: string; fact: string; answer: { id: string; value?: unknown } | null; rows: { row: string; answer: { id: string } | null }[] };
type S = { subjectId: string; section: string; questions: Q[] };
const FORM = "IMM 5257", COUNTRY = "person.previous_residence_country", FROM = "person.previous_residence_from", TO = "person.previous_residence_to";

if (PORT === 4400) { console.log("STOP  never the demo (:4400): this check resets its copy"); process.exit(2); }
const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR), load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
if (reset.status >= 300 || load.status >= 300) { console.log(`STOP  the configured checkpoint did not load: reset ${reset.status}, load ${load.status}`); process.exit(2); }
const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
const P = c.subjects["Sample Client A"];
const sections = async () => ((await agent(c.id))?.sections ?? []) as S[];
const group = (await sections()).find((x) => x.subjectId === P && x.questions.some((q) => q.fact === COUNTRY))?.section;
ok("setup: the principal's previous residences take one entry", !!group && (await call("POST", `/runtime/cases/${c.id}/groups/${P}/rows`, { group }, OFFICER)).status < 300, group);
ok("setup: every fact answered and confirmed (citizenship and residence India, as the Sample family)", await fillEverything(c.id));
const qOf = async (fact: string) => (await sections()).flatMap((x) => x.questions).find((q) => q.subjectId === P && q.fact === fact);
/** The principal's one entry, as the client answers it (it is the principal's own), then confirmed by the officer. */
async function entry(country: string, from: string, to: string) {
  for (const [fact, value] of [[COUNTRY, country], [FROM, from], [TO, to]] as const) {
    const q = await qOf(fact), r = q?.rows[0];
    const res = await call("PUT", `/runtime/cases/${c.id}/answers/${P}/${fact}`, { value, expectedId: r?.answer?.id ?? null, row: r?.row }, CLIENT);
    if (res.status >= 300) console.log(`note: ${fact} = ${value}: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  await confirmAll(c.id, P);
}
/** Q8 A as the PDF copy writes it now. */
async function q8a(): Promise<string | undefined> {
  const copyId = await generateCopy(c.id, FORM, P);
  const v = copyId ? pdfValues(await copyBytes(copyId)) : {};
  return Object.entries(v).find(([k]) => /PersonalDetails\[0\]\.PCRIndicator/.test(k))?.[1];
}
const own = Object.fromEntries((await sections()).flatMap((x) => x.questions).filter((q) => q.subjectId === P && ["person.citizenship", "person.current_residence_country"].includes(q.fact)).map((q) => [q.fact, q.answer?.value]));
ok("setup: the principal's citizenship and current country of residence are India", own["person.citizenship"] === "India" && own["person.current_residence_country"] === "India", own);

// Own country alone: India (the person's citizenship and current residence), 3 to 1 years ago (24 months inside the 5 years).
await entry("India", yearsAgo(3), yearsAgo(1));
let v = await q8a();
ok("QA-395 fail (own country alone): India, the person's own country, for two years ending a year ago: the copy writes N", v === "N", v);
// The same dates in another country: Y (so the dates alone give Yes, and only the country turns it to No).
await entry("United States", yearsAgo(3), yearsAgo(1));
v = await q8a();
ok("QA-395 pass (control): the same dates in another country (United States): the copy writes Y", v === "Y", v);
process.exit(rec.summary() ? 1 : 0);
