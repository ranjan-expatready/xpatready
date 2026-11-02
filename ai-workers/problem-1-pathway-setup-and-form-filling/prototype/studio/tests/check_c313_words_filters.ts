// C3.13 (forms lane; Screen 04 BR-2, BR-3, BR-10, contract §6): the library lists' counts that say what they count
// (usedBy), the status and origin in words beside the raw values, and the list filters (?q= by name, meaning, alias or
// form code; ?section=, ?status=, ?origin=). A passing and a failing case per rule, beyond the acceptance pack, through the
// API on an isolated copy with the sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh c313_words 4475 start && tsx studio/tests/check_c313_words_filters.ts 4475 xr_studio_c313_words
import { randomUUID } from "node:crypto";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4475), DB = process.argv[3] ?? "xr_studio_c313_words";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose API rows, as in the other checks
const list = async (kind: string, q = "") => { const r = await call("GET", `/library/${kind}${q ? `?${q}` : ""}`); return { status: r.status, body: r.body, rows: (Array.isArray(r.body) ? r.body : []) as Row[] }; };
const keys = (rows: Row[]) => new Set(rows.map((r) => r.key));

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const ws = sql(`select id from workspace limit 1`);
  const fields = (await list("fields")).rows;

  // ─────────────────── BR-2: usedBy says what it counts, on all three lists
  const withForms = fields.find((r) => r.forms.length > 1) ?? fields.find((r) => r.forms.length > 0)!;
  ok("BR-2 pass: a field's forms count is the number of forms its row lists (one reading for the list and the count)", fields.every((r) => r.usedBy.forms === new Set(r.forms).size) && withForms.usedBy.forms > 0, { key: withForms.key, forms: withForms.forms, usedBy: withForms.usedBy });
  const sectionsSql = (key: string) => Number(sql(`select count(distinct q.section_key) from section_question q where q.canonical_field_key = '${key}' and q.status in ('PUBLISHED','DRAFT') and q.version = (select max(version) from section_question x where x.workspace_id = q.workspace_id and x.lineage_key = q.lineage_key)`));
  const placed = fields.find((r) => r.placement)!;
  ok("BR-2 pass: a placed field's sections count is the sections whose current questions ask it", placed.usedBy.sections === sectionsSql(placed.key) && placed.usedBy.sections > 0, { key: placed.key, usedBy: placed.usedBy });
  const unplaced = fields.find((r) => !r.placement && sectionsSql(r.key) === 0);
  ok("BR-2 fail: a field no section asks counts 0 sections (never a guess)", !unplaced || unplaced.usedBy.sections === 0, unplaced?.usedBy);
  ok("BR-2 pass: a field's combinations count equals its where-used combinations", fields.every((r) => r.usedBy.combinations === r.used_in.length), fields.find((r) => r.usedBy.combinations !== r.used_in.length)?.key);
  const sections = (await list("sections")).rows;
  const sec = sections.find((s) => s.questions > 0 && s.usedBy.forms > 0);
  const secForms = sec ? new Set(fields.filter((f) => f.placement?.section === sec.key).flatMap((f) => f.forms)) : new Set();
  ok("BR-2 pass: a section's forms count is the forms that fill a field it asks; it holds no section (0)", !!sec && sec.usedBy.forms === secForms.size && sections.every((s) => s.usedBy.sections === 0), sec ? { key: sec.key, usedBy: sec.usedBy, forms: [...secForms] } : null);
  ok("BR-2 pass: a section's combinations count is the combinations that choose it (today's column)", sections.every((s) => s.usedBy.combinations === s.combinations), sections.find((s) => s.usedBy.combinations !== s.combinations)?.key);
  const types = (await list("document-types")).rows;
  ok("BR-2 pass: a document type counts the combinations using it; no form fills it and no section holds it (0, 0)", types.length > 0 && types.every((t) => t.usedBy.forms === 0 && t.usedBy.sections === 0 && t.usedBy.combinations === t.used_in.length), types.find((t) => t.usedBy.combinations !== t.used_in.length)?.documentTypeKey);

  // ─────────────────── BR-2: status and origin in words; the raw values kept
  ok("BR-2 pass: the raw status and origin stay beside the words (screens read origin === \"AI_PROPOSAL\")", fields.every((r) => typeof r.status === "string" && typeof r.origin === "string" && typeof r.status_words === "string" && typeof r.origin_words === "string"));
  const ai = fields.find((r) => r.origin === "AI_PROPOSAL"), rel = fields.find((r) => r.origin === "IMPORTED_RELEASE");
  ok("BR-2 pass: the sample's release reads \"From a reviewed release\" (never IMPORTED_RELEASE)", (!ai || ai.origin_words.startsWith("AI ·")) && rel?.origin_words === "From a reviewed release", [ai?.origin_words, rel?.origin_words]);
  const draftKey = `person.c313_draft_${Date.now().toString(36)}`;
  sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) values ('${randomUUID()}', '${ws}', '${draftKey}', 1, 'DRAFT', 'Check C3.13: a draft field', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', 'C3.13 draft probe')`);
  let d = (await list("fields")).rows.find((r) => r.key === draftKey);
  ok("BR-2 pass: a never-released field with no open change reads Draft, made by a Person", d?.status_words === "Draft" && d?.origin_words === "Person", [d?.status_words, d?.origin_words]);
  const change = randomUUID();
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values ('${change}', '${ws}', 'field', '${draftKey}', 'C3.13 draft probe', 'ADD', 'check C3.13: waiting', 'WAITING', 'user-A')`);
  d = (await list("fields")).rows.find((r) => r.key === draftKey);
  ok("BR-2 pass: its addition waiting for the second person reads \"Waiting for a second person\"", d?.status_words === "Waiting for a second person", d?.status_words);
  sql(`update library_change set status = 'RETURNED' where id = '${change}'`);
  d = (await list("fields")).rows.find((r) => r.key === draftKey);
  ok("BR-2 fail: a change returned to its author is not waiting for anyone: the row reads its own state (Draft)", d?.status_words === "Draft", d?.status_words);
  const draftsNow = await list("fields", "status=draft");
  ok("pass: status=draft lists the draft field and only Draft rows", keys(draftsNow.rows).has(draftKey) && draftsNow.rows.every((r) => r.status_words === "Draft"), draftsNow.rows.length);
  sql(`update library_change set status = 'WAITING' where id = '${change}'`);

  // ─────────────────── ?status= and ?origin= (BR-10: retired only under Retired)
  const retiredKey = `person.c313_retired_${Date.now().toString(36)}`;
  sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) values ('${randomUUID()}', '${ws}', '${retiredKey}', 1, 'RETIRED', 'Check C3.13: a retired field', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'AI_PROPOSAL', 'user-A', 'C3.13 retired probe')`);
  const def = keys((await list("fields")).rows), all = await list("fields", "status=all"), retired = await list("fields", "status=retired"), only = await list("fields", "retired=only");
  ok("BR-10 pass: the default list leaves a retired field out; status=all and status=retired list it", !def.has(retiredKey) && keys(all.rows).has(retiredKey) && retired.rows.every((r) => r.retired && r.status_words === "Retired") && keys(retired.rows).has(retiredKey), { all: all.rows.length, retired: retired.rows.length });
  const r0 = retired.rows.find((r) => r.key === retiredKey);
  ok("BR-2 pass: an AI-made item reads \"AI · …\" and keeps its raw origin; retired reads Retired", r0?.origin === "AI_PROPOSAL" && /^AI · /.test(r0?.origin_words) && r0?.status_words === "Retired", [r0?.origin_words, r0?.status_words]);
  ok("pass: origin=ai with status=all finds the AI-made retired field; origin=person does not", keys((await list("fields", "status=all&origin=ai")).rows).has(retiredKey) && !keys((await list("fields", "status=all&origin=person")).rows).has(retiredKey));
  ok("BR-10 pass: C11.9's retired=only still answers the same retired list", [...keys(only.rows)].sort().join() === [...keys(retired.rows)].sort().join(), [only.rows.length, retired.rows.length]);
  const waiting = await list("fields", "status=waiting"), drafts = await list("fields", "status=draft"), released = await list("fields", "status=released");
  ok("pass: status=waiting lists exactly the rows waiting for a second person", keys(waiting.rows).has(draftKey) && waiting.rows.every((r) => r.status_words === "Waiting for a second person"), waiting.rows.length);
  ok("pass: status=released and status=draft list only rows with that status, and none retired", released.rows.length > 0 && released.rows.every((r) => r.status_words === "Released" && !r.retired) && drafts.rows.every((r) => r.status_words === "Draft") && !keys(released.rows).has(draftKey), [released.rows.length, drafts.rows.length]);
  const badStatus = await list("fields", "status=PUBLISHED");
  ok("fail: an unknown status is 400 in words that name the choices, not an empty list", badStatus.status === 400 && /released, draft, waiting, retired or all/.test(String(badStatus.body?.detail)), [badStatus.status, badStatus.body?.detail]);
  const byOrigin = await list("fields", "origin=release"), byAi = await list("fields", "origin=ai");
  ok("pass: origin=release lists only the sample release's items; origin=ai only AI-made ones", byOrigin.rows.length > 0 && byOrigin.rows.every((r) => r.origin === "IMPORTED_RELEASE") && byAi.rows.every((r) => r.origin_words.startsWith("AI")), [byOrigin.rows.length, byAi.rows.length]);
  const badOrigin = await list("fields", "origin=AI_PROPOSAL");
  ok("fail: an unknown origin is 400 in words (ai, person or release)", badOrigin.status === 400 && /ai, person or release/.test(String(badOrigin.body?.detail)), badOrigin.status);

  // ─────────────────── BR-3: search by name, meaning, alias or form code; ?section=
  const form = withForms.forms[0] as string;
  const spaced = await list("fields", `q=${encodeURIComponent(form)}`), tight = await list("fields", `q=${encodeURIComponent(form.replace(/\s+/g, "").toLowerCase())}`);
  ok("BR-3 pass: a form code finds the same fields typed with or without its space, in any case", spaced.rows.length > 0 && spaced.rows.every((r) => r.forms.includes(form)) && [...keys(spaced.rows)].sort().join() === [...keys(tight.rows)].sort().join(), { form, spaced: spaced.rows.length, tight: tight.rows.length });
  const aliasKey = released.rows[0].key, alias = `Check alias ${Date.now().toString(36)}`;
  const a = await call("POST", `/library/fields/${encodeURIComponent(aliasKey)}/aliases`, { alias });
  const byAlias = await list("fields", `q=${encodeURIComponent(alias.toUpperCase())}`);
  ok("BR-3 pass: an alias finds its field whatever the case typed", a.status < 300 && byAlias.rows.length === 1 && byAlias.rows[0].key === aliasKey && byAlias.rows[0].aliases.includes(alias), { status: a.status, found: byAlias.rows.map((r) => r.key) });
  const byName = await list("fields", `q=${encodeURIComponent("C3.13 draft probe")}`);
  ok("BR-3 pass: a field's name (label) finds it", keys(byName.rows).has(draftKey), byName.rows.length);
  const retiredSearch = await list("fields", `q=${encodeURIComponent("C3.13 retired probe")}`);
  ok("BR-3 fail: the default search does not bring back a retired field (only status=retired does)", retiredSearch.status === 200 && !keys(retiredSearch.rows).has(retiredKey) && keys((await list("fields", `status=retired&q=${encodeURIComponent("C3.13 retired probe")}`)).rows).has(retiredKey));
  const noSection = await list("fields", "section=no_such_section");
  ok("BR-3 fail: an unknown section lists nothing (200, empty)", noSection.status === 200 && noSection.rows.length === 0, noSection.status);

  sql(`delete from library_change where id = '${change}'`);
  sql(`delete from canonical_field where canonical_field_key in ('${draftKey}', '${retiredKey}')`);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
