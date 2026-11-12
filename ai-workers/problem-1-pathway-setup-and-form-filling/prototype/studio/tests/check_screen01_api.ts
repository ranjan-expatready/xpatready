// Screen 01 business rules through the API and the database, on an isolated copy (its own database and files; the demo
// is never touched), with a passing and a failing case per rule, plus the early-look changes: Needs work / Live / All,
// status sort, the path filter, one Super visa, and the one form intake with its new-edition hold (P-49..P-51, P-32).
// No browser, no model call.
//   zsh studio/tools/isolated.sh s01api 4403 start && tsx studio/tests/check_screen01_api.ts 4403 xr_studio_s01api
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rowCounts } from "../engine/programs.ts";
import { questionCounts } from "../engine/runtime/questionnaires.ts";
import { createRequire } from "node:module";
const { speed } = createRequire(import.meta.url)("./speed_budget.cjs") as typeof import("./speed_budget.cjs"); // P-184

const PORT = Number(process.argv[2] ?? 4403), DB = process.argv[3] ?? "xr_studio_s01api";
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 200)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j, type: r.headers.get("content-type") ?? "" };
};
/** The one form intake (P-51): one or many files in one request; one result per file. */
const intake = async (files: [string, Buffer][], combinationId?: string, actor = "user-A") => {
  const fd = new FormData(); for (const [name, bytes] of files) fd.append("files", new Blob([new Uint8Array(bytes)]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  const body = await r.json();
  return { status: r.status, body, one: body.results?.[0] ?? body, type: r.headers.get("content-type") ?? "" };
};
const file = (dir: string, name: string): [string, Buffer] => [name, readFileSync(join(OFFICIAL, dir, name))];
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sqlError = (q: string) => { try { sql(q); return null; } catch (e) { return String((e as any).stderr ?? e).split("\n")[0]; } };
const leaves = (ns: any[]): any[] => ns.flatMap((n) => (n.kind === "combination" ? [n] : leaves(n.children)));
const cat = async (q = "") => (await call("GET", `/catalogue?${q}`)).body;
const leaf = async (key: string, pw = "INDIVIDUAL") => leaves((await cat(`pathway=${pw}`)).tree).find((l) => l.nodeKey === key);

/** A minimal one-page PDF whose title and text carry a form code and edition (to prove the reader, not the file name). */
function pdf(title: string, text: string) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  // The database this check reads by SQL must be the server's own (Lead check L1: a run whose database argument named
  // another copy's database looked up stale ids and failed with a 404). Stop with the reason instead.
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })(); // a database that does not exist is "not it" too
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses (its workspace ${served ?? "unknown"} is not in it). Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  // One variable for every answer: a call's, or the intake's (which also carries its first result as `one`).
  let r: Awaited<ReturnType<typeof call>> & { one?: any } = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status === 201, r.body.seconds);

  // ---------------------------------------------------------------- BR-1 pathway is a workspace
  const ind = await cat("pathway=INDIVIDUAL"), cor = await cat("pathway=CORPORATE");
  const indKeys = leaves(ind.tree).map((l) => l.nodeKey), corKeys = leaves(cor.tree).map((l) => l.nodeKey);
  ok("BR-1 pass: Individual shows only Individual programs; Corporate only Corporate", indKeys.every((k) => k.startsWith("individual.")) && corKeys.every((k) => k.startsWith("corporate.")) && ind.tree.length === 7 && cor.tree.length === 4, { ind: ind.tree.length, cor: cor.tree.length });
  ok("BR-1: switch counts equal the rows of each workspace", ind.pathways[0].combinations === indKeys.length && ind.pathways[1].combinations === corKeys.length, ind.pathways);
  r = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "individual.work_permits", label: "Nested" });
  ok("BR-1 fail: a program cannot sit under another program (only under its pathway)", r.status === 400 && r.body.errors?.[0]?.field === "parentKey", r.body.detail);

  // ---------------------------------------------------------------- BR-2 pick, never type
  r = await call("POST", "/combinations", { nodeKey: "individual.no_such_thing" });
  ok("BR-2 fail: a combination is created only on a node picked from the masters", r.status === 404 && r.body.errors?.[0]?.field === "nodeKey", r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.no_such", label: "Typed parent" });
  ok("BR-2 fail: a new node needs an existing parent", r.status === 404, r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.study_permits", label: "Study permit for minors" });
  ok("BR-2 pass: a new category is added under a picked program", r.status === 201 && r.body.programNodeKey === "individual.study_permits.study_permit_for_minors", r.body.programNodeKey);
  ok("errors are RFC 9457 Problem Details", r.status === 201 && (await call("POST", "/program-nodes", {})).type.startsWith("application/problem+json"));

  // ---------------------------------------------------------------- BR-3 the last level is the combination
  r = await call("POST", "/combinations", { nodeKey: "individual.work_permits.open" });
  ok("BR-3 fail: a category that has sub-categories holds no setup", r.status === 400 && /sub-categories/.test(r.body.detail), r.body.detail);
  r = await call("POST", "/combinations", { nodeKey: "individual.work_permits" });
  ok("BR-3 fail: a program holds no setup", r.status === 400, r.body.detail);
  r = await call("POST", "/combinations", { nodeKey: "individual.study_permits.study_permit_for_minors" });
  ok("BR-3 pass: a category without sub-categories is itself the combination", r.status === 201 && r.body.created === true, r.status);
  const minorsId = r.body.combination?.id;
  let err = sqlError(`insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) select gen_random_uuid(), workspace_id, id, 'bad.program', 'x', '[]', 'test' from program_def where program_node_key='individual.visitors'`);
  ok("BR-3 fail (database): the database itself refuses a combination on a program", !!err && /combination_level/.test(err), err);
  err = sqlError(`insert into combination (id, workspace_id, program_def_id, combination_key, label, participants, created_by) select gen_random_uuid(), workspace_id, id, 'bad.dup', 'x', '[]', 'test' from program_def where program_node_key='individual.study_permits.study_permit_for_minors'`);
  ok("one combination per last-level node, in the database (unique)", !!err && /duplicate key|unique/.test(err), err);
  const twice = await Promise.all([0, 1].map(() => call("POST", "/combinations", { nodeKey: "individual.work_permits.open.spouse_student" })));
  ok("idempotent create: two clicks at once give one combination", twice.every((x) => x.status === 200 || x.status === 201) && twice[0].body.combination.id === twice[1].body.combination.id && Number(sql(`select count(*) from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='individual.work_permits.open.spouse_student'`)) === 1, twice.map((x) => x.status));
  // C11.12 BR-7 (P-233): a new release needs a filing mode on every applicant role; the author sets them as on the screen
  // (Sample: the spouse and child of a student file their own, as linked open work permit / visitor applications).
  sql(`update combination set participants = (select jsonb_agg(case when x->>'role' in ('spouse_or_partner','child') then x || '{"filingMode":"files_own"}'::jsonb else x end) from jsonb_array_elements(participants) x) where id='${twice[0].body.combination.id}'`);

  // ---------------------------------------------------------------- BR-4 / BR-7 nothing above a combination
  r = await call("POST", "/program-nodes", { kind: "CATEGORY", parentKey: "individual.study_permits.study_permit", label: "From abroad" });
  ok("BR-4/BR-7 fail: no sub-category under a category that has its own setup (refused, not split: P-26)", r.status === 409 && r.body.errors?.[0]?.field === "parentKey", r.body.detail);
  err = sqlError(`insert into program_def (id, workspace_id, program_node_key, parent_node_key, node_kind, label, created_by) select gen_random_uuid(), workspace_id, 'x.y', program_node_key, 'CATEGORY', 'Under', 'test' from program_def where program_node_key='individual.study_permits.study_permit'`);
  ok("BR-4 fail (database): the database refuses a node under a combination", !!err && /combination_level/.test(err), err);
  r = await call("POST", "/program-nodes", { kind: "CATEGORY", parentKey: "individual.study_permits.extension", label: "Inside Canada" });
  ok("BR-4 pass: a sub-category is added under a category with no setup", r.status === 201, r.body.programNodeKey);

  // ---------------------------------------------------------------- BR-6 unique name within a parent
  r = await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.work_permits", label: "  open WORK-permit " });
  ok("BR-6 fail: a sibling with the same name (ignoring case, spaces, punctuation) is refused on its field", r.status === 409 && r.body.errors?.[0]?.field === "label" && r.body.existing?.label === "Open work permit", r.body.detail);
  r = await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.study_permits", label: "Open work permit" });
  ok("BR-6 pass: the same name under a different parent is allowed", r.status === 201, r.body.programNodeKey);

  // ---------------------------------------------------------------- BR-9 never delete (disable is not built, P-26)
  err = sqlError(`delete from program_def where program_node_key='individual.work_permits.employer_specific.with_lmia'`);
  ok("BR-9 fail: a node that has a combination cannot be deleted (the database refuses)", !!err && /foreign key|violates/.test(err), err);

  // ---------------------------------------------------------------- BR-8 status: In setup → Not ready / Ready, P-23 one release
  // ---------------------------------------------------------------- Lead check item 1: one next step on every sample row
  // The Programs row, the combination page header (/summary) and the page's first missing line name the same step.
  const SETUP = new Set(["start", "add_forms", "add_from_library", "draft_ai", "view_progress", "review_proposals"]);
  const agree: string[] = [], disagree: string[] = [];
  for (const pw of ["INDIVIDUAL", "CORPORATE"]) for (const l of leaves((await cat(`pathway=${pw}&filter=all`)).tree)) {
    const page = l.combinationId ? (await call("GET", `/combinations/${l.combinationId}/summary`)).body.row : l;
    const row = l.nextAction?.label ?? null, header = page?.nextAction?.label ?? null, first = l.missing[0]?.step ?? null;
    const good = row === header && (!l.nextAction ? !l.missing.length || l.status === "READY" : SETUP.has(l.nextAction.kind) ? first === row && l.missing.every((m: any) => m.step === row) : l.nextAction.kind !== "see_missing" || l.missing.every((m: any) => m.step && m.text.includes(`Next step: ${m.step}`)));
    (good ? agree : disagree).push(`${l.label}: row "${row}" · header "${header}" · first missing "${first}"`);
  }
  ok("item 1 pass: on every sample row the row's next step = the page header = the first missing line's step", agree.length > 20 && !disagree.length, disagree.length ? disagree : `${agree.length} rows`);
  const vv1 = await leaf("individual.visitors.visitor_visa");
  ok("item 1: Visitor visa counts sources and set-up forms apart; the shared next step is said once (not under each line)", vv1.missing[0]?.text === "2 forms attached as sources, 0 set up." && vv1.missing.every((m: any) => m.step === vv1.nextAction?.label && !/Next step/.test(m.text)) && vv1.nextAction?.label === "Add 1 form from the library", vv1.missing.map((m: any) => m.text));

  let wp = await leaf("individual.work_permits.employer_specific.with_lmia");
  ok("BR-8 pass: the reviewed work-permit row is Ready (in Release 1, startable)", wp.status === "READY" && wp.release?.pack === 1 && wp.missing.length === 0, wp.statusText);
  let ss = await leaf("individual.work_permits.open.spouse_student");
  ok("BR-8: a combination never released is In setup", ss.status === "IN_SETUP" && !ss.release, ss.statusText);
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 1295" });
  ok("BR-12 pass: + Add picks a library form; its mapped edition becomes a form line", r.status === 201 && r.body.added === "form_line" && r.body.edition === "IMM 1295 (09-2023)", r.body);
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 1295" });
  ok("BR-12 fail: the same form twice is refused", r.status === 409, r.body.detail);
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 9999" });
  ok("BR-12 fail: + Add never creates a form: unknown codes are refused", r.status === 404 && r.body.errors?.[0]?.field === "formKey", r.body.detail);
  // QA-13: a form removed from the draft can be added again (it was a 409 "the database refused a duplicate").
  await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { who: "principal_applicant" });
  r = await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { retire: true });
  ok("QA-13 setup: the author removes the form line again", r.status < 300, r.body?.detail ?? r.body?.message);
  r = await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { retire: true });
  ok("break m5 fail: a removed line cannot be removed or edited again (add it back first)", r.status === 409 && /removed/.test(r.body.message) && sql(`select count(*) from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`) === "1", r.body.message);
  ok("break M4: the combination page no longer lists a removed form", !(await call("GET", `/combinations/${ss.combinationId}/summary`)).body.forms.some((f: any) => f.code === "IMM 1295"));
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 1295" });
  ok("QA-13 pass: a removed form is added again (the pending removal is undone in place)", r.status === 201 && r.body.added === "form_line" && sql(`select string_agg(version || ':' || status, ',' order by version) from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`) === "1:DRAFT", sql(`select string_agg(version || ':' || status, ',' order by version) from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`));
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 1295" });
  ok("QA-13 fail: added back, it is on the combination again, so a second add is still refused", r.status === 409, r.body.detail);
  ok("CHECK must 2: adding back restores the line as it was (its who kept, not reset to the default)", sql(`select who from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`) === "principal_applicant");
  await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { who: "each_applicant" });
  const vvId = (await leaf("individual.visitors.visitor_visa")).combinationId;
  const att5707 = sql(`select id from source_attachment where combination_id='${vvId}' and edition like 'IMM 5707%' limit 1`);
  r = await call("POST", `/attachments/${att5707}/reuse`, { who: "<script>alert(1)</script>" });
  ok("break M3 fail: reusing a form with a \"who\" that is not on the list is refused; nothing is added", r.status === 400 && sql(`select count(*) from combination_form where combination_id='${vvId}' and lineage_key='IMM 5707'`) === "0", r.body.message);
  ok("F1: \"+ Add line\" gives the line its default channel (PDF upload: this combination has no portal)", sql(`select channel from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`) === "PDF_UPLOAD");
  // A change that needs the expert's sign-off (a document requirement), so every review step of QA-1 is exercised.
  const types = (await call("GET", "/library/document-types")).body as any[];
  r = await call("POST", `/combinations/${ss.combinationId}/requirements`, { documentTypeKey: types[0].documentTypeKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" });
  ok("QA-1 setup: the author adds a document requirement (needs the SME duty)", r.status < 300, r.body?.detail ?? r.body?.lineageKey);
  let d = (await call("GET", "/draft")).body;
  ok("P-23: the shared draft lists the changed combination with its change count", d.rows.length === 1 && d.rows[0].label === "Spouse of a student" && d.changes > 0 && d.next === 2, { changes: d.changes, rows: d.rows.map((x: any) => x.label) });
  ok("QA-1: a combination nobody submitted is held back on the shared draft, and says why", d.rows[0].held && /Not submitted for review/.test(d.rows[0].why), d.rows[0].why);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  const noRelease = () => sql(`select count(*) from config_release where combination_id='${ss.combinationId}'`) === "0";
  ok("QA-1 fail: the shared release refuses a draft nobody submitted (no release, nobody recorded as submitter)", r.status === 409 && /held back/.test(r.body.title) && noRelease(), r.body.detail);
  r = await call("POST", `/combinations/${ss.combinationId}/submit`, {});
  ok("QA-1 setup: the author submits it for review", r.status === 201, r.body?.message);
  d = (await call("GET", "/draft")).body;
  ok("QA-1: submitted but the expert change unsigned is still held back, with the reason", d.rows[0].held && /SME sign-off/.test(d.rows[0].why), d.rows[0].why);
  r = await call("POST", `/combinations/${ss.combinationId}/signoff`, { items: [], action: "returned", note: "nothing named" }, "user-C");
  ok("break m1 fail: a sign-off or return must name at least one change", r.status === 400, r.body.message);
  const firstItem = ((await call("GET", `/combinations/${ss.combinationId}/review`)).body.submission?.changeSummary ?? []).map((x: any) => `${x.kind}|${x.key}`)[0];
  r = await call("POST", `/combinations/${ss.combinationId}/signoff`, { items: [firstItem], action: "signed" }, "user-A");
  ok("break m1 fail: the person who submitted does not sign their own submission", r.status === 403, r.body.message);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  ok("QA-1 fail: the shared release refuses unsigned expert changes", r.status === 409 && noRelease(), r.body.detail);
  // The server refuses even when the screen is skipped: releaseRows is asked for the row directly through the gate.
  const review = (await call("GET", `/combinations/${ss.combinationId}/review`)).body;
  const sme = (review.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
  r = await call("POST", `/combinations/${ss.combinationId}/signoff`, { items: sme, action: "signed" }, "user-C");
  ok("QA-1 setup: the content reviewer signs the expert changes", r.status === 201 && sme.length > 0, sme);
  d = (await call("GET", "/draft")).body;
  ok("QA-1 pass: submitted and signed, the combination will be released", !d.rows[0].held && d.rows[0].why === null, d.rows[0]);
  // Should 3: changed after submission → held; the same content again → the submission holds again (same fingerprint).
  await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { who: "principal_applicant" });
  d = (await call("GET", "/draft")).body;
  r = await call("POST", `/combinations/${ss.combinationId}/approve`, {}, "user-B");
  ok("QA-1 fail: changed after it was submitted is held back on the Release page and refused by the combination's own release", d.rows[0].held && /changed after it was submitted/.test(d.rows[0].why) && r.status === 409 && noRelease(), [d.rows[0].why, r.body.message]);
  await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { who: "each_applicant" });
  d = (await call("GET", "/draft")).body;
  ok("QA-1 pass: back to exactly what was submitted, it is ready again", !d.rows[0].held, d.rows[0].why);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-A");
  ok("BR-14 fail: the author cannot release (the server refuses)", r.status === 403, r.body.detail);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes + 1 }, "user-B");
  ok("P-23 fail: a release against a changed draft is refused (review again)", r.status === 409 && /changed/.test(r.body.title), r.body.detail);
  // A person who changed the draft cannot release it: record an edit by the approver persona on this row (the simulated
  // approver has no author duty on screen, so the edit is written to the history directly) and try.
  sql(`insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary, combination_id) select gen_random_uuid(), workspace_id, 'user-B', 'updated', 'combination', combination_key, 'test edit', id from combination where id='${ss.combinationId}'`);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  ok("BR-14 fail: someone who changed the draft cannot release it (self-approval refused)", r.status === 403 && /different person/.test(r.body.title), r.body.detail);
  sql(`delete from audit_event where summary='test edit'`);
  // The submitter cannot release either: the submission is recorded as the approver persona's for this one try.
  sql(`update review_submission set submitted_by='user-B' where combination_id='${ss.combinationId}' and status='SUBMITTED'`);
  const asB = (await call("GET", "/draft", undefined, "user-B")).body;
  ok("break M2: for the approver who submitted it, the Release page holds the row back and says why (never \"Will be released\")", asB.rows[0].held && /You submitted it/.test(asB.rows[0].why) && !(await call("GET", "/draft", undefined, "user-C")).body.rows[0].held, asB.rows[0].why);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  ok("BR-14 fail: the person who submitted it cannot release it", r.status === 403 && /submitted/.test(r.body.detail) && noRelease(), r.body.detail);
  sql(`update review_submission set submitted_by='user-A' where combination_id='${ss.combinationId}' and status='SUBMITTED'`);
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  ok("P-23/BR-14 pass: a different person releases the reviewed draft as Release 2", r.status === 201 && r.body.pack === 2 && r.body.rows.length === 1, r.body);
  ok("QA-1: the release records the real submitter and approver, and the submission is closed as approved", sql(`select submitter_id || '/' || approver_id from config_release where combination_id='${ss.combinationId}'`) === "user-A/user-B" && sql(`select status from review_submission where combination_id='${ss.combinationId}' order by submitted_at desc limit 1`) === "APPROVED");
  // QA-13 after a release: removing the released form and adding it back makes a new version, never a duplicate.
  r = await call("PATCH", `/combinations/${ss.combinationId}/forms/${encodeURIComponent("IMM 1295")}`, { retire: true });
  const lineState = () => sql(`select string_agg(version || ':' || status, ',' order by version) from combination_form where combination_id='${ss.combinationId}' and lineage_key='IMM 1295'`);
  ok("QA-13: removing a released form is a removal in the draft (a retired new version), not a no-op", r.status < 300 && lineState() === "1:PUBLISHED,2:RETIRED" && !(await call("GET", `/combinations/${ss.combinationId}/config?mode=draft`)).body.snapshot.forms.some((f: any) => f.form_number === "IMM 1295"), lineState());
  r = await call("POST", `/combinations/${ss.combinationId}/lines`, { kind: "FORM", formKey: "IMM 1295" });
  ok("CHECK must 2: added back before the removal is released, the released line stands again unchanged (no draft change)", r.status === 201 && lineState() === "1:PUBLISHED" && !(await call("GET", "/draft")).body.rows.some((x: any) => x.combinationId === ss.combinationId), lineState());
  ok("P-23: the draft is empty after the release", (await call("GET", "/draft")).body.changes === 0);
  // B78 (BR-8 reads the one list Preview and a case show): for the Not ready lines, a release that asks each person nothing,
  // the state BR-8 refuses. Its placements come back after them; the touched audit time makes the catalogue read it again.
  const realPlacements = sql(`select snapshot->'placements' from config_release where combination_id = '${ss.combinationId}' order by version desc limit 1`);
  const placementsOfRelease = (json: string) => { sql(`update config_release set snapshot = jsonb_set(snapshot, '{placements}', '${json.replace(/'/g, "''")}'::jsonb) where combination_id = '${ss.combinationId}' and version = (select max(version) from config_release where combination_id = '${ss.combinationId}')`); sql(`update audit_event set at = now() where id = (select id from audit_event order by at desc limit 1)`); };
  placementsOfRelease("[]");
  ss = await leaf("individual.work_permits.open.spouse_student");
  ok("BR-8 fail: released but not startable is Not ready, with each missing item", ss.status === "NOT_READY" && ss.release.pack === 2 && ss.missing.some((m: any) => m.code === "role_without_questions"), ss.missing.map((m: any) => m.text));
  wp = await leaf("individual.work_permits.employer_specific.with_lmia");
  ok("P-23: rows not in the new draft keep their snapshot and stay Ready", wp.status === "READY" && wp.release.pack === 1, wp.statusText);
  const nr = await cat("pathway=INDIVIDUAL&filter=not_ready");
  ok("filters: Not ready shows exactly that row with its program and category", leaves(nr.tree).length === 1 && nr.tree[0].label === "Work permits" && nr.counts.not_ready === 1, nr.counts);
  placementsOfRelease(realPlacements);

  // ---------------------------------------------------------------- BR-10 counts on the catalogue equal the engine's
  const snap = JSON.parse(sql(`select r.snapshot from config_release r join combination c on c.id=r.combination_id where c.combination_key='wp.family'`));
  // UX-A part 1 (P-273, contracts/counts.ts): questions are the one question count (the Questionnaires chips' sum, per role).
  const qc = questionCounts(snap);
  const want = { ...rowCounts(snap, snap.combination.participants), questions: qc.total, questionsByRole: qc.roles };
  ok("BR-10 pass (UX-A part 1): the row's counts are the engine's counts for that configuration, questions the chips' sum", JSON.stringify(wp.counts) === JSON.stringify(want), { row: wp.counts, want });
  ok("BR-10 fail: a row with nothing set up shows no numbers (not zeros)", (await leaf("individual.visitors.extend_stay")).counts === null);

  // ---------------------------------------------------------------- BR-11 freshness
  const dl = JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")).items.map((i: any) => i.downloaded_utc).sort()[0];
  ok("BR-11 pass: Checked is the oldest date among the row's official files; next review a year later", wp.checked.at.slice(0, 10) <= dl.slice(0, 10) && wp.checked.nextReview.slice(0, 4) === String(Number(wp.checked.at.slice(0, 4)) + 1) && !wp.checked.overdue, wp.checked);
  ok("BR-11 fail: a row without official files shows no checked date", (await leaf("individual.visitors.extend_stay")).checked === null);

  // ---------------------------------------------------------------- P-51 one form intake (door 1 and 2); P-32 new-edition hold
  const editions = () => Number(sql(`select count(*) from form_edition`));
  const attachedTo = (id: string) => Number(sql(`select count(*) from source_attachment where combination_id='${id}'`));
  let before = editions();
  r = await intake([["anything.pdf", readFileSync(join(OFFICIAL, "forms", "imm1344e.pdf"))]]);
  ok("P-51 pass: a form the library lacks is added; code, title, edition, published date, kind and checksum read from the file (name ignored)", r.status === 201 && r.one.outcome === "added" && r.one.edition === "IMM 1344 (09-2024)" && r.one.kind === "form" && r.one.published === "2026-09-17" && /^[0-9a-f]{64}$/.test(r.one.sha256) && editions() === before + 1, r.one);
  r = await intake([["copy.pdf", readFileSync(join(OFFICIAL, "forms", "imm1344e.pdf"))]]);
  ok("P-51: the identical file again is \"already in the library\", never duplicated", r.one.outcome === "in_library" && editions() === before + 1, r.one);
  before = editions();
  r = await intake([["imm1295-new.pdf", pdf("IMM 1295 E: Application for work permit (test edition)", "IMM 1295 (01-2027) E")]], minorsId);
  ok("source-trust gate: a readable but unapproved checksum is held before edition review", r.one.outcome === "held" && /source verification/.test(r.one.message) && r.one.code === "IMM 1295", r.one.message);
  ok("source-trust fail-safe: an unapproved form is not added or attached", editions() === before && attachedTo(minorsId) === 0 && Number(sql(`select count(*) from intake_item where status='HELD' and reason='checksum not on approved source manifest' and edition_label='IMM 1295 (01-2027)'`)) === 1);
  r = await intake([["again.pdf", pdf("IMM 1295 E: Application for work permit (test edition)", "IMM 1295 (01-2027) E")]]);
  ok("P-32: the same held file again says it is already waiting (not held twice)", /Already waiting/.test(r.one.message) && Number(sql(`select count(*) from intake_item where edition_label='IMM 1295 (01-2027)'`)) === 1, r.one.message);
  r = await intake([["imm1344-other.pdf", pdf("IMM 1344 E: Application to sponsor (altered)", "IMM 1344 (09-2024) E")]]);
  ok("source-trust: a different, unapproved PDF with a readable code is held before edition comparison", r.one.outcome === "held" && /source verification/.test(r.one.message), r.one.message);
  r = await intake([["blank.pdf", pdf("Untitled", "Nothing here")]]);
  ok("P-51: a file whose code and edition cannot be read is held for a person with the reason", r.one.outcome === "held" && /could not read/.test(r.one.message) && Number(sql(`select count(*) from intake_item where status='HELD' and file_name='blank.pdf'`)) === 1, r.one.message);
  r = await intake([["hosts.txt", Buffer.from("127.0.0.1 localhost")]]);
  ok("P-51 fail (security): a file that is neither a PDF nor a saved web page is refused before it is read", r.one.outcome === "refused" && !Number(sql(`select count(*) from intake_item where file_name='hosts.txt'`)), r.one.message);
  r = await intake([["checklist.pdf", pdf("IMM 9100 E: Document checklist (test)", "IMM 9100 (01-2026) E")]]);
  ok("source-trust: a readable checklist with an unapproved checksum is held outside the library", r.one.outcome === "held" && r.one.kind === "checklist" && /source verification/.test(r.one.message) && !Number(sql(`select count(*) from gov_form_def where form_key='IMM 9100'`)), r.one);
  const legacyFormId = sql(`with created as (insert into gov_form_def (id, workspace_id, form_key, display_name, form_kind) select gen_random_uuid(), id, 'IMM 9101', 'Unverified legacy test', 'data_form' from workspace limit 1 returning id) select id from created`);
  sql(`insert into form_edition (id, workspace_id, gov_form_def_id, edition_label, official_file, sha256) select gen_random_uuid(), workspace_id, id, 'IMM 9101 (01-2026)', null, '${"e".repeat(64)}' from gov_form_def where id='${legacyFormId}'`);
  const unverifiedLibrary = (await call("GET", "/library/forms")).body;
  ok("source-trust: a legacy unapproved database entry is filtered out of the library picker", !unverifiedLibrary.some((f: any) => f.code === "IMM 9100" || f.code === "IMM 9101") && Number(sql(`select count(*) from gov_form_def where form_key='IMM 9101'`)) === 1);
  // A guide Load sample does not put in the library (S4 Sample fixtures load 5256, 5269, 5289 and 5487): guide 5553's recorded page.
  r = await intake([file("instructions", "guide-5553.html")]);
  ok("P-51 fail: a guide uploaded to the library alone is refused (a guide belongs to a combination)", r.one.outcome === "refused" && r.one.kind === "guide", r.one.message);
  r = await intake([file("instructions", "guide-5553.html")], minorsId);
  ok("P-51 pass: a guide uploaded on a combination is attached to it as a source", r.one.outcome === "attached" && attachedTo(minorsId) === 1, r.one.message);
  r = await intake([file("forms", "imm5257e.pdf"), file("forms", "imm1295e.pdf"), ["blank.pdf", pdf("Untitled", "Nothing here")], ["x.exe", Buffer.from("MZ")]], minorsId);
  ok("P-51: many files in one request give one result per file, in order", r.status === 201 && r.body.results.map((x: any) => x.outcome).join() === "in_library,in_library,held,refused" && r.body.summary.files === 4, r.body.summary);
  const minors = await leaf("individual.study_permits.study_permit_for_minors");
  ok("door 1: a form already in the library uploaded on a combination is attached to it (used by), not set up there yet", minors.forms.some((f: any) => f.code === "IMM 5257" && !f.drafted) && attachedTo(minorsId) === 3, minors.forms);
  ok("door 1: a form whose boxes are already mapped is one click away (next step), never added by the intake itself", minors.nextAction.kind === "add_from_library" && minors.nextAction.forms.includes("IMM 1295") && /already mapped/.test(r.body.results[1].message) && !Number(sql(`select count(*) from combination_form where combination_id='${minorsId}'`)), minors.nextAction);
  const lib = (await call("GET", "/library/forms")).body;
  ok("P-51: the library records \"used by\" from the combinations a form is attached to or filed by", lib.find((f: any) => f.code === "IMM 5257").usedBy === 3 && lib.find((f: any) => f.code === "IMM 1344").usedBy === 0, lib.filter((f: any) => ["IMM 5257", "IMM 1344"].includes(f.code)).map((f: any) => [f.code, f.usedBy]));
  r = await intake([file("forms", "imm5476e.pdf")], undefined, "user-B");
  ok("authorisation: the approver persona cannot upload (server refuses)", r.status === 403, r.body.detail);
  r = await intake(Array.from({ length: 21 }, (_, i) => [`f${i}.pdf`, pdf("Untitled", "x")] as [string, Buffer]));
  ok("P-51 fail: more than 20 files in one request are refused", r.status === 413 || r.status === 400, r.status);
  ok("m9: a file over 25 MB is refused with the limit in plain words", await (async () => { const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(26 * 1024 * 1024)]), "big.pdf"); const x = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd }); const b = await x.json(); return x.status === 413 && /25 MB/.test(b.detail); })());

  // ---------------------------------------------------------------- FIX: races and per-file results (review #2, break M1, M2)
  const many = (n: number, f: [string, Buffer], id?: string) => Promise.all(Array.from({ length: n }, () => intake([f], id)));
  let race = await many(4, ["race-a.pdf", pdf("IMM 9989 E: Race test form", "IMM 9989 (01-2026) E")]);
  ok("source-trust race: concurrent uploads of one unapproved form are held once and never enter the library", race.every((x) => x.status === 201 && x.one.outcome === "held") && Number(sql(`select count(*) from intake_item where code='IMM 9989' and status='HELD'`)) === 1 && !Number(sql(`select count(*) from gov_form_def where form_key='IMM 9989'`)), race.map((x) => x.one.outcome));
  race = await many(4, ["race-held.pdf", pdf("IMM 1295 E: Application for work permit (race edition)", "IMM 1295 (02-2027) E")]);
  ok("source-trust race: repeated unapproved edition uploads remain held once (database guard)", race.every((x) => x.status === 201 && x.one.outcome === "held") && Number(sql(`select count(*) from intake_item where edition_label='IMM 1295 (02-2027)' and status='HELD'`)) === 1, race.map((x) => x.one.message.slice(0, 40)));
  ok("source-trust fail: the database refuses a second held record for one checksum", /duplicate key|unique/.test(sqlError(`insert into intake_item (id, workspace_id, file_name, stored_path, sha256, bytes, kind, outcome, status, created_by) select gen_random_uuid(), workspace_id, 'x', '', sha256, 1, 'form', 'held', 'HELD', 'test' from intake_item where edition_label='IMM 1295 (02-2027)' and status='HELD'`) ?? ""));
  race = await many(5, ["race-new.pdf", pdf("IMM 9988 E: Race test form two", "IMM 9988 (01-2026) E")], minorsId);
  // PR runs 41379078310 / 41382319102: all five answered 201 "held", yet the step failed; the counts below say which part
  // (held records, form definitions, every row's status and outcome), so a failure names its cause.
  const held9988 = Number(sql(`select count(*) from intake_item where code='IMM 9988' and status='HELD'`)), def9988 = Number(sql(`select count(*) from gov_form_def where form_key='IMM 9988'`));
  ok("source-trust race: a new unapproved form uploaded five times gives five answers and one held record", race.every((x) => x.status === 201 && x.one.outcome === "held") && held9988 === 1 && !def9988, { held: held9988, formDefs: def9988, answers: race.map((x) => [x.status, x.one.outcome]).map(String).join(" "), rows: sql(`select status||':'||outcome from intake_item where code='IMM 9988' order by created_at`).split("\n") });
  const [ba, bb] = await Promise.all([intake([["p1.pdf", pdf("IMM 9985 E: Batch one", "IMM 9985 (01-2026) E")], ["e1.pdf", pdf("IMM 9987 E: Edition race", "IMM 9987 (01-2026) E")]]), intake([["p2.pdf", pdf("IMM 9984 E: Batch two", "IMM 9984 (01-2026) E")], ["e2.pdf", pdf("IMM 9987 E: Edition race", "IMM 9987 (02-2026) E")]])]);
  ok("source-trust batches: simultaneous unapproved forms are held and never create a definition or edition", ba.status === 201 && bb.status === 201 && ba.body.results.length === 2 && bb.body.results.length === 2 && !Number(sql(`select count(*) from form_edition where edition_label like 'IMM 9987%'`)) && !Number(sql(`select count(*) from gov_form_def where form_key='IMM 9987'`)) && Number(sql(`select count(*) from intake_item where code in ('IMM 9984','IMM 9985','IMM 9987') and status='HELD'`)) === 4, [ba.body.results.map((x: any) => x.outcome), bb.body.results.map((x: any) => x.outcome)]);

  // ---------------------------------------------------------------- FIX: edition order (review #5) and the Live filter (founder F1)
  r = await intake([file("previous-editions", "imm5476e-2021.pdf")]);
  wp = await leaf("individual.work_permits.employer_specific.with_lmia");
  ok("#5 fail: an older edition (IMM 5476 11-2021 against the library's newer one) is \"Older edition: not used\", not a new edition", r.one.outcome === "older_edition_held" && /Older edition: not used/.test(r.one.message) && !wp.held.some((h: any) => /2021/.test(h.edition)), { out: r.one.outcome, held: wp.held });
  r = await intake([["imm5476-next.pdf", pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E")]]);
  wp = await leaf("individual.work_permits.employer_specific.with_lmia");
  ok("source-trust: unapproved newer-looking edition is held before it can affect a Live row", r.one.outcome === "held" && wp.status === "READY" && wp.live && !wp.held.some((h: any) => h.edition === "IMM 5476 (01-2027)"), { needs: wp.needs, live: wp.live, next: wp.nextAction, held: wp.held });
  for (const pw of ["INDIVIDUAL", "CORPORATE"]) {
    const a = await cat(`pathway=${pw}&filter=all`), l = await cat(`pathway=${pw}&filter=live`);
    // Card v4 (P-180): "Live" is the card's chip (a release that passes its own checks), as the cards show it.
    const liveRows = a.rows.filter((x: any) => x.setup?.chip.status === "LIVE");
    ok(`F1 pass (${pw}) P-180: the Live count equals the rows whose chip shows Live, and the Live filter lists exactly them`, a.counts.live === liveRows.length && (a.counts.live === 0 || l.rows.map((x: any) => x.nodeKey).sort().join() === liveRows.map((x: any) => x.nodeKey).sort().join()), { live: a.counts.live, shown: a.rows.filter((x: any) => x.status === "READY").length });
  }
  // Stand-in for the impact review (Screen 02): close the held editions.
  sql(`update intake_item set status='DONE' where status='HELD'`);
  wp = await leaf("individual.work_permits.employer_specific.with_lmia");
  ok("P-49 pass: released, startable and nothing open is Live (shown as \"Live\") and not in Needs work", wp.live && !wp.needs && /^Live · Release 1/.test(wp.statusText) && (await cat("pathway=INDIVIDUAL&filter=live")).rows.some((x: any) => x.nodeKey === wp.nodeKey), wp.statusText);
  const needs = await cat("pathway=INDIVIDUAL&filter=needs"), all = await cat("pathway=INDIVIDUAL&filter=all");
  // P-49's "Needs work" stays on each row; with a person, the needs filter and count are that person's Needs you (P-180, break-report m2).
  ok("P-49 / F1: every row is in Needs work or Live; the needs filter and count are the person's Needs you", all.rows.every((x: any) => x.needs || x.live) && all.rows.filter((x: any) => x.needsYou).length === needs.counts.needs && (needs.fellBack ? needs.counts.needs === 0 : needs.filter === "needs" && needs.rows.every((x: any) => x.needsYou)), needs.counts);

  // ---------------------------------------------------------------- FIX: the page and the row agree (review #1); plain errors (review #4); keys (break M3); scope (m5)
  const vvLeaf = await leaf("individual.visitors.visitor_visa");
  const vvSum = (await call("GET", `/combinations/${vvLeaf.combinationId}/summary`)).body;
  ok("#1 pass: the combination page's summary carries the same next step as the row", JSON.stringify(vvSum.row.nextAction) === JSON.stringify(vvLeaf.nextAction), [vvSum.row.nextAction, vvLeaf.nextAction]);
  ok("#1: a source form already mapped in the library is marked so (the page does not call it unmapped)", vvLeaf.nextAction.kind !== "add_from_library" || vvSum.row.forms.filter((f: any) => vvLeaf.nextAction.forms.includes(f.code)).every((f: any) => f.inLibrary === true), vvSum.row.forms);
  const bad = [await call("GET", "/combinations/xyz/summary"), await call("GET", "/combinations/not-a-uuid"), await intake([["x.pdf", pdf("t", "x")]], "not-a-uuid")].map((x: any) => ({ status: x.status, text: JSON.stringify(x.body) }));
  ok("#4 fail: a malformed id is a plain 404, with no database call or server path in the answer", bad.every((x) => x.status === 404 && !/prisma|invalid|\/Users\/|node_modules|\.ts\b/i.test(x.text)), bad);
  const rel = (await call("GET", `/combinations/${wp.combinationId}`)).body.releases[0];
  ok("#3: a release shows \"Release N\", the approver's role name, and a basis without checksums", rel.release === 1 && rel.approver === "Approver" && !/[0-9a-f]{12}/.test(rel.basis) && !/user-[A-Z]/.test(rel.basis), { release: rel.release, approver: rel.approver, basis: rel.basis });
  const n1 = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "retail.temporary_residence", label: "日本語プログラム" }), n2 = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "retail.temporary_residence", label: "中文项目" });
  const long = "A very long program name that goes on and on beyond sixty characters, ";
  const n3 = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "retail.temporary_residence", label: `${long}first` }), n4 = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "retail.temporary_residence", label: `${long}second` });
  ok("M3 pass: different names with no Latin letters, or sharing their first 60 characters, are all created with keys of their own", [n1, n2, n3, n4].every((x) => x.status === 201) && new Set([n1, n2, n3, n4].map((x) => x.body.programNodeKey)).size === 4, [n1, n2, n3, n4].map((x) => [x.status, x.body.programNodeKey ?? x.body.detail]));
  const n5 = await call("POST", "/program-nodes", { kind: "PROGRAM", parentKey: "retail.temporary_residence", label: "日本語 プログラム" });
  ok("M3 fail: the same name again (ignoring spaces) is still refused (BR-6)", n5.status === 409, n5.body.detail);
  // QA-14: BR-6 holds in the database, also when the same name arrives four times at the same moment.
  const raced = await Promise.all(Array.from({ length: 4 }, () => call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.visitors", label: "Race at once" })));
  ok("QA-14 pass: the same category sent four times at once is created once; the others are told it exists", raced.filter((x) => x.status === 201).length === 1 && raced.filter((x) => x.status === 409 && /already exists/.test(x.body.message ?? x.body.detail)).length === 3 && sql("select count(*) from program_def where parent_node_key='individual.visitors' and label='Race at once'") === "1", raced.map((x) => x.status));
  const dbRefusal = sqlError(`insert into program_def (id, workspace_id, program_node_key, parent_node_key, node_kind, label, name_key, source_basis, created_by, allowed_locations) select gen_random_uuid(), workspace_id, 'individual.visitors.race_twin', 'individual.visitors', 'STREAM', 'RACE-at once', 'raceatonce', 'ILLUSTRATIVE', 'test', '{}' from program_def where program_node_key='individual.visitors'`);
  ok("QA-14 fail: the database itself refuses a second same-parent name written another way", !!dbRefusal && /program_def_parent_name_key|duplicate key/.test(dbRefusal), dbRefusal);
  ok("round 3: the request that lost the race gets the field message too (label)", raced.filter((x) => x.status === 409).every((x) => x.body.errors?.[0]?.field === "label" && x.body.existing?.label === "Race at once"), raced.filter((x) => x.status === 409).map((x) => x.body.errors));
  ok("QA-14: the same name under another parent is still allowed", (await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.study_permits", label: "Race at once" })).status === 201);
  const junk = await cat("pathway=INDIVIDUAL&filter=all&under=junk.key&program=nope"), cross = await cat("pathway=INDIVIDUAL&filter=all&under=corporate.lmia");
  ok("m5: a program or path not in this pathway is ignored and the answer says so (no empty contradiction)", junk.under === "" && junk.program === "" && junk.rows.length === junk.counts.all && cross.under === "" && cross.underPath === null, { under: junk.under, program: junk.program, rows: junk.rows.length });
  ok("m4: a search over 120 characters is answered, not refused", (await call("GET", `/catalogue?pathway=INDIVIDUAL&q=${"a".repeat(130)}`)).status === 200);
  // Card v4 (P-180): the Progress sort follows the card's chip: Not ready, In progress, Not started, Live (and back).
  const chipsOf = (r: any) => r.rows.map((x: any) => x.setup?.chip.status);
  const byStatus = chipsOf(await cat("pathway=INDIVIDUAL&filter=all&sort=status")), desc = chipsOf(await cat("pathway=INDIVIDUAL&filter=all&sort=-status"));
  const rank = { NOT_READY: 0, IN_PROGRESS: 1, NOT_STARTED: 2, LIVE: 3 } as Record<string, number>;
  ok("P-49 P-180: the Progress column sorts by the chip, In progress before Not started before Live (and back)", byStatus.every((x: string, i: number) => x in rank && (!i || rank[byStatus[i - 1]] <= rank[x])) && desc.every((x: string, i: number) => !i || rank[desc[i - 1]] >= rank[x]) && desc[0] === "LIVE" && new Set(byStatus).size >= 3, { first: byStatus[0], last: byStatus.at(-1), kinds: [...new Set(byStatus)] });
  ok("P-49 fail: an unknown sort is refused on its field", (await call("GET", "/catalogue?sort=name")).body.errors?.[0]?.field === "sort");
  const under = await cat("pathway=INDIVIDUAL&filter=all&under=individual.work_permits.open");
  ok("P-50: the path on a combination filters the list to any level (category here), with its labels", under.rows.length === 3 && under.rows.every((x: any) => x.pathKeys.includes("individual.work_permits.open")) && under.underPath.join(" › ") === "Work permits › Open work permit", under.underPath);
  const sv = (await cat("pathway=INDIVIDUAL&filter=all&under=individual.visitors")).rows.map((x: any) => x.path.join(" › "));
  ok("item 5: Super visa is one combination, Visitors › Super visa (no Parent / Grandparent sub-categories)", sv.includes("Visitors › Super visa") && !sv.some((x: string) => /Super visa ›/.test(x)), sv);
  const vvPlan = (await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [(await leaf("individual.visitors.visitor_visa")).combinationId] }, mode: "STUB" })).body;
  ok("regression (slice 1): a form the intake added without a box map is planned as an AI draft, not a library reuse that fails", vvPlan.targets.some((t: any) => /IMM 5257 \(/.test(t.label ?? t.edition ?? JSON.stringify(t)) && t.action === "draft") && !vvPlan.targets.some((t: any) => /IMM 5257 \(/.test(JSON.stringify(t)) && t.action === "reuse_library"), vvPlan.targets.map((t: any) => [t.action, t.label ?? t.edition]));

  // ---------------------------------------------------------------- BR-13 one AI place: the row's next action
  let vv = await leaf("individual.visitors.visitor_visa");
  ok("BR-13: forms the library already maps come first (no AI needed for them)", vv.nextAction.kind === "add_from_library" && vv.nextAction.forms.join() === "IMM 5707", vv.nextAction);
  for (const code of vv.nextAction.forms) await call("POST", `/combinations/${vv.combinationId}/lines`, { kind: "FORM", formKey: code });
  vv = await leaf("individual.visitors.visitor_visa");
  ok("BR-13 pass: then the approved form whose boxes are not mapped offers Draft setup with AI", vv.nextAction.kind === "draft_ai", vv.nextAction);
  const st = await leaf("individual.study_permits.study_permit");
  ok("BR-13 fail: a row whose forms are already mapped in the library offers to add them, not AI", st.nextAction.kind === "add_from_library" && st.nextAction.forms.length === 3, st.nextAction);
  for (const code of st.nextAction.forms) await call("POST", `/combinations/${st.combinationId}/lines`, { kind: "FORM", formKey: code });
  ok("adding them from the library needs no AI and shows them as mapped forms", (await leaf("individual.study_permits.study_permit")).forms.filter((f: any) => f.drafted).length === 3);

  // ---------------------------------------------------------------- BR-15 / BR-16 labels, not levels
  ok("BR-15 pass: the worker's LMIA work permit sits under Individual and says it is supported by Corporate › LMIA", wp.linkLabel === "Supported by: Corporate › LMIA" && wp.path[0] === "Work permits");
  const ee = leaves(ind.tree).filter((l) => l.path[1] === "Express Entry");
  ok("BR-16 pass: Express Entry is one category with two steps shown as labels, not an extra level", ee.length === 2 && ee.every((l) => l.path.length === 3) && /Step 1 of 2/.test(ee[0].linkLabel) && /Step 2 of 2/.test(ee[1].linkLabel), ee.map((l) => l.linkLabel));

  // ---------------------------------------------------------------- search and authorisation
  const s = await cat("pathway=INDIVIDUAL&q=imm%205409");
  ok("search covers form codes and says what matched", leaves(s.tree).length >= 1 && leaves(s.tree).every((l) => l.matches.includes("IMM 5409")), leaves(s.tree).map((l) => l.label));
  const s2 = await cat("pathway=CORPORATE&q=imm%205409");
  ok("search in the other workspace says how many matches are in this one", s2.otherPathwayMatches >= 1 && !leaves(s2.tree).length, s2.otherPathwayMatches);
  r = await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.work_permits", label: "By approver" }, "user-B");
  ok("authorisation: the approver persona cannot add programs (deny by default on the server)", r.status === 403);
  r = await call("POST", `/combinations/${minorsId}/lines`, { kind: "FORM", formKey: "IMM 5707" }, "user-C");
  ok("authorisation: the reviewer persona cannot change a combination", r.status === 403);
  const t0 = Date.now(); await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=in_setup"); const ms = Date.now() - t0;
  { const s = speed("performance: a filtered catalogue answers in under 200 ms with the sample data", ms < 200, `${ms} ms`); ok(s.label, s.ok, s.detail); }

  // ---------------------------------------------------------------- QA-6, QA-7 names; QA-11 the existing combination
  // S3 (P-125): names are added on Program structure only; the name rules are checked through its endpoint.
  r = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "program", parentKey: "retail.temporary_residence", label: "!!!" });
  ok("QA-6 fail: a name of symbols only is refused on its field in plain words; nothing is created", r.status === 400 && r.body.errors?.some((e: any) => e.field === "label" && /letters or digits/.test(e.message)) && sql("select count(*) from program_def where label in ('!!!','???')") === "0", r.body.errors);
  r = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "program", parentKey: "retail.temporary_residence", label: "A".repeat(60) + " " + "B".repeat(70) });
  ok("QA-7 fail: a 131-character name is refused with \"Keep the name under 120 characters.\" on the name field", r.status === 400 && r.body.errors?.[0]?.field === "label" && r.body.errors[0].message === "Keep the name under 120 characters." && sql("select count(*) from program_def where length(label) > 120") === "0", r.body.errors);
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: "retail.temporary_residence" }, program: { label: "R\u00e9sidence temporaire" }, category: { label: "Visa d'\u00e9t\u00e9 \u2014 \u65e5\u672c\u8a9e" }, subCategory: null });
  ok("QA-6 pass: names in any script with punctuation around letters are created as typed", r.status === 201 && r.body.created?.length === 2, r.body?.leaf?.key ?? r.body?.detail);
  const opts = (await call("GET", "/path-options?pathway=INDIVIDUAL")).body;
  const wpOpt = opts.programs.find((x: any) => x.key === "individual.work_permits")?.categories.find((x: any) => x.key === "individual.work_permits.employer_specific")?.subCategories.find((x: any) => x.key === "individual.work_permits.employer_specific.with_lmia");
  ok("QA-11 pass: the path builder knows the existing combination's id, so \"Open the existing combination\" opens its page", wpOpt?.hasSetup && wpOpt.combinationId === wp.combinationId, wpOpt);
  const noSetup = opts.programs.flatMap((p: any) => p.categories).find((c: any) => !c.hasSetup && !c.subCategories.length);
  ok("QA-11 fail: a level without setup has no combination to open", !!noSetup && noSetup.combinationId === null, noSetup?.key);

  // ---------------------------------------------------------------- QA-5 stored times are the real moment
  const label5 = `Time probe ${Date.now()}`;
  await call("POST", "/program-nodes", { kind: "STREAM", parentKey: "individual.work_permits", label: label5 });
  const skew = Number(sql(`select extract(epoch from (now() - at))::int from audit_event where summary like '%${label5}%' order by at desc limit 1`));
  ok("QA-5 pass: a time the app writes is stored as the real moment, whatever the database's own zone", Math.abs(skew) < 120, `${skew} s; database zone ${sql("show timezone")}`);
  const shownAt = ((await call("GET", "/activity")).body as any[]).find((a) => a.summary?.includes(label5))?.at;
  ok("QA-5: the app still shows it at the real time", Math.abs(Date.now() - Date.parse(shownAt)) < 120_000, shownAt);
  ok("QA-5 condition: the database's own zone is not UTC on this machine, so the check above is a real test of the fix", sql("show timezone") !== "UTC" && sql("show timezone") !== "Etc/UTC", sql("show timezone"));

  // ---------------------------------------------------------------- QA-12 the Demo menu says what was loaded
  let ds = (await call("GET", "/demo/status")).body;
  ok("QA-12 pass: after the sample load the Demo menu says the sample inputs are loaded", ds.loaded === true && (await call("GET", "/session")).body.sampleLoaded === true, ds.loaded);
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  const twoLoads = await Promise.all([call("POST", "/demo/load"), call("POST", "/demo/load")]);
  ok("round 3: two sample loads at once: one loads, the other is told it is already loading (never a 500)", twoLoads.filter((x) => x.status === 201).length === 1 && twoLoads.some((x) => x.status === 409 && /already loading|already exist/.test(x.body.message ?? x.body.detail)), twoLoads.map((x) => [x.status, x.body?.message ?? x.body?.seconds]));
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("QA-12 setup: reset the demo copy", r.status === 201, r.body?.message);
  // W1-03 (27 Oct): after a reset the Structure is empty in both tabs; a person adds the Pathway first.
  const handPw = (await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level: "pathway", label: "Individual" })).body.key;
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: handPw }, program: { label: "Hand-made" }, category: { label: "One row" }, subCategory: null });
  ds = (await call("GET", "/demo/status")).body;
  const ses = (await call("GET", "/session")).body;
  ok("QA-12 fail: a combination made by hand is not \"sample inputs loaded\"; the menu says programs exist (reset first)", r.status === 201 && ds.loaded === false && ds.programsExist === true && ses.sampleLoaded === false && ses.counts.programs > 0, { loaded: ds.loaded, programsExist: ds.programsExist, sampleLoaded: ses.sampleLoaded });

  const out = join(import.meta.dirname, "..", "evidence", "screen01"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "api-checks.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
