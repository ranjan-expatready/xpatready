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
import { answer, AUTHOR, call, confirmAll, copyBytes, DB, FAMILY, fillEverything, generateCopy, needVisitorVisa, openCase, PORT, sql, yearsAgo, type Case, type Person } from "./m3.ts";

const STUDIO = join(import.meta.dirname, "..", "..");
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests/fixtures/read_choice_values.py"); // one string: names the reader alone, not its folder (select-suites)
const dir = mkdtempSync(join(tmpdir(), "qa415-"));

export const STUDY_FAMILY: Person[] = [
  { role: "principal", name: "Sample Student A", dob: yearsAgo(30) },
  { role: "spouse_or_partner", name: "Sample Spouse B", dob: yearsAgo(31) },
  { role: "child", name: "Sample Child B", dob: yearsAgo(15) },
];
export const STUDIES = "person.studies_six_months_or_more";

/** The configured checkpoint on this copy (Demo › Load), loaded by the pack itself when the copy holds anything else.
 *  Gate B runs C7.1's and C6.2's packs on their scoring data, the six (fixture only), where neither family's release
 *  exists; the checkpoint holds both (the Study permit family's work-permit spouse since #1591). So, as
 *  tests/check_bk15_study_family_api.ts does, a copy without the Study permit's release is reset and the checkpoint loaded
 *  as the author (about 2 minutes; saved AI answers only, US$0, live AI off). Gate B gives each pack its own fresh copy,
 *  so no other pack's data is touched. A copy already on the checkpoint is used as it is. */
export async function ensureCheckpoint(): Promise<void> {
  const released = () => Number(sql("select count(*) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'sp.outside'") ?? "0") > 0;
  if (released()) return;
  // Review on #1620: never the demo (:4400, or its database): the reset is only ever for an isolated test copy.
  if (PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB)) { console.log(`Setup missing: this copy (port ${PORT}, database ${DB}) is not on the configured checkpoint, and the pack resets only an isolated test copy, never the demo. Load the checkpoint there by hand, or run the pack on an isolated copy.`); process.exit(2); }
  console.log("NOTE  this copy is not on the configured checkpoint: resetting it and loading the checkpoint (Demo › Load), as the author");
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  if (load.status >= 300 || !released()) { console.log(`Setup missing: the configured checkpoint did not load (reset ${reset.status}, load ${load.status}): ${JSON.stringify(load.body).slice(0, 300)}`); process.exit(2); }
}

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
  const child = c.subjects["Sample Child B"];
  await answer(c.id, child, STUDIES, true);
  // fillEverything answers what is open with its own Sample (a Yes/No is No): the child's Yes is given again after it,
  // and the child's sections confirmed, so their own answer, not the sample's, decides their filing.
  await fillEverything(c.id);
  await answer(c.id, child, STUDIES, true);
  await confirmAll(c.id, child);
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
export type ReadCopy = { id: string; values: Record<string, string>; counts: { by_hand: number } | null; byHand: { fact?: string; label?: string; why?: string }[] };
export async function readCopy(f: Family, form: string, name: string): Promise<ReadCopy | null> {
  const subject = f.c.subjects[name];
  if (!f.forms.some((x) => x.form === form && x.subject_id === subject && x.applies)) return null;
  const id = await generateCopy(f.c.id, form, subject);
  if (!id) return null;
  const copy = (await call("GET", `/runtime/form-copies/${id}`, undefined, f.c.officer)).body;
  const file = join(dir, `${id}.pdf`);
  writeFileSync(file, await copyBytes(id, f.c.officer));
  const out = execFileSync(PY, ["-I", READER, file], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop()!;
  return { id, values: (JSON.parse(out) as { values: Record<string, string> }).values, counts: copy?.counts ?? null, byHand: copy?.by_hand ?? [] };
}
/** The value at a data path ending in `tail`. */
export const at = (vals: Record<string, string> | undefined, tail: string) => Object.entries(vals ?? {}).find(([k]) => k.endsWith(tail))?.[1];
/** IMM 5645's "Type of application" boxes, read back: the one ticked ("1"), as its box's name. */
export const ticked = (vals: Record<string, string> | undefined) => ["Visitor", "Worker", "Student", "Other"].filter((b) => at(vals, `Subform1[0].${b}[0]`) === "1");
