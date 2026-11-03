// C11.9 (screens lane, J5; P-116, Screen 04 BR-8 to BR-10): Delete, Retire and Restore of a shared field and a document
// type, with where used first. A passing and a failing case per rule, through the API on an isolated copy with the
// sample inputs loaded (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh screens_c119 4471 start && tsx studio/tests/check_c119_library_items.ts 4471 xr_studio_screens_c119
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_b5b";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
import { existsSync } from "node:fs";
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql"; // the Mac, else the cloud copy's own
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const status = (table: string, col: string, key: string) => sql(`select string_agg(status::text, ',' order by version) from ${table} where ${col} = '${key}'`);
const field = (key: string, st: string) => sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, label_checked) select gen_random_uuid(), id, '${key}', 1, '${st}', 'A test field for C11.9.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', '${key.split(".")[1].replace(/_/g, " ")}', true from workspace where key='demo'`);
const docType = (key: string, st: string) => sql(`insert into document_type (id, workspace_id, document_type_key, name, category, version, status, origin, updated_by) select gen_random_uuid(), id, '${key}', 'C11.9 test ${key}', 'client', 1, '${st}', 'HUMAN', 'user-A' from workspace where key='demo'`);
const why = { reason: "Not needed by any setup any more." };

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);

  // ─────────────────── where used first (L3, L6)
  let u = await call("GET", "/library/fields/person.family_name/uses");
  const combos = (u.body?.uses ?? []).filter((x: { kind: string }) => x.kind === "combination");
  ok("C11.9 where used pass: a used field lists each combination that reads it, with a link, and why it stops a retire", u.status === 200 && combos.length >= 1 && combos.every((x: { href: string; blocks: boolean }) => /^\/c\/[0-9a-f-]+$/.test(x.href) && x.blocks), combos[0]);
  ok("C11.9 where used pass: its releases are listed as kept, never stopping it", (u.body?.uses ?? []).some((x: { kind: string; blocks: boolean; why: string }) => x.kind === "release" && !x.blocks && /Kept/.test(x.why)), u.body?.uses?.map((x: { kind: string }) => x.kind));
  ok("C11.9 where used fail: a field that is not in the library is 404 in words", (await call("GET", "/library/fields/person.no_such_field/uses")).status === 404);

  // ─────────────────── BR-9 retire refused while used, listing every use
  const before = Number(sql("select count(*) from library_change"));
  let r = await call("POST", "/library/fields/person.family_name/retire", why);
  ok("C11.9 BR-9 fail: retiring a field a current setup reads is refused (409) in words, naming what uses it", r.status === 409 && /^Can't retire yet: .* still uses? it: remove it there first\./.test(r.body?.detail) && !/BR-|L\d/.test(r.body?.detail), r.body?.detail);
  ok("C11.9 BR-9 fail: the refusal lists every use, and writes nothing", Array.isArray(r.body?.uses) && r.body.uses.length >= combos.length && Number(sql("select count(*) from library_change")) === before);
  r = await call("DELETE", "/library/fields/person.family_name", why);
  ok("C11.9 BR-9 fail: a released field is never deleted (409: retire it instead)", r.status === 409 && /released items are kept\. Retire it instead/.test(r.body?.detail), r.body?.detail);
  const types = (await call("GET", "/library/document-types")).body as { documentTypeKey: string; used_in: string[]; status: string; row_action: string }[];
  const usedType = types.find((t) => t.used_in.length && t.status === "PUBLISHED")!;
  r = await call("POST", `/library/document-types/${encodeURIComponent(usedType.documentTypeKey)}/retire`, why);
  ok("C11.9 BR-9 fail: retiring a document type a checklist lists is refused, linking that combination's Documents tab", r.status === 409 && r.body.uses.some((x: { href: string }) => /^\/c\/[0-9a-f-]+\/documents$/.test(x.href)), r.body?.uses?.[0]);
  ok("C11.9 row pass: the list gives each row its one action from its state (released → Retire)", usedType.row_action === "RETIRE");

  // ─────────────────── BR-9 delete only the never-released and unused; BR-8 a second person
  field("person.c119_unused_draft", "DRAFT");
  sql("update canonical_field set updated_by = 'user-B' where canonical_field_key = 'person.c119_unused_draft'"); // another person's draft: the second-person path (an own draft is deleted at once, pack 3)
  r = await call("POST", "/library/fields/person.c119_unused_draft/retire", why);
  ok("C11.9 BR-9 fail: a never-released field is not retired (409: delete it instead)", r.status === 409 && /never released: delete it instead/.test(r.body?.detail), r.body?.detail);
  ok("C11.9 reason fail: a delete without a reason is refused (400), nothing written", (await call("DELETE", "/library/fields/person.c119_unused_draft", {})).status === 400 && Number(sql("select count(*) from library_change where key='person.c119_unused_draft'")) === 0);
  ok("C11.9 duty fail: a person without the author duty cannot ask (403)", (await call("DELETE", "/library/fields/person.c119_unused_draft", why, "user-B")).status === 403);
  const del = await call("DELETE", "/library/fields/person.c119_unused_draft", why);
  ok("C11.9 BR-9 pass: a never-released, unused field's delete is sent for approval (WAITING)", del.status === 200 || del.status === 201 ? del.body.status === "WAITING" && del.body.action === "DELETE" : false, del.body);
  ok("C11.9 pass: the waiting request shows on its row (Withdraw)", ((await call("GET", "/library/fields?retired=all")).body as { key: string; row_action: string; change: { action: string } | null }[]).some((f) => f.key === "person.c119_unused_draft" && f.row_action === "WITHDRAW" && f.change?.action === "DELETE"));
  ok("C11.9 BR-8 fail: the person who asked cannot approve it (403); the field stays", (await call("POST", `/library/changes/${del.body.id}/approve`, {}, "user-A")).status === 403 && status("canonical_field", "canonical_field_key", "person.c119_unused_draft") === "DRAFT");
  r = await call("POST", `/library/changes/${del.body.id}/approve`, {}, "user-B");
  ok("C11.9 BR-8 pass: a different person approves; the never-released field is deleted at once (L1)", r.status < 300 && r.body.status === "RELEASED" && status("canonical_field", "canonical_field_key", "person.c119_unused_draft") === "", r.body?.status);
  ok("C11.9 pass: History keeps the line (the deletion is on the activity log)", Number(sql("select count(*) from audit_event where entity_key='person.c119_unused_draft' and action='deleted'")) === 1);

  // ─────────────────── retire with Undo, approval re-check, retire, restore (fields)
  field("person.c119_released", "PUBLISHED");
  u = await call("GET", "/library/fields/person.c119_released/uses");
  ok("C11.9 where used pass: a released field nothing reads says so; Retire is allowed, Delete is not", u.body?.uses?.length === 0 && u.body.can.retire === null && /Retire it instead/.test(u.body.can.delete), u.body?.can);
  let ret = await call("POST", "/library/fields/person.c119_released/retire", why);
  const second = await call("POST", "/library/fields/person.c119_released/retire", why);
  ok("C11.9 fail: a second request while one waits is refused (409, waiting for a second person)", second.status === 409 && /waiting for a second person/.test(second.body?.detail), second.body?.detail);
  r = await call("POST", `/library/changes/${ret.body.id}/withdraw`, { note: "Undone at once." });
  ok("C11.9 Undo pass: Undo withdraws the request; the field stays published", r.status < 300 && r.body.status === "WITHDRAWN" && status("canonical_field", "canonical_field_key", "person.c119_released") === "PUBLISHED", r.body?.status);
  ret = await call("POST", "/library/fields/person.c119_released/retire", why);
  sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by) select gen_random_uuid(), id, 'person.c119_released', 2, 'DRAFT', 'A new meaning.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A' from workspace where key='demo'");
  const card = await call("GET", `/library/changes/${ret.body.id}`, undefined, "user-B");
  r = await call("POST", `/library/changes/${ret.body.id}/approve`, {}, "user-B");
  ok("C11.9 re-check fail: a draft version made after the request is said before the click and refuses the approval (409)", card.body?.recheck?.ok === false && r.status === 409 && /Changed since it was proposed: a new version of it is a draft/.test(r.body?.detail) && status("canonical_field", "canonical_field_key", "person.c119_released") === "PUBLISHED,DRAFT", [card.body?.recheck, r.body?.detail]);
  sql("delete from canonical_field where canonical_field_key='person.c119_released' and version=2");
  r = await call("POST", `/library/changes/${ret.body.id}/approve`, {}, "user-B");
  ok("C11.9 BR-8/BR-10 pass: approved by a second person, the field is retired at once (hidden from pickers: its row says retired)", r.status < 300 && r.body.status === "RELEASED" && status("canonical_field", "canonical_field_key", "person.c119_released") === "RETIRED", r.body?.status);
  const row = ((await call("GET", "/library/fields?retired=all")).body as { key: string; retired: boolean; row_action: string }[]).find((f) => f.key === "person.c119_released");
  ok("C11.9 BR-10 pass: the default list (the one pickers read) leaves the retired field out", !((await call("GET", "/library/fields")).body as { key: string }[]).some((f) => f.key === "person.c119_released"));
  ok("C11.9 BR-10 pass: the Fields row is marked retired (listed only under Retired) and offers Restore", row?.retired === true && row.row_action === "RESTORE", row);
  ok("C11.9 BR-9 fail: a retired field is not retired again, nor deleted", (await call("POST", "/library/fields/person.c119_released/retire", why)).status === 409 && /retired/.test((await call("DELETE", "/library/fields/person.c119_released", why)).body?.detail));
  ok("C11.9 restore fail: a field that is not retired is not restored (409)", (await call("POST", "/library/fields/person.family_name/restore", why)).status === 409);
  const res = await call("POST", "/library/fields/person.c119_released/restore", why);
  r = await call("POST", `/library/changes/${res.body.id}/return`, { note: "Say which setup needs it again." }, "user-B");
  ok("C11.9 return pass: a second person returns the restore with a note; the row says it was returned", r.status < 300 && ((await call("GET", "/library/fields?retired=all")).body as { key: string; change: { status: string } | null }[]).find((f) => f.key === "person.c119_released")?.change?.status === "RETURNED");
  ok("C11.9 send again fail: a name change on a restore is refused in words (400)", (await call("POST", `/library/changes/${res.body.id}/resubmit`, { reason: "The study permit setup needs it.", label: "x" })).status === 400);
  r = await call("POST", `/library/changes/${res.body.id}/resubmit`, { reason: "The study permit setup needs it." });
  ok("C11.9 send again pass: the author sends it again with what changed (WAITING)", r.status < 300 && r.body.status === "WAITING", r.body?.status);
  r = await call("POST", `/library/changes/${res.body.id}/approve`, {}, "user-B");
  ok("C11.9 restore pass: approved, the field is published again (back in pickers)", r.status < 300 && status("canonical_field", "canonical_field_key", "person.c119_released") === "PUBLISHED", r.body?.status);

  // ─────────────────── document types
  docType("c119_unused_type", "PUBLISHED");
  const dret = await call("POST", "/library/document-types/c119_unused_type/retire", why);
  r = await call("POST", `/library/changes/${dret.body.id}/approve`, {}, "user-B");
  ok("C11.9 pass: an unused document type is retired by a second person's approval", r.status < 300 && status("document_type", "document_type_key", "c119_unused_type") === "RETIRED", r.body?.status ?? r.body);
  const trow = ((await call("GET", "/library/document-types")).body as { documentTypeKey: string; retired: boolean; row_action: string }[]).find((t) => t.documentTypeKey === "c119_unused_type");
  ok("C11.9 BR-10 pass: its row is marked retired and offers Restore", trow?.retired === true && trow.row_action === "RESTORE", trow);
  docType("c119_draft_type", "DRAFT");
  sql("update document_type set updated_by = 'user-B' where document_type_key = 'c119_draft_type'");
  const ddel = await call("DELETE", "/library/document-types/c119_draft_type", why);
  r = await call("POST", `/library/changes/${ddel.body.id}/approve`, {}, "user-B");
  ok("C11.9 pass: a never-released, unused document type is deleted at approval", r.status < 300 && status("document_type", "document_type_key", "c119_draft_type") === "", r.body?.status);

  // ─────────────────── B5c fixes: a retired item takes no new use or edit (break B1, M1-M4; review Ma2-Ma4)
  // person.c119_released was restored above; retire it again for these checks.
  ret = await call("POST", "/library/fields/person.c119_released/retire", why);
  await call("POST", `/library/changes/${ret.body.id}/approve`, {}, "user-B");
  ok("setup: person.c119_released is retired again", status("canonical_field", "canonical_field_key", "person.c119_released") === "RETIRED");
  field("person.c119_live", "PUBLISHED");
  r = await call("PATCH", "/library/fields/person.c119_live", { retire: true });
  ok("C11.9 break B1 fail: the old edit route never retires (410, use Retire), the field stays published", r.status === 410 && /\/retire/.test(r.body?.detail) && status("canonical_field", "canonical_field_key", "person.c119_live") === "PUBLISHED", [r.status, r.body?.detail]);
  r = await call("PATCH", "/library/fields/person.c119_live", { meaning: "A changed meaning for the C11.9 check.", reason: "The C11.9 check edits the meaning (C3.15: a change of meaning says why)." });
  ok("C11.9 Ma2 pass: a published field is still edited as before", r.status < 300, r.body);
  r = await call("PATCH", "/library/fields/person.c119_released", { meaning: "This would bring it back silently." });
  ok("C11.9 Ma2 fail: editing a retired field is refused in words (409) and it stays retired", r.status === 409 && /is retired: .*Restore it/.test(r.body?.detail) && status("canonical_field", "canonical_field_key", "person.c119_released") === "RETIRED", r.body?.detail);
  r = await call("PATCH", "/library/fields/person.c119_released/name", { name: "Released again" });
  ok("C11.9 Ma2 fail: renaming a retired field is refused in words (409)", r.status === 409 && /is retired/.test(r.body?.detail), [r.status, r.body?.detail]);
  const section = sql("select section_key from logical_section limit 1");
  r = await call("POST", "/library/fields/person.c119_released/placement", { sectionKey: section, collectedFrom: "client_questionnaire", repeats: "per_person" });
  ok("C11.9 Ma3 fail: a retired field takes no new placement (409), nothing written", r.status === 409 && /is retired/.test(r.body?.detail) && Number(sql("select count(*) from section_question where canonical_field_key='person.c119_released'")) === 0, [r.status, r.body?.detail]);
  const comboId = sql("select id from combination where retired_at is null order by label limit 1");
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client" };
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: "c119_unused_type" });
  ok("C11.9 M1 fail: a retired document type is not added to a checklist (409), nothing written", r.status === 409 && /is retired/.test(r.body?.detail) && Number(sql("select count(*) from document_requirement where document_type_key='c119_unused_type'")) === 0, [r.status, r.body?.detail]);
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, newTypeName: "c11.9 TEST c119 unused type" }); // C3.6: the retired type's own name (any case or spacing), not a key look-alike
  ok("C11.9 M1 fail: naming a new type that is a retired one reuses nothing (409)", r.status === 409 && /is retired/.test(r.body?.detail), [r.status, r.body?.detail]);
  const anyType = usedType.documentTypeKey;
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: anyType, alternatives: ["c119_unused_type"] });
  ok("C11.9 M1 fail: a retired document type is not an alternative (409)", r.status === 409 && /is retired/.test(r.body?.detail), [r.status, r.body?.detail]);
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, attachMode: "ANSWER_CONDITIONAL", documentTypeKey: anyType, condition: { field: "person.c119_released", op: "eq", value: "x" }, conditionPlain: "test" });
  ok("C11.9 M1 fail: a new condition cannot read a retired field (400), said as retired, not 'not in the library'", r.status === 400 && /a retired field: restore it/.test(r.body?.detail ?? r.body?.message ?? "") && !/not in the library/.test(r.body?.detail ?? r.body?.message ?? ""), [r.status, r.body?.detail ?? r.body?.message]);

  // M4: a document type used only as another line's alternative counts as used.
  docType("c119_alt_type", "PUBLISHED");
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: anyType, alternatives: ["c119_alt_type"] });
  ok("setup: a line names c119_alt_type as its alternative", r.status < 300, r.body?.detail);
  u = await call("GET", "/library/document-types/c119_alt_type/uses");
  ok("C11.9 M4 fail: a document type used only as an alternative is not retired (it is used there)", u.body?.uses?.some((x: { kind: string; blocks: boolean }) => x.kind === "combination" && x.blocks) && u.body.can.retire !== null, u.body?.can);
  ok("C11.9 M4 pass: an unused document type still may be retired", (await call("GET", "/library/document-types/c119_unused_type/uses")).body?.can?.restore === null);

  // M3: a retired combination's draft line blocks a delete.
  docType("c119_draft_in_retired", "DRAFT");
  r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: "c119_draft_in_retired" });
  sql(`update combination set retired_at = now() where id = '${comboId}'`);
  u = await call("GET", "/library/document-types/c119_draft_in_retired/uses");
  ok("C11.9 M3 fail: a draft type a retired combination still lists is not deleted", r.status < 300 && u.body?.can?.delete !== null && u.body.uses.some((x: { why: string }) => /retired/.test(x.why)), u.body?.can);
  sql(`update combination set retired_at = null where id = '${comboId}'`);

  // M2: approve and withdraw at the same moment: only one wins.
  docType("c119_race_type", "PUBLISHED");
  const race = await call("POST", "/library/document-types/c119_race_type/retire", why);
  const [ap, wd] = await Promise.all([call("POST", `/library/changes/${race.body.id}/approve`, {}, "user-B"), call("POST", `/library/changes/${race.body.id}/withdraw`, { note: "Undone at the same moment." })]);
  const final = sql(`select status from library_change where id='${race.body.id}'`), typeNow = status("document_type", "document_type_key", "c119_race_type");
  ok("C11.9 M2 fail: approve and withdraw at once never both succeed, and the type matches the outcome", !(ap.status < 300 && wd.status < 300) && ((final === "RELEASED" && typeNow === "RETIRED") || (final === "WITHDRAWN" && typeNow === "PUBLISHED")), [ap.status, wd.status, final, typeNow]);
  r = await call("POST", `/library/changes/${race.body.id}/withdraw`, { note: "Too late now." });
  ok("C11.9 M2 fail: a change already applied or withdrawn is not withdrawn again (409)", r.status === 409, r.status);

  // Break minor: a delete names the draft question it removes; a waiting new field offers Withdraw, never Delete.
  field("person.c119_placed", "DRAFT");
  r = await call("POST", "/library/fields/person.c119_placed/placement", { sectionKey: section, collectedFrom: "client_questionnaire", repeats: "per_person" });
  u = await call("GET", "/library/fields/person.c119_placed/uses");
  ok("C11.9 minor pass: a draft question that asks a never-released field is listed (not stopping), so the delete says it goes too", r.status < 300 && u.body?.uses?.some((x: { kind: string; blocks: boolean }) => x.kind === "placement" && !x.blocks), [r.status, u.body?.uses]);
  sql("insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by, proposed_at) select gen_random_uuid(), id, 'field', 'person.c119_placed', 'placed', 'ADD', 'Read from a form.', 'WAITING', 'user-A', now() from workspace where key='demo'");
  const added = ((await call("GET", "/library/fields?retired=all")).body as { key: string; row_action: string; change: { action: string } | null }[]).find((f) => f.key === "person.c119_placed");
  ok("C11.9 minor fail: a new field still waiting is not offered Delete; its row offers Withdraw", added?.row_action === "WITHDRAW" && added.change?.action === "ADD", added);

  // ─────────────────── break round 2 (B5c fixes)
  // Major 1: a merged field (an older published version, the newest retired with merged_into_key) is never retired.
  field("person.c119_merged", "PUBLISHED");
  sql("insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, merged_into_key) select gen_random_uuid(), id, 'person.c119_merged', 2, 'RETIRED', 'Merged.', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', 'user-A', 'person.family_name' from workspace where key='demo'");
  u = await call("GET", "/library/fields/person.c119_merged/uses");
  r = await call("POST", "/library/fields/person.c119_merged/retire", why);
  ok("C11.9 break-2 Major 1 fail: a merged field is not retired, restored or deleted (409, says where it points)", r.status === 409 && /merged into person\.family_name/.test(r.body?.detail) && [u.body?.can?.retire, u.body?.can?.restore, u.body?.can?.delete].every((x: unknown) => typeof x === "string"), [r.status, r.body?.detail]);

  // Major 2: a retire approved at the same moment as a new line using the type: never a retired type on a current line.
  let both = 0;
  for (let i = 0; i < 12; i++) {
    const k = `c119_race_line_${i}`; docType(k, "PUBLISHED");
    const rq = await call("POST", `/library/document-types/${k}/retire`, why);
    const [ap2, ln] = await Promise.all([call("POST", `/library/changes/${rq.body.id}/approve`, {}, "user-B"), new Promise((res) => setTimeout(res, (i % 4) * 15)).then(() => call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: k }))]);
    if (status("document_type", "document_type_key", k) === "RETIRED" && ln.status < 300) both++;
    void ap2;
  }
  ok("C11.9 break-2 Major 2 fail: in 12 staggered approve-and-add rounds a retired type never ends up on a current line", both === 0, both);

  // Major 3: a waiting change of who fills its question stops a retire.
  field("person.c119_fills", "PUBLISHED");
  sql("insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) select gen_random_uuid(), id, 'placement_fills', 'person.c119_fills', 'fills', 'EDIT', 'test', 'WAITING', 'user-A' from workspace where key='demo'");
  r = await call("POST", "/library/fields/person.c119_fills/retire", why);
  ok("C11.9 break-2 Major 3 fail: a waiting who-fills change stops a retire (409, waiting)", r.status === 409 && /waiting/.test(r.body?.detail), [r.status, r.body?.detail]);

  // Major 4: a restore whose name another current field now answers to is refused.
  sql("update canonical_field set aliases = array['c119 released'] where canonical_field_key = 'person.c119_live'");
  u = await call("GET", "/library/fields/person.c119_released/uses");
  ok("C11.9 break-2 Major 4 fail: a restore is refused while another field of its group answers to its name", /Can't restore yet: .*c119 released.* is now also a name/.test(u.body?.can?.restore ?? ""), u.body?.can?.restore);
  sql("update canonical_field set aliases = '{}' where canonical_field_key = 'person.c119_live'");
  u = await call("GET", "/library/fields/person.c119_released/uses");
  ok("C11.9 break-2 Major 4 pass: with the name free again the restore is allowed", u.body?.can?.restore === null, u.body?.can?.restore);

  // Minors: a document type that supplies a field stops its delete; a missing reason says so in words.
  field("person.c119_supplied", "DRAFT");
  docType("c119_supplier", "PUBLISHED"); sql("update document_type set supplies_facts = array['person.c119_supplied'] where document_type_key = 'c119_supplier'");
  u = await call("GET", "/library/fields/person.c119_supplied/uses");
  ok("C11.9 break-2 minor fail: a field a document type supplies is not deleted", typeof u.body?.can?.delete === "string" && u.body.uses.some((x: { label: string }) => /supplies it/.test(x.label)), u.body?.can);
  r = await call("POST", "/library/fields/person.c119_live/retire", {});
  ok("C11.9 break-2 minor fail: a retire with no reason says 'Say why' in words, never the validator's", r.status === 400 && /^Say why/.test(r.body?.detail), r.body?.detail);

  // Review round 2 Major 1: Screen 02's field map (a replayed saved AI answer, US$0) cannot point a form field at a retired field.
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const att = ((await call("GET", `/combinations/${sv}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const saved = ((await call("GET", `/attachments/${att!.id}/draft-options`)).body.saved_runs ?? []).find((x: { valid: boolean }) => x.valid);
  r = await call("POST", `/attachments/${att!.id}/draft`, { mode: "replay", runFile: saved.file });
  const jobId = r.body?.id ?? r.body?.job?.id ?? sql(`select id from drafting_job where combination_id='${sv}' and kind='field_map' order by started_at desc limit 1`);
  for (let i = 0; i < 120 && (await call("GET", `/jobs/${jobId}`)).body?.status !== "COMPLETED"; i++) await new Promise((res) => setTimeout(res, 500));
  const job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("setup: the saved field-map answer is replayed (no model call)", job?.status === "COMPLETED" && job.items?.length > 0, job?.status);
  r = await call("POST", `/jobs/${jobId}/items/${job.items[0].id}`, { decision: "CHANGED", key: "person.c119_released" });
  ok("C11.9 review-2 Major 1 fail: a field-map decision cannot choose a retired field (409, in words)", r.status === 409 && /is retired/.test(r.body?.detail), [r.status, r.body?.detail]);
  r = await call("POST", `/jobs/${jobId}/items/${job.items[0].id}`, { decision: "CHANGED", key: "person.c119_live" });
  ok("C11.9 review-2 Major 1 pass: the same decision with a current field is taken", r.status < 300, [r.status, r.body?.detail]);

  // ─────────────────── round 3 (review on 3c2225ed)
  const ws = sql("select id from workspace where key='demo'");
  const sectionRow = (key: string, st: string, by = "user-A") => sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, origin, updated_by) values (gen_random_uuid(), '${ws}', '${key}', 1, '${st}', 'C11.9 ${key}', 'HUMAN', '${by}')`);
  // Major 1: a retired section is never chosen by a current combination, even when the retire is approved at the same moment.
  let selBad = 0;
  for (let i = 0; i < 12; i++) {
    const k = `c119_race_sec_${i}`; sectionRow(k, "PUBLISHED", "user-B");
    const rq = await call("POST", `/library/sections/${k}/retire`, why);
    await Promise.all([call("POST", `/library/changes/${rq.body.id}/approve`, {}, "user-B"), new Promise((res) => setTimeout(res, (i % 4) * 15)).then(() => call("POST", `/combinations/${comboId}/sections/${k}`, {}))]);
    if (sql(`select status from logical_section where section_key='${k}'`) === "RETIRED" && sql(`select count(*) from sqr_section_selection where section_key='${k}'`) !== "0") selBad++;
  }
  ok("C11.9 round-3 Major 1 fail: in 12 staggered retire-and-select rounds a retired section is never left selected", selBad === 0, selBad);
  sectionRow("c119_retired_sec", "RETIRED", "user-B");
  r = await call("POST", `/combinations/${comboId}/sections/c119_retired_sec`, {});
  ok("C11.9 round-3 fail: choosing a retired section for a combination is refused (409, retired)", r.status === 409 && /is retired/.test(r.body?.detail ?? r.body?.message ?? ""), [r.status, r.body?.detail ?? r.body?.message]);

  // Major 2: Undo never puts a draft question back into a retired or deleted section.
  sectionRow("c119_undo_sec", "PUBLISHED", "user-B");
  field("person.c119_undo_q", "DRAFT");
  await call("POST", "/library/fields/person.c119_undo_q/placement", { sectionKey: "c119_undo_sec", collectedFrom: "client_questionnaire", repeats: "per_person" });
  const own = await call("POST", "/library/fields/person.c119_undo_q/delete", why);
  const sret = await call("POST", "/library/sections/c119_undo_sec/retire", why);
  await call("POST", `/library/changes/${sret.body.id}/approve`, {}, "user-B");
  r = await call("POST", `/library/changes/${own.body.id}/undo`);
  ok("C11.9 round-3 Major 2 fail: Undo of a field whose question's section is now retired is refused in words; nothing comes back", own.body?.immediate === true && r.status === 409 && /retired now: restore that section first/.test(r.body?.detail) && status("canonical_field", "canonical_field_key", "person.c119_undo_q") === "", [own.body?.immediate, r.status, r.body?.detail]);

  // Major 4: the author's own new document type, its ADD still waiting, is deleted at once with that ADD; Undo brings both back.
  docType("c119_own_new", "DRAFT");
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by, decided_by, decided_at, decision_note) values (gen_random_uuid(), '${ws}', 'document_type', 'c119_own_new', 'Own new', 'ADD', 'Named while adding a line.', 'RETURNED', 'user-A', 'user-B', now(), 'Use the existing type.')`);
  u = await call("GET", "/library/document-types/c119_own_new/uses");
  r = await call("POST", "/library/document-types/c119_own_new/delete", why);
  ok("C11.9 round-3 Major 4 pass: an own new document type whose ADD was returned is deleted at once, its ADD withdrawn", u.body?.immediate === true && r.body?.immediate === true && status("document_type", "document_type_key", "c119_own_new") === "" && sql("select status from library_change where key='c119_own_new' and action='ADD'") === "WITHDRAWN", [u.body?.can?.delete, r.status, r.body?.detail]);
  const und = await call("POST", `/library/changes/${r.body.id}/undo`);
  ok("C11.9 round-3 Major 4 pass: Undo brings the type and its returned ADD back", und.status < 300 && status("document_type", "document_type_key", "c119_own_new") === "DRAFT" && sql("select status from library_change where key='c119_own_new' and action='ADD'") === "RETURNED", [und.status, und.body?.detail]);
  ok("C11.9 round-4 Major 2 fail: Undo keeps the second person's return (who, when, the note)", sql("select coalesce(decided_by,'') || '|' || (decided_at is not null) || '|' || coalesce(decision_note,'') from library_change where key='c119_own_new' and action='ADD'") === "user-B|true|Use the existing type.", sql("select coalesce(decided_by,'') || '|' || coalesce(decision_note,'') from library_change where key='c119_own_new' and action='ADD'"));
  // Round 4 Major 1: the row of an own new section or document type (its ADD by the author) offers Delete, not Withdraw.
  sectionRow("c119_own_sec", "DRAFT");
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values (gen_random_uuid(), '${ws}', 'section', 'c119_own_sec', 'Own section', 'ADD', 'A form part.', 'WAITING', 'user-A')`);
  const secRow = ((await call("GET", "/library/sections")).body as { key: string; row_action: string; change: { action: string; by_id: string } | null }[]).find((x) => x.key === "c119_own_sec");
  ok("C11.9 round-4 Major 1 pass: an own new section's row offers Delete (its waiting ADD named on the row)", secRow?.row_action === "DELETE" && secRow.change?.action === "ADD" && secRow.change.by_id === "user-A", secRow);
  docType("c119_their_new", "DRAFT"); sql("update document_type set updated_by='user-B' where document_type_key='c119_their_new'");
  sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, status, proposed_by) values (gen_random_uuid(), '${ws}', 'document_type', 'c119_their_new', 'Their new', 'ADD', 'Named while adding a line.', 'WAITING', 'user-B')`);
  r = await call("POST", "/library/document-types/c119_their_new/delete", why);
  ok("C11.9 round-3 Major 4 fail: someone else's new type whose ADD waits is not deleted (409, decide that first)", r.status === 409 && status("document_type", "document_type_key", "c119_their_new") === "DRAFT", [r.status, r.body?.detail]);

  // Major 3 (route by form numbers, as the screen sends them).
  const vvId = sql("select f.combination_id from combination_form f join combination c on c.id = f.combination_id where c.retired_at is null and f.status in ('DRAFT','PUBLISHED') group by f.combination_id having count(distinct f.gov_form_def_id) >= 2 order by 1 limit 1");
  const codes = sql(`select g.form_key from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id='${vvId}' and f.status in ('DRAFT','PUBLISHED') group by g.form_key order by g.form_key`).split("\n").filter(Boolean);
  r = await call("POST", `/combinations/${vvId}/forms/reorder`, { forms: [...codes].reverse() });
  const order = ((await call("GET", `/combinations/${vvId}/config?mode=draft`)).body?.snapshot?.forms ?? []).map((f: { form_number: string }) => f.form_number);
  ok("C11.9 round-3 Major 3 pass: the filing order sent by form number is kept in the draft", codes.length >= 2 && r.status === 200 && JSON.stringify(order) === JSON.stringify([...codes].reverse()), [r.status, order, codes]);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
