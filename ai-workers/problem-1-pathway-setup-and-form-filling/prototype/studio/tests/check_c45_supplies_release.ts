// C4.5 (screens lane; challenge M2, BR-4 and BR-6): the facts a document supplies, end to end through a release, on the
// suites' fixture (the six cannot be released yet: C4.8's pack is red there, B70). The author changes the passport's
// facts (one dropped, one about the holder's spouse), a second person approves, the next release publishes the type and
// marks the change released, and the release line the immigration expert signs names the facts in words, never keys.
// Test words, not immigration values. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh screens_c45r 4446 start && tsx studio/tests/check_c45_supplies_release.ts 4446 xr_studio_screens_c45r
import { execFileSync } from "node:child_process";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (C5.4): a release needs every number sourced

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_screens_c45r";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const PASSPORT = "passport_or_travel_document_information_page_photocopy";
const KEYS = /\b(person|case|representative)\.[a-z_]+\b/;

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const now = sql(`select array_to_string(supplies_facts, ',') from document_type where document_type_key='${PASSPORT}' and status='PUBLISHED' order by version desc limit 1`).split(",").filter(Boolean);
  if (now.length < 3) { console.error("STOP  the fixture's passport supplies too few facts", now); process.exit(2); }
  const today = new Date().toISOString().slice(0, 10);
  const cite = (fact: string, about = "holder") => ({ fact, about, source: "Test words (fixture), page 1", quote: `Test: the passport shows ${fact}`, readOn: today });
  // One dropped (the last), one about the holder's spouse (the first): BR-4's whom-it-is-about.
  const after = now.slice(0, -1), spouseFact = after[0];
  const route = `/library/document-types/${PASSPORT}/supplies`;
  let r = await call("POST", route, { facts: after.map((f) => cite(f, f === spouseFact ? "holder.spouse" : "holder")), reason: "Test: drop one fact and say one is about the spouse (C4.5)." });
  const id = r.body?.id;
  ok("C4.5 pass: the author proposes the change; it waits", r.status < 300 && sql(`select status from library_change where id='${id}'`) === "WAITING", r.status >= 300 ? words(r) : r.body?.label);
  const v = (await call("GET", `/library/changes/${id}`, undefined, "user-B")).body?.supplies;
  ok("C4.5 pass (break M3): the second person reads the facts it supplies now and the one removed by name, never keys", v?.before?.length === now.length && v.removed?.length === 1 && ![...v.before, ...v.removed].some((x: string) => KEYS.test(x)), { before: v?.before?.slice(0, 3), removed: v?.removed });
  r = await call("POST", `/library/changes/${id}/approve`, { note: "Second person (C4.5 check)." }, "user-B");
  const draft = sql(`select array_to_string(supplies_facts, ',') || '|' || coalesce(supplies_about::text, '') || '|' || status from document_type where document_type_key='${PASSPORT}' order by version desc limit 1`);
  ok("C4.5 pass (BR-6): at approval a new draft version carries the facts and whom each is about; the change is approved, not released", r.status < 300 && draft.startsWith(`${after.join(",")}|`) && draft.includes(`"${spouseFact}": "holder.spouse"`) && draft.endsWith("|DRAFT") && sql(`select status from library_change where id='${id}'`) === "APPROVED", { status: r.status, draft });
  const lines = ((await call("GET", `/combinations/${wp}`)).body?.draft?.changes ?? []).filter((x: any) => x.kind === "Document type" && x.key === PASSPORT);
  ok("C4.5 pass (challenge m2): the release line the expert signs names the facts in words, never keys", lines.length === 1 && lines[0].needs_sme && !KEYS.test(lines[0].label), lines.map((x: any) => x.label));

  await sourceEveryNumber(PORT, wp);
  r = await call("POST", `/combinations/${wp}/submit`, {});
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.5 pass (BR-6): the next release goes out (Release 2)", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  const pub = sql(`select array_to_string(supplies_facts, ',') || '|' || status from document_type where document_type_key='${PASSPORT}' order by version desc limit 1`);
  ok("C4.5 pass (BR-6): the type is published with the new facts, and the change is released in that pack", pub === `${after.join(",")}|PUBLISHED` && /^RELEASED\|\d+$/.test(sql(`select status || '|' || coalesce(released_in::text, '') from library_change where id='${id}'`)), { pub, change: sql(`select status from library_change where id='${id}'`) });
  const rel = (await call("GET", `/combinations/${wp}/config?mode=published`)).body?.snapshot;
  const t = (rel?.document_types ?? []).find((x: any) => x.key === PASSPORT);
  ok("C4.5 pass: the released snapshot carries the facts and whom they are about", JSON.stringify(t?.supplies_facts) === JSON.stringify(after) && t?.supplies_about?.[spouseFact] === "holder.spouse", t);
  // Challenge m6: a supplied fact no question asks is accepted with a warning (it cannot be asked when the document is missing).
  // Test-only: every fact of the fixture is placed, so one fact's placements are retired for this call, then restored.
  const unplaced = "person.date_of_birth";
  const placedRows = sql(`select id || ':' || status from section_question where canonical_field_key='${unplaced}' and status in ('DRAFT','PUBLISHED')`).split("\n").filter(Boolean);
  sql(`update section_question set status='RETIRED' where id in (${placedRows.map((x) => `'${x.split(":")[0]}'`).join(",") || "null"})`);
  const other = sql(`select document_type_key from document_type where workspace_id=(select workspace_id from combination where id='${wp}') and document_type_key <> '${PASSPORT}' and status='PUBLISHED' order by 1 limit 1`);
  r = unplaced && other ? await call("POST", `/library/document-types/${other}/supplies`, { facts: [cite(unplaced)], reason: "Test: an unplaced fact (C4.5)." }) : { status: 0, body: null };
  ok("C4.5 pass (challenge m6): a supplied fact no question asks is accepted with a warning that it cannot be asked when the document is missing", r.status < 300 && (r.body?.warnings ?? []).some((w: any) => w.fact === unplaced && /cannot be asked when the document is missing/.test(w.why)), { unplaced, other, status: r.status, warnings: r.body?.warnings });
  if (r.body?.id) await call("POST", `/library/changes/${r.body.id}/withdraw`, { note: "Test only (C4.5)." });
  for (const x of placedRows) { const [rid, st] = x.split(":"); sql(`update section_question set status='${st}' where id='${rid}'`); }
  // Break M1: a field merged into another through the merge route (its newest version alone carries the mark) is refused.
  const keep = "person.citizenship", gone = sql(`select canonical_field_key from canonical_field where canonical_field_key in ('person.country_of_birth','person.birth_country') and status <> 'RETIRED' order by 1 limit 1`);
  let merged: { status: number; body: any } = { status: 0, body: null };
  // Break R2-M1: an approved change whose fact is merged afterwards can still be withdrawn (read through the merge).
  const was = sql(`select array_to_string(supplies_facts, ',') from document_type where document_type_key='${PASSPORT}' order by version desc limit 1`).split(",").filter(Boolean);
  r = gone ? await call("POST", route, { facts: (was.includes(gone) ? was.filter((f) => f === gone || f !== was.find((x) => x !== gone)) : [...was, gone]).map((f) => cite(f)), reason: "Test: a fact merged after approval (C4.5)." }) : { status: 0, body: null };
  const late = r.body?.id, lateWords = `${r.status} ${words(r).slice(0, 120)}`;
  const okA = late ? (await call("POST", `/library/changes/${late}/approve`, { note: "Second person (C4.5 check)." }, "user-B")).status : 0;
  if (gone) {
    const m = await call("POST", "/library/merges", { keep, merge: gone, reason: "Test: these two mean the same for this check only (C4.5)." });
    if (m.status < 300) merged = await call("POST", `/library/merges/${m.body?.id ?? m.body?.merge?.id}/approve`, { note: "Second person (C4.5 check)." }, "user-B");
    else merged = m;
  }
  const wd = late ? await call("POST", `/library/changes/${late}/withdraw`, { note: "Withdrawn after the merge (C4.5 check)." }) : { status: 0, body: null };
  const nowOther = sql(`select array_to_string(supplies_facts, ',') from document_type where document_type_key='${PASSPORT}' order by version desc limit 1`).split(",").filter(Boolean);
  ok("C4.5 pass (break R2-M1): an approved change whose fact was merged afterwards is withdrawn, its facts go back, and History says so", okA < 300 && okA > 0 && merged.status < 300 && wd.status < 300 && JSON.stringify([...nowOther].sort()) === JSON.stringify([...was].sort()) && Number(sql(`select count(*) from audit_event where entity='document type' and entity_key='${PASSPORT}' and action='withdrawn'`)) === 1 && /Approved: /.test(sql(`select coalesce(decision_note,'') || '|' || coalesce(decided_by,'') from library_change where id='${late}'`)), { propose: lateWords, approve: okA, merge: merged.status, withdraw: `${wd.status} ${words(wd).slice(0, 100)}`, was: was.length, now: nowOther.length });
  r = await call("POST", route, { facts: [cite(gone || "person.country_of_birth")], reason: "Test: a merged field (C4.5)." });
  ok("C4.5 BR-4 fail (break M1): a field merged into another through the merge route is refused (409, in words)", merged.status < 300 && r.status === 409 && /merged into another/.test(words(r)), { merge: merged.status, mergeWords: words(merged).slice(0, 120), status: r.status, words: words(r).slice(0, 120) });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
