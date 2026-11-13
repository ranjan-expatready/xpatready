// BK-22 (BK-13 code gap C1 and C1b, #1695; Lead 35's ruling there, 13 Nov): the form filler (p5/transforms.ts) runs every
// step the Study permit's field maps left "by hand" on BK-13's run, each with a pass and a fail test; it never half-runs a
// step (#1695 C1b: "address_part:country then code_list:…" wrote "India" into a list box); and Field map review flags a
// step the filler cannot run before the map is accepted (engine/field-map-rounds.ts mapRules, P-121's rating).
// The step texts are the drafters' own words, as the configured checkpoint's release holds them (saved AI runs
// p2/runs/studio-fieldmap-imm1294e-live-20261102t123313431z-a60a72.json, c1-fieldmap-imm1295-live-20261020t062024995z.json,
// the IMM 5707 run); the form fields' choices come from each form's own field list (p1/inventory). Sample people, made up.
// No server, no database, US$0.
//   tsx studio/tests/check_bk22_filler_steps.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalSteps, runTransform, sameAsOf, stepsNotRun, type Box, type Context, type Outcome } from "../../p5/transforms.ts";
import { mapRules, STEPS_RULE, type MapField } from "../engine/field-map-rounds.ts";
import { p121Rating } from "../engine/agreement.ts";
import { formValues, sameAsLeavesRowEmpty, type BoxResult, type InventoryBox } from "../engine/form-values.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const INV = join(import.meta.dirname, "..", "..", "p1", "inventory");
const fields = (form: string) => (JSON.parse(readFileSync(join(INV, `${form}.inventory.json`), "utf8")) as { fields: (InventoryBox & { data_path: string })[] }).fields;
const boxOf = (form: string, tail: string): Box => { const f = fields(form).find((x) => (x.data_path ?? "").endsWith(tail)); if (!f) throw new Error(`${form}: no form field ${tail}`); return f as Box; };
const TEXT: Box = { ui: "textEdit" };
const val = (o: Outcome) => (o.ok ? o.value : null);
const handWhy = (o: Outcome) => (!o.ok && "hand" in o ? o.reason : null);
const blank = (o: Outcome) => !o.ok && "blank" in o;
const notExec = (o: Outcome) => /is not in the executable set/.test(handWhy(o) ?? "");

const INDIA = { country_code: "91", number: "98000 00001" }, CANADA = { country_code: "1", number: "416-555-0100" };
const HOME = { apt_unit: "4B", street_number: "12", street_name: "Example Road", city: "Pune", province: "Maharashtra", postal_code: "411001", country: "India" };
const SCHOOL = { street_number: "100", street_name: "Example Street", city: "Toronto", province: "ON", postal_code: "M5V 1A1", country: "Canada" };
const facts = (m: Record<string, unknown>): Context["fact"] => (k) => m[k];

// ── IMM 1294 (06-2026)
const DOLLARS = "number:whole_dollars (max 7 chars)";
ok("BK-22 pass: number:whole_dollars (max 7 chars) writes a whole amount (20000, \"12000\", \"2000.00\" as 2000) [IMM 1294 tuition, room and board, other costs]",
  val(runTransform(DOLLARS, 20000, TEXT)) === "20000" && val(runTransform(DOLLARS, "12000", TEXT)) === "12000" && val(runTransform(DOLLARS, "2000.00", TEXT)) === "2000" && val(runTransform("number:whole_dollars (max 12 chars)", 30000, TEXT)) === "30000");
ok("BK-22 fail: number:whole_dollars goes by hand for cents (never rounded), for words, and for 8 digits in a 7-character box (never truncated)",
  /cents/.test(handWhy(runTransform(DOLLARS, "1500.50", TEXT)) ?? "") && /not an amount/.test(handWhy(runTransform(DOLLARS, "about 5000", TEXT)) ?? "") && /never truncated/.test(handWhy(runTransform(DOLLARS, 12345678, TEXT)) ?? "") && blank(runTransform(DOLLARS, "", TEXT)));

const STREET = "address_part:street_line (max 130 chars)";
ok("BK-22 pass: address_part:street_line (max 130 chars) writes the unit, number and street of an address [IMM 1294 school address]",
  val(runTransform(STREET, SCHOOL, TEXT)) === "100 Example Street" && val(runTransform(STREET, HOME, TEXT)) === "4B 12 Example Road" && val(runTransform(STREET, "100 Example Street, Toronto, ON M5V 1A1", TEXT)) === "100 Example Street");
