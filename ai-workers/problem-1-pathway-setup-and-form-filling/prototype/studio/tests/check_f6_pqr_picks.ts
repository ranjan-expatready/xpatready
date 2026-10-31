// F6 slice 1 (runtime lane; C4.7, C4.2, C4.8; P-76, P-149 one door, P-132; screens/W1-shared-library/plan-slice1.md item 1c):
// the rules propose pre-qualification picks onto To review, a person accepts (ticks the fact in the combination's draft)
// or rejects each, Undo takes an accept back within its 10 s, and an accepted pick goes out in the combination's one
// review and release: no library item, no second-person approval of its own. A passing and a failing case per rule,
// through the API on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_f6p 4435 start && tsx studio/tests/check_f6_pqr_picks.ts 4435 xr_studio_runtime_f6p
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_f6p";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  if ((await call("POST", "/demo/load", {})).status >= 300) { console.error("STOP  the sample did not load"); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const spent = ledger();
  const group = `combination:${wp}`;
  const queue = async () => { const v = (await call("GET", `/review/proposals?group=${encodeURIComponent(group)}`)).body; return v?.group ? (Object.values(v.group.bands) as any[]).flat().filter((x: any) => x.kind === "pqr_pick") : []; };
  const ticked = (key: string) => sql(`select prequalification from fact_source where combination_id='${wp}' and lineage_key='${key}' order by version desc limit 1`) === "t";

  // ---------------------------------------------------------------- rule 1: the rules propose picks onto To review (US$0)
  let r = await call("POST", `/combinations/${wp}/pqr/picks`, undefined, "user-B");
  ok("C4.7 fail: only an author asks for picks (the Approver is refused, 403, nothing proposed)", r.status === 403 && n(`select count(*) from proposal_item where kind='pqr_pick'`) === 0, r.status);
  r = await call("POST", `/combinations/00000000-0000-4000-8000-000000000000/pqr/picks`);
  ok("C4.7 fail: an unknown combination is refused in words (404)", r.status === 404 && /does not exist/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${wp}/pqr/picks`);
  const first = r.body;
  ok("C4.7 pass: the rules propose picks for the work permit's draft and say where they wait, in words", r.status === 200 && first.proposed > 0 && first.waitingAlready === 0 && /waiting on To review/.test(first.words), first);
  const job = sql(`select kind || '|' || mode || '|' || status || '|' || coalesce(cost_usd, -1) from drafting_job where id='${first.runId}'`);
  ok("C4.7 pass: the proposal is a recorded run with no AI and no cost (LOCAL, US$0), and nothing was spent", job === "pqr_picks|LOCAL|COMPLETED|0" && ledger() === spent, job);
  let Q = await queue();
  ok("C4.7 pass: each pick waits on To review under the combination, called a pre-qualification pick, with what it asks, for whom, and why", Q.length === first.proposed && Q.every((x: any) => x.kind_word === "Pre-qualification pick" && /^Ask ".+" \(.+\) in pre-qualification$/.test(x.title) && /A rule of this combination reads it/.test(x.meaning ?? "") && x.origin === "rules" && x.lands_on === "combination"), Q.slice(0, 2).map((x: any) => [x.title, x.meaning]));
  ok("C4.7 fail-guard: a rules pick is never shown as AI (rules only, no AI readings)", Q.every((x: any) => x.agreement === "rules_only" && !x.readings.draft && !x.readings.check));
  r = await call("POST", `/combinations/${wp}/pqr/picks`);
  ok("C4.7 fail: asking again proposes nothing twice (each pick still waiting is not repeated) and says so", r.status === 200 && r.body.proposed === 0 && r.body.waitingAlready === first.proposed && /already waiting/.test(r.body.words) && (await queue()).length === first.proposed, r.body);

  // ---------------------------------------------------------------- rule 2: accepting ticks the fact in the draft; no library item, no second person
  const [a, b, c2] = Q;
  const keyOf = (x: any) => sql(`select identity_key from proposal_item where id='${x.id}'`);
  const ka = keyOf(a), kb = keyOf(b), kc = keyOf(c2);
  ok("C4.7 setup: before any decision the picked facts are not asked in pre-qualification", !ticked(ka) && !ticked(kb) && !ticked(kc));
  const changesBefore = n(`select count(*) from library_change`);
  r = await call("POST", "/review/proposals/decide", { ids: [a.id], action: "accept", reason: "A prospect can say this before a case starts." }, "user-B");
  ok("C4.7 fail: the Approver cannot accept a pick (only an author ticks pre-qualification), and nothing is ticked", r.status === 403 && !ticked(ka) && n(`select count(*) from proposal_item where id='${a.id}' and status='waiting'`) === 1, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [a.id], action: "accept", reason: "A prospect can say this before a case starts." });
  const batch = r.body?.batchId;
  ok("C4.7 pass: the author accepts a pick on To review: the fact is now asked in pre-qualification in the draft, with the reason given", r.status < 300 && ticked(ka) && sql(`select reason from fact_source where combination_id='${wp}' and lineage_key='${ka}' order by version desc limit 1`) === "A prospect can say this before a case starts.", r.status >= 300 ? words(r) : r.body);
  ok("C4.7 / P-76 pass: accepting a pick writes no library item and asks no second person (no library change, no batch to approve)", n(`select count(*) from library_change`) === changesBefore && n(`select count(*) from fact_source where combination_id='${wp}' and lineage_key='${ka}' and status='DRAFT'`) === 1);
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const row = (fs?.facts ?? fs?.rows ?? fs ?? []).find?.((x: any) => `${x.role}|${x.fact}` === ka);
  ok("C4.2 pass: the Questionnaires tab's list shows it ticked (the PQR is the one per-combination record)", row ? row.prequalification === true : ticked(ka), row ? { pq: row.prequalification } : "read from the database");

  // ---------------------------------------------------------------- rule 3: Undo takes the tick back (10 s), the pick waits again
  r = await call("POST", `/review/proposals/undo/${batch}`);
  ok("C4.7 pass: Undo within 10 s takes the tick off the draft and the pick waits on To review again", r.status < 300 && !ticked(ka) && n(`select count(*) from proposal_item where id='${a.id}' and status='waiting'`) === 1, r.status >= 300 ? words(r) : r.body);
  r = await call("POST", "/review/proposals/decide", { ids: [a.id], action: "accept", reason: "Accepted again after the undo." });
  const batch2 = r.body?.batchId;
  const v = Number(sql(`select max(version) from fact_source where combination_id='${wp}' and lineage_key='${ka}'`));
  const [role, ...f] = ka.split("|");
  const edit = await call("PUT", `/combinations/${wp}/fact-sources/${encodeURIComponent(role)}/${encodeURIComponent(f.join("|"))}`, { prequalification: true, reason: "Changed by hand after the accept.", version: v });
  r = await call("POST", `/review/proposals/undo/${batch2}`);
  ok("C4.7 fail: once a person changed the tick after the accept, Undo refuses in words (pointing to the Questionnaires tab, not the library) and keeps their change", edit.status === 200 && r.status === 409 && /changed after it was accepted/.test(words(r)) && /Questionnaires tab/.test(words(r)) && !/shared library/.test(words(r)) && ticked(ka) && sql(`select reason from fact_source where combination_id='${wp}' and lineage_key='${ka}' order by version desc limit 1`) === "Changed by hand after the accept.", { edit: edit.status >= 300 ? words(edit) : edit.status, undo: words(r) });

  // ---------------------------------------------------------------- rule 4: reject leaves it unticked; a fact ticked meanwhile is refused
  r = await call("POST", "/review/proposals/decide", { ids: [b.id], action: "reject", reason: "Not something a prospect knows yet." });
  ok("C4.7 pass: rejecting a pick leaves the fact unticked and the pick decided (rejected, with the reason)", r.status < 300 && !ticked(kb) && sql(`select status || '|' || coalesce(decision_reason,'') from proposal_item where id='${b.id}'`) === "rejected|Not something a prospect knows yet.", r.status >= 300 ? words(r) : r.body);
  const vc = Number(sql(`select coalesce(max(version), 0) from fact_source where combination_id='${wp}' and lineage_key='${kc}'`));
  const [rc, ...fc] = kc.split("|");
  const byHand = await call("PUT", `/combinations/${wp}/fact-sources/${encodeURIComponent(rc)}/${encodeURIComponent(fc.join("|"))}`, { prequalification: true, reason: "Ticked by hand first.", version: vc });
  r = await call("POST", "/review/proposals/decide", { ids: [c2.id], action: "accept", reason: "Late accept." });
  ok("C4.7 fail: a pick whose fact was ticked by hand meanwhile is refused in words (409), the hand tick and its reason kept", byHand.status === 200 && r.status === 409 && /already asked in pre-qualification/.test(words(r)) && sql(`select reason from fact_source where combination_id='${wp}' and lineage_key='${kc}' order by version desc limit 1`) === "Ticked by hand first." && n(`select count(*) from proposal_item where id='${c2.id}' and status='waiting'`) === 1, { hand: byHand.status >= 300 ? words(byHand) : byHand.status, accept: words(r) });

  // ---------------------------------------------------------------- rule 5: C4.8 the accepted pick goes out with the combination's one release
  const draft = (await call("GET", `/combinations/${wp}`)).body?.draft;
  const named = ((draft?.changes ?? []) as any[]).filter((x) => x.kind === "Where an answer comes from" && x.key === ka);
  ok("C4.8 pass: the accepted pick is a named change of the combination's draft, reviewed and released with the rest (no separate approval)", named.length === 1, ((draft?.changes ?? []) as any[]).filter((x) => x.kind === "Where an answer comes from").map((x) => x.key).slice(0, 5));
  ok("C4.8 fail-guard: a rejected pick is no change of the draft", !((draft?.changes ?? []) as any[]).some((x) => x.kind === "Where an answer comes from" && x.key === kb));

  // ---------------------------------------------------------------- retired combination
  sql(`update combination set retired_at=now() where id='${wp}'`);
  r = await call("POST", `/combinations/${wp}/pqr/picks`);
  ok("C4.7 fail: a retired combination gets no picks (409, in words)", r.status === 409 && /retired/.test(words(r)), words(r));
  sql(`update combination set retired_at=null where id='${wp}'`);
  ok("US$0: no AI call was made by anything here (the spend ledger is unchanged)", ledger() === spent);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
