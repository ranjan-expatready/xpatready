// G-CORE B2 (P-253, P-266, P-96; concept screens/G-CORE-guarded-change/concept.md v2 BR-1 … BR-6; rows C11.13, C11.14;
// bug QA-167): rename and merge go through the change-set door, through the API on an isolated copy with the six
// combinations' sample. A rename of a field a released combination uses waits for a second person (QA-167); any other
// rename stays direct and logged; merges are checked when proposed and again when approved; a stale preview answers
// "look again"; every change set records who made it; a rename rolls back through the same door. A passing and a
// failing case per rule. No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_gcore2 4457 start && tsx studio/tests/check_gcore_b2_door.ts 4457 xr_studio_forms_gcore2
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedAnswerList, seedField, seedSection } from "./seed_library.cjs";

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_gcore2";
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const label = (key: string) => sql(`select coalesce(label, '') || '|' || case when label_checked then 't' else 'f' end from canonical_field where canonical_field_key = '${key}' order by version desc limit 1`);
const title = (key: string) => sql(`select title from logical_section where section_key = '${key}' order by version desc limit 1`);
const shownOf = (key: string, l: string) => { const [a, b] = l.split("|"); return b === "t" && a ? a : key; };
const sets = () => Number(sql("select count(*) from change_set"));
const check = (items: unknown[]) => call("POST", "/change-sets/check", { items });
const uniq = Date.now().toString(36);

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);

  // ─────────── QA-167 / C11.13 / P-266: a rename of a field a released combination uses waits for a second person
  const FIELD = "person.family_name", NEW = `Last name ${uniq} (Sample)`;
  const rel = sql(`select r.combination_id from config_release r where r.snapshot->'canonical_fields' @> jsonb_build_array(jsonb_build_object('id', '${FIELD}')) order by r.version desc limit 1`);
  ok("setup: a released combination carries the field", /^[0-9a-f-]{36}$/.test(rel), rel);
  const before = label(FIELD), n0 = sets();
  const chk = await check([{ action: "rename", kind: "field", key: FIELD, name: NEW }]);
  ok("QA-167 step 1: the guarded check rates this rename 'second person' (P-266)", chk.body?.tier?.tier === "second_person", chk.body?.tier);
  let r = await call("PATCH", `/library/fields/${FIELD}/name`, { name: NEW, expected: chk.body?.fingerprint });
  ok("QA-167 fixed (C11.13 pass): one author's rename of a released field does not take effect alone: 202, waits for a second person, the name unchanged",
    r.status === 202 && r.body.applied === false && r.body.status === "WAITING" && r.body.tier === "second_person" && r.body.name === NEW && label(FIELD) === before, { status: r.status, body: r.body, before, after: label(FIELD) });
  const changeId = r.body?.change_id, setId = r.body?.change_set;
  ok("G-CORE BR-4 pass: it is a WAITING rename on To review, with the name before and after", sql(`select status || '|' || action || '|' || label || '|' || (matches->>'before') from library_change where id = '${changeId}'`) === `WAITING|RENAME|${NEW}|${shownOf(FIELD, before)}`, sql(`select row_to_json(c) from library_change c where id = '${changeId}'`));
  ok("G-CORE BR-5 pass: its change set is recorded: made by a person, the author, waiting, linked to the library change, tier and fingerprint",
    sets() === n0 + 1 && sql(`select made_by || '|' || actor || '|' || status || '|' || tier || '|' || (library_change_id = '${changeId}') || '|' || length(fingerprint) from change_set where id = '${setId}'`) === "person|user-A|waiting|second_person|true|64");
  const queue = await call("GET", `/library/changes/${changeId}`);
  ok("G-CORE BR-4: the second person reads it in words (Rename shared field, before → after)", queue.body?.action_word === "Rename" && queue.body?.rename?.after === NEW && queue.body?.recheck?.ok === true, [queue.body?.action_word, queue.body?.rename, queue.body?.recheck]);
  ok("Review B2 m1: the name before is in words, never the key", !!queue.body?.rename?.before && !queue.body.rename.before.includes("."), queue.body?.rename);
  r = await call("PATCH", `/library/fields/${FIELD}/name`, { name: `Other ${uniq} (Sample)` });
  ok("G-CORE fail: a second rename of the same field while one waits is refused in words, nothing written", r.status === 409 && /already waiting for a second person/.test(r.body?.detail) && sets() === n0 + 1, [r.status, r.body?.detail]);
  r = await call("POST", `/library/changes/${changeId}/approve`, {}, "user-A");
  ok("C11.13 fail: the author does not approve their own rename (403), the name unchanged", r.status === 403 && label(FIELD) === before, [r.status, r.body?.detail]);
  r = await call("POST", `/library/changes/${changeId}/approve`, {}, "user-B");
  ok("C11.13 pass: a second person approves: the new name applies as a draft version, the change set is applied with its before-image",
    r.status < 300 && label(FIELD) === `${NEW}|t` && sql(`select status || '|' || (before->'before'->>'shown') from change_set where id = '${setId}'`) === `applied|${shownOf(FIELD, before)}`, [r.status, r.body?.detail, label(FIELD)]);
  ok("C11.13 pass: the approval is on the activity log in words", /approved renaming field person\.family_name from .* to "Last name .*" \(proposed by Configuration author/.test(sql(`select summary from audit_event where action = 'renamed' and entity_key = '${FIELD}' order by at desc limit 1`)));

  // ─────────── P-96: every other rename stays direct and logged (a field no release carries)
  const draft = seedField(sql, { key: `person.gcore_b2_${uniq}`, meaning: "G-CORE B2 test field (Sample)", review: false });
  const n1 = sets();
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: `Draft name ${uniq}` });
  const direct = r.body?.change_set;
  ok("P-96 pass: a rename of a field no released combination uses applies at once (200), logged", r.status === 200 && r.body.applied === true && r.body.tier === "direct" && label(draft) === `Draft name ${uniq}|t` && /renamed field person\.gcore_b2_.* to "Draft name/.test(sql(`select summary from audit_event where action='renamed' and entity_key='${draft}' order by at desc limit 1`)), r.body);
  ok("G-CORE BR-5, BR-6 pass: its change set is applied, made by a person, with the before-image a roll-back needs", sets() === n1 + 1 && sql(`select made_by || '|' || status || '|' || tier || '|' || (before->'before'->'restore'->>'labelChecked') from change_set where id = '${direct}'`) === "person|applied|direct|false");

  // ─────────── BR-2: the fixed rules check refuses in words, nothing written
  const twin = sql(`select canonical_field_key || '|' || label from canonical_field where group_key = 'person' and canonical_field_key not in ('${FIELD}', '${draft}') and status in ('DRAFT','PUBLISHED') and merged_into_key is null and label is not null order by 1 limit 1`).split("|");
  const n2 = sets();
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: twin[1].toUpperCase() });
  ok("G-CORE R3 fail: a name another field of the group has is refused in words (409), nothing written", r.status === 409 && /is already the name of .* in this group\. If they mean the same, merge them/.test(r.body?.detail) && /Nothing was changed\./.test(r.body?.detail) && sets() === n2 && label(draft) === `Draft name ${uniq}|t`, [twin, r.status, r.body?.detail]);
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: "Name‮with a direction mark" });
  ok("G-CORE R1 fail: a name with a direction character is refused in words, nothing written", r.status === 409 && /direction characters/.test(r.body?.detail) && sets() === n2, [r.status, r.body?.detail]);

  // ─────────── BR-3: `expected` (a stale preview answers "look again")
  const fresh = await check([{ action: "rename", kind: "field", key: draft, name: `Draft again ${uniq}` }]);
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: `Draft again ${uniq}`, expected: "0".repeat(64) });
  ok("G-CORE BR-3 fail: a stale fingerprint answers 409 'look again' with the fresh check, nothing written", r.status === 409 && r.body?.title === "Look again" && /changed since you opened it/.test(r.body?.detail) && r.body?.check?.fingerprint === fresh.body?.fingerprint && sets() === n2 && label(draft) === `Draft name ${uniq}|t`, [r.status, r.body?.title]);
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: `Draft again ${uniq}`, expected: "" });
  ok("Break B2 m7 fail: an empty fingerprint is stale too ('look again'), never a skipped check", r.status === 409 && r.body?.title === "Look again" && label(draft) === `Draft name ${uniq}|t`, [r.status, r.body?.title]);
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: `Draft again ${uniq}`, expected: fresh.body?.fingerprint });
  ok("G-CORE BR-3 pass: the current fingerprint confirms the rename", r.status === 200 && label(draft) === `Draft again ${uniq}|t`, [r.status, r.body?.detail]);
  const again = r.body?.change_set;
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: `Draft again ${uniq}` });
  ok("Review B2 m2 fail: a rename to the name it already has is refused (409), nothing written", r.status === 409 && /already its name/.test(r.body?.detail) && sql(`select count(*) from change_set where items::text like '%Draft again ${uniq}%'`) === "1", [r.status, r.body?.detail]);
  // Review B2 m4: three renames of one field at the same moment: one applies, the others are refused in words.
  const race = seedField(sql, { key: `person.gcore_b2r_${uniq}`, meaning: "G-CORE B2 race field (Sample)", review: false });
  const rs = await Promise.all([1, 2, 3].map((i) => call("PATCH", `/library/fields/${race}/name`, { name: `Race ${i} ${uniq}` })));
  const won = rs.filter((x) => x.status === 200);
  ok("Review B2 m4: renames at the same moment: exactly one applies, the others are refused in words, one change set", won.length === 1 && rs.filter((x) => x.status === 409 && /same moment/.test(x.body?.detail)).length === 2 && label(race) === `${won[0]?.body?.name}|t` && sql(`select count(*) from change_set where items::text like '%${race}%'`) === "1", rs.map((x) => [x.status, x.body?.detail ?? x.body?.name]));

  // ─────────── BR-6: roll-back through the same door
  r = await call("POST", `/change-sets/${direct}/undo-rename`, {});
  ok("G-CORE BR-6 fail: a rename changed again since is not rolled back (409, in words)", r.status === 409 && /was changed again after this rename/.test(r.body?.detail), [r.status, r.body?.detail]);
  const last = await call("GET", `/change-sets/renames/field/${draft}`);
  ok("G-CORE BR-6: the field's page reads its newest rename (before, after, who)", last.body?.id === again && last.body?.before === `Draft name ${uniq}` && last.body?.after === `Draft again ${uniq}` && last.body?.by === "Configuration author", last.body);
  r = await call("POST", `/change-sets/${again}/undo-rename`, {}, "user-B");
  ok("G-CORE BR-6 fail: a person without the author duty does not roll back (403)", r.status === 403, r.status);
  r = await call("POST", `/change-sets/${again}/undo-rename`, {});
  ok("G-CORE BR-6 pass: Undo rename puts the name back (a new change set through the door), the old one is rolled back",
    r.status === 200 && r.body.applied && label(draft) === `Draft name ${uniq}|t` && sql(`select status || '|' || (rolled_back_by = '${r.body.change_set}') from change_set where id = '${again}'`) === "rolled_back|true", [r.status, r.body, label(draft)]);
  r = await call("POST", `/change-sets/${again}/undo-rename`, {});
  ok("G-CORE BR-6 fail: a rename already rolled back is not rolled back twice", r.status === 409 && /already rolled back/.test(r.body?.detail), [r.status, r.body?.detail]);
  // A name taken since: undo the first rename of a second draft field after a twin took its old name.
  const d2 = seedField(sql, { key: `person.gcore_b2b_${uniq}`, meaning: "G-CORE B2 second test field (Sample)", review: false });
  await call("PATCH", `/library/fields/${d2}/name`, { name: `Old name ${uniq}` });
  const d2set = (await call("PATCH", `/library/fields/${d2}/name`, { name: `New name ${uniq}` })).body?.change_set;
  await call("PATCH", `/library/fields/${draft}/name`, { name: `Old name ${uniq}` });
  const n3 = sets();
  r = await call("POST", `/change-sets/${d2set}/undo-rename`, {});
  ok("G-CORE BR-6 + R3 fail: the old name was taken since by another field: the roll-back is refused in words, nothing written", r.status === 409 && /already the name of/.test(r.body?.detail) && label(d2) === `New name ${uniq}|t` && sets() === n3, [r.status, r.body?.detail]);
  // The undo of an approved (released) rename waits for a second person too.
  const relSet = setId;
  r = await call("POST", `/change-sets/${relSet}/undo-rename`, {});
  ok("G-CORE BR-6 pass: rolling back a released field's rename waits for a second person (202), the name unchanged", r.status === 202 && r.body.applied === false && label(FIELD) === `${NEW}|t`, [r.status, r.body]);
  const undoChange = r.body?.change_id;
  r = await call("POST", `/library/changes/${undoChange}/approve`, {}, "user-B");
  ok("G-CORE BR-6 pass: approved, the old name is back exactly (label and its unconfirmed mark), the earlier change set rolled back",
    r.status < 300 && label(FIELD) === before && sql(`select status from change_set where id = '${relSet}'`) === "rolled_back", [r.status, r.body?.detail, label(FIELD), before]);

  // ─────────── BR-2 at approval: a waiting rename whose name was taken meanwhile is refused at the click
  const FIELD2 = sql(`select canonical_field_key from canonical_field where group_key = 'person' and canonical_field_key not in ('${FIELD}') and status = 'PUBLISHED' and merged_into_key is null order by 1 limit 1`);
  const taken = `Taken later ${uniq}`;
  r = await call("PATCH", `/library/fields/${FIELD2}/name`, { name: taken });
  const w2 = r.body?.change_id, w2set = r.body?.change_set;
  ok("setup: a released field's rename waits", r.status === 202 && !!w2, [FIELD2, r.status, r.body?.detail]);
  // C3.15 BR-6 (#295): a name waiting for a second person is taken, so another field's direct rename to it is refused.
  r = await call("PATCH", `/library/fields/${draft}/name`, { name: taken });
  ok("C3.15 BR-6 fail (#295): a direct rename to a name waiting in an open rename of the same group is refused (409) in words; nothing changed", r.status === 409 && /waiting for a second person/.test(r.body?.detail ?? "") && label(draft) !== `${taken}|t`, [r.status, r.body?.detail]);
  // The name is taken meanwhile by a route outside the door (written directly), so BR-2's check at approval is what refuses it.
  sql(`update canonical_field set label = '${taken}', label_checked = true where canonical_field_key = '${draft}' and version = (select max(version) from canonical_field where canonical_field_key = '${draft}')`);
  const view = await call("GET", `/library/changes/${w2}`);
  ok("G-CORE BR-2: the approver sees before the click that the check refuses it now, in words", view.body?.recheck?.ok === false && /already the name of/.test(view.body?.recheck?.text), view.body?.recheck);
  const lab2 = label(FIELD2);
  r = await call("POST", `/library/changes/${w2}/approve`, {}, "user-B");
  ok("G-CORE BR-2 fail: approving it is refused in words (409), nothing changed, it still waits", r.status === 409 && /already the name of/.test(r.body?.detail) && label(FIELD2) === lab2 && sql(`select status from library_change where id = '${w2}'`) === "WAITING", [r.status, r.body?.detail]);
  r = await call("POST", `/library/changes/${w2}/return`, { note: "the name is taken now" }, "user-B");
  ok("Review B2 M1: a returned rename's change set ends (undone, no longer waiting), and the field page no longer says it waits", sql(`select status from change_set where id = '${w2set}'`) === "undone" && (await call("GET", `/change-sets/renames/field/${FIELD2}`)).body?.status !== "waiting", sql(`select status from change_set where id = '${w2set}'`));
  r = await call("POST", `/library/changes/${w2}/resubmit`, { label: "Something else", reason: "a different name now" });
  ok("G-CORE fail: a returned rename is not corrected and sent again around the door (409, in words)", r.status === 409 && /rename it again on its page/.test(r.body?.detail) && label(FIELD2) === lab2, [r.status, r.body?.detail]);
  r = await call("POST", `/library/changes/${w2}/withdraw`, { note: "not needed" });
  ok("G-CORE pass: the author withdraws a returned rename; nothing changed; its change set stays ended (undone, review M1)", r.body?.status === "WITHDRAWN" && label(FIELD2) === lab2 && sql(`select status from change_set where id = '${w2set}'`) === "undone", [r.status, r.body, sql(`select status from change_set where id = '${w2set}'`)]);
  // Review M1: withdrawing a rename while it still waits.
  r = await call("PATCH", `/library/fields/${FIELD2}/name`, { name: `Withdrawn later ${uniq}` });
  const w3 = r.body?.change_id, w3set = r.body?.change_set;
  r = await call("POST", `/library/changes/${w3}/withdraw`, { note: "changed my mind" });
  ok("Review B2 M1: a waiting rename withdrawn: its change set ends (undone) and the page offers no 'waits' line", r.body?.status === "WITHDRAWN" && sql(`select status from change_set where id = '${w3set}'`) === "undone" && (await call("GET", `/change-sets/renames/field/${FIELD2}`)).body?.status !== "waiting", [r.status, sql(`select status from change_set where id = '${w3set}'`)]);

  // ─────────── Sections through the same door
  const sec = seedSection(sql, { title: `G-CORE section ${uniq}`, review: false });
  r = await call("PATCH", `/library/sections/${sec}`, { name: `G-CORE section renamed ${uniq}` });
  ok("C3.15 pass: a section no release carries is renamed directly through the door (200, change set applied)", r.status === 200 && r.body.applied && title(sec) === `G-CORE section renamed ${uniq}` && sql(`select status from change_set where id = '${r.body.change_set}'`) === "applied", [r.status, r.body]);
  const other = sql(`select title from logical_section where section_key <> '${sec}' order by version desc limit 1`);
  r = await call("PATCH", `/library/sections/${sec}`, { name: other.toUpperCase() });
  ok("C3.15 fail: another section's title is refused in words through the door", r.status === 409 && /already a section called/.test(r.body?.detail), [r.status, r.body?.detail]);
  const relSec = sql(`select section_key from logical_section s where exists (select 1 from config_release r where r.snapshot->'sections' @> jsonb_build_array(jsonb_build_object('id', s.section_key))) order by 1 limit 1`);
  const t0 = title(relSec);
  r = await call("PATCH", `/library/sections/${relSec}`, { name: `Released section ${uniq}` });
  ok("G-CORE BR-4: a section a released combination uses waits for a second person (the engine's tier), the title unchanged", r.status === 202 && title(relSec) === t0, [relSec, r.status, r.body]);

  // ─────────── C11.14: merges through the same door
  const [yA, yB] = sql("select canonical_field_key from canonical_field where value_type = 'yes_no' and status in ('DRAFT','PUBLISHED') and merged_into_key is null and answer_list_key is null group by 1 order by 1 limit 2").split("\n");
  const [cA, cB] = sql("select canonical_field_key from canonical_field where value_type = 'code' and status in ('DRAFT','PUBLISHED') and merged_into_key is null group by 1 order by 1 limit 2").split("\n");
  seedAnswerList(sql, { key: `gcore_b2_list_${uniq}`, label: "G-CORE B2 Sample list", values: [{ key: "ALPHA", label: "Alpha (Sample)" }, { key: "BETA", label: "Beta (Sample)" }] });
  sql(`update canonical_field set answer_list_key = 'gcore_b2_list_${uniq}' where canonical_field_key = '${cA}'`);
  const m0 = Number(sql("select count(*) from field_merge")), n4 = sets();
  r = await call("POST", "/library/merges", { keep: cA, merge: cB, reason: "Both mean the same coded answer (test)." });
  ok("C11.14 fail: a merge of two fields with different answer lists is refused by the door in words (R4), nothing written", r.status === 409 && /different lists of choices/.test(r.body?.detail) && Number(sql("select count(*) from field_merge")) === m0 && sets() === n4, [cA, cB, r.status, r.body?.detail, m0, sql("select count(*) from field_merge"), n4, sets()]);
  const mchk = await check([{ action: "merge", kind: "field", key: yB, into: yA }]);
  ok("C11.14: the merge check passes and needs a second person", mchk.body?.ok === true && mchk.body?.tier?.tier === "second_person", [mchk.body?.problems, mchk.body?.tier]);
  r = await call("POST", "/library/merges", { keep: yA, merge: yB, reason: "Both mean the same yes or no (test).", expected: "f".repeat(64) });
  ok("C11.14 fail: a stale preview on propose answers 'look again', nothing written", r.status === 409 && r.body?.title === "Look again" && Number(sql("select count(*) from field_merge")) === m0, [r.status, r.body?.title]);
  r = await call("POST", "/library/merges", { keep: yA, merge: yB, reason: "Both mean the same yes or no (test).", expected: mchk.body?.fingerprint });
  const mergeId = r.body?.id;
  ok("C11.14 pass: proposed through the door: PROPOSED, with its change set (made by a person, waiting, linked)", r.status < 300 && r.body?.status === "PROPOSED" && sql(`select made_by || '|' || status || '|' || tier from change_set where field_merge_id = '${mergeId}'`) === "person|waiting|second_person", [r.status, r.body]);
  const achk = await check([{ action: "merge", kind: "field", key: yB, into: yA }]);
  r = await call("POST", `/library/merges/${mergeId}/approve`, { expected: "e".repeat(64) }, "user-B");
  ok("C11.14 fail: approving with a stale preview answers 'look again', nothing moves", r.status === 409 && r.body?.title === "Look again" && sql(`select status from field_merge where id = '${mergeId}'`) === "PROPOSED", [r.status, r.body?.title]);
  r = await call("POST", `/library/merges/${mergeId}/approve`, { expected: achk.body?.fingerprint }, "user-B");
  ok("C11.14 pass: the second person approves with the current preview: merged, its change set applied", r.status < 300 && sql(`select status from field_merge where id = '${mergeId}'`) === "APPLIED" && sql(`select status from change_set where field_merge_id = '${mergeId}'`) === "applied", [r.status, r.body?.detail]);
  // BR-2 at approval: a merge that became wrong since it was proposed is refused (the kept field now carries a list).
  const [zA, zB] = sql(`select canonical_field_key from canonical_field where value_type = 'yes_no' and status in ('DRAFT','PUBLISHED') and merged_into_key is null and answer_list_key is null and canonical_field_key not in ('${yA}','${yB}') group by 1 order by 1 limit 2`).split("\n");
  r = await call("POST", "/library/merges", { keep: zA, merge: zB, reason: "Both mean the same yes or no (test 2)." });
  const m2 = r.body?.id;
  sql(`update canonical_field set answer_list_key = 'gcore_b2_list_${uniq}' where canonical_field_key = '${zA}'`);
  r = await call("POST", `/library/merges/${m2}/approve`, {}, "user-B");
  ok("C11.14 fail: the checks run again at approval: a merge wrong since it was proposed is refused in words, nothing moves", r.status === 409 && sql(`select status from field_merge where id = '${m2}'`) === "PROPOSED" && sql(`select merged_into_key is null from canonical_field where canonical_field_key = '${zB}' order by version desc limit 1`) === "t", [r.status, r.body?.detail]);
  r = await call("POST", `/library/merges/${m2}/reject`, { note: "the kept field changed its list" }, "user-B");
  ok("Review B2 M1: a rejected merge's change set ends (undone, no longer waiting)", r.status < 300 && sql(`select status from change_set where field_merge_id = '${m2}'`) === "undone", [r.status, sql(`select status from change_set where field_merge_id = '${m2}'`)]);

  // ─────────── BR-1: one door (a scan of the entry functions) and the hosts send `expected`
  const src = (f: string) => readFileSync(join(STUDIO, f), "utf8");
  const body = (text: string, fn: string) => { const i = text.indexOf(`async ${fn}(`); const j = text.indexOf("\n  async ", i + 1); return i < 0 ? "" : text.slice(i, j < 0 ? undefined : j); };
  const lib = src("api/src/library-sources.ts"), forms = src("api/src/forms.ts"), door = src("api/src/rename-door.ts");
  ok("G-CORE BR-1: the rename handlers go through the door (renameField and renameSection call the rename door)", /this\.renames\.rename\(/.test(body(lib, "renameField")) && /this\.renames\.rename\(/.test(body(lib, "renameSection")));
  ok("G-CORE BR-1: the door, proposeMerge and approveMerge each call the fixed rules check (guard)", /this\.sets\.guard\(/.test(body(door, "rename")) && /this\.sets\.guard\(/.test(body(forms, "proposeMerge")) && /this\.sets\.guard\(/.test(body(forms, "approveMerge")));
  ok("G-CORE BR-1 fail: no rename handler writes a name around the door (no revise in library-sources.ts)", !/\brevise\(/.test(lib));
  const lpage = src("web/src/pages/library.tsx"), rpage = src("web/src/pages/review-items.tsx");
  ok("G-CORE BR-3: the web hosts always send `expected` (the rename dialog for fields and sections, the merge approval)", /json: \{ name: typed, expected: check\.data\?\.fingerprint \}/.test(lpage) && /merges\/\$\{id\}\/approve`[^\n]*expected: check\.data\?\.fingerprint/.test(rpage) && /<ChangePreview /.test(lpage) && /<ChangePreview /.test(rpage));

  console.log(`\n${pass} PASS ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP", e); process.exit(1); });
