// Acceptance C4.4 (P-220, pack 3; thin runtime slice T): every question type, three-tier validation, rules as data, in
// one renderer (P-47, decisions/P-47-questionnaire-renderer.md; P-14 tiers; P-71 validation never blocks saving).
// Status: Partial (qa, 1 Nov). On main: tier 1 field checks for text, long text (as text), number, money (shape), date, yes/no, single choice,
// country, address, phone (shape), email (engine/runtime/case.ts checkValue); repeating groups; tier 2 section checks
// evaluated when seeded as data (setup_visitor_visa.ts seeds two). Missing and tested here: long text, multi choice,
// person name group with "no given name", period history (with the 10-year gap as a section check), document upload, declaration as
// question types (long text passes today as plain text: a guard); section checks authored as data through the API (RT-7); the error summary per section; tier 3
// independent review on demand (AI, never changes data); the PQR mode. Part 1 runs on the engine (no server); part 2 on
// the Visitor visa case through the API. The value_type names for the new types are this pack's proposal (Question for
// the tech lead in the PR). The 10-year gap is a tier-2 section check held as data (P-47; tech lead on #295), tested
// through the engine's condition evaluator as a derived field (months_uncovered_10y) and a "gt 0" check. No live AI (US$0): the paid review route is called only after the copy reports live AI off.
// Part 1 is built and adopted (C4.4 part 1, swarm B3b): tests/check_c44_question_types.ts runs it in the suites with a
// pass and a fail per rule. Changed here with it: the fixture's field maps carry a data_path (every real map has one; the
// engine read it and the run crashed instead of failing, tech lead 1 Nov); a type that throws now fails loudly; "document"
// follows P-130 (an upload is a checklist line, not a question: refused with words that point to the checklist); the
// 10-year gap is a derived field with the tested calculation months_uncovered_10y and a "gt 0" check, inside the closed
// 11-operator vocabulary (contracts/rules.ts PREDICATE_OPS), instead of a new op "covers_years". Part 2 was red until
// C4.4 part 2 (section checks authored through the API, the error summary, tier 3, PQR mode).
// Part 2 is built (C4.4 part 2, swarm B3c) and adopted into tests/check_c44_part2.ts. Changed here with it: the authored
// check names its question by field key (case.funds_available_cad; the API refuses a phrase it cannot place); the PQR
// check needs Pre-qualification ticks, which setup_c44_types.ts adds (Sample picks); a missing case or principal, or any
// exception, is a FAIL line and exit 1, never a crash.
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept \
//     && tsx studio/tests/runtime/setup_c44_types.ts 4448 xr_studio_accept && tsx studio/acceptance/C4.4.test.ts 4448 xr_studio_accept
import { evalCondition, kkey } from "../engine/render.ts";
import { checkValue, DOCUMENT_NOT_A_QUESTION } from "../engine/runtime/case.ts";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", OFFICER = "user-O", CLIENT = "user-P";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const TODAY = new Date("2026-11-01T12:00:00Z");

