// C7.8 Add a library form to one filing (screens lane, B141; SA-1B-177, SA-1B-102 rule 5; P-406; concept revision 2 §6).
// The case officer adds a form from the firm's library to one filing, for one person on it: a form whose filling is proven
// (published map rows and a passed fill trial for its edition) fills from the case; any other is the blank official PDF.
// Either way it is listed on Prepare application for that person only and goes through Ready to file (C7.6), signing
// (C8.1) and out of date (C9.2) like every form. Forms are picked from the library by their state at run time, never by a
// fixed number (P-319): the "fills" pick is a form with a passed trial the case's release does not hold.
// Runs on the demo data (the checkpoint or the six: a Visitor visa case opened here); US$0, no AI.
//   tsx studio/acceptance/C7.8.test.ts 4440 xr_studio_accept
import { createHash } from "node:crypto";
import { CLIENT, AUTHOR, FAMILY, FIRM_READERS, answer, call, confirmAll, fillEverything, filingOf, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sendFile, sql, PORT } from "./lib/m3.ts";
import { walker } from "./lib/browser.ts";

type Addable = { form: string; title: string; edition: string | null; kind: "fills" | "blank"; blank_why: string | null; why_not: { code: string; words: string } | null };
const list = async (filing: string, subject?: string, q = "") => (await call("GET", `/runtime/filings/${filing}/addable-forms?q=${encodeURIComponent(q)}${subject ? `&subject=${subject}` : ""}`)).body as { forms?: Addable[]; subject?: string } | null;
const add = (filing: string, body: Record<string, unknown>, actor?: string) => call("POST", `/runtime/filings/${filing}/form-additions`, body, actor);

