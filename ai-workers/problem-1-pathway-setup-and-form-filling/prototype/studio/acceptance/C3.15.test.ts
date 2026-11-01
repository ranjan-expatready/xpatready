// Acceptance C3.15 (P-220, pack 3): the author renames a shared field in the library drawer: direct, versioned, the
// exact-duplicate check runs; a change of meaning needs a second person (P-96 in decisions/P-96-P-97.md; P-116 amended:
// "a meaning edit makes a new version with a second person"; Screen 04 concept BR-6, BR-8). Status: Works (qa, 25cefb67):
// the rename is direct and versioned with the duplicate check, and a meaning edit makes a DRAFT version that goes out
// only through review and release by a different person. Most checks here guard that. Still red on main, by the tech
// lead's answers on #295: a meaning change needs a reason (400 without), the duplicate check also sees names waiting in
// open library changes ("same group" = the key's first part), and a stale version is refused. Either second-person
// route counts: a library change approved by another person, or the draft version released by another person. US$0.
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept \
//     && tsx studio/acceptance/C3.15.test.ts 4448 xr_studio_accept
import { randomUUID } from "node:crypto";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", APPROVER = "user-B", SME = "user-C", OFFICER = "user-O";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const newest = (key: string) => { const [version, status, label, meaning] = sql(`select version || '§' || status || '§' || coalesce(label, '') || '§' || meaning from canonical_field where canonical_field_key = '${key}' order by version desc limit 1`).split("§"); return { version: Number(version), status, label, meaning }; };
const tag = Date.now().toString(36);

