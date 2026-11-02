// G4 (C5.7; concept product/screens/G4-answer-keys/concept.md BR-1…BR-8, challenge.md): answer-key families and the
// runner. Part A, the engine (engine/answer-keys.ts, engine/form-values.ts): one pass and one fail per rule, on the
// Visitor visa draft snapshot read once by this check (the engine itself reads no database: a static check proves it,
// P-249). The IMM 5257 family is evidence lane E1's household and its expected values are E1's checked fill (it passed
// Adobe Validate on 23 Oct), never this product's own output; the boxes where today's map gives something else are
// amended in writing below, each with its reason, for the immigration expert (AMENDED). Part B, the API: families,
// keys, the expert's signature, runs and their states, duties, stale saves and the audit. Sample data; US$0; no AI.
//   zsh studio/tools/isolated.sh forms_g4 4450 start && tsx studio/tests/check_g4_answer_keys.ts 4450 xr_studio_forms_g4
// (it releases the Visitor visa itself through tests/runtime/setup_visitor_visa.ts when the copy has none)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { buildSnapshot, type Snapshot } from "../engine/snapshot.ts";
import { changeProblem, checkExpected, checkFamily, fingerprintOf, NO_SCORING, runFieldMap, runRuleSet, runState, signProblem, type Family, type MapExpected } from "../engine/answer-keys.ts";
import type { Inventory } from "../engine/form-values.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_g4";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = "user-A", EXPERT = "user-C", APPROVER = "user-B", OFFICER = "user-O";
const FORM = "IMM 5257", P = "form1[0].";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------------------------------------------ the inputs
if (!sql(`select count(*) from combination where combination_key = 'vv.single'`).startsWith("1"))
  execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" });