await main("C7.8", "Add a library form to one filing", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const [P, S] = ["Sample Client A", "Sample Spouse A"].map((n) => c.subjects[n]);
  let p = (await prepare(c.id)).p;
  const fP = filingOf(p, P)?.id ?? "", fS = filingOf(p, S)?.id ?? "";
  const l0 = await list(fP);
  const forms = l0?.forms ?? [];
  const releaseForms = new Set((p?.items ?? []).filter((i) => i.kind === "form").map((i) => i.form));
  const fills = forms.find((f) => f.kind === "fills" && !f.why_not), blank = forms.find((f) => f.kind === "blank" && !f.why_not);
  const guides = (sql(`select form_key from gov_form_def where form_kind in ('guide','document','checklist')`) ?? "").split("\n").filter(Boolean);
  ok(`C7.8-1 pass: the addable list names each release form with its reason and offers no guide or checklist (${forms.filter((f) => f.why_not?.code === "on_release").length} release forms refused; picks: fills ${fills?.form ?? "none"}, blank ${blank?.form ?? "none"})`,
    forms.length > 0 && [...releaseForms].every((r) => !r || forms.some((f) => f.form === r && f.why_not?.code === "on_release" && /part of this application's forms/.test(f.why_not.words))) && !forms.some((f) => guides.includes(f.form)) && !!fills && !!blank,
    { refused: forms.filter((f) => f.why_not).map((f) => `${f.form}:${f.why_not!.code}`) });

  // 2: a form that fills, for the principal only.
  const qCount = async () => ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=client`, undefined, CLIENT)).body?.sections ?? []).reduce((n: number, x: { questions?: unknown[] }) => n + (x.questions?.length ?? 0), 0) as number;
  const qBefore = await qCount();
  const det = (await call("GET", `/runtime/filings/${fP}/addable-forms/${encodeURIComponent(fills?.form ?? "-")}`)).body as { coverage?: { fills: number; total: number } | null } | null;
  let r = await add(fP, { form: fills?.form, reason: "Asked for by the case officer (Sample)" });
  const addFills = r.body?.id as string | undefined;
  const qAfter = await qCount();
  await fillEverything(c.id);
  p = (await prepare(c.id)).p;
  const onP = itemsOf(p, P, fills?.form), onS = itemsOf(p, S, fills?.form);
  const copy = await generateCopy(c.id, fills?.form ?? "-", P);
  const fl = (await call("GET", `/runtime/cases/${c.id}/forms`)).body as { forms: { form: string; subject_id: string; trial_passed: boolean; added?: { tag: string } | null; copies: { id: string; status: string; counts?: { written: number }; out_of_date?: boolean }[] }[] } | null;
  const row = fl?.forms.find((f) => f.form === fills?.form && f.subject_id === P);
  const lock = copy ? await call("POST", `/runtime/form-copies/${copy}/lock`, { kind: "filed" }) : { status: 0, body: null };
  ok(`C7.8-2 pass: ${fills?.form ?? "(no fills pick)"} added for the principal is listed on Prepare application for that filing and person only, tagged, with coverage (${det?.coverage?.fills ?? 0} of ${det?.coverage?.total ?? 0}); its copy is filled from confirmed facts and its trial counts (a lock is refused only for named facts, never the trial)`,
    r.status === 201 && onP.length === 1 && onP[0].filing === fP && onS.length === 0 && (det?.coverage?.fills ?? 0) > 0 && !!row?.added && row.trial_passed === true
      && (row.copies[0]?.status === "GENERATED" && (row.copies[0]?.counts?.written ?? 0) > 0) && (lock.status === 200 || (lock.status === 409 && !/fill trial|filling is not proven/i.test(lock.body?.detail ?? ""))),
    { status: r.status, onP: onP.length, onS: onS.length, trial: row?.trial_passed, copy: row?.copies[0], lock: [lock.status, lock.body?.detail] });
  ok(`C7.8-17 fail: adding ${fills?.form ?? "a form"} asks the client nothing new (Q1; review M1): ${qBefore} questions before, ${qAfter} after`, qBefore > 0 && qAfter === qBefore, { qBefore, qAfter });
  const sGen = await call("POST", `/runtime/cases/${c.id}/forms/${encodeURIComponent(fills?.form ?? "-")}/${S}/generate`, { idempotencyKey: `c78-${Date.now()}` });
  ok("C7.8-2b fail: no copy of it is made for another person on the case (409)", sGen.status === 409, [sGen.status, sGen.body?.detail]);

  // 3: a blank official PDF, with its reason; the download is the edition's own file.
  r = await add(fP, { form: blank?.form });
  const addBlank = r.body?.id as string | undefined;
  const dl = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-additions/${addBlank}/blank`, { headers: { "x-actor": c.officer } }).catch(() => null);
  const bytes = dl?.ok ? Buffer.from(await dl.arrayBuffer()) : Buffer.alloc(0);
  const editionSha = sql(`select e.sha256 from form_edition e join filing_form_addition a on a.edition_id = e.id where a.id = '${addBlank}'`);
  ok(`C7.8-3 pass: ${blank?.form ?? "(no blank pick)"} is "Blank official PDF" with its reason; its download's sha256 is the edition's`, r.status === 201 && r.body?.kind === "blank" && !!blank?.blank_why && bytes.length > 0 && createHash("sha256").update(bytes).digest("hex") === editionSha,
    { status: r.status, kind: r.body?.kind, why: blank?.blank_why, bytes: bytes.length });

  // 4: a release form refused with the answer that decides it (one that does not apply now, else any release form).
  const rel = forms.find((f) => f.why_not?.code === "on_release" && /now: (it does not apply|not known yet)/.test(f.why_not.words)) ?? forms.find((f) => f.why_not?.code === "on_release");
  r = await add(fP, { form: rel?.form });
  ok(`C7.8-4 fail: ${rel?.form ?? "(no release form)"}, a release form, is refused 409 with the answer that decides it`, r.status === 409 && /part of this application's forms/.test(r.body?.detail ?? "") && /now|already/.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);
  r = await add(fP, { form: fills?.form });
  ok("C7.8-5 fail: the same form added twice for the same person is refused (409)", r.status === 409 && /already added/.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);
  const bc = forms.find((f) => f.why_not?.code === "barcode_blank");
  r = await add(fP, { form: bc?.form });
  ok(`C7.8-6 fail: a blank barcode form (${bc?.form ?? "none in the library"}) is refused 422, in words`, !!bc && r.status === 422 && /barcode/.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);

  // 7: frozen. A later published map change in the library leaves the case's form unchanged.
  const ed = sql(`select edition_id from filing_form_addition where id = '${addFills}'`) ?? "";
  const target = sql(`select id || '|' || coalesce(canonical_field_key,'') from form_field_map where form_edition_id = '${ed}' and status = 'PUBLISHED' and canonical_field_key is not null order by data_path limit 1`) ?? "";
  const [mapRow, oldFact] = target.split("|");
  const before = sql(`select frozen_sha256 from filing_form_addition where id = '${addFills}'`);
  const mappedBefore = row ? (fl?.forms.find((f) => f.form === fills?.form && f.subject_id === P) as unknown as { draft: { mapped: number } })?.draft.mapped : null;
  sql(`update form_field_map set canonical_field_key = 'sample.changed_after_add' where id = '${mapRow}'`);
  const fl2 = (await call("GET", `/runtime/cases/${c.id}/forms`)).body as { forms: { form: string; subject_id: string; draft: { mapped: number } }[] } | null;
  const frozenFact = sql(`select e->>'fact' from filing_form_addition a, jsonb_array_elements(a.frozen->'entries') e where a.id = '${addFills}' and e->>'data_path' = (select data_path from form_field_map where id = '${mapRow}')`);
  sql(`update form_field_map set canonical_field_key = '${oldFact.replace(/'/g, "''")}' where id = '${mapRow}'`);
  ok("C7.8-7 pass: frozen: a library map change after adding leaves the case's form as it was added (its frozen rows and fingerprint)", !!mapRow && sql(`select frozen_sha256 from filing_form_addition where id = '${addFills}'`) === before && frozenFact === oldFact && fl2?.forms.find((f) => f.form === fills?.form && f.subject_id === P)?.draft.mapped === mappedBefore,
    { mapRow, oldFact, frozenFact });

  // 8: C7.6. A blank form with no completed copy is a CRITICAL line; passed only with a reason; uploading clears it.
  p = (await prepare(c.id)).p;
  const hf = () => (readinessOf(p, fP)?.warns ?? []).find((w) => w.code === "hand_filled_copy");
  const line = hf();
  const noReason = await call("POST", `/runtime/filings/${fP}/warnings/hand_filled_copy/pass`, { reason: "" });
  const withReason = await call("POST", `/runtime/filings/${fP}/warnings/hand_filled_copy/pass`, { reason: "Completed copy is with the client (Sample)" });
  p = (await prepare(c.id)).p;
  const passed = (readinessOf(p, fP)?.passed ?? []).some((x) => x.code === "hand_filled_copy");
  const blankItem = itemsOf(p, P, blank?.form)[0];
  const up = await sendFile(`/runtime/items/${blankItem?.id}/signed-scan`, Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: completed ${blank?.form} (Sample)\n%%EOF\n`, "latin1"), "completed.pdf", c.officer);
  p = (await prepare(c.id)).p;
  ok("C7.8-8 pass: C7.6: a blank form with no completed copy is a CRITICAL \"Filled by hand: upload the completed copy\" line; it passes only with a reason; uploading the completed copy clears it and makes the item Ready",
    line?.severity === "critical" && /upload the completed copy/.test(line.words) && noReason.status >= 400 && withReason.status === 200 && passed && up.status === 201 && !hf() && !(readinessOf(p, fP)?.passed ?? []).some((x) => x.code === "hand_filled_copy") && itemsOf(p, P, blank?.form)[0]?.state === "ready",
    { line: line?.words, noReason: noReason.status, withReason: withReason.status, passed, upload: up.status });

  // 9: the signature is set when adding: no "not set on the form line" warning for it, and who signs is named.
  const sig = (readinessOf(p, fP)?.warns ?? []).filter((w) => (w.item === onP[0]?.id) && /not set on the form line/.test(w.words));
  ok("C7.8-9 pass: the signature is set when adding (signed by hand and scanned, by the person): no \"not set on the form line\" line for it", sig.length === 0 && itemsOf(p, P, fills?.form)[0]?.signature === "HAND_SCANNED" && (itemsOf(p, P, fills?.form)[0]?.signers ?? []).includes("person"),
    itemsOf(p, P, fills?.form)[0]);

  // Review minors on #1248: the signature and channel rules set when adding, each with a failing case.
  const third = forms.find((f) => f.kind === "blank" && !f.why_not && ![blank?.form, forms.find((g) => g.kind === "blank" && !g.why_not && g.form !== blank?.form)?.form].includes(f.form));
  const dThird = (await call("GET", `/runtime/filings/${fP}/addable-forms/${encodeURIComponent(third?.form ?? "-")}`)).body as { channel?: string; channel_why?: string } | null;
  const offNoWhy = await add(fP, { form: third?.form, signature: "NONE" });
  const offPaper = await add(fP, { form: third?.form, channel: "PAPER", signature: "NONE", signature_reason: "x", reason: "Sample" });
  const paperNoWhy = await add(fP, { form: third?.form, channel: "PAPER" });
  const offOk = await add(fP, { form: third?.form, signature: "NONE", signature_reason: "The form has no signature box (Sample)" });
  p = (await prepare(c.id)).p;
  ok(`C7.8-18 fail: ${third?.form ?? "(no third blank pick)"}: the channel defaults to the filing's (PDF upload, with why); switching the signature off needs a reason (400), is refused on Paper (422), and Paper on an IRCC-account case needs a reason (400); with a reason it is stored and no signature is waited for`,
    !!third && dThird?.channel === "PDF_UPLOAD" && /IRCC account/.test(dThird?.channel_why ?? "") && offNoWhy.status === 400 && offPaper.status === 422 && paperNoWhy.status === 400 && offOk.status === 201 && offOk.body?.signature === "NONE" && (itemsOf(p, P, third?.form)[0]?.signers ?? []).length === 0,
    { channel: dThird?.channel, statuses: [offNoWhy.status, offPaper.status, paperNoWhy.status, offOk.status], signers: itemsOf(p, P, third?.form)[0]?.signers });

  // 10: a fact the filled form reads changes after its copy: the copy is out of date (C9.2).
  await answer(c.id, P, "person.family_name", "Changed-After-Copy"); await confirmAll(c.id, P);
  const fl3 = (await call("GET", `/runtime/cases/${c.id}/forms`)).body as typeof fl;
  ok("C7.8-10 pass: C9.2: a fact change makes the filled added form's copy out of date", fl3?.forms.find((f) => f.form === fills?.form && f.subject_id === P)?.copies.find((x) => x.id === copy)?.out_of_date === true);

  // Breaker M1 on #1248: one form is filed one way on a case, even when two people's adds arrive together.
  const two = forms.find((f) => f.kind === "blank" && !f.why_not && f.form !== blank?.form);
  const [r1, r2] = await Promise.all([add(fP, { form: two?.form, channel: "PAPER", reason: "The client asked for paper (Sample)" }), add(fS, { form: two?.form, channel: "PDF_UPLOAD" })]);
  const chans = (sql(`select string_agg(distinct channel::text, ',') from filing_form_addition where case_id = '${c.id}' and form_key = '${two?.form}' and removed_at is null`) ?? "").split(",").filter(Boolean);
  ok(`C7.8-14 fail: ${two?.form ?? "(no second blank pick)"} added at once for two people with two channels: one is refused, so it is filed one way (breaker M1)`, !!two && [r1.status, r2.status].sort().join() === "201,409" && chans.length === 1, { statuses: [r1.status, r2.status], chans });

  // Breaker M2: a blank form removed and added again starts with no completed copy (step 8 uploaded one).
  const rmB = await call("POST", `/runtime/form-additions/${addBlank}/remove`, { reason: "The completed copy was for another person (Sample)" });
  const gone = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-additions/${addBlank}/blank`, { headers: { "x-actor": c.officer } }).catch(() => null);
  const again = await add(fP, { form: blank?.form });
  p = (await prepare(c.id)).p;
  ok("C7.8-15 fail: removed and added again, the blank form waits for a new completed copy (To do, its CRITICAL line back); the removed one's blank PDF is no longer handed out (410) (breaker M2, m8)",
    rmB.status === 200 && again.status === 201 && itemsOf(p, P, blank?.form)[0]?.state === "to_do" && !!(readinessOf(p, fP)?.warns ?? []).find((w) => w.code === "hand_filled_copy") && gone?.status === 410,
    { rm: rmB.status, again: again.status, state: itemsOf(p, P, blank?.form)[0]?.state, gone: gone?.status });

  // Breaker B1: a move to a release that holds an added form: the release's line replaces it (the addition is marked
  // removed with the release named), the page's lists read one line, and the person's own copy is made as usual.
  const sample = sql(`select c.id from runtime_case c where exists (select 1 from pack_work_pin p join config_release r on r.id = p.config_release_id where p.case_id = c.id and r.version < (select max(version) from config_release where combination_id = c.combination_id)) order by c.created_at limit 1`) ?? "";
  const ru = sample ? (await call("GET", `/runtime/cases/${sample}/release-update`)).body as { target?: { version: number } | null; current?: { revision: number } } | null : null;
  const heldNow = sample ? new Set(((await call("GET", `/runtime/cases/${sample}/prepare`)).body?.items ?? []).filter((i: { kind: string }) => i.kind === "form").map((i: { form: string }) => i.form)) : new Set<string>();
  const targetForms = ru?.target ? (sql(`select string_agg(distinct f->>'form_number', '|') from config_release r, jsonb_array_elements(r.snapshot->'forms') f where r.combination_id = (select combination_id from runtime_case where id = '${sample}') and r.version = ${ru.target.version}`) ?? "").split("|") : [];
  const sp = sample ? (await prepare(sample, c.officer)).p : null;
  const sFiling = sp?.filings.find((f) => f.applicants.some((a) => a.role === "principal"));
  const sSubject = sFiling?.applicants.find((a) => a.role === "principal")?.subject ?? "";
  const sl = sFiling ? await list(sFiling.id) : null;
  const clash = (sl?.forms ?? []).find((f) => !f.why_not && targetForms.includes(f.form) && !heldNow.has(f.form));
  const addClash = clash && sFiling ? await add(sFiling.id, { form: clash.form }) : null;
  const mv = ru?.target && addClash?.status === 201 ? await call("POST", `/runtime/cases/${sample}/release-update`, { target_version: ru.target.version, from_revision: ru.current?.revision ?? 1, reason: "Move to the newer release (Sample)" }) : null;
  const after = sample ? (await call("GET", `/runtime/cases/${sample}/forms`)).body as { forms: { form: string; subject_id: string; added?: unknown; blank?: unknown }[] } | null : null;
  const why = addClash?.body?.id ? sql(`select removed_reason from filing_form_addition where id = '${addClash.body.id}'`) : null;
  const gen = clash ? await call("POST", `/runtime/cases/${sample}/forms/${encodeURIComponent(clash.form)}/${sSubject}/generate`, { idempotencyKey: `c78-b1-${Date.now()}` }) : null;
  ok(`C7.8-16 pass: ${clash?.form ?? "(no form the next release adds)"} added, then the case moves to a release that holds it: the release's line replaces the addition (kept, marked removed naming the release), no row reads as added, and the person's copy is made as for any release form (breaker B1)`,
    !!clash && mv?.status === 200 && /^Part of /.test(why ?? "") && !(after?.forms ?? []).some((f) => f.form === clash.form && (f.added || f.blank)) && !!gen && gen.status !== 409,
    { sample, clash: clash?.form, move: [mv?.status, mv?.body?.added_forms_replaced], why, gen: [gen?.status, gen?.body?.detail] });

  // 11: remove with a reason; the record is kept; after recording, refused.
  const noWhy = await call("POST", `/runtime/form-additions/${addFills}/remove`, {});
  const rm = await call("POST", `/runtime/form-additions/${addFills}/remove`, { reason: "Not needed after all (Sample)" });
  p = (await prepare(c.id)).p;
  const kept = sql(`select removed_reason from filing_form_addition where id = '${addFills}'`);
  // The recording itself is C8.2's pack: a record row stands in for it here (set-up only).
  sql(`insert into filing_record (id, workspace_id, case_id, filing_id, submission_group_id, our_reference, submitted_on, application_number, prepared_by, recorded_by, filed_facts) select gen_random_uuid(), workspace_id, case_id, id, submission_group_id, 'C78', current_date, 'V000000000', 'user-O', 'user-O', '[]'::jsonb from filing where id = '${fS}'`);
  const late = await call("POST", `/runtime/form-additions/${again.body?.id}/remove`, { reason: "After recording (Sample)" });
  const lateAdd = await add(fS, { form: blank?.form });
  ok("C7.8-11 pass: remove needs a reason (400), then the form leaves the filing with its record kept; once anything is recorded, remove and add are refused (409)",
    noWhy.status === 400 && rm.status === 200 && itemsOf(p, P, fills?.form).length === 0 && kept === "Not needed after all (Sample)" && late.status === 409 && lateAdd.status === 409, [noWhy.status, rm.status, kept, late.status, lateAdd.status]);

  // 12: who.
  const asClient = await call("GET", `/runtime/filings/${fP}/addable-forms`, undefined, CLIENT);
  const asAuthor = await add(fP, { form: blank?.form }, AUTHOR);
  const asOther = await call("GET", `/runtime/filings/${fP}/addable-forms`, undefined, FIRM_READERS.solo);
  ok("C7.8-12 fail: a client 403, a configuration person 403, another firm 404", asClient.status === 403 && asAuthor.status === 403 && asOther.status === 404, [asClient.status, asAuthor.status, asOther.status]);

  // 19 (QA-355, tech lead's ruling on #1446): release forms unchanged by an add. On a case whose facts are all answered,
  // every form that fills is added and then removed: every release form's lines for that person (written, to fix, what it still
  // needs, its open fields) are the same before the add, after it and after removing it; and the added form's own copy
  // asks no fix of an answer the release's forms accept (a map note such as "codes as listed in the inventory" names no
  // values, engine/options.ts namesNoValues; an added form's list judges only its own copy, engine/runtime/case.ts
  // judgingMaps). Forms are read by role (release or added), never by number (P-319).
  type FormRow = { form: string; subject_id: string; added?: unknown; draft?: { written_now: number; to_fix: number }; readiness?: { ready: boolean; missing: unknown[] }; fields_open?: unknown[] };
  const c3 = await openCase(vv, FAMILY.slice(0, 1));
  await fillEverything(c3.id);
  const P3 = Object.values(c3.subjects)[0] as string;
  const f3 = filingOf((await prepare(c3.id)).p, P3)?.id ?? "";
  const rows3 = async () => (((await call("GET", `/runtime/cases/${c3.id}/forms`)).body?.forms ?? []) as FormRow[]).filter((f) => f.subject_id === P3);
  const lines3 = (rs: FormRow[]) => rs.filter((f) => !f.added).map((f) => `${f.form}: written ${f.draft?.written_now}, to fix ${f.draft?.to_fix}, ${f.readiness?.ready ? "ready" : `needs ${f.readiness?.missing.length}`}, open ${f.fields_open?.length ?? 0}`).sort();
  const before3 = lines3(await rows3());
  const picks3 = ((await list(f3))?.forms ?? []).filter((f) => f.kind === "fills" && !f.why_not).map((f) => f.form);
  const adds3 = [];
  for (const form of picks3) adds3.push(await add(f3, { form, reason: "QA-355: added to check the release's forms (Sample)" }));
  const after3rows = await rows3(), after3 = lines3(after3rows);
  const own3 = after3rows.filter((f) => f.added).map((f) => ({ form: f.form, to_fix: f.draft?.to_fix }));
  const rms3 = [];
  for (const a of adds3) rms3.push(await call("POST", `/runtime/form-additions/${a.body?.id}/remove`, { reason: "QA-355: undo the add (Sample)" }));
  const back3 = lines3(await rows3());
  ok(`C7.8-19 fail: release forms unchanged by an add: adding every form that fills (${picks3.join(", ") || "none"}) and removing them leaves every release form's lines as they were (${before3.length} forms); each added copy asks no fix of an answer the release's forms accept (QA-355)`,
    picks3.length > 0 && before3.length > 0 && adds3.every((a) => a.status === 201) && rms3.every((r) => r.status === 200) && after3.join("|") === before3.join("|") && back3.join("|") === before3.join("|")
      && own3.length === picks3.length && own3.every((o) => o.to_fix === 0),
    { adds: adds3.map((a) => a.status), rms: rms3.map((r) => r.status), before: before3, after: after3, back: back3, own: own3 });

  // 13: the screen, at 1440 px: Prepare application lists the added forms with their tag; "+ Add a form" opens the panel.
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const c2 = await openCase(vv, FAMILY);
    await prepare(c2.id);
    const pg = await w.open(c2.officer, 1440);
    await pg.goto(`/cases/${c2.id}`); await w.settle(pg, "case page");
    await pg.getByRole("button", { name: /Add a form to .*filing/ }).first().click();
    await pg.getByRole("combobox").fill(blank?.form ?? ""); await pg.locator(`[data-addable="${blank?.form}"]`).waitFor({ timeout: 15_000 });
    await pg.waitForFunction((f) => document.querySelectorAll("[data-addable]")[0]?.getAttribute("data-addable") === f, blank?.form, { timeout: 15_000 });
    await pg.keyboard.press("Enter"); await pg.locator("[data-picked]").waitFor({ timeout: 15_000 });
    await pg.getByRole("button", { name: /^Add to .*filing$/ }).click();
    await pg.locator(`[data-blank-form="${blank?.form}"]`).waitFor({ timeout: 15_000 });
    const txt = await w.text(pg);
    ok("C7.8-13 pass (screen, 1440 px): + Add a form → search → Enter → Add; the blank form is listed with \"Blank official PDF\", \"Added by the case officer\" and its download, with no page error",
      /Blank official PDF/.test(txt) && /Added by the case officer/.test(txt) && /Download the blank PDF/.test(txt) && !w.errors.length, w.errors);
  } catch (e) { ok(`C7.8-13 pass (screen, 1440 px): the walk ran (${(e as Error).message.slice(0, 160)})`, false); }
  finally { await w.close(); }
});
