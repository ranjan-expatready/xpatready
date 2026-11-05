// B78 (C10.1 row 7; P-319; AGENTS.md rule 4): the names a person gives the sections no printed heading was read over. Each
// entry is one held section, marked printed (the form's own words) or sample (Unconfirmed: expert); a section with no entry
// stays waiting; a placeholder is never a name. The real load is proved by check_qa144_vv_release.ts.
//   tsx studio/tests/check_b78_section_names.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { heldSectionNames, namedReason, nameOfHeld, readHeldSectionNames, type HeldSectionName } from "../api/src/section-names.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const refused = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
const entry: HeldSectionName = { form: "Form A (01-2026)", first_field: "a.b", name: "Your visit", printed: "YOUR VISIT", page: 2, basis: "printed" };

const names = readHeldSectionNames();
const raw = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "section-names.json"), "utf8")) as { sections: HeldSectionName[] }).sections;
ok("B78 pass: the sample file names the 29 held sections, one entry each", names.size === 29 && raw.length === 29, { size: names.size });
ok("B78 pass: every entry says where its words come from, with the printed words and the page", raw.every((s) => ["printed", "sample"].includes(s.basis) && s.printed.trim().length > 1 && s.page >= 1));
ok("B78 fail-guard: no name is a placeholder or the PDF's internal part name", raw.every((s) => !/unnamed|table\d|wrapper|^five$|^seven$/i.test(s.name)));
ok("B78 pass: a held section with an entry takes its name", nameOfHeld(heldSectionNames({ sections: [entry] }), entry.form, entry.first_field)?.name === "Your visit");
ok("B78 fail: another first form field or another edition has no name, so it stays waiting", nameOfHeld(heldSectionNames({ sections: [entry] }), entry.form, "a.c") === null && nameOfHeld(heldSectionNames({ sections: [entry] }), "Form A (02-2026)", entry.first_field) === null);
ok("B78 fail: a section with no form edition or no form field stays waiting", nameOfHeld(names, null, "a.b") === null && nameOfHeld(names, entry.form, undefined) === null);
ok("B78 fail: a placeholder, an empty name, an unmarked basis or the same section twice is refused", refused(() => heldSectionNames({ sections: [{ ...entry, name: "Unnamed section 1 of Form A" }] })) && refused(() => heldSectionNames({ sections: [{ ...entry, name: " " }] })) && refused(() => heldSectionNames({ sections: [{ ...entry, basis: "guess" as "sample" }] })) && refused(() => heldSectionNames({ sections: [entry, entry] })));
ok("B78 AGENTS rule 4: a printed name quotes the form and page and is marked Sample", /"YOUR VISIT" \(Form A \(01-2026\), page 2\) \(Sample\)/.test(namedReason(entry)));
ok("B78 AGENTS rule 4: a person's wording is marked Sample, Unconfirmed: expert", /\(Sample, Unconfirmed: expert\)/.test(namedReason({ ...entry, basis: "sample" })) && !/Unconfirmed/.test(namedReason(entry)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