const vv = sql(`select id from combination where combination_key = 'vv.single'`);
if (!vv) { console.error("STOP  setup_visitor_visa.ts did not release the Visitor visa"); process.exit(2); }
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DB}` }) } as never);
const ws = sql(`select workspace_id from combination where id = '${vv}'`);
const snap = async () => (await buildSnapshot(db as never, ws, vv, "draft")).snapshot;
let s: Snapshot = await snap();
const map = (s.field_maps as { form_number: string; form_edition: string; inventory_file: string; entries: { data_path: string; fact?: string | null; person?: string | null; caption?: string | null }[] }[]).find((m) => m.form_number === FORM)!;
const inv = JSON.parse(readFileSync(join(STUDIO, "..", "..", map.inventory_file), "utf8")) as Inventory;
const sample = JSON.parse(readFileSync(join(STUDIO, "samples", "answer-key-families.json"), "utf8")).families[0];
const fields = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id)), roles = new Set(["principal", "spouse_or_partner", "child"]);
const e1 = JSON.parse(readFileSync(join(STUDIO, "..", "evidence-lane", "E1", "imm5257", "values.complete.json"), "utf8")).values as Record<string, string>;

/** Where today's IMM 5257 map gives something other than E1's checked fill. Each is an open point for the immigration
 *  expert (the PR's Questions); the key holds what the map gives today, and the E1 run below fails on exactly these. */
const AMENDED: Record<string, { value: string; why: string }> = {
  "Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]": { value: "", why: "E1 writes N; no question asks other names yet (C7.2)" },
  "Page2[0].natID[0].q1[0].natIDIndicator[0]": { value: "", why: "E1 writes N; no question asks a national identity document yet (C7.2)" },
  "Page2[0].USCard[0].q1[0].usCardIndicator[0]": { value: "", why: "E1 writes N; no question asks a US card yet (C7.2)" },
  "Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]": { value: "", why: "E1 writes N; the release publishes this box as not a fact" },
  "Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]": { value: "", why: "E1 writes N; the release publishes this box as not a fact" },
  "Page3[0].Signature[0].Consent0[0].Choice[0]": { value: "", why: "E1 writes N; the release publishes the consent box as not a fact" },
  "Page3[0].BackgroundInfo[0].Choice[0]": { value: "", why: "E1 writes N (tuberculosis question); the map has no fact on this box" },
  "Page3[0].PageWrapper[0].GovPosition[0].Choice[0]": { value: "", why: "E1 writes N (government position); the map has no fact on this box" },
  "Page3[0].DetailsOfVisit[0].Contacts_Row1[0].AddressInCanada[0].AddressInCanada[0]": { value: "100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada", why: "E1 writes \"100 SAMPLE STREET, TORONTO ON M5V 0A1\"; the map's one-line address adds commas and the country" },
  "Page1[0].PersonalDetails[0].CountryWhereApplying[0].Row2[0].Country[0]": { value: "205", why: "E1 leaves it blank when the country where applying is the country of residence; the map writes it" },
  "Page2[0].ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0].CanadaUS[0]": { value: "0", why: "E1 leaves the Canada/US switch unset; the map writes it off" },
  ...Object.fromEntries(["ResidentialAddressRow1[0].CityTown[0].CityTown[0]", "ResidentialAddressRow1[0].StreetName[0].Streetname[0]", "ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]", "ResidentialAddressRow2[0].Country[0].Country[0]", "ResidentialAddressRow2[0].PostalCode[0].PostalCode[0]"]
    .map((b) => [`Page2[0].ContactInformation[0].contact[0].${b}`, { value: ({ "ResidentialAddressRow1[0].CityTown[0].CityTown[0]": "NEW DELHI", "ResidentialAddressRow1[0].StreetName[0].Streetname[0]": "EXAMPLE ROAD", "ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]": "12", "ResidentialAddressRow2[0].Country[0].Country[0]": "205", "ResidentialAddressRow2[0].PostalCode[0].PostalCode[0]": "110001" } as Record<string, string>)[b], why: "E1 leaves the residential address blank when it is the mailing address (Y); the map writes it too" }])),
};
const e1Key: MapExpected = { edition: map.form_edition, people: { mother: { ...e1 } } };
const key: MapExpected = { edition: map.form_edition, people: { mother: { ...e1, ...Object.fromEntries(Object.entries(AMENDED).map(([b, a]) => [P + b, a.value])) } } };
for (const [b, a] of Object.entries(AMENDED)) if (a.value === "") delete key.people.mother[P + b]; // a box not in the key must stay blank (BR-4)

// ------------------------------------------------------------------------------------------------ Part A: engine
// P-249: the engine files read no database, file, network or model (their imports only).
for (const f of ["engine/answer-keys.ts", "engine/form-values.ts"]) {
  const src = readFileSync(join(STUDIO, f), "utf8"), imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  const bad = imports.filter((i) => /prisma|node:fs|node:http|node:net|node:child_process|anthropic|openai|fetch|\/api\//.test(i));
  ok(`C5.7 P-249: ${f} imports no database, file, network or model module`, imports.length > 0 && !bad.length && !/\bfetch\(|Date\.now\(|new Date\(\)/.test(src), bad);
}

// BR-1: a family is checked
const fam = checkFamily(sample, fields, roles);
ok("C5.7 BR-1: the E1 family (a travelling mother, her husband at home) is accepted", fam.errors.length === 0 && fam.family.people.find((p) => p.id === "father")?.applies === false, fam.errors);
const family: Family = fam.family;
const bad1 = checkFamily({ ...sample, people: [...sample.people, { id: "aunt", role: "principal", label: "Second (Sample)" }] }, fields, roles);
ok("C5.7 BR-1 fail: two principals are refused on the field", bad1.errors.some((e) => e.field === "people" && /exactly one principal/.test(e.message)), bad1.errors);
const bad2 = checkFamily({ ...sample, facts: [{ about: "mother", fact: "person.shoe_size", value: "9" }, { about: "uncle", fact: "person.family_name", value: "X" }, { about: "mother", fact: "person.occupation_city", row: 1, value: "PUNE" }] }, fields, roles);
ok("C5.7 BR-1 fail: an unknown field, an unknown person and a row with a gap are each refused on their field", ["facts[0].fact", "facts[1].about"].every((f) => bad2.errors.some((e) => e.field === f)) && bad2.errors.some((e) => /rows start at 0/.test(e.message)), bad2.errors.map((e) => e.field));
const bad3 = checkFamily({ ...sample, people: [{ id: "mother", role: "pilot", label: "X" }] }, fields, roles);
ok("C5.7 BR-1 fail: a role that is not a person role of the library is refused", bad3.errors.some((e) => e.field === "people[0].role"), bad3.errors);
ok("C5.7 BR-1: a relative a form describes is accepted (<person>/parent_1)", checkFamily({ ...sample, facts: [...sample.facts, { about: "mother/parent_1", fact: "person.family_name", value: "ELDER" }] }, fields, roles).errors.length === 0);

// BR-2: an expected result is checked against the item
const ex = checkExpected(s, "field_map", FORM, family, key, inv);
ok("C5.7 BR-2: the IMM 5257 key is accepted (every box on the map)", ex.errors.length === 0, ex.errors.slice(0, 3));
const exBad = checkExpected(s, "field_map", FORM, family, { people: { mother: { "form1[0].Nowhere[0]": "X" }, nobody: {} } }, inv);
ok("C5.7 BR-2 fail: a box the map does not have and a person not in the family are refused on their field", exBad.errors.some((e) => e.field === "expected.people.mother.form1[0].Nowhere[0]") && exBad.errors.some((e) => e.field === "expected.people.nobody"), exBad.errors);
const sig = inv.fields.find((f) => f.ui === "signature" || /signature/i.test(f.caption ?? ""))?.data_path;
const sMap = clone(s); if (sig) (sMap.field_maps as typeof map[]).find((m) => m.form_number === FORM)!.entries.push({ data_path: sig, fact: "person.family_name", person: "form_subject", caption: "Signature" });
const exSig = sig ? checkExpected(sMap, "field_map", FORM, family, { people: { mother: { [sig]: "EXAMPLE" } } }, inv) : null;
ok("C5.7 BR-2 fail (challenge M5 c): a box a person fills (a signature) cannot be given a value", !!exSig && exSig.errors.some((e) => /filled by a person/.test(e.message)), { sig, errors: exSig?.errors });
ok("C5.7 BR-2 fail: a scoring key is refused in words (no scoring tables yet)", checkExpected(s, "scoring", "crs", family, {}).errors[0]?.message === NO_SCORING);

// BR-3, BR-4: the run
const pass = runFieldMap(s, family, FORM, inv, key);
ok(`C5.7 BR-3/BR-4: the E1 family passes the Visitor visa IMM 5257 map, every value (${pass.passed} values)`, pass.result === "PASSED" && pass.failed === 0 && pass.passed >= 50, pass.lines.filter((l) => !l.pass).slice(0, 5));
const asIs = runFieldMap(s, family, FORM, inv, e1Key);
const fails = new Set(asIs.lines.filter((l) => !l.pass).map((l) => l.target.replace(P, "")));
ok(`C5.7 BR-4: E1's checked values as they stand fail on exactly the ${Object.keys(AMENDED).length} amended boxes (the gap stays visible)`, asIs.result === "FAILED" && fails.size === Object.keys(AMENDED).length && Object.keys(AMENDED).every((b) => fails.has(b)), [...fails].filter((b) => !(b in AMENDED)));
ok("C5.7 BR-4: the none-apply boxes are written N after a confirmed \"none apply\" (education, previous countries)", ["Page3[0].Education[0].EducationIndicator[0]", "Page1[0].PersonalDetails[0].PCRIndicator[0]"].every((b) => pass.lines.find((l) => l.target === P + b)?.got === "N"));
const noNone = runFieldMap(s, { ...family, none_apply: [] }, FORM, inv, key);
ok("C5.7 BR-4 fail: without \"none apply\" the education box stays blank and the line fails", noNone.lines.some((l) => l.target === `${P}Page3[0].Education[0].EducationIndicator[0]` && !l.pass && l.got === ""));
// The team's own test (SA-1B-181 §11): the spouse's given name wired to the principal fails, naming the box.
const wrong = clone(s); const ge = (wrong.field_maps as typeof map[]).find((m) => m.form_number === FORM)!.entries.find((e) => e.data_path === `${P}Page1[0].MaritalStatus[0].SectionA[0].GivenName[0]`)!; ge.person = "form_subject";
const wire = runFieldMap(wrong, family, FORM, inv, key), wl = wire.lines.find((l) => !l.pass);
ok("C5.7 BR-4 fail: the spouse's given name wired to the principal fails naming the box (expected FATHER, got MOTHER)", wire.result === "FAILED" && wire.failed === 1 && wl?.target === `${P}Page1[0].MaritalStatus[0].SectionA[0].GivenName[0]` && wl.expected === "FATHER" && wl.got === "MOTHER", wl);
const less = clone(key); delete less.people.mother[`${P}Page1[0].PersonalDetails[0].DOBYear[0]`];
const extra = runFieldMap(s, family, FORM, inv, less);
ok("C5.7 BR-4 fail: a box the run writes that the key does not list fails (\"written, not expected\")", extra.failed === 1 && /written, not expected/.test(extra.lines[0].why ?? "") && extra.lines[0].got === "1962", extra.lines[0]);
const travelling = runFieldMap(s, { ...family, people: family.people.map((p) => ({ ...p, applies: true })) }, FORM, inv, key);
ok("C5.7 BR-4 fail: when the husband travels too, his IMM 5257 applies and fails with no expected values for him", travelling.result === "FAILED" && travelling.lines.some((l) => l.person === "father" && !l.pass && /no expected values/.test(l.why ?? "")));
ok("C5.7 BR-3: a run reads the family's reference date, not today (the same family twice gives the same lines)", JSON.stringify(runFieldMap(s, family, FORM, inv, key).lines) === JSON.stringify(pass.lines));

