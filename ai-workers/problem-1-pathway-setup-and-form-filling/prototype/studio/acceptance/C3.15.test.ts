// Acceptance C3.15 (P-220, pack 3): the author renames a shared field in the library drawer: direct, versioned, the
// exact-duplicate check runs; a change of meaning needs a second person (P-96 in decisions/P-96-P-97.md; P-116 amended:
// "a meaning edit makes a new version with a second person"; Screen 04 concept BR-6, BR-8). Status today: Not built in
// qa's table; on main PATCH /library/fields/:key/name renames directly and versioned with a duplicate check (queue
// item 2a), but (1) PATCH /library/fields/:key changes the meaning directly with no second person, (2) the duplicate
// check does not see names waiting in open library changes, (3) a stale version is not refused. Rules only, US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept \
//     && tsx studio/acceptance/C3.15.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
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
  ok("C3.15 BR-6 fail: a name waiting for the second person in an open library change is refused too (409)", dupWaiting.status === 409 && newest(K).label === cur, { status: dupWaiting.status, words: words(dupWaiting) });
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
  ok("C3.15 pass (P-96): a meaning change by the author is proposed, not applied: a library change waits for the second person", m.status >= 200 && m.status < 300 && change !== "" && newest(K).meaning !== meaning, { status: m.status, words: words(m), change });
  const own = change ? await call("POST", `/library/changes/${change}/approve`, { note: "own" }, AUTHOR) : { status: 0, body: null };
  ok("C3.15 fail (BR-8): the author cannot approve their own meaning change (403), the meaning unchanged", own.status === 403 && newest(K).meaning !== meaning, own.status);
  const ap = change ? await call("POST", `/library/changes/${change}/approve`, { note: "acceptance: approved by the second person" }, APPROVER) : { status: 0, body: null };
  ok("C3.15 pass: a different person approves; a new version carries the new meaning, the earlier version is kept for releases and cases", ap.status >= 200 && ap.status < 300 && newest(K).meaning === meaning && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${K}' and meaning <> '${meaning.replace(/'/g, "''")}'`)) >= 1, { status: ap.status, newest: newest(K) });
  const direct = await call("PATCH", `/library/fields/${encodeURIComponent(OTHER)}`, { meaning: `Direct ${tag}` });
  ok("C3.15 fail: a meaning change sent without a reason is refused in words (400), nothing proposed or changed", direct.status === 400 && newest(OTHER).meaning !== `Direct ${tag}`, { status: direct.status, words: words(direct) });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
