// F2 C3.12 (forms lane; P-123, P-32): the Forms list (Shared library › Forms) shows each form's field map on its current
// edition: "Not mapped yet", "N of T form fields decided", "… · waits for review" or "Complete · T form fields"; a guide or
// checklist "No field map", a form with no usable edition "No edition yet". The pure rule (contracts/form-library.ts
// fieldMapState) with a pass and a fail per rule, then the API on the sample against the database's own rows. US$0 (one
// saved AI answer replayed, no model call).
// C3.12 dates. K3 (QA-148, AGENTS rule 4): "Published" is IRCC's month for the edition, printed on the form, else its
// canada.ca page's Last updated (engine/library-index.ts fileMonth), never the PDF's own date. The file's own date
// (FormEdition.published, migration 20261101150000, #313) is kept and shown apart as "File saved": a file with no date
// says so, an older edition keeps its own, and editions made before the column are read once and kept. A pass and a fail
// per rule, against the database's own column.
//   zsh studio/tools/isolated.sh forms_c312 4450 start && tsx studio/tests/check_forms_c312_field_map.ts 4450 xr_studio_forms_c312
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fieldMapState } from "../contracts/form-library.ts";
import { ircPublished, publishedOf } from "../engine/published-date.ts";

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
  ok("C3.12 K3 rule pass: the month printed on the form is IRCC's published month", JSON.stringify(ircPublished({ editionLabel: "IMM 5476 (11-2025)", canadaUpdated: "2025-11" })) === JSON.stringify({ published: "2025-11", published_from: "printed", published_state: "date" }));
  ok("C3.12 K3 rule pass: with no month printed in the label, canada.ca's Last updated month is used and named as such", JSON.stringify(ircPublished({ editionLabel: "IMM 5802", canadaUpdated: "2024-03" })) === JSON.stringify({ published: "2024-03", published_from: "canada_page", published_state: "date" }));
  ok("C3.12 K3 rule fail: a page edited later never makes an old file read as new (printed 05-2021 wins over a 2025-09 page)", ircPublished({ editionLabel: "IMM 5475 (05-2021)", canadaUpdated: "2025-09" }).published === "2021-05");
  ok("C3.12 K3 rule fail: with neither, nothing is guessed (none)", JSON.stringify(ircPublished({ editionLabel: "Guide 5256 (read 2026-11-02)", canadaUpdated: null })) === JSON.stringify({ published: null, published_from: null, published_state: "none" }));

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

  // A replayed AI draft: the sample's saved answer (21 Oct, prompt v1) misread the edition as IMM 5257 (06-2018); since D3 its
  // proposals carry the file's edition (09-2023), the library's current one (the edition is a fact of the file, p2/convert.ts).
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = ((await call("GET", `/combinations/${sv}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const before = rows.find((r) => r.code === "IMM 5257")!;
  const saved = att ? (((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []) as { valid: boolean; file: string }[]).find((x) => x.valid) : undefined;
  ok("C3.12 API: the sample's IMM 5257 has a saved AI answer to replay", !!att && !!saved, { att, saved });
  if (att && saved) {
    await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: saved.file });
    for (let i = 0; i < 150 && Number(sql("select count(*) from proposal_item where status = 'waiting' and step = 'field_map'")) === 0; i++) await new Promise((x) => setTimeout(x, 400));
    const on = sql("select string_agg(distinct form_edition, ',') from proposal_item where status = 'waiting' and step = 'field_map'");
    const n = Number(sql("select count(*) from proposal_item where status = 'waiting' and step = 'field_map'"));
    rows = await list();
    const after = rows.find((r) => r.code === "IMM 5257")!.field_map;
    ok(`C3.12 API pass (D3): the ${n} replayed AI proposals land on the file's edition (${on}), the current one: 'AI draft · ${n} to review', nothing mapped yet`, n > 0 && on === before.edition && after.kind === "proposed" && after.words === `AI draft · ${n} to review`, { on, n, after });
    // Test input: the same proposals labelled with another edition do not move the current edition's field map.
    sql(`update proposal_item set form_edition = 'IMM 5257 (06-2018)' where status = 'waiting' and step = 'field_map' and form_edition = '${on}'`);
    const same = (await list()).find((r) => r.code === "IMM 5257")!;
    ok("C3.12 API fail: AI proposals for another edition (IMM 5257 (06-2018)) do not move the current edition's (" + before.edition + ") field map", same.field_map.words === before.field_map.words, { before: before.field_map, after: same.field_map });
    sql(`update proposal_item set form_edition = '${on}' where status = 'waiting' and step = 'field_map' and form_edition = 'IMM 5257 (06-2018)'`);
    rows = await list();
    // The same proposals on a form whose map is complete keep it from 'Complete' (IMM 5257 SCH1 here has unresolved fields; use any complete one if the sample has one).
    const full = rows.find((r) => r.field_map.kind === "complete");
    if (full) {
      sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key, status, basis) select gen_random_uuid(), workspace_id, kind, run_id, step, '${full.edition}', combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, reason, origin, identity, identity_key || '#c312b', status, basis from proposal_item where status = 'waiting' and step = 'field_map' and form_edition = '${on}' limit 1`);
      const now = (await list()).find((r) => r.code === full.code)!.field_map;
      ok("C3.12 API fail: a complete field map with an AI proposal waiting is no longer 'Complete' (waits for review)", now.kind === "waiting", now);
    }
  }

  // ── C3.12 the file's own date (FormEdition.published, #313), now shown apart as "File saved" (K3, QA-148), US$0
  type Pub = Row & { published: string | null; published_from: string | null; published_state: string; file_date: string | null; file_date_state: string; older_editions: { label: string; published: string | null; published_from: string | null; file_date: string | null; file_date_state: string }[] };
  const pubRows = async () => (await call("GET", "/library/forms/list")).body.rows as Pub[];
  let pr = await pubRows();
  const r1295 = pr.find((r) => r.code === "IMM 1295")!, r5707 = pr.find((r) => r.code === "IMM 5707")!;
  // K3 (QA-148; pack C3.12 AT-3; AGENTS rule 4): "Published" is IRCC's month, printed on the form, else canada.ca's page.
  ok("C3.12 K3 pass: Published is the month printed on the form (IMM 1295 (09-2023): 2023-09, printed), never its file's date", r1295.published === "2023-09" && r1295.published_from === "printed" && r1295.file_date === "2026-06-04", [r1295.published, r1295.published_from, r1295.file_date]);
  ok("C3.12 K3 fail: a file saved long after its edition (IMM 5707: 2025-04-11) never reads as published then", r5707.published === "2023-01" && r5707.published !== r5707.file_date?.slice(0, 7), [r5707.published, r5707.file_date]);
  const chk = pr.find((r) => r.code === "IMM 5488")!;
  ok("C3.12 K3 pass: a checklist whose canada.ca copy has no Last updated still shows its printed edition month (IMM 5488: 2024-10)", chk.published === "2024-10" && chk.published_from === "printed", [chk.published, chk.published_from]);
  ok("C3.12 K3 pass: every dated form and checklist row has an IRCC month; no guide claims one", pr.filter((r) => r.type !== "guide" && r.edition).every((r) => /^\d{4}-\d{2}$/.test(r.published ?? "")) && pr.filter((r) => r.type === "guide").every((r) => r.published === null), pr.filter((r) => r.type !== "guide" && r.edition && !r.published).map((r) => r.code));
  ok("C3.12 file date pass: a sample form keeps the date its file gives (IMM 1295: 2026-06-04), the same as the column", r1295.file_date === "2026-06-04" && sql("select published from form_edition where edition_label = 'IMM 1295 (09-2023)'") === "2026-06-04", r1295.file_date);
  ok("C3.12 file date fail: the file's date is not the printed edition (IMM 5707 is edition 01-2023, file saved 2025-04-11)", r5707.edition === "IMM 5707 (01-2023)" && r5707.file_date === "2025-04-11", [r5707.edition, r5707.file_date]);
  ok("C3.12 file date pass: every form edition made before the column was read once and kept (no row left unread)", sql("select count(*) from form_edition where published is null and channel = 'PDF'") === "0");
  ok("C3.12 file date fail: a guide with no date in its page is kept as read with no date (''), shown as none", sql("select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_kind = 'guide' and e.published = ''") !== "0" && pr.filter((r) => r.type === "guide").every((r) => r.file_date === null && r.published === null));
  // An uploaded PDF (door 2, the intake): its date is set when it is added, from the reader that already read its identity.
  const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, "forms", "imm5604e.pdf")))], { type: "application/pdf" }), "imm5604e.pdf");
  const up = await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json() as { results?: { outcome: string; edition: string | null }[] };
  const added = up.results?.[0];
  ok("C3.12 file date pass: an uploaded PDF keeps the date its file gives the moment it is added (IMM 5604: 2023-02-27)", !!added?.edition && sql(`select published from form_edition where edition_label = '${added.edition}'`) === "2023-02-27", { added, col: added?.edition ? sql(`select coalesce(published, 'NULL') from form_edition where edition_label = '${added.edition}'`) : null });
  pr = await pubRows();
  ok("C3.12 file date pass: the Forms list shows the uploaded form's date", pr.find((r) => r.code === "IMM 5604")?.file_date === "2023-02-27", pr.find((r) => r.code === "IMM 5604"));
  // A file that names no date: kept as '' (read), shown as none, and not read again on the next list.
  sql("update form_edition set published = '' where edition_label = 'IMM 5409 (01-2023)'");
  pr = await pubRows();
  ok("C3.12 file date pass: a file that names no date is shown as none (the page says 'Date not in the file')", pr.find((r) => r.code === "IMM 5409")?.file_date === null, pr.find((r) => r.code === "IMM 5409")?.file_date);
  ok("C3.12 file date fail: a file read once with no date is not read again on every list (stays '')", sql("select published from form_edition where edition_label = 'IMM 5409 (01-2023)'") === "");
  sql("update form_edition set published = 'not a date' where edition_label = 'IMM 5475 (05-2021)'");
  ok("C3.12 file date fail: anything but a YYYY-MM-DD date is never shown as a date", (await pubRows()).find((r) => r.code === "IMM 5475")?.file_date === null);
  sql("update form_edition set published = '9999-13-99' where edition_label = 'IMM 5475 (05-2021)'");
  ok("C3.12 break m1 fail: an impossible date (9999-13-99) from a file's clock is never shown as a date", (await pubRows()).find((r) => r.code === "IMM 5475")?.file_date === null);
  sql("update form_edition set published = '?' where edition_label = 'IMM 5475 (05-2021)'");
  const unreadable = (await pubRows()).find((r) => r.code === "IMM 5475")!;
  ok("C3.12 break M2 fail: a file that could not be read says so ('unreadable'), never 'no date in the file'", unreadable.file_date === null && unreadable.file_date_state === "unreadable" && sql("select published from form_edition where edition_label = 'IMM 5475 (05-2021)'") === "?", unreadable.file_date_state);
  ok("C3.12 break M2 pass: a file with no date says 'none', one with a date 'date'", pr.find((r) => r.code === "IMM 5409")?.file_date_state === "none" && pr.find((r) => r.code === "IMM 1295")?.file_date_state === "date");
  // An older edition keeps its own date (test input: IMM 5257's committed previous edition joins as an earlier edition,
  // unread, the way rows made before the column are).
  const ws = sql("select workspace_id from form_edition where edition_label = 'IMM 5257 (09-2023)'"), def = sql("select gov_form_def_id from form_edition where edition_label = 'IMM 5257 (09-2023)'");
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, official_file, sha256) values (gen_random_uuid(), '${ws}', '${def}', 'IMM 5257 (06-2018)', 'imm5257e-pre-2023.pdf', 'd512ef649902eadc400c667cf6ad41bba0d905e2a54245a339be6c25a2d80f11')`);
  pr = await pubRows();
  const v = pr.find((r) => r.code === "IMM 5257")!, older = v.older_editions.find((e) => e.label === "IMM 5257 (06-2018)");
  ok("C3.12 file date pass: an older edition shows its own file's date (IMM 5257 (06-2018): 2019-04-18), read once and kept", older?.file_date === "2019-04-18" && sql("select published from form_edition where edition_label = 'IMM 5257 (06-2018)'") === "2019-04-18", v.older_editions);
  ok("C3.12 K3 pass: an older edition shows its own printed month as published (IMM 5257 (06-2018): 2018-06), not its file's date", older?.published === "2018-06" && older?.published_from === "printed", older);
  ok("C3.12 file date fail: the current edition keeps its own date, not the older one's", v.edition === "IMM 5257 (09-2023)" && v.file_date === "2026-06-04", [v.edition, v.file_date]);
  // A file not on disk is left unread (null), never marked as having no date.
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, stored_path) values (gen_random_uuid(), '${ws}', '${def}', 'IMM 5257 (01-2017)', 'var/nowhere/missing.pdf')`);
  await pubRows();
  ok("C3.12 file date fail: a file missing from disk stays unread (null, tried again later), never '' (no date)", sql("select coalesce(published, 'NULL') from form_edition where edition_label = 'IMM 5257 (01-2017)'") === "NULL");
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
