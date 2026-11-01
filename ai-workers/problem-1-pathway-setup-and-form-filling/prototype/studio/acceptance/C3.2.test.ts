// C3.2 — The reviewer accepts, edits or rejects each field-mapping proposal; bulk accept only for clean reuse; Undo.
// Status (qa/CAPABILITIES.md, 1 Nov): Not tested. AT-14 checks P-149's "an edit is a new version" at the library (after
// apply a change is made there, AT-12). Missing (found writing this): the form-field page's bulk accept also
// takes new definitions (accept-clean with outcome NEW), and a bulk accept there has no one Undo (no batch id, no route).
// Decisions: P-121 (bulk for High only, one Undo for the batch, each item re-checked), P-149 (one door; an edit is a
// new version), BR-7 (a new field next to a near library field needs a reason), P-63 (form field / shared field words).
// US$0: the saved real IMM 5257 answer (21 Oct) is replayed; no model, no live switch, ledger checked unchanged.
// Screen parts (the form-field page's buttons) are the API contract they call: POST /jobs/:id/items/:item,
// POST /jobs/:id/accept-clean, POST /jobs/:id/apply; Undo of a bulk accept is expected at
// POST /review/proposals/undo/:batchId (the queue's one Undo), with the batch id returned by accept-clean.
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c2 4570 start && ./node_modules/.bin/tsx acceptance/C3.2.test.ts 4570 xr_studio_acc_c2 ; zsh tools/isolated.sh acc_c2 4570 stop
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 19 pass, 3 fail — failing: AT-7
// (accept-clean with outcome NEW accepts 22 new definitions together; C3.2 allows bulk only for clean reuse) and AT-9
// twice (accept-clean returns no batch id, so there is no one Undo for a bulk accept) because the form-field page
// predates P-121's batch Undo. AT-14 (P-149: an edit of a shared field is a new version) passes.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";
const PORT = Number(process.argv[2] ?? 4570), DB = process.argv[3] ?? "xr_studio_acc_c2";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again once when a kept-alive connection was closed before any reply (as tests/check_forms_slice2.ts). */
const send = async (url: string, init: RequestInit): Promise<Response> => { try { return await fetch(url, init); } catch (e) { if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(String((e as { cause?: { code?: string } }).cause?.code ?? ""))) throw e; return fetch(url, init); } };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const ledger = async () => { const l = (await call("GET", "/ledger")).body; return JSON.stringify([l?.committed_usd, l?.wave?.spent_usd]); };
const setupMissing = stop;

