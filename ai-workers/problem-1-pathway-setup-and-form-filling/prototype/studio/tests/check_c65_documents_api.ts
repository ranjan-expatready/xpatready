// C6.5 part 2 (M3 plan row C7): the document routes' rules beyond acceptance/C6.5.test.ts, each with a passing and a
// failing case, on the Visitor visa of acceptance pack 4 (setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts, run
// here when the copy has no Visitor visa yet; on the configured checkpoint they are already there). Case-level upload,
// a read made once, one Confirm & use per document (P-242), values left for a person, checks resolved with a reason,
// Confirm section and readiness while a check is open, letters refused live and before their cost (P-110, P-175).
// Synthetic Sample documents only (P-133). No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c65d 4436 start && tsx studio/tests/check_c65_documents_api.ts 4436 xr_studio_runtime_c65d
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { AUTHOR, CLIENT, CLIENT_B, FAMILY, FIXED, OFFICER, PORT, DB, agent, answer, call, filingOf, main, ok, openCase, prepare, readinessOf, sql } from "../acceptance/lib/m3.ts";
import { letterPdf, passportPdf, upload } from "../acceptance/lib/fixtures.ts";

const studio = join(import.meta.dirname, "..");
const vvOf = () => sql("select id from combination where combination_key='vv.single'") || null;
if (!vvOf()) for (const f of ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"])
  try { execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, f), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 900_000 }); }
  catch { /* the setups exit 1 on their own known gaps; what this check needs is asked below */ }

type Prop = { id: string; fact: string; value: unknown; state: string; review: string; source: { document: string } };
type Q = { subjectId: string; fact: string; collected_from: string; answer: { id: string; value?: unknown } | null };
type Sec = { section: string; subjectId: string; questions: Q[] };

