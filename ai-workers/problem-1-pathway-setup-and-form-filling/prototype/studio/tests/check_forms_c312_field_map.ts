// F2 C3.12 (forms lane; P-123, P-32): the Forms list (Shared library › Forms) shows each form's field map on its current
// edition: "Not mapped yet", "N of T form fields decided", "… · waits for review" or "Complete · T form fields"; a guide or
// checklist "No field map", a form with no usable edition "No edition yet". The pure rule (contracts/form-library.ts
// fieldMapState) with a pass and a fail per rule, then the API on the sample against the database's own rows. US$0 (one
// saved AI answer replayed, no model call).
// C3.12 published date (FormEdition.published, migration 20261101150000): each edition shows the date its own file says it
// was published (not the printed edition), a file with no date says so, an older edition keeps its own date, and editions
// made before the column are read once and kept. A pass and a fail per rule, against the database's own column.
//   zsh studio/tools/isolated.sh forms_c312 4450 start && tsx studio/tests/check_forms_c312_field_map.ts 4450 xr_studio_forms_c312
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fieldMapState } from "../contracts/form-library.ts";
import { publishedOf } from "../engine/published-date.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_c312";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
type Fm = { kind: string; decided: number; total: number; words: string; tip: string };
type Row = { code: string; type: string; edition: string | null; field_map: Fm };

