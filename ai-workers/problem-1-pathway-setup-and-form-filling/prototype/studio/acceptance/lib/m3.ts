// Pack 4 shared helpers (P-220 Day 0, Visitor visa `vv.single` M3 path): opens a Visitor visa family case on an
// isolated copy, answers and confirms facts with Sample values, reads the M3 "Prepare application" view, and records
// pass/fail lines that never throw (a missing route is a FAIL line, not a crash). Reuses tests/runtime/api.ts and the
// sample/makeReady logic of tests/runtime/check_runtime_r1d.ts. No model call (US$0).
//
// The contract these tests assume is the M3 case view r5c §6 (screens/M3-agent-view/concept-draft.md), written out in
// acceptance/M3-CONTRACT.md. A builder who needs another name changes the test in the same PR and says so in its first
// line (acceptance/README.md); a rule changes only with the tech lead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder, type Res } from "../../tests/runtime/api.ts";

export const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
const base = client(PORT, DB);
export const { until } = base;
/** Every call resolves: a refused connection or a crash is { status: 0 }, so a test line fails instead of stopping. */
export const call = async (method: string, path: string, body?: unknown, actor: string | null = OFFICER): Promise<Res> => {
  try { return await base.call(method, path, body, actor); } catch (e) { return { status: 0, body: { detail: (e as Error).message } }; }
};
/** SQL that fails (a table not built yet) answers null, never throws. */
export const sql = (q: string): string | null => { try { return base.sql(q); } catch { return null; } };
export const rec = recorder();
export const ok = rec.ok;

/** Simulated people already built (api/src/core.ts). The M3 firm's users (representative, case officer, firm admin,
 *  solo representative) are read from GET /runtime/firm (SI-9), never assumed. */
export const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
export const run = Date.now().toString(36);

export function needVisitorVisa(): string {
  // A busy database (sibling copies) can refuse a connection for a moment: try again before calling setup missing.
  let vv: string | null = null;
  for (let i = 0; i < 5 && !vv; i++) { try { vv = base.sql("select id from combination where combination_key='vv.single'") || null; } catch (e) { if (i === 4) console.log(`Database not reachable: ${(e as Error).message.split("\n")[0]}`); } }
  if (!vv) { console.log("Setup missing: run tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts, on this copy."); process.exit(2); }
  return vv;
}

/** Dates relative to today, so ages stay right whenever the test runs; `days` > 0 goes further into the past. Fixed
 *  dates (FIXED) are used where a saved AI result must replay on the same values. */
export const yearsAgo = (y: number, days = 0) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); };
export const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
export const FIXED = { dob: "1986-04-13", expiry: "2035-06-30", stayFrom: "2030-03-01", stayTo: "2030-04-15" } as const;

export type Firm = { id: string; name: string; solo: boolean; users: { actor: string; name: string; duties: string[]; licence: { body: string; number: string } | null }[] };
type Firms = { firm: Firm | null; solo: Firm | null; rep: string | null; rep2: string | null; officer: string | null; admin: string | null; soloRep: string | null; standIn: string | null; raw: Res };
let firmsCache: Firms | null = null;
/** The built duty keys (engine/runtime/team.ts) in the words the pack uses. */
const DUTY: Record<string, string> = { represent: "representative", case: "case_officer", firm_admin: "firm_admin" };
/** One user of each Sample firm (api/src/core.ts): firms are isolated, so each firm is read as one of its own users. */
export const FIRM_READERS = { firm: OFFICER, solo: "user-S" } as const;
/** GET /runtime/firm (C6.11, SI-9, built in #288): the acting user's own firm and its users. The Sample firm is read as
 *  its case officer and the Sample solo firm as its one person. The Sample firm has two representatives (FQ-9) so a
 *  change of representative can be tested. `raw` is the Sample firm's answer; `standIn` is SI-9 when both firms say so. */
export async function firms(): Promise<Firms> {
  if (firmsCache?.firm) return firmsCache;
  const read = async (actor: string) => {
    const res = await call("GET", "/runtime/firm", undefined, actor);
    const b = res.status === 200 ? res.body : null;
    const firm: Firm | null = b ? { id: b.key, name: b.name, solo: !!b.solo, users: (b.users ?? []).map((u: { id: string; name: string; duties: string[]; licence: { body: string; number: string } | null }) => ({ actor: u.id, name: u.name, duties: u.duties.map((d) => DUTY[d] ?? d), licence: u.licence })) } : null;
    return { res, firm, standIn: (b?.stand_in?.id as string | undefined) ?? null };
  };
  const a = await read(FIRM_READERS.firm), s = await read(FIRM_READERS.solo);
  const firm = a.firm && !a.firm.solo ? a.firm : null, solo = s.firm?.solo ? s.firm : null;
  const all = (f: Firm | null, duty: string, not?: string) => (f?.users ?? []).filter((u) => u.duties.includes(duty) && (!not || !u.duties.includes(not))).map((u) => u.actor);
  firmsCache = { firm, solo, rep: all(firm, "representative")[0] ?? null, rep2: all(firm, "representative")[1] ?? null, officer: all(firm, "case_officer", "representative")[0] ?? null, admin: all(firm, "firm_admin")[0] ?? null, soloRep: all(solo, "representative")[0] ?? null,
    standIn: a.standIn === "SI-9" && s.standIn === "SI-9" ? "SI-9" : null, raw: a.res };
  return firmsCache;
}