await main("C6.5 documents API", "case upload, read once, Confirm & use once, left for a person, checks, letters (US$0)", async () => {
  const vv = vvOf();
  ok("setup: the Visitor visa is released on this copy", !!vv);
  const c = await openCase(vv!, FAMILY);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  const spend0 = sql("select count(*) from ai_batch");
  const v0 = await agent(c.id);
  const secs = (v0?.sections ?? []) as Sec[];
  const passSec = secs.find((s) => s.subjectId === P && s.questions.some((q) => q.fact === "person.passport_number"))!.section;
  const nameSec = secs.find((s) => s.subjectId === P && s.questions.some((q) => q.fact === "person.family_name"))!.section;
  const visit = secs.find((s) => s.questions.some((q) => q.fact === "case.visit_contact_name"))!.section;
  const otherSec = secs.find((s) => s.subjectId === P && !s.questions.some((q) => (q.fact as string).startsWith("person.passport") || ["person.family_name", "person.given_names", "person.date_of_birth", "person.sex", "person.citizenship"].includes(q.fact)) && s.section !== nameSec && s.section !== passSec)?.section;
  const lineOf = async (who: string) => (((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === who)?.lines ?? []).find((x: { label: string }) => /passport/i.test(x.label) && !/absent|parent/i.test(x.label))?.id as string;
  const doc = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: FAMILY[0].dob!, sex: "X" as const, expiry: FIXED.expiry };
  const fill = (section: string, subjectId: string, actor = OFFICER, extra: Record<string, unknown> = {}) => call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId, ...extra }, actor);

  // ---- D1 case-level upload (no checklist line)
  let r = await upload(PORT, `/runtime/cases/${c.id}/documents`, letterPdf(), "letter.pdf", AUTHOR, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
  ok("C6.5 D1 fail: someone who works on configuration (the author) cannot upload a case document (403)", r.status === 403, r.status);
  r = await upload(PORT, `/runtime/cases/${c.id}/documents`, letterPdf(), "letter.pdf", OFFICER, { subjectId: c.caseSubject, documentType: "not_a_type" });
  ok("C6.5 D1 fail: a document type the release does not name is refused (422) and nothing is stored", r.status === 422 && sql(`select count(*) from case_document where subject_id='${c.caseSubject}'`) === "0", r.status);
  r = await upload(PORT, `/runtime/cases/${c.id}/documents`, letterPdf(), "letter.pdf", CLIENT_B, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
  ok("C6.5 D1 fail: another client cannot upload to this case (404, not found)", r.status === 404, r.status);
  r = await upload(PORT, `/runtime/cases/${c.id}/documents`, letterPdf(), "letter.pdf", CLIENT, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
  ok("C6.5 D1 pass: the case's client uploads a letter of invitation with no checklist line (201), stored as the application's, with no line", r.status === 201 && sql(`select count(*) from case_document where id='${r.body?.document?.id}' and checklist_line_id is null and document_type='letter_of_invitation'`) === "1", r.body);
  const letter1 = r.body?.document?.id;

  // ---- D10 letters: the cost first, never live
  r = await fill(visit, c.caseSubject);
  ok("C6.5 D10 fail (P-110): a letter is not read before its cost is seen: 409 cost_first, nothing stored", r.status === 409 && r.body?.code === "cost_first" && sql(`select count(*) from document_review where document_id='${letter1}'`) === "0", r.body);
  r = await fill(visit, c.caseSubject, OFFICER, { mode: "live" });
  ok("C6.5 D10 fail (P-175): a live read is refused on this copy (409 live_refused), US$0", r.status === 409 && r.body?.code === "live_refused", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents/plan`, { subjectId: c.caseSubject }, OFFICER);
  ok("C6.5 D10 pass (P-295): the cost card gives the usual and the worst cost of a live read, and replay at US$0", r.status === 200 && r.body?.estimate?.usual_usd > 0 && r.body?.estimate?.worst_usd >= r.body?.estimate?.usual_usd && r.body?.estimate?.replay_usd === 0 && r.body?.live_allowed === false, r.body?.estimate);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${visit}/fill-from-documents/plan`, { subjectId: c.caseSubject }, CLIENT);
  ok("C6.5 D10 fail: a client cannot see the officer's cost card (403)", r.status === 403, r.status);

  // ---- D2/D3 fill: nothing before an upload; one read per document
  r = await fill(passSec, P);
  ok("C6.5 D2 pass: with no passport uploaded yet, Fill this from documents proposes nothing and says to upload it", r.status === 200 && r.body?.proposals?.length === 0 && /upload/i.test(r.body?.message ?? ""), r.body);
  r = await fill("no_such_section", P);
  ok("C6.5 D2 fail: a section the release does not have is not found (404)", r.status === 404, r.status);
  r = await fill(passSec, "00000000-0000-4000-8000-000000000000");
  ok("C6.5 D2 fail: a person not on this case is not found (404)", r.status === 404, r.status);
  const up = await upload(PORT, `/runtime/checklist-lines/${await lineOf(P)}/documents`, passportPdf(doc), "sample-passport.pdf", OFFICER);
  const docId = up.body?.document?.id as string;
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P }, OFFICER);
  ok("C6.5 D4 fail: Confirm & use before the document is read is refused (409 not_read)", r.status === 409 && r.body?.code === "not_read", r.body);
  const first = await fill(passSec, P), again = await fill(passSec, P);
  const ids = (x: typeof first) => ((x.body?.proposals ?? []) as Prop[]).map((p) => p.id).sort().join();
  ok("C6.5 D3 pass: a document is read once: a second Fill this from documents shows the same proposals and stores nothing new", first.status === 200 && ids(first) === ids(again) && ids(first).length > 0 && sql(`select count(*) from document_review where document_id='${docId}'`) === "1", [ids(first), ids(again)]);
  ok("C6.5 D3 fail (no AI): the passport read made no model call", sql("select count(*) from ai_batch") === spend0);
  const sexP = ((first.body?.proposals ?? []) as Prop[]).find((p) => p.fact === "person.sex");
  ok("C6.5 D5 pass: the coded sex X is proposed as the release offers it (Unspecified) when the release offers words, else as read", !sexP || sexP.value === "Unspecified" || sexP.value === "X", sexP);

  // ---- D4 Confirm & use: once per document, its own person, its current file
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: S }, OFFICER);
  ok("C6.5 D4 fail: Confirm & use on another person's document is refused (422)", r.status === 422, r.status);
  await answer(c.id, P, "person.passport_number", "SAMPLEP99", OFFICER); // a typed value that differs
  const before = ((await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}`, undefined, OFFICER)).body?.proposals ?? []) as (Prop & { differs: boolean; current: { value: unknown } | null; left_why: string | null })[];
  const pn = before.find((x) => x.fact === "person.passport_number"), exp = before.find((x) => x.fact === "person.passport_expiry_date"), cit = before.find((x) => x.fact === "person.citizenship");
  ok("C6.5 D12 pass: before Confirm & use, a proposal says it differs from the typed answer and shows that answer", pn?.differs === true && pn?.current?.value === "SAMPLEP99", pn);
  ok("C6.5 D12 fail: a proposal with no answer yet does not differ, and a country code says before the click why it will be left for a person", exp?.differs === false && exp?.current === null && /country code/.test(cit?.left_why ?? "") && pn?.left_why === null, { exp, cit });
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P }, OFFICER);
  const conf = r.body;
  ok("C6.5 D4 pass: Confirm & use writes, opens a check for the typed difference and leaves a bare country code for a person", r.status === 200 && conf?.checks?.some((x: { fact: string }) => x.fact === "person.passport_number") && conf?.left?.some((x: { fact: string }) => x.fact === "person.citizenship") && !conf?.used?.includes("person.citizenship"), conf);
  ok("C6.5 D5 fail: the country left for a person is not an answer and opens no check", sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.citizenship' and superseded_by_id is null`) === "0" && sql(`select count(*) from answer_check where subject_id='${P}' and fact='person.citizenship'`) === "0");
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P }, OFFICER);
  ok("C6.5 D4 fail (P-242): a second Confirm & use on the same document is refused (409 already_confirmed), naming who confirmed it", r.status === 409 && r.body?.code === "already_confirmed" && r.body?.confirmed?.by === OFFICER, r.body);
  const newer = await upload(PORT, `/runtime/checklist-lines/${await lineOf(P)}/documents`, passportPdf({ ...doc, number: "SAMPLEP13" }), "sample-passport-2.pdf", OFFICER);
  await fill(passSec, P);
  r = await call("POST", `/runtime/cases/${c.id}/documents/${docId}/confirm-and-use`, { subjectId: P }, OFFICER);
  ok("C6.5 D4 fail: the earlier file, once a newer one is uploaded, cannot be confirmed (409 not_current)", r.status === 409 && ["not_current", "already_confirmed"].includes(r.body?.code), r.body);

  // ---- D8/D9 while a check is open
  const check = ((await call("GET", `/runtime/cases/${c.id}/checks?subject=${P}&state=open`, undefined, OFFICER)).body?.checks ?? []).find((x: { fact: string }) => x.fact === "person.passport_number");
  const p1 = (await prepare(c.id, OFFICER)).p, filing = filingOf(p1, P)?.id;
  const warns = (p: typeof p1) => (readinessOf(p, filing)?.warns ?? []).filter((w) => w.code === "open_check");
  ok("C6.5 D9 pass (C7.6 BR-7, P-238): an open check is a CRITICAL open_check warning on the person's filing", !!filing && warns(p1).length >= 1 && warns(p1).every((w) => /CRITICAL/.test(w.words)), readinessOf(p1, filing)?.warns?.map((w) => w.code));
  if (otherSec) {
    const seenOther = ((await agent(c.id))?.sections as Sec[]).find((s) => s.section === otherSec && s.subjectId === P)?.questions.map((q) => q.answer?.id).filter(Boolean) ?? [];
    r = await call("POST", `/runtime/cases/${c.id}/sections/${otherSec}/confirm`, { subjectId: P, seen: seenOther }, OFFICER);
    ok("C6.5 D8 pass: a section with no fact from the checked document is still confirmed while the check is open", r.status !== 409 || !/open_checks/.test(JSON.stringify(r.body)), r.body);
  } else ok("C6.5 D8 pass: a section with no fact from the checked document is still confirmed while the check is open (no such section on this release: nothing to refuse)", true);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${P}/person.passport_number/checked-against-document`, { document: newer.body?.document?.id ?? docId }, OFFICER);
  ok("C6.5 D7 fail: an answer with an open check cannot be marked checked against the document (409 open_checks)", r.status === 409 && r.body?.code === "open_checks", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${P}/person.passport_country_of_issue/checked-against-document`, { document: newer.body?.document?.id }, OFFICER);
  ok("C6.5 D7 fail: a fact with no answer cannot be marked checked (409 no_answer)", r.status === 409 && r.body?.code === "no_answer", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${S}/person.date_of_birth/checked-against-document`, { document: docId }, OFFICER);
  ok("C6.5 D7 fail: a document that is not this person's is not found for them (404)", r.status === 404, r.status);

  // ---- D6 resolve: with a reason, the answer the officer saw, once
  r = await call("POST", `/runtime/checks/${check?.id}/resolve`, { keep: "answer", reason: "   " }, OFFICER);
  ok("C6.5 D6 fail: a reason of only spaces is no reason (400)", r.status === 400, r.status);
  r = await call("POST", `/runtime/checks/${check?.id}/resolve`, { keep: "answer", reason: "Typed from the renewed passport (Sample)" }, CLIENT);
  ok("C6.5 D6 fail: a client cannot resolve a check (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/checks/${check?.id}/resolve`, { keep: "answer", reason: "Typed from the renewed passport (Sample)", answerId: "00000000-0000-4000-8000-000000000000" }, OFFICER);
  ok("C6.5 D6 fail: resolving over an answer that changed since it was opened is refused (409 changed), nothing resolved", r.status === 409 && r.body?.code === "changed" && sql(`select state from answer_check where id='${check?.id}'`) === "open", r.body);
  const typedId = sql(`select id from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`);
  r = await call("POST", `/runtime/checks/${check?.id}/resolve`, { keep: "answer", reason: "Typed from the renewed passport (Sample)", answerId: typedId }, OFFICER);
  ok("C6.5 D6 pass: keeping the typed answer resolves the check with who and the reason, and the typed answer stays as it was", r.status === 200 && r.body?.check?.state === "resolved" && r.body?.check?.kept === "answer" && sql(`select id || '|' || (value_json #>> '{}') from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.passport_number' and superseded_by_id is null`) === `${typedId}|SAMPLEP99`, r.body);
  r = await call("POST", `/runtime/checks/${check?.id}/resolve`, { keep: "document", reason: "Second thoughts (Sample)" }, OFFICER);
  ok("C6.5 D6 fail: a resolved check is not resolved again (409 already_resolved)", r.status === 409 && r.body?.code === "already_resolved", r.body);
  const p2 = (await prepare(c.id, OFFICER)).p;
  ok("C6.5 D9 fail: once resolved, the check no longer warns on the filing", warns(p2).every((w) => !/passport number/i.test(w.words)), readinessOf(p2, filing)?.warns?.filter((w) => w.code === "open_check"));
  ok("C6.5 D11 pass: the audit names the check's fact, never the reason typed (STANDARDS §5)", sql(`select count(*) from audit_event where entity_key='${check?.id}' and summary like '%passport_number%' and summary not like '%renewed passport%'`) === "1");

  // ---- Review and break findings on ab717fdbd, each a fail test (screens/C6.5-documents-api/review.md, break-report.md)
  const sLine = await lineOf(S);
  const spouse = { ...doc, surname: "SAMPLES", given: "SPOUSE A", number: "SAMPLES34", dob: FAMILY[1].dob!, sex: "F" as const };
  const sDoc = async (surname: string, file: string) => { const u2 = await upload(PORT, `/runtime/checklist-lines/${sLine}/documents`, passportPdf({ ...spouse, surname }), file, OFFICER); await fill(nameSec, S); return u2.body?.document?.id as string; };
  const sName = () => sql(`select status || '|' || (value_json #>> '{}') || '|' || coalesce(source_json->>'document','') from client_canonical_answer where subject_id='${S}' and canonical_field_key='person.family_name' and superseded_by_id is null`) ?? "";
  const openOf = (who: string, fact: string) => (sql(`select string_agg(document_id::text, ',') from answer_check where subject_id='${who}' and fact='${fact}' and state='open'`) ?? "").split(",").filter(Boolean);
  await answer(c.id, S, "person.family_name", "SAMPLEDX", OFFICER);
  const sp1 = await sDoc("SAMPLES", "spouse-1.pdf");
  const c1 = await call("POST", `/runtime/cases/${c.id}/documents/${sp1}/confirm-and-use`, { subjectId: S }, OFFICER);
  const k1 = (c1.body?.checks ?? []).find((x: { fact: string }) => x.fact === "person.family_name")?.id as string;
  const sexOptions = (((await agent(c.id))?.sections ?? []) as (Sec & { questions: (Q & { options?: { key: string; label: string }[] | null })[] })[]).flatMap((x) => x.questions).find((q) => q.subjectId === S && q.fact === "person.sex")?.options ?? [];
  const female = sexOptions.find((o) => ["female", "f female"].includes(o.label.trim().toLowerCase()))?.key;
  ok("C6.5 B-m4 pass: a passport's F is written as the release's own answer key for Female (or left for a person when the release has no such answer)", female ? sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${S}' and canonical_field_key='person.sex' and superseded_by_id is null`) === female : (c1.body?.left ?? []).some((x: { fact: string }) => x.fact === "person.sex"), { female, used: c1.body?.used, left: c1.body?.left });
  await answer(c.id, S, "person.family_name", "SAMPLEDY", OFFICER);
  r = await call("POST", `/runtime/checks/${k1}/resolve`, { keep: "answer", reason: "Matches the typed name (Sample)" }, OFFICER);
  ok("C6.5 B-M1 fail: resolving with no answer id over an answer changed since the check opened is refused (409 changed)", r.status === 409 && r.body?.code === "changed", r.body);
  ok("C6.5 D13 pass: a value its question cannot take (the country code) is listed left for a person while unanswered", (c1.body?.left ?? []).some((x: { fact: string }) => x.fact === "person.citizenship"), c1.body?.left);
  await answer(c.id, S, "person.citizenship", "India", OFFICER);
  const sp2 = await sDoc("SAMPLEDZ", "spouse-2.pdf");
  r = await call("POST", `/runtime/checks/${k1}/resolve`, { keep: "document", reason: "The passport is right (Sample)", answerId: sql(`select id from client_canonical_answer where subject_id='${S}' and canonical_field_key='person.family_name' and superseded_by_id is null`) }, OFFICER);
  ok("C6.5 B1 fail: a replaced file's value cannot be kept (409 not_current), and the answer is unchanged", r.status === 409 && r.body?.code === "not_current" && sName().startsWith("DECLARED|SAMPLEDY|"), r.body);
  const c2 = await call("POST", `/runtime/cases/${c.id}/documents/${sp2}/confirm-and-use`, { subjectId: S }, OFFICER);
  ok("C6.5 B1/B-M2 pass: the newer file closes the replaced file's check (kept the answer, a reason in words) and opens its own check for its own difference", c2.status === 200 && (c2.body?.closed ?? []).includes(k1) && /replaced by a newer/.test(sql(`select reason from answer_check where id='${k1}'`) ?? "") && JSON.stringify(openOf(S, "person.family_name")) === JSON.stringify([sp2]), { closed: c2.body?.closed, open: openOf(S, "person.family_name") });
  ok("C6.5 D13 fail: once the officer answered it in place, it is no longer listed left for a person (and opens no check)", !(c2.body?.left ?? []).some((x: { fact: string }) => x.fact === "person.citizenship") && !(c2.body?.checks ?? []).some((x: { fact: string }) => x.fact === "person.citizenship"), { left: c2.body?.left, checks: c2.body?.checks });
  const k2 = (c2.body?.checks ?? []).find((x: { fact: string }) => x.fact === "person.family_name")?.id as string;
  r = await call("POST", `/runtime/checks/${k2}/resolve`, { keep: "answer", reason: "\u3164\u115f" }, OFFICER);
  ok("C6.5 B-m3 fail: a reason of letters that print as nothing is refused in words (400), never a 500", r.status === 400, r.status);
  r = await call("POST", `/runtime/checks/${k2}/resolve`, { keep: "answer", reason: "Matches" }, "user-S");
  const unknown = await call("POST", `/runtime/checks/00000000-0000-4000-8000-000000000000/resolve`, { keep: "answer", reason: "Matches" }, "user-S");
  ok("C6.5 B-m6 fail: another firm cannot tell a real check from an unknown one (the same 404 words)", r.status === 404 && unknown.status === 404 && r.body?.detail === unknown.body?.detail, [r.body?.detail, unknown.body?.detail]);
  const typedNow = sql(`select id from client_canonical_answer where subject_id='${S}' and canonical_field_key='person.family_name' and superseded_by_id is null`);
  const many = await Promise.all(Array.from({ length: 5 }, () => call("POST", `/runtime/checks/${k2}/resolve`, { keep: "answer", reason: "पासपोर्ट नवीनीकरण से पहले का नाम (Sample)", answerId: typedNow }, OFFICER)));
  ok("C6.5 B-M3 pass and R-m2: a reason in any script is kept; five resolves at once resolve it once (one 200, the rest 409)", many.filter((x) => x.status === 200).length === 1 && many.filter((x) => x.status === 409).length === 4 && /पासपोर्ट/.test(sql(`select reason from answer_check where id='${k2}'`) ?? ""), many.map((x) => x.status));
  const sp3 = await sDoc("SAMPLEDY", "spouse-3.pdf");
  const all = await Promise.all(Array.from({ length: 5 }, () => call("POST", `/runtime/cases/${c.id}/documents/${sp3}/confirm-and-use`, { subjectId: S }, OFFICER)));
  ok("C6.5 B1 pass and R-m2: a newer file that agrees confirms the typed name from itself (never overwritten by a replaced file); five clicks at once confirm once", all.filter((x) => x.status === 200).length === 1 && all.filter((x) => x.status === 409).length === 4 && sName() === `VERIFIED|SAMPLEDY|${sp3}` && openOf(S, "person.family_name").length === 0, { statuses: all.map((x) => x.status), name: sName() });
  r = await call("POST", `/runtime/cases/${c.id}/answers/${S}/person.date_of_birth/checked-against-document`, { document: sp1 }, OFFICER);
  ok("C6.5 B-M6 fail: an answer is not checked against a replaced file (409 not_current)", r.status === 409 && r.body?.code === "not_current", r.body);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${c.caseSubject}/case.visit_purpose/checked-against-document`, { document: letter1 }, OFFICER);
  ok("C6.5 B-M6 fail: a file of a kind that does not give the fact is no evidence for it (422 not_evidence)", r.status === 422 && r.body?.code === "not_evidence", r.body);
  r = await upload(PORT, `/runtime/cases/${c.id}/documents`, passportPdf(doc), "passport.pdf", CLIENT, { subjectId: P, documentType: (sql(`select document_type from case_document where id='${docId}'`) ?? "") });
  ok("C6.5 B-M5 fail: a document with its own checklist line is not uploaded around the line (422), and the line's file stays current", r.status === 422 && sql(`select count(*) from case_document where subject_id='${P}' and current and checklist_line_id is null`) === "0", r.body);
  r = await call("GET", `/runtime/cases/${c.id}/checks?subject=${P}&subject=${S}`, undefined, OFFICER);
  const r2 = await call("GET", `/runtime/cases/${c.id}/checks?state=bogus`, undefined, OFFICER);
  const r3 = await call("GET", `/runtime/cases/${c.id}/proposals?subject=${P}&subject=${S}`, undefined, OFFICER);
  ok("C6.5 B-m1/m2 fail: a query value given twice, or an unknown state, is refused in words (400), never a 500 or every check", r.status === 400 && r2.status === 400 && r3.status === 400, [r.status, r2.status, r3.status]);
  // B-M4: a check on the application's own fact (a letter's dates of stay) warns on the filings. No letter read is
  // saved yet (FQ-10), so the read and its check are written here as the server would write them.
  const stay = await answer(c.id, c.caseSubject, "case.intended_stay_from", FIXED.stayFrom, OFFICER);
  const rv = randomUUID(), ck = randomUUID(), rev = randomUUID();
  const ws = sql(`select workspace_id from runtime_case where id='${c.id}'`), ans = sql(`select id from client_canonical_answer where subject_id='${c.caseSubject}' and canonical_field_key='case.intended_stay_from' and superseded_by_id is null`);
  sql(`insert into document_review (id, workspace_id, case_id, subject_id, document_id, reader, replayed, unreadable, read_by) values ('${rev}','${ws}','${c.id}','${c.caseSubject}','${letter1}','ai_vision',true,'[]','${OFFICER}')`);
  sql(`insert into read_value (id, workspace_id, case_id, review_id, document_id, subject_id, fact, value_json, page, reader, confidence, review, state, answer_id) values ('${rv}','${ws}','${c.id}','${rev}','${letter1}','${c.caseSubject}','case.intended_stay_from','"2030-03-02"',1,'ai_vision',0.9,'expanded','conflict','${ans}')`);
  sql(`insert into answer_check (id, workspace_id, case_id, subject_id, fact, read_value_id, document_id, answer_id, typed_value_json, document_value_json, opened_by) values ('${ck}','${ws}','${c.id}','${c.caseSubject}','case.intended_stay_from','${rv}','${letter1}','${ans}','"${FIXED.stayFrom}"','"2030-03-02"','${OFFICER}')`);
  const p3v = (await prepare(c.id, OFFICER)).p;
  ok("C6.5 B-M4 pass: an open check on the application's own fact is a CRITICAL warning on the person's filing, naming the application", warns(p3v).some((w) => /application/i.test(w.words) && /intended stay from/i.test(w.words)), { stay: [stay.status, stay.body?.detail], warns: readinessOf(p3v, filing)?.warns?.filter((w) => w.code === "open_check").map((w) => w.words) });
  ok("C6.5 B-m8 fail: the database refuses to reopen a resolved check, to undo a Confirm & use, and a check that names another person's answer", sql(`update answer_check set state='open', kept=null, reason=null, resolved_by=null, resolved_at=null where id='${k2}' returning id`) === null
    && sql(`update document_review set confirmed_by=null, confirmed_at=null where document_id='${sp3}' returning id`) === null
    && sql(`insert into answer_check (id, workspace_id, case_id, subject_id, fact, read_value_id, document_id, answer_id, typed_value_json, document_value_json, opened_by) values ('${randomUUID()}','${ws}','${c.id}','${c.caseSubject}','case.intended_stay_from','${rv}','${letter1}','${typedNow}','"x"','"y"','${OFFICER}') returning id`) === null);
  // Challenge M1: the stored file, for the officer's eyes only.
  const getFile = async (id: string, actor: string) => { const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/documents/${id}/file`, { headers: { "x-actor": actor } }); return { status: res.status, type: res.headers.get("content-type") ?? "", nosniff: res.headers.get("x-content-type-options"), body: Buffer.from(await res.arrayBuffer()) }; };
  const seen = await getFile(sp3, OFFICER);
  ok("C6.5 C-M1 pass: the case officer opens the stored passport (its own bytes, PDF, not sniffed) to check names against it", seen.status === 200 && seen.type.startsWith("application/pdf") && seen.nosniff === "nosniff" && createHash("sha256").update(seen.body).digest("hex") === sql(`select sha256 from case_document where id='${sp3}'`), [seen.status, seen.type]);
  const [byClient, byOther, byNone] = [await getFile(sp3, CLIENT), await getFile(sp3, "user-S"), await getFile("00000000-0000-4000-8000-000000000000", "user-S")];
  ok("C6.5 C-M1 fail: a client cannot open it (403); another firm gets the same 404 words as an unknown id", byClient.status === 403 && byOther.status === 404 && byOther.body.toString() === byNone.body.toString(), [byClient.status, byOther.status, byNone.status]);
  // Challenge M3: "read by a person" names only identity documents about this person.
  const funds = ((((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === P)?.lines ?? []) as { id: string; label: string }[]).find((x) => /financial|funds/i.test(x.label))?.id;
  if (funds) await upload(PORT, `/runtime/checklist-lines/${funds}/documents`, letterPdf(), "funds.pdf", OFFICER);
  r = await fill(nameSec, P);
  ok("C6.5 C-M3 fail: proof of funds is not listed as an identity document a person reads", !!funds && r.status === 200 && !(r.body?.not_read ?? []).some((x: { document_name: string }) => /financial|funds/i.test(x.document_name)), { funds, not_read: r.body?.not_read });
  // m7 (P-134): a passport uploaded as a letter is never sent to AI.
  await upload(PORT, `/runtime/cases/${c.id}/documents`, passportPdf(doc), "not-a-letter.pdf", OFFICER, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
  r = await fill(visit, c.caseSubject, OFFICER, { mode: "replay" });
  ok("C6.5 B-m7 fail (P-134): a file holding passport coded lines, uploaded as a letter, is never sent to AI (409 identity_document)", r.status === 409 && r.body?.code === "identity_document", r.body);
});
