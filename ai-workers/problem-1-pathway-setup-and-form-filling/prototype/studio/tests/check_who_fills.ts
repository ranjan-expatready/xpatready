// M2 queue item 3, who fills a question (runtime lane; C4.9, P-97, P-23; plan.md "Who fills", agreed by the Lead
// 29 Oct): who fills a question for every combination changes only as a library change. Proposed with a reason, approved
// on To review by a second person, applied at approval as a draft placement version, named on Review for the immigration
// expert, published with the next release; the direct edit is refused; client-only sections never change. A pass and a
// fail per rule, through the API on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_fills 4438 start && tsx studio/tests/check_who_fills.ts 4438 xr_studio_runtime_fills
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4438), DB = process.argv[3] ?? "xr_studio_runtime_fills";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const KEYS = /\b[a-z_]+\.[a-z_]+\b|\((principal|spouse_or_partner|child|representative)\)/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const list = async () => (await call("GET", `/combinations/${wp}/fact-sources`)).body.facts as any[];
  let L = await list();
  // A principal's question the client fills in the library, that no document supplies (so the rules follow the library).
  const f = L.find((x) => x.role === "principal" && x.fills.library === "CLIENT" && !x.clientOnly && x.ruleSource === "CLIENT" && x.placed);
  const g = L.find((x) => x.role === "principal" && x.fills.library === "CLIENT" && !x.clientOnly && x.placed && x.fact !== f?.fact);
  const locked = L.find((x) => x.clientOnly && x.fills.library === "CLIENT");
  if (!f || !g || !locked) { console.error("STOP  the sample has no suitable questions", { f: !!f, g: !!g, locked: !!locked }); process.exit(2); }
  const placement = (key: string) => sql(`select status || '|' || collected_from || '|v' || version from section_question where lineage_key='${key}' order by version desc limit 1`);
  const P0 = placement(f.fact);
  ok("C4.9 read: each row says who fills it in the shared library, with no change open", f.fills.library === "CLIENT" && f.fills.change === null && L.every((x) => "fills" in x), f.fills);

  // ---------------------------------------------------------------- propose: roles and refusals in words
  const propose = (key: string, b: any, actor = "user-A") => call("POST", `/library/fields/${encodeURIComponent(key)}/fills`, b, actor);
  let r = await propose(f.fact, { to: "CASE_OFFICER", reason: "Sample: the office holds it" }, "user-O");
  ok("C4.9 roles fail: a case officer cannot propose it (403)", r.status === 403, r.status);
  r = await propose(f.fact, { to: "CASE_OFFICER", reason: "Sample: the office holds it" }, "user-B");
  ok("C4.9 roles fail: an approver cannot propose it (403)", r.status === 403, r.status);
  r = await propose(f.fact, { to: "DOCUMENT", reason: "Sample: from a passport" });
  ok("C4.9 Q2 fail: only the client or the case officer is offered (400, in words)", r.status === 400 && /client or the case officer/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
  r = await propose(f.fact, { to: "CASE_OFFICER", reason: "abc" });
  ok("C4.9 fail: a reason under 5 characters is refused in words (400)", r.status === 400 && /at least 5 characters/.test(JSON.stringify(r.body)), r.status);
  r = await propose(f.fact, { to: "CLIENT", reason: "Sample: no change" });
  ok("C4.9 fail: proposing who already fills it is refused (409 Nothing changes)", r.status === 409 && /already filled by the client/.test(words(r)), words(r));
  r = await propose(locked.fact, { to: "CASE_OFFICER", reason: "Sample: try a declaration" });
  ok("C4.9 P-97 fail: a background or declaration question never changes (409, always the client), said with no code", r.status === 409 && /only the client answers it/.test(words(r)) && !KEYS.test(words(r)) && !/\bP-\d+\b/.test(words(r)), words(r));
  r = await propose("person.not_a_field", { to: "CASE_OFFICER", reason: "Sample: unknown" });
  ok("C4.9 fail: an unknown question is 404 in words", r.status === 404 && /not in the shared library/.test(words(r)), r.status);

  r = await propose(f.fact, { to: "CASE_OFFICER", reason: "Sample: the office holds this for every case" });
  ok("C4.9 pass: the author proposes the case officer for every combination; it waits for a second person", r.status === 201 && r.body?.status === "WAITING" && r.body?.uses >= 1 && !KEYS.test(r.body?.label ?? ""), r.body);
  const changeId = r.body?.id;
  ok("C4.9 pass: nothing changes before approval: the placement is as it was", placement(f.fact) === P0, `${P0} → ${placement(f.fact)}`);
  r = await propose(f.fact, { to: "CASE_OFFICER", reason: "Sample: again" });
  ok("C4.9 fail: a second proposal while one waits is refused (409 Already waiting)", r.status === 409 && /already waits/.test(words(r)), words(r));
  L = await list();
  ok("C4.9: the row shows the waiting change, who proposed it and why", L.find((x) => x.fact === f.fact)?.fills.change?.status === "WAITING" && L.find((x) => x.fact === f.fact)?.fills.change?.to === "CASE_OFFICER", L.find((x) => x.fact === f.fact)?.fills.change);

  // ---------------------------------------------------------------- To review: a second person approves
  const q = (await call("GET", `/review-queue?filter=all&kind=library_change`, undefined, "user-B")).body;
  const item = (q.items as any[]).find((x) => x.id === `change:${changeId}`);
  ok("C4.9 To review: the change is listed in words (Client → Case officer, used by, reason) with the second person's step", !!item && /Who fills it, for every combination: Client → Case officer/.test(item.what) && /Reason: Sample/.test(item.what) && item.state === "needs" && !KEYS.test(item.what), item?.what);
  r = await call("POST", `/library/changes/${changeId}/approve`, {}, "user-A");
  ok("C4.9 fail: the person who proposed it cannot approve it (403)", r.status === 403, r.status);
  r = await call("POST", `/library/changes/${changeId}/approve`, {}, "user-B");
  ok("C4.9 pass: a second person approves it; it is applied as a draft placement version for the case officer", r.status >= 200 && r.status < 300 && r.body?.status === "APPROVED" && /^DRAFT\|staff_working_view\|v/.test(placement(f.fact)), `${r.status} ${placement(f.fact)}`);
  L = await list();
  const fNow = L.find((x) => x.fact === f.fact && x.role === "principal");
  ok("C4.9: the rules follow the library: Comes from is now the case officer, the change says approved for the next release", fNow?.ruleSource === "AGENT" && fNow?.fills.change?.status === "APPROVED", { rule: fNow?.ruleSource, change: fNow?.fills.change?.status });
  ok("C4.9 QA-114: approved but not released, the library still says the client fills it (the released value); the change says the case officer from the next release", fNow?.fills.library === "CLIENT" && fNow?.fills.change?.to === "CASE_OFFICER", fNow?.fills);

  // ---------------------------------------------------------------- Review names it once; the release publishes it
  const c = (await call("GET", `/combinations/${wp}`)).body;
  const lines = (c.draft.changes as any[]).filter((x) => x.key === f.fact);
  ok("C4.8/C4.9: Review names it once, in words, for the immigration expert (no generic placement line)", lines.length === 1 && lines[0].kind === "Who fills a question" && lines[0].needs_sme && /filled by the case officer, was the client/.test(lines[0].label) && !KEYS.test(lines[0].label), lines.map((x) => `${x.kind}: ${x.label}`));
  // ---------------------------------------------------------------- the direct edit is locked
  const pl = sql(`select section_key || '|' || repeats from section_question where lineage_key='${f.fact}' order by version desc limit 1`).split("|");
  r = await call("POST", `/library/fields/${encodeURIComponent(g.fact)}/placement`, { sectionKey: sql(`select section_key from section_question where lineage_key='${g.fact}' order by version desc limit 1`), collectedFrom: "staff_working_view", repeats: sql(`select repeats from section_question where lineage_key='${g.fact}' order by version desc limit 1`) });
  ok("C4.9 Q3 fail: changing who fills an existing placement directly is refused (409, use Change who fills)", r.status === 409 && /use Change who fills/.test(words(r)), words(r));
  r = await call("POST", `/library/fields/${encodeURIComponent(f.fact)}/placement`, { sectionKey: pl[0], collectedFrom: "staff_working_view", repeats: pl[1] });
  ok("C4.9 Q3 pass: saving a placement that keeps who fills it is still allowed", r.status >= 200 && r.status < 300, `${r.status} ${words(r)}`);

  await sourceEveryNumber(PORT, wp); // G1 (C5.4): the release's numbers need a source before it is submitted
  r = await call("POST", `/combinations/${wp}/submit`, {});
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.9 pass: the next release publishes it (Release 2)", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  ok("C4.9 pass: the placement is published for the case officer, and the change is released in that pack", /^PUBLISHED\|staff_working_view/.test(placement(f.fact)) && /^RELEASED\|\d+$/.test(sql(`select status || '|' || coalesce(released_in::text,'') from library_change where id='${changeId}'`)), `${placement(f.fact)} · ${sql(`select status || '|' || coalesce(released_in::text,'') from library_change where id='${changeId}'`)}`);
  const rel = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;
  ok("C4.9: the released snapshot carries the new default", (rel.placements as any[]).find((p) => p.fact === f.fact)?.collected_from === "staff_working_view");
  L = await list();
  ok("C4.9: once released, the row has no open change", L.find((x) => x.fact === f.fact)?.fills.change === null);
  ok("C4.9 QA-114 pass: once released, the library says the case officer fills it", L.find((x) => x.fact === f.fact && x.role === "principal")?.fills.library === "CASE_OFFICER", L.find((x) => x.fact === f.fact)?.fills);

  // ---------------------------------------------------------------- a per-combination choice still wins (C4.10)
  const v = L.find((x) => x.fact === f.fact && x.role === "principal");
  r = await call("PUT", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent(f.fact)}`, { source: "CLIENT", version: v.version });
  ok("C4.9 + C4.10 pass: this combination may still choose the client for it (an override, reviewed at its release)", r.status === 200 && r.body?.source === "CLIENT" && r.body?.proposedBy === "Person", r.body?.source ?? words(r));

  // ---------------------------------------------------------------- returned; and checked again at approval
  r = await propose(g.fact, { to: "CASE_OFFICER", reason: "Sample: second question" });
  const gId = r.body?.id;
  r = await call("POST", `/library/changes/${gId}/return`, { note: "Sample: the client knows this best" }, "user-B");
  L = await list();
  ok("C4.9 fail: a returned change changes nothing and shows as returned", r.status >= 200 && r.status < 300 && L.find((x) => x.fact === g.fact)?.fills.change?.status === "RETURNED" && /client_questionnaire/.test(placement(g.fact)), `${r.status} ${placement(g.fact)}`);
  sql(`update library_change set status='WITHDRAWN' where id='${gId}'`);
  r = await propose(g.fact, { to: "CASE_OFFICER", reason: "Sample: third try" });
  const hId = r.body?.id;
  sql(`update section_question set collected_from='staff_working_view' where id=(select id from section_question where lineage_key='${g.fact}' order by version desc limit 1)`);
  r = await call("POST", `/library/changes/${hId}/approve`, {}, "user-B");
  ok("C4.9 fail: approval checks again: who fills it changed meanwhile, so nothing is applied and it waits again (409)", r.status === 409 && /changed after it was proposed/.test(words(r)) && sql(`select status from library_change where id='${hId}'`) === "WAITING", `${r.status} ${words(r)}`);

  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-questions-and-documents", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_who_fills.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
