// C4.4 part 1 (runtime lane, swarm B3b; P-47 question types, P-14 tiers, P-71, P-130): the P-47 question types the
// renderer lacked (long text, multi choice, person name group with "no given name", period history, declaration), each
// with its tier-1 field check, and the 10-year gap as a tier-2 section check held as data: a derived field with the
// tested calculation months_uncovered_10y and a check "gt 0" on it, inside the closed 11-operator vocabulary (tech lead
// on #295: the gap check is tier 2). P-130 amends P-47: an upload is a document checklist line, not a question, so
// "document" is refused as a value type and never asked. Adopts acceptance/C4.4.test.ts part 1 (pack 3), with its
// fixture's field maps given a data_path (every real map has one; the engine read it) and "document" per P-130.
// Part 1 runs on the engine (no server); part 2 on a Visitor visa case through the API. A pass and a fail per rule.
// Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh runtime_c44 4436 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4436 xr_studio_runtime_c44 && tsx studio/tests/runtime/setup_c44_types.ts 4436 xr_studio_runtime_c44 && tsx studio/tests/check_c44_question_types.ts 4436 xr_studio_runtime_c44
import { evalCondition, kkey } from "../engine/render.ts";
import { checkValue, DOCUMENT_NOT_A_QUESTION } from "../engine/runtime/case.ts";
import { historyGaps } from "../../contracts/history.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_c44";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", OFFICER = "user-O", CLIENT = "user-P";
const TODAY = new Date("2026-11-01T12:00:00Z");
const msg = (r: { body: unknown }) => { const b = r.body as { detail?: string; message?: string; errors?: { message: string }[] } | null; return String(b?.errors?.[0]?.message ?? b?.detail ?? b?.message ?? ""); };

