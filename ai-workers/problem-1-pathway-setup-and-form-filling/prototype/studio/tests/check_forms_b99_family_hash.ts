// B99 (C10.1 row 12b): a saved validated read-back counts on a new load only for a copy that reads the same confirmed
// facts as the copy that was validated. The case's own ids are new on every load, so the facts hash the loader compares
// names each person by their Sample name (api/src/sample-validated.ts familyFactsHash), and the values it writes are
// compared too (valuesHash). No server, US$0; three small files under var/, removed at the end.
//   tsx studio/tests/check_forms_b99_family_hash.ts
import { inputHash } from "../engine/runtime/forms.ts";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { familyFactsHash, valuesHash } from "../api/src/sample-validated.ts";
import { ROOT } from "../api/src/core.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const facts = (a: string, kid: string, dob = "2016-05-20") => [
  { box: "form1[0].Page1[0].PersonalDetails[0].Name[0].FamilyName[0]", fact: "person.family_name", about: a, row: null, value: "EXAMPLE" },
  { box: "form1[0].Page1[0].PersonalDetails[0].DOBYear[0]", fact: "person.date_of_birth", about: kid, row: null, value: dob },
  { box: "form1[0].Page3[0].DetailsOfVisit[0].Contacts_Row1[0].Name[0].Name[0]", fact: "case.visit_contact_name", about: "case", row: 0, value: "SAMPLE RELATIVE" },
];
const load1 = { "11111111-1111-1111-1111-111111111111": "Client A (Sample)", "22222222-2222-2222-2222-222222222222": "Child (Sample)" } as Record<string, string>;
const load2 = { "33333333-3333-3333-3333-333333333333": "Client A (Sample)", "44444444-4444-4444-4444-444444444444": "Child (Sample)" } as Record<string, string>;
const name = (m: Record<string, string>) => (about: string) => m[about] ?? about;
const one = facts("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222");
const two = facts("33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444");

ok("B99: the case's own facts hash changes with every load (its ids are new), so it cannot match a saved read-back", inputHash(one) !== inputHash(two));
ok("B99 pass: the family facts hash is the same on two loads of the same answers", familyFactsHash(one, name(load1)) === familyFactsHash(two, name(load2)));
ok("B99 pass: it does not depend on the order the facts were read in", familyFactsHash([...one].reverse(), name(load1)) === familyFactsHash(one, name(load1)));
ok("B99 fail: one changed answer (a child's date of birth) gives another hash, so the saved Validate does not count", familyFactsHash(facts("33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444", "2016-05-21"), name(load2)) !== familyFactsHash(one, name(load1)));
ok("B99 fail: the same answers about another person give another hash", familyFactsHash(two, name({ ...load2, "44444444-4444-4444-4444-444444444444": "Child 18 or over (Sample)" })) !== familyFactsHash(one, name(load1)));
// Review on #1123 (M1): the values a copy writes are compared too: the same answers filled by another rule do not count.
const dir = join(import.meta.dirname, "..", "var", "check-b99-values"); mkdirSync(dir, { recursive: true });
const copy = (name: string, values: Record<string, string>) => { writeFileSync(join(dir, `${name}.request.json`), JSON.stringify({ values })); return relative(ROOT, join(dir, `${name}.pdf`)); };
const a = copy("a", { "form1[0].X[0]": "Y", "form1[0].Y[0]": "205" }), b = copy("b", { "form1[0].Y[0]": "205", "form1[0].X[0]": "Y" }), d = copy("d", { "form1[0].X[0]": "Y" });
ok("B99 pass: the same written values give the same values hash, whatever their order", valuesHash(a) !== null && valuesHash(a) === valuesHash(b));
ok("B99 fail: a copy that leaves a value out (another rule, same answers) has another values hash, so a saved Validate does not count", valuesHash(d) !== valuesHash(a));
ok("B99 fail: a copy whose values cannot be read has no values hash (never counted)", valuesHash(relative(ROOT, join(dir, "missing.pdf"))) === null && valuesHash(null) === null);
rmSync(dir, { recursive: true, force: true });
process.exit(summary() ? 1 : 0);
