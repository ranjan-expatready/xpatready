// Test setup only (S6 queue item 2a, P-158): the shared library takes no free add (POST /library/fields, /library/sections
// and /library/answer-lists answer 410), so a check that needs an extra item writes it as a source would, straight into
// its own isolated copy's database: a draft that names its source, an ADD waiting for a second person like any new item,
// and an activity line (the catalogue caches rows keyed on activity counts). Never run against the demo database.
// Each function takes the check's own `sql(text)` runner (psql -Atc on its copy) and returns the item's key.
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
// G2: an isolated copy holds one workspace, the demo one or another (STUDIO_WORKSPACE_KEY): the seed goes into it.
const WS = "(select id from workspace order by created_at limit 1)";
const DATA_TYPE = { text: "STRING", yes_no: "BOOLEAN", date: "DATE", code: "ENUM", country: "ENUM", address: "COMPOSITE", number: "NUMBER", phone: "COMPOSITE", email: "STRING" };
const SUBJECT = { person: "PERSON", relationship: "RELATIONSHIP", case: "CASE", organisation: "ORGANISATION", representative: "REPRESENTATIVE" };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
const activity = (actor, entity, key, summary) => `insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) values (gen_random_uuid(), ${WS}, ${q(actor)}, 'created', ${q(entity)}, ${q(key)}, ${q(summary)})`;
const waiting = (actor, kind, key, label, source) => `insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values (gen_random_uuid(), ${WS}, ${q(kind)}, ${q(key)}, ${q(label)}, 'ADD', ${q(`From ${source}`)}, 'WAITING', ${q(actor)})`;

/** A shared field as a form box or rule would propose it: { key, meaning, valueType, source, actor?, review? }. */
exports.seedField = (sql, { key, meaning, valueType = "text", source = "a test fixture (Sample)", actor = "user-A", review = true }) => {
  sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, source_ref, updated_by) values (gen_random_uuid(), ${WS}, ${q(key)}, 1, 'DRAFT', ${q(meaning)}, ${q(valueType)}, ${q(DATA_TYPE[valueType] ?? "STRING")}, ${q(key.startsWith("case.") ? "CASE_LEVEL" : "CLIENT_LEVEL")}, ${q(SUBJECT[key.split(".")[0]] ?? "PERSON")}, 'HUMAN', ${q(source)}, ${q(actor)})`);
  if (review) sql(waiting(actor, "field", key, null, source));
  sql(activity(actor, "field", key, `test setup: field ${key} from ${source}`));
  return key;
};

/** A section as the forms' parts would propose it: { title, meaning?, actor?, review? }. */
exports.seedSection = (sql, { title, meaning = null, actor = "user-A", review = true }) => {
  const key = slug(title);
  sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, origin, updated_by) values (gen_random_uuid(), ${WS}, ${q(key)}, 1, 'DRAFT', ${q(title)}, ${q(meaning)}, 100 + (select count(*) from logical_section), 'HUMAN', ${q(actor)})`);
  if (review) sql(waiting(actor, "section", key, title, "the forms' parts (test setup)"));
  sql(activity(actor, "section", key, `test setup: section "${title}"`));
  return key;
};

/** An answer list as a form box's own choices give it: { key, label, values: [{ key, label }], actor? }. */
exports.seedAnswerList = (sql, { key, label, values, actor = "user-A" }) => {
  sql(`insert into answer_list (id, workspace_id, answer_list_key, version, status, label, origin, updated_by) values (gen_random_uuid(), ${WS}, ${q(key)}, 1, 'DRAFT', ${q(label)}, 'HUMAN', ${q(actor)})`);
  const id = `(select id from answer_list where answer_list_key = ${q(key)} and workspace_id = ${WS} order by version desc limit 1)`;
  sql(`insert into answer_list_value (id, answer_list_id, value_key, label, sort_order) values ${values.map((v, i) => `(gen_random_uuid(), ${id}, ${q(v.key)}, ${q(v.label)}, ${i + 1})`).join(", ")}`);
  sql(activity(actor, "answer list", key, `test setup: answer list ${key} (${values.length} values, Sample)`));
  return key;
};