/** P-47's question types: [value_type, a valid answer, an invalid answer] (pack 3's list). Sample values. */
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
const VT: Record<string, string> = { money: "number", single_choice: "code" };
const LIST = { key: "sample", values: [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }] };
const COUNTRIES = { key: "country", values: [{ key: "IND", label: "India" }, { key: "CAN", label: "Canada" }] };
const field = (t: string) => ({ id: `person.sample_${t}`, value_type: VT[t] ?? t, ...(t === "single_choice" || t === "multi_choice" ? { answer_list: LIST } : t === "country" ? { answer_list: COUNTRIES } : {}) });
const HIST = "person.sample_period_history", GAP = "person.sample_history_uncovered_months";
const snapshot = {
  canonical_fields: [...TYPES.map(([t]) => field(t)), field("document"), { id: "case.application_date", value_type: "date" }],
  field_maps: [{ form_edition: "Sample form", entries: [{ data_path: "Sample.money", fact: "person.sample_money", transform: "money CAD" }, { data_path: "Sample.phone", fact: "person.sample_phone", transform: "phone_part" }] }],
  derived_fields: [{ id: GAP, calculation: "months_uncovered_10y", inputs: [HIST], reference: "case.application_date", executable: true }],
} as unknown as Parameters<typeof checkValue>[0];
const check = (t: string, v: unknown) => checkValue(snapshot, `person.sample_${t}`, v, TODAY);
const plain = (m: string[]) => m.length > 0 && m.every((x) => x.length > 8 && !/undefined|null|\[object|P-\d/.test(x));

(async () => {
  // ── Part 1: tier 1 on the engine ──
  for (const [t, good, bad] of TYPES) {
    const g = check(t, good), b = check(t, bad);
    ok(`C4.4 tier 1 (${t}): a valid answer passes and an invalid one gets a plain message saying how to fix it`, g.length === 0 && plain(b), { good: g, bad: b });
  }
  // Rule-by-rule fails of the new types.
  ok("C4.4 long text fail: over 4,000 characters (no form box limit) is refused in words; 4,000 passes", plain(check("long_text", "x".repeat(4001))) && check("long_text", "x".repeat(4000)).length === 0, check("long_text", "x".repeat(4001)));
  ok("C4.4 multi choice fail: none chosen, or one chosen twice, is refused", plain(check("multi_choice", [])) && plain(check("multi_choice", ["a", "a"])) && check("multi_choice", ["c"]).length === 0, [check("multi_choice", []), check("multi_choice", ["a", "a"])]);
  ok("C4.4 person name: given names with no \"no given name\" pass; no family name fails", check("person_name", { family_name: "Sample", given_names: "Client A" }).length === 0 && plain(check("person_name", { family_name: "", given_names: "Client A" })), check("person_name", { family_name: "", given_names: "Client A" }));
  ok("C4.4 person name fail: \"no given name\" ticked with given names typed is refused (one or the other)", plain(check("person_name", { family_name: "Sample", given_names: "Client", no_given_name: true })), check("person_name", { family_name: "Sample", given_names: "Client", no_given_name: true }));
  ok("C4.4 person name fail: a value that is not the name's parts is refused", plain(check("person_name", "Sample Client")) && plain(check("person_name", { family_name: "Sample", extra: 1 })), check("person_name", "Sample Client"));
  ok("C4.4 period history: an open end (\"goes on today\") passes; an end month in the future fails", check("period_history", [{ from: "2016-11", to: "", what: "Sample work" }]).length === 0 && plain(check("period_history", [{ from: "2016-11", to: "2027-01", what: "Sample work" }])), check("period_history", [{ from: "2016-11", to: "2027-01", what: "Sample work" }]));
  const noWhat = check("period_history", [{ from: "2016-11", to: "2019-13", what: "" }]);
  ok("C4.4 period history fail: a month that is not real and an empty \"what\" each get their own message naming the period", noWhat.length === 2 && noWhat.every((m) => m.startsWith("Period 1:")), noWhat);
  const future = check("period_history", [{ from: "2027-03", to: "", what: "Sample study" }]), early = check("period_history", [{ from: "1899-06", to: "1950-01", what: "Sample work" }]);
  ok("C4.4 period history fail (review m1): a period starting in the future says so, not \"the end is before the start\"", future.length === 1 && /start is in the future/.test(future[0]), future);
  ok("C4.4 period history fail (review m2): a real year before 1900 is named as too early, not as \"enter the start as month and year\"", early.length === 1 && /before 1900/.test(early[0]), early);
  ok("C4.4 period history fail: no periods at all is refused", plain(check("period_history", [])) && plain(check("period_history", "2016 to now")), check("period_history", []));
  ok("C4.4 declaration fail: only a ticked declaration (true) passes; \"yes\" as text does not", check("declaration", true).length === 0 && plain(check("declaration", "yes")), check("declaration", "yes"));
  // P-130: an upload is a document checklist line, not a question.
  const doc = [check("document", { file_id: "00000000-0000-4000-8000-000000000001", name: "passport.pdf" }), check("document", { name: "passport.pdf" })];
  ok("C4.4 / C4.5 P-130: a field typed \"document\" is never answered as a question, with or without a file; the message sends the person to the document checklist", doc.every((m) => m.length === 1 && m[0] === DOCUMENT_NOT_A_QUESTION && /checklist/.test(m[0]) && !/P-\d/.test(m[0])), doc);

  // ── Tier 2: "history covers 10 years" as data, through the one condition evaluator ──
  const cond = { subjectKind: "PERSON", op: "gt", field: GAP, value: 0 };
  const known = (rows: unknown, date: string | null = "2026-11-01") => new Map([[kkey("p1", HIST), { value: rows, status: "confirmed" as const, source: "test" }], ...(date ? [[kkey("case", "case.application_date"), { value: date, status: "confirmed" as const, source: "test" }] as const] : [])]);
  const gapRows = [{ from: "2016-11", to: "2019-01", what: "Sample work" }, { from: "2020-06", to: "2026-11", what: "Sample study" }];
  const full = TYPES.find(([t]) => t === "period_history")![1];
  const withGap = evalCondition(snapshot, known(gapRows), cond, "p1"), noGap = evalCondition(snapshot, known(full), cond, "p1");
  ok("C4.4 tier 2 (P-47): the section check \"history covers 10 years\", held as data, fires on a history with a gap", withGap.applies === true, withGap);
  ok("C4.4 tier 2 fail: it does not fire on a history that covers the 10 years with no gap", noGap.applies === false, noGap);
  const unread = evalCondition(snapshot, known([{ from: "2016-11", to: "2015-01", what: "x" }]), cond, "p1"), noDate = evalCondition(snapshot, known(gapRows, null), cond, "p1");
  ok("C4.4 tier 2: a history it cannot read, or no application date, is \"cannot tell\", never a pass or a fired check", unread.applies === "cannot_tell" && noDate.applies === "cannot_tell" && noDate.missing.includes("case.application_date"), { unread, noDate });
  const words = historyGaps(gapRows, "2026-11-01", 10);
  ok("C4.4 P-47: the gaps are given in plain words (\"Feb 2019 to May 2020 is not covered\", 16 months)", words?.length === 1 && words[0].words === "Feb 2019 to May 2020 is not covered" && words[0].months === 16, words);
  ok("C4.4 P-47 fail: a history starting late leaves its first months uncovered (Nov 2016 to Dec 2016)", historyGaps([{ from: "2017-01", to: "", what: "x" }], "2026-11-01", 10)?.[0]?.words === "Nov 2016 to Dec 2016 is not covered", historyGaps([{ from: "2017-01", to: "", what: "x" }], "2026-11-01", 10));

  // ── Part 2: the library and a Visitor visa case, through the API ──
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv || sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'canonical_fields') f where r.combination_id = '${vv}' and f->>'id' = 'person.c44_sample_activity_history'`) === "0") { console.error("STOP  run tests/runtime/setup_visitor_visa.ts, then tests/runtime/setup_c44_types.ts"); process.exit(2); }
  const lib = "person.other_family_name";
  const set = (valueType: string) => call("PATCH", `/library/fields/${lib}`, { valueType }, AUTHOR);
  const accepted: Record<string, number> = {};
  for (const t of ["long_text", "multi_choice", "person_name", "period_history", "declaration"]) accepted[t] = (await set(t)).status;
  const dataType = sql(`select data_type from canonical_field where canonical_field_key = '${lib}' order by version desc limit 1`);
  const refused = await set("document");
  await set("text");
  ok("C4.4 library: an author can give a field each new type (long text, multi choice, person name, period history, declaration)", Object.values(accepted).every((s) => s < 300) && dataType === "BOOLEAN", { accepted, dataType });
  ok("C4.4 / P-130 library fail: \"document\" is not a value type (400): an upload is a checklist line", refused.status === 400 && /value type/i.test(msg(refused)), { status: refused.status, words: msg(refused) });

  const c = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C44-${Date.now().toString(36)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = c.body?.id ?? c.body?.case?.id;
  const people = (await call("GET", `/runtime/cases/${caseId}`, undefined, OFFICER)).body?.people ?? [];
  const P = people.find((p: { role: string }) => p.role === "principal")?.subject_id, CASE = people.find((p: { role: string }) => p.role === "case")?.subject_id;
  ok("C4.4 setup: a Visitor visa case with its principal applicant", !!caseId && !!P && !!CASE, { status: c.status, words: msg(c) });
  type Q = { fact: string; subjectId: string; value_type: string; options: { key: string }[] | null; answer: { id: string; problems: string[] } | null };
  const view = async (mode = "agent", actor = OFFICER) => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, actor)).body as { sections: { questions: Q[] }[]; checks: { id?: string; message: string; person?: string }[] };
  const qOf = (v: Awaited<ReturnType<typeof view>>, fact: string) => v.sections.flatMap((s) => s.questions).find((q) => q.fact === fact && q.subjectId === P);
  const v0 = await view(), sqr = await view("sqr", CLIENT);
  const NEW = { "person.c44_sample_visit_story": "long_text", "person.c44_sample_purposes": "multi_choice", "person.c44_sample_name_at_birth": "person_name", "person.c44_sample_activity_history": "period_history", "person.c44_sample_declaration": "declaration" };
  ok("C4.4 one renderer: the officer's view and the client's SQR both ask each new type for the principal, with its type", Object.entries(NEW).every(([f, t]) => qOf(v0, f)?.value_type === t && qOf(sqr, f)?.value_type === t), Object.keys(NEW).map((f) => [f, qOf(v0, f)?.value_type, qOf(sqr, f)?.value_type]));
  ok("C4.4 multi choice: the question carries its answer list", (qOf(v0, "person.c44_sample_purposes")?.options ?? []).map((o) => o.key).join() === "tourism,family,business", qOf(v0, "person.c44_sample_purposes")?.options);

  const put = async (subject: string, f: string, value: unknown, actor = OFFICER) => {
    const prev = sql(`select id from client_canonical_answer where subject_id = '${subject}' and canonical_field_key = '${f}' and row_key is null and superseded_by_id is null order by effective_at desc limit 1`) || null;
    return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${f}`, { value, expectedId: prev }, actor);
  };
  const H = "person.c44_sample_activity_history";
  const bad = await put(P, H, [{ from: "2021-11", to: "2016-11", what: "Sample work" }], CLIENT);
  ok("C4.4 P-71: an invalid period history is saved (200) and flagged with its problem in words, never refused", bad.status === 200 && (bad.body?.answer?.problems ?? []).some((p: string) => /end is before the start/.test(p)), { status: bad.status, body: bad.body?.answer?.problems ?? msg(bad) });
  const name = await put(P, "person.c44_sample_name_at_birth", { family_name: "Sample", given_names: "", no_given_name: true }, CLIENT);
  const decl = await put(P, "person.c44_sample_declaration", false, CLIENT);
  ok("C4.4 person name and declaration through the API: \"no given name\" saves clean; an unticked declaration is flagged", name.status === 200 && (name.body?.answer?.problems ?? []).length === 0 && decl.status === 200 && (decl.body?.answer?.problems ?? []).length === 1, { name: name.body?.answer?.problems, decl: decl.body?.answer?.problems });
  // P-97, P-130 (review M1): the declaration is the client's own; the officer cannot make it for them.
  const offDecl = await put(P, "person.c44_sample_declaration", true, OFFICER);
  const declNow = sql(`select value_json::text || '|' || (source_json->>'actor') from client_canonical_answer where subject_id = '${P}' and canonical_field_key = 'person.c44_sample_declaration' and superseded_by_id is null`);
  ok("C4.4 declaration fail (review M1): the officer's tick is refused (403) in words, and the client's answer stays as it was", offDecl.status === 403 && /Only the client/.test(msg(offDecl)) && declNow === "false|user-P", { status: offDecl.status, words: msg(offDecl), declNow });
  const cliDecl = await put(P, "person.c44_sample_declaration", true, CLIENT);
  ok("C4.4 declaration pass: the client makes the declaration (200, no problems)", cliDecl.status === 200 && (cliDecl.body?.answer?.problems ?? []).length === 0, { status: cliDecl.status, problems: cliDecl.body?.answer?.problems });
  const stored = sql(`select value_json::text from client_canonical_answer where subject_id = '${P}' and canonical_field_key = 'person.c44_sample_name_at_birth' and superseded_by_id is null order by effective_at desc limit 1`);
  const parsed = JSON.parse(stored || "null");
  ok("C4.4 data: the name is stored in its parts, as answered", parsed?.family_name === "Sample" && parsed?.given_names === "" && parsed?.no_given_name === true, stored);

  const fired = async () => (await view()).checks.some((x) => x.message === "The history leaves months out of the 10 years before the application date. Add what you did in each gap.");
  await put(P, H, [{ from: "2016-11", to: "2019-01", what: "Sample work" }, { from: "2020-06", to: "", what: "Sample study" }], CLIENT);
  const beforeDate = await fired();
  await put(CASE, "case.application_date", "2026-11-01");
  const withGapApi = await fired();
  await put(P, H, [{ from: "2016-11", to: "2020-05", what: "Sample work" }, { from: "2020-06", to: "", what: "Sample study" }], CLIENT);
  const fixedApi = await fired();
  ok("C4.4 tier 2 on the case: the 10-year check fires once the application date is known and the history has a gap", beforeDate === false && withGapApi === true, { beforeDate, withGapApi });
  ok("C4.4 tier 2 fail on the case: with the gap filled, the check no longer fires", fixedApi === false, fixedApi);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
