// R1a setup (runtime lane, plan §4): configures and releases Individual › Visitors › Visitor visa in an isolated copy
// through the endpoints the screens call, acting as the simulated people. Scaffolding (P-33): it stands in for a person
// on the screens; every step is a product capability. No model call (US$0): IMM 5257 is drafted by replaying the saved
// real run of 21 Oct. Every value below (question text, lists, conditions) is Sample until the immigration expert
// confirms it.
//   zsh studio/tools/isolated.sh runtime_r1 4430 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4430 xr_studio_runtime_r1
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normLabel } from "../../engine/twin.ts";
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4430), DB = process.argv[3] ?? "xr_studio_runtime_r1";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const PROTOTYPE = join(import.meta.dirname, "..", "..", "..");
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";

/** The 21 Oct decisions where the person did not follow the shown recommendation (slice-1 README). */
const CHANGED: Record<string, string> = { "person.occupation_title": "person.employment_activity", "person.immigration_history_details": "person.immigration_history_details" };

/** Answer lists typed from the form's own drop-down lists. IRCC uses a different list on different questions (the
 *  citizenship list has 208 entries, the country-of-birth list 262), so each form list becomes its own answer list and a
 *  choice field takes the list of the IMM 5257 boxes it fills. Names and labels Sample. */
const LIST_NAMES: Record<string, { key: string; label: string }> = {
  CountryOfBirthList: { key: "country", label: "Country or territory" },
  CountryOfCitizenshipList: { key: "country_citizenship", label: "Country of citizenship" },
  CountryOfLastPermanentResidentList: { key: "country_residence", label: "Country or territory of residence" },
  CountryTravelDocumentList: { key: "country_travel_document", label: "Country or territory that issued a travel document" },
  ImmigrationStatusList: { key: "immigration_status", label: "Immigration status in a country" },
  MaritalStatusList: { key: "marital_status", label: "Marital status" },
  GenderMelList: { key: "sex", label: "Sex" },
  ContactLanguageList: { key: "language", label: "Language" },
  PreferenceLanguageList: { key: "official_language", label: "Official language of Canada" },
  AbleCommunicateEnglishOrFrenchList: { key: "official_language_ability", label: "Ability in English or French" },
  PhoneTypeTRVList: { key: "phone_type", label: "Telephone type" },
  VisitPurposeList: { key: "visit_purpose", label: "Purpose of visit" },
  ProvinceAbbrevList: { key: "province_ca", label: "Province or territory of Canada" },
};
/** Fields read by a box with no choices of its own (IMM 5707's country-of-birth text boxes; IMM 5257's derived yes/no
 *  boxes "lived elsewhere?" and "applying from the same country?"). The forms validator asks every such box for an option
 *  map, which a text box cannot take (build-notes, finding for the forms lane), so until that is fixed these fields keep
 *  no list and fill by label as before. */
const NO_LIST_YET = new Set(["person.country_of_birth", "person.previous_residence_country", "person.applying_from_country"]);
/** "AFG (Afghanistan)" → "Afghanistan": the travel-document list writes a code before the name. */
const plainLabel = (l: string) => (/^[A-Z]{3} \((.*)\)$/.exec(l.trim())?.[1] ?? l).trim();

const NEW_SECTIONS = [{ title: "Your visit", meaning: "Why, when and with whom the visit to Canada takes place." }, { title: "Previous countries of residence", meaning: "Countries the person lived in during the past five years, other than the current one." }];
const VISIT = "your_visit", PREVIOUS = "previous_countries_of_residence";

/** A follow-up ("describe that status") is always asked and becomes required by its condition: hiding it would hide a
 *  value IMM 5257 reads, which release refuses (STANDARDS §3.6). */
