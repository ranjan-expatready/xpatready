// C6.17 A multi-stage case (B139; concept screens/B139/concept.md §6 steps C6.17-1…14, challenge.md). On the configured
// checkpoint with its Sample route "Study, then work" (samples/routes.json, loaded after release one): fresh cases each run,
// never the Sample family case's data (it is only read, step 13). The route, its stages, forms and documents are read at
// run time (P-319); every group a step asserts is non-empty or the step FAILS, never skips. Every route, key detail and
// deadline is Sample (P-412 F13). AI off, US$0. Build discovery D1 (PR): the study and work permits have no derived
// per-person checklist on the checkpoint (samples/fee-table.json "checklist" is the Visitor visa's only), so step 5 makes
// no upload and step 9 reads the next release's documents from the dialog; "On file from" is proved by the engine test.
// Runs on a FRESH isolated copy (the checkpoint loads its own configuration):
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C6.17.test.ts 4440 xr_studio_accept
import { AUTHOR, CLIENT, OFFICER, call, firms, main, ok, prepare, run, sql } from "./lib/m3.ts";
import { sampleRelease } from "./lib/sample-release.ts";

type Stage = { id: string; key: string; name: string; state: string; words: string; version: number; combination_id: string; key_details: { field: string; value: string | null }[]; deadline: { due: string | null; why: string; sample: boolean } | null; cannot_start_why: string | null };
type Stages = { route: { key: string; label: string; basis: string } | null; stages: Stage[]; current: string; next: string | null };
type Openable = { combination_id: string; combination: string; startable: boolean; stage?: { route: string; key: string; name: string; earlier: { key: string; name: string; key_details: { field: string; label: string; type: string; same_every_stage: boolean }[] }[] } };
const n = (q: string) => Number(sql(q) ?? -1);
const words = (r: { body: { detail?: string } | null }) => String(r.body?.detail ?? "");
const stagesOf = async (id: string, actor = OFFICER) => (await call("GET", `/runtime/cases/${id}/stages`, undefined, actor)).body as Stages;
const counts = () => ["runtime_case", "case_stage", "pack_work_pin", "answer_subject", "case_participant", "client_canonical_answer", "filing", "submission_group", "checklist_line"].map((t) => `${t}:${n(`select count(*) from ${t}`)}`).join(",");
const open = (combinationId: string, extra: Record<string, unknown> = {}, ref = `C617-${run}-${Math.random().toString(36).slice(2, 6)}`) =>
  call("POST", "/runtime/cases", { combinationId, reference: ref, clientActor: CLIENT, principal: { displayName: "Sample Client A" }, ...extra });
const UCI = "12345678", VALID = "2027-02-03";

