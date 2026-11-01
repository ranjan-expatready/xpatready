// C11.14 — Every AI proposal has a draft round, an independent checker round and the rules check; High only when all
// agree; To review offers Select all / Deselect all within a filter, bulk accept for High only with one Undo, each item
// re-checked by the rule engine; Load sample replays proposals through the same path.
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
// Expected today (main 25cefb67): 9 pass, 4 fail — failing: AT-1 (Load sample writes no proposals), AT-2 (the 84
// IMM 5257 proposals have one round, agreement "one_round"), AT-3 (56 are Ready with no checker round and no rules),
// AT-4 (on To review they cannot be ticked: "It is decided on its form-field page.") because P-121's rounds are not built
// for field mapping. AT-5..AT-10 guard the queue's bulk rules that work.
// Exit: 0 all pass · 1 a check failed · 2 setup missing (copy not reachable or sample not loaded).
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4574), DB = process.argv[3] ?? "xr_studio_acc_c1114";
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
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const ledger = async () => { const l = (await call("GET", "/ledger")).body; return JSON.stringify([l?.committed_usd, l?.wave?.spent_usd]); };
const setupMissing = (why: string) => { console.log(`SETUP MISSING  ${why}`); process.exit(2); };
const statusOf = (ids: string[]) => sql(`select string_agg(status, ',' order by status) from proposal_item where id in (${ids.map((i) => `'${i}'`).join(",")})`);