/** `dob: null` leaves the date of birth unanswered (adding a person asks only for a name, G15); `applies: false` is a
 *  person on the case who is not travelling (P-209). */
export type Person = { role: "principal" | "spouse_or_partner" | "child"; name: string; dob: string | null; applies?: boolean };
/** The Visitor visa family used across the pack (Sample people, no real names): Client A, an adult spouse, a child of
 *  10 (no biometrics, under 14) and a child of 15 (biometrics; IMM 5707 not needed under 18). */
export const FAMILY: Person[] = [
  { role: "principal", name: "Sample Client A", dob: yearsAgo(40) },
  { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) },
  { role: "child", name: "Sample Child A1", dob: yearsAgo(10) },
  { role: "child", name: "Sample Child A2", dob: yearsAgo(15) },
];

/** Who acts on each case: its first case officer (BR-20: the case's team works the case), and its people. */
const OFFICERS = new Map<string, string>();
const PEOPLE = new Map<string, Map<string, Person>>();
export const officerOf = (caseId: string) => OFFICERS.get(caseId) ?? OFFICER;
const isMinor = (dob: string | null) => !!dob && dob > yearsAgo(18);

export type Case = { id: string; subjects: Record<string, string>; caseSubject: string; officer: string; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely, as in the other checks
/** Opens a Visitor visa case with these people. `team` names the representative of record and case officers (C6.11);
 *  without it the Sample firm's representative and case officer are used. The built route (#288) takes them as
 *  top-level `representative` and `caseOfficers`. Subjects are keyed by display name; each date of birth is answered. */
export async function openCase(vv: string, people: Person[] = FAMILY, team?: { representative: string | null; caseOfficers: string[] }, ref = `ACC-${run}-${Math.random().toString(36).slice(2, 6)}`): Promise<Case> {
  const f = await firms();
  const t = team ?? (f.rep ? { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] } : undefined);
  const officer = t?.caseOfficers[0] || OFFICER;
  const principal = people.find((p) => p.role === "principal")!;
  const r = await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: principal.name }, ...(t?.representative ? { representative: t.representative } : {}), ...(t ? { caseOfficers: t.caseOfficers } : {}) }, officer);
  const id: string = r.body?.id ?? "";
  OFFICERS.set(id, officer);
  const subjects: Record<string, string> = {}, who = new Map<string, Person>();
  const p0 = (r.body?.people ?? []).find((p: { role: string }) => p.role === "principal"); if (p0) { subjects[principal.name] = p0.subject_id; who.set(p0.subject_id, principal); }
  const caseSubject: string = (r.body?.people ?? []).find((p: { role: string }) => p.role === "case")?.subject_id ?? "";
  for (const p of people.filter((x) => x.role !== "principal")) {
    const a = await call("POST", `/runtime/cases/${id}/people`, { role: p.role, displayName: p.name, ...(p.applies === false ? { applies: false } : {}) }, officer);
    if (a.body?.subject_id) { subjects[p.name] = a.body.subject_id; who.set(a.body.subject_id, p); }
  }
  PEOPLE.set(id, who);
  for (const p of people) if (subjects[p.name] && p.dob) await answer(id, subjects[p.name], "person.date_of_birth", p.dob);
  return { id, subjects, caseSubject, officer, body: r.body };
}

