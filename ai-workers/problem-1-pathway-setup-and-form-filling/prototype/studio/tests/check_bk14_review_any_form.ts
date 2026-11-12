// BK-14 (Bake plan row 36; lifts stand-in SI-6's "Visitor visa forms only"; P-319, P-425, P-452): the independent AI review
// chooses the form edition it reads, and that edition's official text, from the case's release alone (engine
// reviewSource), so a Study permit-shaped release's IMM 1294 is reviewed by the same code as the Visitor visa's IMM 5257,
// and the Visitor visa's choice is unchanged. Each rule with a passing and a failing case: the edition in use is a printed
// edition of that form; the release has a field map of that edition; the map names an official text (an inventory under
// p1/inventory) that is on this computer; the sheet the rounds read is that form's own, and the saved run is keyed on that
// edition. Then the code: neither the review's API nor its engine names a form, a program or a pathway (B164 reads both).
// FIXTURE DATA: the two releases below are made up for this check (Sample values, not IRCC values), shaped like the
// checkpoint's Visitor visa and Study permit (outside Canada) releases; the two official inventories are the committed ones.
// Pure: reads committed files; no server, no database, no model call (US$0).
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_bk14_review_any_form.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { editionContextKey } from "../engine/rounds.ts";
import { reviewSheet, reviewSource, type ReviewFieldMap } from "../engine/runtime/form-review.ts";
import { inventoryOf } from "../api/src/fill-case.ts";
import { printedBoxes } from "../api/src/review-runs.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  BK-14: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
const STUDIO = join(import.meta.dirname, ".."), SOLUTION = join(STUDIO, "..", "..");

const SUBJECT = "11111111-1111-4111-8111-111111111111";
const NAME = "form1[0].Page1[0].PersonalDetails[0].Name[0].FamilyName[0]", GIVEN = "form1[0].Page1[0].PersonalDetails[0].Name[0].GivenName[0]";
/** A made-up release (Sample): one application form's field map, of the edition its coverage names. */
const release = (form: string, printed: string, inventory: string | null): { field_maps: ReviewFieldMap[]; canonical_fields: unknown[] } => ({
  canonical_fields: [],
  field_maps: [{ form_number: form, form_edition: printed, inventory_file: inventory, entries: [{ data_path: NAME, fact: "person.family_name" }, { data_path: GIVEN, fact: "person.given_names" }] }],
});
/** Two confirmed boxes as the shared renderer gives them (Sample values). */
const boxes = [
  { box: NAME, caption: "*Family name", fact: "person.family_name", about: SUBJECT, coverage: "confirmed fact", value: "Sampleton", transform: "as_is", row: null },
  { box: GIVEN, caption: "Given name(s)", fact: "person.given_names", about: SUBJECT, coverage: "confirmed fact", value: "Avery", transform: "as_is", row: null },
] as unknown as Parameters<typeof printedBoxes>[3];

/** What a review reads of one form of a release, through the review's own steps (review-runs.ts prepare). */
function picked(r: ReturnType<typeof release>, form: string, edition: string | null) {
  const src = reviewSource(r.field_maps, form, edition);
  if (!src.ok) return { why: src.why };
  const inv = inventoryOf(src.inventory_file);
  if (!inv || !existsSync(join(SOLUTION, src.inventory_file))) return { why: "no_official_text_here" };
  const sheet = reviewSheet(src.printed, printedBoxes(r, src.map, inv, boxes, SUBJECT));
  return { why: null, printed: src.printed, key: editionContextKey(src.code, src.edition), file: src.inventory_file, sheet };
}

// ── a Study permit-shaped release: its application form is reviewed, from its own official text ──
const SP = "IMM 1294 (06-2026)", SP_INV = "prototype/p1/inventory/imm1294e.inventory.json";
const sp = picked(release("IMM 1294", SP, SP_INV), "IMM 1294", SP);
ok("pass: a Study permit-shaped release's form is picked from its release: its printed edition, its field map's official text",
  sp.why === null && sp.printed === SP && sp.file === SP_INV, sp);
