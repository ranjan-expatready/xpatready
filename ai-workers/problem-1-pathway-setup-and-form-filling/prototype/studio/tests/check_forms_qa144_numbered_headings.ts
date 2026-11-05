// QA-144 slice 4 (B79a; C3.4, C10.1; P-158 sections from sources, P-170 the form's own words, P-319): IMM 5669 puts its
// pages inside an unnamed wrapper (IMM_5669 > #subform > page2), so the C3.4 rules pass drafted no section of it and
// Express Entry's education, personal history, organizations, government positions, military service and address facts
// had nowhere to be asked. The headings reader (prototype/p1/xfa_headings.py) now names, on such a page only, the boxes
// printed after each bold numbered heading ("8. Personal history") up to the next numbered text, as "sub" entries with
// the heading's group; the rules pass reads them as one section per heading. A passing and a failing check per rule, on
// the committed inventory and headings files. No database, no server, no model call (US$0).
//   tsx studio/tests/check_forms_qa144_numbered_headings.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { draftFromInventory, headingsFor, type PartHeadings } from "../api/src/form-masters.ts";
import { problemWords } from "../contracts/programs.ts";
import { channelProblems } from "../engine/channels.ts";

const SOLUTION = join(import.meta.dirname, "..", "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Field = { data_path: string; section: string; caption?: string; kind?: string; ui?: string; presence?: string };
const inventory = (form: string) => { const rel = `prototype/p1/inventory/${form}.inventory.json`; const inv = JSON.parse(readFileSync(join(SOLUTION, rel), "utf8")); return { fields: inv.fields as Field[], headings: headingsFor(rel, inv.summary.sha256) }; };

// The form's own reading: the nine headings IMM 5669 prints over its boxes, each one section.
const f5669 = inventory("imm5669e");
const s = draftFromInventory(f5669.fields as never, f5669.headings).sections;
const named = s.filter((x) => !x.unnamed).map((x) => x.label);
const PRINTED = ["Your full name", "Personal details of your father", "Personal details of your mother", "Education", "Personal history", "Membership of association with organizations", "Government positions", "Military and/or paramilitary service", "Addresses"];
ok("QA-144 slice 4 pass: IMM 5669's rules pass drafts one section per numbered heading it prints, in its words", PRINTED.every((h) => named.includes(h)) && named.length === PRINTED.length, named);
ok("QA-144 slice 4 pass: each section quotes its printed heading, number and all (P-170)", s.filter((x) => !x.unnamed).every((x) => /^\d{1,2}\.\s+/.test(x.quote) && x.quote.toLowerCase().includes((x.label ?? "").toLowerCase())), s.map((x) => x.quote));
const of = (label: string) => s.find((x) => x.label === label)?.fieldKeys ?? [];
ok("QA-144 slice 4 pass: the boxes under one heading are one section (Education: the four year counts and the education table)", of("Education").some((k) => k.includes(".elementary[")) && of("Education").some((k) => k.includes(".trade[")) && of("Education").some((k) => k.includes(".educationTable[")), of("Education").slice(0, 6));
ok("QA-144 slice 4 pass: both military service tables are one section with their countries", ["country1", "militaryServiceTable1", "country2", "militaryServiceTable2"].every((p) => of("Military and/or paramilitary service").some((k) => k.includes(`.${p}[`))));
ok("QA-144 slice 4 fail: a box is in one section only", new Set(s.flatMap((x) => x.fieldKeys)).size === s.reduce((n, x) => n + x.fieldKeys.length, 0));
// Question 6 ("6. Have you, or, … been convicted …", longer than 60 characters) is a question, not a heading: it ends
// "Personal details of your mother", so its Yes/No boxes are in no section here (as before), never under the mother.
ok("QA-144 slice 4 fail: question 6's Yes/No boxes are not put under the heading printed before it", !s.some((x) => x.fieldKeys.some((k) => /\.[a-k]YesNo\[/.test(k))), s.filter((x) => x.fieldKeys.some((k) => /YesNo/.test(k))).map((x) => x.label));
ok("QA-144 slice 4 fail: a page with no numbered heading names nothing (page 4: the declarations and signatures)", !s.some((x) => x.fieldKeys.some((k) => k.includes(".page4["))));
ok("QA-144 slice 4 fail: no section is named after the PDF's part names (page2, educationTable, #subform)", !s.some((x) => /page\d|table|subform/i.test(x.label ?? "")), named);

// The rule is the headings file's, never a guess in the rules pass: without the file, nothing of IMM 5669 is drafted (the
// wrapper's pages are still no parts of their own), and a sub entry without a group keeps today's one-child section.
const none = draftFromInventory(f5669.fields as never, null).sections;
ok("QA-144 slice 4 fail: without IMM 5669's headings file the rules pass drafts none of its sections (the wrapper's pages are no parts)", none.length === 0, none.map((x) => x.label));
const page = "#subform.page2", child = "educationTable";
const noGroup: PartHeadings = { [page]: { heading: "", how: "none", sub: { [child]: { heading: "Education", printed: "7. Education" } } } };
ok("QA-144 slice 4 fail: a sub entry with no group, on a wrapper's page, is not read (the page stays no part)", draftFromInventory(f5669.fields as never, noGroup).sections.length === 0);
const grouped: PartHeadings = { [page]: { heading: "", how: "none", sub: { [child]: { heading: "Education", printed: "7. Education", group: "Education7" }, elementary: { heading: "Education", printed: "7. Education", group: "Education7" } } } };
const g = draftFromInventory(f5669.fields as never, grouped).sections;
ok("QA-144 slice 4 pass: two children of one group are one section", g.length === 1 && g[0].label === "Education" && g[0].fieldKeys.some((k) => k.includes(".elementary[")) && g[0].fieldKeys.some((k) => k.includes(".educationTable[")), g.map((x) => [x.label, x.fieldKeys.length]));

// No other form changed: every other committed headings file has no grouped entry (the reader's new rule is for a
// wrapper's pages only, and IMM 5669 is the one form of the inventory that has one).
const others = ["imm0008e", "imm0008depe", "imm1294e", "imm1295e", "imm1344e", "imm5257_1e", "imm5257e", "imm5406e", "imm5409e", "imm5475e", "imm5476e", "imm5562e", "imm5604e", "imm5645e", "imm5646e", "imm5707e", "imm5710e"];
const groupedElsewhere = others.filter((f) => { const h = inventory(f).headings ?? {}; return Object.values(h).some((p) => Object.values(p.sub ?? {}).some((x) => x.group)); });
ok("QA-144 slice 4 fail-guard: no other form's headings carry a numbered group", groupedElsewhere.length === 0, groupedElsewhere);
const wrapped = others.filter((f) => inventory(f).fields.some((x) => x.data_path && (x.section ?? "").startsWith("#")));
ok("QA-144 slice 4 fail-guard: no other form puts its pages inside an unnamed wrapper", wrapped.length === 0, wrapped);

// The one refusal left on Express Entry (an option map with no code for a list value) is said by its form, never by the
// form field's PDF path (S5; C10.1 "says why for a person (no field codes …)"): its label is the form edition.
const snap = (caption?: string) => ({ combination: {}, forms: [], canonical_fields: [{ id: "person.marital_status", answer_list: { key: "marital_status", values: [{ key: "single", label: "Single" }, { key: "unknown", label: "Unknown" }] } }],
  field_maps: [{ form_number: "IMM 0008 DEP", form_edition: "IMM 0008 DEP (10-2024)", entries: [{ data_path: "form1[0].Page1[0].AddDependant[0].MaritalStatus[0]", ...(caption ? { caption } : {}), outcome: "mapped", fact: "person.marital_status", transform: "option_map", option_map: { map: { single: "02" }, unused: [], codes: ["02"] } }] }] }) as never;
const said = channelProblems(snap("a) Your current marital status")).filter((p) => /no code for "unknown"/.test(p.message));
ok("QA-144 slice 4 pass: an option map's missing code is said by its form and the field's caption", said.length === 1 && problemWords(said[0] as never) === 'IMM 0008 DEP (10-2024): a) Your current marital status (person.marital_status): no code for "unknown" (filling would refuse it).', said.map((p) => problemWords(p as never)));
ok("QA-144 slice 4 fail: its words never carry the form field's PDF path", said.every((p) => !/\[0\]/.test(problemWords(p as never))) && said.every((p) => p.item === "form1[0].Page1[0].AddDependant[0].MaritalStatus[0]"), said.map((p) => [p.item, problemWords(p as never)]));

console.log(`${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
