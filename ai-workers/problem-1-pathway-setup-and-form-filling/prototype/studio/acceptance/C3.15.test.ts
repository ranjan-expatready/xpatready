// Acceptance C3.15 (P-220, pack 3): the author renames a shared field in the library drawer; the exact-duplicate check
// runs; a change of meaning needs a second person and a reason.
// Decisions, read word for word: P-96 (decisions/P-96-P-97.md: "A shared field's name is corrected directly … the
// exact-duplicate check still runs. A change of meaning keeps the second person."), amended by **P-266** (DECISIONS.md,
// 2 Nov: "A rename of a shared field that a released combination uses needs a second person … every other rename, label
// and alias stays direct and logged (P-96)"), P-116 amended ("a meaning edit makes a new version with a second person"),
// P-253 (one guarded change: "a fixed rules check (type, source and reason …)"), Screen 04 concept BR-6, BR-8; the tech
// lead's answers on #295 (a meaning change needs a reason; the duplicate check also sees names waiting in open library
// changes; a stale version is refused).
// Pack updated 3 Nov to P-266 in the PR that fixes the meaning-change reason (P-291: a decision that changes behaviour
// changes its pack). Before, three checks expected a direct rename of K, a field the released Visitor visa uses; P-266
// makes that rename wait for a second person (202), so they now check that route, and the direct route of P-96 is checked
// on a field no release uses. Either second-person route for a meaning change counts: a library change approved by
// another person, or the draft version released by another person. US$0.
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
const name = (key: string) => `/library/fields/${encodeURIComponent(key)}/name`;
/** The fingerprint the rename dialog sends as `expected` (G-CORE: the door's check of this rename on the library now). */
const fingerprint = async (key: string, nm: string) => String((await call("POST", "/change-sets/check", { items: [{ action: "rename", kind: "field", key, name: nm }] })).body?.fingerprint ?? "");

