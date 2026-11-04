// C11.14 — Every AI proposal has a draft round, an independent checker round and the rules check; High only when all
// agree; To review offers Select all / Deselect all within a filter, bulk accept for High only with one Undo, each item
// re-checked by the rule engine; Load sample replays proposals through the same path. P-296 (1) (3 Nov, tech lead on #661):
// an AI-proposed new shared field is never accepted in bulk on either door; bulk is only for High reuse matches (AT-4).
// Status (qa/CAPABILITIES.md, 1 Nov): Not built. What exists: the one queue (S6 slice 1b: Ready · Check · Decide, bulk
// accept for Ready only, one Undo within 10 s, identity checked again at approval). Missing: the field-map step — the
// only AI step that reaches the queue from the API today — runs one round with no checker and no rules ("one_round"), is
// marked Ready on the comparison alone, stays off the queue ("decided on its form-field page"), and Load sample puts no
// replayed proposals on it.
// Decisions: P-121 (two rounds plus rules; High only when all agree; bulk for High only; one Undo; no demo bypass),
// P-149 (one door, identity at proposal and approval), P-158 (every item from a source). IRCC rule: [IRCC-F07] a field's
// type and format come from the form (the rules check runs on both rounds).
// US$0: the saved real IMM 5257 answer is replayed (no model); queue items for the bulk rules are written through the
// server's own door (api/src/proposals.ts insertProposals, as tests/check_s6_p149.ts does), Sample values.
// Screen parts (Select all / Deselect all within a filter, the Accept selected button) are the API contract they need:
// GET /review/proposals?group=… returns every item of each band with bulk_why; POST /review/proposals/decide;
// POST /review/proposals/undo/:batch.
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c1114 4574 start && ./node_modules/.bin/tsx --tsconfig api/tsconfig.json acceptance/C11.14.test.ts 4574 xr_studio_acc_c1114 ; zsh tools/isolated.sh acc_c1114 4574 stop
// Sample combinations are found by their structure trail (acceptance/lib/pack1.ts), so the file runs on today's sample
// and on P-112's six; the demo guard refuses port 4400 and any database but an isolated copy's.
// AT-1 since QA-176 (G-CORE B3 part A, 2 Nov): the six load, and no AI proposal is Ready without both rounds agreeing.
// Expected before that (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 9 pass, 4 fail — failing: AT-1 (Load sample
// writes no proposals), AT-2 (the 84 IMM 5257 proposals have one round, agreement "one_round"), AT-3 (56 are Ready with
// no checker round and no rules), AT-4 (on To review they cannot be ticked: "It is decided on its form-field page.")
// because P-121's rounds are not built for field mapping. AT-5..AT-10 guard the queue's bulk rules that work.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).

import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";
import { seedField } from "../tests/seed_library.cjs";
const PORT = Number(process.argv[2] ?? 4574), DB = process.argv[3] ?? "xr_studio_acc_c1114";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
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
const statusOf = (ids: string[]) => sql(`select string_agg(status, ',' order by status) from proposal_item where id in (${ids.map((i) => `'${i}'`).join(",")})`);

