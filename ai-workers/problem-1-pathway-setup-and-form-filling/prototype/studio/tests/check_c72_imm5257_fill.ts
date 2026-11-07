// C7.2 fill gaps (evidence PR #409: the app's own IMM 5257 filled 32 of 46 mandatory form fields; E1's 23 Oct fill, which
// passed Adobe Validate, filled them all). Three causes fixed: (1) the 21 Oct draft's transformation steps the executor
// did not run (phone parts, the amount as text, the one-line address in Canada, the "equals" and phone switches);
// (2) month-only dates (YYYY-MM) for the year and month boxes; (3) the "is anything recorded?" Yes/No boxes, written "N"
// only when a person answered "none apply" for their group (declared or confirmed: P-242, P-411, row B150, made a declared
// answer fill at once; review r1 B1: an empty question in a confirmed section is still not an answer). Part A: each rule passes and fails on its own (no server). Part B: the Sample
// family's Visitor visa case (the same facts as #409's make_case.ts) fills 40 of 46 mandatory form fields with none by
// hand; the 6 left are the 3 boxes the release publishes as "not a fact" and the 3 Yes/No boxes no question asks yet
// (other names, national identity document, US card): forms and expert questions in the PR, unchanged here. Fail guards:
// before "none apply" is answered the derived boxes stay "not written"; an entry added after the copy makes it out of
// date. Sample data; US$0.
//   zsh studio/tools/isolated.sh runtime_c72 4434 start && tsx studio/tests/check_c72_imm5257_fill.ts 4434 xr_studio_runtime_c72
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTransform } from "../../p5/transforms.ts";
import { gateOf, markNothingRecorded, type GatePlacement } from "../engine/runtime/forms.ts";
import type { BoxRow } from "../engine/render.ts";
import type { QuestionnaireView } from "../contracts/runtime.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_c72";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OFFICER = "user-O", CLIENT = "user-P", run = Date.now().toString(36);
const val = (o: ReturnType<typeof runTransform>) => (o.ok ? o.value : "hand" in o ? `hand: ${o.reason}` : `blank: ${o.reason}`);

