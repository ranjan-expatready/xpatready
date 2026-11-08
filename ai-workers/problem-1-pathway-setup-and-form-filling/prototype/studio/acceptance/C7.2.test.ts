// Acceptance C7.2 (P-220, pack 3; thin runtime slice T): a filled form passes Adobe Validate and its barcodes match the
// facts (fill-trial gate P-65; P-46: Validate in Adobe Reader, the copy read back and its barcodes compared with the
// facts by position; P-171: always Validate barcode forms, the last step, again after any change). IRCC: "You must
// always click the Validate button on 2D barcode forms" (Help Centre 1523); Guide 5256: Validate "will generate a
// barcode page" (it says page 5 of 5; on the 09-2023 form the evidence lane saw it added as page 6, E1/imm5257/STATUS.md). Status today: Not tested. On main: the case's IMM 5257 copy is generated,
// a validated copy is uploaded back and its written values read back (tools/read_validated.py), but the barcodes are
// never decoded or compared ("barcode_checked": false), and the evidence lane's Adobe trial (E1/imm5257/STATUS.md,
// 23 Oct: Validate passed, 5/5 barcodes, 186/186 slots) filled E1's values file, not a copy the Studio generated.
// Part 1 (API, runs anywhere): a validated copy whose barcodes cannot be read is never taken as passing. Part 2 (Mac
// evidence, J6 step 6): the Adobe Validate result for a Studio-generated IMM 5257 is recorded and agrees with the copy.
// No live AI (US$0).
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept \
//     && tsx studio/acceptance/C7.2.test.ts 4448 xr_studio_accept
import { asValidated } from "../tests/runtime/validated.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICER = "user-O", CLIENT = "user-P";
/** Where J6 step 6 records the Mac's Adobe run: a JSON result only; PDFs are never committed (AGENTS rule 1). */
const EVIDENCE = join(import.meta.dirname, "..", "evidence", "c7-2-adobe-validate", "result.json");
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv || !Number(sql(`select count(*) from config_release where combination_id = '${vv}'`))) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first"); process.exit(2); }

  // ── Part 1: through the API ──
  const c = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C72-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = c.body?.id ?? c.body?.case?.id;
  const P = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people?.find((p: { role: string }) => p.role === "principal")?.subject_id;
  // QA-315: on the configured checkpoint, release 2 files IMM 5257 Online (C10.1 row 9), and an Online form's PDF is a copy
  // not for filing, which is never validated. IRCC accepts IMM 5257 as a PDF upload too, so the officer files it that way
  // for this person (Ready to file › how it is filed, C11.6) before the copy is made: the copy is then one to validate. On
  // the fixture the release already files it as a PDF upload, and nothing changes.
  const prep = (await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, OFFICER)).body;
  const item = (prep?.items ?? []).find((i: { kind: string; form?: string; subject: string }) => i.kind === "form" && i.form === "IMM 5257" && i.subject === P);
  const ch = item && item.channel !== "PDF_UPLOAD" ? await call("PATCH", `/runtime/items/${item.id}/channel`, { channel: "PDF_UPLOAD", reason: "Filed as a PDF upload for this person (C7.2's pack, Sample).", version: prep.version }, OFFICER) : null;
  const filedAs = ch ? ch.body?.item?.channel : item?.channel;
  ok("C7.2 setup (QA-315): the principal's IMM 5257 is filed as a PDF upload on this case (the officer's choice where the release files it Online), so its copy is one to validate", filedAs === "PDF_UPLOAD", { release: item?.line_channel, was: item?.channel, change: ch && { status: ch.status, words: words(ch) }, now: filedAs });
  const g =await call("POST", `/runtime/cases/${caseId}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `c72-${Date.now()}` }, OFFICER);
  const copy = String(g.body?.copy?.id ?? g.body?.id ?? "");
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status), 90_000);
  const dl = copy ? await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copy}/file?original=1`, { headers: { "x-actor": OFFICER } }) : null;
  const pdf = dl && dl.status === 200 ? Buffer.from(await dl.arrayBuffer()) : null;
  ok("C7.2 setup (C7.1, on main): the case's IMM 5257 copy is generated from the release and downloads", g.status < 300 && pdf !== null && pdf.subarray(0, 5).toString() === "%PDF-", { status: g.status, words: words(g) });
  if (pdf) {
    // Adobe's Validate saves incrementally; here its result is simulated in the form's own flag (QA-165), so no barcode page is drawn.
    const simulated = asValidated(pdf);
    const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(simulated)]), "imm5257-validated.pdf");
    const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copy}/validated`, { method: "POST", headers: { "x-actor": OFFICER }, body: fd });
    const up = { status: res.status, body: await res.json().catch(() => null) };
    const bc = up.body?.copy?.validated?.barcodes ?? up.body?.barcodes;
    ok("C7.2 P-46: the upload reports the barcode check: barcodes expected for IMM 5257 (5, as the evidence lane decoded on 23 Oct), decoded, matched", bc && bc.checked === true && bc.expected === 5 && Number.isInteger(bc.decoded) && typeof bc.matched === "boolean", bc ?? { status: up.status, words: words(up) });
    ok("C7.2 fail: a copy whose barcodes cannot be read (Validate not pressed, or a page missing) is never ready for filing; the words say to press Validate in Adobe Reader", bc && bc.matched === false && /Validate/.test(String(bc.words ?? "")) && up.body?.copy?.validated?.current !== true, { status: up.status, validated: up.body?.copy?.validated });
    // P-171 (1), founder's Sample rule: any change to a fact on the form after Validate marks the validated copy out of date.
    const put = await call("PUT", `/runtime/cases/${caseId}/answers/${P}/person.family_name`, { value: "SAMPLE-CHANGED", expectedId: null }, OFFICER);
    const after = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body;
    // QA-315: only after an upload that was read back and kept: a refused upload (as on the checkpoint before QA-315) left
    // nothing to go out of date, so it never passes this line.
    ok("C7.2 P-171 (1): changing a fact on the form after the upload marks the validated copy out of date and asks for Validate again", up.status < 300 && !!up.body?.id && put.status === 200 && after?.validated?.current !== true && after?.out_of_date === true, { upload: up.status, put: put.status, validated: after?.validated?.current, out_of_date: after?.out_of_date });
  } else {
    ok("C7.2 P-46: the upload reports the barcode check", false, "no generated copy");
    ok("C7.2 fail: a copy whose barcodes cannot be read is never ready for filing", false, "no generated copy");
  }

  // ── Part 2: the Mac's Adobe run on a Studio copy (J6 step 6) ──
  const ev = existsSync(EVIDENCE) ? JSON.parse(readFileSync(EVIDENCE, "utf8")) : null;
  ok("C7.2 evidence: a result of the Mac's Adobe run is recorded at studio/evidence/c7-2-adobe-validate/result.json", ev !== null);
  ok("C7.2 evidence: it is a Studio-generated IMM 5257 of a Visitor visa case (not E1's values file), named by its checksum", ev?.form === "IMM 5257" && ev?.source === "studio case copy" && /^[0-9a-f]{64}$/.test(ev?.copy_sha256 ?? "") && /vv\.single|Visitor visa/.test(String(ev?.combination ?? "")), ev && { form: ev.form, source: ev.source });
  ok("C7.2 evidence (P-171): Adobe Reader's Validate succeeded on the first press, with the reader's version (10 or higher, IRCC Help Centre 660) and the message as shown", /Validation completed successfully/i.test(String(ev?.validate_message ?? "")) && typeof ev?.reader_version === "string" && Number(String(ev.reader_version).split(".")[0]) >= 10, ev && { message: ev.validate_message, reader: ev.reader_version });
  ok("C7.2 evidence (P-46): every barcode decoded and every slot agrees with the facts written (0 unexplained)", ev && ev.barcodes_decoded === ev.barcodes_expected && ev.barcodes_expected === 5 && ev.slots_total > 0 && ev.slots_agree === ev.slots_total && ev.unexplained === 0, ev && { decoded: ev.barcodes_decoded, slots: `${ev.slots_agree}/${ev.slots_total}`, unexplained: ev.unexplained });
  ok("C7.2 evidence: the saved file kept IRCC's certification (no \"changed\" warning) and the written values read back unchanged", ev?.certification_intact === true && ev?.written_values_unchanged === true);
  ok("C7.2 evidence: the result names the validated file's checksum and the screenshots of the Validate message and the barcode page", /^[0-9a-f]{64}$/.test(ev?.validated_sha256 ?? "") && ev?.validated_sha256 !== ev?.copy_sha256 && Array.isArray(ev?.screenshots) && ev.screenshots.length >= 2, ev && { validated: ev.validated_sha256, screenshots: ev.screenshots });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
