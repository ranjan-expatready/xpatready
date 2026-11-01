// X5 slice a (forms lane; P-156 (1), plan-p156 P156-1 and P156-2; C2.6): the form library filled from IRCC's forms and
// guides index, US$0 (the recorded copy: no AI, no PDF download). Every number becomes a library form, a new one "Listed by
// IRCC · no file yet"; a form already there is matched, never duplicated, and keeps its file; a later read whose date
// changed for a form with a file marks it "Newer edition on canada.ca", never replacing it. A pass and a fail per rule.
//   zsh studio/tools/isolated.sh forms_x5 4450 start && tsx studio/tests/check_forms_x5_library.ts 4450 xr_studio_forms_x5
import { execFileSync } from "node:child_process";
import fc from "fast-check";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { indexTitleOk, parseFormsIndex, realDate } from "../engine/canada.ts";
import { fileMonth, isLaterDate, libraryRows, newerOnIndex, planIndexFill } from "../engine/library-index.ts";

const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
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
  ok("C2.6 X5 break m6 + the outside check fail: a number listed twice, a checklist row first, is the form row whole: its kind, title, page and date (before: the checklist's page)", dup?.kind === "data_form" && dup.title === "Application form" && dup.pageUrl === "https://www.canada.ca/form.html" && dup.dateModified === "2024-06-01", dup);
  ok("C2.6 X5 review m2 fail: no 'newer' mark when the library's edition is already dated at or after the index's date (the fill's words agree with the list)", !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", editionMonth: "2025-03" }]).newer.length && planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", editionMonth: "2024-12" }]).newer.join() === "IMM 1295");
  ok("C2.6 X5 break m2 fail: an index date that went back, or one in another shape, marks nothing newer; a later one does", !isLaterDate("2023-09", "2099-01-01") && !isLaterDate("May 2024", "2024-01") && isLaterDate("2024-06", "2024-05-31") && !isLaterDate("2024-05", "2024-05-15"));
  ok("C2.6 X5 P156-2 pass: a later read with another date, for a form that has a file, marks it newer", planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.join() === "IMM 1295");
  ok("C2.6 X5 P156-2 fail: no mark for the same date, a form with no file, or a first read (no earlier date)", !planIndexFill([row("IMM 1295")], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: false, formPageUrl: "x" }]).newer.length && !planIndexFill([row("IMM 1295", { dateModified: "2025-02-01" })], [{ formKey: "IMM 1295", indexDateModified: null, hasFile: true, formPageUrl: "x" }]).newer.length);
  // Fill hardening (break m13, m15; the outside check on #145).
  const lf = (extra: object = {}) => ({ formKey: "IMM 1295", indexDateModified: "2024-05-01", hasFile: true, formPageUrl: "x", ...extra });
  // Review / break (e466adb1) M10, M11, the outside check: "newer" is judged by the dates: the index's month after the current edition's
  // month (canada.ca's when known, else the month printed in its label). Nothing stored, so nothing left wrong by events.
  ok("C2.6 X5 review (e466adb1) M10 pass: an edition's month is the month printed in its label, else canada.ca's (review 6bc5eb72: a page edit never makes an old file read as new); months out of range count as none", fileMonth({ canadaUpdated: "2024-10", editionLabel: "IMM 5488 (01-2019)" }) === "2019-01" && fileMonth({ canadaUpdated: "2023-01", editionLabel: "IMM 5488 (09-2023)" }) === "2023-09" && fileMonth({ canadaUpdated: "2024-10", editionLabel: "Guide 5289 (read 2026-10-31)" }) === "2024-10" && fileMonth({ editionLabel: "IMM 1 (12-9999)" }) === null && fileMonth({ editionLabel: "IMM 1 (01-0000)" }) === null && fileMonth({ canadaUpdated: "2025-13", editionLabel: "IMM 1" }) === null && fileMonth({ canadaUpdated: null, editionLabel: "IMM 1295 (09-2023)" }) === "2023-09" && fileMonth({ editionLabel: "Guide 5289 (read 2026-10-31)" }) === null && fileMonth({ editionLabel: "IMM 1295 (13-2023)" }) === null);
  ok("C2.6 X5 review (e466adb1) M10 fail: a hand-uploaded file (no canada.ca month) is newer only while the index is later than its own month: back to its month it is not (before: newer for good)", newerOnIndex("2025-06", "2023-09") && !newerOnIndex("2023-09", "2023-09") && !newerOnIndex("2020-01", "2023-09") && !newerOnIndex(null, "2023-09") && !newerOnIndex("2025-06", null));
  ok("C2.6 X5 review (6bc5eb72) M fail: a page re-dated after a check (canada.ca month 2026-10) never makes a 09-2023 file read as new: a later index date in that month is still newer (before: Ready on the 09-2023 file)", fileMonth({ canadaUpdated: "2026-10", editionLabel: "IMM 1295 (09-2023)" }) === "2023-09" && newerOnIndex("2026-10-20", fileMonth({ canadaUpdated: "2026-10", editionLabel: "IMM 1295 (09-2023)" }), "2026-10-05") && !newerOnIndex("2026-10-05", "2023-09", "2026-10-05"));
  ok("C2.6 X5 review (dc93b60f) M8 fail: an index date that goes back but is still later than the file stays newer (before: cleared; the row read Ready on 09-2023)", newerOnIndex("2025-03-01", "2023-09"));
  const named = planIndexFill([row("IMM 1295", { dateModified: "2025-06-01" })], [lf({ indexDateModified: "2023-09-01", editionMonth: "2023-09" })]);
  const again = planIndexFill([row("IMM 1295", { dateModified: "2025-08-01" })], [lf({ indexDateModified: "2025-06-01", editionMonth: "2023-09" })]);
  ok("C2.6 X5 P156-2 pass: the fill names a form the read made newer than its file, once (a later read of a form already newer does not name it again); nothing is stored for a dated file", named.newer.join() === "IMM 1295" && !again.newer.length, { named, again });
  ok("C2.6 X5 P156-2 fail: a form with no approved file is never named newer (a held or rejected upload leaves nothing behind: after an approval the list judges the approved file's month)", !planIndexFill([row("IMM 1295", { dateModified: "2025-06-01" })], [lf({ hasFile: false, indexDateModified: "2023-09-01" })]).newer.length);
  // Automated review (89cccd71): the index date is the page's; the baseline (the date last seen current) answers a page edit.
  ok("C2.6 X5 review (89cccd71) fail: with a baseline, the index must move past it: a page edited without a new edition reads newer only until a check sets the baseline at that date (before: newer for good, a check could not answer it)", newerOnIndex("2024-10", "2023-09") && !newerOnIndex("2024-10", "2023-09", "2024-10") && newerOnIndex("2025-02", "2023-09", "2024-10") && !newerOnIndex("2025-02", "2025-02", "2024-10"));
  const firstRead = planIndexFill([row("IMM 1295", { dateModified: "2024-10-01" })], [lf({ indexDateModified: null, editionMonth: "2023-09", currentId: "e1" })]);
  const firstAt = planIndexFill([row("IMM 1295", { dateModified: "2023-09-01" })], [lf({ indexDateModified: null, editionMonth: "2023-09", currentId: "e1" })]);
  ok("C2.6 X5 review (c5b8be03) fail: a dated file is never taken as current on trust: a first read later than its month names it newer (a check answers it); one at its month does not (before: the first read set a baseline that hid an old PDF)", firstRead.listed[0].seenCurrent === null && firstRead.newer.join() === "IMM 1295" && !firstAt.newer.length && firstAt.listed[0].seenCurrent === null, { firstRead, firstAt });
  const lateFile = planIndexFill([row("IMM 1295", { dateModified: "2025-06-01" })], [lf({ indexDateModified: "2025-06-01", editionMonth: "2023-09" })]);
  ok("C2.6 X5 review (e466adb1) M11 fail: a form that got its file after the first read (a held upload approved later) gets no baseline from a fill: the dates decide, so an older file reads newer", lateFile.listed[0].seenCurrent === null && newerOnIndex("2025-06-01", "2023-09", null), lateFile);
  const undFirst = planIndexFill([row("GUIDE 5289", { dateModified: "2024-01-01" })], [lf({ formKey: "GUIDE 5289", indexDateModified: null, currentId: "e9" })]);
  const undUp = planIndexFill([row("GUIDE 5289", { dateModified: "2025-06-01" })], [lf({ formKey: "GUIDE 5289", indexDateModified: "2024-01-01", currentId: "e9" })]);
  const undBack = planIndexFill([row("GUIDE 5289", { dateModified: "2023-06-01" })], [lf({ formKey: "GUIDE 5289", indexDateModified: "2024-01-01", currentId: "e9" })]);
  ok("C2.6 X5 P156-2 pass: an undated file is judged by change: its first read is its baseline (not newer); a later read than the one before is newer; a step back is not", undFirst.listed[0].seenCurrent === "2024-01-01" && !undFirst.newer.length && undUp.listed[0].seenCurrent === "2024-01-01" && undUp.newer.join() === "GUIDE 5289" && !undBack.newer.length && !newerOnIndex("2023-06-01", null, "2024-01-01"), { undFirst, undUp, undBack });
  const twice = planIndexFill([row("IMM 5373 B", { dateModified: "2023-01-01", title: "Old title", pageUrl: "https://www.canada.ca/old.html" }), row("IMM 5373 B", { dateModified: "2025-03-01", title: "New title", pageUrl: "https://www.canada.ca/new.html" })], [lf({ formKey: "IMM 5373 B", indexDateModified: "2024-01-01", formPageUrl: null })]);
  ok("C2.6 X5 break m15 / m26 fail: a number listed twice keeps its latest row whole: its date, title and page together (before: the first row's title and page with the latest date)", twice.listed[0]?.dateModified === "2025-03-01" && twice.listed[0]?.pageUrl === "https://www.canada.ca/new.html" && twice.newer.join() === "IMM 5373 B", twice);
  const link = (code: string, title: string, date = "2024-01-01") => `<tr><td>${code}</td><td><a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/${code.replace(/\W+/g, "").toLowerCase()}.html">${title}</a></td><td>${date}</td></tr>`;
  const dates = parseFormsIndex(`<table><tbody>${link("IMM 3333", "Good", "2024-02-30")}${link("IMM 4444", "Good too", "2024-02-29")}${link("IMM 5555", "", "2024-01-01")}</tbody></table>`);
  ok("C2.6 X5 break m15 fail: an impossible date is kept as no date; the parser keeps every numbered row (the finder and the check still find it by number)", dates.rows.map((r) => r.code).join() === "IMM 3333,IMM 4444,IMM 5555" && dates.rows[0].dateModified === null && dates.rows[1].dateModified === "2024-02-29", dates);
  ok("C2.6 X5 break m15 / m22 fail: a title the library cannot show (blank, only invisible characters, over 300 characters) is refused; 300 characters, emoji counted as one, is kept", !indexTitleOk("") && !indexTitleOk("\u200B\u00AD ") && !indexTitleOk("\u3164") && !indexTitleOk("\u2800\u2800") && !indexTitleOk("\u202E\u2066\u2069") && !indexTitleOk("\u115F\uFFA0\u034F") && !indexTitleOk("\u17B4\u17B5\uFE0F\u0301") && !indexTitleOk("\uD800") && indexTitleOk("e\u0301".repeat(300)) && !indexTitleOk("x".repeat(301)) && indexTitleOk("x".repeat(300)) && indexTitleOk("😀".repeat(151)) && indexTitleOk("Application for a visitor visa"));
  const lr = libraryRows([row("IMM 1111", { title: "" }), row("IMM 2222", { title: "x".repeat(301) }), row("IMM 3333", { title: "\u200B" }), row("IMM 3333", { title: "Good" }), row("IMM 4444")], ["IMM 9X"]);
  ok("C2.6 X5 break m15 / m23, review (e466adb1) 3 fail: the fill leaves out rows with no title it can show and counts each such number once as unreadable; a number that also has a good row is kept, not counted", lr.rows.map((r) => r.code).join() === "IMM 3333,IMM 4444" && lr.unreadable.join() === "IMM 9X,IMM 1111,IMM 2222", lr);
  ok("C2.6 X5 break m15 / m25 pass: real dates read as real (month ends, leap years, years IRCC could write); others not", realDate("2024-02-29") && realDate("2024-12") && !realDate("2023-02-29") && !realDate("2024-13") && !realDate("2024-04-31") && !realDate("May 2024") && !realDate("0000-01") && !realDate("9999-12"));

  // Automated review (89cccd71) / STANDARDS §7 [M]: property tests for the engine rules this PR changes, against a plain model.
  const thisMonth = new Date().toISOString().slice(0, 7);
  const month = fc.record({ y: fc.integer({ min: 1990, max: 2027 }), m: fc.integer({ min: 1, max: 12 }) }).map(({ y, m }) => `${y}-${String(m).padStart(2, "0")}`).filter((m) => m <= thisMonth);
  const day = fc.tuple(month, fc.integer({ min: 1, max: 28 })).map(([mo, d]) => `${mo}-${String(d).padStart(2, "0")}`);
  const prop = (name: string, p: fc.IPropertyWithHooks<any> | fc.IProperty<any>) => { let err = ""; try { fc.assert(p, { numRuns: 500 }); } catch (e) { err = String(e).slice(0, 300); } ok(name, !err, err); }; // eslint-disable-line @typescript-eslint/no-explicit-any
  prop("C2.6 X5 property: newerOnIndex is exactly 'moved past the baseline, and after the file's month where known'", fc.property(fc.option(day, { nil: null }), fc.option(month, { nil: null }), fc.option(day, { nil: null }), (idx, file, seen) => {
    const model = !!idx && (!seen || idx > seen) && (file ? idx.slice(0, 7) > file : !!seen);
    return newerOnIndex(idx, file, seen) === model;
  }));
  prop("C2.6 X5 property: a successful check (baseline = the index date) always answers 'newer' until the index moves again", fc.property(day, fc.option(month, { nil: null }), (idx, file) => !newerOnIndex(idx, file, idx)));
  prop("C2.6 X5 property: a file dated at or after the index month is never newer", fc.property(day, month, fc.option(day, { nil: null }), (idx, file, seen) => file < idx.slice(0, 7) || !newerOnIndex(idx, file, seen)));
  prop("C2.6 X5 property: isLaterDate is a strict order on real dates (never both ways, never with itself)", fc.property(day, day, (a, b) => !(isLaterDate(a, b) && isLaterDate(b, a)) && !isLaterDate(a, a) && (a === b || isLaterDate(a, b) || isLaterDate(b, a))));
  prop("C2.6 X5 property: fileMonth reads MM-YYYY from a label first, whatever canada.ca's month; canada.ca's only without one", fc.property(month, fc.option(month, { nil: null }), (mo, ca) => fileMonth({ canadaUpdated: ca, editionLabel: `IMM 1295 (${mo.slice(5)}-${mo.slice(0, 4)})` }) === mo && fileMonth({ canadaUpdated: ca, editionLabel: "IMM 1295" }) === ca));
  prop("C2.6 X5 property: realDate accepts exactly the real calendar days in range", fc.property(fc.integer({ min: 1980, max: 2035 }), fc.integer({ min: 0, max: 13 }), fc.integer({ min: 0, max: 32 }), (y, m, d) => {
    const s = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dt = new Date(Date.UTC(y, m - 1, d));
    const real = m >= 1 && m <= 12 && d >= 1 && dt.getUTCMonth() === m - 1 && y >= 1990 && y <= new Date().getUTCFullYear() + 1;
    return realDate(s) === real;
  }));
  prop("C2.6 X5 property: libraryRows puts every number in the rows or in unreadable, never both, never twice", fc.property(fc.array(fc.record({ code: fc.constantFrom("IMM 1", "IMM 2", "IMM 3", "IMM 4"), title: fc.oneof(fc.constant(""), fc.constant("\u200B"), fc.constant("x".repeat(301)), fc.string({ minLength: 1, maxLength: 20 })) }), { maxLength: 8 }), (rs) => {
    const out = libraryRows(rs.map((r) => row(r.code, { title: r.title })));
    const kept = new Set(out.rows.map((r) => r.code)), codes = new Set(rs.map((r) => r.code));
    return out.unreadable.every((c) => !kept.has(c)) && new Set(out.unreadable).size === out.unreadable.length && [...codes].every((c) => kept.has(c) || out.unreadable.includes(c)) && out.rows.every((r) => indexTitleOk(r.title));
  }));

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
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${withFile}'`); sql(`update form_edition set index_date_seen_current = '2000-01-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`); // the last check (seen current) was 2000-01
  sql(`update form_edition set canada_updated = '2000-01', edition_label = regexp_replace(edition_label, '\\(\\d{2}-\\d{4}\\)$', '(01-2000)') where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`); // the file and its label from 01-2000 // the library's edition older than IRCC's list
  const noFileKey = listed.code;
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${noFileKey}'`);
  r = await call("POST", "/library/forms/fill-from-index");
  const list2 = (await call("GET", "/library/forms/list")).body, kept2 = list2.rows.find((x: any) => x.code === withFile), nf2 = list2.rows.find((x: any) => x.code === noFileKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-2 pass: a later read with a changed date marks the form with a file 'newer on canada.ca'; its file stays", r.body.newer?.includes(withFile) && kept2?.status === "newer_file" && kept2.newer_on_index === true && sql(`select count(*) from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${withFile}'`) === fileBefore, { newer: r.body.newer, kept2 });
  ok("C2.6 X5 review m2 pass: every form the fill calls newer shows 'newer' in the list (one rule for both)", (r.body.newer as string[]).every((code) => list2.rows.find((x: any) => x.code === code)?.status === "newer_file"), r.body.newer); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 P156-2 fail: a form with no file is never marked newer (it stays 'no file yet')", !r.body.newer?.includes(noFileKey) && nf2?.status === "no_file", nf2?.status);
  // X5 break M2, review (e466adb1), break (63d2ba6d) M13: a check that finds canada.ca serving another file (other bytes than
  // the library's current file, whatever the dates) leaves the row as it was: still newer, no baseline. The library's file is
  // played as another approved file (another checksum on the approved list).
  const ws2 = sql(`select workspace_id from gov_form_def where form_key = '${withFile}'`);
  const realSha = sql(`select sha256 from form_edition where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE' limit 1`);
  sql(`insert into approved_source (id, workspace_id, sha256, kind, file_name, ircc_page, uploaded_by, approved_by) values (gen_random_uuid(), '${ws2}', 'd' || repeat('0', 63), 'form', 'other.pdf', 'https://www.canada.ca/x.html', 'user-A', 'user-B')`);
  sql(`update form_edition set sha256 = 'd' || repeat('0', 63) where sha256 = '${realSha}'`);
  // Review (6bc5eb72) Should 3: an older approved edition that is canada.ca's file never vouches for the current one.
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'sha256', '${realSha}', 'edition_label', '${withFile} (01-1999)', 'index_date_seen_current', null) from form_edition e where e.sha256 = 'd' || repeat('0', 63) limit 1))`);
  const before2 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  const chk = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const after2 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  const seen2 = sql(`select coalesce(index_date_seen_current, '') from form_edition where sha256 = 'd' || repeat('0', 63)`);
  ok("C2.6 X5 break (63d2ba6d) M13 fail: a check that finds canada.ca serving another file than the current one says so and leaves the row newer, with no baseline, even when an older edition is canada.ca's file (before: same dates and address read as current)", chk.status === 201 && chk.body?.outcome === "check" && before2 === "newer_file" && after2 === "newer_file" && seen2 !== sql(`select index_date_modified from gov_form_def where form_key = '${withFile}'`), { status: chk.status, outcome: chk.body?.outcome, before2, after2, seen2 });
  sql(`delete from form_edition where edition_label = '${withFile} (01-1999)'`);
  sql(`update form_edition set sha256 = '${realSha}' where sha256 = 'd' || repeat('0', 63)`);
  sql(`delete from approved_source where sha256 = 'd' || repeat('0', 63)`);
  // X5 break M3 / the outside check: the mark is answered once the library holds an edition canada.ca dates at or after the index's date.
  sql(`update gov_form_def set index_date_modified = '2025-02-01' where form_key = '${withFile}'`); sql(`update form_edition set index_date_seen_current = '2000-01-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  const before3 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update form_edition set edition_label = regexp_replace(edition_label, '\\(\\d{2}-\\d{4}\\)$', '(03-2025)') where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`); // a file printed 03-2025
  const after3 = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update form_edition set edition_label = regexp_replace(edition_label, '\\(\\d{2}-\\d{4}\\)$', '(01-2000)') where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`);
  ok("C2.6 X5 break M3 fail: once the library's edition is dated at or after the index's date, the form is no longer 'newer' (before: marked until a check)", before3 === "newer_file" && after3 !== "newer_file", { before3, after3 });
  // Review (5a5f0d16) m2 / the outside check: a held (unapproved) edition with a later date never hides the mark: the fill judges the
  // same current edition as the list. A copy of the edition, unapproved (another checksum), dated 2099-01, is added.
  sql(`update form_edition set canada_updated = '2000-01', edition_label = regexp_replace(edition_label, '\\(\\d{2}-\\d{4}\\)$', '(01-2000)') where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`); // the file and its label from 01-2000
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'sha256', 'f' || repeat('0', 63), 'canada_updated', '2099-01', 'edition_label', e.edition_label || ' (held copy)') from form_edition e where e.gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') limit 1))`);
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${withFile}'`); sql(`update form_edition set index_date_seen_current = '2000-01-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  const rHeld = await call("POST", "/library/forms/fill-from-index");
  const heldRow = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review m2 / the outside check fail: a held edition with a later date does not hide the mark: the fill and the list both say newer (one current edition)", rHeld.body.newer?.includes(withFile) && heldRow?.status === "newer_file", { newer: rHeld.body.newer, status: heldRow?.status });
  // X5 break (57f7d79d) M6, review (63d2ba6d) Should 2: the check compares the library's current (approved) file, never a
  // held copy, and writes the baseline on that file only: the held copy, even with canada.ca's own date and address, keeps
  // its own (so it cannot read Ready once approved on the strength of another file's check).
  sql(`update form_edition set canada_updated = '${chk.body?.last_updated ?? "2099-01"}', source_url = '${chk.body?.pdf_url ?? ""}' where sha256 = 'f' || repeat('0', 63)`);
  const heldSeenBefore = sql(`select coalesce(index_date_seen_current, '-') from form_edition where sha256 = 'f' || repeat('0', 63)`);
  const chkHeld = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const heldSeenAfter = sql(`select coalesce(index_date_seen_current, '-') from form_edition where sha256 = 'f' || repeat('0', 63)`);
  const currentSeen = sql(`select coalesce(index_date_seen_current, '-') from form_edition where sha256 = '${realSha}'`);
  ok("C2.6 X5 break M6 / review (63d2ba6d) Should 2 fail: the check answers on the library's current file only: its baseline becomes the index date, a held copy's stays as it was", chkHeld.body?.outcome === "current" && heldSeenAfter === heldSeenBefore && currentSeen === sql(`select index_date_modified from gov_form_def where form_key = '${withFile}'`), { outcome: chkHeld.body?.outcome, m: msg(chkHeld), heldSeenBefore, heldSeenAfter, currentSeen });
    sql(`delete from form_edition where sha256 = 'f' || repeat('0', 63)`);
  // Automated review (89cccd71): a page edited without a new edition moves the index date: the form reads newer until a check
  // finds its PDF current, which sets the baseline at that index date (before: a check could not answer it).
  sql(`update form_edition set canada_updated = '${chk.body?.last_updated ?? "2023-09"}', source_url = '${chk.body?.pdf_url ?? ""}' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`);
  sql(`update gov_form_def set index_date_modified = '2026-01-01' where form_key = '${withFile}'`); sql(`update form_edition set index_date_seen_current = '2000-01-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
  const editedBefore = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  const answer = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const editedAfter = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review (89cccd71) fail: a check that finds the PDF current answers a page edit: the form reads Ready, its baseline at the index date (before: newer for good)", editedBefore === "newer_file" && answer.body?.outcome === "current" && editedAfter === "ready" && sql(`select string_agg(distinct coalesce(index_date_seen_current, '-'), ',') from form_edition where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`).includes("2026-01-01"), { editedBefore, outcome: answer.body?.outcome, m: msg(answer), editedAfter });
  // Break (63d2ba6d) M14: a file with no canada.ca date or address (a hand upload, an approved held file) is answered by a
  // check too: the same bytes as canada.ca's re-date it and set its baseline (before: the check could never say current).
  sql(`update form_edition set canada_updated = null, source_url = null, index_date_seen_current = null where sha256 = '${realSha}'`);
  sql(`update gov_form_def set index_date_modified = '2026-02-01' where form_key = '${withFile}'`);
  const undBefore = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  const undChk = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  const undAfter = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 break (63d2ba6d) M14 fail: an uploaded file with no canada.ca date is answered by one check when its bytes are canada.ca's: its baseline is set (it is not re-dated from the page: review 6bc5eb72), Ready, and the check is in the audit trail", undBefore === "newer_file" && undChk.body?.outcome === "current" && undAfter === "ready" && sql(`select coalesce(canada_updated, '') from form_edition where sha256 = '${realSha}'`) === "" && sql(`select coalesce(index_date_seen_current, '') from form_edition where sha256 = '${realSha}'`) === "2026-02-01" && /checked .* against canada.ca: the library's file \(.+\) is canada.ca's current PDF/.test(sql(`select summary from audit_event where action = 'checked' order by at desc limit 1`)), { undBefore, outcome: undChk.body?.outcome, undAfter });
  // Break m36, the outside check (6bc5eb72): a check never lowers a later baseline, and canada.ca's own bytes end a finder's
  // "new file" marker on the current file.
  sql(`update form_edition set index_date_seen_current = '2099-01-01', newer_file_sha256 = 'c' || repeat('0', 63) where sha256 = '${realSha}'`);
  const lowChk = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  ok("C2.6 X5 break m36 / outside check (6bc5eb72) fail: a current check keeps a later baseline and clears the finder's new-file marker (the row reads Ready, not 'newer file')", lowChk.body?.outcome === "current" && sql(`select index_date_seen_current from form_edition where sha256 = '${realSha}'`) === "2099-01-01" && sql(`select coalesce(newer_file_sha256, '') from form_edition where sha256 = '${realSha}'`) === "" && (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status === "ready", { outcome: lowChk.body?.outcome }); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 break (0796fc0c) m45 fail: the check's audit line names the baseline the file keeps (2099-01-01), not the date it offered", sql(`select detail->>'baseline' from audit_event where action = 'checked' order by at desc limit 1`) === "2099-01-01");
  // The outside check (0796fc0c): a form with no approved file is answered before anything is downloaded.
  sql(`update form_edition set sha256 = 'b' || repeat('0', 63) where sha256 = '${realSha}'`);
  const noApproved = await call("POST", `/library/forms/${encodeURIComponent(withFile)}/check-canada`);
  ok("C2.6 X5 outside check (0796fc0c) fail: a form with no approved file gets 'no approved file … upload its PDF' (before: it downloaded first, and a missing PDF gave 409)", noApproved.status === 201 && noApproved.body?.outcome === "check" && /no approved file/.test(noApproved.body?.message ?? ""), { status: noApproved.status, m: noApproved.body?.message ?? msg(noApproved) });
  sql(`update form_edition set sha256 = '${realSha}' where sha256 = 'b' || repeat('0', 63)`);
  sql(`update form_edition set index_date_seen_current = '2026-02-01' where sha256 = '${realSha}'`);
  const guideKey = sql(`select form_key from gov_form_def where form_kind = 'guide' limit 1`);
  const gChk = guideKey ? await call("POST", `/library/forms/${encodeURIComponent(guideKey)}/check-canada`) : { status: 0, body: null };
  ok("C2.6 X5 break (6bc5eb72) m40 fail: the API refuses to check a guide, as the page does (409, in words; before: it compared a form's PDF with the guide)", gChk.status === 409 && /is a guide/.test(msg(gChk)), { guideKey, status: gChk.status, m: msg(gChk) });
  // Automated review (c5b8be03): the baseline is the checked file's own: a replacement file older than the index starts without
  // one and reads newer (before: the form's baseline, set for the old file, hid it).
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'canada_updated', null, 'index_date_seen_current', null, 'edition_label', '${withFile} (02-2025)') from form_edition e where e.gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and e.channel <> 'ONLINE' limit 1))`);
  const replacedRow = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review (c5b8be03) fail: a replacement file (02-2025) older than the index (2026-01) reads newer even though the old file was checked current at that index date", replacedRow?.edition === `${withFile} (02-2025)` && replacedRow?.status === "newer_file", { edition: replacedRow?.edition, status: replacedRow?.status });
  sql(`delete from form_edition where edition_label = '${withFile} (02-2025)'`);
  // Review (dc93b60f): the three API wirings, each with a check that fails without it.
  // (1) M8 / M10: a file dated at or after the index's date is not newer, whatever an earlier read said.
  sql(`update form_edition set canada_updated = '2099-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
    await call("POST", "/library/forms/fill-from-index");
  ok("C2.6 X5 review (dc93b60f) M8 / (e466adb1) M10 fail: a file dated at or after the index's date reads Ready, even with a mark an earlier read left (before: a stored mark decided)", (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === withFile)?.status === "ready"); // eslint-disable-line @typescript-eslint/no-explicit-any
    // (2) M9 / M11: a held upload, a fill that moves the index's date on, then the approval: the approved file reads newer, with
  // nothing stored by the fill (so a fill running during the approval cannot lose it). The approval is played by copying an
  // approved edition's file onto the form under an older label.
  const ws = sql(`select workspace_id from gov_form_def where form_key = '${noFileKey}'`);
  sql(`insert into intake_item (id, workspace_id, file_name, stored_path, sha256, bytes, kind, code, outcome, status, created_by) values (gen_random_uuid(), '${ws}', 'held.pdf', '/tmp/held.pdf', 'e' || repeat('0', 63), 1, 'form', '${noFileKey}', 'held', 'HELD', 'user-A')`);
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${noFileKey}'`);
  const rUp = await call("POST", "/library/forms/fill-from-index");
  const indexNow = sql(`select index_date_modified from gov_form_def where form_key = '${noFileKey}'`);
  sql(`delete from intake_item where sha256 = 'e' || repeat('0', 63)`);
  sql(`insert into form_edition select * from jsonb_populate_record(null::form_edition, (select to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'gov_form_def_id', (select id from gov_form_def where form_key = '${noFileKey}'), 'canada_updated', null, 'edition_label', '${noFileKey} (01-2001)') from form_edition e where e.gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and e.channel <> 'ONLINE' limit 1))`);
  const approvedRow = (await call("GET", "/library/forms/list")).body.rows.find((x: any) => x.code === noFileKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C2.6 X5 review (dc93b60f) M9 / (e466adb1) M11 fail: a held upload approved after the index moved on reads newer (its label's month before the index's), and the fill did not call it newer while it had no file", /^\d{4}/.test(indexNow) && approvedRow?.status === "newer_file" && !rUp.body.newer?.includes(noFileKey), { indexNow, status: approvedRow?.status, newer: rUp.body.newer });
  sql(`delete from form_edition where edition_label = '${noFileKey} (01-2001)'`);
  // (3) m24: four fills at once, one form newly newer: only the fill that set the mark names it.
  sql(`update form_edition set canada_updated = '2000-01', edition_label = regexp_replace(edition_label, '\\(\\d{2}-\\d{4}\\)$', '(01-2000)') where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}') and channel <> 'ONLINE'`); // the file and its label from 01-2000
  sql(`update gov_form_def set index_date_modified = '2000-01-01' where form_key = '${withFile}'`); sql(`update form_edition set index_date_seen_current = '2000-01-01' where gov_form_def_id = (select id from gov_form_def where form_key = '${withFile}')`);
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
  ok("C2.6 X5 break m14 / the outside check (#145) fail: each of two fills at once says every listed form is there, new or already (before: the losing fill counted its plan: '0 new, 9 already')", f1.body.created + f1.body.listed === onIndex && f2.body.created + f2.body.listed === onIndex, { a: [f1.body?.created, f1.body?.listed], b: [f2.body?.created, f2.body?.listed], onIndex });
  // ── X5 slice c (the tech lead on #138): a deletion is remembered; a later fill skips it until a person adds the form back.
  // A recorded official PDF whose form is listed with no file (plain): delete it (a second person approves), fill, add back.
  const recorded = readdirSync(join(OFFICIAL, "forms")).map((f) => /^(imm|irm)(\d{4})e\.pdf$/.exec(f)).filter((m): m is RegExpExecArray => !!m);
  const plainNow = new Set(((await call("GET", "/library/forms/list")).body.rows as any[]).filter((x) => x.status === "no_file" && x.action?.kind === "DELETE").map((x) => x.code)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pick = recorded.find((m) => plainNow.has(`${m[1].toUpperCase()} ${m[2]}`))!;
  const gk = `${pick[1].toUpperCase()} ${pick[2]}`, gkU = encodeURIComponent(gk);
  const del = await call("DELETE", `/library/forms/${gkU}`, { reason: "Not needed in this library" });
  const appr = await call("POST", `/library/changes/${del.body?.id}/approve`, { note: "Checked: unused" }, "user-B");
  const inLib = () => sql(`select count(*) from gov_form_def where form_key = '${gk}'`);
  ok("C3.12 X5 slice c pass: an approved delete of a listed form leaves the library and is remembered (who, which change)", del.body?.status === "WAITING" && appr.status < 300 && inLib() === "0" && sql(`select deleted_by || ' ' || (change_id = '${del.body?.id}') from library_form_deletion where form_key = '${gk}'`) === "user-B true", { gk, del: del.body?.status, appr: appr.status });
  const fd1 = await call("POST", "/library/forms/fill-from-index");
  ok("C3.12 X5 slice c fail: a later fill does not list the deleted form again, and says so in words (before: it came back as 'new')", fd1.status === 201 && inLib() === "0" && fd1.body.deleted?.includes(gk) && /1 left out that was deleted from the library \(/.test(fd1.body.message) && !fd1.body.created, { m: fd1.body?.message, created: fd1.body?.created });
  ok("C3.12 X5 slice c pass: the fill's counts still add up (created + already + deleted = the forms IRCC lists)", fd1.body.listed + fd1.body.created + fd1.body.deleted.length === Number(sql("select count(*) from gov_form_def where listed_on_index_at is not null")) + 1, { listed: fd1.body.listed, created: fd1.body.created });
  // The memory removed by hand: the same fill lists the form again, so the memory alone kept it out.
  sql(`delete from library_form_deletion where form_key = '${gk}'`);
  const fd2 = await call("POST", "/library/forms/fill-from-index");
  ok("C3.12 X5 slice c fail: without the memory the form is listed again (the memory, not chance, kept it out)", fd2.status === 201 && inLib() === "1" && !fd2.body.deleted?.length, { m: fd2.body?.message });
  // Delete again, then a person uploads canada.ca's PDF: the memory is forgotten, and the next fill lists the form.
  const del2 = await call("DELETE", `/library/forms/${gkU}`, { reason: "Not needed in this library" });
  await call("POST", `/library/changes/${del2.body?.id}/approve`, { note: "Checked: unused" }, "user-B");
  const fdUp = new FormData(); fdUp.append("files", new Blob([new Uint8Array(readFileSync(join(OFFICIAL, "forms", pick[0])))], { type: "application/pdf" }), pick[0]);
  const up = await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fdUp })).json() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C3.12 X5 slice c pass: a person uploading the form adds it back: the memory is forgotten", inLib() === "1" && sql(`select count(*) from library_form_deletion where form_key = '${gk}'`) === "0", up?.results?.[0]);
  const fd3 = await call("POST", "/library/forms/fill-from-index");
  ok("C3.12 X5 slice c pass: after the add-back a fill treats it as any form (already there, nothing left out)", fd3.status === 201 && !fd3.body.deleted?.length && inLib() === "1", { m: fd3.body?.message });
  // Review / break (02ca83a5) M1: a schedule (IMM 0008 SCH4) cannot come back through an upload (the reader files its PDF as
  // IMM 0008); "List again" is the way back for every number.
  const sch = "IMM 0008 SCH4", schU = encodeURIComponent(sch);
  if (sql(`select count(*) from gov_form_def where form_key = '${sch}'`) === "1") {
    const ds = await call("DELETE", `/library/forms/${schU}`, { reason: "Not needed in this library" });
    await call("POST", `/library/changes/${ds.body?.id}/approve`, { note: "Checked: unused" }, "user-B");
    const listed = (await call("GET", "/library/forms/list")).body.remembered_deletions as { code: string; deleted_by: string }[];
    const fsch = await call("POST", "/library/forms/fill-from-index");
    ok("C3.12 X5 slice c pass: the list names each remembered deletion with who approved it, and the fill says how to bring one back (List again)", listed?.some((d) => d.code === sch && d.deleted_by !== "") && fsch.body.deleted?.includes(sch) && /"List again" under the table brings it back/.test(fsch.body.message), { listed, m: fsch.body?.message });
    const noB = await call("POST", `/library/forms/${schU}/list-again`, undefined, "user-B");
    ok("C3.12 X5 slice c fail: only an author lists a deleted form again (approver 403), and nothing changes", noB.status === 403 && sql(`select count(*) from library_form_deletion where form_key = '${sch}'`) === "1", noB.status);
    // Review (00007dd0) 3: a form IRCC added since the last fill (played by removing one plain listed row) is listed by the
    // same fill, and the answer says so.
    const extra = [...plainNow].find((c) => c !== gk && c !== sch && sql(`select count(*) from gov_form_def where form_key = '${c}'`) === "1")!;
    sql(`delete from gov_form_def where form_key = '${extra}'`);
    const la = await call("POST", `/library/forms/${schU}/list-again`);
    ok("C3.12 X5 review/break (02ca83a5) M1 fail: List again brings a deleted schedule back at once (before: no way back but a demo reset)", la.status === 201 && la.body?.listed === true && sql(`select count(*) from gov_form_def where form_key = '${sch}'`) === "1" && sql(`select count(*) from library_form_deletion where form_key = '${sch}'`) === "0" && /listed again/.test(la.body?.message ?? ""), { status: la.status, b: la.body });
    ok("C3.12 X5 review (00007dd0) 3 fail: List again says when its fill also listed other new forms (before: only the one form was named)", la.body?.others === 1 && /also listed 1 other new form/.test(la.body?.message ?? "") && sql(`select count(*) from gov_form_def where form_key = '${extra}'`) === "1", { others: la.body?.others, m: la.body?.message });
    const la2 = await call("POST", `/library/forms/${schU}/list-again`);
    ok("C3.12 X5 slice c fail: List again on a form that is not a remembered deletion says so (404)", la2.status === 404 && /not among the forms deleted/.test(msg(la2)), la2.status);
  } else ok("C3.12 X5 slice c set-up: IMM 0008 SCH4 is listed by IRCC's recorded forms list", false, "not in the library after the fill");
  // Review (02ca83a5) 2: a delete approved while a fill runs (after its first read of the memory, before its insert) is
  // still honoured: played by a trigger that writes the memory row as the fill inserts the form.
  const raceKey = [...plainNow].find((c) => c !== gk && c !== sch && sql(`select count(*) from gov_form_def where form_key = '${c}'`) === "1")!;
  sql(`delete from gov_form_def where form_key = '${raceKey}'`);
  sql(`create or replace function x5c_race() returns trigger language plpgsql as $$ begin if new.form_key = '${raceKey}' then insert into library_form_deletion (id, workspace_id, form_key, deleted_by) values (gen_random_uuid(), new.workspace_id, new.form_key, 'user-B') on conflict do nothing; end if; return new; end $$`);
  sql(`create trigger x5c_race after insert on gov_form_def for each row execute function x5c_race()`);
  const fr = await call("POST", "/library/forms/fill-from-index");
  sql(`drop trigger x5c_race on gov_form_def`); sql(`drop function x5c_race()`);
  ok("C3.12 X5 review (02ca83a5) 2 fail: a delete approved during a fill is honoured: the fill removes its own new row and lists the form as left out (before the second look: it came back while remembered)", fr.status === 201 && sql(`select count(*) from gov_form_def where form_key = '${raceKey}'`) === "0" && fr.body.deleted?.includes(raceKey) && !fr.body.created, { raceKey, created: fr.body?.created, deleted: fr.body?.deleted });
  sql(`delete from library_form_deletion where form_key = '${raceKey}'`);
  // Demo reset forgets every remembered deletion (nothing is left behind for the next workspace).
  const del3 = await call("DELETE", `/library/forms/${encodeURIComponent([...plainNow].find((c) => c !== gk && c !== sch && c !== raceKey)!)}`, { reason: "Not needed in this library" });
  await call("POST", `/library/changes/${del3.body?.id}/approve`, { note: "Checked: unused" }, "user-B");
  const remembered = sql("select count(*) from library_form_deletion");
  await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C3.12 X5 slice c pass: Reset to blank forgets remembered deletions", remembered === "1" && sql("select count(*) from library_form_deletion") === "0", { remembered });
  r = await call("POST", "/library/forms/fill-from-index", undefined, null);
  ok("C2.6 X5 fail: nobody (no person named) cannot fill (401)", r.status === 401, r.status);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
