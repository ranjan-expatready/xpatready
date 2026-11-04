// QA-207 (#886, tech lead's ruling (a)): a previous edition of a form can be drafted and replayed like any form. Its manifest
// label describes the file, so its manifest row records the printed edition read from it (`printed`): the field-map
// converter stamps that (p2/convert.ts), and the file attaches and is filed as a Form under it (api/src/sources.ts). Pure
// checks: no server, no model call, US$0.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_qa207_previous_editions.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { convertFieldMap } from "../../p2/convert.ts";
import { officialKind } from "../api/src/sources.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const PRINTED = /^(IMM|IRM) [0-9A-Z ]+ \([0-9]{2}-[0-9]{4}\)$/;
// A real recorded answer (IRM 0002's saved draft, #840): its output is converted again under each inventory below.
const parsed = JSON.parse(JSON.parse(readFileSync(join(SOLUTION, "prototype/p2/runs/studio-fieldmap-irm0002e-live-20261104t053531343z-0a39c9.json"), "utf8")).raw_output);
const editions = (c: { entries: { form_edition?: string }[] }) => [...new Set(c.entries.map((e) => e.form_edition))];
const manifest = JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")).items as { file: string; path: string; edition: string; printed?: string; printed_from?: string }[];

// The manifest: each previous edition records the printed edition read from it, and says how it was read.
const previous = manifest.filter((i) => i.path.startsWith("previous-editions/"));
ok("QA-207 pass: every previous edition in the manifest records a printed edition, read from the file without AI", previous.length === 2 && previous.every((i) => PRINTED.test(i.printed ?? "") && /read_form_identity\.py \(no AI\)/.test(i.printed_from ?? "")), previous.map((i) => [i.file, i.printed]));
ok("QA-207 pass: those are IMM 5476 (11-2021) and IMM 5257 (06-2019), the editions the intake reads (C2.4)", previous.find((i) => i.file === "imm5476e-2021.pdf")?.printed === "IMM 5476 (11-2021)" && previous.find((i) => i.file === "imm5257e-pre-2023.pdf")?.printed === "IMM 5257 (06-2019)");
ok("QA-207 fail-guard: a current form records no printed field (its label is already printed)", manifest.filter((i) => i.path.startsWith("forms/")).every((i) => !i.printed && PRINTED.test(i.edition)));
// The converter: a previous edition is stamped with its printed edition; nothing a caller says changes that.
const older = convertFieldMap(parsed, "prototype/p1/inventory/imm5476e-2021.inventory.json");
const told = convertFieldMap(parsed, "prototype/p1/inventory/imm5476e-2021.inventory.json", "IMM 5257 (09-2023)");
ok("QA-207 pass: a previous edition is stamped IMM 5476 (11-2021), so its entries meet the contract's pattern", editions(older).join() === "IMM 5476 (11-2021)", editions(older));
ok("QA-207 fail: another form's edition passed by a caller is never stamped on it (#937 break B1)", editions(told).join() === "IMM 5476 (11-2021)", editions(told));
const current = convertFieldMap(parsed, "prototype/p1/inventory/irm0002e.inventory.json", "IRM 0002 (01-1999)");
ok("QA-207 fail-guard: a current form keeps its printed manifest label (IRM 0002 (03-2021))", editions(current).join() === "IRM 0002 (03-2021)", editions(current));
// The attachment kind: a previous edition is a Form; other folders keep theirs; a path leaving its folder is none (break B7).
ok("QA-207 pass: a file in previous-editions/ attaches as a Form", officialKind("previous-editions/imm5476e-2021.pdf") === "Form" && officialKind("previous-editions/imm5257e-pre-2023.pdf") === "Form");
ok("QA-207 fail-guard: the other folders keep their kinds, and a path with .. is no Form", officialKind("forms/imm5476e.pdf") === "Form" && officialKind("checklists/imm5484e.pdf") === "Document checklist" && officialKind("instructions/guide-5256.html") === "Instructions" && officialKind("canada/pages/x.html") === "Official file" && officialKind("forms/../checklists/x.pdf") === "Official file" && officialKind("previous-editions/../../x") === "Official file");
console.log(`${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
