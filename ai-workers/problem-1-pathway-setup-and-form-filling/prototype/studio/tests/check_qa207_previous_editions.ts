// QA-207 (#886, tech lead's ruling (a)): a previous edition of a form can be drafted and replayed like any form. Its manifest
// label describes the file, so the field-map converter takes the printed edition the job knows (p2/convert.ts), and the
// file attaches as a Form (api/src/sources.ts officialKind). Pure checks: no server, no model call, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_qa207_previous_editions.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { convertFieldMap, PRINTED_EDITION } from "../../p2/convert.ts";
import { officialKind } from "../api/src/sources.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
// A real recorded answer (IRM 0002's saved draft, #840): its output is converted again under each inventory below.
const run = JSON.parse(readFileSync(join(SOLUTION, "prototype/p2/runs/studio-fieldmap-irm0002e-live-20261104t053531343z-0a39c9.json"), "utf8"));
const parsed = JSON.parse(run.raw_output);
const editions = (c: { entries: { form_edition?: string }[] }) => [...new Set(c.entries.map((e) => e.form_edition))];

// A current form: its manifest label is a printed edition, which stays, whatever the caller says.
const current = convertFieldMap(parsed, "prototype/p1/inventory/irm0002e.inventory.json", "IRM 0002 (01-1999)");
ok("QA-207 pass: a printed manifest label stays the edition (IRM 0002 (03-2021)); a known edition never overrides it", editions(current).join() === "IRM 0002 (03-2021)", editions(current));
// A previous edition: the manifest says "IMM 5476 previous edition (file dated …)"; the known printed edition is used.
const older = convertFieldMap(parsed, "prototype/p1/inventory/imm5476e-2021.inventory.json", "IMM 5476 (11-2021)");
ok("QA-207 pass: a previous edition takes the printed edition the job knows (IMM 5476 (11-2021)), so its entries meet the contract", editions(older).join() === "IMM 5476 (11-2021)" && editions(older).every((e) => PRINTED_EDITION.test(e ?? "")), editions(older));
// Without a known edition the old behaviour stays (the descriptive label), and a known edition that is not printed is not used.
const none = convertFieldMap(parsed, "prototype/p1/inventory/imm5476e-2021.inventory.json");
const junk = convertFieldMap(parsed, "prototype/p1/inventory/imm5476e-2021.inventory.json", "the 2021 one");
ok("QA-207 fail-guard: with no printed edition known, the manifest's label is kept, never invented", !PRINTED_EDITION.test(editions(none)[0] ?? "") && /previous edition/.test(editions(none)[0] ?? "") && editions(junk).join() === editions(none).join(), [editions(none), editions(junk)]);
// The attachment kind: a previous edition is a Form (read and drafted), the other folders keep theirs.
ok("QA-207 pass: a file in previous-editions/ attaches as a Form", officialKind("previous-editions/imm5476e-2021.pdf") === "Form" && officialKind("previous-editions/imm5257e-pre-2023.pdf") === "Form");
ok("QA-207 fail-guard: the other folders keep their kinds", officialKind("forms/imm5476e.pdf") === "Form" && officialKind("checklists/imm5484e.pdf") === "Document checklist" && officialKind("instructions/guide-5256.html") === "Instructions" && officialKind("canada/pages/x.html") === "Official file");
console.log(`${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
