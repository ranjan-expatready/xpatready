// C11.13 (P-120, P-138, P-149 (2), P-158): the Day-0 acceptance checks (pack 2) moved into the suites now they pass (P-220):
// a name drafted "new" for two form editions is one "new" item, the other a reuse of it; the one door refuses an exact
// duplicate naming where the existing item is used; a near duplicate needs its reason, always reads Check, and the reason
// travels to the second person's batch and to the Release page. One change from acceptance/C11.13.test.ts: the second
// person approves the batch before the Release page is read (it lists approved library changes only; PR note).
// On an isolated copy with the six loaded (Demo load). No browser, no model call (US$0).
//   zsh studio/tools/isolated.sh forms_c1113 4457 start && tsx studio/tests/check_forms_c1113_acceptance.ts 4457 xr_studio_forms_c1113
import { randomUUID } from "node:crypto";
import { AUTHOR, APPROVER, pack2, run } from "../acceptance/lib/pack2.ts";

const T = pack2("C11.13");
const { call, sql, ok, words } = T;
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${T.DB}`;

run(async () => {
  await T.ready();
  const { Db } = await import("../api/src/core.ts");
  const P = await import("../api/src/proposals.ts");
  const db = new Db();
  const ws = (await db.workspace.findUniqueOrThrow({ where: { key: "demo" } })).id;
  const vv = T.combo("vv.single");
  const before = T.spent();
  const runId = randomUUID();
  await db.draftingJob.create({ data: { id: runId, workspaceId: ws, combinationId: vv, kind: "masters_edition", mode: "REPLAY", status: "COMPLETED", startedBy: AUTHOR, finishedAt: new Date() } });
  const payload = (label: string) => ({ kind: "field" as const, label, aliases: [], meaning: `${label} of the person, as on the form (Sample).`, valueType: "text", subject: "person", formBox: null });
  const reading = (label: string) => ({ reading: label, payload: payload(label), from: "replay" as const, runFile: "runs/acceptance.json", costUsd: 0 });
  const item = (label: string, over: Record<string, unknown> = {}) => ({ kind: "field" as const, runId, step: "masters_edition", scope: { formEdition: "IMM 5257 (09-2023)", combinationId: null }, landsOn: "library" as const,
    reuse: { match: "new" as const, existingKey: null }, payload: payload(label), source: { file: "imm5257e.pdf", sha256: "0dc03b24e7914a178ad29e2cfae811045835a1d36d7a3c35f040251d0aca562e", edition: "09-2023", page: 1, quote: label, quoteFound: true, rule: null },
    rounds: { draft: reading(label), check: reading(label) }, rules: [{ rule: "quote_found", passed: true, why: null }], agreement: "agreed" as const, confidence: "ready" as const, reason: null, origin: "ai" as const,
    identity: { key: P.identityKeyOf(payload(label), ""), near: [] as string[], nearReason: null as string | null }, relatesTo: null, revision: null, basis: "SAMPLE" as const, ...over });
  const tryInsert = async (it: any) => { try { return { ids: await P.insertProposals(db, ws, [it]), status: 201, why: "" }; } catch (e: any) { return { ids: [], status: e?.status ?? e?.getStatus?.() ?? 500, why: String(e?.response?.detail ?? e?.response?.message ?? e?.message ?? e) }; } };

  // ---------------------------------------------------------------- 1. the producer: one "new" per name across editions
  const fields = sql("select form_edition||'\t'||identity_key||'\t'||(reuse->>'match') from proposal_item where kind='field' and status='waiting'").split("\n").filter(Boolean).map((l) => l.split("\t"));
  const editionsOf = new Map<string, Set<string>>();
  for (const [ed, k, m] of fields) if (m === "new") editionsOf.set(k, new Set([...(editionsOf.get(k) ?? []), ed]));
  const twins = [...editionsOf].filter(([, eds]) => eds.size > 1);
  ok("setup: the Demo load's field drafts wait in the queue (several form editions)", new Set(fields.map((f) => f[0])).size >= 3, new Set(fields.map((f) => f[0])).size);
  ok("C11.13 fail (producer): a name drafted for two editions is one 'new' item; the other edition's is 'reuse' (P-120)", fields.length > 0 && twins.length === 0, { twins: twins.length, e_g: twins.slice(0, 3).map(([k, eds]) => `${k}: ${[...eds].map((e) => e.slice(0, 12)).join(" + ")}`) });

  // ---------------------------------------------------------------- 2. the one door: exact duplicate refused, saying where used
  // A live library field to collide with: one accepted through the queue (the six's library starts empty).
  let fam = sql("select label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null order by canonical_field_key limit 1");
  if (!fam) {
    const seed = await tryInsert(item("Family name"));
    const d = await call("POST", "/review/proposals/decide", { ids: seed.ids, action: "accept", reason: "Seeded as the library field this check collides with (Sample)." }, AUTHOR); // QA-192: a near seed needs a person's line
    fam = d.status < 300 ? sql("select label from canonical_field where status in ('DRAFT','PUBLISHED') and label is not null order by canonical_field_key limit 1") : "";
  }
  const famKey = sql(`select canonical_field_key from canonical_field where label='${fam.replace(/'/g, "''")}' limit 1`);
  ok("setup: the library has a live shared field", !!famKey, { fam, famKey });
  let w = await tryInsert(item(fam));
  ok("C11.13 fail: a 'new' item with the same name as a live library item is refused (409)", w.status === 409, w.why);
  ok("C11.13 fail: the refusal names the existing item and where it is used (P-120 'with where used')", w.why.includes(famKey) && /used (by|in|on)|combination|IMM \d{4}/i.test(w.why), w.why);
  w = await tryInsert(item(fam, { reuse: { match: "reuse", existingKey: famKey } }));
  ok("C11.13 pass: the same item as 'reuse' of the existing field is accepted into the queue", w.status === 201, w.why);

  // ---------------------------------------------------------------- near duplicate: needs a reason, shown at release
  w = await tryInsert(item("Family name at birth", { identity: { key: P.identityKeyOf(payload("Family name at birth"), ""), near: [famKey], nearReason: null } }));
  ok("C11.13 fail: a near duplicate with no reason is refused by the contract", w.status === 400 || /say why it is not the same/i.test(w.why), w.why);
  const REASON = "The family name given at birth, which may differ from the current family name.";
  w = await tryInsert(item("Family name at birth", { identity: { key: P.identityKeyOf(payload("Family name at birth"), ""), near: [famKey], nearReason: REASON } }));
  ok("C11.13 pass: with its one-line reason the near duplicate waits in the queue", w.status === 201, w.why);
  const q = (await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`)).body;
  const near = [...(q?.group?.bands?.ready ?? []), ...(q?.group?.bands?.check ?? []), ...(q?.group?.bands?.decide ?? [])].find((x: any) => x.title === "Family name at birth");
  ok("C11.13 pass: the queue shows the near match and its reason, and the one door puts a near item in Check whatever band the producer gave (BAND_TIPS: close to a library item)", !!near && near.near?.includes(famKey) && near.near_reason === REASON && near.band !== "ready", near && { band: near.band, near: near.near, reason: near.near_reason });
  // QA-192 (P-120): the producer's reason is not a person's, so the decider gives the one line.
  let r = await call("POST", "/review/proposals/decide", { ids: [near?.id ?? w.ids[0]], action: "accept", reason: REASON }, AUTHOR);
  ok("setup: the author accepts it (a DRAFT field and a waiting library change)", r.status < 300, r.status >= 300 ? words(r) : undefined);
  const batches = (await call("GET", "/review/changes?group=batch", undefined, APPROVER)).body?.batches ?? [];
  ok("C11.13 fail→pass: the second person's batch shows the near reason beside the new item", JSON.stringify(batches).includes(REASON), batches.length);
  // Builder's note (PR): the Release page lists APPROVED library changes only (programs.ts draft), so the near reason is
  // read there after the second person approves the batch; the Day-0 test read it before approval.
  const nb = batches.find((x: unknown) => JSON.stringify(x).includes(REASON));
  const ap = await call("POST", `/review/changes/batch/${nb?.id ?? nb?.batch_id}`, { decision: "approve" }, APPROVER);
  ok("setup: the second person approves the batch", ap.status < 300, ap.status >= 300 ? words(ap) : undefined);
  const draft = (await call("GET", "/draft", undefined, APPROVER)).body;
  ok("C11.13 fail→pass: the Release page's library list shows the near reason (P-120: shown at release)", JSON.stringify(draft?.library ?? []).includes(REASON), (draft?.library ?? []).length);

  // ---------------------------------------------------------------- approval checks identity again
  w = await tryInsert(item("Passport colour"));
  const twin = w.ids[0];
  // Copies a live field's row shape (status DRAFT) so only the key and the name differ.
  const made = (() => { try { sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) select gen_random_uuid(), workspace_id, 'person.passport_colour', 1, 'DRAFT', 'Colour of the passport cover (Sample).', value_type, data_type, scope, subject_kind, origin, '${AUTHOR}', 'Passport colour' from canonical_field where canonical_field_key='${famKey}' limit 1`); return "made"; } catch (e: any) { return String(e?.message ?? e).slice(0, 200); } })();
  ok("setup: a twin 'Passport colour' enters the library after the proposal was written", !!twin && made === "made", { twin, made });
  r = await call("POST", "/review/proposals/decide", { ids: [twin ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C11.13 pass: a twin added after the proposal is caught at acceptance (409 naming it)", r.status === 409 && /person\.passport_colour/.test(words(r)), words(r));
  // ---------------------------------------------------------------- review c1113: twins decided on the queue
  const ed2 = (label: string) => item(label, { scope: { formEdition: "IMM 5257 Schedule 1 (test)", combinationId: null }, runId: run2 });
  const run2 = randomUUID();
  await db.draftingJob.create({ data: { id: run2, workspaceId: ws, combinationId: vv, kind: "masters_edition", mode: "REPLAY", status: "COMPLETED", startedBy: AUTHOR, finishedAt: new Date() } });
  const a = (await tryInsert(item("Twin colour"))).ids[0], bb = (await tryInsert(ed2("Twin colour"))).ids[0];
  const tie = sql(`select (reuse->>'match')||'|'||coalesce(relates_to::text,'')||'|'||confidence from proposal_item where id='${bb}'`);
  ok("C11.13 pass: the second edition's copy waits as a reuse of the first, in Check, saying whichever is accepted first adds it", tie === `reuse|${a}|check` && /Whichever is accepted first adds it/.test(sql(`select reason from proposal_item where id='${bb}'`)), tie);
  r = await call("POST", "/review/proposals/decide", { ids: [a], action: "reject", reason: "Not this one (test)." }, AUTHOR);
  r = await call("POST", "/review/proposals/decide", { ids: [bb], action: "accept" }, AUTHOR);
  ok("C11.13 pass (review M2): with the first rejected, the twin is accepted and adds the item itself", r.status === 201 && !!r.body?.items?.[0]?.landedAs && sql(`select reuse->>'match' from proposal_item where id='${bb}'`) === "new", [r.status, words(r) || r.body?.items]);
  // QA-192 + Devin on #726: a twin of a near item whose first copy did not land adds the item itself, so it needs a
  // person's one-line reason like any near item (the gate runs after the twin's reuse choice is resolved).
  const nearOf = (label: string) => ({ identity: { key: P.identityKeyOf(payload(label), ""), near: ["Twin colour"], nearReason: "An AI sentence: it is not the same." } });
  const nTwinA = (await tryInsert(item("Twin colour tone", nearOf("Twin colour tone")))).ids[0];
  const nTwinB = (await tryInsert(item("Twin colour tone", { ...nearOf("Twin colour tone"), scope: { formEdition: "IMM 5257 Schedule 1 (test)", combinationId: null }, runId: run2 }))).ids[0];
  await call("POST", "/review/proposals/decide", { ids: [nTwinA], action: "reject", reason: "Not this one (test)." }, AUTHOR);
  r = await call("POST", "/review/proposals/decide", { ids: [nTwinB], action: "accept" }, AUTHOR);
  ok("QA-192 fail (Devin on #726): a near twin whose first copy was rejected is not accepted without a person's reason (400); it stays waiting", !!nTwinA && !!nTwinB && r.status === 400 && /say in one line why it is not the same/.test(words(r)) && sql(`select status || '|' || (reuse->>'match') from proposal_item where id='${nTwinB}'`) === "waiting|reuse", [nTwinA, nTwinB, r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [nTwinB], action: "accept", reason: "A tone, not the colour itself (test)." }, AUTHOR);
  ok("QA-192 pass: with the person's reason the twin adds the item itself, and the reason is kept as a person's", r.status === 201 && sql(`select (reuse->>'match') || '|' || coalesce(identity->>'nearReasonBy', '-') from proposal_item where id='${nTwinB}'`) === "new|person", [r.status, words(r)]);
  // QA-192 review m4: Undo puts the twin back as proposed (the person's reason goes with it), and a re-accept needs it again.
  r = await call("POST", `/review/proposals/undo/${sql(`select batch_id from proposal_item where id='${nTwinB}'`)}`, undefined, AUTHOR);
  const afterUndo = sql(`select status || '|' || coalesce(identity->>'nearReasonBy', '-') from proposal_item where id='${nTwinB}'`);
  const reAccept = await call("POST", "/review/proposals/decide", { ids: [nTwinB], action: "accept" }, AUTHOR);
  ok("QA-192 pass (review m4): Undo puts the item back as proposed, without the person's reason; a re-accept without one is refused (400)", r.status < 300 && afterUndo === "waiting|-" && reAccept.status === 400, [r.status, afterUndo, reAccept.status]);
  // Review M1: a twin the door finds close to a library field by itself (no producer near), with its first copy rejected.
  const atEntry = `${fam} at entry`;
  const tA = (await tryInsert(item(atEntry))).ids[0], tB = (await tryInsert(ed2(atEntry))).ids[0];
  await call("POST", "/review/proposals/decide", { ids: [tA], action: "reject", reason: "Not this one (test)." }, AUTHOR);
  r = await call("POST", "/review/proposals/decide", { ids: [tB], action: "accept" }, AUTHOR);
  ok("QA-192 fail (review M1): a twin close to a library field (found by the rule, its first copy rejected) is not accepted without a person's reason (400, naming it)", !!tA && !!tB && r.status === 400 && words(r).includes(fam), [tA, tB, r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [tB], action: "accept", reason: "one name holds the other" }, AUTHOR);
  ok("QA-192 fail (review m2): the rule's own words are not a person's reason (400)", r.status === 400 && /your own words/.test(words(r)), [r.status, words(r)]);
  // Review M2: an edit that renames an item to a name close to a library field needs the reason too.
  const plainId = (await tryInsert(item("Zebra quokka wombat"))).ids[0];
  const edited = { ...payload(`${fam} at arrival`) };
  r = await call("POST", "/review/proposals/decide", { ids: [plainId], action: "edit", payload: edited }, AUTHOR);
  ok("QA-192 fail (review M2): an edit renaming an item to a name close to a library field is not accepted without a person's reason (400)", !!plainId && r.status === 400 && words(r).includes(fam), [plainId, r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [plainId], action: "edit", payload: edited, reason: "The family name used at arrival, not today's (test)." }, AUTHOR);
  ok("QA-192 pass (review M2): with the person's reason the edit lands, its near list and reason kept", r.status === 201 && sql(`select coalesce(identity->>'nearReasonBy', '-') || '|' || (identity->'near')::text from proposal_item where id='${plainId}'`).startsWith("person|") && sql(`select identity->'near' from proposal_item where id='${plainId}'`).includes(fam), [r.status, words(r)]);
  // Devin r2 on #726: an edit's new name is compared under the key it will land with, never the proposer's key, so a
  // proposer's key equal to the library field's cannot hide the match.
  const keyed = (await tryInsert(item("Quokka zebra wombat", { work: { proposedKey: famKey } }))).ids[0];
  r = await call("POST", "/review/proposals/decide", { ids: [keyed], action: "edit", payload: payload(`${fam} at departure`) }, AUTHOR);
  ok("QA-192 fail (Devin r2 on #726): an edit to a name close to a library field is refused without a reason (400) even when the proposer's key is that field's", !!keyed && r.status === 400 && words(r).includes(fam), [keyed, r.status, words(r)]);
  // Devin r2 on #726: an edit no longer close to anything drops the old near list (the approver is not told it is close);
  // Undo puts it back.
  const wasNear = (await tryInsert(item(`${fam} before marriage`, { identity: { key: P.identityKeyOf(payload(`${fam} before marriage`), ""), near: [famKey], nearReason: REASON } }))).ids[0];
  r = await call("POST", "/review/proposals/decide", { ids: [wasNear], action: "edit", payload: payload("Hull paint of the ferry") }, AUTHOR);
  const dropped = sql(`select (identity->'near')::text || '|' || coalesce(identity->>'nearReason', '-') from proposal_item where id='${wasNear}'`);
  ok("QA-192 pass (Devin r2 on #726): an edit to a name close to nothing lands without a reason and drops the old near list and reason", !!wasNear && r.status === 201 && dropped === "[]|-", [wasNear, r.status, dropped, words(r)]);
  const undoNear = await call("POST", `/review/proposals/undo/${r.body?.batchId}`, undefined, AUTHOR);
  ok("QA-192 pass (Devin r2 on #726): Undo puts the old near list and reason back", undoNear.status < 300 && sql(`select (identity->'near' ? '${famKey}')::text || '|' || coalesce(identity->>'nearReason', '-') from proposal_item where id='${wasNear}'`) === `true|${REASON}`, [undoNear.status, undoNear.body]);
  // Review M3 (round 2): a Ready item whose close match was proposed after it needs no reason (the later item carries the
  // pair); the queue says so and the server agrees; the later item needs one.
  const [mFirst, mLater] = await P.insertProposals(db, ws, [item("Mother maiden surname"), item("Maiden surname of mother")] as never);
  const grp = (await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`)).body?.group;
  const inQueue = (id: string) => [...(grp?.bands?.ready ?? []), ...(grp?.bands?.check ?? []), ...(grp?.bands?.decide ?? [])].find((x: { id: string }) => x.id === id);
  const firstView = inQueue(mFirst), laterView = inQueue(mLater);
  r = await call("POST", "/review/proposals/decide", { ids: [mFirst], action: "accept" }, AUTHOR);
  ok("QA-192 pass (review M3): the first of two close names (the later one carries the pair) shows no reason needed, and is accepted without one", firstView?.near_reason_needed === false && r.status === 201, [firstView?.near_reason_needed, r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [mLater], action: "accept" }, AUTHOR);
  ok("QA-192 fail (review M3): the later one shows a reason is needed, and is refused without one (400)", laterView?.near_reason_needed === true && r.status === 400, [laterView?.near_reason_needed, r.status, words(r)]);
  // Devin r3 on #726: a twin whose first copy was accepted (with its reason) now reuses it: the queue asks no reason, as
  // the server does not.
  const arr = `${fam} on arrival`;
  const rA = (await tryInsert(item(arr))).ids[0], rB = (await tryInsert(ed2(arr))).ids[0];
  const accA = await call("POST", "/review/proposals/decide", { ids: [rA], action: "accept", reason: "The family name used on arrival, not today's (test)." }, AUTHOR);
  const ed2Group = (await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 Schedule 1 (test)")}`)).body?.group;
  const rBView = [...(ed2Group?.bands?.ready ?? []), ...(ed2Group?.bands?.check ?? []), ...(ed2Group?.bands?.decide ?? [])].find((x: { id: string }) => x.id === rB);
  r = await call("POST", "/review/proposals/decide", { ids: [rB], action: "accept" }, AUTHOR);
  ok("QA-192 pass (Devin r3 on #726): a near twin whose first copy was accepted shows no reason needed, and is accepted without one as a reuse of that item", accA.status === 201 && rBView?.near_reason_needed === false && r.status === 201 && r.body?.items?.[0]?.landedAs === accA.body?.items?.[0]?.landedAs, [accA.status, rBView?.near_reason_needed, r.status, words(r)]);
  // Devin r3 (red) on #726: an edit lands its reading as a new item even for a twin whose first copy landed, so the
  // checker's reading close to another library field still needs a person's reason, on the queue and on the server.
  const dep = `${fam} on departure`, rd3 = (label: string) => ({ reading: `${label} (test)`, payload: payload(label), from: "replay", runFile: "runs/test.json", costUsd: 0 });
  const eA = (await tryInsert(item("Hull paint shade"))).ids[0];
  const eB = (await tryInsert(ed2("Hull paint shade"))).ids[0];
  await call("POST", "/review/proposals/decide", { ids: [eA], action: "accept" }, AUTHOR);
  sql(`update proposal_item set confidence = 'decide', agreement = 'differ', rounds = '${JSON.stringify({ draft: rd3("Hull paint shade"), check: rd3(dep) }).replace(/'/g, "''")}'::jsonb where id = '${eB}'`);
  const g3 = (await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 Schedule 1 (test)")}`)).body?.group;
  const eBView = [...(g3?.bands?.ready ?? []), ...(g3?.bands?.check ?? []), ...(g3?.bands?.decide ?? [])].find((x: { id: string }) => x.id === eB);
  r = await call("POST", "/review/proposals/decide", { ids: [eB], action: "edit", payload: payload(dep) }, AUTHOR);
  ok("QA-192 fail (Devin r3 on #726): editing a twin whose first copy landed to a name close to a library field is refused without a reason (400); the queue says the checker's reading needs one", !!eB && eBView?.near_reason_needed_check === true && r.status === 400 && words(r).includes(fam), [eBView?.near_reason_needed_check, r.status, words(r)]);
  // Devin r2 on #726: the checker's reading has its own "reason needed", the one decide() applies to that edit.
  const rd = (label: string) => ({ reading: `${label} (test)`, payload: payload(label), from: "replay", runFile: "runs/test.json", costUsd: 0 });
  const dv = (await tryInsert(item("Ferry hull colour", { confidence: "decide", agreement: "differ", reason: "The two readings differ (test).", rounds: { draft: rd("Ferry hull colour"), check: rd(`${fam} at sea`) } }))).ids[0];
  const dvView = [...(((await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`)).body?.group?.bands?.decide) ?? [])].find((x: { id: string }) => x.id === dv);
  r = await call("POST", "/review/proposals/decide", { ids: [dv], action: "edit", payload: payload(`${fam} at sea`) }, AUTHOR);
  ok("QA-192 pass (Devin r2 on #726): the queue says the checker's reading needs a reason when its name is close to a library field, and its own reading does not; the server agrees (400 without one)", !!dvView && dvView.near_reason_needed === false && dvView.near_reason_needed_check === true && r.status === 400 && words(r).includes(fam), [dvView && { own: dvView.near_reason_needed, check: dvView.near_reason_needed_check }, r.status, words(r)]);
  const c = (await tryInsert(item("Twin shade"))).ids[0], dd = (await tryInsert(ed2("Twin shade"))).ids[0];
  const rc = await call("POST", "/review/proposals/decide", { ids: [c], action: "accept" }, AUTHOR);
  r = await call("POST", "/review/proposals/decide", { ids: [dd], action: "accept" }, AUTHOR);
  const cKey = rc.body?.items?.[0]?.landedAs;
  ok("C11.13 pass: with the first accepted, the twin reuses its item (one library item), and the resolved key is written back", r.status === 201 && r.body?.items?.[0]?.landedAs === cKey && sql(`select reuse->>'existingKey' from proposal_item where id='${dd}'`) === cKey && sql(`select count(*) from canonical_field where label='Twin shade'`) === "1", [r.status, cKey, r.body?.items]);
  r = await call("POST", `/review/proposals/undo/${rc.body?.batchId}`, undefined, AUTHOR);
  ok("C11.13 fail (review M3): Undo of the first is refused while its twin reuses the item, in words (409)", r.status === 409 && /reused by an item/.test(words(r)) && sql(`select count(*) from canonical_field where label='Twin shade'`) === "1", [r.status, words(r)]);
  const dBatch = sql(`select batch_id from proposal_item where id='${dd}'`);
  r = await call("POST", `/review/proposals/undo/${dBatch}`, undefined, AUTHOR);
  const r2 = await call("POST", `/review/proposals/undo/${rc.body?.batchId}`, undefined, AUTHOR);
  ok("C11.13 pass: once the twin's decision is undone, the first can be undone too", r.status < 300 && r2.status < 300, [r.status, words(r), r2.status, words(r2)]);
  ok("C11.13 pass: no AI was called (US$0)", T.spent() === before);
  await db.$disconnect();
  T.done();
});
