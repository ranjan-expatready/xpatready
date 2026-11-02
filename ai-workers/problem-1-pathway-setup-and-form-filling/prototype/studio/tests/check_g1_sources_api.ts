// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §6) at API level, on an isolated copy: a release
// with a published number that has no source entry or "None published – set by ExpatReady" is refused on all three
// routes, naming every number; the source register's GET and PUT (400 per field, 403, 404, 409 on an old version or a
// moved value, the audit line); a released row keeps its catalogue status while its draft lists its numbers; a Live row
// with no draft changes shows no source problem (tech lead on #568); the fingerprint; the tech lead's condition on
// Decision 1 (#558): a Sample entry passes only in the demo workspace, as a Demo release, and the same content in a
// non-demo workspace (STUDIO_WORKSPACE_KEY) is refused naming each item; Reset clears the entries; the Visitor visa
// still releases as a Demo release. Pass and fail per rule. No model call (US$0). It restarts its own copy once with
// STUDIO_WORKSPACE_KEY=firm (same database) and once back.
//   zsh studio/tools/isolated.sh screens_g1api 4446 start && tsx studio/tests/check_g1_sources_api.ts 4446 xr_studio_screens_g1api
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // CommonJS, so the browser suites (.cjs) share it

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_g1api", NAME = DB.replace(/^xr_studio_/, "");
const STUDIO = join(import.meta.dirname, "..");
const { call } = client(PORT, DB);
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const { ok, summary } = recorder();
const AUTHOR = "user-A", SME = "user-C", APPROVER = "user-B";
const NONE = "Add the official source, or mark 'None published – set by ExpatReady'.";
/** Restarts this copy (same database and files), with the extra settings given. */
const restart = (...env: string[]) => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", ...env], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const idOf = (key: string) => sql(`select id from combination where combination_key='${key}'`);
const sources = async (id: string) => (await call("GET", `/combinations/${id}/sources`)).body;
const put = (id: string, n: { kind: string; key: string }, body: unknown, actor = AUTHOR) => call("PUT", `/combinations/${id}/sources/${encodeURIComponent(n.kind)}/${encodeURIComponent(n.key)}`, body, actor);
const leaf = async (id: string) => {
  const out: { combinationId?: string; status?: string; statusText?: string; setup?: unknown }[] = [];
  const walk = (x: unknown): void => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (o.kind === "combination" && o.combinationId) out.push(o); Object.values(o).forEach(walk); } };
  walk((await call("GET", "/catalogue")).body);
  // The full setup checklist (its open items) is on the combination's summary; the catalogue card carries the viewer's.
  return { ...out.find((l) => l.combinationId === id)!, setup: (await call("GET", `/combinations/${id}/summary`)).body.setup };
};
/** "Fix n problems" items of the setup checklist, as the catalogue card counts them. */
const fixItems = (setup: unknown) => [...JSON.stringify(setup ?? {}).matchAll(/"kind":"fix_problems","count":(\d+)/g)].reduce((t, m) => t + Number(m[1]), 0);
const submitSignApprove = async (id: string, note: string) => {
  const sub = await call("POST", `/combinations/${id}/submit`, { note }, AUTHOR);
  if (sub.status >= 300) return { step: "submit", r: sub };
  const items = ((sub.body.changeSummary ?? []) as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`);
  const sign = items.length ? await call("POST", `/combinations/${id}/signoff`, { items, action: "signed", note: "G1 check" }, SME) : { status: 200, body: null };
  if (sign.status >= 300) return { step: "sign", r: sign };
  return { step: "approve", r: await call("POST", `/combinations/${id}/approve`, undefined, APPROVER) };
};

try {
  // ------------------------------------------------------------------ setup: Reset, then the fixture sample with "With an LMIA" as Release 1
  sql(`update workspace set key='demo' where key<>'demo'`); // a run that stopped half-way left it renamed
  let r = await call("POST", "/demo/reset", { confirm: "RESET" });
  r = await call("POST", "/demo/load");
  ok("setup: Reset, then the sample inputs loaded (With an LMIA imported as Release 1)", r.status === 201, r.status === 201 ? undefined : r.body);
  const wp = idOf("wp.family");

  // ------------------------------------------------------------------ M4 scaffolding: the import's own citations, before Release 1
  let s = await sources(wp);
  const held = s.counts.held_back as number;
  console.log(`REPORT  held back after Reset on the work-permit release (dates on): ${held} of ${s.counts.total} numbers (${s.counts.cited} cited by the import)`);
  ok("C5.4 M4 pass: after Reset and load, the import cited the numbers its own quote states in digits, from the sample load; 27 numbers (dates on)",
    s.counts.total === 27 && s.counts.cited === 10 && s.numbers.filter((n: { state: string }) => n.state === "cited").every((n: { entry: { from_sample_load: boolean; cited: { url: string } } }) => n.entry.from_sample_load && /^https:\/\/www\.canada\.ca\//.test(n.entry.cited.url)), s.counts);
  ok("C5.4 M4 fail: the numbers no quote states in digits (90, 30, one year, 7 June 2019, the exceptional-situation 5) stay held back: 17",
    held === 17 && s.numbers.filter((n: { passes: boolean }) => !n.passes).every((n: { state: string }) => n.state === "missing"), s.numbers.filter((n: { passes: boolean }) => !n.passes).map((n: { value: string }) => n.value));
  let page = (await call("GET", `/combinations/${wp}`)).body;
  ok("C5.4 M4 pass: Release 1 froze the import's entries, so nothing reads \"changed since Release 1\" after Reset", page.draft.matches_release === true && page.draft.changes.length === 0, page.draft.changes);
  ok("C5.4 #568 pass: the Live combination with no draft changes lists no source problem on its page (nothing to submit); GET sources still counts them",
    page.draft.problems.filter((p: { gate?: string }) => p.gate === "no-source").length === 0 && held > 0);

  // ------------------------------------------------------------------ tech lead on #568: a Live row with no draft changes shows no source problem
  let row = await leaf(wp);
  const fixBefore = fixItems(row.setup);
  ok("C5.4 #568 pass: the Live row with no draft changes keeps its status and shows no source problem (\"Fix n problems\" counts none of them)", row.status === "READY" && fixBefore === 0 && held > 0, { status: row.statusText, fix: fixBefore });

  // ------------------------------------------------------------------ fingerprint (BR-9)
  const vv = idOf("vv.single");
  const vvSha = (await call("GET", `/combinations/${vv}`)).body.draft.sha256;
  const vvCfg = (await call("GET", `/combinations/${vv}/config`)).body.snapshot;
  const n90 = s.numbers.find((n: { key: string }) => n.key === "wp.family/RW_PASSPORT_EXPIRY_90");
  const shaBefore = page.draft.sha256;
  r = await put(wp, n90, { address: n90.address, value: n90.value, none_published: { reason: "ExpatReady's own warning lead time: IRCC publishes none" }, version: 0 });
  ok("C5.4 PUT pass: a \"None published\" answer with its reason saves: 200, version 1, state none_published", r.status === 200 && r.body.entry.version === 1 && r.body.state === "none_published" && r.body.passes === true, r.body);
  page = (await call("GET", `/combinations/${wp}`)).body;
  ok("C5.4 BR-7 fail: once the draft differs from its release, its page lists every number still held back, each in §5's words, routed by its own where",
    page.draft.problems.filter((p: { gate?: string }) => p.gate === "no-source").length === held - 1 && page.draft.problems.some((p: { gate?: string; message: string; where: string }) => p.gate === "no-source" && p.where === "Checks" && p.message === `Passport days until expiry: at most 30 has no source entry. ${NONE}`));
  const srcLines = page.draft.changes.filter((c: { kind: string }) => c.kind === "Source");
  ok("C5.4 BR-9 fail: one entry moves the fingerprint and adds exactly one Source change, for the expert to sign", page.draft.sha256 !== shaBefore && page.draft.changes.length === 1 && srcLines.length === 1 && srcLines[0].needs_sme === true && /Passport days until expiry: at most 90: None published – set by ExpatReady$/.test(srcLines[0].label), page.draft.changes);
  ok("C5.4 BR-9 pass: a combination with no entries carries no `sources` and keeps its fingerprint while another combination's entries change",
    !("sources" in (vvCfg ?? {})) && (await call("GET", `/combinations/${vv}`)).body.draft.sha256 === vvSha);
  const act = (await call("GET", "/activity", undefined, SME)).body as { entity: string; action: string; summary: string }[];
  ok("C5.4 BR-11 pass: the audit line \"source entry added\" names who, the item and the number", act.some((e) => e.entity === "source entry" && e.action === "added" && /^Configuration author added the source of .*Passport days until expiry: at most 90: None published/.test(e.summary)));

  // ------------------------------------------------------------------ PUT: 409 old version, 403, 400 per field, 404, 409 value moved
  const again = await put(wp, n90, { address: n90.address, value: 90, none_published: { reason: "Another author's reason, same version read" }, version: 0 });
  ok("C5.4 M2 fail: a second PUT with the same version read gets 409, naming who saved and when", again.status === 409 && /^Someone else saved this source while you had it open \(Configuration author, \d\d:\d\d UTC\)\. Reload theirs, or keep yours and save again\.$/.test(again.body.detail), again.body);
  r = await put(wp, n90, { address: n90.address, value: 90, cited: { url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5488.html", page: "IMM 5488", quote: "Test data, not an official quote: at most 90", date: "2026-10-19" }, version: 1 });
  ok("C5.4 M2 pass: a PUT with the current version saves: 200, version 2, now cited; audit \"changed\"", r.status === 200 && r.body.entry.version === 2 && r.body.state === "cited" && ((await call("GET", "/activity", undefined, SME)).body as { entity: string; action: string }[]).some((e) => e.entity === "source entry" && e.action === "changed"), r.body?.entry);
  const n30 = s.numbers.find((n: { key: string }) => n.key === "wp.family/RW_PASSPORT_EXPIRY_30");
  r = await put(wp, n30, { address: n30.address, value: 30, none_published: { reason: "ExpatReady's own warning lead time" }, version: 0 }, APPROVER);
  ok("C5.4 BR-11 fail: the approver (no author duty) gets 403 \"Only the configuration author adds sources.\"", r.status === 403 && r.body.detail === "Only the configuration author adds sources.", r.body);
  const bad = async (body: unknown) => { const x = await put(wp, n30, body); return { status: x.status, errors: (x.body.errors ?? []) as { field: string; message: string }[] }; };
  let b = await bad({ address: n30.address, value: 30, cited: { url: "http://www.canada.ca/x", quote: "", date: "2999-01-01", page: "p".repeat(201) }, version: 0 });
  ok("C5.4 BR-3 fail: one 400 names each field in §5's words (https, the quote, the date read, the page note)",
    b.status === 400 && b.errors.some((e) => e.field === "cited.url" && e.message === "Use an https address.") && b.errors.some((e) => e.field === "cited.quote" && e.message === "Copy the words that state the number (up to 300 characters).")
    && b.errors.some((e) => e.field === "cited.date" && e.message === "The date read cannot be in the future.") && b.errors.some((e) => e.field === "cited.page"), b);
  b = await bad({ address: n30.address, value: 30, cited: { url: "https://www.canada.ca/x", quote: "q".repeat(301), date: "2026-10-19" }, version: 0 });
  ok("C5.4 BR-3 fail: a quote over 300 characters is refused on its field", b.status === 400 && b.errors.some((e) => e.field === "cited.quote"), b);
  b = await bad({ address: n30.address, value: 30, none_published: { reason: "too short" }, version: 0 });
  ok("C5.4 BR-3 fail: \"None published\" with a reason under 10 characters: \"Say why ExpatReady set this number (at least 10 characters).\"", b.status === 400 && b.errors.some((e) => e.field === "none_published.reason" && e.message === "Say why ExpatReady set this number (at least 10 characters)."), b);
  b = await bad({ address: n30.address, value: 30, version: 0 });
  ok("C5.4 BR-3 fail: no answer (or both) is refused: choose one", b.status === 400 && b.errors.some((e) => e.message === "Choose one answer: the official source, or 'None published – set by ExpatReady'."), b);
  r = await put(wp, n30, { address: "person.passport_days_until_expiry|lte|9", value: 30, none_published: { reason: "ExpatReady's own warning lead time" }, version: 0 });
  ok("C5.4 404: an address the item does not publish", r.status === 404, r.body);
  // Devin on #587 (red): a citation's words must state this number, never another one; in digits or in words.
  b = await bad({ address: n30.address, value: 30, cited: { url: "https://www.canada.ca/x", quote: "Test data, not an official quote: at most 21 days before expiry", date: "2026-10-19" }, version: 0 });
  ok("C5.4 BR-3 fail (Devin on #587): a quote that states another number (21 for 30) is refused on its field, and nothing is stored", b.status === 400 && b.errors.some((e) => e.field === "cited.quote" && e.message === "These words do not state 30. Copy the words that state the number.") && (await sources(wp)).numbers.find((n: { key: string }) => n.key === "wp.family/RW_PASSPORT_EXPIRY_30").state === "missing", b);
  r = await put(wp, n30, { address: n30.address, value: 30, cited: { url: "https://www.canada.ca/x", quote: "Test data, not an official quote: within thirty days of expiry", date: "2026-10-19" }, version: 0 });
  ok("C5.4 BR-3 pass (Devin on #587): words that state the number in English (\"thirty days\") are accepted", r.status === 200 && r.body.state === "cited", r.body);
  r = await put(wp, n30, { address: n30.address, value: 45, none_published: { reason: "ExpatReady's own warning lead time" }, version: 0 });
  ok("C5.4 BR-6 fail: a value that is not the number now (45 for 30) gets 409 with the number as it is", r.status === 409 && r.body.value === "30" && /the number is now 30, not 45/.test(r.body.detail), r.body);

  // ------------------------------------------------------------------ the three routes refuse, naming every number (BR-8)
  const r01 = s.numbers.find((n: { key: string; address: string }) => n.key === "wp.family/R-01" && n.address === "person.age_years|gte|1");
  const cfg = (await call("GET", `/combinations/${wp}/config`)).body.snapshot;
  const rule = cfg.rules.find((x: { id: string }) => x.id === "R-01");
  const when19 = JSON.parse(JSON.stringify(rule.when).replace('{"op":"gte","field":"person.age_years","value":18}', '{"op":"gte","field":"person.age_years","value":19}'));
  r = await call("PATCH", `/combinations/${wp}/rules/R-01`, { condition: when19, whenPlain: rule.when_plain, thenPlain: rule.then, forWhom: rule.for_whom, sourceQuote: rule.source_quote });
  ok("setup: rule R-01's \"at least 18\" changed to 19 in the draft", r.status < 300, r.body);
  s = await sources(wp);
  const now19 = s.numbers.find((n: { key: string; address: string }) => n.key === r01.key && n.address === r01.address);
  ok("C5.4 BR-6 fail: the import's source was written for 18; the number is now 19: state changed", now19.state === "changed" && now19.passes === false && now19.entry.value === "18", now19);
  const heldNow = s.counts.held_back as number;
  r = await call("POST", `/combinations/${wp}/submit`, { note: "G1 check" }, AUTHOR);
  const listed = (x: { body: { errors?: { gate?: string; message: string; key?: string }[] } }) => (x.body.errors ?? []).filter((e) => e.gate === "no-source");
  ok(`C5.4 BR-8 fail: Submit is refused (400, …/no-source) listing every number held back (${heldNow}) in errors[], each in §5's words`,
    r.status === 400 && r.body.type === "https://expatready.local/problems/no-source" && listed(r).length === heldNow && listed(r).every((e) => e.message.endsWith("or mark 'None published – set by ExpatReady'."))
    && r.body.detail.startsWith(`Fix the problems before submitting: ${heldNow} numbers have no source entry. Each is listed on Review and release.`), { status: r.status, detail: r.body.detail, n: listed(r).length });
  ok("C5.4 BR-6 fail: the changed number is listed with the \"Changed\" sentence", listed(r).some((e) => e.message === `${now19.item_words}: the source was written for 18; the number is now 19. Check the source again, or mark 'None published – set by ExpatReady'.`), listed(r).filter((e) => /written for/.test(e.message)));
  r = await call("POST", `/combinations/${wp}/approve`, undefined, APPROVER);
  ok(`C5.4 BR-8 fail: Approve is refused (409) with the concept's words and every number in errors[]`, r.status === 409 && r.body.detail.startsWith(`Release refused: ${heldNow} numbers have no source entry. Each is listed on Review and release.`) && listed(r).length === heldNow, { status: r.status, detail: r.body.detail?.slice(0, 160) });
  row = await leaf(wp);
  ok("C5.4 M1 pass: the released row keeps its catalogue status (Live) while its draft lists the numbers (Fix problems now counts them)", row.status === "READY" && fixItems(row.setup) >= heldNow, { status: row.statusText, fix: fixItems(row.setup) });
  const rel = (await call("GET", "/draft", undefined, APPROVER)).body;
  const relRow = (rel.rows ?? []).find((x: { combinationId: string }) => x.combinationId === wp);
  ok("C5.4 §4 fail: the Release page holds the row back with its count of numbers", !!relRow && relRow.held && relRow.why === `${heldNow} numbers have no source entry: fix on Review and release.`, relRow);

  // ------------------------------------------------------------------ validity rules (decision 4: cited only with its months in digits)
  const ws = sql(`select workspace_id from combination where id='${wp}'`);
  const dt = sql(`select string_agg(document_type_key, ',' order by document_type_key) from (select distinct document_type_key from document_requirement where combination_id='${wp}' limit 2) x`).split(",");
  const cite = { page: "Test data page", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html", read: "2026-10-19" };
  const addValidity = (key: string, type: string, months: number, quote: string) => sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, predicate_json, severity, message, source_quote, illustrative, version, status, origin, updated_by) values (gen_random_uuid(), '${ws}', '${wp}', '${key}', 'document_validity', '${type}', '${JSON.stringify({ op: "issued_within_months", months, before: "case.application_date", cite })}'::jsonb, 'warn', 'Test data: issued within ${months} months.', '${quote}', false, 1, 'DRAFT', 'HUMAN', '${AUTHOR}')`);
  addValidity("G1_VALIDITY_DIGITS", dt[0], 6, "Test data, not an official quote: issued no more than 6 months before");
  addValidity("G1_VALIDITY_WORDS", dt[1], 6, "Test data, not an official quote: issued no more than six months before");
  s = await sources(wp);
  const v1 = s.numbers.find((n: { key: string }) => n.key === "wp.family/G1_VALIDITY_DIGITS"), v2 = s.numbers.find((n: { key: string }) => n.key === "wp.family/G1_VALIDITY_WORDS");
  ok("C5.4 decision 4 pass: a usable validity rule whose own quote holds its months in digits counts as cited (validity_cite)", v1?.state === "validity_cite" && v1.passes, v1);
  ok("C5.4 decision 4 fail: the same rule whose quote says \"six\" needs a source (missing)", v2?.state === "missing" && !v2.passes, v2);
  sql(`delete from check_def where combination_id='${wp}' and check_key like 'G1_VALIDITY_%'`);

  // ------------------------------------------------------------------ fully sourced → it releases (helper through the API)
  const helped = await sourceEveryNumber(PORT, wp);
  ok("C5.4 helper pass: sourceEveryNumber answers every held number through the API (PUT), leaving none held back", helped.written === heldNow && helped.held_back === 0, helped);
  const done = await submitSignApprove(wp, "G1 check: every number sourced");
  ok("C5.4 BR-8 pass: a fully sourced draft submits, is signed and is released by a different person", done.step === "approve" && done.r.status < 300, done);
  const relNow = ((await call("GET", "/releases")).body as { combination_id: string; version: number; demo: boolean }[]).find((x) => x.combination_id === wp && x.version === 2);
  ok("C5.4 Decision 1 pass: with no Sample answer, the source-backed release is a real release (not a Demo release)", !!relNow && relNow.demo === false, relNow);
  const frozen = sql(`select jsonb_array_length(snapshot->'sources') from config_release where combination_id='${wp}' and version=2`);
  ok("C5.4 BR-9 pass: the release froze its sources (one per number answered by an entry)", Number(frozen) === 27, frozen);

  // ------------------------------------------------------------------ BR-11 Reset deletes the entries
  const before = Number(sql(`select count(*) from source_entry`));
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C5.4 BR-11 pass: Reset deletes every source entry (they would otherwise attach again to the re-imported keys)", before > 0 && r.status < 300 && sql(`select count(*) from source_entry`) === "0", { before });

  // ------------------------------------------------------------------ the Visitor visa: still a Demo release; Sample only in the demo workspace
  const setup = execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 900_000 });
  ok("setup: the Visitor visa set up and released through the screens' endpoints (runtime/setup_visitor_visa.ts)", / passed/.test(setup) && !/^FAIL/m.test(setup), setup.split("\n").filter((l) => /^FAIL/.test(l)));
  const v = idOf("vv.single");
  const vvRel = ((await call("GET", "/releases")).body as { combination_id: string; demo: boolean }[]).filter((x) => x.combination_id === v);
  s = await sources(v);
  ok("C5.4 Decision 1 pass: with G1 wired, the Visitor visa still releases, as a Demo release (its fee numbers cite the fee table; none held)", vvRel.length === 1 && vvRel[0].demo === true && s.counts.held_back === 0 && s.counts.fee_table === 8, { rel: vvRel, counts: s.counts });
  r = await call("PATCH", `/combinations/${v}/forms/IMM%205707`, { minAge: 18 });
  s = await sources(v);
  const fromAge = s.numbers.find((n: { address: string }) => n.address === "min_age");
  ok("setup: the Visitor visa's IMM 5707 line gets \"From age 18\" in the draft (a threshold number)", r.status < 300 && fromAge?.state === "missing", { status: r.status, body: r.status < 300 ? undefined : r.body, fromAge });
  r = await call("POST", `/combinations/${v}/submit`, { note: "G1 check" }, AUTHOR);
  ok("C5.4 Decision 1 fail: in the demo workspace too, a number with no entry refuses Submit, named", r.status === 400 && listed(r).length === 1 && listed(r)[0].message === `Form IMM 5707: From age: 18 has no source entry. ${NONE}`, r.body);
  // Review m3 on #587: the work permit's id after the Reset above (the old one would answer 404 for the wrong reason).
  const wpNow = idOf("wp.family");
  r = await call("POST", `/combinations/${wpNow}/sources/sample`, undefined, AUTHOR);
  ok("C5.4 Decision 1 fail: the demo seed never answers a source-backed combination with Sample (409, \"source-backed\")", !!wpNow && r.status === 409 && /source-backed/.test(r.body.detail ?? ""), { wpNow, status: r.status, detail: r.body.detail });
  // Devin on #587: a retired combination is read only for the Sample seed too, as for PUT.
  sql(`update combination set retired_at = now() where id = '${v}'`);
  r = await call("POST", `/combinations/${v}/sources/sample`, undefined, AUTHOR);
  const wroteRetired = sql(`select count(*) from source_entry where item_key like 'wp.%' and sample`);
  sql(`update combination set retired_at = null where id = '${v}'`);
  ok("C5.4 BR-11 fail (Devin on #587): the Sample seed on a retired combination is refused (409) and writes nothing", r.status === 409 && /is retired/.test(r.body.detail ?? "") && wroteRetired === "0", { status: r.status, wroteRetired });
  r = await call("POST", `/combinations/${v}/sources/sample`, undefined, AUTHOR);
  s = await sources(v);
  const sampled = s.numbers.find((n: { address: string }) => n.address === "min_age");
  ok("C5.4 Decision 1 pass: the demo seed answers the Sample combination's number with a Sample entry (no citation, not None published), from the sample load; it passes in the demo workspace",
    r.status === 200 && r.body.written === 1 && sampled.state === "sample" && sampled.passes && sampled.entry.cited === null && sampled.entry.none_published === null && sampled.entry.from_sample_load, sampled);
  // The same content in a non-demo workspace: this copy's workspace renamed and the server started with STUDIO_WORKSPACE_KEY=firm.
  sql(`update workspace set key='firm' where key='demo'`);
  restart("STUDIO_WORKSPACE_KEY=firm");
  const sess = (await call("GET", "/session")).body;
  r = await call("POST", `/combinations/${v}/submit`, { note: "G1 check" }, AUTHOR);
  ok("C5.4 Decision 1 fail: the same content in a non-demo workspace (STUDIO_WORKSPACE_KEY=firm) refuses Submit, naming the item and saying Sample",
    sess.workspace?.key === "firm" && sess.workspace.demo === false && r.status === 400 && listed(r).length === 1 && listed(r)[0].message === `Form IMM 5707: From age: 18 has only a Sample source, which passes only in the demo workspace as a Demo release. ${NONE}`, { ws: sess.workspace, status: r.status, errors: listed(r) });
  s = await sources(v);
  ok("C5.4 Decision 1 fail: GET reads the Sample entry as not passing outside the demo workspace", s.demo_workspace === false && s.numbers.find((n: { address: string }) => n.address === "min_age").passes === false);
  r = await call("POST", `/combinations/${v}/sources/sample`, undefined, AUTHOR);
  ok("C5.4 Decision 1 fail: the Sample seed is refused outside the demo workspace", r.status === 409, r.body);
  sql(`update workspace set key='demo' where key='firm'`);
  restart();
  const vvDone = await submitSignApprove(v, "G1 check: Sample answer in the demo workspace");
  const vvRel2 = ((await call("GET", "/releases")).body as { combination_id: string; version: number; demo: boolean }[]).find((x) => x.combination_id === v && x.version === 2);
  ok("C5.4 Decision 1 pass: back in the demo workspace the Sample answer passes and the release is a Demo release, its source frozen as Sample",
    vvDone.step === "approve" && vvDone.r.status < 300 && vvRel2?.demo === true && sql(`select count(*) from config_release, jsonb_array_elements(snapshot->'sources') x where combination_id='${v}' and version=2 and (x->>'sample')::boolean`) === "1", { step: vvDone.step, status: vvDone.r.status, rel: vvRel2 });
} catch (e) { ok("ran to the end", false, (e as Error).message); }
try { sql(`update workspace set key='demo' where key<>'demo'`); } catch { /* the copy may be gone */ }
process.exit(summary() ? 1 : 0);
