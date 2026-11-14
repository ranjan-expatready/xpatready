// BK-24 (P-533, P-542, P-449): every box IRCC's own Validate requires is written, for the walk's family. BK-13 passed
// 45/45 while the spouse's IMM 1295 left question 7 blank, because "every written box holds a value" is not "every
// required box is written"; IRCC's Validate stopped on it (BK-20 part 2, the tech lead, 14 Nov 08:44 IST).
// The required boxes are derived from each form's own file, never listed by hand:
//   a. the fields its XFA template marks required (<validate nullTest="error">), as the project's reading of the form
//      records them (inventory `required`, prototype/p1/xfa_inventory.py), counted again in the template itself
//      (tests/fixtures/read_required_rules.py) so a stale reading fails;
//   b. a Validate script that checks rows of people (IMM 5707): its own `sections` and `personalInfo` lists, read from
//      the template and applied as its validateFields does (the first section's row is complete; any other row with a
//      value is complete; a row item with a condition only when its condition holds; an item the row lacks is skipped);
//   c. the form's own script making a flagged box required only for some answers: samples/form-script-requirements.json
//      (cited from the script), as the copy's readiness reads it; boxes a person completes (signature, the oath:
//      engine/form-steps.ts byAPerson) are the person's steps, not the copy's;
//   d. where the form's scripts also make boxes required from other answers (script_marks > 0), the flags are not the
//      whole rule: the form's own Validate is run by our XFA engine (engine/xfa/index.ts; IMM 1295 and IMM 5257 have a
//      descriptor, samples/xfa-forms.json) and must complete; where the engine is not built on this machine, WAIT.
// Each copy is read back from the PDF with the project's XFA reader (tests/fixtures/read_choice_values.py): a box is
// written when the file holds a value in it. The copies are the walk's family, made by BK-13's replay on this copy (run
// first when the copy has none: its exit code must be 0, its 45 checks). Sample people, made up; US$0, live AI off.
// Some boxes stay open after this row (GAP lines, each naming its follow-up for the tech lead; any other open box FAILs).
//   zsh studio/tools/isolated.sh forms_bk24 4453 start && tsx studio/tests/check_bk24_required_boxes.ts 4453 xr_studio_forms_bk24
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import { byAPerson } from "../engine/form-steps.ts";
import type { InventoryBox } from "../engine/form-values.ts";
import { askXfaEngine } from "../engine/xfa/index.ts";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const STUDIO = join(import.meta.dirname, ".."), SOL = join(STUDIO, "..", ".."), ROOT = join(SOL, "..", "..");
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const py = (script: string, file: string) => JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tests", "fixtures", script), file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim());
const json = (f: string) => JSON.parse(readFileSync(join(STUDIO, f), "utf8"));
const { call } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", KEY = "sp.outside";
const FORMS = ["IMM 1294", "IMM 1295", "IMM 5257", "IMM 5476", "IMM 5707"];
const short = (p: string) => p.replace(/^xfa\[0\]\.form\[0\]\./, "").replace(/^[^.]+\[0\]\./, "");

// Open after this row, each with its follow-up (Question for the tech lead on the PR). A box listed here that is written
// now PASSes; any open box not listed FAILs. Keyed "<form>|<role>|<box from the page on>".
const F1 = "follow-up F1: the study's city is a list that depends on the province; configured filled by hand, the filler writes no dependent list yet";
const F2 = "follow-up F2: the consent question is configured filled by hand; IMM 5257 (09-2023) maps the same question to person.consents_to_research_contact";
const F3 = "follow-up F3: the form requires employment row 1 and the Sample spouse confirms none apply; what a homemaker writes there needs IRCC's own instructions (P-170)";
const F4 = "follow-up F4: for a married applicant and spouse the form's own Validate requires \"physically present at the marriage ceremony\"; configured filled by hand, no question asks it";
const OCC = "Page3[0].PageWrapper[0].Occupation[0].OccupationRow1[0].";
const OPEN: Record<string, string> = {
  "IMM 1294|principal|Page3[0].DetailsOfStudy[0].PurposeRow1[0].CityTown[0].CityTown[0]": F1,
  "IMM 1294|principal|Page4[0].Consent0[0].Choice[0]": F2,
  "IMM 1295|spouse_or_partner|Page4[0].Consent0[0].Choice[0]": F2,
  ...Object.fromEntries(["FromYear[0]", "FromMonth[0]", "Occupation[0].Occupation[0]", "Employer[0]", "CityTown[0].CityTown[0]", "Country[0].Country[0]"].map((b) => [`IMM 1295|spouse_or_partner|${OCC}${b}`, F3])),
  ...Object.fromEntries(["principal", "spouse_or_partner"].flatMap((r) => ["Applicant", "Spouse"].map((s) => [`IMM 5707|${r}|page1[0].SectionA[0].${s}[0].PaddedEntry[0].MarriageInPerson[0].MarriageInPerson[0].yesno[0]`, F4]))),
};
const gaps: string[] = [];

