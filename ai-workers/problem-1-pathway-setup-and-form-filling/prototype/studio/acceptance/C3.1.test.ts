// C3.1 — AI maps form fields to shared fields (reuse / new / ambiguous / conflict) beside the source; each field's type
// and format come from the form itself and are enforced in code.
// Status (qa/CAPABILITIES.md, 1 Nov): Partial. Missing: the format part of P-162 (a proposal and the applied field map
// carry no maximum length, choices or date pattern read from the PDF box (AT-8, AT-9, AT-9b; the field name of the
// format beside each form field is this file's proposal: `format: { maxLength, choices, datePattern }`); the runtime's limit comes from words the AI
// wrote in the transform, else 500 characters).
// Decisions: P-162 (formats from the form, enforced in code), P-149 (one door, identity), P-158 (every item from a
// source), P-175 (live AI off by default), P-38 (analysed once). IRCC rule: [IRCC-F07] a form field's type and format
// come from the form itself.
// US$0: the saved real IMM 5257 answer (21 Oct) is replayed; the live path is only ever asked to refuse (no live switch;
// the stand-in launcher logs any call it gets and would answer a live one with an error).
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c1 4569 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs
//   ./node_modules/.bin/tsx acceptance/C3.1.test.ts 4569 xr_studio_acc_c1 ; zsh tools/isolated.sh acc_c1 4569 stop
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 13 pass, 4 fail — failing: AT-8, AT-9,
// AT-9b (a proposal's form field shows no maximum length, choices or date pattern read from the PDF box) and AT-10
// (after apply the runtime limit for family name is 500 characters, not the form's 100) because P-162's formats are not
// built. (AT-10 runs after AT-15: it needs the applied map.)
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { shapeOf } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4569), DB = process.argv[3] ?? "xr_studio_acc_c1", NAME = DB.replace(/^xr_studio_/, "");
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, "..");
const VAR = join(STUDIO, "var", `isolated-${NAME}`), FAKE_LOG = join(VAR, "fake-launch.log");
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
const liveCalls = () => (existsSync(FAKE_LOG) ? readFileSync(FAKE_LOG, "utf8").split("\n").filter((l) => l.includes('"mode":"live"')).length : 0);
const setupMissing = stop;
const norm = (s: string) => s.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