await main("C6.17", "A multi-stage case (Sample route: Study, then work)", async () => {
  // ---------------------------------------------------------------- the checkpoint
  await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  const firstKey = later?.stage?.earlier[0];
  const first = firstKey ? rows.find((r) => r.startable && !r.stage && sql(`select combination_key from combination where id='${r.combination_id}'`) === sql(`select (stages->0->>'combination_key') from route where key='${later!.stage!.route}'`)) : undefined;
  // ---------------------------------------------------------------- C6.17-1
  ok("C6.17-1 pass: the checkpoint loads a Sample route whose 2 stages are both startable: the later one lists the earlier one with its key details (fails, never skips, when either is missing)",
    load.status < 300 && !!later && !!first && n(`select count(*) from route where basis='SAMPLE'`) >= 1 && (firstKey?.key_details.length ?? 0) > 0, { load: load.status, later: later?.combination, first: first?.combination, earlier: firstKey });
  if (!later || !first || !firstKey) return;
  const dateField = firstKey.key_details.find((d) => d.type === "DATE")?.field ?? "", sameField = firstKey.key_details.find((d) => d.same_every_stage)?.field ?? "";
  ok("setup: the earlier stage records a date (for the deadline) and a fact the same at every stage (the UCI)", !!dateField && sameField === "person.uci", firstKey.key_details);

  // ---------------------------------------------------------------- C6.17-4 (first: nothing may be created)
  const before4 = counts();
  const bad = await open(later.combination_id, { earlier: [{ stage: firstKey.key, done_before: true, key_details: { [dateField]: "3 Feb 2027" } }] });
  const badUci = await open(later.combination_id, { earlier: [{ stage: firstKey.key, done_before: true, key_details: { [sameField]: "AB-12" } }] });
  ok("C6.17-4 fail: text in a date key detail, or a UCI the release's own check refuses, is a 400 on that field; nothing is created",
    bad.status === 400 && (bad.body?.errors ?? []).some((e: { field: string }) => e.field === `earlier.0.key_details.${dateField}`) && badUci.status === 400 && (badUci.body?.errors ?? []).some((e: { field: string }) => e.field === `earlier.0.key_details.${sameField}`) && counts() === before4,
    { bad: words(bad), badUci: words(badUci) });

  // ---------------------------------------------------------------- C6.17-2, -3: open at the later stage
  const made = await open(later.combination_id, { earlier: [{ stage: firstKey.key, done_before: true, key_details: { [sameField]: UCI, [dateField]: VALID } }] });
  const W = made.body?.id as string | undefined;
  const ws = W ? await stagesOf(W) : null;
  const done = ws?.stages.find((s) => s.key === firstKey.key), cur = ws?.stages.find((s) => s.id === ws?.current);
  const principal = (made.body?.people ?? []).find((p: { role: string }) => p.role === "principal")?.subject_id as string | undefined;
  ok("C6.17-2 pass: opening on the later stage writes the earlier one DONE_BEFORE with its key details on the stage record, then the opening stage CURRENT",
    made.status === 201 && done?.state === "DONE_BEFORE" && done.words === "Done before we started" && cur?.key === later.stage!.key && cur.state === "CURRENT"
    && done.key_details.find((d) => d.field === sameField)?.value === UCI && done.key_details.find((d) => d.field === dateField)?.value === VALID, { status: made.status, stages: ws?.stages.map((s) => `${s.key}:${s.state}`) });
  ok("C6.17-2 pass (rule 4): the done-before stage has no pin, application subject, filing, checklist line or group",
    !!done && n(`select count(*) from pack_work_pin where case_id='${W}' and combination_id='${done.combination_id}'`) === 0 && sql(`select application_subject_id is null from case_stage where id='${done.id}'`) === "t"
    && n(`select count(*) from filing where stage_id='${done.id}'`) + n(`select count(*) from checklist_line where stage_id='${done.id}'`) + n(`select count(*) from submission_group where stage_id='${done.id}'`) === 0);
  ok("C6.17-2 pass (P-412 F13 (c)): the UCI is also Client A's answer, entered by the officer through the stage record; the permit's end date is not an answer",
    sql(`select value_json #>> '{}' || '|' || (source_json->>'channel') || '|' || (source_json->>'actor') from client_canonical_answer where subject_id='${principal}' and canonical_field_key='${sameField}' and superseded_by_id is null`) === `${UCI}|stage_record|${OFFICER}`
    && n(`select count(*) from client_canonical_answer where canonical_field_key='${dateField}'`) === 0);
  ok("C6.17-3 pass: the opening stage's deadline is worked out from the earlier stage's date, labelled Sample", cur?.deadline?.due === VALID && cur.deadline.sample === true && /Sample/.test(cur.deadline.why), cur?.deadline);
  const noDate = await open(later.combination_id, { earlier: [{ stage: firstKey.key, done_before: true, key_details: { [sameField]: UCI } }] });
  const nd = noDate.body?.id ? (await stagesOf(noDate.body.id)).stages.find((s) => s.state === "CURRENT")?.deadline : null;
  ok("C6.17-3 fail: with the date missing the deadline is not set: \"Can't set: … is missing\", still Sample", noDate.status === 201 && nd?.due === null && /^Can't set: .* is missing/.test(nd.why) && nd.sample === true, nd);

  // ---------------------------------------------------------------- C6.17-5: a case on the first stage, worked
  const sMade = await open(first.combination_id);
  const S = sMade.body?.id as string | undefined;
  const sp = (sMade.body?.people ?? []) as { subject_id: string; role: string }[];
  const P = sp.find((p) => p.role === "principal")?.subject_id ?? "", APP1 = sp.find((p) => p.role === "case")?.subject_id ?? "";
  const a1 = await call("PUT", `/runtime/cases/${S}/answers/${P}/person.family_name`, { value: "SAMPLE-FAMILY", expectedId: null });
  const a2 = await call("PUT", `/runtime/cases/${S}/answers/${APP1}/case.submission_office_name`, { value: "Sample office (stage 1)", expectedId: null });
  const p1 = (await prepare(S!)).p;
  const st1 = S ? await stagesOf(S) : null;
  const S1 = st1?.current ?? "", S2 = st1?.next ?? "";
  ok("C6.17-5 pass: a case on the first stage: a person's answer and an application answer given, Prepare makes its filing and family group on that stage; the next stage is offered",
    sMade.status === 201 && a1.status < 300 && a2.status < 300 && (p1?.filings.length ?? 0) > 0 && n(`select count(*) from filing where case_id='${S}' and stage_id='${S1}'`) > 0 && n(`select count(*) from submission_group where case_id='${S}' and stage_id='${S1}' and kind='FAMILY'`) === 1 && !!S2,
    { a1: a1.status, a2: a2.status, filings: p1?.filings.length, next: S2 });

  // ---------------------------------------------------------------- C6.17-6: who may
  const f = await firms();
  const v1 = st1?.stages.find((x) => x.id === S1)?.version ?? 0;
  const startBody = { from_stage: S1, stage_version: v1, key_details: { [dateField]: VALID }, reason: "The client filed the study permit themselves before the firm took the next step" };
  const deny = [await call("GET", `/runtime/cases/${S}/stages`, undefined, CLIENT), await call("POST", `/runtime/cases/${S}/stages/next`, startBody, CLIENT), await call("GET", `/runtime/cases/${S}/stages`, undefined, AUTHOR), await call("POST", `/runtime/cases/${S}/stages/next`, startBody, AUTHOR)].map((x) => x.status);
  const other = [await call("GET", `/runtime/cases/${S}/stages`, undefined, f.soloRep ?? "user-S"), await call("POST", `/runtime/cases/${S}/stages/next`, startBody, f.soloRep ?? "user-S")].map((x) => x.status);
  ok("C6.17-6 fail: the client and configuration people get 403 (stages and start); another firm's staff 404; nothing changed", deny.every((x) => x === 403) && other.every((x) => x === 404) && sql(`select state from case_stage where id='${S1}'`) === "CURRENT", { deny, other });

  // ---------------------------------------------------------------- C6.17-7: unrecorded filing needs a reason
  const preview = (await call("GET", `/runtime/cases/${S}/stages/next`)).body;
  const noReason = await call("POST", `/runtime/cases/${S}/stages/next`, { from_stage: S1, stage_version: v1 });
  ok("C6.17-7 fail: the ending stage has a filing with no record: the preview names it and a start without a reason is a 400 on the reason; nothing changed",
    (preview?.unrecorded?.length ?? 0) > 0 && noReason.status === 400 && (noReason.body?.errors ?? []).some((e: { field: string }) => e.field === "reason") && sql(`select state from case_stage where id='${S1}'`) === "CURRENT", { unrecorded: preview?.unrecorded, words: words(noReason) });
  ok("C6.17-4 pass (BR-4): before the click the preview says what comes along, what is asked again, the new forms and documents of the next release, the deadline (Sample) and the next release",
    !!preview?.to && preview.people.some((x: { subject: string; comes: boolean }) => x.subject === P && x.comes) && preview.counts.asked_again > 0 && preview.counts.forms > 0 && preview.forms.length === preview.counts.forms && preview.counts.documents > 0 && preview.deadline?.sample === true,
    { to: preview?.to, counts: preview?.counts });

  // ---------------------------------------------------------------- C6.17-8: the start
  const ansBefore = sql(`select string_agg(canonical_field_key || '=' || (value_json #>> '{}'), ',' order by canonical_field_key) from client_canonical_answer where subject_id='${P}' and superseded_by_id is null`);
  const started = await call("POST", `/runtime/cases/${S}/stages/next`, startBody);
  const st2 = S ? await stagesOf(S) : null;
  const APP2 = sql(`select application_subject_id from case_stage where id='${S2}'`) ?? "";
  const nextCombo = sql(`select combination_id from case_stage where id='${S2}'`);
  ok("C6.17-8 pass: Start next stage ends the first stage and starts the next (states, the stage's key detail kept on the ended stage), the case's combination moves, pin revision 1 on the next combination",
    started.status === 201 && sql(`select state from case_stage where id='${S1}'`) === "ENDED_NEXT_STARTED" && sql(`select state || ':' || started_from from case_stage where id='${S2}'`) === "CURRENT:NEXT_STAGE"
    && sql(`select combination_id from runtime_case where id='${S}'`) === nextCombo && sql(`select revision from pack_work_pin where case_id='${S}' and combination_id='${nextCombo}'`) === "1"
    && st2?.stages.find((x) => x.id === S1)?.key_details.find((d) => d.field === dateField)?.value === VALID && /started/.test(started.body?.words ?? "") && /\(Sample\)/.test(started.body?.words ?? ""), { status: started.status, words: started.body?.words ?? words(started) });
  ok("C6.17-8 pass (challenge B3): a new application subject with no answers; Client A's person answers are unchanged and read where they are",
    !!APP2 && APP2 !== APP1 && n(`select count(*) from client_canonical_answer where subject_id='${APP2}'`) === 0 && sql(`select string_agg(canonical_field_key || '=' || (value_json #>> '{}'), ',' order by canonical_field_key) from client_canonical_answer where subject_id='${P}' and superseded_by_id is null`) === ansBefore);
  const q2 = (await call("GET", `/runtime/cases/${S}/questionnaire?mode=agent`)).body;
  const qOf = (fact: string, subject: string) => (q2?.sections ?? []).flatMap((x: { questions: { fact: string; subjectId: string; answer: { value: unknown } | null }[] }) => x.questions).find((x: { fact: string; subjectId: string }) => x.fact === fact && x.subjectId === subject);
  ok("C6.17-8 pass (BR-5): the next stage's questionnaire reads Client A's answer where it is and asks the application's own question again (empty)",
    qOf("person.family_name", P)?.answer?.value === "SAMPLE-FAMILY" && !!qOf("case.submission_office_name", APP2) && qOf("case.submission_office_name", APP2).answer === null && !qOf("case.submission_office_name", APP1));

  // ---------------------------------------------------------------- C6.17-9: the new stage, and readers on it only
  const p2 = (await prepare(S!)).p;
  const relForms = (JSON.parse(sql(`select snapshot->'forms' from config_release where id=(select config_release_id from pack_work_pin where case_id='${S}' and combination_id='${nextCombo}')`) ?? "[]") as { form_number: string }[]).map((x) => x.form_number);
  const itemForms = [...new Set((p2?.items ?? []).filter((i) => i.kind === "form").map((i) => i.form))];
  ok("C6.17-9 pass: the new stage has its own filing and its own family group (one FAMILY group per stage), and its forms are its release's",
    (p2?.filings.length ?? 0) > 0 && n(`select count(*) from filing where case_id='${S}' and stage_id='${S2}'`) > 0 && n(`select count(*) from submission_group where case_id='${S}' and kind='FAMILY'`) === 2
    && n(`select count(*) from submission_group where case_id='${S}' and stage_id='${S2}' and kind='FAMILY'`) === 1 && itemForms.length > 0 && itemForms.every((x) => relForms.includes(x as string)), { itemForms, relForms });
  const s1Filings = (sql(`select string_agg(id::text, ',') from filing where stage_id='${S1}'`) ?? "").split(",").filter(Boolean);
  const reads = await Promise.all(["/prepare", "/filings", "/findings", "/checklist", "/record", "/release-update"].map(async (x) => [x, await call("GET", `/runtime/cases/${S}${x}`)] as const));
  const leaked = reads.filter(([, r]) => s1Filings.some((id) => JSON.stringify(r.body ?? {}).includes(id))).map(([x]) => x);
  ok("C6.17-9 pass (BR-9): every case reader answers after the start and none shows a row of the ended stage (prepare, filings, findings, checklist, release update)",
    s1Filings.length > 0 && reads.filter(([x]) => x !== "/record").every(([, r]) => r.status === 200) && leaked.length === 0, { statuses: reads.map(([x, r]) => `${x}:${r.status}`), leaked });
  const panel = (await call("GET", `/runtime/cases/${S}/stages/${S1}`)).body;
  ok("C6.17-9 pass (m2): the ended stage's own record is read only: its filings, its key details", panel?.read_only === true && (panel?.filings ?? []).some((x: { id: string }) => s1Filings.includes(x.id)) && panel.key_details.some((d: { field: string; value: string }) => d.field === dateField && d.value === VALID));

  // ---------------------------------------------------------------- C6.17-10: stale, last stage
  const stale = await call("POST", `/runtime/cases/${S}/stages/next`, startBody);
  const lastPrev = (await call("GET", `/runtime/cases/${S}/stages/next`)).body;
  const cur2 = (await stagesOf(S!)).stages.find((x) => x.state === "CURRENT")!;
  const last = await call("POST", `/runtime/cases/${S}/stages/next`, { from_stage: cur2.id, stage_version: cur2.version });
  ok("C6.17-10 fail: the same start again is a 409 (read again); on the last stage there is no next stage (preview refused, start 409); nothing changed",
    stale.status === 409 && last.status === 409 && lastPrev?.to === null && /last stage/i.test(lastPrev?.refused ?? "") && n(`select count(*) from case_stage where case_id='${S}' and state='CURRENT'`) === 1, { stale: words(stale), last: words(last) });

  // ---------------------------------------------------------------- C6.17-11: races
  const rMade = await open(first.combination_id);
  const R = rMade.body?.id as string;
  await prepare(R);
  const r1 = (await stagesOf(R)).stages.find((x) => x.state === "CURRENT")!;
  const body = { from_stage: r1.id, stage_version: r1.version, reason: "Sample: two people press Start at the same moment" };
  const race = await Promise.all([call("POST", `/runtime/cases/${R}/stages/next`, body), call("POST", `/runtime/cases/${R}/stages/next`, body), call("GET", `/runtime/cases/${R}/prepare`), call("GET", `/runtime/cases/${R}/checklist`)]);
  const endedAt = sql(`select ended_at from case_stage where id='${r1.id}'`);
  const late = endedAt ? n(`select (select count(*) from filing where stage_id='${r1.id}' and created_at > '${endedAt}') + (select count(*) from submission_group where stage_id='${r1.id}' and created_at > '${endedAt}') + (select count(*) from checklist_line where stage_id='${r1.id}' and created_at > '${endedAt}')`) : -1;
  ok("C6.17-11 pass (race): two starts at once: one 201, one 409; Prepare and the checklist racing the start answer (200 or 409) and write nothing for the ended stage after it ended",
    race.slice(0, 2).map((x) => x.status).sort().join(",") === "201,409" && race.slice(2).every((x) => x.status === 200 || x.status === 409) && late === 0 && n(`select count(*) from case_stage where case_id='${R}' and state='CURRENT'`) === 1,
    { starts: race.slice(0, 2).map((x) => x.status), reads: race.slice(2).map((x) => x.status), late });
  const ended = sql(`select id from filing where stage_id='${r1.id}' limit 1`);
  const write = ended ? sql(`update filing set status='READY_TO_FILE' where id='${ended}' returning id`) : "none";
  ok("C6.17-11 fail (BR-10): the database refuses a change to the ended stage's filing", !!ended && write === null);

  // ---------------------------------------------------------------- C6.17-12: a release update after the start
  const rel = await sampleRelease(nextCombo!, { map: (relForms.find((x) => /^IMM 5710/.test(x)) ?? relForms[0]) });
  const ru = (await call("GET", `/runtime/cases/${S}/release-update`)).body;
  const moved = ru?.target ? await call("POST", `/runtime/cases/${S}/release-update`, { target_version: ru.target.version, from_revision: ru.current.revision, reason: "Adopting the current release (C6.17 pack)" }) : null;
  ok("C6.17-12 pass (challenge B1): after the start, a later release of the next combination moves the case on the current stage's chain: revision 2 on that combination, the ended stage's pin untouched, every route still reads",
    (rel.version ?? 0) >= 2 && moved?.status === 200 && sql(`select max(revision) from pack_work_pin where case_id='${S}' and combination_id='${nextCombo}'`) === "2" && n(`select count(*) from pack_work_pin where case_id='${S}' and combination_id <> '${nextCombo}'`) === 1
    && (await call("GET", `/runtime/cases/${S}`)).body?.pin?.revision === 2 && (await call("GET", `/runtime/cases/${S}/prepare`)).status === 200, { release: rel.version, steps: rel.steps.filter((x) => x.status >= 300), moved: moved?.status, words: moved ? words(moved) : ru });

  // ---------------------------------------------------------------- C6.17-13: the family case keeps one stage
  const fam = sql(`select k.id from runtime_case k join combination c on c.id=k.combination_id where c.combination_key='vv.single' order by k.created_at limit 1`) ?? "";
  const fv1 = (await prepare(fam)).p?.version, fst = await stagesOf(fam), fv2 = (await prepare(fam)).p?.version;
  ok("C6.17-13 pass: the Sample family case (on no route) has one CURRENT stage on its own combination and no strip; its prepare view reads the same twice",
    !!fam && fst?.stages.length === 1 && fst.stages[0].state === "CURRENT" && fst.route === null && fst.next === null && !!fv1 && fv1 === fv2);

  // ---------------------------------------------------------------- C6.17-14: audit
  const audit = sql(`select string_agg(summary, ' | ') from audit_event where entity_key in ('${S}', '${W}') and action in ('started_stage', 'opened')`) ?? "";
  ok("C6.17-14 pass: the audit says the stage started and the case opened at a later stage, without any key-detail value or the reason",
    /started the next stage/.test(audit) && /done before we started/.test(audit) && !audit.includes(UCI) && !audit.includes(VALID) && !audit.includes("themselves"), audit.slice(0, 400));
});
