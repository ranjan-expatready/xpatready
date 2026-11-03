// S6 slices 1a and 1b (screens lane; P-149 one door, contract v2; C11.13, C11.14, C3.2, C3.6): the ProposalItem table, the
// migration off NormalizationItem (copies, drops `rule` rows, logs both), the one door insertProposals (contract parse,
// identity at write), decide (landers, identity at approval, no in-place edit), undo within 10 s, the field-map review
// reading the new table, and the free-add scan. A passing and a failing case per rule, on an isolated copy with the
// sample inputs loaded and a scratch database for the migration (the demo is never touched). 1b adds the queue's routes:
// GET /review/proposals in Ready · Check · Decide, bulk accept for Ready only (never rules → library, at most 200),
// one Undo, To review's group and batch rows, grouped second-person approval, a reuse that adds nothing, and an
// approved answer list that publishes. NO model call (US$0).
//   zsh studio/tools/isolated.sh screens_p149 4447 start && tsx studio/tests/check_s6_p149.ts 4447 xr_studio_screens_p149
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { seedAnswerList } from "./seed_library.cjs";

const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_p149";
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
const STUDIO = join(import.meta.dirname, "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = "/opt/homebrew/opt/postgresql@18/bin/psql";
const sqlOn = (db: string, q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${db}`, "-v", "ON_ERROR_STOP=1", "-Atc", q], { encoding: "utf8" }).trim();
const sql = (q: string) => sqlOn(DB, q);
const status = (e: unknown) => (e as { getStatus?: () => number }).getStatus?.() ?? 0;
const message = (e: unknown) => String((e as { message?: string }).message ?? e);
const refused = async (f: () => Promise<unknown>) => { try { await f(); return { status: 0, message: "" }; } catch (e) { return { status: status(e), message: message(e) }; } };

/** A valid AI item of a kind, as a producer would write it (contract v2 without the server's ids). */
const SHA = "a".repeat(64), RUN = crypto.randomUUID();
/** QA-176 (P-121): a Ready AI item carries both readings that agree and a passed rules check; the door lowers any other. */
const both = (payload: any) => { const r = { reading: `${payload.label ?? payload.kind} as read`, payload, from: "replay", runFile: "runs/test.json", costUsd: 0 }; return { draft: r, check: r }; };
const item = (payload: any, over: any = {}) => ({ kind: payload.kind, runId: RUN, step: "field_map_edition", scope: { formEdition: "IMM 0000 (01-2026)", combinationId: null }, landsOn: "library",
  reuse: { match: "new", existingKey: null }, payload, source: { file: "imm0000e.pdf", sha256: SHA, edition: "01-2026", page: 1, quote: "Your family name", quoteFound: true, rule: null },
  rounds: both(payload), rules: [{ rule: "quote found", passed: true, why: null }], agreement: "agreed", confidence: "ready", reason: null, origin: "ai", identity: { key: "", near: [], nearReason: null },
  relatesTo: null, revision: null, basis: "SAMPLE", ...over });

(async () => {
  // ─────────────────── the migration (Q-L4), replayed on a scratch database: every older migration, rows of each old kind, then this one
  const MIG = `${DB}_mig`;
  execFileSync("/opt/homebrew/opt/postgresql@18/bin/dropdb", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "--if-exists", MIG]);
  execFileSync("/opt/homebrew/opt/postgresql@18/bin/createdb", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", MIG]);
  const dirs = readdirSync(join(STUDIO, "prisma", "migrations")).filter((d) => /^\d{14}_/.test(d)).sort();
  const mine = dirs.indexOf("20261029200000_s6_proposal_item");
  for (const d of dirs.slice(0, mine)) execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${MIG}`, "-q", "-v", "ON_ERROR_STOP=1", "-f", join(STUDIO, "prisma", "migrations", d, "migration.sql")], { stdio: "ignore" });
  const W = "11111111-1111-4111-8111-111111111111", J = "22222222-2222-4222-8222-222222222222";
  sqlOn(MIG, `insert into workspace (id, key, label) values ('${W}', 'mig', 'Migration test')`);
  sqlOn(MIG, `insert into drafting_job (id, workspace_id, kind, mode, status, started_by) values ('${J}', '${W}', 'field_map', 'REPLAY', 'COMPLETED', 'user-A')`);
  const old = (kind: string, key: string, decision: string, extra = "") => sqlOn(MIG, `insert into normalization_item (id, workspace_id, job_id, proposed_key, proposed_meaning, proposed_type, outcome, matched_key, candidates, persons, boxes, evidence, affected, reason, decision, decided_key, decided_by, kind, payload, source_quote)
    values (gen_random_uuid(), '${W}', '${J}', '${key}', 'Meaning of ${key}', 'text', ${extra || "'NEW', null, '[{\"key\":\"person.near\",\"score\":0.7}]'"}, '{applicant}', '[]', '{"quotes":["Family name"]}', '{}', 'Because', '${decision}', ${decision === "PENDING" ? "null" : `'${key}'`}, ${decision === "PENDING" ? "null" : "'user-A'"}, '${kind}', ${kind === "field" ? (decision === "NEW" ? `'{"label":"Family name","reason":"different","advisory":null}'` : "null") : `'{"document_type":"passport","who":"each_applicant","base_or_conditional":"base"}'`}, ${kind === "field" ? "null" : "'Checklist line'"})`);
  old("field", "person.family_name", "PENDING", "'REUSE', 'person.family_name', '[]'"); old("field", "person.nick", "NEW"); old("field", "person.other", "RETURNED");
  old("section", "section.travel", "ACCEPTED"); old("answer_list", "list.sex", "PENDING"); old("document_requirement", "requirement.passport", "ACCEPTED"); old("check", "check.dates", "PENDING");
  old("rule", "rule.one", "PENDING"); old("rule", "rule.two", "ACCEPTED");
  let migErr = "";
  try { execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${MIG}`, "-q", "-v", "ON_ERROR_STOP=1", "-f", join(STUDIO, "prisma", "migrations", "20261029200000_s6_proposal_item", "migration.sql")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { migErr = message(e); }
  ok("C11.13 migration pass: it runs cleanly on rows of every old kind", !migErr, migErr.slice(0, 300));
  const rows = sqlOn(MIG, "select kind || ':' || status || ':' || coalesce(choice, '-') from proposal_item order by identity_key").split("\n");
  ok("C11.13 migration pass: field, section, answer list, requirement and check rows are copied with the contract's kinds and words", rows.length === 7 && ["field:waiting:-", "field:edited:NEW", "field:rejected:RETURNED", "section:accepted:ACCEPTED", "answer_list:waiting:-", "requirement_line:accepted:ACCEPTED", "cross_check:waiting:-"].every((r) => rows.includes(r)), rows);
  ok("C11.13 migration pass: a copied field keeps its comparison (outcome, candidates, quote) and a near match carries its reason", sqlOn(MIG, "select work->>'outcome' || '|' || (identity->'near'->>0) || '|' || (identity->>'nearReason') || '|' || (source->>'quote' is null)::text from proposal_item where identity_key = 'person.nick'") === "NEW|person.near|Because|true");
  ok("C11.13 migration pass: a reuse match becomes reuse with its existing key; a person's new name keeps its label", sqlOn(MIG, "select reuse->>'match' || ':' || (reuse->>'existingKey') from proposal_item where identity_key = 'person.family_name'") === "reuse:person.family_name"
    && sqlOn(MIG, "select payload->>'label' from proposal_item where identity_key = 'person.nick'") === "Family name");
  ok("C11.13 migration fail: the rule rows are not copied (dropped)", sqlOn(MIG, "select count(*) from proposal_item where identity_key like 'rule.%'") === "0");
  const log = sqlOn(MIG, "select summary || '#' || (detail->>'copied') || '#' || (detail->>'dropped') || '#' || jsonb_array_length(detail->'dropped_items') from audit_event where action = 'migrated'");
  ok("C11.13 migration pass (Q-L4): the activity log says what was copied and what was dropped, by key", /^Moved 7 AI proposals.*dropped 2 .*rule rule\.one.*rule rule\.two.*#7#2#2$/.test(log), log);
  ok("C11.13 migration pass: normalization_item is gone; library_change gained the batch and item columns", sqlOn(MIG, "select to_regclass('normalization_item') is null") === "t" && sqlOn(MIG, "select count(*) from information_schema.columns where table_name = 'library_change' and column_name in ('batch_id', 'proposal_item_id')") === "2");
  execFileSync("/opt/homebrew/opt/postgresql@18/bin/dropdb", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", MIG]);

  // ─────────────────── the door, on the isolated copy with the sample loaded
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const { Db, Audit, ACTORS } = await import("../api/src/core.ts");
  const P = await import("../api/src/proposals.ts");
  const db = new Db(), audit = new Audit(db);
  const ws = sql("select id from workspace where key = 'demo'");
  const A = ACTORS[0], B = ACTORS[2];
  const field = (label: string, over: any = {}) => { const p = { kind: "field", label, aliases: [], meaning: `What ${label} means on the form.`, valueType: "text", subject: "person", formBox: null }; return item(p, { identity: { key: P.identityKeyOf(p as any, ""), near: [], nearReason: null }, ...over }); };
  sql(`insert into drafting_job (id, workspace_id, kind, mode, status, started_by, finished_at) values ('${RUN}', '${ws}', 'field_map_edition', 'REPLAY', 'COMPLETED', 'user-A', now())`);
  const n0 = Number(sql("select count(*) from proposal_item"));
  let e = await refused(() => P.insertProposals(db, ws, [field("Orphan item", { runId: crypto.randomUUID() })]));
  ok("C11.13 door fail: an item naming a run that is not one of the workspace's steps is refused (400)", e.status === 400 && /not one of this workspace's steps/.test(e.message), e);

  const [okId] = await P.insertProposals(db, ws, [field("Favourite colour of the test")]);
  const r0 = sql(`select status || '|' || identity_key || '|' || origin from proposal_item where id = '${okId}'`);
  ok("C11.13 door pass: a valid AI item is written waiting, its identity key under the kind's rule (the name)", r0 === "waiting|favouritecolourofthetest|ai", r0);
  e = await refused(() => P.insertProposals(db, ws, [{ ...field("Mismatch"), kind: "section" } as any]));
  ok("C11.13 door fail: an item whose payload is another kind is refused (400), nothing written", e.status === 400 && /another kind/.test(e.message) && Number(sql("select count(*) from proposal_item")) === n0 + 1, e);
  e = await refused(() => P.insertProposals(db, ws, [field("Some name", { identity: { key: "my own key", near: [], nearReason: null } })]));
  ok("C11.13 door fail: an identity key that is not the kind's rule is refused (400)", e.status === 400 && /identity key/.test(e.message), e);
  e = await refused(() => P.insertProposals(db, ws, [field("Near one", { identity: { key: "nearone", near: ["person.family_name"], nearReason: null } })]));
  ok("C11.13 door fail: a near match without a reason is refused by the contract (400)", e.status === 400 && /not the same/.test(e.message), e);
  const libLabel = sql("select label from canonical_field where label is not null and status in ('DRAFT','PUBLISHED') and merged_into_key is null limit 1");
  e = await refused(() => P.insertProposals(db, ws, [field(libLabel.toUpperCase())]));
  ok("C3.2 identity at write fail: a new field named like a library field (case ignored) is refused (409), reuse it instead", e.status === 409 && /already in the library/.test(e.message), [libLabel, e]);
  const [reuseId] = await P.insertProposals(db, ws, [field(libLabel, { reuse: { match: "reuse", existingKey: "x" } })]);
  ok("C3.2 identity at write pass: the same name proposed as a reuse is written", !!reuseId);
  e = await refused(() => P.insertProposals(db, ws, [field("Twice"), field("twice!")]));
  ok("C11.13 door fail: the same identity twice in one batch is refused (409), neither written", e.status === 409 && sql("select count(*) from proposal_item where identity_key = 'twice'") === "0", e);
  seedAnswerList(sql, { key: "p149_marital", label: "Marital status (test)", values: [{ key: "married", label: "Married" }, { key: "single", label: "Single" }, { key: "widowed", label: "Widowed" }] });
  const list = sql("select l.answer_list_key || '|' || string_agg(v.value_key, ',' order by v.value_key desc) from answer_list l join answer_list_value v on v.answer_list_id = l.id where l.workspace_id = (select id from workspace where key='demo') and l.status in ('DRAFT','PUBLISHED') group by l.id limit 1").split("|");
  const listItem = (codes: string[]) => { const p = { kind: "answer_list", label: "A list", values: codes.map((c) => ({ code: c, label: c.toUpperCase() })) }; return item(p, { identity: { key: P.identityKeyOf(p as any, ""), near: [], nearReason: null } }); };
  e = await refused(() => P.insertProposals(db, ws, [listItem(list[1].split(","))]));
  ok("C3.2 identity at write fail: an answer list with a library list's codes in another order is the same list (409)", e.status === 409 && e.message.includes(list[0]), [list, e]);
  const [listId] = await P.insertProposals(db, ws, [listItem(["zz_one", "zz_two"])]);
  ok("C3.2 identity at write pass: a list with a new set of codes is written", !!listId);

  // ─────────────────── decide: landers, identity at approval, no in-place edit
  e = await refused(() => P.decide(db, audit, A, ws, [okId], { action: "reject" }));
  ok("C11.14 decide fail: a reject without a reason is refused (400), the item stays waiting", e.status === 400 && sql(`select status from proposal_item where id = '${okId}'`) === "waiting", e);
  // P-299: a new shared field is accepted on its own, so the field and the list are two decisions.
  const dF = await P.decide(db, audit, A, ws, [okId], { action: "accept" });
  const d1 = await P.decide(db, audit, A, ws, [listId], { action: "accept" });
  const landed = sql(`select string_agg(c.kind || ':' || c.status || ':' || (c.batch_id in ('${d1.batchId}', '${dF.batchId}'))::text || ':' || (c.proposal_item_id is not null)::text, ',' order by c.kind) from library_change c where c.batch_id in ('${d1.batchId}', '${dF.batchId}')`);
  ok("C11.14 decide pass: accepting lands a draft field and a draft list, each with an ADD waiting for a second person carrying the batch and the item", landed === "answer_list:WAITING:true:true,field:WAITING:true:true"
    && sql(`select status from canonical_field where canonical_field_key = '${dF.items.find((x) => x.id === okId)!.landedAs}'`) === "DRAFT" && sql(`select status from proposal_item where id = '${okId}'`) === "accepted", [landed, d1]);
  e = await refused(() => P.decide(db, audit, A, ws, [okId], { action: "reject", reason: "changed my mind" }));
  ok("C11.14 decide fail: an accepted item is not decided again in place (409)", e.status === 409 && /revision/.test(e.message), e);
  const sec = (label: string) => { const p = { kind: "section", label, aliases: [], fieldKeys: [] }; return item(p, { identity: { key: P.identityKeyOf(p as any, ""), near: [], nearReason: null } }); };
  const [secId] = await P.insertProposals(db, ws, [sec("Pets travelling with you")]);
  sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, display_order, origin, updated_by) values (gen_random_uuid(), '${ws}', 'pets_meanwhile', 1, 'DRAFT', 'Pets travelling with you', 999, 'HUMAN', 'user-A')`);
  const nChanges = sql("select count(*) from library_change");
  e = await refused(() => P.decide(db, audit, B, ws, [secId], { action: "accept" }));
  ok("C3.2 identity at approval fail: a section added to the library since it was proposed is refused (409); nothing lands, it stays waiting", e.status === 409 && /added since it was proposed/.test(e.message) && sql("select count(*) from library_change") === nChanges && sql(`select status from proposal_item where id = '${secId}'`) === "waiting", e);
  const [sec2] = await P.insertProposals(db, ws, [sec("Pets staying behind")]);
  const d2 = await P.decide(db, audit, B, ws, [sec2], { action: "edit", payload: { kind: "section", label: "Pets left at home", aliases: [], fieldKeys: [] } });
  ok("C11.14 decide pass: an edit lands the edited item (section \"Pets left at home\") and is recorded as edited", sql(`select status || '|' || identity_key from proposal_item where id = '${sec2}'`) === "edited|petsleftathome" && sql(`select title from logical_section where section_key = '${d2.items[0].landedAs}'`) === "Pets left at home", d2);
  e = await refused(() => P.decide(db, audit, B, ws, [secId], { action: "edit", payload: { kind: "field", label: "x", aliases: [], meaning: "xxx", valueType: "text", subject: null, formBox: null } }));
  ok("C11.14 decide fail: an edit cannot change the item's kind (400)", e.status === 400 && /kind/.test(e.message), e);
  const cond = { kind: "condition", target: { kind: "question", key: "person.family_name" }, roles: ["principal_applicant"], condition: { sentence: "Only when married.", tree: {}, sharedConditionKey: null, examples: [] } };
  const [condId] = await P.insertProposals(db, ws, [item(cond, { landsOn: "combination", identity: { key: "cond-1", near: [], nearReason: null } })]);
  e = await refused(() => P.decide(db, audit, A, ws, [condId], { action: "accept" }));
  ok("C11.14 decide fail: a kind with no lander yet (a condition) is refused (409) and stays waiting", e.status === 409 && sql(`select status from proposal_item where id = '${condId}'`) === "waiting", e);
  const caseOfficer = { id: "user-O", persona: "officer", name: "Case officer", role: "", duties: ["case"], area: "runtime" } as any;
  e = await refused(() => P.decide(db, audit, caseOfficer, ws, [condId], { action: "reject", reason: "not mine" }));
  ok("C11.14 decide fail: a person without the review duty cannot decide (403)", e.status === 403, e);
  const d3 = await P.decide(db, audit, A, ws, [condId], { action: "reject", reason: "Not on this form" });
  ok("C11.14 decide pass: a reject with its reason is recorded, nothing lands", sql(`select status || '|' || decision_reason from proposal_item where id = '${condId}'`) === "rejected|Not on this form" && sql(`select count(*) from library_change where batch_id = '${d3.batchId}'`) === "0");

  // ─────────────────── undo within 10 s
  const [u1] = await P.insertProposals(db, ws, [field("Undo me please")]);
  const du = await P.decide(db, audit, A, ws, [u1], { action: "accept" });
  e = await refused(() => P.undo(db, audit, B, ws, du.batchId));
  ok("C11.14 undo fail: another person cannot undo someone's decision (403)", e.status === 403, e);
  const un = await P.undo(db, audit, A, ws, du.batchId);
  ok("C11.14 undo pass: within 10 s the landed draft field and its waiting ADD are removed, the item waits again (1b)", un.undone === 1 && sql(`select count(*) from canonical_field where canonical_field_key = '${du.items[0].landedAs}'`) === "0" && sql(`select count(*) from library_change where batch_id = '${du.batchId}'`) === "0" && sql(`select status || '|' || coalesce(decided_by, '-') || '|' || coalesce(batch_id::text, '-') from proposal_item where id = '${u1}'`) === "waiting|-|-");
  e = await refused(() => P.undo(db, audit, A, ws, du.batchId));
  // C3.2 AT-9: the same Undo again is refused as already done (409, in words), not as unknown; an id no decision ever had
  // stays 404.
  ok("C11.14 undo fail: the same batch is not undone twice (409, \"Already undone\")", e.status === 409 && /Already undone/.test(e.message), e);
  e = await refused(() => P.undo(db, audit, A, ws, crypto.randomUUID()));
  ok("C11.14 undo fail: a batch id no decision ever had is unknown (404)", e.status === 404, e);
  const [u2] = await P.insertProposals(db, ws, [field("Too late to undo")]);
  const dl = await P.decide(db, audit, A, ws, [u2], { action: "accept" });
  sql(`update proposal_item set decided_at = now() - interval '20 seconds' where batch_id = '${dl.batchId}'`);
  e = await refused(() => P.undo(db, audit, A, ws, dl.batchId));
  ok("C11.14 undo fail: after 10 s Undo is refused (409) and the landed field stays", e.status === 409 && sql(`select count(*) from canonical_field where canonical_field_key = '${dl.items[0].landedAs}'`) === "1", e);

  // ─────────────────── the field-map review reads the new table (sources.ts job / decide)
  const jobId = crypto.randomUUID();
  sql(`insert into drafting_job (id, workspace_id, combination_id, kind, mode, status, started_by, finished_at, detail) values ('${jobId}', '${ws}', (select id from combination limit 1), 'field_map', 'REPLAY', 'COMPLETED', 'user-A', now(), '{}')`);
  const [fm] = await P.insertProposals(db, ws, [field("Field map item", { runId: jobId, step: "field_map", work: { proposedKey: "person.field_map_item", outcome: "NEW", matchedKey: null, candidates: [], persons: ["applicant"], boxes: [], evidence: { quotes: [] }, affected: {}, reason: "No library definition with this meaning." } })]);
  sql("insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), id, 'user-A', 'created', 'test', 'p149', 'test setup' from workspace where key='demo'");
  let r = await call("GET", `/jobs/${jobId}`);
  ok("C11.13 reader pass: the field-map review lists the job's proposals in its own words (proposed key, outcome, PENDING)", r.status === 200 && r.body.items.length === 1 && r.body.items[0].proposedKey === "person.field_map_item" && r.body.items[0].decision === "PENDING" && r.body.items[0].outcome === "NEW", r.body.items);
  r = await call("POST", `/jobs/${jobId}/items/${fm}`, { decision: "SOMETHING" });
  ok("C11.13 reader fail: an unknown decision is still refused (400), the item stays waiting", r.status === 400 && sql(`select status from proposal_item where id = '${fm}'`) === "waiting", r.body);
  r = await call("POST", `/jobs/${jobId}/items/${fm}`, { decision: "ACCEPTED" });
  ok("C11.13 reader pass: accepting on the review records the contract status (accepted) and the chosen key", r.status === 201 && sql(`select status || '|' || choice || '|' || decided_key from proposal_item where id = '${fm}'`) === "accepted|ACCEPTED|person.field_map_item", r.body);
  const queue = await call("GET", "/review-queue");
  ok("C11.13 reader pass: To review and the catalogue answer with the new table (no error)", queue.status === 200 && (await call("GET", "/catalogue")).status === 200, queue.status);

  // ─────────────────── 1b: the queue's routes (GET /review/proposals, decide, undo, grouped approval)
  const ED = "IMM 1111 (02-2026)", combo = sql("select id from combination limit 1");
  const inEd = (it: any) => ({ ...it, scope: { formEdition: ED, combinationId: null } });
  const reading = (label: string, words: string) => ({ reading: words, payload: { kind: "field", label, aliases: [], meaning: `What ${label} means on the form.`, valueType: "text", subject: "person", formBox: null }, from: "replay", runFile: "runs/test.json", costUsd: 0 });
  // P-299: a new shared field is never accepted with others, so the Ready items accepted together below are new answer
  // lists: they still land on the library with an ADD for a second person, so the batch, its Undo and its approval stay proven.
  const listQ = (label: string, codes: string[]) => { const p = { kind: "answer_list", label, values: codes.map((c) => ({ code: c, label: c.toUpperCase() })) }; return inEd(item(p, { identity: { key: P.identityKeyOf(p as any, ""), near: [], nearReason: null } })); };
  const [q1, q2, qc, qd, qr] = await P.insertProposals(db, ws, [
    listQ("Queue ready one", ["qq_one_a", "qq_one_b"]), listQ("Queue ready two", ["qq_two_a", "qq_two_b"]),
    inEd(field("Queue check one", { confidence: "check", reason: "A rule failed: the quote was not found in the file.", rules: [{ rule: "quote_found", passed: false, why: "Not in the file." }] })),
    inEd(field("Queue decide one", { confidence: "decide", agreement: "differ", reason: "The two readings differ on the name.", rounds: { draft: reading("Queue decide one", "Family name of the applicant"), check: reading("Queue decided by checker", "Surname as on the passport") } })),
    inEd(field("Queue rules one", { origin: "rules" })),
  ]);
  const [qReuse] = await P.insertProposals(db, ws, [field(libLabel, { scope: { formEdition: null, combinationId: combo }, reuse: { match: "reuse", existingKey: "person.family_name" } })]);
  r = await call("GET", "/review/proposals");
  const gEd = r.body.groups?.find((g: any) => g.id === `edition:${ED}`), gCombo = r.body.groups?.find((g: any) => g.id === `combination:${combo}`);
  ok("C11.13 queue pass: GET /review/proposals groups by form edition (3 ready, 1 check, 1 decide) and by combination (titled by its path)", r.status === 200 && gEd?.counts.ready === 3 && gEd.counts.check === 1 && gEd.counts.decide === 1 && gEd.kind === "edition" && / › /.test(gCombo?.title ?? ""), [gEd, gCombo?.title]);
  r = await call("GET", `/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`);
  const bands = r.body.group?.bands ?? {}, byId = (id: string) => [...(bands.ready ?? []), ...(bands.check ?? []), ...(bands.decide ?? [])].find((x: any) => x.id === id);
  ok("C11.13 queue pass: a group's items come in their three bands with both readings, the quote and the rules for the side panel", bands.ready?.length === 3 && bands.check?.length === 1 && bands.decide?.length === 1
    && byId(qd)?.readings.draft.text === "Family name of the applicant" && byId(qd)?.readings.check.text === "Surname as on the passport" && byId(q1)?.source.quote === "Your family name" && byId(qc)?.rules[0].passed === false, byId(qd));
  ok("C11.14 queue pass: a Ready AI item can be accepted with others; a Ready rules item that adds to the library cannot, and says why", byId(q1)?.bulk_why === null && /rules item/.test(byId(qr)?.bulk_why ?? ""), byId(qr)?.bulk_why);
  r = await call("GET", "/review/proposals?group=edition%3Anothing");
  ok("C11.13 queue fail: a group with nothing waiting answers 404 in words", r.status === 404 && /Nothing waits/.test(JSON.stringify(r.body)), r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [q1, qc], action: "accept" });
  ok("C11.14 bulk fail: a Check item in a bulk accept is refused (409) and nothing is accepted", r.status === 409 && /Only Ready items/.test(r.body.message) && sql(`select string_agg(status, ',') from proposal_item where id in ('${q1}', '${qc}')`) === "waiting,waiting", r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [q1, qd], action: "accept" });
  ok("C11.14 bulk fail: a Decide item in a bulk accept is refused (409)", r.status === 409 && /readings differ/.test(r.body.message), r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [q1, qr], action: "accept" });
  ok("C11.14 bulk fail: a rules item landing on the library is never bulk-accepted (409)", r.status === 409 && /rules item/.test(r.body.message) && sql(`select status from proposal_item where id = '${qr}'`) === "waiting", r.body);
  r = await call("POST", "/review/proposals/decide", { ids: Array.from({ length: 201 }, () => crypto.randomUUID()), action: "accept" });
  ok("C11.14 bulk fail: more than 200 in one batch is refused (400)", r.status === 400 && /200/.test(JSON.stringify(r.body)), r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [q1, q2], action: "accept" }, "user-C");
  const bulk = r.body;
  ok("C11.14 bulk pass: two Ready items are accepted together as one batch; each lands with an ADD waiting for a second person", r.status === 201 && bulk.items?.length === 2 && sql(`select count(*) from library_change where batch_id = '${bulk.batchId}' and status = 'WAITING'`) === "2", bulk);
  r = await call("POST", `/review/proposals/undo/${bulk.batchId}`, undefined, "user-B");
  ok("C11.14 undo fail (route): another person cannot undo the batch (403)", r.status === 403, r.body);
  r = await call("POST", `/review/proposals/undo/${bulk.batchId}`, undefined, "user-C");
  ok("C11.14 undo pass (route): the person who decided undoes the whole batch with one Undo; both wait again", r.status === 201 && r.body.undone === 2 && sql(`select count(*) from library_change where batch_id = '${bulk.batchId}'`) === "0", r.body);
  // QA-159 (G-CORE B1): two unrelated names, so neither is a near duplicate of "Queue ready one" / "Queue ready two" in
  // the library (one name holding every word of another is now never Ready).
  const [q1b, q2b] = await P.insertProposals(db, ws, [listQ("Second batch item alpha", ["qq_alpha_a", "qq_alpha_b"]), listQ("Second batch item beta", ["qq_beta_a", "qq_beta_b"])]);
  // P-299 fail: two Ready new shared fields of an edition draft are never accepted together (409); each alone is fine.
  const ED2 = "IMM 2222 (02-2026)", inEd2 = (it: any) => ({ ...it, scope: { formEdition: ED2, combinationId: null } }); // its own group: the counts of ED's stay
  const [nf1, nf2] = await P.insertProposals(db, ws, [inEd2(field("Queue new field one")), inEd2(field("Queue new field two"))]);
  r = await call("POST", "/review/proposals/decide", { ids: [nf1, nf2], action: "accept" }, "user-C");
  ok("C11.14 bulk fail (P-299): two Ready new shared fields from an edition draft are refused together (409, says a new shared field is decided on its own); both stay waiting", r.status === 409 && /decided on its own/.test(r.body.message) && sql(`select string_agg(status, ',') from proposal_item where id in ('${nf1}', '${nf2}')`) === "waiting,waiting", r.body);
  r = await call("GET", `/review/proposals?group=${encodeURIComponent(`edition:${ED2}`)}`);
  const nfView = [...(r.body.group?.bands.ready ?? [])].find((x: any) => x.id === nf1);
  ok("C11.14 bulk fail (P-299): its box says why it cannot be ticked", /decided on its own/.test(nfView?.bulk_why ?? ""), nfView?.bulk_why);
  r = await call("POST", "/review/proposals/decide", { ids: [nf1], action: "accept" }, "user-C");
  ok("C11.14 pass (P-299): a Ready new shared field is accepted on its own and lands with its ADD for a second person", r.status === 201 && sql(`select count(*) from library_change where batch_id = '${r.body.batchId}' and status = 'WAITING'`) === "1", r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [q1b, q2b], action: "accept" }, "user-C");
  const batch = r.body.batchId;
  sql("insert into audit_event (id, workspace_id, actor, action, entity, entity_key, summary) select gen_random_uuid(), id, 'user-A', 'created', 'test', 'p149-1b', 'test setup' from workspace where key='demo'");
  let qB = await call("GET", "/review-queue?filter=all", undefined, "user-B"), qC = await call("GET", "/review-queue?filter=all", undefined, "user-C");
  const rowB = qB.body.items?.find((i: any) => i.id === `change-batch:${batch}`), rowC = qC.body.items?.find((i: any) => i.id === `change-batch:${batch}`);
  ok("C11.14 To review pass: one row per decision batch for the second person, linking to its batch page; the decider sees it waiting on others", rowB?.state === "needs" && rowB.next.href === `/review/batch/${batch}` && rowC?.state === "waiting" && !qB.body.items.some((i: any) => i.kind === "library_change" && i.id.startsWith("change:") && /Second batch item/.test(i.title)), [rowB, rowC]);
  const pRow = qB.body.items?.find((i: any) => i.id === `proposals:edition:${ED}`);
  ok("C11.13 To review pass: the queue's group is one Proposals row with its counts, linking to the queue", pRow?.kind === "proposals" && /5 proposals waiting: 3 ready to accept, 1 to check, 1 to decide/.test(pRow.what) && pRow.next.href === `/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`, pRow);
  r = await call("GET", "/review/changes");
  ok("C11.14 grouped approval fail: the changes list asks for group=batch (400)", r.status === 400, r.body);
  r = await call("GET", "/review/changes?group=batch", undefined, "user-C");
  const ownBatch = r.body.batches?.find((b: any) => b.id === batch);
  ok("C11.14 grouped approval pass: GET /review/changes?group=batch lists the batch; its decider cannot decide it and is told why", r.status === 200 && ownBatch?.count === 2 && ownBatch.can_decide === false && /different person/.test(ownBatch.why_not), ownBatch);
  r = await call("GET", `/review/changes/batch/${batch}`, undefined, "user-B");
  ok("C11.14 grouped approval pass: GET /review/changes/batch/:id shows a second person the two items and lets them decide", r.status === 200 && r.body.items?.length === 2 && r.body.can_decide === true, r.body);
  r = await call("GET", `/review/changes/batch/${crypto.randomUUID()}`, undefined, "user-B");
  ok("C11.14 grouped approval fail: an unknown batch answers 404 in words", r.status === 404, r.body);
  r = await call("POST", `/review/changes/batch/${batch}`, { decision: "approve" }, "user-C");
  ok("C11.14 grouped approval fail: the same person cannot approve their own batch (403), nothing changes", r.status === 403 && sql(`select count(*) from library_change where batch_id = '${batch}' and status = 'WAITING'`) === "2", r.body);
  r = await call("POST", `/review/changes/batch/${batch}`, { decision: "return" }, "user-B");
  ok("C11.14 grouped approval fail: a return without a reason is refused (400)", r.status === 400, r.body);
  r = await call("POST", `/review/changes/batch/${batch}`, { decision: "approve", note: "Both read right" }, "user-B");
  ok("C11.14 grouped approval pass: a second person approves the batch, each row through decideChange (both APPROVED)", r.status === 201 && r.body.decided?.length === 2 && !r.body.refused.length && sql(`select string_agg(status, ',') from library_change where batch_id = '${batch}'`) === "APPROVED,APPROVED", r.body);
  r = await call("POST", `/review/changes/batch/${batch}`, { decision: "approve" }, "user-B");
  ok("C11.14 grouped approval fail: a batch already decided is not decided again (409)", r.status === 409, r.body);
  const checkerPayload = byId(qd).readings.check.payload;
  r = await call("POST", "/review/proposals/decide", { ids: [qd], action: "edit", payload: checkerPayload }, "user-B");
  ok("C11.14 side panel pass: accepting the checker's reading of a Decide item lands that reading (edited)", r.status === 201 && sql(`select status || '|' || (payload->>'label') from proposal_item where id = '${qd}'`) === "edited|Queue decided by checker", r.body);
  const undoEdit = await call("POST", `/review/proposals/undo/${r.body.batchId}`, undefined, "user-B");
  ok("C11.14 undo pass: undoing an edit puts the item back as it was proposed (its own reading, waiting)", undoEdit.status === 201 && sql(`select status || '|' || (payload->>'label') || '|' || (work ? 'beforeEdit')::text from proposal_item where id = '${qd}'`) === "waiting|Queue decide one|false", undoEdit.body);
  const fields0 = sql("select count(*) from canonical_field"), changes0 = sql("select count(*) from library_change");
  r = await call("POST", "/review/proposals/decide", { ids: [qReuse], action: "accept" }, "user-B");
  ok("C3.2 reuse pass: accepting a reuse adds nothing to the library; it records the item it reuses", r.status === 201 && r.body.items[0].landedAs === "person.family_name" && sql("select count(*) from canonical_field") === fields0 && sql("select count(*) from library_change") === changes0, r.body);
  const fmCombo = sql(`select combination_id from drafting_job where id = '${jobId}'`);
  const [fm2] = await P.insertProposals(db, ws, [field("Field map item two", { runId: jobId, step: "field_map", scope: { formEdition: "IMM 0000 (01-2026)", combinationId: fmCombo }, work: { proposedKey: "person.field_map_item_two", outcome: "NEW" } })]);
  // G-CORE B5 (P-288 (2)): a field-map item is listed with the link to its form-field page; a Ready one (both rounds
  // agree, rules pass) is chosen in bulk like any item, and accepting it here is its page's Accept (nothing in the library
  // before its draft is applied); it is rejected or edited on its page.
  r = await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 0000 (01-2026)")}`);
  const fmView = [...(r.body.group?.bands.ready ?? []), ...(r.body.group?.bands.check ?? []), ...(r.body.group?.bands.decide ?? [])].find((x: any) => x.id === fm2);
  // P-294 (tech lead on #661): this item makes a new shared field (outcome NEW), so it is never chosen in bulk; it is still
  // accepted on its own below. A Ready exact reuse match goes in bulk (check_gcore_b5_field_map_bulk.ts).
  ok("C11.13 queue pass (P-288 (2), P-294): a Ready field-map item is listed with the link to its form-field page; one that makes a new shared field is not chosen in bulk and says it is decided on its own", fmView?.decide_on === `/c/${fmCombo}/jobs/${jobId}` && /decided on its own/.test(fmView.bulk_why ?? ""), fmView);
  r = await call("POST", "/review/proposals/decide", { ids: [fm2], action: "reject", reason: "not this one" }, "user-B");
  ok("C11.13 queue fail: a field-map item is rejected on its form-field page, not here (409)", r.status === 409 && /form-field page/.test(r.body.message), r.body);
  const fields1 = sql("select count(*) from canonical_field"), changes1 = sql("select count(*) from library_change");
  r = await call("POST", "/review/proposals/decide", { ids: [fm2], action: "accept" }, "user-B");
  ok("C11.13 queue pass (P-288 (2)): accepting a field-map item here is its page's Accept: the choice is recorded, nothing added to the library before the draft is applied", r.status === 201 && sql(`select status || '|' || choice from proposal_item where id = '${fm2}'`) === "accepted|ACCEPTED" && sql("select count(*) from canonical_field") === fields1 && sql("select count(*) from library_change") === changes1, r.body);
  // Owed from 1a: an approved answer list ADD publishes with the release.
  const listChange = sql(`select id from library_change where kind = 'answer_list' and batch_id = '${d1.batchId}'`);
  r = await call("POST", `/library/changes/${listChange}/approve`, {}, "user-B");
  const { publishLibraryChanges } = await import("../api/src/library-changes.ts");
  await db.$transaction((tx) => publishLibraryChanges(tx, ws, 9999, { ids: [listChange] }));
  const listKey = d1.items.find((x) => x.id === listId)!.landedAs;
  ok("C3.2 answer list pass (owed from 1a): an approved new answer list is published by the release", r.status === 201 && sql(`select status from answer_list where answer_list_key = '${listKey}'`) === "PUBLISHED" && sql(`select status from library_change where id = '${listChange}'`) === "RELEASED", [r.status, listKey]);

  // ─────────────────── Lead review of PR #96: undo after an edit, batch all or nothing, reuse of a missing item, proofs
  const { revise, strip } = await import("../api/src/core.ts");
  const [ue] = await P.insertProposals(db, ws, [field("Edited after accept")]);
  const due = await P.decide(db, audit, A, ws, [ue], { action: "accept" });
  const ueKey = due.items[0].landedAs!;
  await revise(db.canonicalField, await db.canonicalField.findMany({ where: { workspaceId: ws, canonicalFieldKey: ueKey } }), { meaning: "Meaning corrected by the author after the accept." }, A.id, strip);
  e = await refused(() => P.undo(db, audit, A, ws, due.batchId));
  ok("C11.14 undo fail (#96 1): Undo after the accepted draft was edited is refused (409, plain words); the edit and its ADD stay", e.status === 409 && /changed after it was accepted/.test(e.message)
    && sql(`select meaning from canonical_field where canonical_field_key = '${ueKey}'`) === "Meaning corrected by the author after the accept." && sql(`select count(*) from library_change where batch_id = '${due.batchId}' and status = 'WAITING'`) === "1" && sql(`select status from proposal_item where id = '${ue}'`) === "accepted", e);
  const [un1] = await P.insertProposals(db, ws, [field("Untouched after accept")]);
  const dun = await P.decide(db, audit, A, ws, [un1], { action: "accept" });
  const un2 = await P.undo(db, audit, A, ws, dun.batchId);
  ok("C11.14 undo pass (#96 1): an untouched accepted draft is still undone, and its stamp leaves the item's work", un2.undone === 1 && sql(`select status || '|' || coalesce(work ? 'landedStamp', false)::text from proposal_item where id = '${un1}'`) === "waiting|false");

  const [ba1, ba2] = await P.insertProposals(db, ws, [listQ("All or nothing one", ["qq_aon_one_a", "qq_aon_one_b"]), listQ("All or nothing two", ["qq_aon_two_a", "qq_aon_two_b"])]); // P-299: lists, not new fields
  r = await call("POST", "/review/proposals/decide", { ids: [ba1, ba2], action: "accept" }, "user-C");
  const aon = r.body.batchId;
  const [c1, c2] = sql(`select id from library_change where batch_id = '${aon}' order by key`).split("\n");
  sql(`update library_change set proposed_at = proposed_at + interval '1 second' where id = '${c2}'`);
  sql(`create or replace function p96_refuse() returns trigger language plpgsql as $$ begin raise exception 'refused for the test'; end $$; drop trigger if exists p96_refuse on library_change; create trigger p96_refuse before update on library_change for each row when (old.id = '${c2}') execute function p96_refuse()`);
  r = await call("POST", `/review/changes/batch/${aon}`, { decision: "approve", note: "Both read right" }, "user-B");
  sql("drop trigger if exists p96_refuse on library_change; drop function if exists p96_refuse()");
  ok("C11.14 grouped approval fail (#96 2): one item refused rolls the whole batch back; nothing approved, the answer names the item", r.status === 409 && /Nothing was approved/.test(JSON.stringify(r.body)) && sql(`select string_agg(status, ',') from library_change where id in ('${c1}', '${c2}')`) === "WAITING,WAITING", [r.status, r.body]);
  r = await call("POST", `/review/changes/batch/${aon}`, { decision: "approve", note: "Both read right" }, "user-B");
  ok("C11.14 grouped approval pass (#96 2): with nothing refused, the same batch is approved whole", r.status === 201 && r.body.decided?.length === 2 && sql(`select string_agg(status, ',') from library_change where batch_id = '${aon}'`) === "APPROVED,APPROVED", r.body);

  const [ghost] = await P.insertProposals(db, ws, [field(libLabel, { scope: { formEdition: null, combinationId: combo }, reuse: { match: "reuse", existingKey: "person.no_such_field_p96" } })]);
  r = await call("POST", "/review/proposals/decide", { ids: [ghost], action: "accept" }, "user-B");
  ok("C3.2 reuse fail (#96 3): a reuse naming an item not in the library is refused (409) and stays waiting", r.status === 409 && /not in the library/.test(r.body.message) && sql(`select status from proposal_item where id = '${ghost}'`) === "waiting", r.body);
  const retiredKey = sql(`select canonical_field_key from canonical_field where workspace_id = '${ws}' and status = 'PUBLISHED' and merged_into_key is null limit 1`);
  const [gone] = await P.insertProposals(db, ws, [field("Reuse a retired one", { scope: { formEdition: null, combinationId: combo }, reuse: { match: "reuse", existingKey: retiredKey } })]);
  sql(`update canonical_field set status = 'RETIRED' where workspace_id = '${ws}' and canonical_field_key = '${retiredKey}'`);
  r = await call("POST", "/review/proposals/decide", { ids: [gone], action: "accept" }, "user-B");
  sql(`update canonical_field set status = 'PUBLISHED' where workspace_id = '${ws}' and canonical_field_key = '${retiredKey}'`);
  ok("C3.2 reuse fail (#96 3): a reuse of an item retired since it was proposed is refused (409)", r.status === 409 && /not in the library/.test(r.body.message), [retiredKey, r.body]);

  const doc = (name: string, proves: string) => { const p = { kind: "document_type", name, proves, category: "client", suppliesFacts: [], readerKind: "letter_or_record", identityDocument: false }; return item(p, { identity: { key: P.identityKeyOf(p as any, ""), near: [], nearReason: null } }); };
  const [d0] = await P.insertProposals(db, ws, [doc("Proof letter p96", "that the holder lives at the address")]);
  await P.decide(db, audit, A, ws, [d0], { action: "accept" });
  e = await refused(() => P.insertProposals(db, ws, [doc("PROOF letter p96", "That the holder lives at the address")]));
  ok("C3.2 identity fail (#96 4): the same document name proving the same thing is the same item (409)", e.status === 409 && /already in the library/.test(e.message), e);
  const [d1b] = await P.insertProposals(db, ws, [doc("Proof letter p96", "that the holder is employed")]);
  ok("C3.2 identity pass (#96 4): the same name proving something else is another item and is written", !!d1b);

  // ─────────────────── the free-add scan (P-149 one door)
  const ALLOW: { file: string; near: RegExp; why: string }[] = [
    { file: "forms.ts", near: /supersedesId: gone\.id, mergedIntoKey: to/, why: "the P-65 merge writes the merged field's retired version" },
    // C11.9: Undo of the author's own delete puts back the very rows the delete removed (same ids); the item already went through the door.
    { file: "library-items.ts", near: /\b(canonicalField|logicalSection|documentType)\.create\(\{ data: again\(r\) as Prisma\./, why: "C11.9 undoOwnItem restores the rows its own delete removed" },
  ];
  // Owed by other lanes (reported in the hand-back, never widened): a free add still in their files.
  const OWED: { file: string; near: RegExp; why: string }[] = [
    { file: "forms.ts", near: /answerListKey: b\.key, version: 1, status: "DRAFT", label: b\.label, origin: "HUMAN"/, why: "createAnswerList: unreachable since (2a) made POST /library/answer-lists 410; forms lane deletes it" },
    // C3.6 (#523's follow-up): a document type named while adding a requirement now goes through the door (studio.ts saveRequirement).
  ];
  const CREATE = /\b(canonicalField|logicalSection|answerList|documentType)\.(create|createMany|upsert|createManyAndReturn)\s*\(/g;
  const scan = (files: [string, string][]) => files.flatMap(([f, text]) => text.split("\n").flatMap((line, i) => [...line.matchAll(CREATE)].map(() => ({ file: f, line: i + 1, text: line }))))
    .filter((h) => h.file !== "proposals.ts" && ![...ALLOW, ...OWED].some((a) => a.file === h.file && a.near.test(h.text)));
  const src = join(STUDIO, "api", "src");
  const files = readdirSync(src).filter((f) => f.endsWith(".ts")).map((f) => [f, readFileSync(join(src, f), "utf8")] as [string, string]);
  const hits = scan(files);
  ok("C3.6 P-149 scan pass: no library item is created outside the one door (allowlist: the P-65 merge, the C11.9 own-delete Undo)", hits.length === 0, hits.map((h) => `${h.file}:${h.line}`));
  ok("C3.6 P-149 scan pass: the door itself lands fields, sections, answer lists and document types", ["canonicalField", "logicalSection", "answerList", "documentType"].every((m) => new RegExp(`${m}\\.create\\(`).test(files.find(([f]) => f === "proposals.ts")![1])));
  ok("C3.6 P-149 scan fail: a planted free add in another file is caught", scan([["planted.ts", "await this.db.logicalSection.create({ data: {} });"]]).length === 1);
  const owed = OWED.filter((o) => files.some(([f, t]) => f === o.file && t.split("\n").some((l) => o.near.test(l))));
  console.log(`NOTE  owed by other lanes (${owed.length}): ${owed.map((o) => `${o.file}: ${o.why}`).join(" · ")}`);

  await db.$disconnect();
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