(async () => {
  const ws = sql(`select workspace_id from combination where combination_key = 'vv.single'`);
  // Two published person fields in the same group, both used on the Visitor visa's IMM 5707.
  const pair = sql(`select f.canonical_field_key from canonical_field f where f.status = 'PUBLISHED' and f.merged_into_key is null and f.group_key is not null and f.canonical_field_key in (select m.canonical_field_key from form_field_map m join form_edition e on e.id = m.form_edition_id join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5707') and f.group_key = (select group_key from canonical_field where status = 'PUBLISHED' and group_key is not null group by group_key order by count(*) desc limit 1) order by 1 limit 2`).split("\n").filter(Boolean);
  if (!ws || pair.length < 2) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (two published fields of one group on IMM 5707)", pair); process.exit(2); }
  const [K, OTHER] = pair;
  const otherName = newest(OTHER).label || sql(`select label from canonical_field where canonical_field_key = '${OTHER}' and label is not null limit 1`);

  // ── Rename: direct and versioned (P-96) ──
  const before = newest(K), changesBefore = Number(sql(`select count(*) from library_change`));
  const name = `Acceptance name ${tag}`;
  const r = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name, version: before.version });
  const after = newest(K);
  ok("C3.15 pass (P-96): the author renames directly: 200, a new draft version carries the name, the old version is kept", r.status === 200 && after.label === name && after.status === "DRAFT" && (before.status !== "PUBLISHED" || after.version === before.version + 1) && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${K}' and version = ${before.version}`)) === 1, { status: r.status, before, after });
  ok("C3.15 pass (P-96): a rename needs no second person (no library change) and is in the activity", Number(sql(`select count(*) from library_change`)) === changesBefore && Number(sql(`select count(*) from audit_event where action = 'renamed' and summary like '%${name}%'`)) === 1);
  ok("C3.15: the rename leaves the meaning as it was", after.meaning === before.meaning);

  // ── Exact-duplicate check (BR-6) ──
  const dup = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name: `  ${otherName.toUpperCase()} ` });
  ok("C3.15 BR-6 fail: another field's name in the same group (any case, spaces) is refused 409 in words naming it", dup.status === 409 && words(dup).length > 10 && newest(K).label === name, { status: dup.status, words: words(dup) });
  const waitingName = `Waiting name ${tag}`;
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values ('${randomUUID()}', '${ws}', 'field', '${K.split(".")[0]}.acceptance_waiting_${tag}', '${waitingName}', 'ADD', 'acceptance C3.15', 'WAITING', '${AUTHOR}')`);
  let cur = newest(K).label;
  const dupWaiting = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name: waitingName });
  ok("C3.15 BR-6 fail: a name waiting for the second person in an open library change for the same group (its key's first part) is refused too (409; Question for the tech lead: library_change has no group column)", dupWaiting.status === 409 && newest(K).label === cur, { status: dupWaiting.status, words: words(dupWaiting) });
  sql(`delete from library_change where reason = 'acceptance C3.15'`);
  cur = newest(K).label;
  const stale = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name: `Stale ${tag}`, version: before.version });
  ok("C3.15 fail (concept §6 version): a rename sent from a version someone has since changed is refused 409 \"Changed since\"", stale.status === 409 && newest(K).label === cur, { status: stale.status, words: words(stale) });

  // ── Roles ──
  cur = newest(K).label;
  const sme = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name: `By reviewer ${tag}` }, SME);
  const off = await call("PATCH", `/library/fields/${encodeURIComponent(K)}/name`, { name: `By officer ${tag}` }, OFFICER);
  ok("C3.15 fail: a person without the author duty cannot rename (403 in words), the name unchanged", sme.status === 403 && off.status === 403 && newest(K).label === cur, [sme.status, off.status]);

  // ── A change of meaning needs a second person (P-96, P-116 amended, BR-8) ──
  const meaning = `Acceptance meaning ${tag}: the date the person last entered the country`;
  const m = await call("PATCH", `/library/fields/${encodeURIComponent(K)}`, { meaning, reason: "acceptance: the meaning on IMM 5707 is narrower" });
  const change = sql(`select id from library_change where kind = 'field' and key = '${K}' and status = 'WAITING' order by proposed_at desc limit 1`);
  const published = () => sql(`select meaning from canonical_field where canonical_field_key = '${K}' and status = 'PUBLISHED' order by version desc limit 1`);
  ok("C3.15 pass (P-96, P-116 amended): a meaning change by the author is not live: the published meaning stays until a different person approves (a waiting library change, or a draft version that goes out with a release)", m.status >= 200 && m.status < 300 && published() !== meaning && (change !== "" || (newest(K).status === "DRAFT" && newest(K).meaning === meaning)), { status: m.status, words: words(m), change, newest: newest(K).status });
  if (change) {
    const own = await call("POST", `/library/changes/${change}/approve`, { note: "own" }, AUTHOR);
    ok("C3.15 fail (BR-8): the author cannot approve their own meaning change (403), the meaning unchanged", own.status === 403 && published() !== meaning, own.status);
    const ap = await call("POST", `/library/changes/${change}/approve`, { note: "acceptance: approved by the second person" }, APPROVER);
    ok("C3.15 pass: a different person approves; a new version carries the new meaning, the earlier version kept for releases and cases", ap.status >= 200 && ap.status < 300 && newest(K).meaning === meaning && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${K}' and meaning <> '${meaning.replace(/'/g, "''")}'`)) >= 1, { status: ap.status, newest: newest(K) });
  } else {
    // The draft route: the release that publishes it is submitted by the author and approved by another person (every
    // release, check_screen01_release_race.ts and C10.1 row 10); the earlier version stays for releases and cases.
    ok("C3.15 pass (draft route): the new meaning sits in a new draft version and the earlier published version is kept", newest(K).status === "DRAFT" && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${K}' and status = 'PUBLISHED'`)) >= 1);
  }
  const direct = await call("PATCH", `/library/fields/${encodeURIComponent(OTHER)}`, { meaning: `Direct ${tag}` });
  ok("C3.15 fail (tech lead on #295): a meaning change sent without a reason is refused in words (400), nothing proposed or changed", direct.status === 400 && newest(OTHER).meaning !== `Direct ${tag}`, { status: direct.status, words: words(direct) });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