export const agent = async (caseId: string) => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, officerOf(caseId))).body;
type Q = { subjectId: string; fact: string; value_type: string; collected_from: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; countries?: string[] | null; required: boolean; hidden: boolean; group: string | null; fills: { form: string; person: string; subject?: string }[]; answer: { id: string; confirmed: boolean; awaits_client?: boolean } | null; rows: { row: string; answer: { id: string; confirmed?: boolean; awaits_client?: boolean } | null }[] };
const questions = (v: { sections?: { questions: Q[] }[] }) => (v?.sections ?? []).flatMap((s) => s.questions);
export async function answer(caseId: string, subject: string, fact: string, value: unknown, actor = officerOf(caseId), extra: Record<string, unknown> = {}): Promise<Res> {
  const q = questions(await agent(caseId)).find((x) => x.subjectId === subject && x.fact === fact);
  return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null, ...extra }, actor);
}
/** "Confirm section" by the case's officer for every section of one person (the built route). */
export async function confirmAll(caseId: string, subject: string) {
  const v = await agent(caseId);
  for (const s of (v?.sections ?? []).filter((x: { subjectId: string }) => x.subjectId === subject)) {
    const seen = [...s.questions.flatMap((q: Q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean);
    if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }, officerOf(caseId));
  }
}
/** Sample values by answer type (as check_runtime_r1d.ts); dates are FIXED so a saved AI review can replay. A Yes/No is
 *  No. Row C1: that includes "uses a representative", on purpose, until row A2 (#1072) is in. Answered Yes today, IMM 5476
 *  applies and reads 20 facts about the representative that no route accepts before A2 fills them from the firm record
 *  (PUT …/answers/representative/… is 404 "That person is not on this case" for the client, the officer, the officer on
 *  the person's behalf and the representative; measured on the checkpoint, 6 Nov), so no represented case could ever be
 *  complete. Once A2 is in, the question is no longer asked: the case team answers it, as the ruling says. */
const sample = (q: Q) => q.options?.length ? q.options[0].key : q.shape.phone ? { country_code: "1", number: "5550100" }
  : q.value_type === "yes_no" ? false : /expiry/.test(q.fact) ? FIXED.expiry : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "2015-01" : "2015-01-01") : q.value_type === "number" ? "5000"
  : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.a@example.com"
  : q.value_type === "country" || q.value_type === "code" ? listed(q) : "SAMPLE";
/** QA-165 (#1256 section C): a country or code with no answer list is answered with a value the form's own list can hold,
 *  never "SAMPLE" (its box would stay empty, "not in the box's option list"): one of the release's country names the view
 *  sends with the question (the Sample family's, India, when listed), else the Sample family's own answer for that fact
 *  (samples/sample-family-imm5257.json, made up; "Hindi" for the native language), else for a country the family's country
 *  of residence. The configured checkpoint's library has no country list, so its view sends none (measured 8 Nov). */
const FAMILY_ANSWERS = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "sample-family-imm5257.json"), "utf8")) as { everyone?: Record<string, unknown> }).everyone ?? {};
const listed = (q: Q) => q.countries?.length ? (q.countries.includes("India") ? "India" : q.countries[0]) : typeof FAMILY_ANSWERS[q.fact] === "string" ? FAMILY_ANSWERS[q.fact] as string
  : q.value_type === "country" && typeof FAMILY_ANSWERS["person.current_residence_country"] === "string" ? FAMILY_ANSWERS["person.current_residence_country"] as string : "SAMPLE";
/** QA-165 (#1256 section D): the repeating groups whose first row IRCC's form marks mandatory, named by readiness's own
 *  words for a field left empty after "none apply" (engine/runtime/mandatory.ts): `${subject}|${title}`. */