// ---------------------------------------------------------------- Part A: the executor's new steps (p5/transforms.ts)
const india = { country_code: "91", number: "98000 00000" }, nanp = { country_code: "1", number: "4165550100" };
const T = (t: string, v: unknown, ctx: Parameters<typeof runTransform>[3] = {}) => val(runTransform(t, v, {}, ctx));
const NONE = { nothingRecorded: true };
ok("C7.2 cause 1: phone_part:country_code gives the calling code's digits", T("phone_part:country_code", india) === "91", T("phone_part:country_code", india));
ok("C7.2 cause 1 fail: a phone with no calling code leaves its box blank", /^blank/.test(T("phone_part:country_code", { number: "1" })));
ok("C7.2 cause 1: phone_part:international_number_without_plus gives the number after the code (E1: 9800000001 beside 91)", T("phone_part:international_number_without_plus", india) === "9800000000", T("phone_part:international_number_without_plus", india));
ok("C7.2 cause 1 fail: a North American number never goes in the international box", /^blank/.test(T("phone_part:international_number_without_plus", nanp)));
const sw = (cc: object, not: boolean) => T(`derived:country code of person.telephone_number is ${not ? "not " : ""}1 -> check_code:1/0`, cc);
ok("C7.2 cause 1: the phone switches: Other on for +91, Canada/US off; the reverse for +1", sw(india, true) === "1" && sw(india, false) === "0" && sw(nanp, true) === "0" && sw(nanp, false) === "1", [sw(india, true), sw(india, false), sw(nanp, true), sw(nanp, false)]);
ok("C7.2 cause 1 fail: a phone switch with no calling code goes by hand", /^hand/.test(sw({ number: "1" }, true)));
ok("C7.2 cause 1: number_as_text (CAD, max 12 characters) writes the amount", T("number_as_text (CAD, max 12 characters)", 5000) === "5000" && T("number_as_text (CAD, max 12 characters)", "2500.50") === "2500.50");
ok("C7.2 cause 1 fail: an amount that is not a number, or longer than the box, goes by hand (never truncated)", /^hand/.test(T("number_as_text (CAD, max 12 characters)", "about 5k")) && /^hand/.test(T("number_as_text (CAD, max 12 characters)", "1234567890123")));
const toronto = { street_number: "100", street_name: "Sample Street", city: "Toronto", province: "ON", postal_code: "M5V 0A1", country: "Canada" };
ok("C7.2 cause 1: address_single_line (max 150 characters) writes the address on one line", T("address_single_line (max 150 characters)", toronto) === "100 Sample Street, Toronto, ON M5V 0A1, Canada", T("address_single_line (max 150 characters)", toronto));
ok("C7.2 cause 1 fail: an address longer than the box goes by hand", /^hand/.test(T("address_single_line (max 150 characters)", { ...toronto, street_name: "S".repeat(160) })));
const eq = "derived:person.applying_from_country equals person.current_residence_country -> yes_no_code:Y/N";
ok("C7.2 cause 1: \"equals\": the same country gives Y, another gives N", T(eq, "india", { fact: () => "India" }) === "Y" && T(eq, "india", { fact: () => "nepal" }) === "N");
const home = { street_number: "12", street_name: "Example Road", city: "New Delhi", postal_code: "110001", country: "India" };
const same = "derived:person.residential_address equals person.mailing_address -> yes_no_code:Y/N";
ok("C7.2 cause 1: \"equals\" compares addresses as addresses (key order and letter case aside)", T(same, home, { fact: () => ({ country: "India", city: "NEW DELHI", postal_code: "110001", street_name: "EXAMPLE ROAD", street_number: "12" }) }) === "Y" && T(same, home, { fact: () => ({ ...home, street_number: "14" }) }) === "N");
ok("C7.2 cause 1 fail: \"equals\" with the other fact not confirmed goes by hand", /^hand/.test(T(eq, "india", { fact: () => undefined })));
ok("C7.2 cause 2: date_part:YYYY and date_part:MM read a month-only date (2021-06)", T("date_part:YYYY", "2021-06") === "2021" && T("date_part:MM", "2021-06") === "06" && T("date_part:MM", "2021-06-15") === "06");
ok("C7.2 cause 2 fail: a day or a full date is never made up from a month-only date", /^hand/.test(T("date_part:DD", "2021-06")) && /^hand/.test(T("date:YYYY-MM-DD", "2021-06")) && /^hand/.test(T("date_part:YYYY", "June 2021")));
const alias = "derived:any(person.other_family_name, person.other_given_names) recorded -> yes_no_code:Y/N";
ok("C7.2 cause 3: \"recorded\" gives N for a confirmed nothing, Y for a value", T(alias, null, NONE) === "N" && T(alias, "SINGH") === "Y" && T("derived:any post-secondary education record exists -> yes_no_code:Y/N", null, NONE) === "N");
ok("C7.2 cause 3 fail: an empty value the caller did not vouch for stays blank, never \"N\" (review r1 m3: p5/engine.ts passes undefined)", /^blank/.test(T(alias, null)) && /^blank/.test(T(alias, undefined)));
ok("C7.2 cause 3: any(a, b) reads the other fact too: only a given name used before gives Y", T(alias, null, { ...NONE, fact: (k: string) => (k === "person.other_given_names" ? "RANI" : undefined) }) === "Y");
const card = "derived:valid person.us_green_card_number recorded (not expired) -> yes_no_code:Y/N";
ok("C7.2 cause 3 fail: a recorded US card is never called valid by the executor (its expiry is checked by a person)", T(card, null, NONE) === "N" && /^hand/.test(T(card, "A123456789")));

