// X5 slice a (forms lane; P-156 (1), plan-p156 P156-1 and P156-2; C2.6): the form library filled from IRCC's forms and
// guides index, US$0 (the recorded copy: no AI, no PDF download). Every number becomes a library form, a new one "Listed by
// IRCC · no file yet"; a form already there is matched, never duplicated, and keeps its file; a later read whose date
// changed for a form with a file marks it "Newer edition on canada.ca", never replacing it. A pass and a fail per rule.
//   zsh studio/tools/isolated.sh forms_x5 4450 start && tsx studio/tests/check_forms_x5_library.ts 4450 xr_studio_forms_x5
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFormsIndex } from "../engine/canada.ts";
import { planIndexFill } from "../engine/library-index.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_x5";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const msg = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  // ── the rule, pure
  const row = (code: string, extra: object = {}) => ({ code, title: `Title ${code}`, pageUrl: `https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/${code.replace(/\W+/g, "").toLowerCase()}.html`, dateModified: "2024-05-01", kind: "form" as const, ...extra });
  const p = planIndexFill([row("IMM 5257"), row("IMM 5257"), row("IMM 1295"), row("IMM 5409", { kind: "checklist" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: null }]);
  ok("C2.6 X5 P156-1 pass: new numbers are created once each (a number listed twice is one form), the checklist kind kept", p.create.map((c) => c.formKey).join() === "IMM 5257,IMM 5409" && p.create[1].kind === "checklist");
  ok("C2.6 X5 P156-1 pass: a form already in the library is matched, never created again; its missing page is filled in", p.listed.length === 1 && p.listed[0].formKey === "IMM 1295" && !!p.listed[0].pageUrl && !p.create.some((c) => c.formKey === "IMM 1295"));
  ok("C2.6 X5 P156-1 fail: a page the library already has is never overwritten by the index", planIndexFill([row("IMM 1295")], [{ formKey: "IMM 1295", indexDateModified: null, hasFile: true, formPageUrl: "https://www.canada.ca/kept.html" }]).listed[0].pageUrl === null);
  const html = `<table><tbody><tr><td>IMM 9999</td><td>No link here</td><td>2024-01-01</td></tr><tr><td>IMM 8888</td><td><a href="https://example.com/x.html">Off-site</a></td><td></td></tr><tr><td>IMM 7777</td><td><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm7777.html">Good</a></td><td>2024-01-01</td></tr></tbody></table>`;
  const parsed = parseFormsIndex(html);
  ok("C2.6 X5 P156-1 fail: a row with no canada.ca page (none, or off-site) is counted as 'no page', never guessed or listed", parsed.rows.map((r) => r.code).join() === "IMM 7777" && parsed.noPage.join() === "IMM 9999,IMM 8888", parsed);
  ok("C2.6 X5 P156-2 pass: a later read with another date, for a form that has a file, marks it newer", planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.join() === "IMM 1295");
  ok("C2.6 X5 P156-2 fail: no mark for the same date, a form with no file, or a first read (no earlier date)", !planIndexFill([row("IMM 1295")], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: false, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: null, hasFile: true, formPageUrl: "x" }]).newer.length);

  // ── the API on the sample, with the recorded copy of IRCC's list
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  const ledgerDir = process.env.P2_LEDGER_DIR ?? "", ledgerBefore = ledgerDir && existsSync(join(ledgerDir, "spend.jsonl")) ? readFileSync(join(ledgerDir, "spend.jsonl"), "utf8") : "";
  const before = Number(sql("select count(*) from gov_form_def")), withFile = sql("select form_key from gov_form_def d where form_key like 'IMM %' and exists (select 1 from form_edition e where e.gov_form_def_id = d.id) order by form_key limit 1");
  const fileBefore = sql(`select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${withFile}'`);
  for (const [who, name] of [["user-B", "approver"], ["user-C", "content reviewer"], ["user-O", "case officer"]]) {
    const rr = await call("POST", "/library/forms/fill-from-index", undefined, who);
    ok(`C2.6 X5 P156-1 fail: the ${name} cannot fill the library (403), nothing added`, rr.status === 403 && Number(sql("select count(*) from gov_form_def")) === before, rr.status);
  }
  let r = await call("POST", "/library/forms/fill-from-index");
  const after = Number(sql("select count(*) from gov_form_def"));
  ok("C2.6 X5 P156-1 pass: the author fills the library from IRCC's list: new numbers added as forms, the forms already there matched", r.status === 201 && r.body.created > 100 && r.body.listed >= 1 && after === before + r.body.created && /new forms listed \(no file yet\)/.test(r.body.message), { status: r.status, b: r.body, before, after });
  ok("C2.6 X5 P156-1 pass: no AI and no download: no ledger line, no new edition (US$0)", (ledgerDir ? (existsSync(join(ledgerDir, "spend.jsonl")) ? readFileSync(join(ledgerDir, "spend.jsonl"), "utf8") : "") === ledgerBefore : true) && sql(`select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${withFile}'`) === fileBefore);
  ok("C2.6 X5 P156-1 pass: the fill is in the audit trail with its counts", /filled the form library from IRCC's forms list: \d+ new forms listed/.test(sql("select summary from audit_event where action='filled' and entity='form library' order by at desc limit 1")));
  r = await call("POST", "/library/forms/fill-from-index");
  ok("C2.6 X5 P156-1 fail: filling again adds nothing (every number matched, never duplicated)", r.status === 201 && r.body.created === 0 && Number(sql("select count(*) from gov_form_def")) === after && sql("select count(*) from (select form_key from gov_form_def group by form_key having count(*) > 1) d") === "0", r.body);
  const list = (await call("GET", "/library/forms/list")).body;
  const listed = list.rows.find((x: any) => x.status === "no_file" && x.listed_by_ircc), kept = list.rows.find((x: any) => x.code === withFile); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-1 pass: a new row reads 'no file yet', listed by IRCC, with its canada.ca page; a form with a file keeps its status", !!listed && /^https:\/\/www\.canada\.ca\//.test(listed.form_page_url) && kept && kept.status !== "no_file", { listed, kept: kept?.status });
  // P156-2: a form with a file whose index date changes is marked; it keeps its file.
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${withFile}'`);
  const noFileKey = listed.code;
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${noFileKey}'`);
  r = await call("POST", "/library/forms/fill-from-index");
  const list2 = (await call("GET", "/library/forms/list")).body, kept2 = list2.rows.find((x: any) => x.code === withFile), nf2 = list2.rows.find((x: any) => x.code === noFileKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-2 pass: a later read with a changed date marks the form with a file 'newer on canada.ca'; its file stays", r.body.newer?.includes(withFile) && kept2?.status === "newer_file" && kept2.newer_on_index === true && sql(`select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${withFile}'`) === fileBefore, { newer: r.body.newer, kept2 });
  ok("C2.6 X5 P156-2 fail: a form with no file is never marked newer (it stays 'no file yet')", !r.body.newer?.includes(noFileKey) && nf2?.status === "no_file", nf2?.status);
  await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  ok("C2.6 X5 P156-2 pass: a person checking the form against canada.ca answers the mark", sql(`select coalesce(newer_on_index_at::text, '') from gov_form_def where form_key = '${withFile}'`) === "");
  r = await call("POST", "/library/forms/fill-from-index", undefined, null);
  ok("C2.6 X5 fail: nobody (no person named) cannot fill (401)", r.status === 401, r.status);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
