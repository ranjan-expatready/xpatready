// Acceptance C3.13 (P-220, pack 3): the library lists (fields by section, sections, document types) show where used,
// origin (AI or person) and a worked-out status; with a combination chosen, each row is "Reused" or "New here" with the
// totals (P-37; Screen 04 concept BR-2, BR-3, BR-4, BR-10; contract in its §6). Status: Partial (qa, 1 Nov),
// partly built on main (queue item 2a: used_in labels, raw origin and status, sources); reuse per combination is in open
// PR #289 (GET /library/reuse/:kind), which part BR-4 follows. Missing and tested here: counts that say what they count
// (usedBy), status words including "Waiting for a second person", origin words, the section and status filters, search by
// alias and form code. Rules only, US$0.
// Words beside raw values: status_words and origin_words are added and the raw status and origin kept (the browser suite
// check_studio_browser.cjs reads origin === "AI_PROPOSAL"); the word for IMPORTED_RELEASE ("From a reviewed release", today's
// source line) and the used_in, boxes, forms and placement names are today's, not the concept's: Question for the tech lead.
// The lists keep today's paths (GET /library/fields, /library/sections, /library/document-types) with the concept's query.
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept \
//     && tsx studio/acceptance/C3.13.test.ts 4448 xr_studio_accept
// (setup_visitor_visa.ts loads the suites' fixture first: With an LMIA released, then the Visitor visa configured on top.)
import { randomUUID } from "node:crypto";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose API rows, as in the other checks
const STATUS_WORDS = ["Released", "Draft", "Waiting for a second person", "Retired"];
const statusOf = (r: Row) => String(r.status_words ?? r.status ?? "");
const originOf = (r: Row) => String(r.origin_words ?? r.origin ?? "");
const usedByOk = (r: Row) => r.usedBy && ["forms", "combinations", "sections"].every((k) => Number.isInteger(r.usedBy[k]) && r.usedBy[k] >= 0);
const list = async (kind: string, q = "") => { const r = await call("GET", `/library/${kind}${q ? `?${q}` : ""}`); return { status: r.status, body: r.body, rows: (Array.isArray(r.body) ? r.body : (r.body?.rows ?? [])) as Row[] }; };

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  const ws = sql(`select workspace_id from combination where combination_key = 'vv.single'`);
  if (!vv || !Number(sql(`select count(*) from config_release where combination_id = '${vv}'`))) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (Visitor visa released on the fixture)"); process.exit(2); }

  // BR-2: where used with counts, origin words, worked-out status — on all three lists.
  for (const kind of ["fields", "sections", "document-types"]) {
    const { rows } = await list(kind);
    ok(`C3.13 BR-2 (${kind}): every row says where it is used as counts that say what they count (usedBy: forms, combinations, sections)`, rows.length > 0 && rows.every(usedByOk), rows.find((r) => !usedByOk(r))?.key ?? rows.length);
    ok(`C3.13 BR-2 (${kind}): every row's status is one of Released · Draft · Waiting for a second person · Retired (not a database word)`, rows.length > 0 && rows.every((r) => STATUS_WORDS.includes(statusOf(r))), [...new Set(rows.map(statusOf))]);
    ok(`C3.13 BR-2 (${kind}): every row's origin reads AI or Person (or From a reviewed release), never an enum such as AI_PROPOSAL`, rows.length > 0 && rows.every((r) => /^(AI|Person|From a reviewed release)\b/.test(originOf(r)) && !/_/.test(originOf(r))), [...new Set(rows.map(originOf))]);
  }
  const { rows: fields } = await list("fields");
  const used = fields.find((r) => (r.used_in ?? []).includes("Visitor visa") && (r.boxes ?? 0) > 0);
  const vvForms = Number(sql(`select count(distinct g.form_key) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id join form_edition e on e.gov_form_def_id = g.id join form_field_map m on m.form_edition_id = e.id where m.canonical_field_key = '${used?.key ?? ""}' and f.status <> 'RETIRED'`));
  ok("C3.13 BR-2 pass: a field's form count equals the forms whose field map fills it", used !== undefined && used.usedBy?.forms === vvForms && vvForms > 0, { key: used?.key, usedBy: used?.usedBy, forms: vvForms });

  // Waiting for a second person: a field with an open library change shows it (planted change, as the queue makes one).
  const waitingKey = fields.find((r) => statusOf(r) === "Released" || r.status === "PUBLISHED")?.key;
  if (waitingKey) sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values ('${randomUUID()}', '${ws}', 'field', '${waitingKey}', 'acceptance C3.13', 'RETIRE', 'acceptance C3.13: waiting', 'WAITING', 'user-A')`);
  const w = (await list("fields")).rows.find((r) => r.key === waitingKey);
  ok("C3.13 BR-2 pass: a released field with an open change waiting for the second person reads \"Waiting for a second person\"", statusOf(w ?? {}) === "Waiting for a second person", { key: waitingKey, status: statusOf(w ?? {}) });
  if (waitingKey) sql(`delete from library_change where reason = 'acceptance C3.13: waiting'`);

  // BR-3: grouped by section; search by name, meaning, alias or form code.
  const section = sql(`select section_key from section_question where status = 'PUBLISHED' group by section_key order by count(*) desc limit 1`);
  const inSection = await list("fields", `section=${encodeURIComponent(section)}`);
  ok("C3.13 BR-3 pass: ?section= returns only the fields placed in that section, and all of them", inSection.status === 200 && inSection.rows.length > 0 && inSection.rows.every((r) => r.placement?.section === section) && inSection.rows.length === fields.filter((r) => r.placement?.section === section).length, { section, got: inSection.rows.length });
  const aliasKey = fields.find((r) => r.status === "PUBLISHED" || statusOf(r) === "Released")?.key;
  const alias = `Acceptance alias ${Date.now().toString(36)}`;
  const a = aliasKey ? await call("POST", `/library/fields/${encodeURIComponent(aliasKey)}/aliases`, { alias }) : { status: 0 };
  const byAlias = await list("fields", `q=${encodeURIComponent(alias)}`);
  ok("C3.13 BR-3 pass: search finds a field by one of its aliases", a.status < 300 && byAlias.rows.some((r) => r.key === aliasKey), { status: a.status, found: byAlias.rows.map((r) => r.key) });
  const byCode = await list("fields", `q=${encodeURIComponent("IMM 5707")}`);
  ok("C3.13 BR-3 pass: search by a form code finds the fields that form fills, and only those", byCode.rows.length > 0 && byCode.rows.every((r) => (r.forms ?? []).some((f: string) => /IMM 5707/.test(f))), byCode.rows.length);
  const none = await list("fields", `q=${encodeURIComponent("zz-no-such-thing-zz")}`);
  ok("C3.13 BR-3 fail: a search that matches nothing returns an empty list (200), not an error", none.status === 200 && none.rows.length === 0);

  // BR-4: reuse per combination, with totals — PR #289's route and words (tech lead, #295): GET /library/reuse/:kind
  // ?combination=<id or key> → {combinations, combination, total, reused, new, items: {key: {in_combination, brought_in_by}}}.
  const reuseOf = async (kind: string, combo?: string) => call("GET", `/library/reuse/${kind}${combo ? `?combination=${encodeURIComponent(combo)}` : ""}`);
  const per = await reuseOf("fields", vv);
  const items = (per.body?.items ?? {}) as Record<string, { in_combination: string; brought_in_by: string }>;
  ok("C3.13 BR-4 (#289): with a combination chosen the totals add up (total = reused + new = items marked) and name the combination", per.status === 200 && per.body?.combination?.key === "vv.single" && per.body.total === per.body.reused + per.body.new && per.body.total === Object.keys(items).length && per.body.total > 0, per.status === 200 ? { total: per.body.total, reused: per.body.reused, new: per.body.new } : per.status);
  ok("C3.13 BR-4 (#289): every marked field is REUSED or NEW, says which combination brought it in, and is a field the Visitor visa uses", Object.keys(items).length > 0 && Object.entries(items).every(([k, x]) => ["REUSED", "NEW"].includes(x.in_combination) && !!x.brought_in_by && (fields.find((r) => r.key === k)?.used_in ?? []).includes("Visitor visa")));
  const wpRelease = sql(`select r.snapshot::text from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'wp.family' order by r.version limit 1`);
  const before = new Set<string>(wpRelease ? (JSON.parse(wpRelease).canonical_fields as { id: string }[]).map((f) => f.id) : []);
  const wrong = Object.entries(items).filter(([k, x]) => before.has(k) && x.in_combination !== "REUSED");
  ok("C3.13 BR-4 pass: a field already released on With an LMIA before the Visitor visa used it is \"Reused\" there, brought in by With an LMIA", Object.keys(items).some((k) => before.has(k)) && wrong.length === 0 && Object.entries(items).filter(([k]) => before.has(k)).every(([, x]) => /With an LMIA/.test(x.brought_in_by)), wrong.map(([k]) => k));
  const secPer = await reuseOf("sections", "vv.single"), dtPer = await reuseOf("document-types", vv);
  ok("C3.13 BR-4 (#289): sections and document types answer the same totals for a combination (named by key or id)", [secPer, dtPer].every((x) => x.status === 200 && x.body.total === x.body.reused + x.body.new), [secPer.body?.total, dtPer.body?.total]);
  const offered = await reuseOf("fields");
  ok("C3.13 (#289): without a combination, every combination is offered with how many items it uses", offered.status === 200 && offered.body?.combination === null && (offered.body?.combinations ?? []).some((c: { key: string; uses: number }) => c.key === "vv.single" && c.uses === per.body?.total), offered.status);
  const unknown = await reuseOf("fields", randomUUID()), badKind = await reuseOf("checks-and-more", vv);
  ok("C3.13 BR-4 fail (#289): an unknown combination and an unknown list are 404 in words, not empty figures", unknown.status === 404 && /combination/i.test(words(unknown)) && badKind.status === 404, [unknown.status, badKind.status]);
  const anon = await call("GET", `/library/reuse/fields?combination=${vv}`, undefined, null);
  ok("C3.13 fail (QA-65): a request naming no person is 401", anon.status === 401, anon.status);

  // BR-10: retired items show only under "Retired".
  // A retired field used nowhere (planted as the library stores one: its newest version RETIRED), so the rule is tested
  // without the retire flow of C11.9.
  const retiredKey = `person.acceptance_retired_${Date.now().toString(36)}`;
  sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) values ('${randomUUID()}', '${ws}', '${retiredKey}', 1, 'RETIRED', 'Acceptance probe: a retired field', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', 'Acceptance retired probe')`);
  const def = (await list("fields")).rows.map((r) => r.key), ret = await list("fields", "status=retired");
  ok("C3.13 BR-10 pass: a retired field is not in the default list but is under ?status=retired, reading Retired", !def.includes(retiredKey) && ret.rows.some((r) => r.key === retiredKey && statusOf(r) === "Retired"), { retiredKey, underRetired: ret.rows.length });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
