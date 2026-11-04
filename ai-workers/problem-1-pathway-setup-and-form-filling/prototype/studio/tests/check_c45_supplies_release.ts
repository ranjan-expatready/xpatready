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
  // A merged shared field is refused (BR-4): test-only, one of the passport's facts is marked merged for this call.
  sql(`update canonical_field set merged_into_key='person.no_such_target' where canonical_field_key='${now.at(-1)}'`);
  let r = await call("POST", route, { facts: [cite(now.at(-1)!)], reason: "Test: a merged field (C4.5)." });
  sql(`update canonical_field set merged_into_key=null where canonical_field_key='${now.at(-1)}'`);
  ok("C4.5 BR-4 fail: a shared field merged into another is refused (409, in words)", r.status === 409 && /merged into another/.test(words(r)), words(r));
  r = await call("POST", route, { facts: after.map((f) => cite(f, f === spouseFact ? "holder.spouse" : "holder")), reason: "Test: drop one fact and say one is about the spouse (C4.5)." });
  const id = r.body?.id;
  ok("C4.5 pass: the author proposes the change; it waits", r.status < 300 && sql(`select status from library_change where id='${id}'`) === "WAITING", r.status >= 300 ? words(r) : r.body?.label);
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
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