ok("BK-22 fail: address_part:street_line is blank for an address with no street, and by hand when longer than its box (never truncated)",
  blank(runTransform(STREET, { city: "Toronto", province: "ON" }, TEXT)) && /longer than 130/.test(handWhy(runTransform(STREET, { street_number: "1", street_name: "x".repeat(140) }, TEXT)) ?? ""));

const SAME_COR = "derive: Y if applying-from country equals current residence country, else N; yes_no_code:Y/N";
const corBox = boxOf("imm1294e", "PersonalDetails[0].SameAsCORIndicator[0]");
const own = (f: string, m: Record<string, unknown>): Context => ({ ownFact: f, fact: facts(m) });
ok("BK-22 pass: \"derive: Y if applying-from country equals current residence country, else N\" compares the box's own country with the person's current residence country [IMM 1294]",
  val(runTransform(SAME_COR, "India", corBox, own("person.applying_from_country", { "person.current_residence_country": "India" }))) === "Y" && val(runTransform(SAME_COR, "India", corBox, own("person.applying_from_country", { "person.current_residence_country": "United Arab Emirates" }))) === "N");
ok("BK-22 fail: the same step goes by hand when the residence country is not confirmed (never guessed)",
  /current_residence_country is not confirmed/.test(handWhy(runTransform(SAME_COR, "India", corBox, own("person.applying_from_country", {}))) ?? ""));

const SAME_MAIL = "derive: Y if residential address equals mailing address, else N; yes_no_code:Y/N";
ok("BK-22 pass: \"derive: Y if residential address equals mailing address, else N\" gives Y for the same address and N for another [IMM 1294]",
  val(runTransform(SAME_MAIL, HOME, TEXT, own("person.residential_address", { "person.mailing_address": { ...HOME } }))) === "Y" && val(runTransform(SAME_MAIL, HOME, TEXT, own("person.residential_address", { "person.mailing_address": SCHOOL }))) === "N");
ok("BK-22 fail: words that name no fact (\"derive: Y if the moon equals the sun's 2nd phase, else N\") stay not executable; a missing mailing address goes by hand",
  notExec(runTransform("derive: Y if the moon equals the sun's 2nd phase, else N; yes_no_code:Y/N", HOME, TEXT, own("person.residential_address", {}))) && /mailing_address is not confirmed/.test(handWhy(runTransform(SAME_MAIL, HOME, TEXT, own("person.residential_address", {}))) ?? ""));

const CC1 = "derive: 1 if the number's country calling code is 1 (Canada/US), else 0", CCN = "derive: 1 if the number's country calling code is not 1, else 0", FAX1 = "derive: 1 if the fax number's country calling code is 1 (Canada/US), else 0";
ok("BK-22 pass: \"derive: 1 if the number's (the fax number's) country calling code is (not) 1 …, else 0\" ticks Canada/US or Other [IMM 1294 phones]",
  val(runTransform(CC1, INDIA, TEXT)) === "0" && val(runTransform(CCN, INDIA, TEXT)) === "1" && val(runTransform(CC1, CANADA, TEXT)) === "1" && val(runTransform(CCN, CANADA, TEXT)) === "0" && val(runTransform(FAX1, CANADA, TEXT)) === "1");
ok("BK-22 fail: a phone with no country calling code goes by hand",
  /no country calling code/.test(handWhy(runTransform(CC1, { number: "98000 00001" }, TEXT)) ?? "") && /no country calling code/.test(handWhy(runTransform(CCN, "98000 00001", TEXT)) ?? ""));

const NAT = "phone_part:national_number_without_country_code (max 20 chars)";
ok("BK-22 pass: phone_part:national_number_without_country_code (max 20 chars) writes the number's digits after the country code [IMM 1294]",
  val(runTransform(NAT, INDIA, TEXT)) === "9800000001");
ok("BK-22 fail: the same step is blank for a North American number (its area-code boxes take it) and by hand when over 20 digits",
  blank(runTransform(NAT, CANADA, TEXT)) && /never truncated/.test(handWhy(runTransform(NAT, { country_code: "44", number: "1".repeat(21) }, TEXT)) ?? ""));

const ISR = "derive: Y if passport country of issue = 206 (ISR (Israel)), else N; yes_no_code:Y/N";
const isrBox = boxOf("imm1294e", "Passport[0].IsraelPassportIndicator[0]"), pc = (v: unknown) => runTransform(ISR, v, isrBox, own("person.passport_country_of_issue", {}));
ok("BK-22 pass: \"derive: Y if passport country of issue = 206 (ISR (Israel)), else N\" gives Y for 206, ISR or Israel and N for another country [IMM 1294]",
  val(pc("ISR")) === "Y" && val(pc("Israel")) === "Y" && val(pc("206")) === "Y" && val(pc("IND")) === "N" && val(pc("India")) === "N");
