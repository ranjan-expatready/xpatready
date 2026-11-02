// W1-15 Questions and documents, slice 2 (runtime lane; board v2 agreed P-147; plan.md "Slice 2 against board v2"):
// the API under the Smart questionnaire (SQR) tab: each row's status (its newest saved choice), the release checks carrying the
// person role (for "Needs you"), the bulk change on ticked rows (each row re-checked against the same locks, refused
// rows in words, one batch id) and its one Undo, and the case officer as a source (P-154 words; P-155(3): by default only
// for the case officer's own facts, any other with a written reason reviewed at release, never declarations). A passing and a
// failing case per rule, on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_w115b 4436 start && tsx studio/tests/check_w115_slice2.ts 4436 xr_studio_runtime_w115b
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agentRefusal, CASE_OFFICER_NEEDS_REASON } from "../engine/sources.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_w115b";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const CODES = /\bP-\d+\b/;

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const list = async () => (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const bulk = (b: any, actor = "user-A") => call("POST", `/combinations/${wp}/fact-sources/bulk`, b, actor);
  const undo = (batchId: string | null, actor = "user-A") => call("POST", `/combinations/${wp}/fact-sources/bulk/undo`, { batchId }, actor);

  // ---------------------------------------------------------------- the list: row status and release checks
  let L = await list();
  const get = (role: string, fact: string) => L.facts.find((f: any) => f.role === role && f.fact === fact);
  ok("slice 2 row status pass: with nothing changed, every row's change is null (the rules)", L.facts.length > 100 && L.facts.every((f: any) => f.change === null), L.facts.length);
  ok("slice 2 Needs you pass: the list carries the release checks", Array.isArray(L.problems), typeof L.problems);
  const docs = L.facts.filter((f: any) => f.role === "principal" && f.source === "DOCUMENT" && f.placed && !f.clientOnly).slice(0, 3);
  const decl = L.facts.find((f: any) => f.clientOnly && f.role === "principal");
  const agentFact = L.facts.find((f: any) => f.ruleSource === "AGENT" && f.role !== "case" && !f.clientOnly);
  ok("fixture: three placed document facts, a declaration and an agent fact for the principal", docs.length === 3 && !!decl && !!agentFact, { docs: docs.length, decl: !!decl, agent: agentFact?.fact });

  // ---------------------------------------------------------------- the case officer: one rule (engine/sources.ts agentRefusal, P-155(3))
  ok("P-155(3) rule pass: the case officer's own fact needs no reason (offered by default)", agentRefusal(agentFact) === null && agentFact.agentOffered === true, agentFact.fact);
  ok("P-155(3) rule fail: a fact read from a document needs a written reason (the one message)", agentRefusal(docs[0]) === CASE_OFFICER_NEEDS_REASON && agentRefusal(docs[0], "  ") === CASE_OFFICER_NEEDS_REASON && docs[0].agentOffered === false, docs[0].fact);
  ok("P-155(3) rule pass: with a written reason it is allowed", agentRefusal(docs[0], "Sample: the officer copies it from the LMIA file.") === null);
  ok("P-155(3) rule: a declaration is never the case officer's (its own refusal speaks for it)", decl.agentOffered === false && agentRefusal(decl) === null);
  ok("P-154 words pass: the refusal reads \"case officer\" in plain English, never \"agent\"", /case officer/.test(CASE_OFFICER_NEEDS_REASON) && !/\bagents?\b/i.test(CASE_OFFICER_NEEDS_REASON) && !CODES.test(CASE_OFFICER_NEEDS_REASON));

  // ---------------------------------------------------------------- bulk: roles, shape, locks
  const items = (fs: any[]) => fs.map((f) => ({ role: f.role, fact: f.fact, version: f.version }));
  let r = await bulk({ items: items(docs), source: "CLIENT" }, "user-O");
  ok("bulk roles fail: a case officer cannot change the ticked rows (403)", r.status === 403, r.status);
  r = await bulk({ items: [], source: "CLIENT" });
  ok("bulk shape fail: no ticked rows is 400, in words", r.status === 400 && /Tick the rows/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
  r = await bulk({ items: items(docs) });
  ok("bulk shape fail: nothing chosen to change is 400, in words", r.status === 400 && /Choose what to change/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
  r = await bulk({ items: items([...docs, decl]), source: "AGENT" });
  L = await list();
  ok("P-155(3) fail (bulk): the case officer on document facts is refused per row (a bulk change carries no reason), and nothing is saved", r.status === 200 && r.body.saved === 0 && r.body.batchId === null && r.body.refused.length === 4 && r.body.refused.filter((x: any) => /The case officer enters only .+ Open its details to write why/.test(x.message)).length === 3 && L.facts.every((f: any) => f.change === null), r.body);
  ok("lock fail (declaration): the declaration's refusal says only the client gives it", r.body.refused.some((x: any) => x.fact === decl.fact && /only the client gives it/.test(x.message)), r.body.refused.map((x: any) => x.message));
  ok("words fail-guard: no refusal carries a decision code or the word agent (P-154)", !r.body.refused.some((x: any) => CODES.test(x.message) || /\bagents?\b/i.test(x.message)), r.body.refused.map((x: any) => x.message));
  const put0 = (b: any) => call("PUT", `/combinations/${wp}/fact-sources/${docs[0].role}/${encodeURIComponent(docs[0].fact)}`, b);
  r = await put0({ source: "AGENT", version: 0 });
  ok("P-155(3) fail: the case officer on a document fact without a reason is refused (422, on the reason field, in words)", r.status === 422 && r.body?.errors?.[0]?.field === "sourceReason" && /write why/.test(words(r)), words(r));
  r = await put0({ source: "AGENT", sourceReason: "Sample: the officer copies it from the LMIA file.", version: 0 });
  L = await list();
  const withWhy = get(docs[0].role, docs[0].fact);
  ok("P-155(3) pass: with a written reason it is saved; the row carries the reason", r.status === 200 && withWhy.source === "AGENT" && withWhy.sourceReason === "Sample: the officer copies it from the LMIA file.", r.body ?? words(r));
  const cfg = (await call("GET", `/combinations/${wp}`)).body;
  const line = (cfg.draft.changes as any[]).find((x) => x.kind === "Where an answer comes from" && /why: Sample: the officer copies it/.test(x.label));
  ok("P-155(3) pass: Review names it with the reason, for the second person at release", !!line && line.needs_sme === true && /the case officer \(why: /.test(line.label), (cfg.draft.changes as any[]).filter((x) => x.kind === "Where an answer comes from").map((x) => x.label));
  ok("P-155(3) fail-guard: with its reason it is no release check", !L.problems.some((p: any) => p.item === docs[0].fact && p.role === docs[0].role && p.level === "error"), L.problems.filter((p: any) => p.item === docs[0].fact).map((p: any) => p.message));
  sql(`update fact_source set source_reason=null where combination_id='${wp}' and lineage_key='${docs[0].role}|${docs[0].fact}' and status='DRAFT'`);
  L = await list();
  ok("P-155(3) fail: a case officer choice without its reason (an older save) is a release check, in words", L.problems.some((p: any) => p.item === docs[0].fact && p.role === docs[0].role && p.level === "error" && /without a written reason/.test(p.message)), L.problems.filter((p: any) => p.item === docs[0].fact).map((p: any) => p.message));
  await call("DELETE", `/combinations/${wp}/fact-sources/${docs[0].role}/${encodeURIComponent(docs[0].fact)}`, { version: get(docs[0].role, docs[0].fact).version });
  L = await list();
  r = await bulk({ items: items([agentFact]), prequalification: true });
  ok("lock fail (C4.2 M4): Prospect questionnaire (PQR) on an agent fact is refused in the bulk change too", r.body.saved === 0 && /prospect is asked only what they can answer/.test(r.body.refused[0]?.message ?? ""), r.body.refused);

  // ---------------------------------------------------------------- bulk pass, mixed, Undo
  r = await bulk({ items: items([...docs, decl]), source: "CLIENT" });
  L = await list();
  const batch1 = r.body.batchId;
  ok("bulk pass: three document facts set to the client in one change, one batch id; the declaration is already the client's (no change, not refused)", r.status === 200 && r.body.saved === 3 && !!batch1 && r.body.refused.length === 0 && docs.every((d: any) => get(d.role, d.fact).source === "CLIENT" && get(d.role, d.fact).change?.status === "DRAFT" && get(d.role, d.fact).change?.batchId === batch1), r.body);
  ok("bulk pass: the rows' status says Changed here (a draft by user-A)", docs.every((d: any) => get(d.role, d.fact).change?.by === "user-A"), docs.map((d: any) => get(d.role, d.fact).change));
  ok("bulk: one History line for the whole change", Number(sql(`select count(*) from audit_event where entity_key='bulk:${batch1}'`)) === 1);
  const stale = docs.map((d: any) => ({ role: d.role, fact: d.fact, version: 0 }));
  r = await bulk({ items: stale, prequalification: true });
  ok("bulk stale fail: rows sent from an old version are refused (changed by someone else), nothing saved", r.body.saved === 0 && r.body.refused.length === 3 && r.body.refused.every((x: any) => /changed by someone else/.test(x.message)), r.body.refused.map((x: any) => x.message));
  r = await undo(batch1, "user-B");
  ok("Undo fail: someone else cannot undo the bulk change (403, in words)", r.status === 403 && words(r) === "Only the person who made this draft can undo it.", `${r.status} ${words(r)}`);
  r = await undo("not-a-batch");
  ok("Undo shape fail: an unknown batch id is 400 in words", r.status === 400, r.status);
  r = await undo(batch1);
  L = await list();
  ok("Undo pass: one Undo takes the three rows back to the rules (the document)", r.status === 200 && r.body.undone === 3 && docs.every((d: any) => get(d.role, d.fact).source === "DOCUMENT" && get(d.role, d.fact).change === null), r.body);
  r = await undo(batch1);
  ok("Undo fail: the same change is not undone twice (409 Nothing to undo)", r.status === 409 && /Nothing to undo/.test(r.body?.title ?? ""), `${r.status} ${r.body?.title}`);

  // A row changed again after the bulk change keeps that later change; the rest of the batch is undone.
  r = await bulk({ items: items(docs.slice(0, 2)), prequalification: true });
  const batch2 = r.body.batchId; L = await list();
  const d0 = get(docs[0].role, docs[0].fact);
  await call("PUT", `/combinations/${wp}/fact-sources/${d0.role}/${encodeURIComponent(d0.fact)}`, { source: "CLIENT", version: d0.version });
  r = await undo(batch2);
  L = await list();
  // The later single save replaced that row's draft, so it is no longer part of the bulk change: the Undo leaves it.
  ok("Undo pass (mixed): a row changed again since keeps that later change; the other row is undone", r.status === 200 && r.body.undone === 1 && get(docs[0].role, docs[0].fact).source === "CLIENT" && get(docs[0].role, docs[0].fact).change?.batchId === null && get(docs[1].role, docs[1].fact).change === null, { body: r.body, d0: get(docs[0].role, docs[0].fact).change });

  // ---------------------------------------------------------------- Needs you: a release check carries its role
  sql(`insert into fact_source (workspace_id, combination_id, lineage_key, role, canonical_field_key, source, version, status, origin, updated_by) values ('${served}', '${wp}', '${decl.role}|${decl.fact}', '${decl.role}', '${decl.fact}', 'AGENT', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  L = await list();
  ok("Needs you pass: the release check names its person role and fact, so it lands on its row", L.problems.some((p: any) => p.level === "error" && p.role === decl.role && p.item === decl.fact), L.problems.filter((p: any) => p.item === decl.fact));
  ok("Needs you fail-guard: no release check is about another role's row", !L.problems.some((p: any) => p.item === decl.fact && p.role !== decl.role), L.problems.filter((p: any) => p.item === decl.fact).map((p: any) => p.role));
  sql(`delete from fact_source where combination_id='${wp}' and lineage_key='${decl.role}|${decl.fact}'`);

  // ---------------------------------------------------------------- release: the batch goes out; Undo after it is refused
  await call("DELETE", `/combinations/${wp}/fact-sources/${d0.role}/${encodeURIComponent(d0.fact)}`, { version: get(d0.role, d0.fact).version });
  r = await bulk({ items: items([get(docs[2].role, docs[2].fact)]), prequalification: true });
  const batch3 = r.body.batchId;
  await sourceEveryNumber(PORT, wp); // G1 (C5.4): the release's numbers need a source before it is submitted
  await call("POST", `/combinations/${wp}/submit`, {});
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("release pass: the bulk change is released (Release 2)", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  L = await list();
  ok("row status pass: after the release the row says released (PUBLISHED)", get(docs[2].role, docs[2].fact).change?.status === "PUBLISHED", get(docs[2].role, docs[2].fact).change);
  r = await undo(batch3);
  ok("Undo fail: a released bulk change is not undone (409 Released since)", r.status === 409 && /Released since/.test(r.body?.title ?? ""), `${r.status} ${words(r)}`);
  sql(`update combination set retired_at=now() where id='${wp}'`);
  r = await bulk({ items: items(docs.slice(0, 1).map((d: any) => get(d.role, d.fact))), source: "CLIENT" });
  ok("bulk fail: a retired combination's sources are not changed (409, restore it first)", r.status === 409 && /is retired/.test(words(r)), words(r));
  sql(`update combination set retired_at=null where id='${wp}'`);

  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-questions-and-documents", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_w115_slice2.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
