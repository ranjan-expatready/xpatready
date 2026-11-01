// Acceptance C11.9 (P-220, pack 3): on every master a person sees "where used" first, removes what is unused (confirm +
// Undo), retires and restores what is used (kept in history and cases) through a second person, and reorders where
// order matters; no move (P-116 and its 28 Oct amendment, P-52 L1–L6; Screen 04 concept BR-8, BR-9, BR-10). Status today:
// Partial. Built: Structure names, combinations and library forms (lifecycle.ts: /uses, delete, retire, restore,
// Undo), checklist lines, questionnaire sections (QA-93 closed by PR #94). Missing and tested here: the same lifecycle on
// the shared library masters (shared field, section, document type), where PATCH /library/fields/:key {retire:true}
// retires at once with no guard or second person today; and the filing order of forms in a combination (no stored order,
// no route). Routes follow Screen 04 concept §6 (POST /library/:kind/:key/{delete|retire|restore}) and lifecycle.ts's
// shapes (contracts/structure.ts UsesView: GET …/uses → {uses[{label, href|null, blocks, why}], can{delete, retire, restore}:
// reason string or null}; Undo POST /library/changes/:id/undo). The filing-order route and where the order lives (the snapshot
// sorts forms by line key today) are this pack's proposal: Question for the tech lead in the PR. Rules only, US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept \
//     && tsx studio/acceptance/C11.9.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", APPROVER = "user-B";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const tag = Date.now().toString(36);
const fieldStatus = (key: string) => sql(`select status from canonical_field where canonical_field_key = '${key}' order by version desc limit 1`);
const plant = (ws: string, key: string, status: "DRAFT" | "PUBLISHED") => sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label) values ('${randomUUID()}', '${ws}', '${key}', 1, '${status}', 'Acceptance probe ${tag}', 'text', 'STRING', 'CLIENT_LEVEL', 'PERSON', 'HUMAN', '${AUTHOR}', 'Acceptance probe ${status.toLowerCase()} ${tag}')`);
const rowsOf = (b: any) => (Array.isArray(b) ? b : (b?.rows ?? [])) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
/** The newest version number of a shared field, sent as concept §6's {reason, version}. */
const versionOf = (key: string) => Number(sql(`select coalesce(max(version), 0) from canonical_field where canonical_field_key = '${key}'`));
const changeId = (r: { body: any }) => String(r.body?.change?.id ?? r.body?.changeId ?? r.body?.id ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  const ws = sql(`select workspace_id from combination where combination_key = 'vv.single'`);
  if (!vv) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first"); process.exit(2); }
  const usedField = sql(`select m.canonical_field_key from form_field_map m join form_edition e on e.id = m.form_edition_id join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5257' and m.canonical_field_key is not null and m.status = 'PUBLISHED' limit 1`);
  const usedSection = sql(`select section_key from section_question where status = 'PUBLISHED' group by section_key order by count(*) desc limit 1`);
  const usedDoc = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and status = 'PUBLISHED' limit 1`) || sql(`select document_type_key from document_requirement where status = 'PUBLISHED' limit 1`);

  // ── Where used first (P-116) ──
  for (const [kind, key] of [["fields", usedField], ["sections", usedSection], ["document-types", usedDoc]] as const) {
    const u = await call("GET", `/library/${kind}/${encodeURIComponent(key)}/uses`);
    ok(`C11.9 (${kind}): "where used" answers before any action, each use linked and saying whether it blocks`, u.status === 200 && Array.isArray(u.body?.uses) && u.body.uses.length > 0 && u.body.uses.every((x: any) => x.label && "href" in x && typeof x.blocks === "boolean") && u.body.can && (u.body.can.retire === null || typeof u.body.can.retire === "string"), { status: u.status, key }); // eslint-disable-line @typescript-eslint/no-explicit-any
    ok(`C11.9 (${kind}): a used item cannot be deleted (can.delete is the reason in words, lifecycle.ts UsesView)`, typeof u.body?.can?.delete === "string" && u.body.can.delete.length > 5 && u.body.uses.some((x: any) => x.blocks && String(x.why ?? "").length > 5)); // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  // ── Retire is refused while in use (BR-9, P-52) ──
  const before = fieldStatus(usedField);
  const refused = await call("POST", `/library/fields/${encodeURIComponent(usedField)}/retire`, { reason: "acceptance: retire while in use", version: versionOf(usedField) });
  ok("C11.9 BR-9 fail: retiring a field the latest release still uses is refused 409, listing each use, nothing changed", refused.status === 409 && Array.isArray(refused.body?.uses) && refused.body.uses.length > 0 && fieldStatus(usedField) === before, { status: refused.status, words: words(refused) });
  const old = await call("PATCH", `/library/fields/${encodeURIComponent(usedField)}`, { retire: true });
  ok("C11.9 fail: the direct retire flag on the field edit no longer retires anything (refused, the field unchanged)", old.status >= 400 && fieldStatus(usedField) === before, { status: old.status, now: fieldStatus(usedField) });

  // ── Delete: never released, used nowhere: confirm, then Undo (P-116 amended) ──
  const draftKey = `person.acceptance_draft_${tag}`;
  plant(ws, draftKey, "DRAFT");
  const noReason = await call("POST", `/library/fields/${encodeURIComponent(draftKey)}/delete`, { version: versionOf(draftKey) });
  ok("C11.9 fail: a delete without a reason (3–300 characters) is refused 400 in words", noReason.status === 400 && fieldStatus(draftKey) === "DRAFT", noReason.status);
  const del = await call("POST", `/library/fields/${encodeURIComponent(draftKey)}/delete`, { reason: "acceptance: never released, used nowhere", version: versionOf(draftKey) });
  ok("C11.9 pass: the author's own never-released, unused draft field is deleted at once, with an Undo", del.status >= 200 && del.status < 300 && rowsOf((await call("GET", "/library/fields")).body).length > 0 && !rowsOf((await call("GET", "/library/fields")).body).some((r: any) => r.key === draftKey) && changeId(del) !== "", { status: del.status, words: words(del) }); // eslint-disable-line @typescript-eslint/no-explicit-any
  const undo = changeId(del) ? await call("POST", `/library/changes/${changeId(del)}/undo`) : { status: 0, body: null };
  ok("C11.9 pass: Undo puts the field back as it was", undo.status >= 200 && undo.status < 300 && fieldStatus(draftKey) === "DRAFT", undo.status);
  const undo2 = changeId(del) ? await call("POST", `/library/changes/${changeId(del)}/undo`) : { status: 0, body: null };
  ok("C11.9 fail: a second Undo is refused 409", undo2.status === 409, undo2.status);

  // ── Retire and restore through a second person (BR-8, BR-10) ──
  const pubKey = `person.acceptance_published_${tag}`;
  plant(ws, pubKey, "PUBLISHED");
  const ret = await call("POST", `/library/fields/${encodeURIComponent(pubKey)}/retire`, { reason: "acceptance: no longer asked by IRCC", version: versionOf(pubKey) });
  const rc = changeId(ret);
  ok("C11.9 pass: retiring a released field used nowhere is a change waiting for a second person; the field stays until approval", ret.status >= 200 && ret.status < 300 && rc !== "" && sql(`select status from library_change where id = '${rc || randomUUID()}'`) === "WAITING" && fieldStatus(pubKey) === "PUBLISHED", { status: ret.status, words: words(ret) });
  const self = rc ? await call("POST", `/library/changes/${rc}/approve`, { note: "own" }, AUTHOR) : { status: 0, body: null };
  ok("C11.9 BR-8 fail: the author cannot approve their own retire (403)", self.status === 403 && fieldStatus(pubKey) === "PUBLISHED", self.status);
  const ap = rc ? await call("POST", `/library/changes/${rc}/approve`, { note: "acceptance: approved" }, APPROVER) : { status: 0, body: null };
  ok("C11.9 pass: the Approver approves; the field reads Retired and is gone from the default list (kept in history)", ap.status >= 200 && ap.status < 300 && fieldStatus(pubKey) === "RETIRED" && Number(sql(`select count(*) from canonical_field where canonical_field_key = '${pubKey}'`)) >= 1, { status: ap.status, now: fieldStatus(pubKey) });
  const rs = await call("POST", `/library/fields/${encodeURIComponent(pubKey)}/restore`, { reason: "acceptance: asked again", version: versionOf(pubKey) });
  const rsc = changeId(rs);
  const rsAp = rsc ? await call("POST", `/library/changes/${rsc}/approve`, { note: "acceptance: approved" }, APPROVER) : { status: 0, body: null };
  ok("C11.9 pass: Restore goes through the second person too, and the field is back", rs.status >= 200 && rs.status < 300 && rsAp.status >= 200 && rsAp.status < 300 && fieldStatus(pubKey) === "PUBLISHED", [rs.status, rsAp.status]);
  const secRetire = await call("POST", `/library/sections/${encodeURIComponent(usedSection)}/retire`, { reason: "acceptance: retire while in use" });
  const docRetire = await call("POST", `/library/document-types/${encodeURIComponent(usedDoc)}/retire`, { reason: "acceptance: retire while in use" });
  ok("C11.9 BR-9 fail: sections and document types in use are refused the same way (409 listing each use)", [secRetire, docRetire].every((x) => x.status === 409 && Array.isArray(x.body?.uses) && x.body.uses.length > 0), [secRetire.status, docRetire.status]);

  // ── Reorder where order matters: forms in a combination = filing order (P-116) ──
  const lines = sql(`select distinct cf.lineage_key from combination_form cf where cf.combination_id = '${vv}' and cf.status in ('DRAFT', 'PUBLISHED') order by cf.lineage_key`).split("\n").filter(Boolean);
  const reversed = [...lines].reverse();
  const ro = await call("POST", `/combinations/${vv}/forms/reorder`, { lines: reversed });
  const draft = (await call("GET", `/combinations/${vv}/config?mode=draft`)).body?.snapshot?.forms?.map((f: { form_number: string }) => f.form_number) ?? [];
  const keyToForm = Object.fromEntries(sql(`select distinct cf.lineage_key || '§' || g.form_key from combination_form cf join gov_form_def g on g.id = cf.gov_form_def_id where cf.combination_id = '${vv}'`).split("\n").filter(Boolean).map((x) => x.split("§")));
  ok("C11.9 pass (P-116; route and storage: Question for the tech lead in the PR): the author sets the filing order of the Visitor visa's forms, and the draft keeps it", lines.length >= 2 && ro.status >= 200 && ro.status < 300 && JSON.stringify(draft) === JSON.stringify(reversed.map((k) => keyToForm[k])), { status: ro.status, draft, wanted: reversed.map((k) => keyToForm[k]) });
  const roBad = await call("POST", `/combinations/${vv}/forms/reorder`, { lines: reversed.slice(1) });
  ok("C11.9 fail: a filing order that leaves out a form is refused 400 in words, the order unchanged", roBad.status === 400 && words(roBad).length > 10, roBad.status);
  const move = await call("POST", "/structure/move", { key: "x", parentKey: "y" });
  ok("C11.9 fail (P-116: no move): there is no route that re-parents a Structure name", move.status === 404 || move.status === 405, move.status);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
