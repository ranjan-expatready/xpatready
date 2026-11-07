// B154 (runtime lane; P-97, P-244, P-412 F11): the author marks a library section as holding background answers through
// the product's own path. Proposed with a reason (author only), approved on To review by a second person (never the
// proposer), applied at approval as a draft section version, named on Review for the immigration expert, published with
// the next release; returned or withdrawn changes nothing; checked again at approval; a section that asks a declaration
// keeps its mark. A pass and a fail per rule, through the API on an isolated copy with the configured checkpoint loaded
// (Visitor visa and IMM 5257 Schedule 1's own parts). Sample, Unconfirmed: expert, no counsel. Rules only: no AI (US$0).
//   zsh studio/tools/isolated.sh runtime_b154 4436 start && tsx studio/tests/check_b154_section_background.ts 4436 xr_studio_runtime_b154
// A third argument "loaded" skips the reset and checkpoint load (about 2 minutes) on a copy that already has it, unchanged.
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_b154";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", APPROVER = "user-B", REVIEWER = "user-C", OFFICER = "user-O", CLIENT = "user-P";
const KEYS = /\b[a-z_]+\.[a-z_]+\b/;
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

(async () => {
  const served = (await call("GET", "/session", undefined, AUTHOR)).body?.workspace?.id;
  if (!served || sql(`select id from workspace where id=${lit(served)}`) !== served) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses.`); process.exit(2); }
  if (process.argv[4] !== "loaded") {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  }
  const ws = (await call("GET", "/session", undefined, AUTHOR)).body?.workspace?.id as string; // a reset makes a new workspace
  const vv = sql("select id from combination where combination_key='vv.single'");
  // IMM 5257 Schedule 1's own parts, by its own part names (the founder's ruling, P-412 F11): military service, government
  // positions, organisations; each a library section whose questions Schedule 1's form fields read.
  const sch1 = sql(`select distinct s.section_key || '|' || s.title from logical_section s join section_question q on q.section_key=s.section_key and q.workspace_id=s.workspace_id
    join form_field_map m on m.canonical_field_key=q.canonical_field_key join form_edition e on e.id=m.form_edition_id join gov_form_def g on g.id=e.gov_form_def_id
    where g.form_key='IMM 5257 SCH1' and s.title ~* '(military|government|organi[sz]ation)' order by 1`).split("\n").filter(Boolean).map((x) => { const [key, title] = x.split("|"); return { key, title }; });
  if (!vv || sch1.length !== 3) { console.error("STOP  the configured checkpoint has no Visitor visa or not Schedule 1's three parts", { vv, sch1 }); process.exit(2); }
  const [mil, gov, org] = [/military/i, /government/i, /organi/i].map((re) => sch1.find((s) => re.test(s.title))!);
  const section = (key: string) => sql(`select status || '|' || case when client_only then 't' else 'f' end || '|v' || version from logical_section where section_key=${lit(key)} order by version desc limit 1`);
  const listed = async (key: string) => ((await call("GET", "/library/sections", undefined, AUTHOR)).body as any[]).find((x) => x.key === key);
  const propose = (key: string, b: unknown, actor = AUTHOR) => call("POST", `/library/sections/${encodeURIComponent(key)}/background`, b, actor);
  const M0 = section(mil.key);
  ok("B154 read: Library › Sections says each section's mark (Schedule 1's military service is not background answers yet), with no change open", M0 === "PUBLISHED|f|v1" && (await listed(mil.key))?.client_only === false && (await listed(mil.key))?.background_change === null, { M0, row: await listed(mil.key) });

  // ---------------------------------------------------------------- roles and refusals, in words
  let r = await propose(mil.key, { on: true, reason: "Sample: background answers" }, OFFICER);
  ok("B154 roles fail: a case officer cannot propose it (403)", r.status === 403, r.status);
  r = await propose(mil.key, { on: true, reason: "Sample: background answers" }, APPROVER);
  ok("B154 roles fail: an approver without the author duty cannot propose it (403)", r.status === 403, r.status);
  r = await propose(mil.key, { on: true, reason: "Sample: background answers" }, CLIENT);
  ok("B154 roles fail: a client cannot propose it (403)", r.status === 403, r.status);
  r = await propose(mil.key, { on: true, reason: "Sample: background answers" }, "user-X");
  ok("B154 roles fail: an unknown person is refused, never taken for the author", r.status === 401 || r.status === 403, r.status);
  r = await propose(mil.key, { on: true, reason: "abc" });
  ok("B154 fail: a reason under 5 characters is refused in words (400)", r.status === 400 && /at least 5 characters/.test(JSON.stringify(r.body)), r.status);
  r = await propose(mil.key, { on: "yes", reason: "Sample: background answers" });
  ok("B154 fail: on must be true or false (400, in words)", r.status === 400 && /background answers/.test(JSON.stringify(r.body)), JSON.stringify(r.body).slice(0, 160));
  r = await propose(mil.key, { on: true, reason: "Sample: background answers", section: "x" });
  ok("B154 fail: an unknown key in the request is refused (400)", r.status === 400, r.status);
  r = await propose("not_a_section", { on: true, reason: "Sample: unknown" });
  ok("B154 fail: an unknown section is 404 in words", r.status === 404 && /not in the shared library/.test(words(r)), r.status);
  r = await propose(mil.key, { on: false, reason: "Sample: no change" });
  ok("B154 fail: proposing the mark it already has is refused (409 Nothing changes), said with no code", r.status === 409 && /already holds ordinary questions/.test(words(r)) && !KEYS.test(words(r)) && !/\bP-\d+\b/.test(words(r)), words(r));
  // A section that asks nothing: a Sample section added for this test only.
  sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, client_only, origin, updated_by, updated_at) values (gen_random_uuid(), ${lit(ws)}, 'b154_empty', 1, 'PUBLISHED', 'Sample: a section with no questions', 'Test only (B154).', 999, false, 'HUMAN', 'user-A', now())`);
  r = await propose("b154_empty", { on: true, reason: "Sample: nothing to mark" });
  ok("B154 fail: a section that asks no question is not marked (409, in words)", r.status === 409 && /asks no question yet/.test(words(r)), words(r));

  // ---------------------------------------------------------------- propose: waits for a second person; nothing changes yet
  r = await propose(mil.key, { on: true, reason: "Sample: the founder's ruling for IMM 5257 Schedule 1 (Unconfirmed: expert)" });
  ok("B154 pass: the author proposes Schedule 1's military service as background answers; it waits for a second person, in words", r.status === 201 && r.body?.status === "WAITING" && r.body?.after === true && r.body?.questions >= 5 && r.body?.uses >= 1 && !KEYS.test(r.body?.label ?? ""), r.body);
  const milId = r.body?.id;
  ok("B154 pass: nothing changes before approval: the section is as it was", section(mil.key) === M0, section(mil.key));
  r = await propose(mil.key, { on: true, reason: "Sample: again" });
  ok("B154 fail: a second proposal while one waits is refused (409 Already waiting)", r.status === 409 && /already waits/.test(words(r)), words(r));
  ok("B154: the section's row shows the waiting change", (await listed(mil.key))?.background_change?.status === "WAITING" && (await listed(mil.key))?.background_change?.on === true && (await listed(mil.key))?.client_only === false, (await listed(mil.key))?.background_change);
  r = await call("POST", `/library/sections/${mil.key}/retire`, { reason: "Sample: try to retire it" }, AUTHOR);
  ok("B154 fail: the section cannot be retired while the change waits (an open change blocks it)", r.status >= 400, `${r.status} ${words(r)}`);

  // ---------------------------------------------------------------- To review: a second person approves
  const q = (await call("GET", "/review-queue?filter=all&kind=library_change", undefined, APPROVER)).body;
  const item = (q.items as any[]).find((x) => x.id === `change:${milId}`);
  ok("B154 To review: listed in words (Ordinary questions → Background answers, questions, used by, reason), the second person's step", !!item && /Background answers, for every combination: Ordinary questions → Background answers/.test(item.what) && /Reason: Sample/.test(item.what) && item.state === "needs" && !KEYS.test(item.what), item?.what);
  const mine = (await call("GET", "/review-queue?filter=all&kind=library_change", undefined, AUTHOR)).body.items.find((x: any) => x.id === `change:${milId}`);
  ok("B154 To review fail: the proposer sees it waiting for a different person, with nothing to decide", mine?.state === "waiting" && !mine?.next, mine?.state);
  const detail = (await call("GET", `/library/changes/${milId}`, undefined, APPROVER)).body;
  ok("B154 To review: the change page says the section, before → after, what background answers mean, its reach", detail?.background?.section === mil.title && detail?.background?.before === "Ordinary questions" && detail?.background?.after === "Background answers" && /re-confirms it before signing/.test(detail?.background?.means ?? ""), detail?.background);
  r = await call("POST", `/library/changes/${milId}/approve`, {}, AUTHOR);
  ok("B154 fail: the person who proposed it cannot approve it (403)", r.status === 403 && /different person/.test(words(r)), `${r.status} ${words(r)}`);
  r = await call("POST", `/library/changes/${milId}/approve`, {}, OFFICER);
  ok("B154 roles fail: a case officer cannot approve it (403)", r.status === 403, r.status);
  ok("B154: still nothing changed after the refused approvals", section(mil.key) === M0, section(mil.key));
  r = await call("POST", `/library/changes/${milId}/approve`, {}, APPROVER);
  ok("B154 pass: a second person approves it; it is applied as a draft section version marked background answers", r.status >= 200 && r.status < 300 && r.body?.status === "APPROVED" && section(mil.key) === "DRAFT|t|v2", `${r.status} ${section(mil.key)} ${words(r)}`);
  const row = await listed(mil.key);
  ok("B154: approved but not released, the library row still says the released mark, and the change says from the next release", row?.client_only === false && row?.background_change?.status === "APPROVED", { client_only: row?.client_only, change: row?.background_change?.status });

  // ---------------------------------------------------------------- returned, withdrawn, checked again at approval
  r = await propose(gov.key, { on: true, reason: "Sample: government positions" });
  const govId = r.body?.id;
  r = await call("POST", `/library/changes/${govId}/return`, { note: "Sample: check the wording first" }, APPROVER);
  ok("B154 fail: a returned change changes nothing and shows as returned", r.status < 300 && section(gov.key) === "PUBLISHED|f|v1" && (await listed(gov.key))?.background_change?.status === "RETURNED", `${r.status} ${section(gov.key)}`);
  r = await call("POST", `/library/changes/${govId}/withdraw`, { note: "Sample: someone else withdraws" }, APPROVER);
  ok("B154 fail: only the proposer withdraws it (403)", r.status === 403, r.status);
  r = await call("POST", `/library/changes/${govId}/withdraw`, { note: "Sample: proposed again later" }, AUTHOR);
  ok("B154 pass: the proposer withdraws the returned change; nothing changed and the row has no open change", r.status < 300 && sql(`select status from library_change where id=${lit(govId)}`) === "WITHDRAWN" && section(gov.key) === "PUBLISHED|f|v1" && (await listed(gov.key))?.background_change === null, `${r.status} ${words(r)}`);
  r = await propose(gov.key, { on: true, reason: "Sample: government positions, again" });
  const gov2 = r.body?.id;
  ok("B154 pass: after a withdrawal it can be proposed again", r.status === 201, r.status);
  sql(`update logical_section set client_only=true where id=(select id from logical_section where section_key=${lit(gov.key)} order by version desc limit 1)`);
  r = await call("POST", `/library/changes/${gov2}/approve`, {}, APPROVER);
  ok("B154 fail: approval checks again: the mark changed meanwhile, so nothing is applied and it waits again (409)", r.status === 409 && /changed after it was proposed/.test(words(r)) && sql(`select status from library_change where id=${lit(gov2)}`) === "WAITING" && section(gov.key) === "PUBLISHED|t|v1", `${r.status} ${words(r)} ${section(gov.key)}`);
  sql(`update logical_section set client_only=false where id=(select id from logical_section where section_key=${lit(gov.key)} order by version desc limit 1)`);
  r = await call("POST", `/library/changes/${gov2}/approve`, {}, APPROVER);
  ok("B154 pass: once it is as proposed again, the second person approves it", r.status < 300 && section(gov.key) === "DRAFT|t|v2", `${r.status} ${section(gov.key)}`);
  r = await propose(org.key, { on: true, reason: "Sample: organisations" });
  r = await call("POST", `/library/changes/${r.body?.id}/approve`, {}, APPROVER);
  ok("B154 pass: Schedule 1's organisations part approved too", r.status < 300 && section(org.key) === "DRAFT|t|v2", `${r.status} ${section(org.key)}`);

  // ---------------------------------------------------------------- declarations keep the mark (P-244)
  const decl = sql(`select s.section_key from logical_section s join section_question q on q.section_key=s.section_key join canonical_field f on f.canonical_field_key=q.canonical_field_key where f.value_type='declaration' and s.status='PUBLISHED' limit 1`);
  let declKey = decl;
  if (!declKey) {
    // The checkpoint asks no declaration as a question (IRCC's are signed on the forms): a Sample one, for this test only.
    sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, label, meaning, value_type, data_type, scope, subject_kind, group_key, origin, updated_by, updated_at) select gen_random_uuid(), id, 'person.b154_sample_declaration', 1, 'PUBLISHED', 'Sample declaration (B154 test)', 'Test only (B154).', 'declaration', 'BOOLEAN', f.scope, f.subject_kind, 'person', 'HUMAN', 'user-A', now() from (select scope, subject_kind from canonical_field where canonical_field_key='person.family_name' limit 1) f, workspace where id=${lit(ws)}`);
    sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, client_only, origin, updated_by, updated_at) values (gen_random_uuid(), ${lit(ws)}, 'b154_declarations', 1, 'PUBLISHED', 'Sample: declarations', 'Test only (B154).', 998, true, 'HUMAN', 'user-A', now())`);
    sql(`insert into section_question (id, workspace_id, lineage_key, section_key, canonical_field_key, display_order, repeats, tier, collected_from, version, status, origin, updated_by, updated_at) values (gen_random_uuid(), ${lit(ws)}, 'person.b154_sample_declaration', 'b154_declarations', 'person.b154_sample_declaration', 1, 'per_person', 'case', 'client_questionnaire', 1, 'PUBLISHED', 'HUMAN', 'user-A', now())`);
    declKey = "b154_declarations";
  }
  r = await propose(declKey!, { on: false, reason: "Sample: try to unmark declarations" });
  ok("B154 P-244 fail: a section that asks a declaration keeps its mark (409, declarations stay with the client), in words", r.status === 409 && /declaration is always the client's own/.test(words(r)) && !KEYS.test(words(r)), `${r.status} ${words(r)}`);

  // ---------------------------------------------------------------- review and break round 1: each with its fail test
  const field = (key: string, label: string, type = "text") => sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, label, meaning, value_type, data_type, scope, subject_kind, group_key, origin, updated_by, updated_at) select gen_random_uuid(), ${lit(ws)}, ${lit(key)}, 1, 'PUBLISHED', ${lit(label)}, 'Test only (B154).', ${lit(type)}, 'STRING', f.scope, f.subject_kind, 'person', 'HUMAN', 'user-A', now() from (select scope, subject_kind from canonical_field where canonical_field_key='person.family_name' limit 1) f`);
  const sampleSection = (key: string, title: string, on: boolean, fact: string) => {
    sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, client_only, origin, updated_by, updated_at) values (gen_random_uuid(), ${lit(ws)}, ${lit(key)}, 1, 'PUBLISHED', ${lit(title)}, 'Test only (B154).', 997, ${on}, 'HUMAN', 'user-A', now())`);
    sql(`insert into section_question (id, workspace_id, lineage_key, section_key, canonical_field_key, display_order, repeats, tier, collected_from, version, status, origin, updated_by, updated_at) values (gen_random_uuid(), ${lit(ws)}, ${lit(fact)}, ${lit(key)}, ${lit(fact)}, 1, 'per_person', 'case', 'client_questionnaire', 1, 'PUBLISHED', 'HUMAN', 'user-A', now())`);
  };
  const withdraw = (id: string, actor = AUTHOR) => call("POST", `/library/changes/${id}/withdraw`, { note: "Sample: test clean-up" }, actor);
  // Review M2, break M2: approval checks declarations again (P-244).
  field("person.b154_sample_text", "Sample text (B154 test)"); sampleSection("b154_marked", "Sample: marked", true, "person.b154_sample_text");
  r = await propose("b154_marked", { on: false, reason: "Sample: unmark it" });
  const unmarkId = r.body?.id;
  sql(`update canonical_field set value_type='declaration' where canonical_field_key='person.b154_sample_text'`);
  r = await call("POST", `/library/changes/${unmarkId}/approve`, {}, APPROVER);
  ok("B154 review M2 fail: a declaration placed in the section after the unmark was proposed stops its approval (409); it waits and nothing changes", r.status === 409 && /declaration is always the client's own/.test(words(r)) && sql(`select status from library_change where id=${lit(unmarkId)}`) === "WAITING" && section("b154_marked") === "PUBLISHED|t|v1", `${r.status} ${words(r)} ${section("b154_marked")}`);
  await withdraw(unmarkId);
  // Review M1, break M4: a background section's questions are the client's to fill.
  const pt = sql(`select section_key from logical_section where title ~* '^previous travel$' and status='PUBLISHED' limit 1`)!;
  const ptFact = sql(`select canonical_field_key from section_question where section_key=${lit(pt)} and status='PUBLISHED' and collected_from='client_questionnaire' order by display_order limit 1`)!;
  const ptRow = () => sql(`select id from section_question where lineage_key=${lit(ptFact)} order by version desc limit 1`);
  sql(`update section_question set collected_from='staff_working_view' where id=${lit(ptRow()!)}`);
  r = await propose(pt, { on: true, reason: "Sample: previous travel" });
  ok("B154 review M1 fail: a section whose question the case officer fills is not marked (409, change who fills first), in words", r.status === 409 && /case officer fills/.test(words(r)) && /Change who fills/.test(words(r)) && !KEYS.test(words(r)), `${r.status} ${words(r)}`);
  sql(`update section_question set collected_from='client_questionnaire' where id=${lit(ptRow()!)}`);
  r = await call("POST", `/library/fields/${encodeURIComponent(ptFact)}/fills`, { to: "CASE_OFFICER", reason: "Sample: the office holds it" }, AUTHOR);
  const fillsId = r.body?.id;
  r = await propose(pt, { on: true, reason: "Sample: previous travel" });
  ok("B154 break M4 fail: while a change of who fills one of its questions is open, the section is not marked (409)", r.status === 409 && /who fills/.test(words(r)), `${r.status} ${words(r)}`);
  sql(`update library_change set status='WITHDRAWN' where id=${lit(fillsId)}`);
  r = await propose(pt, { on: true, reason: "Sample: previous travel" });
  const ptId = r.body?.id;
  ok("B154 pass: with no open change of who fills, the section can be proposed", r.status === 201, `${r.status} ${words(r)}`);
  r = await call("POST", `/library/fields/${encodeURIComponent(ptFact)}/fills`, { to: "CASE_OFFICER", reason: "Sample: the office holds it" }, AUTHOR);
  ok("B154 review M1 fail: while the section waits to be marked, the case officer is not proposed to fill its question (409)", r.status === 409 && /background answers/.test(words(r)), `${r.status} ${words(r)}`);
  sql(`update section_question set collected_from='staff_working_view' where id=${lit(ptRow()!)}`);
  r = await call("POST", `/library/changes/${ptId}/approve`, {}, APPROVER);
  ok("B154 review M1 fail: approval checks again: a question filled by the case officer meanwhile stops it (409); it waits and nothing changes", r.status === 409 && /case officer fills/.test(words(r)) && sql(`select status from library_change where id=${lit(ptId)}`) === "WAITING" && section(pt) === "PUBLISHED|f|v1", `${r.status} ${words(r)}`);
  sql(`update section_question set collected_from='client_questionnaire' where id=${lit(ptRow()!)}`);
  r = await withdraw(ptId);
  ok("B154 pass: the proposer withdraws the waiting change (clean-up)", r.status < 300, r.status);
  // Break M3: the case officer's or representative's own details are never background answers.
  const repSection = sql(`select q.section_key from section_question q join logical_section s on s.section_key=q.section_key where q.canonical_field_key like 'representative.%' and s.status='PUBLISHED' and not s.client_only limit 1`);
  r = repSection ? await propose(repSection, { on: true, reason: "Sample: the representative's section" }) : { status: 0, body: null };
  ok("B154 break M3 fail: a section that asks the representative's own details is not marked (409, in words)", r.status === 409 && /representative's own details/.test(words(r)) && !KEYS.test(words(r)), `${repSection} ${r.status} ${words(r)}`);
  // Break M5: a question does not move between a background section and another without a second person.
  const movedFact = sql(`select canonical_field_key from section_question where section_key=${lit(mil.key)} and status='PUBLISHED' order by display_order limit 1`)!;
  const pl = sql(`select collected_from || '|' || repeats from section_question where lineage_key=${lit(movedFact)} order by version desc limit 1`)!.split("|");
  r = await call("POST", `/library/fields/${encodeURIComponent(movedFact)}/placement`, { sectionKey: pt, collectedFrom: pl[0], repeats: pl[1] }, AUTHOR);
  ok("B154 break M5 fail: moving a question out of a section that holds background answers is refused (409, mark the section instead)", r.status === 409 && /out of a section that holds background answers/.test(JSON.stringify(r.body)) && sql(`select section_key from section_question where lineage_key=${lit(movedFact)} order by version desc limit 1`) === mil.key, `${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  // Break m1: an approved mark not released yet can be withdrawn by its proposer; the section goes back.
  field("person.b154_sample_text2", "Sample text two (B154 test)"); sampleSection("b154_plain", "Sample: plain", false, "person.b154_sample_text2");
  r = await propose("b154_plain", { on: true, reason: "Sample: mark it" });
  const plainId = r.body?.id;
  await call("POST", `/library/changes/${plainId}/approve`, {}, APPROVER);
  const approvedDraft = section("b154_plain");
  r = await withdraw(plainId, APPROVER);
  ok("B154 break m1 fail: someone else cannot withdraw an approved change (403)", r.status === 403, r.status);
  r = await withdraw(plainId);
  ok("B154 break m1 pass: the proposer withdraws an approved mark before its release: the draft goes and the section is as released", approvedDraft === "DRAFT|t|v2" && r.status < 300 && sql(`select status from library_change where id=${lit(plainId)}`) === "WITHDRAWN" && section("b154_plain") === "PUBLISHED|f|v1", `${approvedDraft} ${r.status} ${words(r)} ${section("b154_plain")}`);
  // Review M3, break M1: a returned change is not sent again with other words.
  r = await propose("b154_plain", { on: true, reason: "Sample: mark it again" });
  const againId = r.body?.id;
  await call("POST", `/library/changes/${againId}/return`, { note: "Sample: not yet" }, APPROVER);
  r = await call("POST", `/library/changes/${againId}/resubmit`, { reason: "Sample: corrected the words", label: "Sample: plain · no longer background answers" }, AUTHOR);
  ok("B154 review M3 fail: a returned change is not sent again with another heading (409, propose it again)", r.status === 409 && /Propose it again|not sent again/.test(words(r) + JSON.stringify(r.body)) && sql(`select status || '|' || label from library_change where id=${lit(againId)}`) === "RETURNED|Sample: plain · background answers, for every combination", `${r.status} ${words(r)}`);
  await withdraw(againId);
  // Break m2: an invisible reason is no reason.
  r = await propose("b154_plain", { on: true, reason: "​​​​​​​" });
  ok("B154 break m2 fail: a reason of invisible characters only is refused (400)", r.status === 400, r.status);
  // P-97: the second person sees which questions a document supplies today.
  // The checkpoint's document types supply no question's facts yet: one supplies the Sample field, for this test only.
  const docType = sql(`select document_type_key from document_type where status='PUBLISHED' order by document_type_key limit 1`);
  if (docType) sql(`update document_type set supplies_facts = array_append(supplies_facts, 'person.b154_sample_text2') where document_type_key=${lit(docType)} and status='PUBLISHED'`);
  const docSection = docType ? "b154_plain" : null;
  r = docSection ? await propose(docSection, { on: true, reason: "Sample: from documents" }) : { status: 0, body: null };
  ok("B154 break M3 pass: marking a section a document supplies answers for tells the second person which ones (the client answers them once marked)", r.status === 201 && (r.body?.documents ?? []).length >= 1 && !KEYS.test((r.body?.documents ?? []).join(" ")), `${docSection} ${r.status} ${JSON.stringify(r.body?.documents ?? words(r))}`);
  if (r.body?.id) {
    const w = (await call("GET", "/review-queue?filter=all&kind=library_change", undefined, APPROVER)).body.items.find((x: any) => x.id === `change:${r.body.id}`)?.what ?? "";
    ok("B154 break M3: To review says it in words", /a document supplies \d+ of them today/.test(w), w);
    await withdraw(r.body.id);
  }

  // ---------------------------------------------------------------- Review names it once per section; the release publishes it
  const c = (await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body;
  const lines = ((c?.draft?.changes ?? []) as any[]).filter((x) => x.kind === "Background answers");
  ok("B154: Review names each marked section once, in words, for the immigration expert (no line per question)", lines.length === 3 && lines.every((x) => x.needs_sme && /background answers now/.test(x.label) && !KEYS.test(x.label)) && lines.some((x) => x.label.includes(mil.title)), lines.map((x) => x.label));
  ok("B154 fail: no generic \"Question placement\" line for Schedule 1's questions (the mark is said once per section)", !((c?.draft?.changes ?? []) as any[]).some((x) => x.kind === "Question placement" && sch1.some((s) => sql(`select section_key from section_question where lineage_key=${lit(x.key)} order by version desc limit 1`) === s.key)), ((c?.draft?.changes ?? []) as any[]).filter((x) => x.kind === "Question placement").length);
  r = await call("POST", `/combinations/${vv}/sources/sample`, undefined, AUTHOR); // G1 (C5.4): the demo seed answers its numbers
  let rel: { status: number; body: any } = { status: 0, body: null };
  for (let attempt = 0; attempt < 2; attempt++) {
    r = await call("POST", `/combinations/${vv}/submit`, { note: "B154: Schedule 1's parts are background answers (Sample, Unconfirmed: expert)" }, AUTHOR);
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    const refs = ((sub?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
    if (refs.length) await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    rel = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(words(rel))) break;
  }
  ok("B154 pass: the next Visitor visa release goes out", rel.status < 300, `${rel.status} ${words(rel)}`);
  ok("B154 pass: the section is published marked, and each change is released in that pack", [mil, gov, org].every((s) => /^PUBLISHED\|t\|v2$/.test(section(s.key) ?? "")) && sql(`select count(*) from library_change where kind='section_background' and status='RELEASED' and released_in is not null`) === "3", [mil, gov, org].map((s) => section(s.key)));
  const snap = (await call("GET", `/combinations/${vv}/config?mode=published`, undefined, AUTHOR)).body?.snapshot;
  const sch1Placements = ((snap?.placements ?? []) as any[]).filter((p) => sch1.some((s) => s.key === p.section_id));
  ok("B154 pass: the released Visitor visa marks every Schedule 1 military service, government position and organisation question as background (client_only)", sch1Placements.length >= 15 && sch1Placements.every((p) => p.client_only === true), sch1Placements.map((p) => `${p.fact}:${p.client_only}`).slice(0, 6));
  const other = ((snap?.placements ?? []) as any[]).find((p) => p.fact === "person.family_name");
  ok("B154 fail: a question outside those parts (family name) is not marked", !!other && !other.client_only, other?.client_only);
  ok("B154: once released, the rows have no open change and say background answers", (await Promise.all([mil, gov, org].map((s) => listed(s.key)))).every((x) => x?.client_only === true && x?.background_change === null));
  const fs = ((await call("GET", `/combinations/${vv}/fact-sources`, undefined, AUTHOR)).body?.facts ?? []) as any[];
  const milFact = fs.find((f) => f.role === "principal" && sch1Placements.some((p) => p.fact === f.fact && p.section_id === mil.key));
  ok("B154 (P-97): for every combination its questions are the client's own: a document or the case officer is never their source", !!milFact && milFact.clientOnly === true && milFact.ruleSource === "CLIENT" && milFact.agentOffered === false, milFact && { fact: milFact.fact, clientOnly: milFact.clientOnly, rule: milFact.ruleSource });
  r = milFact ? await call("PUT", `/combinations/${vv}/fact-sources/principal/${encodeURIComponent(milFact.fact)}`, { source: "AGENT", version: milFact.version, sourceReason: "Sample: the office holds it" }, AUTHOR) : { status: 0, body: null };
  ok("B154 (P-97) fail: choosing the case officer as its source for this combination is refused, in words", r.status >= 400 && /background answer|only the client/.test(JSON.stringify(r.body)), `${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);

  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