// BR-5: fingerprints
const fp = fingerprintOf(s, "field_map", FORM, inv), last = { result: "PASSED", itemFingerprint: pass.fingerprint.item, inputsFingerprint: pass.fingerprint.inputs, keyVersion: 1 };
ok("C5.7 BR-5: the last run on the item as it is reads Passed", runState(last, fp, 1).state === "PASSED" && fp.item === pass.fingerprint.item);
ok("C5.7 BR-5 fail: after a map change, a key change or a form field list change the last run reads Not run", runState(last, fingerprintOf(wrong, "field_map", FORM, inv), 1).state === "NOT_RUN" && runState(last, fp, 2).state === "NOT_RUN" && runState(last, fingerprintOf(s, "field_map", FORM, { ...inv, fields: inv.fields.slice(1) }), 1).state === "NOT_RUN");
const listChanged = clone(s); (listChanged.canonical_fields as { id: string; answer_list?: { values: { key: string }[] } }[]).find((f) => f.id === "person.citizenship")!.answer_list!.values.find((v) => v.key === "india")!.key = "india_renamed";
ok("C5.7 BR-5 fail (challenge M2): an answer-list change outside the map also reads Not run (never a stale Passed)", runState(last, fingerprintOf(listChanged, "field_map", FORM, inv), 1).state === "NOT_RUN" && runFieldMap(listChanged, family, FORM, inv, key).result === "FAILED");

