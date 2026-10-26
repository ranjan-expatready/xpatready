// F3a-0 (forms lane, F3 plan D1, slice 1): PDF section groups and their Sample labels. Pure: the real inventories of
// IMM 5257, IMM 1295, IMM 5707 and IMM 5476 and the reviewed release's field maps; no server, no database, NO model call
// (US$0). W1-02 (P-102): online screen coverage and the screen-input test are parked with the browser extension.
//   tsx studio/tests/check_forms_f3a0.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groupOfEntry, sectionGroupOf, sectionLabel } from "../engine/twin.ts";
import PDF_SECTIONS from "../contracts/pdf-sections.json" with { type: "json" };

const PROTOTYPE = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Field = { som: string; section: string; data_path: string | null };
type CoverageEntry = { data_path: string; heading: string | null; fact: string | null; person: string | null; outcome: string };
const inventory = (file: string) => (JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", `${file}.inventory.json`), "utf8")).fields as Field[]);
const config = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", "c1-v3", "configuration.json"), "utf8"));
/** A form's PDF entries as the library stores them: the reviewed map's rows, each with its inventory section as heading. */
const pdfOf = (code: string, file: string): CoverageEntry[] => {
  const section = new Map(inventory(file).map((f) => [f.som, f.section]));
  const map = config.field_maps.find((m: { form_edition: string }) => m.form_edition.startsWith(`${code} (`));
  return map.entries.map((e: { data_path: string; outcome: string; fact?: string; person?: string }) => ({ data_path: e.data_path, heading: section.get(e.data_path) ?? null, fact: e.fact ?? null, person: e.person ?? null, outcome: e.outcome }));
};
const LABELS = PDF_SECTIONS as unknown as Record<string, Record<string, string>>;

// ──────────────────────────────────────────── D1 grain: the subform group without its page
ok("C2.12: D1 grain: a page's subform path gives its group (Page2.MaritalStatus.SectionA → MaritalStatus; page1.SectionB.Child → SectionB)",
  sectionGroupOf("Page2.MaritalStatus.SectionA") === "MaritalStatus" && sectionGroupOf("Page1.MaritalStatus.SectionA") === "MaritalStatus" && sectionGroupOf("page1.SectionB.Child") === "SectionB" && sectionGroupOf("Page1.PersonalDetails.Name[0]") === "PersonalDetails");
ok("C2.12: D1 grain fail cases: a path with no page is its own group, an empty path has none", sectionGroupOf("Barcodes.PaperFormsBarcode1") === "Barcodes" && sectionGroupOf("SignatureField1") === "SignatureField1" && sectionGroupOf("") === null && sectionGroupOf(null) === null);
const groups5257 = new Set(inventory("imm5257e").filter((f) => f.data_path).map((f) => sectionGroupOf(f.section)));
const sections5257 = new Set(inventory("imm5257e").map((f) => f.section));
ok("C2.12: D1 grain on the real IMM 5257: 66 section paths become 17 groups that hold a form field (the page dropped, so Marital status is one group)", sections5257.size === 66 && groups5257.size === 17 && groups5257.has("MaritalStatus"), { paths: sections5257.size, groups: [...groups5257] });

// ──────────────────────────────────────────── Sample labels: every group that holds a mapped form field has one
const mappedGroups = (code: string, file: string) => new Set(pdfOf(code, file).filter((e) => e.outcome === "mapped").map(groupOfEntry));
const unlabelled = ([["IMM 1295", "imm1295e"], ["IMM 5707", "imm5707e"], ["IMM 5476", "imm5476e"]] as const).flatMap(([c, f]) => [...mappedGroups(c, f)].filter((g) => !LABELS[c][g ?? ""]).map((g) => `${c} ${g}`));
const unlabelled5257 = [...groups5257].filter((g) => !LABELS["IMM 5257"][g ?? ""]);
ok("C2.12: D1 every group of IMM 1295, IMM 5707 and IMM 5476 that holds a mapped form field has a plain Sample label; IMM 5257 lacks only its page-5 helper (TextField1, listed for the expert)", unlabelled.length === 0 && unlabelled5257.join() === "TextField1", { unlabelled, unlabelled5257 });
ok("C2.12: D1 a group with no label shows \"Other questions of IMM 5257\", never the path (BR-16)", sectionLabel("IMM 5257", "TextField1") === "Other questions of IMM 5257" && sectionLabel("IMM 5257", "MaritalStatus") === "Marital status and spouse" && sectionLabel("IMM 9999", "X") === "Other questions of IMM 9999");
const words = Object.entries(LABELS).filter(([k]) => !k.startsWith("_")).flatMap(([, v]) => Object.values(v));
ok("C2.12: BR-16 no label holds a path, a key or a field-library word (no dot, underscore, \"box\", \"canonical\")", words.every((w) => !/[._]|\bbox\b|canonical|\bPage\d/i.test(w)), words.filter((w) => /[._]|\bbox\b|canonical|\bPage\d/i.test(w)));

// ──────────────────────────────────────────── D1 a form field's group from its own path
ok("C2.12: D1 a repeated row with no section of its own (earlier countries, Row2) falls in its form path's group, never Other questions", groupOfEntry({ data_path: "form1[0].Page1[0].PersonalDetails[0].PreviousCOR[0].Row2[0].Country[0]", heading: null }) === "PersonalDetails" && groupOfEntry({ data_path: "form1[0].Page1[0].X[0]", heading: "Page2.MaritalStatus.SectionA" }) === "MaritalStatus");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