type Place = { key: string; section: string; repeats: "per_person" | "per_row" | "once_per_case"; q: string; help?: string; when?: { field: string; is?: string; exists?: true } };
/** Questions for every fact IMM 5257 reads that nobody was asked for (plan §4.5, challenge B1). Sample wording. */
const PLACES: Place[] = [
  { key: "case.visa_type_requested", section: "application_details", repeats: "once_per_case", q: "Are you applying for a visitor visa or a transit visa?" },
  { key: "case.visit_purpose", section: VISIT, repeats: "once_per_case", q: "What is the main purpose of the visit?" },
  { key: "case.visit_purpose_other", section: VISIT, repeats: "once_per_case", q: "Describe the purpose of the visit", when: { field: "case.visit_purpose", is: "other" } },
  { key: "case.intended_stay_from", section: VISIT, repeats: "once_per_case", q: "When will the visit start?" },
  { key: "case.intended_stay_to", section: VISIT, repeats: "once_per_case", q: "When will the visit end?" },
  { key: "case.funds_available_cad", section: VISIT, repeats: "once_per_case", q: "How much money is available for the stay, in Canadian dollars?" },
  { key: "case.visit_contact_name", section: VISIT, repeats: "per_row", q: "Name of a person or organisation you will visit" },
  { key: "case.visit_contact_relationship", section: VISIT, repeats: "per_row", q: "Their relationship to you" },
  { key: "case.visit_contact_address_in_canada", section: VISIT, repeats: "per_row", q: "Their address in Canada" },
  { key: "person.current_residence_status", section: "residence_history", repeats: "per_person", q: "Your status in the country where you live now" },
  { key: "person.current_residence_status_other", section: "residence_history", repeats: "per_person", q: "Describe that status", when: { field: "person.current_residence_status", is: "other" } },
  { key: "person.current_residence_status_from", section: "residence_history", repeats: "per_person", q: "That status started on" },
  { key: "person.current_residence_status_to", section: "residence_history", repeats: "per_person", q: "That status ends on" },
  { key: "person.applying_from_country", section: "residence_history", repeats: "per_person", q: "Country or territory you are applying from" },
  { key: "person.applying_from_status", section: "residence_history", repeats: "per_person", q: "Your status in the country you are applying from", help: "Only when it differs from the country where you live now." },
  { key: "person.applying_from_status_other", section: "residence_history", repeats: "per_person", q: "Describe that status", when: { field: "person.applying_from_status", is: "other" } },
  { key: "person.applying_from_status_from", section: "residence_history", repeats: "per_person", q: "That status started on" },
  { key: "person.applying_from_status_to", section: "residence_history", repeats: "per_person", q: "That status ends on" },
  { key: "person.previous_residence_country", section: PREVIOUS, repeats: "per_row", q: "Country or territory" },
  { key: "person.previous_residence_status", section: PREVIOUS, repeats: "per_row", q: "Your status there" },
  { key: "person.previous_residence_status_other", section: PREVIOUS, repeats: "per_row", q: "Describe that status" },
  { key: "person.previous_residence_from", section: PREVIOUS, repeats: "per_row", q: "From" },
  { key: "person.previous_residence_to", section: PREVIOUS, repeats: "per_row", q: "To" },
  { key: "person.telephone_type", section: "contact", repeats: "per_person", q: "Type of your main telephone" },
  { key: "person.alternate_telephone_number", section: "contact", repeats: "per_person", q: "Another telephone number (optional)" },
  { key: "person.alternate_telephone_type", section: "contact", repeats: "per_person", q: "Type of that telephone", when: { field: "person.alternate_telephone_number", exists: true } },
  { key: "relationship.previously_married_or_common_law", section: "relationship", repeats: "per_person", q: "Have you been married or in a common-law relationship before?" },
  { key: "person.us_green_card_number", section: "travel_document", repeats: "per_person", q: "United States permanent resident card number, if you have one" },
  { key: "person.previously_applied_to_canada", section: "background_declarations", repeats: "per_person", q: "Have you applied to enter or stay in Canada before?" },
  { key: "person.education_city", section: "education_history", repeats: "per_row", q: "City or town of the school" },
  { key: "person.education_country", section: "education_history", repeats: "per_row", q: "Country or territory of the school" },
  { key: "person.education_field_of_study", section: "education_history", repeats: "per_row", q: "Field of study" },
  { key: "person.education_province_state", section: "education_history", repeats: "per_row", q: "Province or territory, if in Canada" },
  { key: "person.occupation_city", section: "employment_history", repeats: "per_row", q: "City or town of the job" },
  { key: "person.occupation_country", section: "employment_history", repeats: "per_row", q: "Country or territory of the job" },
  { key: "person.occupation_province_state", section: "employment_history", repeats: "per_row", q: "Province or territory, if in Canada" },
];