/** P-47's question types: [value_type, a valid answer, an invalid answer]. Sample values. */
const TYPES: [string, unknown, unknown][] = [
  ["text", "Sample text", ""],
  ["long_text", "A longer Sample answer over several sentences. ".repeat(10), 12],
  ["number", 3, -1],
  ["money", 2500, 25.5],
  ["date", "2020-02-29", "2021-02-29"],
  ["yes_no", true, "maybe"],
  ["single_choice", "a", "z"],
  ["multi_choice", ["a", "b"], ["a", "z"]],
  ["country", "IND", "Atlantis"],
  ["phone", { country_code: "91", number: "9876543210" }, { country_code: "", number: "12" }],
  ["email", "client.a@example.com", "client.a@"],
  ["address", { street_name: "1 Sample St", city: "Sample City", country: "IND" }, { street_name: "", city: "", country: "" }],
  ["person_name", { family_name: "Sample", given_names: "", no_given_name: true }, { family_name: "Sample", given_names: "" }],
  ["period_history", [{ from: "2016-11", to: "2021-10", what: "Sample work" }, { from: "2021-11", to: "2026-11", what: "Sample study" }], [{ from: "2021-11", to: "2016-11", what: "Sample work" }]],
  ["declaration", true, false],
];
/** Types already built keep today's value_type (money is a number whose form writes CAD; single choice is a code). */
const VT: Record<string, string> = { money: "number", single_choice: "code" };
const LIST = { key: "sample", values: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }] };
const COUNTRIES = { key: "country", values: [{ key: "IND", label: "India" }, { key: "CAN", label: "Canada" }] };
/** A minimal release snapshot with one field per type (the engine reads canonical_fields and field_maps). */
const snapshot = { canonical_fields: TYPES.map(([t]) => ({ id: `person.sample_${t}`, value_type: VT[t] ?? t, ...(t === "single_choice" || t === "multi_choice" ? { answer_list: LIST } : t === "country" ? { answer_list: COUNTRIES } : {}) })), field_maps: [{ form_edition: "Sample form", entries: [{ data_path: "Sample.money", fact: "person.sample_money", transform: "money CAD" }, { data_path: "Sample.phone", fact: "person.sample_phone", transform: "phone_part" }] }], derived_fields: [{ id: "person.sample_history_uncovered_months", calculation: "months_uncovered_10y", inputs: ["person.sample_period_history"], reference: "case.application_date", executable: true }] } as unknown as Parameters<typeof checkValue>[0];

