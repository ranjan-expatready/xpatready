// C4.4 fixture (runtime lane): the P-47 question types the Visitor visa release does not use yet (long text, multi
// choice, person name group, period history, declaration), added to that release's snapshot in an ISOLATED copy's own
// database so the one renderer and the case engine meet them on a real case. Each is placed in "Personal details" for
// every person and mapped to a Sample box of IMM 5257 (data paths "C44.sample.*", never filled: the release is a test
// fixture), the way x1_tabs_focus and forms_s4_runs patch a release. The 10-year history check is held as data: a derived
// field with the tested calculation months_uncovered_10y and a section check "gt 0" on it (P-47 tier 2; tech lead on
// #295), within the closed predicate vocabulary. Part 2: two Pre-qualification ticks for PQR mode. Sample values only; no AI
// (US$0). Idempotent.
//   tsx studio/tests/runtime/setup_c44_types.ts <port> <db>   (after setup_visitor_visa.ts)
import { client } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_c44";
const { sql } = client(PORT, DB);

const C44 = {
  long: "person.c44_sample_visit_story", multi: "person.c44_sample_purposes", name: "person.c44_sample_name_at_birth",
  history: "person.c44_sample_activity_history", declaration: "person.c44_sample_declaration", gap: "person.c44_sample_history_uncovered_months",
  check: "C44_SAMPLE_HISTORY_COVERS_10_YEARS", checkWords: "The history leaves months out of the 10 years before the application date. Add what you did in each gap.",
};
const FIELDS: [string, string, string, string, Record<string, unknown>?][] = [
  [C44.long, "long_text", "Tell us about the visit (Sample)", "A free account of the visit, in the client's words (Sample question)"],
  [C44.multi, "multi_choice", "What will you do on the visit? (Sample)", "Every purpose of the visit that applies (Sample list)", { answer_list: { key: "c44_sample_purposes", values: [{ key: "tourism", label: "Tourism" }, { key: "family", label: "Visit family" }, { key: "business", label: "Business meetings" }] } }],
  [C44.name, "person_name", "Name at birth (Sample)", "The person's name at birth: family name and given names, or no given name"],
  [C44.history, "period_history", "What have you done in the last 10 years? (Sample)", "Work, study and other activity, month by month, for the last 10 years"],
  [C44.declaration, "declaration", "Declaration (Sample)", "I declare that the information I have given is truthful, complete and correct. (Sample wording, not IRCC's.)"],
];

const fields = FIELDS.map(([id, value_type, , meaning, extra]) => ({ id, value_type, meaning, scope: "CLIENT_LEVEL", status: "PUBLISHED", origin: "IMPORTED_RELEASE", data_type: value_type === "declaration" ? "BOOLEAN" : value_type === "long_text" ? "STRING" : value_type === "multi_choice" ? "ENUM" : "COMPOSITE", item_version: 1, ...extra }));
const placements = FIELDS.map(([fact, , q], i) => ({ fact, tier: "case", order: 90 + i, status: "PUBLISHED", lineage: fact, repeats: "per_person", condition: null, help_text: null, rule_only: false, section_id: "personal_details", item_version: 1, question_text: q, client_visible: true, collected_from: "client_questionnaire", condition_plain: null, condition_effect: null }));
// The library holds each field at version 1 too (an answer is saved against the library field its release names).
for (const f of fields) sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, data_type, scope, origin, subject_kind, label, meaning, value_type, updated_by, updated_at)
  select gen_random_uuid(), workspace_id, '${f.id}', 1, 'PUBLISHED', '${f.data_type}', 'CLIENT_LEVEL', 'HUMAN', 'PERSON', $t$${placements.find((p) => p.fact === f.id)!.question_text}$t$, $t$${f.meaning}$t$, '${f.value_type}', 'setup_c44_types', now()
  from canonical_field where canonical_field_key = 'person.other_family_name' limit 1 on conflict do nothing`);
const rel = sql(`select r.id from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single' order by r.version desc limit 1`);
if (!rel) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first"); process.exit(2); }
if (sql(`select count(*) from config_release, jsonb_array_elements(snapshot->'canonical_fields') f where id = '${rel}' and f->>'id' = '${C44.long}'`) !== "0") { console.log(`c44 types already on release ${rel}`); process.exit(0); }

const entries = FIELDS.map(([fact, , q]) => ({ row: null, fact, origin: "HUMAN", person: "form_subject", status: "PUBLISHED", caption: q, heading: "C44.sample", outcome: "mapped", condition: null, data_path: `C44.sample.${fact.split(".")[1]}`, transform: null, confidence: "high", item_version: 1, evidence_quote: null, unresolved_reason: null }));
const derived = { id: C44.gap, plain: "Months of the 10 years before the application date that the activity history leaves out (Sample).", inputs: [C44.history], reference: "case.application_date", executable: true, calculation: "months_uncovered_10y" };
const check = { id: C44.check, group: "section_check", message: C44.checkWords, severity: "warn", condition: { op: "gt", field: C44.gap, value: 0, subjectKind: "PERSON" }, applies_to: C44.history, illustrative: true, item_version: 1, source_quote: null };
const j = (x: unknown) => `$j$${JSON.stringify(x)}$j$::jsonb`;
const idx = sql(`select (i - 1) from config_release, jsonb_array_elements(snapshot->'field_maps') with ordinality m(v, i) where id = '${rel}' and v->>'form_edition' like 'IMM 5257 (%' limit 1`);
sql(`update config_release set snapshot = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(snapshot,
  '{canonical_fields}', (snapshot->'canonical_fields') || ${j(fields)}),
  '{placements}', (snapshot->'placements') || ${j(placements)}),
  '{field_maps,${idx},entries}', (snapshot->'field_maps'->${idx}->'entries') || ${j(entries)}),
  '{derived_fields}', (snapshot->'derived_fields') || ${j([derived])}),
  '{checks}', (snapshot->'checks') || ${j([check])}) where id = '${rel}'`);
// C4.4 part 2, PQR mode (P-47 mode 1): two Pre-qualification ticks for the principal applicant (W1-15's fact_sources), as
// a person ticks them on the Questions and documents tab. Sample picks, not advice on what pre-qualifies.
const ticks = ["person.refused_visa_or_entry", "person.criminal_history"].map((fact) => ({ role: "principal", fact, source: null, document_type: null, prequalification: true, reason: "Sample pick (C4.4 fixture)", origin: "HUMAN" }));
sql(`update config_release set snapshot = jsonb_set(snapshot, '{fact_sources}', coalesce(snapshot->'fact_sources', '[]'::jsonb) || ${j(ticks)}) where id = '${rel}'`);
console.log(`c44 types added to release ${rel}: ${FIELDS.length} fields, 1 derived field, 1 section check, ${ticks.length} pre-qualification ticks`);
