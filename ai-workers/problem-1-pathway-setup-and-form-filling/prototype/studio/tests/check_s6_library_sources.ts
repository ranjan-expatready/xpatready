// S6 Shared library, queue item (2a) (screens lane; P-158 delta items 1, 6 and 8; C3.6, C3.13, C3.15): no free add (the
// three POSTs answer 410 and write nothing), every library item's sources and where it is used, and a direct, versioned
// rename with the exact-duplicate check. A passing and a failing case per rule, through the API on an isolated copy with
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
  ok("C3.6 P-158 fail: the 410 says where the item comes from instead, in plain words", /form box/.test(f.body?.detail) && /forms' own parts/.test(s.body?.detail) && /form box's own choices|IRCC code list/.test(l.body?.detail), [f.body?.detail, s.body?.detail]);
  ok("C3.6 P-158 fail: a refused add writes nothing (no field, section, list or waiting change)", JSON.stringify(before) === JSON.stringify([count("canonical_field"), count("logical_section"), count("answer_list"), count("library_change")]));
  const viewer = await call("POST", "/library/fields", { key: "person.x", meaning: "x", valueType: "text" }, "user-Z");
  ok("C3.6 P-158 fail: the add is gone for everyone, whoever asks", viewer.status === 410, viewer.status);

  // ─────────────────── P-158 item 6: sources
  let r = await call("GET", "/library/fields/person.family_name/sources");
  ok("C3.13 P-158 pass: a field read from form boxes names each one (\"From: IMM 1295 … box …\")", r.status === 200 && r.body.sources.filter((x: { kind: string }) => x.kind === "form_box").length >= 3 && r.body.sources.some((x: { text: string }) => /^From: IMM 1295 \(.*\) box "Family name/.test(x.text)) && r.body.unsourced === false, r.body.sources?.slice(0, 2));
  ok("C3.13 pass: the field says where it is used (combinations by name)", r.body.used_in?.length >= 1, r.body.used_in);
  r = await call("GET", "/library/fields/case.application_date/sources");
  ok("P-158 pass: a field no form box reads still names its source (the reviewed release it came with)", r.status === 200 && r.body.sources.length === 1 && r.body.sources[0].kind === "release" && /reviewed work-permit release/.test(r.body.sources[0].text), r.body.sources);
  const types = (await call("GET", "/library/document-types")).body as { documentTypeKey: string; name: string; source: string | null; unsourced: boolean; used_in: string[] }[];
  const dt = types[0];
  r = await call("GET", `/library/document-types/${encodeURIComponent(dt.documentTypeKey)}/sources`);
  ok("P-158 pass: a document type names its checklist line, quoted (\"From: checklist IMM 5488\")", r.status === 200 && r.body.sources.some((x: { kind: string; text: string; quote?: string }) => x.kind === "checklist" && /^From: checklist IMM \d{4}$/.test(x.text) && !!x.quote), r.body.sources?.[0]);
  ok("C3.13 pass: the Document types list gives each row its source and where it is used", types.length > 0 && types.every((t) => !t.unsourced && /^From: checklist/.test(t.source ?? "") && t.used_in.length >= 1), types.find((t) => t.unsourced || !t.used_in.length)?.name);
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

  // ─────────────────── C3.15: rename, direct and versioned, with the exact-duplicate check
  const v0 = Number(sql("select max(version) from canonical_field where canonical_field_key='person.family_name'"));
  r = await call("PATCH", "/library/fields/person.family_name/name", { name: "Last name" });
  const listed = ((await call("GET", "/library/fields")).body as { key: string; name: string | null }[]).find((x) => x.key === "person.family_name");
  ok("C3.15 pass: an author renames a shared field directly: a new draft version, no second person, shown in the list", r.status === 200 && r.body.version === v0 + 1 && r.body.status === "DRAFT" && listed?.name === "Last name" && sql("select count(*) from library_change where key='person.family_name'") === "0", [r.body, listed?.name]);
  ok("C3.15 pass: the rename is on the activity log in words", /renamed field person\.family_name from "person\.family_name" to "Last name"/.test(sql("select summary from audit_event where action='renamed' and entity_key='person.family_name' order by at desc limit 1")));
  r = await call("PATCH", "/library/fields/person.given_names/name", { name: "last-name" });
  ok("C3.15 fail: a name another field in the group has (case, spaces and punctuation aside) is refused, nothing written", r.status === 409 && /already the name of Last name/.test(r.body.detail) && sql("select label_checked from canonical_field where canonical_field_key='person.given_names' order by version desc limit 1") === "f", r.body.detail);
  r = await call("PATCH", "/library/fields/case.application_date/name", { name: "Last name" });
  ok("C3.15 pass: the same name in another group (case, not person) is allowed", r.status === 200, r.body?.detail);
  const [bad, short, notAuthor] = await Promise.all([call("PATCH", "/library/fields/person.not_there/name", { name: "Anything" }), call("PATCH", "/library/fields/person.uci/name", { name: " " }), call("PATCH", "/library/fields/person.uci/name", { name: "Client number" }, "user-B")]);
  ok("C3.15 fail: an unknown field 404, an empty name 400, a person without the author duty 403", bad.status === 404 && short.status === 400 && notAuthor.status === 403, [bad.status, short.status, notAuthor.status]);
  const sec = sections.find((x) => x.title === "Languages") ?? sections[0];
  r = await call("PATCH", `/library/sections/${sec.key}`, { name: "Languages spoken" });
  const secRow = ((await call("GET", "/library/sections")).body as { key: string; title: string; version: number }[]).find((x) => x.key === sec.key);
  ok("C3.15 pass: an author renames a section directly (a new draft version), the list shows it", r.status === 200 && r.body.status === "DRAFT" && secRow?.title === "Languages spoken", secRow);
  r = await call("PATCH", `/library/sections/${sec.key}`, { name: sections.find((x) => x.key !== sec.key)!.title.toUpperCase() });
  ok("C3.15 fail: another section's title is refused", r.status === 409 && /already a section called/.test(r.body.detail), r.body.detail);
  const added = seedSection(sql, { title: "Seeded section" });
  ok("setup helper: a seeded section waits for a second person, as a proposed one would", sql(`select status from library_change where kind='section' and key='${added}'`) === "WAITING");

  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(1); });
