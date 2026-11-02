// C7.2 evidence, J6.4 steps 1–2 (evidence lane, Mac): opens a Visitor visa case for the Sample family (profile
// client-a-family, the made-up Client A and partner) in an isolated copy, answers and confirms every fact IMM 5257
// reads for the principal through the endpoints the screens call, generates the copy through the shared filler
// (api/src/fill.ts → p5/fill.py) and saves it with its written values in E1's format for barcode_compare.py.
// Facts the Sample family holds are taken from it; the others (passport, visit, sex, place of birth) are added here
// and are Sample too (made up; never submit). No model call (US$0). Never the :4400 demo.
//   zsh studio/tools/isolated.sh c72 4425 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4425 xr_studio_c72
//   tsx studio/evidence/c7-2-adobe-validate/make_case.ts 4425 xr_studio_c72 <out-dir outside the repository>
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { client } from "../../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4425), DB = process.argv[3] ?? "xr_studio_c72", OUT = process.argv[4];
if (!OUT) { console.error("usage: make_case.ts <port> <db> <out-dir>"); process.exit(2); }
const { call, sql, until } = client(PORT, DB);
const OFFICER = "user-O", CLIENT = "user-P";
/** The current activity has no end; the questionnaire requires an end date on every row (finding in the PR), so the
 *  current row ends in the month the copy is made. */
const CURRENT_TO = new Date().toISOString().slice(0, 7);
type Opt = { key: string; label?: string };
type Q = { subjectId: string; fact: string; options: Opt[] | null; group: string | null; answer: { id: string } | null; rows: { row: string; answer: { id: string } | null }[] };
type Sec = { subjectId: string; section: string; group: { none_apply?: { id: string } | null } | null; questions: Q[] };

