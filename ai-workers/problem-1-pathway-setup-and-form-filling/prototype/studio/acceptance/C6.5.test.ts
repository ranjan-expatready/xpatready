// C6.5 Uploaded documents read into facts a person confirms (M3-C; r5c BR-4–BR-7; P-133, P-134, P-142, P-169).
// Visitor visa part, US$0: the passport is read by rules on the coded lines (no AI, no OCR: a synthetic PDF with a
// text layer, lib/fixtures.ts); values are proposals with provenance and confidence, never answers; nothing happens on
// upload; names, date of birth, passport number and expiry are confirmed field by field; a bad check digit is flagged
// unreadable, never guessed; typed versus document opens one check that blocks Confirm section; only staff mark a value
// checked against the document. Letters (letter of invitation) are read by AI vision on synthetic documents, here only
// replayed at US$0; a live read is refused without the founder's Go.
// Breadth, after Visitor visa: printed-text and table reading (Textract, STANDARDS §1 gate), foreign civil records.
//   tsx studio/acceptance/C6.5.test.ts 4440 xr_studio_accept
import { CLIENT, FAMILY, FIXED, OFFICER, PORT, agent, answer, call, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";
import { letterPdf, passportPdf, upload } from "./lib/fixtures.ts";

type Proposal = { id: string; fact: string; value: unknown; source: { document: string; page: number; reader: string }; confidence: number; state: string; field_by_field?: boolean; replayed?: boolean };

await main("C6.5", "Documents read into proposed facts (Visitor visa, replayed, US$0)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"];
  const spend0 = sql("select count(*) from ai_batch");
  const v = await agent(c.id);
  const section = v?.sections?.find((s: { subjectId: string; questions: { fact: string }[] }) => s.subjectId === P && s.questions.some((q) => q.fact === "person.passport_number"))?.section;
  const lines = (await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === P)?.lines ?? [];
  const passLine = lines.find((x: { label: string }) => /passport/i.test(x.label))?.id;
  const doc = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: FAMILY[0].dob!, sex: "X" as const, expiry: FIXED.expiry };

  let u = await upload(PORT, `/runtime/checklist-lines/${passLine}/documents`, passportPdf(doc), "sample-passport.pdf", OFFICER);
  ok("C6.5-1 pass: the synthetic passport is uploaded to Client A's passport line", u.status === 201, u.status);
  const docId = u.body?.document?.id;
  const answered = () => sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key in ('person.family_name','person.passport_number') and superseded_by_id is null`);
  ok("C6.5-2 pass (P-134 D4): an upload proposes and answers nothing by itself", answered() === "0" && sql(`select count(*) from read_value where document_id='${docId}'`) === "0");

  let r = await call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId: P }, OFFICER);
  const props: Proposal[] = r.body?.proposals ?? [];
  const pv = (f: string) => props.find((x) => x.fact === f);
  ok("C6.5-3 pass: \"Fill this from documents\" on the passport section proposes the coded-line facts", r.status === 200 && pv("person.family_name")?.value === "SAMPLED" && pv("person.passport_number")?.value === "SAMPLEP12" && pv("person.date_of_birth")?.value === doc.dob && pv("person.passport_expiry_date")?.value === FIXED.expiry, props.map((x) => [x.fact, x.value]));
  ok("C6.5-4 pass (AG11-D4 shape): every proposal carries its document, page, reader \"mrz\" (rules) and a confidence", props.length > 0 && props.every((x) => x.source?.document === docId && x.source.page === 1 && x.source.reader === "mrz" && typeof x.confidence === "number"));
  ok("C6.5-5 pass: place of birth is not proposed (not on the coded lines; typed)", props.length > 0 && !pv("person.place_of_birth_city"));
  ok("C6.5-6 pass (no AI): reading a passport made no model call", props.length > 0 && sql("select count(*) from ai_batch") === spend0);
  ok("C6.5-7 pass: proposals are not answers: the answers are unchanged until a person accepts", props.length > 0 && answered() === "0");
  ok("C6.5-8 fail: a client cannot run Fill this from documents for the officer's view (403)", (await call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId: P }, CLIENT)).status === 403);

  // P-142 D5: names, date of birth, passport number and expiry are always accepted one by one.
  r = await call("POST", `/runtime/cases/${c.id}/proposals/accept`, { subjectId: P, all: true }, OFFICER);
  const after = (await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}`, undefined, OFFICER)).body?.proposals as Proposal[] | undefined;
  ok("C6.5-9 pass (P-142 D5): Accept all leaves names, date of birth, passport number and expiry waiting, field by field", ["person.family_name", "person.given_names", "person.date_of_birth", "person.passport_number", "person.passport_expiry_date"].every((f) => after?.find((x) => x.fact === f)?.state === "proposed"));
  r = await call("POST", `/runtime/proposals/${pv("person.passport_number")?.id}/accept`, {}, OFFICER);
  ok("C6.5-10 pass: accepting one proposal writes the answer with its provenance (document_read, document, page)", r.status === 200 && /document_read/.test(sql(`select source_json::text from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`) ?? ""));
  ok("C6.5-11 pass (P-72): the accepted value is Proposed, not confirmed, until Confirm section", (await agent(c.id))?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; answer: { confirmed: boolean } | null }[] }) => s.questions).find((q: { subjectId: string; fact: string }) => q.subjectId === P && q.fact === "person.passport_number")?.answer?.confirmed === false);

  // BR-7: typed versus document.
  await answer(c.id, P, "person.family_name", "SAMPLEDE", CLIENT);
  r = await call("POST", `/runtime/proposals/${pv("person.family_name")?.id}/accept`, {}, OFFICER);
  const checks = (await call("GET", `/runtime/cases/${c.id}/checks?subject=${P}`, undefined, OFFICER)).body?.checks ?? [];
  ok("C6.5-12 pass (BR-7): the client typed SAMPLEDE, the passport reads SAMPLED: one open check for this person and fact", checks.filter((x: { fact: string; state: string }) => x.fact === "person.family_name" && x.state === "open").length === 1, checks);
  const seen = (await agent(c.id))?.sections?.find((s: { section: string; subjectId: string }) => s.section === section && s.subjectId === P)?.questions?.map((q: { answer: { id: string } | null }) => q.answer?.id).filter(Boolean) ?? [];
  r = await call("POST", `/runtime/cases/${c.id}/sections/${section}/confirm`, { subjectId: P, seen }, OFFICER);
  ok("C6.5-13 fail (BR-6): Confirm section is refused while a check is open (409 open_checks)", r.status === 409 && /open_checks|check/i.test(JSON.stringify(r.body)), r.status);
  const chk = checks.find((x: { fact: string }) => x.fact === "person.family_name");
  r = await call("POST", `/runtime/checks/${chk?.id}/resolve`, { keep: "document" }, OFFICER);
  ok("C6.5-14 fail: resolving a check without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/checks/${chk?.id}/resolve`, { keep: "document", reason: "Matches the passport page (Sample)" }, OFFICER);
  ok("C6.5-15 pass: the officer keeps the document's value with a reason; the client's value stays on record", r.status === 200 && Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name'`) ?? 0) >= 2 && sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) === "SAMPLED");
  r = await call("POST", `/runtime/cases/${c.id}/answers/${P}/person.passport_number/checked-against-document`, { document: docId }, CLIENT);
  ok("C6.5-16 fail (P-142 D3): a client cannot mark a value checked against the document (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${P}/person.passport_number/checked-against-document`, { document: docId }, OFFICER);
  ok("C6.5-17 pass: staff mark it checked against the document: VERIFIED with that evidence and who", r.status === 200 && sql(`select status || '|' || coalesce(verified_by,'') from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`) === `VERIFIED|${OFFICER}`);

  // Unreadable is flagged, never guessed.
  const S = c.subjects["Sample Spouse A"];
  const sLine = ((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === S)?.lines ?? []).find((x: { label: string }) => /passport/i.test(x.label))?.id;
  await upload(PORT, `/runtime/checklist-lines/${sLine}/documents`, passportPdf({ ...doc, surname: "SAMPLES", number: "SAMPLES34", dob: FAMILY[1].dob! }, true), "sample-passport-bad.pdf", OFFICER);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId: S }, OFFICER);
  ok("C6.5-18 fail: a coded line whose check digit fails proposes no passport number; the field is flagged unreadable", r.status === 200 && !(r.body?.proposals ?? []).some((x: Proposal) => x.fact === "person.passport_number") && (r.body?.unreadable ?? []).some((x: { fact: string }) => x.fact === "person.passport_number"), r.body);

  // Letters: AI vision, replay only (US$0, P-133, P-164 (2)); live is refused here.
  // The synthetic letter's bytes are fixed (lib/fixtures.ts letterPdf), so its saved read replays by checksum.
  u = await upload(PORT, `/runtime/cases/${c.id}/documents`, letterPdf(), "sample-letter-of-invitation.pdf", OFFICER, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
  ok("C6.5-19a pass: a document with no checklist line (a letter of invitation, Sample) is uploaded to the case's documents", u.status === 201, u.status);
  const visit = v?.sections?.find((s: { questions: { fact: string }[] }) => s.questions.some((q) => q.fact === "case.visit_contact_name"))?.section;
  // Never a live request from a test (P-175, no priced clicks): the cost card says what live would cost and that it
  // needs the founder's Go; only replay is sent.
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents/plan`, { subjectId: c.caseSubject }, OFFICER);
  ok("C6.5-19 pass (P-110): the cost card comes first: a live read is priced above US$0 and not allowed without the founder's Go; replay US$0", r.status === 200 && r.body?.estimate?.live_usd > 0 && r.body?.live_allowed === false && r.body?.estimate?.replay_usd === 0, r.body);
  ok("C6.5-19b precondition (FQ-10): a saved AI read of this synthetic letter is recorded (one live read with the founder's Go; until then this and C6.5-20 stay red)", r.body?.replay_available === true, r.body?.replay_available);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents`, { subjectId: c.caseSubject, mode: "replay" }, OFFICER);
  ok("C6.5-20 pass: the replayed read of the synthetic letter of invitation proposes the contact's name, marked Replayed, cost US$0", r.status === 200 && (r.body?.proposals ?? []).some((x: Proposal) => x.fact === "case.visit_contact_name" && x.replayed === true && x.source?.reader === "ai_vision") && r.body?.cost_usd === 0, r.body);
});
