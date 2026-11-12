// QA-415 (P-486; packs C7.1-application-type and C6.2-application-type): the two family cases the ruling names, opened
// and answered on the configured checkpoint through the routes a person uses (acceptance/lib/m3.ts): a Study permit
// (outside Canada) family (Client A the student, a spouse, a child of 15 who will study 6 months or more) and a Visitor
// visa family (lib/m3.ts FAMILY: two adults, children of 10 and 15). Each person's forms are generated and read back from
// the files with the project's own XFA reader (tests/fixtures/read_choice_values.py, as tests/check_qa403_who_fills.ts).
// Sample people; no model call (US$0).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answer, call, copyBytes, FAMILY, fillEverything, generateCopy, needVisitorVisa, openCase, sql, yearsAgo, type Case, type Person } from "./m3.ts";

const STUDIO = join(import.meta.dirname, "..", "..");
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
const dir = mkdtempSync(join(tmpdir(), "qa415-"));

export const STUDY_FAMILY: Person[] = [
  { role: "principal", name: "Sample Student A", dob: yearsAgo(30) },
  { role: "spouse_or_partner", name: "Sample Spouse B", dob: yearsAgo(31) },
  { role: "child", name: "Sample Child B", dob: yearsAgo(15) },
];
export const STUDIES = "person.studies_six_months_or_more";

/** The Study permit combination on this copy, or a stop as setup missing (exit 2: the configured checkpoint holds it). */
export function needStudyPermit(): string {
  const id = sql("select id from combination where combination_key='sp.outside'");
  if (!id) { console.log("Setup missing: load the configured checkpoint (Demo › Load) on this copy."); process.exit(2); }
  return id;
}

export type Family = { c: Case; forms: { form: string; subject_id: string; person: string; applies: boolean }[] };
/** A Study permit family: opened, the child's "6 months or more" answered Yes by the case officer, every answer given. */
export async function studyFamily(): Promise<Family> {
  const c = await openCase(needStudyPermit(), STUDY_FAMILY);
  await answer(c.id, c.subjects["Sample Child B"], STUDIES, true);
  await fillEverything(c.id);
  return { c, forms: (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, c.officer)).body?.forms ?? [] };
}
/** A Visitor visa family (lib/m3.ts FAMILY), every answer given. */
export async function visitorFamily(): Promise<Family> {
  const c = await openCase(needVisitorVisa(), FAMILY);
  await fillEverything(c.id);
  return { c, forms: (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, c.officer)).body?.forms ?? [] };
}

/** A person's copy of a form, generated and read back from its file: every non-empty value by data path, and the copy's
 *  own counts and by-hand lines. Null when the person has no such form. */
export type ReadCopy = { values: Record<string, string>; counts: { by_hand: number } | null; byHand: { fact?: string; label?: string; why?: string }[] };
export async function readCopy(f: Family, form: string, name: string): Promise<ReadCopy | null> {
  const subject = f.c.subjects[name];
  if (!f.forms.some((x) => x.form === form && x.subject_id === subject && x.applies)) return null;
  const id = await generateCopy(f.c.id, form, subject);
  if (!id) return null;
  const copy = (await call("GET", `/runtime/form-copies/${id}`, undefined, f.c.officer)).body;
  const file = join(dir, `${id}.pdf`);
  writeFileSync(file, await copyBytes(id, f.c.officer));
  const out = execFileSync(PY, ["-I", READER, file], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop()!;
  return { values: (JSON.parse(out) as { values: Record<string, string> }).values, counts: copy?.counts ?? null, byHand: copy?.by_hand ?? [] };
}
/** The value at a data path ending in `tail`. */
export const at = (vals: Record<string, string> | undefined, tail: string) => Object.entries(vals ?? {}).find(([k]) => k.endsWith(tail))?.[1];
/** IMM 5645's "Type of application" boxes, read back: the one ticked ("1"), as its box's name. */
export const ticked = (vals: Record<string, string> | undefined) => ["Visitor", "Worker", "Student", "Other"].filter((b) => at(vals, `Subform1[0].${b}[0]`) === "1");