// markNothingRecorded (engine/runtime/forms.ts): only an answered "nothing applies" (one that fills: declared or
// confirmed, P-411) turns an empty derived box into "N".
const box = (fact: string, transform: string): BoxRow => ({ box: `b.${fact}`, caption: "", fact, meaning: null, about: "p", about_label: "A", row: null, coverage: "client question", detail: "Section", transform });
const q = (fact: string, extra: object = {}) => ({ subjectId: "p", fact, hidden: false, answer: null, rows: [], ...extra });
const sec = (questions: object[], extra: object = {}) => ({ subjectId: "p", section: "s", title: "Personal details", questions, answered: 3, confirmed: 3, invalid: 0, group: null, ...extra });
const mark = (sections: object[], b = box("person.other_family_name", alias)) => markNothingRecorded([b], { sections } as unknown as QuestionnaireView)[0].nothing_recorded === true;
const both = [q("person.other_family_name"), q("person.other_given_names")];
ok("C7.2 cause 3 fail (review r1 B1): an empty \"other names\" in a section confirmed in full is still not an answer", !mark([sec(both)]) && !mark([sec(both, { confirmed: 2 })]));
const edu = box("person.education_institution", "derived:any post-secondary education record exists -> yes_no_code:Y/N");
const group = (none: object | null, rows = 0) => sec([q("person.education_institution")], { title: "Education history", group: { required: false, client: true, rows, none_apply: none } });
ok("C7.2 cause 3: a group whose \"none apply\" is confirmed is nothing recorded", mark([group({ value: true, confirmed: true, fills: true })], edu));
ok("C7.2 cause 3 (P-411, B150): a group whose \"none apply\" is declared and not confirmed yet is nothing recorded too (a declared answer fills at once)", mark([group({ value: true, confirmed: false, fills: true })], edu));
ok("C7.2 cause 3 fail: an entry answered (even unconfirmed), a hidden question, or a fact never asked is not nothing", !mark([sec([q("person.education_institution", { rows: [{ answer: { id: "x" } }] })], { group: { rows: 0, none_apply: { value: true, confirmed: true, fills: true } } })], edu) && !mark([sec([q("person.education_institution", { hidden: true })], { group: { rows: 0, none_apply: { value: true, confirmed: true, fills: true } } })], edu) && !mark([sec([q("person.education_city")], { group: { rows: 0, none_apply: { value: true, confirmed: true, fills: true } } })], edu));
ok("C7.2 cause 3 fail: \"none apply\" not answered, taken back (entries apply), or with entries is not", !mark([group(null)], edu) && !mark([group({ value: false, confirmed: false, fills: true })], edu) && !mark([group({ value: true, confirmed: true, fills: true }, 1)], edu));
ok("C7.2 cause 3 fail: a confirmed fact or a box that is not a \"recorded\" switch is never marked", !mark([group({ value: true, confirmed: true, fills: true })], { ...edu, coverage: "confirmed fact", value: "X" }) && !mark([group({ value: true, confirmed: true, fills: true })], { ...edu, transform: "as_is" }));

// QA-165: a confirmed "No" to the facts' own Yes/No question (their gate) is nothing recorded, as a confirmed "none apply" is.
const GATE = "person.used_other_name";
const gated: GatePlacement[] = [{ fact: "person.other_family_name", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: GATE, value: true }, condition_effect: "REQUIRE" }, { fact: "person.other_given_names", condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: GATE, value: true }, condition_effect: "REQUIRE" }];
const ans = (value: unknown, confirmed: boolean) => ({ answer: { id: "g", value, confirmed, fills: true } });
const gq = (extra: object) => q(GATE, { label: "Have you ever used any other name?", ...extra });
const markG = (sections: object[], pl: GatePlacement[] = gated) => markNothingRecorded([box("person.other_family_name", alias)], { sections } as unknown as QuestionnaireView, pl)[0];
ok("QA-165 pass: other names asked under \"Have you ever used any other name?\", answered No and confirmed, is nothing recorded (the form's Yes/No is N)", markG([sec([gq(ans(false, true)), ...both])]).nothing_recorded === true && /answered No/.test(markG([sec([gq(ans(false, true)), ...both])]).detail ?? ""));
ok("QA-165 pass (P-411, B150): answered No and not confirmed yet (declared), it is nothing recorded too: a declared answer fills at once", markG([sec([gq(ans(false, false)), ...both])]).nothing_recorded === true);
ok("QA-165 fail: the gate answered Yes (confirmed or not), not answered, or hidden is not nothing recorded", [ans(true, true), ans(true, false)].every((a) => markG([sec([gq(a), ...both])]).nothing_recorded !== true) && markG([sec([gq({}), ...both])]).nothing_recorded !== true && markG([sec([gq({ ...ans(false, true), hidden: true }), ...both])]).nothing_recorded !== true);
ok("QA-165 fail: a name answered after a No, or a fact with no gate, is never nothing recorded", markG([sec([gq(ans(false, true)), q("person.other_family_name", { answer: { id: "n" } }), q("person.other_given_names")])]).nothing_recorded !== true && markG([sec([gq(ans(false, true)), ...both])], [gated[0]]).nothing_recorded !== true);
ok("QA-165: gateOf reads only \"<gate> is Yes\" conditions that require or show the fact", gateOf(gated, "person.other_family_name") === GATE && gateOf([{ fact: "x", condition: { op: "eq", field: GATE, value: false }, condition_effect: "REQUIRE" }], "x") === null && gateOf([{ fact: "x", condition: { op: "exists", field: GATE }, condition_effect: "REQUIRE" }], "x") === null && gateOf([{ fact: "x", condition: { op: "eq", field: GATE, value: true }, condition_effect: "OPTIONAL" }], "x") === null);

