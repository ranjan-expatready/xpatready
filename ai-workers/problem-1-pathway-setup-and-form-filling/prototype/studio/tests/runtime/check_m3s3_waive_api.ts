// M3-S3 API checks (P-171 (6), P-380, P-425): on the configured checkpoint, the author marks a document line of the
// Study permit (outside Canada), a non-Visitor combination, as waivable through the line's own save; it is released by
// a second and third person; on a case the case officer waives it with a reason (who and when kept), while a line not
// marked waivable, a waiver with no reason and a client are refused in words; asking for it again takes the waiver back.
// Each rule has a passing and a failing case. Product routes only (no SQL write), no model call (US$0).
//   zsh studio/tools/isolated.sh rt_m3s3 4485 start && tsx studio/tests/runtime/check_m3s3_waive_api.ts 4485 xr_studio_rt_m3s3
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4485), DB = process.argv[3] ?? "xr_studio_rt_m3s3";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B", OFFICER = "user-O", CLIENT = "user-P";
const LINE = "passport_information_page_copy:each_applicant";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body?.errors ?? ""));

(async () => {
  let sp = sql("select id from combination where combination_key='sp.outside'");
  if (!sp) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } sp = sql("select id from combination where combination_key='sp.outside'"); }
  const row = JSON.parse(sql(`select row_to_json(r)::text from (select document_type_key, attach_mode, applies_to_roles, provided_by, predicate_json, condition_plain, source_quote, source_file, note, alternatives from document_requirement where combination_id='${sp}' and lineage_key='${LINE}' order by version desc limit 1) r`) || "null");
  if (!row) { console.error(`STOP  no ${LINE} line on the Study permit`); process.exit(2); }
  const body = (extra: Record<string, unknown>) => ({ documentTypeKey: row.document_type_key, attachMode: row.attach_mode, appliesToRoles: row.applies_to_roles, providedBy: row.provided_by, condition: row.predicate_json ?? undefined, conditionPlain: row.condition_plain ?? undefined, sourceQuote: row.source_quote ?? undefined, sourceFile: row.source_file ?? undefined, note: row.note ?? undefined, alternatives: row.alternatives ?? [], ...extra });
  const path = `/combinations/${sp}/requirements/${encodeURIComponent(LINE)}`;

  // (1) The author's save.
  const bad = await call("PATCH", path, body({ waiver: "sometimes" }), AUTHOR);
  ok("save fail: a waiver other than waivable is refused in words (400)", bad.status === 400 && /Waiver: choose "waivable"/.test(words(bad)), [bad.status, words(bad)]);
  const save = await call("PATCH", path, body({ waiver: "waivable" }), AUTHOR);
  ok("save pass: the author marks the passport line waivable (a new draft version)", save.status < 300 && sql(`select waiver from document_requirement where combination_id='${sp}' and lineage_key='${LINE}' order by version desc limit 1`) === "waivable", [save.status, words(save)]);
  const kept = await call("PATCH", path, body({ note: row.note ?? undefined }), AUTHOR);
  ok("save pass: a later edit that does not send the waiver keeps it", kept.status < 300 && sql(`select waiver from document_requirement where combination_id='${sp}' and lineage_key='${LINE}' order by version desc limit 1`) === "waivable", [kept.status, words(kept)]);
  const officerSave = await call("PATCH", path, body({ waiver: null }), OFFICER);
  ok("save fail: a case officer cannot change the line (403)", officerSave.status === 403, officerSave.status);

  // (2) Released by a second and a third person.
  let r = { status: 0, body: null as any };
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
    await call("POST", `/combinations/${sp}/submit`, { note: "M3-S3: the passport line is waivable (Sample check)" }, AUTHOR);
    const sub = (await call("GET", `/combinations/${sp}/review`, undefined, REVIEWER)).body?.submission;
    const refs = (sub?.changeSummary ?? sub?.change_summary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
    await call("POST", `/combinations/${sp}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    r = await call("POST", `/combinations/${sp}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(words(r))) break;
  }
  const released = sql(`select r.snapshot::text ~ '"waiver": ?"waivable"' from config_release r where r.combination_id='${sp}' order by r.version desc limit 1`);
  ok("release pass: the new release carries the line's waiver", r.status < 300 && released === "t", [r.status, words(r), released]);

  // (3) A case on the new release.
  const k = await call("POST", "/runtime/cases", { combinationId: sp, reference: `M3S3-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Student S3" } }, OFFICER);
  const caseId: string = k.body?.id ?? "";
  const principal: string = (k.body?.people ?? []).find((p: { role: string }) => p.role === "principal")?.subject_id ?? "";
  const list = async () => (await call("GET", `/runtime/cases/${caseId}/checklist`, undefined, OFFICER)).body as { derived?: boolean; people?: { subject: string; lines: { id: string; document_type: string; waivable: boolean; state: string; state_reason?: string | null; required: boolean; version?: number }[] }[] };
  // Review M5: Ready to file (api/src/readiness-inputs.ts, through the prepare view) warns of a document not received.
  const missing = async () => ((await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body?.readiness ?? []).flatMap((r: { warns: { code: string; words: string }[]; blocks: { code: string; words: string }[] }) => [...r.warns, ...r.blocks])
    .filter((w: { code: string; words: string }) => w.code === "missing_document" && /Passport information page copy not received/.test(w.words)).length;
  const lineOf = async (doc: string) => (await list()).people?.find((p) => p.subject === principal)?.lines.find((l) => l.document_type === doc);
  const pass = await lineOf("passport_information_page_copy"), fee = await lineOf("fee_payment_receipt");
  ok("case pass: on the case the passport line is waivable; the fee receipt line is not", k.status < 300 && pass?.waivable === true && fee?.waivable === false, [k.status, pass?.waivable, fee?.waivable]);

  const noReason = await call("POST", `/runtime/checklist-lines/${pass?.id}/waive`, { reason: "   " }, OFFICER);
  ok("waive fail: without a reason it is refused on the field (400), nothing changed", noReason.status === 400 && /reason for waiving/i.test(JSON.stringify(noReason.body)) && (await lineOf("passport_information_page_copy"))?.state === "not_requested", [noReason.status, words(noReason)]);
  const byClient = await call("POST", `/runtime/checklist-lines/${pass?.id}/waive`, { reason: "I would rather not" }, CLIENT);
  ok("waive fail: a client cannot waive a line (403)", byClient.status === 403, byClient.status);
  const notWaivable = await call("POST", `/runtime/checklist-lines/${fee?.id}/waive`, { reason: "Sample reason" }, OFFICER);
  ok("waive fail: a line its release does not mark waivable is refused in words (422)", notWaivable.status === 422 && /cannot be waived: its line in the release is not marked waivable/.test(words(notWaivable)), [notWaivable.status, words(notWaivable)]);
  const reason = "The passport is held by the visa office for another application (Sample)";
  const waived = await call("POST", `/runtime/checklist-lines/${pass?.id}/waive`, { reason }, OFFICER);
  const after = await lineOf("passport_information_page_copy");
  const stored = sql(`select state || '|' || state_reason || '|' || state_by || '|' || (state_at is not null) from checklist_line where id='${pass?.id}'`);
  ok("waive pass: the case officer waives it with a reason: Waived, not required, who and when kept", waived.status === 200 && after?.state === "waived" && after?.required === false && stored === `waived|${reason}|${OFFICER}|true`, [waived.status, words(waived), after?.state, stored]);
  const notMissing = await missing();
  ok("readiness pass (review M5): Ready to file no longer warns that the waived passport copy is not received", notMissing === 0, notMissing);
  const audited = Number(sql(`select count(*) from audit_event where entity_key='${pass?.id}' and action='waived'`) ?? 0);
  ok("waive pass (history): the waiver is in the case's history", audited === 1, audited);
  const why = sql(`select detail->>'reason' from audit_event where entity_key='${pass?.id}' and action='waived'`);
  ok("waive pass (history, break M2): the history keeps the reason given", why === reason, why);
  const again = await call("POST", `/runtime/checklist-lines/${pass?.id}/waive`, { reason }, OFFICER);
  ok("waive fail: a waived line cannot be waived again (409)", again.status === 409, again.status);
  const back = await call("POST", `/runtime/checklist-lines/${pass?.id}/request`, {}, OFFICER);
  ok("take back pass: asking for the document again takes the waiver back (Requested, required again)", back.status === 200 && (await lineOf("passport_information_page_copy"))?.state === "requested", [back.status, words(back)]);
  const missingAgain = await missing();
  ok("readiness fail (review M5): once asked for again, Ready to file warns that it is not received", missingAgain === 1, missingAgain);
  const was = sql(`select (detail->>'from') || '|' || (detail->>'from_reason') || '|' || (detail->>'from_by') from audit_event where entity_key='${pass?.id}' and action='requested'`);
  ok("take back pass (break M2): once taken back, the history still says who waived it and why", was === `waived|${reason}|${OFFICER}`, was);

  process.exitCode = summary() ? 1 : 0;
})();
