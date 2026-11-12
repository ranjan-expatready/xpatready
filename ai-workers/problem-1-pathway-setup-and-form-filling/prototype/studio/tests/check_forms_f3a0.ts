// F3a-0 (forms lane, F3 plan D1, slice 1): PDF section groups, their Sample labels, online screen coverage and the
// screen-input test every screen-map reader uses. Pure: the real inventories of IMM 5257, IMM 1295, IMM 5707 and
// IMM 5476 and the reviewed release's field maps; no server, no database, NO model call (US$0).
//   tsx studio/tests/check_forms_f3a0.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groupOfEntry, isScreenInput, screenCoverage, sectionGroupOf, sectionLabel, type CoverageEntry } from "../engine/twin.ts";
import { ASKED_DIFFERENTLY } from "../contracts/forms.ts";
import PDF_SECTIONS from "../contracts/pdf-sections.json" with { type: "json" };

const PROTOTYPE = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Field = { som: string; section: string; data_path: string | null };
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

// ──────────────────────────────────────────── D1 coverage key: (shared field, person)
const p1295 = pdfOf("IMM 1295", "imm1295e");
const applicantOnly = p1295.filter((e) => e.outcome === "mapped" && e.person !== "subject_spouse_or_partner").map((e) => ({ fact: e.fact, person: e.person }));
const notSeen = screenCoverage("IMM 1295", p1295, applicantOnly);
const marital = notSeen.find((s) => s.group === "MaritalStatus");
ok("C2.12: B2 fail case: every question but the spouse's captured (the applicant's and the employer's), the spouse's are not: \"Marital status and spouse\" is not seen, with the spouse's family name, though the applicant's family name is seen",
  notSeen.length === 1 && marital?.label === "Marital status and spouse" && marital.sharedFields.includes("person.family_name") && marital.questions === 3, notSeen);
const everyone = p1295.filter((e) => e.outcome === "mapped").map((e) => ({ fact: e.fact, person: e.person }));
// Review Major 1: a section partly asked says how much of it is not; a section fully asked is not listed.
const personal = p1295.filter((e) => e.outcome === "mapped" && groupOfEntry(e) === "PersonalDetails");
const half = personal.slice(0, Math.floor(personal.length / 2)).map((e) => ({ fact: e.fact, person: e.person }));
const partly = screenCoverage("IMM 1295", p1295, [...applicantOnly.filter((x) => !personal.some((e) => e.fact === x.fact && e.person === x.person)), ...half]).find((s) => s.group === "PersonalDetails");
ok("C2.12: review Major 1 a section partly asked is listed with how many of its form fields no captured question matches (\"x of y\"), never as wholly not seen",
  !!partly && partly.questions > 0 && partly.questions < partly.total && partly.total === new Set(personal.map((e) => e.data_path)).size, partly && { questions: partly.questions, total: partly.total });
ok("C2.12: review Major 1 fail case: a section every form field of which is matched is not listed at all, and \"none\" means its total", !notSeen.some((s) => s.group === "PersonalDetails") && screenCoverage("IMM 1295", p1295, []).every((s) => s.questions === s.total) && marital!.questions < marital!.total);
ok("C2.12: BR-12 every mapped form field seen for its own person: nothing is listed", screenCoverage("IMM 1295", p1295, everyone).length === 0);
ok("C2.12: D1 a repeated row with no section of its own (earlier countries, Row2) falls in its form path's group, never Other questions", groupOfEntry({ data_path: "form1[0].Page1[0].PersonalDetails[0].PreviousCOR[0].Row2[0].Country[0]", heading: null }) === "PersonalDetails" && groupOfEntry({ data_path: "form1[0].Page1[0].X[0]", heading: "Page2.MaritalStatus.SectionA" }) === "MaritalStatus");
ok("C2.12: BR-12 nothing captured yet: every group with a mapped form field is listed once, in PDF order, Personal details first", (() => { const all = screenCoverage("IMM 1295", p1295, []); return all[0]?.group === "PersonalDetails" && all.length === mappedGroups("IMM 1295", "imm1295e").size && new Set(all.map((s) => s.group)).size === all.length; })());
const spouseDecided = p1295.map((e) => (e.person === "subject_spouse_or_partner" ? { ...e, outcome: "not_a_fact" } : e));
ok("C2.12: BR-12 form fields decided \"not a fact\" or \"filled by hand\" are never counted: the spouse's three decided otherwise → 0", screenCoverage("IMM 1295", spouseDecided, applicantOnly).length === 0 && screenCoverage("IMM 1295", p1295.map((e) => (e.person === "subject_spouse_or_partner" ? { ...e, outcome: "by_hand" } : e)), applicantOnly).length === 0);
ok("C2.12: BR-12 a group marked asked differently online is cleared (1 → 0); another group's mark clears nothing", screenCoverage("IMM 1295", p1295, applicantOnly, ["MaritalStatus"]).length === 0 && screenCoverage("IMM 1295", p1295, applicantOnly, ["PersonalDetails"]).length === 1);
const p5707 = pdfOf("IMM 5707", "imm5707e");
ok("C2.12: BR-12 on IMM 5707: with only the applicant's questions seen, the children's section is listed under its label", screenCoverage("IMM 5707", p5707, p5707.filter((e) => e.person === "form_subject").map((e) => ({ fact: e.fact, person: e.person }))).some((s) => s.label === "Children"));

// ──────────────────────────────────────────── isScreenInput: the one test every screen-map reader uses
ok("C2.12: D1 a page input of any screen-map decision is a screen input (mapped, not a fact, answered on screen, open)", ["mapped", "not_a_fact", "person_answers_on_screen", "unresolved"].every((o) => isScreenInput({ outcome: o, dataPath: "familyName" })));
ok("C2.12: D1 fail cases: an asked-differently decision is never a screen input, whatever its outcome says; nor an unknown outcome",
  !isScreenInput({ outcome: ASKED_DIFFERENTLY.outcome, dataPath: `${ASKED_DIFFERENTLY.prefix}MaritalStatus` }) && !isScreenInput({ outcome: "mapped", dataPath: `${ASKED_DIFFERENTLY.prefix}MaritalStatus` }) && !isScreenInput({ outcome: "something_new", dataPath: "familyName" }));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