(async () => {
  const ws = sql(`select workspace_id from combination where combination_key = 'vv.single'`);
  // Two published person fields in the same group, both used on the Visitor visa's IMM 5707 (released by the setup).
  const pair = sql(`select f.canonical_field_key from canonical_field f where f.status = 'PUBLISHED' and f.merged_into_key is null and f.group_key is not null and f.canonical_field_key in (select m.canonical_field_key from form_field_map m join form_edition e on e.id = m.form_edition_id join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5707') and f.group_key = (select group_key from canonical_field where status = 'PUBLISHED' and group_key is not null group by group_key order by count(*) desc limit 1) order by 1 limit 2`).split("\n").filter(Boolean);
  const inRelease = (key: string) => Number(sql(`select count(*) from config_release r where r.snapshot->'canonical_fields' @> jsonb_build_array(jsonb_build_object('id', '${key}'))`)) > 0;
  // A published field no release carries: P-96's direct rename still applies to it (P-266 "every other rename"). Every
  // field of the sample is in a release, so the pack adds one (a test row, as the waiting ADD below), never released.
  const free = `case.acceptance_unreleased_${tag}`;
  if (ws) sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, label, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, group_key) values ('${randomUUID()}', '${ws}', '${free}', 1, 'PUBLISHED', 'Acceptance unreleased ${tag}', 'A field no release uses (acceptance C3.15 test row)', 'text', 'STRING', 'CLIENT_LEVEL', 'CASE', 'HUMAN', '${AUTHOR}', 'case')`);
  if (!ws || pair.length < 2 || !inRelease(pair[0]) || inRelease(free)) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (two published fields of one group on IMM 5707, the Visitor visa released, one field no release uses)", { pair, released: pair[0] && inRelease(pair[0]), free }); process.exit(2); }
  const [K, OTHER] = pair;
  const otherName = newest(OTHER).label || sql(`select label from canonical_field where canonical_field_key = '${OTHER}' and label is not null limit 1`);
  const changes = () => Number(sql(`select count(*) from library_change`));

  // ── Roles ──
  const cur0 = newest(K).label;
  const sme = await call("PATCH", name(K), { name: `By reviewer ${tag}` }, SME);
  const off = await call("PATCH", name(K), { name: `By officer ${tag}` }, OFFICER);
  ok("C3.15 fail: a person without the author duty cannot rename (403 in words), the name unchanged", sme.status === 403 && off.status === 403 && newest(K).label === cur0, [sme.status, off.status]);

  // ── P-266: a field a released combination uses is renamed through a second person ──
  const before = newest(K), changesBefore = changes();
  const nm = `Acceptance name ${tag}`;
  const staleFp = await fingerprint(K, `Stale ${tag}`); // taken now; the approval below changes the field, so it goes stale
  const r = await call("PATCH", name(K), { name: nm, expected: await fingerprint(K, nm) });
  const change = sql(`select id from library_change where kind = 'field' and key = '${K}' and action = 'RENAME' and status = 'WAITING' order by proposed_at desc limit 1`);
  ok("C3.15 P-266 pass: renaming a field the released Visitor visa uses waits for a second person: 202, one waiting library change (rename) naming the new name, and nothing changes yet", r.status === 202 && r.body?.applied === false && r.body?.tier === "second_person" && !!change && changes() === changesBefore + 1 && newest(K).label === before.label && newest(K).version === before.version, { status: r.status, tier: r.body?.tier, change, newest: newest(K) });
  const second = await call("PATCH", name(K), { name: `Second ${tag}` });
  ok("C3.15 P-266 fail: a second rename while one waits is refused (409) in words; one rename of an item waits at a time", second.status === 409 && /already waiting for a second person/.test(words(second)) && newest(K).label === before.label, { status: second.status, words: words(second) });
  const own = await call("POST", `/library/changes/${change}/approve`, { note: "own" }, AUTHOR);
  ok("C3.15 P-266 fail (BR-8): the author cannot approve their own rename (403); the name unchanged", own.status === 403 && newest(K).label === before.label, own.status);
  const ap = await call("POST", `/library/changes/${change}/approve`, { note: "acceptance: approved by the second person" }, APPROVER);
  const after = newest(K);
  ok("C3.15 P-266 pass: a different person approves; a new draft version carries the name, the earlier version is kept, the meaning is as it was", ap.status >= 200 && ap.status < 300 && after.label === nm && after.status === "DRAFT" && after.version === before.version + 1 && after.meaning === before.meaning && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${K}' and version = ${before.version}`)) === 1, { status: ap.status, words: words(ap), before, after });

  // ── P-96 (still, P-266 "every other rename"): a field no release uses is renamed directly ──
  const fb = newest(free), freeChanges = changes(), freeName = `Direct name ${tag}`;
  const d = await call("PATCH", name(free), { name: freeName, expected: await fingerprint(free, freeName) });
  const fa = newest(free);
  ok("C3.15 P-96 pass: a field no release uses is renamed directly and versioned: 200, a new draft version (one above the earlier one) carries the name, the earlier published version is kept, no library change, in the activity", d.status === 200 && d.body?.applied === true && fa.label === freeName && fa.status === "DRAFT" && fa.version === fb.version + 1 && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${free}' and version = ${fb.version} and status = 'PUBLISHED'`)) === 1 && changes() === freeChanges && Number(sql(`select count(*) from audit_event where action = 'renamed' and summary like '%${freeName}%'`)) === 1, { status: d.status, tier: d.body?.tier, fb, fa });

  // ── Exact-duplicate check (BR-6) ──
  const dup = await call("PATCH", name(K), { name: `  ${otherName.toUpperCase()} ` });
  ok("C3.15 BR-6 fail: another field's name in the same group (any case, spaces) is refused 409 in words naming it", dup.status === 409 && words(dup).length > 10 && !/already waiting/.test(words(dup)) && newest(K).label === nm && changes() === freeChanges, { status: dup.status, words: words(dup) });
  const waitingName = `Waiting name ${tag}`;
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values ('${randomUUID()}', '${ws}', 'field', '${K.split(".")[0]}.acceptance_waiting_${tag}', '${waitingName}', 'ADD', 'acceptance C3.15', 'WAITING', '${AUTHOR}')`);
  const dupWaiting = await call("PATCH", name(K), { name: waitingName });
  // The same waiting name is free in another group: the free field is in the case group, the waiting Add in K's group.
  const otherGroup = await call("PATCH", name(free), { name: waitingName, expected: await fingerprint(free, waitingName) });
  ok("C3.15 BR-6 fail: a name waiting for the second person in an open library change for the same group (its key's first part) is refused too (409); the same name in another group is not (200)", dupWaiting.status === 409 && newest(K).label === nm && otherGroup.status === 200 && newest(free).label === waitingName, { status: dupWaiting.status, words: words(dupWaiting), otherGroup: otherGroup.status, otherWords: words(otherGroup) });
  sql(`delete from library_change where reason = 'acceptance C3.15'`);
  const stale = await call("PATCH", name(K), { name: `Stale ${tag}`, expected: staleFp });
  ok("C3.15 fail (concept §6 version; G-CORE fingerprint): a rename confirmed from a check made before someone changed the field is refused 409 \"Look again\", nothing changed", stale.status === 409 && stale.body?.title === "Look again" && newest(K).label === nm && changes() === freeChanges, { status: stale.status, title: stale.body?.title, words: words(stale) });

  // ── A change of meaning needs a reason and a second person (P-96, P-116 amended, P-253, BR-8; #295) ──
  const meaningBefore = newest(OTHER).meaning;
  const bare = await call("PATCH", `/library/fields/${encodeURIComponent(OTHER)}`, { meaning: `Direct ${tag}: a meaning sent without a reason` });
  ok("C3.15 fail (P-253; tech lead on #295): a meaning change sent without a reason is refused in words (400), nothing proposed or changed", bare.status === 400 && /Say why the meaning changes/.test(words(bare)) && newest(OTHER).meaning === meaningBefore, { status: bare.status, words: words(bare) });
  const meaning = `Acceptance meaning ${tag}: the date the person last entered the country`;
  const published = () => sql(`select meaning from canonical_field where canonical_field_key = '${K}' and status = 'PUBLISHED' order by version desc limit 1`);
  const changesM = changes();
  const m = await call("PATCH", `/library/fields/${encodeURIComponent(K)}`, { meaning, reason: "acceptance: the meaning on IMM 5707 is narrower" });
  const mChange = sql(`select id from library_change where kind = 'field' and key = '${K}' and action <> 'RENAME' and status = 'WAITING' order by proposed_at desc limit 1`);
  ok("C3.15 pass (P-96, P-116 amended): a meaning change with its reason is not live: the published meaning stays (a waiting library change, or a new draft version, which goes out only with a release a different person approves: BR-14, check_screen01_release_race.ts and C10.1 row 10), and the reason is kept in the activity", m.status >= 200 && m.status < 300 && published() !== meaning && (mChange !== "" || (newest(K).status === "DRAFT" && newest(K).meaning === meaning && changes() === changesM)) && Number(sql(`select count(*) from audit_event where summary like '%IMM 5707 is narrower%'`)) >= 1, { status: m.status, words: words(m), mChange, newest: newest(K).status });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