const rowNeeded = (forms: { subject_id: string; readiness: { missing: { reason: string; why?: string; subject?: string }[] } }[]) => new Set(forms.flatMap((f) => f.readiness.missing.filter((m) => m.reason === "left empty on the form")
  .flatMap((m) => [...String(m.why ?? "").matchAll(/"none apply" is answered for "([^"]+)"/g)].map((x) => `${m.subject ?? f.subject_id}|${x[1]}`))));
/** Row C1: a text Sample the release's own checks refuse (a UCI is digits only, IMM 5257's box script) is given again as
 *  digits, once; the release's answer decides, no fact name is assumed. Sample, not a real UCI. */
const SAMPLE_DIGITS = "0000000001";
/** Answers and confirms every required fact the case's forms read, with Sample values; "none apply" on required
 *  repeating groups (a first row where the form requires one, QA-165). BR-6, P-97, P-155 (3): a client's own facts are answered by the client (`user-P`) for the principal
 *  and minors (P-78: they count as confirmed); for another adult the officer enters them on the person's behalf with a
 *  reason (FQ-12). Returns true when GET …/forms says no form waits on a fact (the built P-71 readiness, less the mandatory
 *  boxes a copy leaves empty that no answer fills: QA-165, #1318). Since QA-246 that list leaves out a form whose rule
 *  still waits for an answer; the questions those rules ask are answered by the loop below like any required question,
 *  so a true here does not by itself say every rule is answered (/prepare's `waiting` does). */
export async function fillEverything(caseId: string): Promise<boolean> {
  const who = PEOPLE.get(caseId) ?? new Map<string, Person>(), officer = officerOf(caseId);
  for (let pass = 0; pass < 4; pass++) {
    const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, officer)).body?.forms ?? [];
    // QA-165 (#1318): done when no form waits on a fact. A mandatory box a copy leaves empty that no answer can fill (IMM 5257
    // SCH1's by-hand boxes) is said on Ready to file and holds no lock back (blocksLock); one a first row would fill is not done.
    if (forms.length && !rowNeeded(forms).size && forms.every((f: { applies: boolean; readiness: { missing: { reason: string }[] } }) => !f.applies || f.readiness.missing.every((m) => m.reason === "left empty on the form"))) return true;
    // QA-165 (#1256 D): a group the form needs a first row of (IMM 5257's current activity) takes back "none apply" and gets one row.
    const needRow = rowNeeded(forms);
    for (const s of ((await agent(caseId))?.sections ?? []).filter((x: { subjectId: string; title: string; group: { rows: number } | null }) => x.group && x.group.rows === 0 && needRow.has(`${x.subjectId}|${x.title}`))) {
      if (s.group.none_apply?.value) await call("PUT", `/runtime/cases/${caseId}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: false, expectedId: s.group.none_apply.id }, officer);
      await call("POST", `/runtime/cases/${caseId}/groups/${s.subjectId}/rows`, { group: s.section }, officer);
    }
    const v = await agent(caseId);
    // A person's date of birth is set when the case opens (it decides ages); a parent's (B128, `<person>/parent_1`) is a
    // fact like any other here, a Sample date some 70 years ago.
    for (const q of questions(v).filter((q) => q.required && !q.hidden && !q.group && !q.answer?.confirmed && (q.fact !== "person.date_of_birth" || q.subjectId.includes("/")))) {
      const p = who.get(q.subjectId), clientFact = q.collected_from === "client_questionnaire";
      const put = (value: unknown) => clientFact && (!p || p.role === "principal" || isMinor(p.dob)) ? answer(caseId, q.subjectId, q.fact, value, CLIENT)
        : clientFact ? answer(caseId, q.subjectId, q.fact, value, officer, { onBehalfOf: q.subjectId, reason: "Entered from the person's signed form (Sample)" })
        : answer(caseId, q.subjectId, q.fact, value, officer);
      const value = q.fact === "person.date_of_birth" ? yearsAgo(70) : sample(q), r = await put(value);
      if (value === "SAMPLE" && r.status < 300 && (r.body?.answer?.problems ?? []).length) await put(SAMPLE_DIGITS);
    }
    // QA-165 (#1256 D): the rows added above (or by a pack) are answered like the rest, by the officer, row by row.
    for (const q of questions(v).filter((q) => q.required && !q.hidden && q.group)) for (const r of q.rows.filter((x) => !x.answer?.confirmed)) {
      const p = who.get(q.subjectId), clientFact = q.collected_from === "client_questionnaire", body = (value: unknown) => ({ value, expectedId: r.answer?.id ?? null, row: r.row });
      const put = (value: unknown) => clientFact && (!p || p.role === "principal" || isMinor(p.dob)) ? call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, body(value), CLIENT)
        : call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, { ...body(value), ...(clientFact ? { onBehalfOf: q.subjectId, reason: "Entered from the person's signed form (Sample)" } : {}) }, officer);
      const res = await put(sample(q));
      if (sample(q) === "SAMPLE" && res.status < 300 && (res.body?.answer?.problems ?? []).length) await put(SAMPLE_DIGITS);
    }
    for (const s of (v?.sections ?? []).filter((x: { group: { required: boolean; rows: number; none_apply: unknown } | null }) => x.group?.required && x.group.rows === 0 && !x.group.none_apply))
      await call("PUT", `/runtime/cases/${caseId}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: true, expectedId: null }, officer);
    // C6.18 (P-244): a background answer the officer entered (another adult's, above) is the client's to re-confirm
    // before signing; the client does, as a person would on their questionnaire, then the officer confirms the sections.
    for (const q of questions(await agent(caseId))) for (const a of [q.answer, ...q.rows.map((r) => r.answer)]) if (a?.awaits_client) await call("POST", `/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, {}, CLIENT);
    for (const subj of [...new Set(questions(v).map((q) => q.subjectId))]) await confirmAll(caseId, subj);
  }
  return false;
}

/** GET /runtime/cases/:id/prepare (r5c §6): filings, groups, items, fees, readiness, version. */
export type Prepare = {
  portal: string | null; version: string | number;
  filings: { id: string; combination: string; applicants: { subject: string; role: string; mode: string }[]; group: string; status: string; number?: string | null; waitsFor?: string | null }[];
  groups: { id: string; kind: string; filings: string[]; splittable: boolean }[];
  items: { id: string; kind: "form" | "document" | "step"; form?: string; document_type?: string; step?: string; filing: string; subject: string; channel?: string; accepts?: string[]; signature?: string; signers?: string[]; state: string; neededBefore?: string; waitsFor?: string | null; copy_not_for_filing?: boolean; reason?: string;
    /** C7.7 part 2: a Paper line's barcode page, its validated copy read back and its steps in order. */
    barcode_page?: boolean; validated?: { copy: string; at: string; current: boolean } | null; steps?: { key: string; words: string; done: boolean | null; neededBefore?: string }[] }[];
  fees: { filing: string; subject?: string; payer?: string; line: string; amount: number; exempt?: boolean; reason?: string; source?: string }[];
  /** C7.6 (P-315): `severity` block (never passed) · critical (a former block, passed with a reason) · warning. */
  readiness: { filing: string; ready: boolean; blocks: { code: string; item?: string; words: string; severity?: string; key?: string }[]; warns: { code: string; item?: string; words: string; severity?: string; key?: string }[];
    passed?: { code: string; key?: string; words: string; severity?: string; reason: string; by: string; at: string }[]; owes?: Record<string, unknown>;
    /** C7.6 (#861 N1): the filing's facts fingerprint; a review sends back the one it read. */
    facts_hash?: string }[];
};
export async function prepare(caseId: string, actor = officerOf(caseId)): Promise<{ res: Res; p: Prepare | null }> {
  const res = await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, actor);
  return { res, p: res.status === 200 && res.body && Array.isArray(res.body.filings) ? res.body as Prepare : null };
}
export const filingOf = (p: Prepare | null, subject: string) => p?.filings.find((f) => f.applicants.some((a) => a.subject === subject)) ?? null;
export const itemsOf = (p: Prepare | null, subject: string, form?: string) => (p?.items ?? []).filter((i) => i.subject === subject && (!form || i.form === form));
export const readinessOf = (p: Prepare | null, filing: string | undefined) => p?.readiness.find((r) => r.filing === filing) ?? null;

// ----- Row C1 (M3 sprint plan, tech lead's ruling R1 with its correction, 6 Nov): what a pack expects comes from the
// release the case is pinned to, as configured, and the cited rules; never from the product's own /prepare answer. -----

/** One form line of a release, as configured: the snapshot frozen at release (engine/snapshot.ts, `forms`). Read through
 *  GET /combinations/:id/config?mode=published, the configuration route that serves the released snapshot (the Forms tab
 *  reads the same lines, but of the draft, through GET /combinations/:id/workspace?tab=forms). `waitsOn`: the facts the
 *  line's condition reads when it applies only on an answer (attach mode "answer conditional"), else null. */
export type ReleaseLine = { form: string; who: string; minAge: number | null; waitsOn: string[] | null; channel: string; signature: string; signedBy: string | null };
export type Release = { combinationId: string; version: number; sha256: string; portal: string | null; lines: ReleaseLine[] };
/** What one person is expected to have, worked out by expectedLines. `signers` in /prepare's own words ("person",
 *  "parent", "representative"). The four kinds the packs ask for by meaning, not by form number: the Online form, the
 *  barcode PDF, the family form, the hand-signed form. `barcode` is the form's kind (IMM 5257 is one even when filed
 *  Online, as on release 2); `barcodePdf` is a barcode form filed as a PDF upload, the one a pack validates. */
export type ExpectedLine = { form: string; channel: string; signature: string; signers: string[]; online: boolean; barcode: boolean; barcodePdf: boolean; family: boolean; handSigned: boolean; waitsOn: string[] | null };
export type Expected = { name: string; role: Person["role"]; age: number | null; forms: ExpectedLine[]; waiting: ExpectedLine[] };

/** The cited rules expectedLines applies, each with its row in product/compliance-trace.md (line numbers on main at the
 *  time of row C1). Values not on a row are named so, with where their words are recorded instead.
 *  - VV-R03 (compliance-trace.md line 36): each family member completes their own application form, so a line "for each
 *    applicant" is one copy per person who applies (a person with `applies: false` files nothing, P-209).
 *  - VV-R04 (line 37), VV-R18 (line 51): IMM 5257 is a barcode form (Validate builds the barcode page). IRCC-P3-07
 *    (line 72): IMM 5707 and IMM 5409 make no barcode. No row names any other Visitor visa form a barcode form. */
const BARCODE_FORMS = ["IMM 5257"];
/**  - IRCC-F09 (line 23), IRCC-P2-04a (line 90): the Family Information form is IMM 5707 or IMM 5645. */
const FAMILY_FORMS = ["IMM 5707", "IMM 5645"];
/**  - VV-R07 (line 40): IMM 5707 by each person 18 or older; the same minimum age is the line's `min_age`, read as
 *    configured. "principal_partner_adult_children" (IMM 5257 SCH1): its own words, "The principal applicant, his or her
 *    spouse or common-law partner, if applicable, and all dependent children aged 18 years or older" — no row in
 *    compliance-trace.md yet; the quote is in samples/form-setup.json vv.single rules (QA-221, the tech lead's ruling C, 4 Nov): the minimum
 *    age gates dependent children only.
 *  - VV-R09 (line 42): 18 or older signs their own; under 18 a parent signs (a line signed "parent_for_minor").
 *  - VV-R10 (line 43): IMM 5476 is signed by the applicant and the representative (a line signed
 *    "person_and_representative"); it applies when a representative is used (its condition, read as configured).
 *  - IMM 5409, IMM 5475, IRM 0002 apply only on an answer: their conditions are read as configured, never decided here
 *    (no row in compliance-trace.md; their quotes are in samples/form-setup.json vv.single rules).
 *  Read as configured, so where a release departs from a cited rule the answer follows the release (release 2 on the
 *  checkpoint, 7 Nov: Schedule 1, IMM 5645 and the answer-only forms have no "signed by" set, samples/checkpoint-stage-one.json
 *  "signers_not_set", so the person is expected to sign); a pack that matches it exactly records the release's gap, it
 *  does not bless it. */
const ageOn = (dob: string | null, today = new Date().toISOString().slice(0, 10)) => {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number), [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
};
/** Whether a line reaches this person by its `who` and minimum age (rules above). An unknown age with a minimum age is
 *  not decided here: the person is left out and the caller sees it (age null). */
function reaches(l: ReleaseLine, p: Person, principalName: string | undefined): boolean {
  if (p.applies === false) return false;
  const age = ageOn(p.dob), adult = (n: number) => age !== null && age >= n;
  switch (l.who) {
    case "each_applicant": return l.minAge ? adult(l.minAge) : true;
    case "principal_partner_adult_children": return p.role === "principal" || p.role === "spouse_or_partner" || (l.minAge ? adult(l.minAge) : true);
    case "principal_applicant": return p.name === principalName;
    case "spouse_or_partner": return p.role === "spouse_or_partner";
    case "each_dependent_child": return p.role === "child" && (l.minAge ? adult(l.minAge) : true);
    // each_person, couple_once, case, sponsor, representative…: not decided here (no data set uses them today, and no
    // rule above names them); expectedLines leaves such a line out. A pack that meets one adds its rule and row first.
    default: return false;
  }
}
function signersFor(l: ReleaseLine, p: Person): string[] {
  // A child whose age is not known stays a minor (as the resolver does: engine/resolver.ts formSigners).
  const minorChild = p.role === "child" && (ageOn(p.dob) ?? 0) < 18;
  if (l.signedBy === "parent_for_minor") return [minorChild ? "parent" : "person"];         // VV-R09: a parent on the case is the principal
  if (l.signedBy === "principal_for_family") return [p.role === "principal" ? "person" : minorChild ? "parent" : "principal"];
  if (l.signedBy === "person_and_representative") return ["person", "representative"];      // VV-R10
  if (l.signedBy === "none") return [];
  return ["person"];                                                                          // not set: the person signs their own
}
/** Row C1: for each of the pack's own people (by name), the exact forms the release gives them: `forms` (to fill) and
 *  `waiting` (lines that apply only on an answer, with the facts they wait on). Pure: no route is called here, so the
 *  same lines and people always give the same answer (tests/check_m3_c1_expected_lines.ts holds it by hand). */
export function expectedLines(release: Release, people: Person[]): Record<string, Expected> {
  const principal = people.find((p) => p.role === "principal")?.name;
  const out: Record<string, Expected> = {};
  for (const p of people) {
    const e: Expected = { name: p.name, role: p.role, age: ageOn(p.dob), forms: [], waiting: [] };
    for (const l of release.lines.filter((x) => reaches(x, p, principal))) {
      const barcode = BARCODE_FORMS.includes(l.form);
      const line: ExpectedLine = { form: l.form, channel: l.channel, signature: l.signature, signers: signersFor(l, p), online: l.channel === "ONLINE", barcode, barcodePdf: barcode && l.channel === "PDF_UPLOAD",
        family: FAMILY_FORMS.includes(l.form), handSigned: l.signature === "HAND_SCANNED", waitsOn: l.waitsOn };
      (l.waitsOn ? e.waiting : e.forms).push(line);
    }
    out[p.name] = e;
  }
  return out;
}
/** The facts a configured condition reads (its `field`s, nested `args` included), in order, once each. */
const factsOf = (c: unknown): string[] => {
  const seen: string[] = [], walk = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    const o = x as { field?: unknown; args?: unknown };
    if (typeof o.field === "string" && !seen.includes(o.field)) seen.push(o.field);
    if (Array.isArray(o.args)) o.args.forEach(walk);
  };
  walk(c);
  return seen;
};
type SnapLine = { form_number: string; form_kind?: string; who: string; status: string; condition?: unknown; channel?: string; signature?: string; min_age?: number; signed_by?: string };
/** A released snapshot's form lines as configured. A missing channel is PDF upload and a missing signature is the
 *  channel's first ("NONE"; Paper: "PEN"), as the snapshot leaves defaults out (engine/snapshot.ts, engine/channels.ts
 *  lineOf); the old "SIGNED_PDF_UPLOAD" reads as PDF upload signed by hand and scanned. Document lines are not forms. */
export function releaseLines(forms: SnapLine[]): ReleaseLine[] {
  return forms.filter((f) => (f.form_kind ?? "data_form") !== "document").map((f) => {
    const old = f.channel === "SIGNED_PDF_UPLOAD", channel = old ? "PDF_UPLOAD" : f.channel ?? "PDF_UPLOAD";
    return { form: f.form_number, who: f.who, minAge: f.min_age ?? null, waitsOn: f.status === "always" ? null : factsOf(f.condition),
      channel, signature: old ? "HAND_SCANNED" : f.signature ?? (channel === "PAPER" ? "PEN" : "NONE"), signedBy: f.signed_by ?? null };
  });
}
/** The release a case is pinned to, as configured: the case's pin (GET /runtime/cases/:id), then the released snapshot
 *  (GET /combinations/:id/config?mode=published, read as the configuration author). The route serves the newest release
 *  only, so a case pinned to an older one answers null with the reason printed: never another release's lines. */
export async function pinnedRelease(caseId: string): Promise<Release | null> {
  const c = (await call("GET", `/runtime/cases/${caseId}`, undefined, officerOf(caseId))).body;
  const pin = c?.pin as { release_version?: number; sha256?: string } | undefined;
  if (!c?.combination_id || !pin?.sha256) { console.log(`NOTE  expectedLines: case ${caseId.slice(0, 8)} has no readable pin`); return null; }
  const cfg = (await call("GET", `/combinations/${c.combination_id}/config?mode=published`, undefined, AUTHOR)).body;
  if (cfg?.release?.sha256 !== pin.sha256) { console.log(`NOTE  expectedLines: case ${caseId.slice(0, 8)} is pinned to release version ${pin.release_version}, not the newest (${cfg?.release?.version ?? "none"}): its lines are not read`); return null; }
  return { combinationId: c.combination_id, version: cfg.release.version, sha256: pin.sha256, portal: cfg.snapshot?.combination?.portal ?? null, lines: releaseLines(cfg.snapshot?.forms ?? []) };
}
/** The pack's own people of a case opened by openCase (null for another case). */
export const peopleOf = (caseId: string): Person[] | null => { const m = PEOPLE.get(caseId); return m ? [...m.values()] : null; };
/** expectedLines for a case opened by openCase: its pinned release and its own people; null when either is unknown. */
export async function expectedFor(caseId: string): Promise<Record<string, Expected> | null> {
  const people = peopleOf(caseId), release = people ? await pinnedRelease(caseId) : null;
  return people && release ? expectedLines(release, people) : null;
}

/** Runs a test's main; a crash is a FAIL line; exit 0 all pass, 1 a failure. The header names the capability. */
export async function main(cap: string, title: string, body: () => Promise<void>) {
  console.log(`${cap} — ${title}\n(acceptance pack 4, Visitor visa M3 path; written to fail until the capability is built)\n`);
  try { await body(); } catch (e) { ok(`${cap}: the test ran to its end (crashed: ${(e as Error).message})`, false); }
  process.exitCode = rec.summary() ? 1 : 0;
}

/** The built PDF round trip (R1d, C-9): make a copy of a form for a person, wait for it, and send back a "validated"
 *  copy. Adobe's Validate adds the barcode and saves; simulated here, as in check_runtime_r1d.ts, by an incremental
 *  save appended after the copy (the values stay as written). */
export async function generateCopy(caseId: string, form: string, subject: string, key = `acc-${run}-${Math.random().toString(36).slice(2, 8)}`): Promise<string | null> {
  const actor = officerOf(caseId);
  const r = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(form)}/${subject}/generate`, { idempotencyKey: key }, actor);
  const id: string | undefined = r.body?.id; if (!id) return null;
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, actor)).body?.status), 90_000);
  return id;
}
export async function copyBytes(copyId: string, actor = OFFICER): Promise<Buffer> {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copyId}/file`, { headers: { "x-actor": actor } }).catch(() => null);
  return res?.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
}
// QA-165: the form's own Validate result written into the copy (tests/runtime/validated.ts), never bytes appended.
// A re-export alone binds no local name, and validateRoundTrip below calls it (C7.6, C8.1, C9.2 crashed on #572's merge).
import { adobeValidated, asValidated } from "../../tests/runtime/validated.ts";
export { adobeValidated, asValidated };
export async function sendFile(path: string, file: Buffer, name: string, actor = OFFICER) {
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(file)]), name);
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd }).catch(() => null);
  return { status: res?.status ?? 0, body: await res?.json().catch(() => null) };
}
/** Generate, then send the validated copy back (read back by the built C-9 route). Returns the copy id. */
export async function validateRoundTrip(caseId: string, form: string, subject: string): Promise<string | null> {
  const id = await generateCopy(caseId, form, subject); if (!id) return null;
  const actor = officerOf(caseId);
  const r = await sendFile(`/runtime/form-copies/${id}/validated`, adobeValidated(await copyBytes(id, actor)), `${form.replace(" ", "")}-validated.pdf`, actor);
  return r.status === 201 ? id : null;
}
/** A signed scan (P-143 "signed by hand and scanned"): a synthetic PDF standing in for the printed, signed, scanned page. */
export const signedScan = (label: string) => Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: signed scan of ${label} (Sample)\n%%EOF\n`, "latin1");
/** A "signed by hand and scanned" item in its order (C8.1-3): generate the copy, print it, mark it signed, upload the
 *  scan. Returns the scan upload's status (201 when stored). */
