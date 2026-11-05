// B99 (C10.1 row 12b): a "Same as …?" form field written Yes leaves the row it stands for empty, as the form's own
// Validate demands. The 5 Nov rehearsal's Validate in Adobe cleared IMM 5257's "Is the country from where you are applying
// the same…" and "Is your residential address the same as your mailing address?" (both required), because the product
// had also written the applying-from country and the residential address: the form's scripts `validateCWA` and
// `validateResidentialAddress` (its own template, expected/source-text/imm5257e.xfa-template.txt) empty the Yes when that row
// holds anything. Pure: no server, no database, no AI; US$0. The form field list is IMM 5257's own (evidence lane E1's
// inventory); the answers are Sample.
//   tsx studio/tests/check_forms_b99_same_as.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formValues, rowOfBox, type Inventory } from "../engine/form-values.ts";
import type { BoxRow } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const inv = JSON.parse(readFileSync(join(import.meta.dirname, "../../evidence-lane/E1/imm5257/imm5257e.inventory.json"), "utf8")) as Inventory;
const P = "form1[0].Page1[0].PersonalDetails[0]", C = "form1[0].Page2[0].ContactInformation[0].contact[0]";
const SAME_COR = `${P}.SameAsCORIndicator[0]`, CWA = `${P}.CountryWhereApplying[0].Row2[0]`;
const SAME_MAIL = `${C}.SameAsMailingIndicator[0]`;
const HOME = { street_number: "12", street_name: "EXAMPLE ROAD", city: "NEW DELHI", postal_code: "110001", country: "India" };
const box = (b: string, fact: string, value: unknown, transform: string): BoxRow => ({ box: b, fact, value, transform, coverage: "confirmed fact", about: "p1", row: null } as unknown as BoxRow);
// The checkpoint's map, as the saved AI answer wrote it (evidence/slice-1-imm5257-live/job.json).
const boxes = (from: string, home: object, status: string | null) => [
  box(SAME_COR, "person.applying_from_country", from, "derived:person.applying_from_country equals person.current_residence_country -> yes_no_code:Y/N"),
  box(`${CWA}.Country[0]`, "person.applying_from_country", from === "India" ? "205" : "061", "as_is"),
  ...(status ? [box(`${CWA}.Status[0]`, "person.applying_from_status", status, "as_is")] : []),
  box(`${P}.CurrentCOR[0].Row2[0].Country[0]`, "person.current_residence_country", "205", "as_is"),
  box(SAME_MAIL, "person.residential_address", home, "derived:person.residential_address equals person.mailing_address -> yes_no_code:Y/N"),
  box(`${C}.ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]`, "person.residential_address", home, "address_part:street_number"),
  box(`${C}.ResidentialAddressRow1[0].CityTown[0].CityTown[0]`, "person.residential_address", home, "address_part:city"),
  box(`${C}.ResidentialAddressRow2[0].PostalCode[0].PostalCode[0]`, "person.residential_address", home, "address_part:postal_code"),
  box(`${C}.AddressRow1[0].StreetNum[0].StreetNum[0]`, "person.mailing_address", HOME, "address_part:street_number"),
  // the other side of each comparison, as the case holds it
  { ...box("form1[0].none[0]", "person.current_residence_country", "India", "as_is"), box: "x.current" },
  { ...box("form1[0].none[1]", "person.mailing_address", HOME, "as_is"), box: "x.mailing" },
];
const snap = { canonical_fields: [] } as unknown as Snapshot;
const map = { entries: [] };
const run = (from: string, home: object, status: string | null = null) => formValues(snap, map, inv, boxes(from, home, status));

ok("B99 rows: a form field's row is its own subform, its wrapper of the same name dropped", rowOfBox(`${C}.ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]`) === `${C}.ResidentialAddressRow1[0]` && rowOfBox(`${CWA}.Country[0]`) === CWA);

// Pass: applying from the country of residence, living at the mailing address (the Sample family).
const same = run("India", HOME, "01");
ok("B99 pass: \"Same as current country of residence?\" is written Y", same.values[SAME_COR] === "Y", same.values[SAME_COR]);
ok("B99 pass: the applying-from row is left empty (country and status), so the form's Validate keeps the Y", !(`${CWA}.Country[0]` in same.values) && !(`${CWA}.Status[0]` in same.values), Object.keys(same.values).filter((k) => k.startsWith(CWA)));
ok("B99 pass: \"Residential address same as mailing?\" is written Y and the residential rows are left empty", same.values[SAME_MAIL] === "Y" && !Object.keys(same.values).some((k) => k.includes("ResidentialAddressRow")), Object.keys(same.values).filter((k) => k.includes("Residential")));
const why = same.boxes.find((b) => b.box === `${CWA}.Country[0]`);
ok("B99 pass: the empty box says why in words, naming the form's question, never a field code", why?.result === "blank" && /^Not needed: "Is the country from where you are applying the same as your current country of residence\?" is Yes/.test(why?.why ?? "") && !/SameAs|\[0\]/.test(why?.why ?? ""), why?.why);
ok("B99 pass: nothing else changes: the current country of residence and the mailing address are still written", same.values[`${P}.CurrentCOR[0].Row2[0].Country[0]`] === "205" && same.values[`${C}.AddressRow1[0].StreetNum[0].StreetNum[0]`] === "12");

// Fail (the rule must not over-reach): a different country, a different home: the "Same as" is N and every row is written.
const other = run("United States", { ...HOME, street_number: "99" }, "03");
ok("B99 fail: applying from another country: N, and the applying-from country and status are written", other.values[SAME_COR] === "N" && other.values[`${CWA}.Country[0]`] === "061" && other.values[`${CWA}.Status[0]`] === "03", Object.fromEntries(Object.entries(other.values).filter(([k]) => k.startsWith(CWA) || k === SAME_COR)));
ok("B99 fail: a different home: N, and the residential address is written", other.values[SAME_MAIL] === "N" && other.values[`${C}.ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]`] === "99");
process.exit(summary() ? 1 : 0);
