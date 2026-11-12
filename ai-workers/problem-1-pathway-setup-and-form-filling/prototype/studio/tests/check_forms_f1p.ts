// F1-P (forms lane, F2 plan §10b; Screen 02 Q3 and BR-15; SA-1B-11, 12, 27): a list row's purpose and overflow on its
// field map, each rule with a passing and a failing case, plus QA-43. Isolated copy (own database and files; the demo
// is never touched). No browser, NO model call (US$0). The purpose words are Sample until the immigration expert confirms.
//   zsh studio/tools/isolated.sh forms_f1p 4454 start && tsx studio/tests/check_forms_f1p.ts 4454 xr_studio_forms_f1p  [--evidence writes evidence/forms-f1p]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LIST_OVERFLOWS, LIST_PURPOSES } from "../contracts/forms.ts";
import { channelProblems } from "../engine/channels.ts";
import type { Snapshot } from "../engine/snapshot.ts";

const PORT = Number(process.argv[2] ?? 4454), DB = process.argv[3] ?? "xr_studio_forms_f1p";
const STUDIO = join(import.meta.dirname, "..");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

(async () => {
  // ──────────────────────────────────────────── engine (no server): the release warning
  const snap = (entries: Record<string, unknown>[]) => ({ combination: { portal: null }, canonical_fields: [], forms: [], field_maps: [{ form_number: "IMM 5257", form_edition: "IMM 5257 (Sample)", entries }] }) as unknown as Snapshot;
  const row = { data_path: "row1.employer", caption: "Employer", outcome: "mapped", fact: "employment.employer", row: 1 };
  const warn = (s: Snapshot) => channelProblems(s).filter((p) => /do(es)? not say yet what the list holds/.test(p.message));
  ok("C3.2: release check: a list row with no purpose is a warning (\"Purpose: not set\"), never an error", warn(snap([row])).length === 1 && warn(snap([row]))[0].level === "warning", warn(snap([row]))[0]?.message);
  ok("C3.2: release check fail: once the list row has a purpose, or the field is not a list row, no warning is left", warn(snap([{ ...row, list_purpose: { kind: "all", overflow: "extra_sheet" } }])).length === 0 && warn(snap([{ ...row, row: null }])).length === 0 && warn(snap([{ ...row, outcome: "not_a_fact" }])).length === 0);
  ok("C3.2: the five purposes and two overflow choices are one constant each", LIST_PURPOSES.map((p) => p.key).join() === "current,for_post,all,latest,date_range" && LIST_OVERFLOWS.map((o) => o.key).join() === "extra_sheet,flag_officer");
  // S9 (SA-1B-10 rule 1, SA-1B-11 rule 1, spec fix 2 Nov): "for post" is the mailing address tagged "send post here".
  const forPost = LIST_PURPOSES.find((p) => p.key === "for_post")?.label ?? "";
  ok("S9 pass (SA-1B-11): the for_post purpose says it is the mailing address, the entry tagged \"send post here\"", /mailing address/i.test(forPost) && /send post here/.test(forPost), forPost);
  ok("S9 fail (SA-1B-11): no purpose reads as the job applied for (\"post applied for\", job, position)", !LIST_PURPOSES.some((p) => /applied for|\bjob\b|position/i.test(p.label)), LIST_PURPOSES.map((p) => p.label));

  // ──────────────────────────────────────────── API
  await call("POST", "/demo/load");
  const pick = (cond: string) => sql(`select e.id || '|' || m.data_path from form_field_map m join form_edition e on e.id=m.form_edition_id where m.outcome='mapped' and ${cond} order by e.edition_label, m.data_path, m.version desc limit 1`).split("|");
  const [ed, listPath] = pick("m.row is not null");
  const [ed2, singlePath] = pick("m.row is null");
  ok("setup: the sample library has a list row and a single-value field on a field map", !!ed && !!listPath && !!ed2 && !!singlePath, { listPath, singlePath });
  const before = Number(sql(`select max(version) from form_field_map where form_edition_id='${ed}' and data_path='${listPath}'`));

  let r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "latest", overflow: "flag_officer" });
  const stored = sql(`select list_purpose::text || '|' || status || '|' || version from form_field_map where form_edition_id='${ed}' and data_path='${listPath}' order by version desc limit 1`).split("|");
  ok("C3.2: LP-1 a list row takes a purpose and overflow, stored on a draft version (a published row is never changed)", r.status === 200 && JSON.parse(stored[0]).kind === "latest" && JSON.parse(stored[0]).overflow === "flag_officer" && stored[1] === "DRAFT" && Number(stored[2]) >= before, { status: r.status, body: r.body, stored });
  ok("C3.2: the answer says it in words", r.body?.words === "Latest; flag for the officer", r.body?.words);
  ok("C3.2: audit line names the field and the words, no value", sql(`select count(*) from audit_event where entity='list purpose' and entity_key='${listPath}' and summary like '%Latest; flag for the officer%'`) === "1");
  const again = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "latest", overflow: "flag_officer" });
  ok("C3.2: setting the same purpose again adds no version", again.status === 200 && Number(sql(`select max(version) from form_field_map where form_edition_id='${ed}' and data_path='${listPath}'`)) === Number(stored[2]));

  r = await call("PATCH", `/editions/${ed2}/list-purposes`, { dataPath: singlePath, kind: "all", overflow: "extra_sheet" });
  ok("C3.2: LP-1 fail: a single-value field has no list purpose (422, in words)", r.status === 422 && /only a list's rows have a purpose/.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "everything", overflow: "extra_sheet" });
  ok("C3.2: LP-1 fail: an unknown purpose is refused in words", r.status === 400 && /Choose what the list holds/.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "all" });
  ok("C3.2: LP-1 fail: no overflow choice is refused (never a silent cut)", r.status === 400 && /more rows than the form has room for/.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: "no.such.box", kind: "all", overflow: "extra_sheet" });
  ok("C3.2: LP-1 fail: a form field not on the map is a 404", r.status === 404, r.status);
  r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "all", overflow: "extra_sheet" }, "user-B");
  ok("C3.2: roles fail: a person without the author duty cannot set it (403)", r.status === 403, r.status);
  r = await call("PATCH", `/editions/${ed}/list-purposes`, { dataPath: listPath, kind: "all", overflow: "extra_sheet" }, "nobody");
  ok("C3.2: roles fail: an unknown person is refused (401)", r.status === 401, r.status);

  // The release snapshot carries it for the combinations that use the form.
  const combo = sql(`select cf.combination_id from combination_form cf join form_edition e on e.gov_form_def_id=cf.gov_form_def_id where e.id='${ed}' limit 1`);
  if (combo) {
    const cfg = await call("GET", `/combinations/${combo}/config?mode=draft`);
    const entry = JSON.stringify(cfg.body).includes('"list_purpose":{"kind":"latest","overflow":"flag_officer"}');
    ok("C3.2: the draft configuration of a combination using the form carries the list purpose", cfg.status === 200 && entry, cfg.status);
  } else ok("C3.2: the draft configuration carries the list purpose (no combination uses that form in the sample)", true, "skipped: no combination");

  // ──────────────────────────────────────────── QA-43
  const unknown = "00000000-0000-4000-8000-000000000000";
  r = await call("GET", `/combinations/${unknown}/online-forms`);
  const known = sql("select id from combination limit 1");
  const k = await call("GET", `/combinations/${known}/online-forms`);
  ok("C2.7: QA-43 an unknown combination on online-forms is a 404, a known one a list", r.status === 404 && k.status === 200 && Array.isArray(k.body), { unknown: r.status, known: k.status });

  // Evidence only when asked (--evidence): a regression run leaves the repository as it was.
  const out = process.argv.includes("--evidence") ? join(STUDIO, "evidence", "forms-f1p") : join(STUDIO, "var", "isolated-forms_f1p"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_f1p.json"), JSON.stringify({ pass, fail, log }, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