ok("pass: the sheet the two rounds read is that form's own edition, box by box as a copy prints it",
  sp.sheet?.form_edition === SP && sp.sheet.fields.length === 2 && sp.sheet.fields.some((f) => f.fact === "person.family_name" && f.value === "Sampleton") && sp.sheet.fields.some((f) => f.value === "Avery"), sp.sheet);
ok("pass: its saved run is keyed on that edition (a replay of one form never answers another)", sp.key === "edition:IMM 1294:06-2026", sp.key);

// ── the Visitor visa: unchanged ──
const VV = "IMM 5257 (09-2023)", VV_INV = "prototype/p1/inventory/imm5257e.inventory.json";
const vv = picked(release("IMM 5257", VV, VV_INV), "IMM 5257", VV);
ok("pass: the Visitor visa's IMM 5257 is picked as before: same edition, same official text, same saved-run key",
  vv.why === null && vv.printed === VV && vv.file === VV_INV && vv.key === "edition:IMM 5257:09-2023" && vv.sheet?.form_edition === VV && vv.sheet.fields.length === 2, vv);
ok("pass: the same values give the same rows on either form (only the edition differs): one review, any form",
  JSON.stringify(sp.sheet?.fields.map((f) => [f.fact, f.value])) === JSON.stringify(vv.sheet?.fields.map((f) => [f.fact, f.value])));

// ── each rule's failing case ──
ok("fail: no edition in use (the coverage names none) is refused, never guessed", picked(release("IMM 1294", SP, SP_INV), "IMM 1294", null).why === "no_edition");
ok("fail: an edition in use of another form is refused (a map never reviews a form it is not)", picked(release("IMM 1294", SP, SP_INV), "IMM 1294", "IMM 5645 (06-2026)").why === "no_edition");
ok("fail: an edition that is not a printed edition is refused", picked(release("IMM 1294", "IMM 1294", SP_INV), "IMM 1294", "IMM 1294").why === "no_edition");
ok("fail: the release has no field map of the edition in use: no official text", picked(release("IMM 1294", "IMM 1294 (01-2020)", SP_INV), "IMM 1294", SP).why === "no_official_text");
ok("fail: the field map names no official text", picked(release("IMM 1294", SP, null), "IMM 1294", SP).why === "no_official_text");
ok("fail: an official text outside p1's inventories is never read", picked(release("IMM 1294", SP, "prototype/p2/runs/x.inventory.json"), "IMM 1294", SP).why === "no_official_text"
  && picked(release("IMM 1294", SP, "prototype/p1/inventory/../../../etc/passwd.inventory.json"), "IMM 1294", SP).why === "no_official_text");
ok("fail: an official text the release names but this computer lacks is not reviewed", picked(release("IMM 1294", SP, "prototype/p1/inventory/imm0000e.inventory.json"), "IMM 1294", SP).why === "no_official_text_here");

// ── the code: no form, program or pathway in the review's choice (B164 guards the strings; this guards the stand-in) ──
const api = readFileSync(join(STUDIO, "api", "src", "review-runs.ts"), "utf8"), engine = readFileSync(join(STUDIO, "engine", "runtime", "form-review.ts"), "utf8");
const code = (src: string) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join("\n");
ok("pass: the review's code names no form number, program or pathway (comments aside)", ![code(api), code(engine)].some((c) => /\b(IMM|IRM) ?\d{4}\b|Visitor visa|Study permit|vv\.single|sp\.outside/.test(c)));
ok("pass: the stand-in's words no longer limit the review to one form family", !/Visitor visa|forms only/.test(api.match(/STAND_IN_WORDS = "([^"]*)"/)?.[1] ?? "Visitor visa"));
const b164 = readFileSync(join(STUDIO, "tests", "check_b164_no_engine_keys.ts"), "utf8");
ok("pass: SI-6 is gone from B164's allow-list (its row BK-14 removes it)", !/"row": "BK-14"/.test(b164) && !/stand-in SI-6/.test(b164.slice(b164.indexOf("ALLOW-START"), b164.indexOf("ALLOW-END"))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