export async function signByHand(caseId: string, itemId: string | undefined, form: string, subject: string): Promise<number> {
  const actor = officerOf(caseId);
  const copy = await generateCopy(caseId, form, subject);
  await call("POST", `/runtime/items/${itemId}/sign-steps/print`, { copy }, actor);
  await call("POST", `/runtime/items/${itemId}/sign-steps/signed`, {}, actor);
  return (await sendFile(`/runtime/items/${itemId}/signed-scan`, signedScan(form), `${form.replace(" ", "")}-signed.pdf`, actor)).status;
}

/** Takes every filing of a case to "Ready to file" the way C7.6 does (facts, each barcode form filed as a PDF validated
 *  and read back, each hand-signed item signed in order, the representative's review, warnings passed with a reason);
 *  B162 (review m4): unlike C7.6, which makes each missing copy for filing, a CRITICAL "no copy" line here is passed with
 *  a reason like every other warning;
 *  items already Ready or Done are left alone. Returns the filing ids that got there. Row C1: which form is the barcode
 *  form comes from expectedLines (the case's own release and people), not a form number written here; the item's own
 *  channel must still be PDF upload, as before, since only a PDF copy is validated. */
export async function readyToFile(caseId: string, rep: string | null): Promise<string[]> {
  const officer = officerOf(caseId);
  await fillEverything(caseId);
  const expected = await expectedFor(caseId), nameOf = new Map([...(PEOPLE.get(caseId) ?? new Map<string, Person>())].map(([s, p]) => [s, p.name]));
  // A case whose expected lines cannot be read (not opened by openCase, or pinned to a release older than the newest)
  // keeps the helper's earlier rule, IMM 5257, so no check is lowered; the NOTE line says so.
  if (!expected) console.log(`NOTE  readyToFile: no expected lines for case ${caseId.slice(0, 8)} (not opened by openCase, or its release unread): IMM 5257 is taken as the barcode form, as before row C1`);
  // BK-16 PR 2 (#1632, merge with BK-17): a conditional line (a "waiting" one, such as IMM 5257 for a child who does not
  // study) is an item only once its condition applies, so a barcode form on it is validated like an always-filed one.
  const barcode = (form: string | undefined, subject: string) => {
    const e = expected?.[nameOf.get(subject) ?? ""];
    return expected ? !!e && [...e.forms, ...e.waiting].some((l) => l.form === form && l.barcode) : form === "IMM 5257";
  };
  let p = (await prepare(caseId)).p;
  for (const i of (p?.items ?? []).filter((x) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
    if (i.channel === "PDF_UPLOAD" && barcode(i.form, i.subject)) await validateRoundTrip(caseId, i.form!, i.subject);
    if (i.signature === "HAND_SCANNED") await signByHand(caseId, i.id, i.form!, i.subject);
  }
  p = (await prepare(caseId)).p;
  const done: string[] = [];
  for (const f of p?.filings ?? []) {
    // C7.6 (#861 N1): the review sends back the facts fingerprint the representative read.
    await call("POST", `/runtime/filings/${f.id}/review`, { note: "Reviewed (Sample)", facts_hash: readinessOf((await prepare(caseId)).p, f.id)?.facts_hash }, rep ?? "");
    for (const w of readinessOf((await prepare(caseId)).p, f.id)?.warns ?? []) await call("POST", `/runtime/filings/${f.id}/warnings/${w.code}/pass`, { reason: "Passed for the acceptance test (Sample)" }, officer);
    if ((await call("POST", `/runtime/filings/${f.id}/ready`, {}, officer)).status === 200) done.push(f.id);
  }
  return done;
}
