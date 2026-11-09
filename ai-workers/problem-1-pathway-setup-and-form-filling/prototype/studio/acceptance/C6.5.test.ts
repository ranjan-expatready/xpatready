// C6.5 Uploaded documents read into facts a person confirms (M3-C; r5c BR-4–BR-7; P-133, P-134, P-142, P-169).
// Visitor visa part, US$0: the passport is read by rules on the coded lines (no AI, no OCR: a synthetic PDF with a
// text layer, lib/fixtures.ts); values are proposals with provenance and confidence, never answers; nothing happens on
// upload; a bad check digit is flagged unreadable, never guessed; typed versus document opens one check that blocks
// Confirm section; only staff mark a value checked against the document.
// Review per P-242 and P-243 (they amend P-142 D5 and P-72; tech lead's ruling under P-294, 3 Nov): a document's values
// stay proposals until one "Confirm & use" on that document (P-242: "a value read by AI or rules from a document is a
// proposal until staff click Confirm & use, one review per document"); passport number, date of birth and expiry show
// collapsed only when the coded lines' check digits passed, names and anything without a passed check stay expanded
// (P-243); a client's own typed answer is Declared and fills at once (P-242). Before this, steps 9–11 expected
// field-by-field acceptance (P-142 D5).
// Engine steps (C6.5-E*, the reader engine/runtime/mrz.ts and resolver rule R11; no database, no server):
//   tsx studio/acceptance/C6.5.test.ts --engine
// Letters (letter of invitation) are read by AI vision on synthetic documents, here only replayed at US$0; a live read is refused without the founder's Go.
// Breadth, after Visitor visa: printed-text and table reading (Textract, STANDARDS §1 gate), foreign civil records.
//   zsh studio/tools/isolated.sh c65 4440 start && tsx studio/acceptance/C6.5.test.ts 4440 xr_studio_c65
//   (the full pack, server steps included, on its copy; gate B reads this line: P-400 question on PR C6.5 part 2)
import { CLIENT, FAMILY, FIXED, OFFICER, PORT, agent, answer, call, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";
import { fundsPdf, letterPdf, mrz, passportPdf, textPdf, upload } from "./lib/fixtures.ts";
import { readPassport } from "../engine/runtime/mrz.ts";
import { documentFacts } from "../engine/sources.ts";
import type { Snapshot } from "../engine/snapshot.ts";

type Proposal = { id: string; fact: string; value: unknown; source: { document: string; page: number; reader: string }; confidence: number; state: string; review?: "collapsed" | "expanded"; replayed?: boolean };
type Review = { document: string; confirm: string; collapsed: string[]; expanded: string[] };
const IDENTITY = ["person.date_of_birth", "person.passport_number", "person.passport_expiry_date"];
const NAMES = ["person.family_name", "person.given_names"];

await main("C6.5", "Documents read into proposed facts (Visitor visa, replayed, US$0)", async () => {
  // Engine steps: the rules reader and whom a document's facts are about, on Sample documents (no database).
  const sample = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: FIXED.dob, sex: "X" as const, expiry: FIXED.expiry };
  const e = readPassport("sample-doc", passportPdf(sample));
  const val = (f: string) => e.proposals.find((x) => x.fact === f);
  ok("C6.5-E1 pass: the reader reads a synthetic passport's coded lines into proposals about its holder, reader \"mrz\", page 1, with a confidence", val("person.family_name")?.value === "SAMPLED" && val("person.passport_number")?.value === "SAMPLEP12" && val("person.date_of_birth")?.value === FIXED.dob && val("person.passport_expiry_date")?.value === FIXED.expiry && e.proposals.every((x) => x.about === "holder" && x.source.reader === "mrz" && x.source.page === 1 && x.source.document === "sample-doc" && x.state === "proposed" && typeof x.confidence === "number"));
  ok("C6.5-E2 pass (P-243): number, date of birth and expiry, backed by passed check digits, are collapsed; names stay expanded; one review for the document (P-242)", JSON.stringify(e.review.collapsed) === JSON.stringify(IDENTITY) && NAMES.every((f) => e.review.expanded.includes(f)) && e.review.confirm === "one_per_document");
  ok("C6.5-E3 pass: place of birth is not proposed (not on the coded lines)", !val("person.place_of_birth_city"));
  const eb = readPassport("sample-bad", passportPdf(sample, true));
  ok("C6.5-E4 fail: a bad check digit: no passport number is proposed, it is listed unreadable, and nothing is collapsed (P-243)", !eb.proposals.some((x) => x.fact === "person.passport_number") && eb.unreadable.some((x) => x.fact === "person.passport_number") && eb.review.collapsed.length === 0);
  const e2 = readPassport("sample-two", textPdf([...mrz(sample), ...mrz({ ...sample, surname: "SAMPLES", given: "SPOUSE A", number: "SAMPLES34" })]));
  ok("C6.5-E5 fail: two people's passports on one document: nothing is proposed for either, every fact unreadable (never attributed by guess)", e2.people === 2 && e2.proposals.length === 0 && e2.unreadable.length > 0);
  const two = { combination: { key: "t", participants: [] }, document_types: [{ key: "marriage_certificate", name: "Marriage certificate (Sample)", supplies_facts: ["relationship.start_date", "person.family_name_at_birth"], supplies_about: { "person.family_name_at_birth": "holder.spouse" } }],
    document_requirements: [{ document_type_key: "marriage_certificate", document_type: "Marriage certificate (Sample)", who: "principal_applicant", base_or_conditional: "base" }] } as unknown as Snapshot;
  const fam = [{ id: "A", role: "principal", label: "A", applies: true }, { id: "B", role: "spouse_or_partner", label: "B", applies: true }];
  const d = documentFacts(two, fam);
  ok("C6.5-E6 pass (resolver R11): a two-person document on the principal's line supplies each fact to the person it is about (the spouse's to the spouse)", d.get("A")?.has("relationship.start_date") === true && d.get("B")?.has("person.family_name_at_birth") === true && !d.get("A")?.has("person.family_name_at_birth"));
  ok("C6.5-E7 fail (resolver R11): with no spouse on the case, the spouse's fact goes to nobody, never to the holder", ![...documentFacts(two, fam.slice(0, 1)).values()].some((m) => m.has("person.family_name_at_birth")));
  if (process.argv.includes("--engine")) return;

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

  // P-242 and P-243 (amend P-142 D5 and P-72): one review per document, identity values collapsed only on passed check digits.
  const listed = (await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}`, undefined, OFFICER)).body;
  const review = (listed?.reviews as Review[] | undefined)?.find((x) => x.document === docId);
  ok("C6.5-9 pass (P-242, P-243): the passport is one review with one \"Confirm & use\"; number, date of birth and expiry are collapsed (check digits passed), names expanded", review?.confirm === "one_per_document" && JSON.stringify([...(review?.collapsed ?? [])].sort()) === JSON.stringify([...IDENTITY].sort()) && NAMES.every((f) => review?.expanded.includes(f)) && (listed?.proposals as Proposal[] | undefined)?.find((x) => x.fact === "person.family_name")?.review === "expanded", review);
  // BR-7 set-up: a typed answer before the review: the client's own where the release lets the client type the name
  // (the configured checkpoint: client_questionnaire); else the officer's (the fixture's releases enter it from the
  // passport, verified_document, #924), so the typed-versus-document rule is tested on both (P-400 question).
  const nameQ = v?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; collected_from: string }[] }) => s.questions).find((q: { subjectId: string; fact: string }) => q.subjectId === P && q.fact === "person.family_name");
  const typist = ["client_questionnaire", "profile_record"].includes(nameQ?.collected_from ?? "") ? CLIENT : OFFICER;
  await answer(c.id, P, "person.family_name", "SAMPLEDE", typist);
  ok(`C6.5-9b pass (P-242): the ${typist === CLIENT ? "client's own" : "officer's (the release enters the name from the passport)"} typed answer is Declared and is the current answer at once`, sql(`select status || '|' || (value_json #>> '{}') from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) === "DECLARED|SAMPLEDE");
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P }, CLIENT);
  ok("C6.5-9c fail (P-242): a client cannot Confirm & use a document's values (403; staff only)", r.status === 403, r.status);
  // P-243, L-SA9 (Lead 35 on #1369, P-400): Confirm & use names the values the officer looked at one by one (the
  // document's expanded values, ticked "Matches the document"); the server refuses it (422) while one is missing.
  const ticked = ((listed?.proposals ?? []) as Proposal[]).filter((x) => x.source?.document === docId && x.review === "expanded").map((x) => x.id);
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P, checked: ticked }, OFFICER);
  ok("C6.5-10 pass (P-242, P-243): one Confirm & use, with the expanded values the officer ticked, writes the document's values with their provenance (document_read, document, page) and records who and when", r.status === 200 && /document_read/.test(sql(`select source_json::text from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`) ?? "") && new RegExp(OFFICER).test(JSON.stringify(r.body?.confirmed ?? r.body)) && !!(r.body?.confirmed?.at ?? r.body?.at), r.body);
  ok("C6.5-11 pass (P-242, amends P-72): a value used by Confirm & use fills at once: the passport number is the current answer, not waiting for Confirm section", sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`) === "SAMPLEP12" && (await agent(c.id))?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; answer: { confirmed: boolean } | null }[] }) => s.questions).find((q: { subjectId: string; fact: string }) => q.subjectId === P && q.fact === "person.passport_number")?.answer?.confirmed === true);

  // BR-7: typed versus document: never settled silently (P-242).
  const checks = (await call("GET", `/runtime/cases/${c.id}/checks?subject=${P}`, undefined, OFFICER)).body?.checks ?? [];
  ok("C6.5-12 pass (BR-7, P-242): the client typed SAMPLEDE, the passport reads SAMPLED: one open check for this person and fact, and the client's answer is not overwritten", checks.filter((x: { fact: string; state: string }) => x.fact === "person.family_name" && x.state === "open").length === 1 && sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) === "SAMPLEDE", checks);
  // QA-322 (P-142 D6): the client sees "please check" on that answer while its check is open, where the client is asked
  // the question (the configured checkpoint); where staff enter it from the document (the fixture), the client is not
  // asked it, so nothing is shown there. The officer's half (C6.5-13 to -15) is unchanged.
  const clientNotes = async () => ((await call("GET", `/runtime/cases/${c.id}/questionnaire`, undefined, CLIENT)).body?.checks ?? []).filter((x: { subjectId: string; fact: string; message: string }) => x.subjectId === P && x.fact === "person.family_name" && /^Please check this answer/.test(x.message));
  const noteNow = await clientNotes();
  ok(`C6.5-12b pass (P-142 D6, QA-322): ${typist === CLIENT ? "the client sees \"please check\" on the family name while its check is open, naming the document, never its value" : "the client is not asked the family name here (staff enter it from the passport), so no \"please check\" is shown"}`, typist === CLIENT ? noteNow.length === 1 && !/SAMPLED\b/.test(noteNow[0].message) : noteNow.length === 0, noteNow);
  ok("C6.5-12c pass (QA-322, Lead 39): the officer's Agent view is unchanged: no \"please check\" entry there (the officer works the check in the drawer)", !((await agent(c.id))?.checks ?? []).some((x: { id: string }) => x.id.startsWith("document_check.")));
  // Review m8 on 01d12b6b7 (Lead 39, P-400): the view decides "changed" by value: the typist saves another value, then
  // the compared one, and the note reads "did not match" again (never "has changed" for the compared value).
  const nameNow = () => sql(`select id from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`);
  await answer(c.id, P, "person.family_name", "SAMPLEDX", typist);
  const noteChanged = await clientNotes();
  await answer(c.id, P, "person.family_name", "SAMPLEDE", typist);
  const noteBack = await clientNotes();
  ok("C6.5-12d pass (QA-322, review m8): the client saves another value, then the compared one: the note reads 'did not match' again", typist === CLIENT ? /It has changed since it was compared/.test(noteChanged[0]?.message ?? "") && noteBack.length === 1 && /It did not match/.test(noteBack[0].message) : noteChanged.length === 0 && noteBack.length === 0, { noteChanged, noteBack });
  const seen = (await agent(c.id))?.sections?.find((s: { section: string; subjectId: string }) => s.section === section && s.subjectId === P)?.questions?.map((q: { answer: { id: string } | null }) => q.answer?.id).filter(Boolean) ?? [];
  r = await call("POST", `/runtime/cases/${c.id}/sections/${section}/confirm`, { subjectId: P, seen }, OFFICER);
  ok("C6.5-13 fail (BR-6): Confirm section is refused while a check is open (409 open_checks)", r.status === 409 && /open_checks|check/i.test(JSON.stringify(r.body)), r.status);
  const chk = checks.find((x: { fact: string }) => x.fact === "person.family_name");
  r = await call("POST", `/runtime/checks/${chk?.id}/resolve`, { keep: "document" }, OFFICER);
  ok("C6.5-14 fail: resolving a check without a reason is refused (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/checks/${chk?.id}/resolve`, { keep: "document", reason: "Matches the passport page (Sample)", answerId: nameNow() }, OFFICER);
  ok("C6.5-15 pass: the officer keeps the document's value with a reason; the client's value stays on record", r.status === 200 && Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name'`) ?? 0) >= 2 && sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) === "SAMPLED");
  ok("C6.5-15b fail (P-142 D6, QA-322): once the officer resolves the check, the client's \"please check\" is gone", (await clientNotes()).length === 0);
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
  ok("C6.5-18b fail (P-243): with a failed check digit nothing is collapsed: date of birth and expiry stay expanded", r.status === 200 && ["person.date_of_birth", "person.passport_expiry_date"].every((f) => (r.body?.proposals ?? []).find((x: Proposal) => x.fact === f)?.review === "expanded"), r.body);

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

  // QA-352 (the tech lead's ruling P-437): every checklist document that offers "Fill this from documents" is read by
  // some reader. qa's replay: a proof of financial support on Client A's own line is read by AI vision for the
  // application (the funds for the stay are the application's, resolver R5), with the facts the library says it supplies
  // (S6c / checkpoint 335), replayed from its saved read at US$0. Live AI off: never a live read here (P-175).
  const fundsLine = ((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === P)?.lines ?? []).find((x: { label: string }) => /financial support/i.test(x.label))?.id;
  u = await upload(PORT, `/runtime/checklist-lines/${fundsLine}/documents`, fundsPdf(", a copy with no saved read"), "sample-funds-unsaved.pdf", OFFICER);
  ok("C6.5-21a pass (QA-352): a synthetic proof of financial support is uploaded to Client A's own checklist line", u.status === 201, [fundsLine, u.status]);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents/plan`, { subjectId: c.caseSubject }, OFFICER);
  const fundsDoc = (r.body?.documents ?? []).find((x: { document: string }) => x.document === u.body?.document?.id);
  ok("C6.5-21 pass (QA-352, P-110): the application's visit section now offers the proof of funds, read by AI vision, its cost first (live priced, not allowed)", r.status === 200 && fundsDoc?.reader === "ai_vision" && r.body?.estimate?.live_usd > 0 && r.body?.live_allowed === false, r.body);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents`, { subjectId: c.caseSubject, mode: "replay" }, OFFICER);
  ok("C6.5-21c fail (QA-352): a proof of funds with no saved read is never read live: 409 no_saved_read, nothing stored, no cost", r.status === 409 && r.body?.code === "no_saved_read" && sql(`select count(*) from document_review where document_id='${u.body?.document?.id}'`) === "0", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId: P }, OFFICER);
  ok("C6.5-21d fail (QA-352): Client A's own sections never read the proof of funds (it gives only the application's facts)", r.status === 200 && !(r.body?.reviews ?? []).some((x: { document: string }) => x.document === u.body?.document?.id) && !(r.body?.not_read ?? []).some((x: { document: string }) => x.document === u.body?.document?.id), r.body);
  u = await upload(PORT, `/runtime/checklist-lines/${fundsLine}/documents`, fundsPdf(), "sample-funds.pdf", OFFICER);
  const funds = u.body?.document?.id;
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents/plan`, { subjectId: c.caseSubject }, OFFICER);
  ok("C6.5-21b precondition (QA-352): a saved AI read of this synthetic proof of funds is recorded (one live read on the Mac by the tech lead; until then this, C6.5-22 and C6.5-23 stay red)", r.body?.replay?.find((x: { document: string }) => x.document === funds)?.replay_available === true, r.body?.replay);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents`, { subjectId: c.caseSubject, mode: "replay" }, OFFICER);
  const fundsValue = ((r.body?.proposals ?? []) as (Proposal & { subject: string })[]).find((x) => x.source?.document === funds && x.fact === "case.funds_available_cad");
  ok("C6.5-22 pass (QA-352, qa's replay): \"Fill this from documents\" on the visit section proposes the funds for the stay from the proof of funds, about the application, reader AI vision, Replayed, expanded for a look (P-243), only the library's facts, US$0", r.status === 200 && Number(fundsValue?.value) === 14200 && ((r.body?.proposals ?? []) as Proposal[]).filter((x) => x.source?.document === funds).every((x) => x.fact === "case.funds_available_cad") && fundsValue?.subject === c.caseSubject && fundsValue?.replayed === true && fundsValue?.source.reader === "ai_vision" && fundsValue?.review === "expanded" && r.body?.cost_usd === 0, r.body);
  r = await call("POST", `/runtime/cases/${c.id}/documents/${funds}/confirm-and-use`, { subjectId: c.caseSubject, checked: fundsValue ? [fundsValue.id] : [] }, OFFICER);
  ok("C6.5-23 pass (QA-352, P-242): one Confirm & use on the application, with the value ticked, writes the funds as the application's answer with the document's provenance", r.status === 200 && /"document_read"/.test(sql(`select source_json::text from client_canonical_answer where subject_id='${c.caseSubject}' and canonical_field_key='case.funds_available_cad' and superseded_by_id is null`) ?? "") && r.body?.used?.includes("case.funds_available_cad"), r.body);
  r = await call("POST", `/runtime/cases/${c.id}/documents/${funds}/confirm-and-use`, { subjectId: P }, OFFICER);
  ok("C6.5-23b fail (QA-352): the proof of funds is not confirmed on Client A (it is read for the application): 422, nothing written", r.status === 422, r.status);
});