const slugValue = (label: string, taken: Set<string>) => {
  let k = label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!/^[a-z]/.test(k)) k = `v_${k}`;
  k = k.slice(0, 60); let out = k, i = 2; while (taken.has(out)) out = `${k.slice(0, 56)}_${i++}`; taken.add(out); return out;
};

async function main() {
  // A rerun on the same copy resumes after the applied draft (4.1–4.4 run once per fresh copy).
  let r: Awaited<ReturnType<typeof call>> = { status: 0, body: null };
  const resumed = sql("select count(*) from drafting_job j join combination c on c.id=j.combination_id where c.combination_key='vv.single' and j.status='APPLIED'") !== "0";
  if (!resumed) {
  // 4.1 sample inputs: the visitor-visa row and its official files (loader = Scaffolding)
  r = await call("POST", "/demo/load", undefined, AUTHOR);
  const vv0 = sql("select id from combination where combination_key='vv.single'");
  ok("4.1 sample inputs loaded; the visitor visa row exists with IMM 5257 attached", r.status < 300 && !!vv0 && !!sql(`select id from source_attachment where combination_id='${vv0}' and file_name='imm5257e.pdf'`), r.status);

  // 4.2 draft IMM 5257 by replaying the saved real run (US$0)
  const att = sql(`select id from source_attachment where combination_id='${vv0}' and file_name='imm5257e.pdf'`);
  r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, AUTHOR);
  const jobId: string = r.body?.id;
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED", 180_000);
  const items = (await call("GET", `/jobs/${jobId}`)).body.items as { id: string; proposedKey: string; outcome: string }[];
  ok("4.2 IMM 5257 drafted by replay, no model call", items.length === 84 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { proposals: items.length });

  // 4.3 decisions as on 21 Oct, then apply
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }, AUTHOR);
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, AUTHOR);
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) {
    const d = CHANGED[i.proposedKey] ? { decision: "CHANGED", key: CHANGED[i.proposedKey] } : { decision: "ACCEPTED" };
    const x = await call("POST", `/jobs/${jobId}/items/${i.id}`, d, AUTHOR);
    if (x.status >= 300) ok(`4.3 decision on ${i.proposedKey}`, false, x.body);
  }
  r = await call("POST", `/jobs/${jobId}/apply`, {}, AUTHOR);
  ok("4.3 decisions applied to the draft", r.status < 300, r.status < 300 ? undefined : r.body);

  // 4.4 IMM 5707 reused from the library (no AI)
  const a5707 = sql(`select id from source_attachment where combination_id='${vv0}' and file_name='imm5707e.pdf'`);
  r = await call("POST", `/attachments/${a5707}/reuse`, {}, AUTHOR);
  ok("4.4 IMM 5707 reused from the library", r.status < 300, r.status < 300 ? undefined : r.body);
  }
  const vv = sql("select id from combination where combination_key='vv.single'");

  // 4.5a answer lists typed from the form's own lists, given to the choice fields, then option maps
  type InvField = { data_path?: string; options_from?: string | null; options_resolved?: [string, string][] | null };
  const inv = JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: InvField[] };
  const box = new Map(inv.fields.filter((f) => f.data_path).map((f) => [f.data_path!, f]));
  const ed5257 = sql("select id from form_edition where edition_label like 'IMM 5257 (%' limit 1");
  const listName = (f?: InvField) => /LOV\.([A-Za-z]+List)\./.exec(f?.options_from ?? "")?.[1];
  const fieldList = new Map<string, string>(); // field → form list name (choice fields only: an address's country part is not one)
  const choice = new Set(sql("select distinct canonical_field_key from canonical_field where value_type in ('code','country')").split("\n"));
  for (const line of sql(`select distinct canonical_field_key || '|' || data_path from form_field_map where form_edition_id='${ed5257}' and outcome='mapped' and canonical_field_key is not null`).split("\n").filter((l) => l && choice.has(l.split("|")[0]))) {
    const [field, path] = line.split("|"); const n = listName(box.get(path));
    if (n && LIST_NAMES[n] && !fieldList.has(field) && !NO_LIST_YET.has(field)) fieldList.set(field, n);
  }
  const have = new Set<string>((await call("GET", "/library/answer-lists")).body.map((l: { key: string }) => l.key));
  for (const n of new Set(fieldList.values())) {
    const l = LIST_NAMES[n]; if (have.has(l.key)) continue;
    const src = inv.fields.find((f) => listName(f) === n && f.options_resolved?.length);
    const taken = new Set<string>(), seen = new Set<string>();
    const values = (src?.options_resolved ?? []).map(([label]) => plainLabel(label)).filter((label) => label && !seen.has(normLabel(label)) && seen.add(normLabel(label))).map((label) => ({ key: slugValue(label, taken), label }));
    const x = await call("POST", "/library/answer-lists", { key: l.key, label: l.label, values }, AUTHOR);
    if (x.status >= 300) ok(`4.5 answer list ${l.key}`, false, x.body);
  }
  const listOf = new Map(sql("select distinct on (canonical_field_key) canonical_field_key || '|' || coalesce(answer_list_key,'') from canonical_field order by canonical_field_key, version desc").split("\n").map((l) => l.split("|") as [string, string]));
  for (const field of NO_LIST_YET) if (listOf.get(field)) await call("DELETE", `/library/fields/${field}/answer-list`, undefined, AUTHOR);
  let linked = 0;
  for (const [field, n] of fieldList) {
    const list = LIST_NAMES[n].key; if (listOf.get(field) === list) { linked++; continue; }
    const x = await call("POST", `/library/fields/${field}/answer-list`, { list }, AUTHOR); if (x.status < 300) linked++; else ok(`4.5 link ${field} → ${list}`, false, x.body);
  }
  ok("4.5 an answer list from the form's own list for every choice field IMM 5257 fills", linked === fieldList.size && linked > 15, { lists: new Set(fieldList.values()).size, linked });
  for (const ed of sql("select id from form_edition where edition_label like 'IMM 5257 (%' or edition_label like 'IMM 5707 (%'").split("\n").filter(Boolean)) await call("POST", `/editions/${ed}/option-maps/draft`, undefined, AUTHOR);
  // The travel-document list writes "AFG (Afghanistan)": a person matches each value to its code by the name.
  const lists = new Map<string, { key: string; label: string }[]>((await call("GET", "/library/answer-lists")).body.map((l: { key: string; values: { key: string; label: string }[] }) => [l.key, l.values]));
  for (const path of sql(`select distinct data_path from form_field_map where form_edition_id='${ed5257}' and outcome='mapped' and canonical_field_key in (select canonical_field_key from canonical_field where answer_list_key='country_travel_document')`).split("\n").filter(Boolean)) {
    const opts = (box.get(path)?.options_resolved ?? []).filter(([l, c]) => l || c);
    const map: Record<string, string> = {};
    for (const v of lists.get("country_travel_document") ?? []) { const hit = opts.find(([l]) => normLabel(plainLabel(l)) === normLabel(v.label)); if (hit) map[v.key] = hit[1]; }
    const used = new Set(Object.values(map));
    const x = await call("PATCH", `/editions/${ed5257}/option-maps`, { dataPath: path, map, unused: opts.map(([, c]) => c).filter((c) => !used.has(c)) }, AUTHOR);
    if (x.status >= 300) ok(`4.5 option map ${path}`, false, x.body);
  }

  // 4.5b sections and questions for every fact nobody is asked for; conditions as data
  for (const s of NEW_SECTIONS) await call("POST", "/library/sections", s, AUTHOR);
  const valueKey = (field: string, label: string) => lists.get(LIST_NAMES[fieldList.get(field) ?? ""]?.key ?? "")?.find((v) => v.label.toLowerCase() === label)?.key;
  let placed = 0;
  for (const p of PLACES) {
    let condition: unknown = undefined, conditionPlain: string | undefined;
    const subjectKind = p.key.startsWith("case.") ? "CASE" : "EACH_APPLICANT";
    if (p.when?.exists) { condition = { subjectKind, op: "exists", field: p.when.field }; conditionPlain = `required when ${p.when.field} is answered`; }
    else if (p.when?.is) { const v = valueKey(p.when.field, p.when.is); condition = { subjectKind, op: "eq", field: p.when.field, value: v }; conditionPlain = `required when ${p.when.field} is "${p.when.is}"`; }
    const x = await call("POST", `/library/fields/${p.key}/placement`, { sectionKey: p.section, collectedFrom: "client_questionnaire", repeats: p.repeats, tier: "case", questionText: p.q, helpText: p.help, condition, conditionEffect: condition ? "REQUIRE" : undefined, conditionPlain }, AUTHOR);
    if (x.status < 300) placed++; else ok(`4.5 placement ${p.key}`, false, x.body);
  }
  ok("4.5 every fact IMM 5257 reads that nobody was asked for now has a question", placed === PLACES.length, { placed });
  const selections = sql("select distinct section_key from section_question").split("\n").filter(Boolean);
  const cfg = (await call("GET", `/combinations/${vv}/config`)).body.snapshot;
  const needed = new Set<string>((cfg.placements as { section_id: string }[]).map((p) => p.section_id));
  for (const s of selections.filter((s) => needed.has(s) || s === VISIT || s === PREVIOUS)) await call("POST", `/combinations/${vv}/sections/${s}`, undefined, AUTHOR);

  const o = (await call("GET", `/combinations/${vv}`)).body;
  const problems = o.draft.problems as { level: string; item: string; message: string }[];
  const nobody = problems.filter((p) => /nobody is asked/.test(p.message)), unused = problems.filter((p) => /does not use/.test(p.message)), errors = problems.filter((p) => p.level === "error");
  ok("4.5 acceptance: 0 errors, 0 facts nobody is asked for, 0 questions in unused sections", errors.length === 0 && nobody.length === 0 && unused.length === 0, { errors: errors.map((e) => `${e.item}: ${e.message}`).slice(0, 5), nobody: nobody.map((p) => p.item), unused: unused.map((p) => p.item).slice(0, 5), warnings: problems.length });

  // 4.6 submit → content reviewer signs (SME duty) → a different approver releases
  r = await call("POST", `/combinations/${vv}/submit`, { note: "R1a: visitor visa set up for the thin runtime slice (Sample values)" }, AUTHOR);
  ok("4.6 submitted for review", r.status < 300, r.status < 300 ? undefined : r.body);
  const sub = (await call("GET", `/combinations/${vv}/review`)).body.submission;
  const refs = (sub?.changeSummary ?? sub?.change_summary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  r = await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
  ok("4.6 every change signed by the content reviewer (SME duty)", r.status < 300 && refs.length > 0, r.status < 300 ? { changes: refs.length } : r.body);
  r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  ok("4.6 released by a different person", r.status < 300, r.body);
  const rel = (await call("GET", `/combinations/${vv}`)).body.releases?.[0];
  console.log(JSON.stringify({ combination: vv, release: rel?.version, sha256: rel?.sha256, warnings_left: problems.length }));
  process.exitCode = summary() ? 1 : 0;
}

await main();