(async () => {
  // ── the rule, pure
  const m = (outcome: string, status = "PUBLISHED") => ({ outcome, status });
  ok("C3.12 rule pass: a guide or a checklist is read by AI, never filled: 'No field map', whatever rows it has", fieldMapState("guide", true, [m("mapped")]).kind === "not_filled" && fieldMapState("checklist", true, []).words === "No field map");
  ok("C3.12 rule fail: a form is never 'No field map'", fieldMapState("form", true, []).kind !== "not_filled");
  ok("C3.12 rule pass: a form with no usable edition has nothing to map: 'No edition yet'", fieldMapState("form", false, []).words === "No edition yet");
  ok("C3.12 rule fail: a form with an edition is never 'No edition yet'", fieldMapState("form", true, [m("mapped")]).kind !== "no_edition");
  ok("C3.12 rule pass: an edition with no field-map rows: 'Not mapped yet'", fieldMapState("form", true, []).words === "Not mapped yet");
  ok("C3.12 rule fail: retired or superseded rows do not count as mapped", fieldMapState("form", true, [m("mapped", "RETIRED"), m("mapped", "SUPERSEDED")]).kind === "none");
  const und = fieldMapState("form", true, [m("mapped"), m("not_a_fact", "DRAFT"), m("unresolved", "DRAFT")]);
  ok("C3.12 rule pass: a form field with no decision: '2 of 3 form fields decided'", und.kind === "undecided" && und.words === "2 of 3 form fields decided" && und.decided === 2 && und.total === 3, und);
  ok("C3.12 rule fail: an unresolved form field carried in a published map still keeps the map from Complete", fieldMapState("form", true, [m("mapped"), m("unresolved")]).kind === "undecided");
  // Review (b6d8b50b) M1: where an open form field is decided: To review only for one still in a draft.
  const carried = fieldMapState("form", true, [m("mapped"), m("unresolved"), m("unresolved")]);
  ok("C3.12 review M1 pass: form fields carried from an earlier release are said to be decided when the edition is drafted again, not on To review", /2 form fields come from an earlier release/.test(carried.tip) && /drafted again \(Redo with AI in the form's ⋯ menu/.test(carried.tip) && !/Draft with AI/.test(carried.tip) && !/To review/.test(carried.tip) && /^Each form field needs a decision/.test(carried.tip), carried.tip);
  const onRev = fieldMapState("form", true, [m("mapped"), m("unresolved", "DRAFT")]);
  ok("C3.12 review M1 pass: a form field still in a draft waits on To review", /1 form field waits for a decision on To review\./.test(onRev.tip) && !/earlier release/.test(onRev.tip), onRev.tip);
  const both = fieldMapState("form", true, [m("unresolved", "DRAFT"), m("unresolved")]);
  ok("C3.12 review M1 fail: a mix names both places, each with its own count", /1 form field waits for a decision on To review/.test(both.tip) && /1 form field comes from an earlier release/.test(both.tip), both.tip);
  const wait = fieldMapState("form", true, [m("mapped"), m("not_a_fact", "DRAFT")]);
  ok("C3.12 rule pass: every form field decided but a draft waits: '2 of 2 form fields · waits for review'", wait.kind === "waiting" && wait.words === "2 of 2 form fields · waits for review", wait);
  const done = fieldMapState("form", true, [m("mapped"), m("not_a_fact")]);
  ok("C3.12 rule pass: every form field decided and approved: 'Complete · 2 form fields'", done.kind === "complete" && done.words === "Complete · 2 form fields", done);
  const prop = fieldMapState("form", true, [], 3);
  ok("C3.12 rule pass: AI proposals waiting on To review, nothing mapped yet: 'AI draft · 3 to review'", prop.kind === "proposed" && prop.words === "AI draft · 3 to review", prop);
  ok("C3.12 rule fail: a decided, approved map with one AI proposal waiting is not 'Complete'", fieldMapState("form", true, [m("mapped"), m("not_a_fact")], 1).kind === "waiting");
  ok("C3.12 rule fail: AI proposals never make a guide 'proposed'", fieldMapState("guide", true, [], 4).kind === "not_filled");
  ok("C3.12 rule fail: one form field is said in the singular", fieldMapState("form", true, [m("mapped")]).words === "Complete · 1 form field");

  // ── C3.12 published: the pure rule for what the column says (break 456fb7d0 M2, m1)
  ok("C3.12 published rule pass: a real date is shown as the date", publishedOf("2022-12-06").published === "2022-12-06" && publishedOf("2022-12-06").published_state === "date");
  ok("C3.12 break M2 fail: not read yet (null) says 'unread', never 'no date in the file'", publishedOf(null).published === null && publishedOf(null).published_state === "unread");
  ok("C3.12 break M2 fail: a file that could not be read ('?') says 'unreadable'", publishedOf("?").published_state === "unreadable");
  ok("C3.12 published rule pass: a PDF that names no date ('') says 'none'", publishedOf("").published_state === "none");
  ok("C3.12 break m1 fail: impossible or far dates are never shown (2023-02-30, 0000-00-00, 2099-12-31)", ["2023-02-30", "0000-00-00", "2099-12-31", "9999-13-99"].every((v) => publishedOf(v).published === null));

  // ── the API on the sample (US$0)
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  const list = async (actor = "user-A") => ((await call("GET", "/library/forms/list", undefined, actor)).body.rows as Row[]);
  let rows = await list();
  ok("C3.12 API pass: every row of the Forms list carries its field map in words", rows.length > 0 && rows.every((r) => typeof r.field_map?.words === "string" && r.field_map.words.length > 0), rows.find((r) => !r.field_map));
  ok("C3.12 API pass: guides and checklists say 'No field map'", rows.filter((r) => r.type !== "form").every((r) => r.field_map.kind === "not_filled") && rows.some((r) => r.type !== "form"));
  ok("C3.12 API pass: a form with no usable edition says 'No edition yet'", rows.filter((r) => r.type === "form" && !r.edition).every((r) => r.field_map.kind === "no_edition"));
  // The database's own count for each form's current edition (newest row per form field, draft first) equals the list's.
  const countOf = (edition: string) => {
    const out = sql(`with e as (select id from form_edition where edition_label = '${edition.replace(/'/g, "''")}'), r as (select distinct on (data_path) data_path, status, outcome from form_field_map where form_edition_id in (select id from e) order by data_path, (status = 'DRAFT') desc, (status in ('PUBLISHED','RETIRED')) desc, version desc) select count(*) filter (where status not in ('RETIRED','SUPERSEDED')), count(*) filter (where status not in ('RETIRED','SUPERSEDED') and outcome <> 'unresolved') from r`);
    const [t, d] = out.split("|").map(Number); return { total: t, decided: d };
  };
  const mapped = rows.filter((r) => r.type === "form" && r.edition);
  const wrong = mapped.filter((r) => { const c = countOf(r.edition!); return c.total !== r.field_map.total || c.decided !== r.field_map.decided; }).map((r) => ({ code: r.code, list: r.field_map, db: countOf(r.edition!) }));
  ok("C3.12 API pass: each form's count is the database's (its current edition's form fields, the newest row per field)", mapped.length > 0 && wrong.length === 0, wrong);
  ok("C3.12 API pass: the sample has at least one form with a field map (the column is not empty everywhere)", mapped.some((r) => r.field_map.total > 0), mapped.map((r) => [r.code, r.field_map.words]));
  const asReviewer = await list("user-C");
  ok("C3.12 API pass: a reader without the author duty sees the same field map words", asReviewer.length === rows.length && asReviewer.every((r) => rows.find((x) => x.code === r.code)?.field_map.words === r.field_map.words));

  // A replayed AI draft (the sample's saved answer is for IMM 5257 (06-2018), an older edition than the library's current one).
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = ((await call("GET", `/combinations/${sv}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const before = rows.find((r) => r.code === "IMM 5257")!;
  const saved = att ? (((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []) as { valid: boolean; file: string }[]).find((x) => x.valid) : undefined;
  ok("C3.12 API: the sample's IMM 5257 has a saved AI answer to replay", !!att && !!saved, { att, saved });
  if (att && saved) {
    await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: saved.file });
    for (let i = 0; i < 150 && Number(sql("select count(*) from proposal_item where status = 'waiting' and step = 'field_map'")) === 0; i++) await new Promise((x) => setTimeout(x, 400));
    const on = sql("select form_edition from proposal_item where status = 'waiting' and step = 'field_map' limit 1");
    rows = await list();
    const same = rows.find((r) => r.code === "IMM 5257")!;
    ok("C3.12 API fail: AI proposals for another edition (" + on + ") do not move the current edition's (" + before.edition + ") field map", on !== before.edition && same.field_map.words === before.field_map.words, { on, before: before.field_map, after: same.field_map });
    // Test input: the same proposals as if drafted on the current edition (copied rows; the saved answer is for 06-2018).
    const n = Number(sql(`with c as (insert into proposal_item (id, workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key, status, basis) select gen_random_uuid(), workspace_id, kind, run_id, step, '${before.edition}', combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key || '#c312', status, basis from proposal_item where status = 'waiting' and step = 'field_map' and form_edition = '${on}' returning 1) select count(*) from c`));
    rows = await list();
    const after = rows.find((r) => r.code === "IMM 5257")!.field_map;
    ok(`C3.12 API pass: ${n} AI proposals waiting for the current edition, nothing mapped yet: 'AI draft · ${n} to review'`, n > 0 && after.kind === "proposed" && after.words === `AI draft · ${n} to review`, { n, after });
    // The same proposals on a form whose map is complete keep it from 'Complete' (IMM 5257 SCH1 here has unresolved fields; use any complete one if the sample has one).
    const full = rows.find((r) => r.field_map.kind === "complete");
    if (full) {
      sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key, status, basis) select gen_random_uuid(), workspace_id, kind, run_id, step, '${full.edition}', combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key || '#c312b', status, basis from proposal_item where status = 'waiting' and step = 'field_map' and form_edition = '${on}' limit 1`);
      const now = (await list()).find((r) => r.code === full.code)!.field_map;
      ok("C3.12 API fail: a complete field map with an AI proposal waiting is no longer 'Complete' (waits for review)", now.kind === "waiting", now);
    }
  }

  // ── C3.12 published date: the date the file says it was published (FormEdition.published), US$0 (rules, no AI)
  type Pub = Row & { published: string | null; published_state: string; older_editions: { label: string; published: string | null; published_state: string }[] };
  const pubRows = async () => (await call("GET", "/library/forms/list")).body.rows as Pub[];
  let pr = await pubRows();
  const r1295 = pr.find((r) => r.code === "IMM 1295")!, r5707 = pr.find((r) => r.code === "IMM 5707")!;
  ok("C3.12 published pass: a sample form shows the date its file gives (IMM 1295: 2026-06-04), the same as the column", r1295.published === "2026-06-04" && sql("select published from form_edition where edition_label = 'IMM 1295 (09-2023)'") === "2026-06-04", r1295.published);
  ok("C3.12 published fail: the published date is not the printed edition (IMM 5707 is edition 01-2023, published 2025-04-11)", r5707.edition === "IMM 5707 (01-2023)" && r5707.published === "2025-04-11", [r5707.edition, r5707.published]);
  ok("C3.12 published pass: every form edition made before the column was read once and kept (no row left unread)", sql("select count(*) from form_edition where published is null and channel = 'PDF'") === "0");
  ok("C3.12 published fail: a guide with no date in its page is kept as read with no date (''), shown as none", sql("select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_kind = 'guide' and e.published = ''") !== "0" && pr.filter((r) => r.type === "guide").every((r) => r.published === null));
  // An uploaded PDF (door 2, the intake): its date is set when it is added, from the reader that already read its identity.
  const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, "forms", "imm5604e.pdf")))], { type: "application/pdf" }), "imm5604e.pdf");
  const up = await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { results?: { outcome: string; edition: string | null }[] };
  const added = up.results?.[0];
  ok("C3.12 published pass: an uploaded PDF keeps the date its file gives the moment it is added (IMM 5604: 2023-02-27)", !!added?.edition && sql(`select published from form_edition where edition_label = '${added.edition}'`) === "2023-02-27", { added, col: added?.edition ? sql(`select coalesce(published, 'NULL') from form_edition where edition_label = '${added.edition}'`) : null });
  pr = await pubRows();
  ok("C3.12 published pass: the Forms list shows the uploaded form's date", pr.find((r) => r.code === "IMM 5604")?.published === "2023-02-27", pr.find((r) => r.code === "IMM 5604"));
  // A file that names no date: kept as '' (read), shown as none, and not read again on the next list.
  sql("update form_edition set published = '' where edition_label = 'IMM 5409 (01-2023)'");
  pr = await pubRows();
  ok("C3.12 published pass: a file that names no date is shown as none (the page says 'Date not in the file')", pr.find((r) => r.code === "IMM 5409")?.published === null, pr.find((r) => r.code === "IMM 5409")?.published);
  ok("C3.12 published fail: a file read once with no date is not read again on every list (stays '')", sql("select published from form_edition where edition_label = 'IMM 5409 (01-2023)'") === "");
  sql("update form_edition set published = 'not a date' where edition_label = 'IMM 5475 (05-2021)'");
  ok("C3.12 published fail: anything but a YYYY-MM-DD date is never shown as a date", (await pubRows()).find((r) => r.code === "IMM 5475")?.published === null);
  sql("update form_edition set published = '9999-13-99' where edition_label = 'IMM 5475 (05-2021)'");
  ok("C3.12 break m1 fail: an impossible date (9999-13-99) from a file's clock is never shown as a date", (await pubRows()).find((r) => r.code === "IMM 5475")?.published === null);
  sql("update form_edition set published = '?' where edition_label = 'IMM 5475 (05-2021)'");
  const unreadable = (await pubRows()).find((r) => r.code === "IMM 5475")!;
  ok("C3.12 break M2 fail: a file that could not be read says so ('unreadable'), never 'no date in the file'", unreadable.published === null && unreadable.published_state === "unreadable" && sql("select published from form_edition where edition_label = 'IMM 5475 (05-2021)'") === "?", unreadable.published_state);
  ok("C3.12 break M2 pass: a file with no date says 'none', one with a date 'date'", pr.find((r) => r.code === "IMM 5409")?.published_state === "none" && pr.find((r) => r.code === "IMM 1295")?.published_state === "date");
  // An older edition keeps its own date (test input: IMM 5257's committed previous edition joins as an earlier edition,
  // unread, the way rows made before the column are).
  const ws = sql("select workspace_id from form_edition where edition_label = 'IMM 5257 (09-2023)'"), def = sql("select gov_form_def_id from form_edition where edition_label = 'IMM 5257 (09-2023)'");
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, official_file, sha256) values (gen_random_uuid(), '${ws}', '${def}', 'IMM 5257 (06-2018)', 'imm5257e-pre-2023.pdf', 'd512ef649902eadc400c667cf6ad41bba0d905e2a54245a339be6c25a2d80f11')`);
  pr = await pubRows();
  const v = pr.find((r) => r.code === "IMM 5257")!, older = v.older_editions.find((e) => e.label === "IMM 5257 (06-2018)");
  ok("C3.12 published pass: an older edition shows its own file's date (IMM 5257 (06-2018): 2019-04-18), read once and kept", older?.published === "2019-04-18" && sql("select published from form_edition where edition_label = 'IMM 5257 (06-2018)'") === "2019-04-18", v.older_editions);
  ok("C3.12 published fail: the current edition keeps its own date, not the older one's", v.edition === "IMM 5257 (09-2023)" && v.published === "2026-06-04", [v.edition, v.published]);
  // A file not on disk is left unread (null), never marked as having no date.
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, stored_path) values (gen_random_uuid(), '${ws}', '${def}', 'IMM 5257 (01-2017)', 'var/nowhere/missing.pdf')`);
  await pubRows();
  ok("C3.12 published fail: a file missing from disk stays unread (null, tried again later), never '' (no date)", sql("select coalesce(published, 'NULL') from form_edition where edition_label = 'IMM 5257 (01-2017)'") === "NULL");
  // Break M1: a stored file that never answers (a pipe) is not read at all, the list answers at once, and the other
  // unread files are still read (test input: a FIFO under this copy's own var folder, and an unread edition beside it).
  const fifoDir = join(import.meta.dirname, "..", "var", "c312-fifo"); rmSync(fifoDir, { recursive: true, force: true }); mkdirSync(fifoDir, { recursive: true });
  execSync(`mkfifo ${join(fifoDir, "never.pdf")}`);
  const rel = join(fifoDir, "never.pdf").replace(join(import.meta.dirname, "..", "..", "..", "..", "..") + "/", "");
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, stored_path, sha256) values (gen_random_uuid(), '${ws}', '${def}', 'IMM 5257 (02-2016)', '${rel}', 'fifo')`);
  sql("update form_edition set published = null where edition_label = 'IMM 5257 (06-2018)'");
  const t0 = Date.now(); await pubRows(); const took = Date.now() - t0;
  ok("C3.12 break M1 fail: a stored file that never answers (a pipe) does not stall the Forms list (under 4 s)", took < 4000, `${took} ms`);
  ok("C3.12 break M1 fail: the pipe is left unread (null) and the edition beside it is still read (2019-04-18)", sql("select coalesce(published, 'NULL') from form_edition where edition_label = 'IMM 5257 (02-2016)'") === "NULL" && sql("select published from form_edition where edition_label = 'IMM 5257 (06-2018)'") === "2019-04-18");
  rmSync(fifoDir, { recursive: true, force: true });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