(async () => {
  // ── Part 1: tier 1, every question type on the engine ──
  for (const [t, good, bad] of TYPES) {
    let g: string[], b: string[];
    try { g = checkValue(snapshot, `person.sample_${t}`, good, TODAY); b = checkValue(snapshot, `person.sample_${t}`, bad, TODAY); }
    catch (e) { ok(`C4.4 tier 1 (${t}): the check runs without an error`, false, String(e)); continue; }
    ok(`C4.4 tier 1 (${t}): a valid answer passes and an invalid one gets a plain message saying how to fix it`, g.length === 0 && b.length > 0 && b.every((m) => m.length > 8 && !/undefined|null|\[object/.test(m)), { good: g, bad: b });
  }
  // P-130: an upload is a document checklist line, not a question.
  const docField = { ...snapshot, canonical_fields: [...(snapshot as unknown as { canonical_fields: object[] }).canonical_fields, { id: "person.sample_document", value_type: "document" }] } as typeof snapshot;
  const docWords = checkValue(docField, "person.sample_document", { file_id: "00000000-0000-4000-8000-000000000001", name: "passport.pdf" }, TODAY);
  ok("C4.4 / P-130: a field typed \"document\" is never answered as a question; the words send the person to the document checklist", docWords.length === 1 && docWords[0] === DOCUMENT_NOT_A_QUESTION, docWords);
  // Tier 2 (P-47: "history covers 10 years" is a section check, tech lead on #295): a rule held as data, evaluated by the
  // engine's one condition evaluator. A derived field with the tested calculation months_uncovered_10y, checked "gt 0" (closed vocabulary).
  const HIST = "person.sample_period_history";
  const tenYears = { subjectKind: "PERSON", op: "gt", field: "person.sample_history_uncovered_months", value: 0 };
  const knownWith = (rows: unknown) => new Map([[kkey("p1", HIST), { value: rows, status: "confirmed" as const, source: "acceptance" }], [kkey("case", "case.application_date"), { value: "2026-11-01", status: "confirmed" as const, source: "acceptance" }]]);
  const gapRows = [{ from: "2016-11", to: "2019-01", what: "Sample work" }, { from: "2020-06", to: "2026-11", what: "Sample study" }];
  const withGap = evalCondition(snapshot, knownWith(gapRows), tenYears, "p1"), noGap = evalCondition(snapshot, knownWith(TYPES.find(([t]) => t === "period_history")![1]), tenYears, "p1");
  ok("C4.4 tier 2 (P-47): a section check \"history covers 10 years\", held as data, fires on a history with a gap and not on one without", withGap.applies === true && noGap.applies === false, { withGap, noGap });

  // ── Part 2: on the Visitor visa case, through the API ──
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv || !Number(sql(`select count(*) from config_release where combination_id = '${vv}'`))) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first"); process.exit(2); }
  const c = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C44-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = c.body?.id ?? c.body?.case?.id;
  const principal = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people?.find((p: { role: string }) => p.role === "principal")?.subject_id;
  const caseSubject = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people?.find((p: { role: string }) => p.role === "case")?.subject_id ?? "case";
  ok("C4.4 setup: a Visitor visa case with its principal applicant", !!caseId && !!principal, { status: c.status, words: words(c) });
  // Without a case there is nothing to check on it: say so as a failure and stop, never crash on an undefined id.
  if (!caseId || !principal) { summary(); process.exit(1); }
  const view = async (mode = "agent") => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, OFFICER)).body;
  // Tier 1 never blocks saving (P-71).
  const birth = (await view())?.questions?.find?.((q: { field: string }) => /date_of_birth/.test(q.field))?.field ?? "person.date_of_birth";
  const bad = await call("PUT", `/runtime/cases/${caseId}/answers/${principal}/${birth}`, { value: "2031-13-40", expectedId: null }, OFFICER);
  ok("C4.4 P-71 (on main): an invalid answer is saved (200) and flagged with its problem, never refused", bad.status === 200 && (bad.body?.answer?.problems ?? []).length > 0, { status: bad.status, problems: bad.body?.answer?.problems });
  // Tier 2: a section check (seeded as data) shows in the view and in the section's error summary.
  const put = (field: string, value: unknown) => call("PUT", `/runtime/cases/${caseId}/answers/${caseSubject}/${field}`, { value, expectedId: null }, OFFICER);
  await put("case.intended_stay_from", "2027-03-10"); await put("case.intended_stay_to", "2027-03-01");
  const v2 = await view();
  const fired = (v2?.checks ?? []).some((x: { message?: string }) => /ends before it starts/.test(x.message ?? ""));
  ok("C4.4 tier 2 (on main for seeded data): the visit ending before it starts fires the section check", fired, (v2?.checks ?? []).map((x: { message?: string }) => x.message));
  const sect = (v2?.sections ?? []).find((s: { problems?: unknown[]; summary?: unknown[] }) => (s.summary ?? s.problems ?? []).some((p: any) => /ends before it starts/.test(JSON.stringify(p)))); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C4.4 tier 2: the section holding the dates carries an error summary that links to each field (GOV.UK pattern)", sect !== undefined && (sect.summary ?? sect.problems).every((p: { field?: string; href?: string }) => !!(p.field ?? p.href)), (v2?.sections ?? []).length);
  // Validation blocks "ready to file" only (P-47, P-71): the invalid birth date (tier 1) and the visit ending before it
  // starts (tier 2) both keep IMM 5257 from being ready to file for the principal.
  const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body;
  const f5257 = (Array.isArray(forms) ? forms : (forms?.forms ?? [])).find((f: { form: string; person?: string; subjectId?: string }) => f.form === "IMM 5257" && (f.subjectId ?? f.person) === principal) ?? (Array.isArray(forms) ? forms : (forms?.forms ?? [])).find((f: { form: string }) => f.form === "IMM 5257");
  const missing = (f5257?.readiness?.missing ?? []) as { fact: string; reason: string }[];
  ok("C4.4 P-71 (on main for tier 1): IMM 5257 is not ready to file while the birth date needs a fix", f5257?.readiness?.ready === false && missing.some((m) => m.fact === birth && m.reason === "needs a fix"), missing.slice(0, 3));
  ok("C4.4 P-47 tier 2: a fired section check also keeps the form from being ready to file, saying which check", f5257?.readiness?.ready === false && JSON.stringify(f5257?.readiness ?? {}).includes("ends before it starts"), f5257?.readiness);
  // One renderer (P-47): the client's questionnaire (SQR) is the same view of the same questions as the officer's.
  const sqr = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=sqr`, undefined, CLIENT);
  const qs = (v: any) => (v?.sections ?? []).flatMap((x: any) => x.questions ?? []); // eslint-disable-line @typescript-eslint/no-explicit-any
  const agentQ = qs(v2), clientQ = qs(sqr.body);
  ok("C4.4 one renderer: the client's SQR answers 200 with questions of the same shape (type, shape, answer, problems) as the officer's view", sqr.status === 200 && clientQ.length > 0 && clientQ.every((q: any) => "value_type" in q && "shape" in q && "answer" in q) && clientQ.every((q: any) => agentQ.some((a: any) => a.fact === q.fact)), { status: sqr.status, client: clientQ.length, agent: agentQ.length }); // eslint-disable-line @typescript-eslint/no-explicit-any
  // Rules as data: a section check is authored through the API, not seeded in the database (RT-7).
  const author = await call("POST", `/combinations/${vv}/checks`, { group: "section_check", appliesTo: "case.funds_available_cad", condition: { subjectKind: "CASE", op: "lt", field: "case.funds_available_cad", value: 1000 }, message: "Funds under CAD 1,000 for the visit. Check the amount (Sample threshold).", sourceQuote: null }, AUTHOR);
  ok("C4.4 rules as data (RT-7): the author adds a section check to the Visitor visa's draft through the API (no source = labelled Sample)", author.status >= 200 && author.status < 300 && Number(sql(`select count(*) from check_def where combination_id = '${vv}' and status = 'DRAFT' and message like 'Funds under CAD 1,000%'`)) === 1, { status: author.status, words: words(author) });
  const offAuthor = await call("POST", `/combinations/${vv}/checks`, { group: "section_check", message: "x" }, OFFICER);
  ok("C4.4 rules as data fail: a case officer cannot author a check (403)", offAuthor.status === 403, offAuthor.status);
  // Tier 3: independent review on demand, never changes data; refused at US$0 without the live switch (P-175).
  // Never call a paid route on a copy whose live switch is on (QA-100, P-175): the finder's free cost plan reports it.
  if ((await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body?.live?.on !== false) { console.error("STOP  this copy's live AI switch is on (or cannot be read)"); process.exit(2); }
  const answersBefore = sql(`select count(*) || '§' || coalesce(max(effective_at)::text, '') from client_canonical_answer`);
  const review = await call("POST", `/runtime/cases/${caseId}/review`, {}, OFFICER);
  ok("C4.4 tier 3: the officer's independent review exists and, with live AI off, is refused in words at US$0, changing no answer", review.status >= 400 && review.status !== 404 && /live|founder|switch/i.test(words(review)) && sql(`select count(*) || '§' || coalesce(max(effective_at)::text, '') from client_canonical_answer`) === answersBefore, { status: review.status, words: words(review) });
  // PQR mode (P-47 mode 1): only the questions flagged pre-qualification; ends with a plain result.
  const pqr = await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=pqr`, undefined, OFFICER);
  ok("C4.4 PQR: the pre-qualification mode answers 200 with only questions flagged pre-qualification and a plain result line", pqr.status === 200 && Array.isArray(pqr.body?.questions) && pqr.body.questions.length > 0 && pqr.body.questions.every((q: { pre_qualification?: boolean }) => q.pre_qualification === true) && typeof pqr.body?.result === "string", { status: pqr.status, words: words(pqr) });
  process.exit(summary() ? 1 : 0);
})().catch((e) => { ok("C4.4: the run ends without an error (an exception is a failure, never a crash)", false, String(e)); summary(); process.exit(1); });