(async () => {
  if ((await fetch(`http://localhost:${PORT}/api/session`, { headers: { "x-actor": "user-A" } }).catch(() => null))?.status !== 200) setupMissing(`no copy answers on port ${PORT}`);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  const vv = sql("select id from combination where combination_key='vv.single'");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (loaded.status >= 300 || !att) setupMissing("the sample (Visitor visa with IMM 5257) did not load");
  const ledger0 = await ledger();

  // ── AT-1 Load sample replays proposals through the same path (before anything else is drafted)
  const replayedOnLoad = Number(sql("select count(*) from proposal_item where rounds->'draft'->>'from' = 'replay' and rounds->'check'->>'from' = 'replay'"));
  ok("C11.14 AT-1 Load sample puts the saved proposals on To review through the same door: each with its replayed draft and checker rounds (US$0)", replayedOnLoad > 0, { replayedOnLoad, all: sql("select count(*) from proposal_item") });

  // ── the field-map step (replay of the saved IMM 5257 answer)
  const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId: string = d.body?.id;
  if (!jobId || !(await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED"))) setupMissing("the saved IMM 5257 answer did not replay");
  const rows = sql(`select agreement || '|' || confidence || '|' || (rounds->'draft' is not null and rounds->'draft' <> 'null'::jsonb)::text || '|' || (rounds->'check' is not null and rounds->'check' <> 'null'::jsonb)::text || '|' || jsonb_array_length(rules)::text from proposal_item where run_id='${jobId}'`).split("\n").map((l) => l.split("|"));
  const twoRounds = rows.filter((r) => r[2] === "true" && r[3] === "true").length;
  ok("C11.14 AT-2 every field-mapping proposal has a draft round and an independent checker round (both readings kept)", rows.length > 0 && twoRounds === rows.length, { items: rows.length, withBothRounds: twoRounds, agreement: [...new Set(rows.map((r) => r[0]))] });
  const ready = rows.filter((r) => r[1] === "ready");
  const readyOk = ready.filter((r) => r[0] === "agreed" && Number(r[4]) > 0).length;
  const rulePassed = Number(sql(`select count(*) from proposal_item where run_id='${jobId}' and confidence='ready' and jsonb_array_length(rules) > 0 and not exists (select 1 from jsonb_array_elements(rules) x where (x->>'passed')::boolean = false)`));
  ok("C11.14 AT-3 [IRCC-F07] a proposal is High (Ready) only when the rules check ran and passed and both rounds agree", ready.length > 0 && readyOk === ready.length && rulePassed === ready.length, { ready: ready.length, agreedWithRules: readyOk, rulesPassed: rulePassed });
  const q = (await call("GET", "/review/proposals")).body;
  const g = q?.groups?.find((x: { id: string; title: string }) => /IMM 5257/.test(`${x.id} ${x.title}`));
  const gv = g ? (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group : null;
  const readyBand = gv?.bands?.ready ?? [];
  ok("C11.14 AT-4 the field-mapping proposals are on To review in their bands, and the Ready ones can be ticked in bulk (no \"decided on its page\" exception)", !!g && readyBand.length > 0 && readyBand.every((x: { bulk_why: string | null }) => x.bulk_why === null), { group: g?.id ?? null, groups: (q?.groups ?? []).map((x: { id: string }) => x.id), ready: readyBand.length, why: readyBand[0]?.bulk_why });

  // ── the queue's bulk rules, on items written through the door
  const { Db } = await import("../api/src/core.ts");
  const P = await import("../api/src/proposals.ts");
  const db = new Db();
  const ws = sql("select id from workspace where key = 'demo'");
  const ED = "IMM 0000 (01-2026)", SHA = "a".repeat(64), tag = Date.now().toString(36);
  const field = (label: string, over: Record<string, unknown> = {}) => {
    const payload = { kind: "field", label, aliases: [], meaning: `What ${label} means on the form (Sample).`, valueType: "text", subject: "person", formBox: null };
    return { kind: "field", runId: jobId, step: "field_map_edition", scope: { formEdition: ED, combinationId: null }, landsOn: "library", reuse: { match: "new", existingKey: null }, payload,
      source: { file: "imm0000e.pdf", sha256: SHA, edition: "01-2026", page: 1, quote: label, quoteFound: true, rule: null }, rounds: { draft: null, check: null }, rules: [{ rule: "quote found", passed: true, why: null }],
      agreement: "agreed", confidence: "ready", reason: null, origin: "ai", identity: { key: P.identityKeyOf(payload as never, ""), near: [], nearReason: null }, relatesTo: null, revision: null, basis: "SAMPLE", ...over } as never;
  };
  const reading = (label: string, text: string) => ({ reading: text, payload: { kind: "field", label, aliases: [], meaning: `What ${label} means (Sample).`, valueType: "text", subject: "person", formBox: null }, from: "replay", runFile: "runs/acceptance.json", costUsd: 0 });
  const [r1, r2, r3, rc, rd] = await P.insertProposals(db, ws, [field(`Acc ready one ${tag}`), field(`Acc ready two ${tag}`), field(`Acc ready three ${tag}`),
    field(`Acc check one ${tag}`, { confidence: "check", reason: "A rule failed: the quote was not found in the file.", rules: [{ rule: "quote found", passed: false, why: "Not in the file." }] }),
    field(`Acc decide one ${tag}`, { confidence: "decide", agreement: "differ", reason: "The two readings differ.", rounds: { draft: reading(`Acc decide one ${tag}`, "Family name of the applicant"), check: reading(`Acc decided ${tag}`, "Surname as on the passport") } })]);
  const [twin] = await P.insertProposals(db, ws, [field(`Acc ready one ${tag}`)]); // same identity as r1, written before r1 lands
  const view = (await call("GET", `/review/proposals?group=${encodeURIComponent(`edition:${ED}`)}`)).body?.group;
  const band = (b: string) => (view?.bands?.[b] ?? []) as { id: string; bulk_why: string | null; readings?: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.14 AT-5 Select all within a filter: the group answers every item of each band (Ready, Check, Decide) with whether it may be ticked in bulk and why not", band("ready").length === 4 && band("check").length === 1 && band("decide").length === 1 && band("ready").every((x) => x.bulk_why === null) && !!band("check")[0]?.bulk_why && !!band("decide")[0]?.bulk_why, { ready: band("ready").length, check: band("check")[0]?.bulk_why, decide: band("decide")[0]?.bulk_why });
  ok("C11.14 AT-6 a disagreement between the rounds is Decide (Low) and shows both readings", band("decide")[0]?.readings?.draft?.text === "Family name of the applicant" && band("decide")[0]?.readings?.check?.text === "Surname as on the passport", band("decide")[0]?.readings);
  let r = await call("POST", "/review/proposals/decide", { ids: [r2, rc], action: "accept" }, "user-C");
  const r0 = await call("POST", "/review/proposals/decide", { ids: [r2, rd], action: "accept" }, "user-C");
  ok("C11.14 AT-7 refusal: a bulk accept with a Check or a Decide item is refused (409, says why) and nothing is accepted", r.status === 409 && /Only Ready items/.test(words(r)) && r0.status === 409 && statusOf([r2, rc, rd]) === "waiting,waiting,waiting", [words(r), r0.status]);
  r = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, "user-P");
  const rn = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, null);
  ok("C11.14 AT-7 refusal: a client (403) or nobody (401) cannot accept; nothing changes", r.status === 403 && rn.status === 401 && statusOf([r2, r3]) === "waiting,waiting", [r.status, rn.status]);
  r = await call("POST", "/review/proposals/decide", { ids: [r2, r3], action: "accept" }, "user-C");
  const batch = r.body?.batchId;
  ok("C11.14 AT-8 two High items are accepted together as one batch; each lands on the library waiting for a second person", r.status === 201 && r.body.items?.length === 2 && sql(`select count(*) from library_change where batch_id='${batch}' and status='WAITING'`) === "2", r.body);
  r = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-B");
  ok("C11.14 AT-9 refusal: only the person who decided can Undo the batch (403); it stays accepted", r.status === 403 && statusOf([r2, r3]) === "accepted,accepted", r.status);
  r = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-C");
  const again = await call("POST", `/review/proposals/undo/${batch}`, undefined, "user-C");
  ok("C11.14 AT-9 one Undo puts the whole batch back on the queue as proposed, and its library rows are removed; the same Undo again is refused (404 or 409, in words)", r.status < 300 && statusOf([r2, r3]) === "waiting,waiting" && sql(`select count(*) from library_change where batch_id='${batch}' and status='WAITING'`) === "0" && [404, 409].includes(again.status) && words(again).length > 5, [r.status, again.status, words(again)]);
  r = await call("POST", "/review/proposals/decide", { ids: [r1], action: "accept" }, "user-C");
  r = await call("POST", "/review/proposals/decide", { ids: [twin, r2], action: "accept" }, "user-C");
  ok("C11.14 AT-10 each item in a bulk accept is checked again by the rules at approval: one now in the library (added since it was proposed) refuses the batch in words, nothing of it is accepted", r.status === 409 && /already in the library/.test(words(r)) && statusOf([twin, r2]) === "waiting,waiting", { status: r.status, m: words(r) });
  ok("C11.14 AT-11 the whole check spent nothing (ledger unchanged)", (await ledger()) === ledger0, { ledger0, now: await ledger() });
  await db.$disconnect?.();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C11.14 the check itself stopped:", e); process.exit(1); });
