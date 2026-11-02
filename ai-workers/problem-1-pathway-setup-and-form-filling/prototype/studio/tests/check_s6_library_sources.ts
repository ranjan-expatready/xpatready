// S6 Shared library, queue item (2a) (screens lane; P-158 delta items 1, 6 and 8; C3.6, C3.13, C3.15): no free add (the
// three POSTs answer 410 and write nothing), every library item's sources and where it is used, and a versioned rename
// with the exact-duplicate check (through the G-CORE door since B2: a released item's rename waits for a second person); PR #96 findings (a) only the newest form mapping is a source, (b) where used
// reads rules, conditions and questions too, (c) checklist lines that differ in quote both stay, and QA-113's heading.
// A passing and a failing case per rule, through the API on an isolated copy with
// the sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh screens_lib 4446 start && tsx studio/tests/check_s6_library_sources.ts 4446 xr_studio_screens_lib
import { execFileSync } from "node:child_process";
import { seedField, seedSection } from "./seed_library.cjs";

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_lib";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const count = (table: string) => Number(sql(`select count(*) from ${table}`));

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);

  // ─────────────────── P-158 item 1 and 8: no free add
  const before = [count("canonical_field"), count("logical_section"), count("answer_list"), count("library_change")];
  const f = await call("POST", "/library/fields", { key: "person.free_add", meaning: "A field typed in by hand.", valueType: "text" });
  const s = await call("POST", "/library/sections", { title: "Free section", meaning: "A section typed in by hand." });
  const l = await call("POST", "/library/answer-lists", { key: "free_list", label: "Free list", values: [{ key: "a", label: "A" }, { key: "b", label: "B" }] });
  ok("C3.6 P-158 fail: a free add of a field, a section or an answer list is gone (410)", f.status === 410 && s.status === 410 && l.status === 410, [f.status, s.status, l.status]);
  ok("C3.6 P-158 fail: the 410 says where the item comes from instead, in plain words", /form field/.test(f.body?.detail) && /forms' own parts/.test(s.body?.detail) && /form field's own choices|IRCC code list/.test(l.body?.detail), [f.body?.detail, s.body?.detail]);
  ok("C3.6 P-158 fail: a refused add writes nothing (no field, section, list or waiting change)", JSON.stringify(before) === JSON.stringify([count("canonical_field"), count("logical_section"), count("answer_list"), count("library_change")]));
  const [approver, nobody] = await Promise.all([call("POST", "/library/fields", { key: "person.x", meaning: "x", valueType: "text" }, "user-B"), call("POST", "/library/sections", { title: "x" }, "user-Z")]);
  ok("C3.6 P-158 fail: the add is gone for every person (410); an unknown person is 401 first (QA-65)", approver.status === 410 && nobody.status === 401, [approver.status, nobody.status]);

  // ─────────────────── P-158 item 6: sources
  let r = await call("GET", "/library/fields/person.family_name/sources");
  ok("C3.13 P-158 pass: a field read from form boxes names each one (\"From: IMM 1295 … form field …\")", r.status === 200 && r.body.sources.filter((x: { kind: string }) => x.kind === "form_box").length >= 3 && r.body.sources.some((x: { text: string }) => /^From: IMM 1295 \(.*\) form field "Family name/.test(x.text)) && r.body.unsourced === false, r.body.sources?.slice(0, 2));
  ok("C3.13 pass: the field says where it is used (combinations by name)", r.body.used_in?.length >= 1, r.body.used_in);
  r = await call("GET", "/library/fields/case.application_date/sources");
  ok("P-158 pass: a field no form box reads still names its source (the reviewed release it came with)", r.status === 200 && r.body.sources.length === 1 && r.body.sources[0].kind === "release" && /reviewed work-permit release/.test(r.body.sources[0].text), r.body.sources);
  const types = (await call("GET", "/library/document-types")).body as { documentTypeKey: string; name: string; source: string | null; unsourced: boolean; used_in: string[] }[];
  const dt = types[0];
  r = await call("GET", `/library/document-types/${encodeURIComponent(dt.documentTypeKey)}/sources`);
  ok("P-158 pass: a document type names its checklist line, quoted (\"From: checklist IMM 5488\")", r.status === 200 && r.body.sources.some((x: { kind: string; text: string; quote?: string }) => x.kind === "checklist" && /^From: checklist (IMM|Guide) \d{4}$|^From: checklist [a-z ]+$/.test(x.text) && !!x.quote), r.body.sources?.[0]);
  ok("C3.13 pass: the Document types list gives each row its source and where it is used", types.length > 0 && types.every((t) => !t.unsourced && /^From: checklist /.test(t.source ?? "") && !/inventory|\.json/.test(t.source ?? "") && t.used_in.length >= 1), types.find((t) => t.unsourced || !t.used_in.length)?.name);
  const sections = (await call("GET", "/library/sections")).body as { key: string; title: string; source: string | null; unsourced: boolean; used_in: string[]; combinations: number }[];
  r = await call("GET", `/library/sections/${sections[0].key}/sources`);
  ok("C3.13 pass: a section names the forms its questions read, and its release", r.status === 200 && r.body.sources.some((x: { kind: string }) => x.kind === "forms") && r.body.sources.some((x: { kind: string }) => x.kind === "release"), r.body.sources);
  ok("C3.13 pass: Sections lists where each is used by name, as many as it counts", sections.every((x) => x.used_in.length === x.combinations), sections.find((x) => x.used_in.length !== x.combinations));
  const fields = (await call("GET", "/library/fields")).body as { key: string; source: string | null; unsourced: boolean }[];
  ok("P-162 pass: every Fields row shows a source; a release note is said short (\"From a reviewed release\")", fields.length > 100 && fields.every((x) => !x.unsourced && !!x.source) && fields.some((x) => x.source === "From a reviewed release") && fields.some((x) => /^From: IMM \d{4}/.test(x.source ?? "")), fields.find((x) => !x.source)?.key);
  // An item with no source (one made by hand before P-158) is flagged, never shown blank.
  sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by) select gen_random_uuid(), id, 'person.old_hand_made', 1, 'DRAFT', 'A field made by hand before P-158.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A' from workspace where key='demo'");
  sql("insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), id, 'user-A', 'created', 'field', 'person.old_hand_made', 'test setup' from workspace where key='demo'");
  r = await call("GET", "/library/fields/person.old_hand_made/sources");
  const row = ((await call("GET", "/library/fields")).body as { key: string; source: string | null; unsourced: boolean }[]).find((x) => x.key === "person.old_hand_made");
  ok("P-162 fail: a field with no source is flagged (unsourced), in its sources and its Fields row", r.body.unsourced === true && r.body.sources.length === 0 && row?.unsourced === true && row.source === null, row);
  const seeded = seedField(sql, { key: "person.seeded_from_rule", meaning: "A test field a rule needs.", source: "rule R-1 (test)" });
  r = await call("GET", `/library/fields/${seeded}/sources`);
  ok("P-158 pass: a field written with its source names it (the test setup helper behaves as a source would)", r.body.unsourced === false && /rule R-1/.test(r.body.sources[0]?.text), r.body.sources);
  r = await call("GET", "/library/forms/person.family_name/sources");
  const r2 = await call("GET", "/library/fields/person.not_there/sources");
  ok("P-158 fail: an unknown list or an unknown item is 404, in words", r.status === 404 && /fields, sections, document-types or answer-lists/.test(r.body.detail) && r2.status === 404 && /not in the shared library/.test(r2.body.detail), [r.body.detail, r2.body.detail]);

  // ─────────────────── PR #96 findings (a)–(c) and QA-113
  const texts = async (key: string) => ((await call("GET", `/library/fields/${key}/sources`)).body.sources as { text: string }[]).map((x) => x.text).join(" | ");
  const usedIn = async (key: string) => (await call("GET", `/library/fields/${key}/sources`)).body.used_in as string[];
  const touch = (key: string) => sql(`insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), id, 'user-A', 'edited', 'field', '${key}', 'test setup' from workspace where key='demo'`);
  // (a) A published form mapping replaced by a newer draft that maps another field: only the newest version counts.
  const box = sql("select id from form_field_map where canonical_field_key='person.family_name' and outcome='mapped' and status='PUBLISHED' order by data_path limit 1");
  const copy = (from: string, caption: string, key: string, status: string, outcome = "mapped") => sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, caption, heading, outcome, person, row, canonical_field_key, evidence_quote, version, status, supersedes_id, origin, updated_by) select gen_random_uuid(), workspace_id, form_edition_id, data_path, '${caption}', heading, '${outcome}', person, row, '${key}', evidence_quote, version + 1, '${status}', id, origin, 'user-A' from form_field_map where id='${from}' returning id`).split("\n")[0];
  const v2 = copy(box, "S6 old caption", "person.family_name", "PUBLISHED");
  sql(`update form_field_map set status='SUPERSEDED' where id='${box}'`); touch("person.family_name");
  ok("PR #96 (a) pass: a published form mapping is a source of its field", /"S6 old caption"/.test(await texts("person.family_name")));
  const v3 = copy(v2, "S6 new caption", "person.given_names", "DRAFT"); touch("person.family_name");
  const [oldT, newT] = [await texts("person.family_name"), await texts("person.given_names")];
  ok("PR #96 (a) fail: once a newer draft maps that form field to another field, the old mapping is no longer listed", !/"S6 old caption"/.test(oldT), oldT);
  ok("PR #96 (a) pass: the newer draft's field lists it instead", /"S6 new caption"/.test(newT), newT);
  copy(v3, "S6 unmapped caption", "person.given_names", "DRAFT", "unresolved"); touch("person.given_names");
  const both = (await texts("person.family_name")) + (await texts("person.given_names"));
  ok("PR #96 (a) fail: a newest version that maps nothing hides every older mapping of that form field", !/S6 (old|new|unmapped) caption/.test(both), both);
  // (b) A field used only in a rule, or only by a question, is used in that combination.
  const combo = sql("select c.id || '|' || c.label from combination c join sqr_section_selection s on s.combination_id = c.id order by c.label limit 1").split("|");
  const sectionOf = sql(`select section_key from sqr_section_selection where combination_id='${combo[0]}' order by section_order limit 1`);
  const ruleOnly = seedField(sql, { key: "person.s6_rule_only", meaning: "A test field only a rule reads.", source: "rule R-S6 (test)" });
  const askedOnly = seedField(sql, { key: "person.s6_question_only", meaning: "A test field only a question asks.", source: "rule R-S6 (test)" });
  ok("PR #96 (b) fail: a field no form, rule or question uses is used nowhere", (await usedIn(ruleOnly)).length === 0 && (await usedIn(askedOnly)).length === 0);
  sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, then_plain, for_whom, version, status, origin, updated_by) values (gen_random_uuid(), (select workspace_id from combination where id='${combo[0]}'), '${combo[0]}', 'r_s6_test', '{"field":"${ruleOnly}","op":"eq","value":"yes"}', 'Test rule', 'principal', 1, 'PUBLISHED', 'HUMAN', 'user-A')`);
  sql(`insert into section_question (id, workspace_id, lineage_key, section_key, canonical_field_key, display_order, repeats, tier, collected_from, version, status, origin, updated_by) values (gen_random_uuid(), (select workspace_id from combination where id='${combo[0]}'), '${askedOnly}', '${sectionOf}', '${askedOnly}', 999, 'once_per_case', 'case', 'client_questionnaire', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  touch(ruleOnly);
  ok("PR #96 (b) pass: a field only a rule reads is used in that rule's combination", (await usedIn(ruleOnly)).includes(combo[1]), await usedIn(ruleOnly));
  ok("PR #96 (b) pass: a field only a question asks is used where its section is selected", (await usedIn(askedOnly)).includes(combo[1]), await usedIn(askedOnly));
  sql(`insert into predicate (id, workspace_id, combination_id, predicate_key, predicate_json, then_plain, for_whom, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, combination_id, predicate_key, '{"field":"person.uci"}', then_plain, for_whom, 2, 'DRAFT', origin, 'user-A' from predicate where predicate_key='r_s6_test'`);
  touch(ruleOnly);
  ok("PR #96 (b) fail: once the rule's newest version reads another field, the old one is no longer used there", (await usedIn(ruleOnly)).length === 0, await usedIn(ruleOnly));
  // PR #108 minor (a): a field mapped only on a superseded edition of a combination's form is not used there.
  const [boxOf, edId, comboOfForm] = sql("select m.id || '|' || e.id || '|' || c.label from form_edition e join form_field_map m on m.form_edition_id = e.id and m.outcome = 'mapped' and m.status = 'PUBLISHED' join combination_form l on l.gov_form_def_id = e.gov_form_def_id and l.status in ('PUBLISHED','DRAFT') join combination c on c.id = l.combination_id where e.channel = 'PDF' and (select count(*) from form_edition x where x.gov_form_def_id = e.gov_form_def_id and x.channel = 'PDF') = 1 order by e.edition_label, c.label limit 1").split("|");
  const oldOnly = seedField(sql, { key: "person.s6_old_edition_only", meaning: "A test field mapped only on an older edition.", source: "rule R-S6 (test)" });
  const mapOn = (edition: string, path: string, key: string) => sql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, caption, heading, outcome, person, row, canonical_field_key, evidence_quote, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, '${edition}', '${path}', 'S6 edition box', heading, 'mapped', person, row, '${key}', evidence_quote, 1, 'PUBLISHED', origin, 'user-A' from form_field_map where id='${boxOf}'`);
  mapOn(edId, "s6.old.only", oldOnly); touch(oldOnly);
  ok("PR #108 (a) pass: a field mapped on the form's current edition is used in its combination", (await usedIn(oldOnly)).includes(comboOfForm), await usedIn(oldOnly));
  const cols = "workspace_id, gov_form_def_id, channel";
  const newEd = sql(`insert into form_edition (id, edition_label, ${cols}) select gen_random_uuid(), 'S6 test edition 12-2099', ${cols} from form_edition where id='${edId}' returning id`).split("\n")[0];
  mapOn(newEd, "s6.new.box", "person.uci"); touch(oldOnly);
  ok("PR #108 (a) fail: once a newer edition of that form is mapped, a field mapped only on the old one is not used there", !(await usedIn(oldOnly)).includes(comboOfForm), await usedIn(oldOnly));
  sql(`delete from form_field_map where form_edition_id='${newEd}'`); sql(`delete from form_edition where id='${newEd}'`); touch(oldOnly);
  ok("PR #108 (a) pass: a newer edition with nothing mapped yet leaves the older one in use", (await usedIn(oldOnly)).includes(comboOfForm), await usedIn(oldOnly));
  // (c) Two lines of the same checklist file for one document type, with different quotes, both stay.
  const req = sql("select id || '|' || document_type_key from document_requirement where source_file is not null and source_quote is not null and status in ('PUBLISHED','DRAFT') order by lineage_key limit 1").split("|");
  const addLine = (quote: string, lineage: string) => sql(`insert into document_requirement (id, workspace_id, combination_id, lineage_key, document_type_key, attach_mode, predicate_json, condition_plain, applies_to_roles, provided_by, is_required, source_quote, source_file, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, combination_id, '${lineage}', document_type_key, attach_mode, predicate_json, condition_plain, applies_to_roles, provided_by, is_required, '${quote}', source_file, 1, 'DRAFT', origin, 'user-A' from document_requirement where id='${req[0]}'`);
  addLine("S6 second checklist line quote", "s6_second_line");
  addLine("S6 second checklist line quote", "s6_same_line");
  touch(req[1]);
  const quotes = ((await call("GET", `/library/document-types/${encodeURIComponent(req[1])}/sources`)).body.sources as { quote?: string | null }[]).map((x) => x.quote);
  ok("PR #96 (c) pass: a second line of the same checklist with its own quote is listed with that quote", quotes.includes("S6 second checklist line quote") && quotes.length >= 2, quotes);
  ok("PR #96 (c) fail: a line with the same words and the same quote is listed once", quotes.filter((x) => x === "S6 second checklist line quote").length === 1, quotes);
  // QA-113: the To review heading of a who-fills change says "who fills" once.
  const wp = sql("select id from combination where combination_key='wp.family'");
  const fact = ((await call("GET", `/combinations/${wp}/fact-sources`)).body.facts as { role: string; fact: string; fills: { library: string }; clientOnly: boolean; ruleSource: string; placed: boolean }[])
    .find((x) => x.role === "principal" && x.fills.library === "CLIENT" && !x.clientOnly && x.ruleSource === "CLIENT" && x.placed);
  const fills = fact ? await call("POST", `/library/fields/${encodeURIComponent(fact.fact)}/fills`, { to: "CASE_OFFICER", reason: "Sample: QA-113 heading test" }) : { status: 0, body: null };
  const change = fills.body?.id ? (await call("GET", `/library/changes/${fills.body.id}`)).body : null;
  const heading = change ? `${change.action_word} ${change.kind_word}: ${change.label}` : "";
  ok("QA-113 pass: the change's heading reads \"Change who fills a question: …\"", /^Change who fills a question: /.test(heading), heading || fills.body);
  ok("QA-113 fail: the heading never doubles the words (\"who fills who fills\")", !!heading && !/who fills who fills/i.test(heading), heading);

  // ─────────────────── C3.15: rename, versioned, with the exact-duplicate check, through the G-CORE door (B2): every field
  // and section of the sample is in a release, so (P-266) a second person approves its rename before it applies.
  const v0 = Number(sql("select max(version) from canonical_field where canonical_field_key='person.family_name'"));
  r = await call("PATCH", "/library/fields/person.family_name/name", { name: "Last name" });
  const listedBefore = ((await call("GET", "/library/fields")).body as { key: string; name: string | null }[]).find((x) => x.key === "person.family_name");
  ok("C3.15 + P-266: renaming a field a released combination uses waits for a second person (202), the name unchanged until then", r.status === 202 && r.body.status === "WAITING" && listedBefore?.name !== "Last name" && sql("select action || '|' || status from library_change where key='person.family_name'") === "RENAME|WAITING", [r.status, r.body, listedBefore?.name]);
  const ap = await call("POST", `/library/changes/${r.body?.change_id}/approve`, {}, "user-B");
  const listed = ((await call("GET", "/library/fields")).body as { key: string; name: string | null }[]).find((x) => x.key === "person.family_name");
  ok("C3.15 pass: approved by a second person, the rename is a new draft version, shown in the list", ap.status < 300 && Number(sql("select max(version) from canonical_field where canonical_field_key='person.family_name'")) === v0 + 1 && sql("select status from canonical_field where canonical_field_key='person.family_name' order by version desc limit 1") === "DRAFT" && listed?.name === "Last name", [ap.status, ap.body?.detail, listed?.name]);
  ok("C3.15 pass: the rename is on the activity log in words", /approved renaming field person\.family_name from "person\.family_name" to "Last name"/.test(sql("select summary from audit_event where action='renamed' and entity_key='person.family_name' order by at desc limit 1")));
  r = await call("PATCH", "/library/fields/person.given_names/name", { name: "last-name" });
  ok("C3.15 fail: a name another field in the group has (case, spaces and punctuation aside) is refused, nothing written", r.status === 409 && /already the name of Last name/.test(r.body.detail) && sql("select label_checked from canonical_field where canonical_field_key='person.given_names' order by version desc limit 1") === "f", r.body.detail);
  const appReleased = sql("select count(*) from config_release r where r.snapshot->'canonical_fields' @> '[{\"id\": \"case.application_date\"}]'::jsonb") !== "0";
  r = await call("PATCH", "/library/fields/case.application_date/name", { name: "Last name" });
  ok("C3.15 pass: the same name in another group (case, not person) is allowed (202 waiting when a release carries it, else 200)", r.status === (appReleased ? 202 : 200), [appReleased, r.status, r.body?.detail]);
  const [bad, short, notAuthor] = await Promise.all([call("PATCH", "/library/fields/person.not_there/name", { name: "Anything" }), call("PATCH", "/library/fields/person.uci/name", { name: " " }), call("PATCH", "/library/fields/person.uci/name", { name: "Client number" }, "user-B")]);
  ok("C3.15 fail: an unknown field 404, an empty name 400, a person without the author duty 403", bad.status === 404 && short.status === 400 && notAuthor.status === 403, [bad.status, short.status, notAuthor.status]);
  const sec = sections.find((x) => x.title === "Languages") ?? sections[0];
  r = await call("PATCH", `/library/sections/${sec.key}`, { name: "Languages spoken" });
  ok("C3.15 + P-253: the Languages section is in a release, so its rename waits for a second person (202)", r.status === 202 && r.body.status === "WAITING", [r.status, r.body]);
  r = await call("POST", `/library/changes/${r.body?.change_id}/approve`, {}, "user-B");
  const secRow = ((await call("GET", "/library/sections")).body as { key: string; title: string; version: number }[]).find((x) => x.key === sec.key);
  ok("C3.15 pass: an author renames a section (a new draft version), the list shows it", r.status < 300 && secRow?.title === "Languages spoken" && sql(`select status from logical_section where section_key='${sec.key}' order by version desc limit 1`) === "DRAFT", [r.status, secRow]);
  r = await call("PATCH", `/library/sections/${sec.key}`, { name: sections.find((x) => x.key !== sec.key)!.title.toUpperCase() });
  ok("C3.15 fail: another section's title is refused", r.status === 409 && /already a section called/.test(r.body.detail), r.body.detail);
  const added = seedSection(sql, { title: "Seeded section" });
  ok("setup helper: a seeded section waits for a second person, as a proposed one would", sql(`select status from library_change where kind='section' and key='${added}'`) === "WAITING");

  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(1); });