// BR-6: per edition
const ed = runFieldMap(s, family, FORM, inv, { ...key, edition: "IMM 5257 (01-2020)" });
ok("C5.7 BR-6 fail: a key for another edition fails in words", ed.result === "FAILED" && /one good edition proves nothing about another/i.test(ed.lines[0].why ?? ""), ed.lines[0]);

// BR-7: sign and change
const expert = { id: EXPERT, duties: ["review", "sme"] }, author = { id: AUTHOR, duties: ["author", "review"] };
ok("C5.7 BR-7: the expert signs the version shown, even when they entered the values (challenge M3)", signProblem({ state: "DRAFT", version: 3 }, expert, 3) === null);
ok("C5.7 BR-7 fail: the author cannot sign; a stale version or a signed key is refused", /Only the immigration expert/.test(signProblem({ state: "DRAFT", version: 3 }, author, 3) ?? "") && /changed since you opened/.test(signProblem({ state: "DRAFT", version: 3 }, expert, 2) ?? "") && /already signed/.test(signProblem({ state: "SIGNED", version: 3 }, expert, 3) ?? ""));
ok("C5.7 BR-7: a draft key changes freely; a signed one with a one-line reason", changeProblem("DRAFT", undefined) === null && changeProblem("SIGNED", "map corrected for the 2026 edition") === null);
ok("C5.7 BR-7 fail: a signed key without a reason, or with a two-line one, is refused", !!changeProblem("SIGNED", "") && !!changeProblem("SIGNED", "a\nb"));

