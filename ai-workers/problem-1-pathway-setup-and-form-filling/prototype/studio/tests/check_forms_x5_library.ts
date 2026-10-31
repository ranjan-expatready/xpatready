// X5 slice a (forms lane; P-156 (1), plan-p156 P156-1 and P156-2; C2.6): the form library filled from IRCC's forms and
// guides index, US$0 (the recorded copy: no AI, no PDF download). Every number becomes a library form, a new one "Listed by
// IRCC · no file yet"; a form already there is matched, never duplicated, and keeps its file; a later read whose date
// changed for a form with a file marks it "Newer edition on canada.ca", never replacing it. A pass and a fail per rule.
//   zsh studio/tools/isolated.sh forms_x5 4450 start && tsx studio/tests/check_forms_x5_library.ts 4450 xr_studio_forms_x5
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { indexTitleOk, parseFormsIndex, realDate } from "../engine/canada.ts";
import { editionMonth, isLaterDate, libraryRows, newerOnIndex, planIndexFill } from "../engine/library-index.ts";

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
  const odd = parseFormsIndex(`<table><tbody><tr><td>IMM 5257E</td><td><a href="https://www.canada.ca/x.html">x</a></td></tr><tr><td>PPTC 153</td><td><a href="https://www.canada.ca/y.html">y</a></td></tr></tbody></table>`);
  ok("C2.6 X5 break m7 fail: a number that cannot be read is counted as unreadable (shown to the person), never silently dropped", odd.rows.length === 0 && odd.unreadable.join() === "IMM 5257E,PPTC 153", odd);
  const dup = planIndexFill([row("IMM 4444", { kind: "checklist", title: "Document checklist", pageUrl: "https://www.canada.ca/checklist.html", dateModified: "2020-01-01" }), row("IMM 4444", { title: "Application form", pageUrl: "https://www.canada.ca/form.html", dateModified: "2024-06-01" })], []).create[0];
  ok("C2.6 X5 break m6 + Devin fail: a number listed twice, a checklist row first, is the form row whole: its kind, title, page and date (before: the checklist's page)", dup?.kind === "data_form" && dup.title === "Application form" && dup.pageUrl === "https://www.canada.ca/form.html" && dup.dateModified === "2024-06-01", dup);
  ok("C2.6 X5 review m2 fail: no 'newer' mark when the library's edition is already dated at or after the index's date (the fill's words agree with the list)", !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", editionMonth: "2025-03" }]).newer.length && planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", editionMonth: "2024-12" }]).newer.join() === "IMM 1295");
  ok("C2.6 X5 break m2 fail: an index date that went back, or one in another shape, marks nothing newer; a later one does", !isLaterDate("2023-09", "2099-01-01") && !isLaterDate("May 2024", "2024-01") && isLaterDate("2024-06", "2024-05-31") && !isLaterDate("2024-05", "2024-05-15"));
  ok("C2.6 X5 P156-2 pass: a later read with another date, for a form that has a file, marks it newer", planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.join() === "IMM 1295");
  ok("C2.6 X5 P156-2 fail: no mark for the same date, a form with no file, or a first read (no earlier date)", !planIndexFill([row("IMM 1295")], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: false, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: null, hasFile: true, formPageUrl: "x" }]).newer.length);
  // Fill hardening (break m13, m15; Devin on #145).
  const lf = (extra: object = {}) => ({ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", ...extra });
  // Review / break (e466adb1) M10, M11, Devin: "newer" is judged by the dates: the index's month after the current edition's
  // month (canada.ca's when known, else the month printed in its label). Nothing stored, so nothing left wrong by events.
  ok("C2.6 X5 review (e466adb1) M10 pass: an edition's month is canada.ca's when known, else the month in its label; a label with none has none", editionMonth({ canadaUpdated: "2024-10", editionLabel: "IMM 5488 (01-2019)" }) === "2024-10" && editionMonth({ canadaUpdated: null, editionLabel: "IMM 1295 (09-2023)" }) === "2023-09" && editionMonth({ editionLabel: "Guide 5289 (read 2026-10-31)" }) === null && editionMonth({ editionLabel: "IMM 1295 (13-2023)" }) === null);
  ok("C2.6 X5 review (e466adb1) M10 fail: a hand-uploaded file (no canada.ca month) is newer only while the index is later than its own month: back to its month it is not (before: newer for good)", newerOnIndex("2025-06", "2023-09") && !newerOnIndex("2023-09", "2023-09") && !newerOnIndex("2020-01", "2023-09") && !newerOnIndex(null, "2023-09") && !newerOnIndex("2025-06", null));
  ok("C2.6 X5 review (dc93b60f) M8 fail: an index date that goes back but is still later than the file stays newer (before: cleared; the row read Ready on 09-2023)", newerOnIndex("2025-03-01", "2023-09"));
  const named = planIndexFill([row("IMM 1295", { dateModified: "2025-06-01" })], [lf({ indexDateModified: "2023-09-01", editionMonth: "2023-09" })]);
  const again = planIndexFill([row("IMM 1295", { dateModified: "2025-08-01" })], [lf({ indexDateModified: "2025-06-01", editionMonth: "2023-09" })]);
  ok("C2.6 X5 P156-2 pass: the fill names a form the read made newer than its file, once (a later read of a form already newer does not name it again); nothing is stored for a dated file", named.newer.join() === "IMM 1295" && !named.mark.length && !again.newer.length && !again.mark.length, { named, again });
  ok("C2.6 X5 P156-2 fail: a form with no approved file is never named newer (a held or rejected upload leaves nothing behind: after an approval the list judges the approved file's month)", !planIndexFill([row("IMM 1295", { dateModified: "2025-06-01" })], [lf({ hasFile: false, indexDateModified: "2023-09-01" })]).newer.length);
  const undUp = planIndexFill([row("GUIDE 5289", { dateModified: "2025-06-01" })], [lf({ formKey: "GUIDE 5289", indexDateModified: "2024-01-01" })]);
  const undBack = planIndexFill([row("GUIDE 5289", { dateModified: "2023-06-01" })], [lf({ formKey: "GUIDE 5289", indexDateModified: "2024-01-01" })]);
  ok("C2.6 X5 P156-2 pass: an undated file keeps the stored mark: set by a later date, cleared by a step back", undUp.newer.join() === "GUIDE 5289" && undUp.mark.join() === "GUIDE 5289" && undBack.clear.join() === "GUIDE 5289" && !undBack.newer.length, { undUp, undBack });
  const twice = planIndexFill([row("IMM 5373 B", { dateModified: "2023-01-01", title: "Old title", pageUrl: "https://www.canada.ca/old.html" }), row("IMM 5373 B", { dateModified: "2025-03-01", title: "New title", pageUrl: "https://www.canada.ca/new.html" })], [lf({ formKey: "IMM 5373 B", indexDateModified: "2024-01-01", formPageUrl: null })]);
  ok("C2.6 X5 break m15 / m26 fail: a number listed twice keeps its latest row whole: its date, title and page together (before: the first row's title and page with the latest date)", twice.listed[0]?.dateModified === "2025-03-01" && twice.listed[0]?.pageUrl === "https://www.canada.ca/new.html" && twice.newer.join() === "IMM 5373 B", twice);
  const link = (code: string, title: string, date = "2024-01-01") => `<tr><td>${code}</td><td><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/${code.replace(/\W+/g, "").toLowerCase()}.html">${title}</a></td><td>${date}</td></tr>`;
  const dates = parseFormsIndex(`<table><tbody>${link("IMM 3333", "Good", "2024-02-30")}${link("IMM 4444", "Good too", "2024-02-29")}${link("IMM 5555", "", "2024-01-01")}</tbody></table>`);
  ok("C2.6 X5 break m15 fail: an impossible date is kept as no date; the parser keeps every numbered row (the finder and the check still find it by number)", dates.rows.map((r) => r.code).join() === "IMM 3333,IMM 4444,IMM 5555" && dates.rows[0].dateModified === null && dates.rows[1].dateModified === "2024-02-29", dates);
  ok("C2.6 X5 break m15 / m22 fail: a title the library cannot show (blank, only invisible characters, over 300 characters) is refused; 300 characters, emoji counted as one, is kept", !indexTitleOk("") && !indexTitleOk("\u200B\u00AD ") && !indexTitleOk("\u3164") && !indexTitleOk("\u2800\u2800") && !indexTitleOk("\u202E\u2066\u2069") && !indexTitleOk("\u115F\uFFA0\u034F") && !indexTitleOk("x".repeat(301)) && indexTitleOk("x".repeat(300)) && indexTitleOk("😀".repeat(151)) && indexTitleOk("Application for a visitor visa"));
  const lr = libraryRows([row("IMM 1111", { title: "" }), row("IMM 2222", { title: "x".repeat(301) }), row("IMM 3333", { title: "\u200B" }), row("IMM 3333", { title: "Good" }), row("IMM 4444")], ["IMM 9X"]);
  ok("C2.6 X5 break m15 / m23, review (e466adb1) 3 fail: the fill leaves out rows with no title it can show and counts each such number once as unreadable; a number that also has a good row is kept, not counted", lr.rows.map((r) => r.code).join() === "IMM 3333,IMM 4444" && lr.unreadable.join() === "IMM 9X,IMM 1111,IMM 2222", lr);
  ok("C2.6 X5 break m15 / m25 pass: real dates read as real (month ends, leap years, years IRCC could write); others not", realDate("2024-02-29") && realDate("2024-12") && !realDate("2023-02-29") && !realDate("2024-13") && !realDate("2024-04-31") && !realDate("May 2024") && !realDate("0000-01") && !realDate("9999-12"));

  // ── the API on the sample, with the recorded copy of IRCC's list
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  const ledgerDir = process.env.P2_LEDGER_DIR ?? "", ledgerBefore = ledgerDir && existsSync(join(ledgerDir, "spend.jsonl")) ? readFileSync(join(ledgerDir, "spend.jsonl"), "utf8") : "";
  const keptBefore = sql("select string_agg(form_key || '|' || display_name || '|' || form_kind || '|' || coalesce(form_page_url, '') || '|' || coalesce(retired_at::text, ''), ';' order by form_key) from gov_form_def");
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
  // X5 review 7: forms already in the library keep their title, kind, retired state and page (filled in only where empty).
  const keptAfter = sql(`select string_agg(form_key || '|' || display_name || '|' || form_kind || '|' || coalesce(form_page_url, '') || '|' || coalesce(retired_at::text, ''), ';' order by form_key) from gov_form_def where form_key in (${keptBefore.split(";").map((x) => `'${x.split("|")[0].replace(/'/g, "''")}'`).join(",")})`);
  ok("C2.6 X5 P156-1 fail: a form already in the library keeps its title, kind and retired state, and any page it had (before: a version that overwrote titles passed)", keptBefore.split(";").every((b) => { const [k, t, kind, page, ret] = b.split("|"); const a = keptAfter.split(";").find((x) => x.split("|")[0] === k)?.split("|"); return !!a && a[1] === t && a[2] === kind && a[4] === ret && (!page || a[3] === page); }), { keptBefore: keptBefore.slice(0, 200), keptAfter: keptAfter.slice(0, 200) });
  // X5 break M1: a number with a letter (IRCC writes "IMM 5373B") is kept in the library's own spelling, so its routes find it.
  const lettered = sql("select form_key from gov_form_def where form_key ~ '^IMM [0-9]{4} [A-D]$' and listed_on_index_at is not null limit 1"), squeezed = sql("select count(*) from gov_form_def where form_key ~ '^IMM [0-9]{4}[A-D]$'");
  const usesR = lettered ? await call("GET", `/library/forms/${encodeURIComponent(lettered)}/uses`) : { status: 0, body: null };
  ok("C2.6 X5 break M1 fail: a lettered number is stored as the library spells it ('IMM 5373 B', never 'IMM 5373B') and its routes find it", !!lettered && squeezed === "0" && usesR.status === 200, { lettered, squeezed, uses: usesR.status });
  ok("C2.6 X5 P156-1 pass: the fill is in the audit trail with its counts", /filled the form library from IRCC's forms list: \d+ new forms listed/.test(sql("select summary from audit_event where action='filled' and entity='form library' order by at desc limit 1")));
  r = await call("POST", "/library/forms/fill-from-index");
  ok("C2.6 X5 P156-1 fail: filling again adds nothing (every number matched, never duplicated)", r.status === 201 && r.body.created === 0 && Number(sql("select count(*) from gov_form_def")) === after && sql("select count(*) from (select form_key from gov_form_def group by form_key having count(*) > 1) d") === "0", r.body);
  // X5 review M1 / break M4 (STANDARDS §9): the list stays fast with IRCC's listed forms in it (warm call).
  await call("GET", "/library/forms/list"); const tl = Date.now(); const listTimed = await call("GET", "/library/forms/list"); const listMs = Date.now() - tl;
  ok("C2.6 X5 review M1 fail: after the fill the library list answers in under 300 ms (before: 0.6-0.86 s, formUses per row)", listTimed.status === 200 && listMs < 300, listMs);
  ok("C2.6 X5 break M5 pass: the list counts the rows with no file yet and the ready ones (the page's two new filters)", listTimed.body.counts.no_file > 100 && listTimed.body.counts.ready >= 1 && (await call("GET", "/library/forms/list?status=no_file")).body.rows.every((x: any) => x.status === "no_file"), listTimed.body.counts); // eslint-disable-line @typescript-eslint/no-explicit-any
  const list = (await call("GET", "/library/forms/list")).body;
  const listed = list.rows.find((x: any) => x.status === "no_file" && x.listed_by_ircc), kept = list.rows.find((x: any) => x.code === withFile); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-1 pass: a new row reads 'no file yet', listed by IRCC, with its canada.ca page; a form with a file keeps its status", !!listed && /^https:\/\/www\.canada\.ca\//.test(listed.form_page_url) && kept && kept.status !== "no_file", { listed, kept: kept?.status });
  // P156-2: a form with a file whose index date changes is marked; it keeps its file.
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${withFile}'`);
  sql(`update form_edition set canada_updated = '2000-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`); // the library's edition older than IRCC's list
  const noFileKey = listed.code;
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${noFileKey}'`);
  r = await call("POST", "/library/forms/fill-from-index");
  const list2 = (await call("GET", "/library/forms/list")).body, kept2 = list2.rows.find((x: any) => x.code === withFile), nf2 = list2.rows.find((x: any) => x.code === noFileKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-2 pass: a later read with a changed date marks the form with a file 'newer on canada.ca'; its file stays", r.body.newer?.includes(withFile) && kept2?.status === "newer_file" && kept2.newer_on_index === true && sql(`select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${withFile}'`) === fileBefore, { newer: r.body.newer, kept2 });
  ok("C2.6 X5 review m2 pass: every form the fill calls newer shows 'newer' in the list (one rule for both)", (r.body.newer as string[]).every((code) => list2.rows.find((x: any) => x.code === code)?.status === "newer_file"), r.body.newer); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-2 fail: a form with no file is never marked newer (it stays 'no file yet')", !r.body.newer?.includes(noFileKey) && nf2?.status === "no_file", nf2?.status);
  // X5 break M2 / Devin, review (e466adb1): a check never changes a dated file's "newer" (the dates decide); one that fails or
  // finds another date leaves the row as it was.
  const before2 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  const chk = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const after2 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 break M2 fail: a check that did not find the library's edition current leaves the row as it was (before: cleared the mark, whatever the check found)", chk.status === 201 && chk.body?.outcome === "current" ? true : before2 === "newer_file" && after2 === "newer_file", { status: chk.status, outcome: chk.body?.outcome, before2, after2 });
  // X5 break M3 / Devin: the mark is answered once the library holds an edition canada.ca dates at or after the index's date.
  sql(`update gov_form_def set newer_on_index_at = now(), index_date_modified = '2025-02-01' where form_key = '${withFile}'`);
  const before3 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update form_edition set canada_updated = '2025-03' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  const after3 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 break M3 fail: once the library's edition is dated at or after the index's date, the form is no longer 'newer' (before: marked until a check)", before3 === "newer_file" && after3 !== "newer_file", { before3, after3 });
  // Review (5a5f0d16) m2 / Devin: a held (unapproved) edition with a later date never hides the mark: the fill judges the
  // same current edition as the list. A copy of the edition, unapproved (another checksum), dated 2099-01, is added.
  sql(`update form_edition set canada_updated = '2000-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'sha256', 'f' || repeat('0', 63), 'canada_updated', '2099-01', 'edition_label', e.edition_label || ' (held copy)') from form_edition e where e.gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') limit 1))`);
  sql(`update gov_form_def set newer_on_index_at = null, index_date_modified = '2000-01-01' where form_key = '${withFile}'`);
  const rHeld = await call("POST", "/library/forms/fill-from-index");
  const heldRow = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review m2 / Devin fail: a held edition with a later date does not hide the mark: the fill and the list both say newer (one current edition)", rHeld.body.newer?.includes(withFile) && heldRow?.status === "newer_file", { newer: rHeld.body.newer, status: heldRow?.status });
  // X5 break (57f7d79d) M6: "Check against canada.ca" judges the same current edition too. The held copy now carries
  // canada.ca's own date and PDF address (what the first check read), the approved edition an old one: the check must not call
  // the held copy current and clear the mark (before: it named the held copy and the row read Ready on the old file).
  sql(`update form_edition set canada_updated = '${chk.body?.last_updated ?? "2099-01"}', source_url = '${chk.body?.pdf_url ?? ""}' where sha256 = 'f' || repeat('0', 63)`);
  sql(`update gov_form_def set newer_on_index_at = now() where form_key = '${withFile}'`);
  const chkHeld = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const markHeld = sql(`select coalesce(newer_on_index_at::text, '') from gov_form_def where form_key = '${withFile}'`);
  ok("C2.6 X5 break M6 fail: a check never calls a held edition current, even one with canada.ca's own date and file: the mark stays and the row still says newer (one current edition for the list, the fill and the check)", !!chk.body?.pdf_url && chkHeld.body?.outcome !== "current" && markHeld !== "" && (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status === "newer_file", { status: chkHeld.status, outcome: chkHeld.body?.outcome, m: msg(chkHeld), markHeld }); // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update gov_form_def set newer_on_index_at = null where form_key = '${withFile}'`);
  sql(`delete from form_edition where sha256 = 'f' || repeat('0', 63)`);
  // Review (dc93b60f): the three API wirings, each with a check that fails without it.
  // (1) M8 / M10: a file dated at or after the index's date is not newer, whatever an earlier read said.
  sql(`update form_edition set canada_updated = '2099-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  sql(`update gov_form_def set newer_on_index_at = now() where form_key = '${withFile}'`);
  await call("POST", "/library/forms/fill-from-index");
  ok("C2.6 X5 review (dc93b60f) M8 / (e466adb1) M10 fail: a file dated at or after the index's date reads Ready, even with a mark an earlier read left (before: a stored mark decided)", (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status === "ready"); // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update gov_form_def set newer_on_index_at = null where form_key = '${withFile}'`);
  // (2) M9 / M11: a held upload, a fill that moves the index's date on, then the approval: the approved file reads newer, with
  // nothing stored by the fill (so a fill running during the approval cannot lose it). The approval is played by copying an
  // approved edition's file onto the form under an older label.
  const ws = sql(`select workspace_id from gov_form_def where form_key = '${noFileKey}'`);
  sql(`insert into intake_item (id, workspace_id, file_name, stored_path, sha256, bytes, kind, code, outcome, status, created_by) values (gen_random_uuid(), '${ws}', 'held.pdf', '/tmp/held.pdf', 'e' || repeat('0', 63), 1, 'form', '${noFileKey}', 'held', 'HELD', 'user-A')`);
  sql(`update gov_form_def set newer_on_index_at = null, index_date_modified = '2000-01-01' where form_key = '${noFileKey}'`);
  const rUp = await call("POST", "/library/forms/fill-from-index");
  const indexNow = sql(`select index_date_modified from gov_form_def where form_key = '${noFileKey}'`);
  sql(`delete from intake_item where sha256 = 'e' || repeat('0', 63)`);
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'gov_form_def_id', (select id from gov_form_def where form_key = '${noFileKey}'), 'canada_updated', null, 'edition_label', '${noFileKey} (01-2001)') from form_edition e where e.gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and e.channel <> 'ONLINE' limit 1))`);
  const approvedRow = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === noFileKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review (dc93b60f) M9 / (e466adb1) M11 fail: a held upload approved after the index moved on reads newer (its label's month before the index's), and the fill did not call it newer while it had no file", /^\d{4}/.test(indexNow) && approvedRow?.status === "newer_file" && !rUp.body.newer?.includes(noFileKey), { indexNow, status: approvedRow?.status, newer: rUp.body.newer });
  sql(`delete from form_edition where edition_label = '${noFileKey} (01-2001)'`);
  // (3) m24: four fills at once, one form newly newer: only the fill that set the mark names it.
  sql(`update form_edition set canada_updated = '2000-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  sql(`update gov_form_def set newer_on_index_at = null, index_date_modified = '2000-01-01' where form_key = '${withFile}'`);
  const four = await Promise.all([1, 2, 3, 4].map(() => call("POST", "/library/forms/fill-from-index")));
  const naming = four.filter((x) => x.body.newer?.includes(withFile)).length;
  ok("C2.6 X5 review (dc93b60f) m24 fail: of four fills at once, only the one that set the mark calls the form newer (before: each did)", naming === 1, { naming, statuses: four.map((x) => x.status) });
  // X5 break m5: a listed form with no file says so when someone tries to add it to a combination.
  const comboId = sql("select id from combination where retired_at is null limit 1");
  const att = await call("POST", `/combinations/${comboId}/forms`, { formKey: noFileKey });
  ok("C2.6 X5 break m5 fail: adding a listed form with no file says it has no file yet (before: 'its file waits for a second person')", att.status === 409 && /listed by IRCC but has no file in the library yet/.test(msg(att)), { status: att.status, m: msg(att) });
  // X5 break m1: two fills at once together report what was created, never twice.
  await call("POST", "/demo/reset", { confirm: "RESET" }); await call("POST", "/demo/load");
  const b0 = Number(sql("select count(*) from gov_form_def"));
  const [f1, f2] = await Promise.all([call("POST", "/library/forms/fill-from-index"), call("POST", "/library/forms/fill-from-index")]);
  ok("C2.6 X5 break m1 fail: two fills at once report together exactly the rows created (before: each claimed all of them)", f1.status === 201 && f2.status === 201 && f1.body.created + f2.body.created === Number(sql("select count(*) from gov_form_def")) - b0, { a: f1.body?.created, b: f2.body?.created, made: Number(sql("select count(*) from gov_form_def")) - b0 });
  const onIndex = Number(sql("select count(*) from gov_form_def where listed_on_index_at is not null"));
  ok("C2.6 X5 break m14 / Devin (#145) fail: each of two fills at once says every listed form is there, new or already (before: the losing fill counted its plan: '0 new, 9 already')", f1.body.created + f1.body.listed === onIndex && f2.body.created + f2.body.listed === onIndex, { a: [f1.body?.created, f1.body?.listed], b: [f2.body?.created, f2.body?.listed], onIndex });
  r = await call("POST", "/library/forms/fill-from-index", undefined, null);
  ok("C2.6 X5 fail: nobody (no person named) cannot fill (401)", r.status === 401, r.status);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