(async () => {
  await checkCopy(PORT, DB);
  // QA-176: the six (Demo › Reset to the six: Reset, then Load sample "six", saved AI answers replayed, US$0).
  const loaded = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  await until(async () => sql("select count(*) from drafting_job where status in ('QUEUED','RUNNING')") === "0", 300_000);
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (loaded.status >= 300 || !att) setupMissing("the sample (Visitor visa with IMM 5257) did not load");
  const ledger0 = await ledger();

  // ── AT-1 Load sample (the six) replays proposals through the same door, and none is Ready without both AI rounds
  // agreeing (QA-176, P-121: a one-round item is never Ready and never ticked with others; the box says why).
  const onLoad = Number(sql("select count(*) from proposal_item where status = 'waiting'"));
  const readyOneRound = Number(sql("select count(*) from proposal_item where status = 'waiting' and origin = 'ai' and confidence = 'ready' and (agreement <> 'agreed' or rounds->'draft' is null or rounds->'draft' = 'null'::jsonb or rounds->'check' is null or rounds->'check' = 'null'::jsonb)"));
  const oneRoundSaid = Number(sql("select count(*) from proposal_item where status = 'waiting' and origin = 'ai' and agreement = 'one_round' and kind = 'field' and reason like 'Needs a checker round%'"));
  // Tech lead on #785 (4 Nov): with every form's checker round recorded no item needs to say "Needs a checker round", so that
  // count is reported, not required.
  ok("C11.14 AT-1 Load sample (the six) puts the saved proposals on To review through the same door, and no AI proposal is Ready without a checker round agreeing (QA-176, US$0)", onLoad > 0 && readyOneRound === 0, { onLoad, readyWithoutBothRounds: readyOneRound, saidNeedsChecker: oneRoundSaid });

  // ── the field-map step (replay of the saved IMM 5257 answer)
  const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId: string = d.body?.id;
  if (!jobId || !(await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED"))) setupMissing("the saved IMM 5257 answer did not replay");
  const rows = sql(`select agreement || '|' || confidence || '|' || (rounds->'draft' is not null and rounds->'draft' <> 'null'::jsonb)::text || '|' || (rounds->'check' is not null and rounds->'check' <> 'null'::jsonb)::text || '|' || jsonb_array_length(rules)::text from proposal_item where run_id='${jobId}'`).split("\n").map((l) => l.split("|"));
  const twoRounds = rows.filter((r) => r[2] === "true" && r[3] === "true").length;
  // Tech lead on #785 (4 Nov): the checker round runs once per form edition; a field it did not name keeps the draft reading
  // only and counts as a disagreement (differ → Decide, a person decides), never as agreed or Ready.
  const unnamed = rows.filter((r) => r[3] !== "true"), unnamedDecide = unnamed.filter((r) => r[0] === "differ" && r[1] === "decide").length;
  ok("C11.14 AT-2 every field-mapping proposal has a draft round, the form edition has an independent checker round, and a field the checker did not name is differ → Decide", rows.length > 0 && rows.every((r) => r[2] === "true") && twoRounds > 0 && unnamedDecide === unnamed.length, { items: rows.length, withBothRounds: twoRounds, checkerDidNotName: unnamed.length, ofThemDecide: unnamedDecide, agreement: [...new Set(rows.map((r) => r[0]))] });
  const ready = rows.filter((r) => r[1] === "ready");
  const readyOk = ready.filter((r) => r[0] === "agreed" && Number(r[4]) > 0).length;
  const rulePassed = Number(sql(`select count(*) from proposal_item where run_id='${jobId}' and confidence='ready' and jsonb_array_length(rules) > 0 and not exists (select 1 from jsonb_array_elements(rules) x where (x->>'passed')::boolean = false)`));
  ok("C11.14 AT-3 [IRCC-F07] a proposal is High (Ready) only when the rules check ran and passed and both rounds agree", ready.length > 0 && readyOk === ready.length && rulePassed === ready.length, { ready: ready.length, agreedWithRules: readyOk, rulesPassed: rulePassed });
  const q = (await call("GET", "/review/proposals")).body;
  const g = q?.groups?.find((x: { id: string; title: string }) => /IMM 5257/.test(`${x.id} ${x.title}`));
  const gv = g ? (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group : null;
  const readyBand = gv?.bands?.ready ?? [];
  // P-296 (1) (tech lead on #661): only High reuse matches are ticked together; a Ready field-map item that makes a new shared
  // field (or is an unclear match) says it is decided on its own.
  const newField = (id: string) => sql(`select (step = 'field_map' and coalesce(work->>'outcome', '') <> 'REUSE')::text from proposal_item where id = '${id}'`) === "true";
  const tickable = readyBand.filter((x: { id: string }) => !newField(x.id));
  // qa lane, 4 Nov (Lead 5's triage of AT-4): on Reset to the six the library starts empty, so the first edition's mappings
  // are all new shared fields and none can be a reuse match; the check no longer demands a tickable reuse (it did, and
  // failed on #785 with 49 Ready items, all new). P-318 (4) (#726): a Ready reuse match that needs a near reason is not
  // ticked in bulk either, and says so. Bulk acceptance of clean reuse is proven below, on items written through the door.
  const reuseWhyOk = (w: string | null) => w === null || /near|reason/i.test(w);
  ok("C11.14 AT-4 the field-mapping proposals are on To review in their bands; every Ready new shared field says it is decided on its own (P-296 (1)), and a Ready reuse match is tickable in bulk unless it needs a near reason (P-318 (4))", !!g && readyBand.length > 0 && readyBand.every((x: { id: string; bulk_why: string | null }) => (newField(x.id) ? /decided on its own/.test(x.bulk_why ?? "") : reuseWhyOk(x.bulk_why))), { group: g?.id ?? null, ready: readyBand.length, newFields: readyBand.length - tickable.length, reuse: tickable.length, why: readyBand[0]?.bulk_why });

  // ── the queue's bulk rules, on items written through the door
  const { Db } = await import("../api/src/core.ts");
  const P = await import("../api/src/proposals.ts");
  const db = new Db();
  const ws = sql("select id from workspace where key = 'demo'");
  const ED = "IMM 0000 (01-2026)", SHA = "a".repeat(64), tag = Date.now().toString(36);
  // QA-176 (P-121): a Ready item carries both AI readings (it used to be written with none, which the door now lowers).
  const both = (label: string) => { const r = { reading: `What ${label} means on the form`, payload: { kind: "field", label, aliases: [], meaning: `What ${label} means on the form (Sample).`, valueType: "text", subject: "person", formBox: null }, from: "replay", runFile: "runs/acceptance.json", costUsd: 0 }; return { draft: r, check: r }; };
  const field = (label: string, over: Record<string, unknown> = {}) => {
    const payload = { kind: "field", label, aliases: [], meaning: `What ${label} means on the form (Sample).`, valueType: "text", subject: "person", formBox: null };
    return { kind: "field", runId: jobId, step: "field_map_edition", scope: { formEdition: ED, combinationId: null }, landsOn: "library", reuse: { match: "new", existingKey: null }, payload,
      source: { file: "imm0000e.pdf", sha256: SHA, edition: "01-2026", page: 1, quote: label, quoteFound: true, rule: null }, rounds: both(label), rules: [{ rule: "quote found", passed: true, why: null }],
      agreement: "agreed", confidence: "ready", reason: null, origin: "ai", identity: { key: P.identityKeyOf(payload as never, ""), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE", ...over } as never;
  };
  const reading = (label: string, text: string) => ({ reading: text, payload: { kind: "field", label, aliases: [], meaning: `What ${label} means (Sample).`, valueType: "text", subject: "person", formBox: null }, from: "replay", runFile: "runs/acceptance.json", costUsd: 0 });
  // P-299 (tech lead on #699): a new shared field is never accepted with others, so the High items accepted together are
  // reuse matches of fields already in the library; the library-landing rules (an ADD waits for a second person; Undo
  // removes it) stay proven by single accepts and tests/check_s6_p149.ts.
  // The six load no library fields yet (field maps wait to be applied), so three are written as a source would write them
  // (tests/seed_library.cjs: draft rows, Sample; no free add exists).
  const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const libKeys = [1, 2, 3].map((n) => seedField(sql, { key: `person.acc_reuse_${slug}_${n}`, meaning: `A field this check reuses, number ${n} (Sample).`, review: false }) as string);
  const reuseOf = (key: string) => ({ reuse: { match: "reuse", existingKey: key } });
  const [r1, r2, r3, rc, rd] = await P.insertProposals(db, ws, [field(`Acc ready one ${tag}`, reuseOf(libKeys[0])), field(`Acc ready two ${tag}`, reuseOf(libKeys[1])), field(`Acc ready three ${tag}`, reuseOf(libKeys[2])),
    field(`Acc check one ${tag}`, { confidence: "check", reason: "A rule failed: the quote was not found in the file.", rules: [{ rule: "quote found", passed: false, why: "Not in the file." }] }),
    field(`Acc decide one ${tag}`, { confidence: "decide", agreement: "differ", reason: "The two readings differ.", rounds: { draft: reading(`Acc decide one ${tag}`, "Family name of the applicant"), check: reading(`Acc decided ${tag}`, "Surname as on the passport") } })]);
  // AT-10: a reuse of a field that is not (or no longer) in the library, Ready when proposed.
  const [gone] = await P.insertProposals(db, ws, [field(`Acc gone one ${tag}`, reuseOf(`person.acc_gone_${tag.toLowerCase().replace(/[^a-z0-9]/g, "")}`))]);
  // P-299: a High new shared field of an edition draft.
  const [newOne] = await P.insertProposals(db, ws, [field(`Acc new one ${tag}`)]);
  const view = (await call("GET", `/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`)).body?.group;
  const band = (b: string) => (view?.bands?.[b] ?? []) as { id: string; bulk_why: string | null; readings?: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const readyReuse = band("ready").filter((x) => [r1, r2, r3, gone].includes(x.id)), readyNew = band("ready").find((x) => x.id === newOne);
  ok("C11.14 AT-5 Select all within a filter: the group answers every item of each band (Ready, Check, Decide) with whether it may be ticked in bulk and why not (a Ready reuse match may; a Ready new shared field may not, P-299)", band("ready").length === 5 && band("check").length === 1 && band("decide").length === 1 && readyReuse.length === 4 && readyReuse.every((x) => x.bulk_why === null) && /decided on its own/.test(readyNew?.bulk_why ?? "") && !!band("check")[0]?.bulk_why && !!band("decide")[0]?.bulk_why, { ready: band("ready").length, check: band("check")[0]?.bulk_why, decide: band("decide")[0]?.bulk_why });
  ok("C11.14 AT-6 a disagreement between the rounds is Decide (Low) and shows both readings", band("decide")[0]?.readings?.draft?.text === "Family name of the applicant" && band("decide")[0]?.readings?.check?.text === "Surname as on the passport", band("decide")[0]?.readings);
  let r = await call("POST", "/review/proposals/decide", { ids: [r2, rc], action: "accept" }, "user-C");
  const r0 = await call("POST", "/review/proposals/decide", { ids: [r2, rd], action: "accept" }, "user-C");
  ok("C11.14 AT-7 refusal: a bulk accept with a Check or a Decide item is refused (409, says why) and nothing is accepted", r.status === 409 && /Only Ready items/.test(words(r)) && r0.status === 409 && statusOf([r2, rc, rd]) === "waiting,waiting,waiting", [words(r), r0.status]);
  r = await call("POST", "/review/proposals/decide", { ids: [r2, newOne], action: "accept" }, "user-C");
  ok("C11.14 AT-7 refusal (P-299): a bulk accept with a High new shared field of an edition draft is refused (409, says it is decided on its own) and nothing is accepted", r.status === 409 && /decided on its own/.test(words(r)) && statusOf([r2, newOne]) === "waiting,waiting", [r.status, words(r)]);
  r = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, "user-P");
  const rn = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, null);
  ok("C11.14 AT-7 refusal: a client (403) or nobody (401) cannot accept; nothing changes", r.status === 403 && rn.status === 401 && statusOf([r2, r3]) === "waiting,waiting", [r.status, rn.status]);
  r = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, "user-C");
  const batch = r.body?.batchId;
  const libRows = () => sql("select (select count(*) from canonical_field) || '|' || (select count(*) from library_change)");
  ok("C11.14 AT-8 two High reuse matches are accepted together as one batch; each records the library field it reuses and adds nothing to the library (P-120)", r.status === 201 && r.body.items?.length === 2 && !!batch && r.body.items.map((x: { landedAs: string | null }) => x.landedAs).sort().join() === [libKeys[1], libKeys[2]].sort().join() && sql(`select count(*) from library_change where batch_id='${batch}'`) === "0", r.body);
  const lib0 = libRows();
  // Another person who holds the review duty (the configuration author also reviews), so the refusal is about who decided,
  // not about the role.
  r = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-A");
  ok("C11.14 AT-9 refusal: only the person who decided can Undo the batch: another reviewer (the configuration author, who holds the review duty) is refused (403); it stays accepted", r.status === 403 && statusOf([r2, r3]) === "accepted,accepted", { status: r.status, m: words(r).slice(0, 160) });
  r = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-C");
  const again = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-C");
  ok("C11.14 AT-9 one Undo puts the whole batch back on the queue as proposed, and the library is as it was; the same Undo again is refused (404 or 409, in words)", r.status < 300 && statusOf([r2, r3]) === "waiting,waiting" && libRows() === lib0 && [404, 409].includes(again.status) && words(again).length > 5, [r.status, again.status, words(again)]);
  r = await call("POST", "/review/proposals/decide", { ids: [gone, r2], action: "accept" }, "user-C");
  ok("C11.14 AT-10 each item in a bulk accept is checked again by the rules at approval: one that reuses a field not in the library refuses the batch in words, nothing of it is accepted", r.status === 409 && /not in the library/.test(words(r)) && statusOf([gone, r2]) === "waiting,waiting", { status: r.status, m: words(r) });
  ok("C11.14 AT-11 the whole check spent nothing (ledger unchanged)", (await ledger()) === ledger0, { ledger0, now: await ledger() });
  await db.$disconnect?.();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C11.14 the check itself stopped:", e); process.exit(1); });