// Rule set (SA-1B-199): the Visitor visa eligibility gates, saved here as the C6.9 author does (Sample)
const gates = [{ key: "passport", label: "Holds a passport (Sample)", condition: { op: "exists", field: "person.passport_number" } }, { key: "no_criminal_history", label: "No criminal history (Sample)", condition: { op: "eq", field: "person.criminal_history", value: false } }];
const cur = (await call("GET", `/combinations/${vv}/eligibility-gates`, undefined, AUTHOR)).body;
const put = await call("PUT", `/combinations/${vv}/eligibility-gates`, { gates, judgement: ["Enough money for the stay (the officer's judgement)"], ...(cur?.version ? { version: cur.version } : {}) }, AUTHOR);
ok("setup: the Visitor visa draft gets two Sample eligibility gates", put.status === 200, put.body);
s = await snap();
const rules = { people: { mother: { outcome: "LIKELY_ELIGIBLE" as const, gates: { passport: "met" as const, no_criminal_history: "met" as const } } } };
const rExp = checkExpected(s, "rule_set", "eligibility", family, rules);
const rPass = runRuleSet(s, family, rExp.expected as typeof rules);
ok("C5.7 rule set: the family passes the eligibility rules (outcome and each gate)", rExp.errors.length === 0 && rPass.result === "PASSED" && rPass.passed === 3, rPass.lines.filter((l) => !l.pass));
const noPass = runRuleSet(s, { ...family, facts: family.facts.filter((f) => !(f.about === "mother" && f.fact === "person.passport_number")) }, rules);
ok("C5.7 rule set fail: without the passport number the gate is Not answered and the outcome differs; both lines fail", noPass.result === "FAILED" && noPass.lines.some((l) => l.target === "gate:passport" && l.got === "not_answered") && noPass.lines.some((l) => l.target === "outcome" && l.got === "POSSIBLY_ELIGIBLE"), noPass.lines.filter((l) => !l.pass));
ok("C5.7 rule set fail: a person who is not travelling cannot be given an eligibility result (C6.9 BR-7)", checkExpected(s, "rule_set", "eligibility", family, { people: { ...rules.people, father: { outcome: "LIKELY_ELIGIBLE" } } }).errors.some((e) => e.field === "expected.people.father" && /not travelling/.test(e.message)));
ok("C5.7 rule set fail: a gate the rules do not have is refused", checkExpected(s, "rule_set", "eligibility", family, { people: { mother: { outcome: "LIKELY_ELIGIBLE", gates: { visa_fee_paid: "met" } } } }).errors.some((e) => e.field === "expected.people.mother.gates.visa_fee_paid"));

