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
  const det = (await call("GET", `/runtime/filings/${fP}/addable-forms/${encodeURIComponent(fills?.form ?? "-")}`)).body as { coverage?: { fills: number; total: number } | null } | null;
  let r = await add(fP, { form: fills?.form, reason: "Asked for by the case officer (Sample)" });
  const addFills = r.body?.id as string | undefined;
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

  // 10: a fact the filled form reads changes after its copy: the copy is out of date (C9.2).
  await answer(c.id, P, "person.family_name", "Changed-After-Copy"); await confirmAll(c.id, P);
  const fl3 = (await call("GET", `/runtime/cases/${c.id}/forms`)).body as typeof fl;
  ok("C7.8-10 pass: C9.2: a fact change makes the filled added form's copy out of date", fl3?.forms.find((f) => f.form === fills?.form && f.subject_id === P)?.copies.find((x) => x.id === copy)?.out_of_date === true);

  // 11: remove with a reason; the record is kept; after recording, refused.
  const noWhy = await call("POST", `/runtime/form-additions/${addFills}/remove`, {});
  const rm = await call("POST", `/runtime/form-additions/${addFills}/remove`, { reason: "Not needed after all (Sample)" });
  p = (await prepare(c.id)).p;
  const kept = sql(`select removed_reason from filing_form_addition where id = '${addFills}'`);
  // The recording itself is C8.2's pack: a record row stands in for it here (set-up only).
  sql(`insert into filing_record (id, workspace_id, case_id, filing_id, submission_group_id, our_reference, submitted_on, application_number, prepared_by, recorded_by, filed_facts) select gen_random_uuid(), workspace_id, case_id, id, submission_group_id, 'C78', current_date, 'V000000000', 'user-O', 'user-O', '{}'::jsonb from filing where id = '${fS}'`);
  const late = await call("POST", `/runtime/form-additions/${addBlank}/remove`, { reason: "After recording (Sample)" });
  const lateAdd = await add(fS, { form: blank?.form });
  ok("C7.8-11 pass: remove needs a reason (400), then the form leaves the filing with its record kept; once anything is recorded, remove and add are refused (409)",
    noWhy.status === 400 && rm.status === 200 && itemsOf(p, P, fills?.form).length === 0 && kept === "Not needed after all (Sample)" && late.status === 409 && lateAdd.status === 409, [noWhy.status, rm.status, kept, late.status, lateAdd.status]);

  // 12: who.
  const asClient = await call("GET", `/runtime/filings/${fP}/addable-forms`, undefined, CLIENT);
  const asAuthor = await add(fP, { form: blank?.form }, AUTHOR);
  const asOther = await call("GET", `/runtime/filings/${fP}/addable-forms`, undefined, FIRM_READERS.solo);
  ok("C7.8-12 fail: a client 403, a configuration person 403, another firm 404", asClient.status === 403 && asAuthor.status === 403 && asOther.status === 404, [asClient.status, asAuthor.status, asOther.status]);

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