(async () => {
  await checkCopy(PORT, DB);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (loaded.status >= 300 || !vv || !att) setupMissing("the sample (Visitor visa with IMM 5257) did not load");
  const ledger0 = await ledger();
  const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId: string = d.body?.id;
  if (!jobId || !(await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED"))) setupMissing("the saved IMM 5257 answer did not replay");
  const items = async () => (await call("GET", `/jobs/${jobId}`)).body.items as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const one = async (id: string) => (await items()).find((i) => i.id === id);
  const decide = (id: string, b: unknown, actor: string | null = "user-C") => call("POST", `/jobs/${jobId}/items/${id}`, b, actor);
  let all = await items();
  const amb = all.filter((i) => i.outcome === "AMBIGUOUS");
  const reuseA = all.find((i) => i.outcome === "REUSE")!, reuseB = all.filter((i) => i.outcome === "REUSE")[1];
  // A proposal whose accept makes a new shared field (the AI recommends creating it) while a library field scores 0.55 or more.
  const near = all.find((i) => i.outcome !== "REUSE" && i.evidence?.recommendation?.action === "create_new" && !i.matchedKey && (i.candidates ?? []).some((c: { score: number }) => c.score >= 0.55) && !amb.slice(0, 3).some((a) => a.id === i.id));

  // ── AT-1 accept one proposal
  let r = await decide(reuseA.id, { decision: "ACCEPTED" }, "user-P");
  const r0 = await decide(reuseA.id, { decision: "ACCEPTED" }, null);
  ok("C3.2 AT-1 refusal: a client (403) or no person (401) cannot decide a proposal; it stays undecided", r.status === 403 && r0.status === 401 && (await one(reuseA.id)).decision === "PENDING", [r.status, r0.status]);
  r = await decide(reuseA.id, { decision: "ACCEPTED" });
  ok("C3.2 AT-1 a reviewer accepts a reuse proposal: it uses the library field it matched, and says who decided", r.status < 300 && r.body.decision === "ACCEPTED" && r.body.decidedKey === reuseA.matchedKey && r.body.decidedBy === "user-C", r.body);

  // ── AT-2 edit: choose another shared field, or change meaning and kind of value
  r = await decide(amb[0].id, { decision: "CHANGED", key: "Person.Family-Name" });
  ok("C3.2 AT-2 refusal: changing to a key that breaks the naming rule is a plain 400 and the proposal stays undecided", r.status === 400 && /lower case/.test(words(r)) && (await one(amb[0].id)).decision === "PENDING", r.body);
  r = await decide(amb[0].id, { decision: "CHANGED", key: "person.family_name" });
  ok("C3.2 AT-2 a reviewer changes a proposal to an existing shared field (family name); the decision records that field", r.status < 300 && r.body.decision === "CHANGED" && r.body.decidedKey === "person.family_name", r.body);
  r = await decide(amb[1].id, { decision: "ACCEPTED", note: "Different meaning from the candidates", valueType: "colour" });
  ok("C3.2 AT-3 refusal: an edit with a kind of value outside the list is a plain 400 naming the list; nothing is stored", r.status === 400 && /Choose a kind of value from the list/.test(words(r)) && (await one(amb[1].id)).decision === "PENDING", r.body);
  r = await decide(amb[1].id, { decision: "ACCEPTED", note: "Different meaning from the candidates", meaning: "Edited meaning written by the reviewer for this check", valueType: "text" });
  ok("C3.2 AT-3 a reviewer edits the meaning and kind of value while accepting; the edit is kept on the proposal", r.status < 300 && /Edited meaning/.test(JSON.stringify(r.body)) && r.body.proposedType === "text", { meaning: r.body?.proposedMeaning, type: r.body?.proposedType });

  // ── AT-4 reject
  r = await decide(amb[2].id, { decision: "RETURNED" });
  ok("C3.2 AT-4 refusal: rejecting without a reason is a plain 400 (the form fields must show why); nothing is stored", r.status === 400 && /Say why/.test(words(r)) && (await one(amb[2].id)).decision === "PENDING", r.body);
  r = await decide(amb[2].id, { decision: "RETURNED", note: "Not a fact this form asks; acceptance check" });
  ok("C3.2 AT-4 a reviewer rejects a proposal with a reason; it keeps the reason", r.status < 300 && r.body.decision === "RETURNED" && !r.body.decidedKey && /acceptance check/.test(JSON.stringify(r.body)), r.body);

  // ── AT-5 a new field next to a near library field needs a reason (BR-7)
  if (near) {
    r = await decide(near.id, { decision: "ACCEPTED" });
    const r2 = await decide(near.id, { decision: "ACCEPTED", note: "A different meaning: checked on the form" });
    ok("C3.2 AT-5 accepting a new shared field while the library has a near one needs a reason (plain 400 without it, accepted with it)", r.status === 400 && /say why/.test(words(r)) && r2.status < 300 && r2.body.decision === "ACCEPTED", [words(r), r2.status]);
  } else ok("C3.2 AT-5 accepting a new shared field while the library has a near one needs a reason", false, "the replay has no proposal with a near library field (setup)");

  // ── AT-6 Undo one decision
  r = await decide(reuseA.id, { decision: "PENDING" });
  ok("C3.2 AT-6 Undo puts one decided proposal back to undecided, with no field chosen", r.status < 300 && r.body.decision === "PENDING" && !r.body.decidedKey, r.body);

  // ── AT-7 bulk accept: only clean reuse
  all = await items();
  const waitingNew = all.filter((i) => i.outcome === "NEW" && i.decision === "PENDING").length;
  r = await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, "user-C");
  const newAfter = (await items()).filter((i) => i.outcome === "NEW" && i.decision === "PENDING").length;
  ok("C3.2 AT-7 refusal: bulk accept of new definitions is refused (bulk accept is only for clean reuse); every new proposal stays undecided", r.status >= 400 && newAfter === waitingNew, { status: r.status, body: r.body, waitingNew, newAfter });
  r = await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-P");
  ok("C3.2 AT-8 refusal: a client cannot bulk accept (403)", r.status === 403, r.status);
  const before = await items();
  r = await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-C");
  const after = await items();
  const changed = after.filter((i) => before.find((b) => b.id === i.id)?.decision !== i.decision);
  ok("C3.2 AT-8 bulk accept takes every undecided exact reuse match and nothing else (no new, ambiguous or conflicting proposal)", r.status < 300 && changed.length === before.filter((i) => i.outcome === "REUSE" && i.decision === "PENDING").length && changed.length > 0 && changed.every((i) => i.outcome === "REUSE" && i.decision === "ACCEPTED" && i.decidedKey === i.matchedKey), { accepted: r.body?.accepted, changed: changed.length });
  const batchId = r.body?.batchId ?? r.body?.batch_id;
  const undo = batchId ? await call("POST", `/review/proposals/undo/${batchId}`, undefined, "user-C") : { status: 0, body: "accept-clean returned no batch id" };
  const undone = (await items()).filter((i) => changed.some((c) => c.id === i.id) && i.decision === "PENDING").length;
  ok("C3.2 AT-9 one Undo for the bulk accept: the batch id it returns undoes every proposal it accepted, together", !!batchId && undo.status < 300 && undone === changed.length, { batchId, undo: undo.status, body: undo.body, undone, of: changed.length });
  if (batchId) {
    const again = await call("POST", `/review/proposals/undo/${batchId}`, undefined, "user-C");
    ok("C3.2 AT-9 refusal: the same Undo twice is refused (409) and changes nothing", again.status === 409, again.status);
  } else ok("C3.2 AT-9 refusal: the same Undo twice is refused (409) and changes nothing", false, "no batch Undo to try (see AT-9)");

  // ── AT-10 wrong item, stale after apply
  const otherJob = sql(`select id from drafting_job where id <> '${jobId}' limit 1`);
  r = await call("POST", `/jobs/${otherJob}/items/${reuseB.id}`, { decision: "ACCEPTED" }, "user-C");
  ok("C3.2 AT-10 refusal: a decision sent for a proposal under another draft is 404 in words; nothing changes", r.status === 404 && /another draft/.test(words(r)), r.body);
  await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-C");
  for (const i of (await items()).filter((x) => x.decision === "PENDING")) await decide(i.id, { decision: "ACCEPTED", note: "A different meaning from the candidates (acceptance check)" });
  r = await call("POST", `/jobs/${jobId}/apply`, {}, "user-C");
  ok("C3.2 AT-11 refusal: a reviewer without the author duty cannot apply the decided draft (403)", r.status === 403, r.body);
  r = await call("POST", `/jobs/${jobId}/apply`, {});
  ok("C3.2 AT-11 the author applies the fully decided draft", r.status < 300 && r.body.boxes > 0, r.body);
  const decidedBefore = sql(`select string_agg(coalesce(choice,'-'), ',' order by id) from proposal_item where run_id='${jobId}'`);
  r = await decide(reuseB.id, { decision: "PENDING" });
  ok("C3.2 AT-12 stale: after apply, Undo or a new decision is refused (409, says to change it in the library); no decision changes", r.status === 409 && /already applied/.test(words(r)) && sql(`select string_agg(coalesce(choice,'-'), ',' order by id) from proposal_item where run_id='${jobId}'`) === decidedBefore, r.body);
  // ── AT-14 (P-149 (3)): after apply, a change goes to the library, where an approved item is versioned, never edited in place
  const FK = "person.family_name";
  const versions = () => sql(`select string_agg(version || ':' || status || ':' || md5(coalesce(meaning,'')), ',' order by version) from canonical_field where canonical_field_key='${FK}'`);
  const v0 = versions(), top0 = Number(sql(`select max(version) from canonical_field where canonical_field_key='${FK}'`));
  if (!top0) setupMissing(`the library has no ${FK}`);
  r = await call("PATCH", `/library/fields/${FK}`, { meaning: "Acceptance check: an edited meaning of the family name (Sample)." }, "user-C");
  ok("C3.2 AT-14 refusal: a reviewer without the author duty cannot edit a shared field (403); no version is added", r.status === 403 && versions() === v0, { status: r.status, m: words(r).slice(0, 120) });
  r = await call("PATCH", `/library/fields/${FK}`, { meaning: "Acceptance check: an edited meaning of the family name (Sample)." });
  const v1 = versions();
  ok("C3.2 AT-14 [P-149] an edit of a shared field the applied map uses is a new version: every earlier version is kept exactly as it was, and the new one is a draft above them",
    r.status < 300 && v1.startsWith(v0) && Number(sql(`select max(version) from canonical_field where canonical_field_key='${FK}'`)) === top0 + 1 && sql(`select status from canonical_field where canonical_field_key='${FK}' and version=${top0 + 1}`) !== "APPROVED", { status: r.status, before: v0, after: v1 });
  ok("C3.2 AT-13 the whole check spent nothing (ledger unchanged)", (await ledger()) === ledger0, { ledger0, now: await ledger() });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.2 the check itself stopped:", e); process.exit(1); });
