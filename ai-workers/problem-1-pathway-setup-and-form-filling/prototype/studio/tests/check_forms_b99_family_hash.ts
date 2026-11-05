// B99 (C10.1 row 12b): a saved validated read-back counts on a new load only for a copy that reads the same confirmed
// facts as the copy that was validated. The case's own ids are new on every load, so the facts hash the loader compares
// names each person by their Sample name (api/src/sample-validated.ts familyFactsHash). Pure: no server, US$0.
//   tsx studio/tests/check_forms_b99_family_hash.ts
import { inputHash } from "../engine/runtime/forms.ts";
import { familyFactsHash } from "../api/src/sample-validated.ts";
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
process.exit(summary() ? 1 : 0);
