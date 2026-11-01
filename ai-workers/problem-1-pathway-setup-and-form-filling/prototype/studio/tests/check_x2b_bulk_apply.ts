// X2b slice (b) (C1.5, concept v3 §3 BR-C2 to BR-C4): POST /lines/bulk writes one form or document line to (or removes it
// from) the ticked combinations in one transaction under one batch, after re-running the preview's rules; a retried
// request changes nothing twice; POST /lines/bulk/:batchId/undo takes the whole batch back, or nothing, and never undoes
// past a later release. A passing and a failing case per rule. Fixtures are set in the copy's database. Rules only: no AI
// call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_x2b 4444 start && tsx studio/tests/check_x2b_bulk_apply.ts 4444 xr_studio_screens_x2b
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

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

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const id = (k: string) => sql(`select id from combination where combination_key='${k}'`);
  const WP = id("wp.family"), VV = id("vv.single"), SV = id("sv.super_visa"), SP = id("sp.student"), FS = id("fs.outside");
  const ws = sql(`select workspace_id from combination where id='${VV}'`);
  const label = (cid: string) => sql(`select label from combination where id='${cid}'`);
  const form = (key: string, from = WP) => ({ combinationId: from, kind: "form", key });
  const doc = (key: string, from = WP) => ({ combinationId: from, kind: "document", key });
  const apply = (line: any, op: string, include: string[], extra: Record<string, unknown> = {}, actor = "user-A") =>
    call("POST", "/lines/bulk", { line, op, combinationIds: include, include, idempotencyKey: randomUUID(), ...extra }, actor);
  const undo = (batchId: string, actor = "user-A") => call("POST", `/lines/bulk/${batchId}/undo`, undefined, actor);
  const lines = (cid: string, key: string) => sql(`select coalesce(string_agg(version||':'||status, ',' order by version), '') from combination_form where combination_id='${cid}' and lineage_key='${key}'`);
  const counted = () => sql(`select (select count(*) from combination_form)||'/'||(select count(*) from document_requirement)||'/'||(select count(*) from line_batch)`);

  // ------------------------------------------------------------ contract and roles
  let r = await call("POST", "/lines/bulk", { line: form("IMM 5476"), op: "add", combinationIds: [VV], include: [VV] });
  ok("contract fail: no request key is 400, in words", r.status === 400 && /request key is missing/.test(JSON.stringify(r.body)), r.body);
  r = await apply(form("IMM 5476"), "add", [VV], { combinationIds: [VV], include: [SP] });
  ok("contract fail: a ticked combination that was not previewed is 400", r.status === 400 && /not one of those you previewed/.test(words(r)), words(r));
  r = await apply(form("IMM 5476"), "add", [VV], {}, "user-B");
  ok("roles fail: the approver cannot apply a configuration change (403)", r.status === 403, r.status);
  r = await apply(form("IMM 5476"), "add", [VV], {}, "user-O");
  ok("roles fail: a case officer cannot apply (403)", r.status === 403, r.status);

  // ------------------------------------------------------------ BR-C2, BR-C3: add a form
  // The source line has settings of its own, so the copy is seen to carry them (who, channel, signature, age, copies).
  sql(`update combination_form set min_age=18, copies=2, signed_by='principal_applicant' where combination_id='${WP}' and lineage_key='IMM 5476'`);
  const before = counted();
  const key = randomUUID();
  r = await apply(form("IMM 5476"), "add", [VV, SP], { idempotencyKey: key });
  const batch1 = r.body?.batchId as string;
  ok("C1.5 BR-C3 pass: IMM 5476 is added to Visitor visa and Study permit in one batch, with the toast's words", r.status === 200 && r.body.changed.length === 2 && r.body.message === "IMM 5476 added to 2 combinations (draft changes in each)." && !r.body.replayed, r.body);
  ok("C1.5 BR-C3: one batch row, two new draft lines", sql(`select count(*) from line_batch where id='${batch1}'`) === "1" && lines(VV, "IMM 5476") === "1:DRAFT" && lines(SP, "IMM 5476") === "1:DRAFT", [lines(VV, "IMM 5476"), lines(SP, "IMM 5476")]);
  const copy = sql(`select who||'|'||channel||'|'||signature||'|'||coalesce(min_age::text,'-')||'|'||copies||'|'||coalesce(signed_by,'-')||'|'||origin||'|'||coalesce(finder_batch_id::text,'-') from combination_form where combination_id='${VV}' and lineage_key='IMM 5476'`);
  ok("C1.5 BR-C2 pass: copied who, channel, signature, minimum age, copies and signer; never an AI origin or a finder run", copy === "principal_applicant|PDF_UPLOAD|NONE|18|2|principal_applicant|HUMAN|-", copy);
  const quote = sql(`select source_quote from combination_form where combination_id='${VV}' and lineage_key='IMM 5476'`);
  ok("C1.5 BR-C2: the copy's origin reads \"copied from\" the source's trail", /^Copied from .+›.+/.test(quote), quote);
  ok("C1.5: each combination's own Undo step is recorded under the batch (its draft bar shows its own change)", sql(`select count(*) from form_line_action where detail->>'batch_id'='${batch1}' and undone_at is null`) === "2");
  ok("C1.5: the audit names each combination and the batch", Number(sql(`select count(*) from audit_event where detail->>'batchId'='${batch1}'`)) === 3);
  // retry
  const mid = counted();
  r = await call("POST", "/lines/bulk", { line: form("IMM 5476"), op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: key });
  ok("C1.5 BR-C3 retry pass: the same request key answers the first batch and changes nothing twice", r.status === 200 && r.body.replayed === true && r.body.batchId === batch1 && counted() === mid, { body: r.body, mid, now: counted() });
  r = await call("POST", "/lines/bulk", { line: form("IMM 1295"), op: "add", combinationIds: [VV], include: [VV], idempotencyKey: key });
  ok("C1.5 BR-C3 retry fail: the same key for another change is refused (409), nothing written", r.status === 409 && /already used for another change/.test(words(r)) && counted() === mid, words(r));
  ok("C1.5 BR-C3: rows and batch counted", before !== mid, { before, mid });

  // re-checked inside the transaction: a row that may no longer change refuses the whole batch
  r = await apply(form("IMM 5476"), "add", [VV, SV]);
  ok("C1.5 BR-C3 fail: Visitor visa now already has IMM 5476: the batch is refused, the row named, and Super visa is not changed either", r.status === 409 && /Changed since the preview|Nothing was changed/.test(words(r)) && words(r).includes(label(VV)) && lines(SV, "IMM 5476") === "", words(r));
  r = await apply(form("IMM 5409"), "add", [SP]);
  ok("C1.5 BR-C3 fail: a row that cannot change (Study permit has no spouse for IMM 5409) cannot be ticked by a direct call", r.status === 409 && lines(SP, "IMM 5409") === "", words(r));
  sql(`update combination set retired_at=now() where id='${SV}'`);
  r = await apply(form("IMM 5476"), "add", [SV]);
  ok("C1.5 BR-C3 fail: a retired combination is never a target", r.status === 409 && lines(SV, "IMM 5476") === "", words(r));
  sql(`update combination set retired_at=null where id='${SV}'`);

  // attachNow's refusals (review of #254): no file yet; a file waiting for a person
  // A form listed by IRCC with no file at all (Sample number), put on Work permit as a line by hand.
  sql(`insert into gov_form_def (id, workspace_id, form_key, display_name) values (gen_random_uuid(), '${ws}', 'IMM 0000X', 'Sample: listed, no file')`);
  sql(`insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, version, status, origin, updated_by) select gen_random_uuid(), '${ws}', '${WP}', id, 'IMM 0000X', 'each_applicant', 'COMBINATION_MANDATORY', 1, 'DRAFT', 'HUMAN', 'user-A' from gov_form_def where form_key='IMM 0000X'`);
  r = await apply(form("IMM 0000X"), "add", [SV]);
  ok("C1.5 attach check fail: a form with no file yet is refused, in words, nothing written", r.status === 409 && /no file in the library yet/.test(words(r)) && lines(SV, "IMM 0000X") === "", words(r));
  sql(`delete from combination_form where lineage_key='IMM 0000X'`); sql(`delete from gov_form_def where form_key='IMM 0000X'`);
  const ed = sql(`select e.id||'|'||e.sha256 from form_edition e join gov_form_def f on f.id=e.gov_form_def_id where f.form_key='IMM 5476' and e.channel<>'ONLINE' limit 1`).split("|");
  sql(`update form_edition set sha256='${"0".repeat(64)}' where id='${ed[0]}'`);
  r = await apply(form("IMM 5476"), "add", [SV]);
  ok("C1.5 attach check fail: a form whose file waits for a second person is refused, in words", r.status === 409 && /waits for a second person/.test(words(r)) && lines(SV, "IMM 5476") === "", words(r));
  sql(`update form_edition set sha256='${ed[1]}' where id='${ed[0]}'`);

  // waits: a submitted combination is changed only when ticked on purpose
  sql(`insert into review_submission (id, workspace_id, combination_id, draft_sha256, submitted_by, status, change_summary) values (gen_random_uuid(), '${ws}', '${SV}', 'x2b-b-test', 'user-A', 'SUBMITTED', '[]')`);
  r = await apply(form("IMM 5476"), "add", [SV]);
  const batchWaits = r.body?.batchId as string;
  ok("C1.5 BR-C1 waits pass: Super visa, submitted for review, is changed when ticked", r.status === 200 && lines(SV, "IMM 5476") === "1:DRAFT", r.body);
  sql(`delete from review_submission where draft_sha256='x2b-b-test'`);

  // ------------------------------------------------------------ BR-C4: Undo
  r = await undo(batch1, "user-B");
  ok("C1.5 BR-C4 fail: the approver cannot undo an author's batch (403)", r.status === 403, r.status);
  r = await undo(randomUUID());
  ok("C1.5 BR-C4 fail: an unknown batch is 404, in words", r.status === 404 && /not known/.test(words(r)), words(r));
  // refused: one target changed after the batch
  sql(`update combination_form set min_age=21, updated_by='user-B', updated_at=now() where combination_id='${SP}' and lineage_key='IMM 5476'`);
  r = await undo(batch1);
  const hh = new Date().toISOString().slice(11, 13);
  ok("C1.5 BR-C4 refused: Study permit changed after the copy: named with what, who and when (concept §5); nothing undone", r.status === 409 && new RegExp(`^${label(SP).replace(/[()]/g, ".")} was changed after the copy \\(IMM 5476 changed, by Approver at ${hh}:\\d\\d UTC\\)\\. Nothing was undone\\.$`).test(words(r)) && lines(VV, "IMM 5476") === "1:DRAFT", words(r));
  sql(`update combination_form set min_age=18, updated_by='user-A' where combination_id='${SP}' and lineage_key='IMM 5476'`);
  // done
  r = await undo(batch1);
  ok("C1.5 BR-C4 done: one Undo takes IMM 5476 off both combinations", r.status === 200 && r.body.undone.length === 2 && lines(VV, "IMM 5476") === "" && lines(SP, "IMM 5476") === "", { body: r.body, vv: lines(VV, "IMM 5476") });
  ok("C1.5 BR-C4: the batch and its combinations' own Undo steps are spent", sql(`select undone_by from line_batch where id='${batch1}'`) === "user-A" && sql(`select count(*) from form_line_action where detail->>'batch_id'='${batch1}' and undone_at is null`) === "0");
  r = await undo(batch1);
  ok("C1.5 BR-C4 fail: a second Undo of the same batch is refused", r.status === 409 && /already undone|was undone/i.test(words(r)), words(r));
  // refused: the combination's own Undo took its part back first
  const u1 = await call("POST", `/combinations/${SV}/forms/undo`, {});
  r = await undo(batchWaits);
  ok("C1.5 BR-C4 refused: after Super visa's own Undo on its Forms tab, the batch Undo names it and changes nothing", u1.status < 300 && r.status === 409 && /its own Undo on its Forms tab, by Configuration author/.test(words(r)), { u1: u1.status, w: words(r) });
  // refused: a release made after the batch is never undone
  r = await apply(form("IMM 5476"), "add", [VV, SV]);
  const batch2 = r.body?.batchId as string;
  ok("fixture: IMM 5476 added again to Visitor visa and Super visa", r.status === 200, r.body);
  sql(`insert into config_release (id, workspace_id, combination_id, version, status, snapshot, sha256, summary, author_id, submitter_id, approver_id, basis, released_at) values (gen_random_uuid(), '${ws}', '${SV}', 99, 'RELEASED', '{}', 'x2b-b', '{}', 'user-A', 'user-A', 'user-B', 'test', now() + interval '1 second')`);
  r = await undo(batch2);
  ok("C1.5 BR-C4 released fail: a release after the batch is never undone; Visitor visa is not undone either", r.status === 409 && /was released after the change .*a release is never undone\. Nothing was undone/.test(words(r)) && lines(VV, "IMM 5476") === "1:DRAFT", words(r));
  sql(`delete from config_release where sha256='x2b-b'`);
  r = await undo(batch2);
  ok("C1.5 BR-C4 released pass: without that release the same Undo is done", r.status === 200 && lines(VV, "IMM 5476") === "" && lines(SV, "IMM 5476") === "", words(r));

  // ------------------------------------------------------------ remove a form (released and draft lines)
  r = await apply(form("IMM 1295"), "add", [VV]);
  ok("fixture: IMM 1295 on Visitor visa (a draft line)", r.status === 200, r.body);
  r = await apply(form("IMM 1295", VV), "remove", [WP, SP].filter((x) => x !== SP));
  const batchRm = r.body?.batchId as string;
  ok("C1.5 BR-C3 remove pass: Work permit's released IMM 1295 gets a removing draft version", r.status === 200 && r.body.message === "IMM 1295 removed from 1 combination (draft changes in each)." && lines(WP, "IMM 1295") === "1:PUBLISHED,2:RETIRED", { b: r.body, l: lines(WP, "IMM 1295") });
  r = await apply(form("IMM 1295", VV), "remove", [SP]);
  ok("C1.5 BR-C3 remove fail: Study permit does not have it: refused, nothing written", r.status === 409 && lines(SP, "IMM 1295") === "", words(r));
  sql(`update gov_form_def set retired_at=now() where form_key='IMM 1295'`);
  r = await undo(batchRm);
  ok("C1.5 BR-C4 fail: undoing a removal never brings back a form retired in the library", r.status === 409 && /retired in the library/.test(words(r)) && lines(WP, "IMM 1295") === "1:PUBLISHED,2:RETIRED", words(r));
  sql(`update gov_form_def set retired_at=null where form_key='IMM 1295'`);
  r = await undo(batchRm);
  ok("C1.5 BR-C4 pass: undoing the removal leaves Work permit's released line as it was", r.status === 200 && lines(WP, "IMM 1295") === "1:PUBLISHED", lines(WP, "IMM 1295"));

  // ------------------------------------------------------------ document lines
  const PASSPORT = "passport_or_travel_document_information_page_photocopy:each_applicant", T = "passport_or_travel_document_information_page_photocopy";
  const docs = (cid: string) => sql(`select coalesce(string_agg(lineage_key||'@'||version||':'||status, ',' order by lineage_key, version), '') from document_requirement where combination_id='${cid}' and document_type_key='${T}'`);
  r = await apply(doc(PASSPORT), "add", [SP, FS]);
  const batchDoc = r.body?.batchId as string;
  ok("C1.5 BR-C3 documents pass: the passport page is added to Study permit and Permanent residence, named by its document", r.status === 200 && /^Passport.* added to 2 combinations/i.test(r.body.message) && docs(SP) === `${PASSPORT}@1:DRAFT`, { m: r.body?.message, d: docs(SP) });
  const dcopy = sql(`select applies_to_roles||'|'||attach_mode||'|'||provided_by||'|'||is_required||'|'||origin from document_requirement where combination_id='${SP}' and document_type_key='${T}'`);
  ok("C1.5 BR-C2 documents: whose it is, its \"only if\", who provides it and whether required are copied", dcopy === "each_applicant|COMBINATION_MANDATORY|client|true|HUMAN", dcopy);
  r = await undo(batchDoc);
  ok("C1.5 BR-C4 documents: one Undo takes the document off both", r.status === 200 && docs(SP) === "" && docs(FS) === "", { s: r.status, d: docs(SP) });
  r = await apply(doc(PASSPORT), "remove", [VV]);
  ok("C1.5 BR-C3 documents fail: Visitor visa does not ask for it: refused", r.status === 409, r.status);
  const rq = await call("POST", `/combinations/${VV}/requirements`, { documentTypeKey: T, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant" });
  sql(`update document_requirement set status='PUBLISHED' where combination_id='${VV}' and document_type_key='${T}'`);
  r = await apply(doc(PASSPORT), "remove", [VV]);
  const batchDocRm = r.body?.batchId as string;
  ok("C1.5 BR-C3 documents remove pass: Visitor visa's released passport line gets a removing draft", rq.status < 300 && r.status === 200 && docs(VV) === `${PASSPORT}@1:PUBLISHED,${PASSPORT}@2:RETIRED`, docs(VV));
  r = await undo(batchDocRm);
  ok("C1.5 BR-C4 documents remove undone: the released line stands alone again", r.status === 200 && docs(VV) === `${PASSPORT}@1:PUBLISHED`, docs(VV));

  // ------------------------------------------------------------ the same key twice at once
  const k2 = randomUUID();
  const body = { line: form("IMM 5476"), op: "add", combinationIds: [VV, SP], include: [VV, SP], idempotencyKey: k2 };
  const [p1, p2] = await Promise.all([call("POST", "/lines/bulk", body), call("POST", "/lines/bulk", body)]);
  ok("C1.5 BR-C3 retry at once: two identical requests sent together make one batch and one line per combination", p1.status === 200 && p2.status === 200 && p1.body.batchId === p2.body.batchId && sql(`select count(*) from line_batch where idempotency_key='${k2}'`) === "1" && lines(VV, "IMM 5476") === "1:DRAFT", { p1: p1.status, p2: p2.status, w: words(p2) });

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
