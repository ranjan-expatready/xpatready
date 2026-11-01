// X2b slice (a) (C1.5, concept v3 §3 BR-C1): POST /lines/bulk/preview says, before anything changes, what adding or
// removing one form or document line does in each chosen combination, with the reason. A passing and a failing case for
// every outcome, the contract's refusals, the roles, and "nothing is written". Fixtures are set in the copy's database
// and put back after each case. Rules only: no AI call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_x2b 4444 start && tsx studio/tests/check_x2b_bulk_preview.ts 4444 xr_studio_screens_x2b
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { PREVIEW_INTRO, WAITS_REMOVE_WORDS, WAITS_WORDS } from "../contracts/lines-bulk.ts";

const PORT = Number(process.argv[2] ?? 4444), DB = process.argv[3] ?? "xr_studio_screens_x2b";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql", "psql"].find((p) => p === "psql" || existsSync(p))!;
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
/** Reasons are plain words: no decision codes, no system names of facts or roles. */
const PLAIN = (s: string) => !/\bP-\d+\b/.test(s) && !/\b[a-z]+_[a-z_]+\b/.test(s) && !/\b[a-z]+\.[a-z_]+\b/.test(s);

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const id = (k: string) => sql(`select id from combination where combination_key='${k}'`);
  const WP = id("wp.family"), VV = id("vv.single"), SV = id("sv.super_visa"), SP = id("sp.student"), FS = id("fs.outside"), LM = id("lm.high_wage");
  const ALL = [WP, VV, SV, SP, FS, LM];
  const form = (key: string) => ({ combinationId: WP, kind: "form", key });
  const preview = (b: any, actor = "user-A") => call("POST", "/lines/bulk/preview", b, actor);
  const outcomeOf = async (b: any, target: string) => { const r = await preview(b); const t = r.body?.targets?.find((x: any) => x.combinationId === target); return { r, t, o: t?.outcome as string | undefined, why: String(t?.reason ?? "") }; };
  const add = (line: any, ids = ALL) => ({ line, op: "add", combinationIds: ids });
  const remove = (line: any, ids = ALL) => ({ line, op: "remove", combinationIds: ids });

  // ------------------------------------------------------------ contract, roles, nothing written
  let r = await preview({ line: form("IMM 1295"), combinationIds: [VV] });
  ok("contract fail: no add or remove is 400, in words", r.status === 400 && /Choose add or remove/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
  r = await preview(add(form("IMM 1295"), []));
  ok("contract fail: no combination chosen is 400, in words", r.status === 400 && /Choose at least one combination/.test(JSON.stringify(r.body)));
  r = await preview(add({ combinationId: WP, kind: "rule", key: "R-01" }));
  ok("contract fail: only form and document lines (founder, #167: forms and documents first)", r.status === 400 && /form or a document line/.test(JSON.stringify(r.body)));
  r = await preview(add(form("IMM 9999")));
  ok("source fail: a line that is not on the source combination is 404, in words", r.status === 404 && /not on "/.test(words(r)), words(r));
  r = await preview(add(form("IMM 5802")));
  ok("source fail: a line removed from the source (IMM 5802 on Work permit) is not copied (404)", r.status === 404, r.status);
  r = await preview(add(form("IMM 1295"), [VV, "00000000-0000-4000-8000-000000000000"]));
  ok("contract fail: an unknown combination is 404, in words", r.status === 404 && /does not exist any more/.test(words(r)), words(r));
  r = await preview(add(form("IMM 1295")), "user-O");
  ok("roles fail: a case officer cannot preview a configuration change (403)", r.status === 403, r.status);
  const counted = () => sql(`select (select count(*) from combination_form)||'/'||(select count(*) from document_requirement)||'/'||(select count(*) from form_line_action)||'/'||(select count(*) from audit_event)`);
  const before = counted();
  r = await preview(add(form("IMM 1295")));
  ok("roles pass: the author previews (200)", r.status === 200 && r.body.targets.length === ALL.length, r.status);
  ok("C1.5 BR-C1: nothing is written by a preview (lines, Undo steps and audit unchanged)", counted() === before, `${before} → ${counted()}`);
  ok("preview: the line in words and where it comes from, with the full trail per row", /^IMM 1295 .+ · for each applicant · always$/.test(r.body.line.words) && r.body.line.from.includes("›") && r.body.targets.every((t: any) => t.trail.length >= 2), r.body.line);
  ok("copy: the intro of concept §5 is in the contract", PREVIEW_INTRO.startsWith("Nothing changes until you choose Add."));

  // ------------------------------------------------------------ adding
  let x = await outcomeOf(add(form("IMM 1295")), VV);
  ok("C1.5 BR-C1 will change pass: IMM 1295 to Visitor visa will be added, tickable, no reason", x.o === "WILL_ADD" && x.t.tickable && x.t.reason === null, x.t);
  x = await outcomeOf(add(form("IMM 1295")), WP);
  ok("C1.5 BR-C1 source: the combination the line comes from is shown and cannot be ticked", x.o === "SOURCE" && !x.t.tickable, x.t);
  ok("C1.5 BR-C1 counts: the tickable count matches the rows that will change", r.body.counts.tickable === r.body.targets.filter((t: any) => t.outcome === "WILL_ADD").length, r.body.counts);

  // already has it / a different "only if"
  const at = await call("POST", `/combinations/${VV}/forms`, { formKey: "IMM 1295" });
  ok("fixture: IMM 1295 added to Visitor visa by hand", at.status < 300, at.body);
  x = await outcomeOf(add(form("IMM 1295")), VV);
  ok("C1.5 BR-C1 already has it fail: once Visitor visa has IMM 1295, it is no longer \"will be added\"", x.o === "ALREADY_HAS" && !x.t.tickable && /already has this line/.test(x.why), x.t);
  sql(`update combination_form set attach_mode='ANSWER_CONDITIONAL', predicate_json='{"field":"person.marital_status","op":"eq","value":"married"}', condition_plain='Sample: married applicants' where combination_id='${VV}' and lineage_key='IMM 1295'`);
  x = await outcomeOf(add(form("IMM 1295")), VV);
  ok("C1.5 BR-C1 different \"only if\" pass: the target's own line is kept and says its condition", x.o === "HAS_OTHER_CONDITION" && !x.t.tickable && /only if Sample: married applicants: its own line is kept/.test(x.why), x.why);
  sql(`update combination_form set attach_mode='COMBINATION_MANDATORY', predicate_json=null, condition_plain=null where combination_id='${VV}' and lineage_key='IMM 1295'`);
  x = await outcomeOf(add(form("IMM 1295")), VV);
  ok("C1.5 BR-C1 different \"only if\" fail: the same \"always\" reads as already has it", x.o === "ALREADY_HAS", x.o);

  // cannot: the way it is filed
  x = await outcomeOf(add(form("IMM 1295")), SP);
  ok("C1.5 BR-C1 channel pass: Study permit (no account set) accepts a PDF upload", x.o === "WILL_ADD", x.t);
  sql(`update combination set portal_key='PAPER' where id='${SP}'`);
  x = await outcomeOf(add(form("IMM 1295")), SP);
  ok("C1.5 BR-C1 channel fail: a PDF upload line cannot go to a paper-filing combination, in words", x.o === "CANNOT_CHANNEL" && !x.t.tickable && /IMM 1295/.test(x.why) && PLAIN(x.why), x.why);
  sql(`update combination set portal_key=null where id='${SP}'`);

  // cannot: the person
  x = await outcomeOf(add(form("IMM 5409")), SP);
  ok("C1.5 BR-C1 person fail: IMM 5409 (once per couple) cannot go to Study permit, which has no spouse or partner", x.o === "CANNOT_PERSON" && /no spouse or partner/.test(x.why) && PLAIN(x.why), x.why);
  x = await outcomeOf(add(form("IMM 5409")), SV);
  ok("C1.5 BR-C1 person pass: Super visa has a spouse or partner, so the person is not the reason", x.o !== "CANNOT_PERSON", x.o);

  // cannot: a fact the target does not ask
  x = await outcomeOf(add(form("IMM 5707")), VV);
  ok("C1.5 BR-C1 fact fail: IMM 5707's \"only if\" reads a fact Visitor visa does not ask, named in words", x.o === "CANNOT_FACT" && /does not ask/.test(x.why) && PLAIN(x.why), x.why);
  const ws = sql(`select workspace_id from combination where id='${VV}'`);
  sql(`insert into sqr_section_selection (id, workspace_id, combination_id, section_key, section_order) values (gen_random_uuid(), '${ws}', '${VV}', 'family_members', 99)`);
  x = await outcomeOf(add(form("IMM 5707")), VV);
  ok("C1.5 BR-C1 fact pass: once Visitor visa asks it (its section chosen), IMM 5707 will be added", x.o === "WILL_ADD", x.t);
  sql(`delete from sqr_section_selection where combination_id='${VV}' and section_key='family_members'`);

  // cannot: retired in the library, or its retirement open
  x = await outcomeOf(add(form("IMM 5488")), SV);
  ok("C1.5 BR-C1 retired pass: IMM 5488, current in the library, will be added to Super visa", x.o === "WILL_ADD", x.t);
  sql(`update gov_form_def set retired_at=now() where form_key='IMM 5488'`);
  x = await outcomeOf(add(form("IMM 5488")), SV);
  ok("C1.5 BR-C1 retired fail: a form retired in the library cannot be added", x.o === "CANNOT_RETIRED" && /retired in the library/.test(x.why), x.why);
  sql(`update gov_form_def set retired_at=null where form_key='IMM 5488'`);
  sql(`insert into library_change (id, workspace_id, kind, key, action, status, proposed_by) values (gen_random_uuid(), '${ws}', 'library_form', 'IMM 5488', 'RETIRE', 'WAITING', 'user-B')`);
  x = await outcomeOf(add(form("IMM 5488")), SV);
  ok("C1.5 BR-C1 retirement open fail: nothing new may use a form whose retirement waits on To review", x.o === "CANNOT_RETIRED" && /open on To review/.test(x.why), x.why);
  sql(`delete from library_change where key='IMM 5488' and action='RETIRE'`);

  // waits: submitted for review
  sql(`insert into review_submission (id, workspace_id, combination_id, draft_sha256, submitted_by, status, change_summary) values (gen_random_uuid(), '${ws}', '${SV}', 'x2b-test', 'user-A', 'SUBMITTED', '[]')`);
  x = await outcomeOf(add(form("IMM 5488")), SV);
  ok("C1.5 BR-C1 waits pass: Super visa is submitted for review: the row waits, tickable only on purpose, with the board's words", x.o === "WAITS" && x.t.tickable && x.why === WAITS_WORDS, x.t);
  sql(`update review_submission set status='WITHDRAWN' where draft_sha256='x2b-test'`);
  x = await outcomeOf(add(form("IMM 5488")), SV);
  ok("C1.5 BR-C1 waits fail: a withdrawn submission does not hold the row (will be added)", x.o === "WILL_ADD", x.o);

  // retired combinations are never targets (BR-C3)
  sql(`update combination set retired_at=now() where id='${LM}'`);
  x = await outcomeOf(add(form("IMM 1295")), LM);
  ok("C1.5 BR-C3 retired combination: never a target, cannot be ticked, says why", x.o === "CANNOT_COMBINATION_RETIRED" && !x.t.tickable && /is retired/.test(x.why), x.t);
  sql(`update combination set retired_at=null where id='${LM}'`);
  x = await outcomeOf(add(form("IMM 1295")), LM);
  ok("C1.5 BR-C3 retired combination pass: restored, it will be added", x.o === "WILL_ADD", x.o);

  // ------------------------------------------------------------ removing
  x = await outcomeOf(remove(form("IMM 1295")), VV);
  ok("C1.5 BR-C1 will be removed pass: Visitor visa has IMM 1295 (added above): it will be removed", x.o === "WILL_REMOVE" && x.t.tickable && x.t.reason === null, x.t);
  x = await outcomeOf(remove(form("IMM 1295")), SP);
  ok("C1.5 BR-C1 does not have it fail: Study permit has no IMM 1295: nothing to remove", x.o === "DOES_NOT_HAVE" && !x.t.tickable, x.t);
  const fromVV = { combinationId: VV, kind: "form", key: "IMM 1295" };
  x = await outcomeOf(remove(fromVV, [WP]), WP);
  ok("C1.5 BR-C1 removed in draft pass: before, Work permit's released IMM 1295 will be removed", x.o === "WILL_REMOVE", x.o);
  const v = sql(`select max(version) from combination_form where combination_id='${WP}' and lineage_key='IMM 1295'`);
  const del = await call("DELETE", `/combinations/${WP}/forms/${encodeURIComponent("IMM 1295")}`, { version: Number(v) });
  ok("fixture: IMM 1295 removed from Work permit in its draft", del.status < 300, del.body);
  x = await outcomeOf(remove(fromVV, [WP]), WP);
  ok("C1.5 BR-C1 removed in draft fail: once its draft removes it, it is \"removed already in its draft\", not ticked", x.o === "REMOVED_IN_DRAFT" && !x.t.tickable, x.t);
  sql(`insert into review_submission (id, workspace_id, combination_id, draft_sha256, submitted_by, status, change_summary) values (gen_random_uuid(), '${ws}', '${VV}', 'x2b-test-2', 'user-A', 'SUBMITTED', '[]')`);
  // Work permit's removal is undone, so it is again a source that has the line.
  const u = await call("POST", `/combinations/${WP}/forms/undo`, {});
  ok("fixture: Work permit's removal undone", u.status < 300, u.body);
  x = await outcomeOf(remove(form("IMM 1295"), [VV]), VV);
  ok("C1.5 BR-C1 waits (removing) pass: Visitor visa submitted for review: removing waits, with its own words", x.o === "WAITS" && x.why === WAITS_REMOVE_WORDS, x.t);
  sql(`delete from review_submission where draft_sha256 like 'x2b-test%'`);

  // ------------------------------------------------------------ document lines
  const doc = (key: string) => ({ combinationId: WP, kind: "document", key });
  const PASSPORT = "passport_or_travel_document_information_page_photocopy:each_applicant", MARRIAGE = "marriage_certificate_or_licence_photocopy:couple_once";
  r = await preview(add(doc(PASSPORT)));
  ok("C1.5 documents: the line in words names the document type and whose it is", r.status === 200 && /· from each applicant · always$/.test(r.body.line.words) && !/_/.test(r.body.line.words), r.body.line);
  x = await outcomeOf(add(doc(PASSPORT)), SP);
  ok("C1.5 documents will change pass: the passport page goes to Study permit", x.o === "WILL_ADD", x.t);
  const rq = await call("POST", `/combinations/${SP}/requirements`, { documentTypeKey: "passport_or_travel_document_information_page_photocopy", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" });
  ok("fixture: Study permit asks for the passport page by hand", rq.status < 300, rq.body);
  sql(`update document_requirement set lineage_key='passport-page-own-key' where combination_id='${SP}' and document_type_key='passport_or_travel_document_information_page_photocopy'`);
  x = await outcomeOf(add(doc(PASSPORT)), SP);
  ok("C1.5 documents already has it fail: matched on the document type and whose it is, even under another line key", x.o === "ALREADY_HAS", x.t);
  x = await outcomeOf(add(doc(PASSPORT)), VV);
  ok("C1.5 documents already has it pass: Visitor visa, without it, will have it added", x.o === "WILL_ADD", x.o);
  sql(`delete from document_requirement where combination_id='${SP}' and lineage_key='passport-page-own-key'`);
  x = await outcomeOf(add(doc(MARRIAGE)), SP);
  ok("C1.5 documents person fail: a marriage certificate (once per couple) cannot go to Study permit", x.o === "CANNOT_PERSON" && PLAIN(x.why), x.why);
  sql(`update document_type set status='RETIRED' where document_type_key='passport_or_travel_document_information_page_photocopy'`);
  x = await outcomeOf(add(doc(PASSPORT)), SP);
  ok("C1.5 documents retired fail: a document type retired in the library cannot be added", x.o === "CANNOT_RETIRED" && /retired in the library/.test(x.why) && PLAIN(x.why), x.why);
  sql(`update document_type set status='PUBLISHED' where document_type_key='passport_or_travel_document_information_page_photocopy'`);
  x = await outcomeOf(remove(doc(PASSPORT)), SP);
  ok("C1.5 documents remove: Study permit does not have the passport page", x.o === "DOES_NOT_HAVE", x.o);

  // ------------------------------------------------------------ every reason is plain words
  const all = [await preview(add(form("IMM 5409"))), await preview(add(form("IMM 5707"))), await preview(add(doc(MARRIAGE)))].flatMap((p) => p.body.targets.map((t: any) => String(t.reason ?? "")));
  ok("words: no reason carries a decision code or a system name", all.every(PLAIN), all.filter((s) => !PLAIN(s)));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