// The walk's family on this copy: made by BK-13's replay when the copy has none yet.
const ref = (json("samples/sample-cases.json").cases[KEY] as { reference: string }).reference;
const caseOf = () => sql(`select id from runtime_case where reference='${ref}' order by created_at desc limit 1`);
let caseId = (() => { try { return caseOf(); } catch { return ""; } })();
if (!caseId || sql(`select count(*) from form_instance where case_id='${caseId}' and status='GENERATED'`) === "0") {
  console.log("The walk's family has no copies on this copy yet: BK-13's replay makes them (about 3 minutes).");
  let code = 0;
  try { execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), [join(STUDIO, "tests", "check_bk13_zero_code_run.ts"), String(PORT), DB], { stdio: "inherit" }); } catch (e) { code = (e as { status?: number }).status ?? 1; }
  ok("BK-24: BK-13's replay (tests/check_bk13_zero_code_run.ts) still passes on this copy (exit 0: 45 of 45)", code === 0, { exit: code });
  caseId = caseOf();
}
const people = ((await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people ?? []) as { role: string; subject_id: string; label: string }[];
const who = new Map(people.map((p) => [p.subject_id, p]));

// The newest generated copy of each form for each person, with its edition from the release it was made under.
type Copy = { form: string; subject: string; path: string; edition: string; inventory: string; sha: string; official: string };
const copies = (JSON.parse(sql(`select coalesce(json_agg(x), '[]') from (select distinct on (fi.form_number, fi.subject_id) fi.form_number form, fi.subject_id subject, fi.path,
  m->>'form_edition' edition, m->>'inventory_file' inventory, m->>'form_sha256' sha, m->>'official_file' official
  from form_instance fi join config_release r on r.id = fi.config_release_id, jsonb_array_elements(r.snapshot->'field_maps') m
  where fi.case_id='${caseId}' and fi.status='GENERATED' and m->>'form_number' = fi.form_number and coalesce(m->>'channel', 'PDF') <> 'ONLINE'
  order by fi.form_number, fi.subject_id, fi.created_at desc) x`)) as Copy[]).filter((c) => FORMS.includes(c.form));
const roleOf = (c: Copy) => who.get(c.subject)?.role ?? "?";
ok(`BK-24: the walk's family has its ${FORMS.join(", ")} copies (8: the student 3, the spouse 3, the child 2)`, copies.length === 8 && FORMS.every((f) => copies.some((c) => c.form === f)), copies.map((c) => `${c.form}/${roleOf(c)}`));

// The official blank file of an edition, found by its own SHA-256 in the sources manifest (never by name alone).
const MANIFEST = json("../../official-sources/ircc/manifest.json") as { items?: { file?: string; path?: string; sha256?: string }[] } | { file?: string; path?: string; sha256?: string }[];
const items = (Array.isArray(MANIFEST) ? MANIFEST : MANIFEST.items ?? []) as { file?: string; path?: string; sha256?: string }[];
const blankOf = (c: Copy) => {
  const it = items.find((i) => i.sha256 === c.sha);
  const rel = it?.path ?? (it?.file ? (["forms", "previous-editions"].map((d) => join(d, it.file!)).find((p) => existsSync(join(SOL, "official-sources", "ircc", p))) ?? it.file) : null);
  return rel ? join(SOL, "official-sources", "ircc", rel) : null;
};
const SCRIPT_RULES = (json("samples/form-script-requirements.json") as { editions: { inventory: string; fields: { box: string; requiredWhen: { box: string; equals: string[] } }[] }[] }).editions;

type Rules = { null_test: number; script_marks: number; validate_button: boolean; sections: string[] | null; rows: [string, string, (string | number)?][] | null };
/** IMM 5707's validateFields, over the form's own field list: the boxes it requires on this copy (b. above). */
function rowRequired(r: Rules, fields: InventoryBox[], values: Record<string, string>): string[] {
  if (!r.sections || !r.rows) return [];
  const root = (fields.find((f) => f.data_path)?.data_path ?? "").split(".")[0];
  const re = (som: string) => som.split(".").map((s) => s.replace(/\[\*\]$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\[\\d+\\]").join("\\.");
  const paths = fields.map((f) => f.data_path ?? "").filter(Boolean);
  const out: string[] = [];
  r.sections.forEach((section, i) => {
    const people = [...new Set(paths.map((p) => new RegExp(`^${re(`${root.replace(/\[\d+\]$/, "")}.${section}`)}`).exec(p)?.[0]).filter((x): x is string => !!x))];
    for (const person of people) {
      const box = (som: string) => paths.find((p) => new RegExp(`^${person.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.${re(som)}$`).test(p));
      const asked = r.rows!.filter(([item, cond, val]) => !!box(item) && (!cond || Number(values[box(cond) ?? ""] ?? NaN) === Number(val ?? 1)));
      const filled = asked.filter(([item]) => (values[box(item)!] ?? "").trim() !== "");
      if (i !== 0 && filled.length === 0) continue; // an empty row is fine, except the applicant's
      out.push(...asked.map(([item]) => box(item)!));
    }
  });
  return out;
}

// The acceptance of this row first: question 7 of the spouse's IMM 1295, read from the file.
const valuesOf = new Map<Copy, Record<string, string>>();
for (const c of copies) valuesOf.set(c, (py("read_choice_values.py", join(ROOT, c.path)) as { values: Record<string, string> }).values);
const spouse1295 = copies.find((c) => c.form === "IMM 1295" && roleOf(c) === "spouse_or_partner");
const q7 = (b: string) => (spouse1295 ? valuesOf.get(spouse1295)![`form1[0].Page1[0].PersonalDetails[0].CurrentCOR[0].Row2[0].${b}[0]`] ?? "" : "");
ok(`BK-24: the spouse's IMM 1295 writes question 7, the current country of residence and its status (read from the file: country "${q7("Country")}", status "${q7("Status")}")`, !!spouse1295 && q7("Country") !== "" && q7("Status") !== "", { country: q7("Country"), status: q7("Status") });

/** The boxes this copy's own file requires (a.–c. above), and those its file leaves empty. */
function requiredOf(c: Copy, values: Record<string, string>) {
  const blank = blankOf(c);
  const inv = JSON.parse(readFileSync(join(SOL, c.inventory), "utf8")) as { fields: InventoryBox[] };
  const rules = py("read_required_rules.py", blank ?? "") as Rules;
  const flagged = inv.fields.filter((f) => f.required && f.data_path && f.ui !== "button");
  const when = new Map((SCRIPT_RULES.find((e) => e.inventory === c.inventory.split("/").pop())?.fields ?? []).map((f) => [f.box, f.requiredWhen]));
  const required = [...new Set([
    ...flagged.filter((f) => !byAPerson(inv.fields as never, f as never) && (!when.has(f.data_path!) || when.get(f.data_path!)!.equals.includes(values[when.get(f.data_path!)!.box] ?? ""))).map((f) => f.data_path!),
    ...rowRequired(rules, inv.fields, values),
  ])];
  return { blank, rules, flagged, required, open: required.filter((p) => (values[p] ?? "").trim() === "") };
}

const engineWaits: string[] = [];
for (const c of copies) {
  const label = `${c.form} for ${who.get(c.subject)?.label ?? c.subject}`;
  const { blank, rules, flagged, required, open } = requiredOf(c, valuesOf.get(c)!);
  ok(`BK-24: ${c.edition}: the project's reading of the form marks the same ${rules.null_test} fields required as the form's own template (nullTest="error"), so the flags are the form's`, !!blank && flagged.length === rules.null_test, { reading: flagged.length, template: rules.null_test, blank });
  const listed = open.filter((p) => OPEN[`${c.form}|${roleOf(c)}|${short(p)}`]);
  for (const p of listed) gaps.push(`${label}: ${short(p)} (${OPEN[`${c.form}|${roleOf(c)}|${short(p)}`]})`);
  const how = [rules.null_test ? `${rules.null_test} flagged` : "", rules.sections ? `its Validate script's rows (${rules.sections.length} sections × ${rules.rows?.length} items)` : "", !rules.null_test && !rules.sections ? "no box flagged and no Validate script that requires one" : ""].filter(Boolean).join("; ");
  const unnamed = open.filter((p) => !listed.includes(p)).map(short);
  ok(`BK-24: ${label}: every box its own file requires is written (${required.length} required: ${how}${listed.length ? `; ${listed.length} open, each with its follow-up` : ""})`, unnamed.length === 0, unnamed.length || undefined);
  for (const p of unnamed) console.log(`      open: ${p}`);
  // d. The form's own Validate, where its scripts also require boxes from other answers.
  if (rules.script_marks > 0) {
    const a = await askXfaEngine(join(ROOT, c.path), { formSha256: c.sha });
    if (a.status === "not_available" && a.code === "NO_ENGINE") { engineWaits.push(`${label}: ${a.reason}`); continue; }
    if (a.status === "not_available" || a.status === "reads") { console.log(`NOTE  ${label}: the form's own Validate cannot run in our engine (${a.status === "reads" ? a.why : a.reason}); only its flagged boxes are checked here, the rest is the Mac's Adobe run (BK-20)`); continue; }
    const at = a.status === "stops_at" ? short(a.box ?? "").replace(/\.(No|Yes)\[0\]$/, "") : "";
    const known = at && OPEN[`${c.form}|${roleOf(c)}|${at}`];
    if (known) { gaps.push(`${label}: its own Validate stops at ${at} (${known}); boxes after it are not reached`); continue; }
    ok(`BK-24: ${label}: the form's own Validate, run by our XFA engine, completes`, a.status === "passes", a.status === "stops_at" ? { box: at, message: a.message } : undefined);
  }
}

// The fail case: the spouse's IMM 1295 as BK-20 found it, question 7 emptied in a copy of the file (the test writer of
// tests/fixtures/read_choice_values.py), is caught: question 7's country is open, and the form's own Validate stops on it.
if (spouse1295) {
  const tmp = mkdtempSync(join(tmpdir(), "bk24-")), broken = join(tmp, "imm1295-q7-empty.pdf");
  try {
    const COUNTRY = "form1[0].Page1[0].PersonalDetails[0].CurrentCOR[0].Row2[0].Country[0]";
    execFileSync(PY, ["-I", join(STUDIO, "tests", "fixtures", "read_choice_values.py"), "--set", join(ROOT, spouse1295.path), broken, `${COUNTRY}=`], { stdio: ["ignore", "pipe", "pipe"] });
    const values = (py("read_choice_values.py", broken) as { values: Record<string, string> }).values;
    ok("BK-24 (fail case): the spouse's IMM 1295 with question 7's country emptied is caught: the box is required and open", requiredOf(spouse1295, values).open.includes(COUNTRY), { read: values[COUNTRY] ?? "" });
    const a = await askXfaEngine(broken, { formSha256: spouse1295.sha });
    if (a.status === "not_available" && a.code === "NO_ENGINE") engineWaits.push("the fail case's own Validate");
    else ok("BK-24 (fail case): the form's own Validate, run by our XFA engine, stops at question 7's country, as IRCC's did on 14 Nov", a.status === "stops_at" && short(a.box ?? "") === short(COUNTRY), a.status === "stops_at" ? { box: a.box, message: a.message } : a);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
for (const g of gaps) console.log(`GAP   ${g}`);
for (const w of engineWaits) console.log(`WAIT  (the engine is not built here: packages/xfa-engine, npm ci --legacy-peer-deps && npm run build) ${w}`);
const failed = summary();
console.log(`BK-24: ${gaps.length} open boxes named for their follow-up; ${failed} FAIL.`);
process.exit(failed ? 1 : 0);