/** Sample family facts (sample_fact, profile client-a-family) for a person of the profile. */
const family = (person: string): Record<string, unknown> => {
  const rows = sql(`select coalesce(json_object_agg(f.canonical_field_key, f.value), '{}') from sample_fact f join sample_profile p on p.id = f.profile_id where p.profile_key = 'client-a-family' and f.person_id = '${person}' and f.row is null`);
  return JSON.parse(rows || "{}");
};
const familyRows = (person: string, fact: string): unknown[] => JSON.parse(sql(`select coalesce(json_agg(f.value order by f.row), '[]') from sample_fact f join sample_profile p on p.id = f.profile_id where p.profile_key = 'client-a-family' and f.person_id = '${person}' and f.canonical_field_key = '${fact}' and f.row is not null`) || "[]");

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  const A = family("principal"), S = family("spouse_or_partner"), C = family("case");
  const c = (await call("POST", "/runtime/cases", { combinationId: vv, reference: `C72-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: `${A["person.given_names"]} ${A["person.family_name"]} (Sample)` } }, OFFICER)).body;
  const caseId: string = c.id;
  const P: string = c.people.find((p: { role: string }) => p.role === "principal").subject_id;
  const K: string = c.people.find((p: { role: string }) => p.role === "case").subject_id;
  const SP: string = (await call("POST", `/runtime/cases/${caseId}/people`, { role: "spouse_or_partner", displayName: "Partner (Sample)" }, OFFICER)).body.subject_id;
  const view = async (): Promise<Sec[]> => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body.sections;
  const find = (v: Sec[], subject: string, fact: string) => v.flatMap((s) => s.questions).find((q) => q.subjectId === subject && q.fact === fact);
  /** An option key by its key or label (the form's own lists differ per question). */
  const pick = (q: Q | undefined, want: string) => q?.options?.find((o) => o.key.toLowerCase() === want.toLowerCase() || String(o.label ?? "").toLowerCase() === want.toLowerCase())?.key ?? want;
  const failed: unknown[] = [];
  const put = async (subject: string, fact: string, value: unknown, row?: string) => {
    const q = find(await view(), subject, fact);
    const v = typeof value === "string" && q?.options?.length ? pick(q, value) : value;
    const expectedId = row ? q?.rows.find((r) => r.row === row)?.answer?.id ?? null : q?.answer?.id ?? null;
    const r = await call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value: v, expectedId, ...(row ? { row } : {}) }, OFFICER);
    if (r.status !== 200 || r.body?.answer?.problems?.length) failed.push({ fact, status: r.status, problems: r.body?.answer?.problems, detail: r.body?.detail });
  };
  const newRow = async (subject: string, group: string) => (await call("POST", `/runtime/cases/${caseId}/groups/${subject}/rows`, { group }, OFFICER)).body.row as string;
  const none = async (subject: string, section: string) => { const s = (await view()).find((x) => x.subjectId === subject && x.section === section); await call("PUT", `/runtime/cases/${caseId}/groups/${subject}/${section}/none-apply`, { noneApply: true, expectedId: s?.group?.none_apply?.id ?? null }, OFFICER); };

  // The case (asked once for the application).
  await put(K, "case.service_language", C["case.service_language"] ?? "English");
  await put(K, "case.visa_type_requested", "VisitorVisa");
  await put(K, "relationship.start_date", "2015-06-01"); // Sample family: cohabitation start
  for (const [f, v] of [["case.visit_purpose", "Family Visit"], ["case.intended_stay_from", "2027-06-01"], ["case.intended_stay_to", "2027-08-31"], ["case.funds_available_cad", "5000"]] as const) await put(K, f, v);
  const visit = await newRow(K, "your_visit"); // the people to visit repeat; the visit's own facts are asked once
  for (const [f, v] of [["case.visit_contact_name", "SAMPLE HOST"], ["case.visit_contact_relationship", "FRIEND"],
    ["case.visit_contact_address_in_canada", { street_number: "100", street_name: "Sample Street", city: "Toronto", province: "ON", postal_code: "M5V 0A1", country: "Canada" }]] as const) await put(K, f, v, visit);

  // The principal: Sample family facts first, then the Sample additions.
  const phone = (A["person.phone_number"] as { country_code: string; number: string }[] | undefined)?.[0] ?? { country_code: "91", number: "9800000000" };
  for (const [f, v] of [
    ["person.family_name", A["person.family_name"]], ["person.given_names", A["person.given_names"]], ["person.date_of_birth", A["person.date_of_birth"]],
    ["person.marital_status", A["person.marital_status"]], ["person.native_language", A["person.native_language"]],
    ["person.official_language_ability", A["person.official_language_ability"]], ["person.preferred_official_language", A["person.preferred_official_language"]],
    ["person.language_test_taken", A["person.language_test_taken"]], ["person.mailing_address", A["person.mailing_address"]], ["person.residential_address", A["person.residential_address"]],
    ["person.telephone_type", A["person.phone_type"]], ["person.telephone_number", { country_code: phone.country_code, number: phone.number }], ["person.email", A["person.email_address"]],
    ["person.current_residence_country", A["person.current_residence_country"]], ["person.applying_from_country", A["person.current_residence_country"]],
    ["relationship.previously_married_or_common_law", A["person.previous_marriage_or_common_law"]],
    ["person.disorder_requiring_services", A["person.disorder_requiring_services"]], ["person.status_violation_canada", A["person.status_violation_canada"]],
    ["person.refused_visa_or_entry", A["person.refused_visa_or_entry"]], ["person.criminal_history", A["person.criminal_history"]],
    ["person.military_service", A["person.military_service"]], ["person.violent_organisation_association", A["person.violent_organisation_association"]],
    ["person.has_children", A["person.has_children"]],
    // Sample additions (not in the Sample family record).
    ["person.sex", "Male"], ["person.place_of_birth_city", "NEW DELHI"], ["person.country_of_birth", "India"], ["person.citizenship", "India"],
    ["person.passport_number", "Z1234567"], ["person.passport_country_of_issue", "India"], ["person.passport_issue_date", "2019-05-10"], ["person.passport_expiry_date", "2029-05-09"],
    ["person.current_residence_status", "citizen"], ["person.current_residence_status_from", A["person.date_of_birth"]], ["person.previously_applied_to_canada", false],
  ] as [string, unknown][]) if (v !== undefined) await put(P, f, v);
  const acts = familyRows("principal", "person.employment_activity"), emps = familyRows("principal", "person.employment_employer_name");
  const froms = familyRows("principal", "person.employment_from_date"), locs = familyRows("principal", "person.employment_location") as { city: string; country: string }[];
  const tos: Record<number, string> = Object.fromEntries(JSON.parse(sql(`select coalesce(json_agg(json_build_array(f.row, f.value)), '[]') from sample_fact f join sample_profile p on p.id = f.profile_id where p.profile_key = 'client-a-family' and f.person_id = 'principal' and f.canonical_field_key = 'person.employment_to_date'`) || "[]"));
  for (let i = 0; i < acts.length; i++) {
    const row = await newRow(P, "employment_history");
    await put(P, "person.employment_activity", acts[i], row); await put(P, "person.employment_employer_name", emps[i], row);
    await put(P, "person.employment_from_date", String(froms[i]).slice(0, 7), row); await put(P, "person.employment_to_date", tos[i] ? String(tos[i]).slice(0, 7) : CURRENT_TO, row);
    await put(P, "person.occupation_city", locs[i]?.city, row); await put(P, "person.occupation_country", locs[i]?.country, row);
  }
  await put(P, "person.occupation", acts[0]);
  await none(P, "education_history"); await none(P, "previous_countries_of_residence");

  // The partner (the married applicant's spouse boxes on IMM 5257).
  await put(SP, "person.family_name", S["person.family_name"]); await put(SP, "person.given_names", S["person.given_names"]);

  // Confirm every section the officer has seen, for each person.
  const v = await view();
  for (const s of v) {
    const seen = [...s.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean);
    if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: s.subjectId, seen }, OFFICER);
  }
  const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body.forms;
  const f = forms.find((x: { form: string; subject_id: string }) => x.form === "IMM 5257" && x.subject_id === P);
  console.log(JSON.stringify({ caseId, failed, readiness: f?.readiness, draft: f?.draft }, null, 1));
  if (!f?.readiness?.ready) { console.error("STOP  IMM 5257 is not ready to file"); process.exit(1); }

  // J6.4 step 1: Generate copy; step 2: download it.
  const g = await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `c72-${Date.now()}` }, OFFICER);
  const copy: string = g.body?.id;
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status), 120_000);
  const meta = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body;
  const dl = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copy}/file?original=1`, { headers: { "x-actor": OFFICER } });
  const pdf = Buffer.from(await dl.arrayBuffer());
  const name = /filename="([^"]+)"/.exec(dl.headers.get("content-disposition") ?? "")?.[1] ?? `IMM5257-copy-${copy}.pdf`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), pdf);
  const result = JSON.parse(sql(`select result_json from form_instance where id = '${copy}'`) || "{}");
  writeFileSync(join(OUT, "copy-result.json"), JSON.stringify(result, null, 1));
  // E1's values format is what fill.ts handed the shared filler ({ values: { <box path>: <value> } }), kept beside the
  // copy as <copy>.request.json; its fill report sits beside it too.
  const stored = join(import.meta.dirname, "..", "..", "..", "..", "..", "..", sql(`select path from form_instance where id = '${copy}'`));
  const request = JSON.parse(readFileSync(stored.replace(/\.pdf$/, ".request.json"), "utf8"));
  writeFileSync(join(OUT, "values.json"), JSON.stringify({ values: request.values }, null, 1));
  copyFileSync(stored.replace(/\.pdf$/, ".report.json"), join(OUT, "fill-report.json"));
  console.log(JSON.stringify({ copy, status: meta.status, counts: meta.counts, intact: meta.intact, file: join(OUT, name), sha256: createHash("sha256").update(pdf).digest("hex"), written: Object.keys(request.values).length }, null, 1));
})().catch((e) => { console.error(e); process.exit(2); });