ok("BK-22 fail: a list or a record is not a country: by hand; and the step on another fact than the box's own stays not executable",
  /not a single answer/.test(handWhy(pc(["ISR", "IND"])) ?? "") && notExec(runTransform(ISR, "ISR", isrBox, own("person.citizenship", {}))));

// #1695 C1b: never half-run. Before, "address_part:country then code_list:…" stopped after the first step.
const CTRY = "address_part:country then code_list:imm1294.country_address (codes as in inventory)";
const ctryBox = boxOf("imm1294e", "ResidentialAddressRow2[0].Country[0].Country[0]"), indiaCode = (ctryBox.options_resolved ?? []).find(([l]) => l === "India")?.[1];
const PROV = "address_part:province then code_list:imm1294.province (AB=09, BC=11, MB=07, NB=04, NL=01, NS=03, NT=10, NU=64, ON=06, PE=02, QC=05, SK=08, YT=12)";
ok("BK-22 pass (#1695 C1b): \"address_part:country then code_list:…\" runs both steps: the country's own code from the form's list, never its name; the school's province ON is 06",
  !!indiaCode && val(runTransform(CTRY, HOME, ctryBox)) === indiaCode && val(runTransform(PROV, SCHOOL, boxOf("imm1294e", "PurposeRow1[0].ProvinceState[0].Prov[0]"))) === "06");
ok("BK-22 fail (#1695 C1b): a country the list does not have goes by hand; a part step with words after it is never half-run (not executable)",
  /not in the box's option list/.test(handWhy(runTransform(CTRY, { ...HOME, country: "Atlantis" }, ctryBox)) ?? "") && notExec(runTransform("address_part:country as printed on the passport", HOME, TEXT))
  && notExec(runTransform("phone_part:national_number including spaces", INDIA, TEXT)));

// ── IMM 1295 (09-2025 run)
const sex95 = boxOf("imm1295e", "PersonalDetails[0].Sex[0].Sex[0]");
const CL = (name: string) => `code_list:imm1295.${name}`;
ok("BK-22 pass: a code list written with no space before its bracket runs: sex(…), phone_type(…), service_language(…), official_language_ability(…) [IMM 1295]",
  val(runTransform(`${CL("sex")}(F Female=Female,M Male=Male,U Unknown=Unknown,X Another gender=Unspecified)`, "F Female", sex95)) === "Female"
  && val(runTransform(`${CL("phone_type")}(Residence=01,Cellular=02,Business=03)`, "Cellular", boxOf("imm1295e", "PhoneNumbers[0].Phone[0].Type[0]"))) === "02"
  && val(runTransform(`${CL("service_language")}(English=01,French=02)`, "English", boxOf("imm1295e", "ServiceIn[0].ServiceIn[0]"))) === "01"
  && val(runTransform(`${CL("official_language_ability")}(English,French,Both,Neither)`, "English", boxOf("imm1295e", "ableToCommunicate[0].ableToCommunicate[0]"))) === "English");