(async () => {
  await checkCopy(PORT, DB);
  mkdirSync(VAR, { recursive: true });
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 0, out: { ok: true } }, live: { exit: 1, err: "the stand-in launcher was asked for a live call" } }));
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  if (loaded.status >= 300 || !vv || !att) setupMissing("the sample (Visitor visa with IMM 5257) did not load");
  const inv = JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"), "utf8"));
  const invText = norm(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"), "utf8").replace(/\\"/g, '"'));
  const box = new Map<string, any>(inv.fields.filter((f: any) => f.data_path).map((f: any) => [f.data_path, f])); // eslint-disable-line @typescript-eslint/no-explicit-any
  const jobsOf = () => sql(`select count(*) from drafting_job where attachment_id='${att}' and kind='field_map'`);
  const ledger0 = await ledger(), live0 = liveCalls();

  // ── AT-1 who may start a draft (refusal cases: nothing is created)
  const noOne = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, null);
  const client = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, "user-P");
  const reviewer = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, "user-C");
  ok("C3.1 AT-1 only an author starts a draft: no person 401, a client 403, a reviewer without the author duty 403, each in plain words; no draft is created",
    noOne.status === 401 && client.status === 403 && reviewer.status === 403 && /author duty/.test(words(reviewer)) && jobsOf() === "0", { noOne: noOne.status, client: client.status, reviewer: [reviewer.status, words(reviewer)], jobs: jobsOf() });
  const badMode = await call("POST", `/attachments/${att}/draft`, { mode: "guess" });
  ok("C3.1 AT-2 a draft with an unknown way of drafting is a plain 400 naming live, replay and stub; nothing is created", badMode.status === 400 && /live, replay or stub/.test(words(badMode)) && jobsOf() === "0", badMode.body);

  // ── AT-3 live is off on this copy (P-175): refused at US$0, the launcher never asked
  const live = await call("POST", `/attachments/${att}/draft`, { mode: "live", idempotencyKey: `acc-c31-live-${process.pid}` });
  await until(async () => sql(`select count(*) from drafting_job where attachment_id='${att}' and status in ('QUEUED','RUNNING')`) === "0", 20_000);
  const liveJob = sql(`select status::text || '|' || coalesce(cost_usd, 0) from drafting_job where attachment_id='${att}' order by started_at desc limit 1`);
  ok("C3.1 AT-3 a live draft on a copy without the live switch is refused in plain words (or ends without a live call); the launcher is never asked; the ledger is unchanged (US$0)",
    (/switched off/.test(JSON.stringify(live.body)) || (!!liveJob && !/^COMPLETED/.test(liveJob) && /\|0(\.0+)?$/.test(liveJob))) && liveCalls() === live0 && (await ledger()) === ledger0, { status: live.status, body: words(live).slice(0, 160), liveJob, live: liveCalls() - live0 });
  sql(`delete from proposal_item where run_id in (select id from drafting_job where attachment_id='${att}')`);
  sql(`delete from drafting_job where attachment_id='${att}'`);

  // ── AT-4 the replay, sent twice with one launch key, is one draft at US$0
  const key = `acc-c31-${process.pid}-${Date.now()}`;
  const [d1, d2] = await Promise.all([call("POST", `/attachments/${att}/draft`, { mode: "replay", idempotencyKey: key }), call("POST", `/attachments/${att}/draft`, { mode: "replay", idempotencyKey: key })]);
  const jobId: string = d1.body?.id;
  await until(async () => !["QUEUED", "RUNNING"].includes((await call("GET", `/jobs/${jobId}`)).body?.status));
  let job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("C3.1 AT-4 the saved IMM 5257 answer replays as one draft (the same launch key twice gives the same draft), labelled no model call, US$0, ledger unchanged",
    !!jobId && d2.body?.id === jobId && jobsOf() === "1" && job?.status === "COMPLETED" && job.costUsd === 0 && /no model call, US\$0/.test(job.message) && (await ledger()) === ledger0, { d1: d1.status, d2: d2.body?.id, jobs: jobsOf(), status: job?.status, message: job?.message });
  const items: any[] = job?.items ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── AT-5..7 the four outcomes, beside the source, every form field accounted for
  const OUT = ["REUSE", "NEW", "AMBIGUOUS", "CONFLICT"];
  const libHas = (k: string) => sql(`select count(*) from canonical_field where canonical_field_key='${k.replace(/'/g, "''")}'`) !== "0";
  const reuse = items.filter((i) => i.outcome === "REUSE"), fresh = items.filter((i) => i.outcome === "NEW"), amb = items.filter((i) => i.outcome === "AMBIGUOUS");
  ok("C3.1 AT-5 every proposal is reuse, new, ambiguous or conflict: a reuse names a library field that exists, a new one names none, an ambiguous one says why in words and lists any candidates with why and a score",
    items.length > 0 && items.every((i) => OUT.includes(i.outcome)) && reuse.length > 0 && reuse.every((i) => i.matchedKey && libHas(i.matchedKey)) && fresh.every((i) => !i.matchedKey) && amb.length > 0 && amb.every((i) => !!i.reason && (i.candidates ?? []).every((c: any) => c.why && typeof c.score === "number")), // eslint-disable-line @typescript-eslint/no-explicit-any
    { n: items.length, reuse: reuse.length, new: fresh.length, ambiguous: amb.length });
  const boxes = items.flatMap((i) => i.boxes ?? []);
  const unquoted = boxes.filter((b) => !box.has(b.data_path) || !b.caption || !b.evidence || !invText.includes(norm(b.evidence)));
  ok("C3.1 AT-6 beside the source: every proposal shows its form fields (a form field of this PDF, its caption) and a quote that is found in the form", boxes.length > 0 && items.every((i) => i.boxes?.length) && unquoted.length === 0, unquoted.slice(0, 3).map((b) => [b.data_path, b.evidence]));
  const c = job?.detail?.counts ?? {}, dataFields = inv.fields.filter((f: { data_path?: string }) => f.data_path).length;
  ok("C3.1 AT-7 every form field of the PDF is accounted for once: mapped, not a fact, never filled or open (the counts add up to the PDF's form fields)",
    c.boxes === dataFields && c.mapped + c.not_a_fact + c.never_filled + c.unresolved === c.boxes && c.reuse + c.new + c.ambiguous + c.conflict === items.length, { counts: c, dataFields });

  // ── AT-8..9 [IRCC-F07] the format read from the PDF box sits beside each proposal (P-162)
  const fmt = (b: any) => b.format ?? b.formFormat ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
  const famBox = boxes.find((b) => /Name\[0\]\.FamilyName\[0\]$/.test(b.data_path) && /PersonalDetails/.test(b.data_path));
  const maxOf = (b: any) => fmt(b)?.maxLength ?? fmt(b)?.max_length ?? b?.max_chars ?? b?.maxLength ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C3.1 AT-8 [IRCC-F07] a proposal's form field shows the maximum length printed in the PDF (family name: 100 characters), every text form field with one",
    !!famBox && maxOf(famBox) === box.get(famBox.data_path)?.max_chars && boxes.filter((b) => box.get(b.data_path)?.max_chars).every((b) => maxOf(b) === box.get(b.data_path).max_chars), { famBox: famBox && { path: famBox.data_path, shown: maxOf(famBox), pdf: box.get(famBox.data_path)?.max_chars } });
  const choiceBox = boxes.find((b) => (box.get(b.data_path)?.options_resolved ?? []).length > 1);
  const choicesOf = (b: any) => fmt(b)?.choices ?? b?.choices ?? b?.options ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C3.1 AT-9 [IRCC-F07] a choice form field's proposal shows the PDF's own choices (codes and words), not a list the AI made up", !!choiceBox && Array.isArray(choicesOf(choiceBox)) && choicesOf(choiceBox).length === box.get(choiceBox.data_path).options_resolved.length,
    choiceBox && { path: choiceBox.data_path, shown: choicesOf(choiceBox), pdf: box.get(choiceBox.data_path).options_resolved.length });
  // P-162 names three formats from the PDF box: maximum length (AT-8), choices (AT-9) and the date pattern (AT-9b).
  const dateBoxes = boxes.filter((b) => box.get(b.data_path)?.ui === "dateTimeEdit");
  const patternOf = (b: any) => fmt(b)?.datePattern ?? fmt(b)?.date_pattern ?? fmt(b)?.pattern ?? b?.datePattern ?? b?.date_pattern ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!dateBoxes.length) setupMissing("the replayed IMM 5257 draft proposes no date form field");
  ok("C3.1 AT-9b [IRCC-F07] a date form field's proposal shows the date pattern read from the PDF box (P-162: \"date pattern\"), every date form field with one",
    dateBoxes.every((b) => typeof patternOf(b) === "string" && /Y/i.test(patternOf(b)) && /M/.test(patternOf(b))), dateBoxes.slice(0, 3).map((b) => ({ path: b.data_path, shown: patternOf(b) })));
  const codedTypes = items.filter((i) => i.boxes?.length && i.boxes.every((b: any) => (box.get(b.data_path)?.options_resolved ?? []).length > 1)).map((i) => i.proposedType); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C3.1 AT-11 [IRCC-F07] a shared field fed only by choice form fields is never proposed as free text (its type follows the PDF box)", codedTypes.length > 0 && !codedTypes.includes("text"), codedTypes);

  // ── AT-12 conflict: same key, different type (and the refusal it guards)
  const target = reuse.find((i) => ["text", "date"].includes(i.proposedType))!;
  const oldType = sql(`select value_type from canonical_field where canonical_field_key='${target.matchedKey}' order by version desc limit 1`);
  sql(`update canonical_field set value_type='${oldType === "date" ? "text" : "date"}' where canonical_field_key='${target.matchedKey}'`);
  let r = await call("POST", `/jobs/${jobId}/recompare`);
  job = (await call("GET", `/jobs/${jobId}`)).body;
  const conflict = job?.items?.find((i: any) => i.proposedKey === target.proposedKey); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C3.1 AT-12 [IRCC-F07] a proposal whose key is in the library with another type is a conflict, says both types in words, and is never a reuse (compared again at US$0)",
    r.status < 300 && conflict?.outcome === "CONFLICT" && /value type differs/.test(conflict?.reason ?? "") && (await ledger()) === ledger0, { status: r.status, outcome: conflict?.outcome, reason: conflict?.reason });
  r = await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-C");
  ok("C3.1 AT-13 a conflict is never accepted with the clean reuse matches; it waits for its own decision", r.status < 300 && (await call("GET", `/jobs/${jobId}`)).body.items.find((i: any) => i.id === conflict?.id)?.decision === "PENDING", r.body); // eslint-disable-line @typescript-eslint/no-explicit-any
  sql(`update canonical_field set value_type='${oldType}' where canonical_field_key='${target.matchedKey}'`);
  await call("POST", `/jobs/${jobId}/recompare`);

  // ── AT-14 the draft lands only when every proposal is decided (refusal), then applies (pass)
  r = await call("POST", `/jobs/${jobId}/apply`, {});
  const mapRows = () => sql(`select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label='IMM 5257 (09-2023)'`);
  const rowsBefore = mapRows();
  ok("C3.1 AT-14 a draft with undecided proposals is not applied: a plain refusal naming one, no form field map written", r.status === 400 && /still undecided/.test(words(r)) && mapRows() === rowsBefore, r.body);
  await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-C");
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, "user-C");
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: any) => x.decision === "PENDING")) // eslint-disable-line @typescript-eslint/no-explicit-any
    await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "A different meaning from the candidates (acceptance check)" }, "user-C");
  const [a1, a2] = await Promise.all([call("POST", `/jobs/${jobId}/apply`, {}), call("POST", `/jobs/${jobId}/apply`, {})]);
  ok("C3.1 AT-15 apply sent twice at once: exactly one applies (242 form fields), the other is refused 409; ledger unchanged",
    [a1, a2].filter((x) => x.status < 300).length === 1 && [a1, a2].some((x) => x.status === 409) && [a1, a2].find((x) => x.status < 300)?.body?.boxes === dataFields && (await ledger()) === ledger0, [a1.status, a2.status, a1.body?.boxes ?? words(a1), words(a2)]);

  // ── AT-10 [IRCC-F07] enforced in code: the applied map gives the runtime the form's own limit
  const snap = (await call("GET", `/combinations/${vv}/config`)).body?.snapshot as Snapshot;
  const fam = snap ? shapeOf(snap, "person.family_name") : null;
  ok("C3.1 AT-10 [IRCC-F07] after apply, the answer check for family name uses the PDF's own limit (100 characters), not a general 500", fam?.maxLength === 100, fam);
  ok("C3.1 AT-16 the whole check spent nothing: the ledger is as it was, and the launcher was never asked for a live call", (await ledger()) === ledger0 && liveCalls() === live0, { ledger0, now: await ledger() });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.1 the check itself stopped:", e); process.exit(1); });
