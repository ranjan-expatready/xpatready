// F2 C3.12 (forms lane; P-123, P-32): the Forms list (Shared library › Forms) shows each form's field map on its current
// edition: "Not mapped yet", "N of T form fields decided", "… · waits for review" or "Complete · T form fields"; a guide or
// checklist "No field map", a form with no usable edition "No edition yet". The pure rule (contracts/form-library.ts
// fieldMapState) with a pass and a fail per rule, then the API on the sample against the database's own rows. US$0 (one
// saved AI answer replayed, no model call).
//   zsh studio/tools/isolated.sh forms_c312 4450 start && tsx studio/tests/check_forms_c312_field_map.ts 4450 xr_studio_forms_c312
import { execFileSync } from "node:child_process";
import { fieldMapState } from "../contracts/form-library.ts";

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

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
