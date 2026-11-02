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
import { changeProblem, checkExpected, checkFamily, fingerprintOf, keyBoxes, NO_SCORING, runFieldMap, runRuleSet, runState, signProblem, type Family, type MapExpected } from "../engine/answer-keys.ts";
import type { Inventory } from "../engine/form-values.ts";
import { client, recorder } from "./runtime/api.ts";
import { AMENDED, e1Keys, P, sample } from "./g4_e1_key.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_g4";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = "user-A", EXPERT = "user-C", APPROVER = "user-B", OFFICER = "user-O";
const FORM = "IMM 5257";
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
const fields = new Set((s.canonical_fields as { id: string }[]).map((f) => f.id)), roles = new Set(["principal", "spouse_or_partner", "child"]);

const { e1Key, key } = e1Keys(map.form_edition);

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

// §4 Expected editor (challenge M5 b, STANDARDS §3.2): the boxes it offers, from the map and the form, never a run
const MS = `${P}Page1[0].MaritalStatus[0].SectionA[0].MaritalStatus[0]`;
const kb = keyBoxes(s, FORM, inv)!, mappedN = (map.entries as { outcome?: string }[]).filter((e) => e.outcome === "mapped").length;
const invAt = new Map(inv.fields.map((f, i) => [f.data_path, i]));
const ms = kb.boxes.find((b) => b.data_path === MS);
ok(`C5.7 §4: the Expected editor offers every mapped IMM 5257 box (${kb.boxes.length}) in the form's order, each with its caption, fact and whose`, kb.boxes.length === mappedN && kb.boxes.every((b, i) => i === 0 || (invAt.get(b.data_path) ?? 1e9) > (invAt.get(kb.boxes[i - 1].data_path) ?? -1)) && kb.boxes.every((b) => b.caption && b.whose) && kb.edition === map.form_edition, { n: kb.boxes.length, mappedN });
ok("C5.7 §4 (pick, don't type): a choice box carries the form's own options, label beside code (marital status: Married = 01)", !!ms?.options.some((o) => o.code === "01" && /Married/.test(o.label)) && kb.boxes.find((b) => /AliasNameIndicator\[0\]$/.test(b.data_path))?.options.map((o) => o.code).sort().join() === "N,Y", ms?.options.slice(0, 3));
ok("C5.7 §4: a text box has no options (typed), and none of the map's mapped boxes is one a person fills", kb.boxes.find((b) => b.fact === "person.family_name" && b.whose === "form_subject")?.options.length === 0 && kb.boxes.every((b) => !b.by_a_person));
const sMap2 = clone(s); if (sig) (sMap2.field_maps as typeof map[]).find((m) => m.form_number === FORM)!.entries.push({ data_path: sig, fact: "person.family_name", person: "form_subject", caption: "Signature", outcome: "mapped" } as typeof map.entries[number]);
const kbSig = sig ? keyBoxes(sMap2, FORM, inv)!.boxes.find((b) => b.data_path === sig) : undefined;
ok("C5.7 §4 fail (challenge M5 c): a signature box mapped by mistake is flagged as filled by a person, so the editor leaves it out", !!kbSig?.by_a_person && /signature/.test(kbSig.by_a_person_why ?? ""), kbSig);
ok("C5.7 §4 fail: a form the combination has no PDF map of gives no boxes", keyBoxes(s, "IMM 0000", inv) === null);

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

