// G4 (C5.7): the first answer-key family's expected values for the Visitor visa IMM 5257 map, shared by
// tests/check_g4_answer_keys.ts and tests/check_g4_tests_tab_browser.ts. They are evidence lane E1's checked fill
// (prototype/evidence-lane/E1/imm5257/values.complete.json, Adobe Validate passed 23 Oct), never this product's output,
// with the boxes where today's map differs amended in writing (AMENDED, each with its reason, for the immigration expert).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MapExpected } from "../engine/answer-keys.ts";

export const P = "form1[0].";
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
export const e1 = JSON.parse(readFileSync(join(STUDIO, "..", "evidence-lane", "E1", "imm5257", "values.complete.json"), "utf8")).values as Record<string, string>;
export const sample = JSON.parse(readFileSync(join(STUDIO, "samples", "answer-key-families.json"), "utf8")).families[0];

/** Where today's IMM 5257 map gives something other than E1's checked fill. B99 (C10.1 row 12b, #1123): the applying-from
 *  country and the residential address are no longer amended: the product now leaves them blank when "Same as …?" is Yes,
 *  as E1 did and as the form's own Validate requires (its validateCWA and validateResidentialAddress empty the Yes when that
 *  row holds anything; engine/form-values.ts sameAsLeavesRowEmpty), so the key is E1's checked value there again. Each is an open point for the immigration
 *  expert (the PR's Questions); the key holds what the map gives today, and the E1 run below fails on exactly these. */
export const AMENDED: Record<string, { value: string; why: string }> = {
  "Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]": { value: "", why: "E1 writes N; no question asks other names yet (C7.2)" },
  "Page2[0].natID[0].q1[0].natIDIndicator[0]": { value: "", why: "E1 writes N; no question asks a national identity document yet (C7.2)" },
  "Page2[0].USCard[0].q1[0].usCardIndicator[0]": { value: "", why: "E1 writes N; no question asks a US card yet (C7.2)" },
  "Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]": { value: "", why: "E1 writes N; the release publishes this box as not a fact" },
  "Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]": { value: "", why: "E1 writes N; the release publishes this box as not a fact" },
  "Page3[0].Signature[0].Consent0[0].Choice[0]": { value: "", why: "E1 writes N; the release publishes the consent box as not a fact" },
  "Page3[0].BackgroundInfo[0].Choice[0]": { value: "", why: "E1 writes N (tuberculosis question); the map has no fact on this box" },
  "Page3[0].PageWrapper[0].GovPosition[0].Choice[0]": { value: "", why: "E1 writes N (government position); the map has no fact on this box" },
  "Page3[0].DetailsOfVisit[0].Contacts_Row1[0].AddressInCanada[0].AddressInCanada[0]": { value: "100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada", why: "E1 writes \"100 SAMPLE STREET, TORONTO ON M5V 0A1\"; the map's one-line address adds commas and the country" },
  "Page2[0].ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0].CanadaUS[0]": { value: "0", why: "E1 leaves the Canada/US switch unset; the map writes it off" },
};

/** E1's values as they stand (they fail on exactly the AMENDED boxes), and the key: E1 with the amendments. */
export function e1Keys(edition: string): { e1Key: MapExpected; key: MapExpected } {
  const e1Key: MapExpected = { edition, people: { mother: { ...e1 } } };
  const key: MapExpected = { edition, people: { mother: { ...e1, ...Object.fromEntries(Object.entries(AMENDED).map(([b, a]) => [P + b, a.value])) } } };
  for (const [b, a] of Object.entries(AMENDED)) if (a.value === "") delete key.people.mother[P + b]; // a box not in the key must stay blank (BR-4)
  return { e1Key, key };
}