// ---------------------------------------------------------------- Part B: the Sample family's case, end to end
type Opt = { key: string; label?: string };
type Q = { subjectId: string; fact: string; options: Opt[] | null; answer: { id: string } | null; rows: { row: string; answer: { id: string } | null }[] };
type Sec = { subjectId: string; section: string; group: { none_apply?: { id: string } | null } | null; questions: Q[] };
type Box = { box: string; fact: string | null; result: string; why: string | null; nothing_recorded?: true };

(async () => {
  if (!sql(`select count(*) from combination where combination_key = 'vv.single'`).startsWith("1"))
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" });
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv) { console.error("STOP  setup_visitor_visa.ts did not release the Visitor visa"); process.exit(2); }
  const family = (person: string): Record<string, unknown> => JSON.parse(sql(`select coalesce(json_object_agg(f.canonical_field_key, f.value), '{}') from sample_fact f join sample_profile p on p.id = f.profile_id where p.profile_key = 'client-a-family' and f.person_id = '${person}' and f.row is null`) || "{}");
  const rowsOf = (fact: string): Record<number, unknown> => Object.fromEntries(JSON.parse(sql(`select coalesce(json_agg(json_build_array(f.row, f.value)), '[]') from sample_fact f join sample_profile p on p.id = f.profile_id where p.profile_key = 'client-a-family' and f.person_id = 'principal' and f.canonical_field_key = '${fact}' and f.row is not null`) || "[]"));
  const A = family("principal"), S = family("spouse_or_partner"), C = family("case");
  const made = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C72-${run}`, clientActor: CLIENT, principal: { displayName: `${A["person.given_names"]} ${A["person.family_name"]} (Sample)` } }, OFFICER);
  ok("setup: a Visitor visa case opens for the Sample family", made.status === 201, made.status);
  const caseId: string = made.body.id;
  const P: string = made.body.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const K: string = made.body.people.find((p: { role: string }) => p.role === "case").subject_id;
  const SP: string = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Partner (Sample)" }, OFFICER)).body.subject_id;
  const view = async (): Promise<Sec[]> => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body.sections;
  const failed: unknown[] = [];
  const put = async (subject: string, fact: string, value: unknown, row?: string) => {
    if (value === undefined) return;
    const q = (await view()).flatMap((s) => s.questions).find((x) => x.subjectId === subject && x.fact === fact);
    const v = typeof value === "string" && q?.options?.length ? q.options.find((o) => o.key.toLowerCase() === value.toLowerCase() || String(o.label ?? "").toLowerCase() === value.toLowerCase())?.key ?? value : value;
    const expectedId = row ? q?.rows.find((r) => r.row === row)?.answer?.id ?? null : q?.answer?.id ?? null;
    const r = await call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value: v, expectedId, ...(row ? { row } : {}) }, OFFICER);
    if (r.status !== 200 || r.body?.answer?.problems?.length) failed.push({ fact, status: r.status, problems: r.body?.answer?.problems });
  };
  const newRow = async (subject: string, g: string) => (await call("POST", `/runtime/cases/${caseId}/groups/${subject}/rows`, { group: g }, OFFICER)).body.row as string;
  const none = async (subject: string, section: string) => { const s = (await view()).find((x) => x.subjectId === subject && x.section === section); await call("PUT", `/runtime/cases/${caseId}/groups/${subject}/${section}/none-apply`, { noneApply: true, expectedId: s?.group?.none_apply?.id ?? null }, OFFICER); };
  // C6.18 (P-244): background answers the officer entered here wait for the client, who re-confirms each before the
  // officer confirms the sections (as a person does on the client questionnaire).
  const reconfirm = async () => { for (const s of await view()) for (const q of s.questions) for (const a of [q.answer, ...q.rows.map((r) => r.answer)] as ({ id: string; awaits_client?: boolean } | null)[]) if (a?.awaits_client) await call("POST", `/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, {}, CLIENT); };
  const confirmAll = async () => { await reconfirm(); for (const s of await view()) { const seen = [...s.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean); if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: s.subjectId, seen }, OFFICER); } };
  const generate = async (n: number) => {
    const g = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `c72-${run}-${n}` }, OFFICER);
    const copy: string = g.body?.id;
    await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status), 120_000);
    const meta = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body;
    const boxes = JSON.parse(sql(`select coalesce(result_json->'boxes', '[]')::text from form_instance where id = '${copy}'`) || "[]") as Box[];
    const path = sql(`select path from form_instance where id = '${copy}'`);
    const values = path ? (JSON.parse(readFileSync(join(STUDIO, "..", "..", "..", "..", path.replace(/\.pdf$/, ".request.json")), "utf8")).values as Record<string, string>) : {};
    return { status: meta?.status, intact: meta?.intact, boxes, values, byBox: new Map(boxes.map((b) => [b.box, b])) };
  };

  // The case and the principal: the Sample family's facts, the Sample additions #409's make_case.ts used.
  await put(K, "case.service_language", C["case.service_language"] ?? "English"); await put(K, "case.visa_type_requested", "VisitorVisa"); await put(K, "relationship.start_date", "2015-06-01");
  for (const [f, v] of [["case.visit_purpose", "Family Visit"], ["case.intended_stay_from", "2027-06-01"], ["case.intended_stay_to", "2027-08-31"], ["case.funds_available_cad", "5000"]] as const) await put(K, f, v);
  const visit = await newRow(K, "your_visit");
  for (const [f, v] of [["case.visit_contact_name", "SAMPLE HOST"], ["case.visit_contact_relationship", "FRIEND"], ["case.visit_contact_address_in_canada", { street_number: "100", street_name: "Sample Street", city: "Toronto", province: "ON", postal_code: "M5V 0A1", country: "Canada" }]] as const) await put(K, f, v, visit);
  const phone = (A["person.phone_number"] as { country_code: string; number: string }[] | undefined)?.[0] ?? { country_code: "91", number: "9800000000" };
  const same = (k: string) => [k, A[k]] as [string, unknown];
  for (const [f, v] of [
    ...["person.family_name", "person.given_names", "person.date_of_birth", "person.marital_status", "person.native_language", "person.official_language_ability", "person.preferred_official_language", "person.language_test_taken", "person.mailing_address", "person.residential_address", "person.current_residence_country", "person.disorder_requiring_services", "person.status_violation_canada", "person.refused_visa_or_entry", "person.criminal_history", "person.military_service", "person.violent_organisation_association", "person.has_children"].map(same),
    ["person.telephone_type", A["person.phone_type"]], ["person.telephone_number", { country_code: phone.country_code, number: phone.number }], ["person.email", A["person.email_address"]],
    ["person.applying_from_country", A["person.current_residence_country"]], ["relationship.previously_married_or_common_law", A["person.previous_marriage_or_common_law"]],
    ["person.sex", "Male"], ["person.place_of_birth_city", "NEW DELHI"], ["person.country_of_birth", "India"], ["person.citizenship", "India"],
    ["person.passport_number", "Z1234567"], ["person.passport_country_of_issue", "India"], ["person.passport_issue_date", "2019-05-10"], ["person.passport_expiry_date", "2029-05-09"],
    ["person.current_residence_status", "citizen"], ["person.current_residence_status_from", A["person.date_of_birth"]], ["person.previously_applied_to_canada", false],
  ] as [string, unknown][]) await put(P, f, v);
  const acts = rowsOf("person.employment_activity"), emps = rowsOf("person.employment_employer_name"), froms = rowsOf("person.employment_from_date"), tos = rowsOf("person.employment_to_date"), locs = rowsOf("person.employment_location") as Record<number, { city: string; country: string }>;
  const current = new Date().toISOString().slice(0, 7); // the current job needs an end month today (#409's product finding)
  const order = Object.keys(acts).map(Number).sort((a, b) => a - b);
  for (const i of order) {
    const row = await newRow(P, "employment_history");
    await put(P, "person.employment_activity", acts[i], row); await put(P, "person.employment_employer_name", emps[i], row);
    await put(P, "person.employment_from_date", String(froms[i]).slice(0, 7), row); await put(P, "person.employment_to_date", tos[i] ? String(tos[i]).slice(0, 7) : current, row);
    await put(P, "person.occupation_city", locs[i]?.city, row); await put(P, "person.occupation_country", locs[i]?.country, row);
  }
  await put(P, "person.occupation", acts[order[0]]);
  await put(SP, "person.family_name", S["person.family_name"]); await put(SP, "person.given_names", S["person.given_names"]);
  ok("setup: every Sample answer is accepted", failed.length === 0, failed);

  const DERIVED = ["Page1[0].PersonalDetails[0].PCRIndicator[0]", "Page3[0].Education[0].EducationIndicator[0]"].map((p) => `form1[0].${p}`);
  const NOT_ASKED = ["Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", "Page2[0].natID[0].q1[0].natIDIndicator[0]", "Page2[0].USCard[0].q1[0].usCardIndicator[0]"].map((p) => `form1[0].${p}`);
  // Fail guard first: "none apply" not answered yet: the derived switches are never written.
  const before = await generate(1);
  ok("C7.2 cause 3 fail: before anyone answers \"none apply\", the lived-elsewhere and education Yes/No boxes stay \"not written\"", before.status === "GENERATED" && DERIVED.every((b) => before.byBox.get(b)?.result === "not written"), DERIVED.map((b) => before.byBox.get(b)?.result));

  await none(P, "education_history"); await none(P, "previous_countries_of_residence");
  await confirmAll();
  const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body.forms as { form: string; subject_id: string; readiness: { ready: boolean; missing: unknown[] } }[];
  const f = forms.find((x) => x.form === "IMM 5257" && x.subject_id === P);
  ok("setup: the Sample family's IMM 5257 is ready to file", f?.readiness?.ready === true, f?.readiness?.missing);
  const after = await generate(2);
  ok("C7.2: the copy is generated and passes the filler's own checks (read back, signatures, unchanged parts)", after.status === "GENERATED" && after.intact === true, { status: after.status, intact: after.intact });

  const inv = JSON.parse(readFileSync(join(STUDIO, "..", "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: { data_path?: string; required?: boolean }[] };
  const mandatory = inv.fields.filter((x) => x.required && x.data_path).map((x) => x.data_path!);
  const empty = mandatory.filter((p) => !after.values[p]);
  const NOT_A_FACT = ["Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]", "Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]", "Page3[0].Signature[0].Consent0[0].Choice[0]"].map((p) => `form1[0].${p}`);
  ok("C7.2: before the Yes/No questions are answered, the app's copy fills 40 of IMM 5257's 46 mandatory form fields (was 32, #409); the 6 left are exactly the 3 boxes published as \"not a fact\" and the 3 Yes/No boxes whose own question is not answered yet",
    mandatory.length === 46 && empty.length === 6 && empty.every((p) => NOT_A_FACT.includes(p) || NOT_ASKED.includes(p)), { mandatory: mandatory.length, filled: mandatory.length - empty.length, empty });
  // QA-165 part 2 (P-237, P-238): before the file is offered, the form lists exactly the mandatory fields a copy leaves empty, each with why.
  {
    const f = ((await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body.forms as { form: string; subject_id: string; fields_open: { box: string; label: string; reason: string; why: string }[] }[]).find((x) => x.form === "IMM 5257" && x.subject_id === P);
    const open = f?.fields_open ?? [];
    ok("QA-165 part 2: IMM 5257 lists exactly the 6 mandatory form fields its copy leaves empty, before the file is offered", open.length === empty.length && open.every((o) => empty.includes(o.box)), { open: open.map((o) => o.box), empty });
    const reasonOf = new Map(open.map((o) => [o.box, o.reason]));
    // QA-165: each of the 3 Yes/No boxes now has its own question (IMM 5257's words), so it "needs an answer" and names it.
    const whyOf = new Map(open.map((o) => [o.box, o.why]));
    ok("QA-165 part 2: the 3 boxes published as \"not a fact\" say \"fill it in Adobe\"; the 3 Yes/No boxes say \"needs an answer\", naming their own question",
      NOT_A_FACT.every((p) => reasonOf.get(p) === "fill it in Adobe") && NOT_ASKED.every((p) => reasonOf.get(p) === "needs an answer" && /^answer "/.test(whyOf.get(p) ?? "")), open.map((o) => [o.box.split(".").slice(-2).join("."), o.reason, o.why]));
    ok("QA-165 part 2: the words are the form's, never a field path", open.every((o) => o.label.length > 3 && !/form1\[|\[0\]\./.test(o.label)), open.map((o) => o.label));
  }
  ok("C7.2: no form field of the copy is left by hand (was 20, #409)", after.boxes.filter((b) => b.result === "by hand").length === 0, after.boxes.filter((b) => b.result === "by hand").map((b) => `${b.box.split(".").slice(-2).join(".")}: ${b.why}`));
  const at = (p: string) => after.values[`form1[0].${p}`];
  const phoneBoxes = "Page2[0].ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0]";
  ok("C7.2 cause 1: as E1 wrote them: phone code 91, the number after it, Other on; funds 5000; the address in Canada on one line; same country and same address Y",
    at(`${phoneBoxes}.NumberCountry[0]`) === "91" && at(`${phoneBoxes}.IntlNumber[0].IntlNumber[0]`) === String(phone.number).replace(/\D/g, "") && at(`${phoneBoxes}.Other[0]`) === "1"
    && at("Page3[0].DetailsOfVisit[0].PurposeRow1[0].Funds[0].Funds[0]") === "5000" && /^100 Sample Street, Toronto, ON M5V 0A1/i.test(at("Page3[0].DetailsOfVisit[0].Contacts_Row1[0].AddressInCanada[0].AddressInCanada[0]") ?? "")
    && at("Page1[0].PersonalDetails[0].SameAsCORIndicator[0]") === "Y" && at("Page2[0].ContactInformation[0].contact[0].SameAsMailingIndicator[0]") === "Y",
    Object.fromEntries(Object.entries(after.values).filter(([k]) => /Phone\[0\]\.(NumberCountry|IntlNumber|Other)|Funds|AddressInCanada|SameAs/.test(k)).map(([k, v]) => [k.split(".").slice(-2).join("."), v])));
  const dates = Object.entries(after.values).filter(([k]) => /Occupation\[0\]\.OccupationRow\d\[0\]\.(From|To)(Year|Month)\[0\]$/.test(k));
  ok("C7.2 cause 2: the 12 year and month boxes of the three job rows are written from month-only dates", dates.length === 12 && dates.every(([k, v]) => (/Year/.test(k) ? /^\d{4}$/ : /^\d{2}$/).test(v)), Object.fromEntries(dates.map(([k, v]) => [k.split(".").slice(-2).join("."), v])));
  ok("C7.2 cause 3: lived elsewhere and education are written \"N\" once \"none apply\" is confirmed, with that as the reason and the copy's own flag", DERIVED.every((b) => after.values[b] === "N" && /none apply/.test(after.byBox.get(b)?.why ?? "") && after.byBox.get(b)?.nothing_recorded === true), DERIVED.map((b) => [after.values[b], after.byBox.get(b)?.why]));
  ok("C7.2 cause 3 fail (review of #428 m3): no box written from a confirmed fact carries the nothing-recorded flag", after.boxes.filter((b) => b.nothing_recorded).every((b) => DERIVED.includes(b.box)), after.boxes.filter((b) => b.nothing_recorded).map((b) => b.box));
  ok("C7.2 cause 3 fail (review r1 B1): other names, national identity document and US card are never \"N\" from an empty question in a confirmed section", NOT_ASKED.every((b) => after.byBox.get(b)?.result === "not written" && !after.values[b]), NOT_ASKED.map((b) => after.byBox.get(b)?.result));
  // QA-165 (C7.2, P-62): the Sample principal answers IMM 5257's own three Yes/No questions "No" and the officer confirms:
  // the copy then writes those boxes "N" and fills 43 of 46; the 3 left are the boxes published as "not a fact".
  const GATES = ["person.used_other_name", "person.has_national_id", "person.us_lawful_permanent_resident"];
  { // P-62: every question asked fills a box or decides something: each gate fills its Yes/No box on IMM 5257.
    const qs = (await view()).flatMap((s) => s.questions as unknown as { subjectId: string; fact: string; fills: { form: string; boxes: number }[] }[]).filter((x) => x.subjectId === P);
    ok("QA-165 pass: each of the 3 Yes/No questions is asked and says it fills IMM 5257 (1 form field)", GATES.every((g) => qs.find((x) => x.fact === g)?.fills.some((f) => f.form === "IMM 5257" && f.boxes === 1)), GATES.map((g) => qs.find((x) => x.fact === g)?.fills));
  }
  for (const g of GATES) await put(P, g, false);
  const unconfirmed = await generate(3);
  ok("QA-165 pass (P-411, B150): answered No and not confirmed yet (declared), the 3 Yes/No boxes are written \"N\" at once", NOT_ASKED.every((b) => unconfirmed.values[b] === "N" && unconfirmed.byBox.get(b)?.nothing_recorded === true), NOT_ASKED.map((b) => unconfirmed.byBox.get(b)?.result));
  await confirmAll();
  const gatedCopy = await generate(4);
  ok("QA-165 pass: other names, national identity document and US card are written \"N\" from their own question answered No and confirmed, with that as the reason", NOT_ASKED.every((b) => gatedCopy.values[b] === "N" && /answered No/.test(gatedCopy.byBox.get(b)?.why ?? "") && gatedCopy.byBox.get(b)?.nothing_recorded === true), NOT_ASKED.map((b) => [gatedCopy.values[b], gatedCopy.byBox.get(b)?.why]));
  const empty2 = mandatory.filter((p) => !gatedCopy.values[p]);
  ok("QA-165 pass: the app's copy now fills 43 of IMM 5257's 46 mandatory form fields; the 3 left are exactly the boxes published as \"not a fact\" (fill in Adobe)", empty2.length === 3 && empty2.every((p) => NOT_A_FACT.includes(p)), { filled: mandatory.length - empty2.length, empty: empty2 });
  {
    const f = ((await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body.forms as { form: string; subject_id: string; fields_open: { box: string; reason: string }[]; readiness: { ready: boolean } }[]).find((x) => x.form === "IMM 5257" && x.subject_id === P);
    ok("QA-165 part 2: the list before the file is offered now names only those 3, and the form is still ready to file", (f?.fields_open ?? []).length === 3 && (f?.fields_open ?? []).every((o) => NOT_A_FACT.includes(o.box)) && f?.readiness?.ready === true, f?.fields_open);
  }
  // Devin on #715 (1): the gate's answer is kept with the copy: changing it after the copy makes that copy out of date.
  const nCopy = sql(`select id from form_instance where case_id = '${caseId}' order by created_at desc limit 1`);
  ok("QA-165 fail guard: the copy that wrote N is current while nothing changed", (await call("GET", `/runtime/form-copies/${nCopy}`, undefined, OFFICER)).body?.out_of_date === false);
  await put(P, "person.used_other_name", true); await confirmAll();
  const flipped = (await call("GET", `/runtime/form-copies/${nCopy}`, undefined, OFFICER)).body;
  ok("QA-165 pass (Devin on #715): \"other names\" changed from No to Yes after the copy makes the copy that says N out of date, naming the question", flipped?.out_of_date === true && (flipped?.changed ?? []).some((c: string) => /used_other_name|other name/i.test(c)), { out_of_date: flipped?.out_of_date, changed: flipped?.changed });
  const yes = await generate(5);
  ok("QA-165 fail: after a Yes to \"other names\" with no name given, its box is never \"N\" (Yes needs the names)", !yes.values[NOT_ASKED[0]] && yes.values[NOT_ASKED[1]] === "N", [yes.values[NOT_ASKED[0]], yes.byBox.get(NOT_ASKED[0])?.result]);
  // Devin on #715 (2): a confirmed No to "national identity document" while a number is still recorded contradicts
  // itself: the Yes/No box is never written (neither Y from the number nor N from the No), and the open list says why.
  await put(P, "person.national_id_number", "SAMPLEID1"); await confirmAll();
  const clash = await generate(6);
  const clashOpen = (((await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body.forms as { form: string; subject_id: string; fields_open: { box: string; reason: string; why: string }[] }[]).find((x) => x.form === "IMM 5257" && x.subject_id === P)?.fields_open ?? []).find((o) => o.box === NOT_ASKED[1]);
  ok("QA-165 fail (Devin on #715): No to a national identity document with a number recorded writes neither Y nor N; the list before the file says to correct one", !clash.values[NOT_ASKED[1]] && clashOpen?.reason === "needs an answer" && /answered No, but .* is recorded: correct one/.test(clashOpen?.why ?? ""), { value: clash.values[NOT_ASKED[1]], open: clashOpen });
  // Review r1 M2: a fact behind an "N" answered after the copy makes that copy out of date (here: an education entry).
  const copyId = sql(`select id from form_instance where case_id = '${caseId}' order by created_at desc limit 1`);
  const fresh = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
  // An entry needs "none apply" taken back first (the API refuses a row while it stands): either step dates the copy.
  const eduSec = (await view()).find((x) => x.subjectId === P && x.section === "education_history");
  const undo = await call("PUT", `/runtime/cases/${caseId}/groups/${P}/education_history/none-apply`, { noneApply: false, expectedId: eduSec?.group?.none_apply?.id ?? null }, OFFICER);
  const withdrawn = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
  ok("C7.2 cause 3 fail (review of #414 m2): \"none apply\" taken back alone already makes the copy that says \"N\" out of date", undo.status < 300 && withdrawn?.out_of_date === true, { undo: undo.status, out_of_date: withdrawn?.out_of_date, changed: withdrawn?.changed });
  const row = await newRow(P, "education_history");
  failed.length = 0; await put(P, "person.education_institution", "SAMPLE UNIVERSITY", row);
  const later = (await call("GET", `/runtime/form-copies/${copyId}`, undefined, OFFICER)).body;
  ok("C7.2 cause 3 fail (review r1 M2): \"none apply\" taken back and an education entry added after the copy (unconfirmed) make the copy that says \"N\" out of date",
    undo.status < 300 && !!row && failed.length === 0 && fresh?.out_of_date === false && later?.out_of_date === true, { undo: undo.status, row, failed, before: fresh?.out_of_date, after: later?.out_of_date, changed: later?.changed });
  process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
})().catch((e) => { console.error(e); process.exit(2); });