// Break report: dropped people and hostile input
const ghost = runFieldMap(s, family, FORM, inv, { ...key, people: { ...key.people, aunt: { [`${P}Page1[0].PersonalDetails[0].DOBYear[0]`]: "1970" } } });
ok("C5.7 BR-4 fail (break M2): expected values for a person the family no longer has fail, never skipped", ghost.result === "FAILED" && ghost.lines[0].person === "aunt" && /not a person of the family/.test(ghost.lines[0].why ?? ""), ghost.lines[0]);
const deep: Record<string, unknown> = {}; let at: Record<string, unknown> = deep; for (let i = 0; i < 10000; i++) { at.x = {}; at = at.x as Record<string, unknown>; }
const hostile = checkFamily({ ...sample, label: "\u200b\u200b", facts: [{ about: "mother", fact: "person.family_name", value: "EX\u0000" }, { about: "mother", fact: "person.given_names", value: deep }, { about: "case", fact: "person.sex", value: "f_female" }, { about: "mother/parent_1/extra", fact: "person.family_name", value: "X" }] }, fields, roles);
ok("C5.7 BR-1 fail (break m4, m5, m7, m10, m11): an invisible name, a NUL, a 10,000-deep value, a person field about the application and a three-part subject are each refused on their field", ["label", "facts[0].value", "facts[1].value", "facts[2].about", "facts[3].about"].every((f) => hostile.errors.some((e) => e.field === f)), hostile.errors.map((e) => e.field));
ok("C5.7 BR-1 fail (break m8, m11): a person id \"constructor\" and a principal who stays home are refused", checkFamily({ ...sample, people: [{ id: "constructor", role: "principal", label: "X (Sample)", applies: false }], facts: [] }, fields, roles).errors.filter((e) => e.field === "people[0].id" || /principal applicant travels/.test(e.message)).length === 2);
const many = checkFamily({ ...sample, facts: Array.from({ length: 10000 }, () => ({ about: "x", fact: "y", value: "" })) }, fields, roles);
ok("C5.7 BR-1 fail (break m6): 10,000 facts are refused once, before any fact is read", many.errors.length === 1 && many.errors[0].field === "facts", many.errors.length);
ok("C5.7 BR-2 fail (break m3): an edition of a million characters is refused", checkExpected(s, "field_map", FORM, family, { ...key, edition: "x".repeat(1_000_000) }, inv).errors.some((e) => e.field === "expected.edition"));
ok("C5.7 BR-7 fail (break m7): a reason of invisible characters only, or with a line separator, is refused", !!changeProblem("SIGNED", "\u200b") && !!changeProblem("SIGNED", "line one\u2028line two"));

