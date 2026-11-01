// F6 / C4.8 (runtime lane; P-76, P-174): a change to a combination's questionnaire (the SQR: which library sections it
// shows) is part of the combination's one review and release, with sources, forms, documents and rules; there is no
// separate questionnaire approval. The section choice follows the same locks as every draft change: only an author, never
// on a retired combination, only a section the shared library has. check_pqr.ts proves the same for the PQR tick.
// A pass and a fail per rule, on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_c48 4437 start && tsx studio/tests/check_c48_sqr_release.ts 4437 xr_studio_runtime_c48
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_c48";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const KEYS = /\b[a-z]+_[a-z_]+\b/;
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
  const vv = sql(`select id from combination where combination_key='vv.single'`);
  const key = sql(`select section_key from sqr_section_selection where combination_id='${wp}' order by section_order desc limit 1`);
  const title = sql(`select title from logical_section where section_key='${key}' order by version desc limit 1`);
  const chosen = (id: string) => sql(`select count(*) from sqr_section_selection where combination_id='${id}' and section_key='${key}'`) === "1";
  const released = async () => (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;
  const inRelease = (s: any) => (s.sections as { id: string }[]).some((x) => x.id === key);
  const r0 = await released();
  const vvChanges = async () => JSON.stringify((await call("GET", `/combinations/${vv}`)).body.draft.changes);
  const vv0 = await vvChanges();
  ok("setup: the sample's release 1 asks the last section of the questionnaire", !!key && !!title && inRelease(r0) && chosen(wp), { key, title });

  // ---------------------------------------------------------------- a section change is a named draft change
  let r = await call("DELETE", `/combinations/${wp}/sections/${key}`, undefined, "user-B");
  ok("C4.8 roles fail: the Approver cannot change the questionnaire (403), nothing changes", r.status === 403 && chosen(wp), r.status);
  r = await call("DELETE", `/combinations/${wp}/sections/${key}`);
  let c = (await call("GET", `/combinations/${wp}`)).body;
  const line = (c.draft.changes as any[]).find((x) => x.kind === "Section" && x.key === key);
  ok("C4.8 pass: removing a section is one named change of the combination's draft", r.status === 200 && !!line && line.change === "removed" && c.draft.matches_release === false, line ?? c.draft.changes);
  ok("C4.8 fail-guard: the change on Review is said in words, not as a system name", !!line && !KEYS.test(line.label), line?.label);
  const audit = sql(`select summary from audit_event where combination_id='${wp}' and entity='section selection' order by at desc limit 1`);
  ok("C4.8: the history line names the section by its title, not its system name", audit.includes(`"${title}"`) && !audit.includes(key), audit);
  ok("C4.8 fail: the released questionnaire still asks it until the next release", inRelease(await released()));
  ok("C4.8 fail: another combination's draft is unchanged (P-132: one record per combination)", (await vvChanges()) === vv0);

  // ---------------------------------------------------------------- no questionnaire approval of its own
  for (const path of ["sqr/submit", "sqr/approve", "sqr/release", "questionnaire/approve"]) {
    r = await call("POST", `/combinations/${wp}/${path}`, {}, "user-B");
    ok(`C4.8 fail: no separate questionnaire approval route (${path} is 404)`, r.status === 404, r.status);
  }
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.8 fail: the change is not released before the combination is submitted", r.status >= 400 && inRelease(await released()), `${r.status} ${words(r).slice(0, 120)}`);

  // ---------------------------------------------------------------- one review and release
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C4.8 pass: the combination is submitted with its questionnaire change", r.status === 201 || r.status === 200, words(r) || r.status);
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const summary = ((review.submission?.changeSummary ?? []) as any[]).map((x) => `${x.kind}|${x.key}`);
  ok("C4.8: the submitted summary carries the section line", summary.includes(`Section|${key}`), summary);
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-A");
  ok("C4.8 fail: the author cannot approve it: the Approver releases it", r.status >= 400 && inRelease(await released()), `${r.status} ${words(r).slice(0, 120)}`);
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.8 pass: one release (Release 2) publishes the questionnaire change with everything else", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  const r2 = await released();
  ok("C4.8 pass: the released questionnaire no longer has the section; the draft equals the release", !inRelease(r2) && (await call("GET", `/combinations/${wp}`)).body.draft.matches_release === true);

  // ---------------------------------------------------------------- the same locks as every draft change
  r = await call("POST", `/combinations/${wp}/sections/no_such_section`, {});
  ok("C4.8 fail: a section the shared library does not have is refused (404, in words); nothing is stored", r.status === 404 && /not in the shared library/.test(words(r)) && sql(`select count(*) from sqr_section_selection where section_key='no_such_section'`) === "0", `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${wp}/sections/${key}`, {});
  c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.8 pass: adding it back is again one named change (added), for the next release", r.status === 201 || r.status === 200 ? (c.draft.changes as any[]).some((x) => x.kind === "Section" && x.key === key && x.change === "added") : false, c.draft.changes);
  // A retired combination (retiring goes through its own approval; set here as that approval would leave it).
  sql(`update combination set retired_at = now() where id='${vv}'`);
  sql(`insert into sqr_section_selection (id, workspace_id, combination_id, section_key, section_order) select gen_random_uuid(), workspace_id, id, '${key}', 0 from combination where id='${vv}' on conflict do nothing`);
  const before = sql(`select count(*) from sqr_section_selection where combination_id='${vv}'`);
  r = await call("DELETE", `/combinations/${vv}/sections/${key}`);
  ok("C4.8 fail: a retired combination's questionnaire is not changed (409, in words)", r.status === 409 && /is retired/.test(words(r)) && sql(`select count(*) from sqr_section_selection where combination_id='${vv}'`) === before, `${r.status} ${words(r)}`);
  r = await call("POST", `/combinations/${vv}/sections/${sql(`select section_key from logical_section where section_key <> '${key}' limit 1`)}`, {});
  ok("C4.8 fail: nor can a section be added to it (409); nothing is stored", r.status === 409 && sql(`select count(*) from sqr_section_selection where combination_id='${vv}'`) === before, r.status);
  sql(`update combination set retired_at = null where id='${vv}'`);
  r = await call("POST", `/combinations/00000000-0000-0000-0000-000000000000/sections/${key}`, {});
  ok("C4.8 fail: an unknown combination is 404 in words (never a 500)", r.status === 404, `${r.status} ${words(r)}`);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