ok("BK-22 fail: a value its list does not have goes by hand (\"Satellite\" phone, \"Klingon\")",
  /not in the box's option list/.test(handWhy(runTransform(`${CL("phone_type")}(Residence=01,Cellular=02,Business=03)`, "Satellite", boxOf("imm1295e", "PhoneNumbers[0].Phone[0].Type[0]"))) ?? "")
  && /not in the box's option list/.test(handWhy(runTransform(`${CL("official_language_ability")}(English,French,Both,Neither)`, "Klingon", boxOf("imm1295e", "ableToCommunicate[0].ableToCommunicate[0]"))) ?? ""));

ok("BK-22 pass: \"derive:country calling code is (not) 1->check:1/0\" ticks Canada/US or Other [IMM 1295 phones]",
  val(runTransform("derive:country calling code is 1->check:1/0", INDIA, TEXT)) === "0" && val(runTransform("derive:country calling code is not 1->check:1/0", INDIA, TEXT)) === "1" && val(runTransform("derive:country calling code is 1->check:1/0", CANADA, TEXT)) === "1");
ok("BK-22 fail: the same step with no country calling code goes by hand; \"check:\" with no codes stays not executable",
  /no country calling code/.test(handWhy(runTransform("derive:country calling code is 1->check:1/0", { number: "1" }, TEXT)) ?? "") && notExec(runTransform("derive:country calling code is 1->check:yes", INDIA, TEXT)));

ok("BK-22 pass: address_part:unit is the address's apartment or unit [IMM 1295 mailing and residential addresses]",
  val(runTransform("address_part:unit", HOME, TEXT)) === "4B");
ok("BK-22 fail: address_part:unit is blank for an address with no unit (never another part)",
  blank(runTransform("address_part:unit", SCHOOL, TEXT)));

const SAME95 = "derive:person.residential_address equals person.mailing_address->yes_no_code:Y/N", COR95 = "derive:case.applying_from_country equals current residence country->yes_no_code:Y/N";
ok("BK-22 pass: \"derive:A equals B\" (\"derive\", not \"derived\"), with A drafted as case.applying_from_country for the box's own person.applying_from_country [IMM 1295]",
  val(runTransform(SAME95, HOME, TEXT, own("person.residential_address", { "person.mailing_address": HOME }))) === "Y" && val(runTransform(SAME95, HOME, TEXT, own("person.residential_address", { "person.mailing_address": SCHOOL }))) === "N"
  && val(runTransform(COR95, "India", TEXT, own("person.applying_from_country", { "person.current_residence_country": "India" }))) === "Y" && val(runTransform(COR95, "India", TEXT, own("person.applying_from_country", { "person.current_residence_country": "Canada" }))) === "N");
ok("BK-22 fail: \"derive:A equals B\" naming another fact that is not confirmed goes by hand, never compared with the box's own value",
  /person.passport_country_of_issue is not confirmed/.test(handWhy(runTransform("derive:person.passport_country_of_issue equals current residence country->yes_no_code:Y/N", "India", TEXT, own("person.applying_from_country", { "person.current_residence_country": "India" }))) ?? ""));

// ── IMM 5707 (01-2023)
const relBox = boxOf("imm5707e", "PersonalData[0].Relationship[0]");
const REL = "code_list:imm5707.child_relationship (Son=1, Daughter=2, Step-daughter=3, Step-son=4, Adopted daughter=5, Adopted son=6). There is no option for other relationship types: such a value must be flagged for review.";
ok("BK-22 pass: a code list followed by its note that a value the list lacks is flagged runs (Son is 1, Adopted daughter is 5) [IMM 5707]",
  val(runTransform(REL, "Son", relBox)) === "1" && val(runTransform(REL, "Adopted daughter", relBox)) === "5");
ok("BK-22 fail: a relationship the list lacks goes by hand (flagged, as the note says); a note that orders anything else stays not executable",
  /not in the box's option list/.test(handWhy(runTransform(REL, "Nephew", relBox)) ?? "") && notExec(runTransform("code_list:imm5707.child_relationship (Son=1, Daughter=2). Write nephews as Son.", "Son", relBox)));

// ── "Same as" row emptying (B99) reads every spelling the filler runs.
ok("BK-22 pass: sameAsOf reads the prose and the IMM 1295 spellings as the same \"A equals B\" with its Yes code",
  JSON.stringify(sameAsOf(SAME_MAIL, "person.residential_address")) === JSON.stringify({ a: "person.residential_address", b: "person.mailing_address", yes: "Y" })
  && sameAsOf(COR95, "person.applying_from_country")?.a === "person.applying_from_country" && sameAsOf(COR95, "person.applying_from_country")?.b === "person.current_residence_country");
ok("BK-22 fail: sameAsOf is null for a step with no yes/no code after it, and for words that name no fact",
  sameAsOf("derive:person.residential_address equals person.mailing_address", "person.residential_address") === null && sameAsOf("derive: Y if the moon equals the sun's 2nd phase, else N", "person.residential_address") === null);
{
  const row = (box: string, fact: string, value: unknown, transform: string) => ({ box, caption: box, fact, meaning: null, about: "p1", about_label: "Client A", row: null, coverage: "confirmed fact" as const, detail: "", value, transform });
  const inv: InventoryBox[] = [{ data_path: "f.contact.SameAsMailingIndicator", ui: "exclGroup", options_resolved: [["*No", "N"], ["*Yes", "Y"]] }, { data_path: "f.contact.ResidentialAddressRow1.StreetName.Streetname", ui: "textEdit" }];
  const boxes = [row(inv[0].data_path!, "person.residential_address", HOME, SAME_MAIL), row(inv[1].data_path!, "person.residential_address", HOME, "address_part:street_name"), row("f.contact.AddressRow1.StreetName", "person.mailing_address", HOME, "address_part:street_name")];
  const snap = { canonical_fields: [] } as never;
  const out = formValues(snap, { entries: boxes.map((b) => ({ data_path: b.box, fact: b.fact, transform: b.transform })) }, { fields: [...inv, { data_path: "f.contact.AddressRow1.StreetName", ui: "textEdit" }] }, boxes);
  const res = (p: string) => out.boxes.find((b: BoxResult) => b.box === p);
  ok("BK-22 pass (B99 on the prose spelling): residential same as mailing is written Y and the residential row after it is left empty, with the reason",
    res(inv[0].data_path!)?.written === "Y" && res(inv[1].data_path!)?.result === "blank" && /Not needed/.test(res(inv[1].data_path!)?.why ?? ""), out.boxes.map((b) => [b.box, b.result, b.written]));
  const diff = [row(inv[0].data_path!, "person.residential_address", HOME, SAME_MAIL), row(inv[1].data_path!, "person.residential_address", HOME, "address_part:street_name"), row("f.contact.AddressRow1.StreetName", "person.mailing_address", SCHOOL, "address_part:street_name")];
  const out2 = formValues(snap, { entries: diff.map((b) => ({ data_path: b.box, fact: b.fact, transform: b.transform })) }, { fields: [...inv, { data_path: "f.contact.AddressRow1.StreetName", ui: "textEdit" }] }, diff);
  ok("BK-22 fail (B99): a different mailing address is written N and the residential row stays written", out2.boxes.find((b) => b.box === inv[0].data_path)?.written === "N" && out2.boxes.find((b) => b.box === inv[1].data_path)?.written === "Example Road");
  void sameAsLeavesRowEmpty;
}

// ── Field map review flags a step the filler cannot run (seeded), before the map is accepted.
ok("BK-22 pass: stepsNotRun lists nothing for every step above (the Study permit's maps as drafted)",
  [DOLLARS, STREET, SAME_COR, SAME_MAIL, CC1, CCN, FAX1, NAT, ISR, CTRY, PROV, SAME95, REL, `${CL("sex")}(F Female=Female)`, "address_part:unit", "derive:country calling code is not 1->check:1/0"].every((t) => !stepsNotRun(t, /COR|applying/.test(t) ? "person.applying_from_country" : /passport/.test(t) ? "person.passport_country_of_issue" : "person.residential_address").length)
  && !stepsNotRun(COR95, "person.applying_from_country").length);
ok("BK-22 fail: stepsNotRun names a seeded unrunnable step, and only it (\"address_part:moon_phase\", \"select:previous_residence_period\")",
  JSON.stringify(stepsNotRun("address_part:moon_phase; as_is", "person.residential_address")) === JSON.stringify(["address_part:moon_phase"]) && JSON.stringify(stepsNotRun("select:previous_residence_period; date:YYYY-MM-DD", "person.residence_country")) === JSON.stringify(["select:previous_residence_period"]));
{
  const f = (transform: string): MapField => ({ proposedKey: "person.residential_address", proposedType: "address", boxes: [{ data_path: "f.Country", person: "subject", row: null, transform, caption: "Country" }] });
  const more = { quote: "Country", words: "country", claimedTwice: new Set<string>(), valueTypes: new Set(["address"]), round: "draft" as const };
  const good = mapRules(f(CTRY), new Set(["f.Country"]), more).find((r) => r.rule === STEPS_RULE), bad = mapRules(f("address_part:moon_phase then code_list:imm1294.country_address"), new Set(["f.Country"]), more);
  const badRule = bad.find((r) => r.rule === STEPS_RULE);
  ok("BK-22 pass: Field map review's rule \"steps the filler runs\" passes for a drafted step the filler runs", good?.passed === true && good.why === null, good);
  ok("BK-22 fail: a seeded unrunnable step fails the rule, in words that name the step and the form field and say it is left to write by hand",
    badRule?.passed === false && /"address_part:moon_phase"/.test(badRule.why ?? "") && /"Country"/.test(badRule.why ?? "") && /write by hand/.test(badRule.why ?? ""), badRule);
  const rating = p121Rating({ origin: "ai", agreement: "agreed", rounds: { draft: {}, check: {} } as never, rules: bad, confidence: "ready", reason: null });
  ok("BK-22 fail: an item whose map has that step is never High (P-121 lowers it to Check, with the rule's words), so a person decides it on its own before it is accepted",
    rating.confidence === "check" && /moon_phase/.test(rating.reason ?? ""), rating);
  const checker = mapRules(f("address_part:moon_phase"), new Set(["f.Country"]), { ...more, round: "checker" });
  ok("BK-22 pass: the checker round's own spelling is not judged (only the draft round's steps are applied and filled)", !checker.some((r) => r.rule === STEPS_RULE));
}
ok("BK-22: canonicalSteps leaves every other spelling as written (no step is invented)", JSON.stringify(canonicalSteps("as_is; date:YYYY", "person.x")) === JSON.stringify(["as_is", "date:YYYY"]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