const undecided = clone(s); const line = (undecided.forms as { form_number: string; condition?: unknown; status?: string }[]).find((f) => f.form_number === FORM)!; line.condition = { op: "eq", field: "person.uci", value: "1234" }; line.status = "conditional";
const und = runFieldMap(undecided, family, FORM, inv, key);
ok("C5.7 BR-4 fail (Devin review): a form whose condition the family cannot settle is never a pass", und.result === "FAILED" && und.lines.some((l) => l.got === "cannot tell" && /cannot be told/.test(l.why ?? "")), und.lines.filter((l) => !l.pass).slice(0, 2));
ok("C5.7 BR-1 fail (Devin review): a fact value with an invisible character in a part's name is refused", checkFamily({ ...sample, facts: [{ about: "mother", fact: "person.mailing_address", value: { "city\u200b": "PUNE" } }] }, fields, roles).errors.some((e) => e.field === "facts[0].value"));

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
// §4 Expected editor through the API: the boxes endpoint and the field picker (reads); a signature box in a save is 400.
const bx = await call("GET", `/combinations/${vv}/answer-keys/boxes?form=${encodeURIComponent(FORM)}`, undefined, APPROVER);
ok("C5.7 §4 API: GET …/answer-keys/boxes?form=IMM 5257 gives the engine's boxes in the form's order, a choice box with its options", bx.status === 200 && bx.body.boxes.length === kb.boxes.length && bx.body.boxes.map((b: { data_path: string }) => b.data_path).join() === kb.boxes.map((b) => b.data_path).join() && bx.body.boxes.find((b: { data_path: string }) => b.data_path === MS)?.options.some((o: { code: string }) => o.code === "01"), { status: bx.status, n: bx.body?.boxes?.length });
ok("C5.7 §4 API fail: a case person cannot read the boxes (403); a form not in the combination is 404; no form is 400 on the field", (await call("GET", `/combinations/${vv}/answer-keys/boxes?form=IMM%205257`, undefined, OFFICER)).status === 403 && (await call("GET", `/combinations/${vv}/answer-keys/boxes?form=IMM%200000`, undefined, AUTHOR)).status === 404 && (await call("GET", `/combinations/${vv}/answer-keys/boxes`, undefined, AUTHOR)).body.errors?.[0]?.field === "form");
const lf = await call("GET", "/answer-keys/fields", undefined, AUTHOR);
const lfMs = lf.body?.fields?.find((f: { id: string }) => f.id === "person.marital_status");
ok("C5.7 BR-1 API: GET /answer-keys/fields lists the library's fields with their type and, for a choice field, its answer list's values", lf.status === 200 && lf.body.fields.length >= 50 && lfMs?.values?.length > 3 && lf.body.fields.find((f: { id: string }) => f.id === "person.family_name")?.values === null, lfMs);
ok("C5.7 BR-1 API fail: a case person cannot read the field picker (403)", (await call("GET", "/answer-keys/fields", undefined, OFFICER)).status === 403);
const SIG = `${P}Page3[0].Signature[0].TextField2[0]`;
const kSig = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fid, item_kind: "field_map", item_ref: FORM, expected: { people: { mother: { [SIG]: "EXAMPLE MOTHER" } } } }, EXPERT);
ok("C5.7 §4 API fail (challenge M5 c): saving a value for the applicant's signature box is refused on that box (400): a person signs it", kSig.status === 400 && kSig.body.errors?.[0]?.field === `expected.people.mother.${SIG}` && /filled by a person/.test(kSig.body.errors[0].message) && !bx.body.boxes.some((b: { data_path: string }) => b.data_path === SIG), kSig.body);
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
// Review minors 1 and 4: guards that only a second request at the same moment, or a change without an edition, reaches.
const f2 = (await call("POST", "/answer-keys/families", { ...sample, key: `e1b-${run}` }, AUTHOR)).body;
const k2 = (await call("POST", `/combinations/${vv}/answer-keys`, { family_id: f2.id, item_kind: "field_map", item_ref: FORM, expected: { ...key, edition: "IMM 5257 (01-2020)" } }, EXPERT)).body;
const k2b = await call("PUT", `/answer-keys/${k2.id}`, { expected: { people: key.people }, version: 1 }, AUTHOR);
const r4 = await call("POST", `/answer-keys/${k2.id}/run`, undefined, AUTHOR);
ok("C5.7 BR-6 (review minor 1): a change that names no edition keeps the key's own edition, and the run still fails in words", k2b.status === 200 && k2b.body.expected.edition === "IMM 5257 (01-2020)" && r4.body.result === "FAILED" && r4.body.lines[0].target === "edition", { status: k2b.status, edition: k2b.body?.expected?.edition, line: r4.body?.lines?.[0]?.target });
ok("C5.7 API fail: the approver (no author or expert duty) cannot run a key (403)", (await call("POST", `/answer-keys/${k2.id}/run`, undefined, APPROVER)).status === 403);
const signs = await Promise.all([1, 2].map(() => call("POST", `/answer-keys/${k2.id}/sign`, { version: 2 }, EXPERT)));
ok("C5.7 BR-7 (review minor 4): two signs of one version at once: one signs, the other is refused (409)", signs.map((x) => x.status).sort().join() === "200,409", signs.map((x) => x.status));
const f2now = (await call("GET", "/answer-keys/families", undefined, AUTHOR)).body.families.find((f: { id: string }) => f.id === f2.id);
const saves = await Promise.all(["one", "two"].map((w) => call("PUT", `/answer-keys/families/${f2.id}`, { ...f2now, label: `E1 household ${w} (Sample)`, version: f2now.version, reason: `two saves at once (${w})` }, AUTHOR)));
ok("C5.7 BR-8 (review minor 4): two saves of one family version at once: one saves, the other is refused (409)", saves.map((x) => x.status).sort().join() === "200,409", saves.map((x) => x.status));
ok("C5.7 BR-4 (review minor 6): a line names the form's heading with its caption (not \"YYYY\" alone)", pass.lines.some((l) => l.target === `${P}Page1[0].PersonalDetails[0].DOBYear[0]` && l.label.length > 4 && /YYYY/.test(l.label)), pass.lines.find((l) => l.target === `${P}Page1[0].PersonalDetails[0].DOBYear[0]`)?.label);
ok("C5.7 API fail (break m12): a family id that is not an id is refused on the field (400)", (await call("POST", `/combinations/${vv}/answer-keys`, { family_id: 42, item_kind: "rule_set", item_ref: "eligibility", expected: rules }, AUTHOR)).body.errors?.[0]?.field === "family_id");
// Break M1: a family change racing the expert's sign never leaves a signature on facts the expert did not see.
let raced = 0, kept = 0;
for (let i = 0; i < 8; i++) {
  const f3 = (await call("POST", "/answer-keys/families", { ...sample, key: `e1r${i}-${run}` }, AUTHOR)).body;
  const k3 = (await call("POST", `/combinations/${vv}/answer-keys`, { family_id: f3.id, item_kind: "rule_set", item_ref: "eligibility", expected: rules }, EXPERT)).body;
  const [fr, sg] = await Promise.all([call("PUT", `/answer-keys/families/${f3.id}`, { ...f3, facts: f3.facts.map((x: { fact: string; about: string }) => (x.about === "mother" && x.fact === "person.family_name" ? { ...x, value: `CHANGED${i}` } : x)), version: 1, reason: "race test" }, AUTHOR), call("POST", `/answer-keys/${k3.id}/sign`, { version: 1 }, EXPERT)]);
  const end = (await call("GET", `/answer-keys/${k3.id}`, undefined, AUTHOR)).body;
  if (fr.status === 200 && sg.status === 200) raced++;
  if (fr.status === 200 && end.state === "SIGNED") kept++;
}
ok("C5.7 BR-7 fail (break M1): eight family changes racing a sign: no key stays Signed after its family changed", kept === 0, { kept, both_ok: raced });
// Break m1: a key change racing a sign: one of them is refused, or the change carries the reason.
const f4 = (await call("POST", "/answer-keys/families", { ...sample, key: `e1s-${run}` }, AUTHOR)).body;
const k4 = (await call("POST", `/combinations/${vv}/answer-keys`, { family_id: f4.id, item_kind: "rule_set", item_ref: "eligibility", expected: rules }, EXPERT)).body;
const [pu, sg4] = await Promise.all([call("PUT", `/answer-keys/${k4.id}`, { expected: rules, version: 1 }, AUTHOR), call("POST", `/answer-keys/${k4.id}/sign`, { version: 1 }, EXPERT)]);
ok("C5.7 BR-7 fail (break m1): a change without a reason racing a sign never both succeed", !(pu.status === 200 && sg4.status === 200), [pu.status, sg4.status]);
// Break m9 and m2, at the end (they change the copy): a retired combination's keys are not changed or signed; a map
// with no form field list takes no key.
const ed0 = sql(`select e.id from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5257' limit 1`);
sql(`update form_edition set inventory_file = null where id = '${ed0}' returning id`);
const noInv = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: f4.id, item_kind: "field_map", item_ref: FORM, expected: key }, AUTHOR);
ok("C5.7 API fail (break m2): a map key is refused while the form's field list is not recorded (422)", noInv.status === 422, noInv.body);
sql(`update form_edition set inventory_file = '../../../../../../../../tmp/outside.json' where id = '${ed0}' returning id`);
const esc = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: f4.id, item_kind: "field_map", item_ref: FORM, expected: key }, AUTHOR);
ok("C5.7 API fail (Devin review): a form field list path outside the solution folder is never read (422)", esc.status === 422, esc.status);
sql(`update combination set retired_at = now() where id = '${vv}' returning id`);
ok("C5.7 API fail (break m9): on a retired combination a key is not changed or signed (409)", (await call("PUT", `/answer-keys/${k4.id}`, { expected: rules, version: 2, reason: "x" }, AUTHOR)).status === 409 && (await call("POST", `/answer-keys/${k4.id}/sign`, { version: 2 }, EXPERT)).status === 409);
// Review minor (re-review 3a3cf527): the copy is put back, so the check can run again on it.
sql(`update combination set retired_at = null where id = '${vv}' returning id`);
sql(`update form_edition set inventory_file = '${map.inventory_file}' where id = '${ed0}' returning id`);
ok("C5.7 API fail (STANDARDS §6): a body of the wrong shape is refused by the contract, on the field (400)", (await call("POST", `/answer-keys/${k4.id}/sign`, { version: "2" }, EXPERT)).body.errors?.[0]?.field === "version" && (await call("POST", "/answer-keys/families", { label: "X", reference_date: "2026-01-01", people: "nobody" }, AUTHOR)).body.errors?.[0]?.field === "people");
const missing = await call("GET", "/answer-keys/00000000-0000-0000-0000-000000000000", undefined, AUTHOR);
ok("C5.7 API fail: an unknown key or a malformed id is 404", missing.status === 404 && (await call("GET", "/answer-keys/not-a-uuid", undefined, AUTHOR)).status === 404);

await db.$disconnect();
console.log("\nAmended boxes (open points for the immigration expert):");
for (const [b, a] of Object.entries(AMENDED)) console.log(`  ${b}: ${a.why}`);
process.exit(summary() ? 1 : 0);