// ------------------------------------------------------------------------------------------------ Part B: the API
const run = Date.now().toString(36);
const body = { ...sample, key: `e1-${run}` };
ok("C5.7 API: a case person cannot read the families (403)", (await call("GET", "/answer-keys/families", undefined, OFFICER)).status === 403);
ok("C5.7 API fail: the approver (no author duty) cannot write a family (403)", (await call("POST", "/answer-keys/families", body, APPROVER)).status === 403);
const bad = await call("POST", "/answer-keys/families", { ...body, reference_date: "2026-02-30" }, AUTHOR);
ok("C5.7 API fail: an impossible reference date is refused on the field (400)", bad.status === 400 && bad.body.errors?.some((e: { field: string }) => e.field === "reference_date"), bad.body);
const made = await call("POST", "/answer-keys/families", body, AUTHOR);
ok("C5.7 API: the author writes the family; it reads Sample", made.status === 201 && /Sample/.test(made.body.sample) && made.body.version === 1, made.body);
ok("C5.7 API fail: the same family key twice is refused (400)", (await call("POST", "/answer-keys/families", body, AUTHOR)).status === 400);
const fid: string = made.body.id;
const list0 = (await call("GET", `/combinations/${vv}/answer-keys`, undefined, APPROVER)).body;
ok("C5.7 API: the combination lists its testable items (the IMM 5257 map and the eligibility rules)", list0.items?.some((i: { item_ref: string }) => i.item_ref === FORM) && list0.items?.some((i: { item_kind: string }) => i.item_kind === "rule_set"), list0.items);
const kBad = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fid, item_kind: "field_map", item_ref: FORM, expected: { people: { mother: { "form1[0].Nowhere[0]": "X" } } } }, AUTHOR);
ok("C5.7 API fail: a key with a box the map does not have is refused on the field (400)", kBad.status === 400 && kBad.body.errors?.[0]?.field === "expected.people.mother.form1[0].Nowhere[0]", kBad.body);
const k = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fid, item_kind: "field_map", item_ref: FORM, expected: key }, EXPERT);
ok("C5.7 API: the expert enters the expected values; the key is Draft, Sample, Not run", k.status === 201 && k.body.state === "DRAFT" && /Sample/.test(k.body.sample) && k.body.run.state === "NOT_RUN", k.body?.run ?? k.body);
const kid: string = k.body.id;
const r1 = await call("POST", `/answer-keys/${kid}/run`, undefined, AUTHOR);
ok("C5.7 API: a run passes, line by line, and is stored", r1.status === 200 && r1.body.result === "PASSED" && r1.body.lines.length === pass.lines.length && r1.body.key.run.state === "PASSED", { status: r1.status, result: r1.body?.result, failed: r1.body?.failed });
ok("C5.7 API fail: a case person cannot run a key (403)", (await call("POST", `/answer-keys/${kid}/run`, undefined, OFFICER)).status === 403);
ok("C5.7 API fail: the author cannot sign (403)", (await call("POST", `/answer-keys/${kid}/sign`, { version: 1 }, AUTHOR)).status === 403);
ok("C5.7 API fail: the expert signing an old version is refused (409)", (await call("POST", `/answer-keys/${kid}/sign`, { version: 0 }, EXPERT)).status === 409);
const signed = await call("POST", `/answer-keys/${kid}/sign`, { version: 1 }, EXPERT);
ok("C5.7 API: the expert signs; the key is Signed, no longer Sample, still Passed", signed.status === 200 && signed.body.state === "SIGNED" && signed.body.sample === null && signed.body.signed_by === "Content reviewer" && signed.body.run.state === "PASSED", signed.body);
const noWhy = await call("PUT", `/answer-keys/${kid}`, { expected: key, version: 1 }, AUTHOR);
ok("C5.7 API fail: changing signed values without a reason is refused on the field (400)", noWhy.status === 400 && noWhy.body.errors?.[0]?.field === "reason", noWhy.body);
ok("C5.7 API fail: a stale change is refused (409)", (await call("PUT", `/answer-keys/${kid}`, { expected: key, version: 0, reason: "x" }, AUTHOR)).status === 409);
const changed = await call("PUT", `/answer-keys/${kid}`, { expected: less, version: 1, reason: "Date of birth year checked separately (test)" }, AUTHOR);
ok("C5.7 API: a change with a reason returns the key to Draft and its last run to Not run", changed.status === 200 && changed.body.state === "DRAFT" && changed.body.run.state === "NOT_RUN" && changed.body.change_reason === "Date of birth year checked separately (test)", changed.body?.run);
const r2 = await call("POST", `/answer-keys/${kid}/run`, undefined, EXPERT);
ok("C5.7 API: the run now fails on the box left out, naming it", r2.body.result === "FAILED" && r2.body.failed === 1 && r2.body.lines[0].target === `${P}Page1[0].PersonalDetails[0].DOBYear[0]`, r2.body.lines?.[0]);
await call("PUT", `/answer-keys/${kid}`, { expected: key, version: 2 }, AUTHOR);
await call("POST", `/answer-keys/${kid}/run`, undefined, AUTHOR);
await call("POST", `/answer-keys/${kid}/sign`, { version: 3 }, EXPERT);
const fam1 = (await call("GET", "/answer-keys/families", undefined, AUTHOR)).body.families.find((f: { id: string }) => f.id === fid);
const famNoWhy = await call("PUT", `/answer-keys/families/${fid}`, { ...fam1, version: fam1.version }, AUTHOR);
ok("C5.7 API fail: changing a family a signed key uses needs a reason (400)", famNoWhy.status === 400 && famNoWhy.body.errors?.[0]?.field === "reason", famNoWhy.body);
ok("C5.7 API fail: a stale family save is refused (409)", (await call("PUT", `/answer-keys/families/${fid}`, { ...fam1, version: 0, reason: "x" }, AUTHOR)).status === 409);
const famOk = await call("PUT", `/answer-keys/families/${fid}`, { ...fam1, facts: fam1.facts.map((f: { fact: string; about: string }) => (f.about === "father" && f.fact === "person.given_names" ? { ...f, value: "PAPA" } : f)), version: fam1.version, reason: "husband's given name corrected (test)" }, AUTHOR);
const after = (await call("GET", `/answer-keys/${kid}`, undefined, APPROVER)).body;
ok("C5.7 API (challenge Q3): a family change returns its signed key to Draft and the last run to Not run", famOk.status === 200 && famOk.body.version === 2 && after.state === "DRAFT" && after.run.state === "NOT_RUN" && /Family changed/.test(after.change_reason ?? ""), { status: famOk.status, state: after.state, run: after.run });
const r3 = await call("POST", `/answer-keys/${kid}/run`, undefined, AUTHOR);
ok("C5.7 API: re-run, the spouse's given name now fails (expected FATHER, got PAPA)", r3.body.result === "FAILED" && r3.body.lines[0].expected === "FATHER" && r3.body.lines[0].got === "PAPA", r3.body.lines?.[0]);
const rk = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fid, item_kind: "rule_set", item_ref: "eligibility", expected: rules }, AUTHOR);
const rr = await call("POST", `/answer-keys/${rk.body.id}/run`, undefined, AUTHOR);
ok("C5.7 API: a rule-set key runs and passes", rk.status === 201 && rr.body.result === "PASSED", rr.body?.lines?.filter((l: { pass: boolean }) => !l.pass));
ok("C5.7 API fail: a scoring key is refused in words (400)", (await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fid, item_kind: "scoring", item_ref: "crs", expected: {} }, AUTHOR)).body.detail === NO_SCORING);
const audit = sql(`select string_agg(summary, ' | ') from audit_event where entity in ('answer key', 'answer-key family') and entity_key like 'e1-${run}%'`);
ok("C5.7 API: runs, signatures and changes are audited without the family's values (SA-1B-296 f.9)", /ran the family/.test(audit) && /signed the expected values/.test(audit) && !/MOTHER|EXAMPLE|Z7654321|1962/.test(audit), audit.slice(0, 300));
const missing = await call("GET", "/answer-keys/00000000-0000-0000-0000-000000000000", undefined, AUTHOR);
ok("C5.7 API fail: an unknown key or a malformed id is 404", missing.status === 404 && (await call("GET", "/answer-keys/not-a-uuid", undefined, AUTHOR)).status === 404);

await db.$disconnect();
console.log("\nAmended boxes (open points for the immigration expert):");
for (const [b, a] of Object.entries(AMENDED)) console.log(`  ${b}: ${a.why}`);
process.exit(summary() ? 1 : 0);
