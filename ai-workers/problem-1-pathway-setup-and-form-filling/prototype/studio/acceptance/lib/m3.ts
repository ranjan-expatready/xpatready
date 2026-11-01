// Pack 4 shared helpers (P-220 Day 0, Visitor visa `vv.single` M3 path): opens a Visitor visa family case on an
// isolated copy, answers and confirms facts with Sample values, reads the M3 "Prepare application" view, and records
// pass/fail lines that never throw (a missing route is a FAIL line, not a crash). Reuses tests/runtime/api.ts and the
// sample/makeReady logic of tests/runtime/check_runtime_r1d.ts. No model call (US$0).
//
// The contract these tests assume is the M3 case view r5c §6 (screens/M3-agent-view/concept-draft.md), written out in
// acceptance/M3-CONTRACT.md. A builder who needs another name changes the test in the same PR and says so in its first
// line (acceptance/README.md); a rule changes only with the tech lead.
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
 *  solo representative) are read from GET /runtime/firms (SI-9), never assumed. */
export const OFFICER = "user-O", CLIENT = "user-P", CLIENT_B = "user-Q", AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B";
export const run = Date.now().toString(36);

export function needVisitorVisa(): string {
  const vv = sql("select id from combination where combination_key='vv.single'");
  if (!vv) { console.log("Setup missing: run tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts, on this copy."); process.exit(2); }
  return vv;
}

/** Dates relative to today, so the ages and the passport stay right whenever the test runs. */
export const yearsAgo = (y: number, days = 0) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); };
export const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export type Firm = { id: string; name: string; solo: boolean; users: { actor: string; name: string; duties: string[]; licence: { body: string; number: string } | null }[] };
/** GET /runtime/firms (C6.11, SI-9): the Sample firm and the Sample solo firm with their users. */
export async function firms(): Promise<{ firm: Firm | null; solo: Firm | null; rep: string | null; officer: string | null; admin: string | null; soloRep: string | null; raw: Res }> {
  const raw = await call("GET", "/runtime/firms", undefined, OFFICER);
  const list: Firm[] = Array.isArray(raw.body?.firms) ? raw.body.firms : [];
  const firm = list.find((f) => !f.solo) ?? null, solo = list.find((f) => f.solo) ?? null;
  const pick = (f: Firm | null, duty: string, not?: string) => f?.users.find((u) => u.duties.includes(duty) && (!not || !u.duties.includes(not)))?.actor ?? null;
  return { firm, solo, rep: pick(firm, "representative"), officer: pick(firm, "case_officer", "representative"), admin: pick(firm, "firm_admin"), soloRep: pick(solo, "representative"), raw };
}

export type Person = { role: "principal" | "spouse_or_partner" | "child"; name: string; dob: string; travellingAlone?: boolean };
/** The Visitor visa family used across the pack (Sample people, no real names): Client A, an adult spouse, a child of
 *  10 (no biometrics, under 14) and a child of 15 (biometrics; IMM 5707 not needed under 18). */
export const FAMILY: Person[] = [
  { role: "principal", name: "Sample Client A", dob: yearsAgo(40) },
  { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) },
  { role: "child", name: "Sample Child A1", dob: yearsAgo(10) },
  { role: "child", name: "Sample Child A2", dob: yearsAgo(15) },
];

export type Case = { id: string; subjects: Record<string, string>; caseSubject: string; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely, as in the other checks
/** Opens a Visitor visa case with these people; `team` names the representative of record and case officers (C6.11).
 *  Subjects are keyed by display name. Each person's date of birth is answered (ages drive forms, fees, biometrics). */
export async function openCase(vv: string, people: Person[] = FAMILY, team?: { representative: string | null; caseOfficers: string[] }, ref = `ACC-${run}-${Math.random().toString(36).slice(2, 6)}`): Promise<Case> {
  const principal = people.find((p) => p.role === "principal")!;
  const r = await call("POST", "/runtime/cases", { combinationId: vv, reference: ref, clientActor: CLIENT, principal: { displayName: principal.name }, ...(team ? { team } : {}) }, team?.caseOfficers[0] ?? OFFICER);
  const id: string = r.body?.id ?? "";
  const subjects: Record<string, string> = {};
  const p0 = (r.body?.people ?? []).find((p: { role: string }) => p.role === "principal"); if (p0) subjects[principal.name] = p0.subject_id;
  const caseSubject: string = (r.body?.people ?? []).find((p: { role: string }) => p.role === "case")?.subject_id ?? "";
  for (const p of people.filter((x) => x.role !== "principal")) {
    const a = await call("POST", `/runtime/cases/${id}/people`, { role: p.role, displayName: p.name }, OFFICER);
    if (a.body?.subject_id) subjects[p.name] = a.body.subject_id;
  }
  for (const p of people) if (subjects[p.name]) await answer(id, subjects[p.name], "person.date_of_birth", p.dob);
  return { id, subjects, caseSubject, body: r.body };
}

export const agent = async (caseId: string) => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body;
type Q = { subjectId: string; fact: string; value_type: string; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; required: boolean; hidden: boolean; group: string | null; fills: { form: string; person: string; subject?: string }[]; answer: { id: string; confirmed: boolean } | null; rows: { answer: { id: string } | null }[] };
const questions = (v: { sections?: { questions: Q[] }[] }) => (v?.sections ?? []).flatMap((s) => s.questions);
export async function answer(caseId: string, subject: string, fact: string, value: unknown, actor = OFFICER): Promise<Res> {
  const q = questions(await agent(caseId)).find((x) => x.subjectId === subject && x.fact === fact);
  return call("PUT", `/runtime/cases/${caseId}/answers/${subject}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, actor);
}
export async function confirmAll(caseId: string, subject: string) {
  const v = await agent(caseId);
  for (const s of (v?.sections ?? []).filter((x: { subjectId: string }) => x.subjectId === subject)) {
    const seen = [...s.questions.flatMap((q: Q) => [q.answer?.id, ...q.rows.map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter(Boolean);
    if (seen.length) await call("POST", `/runtime/cases/${caseId}/sections/${s.section}/confirm`, { subjectId: subject, seen }, OFFICER);
  }
}
/** Sample values by answer type (as check_runtime_r1d.ts); a passport expiry is always in the future. */
const sample = (q: Q) => q.options?.length ? q.options[0].key : q.shape.phone ? { country_code: "1", number: "5550100" }
  : q.value_type === "yes_no" ? false : /expiry/.test(q.fact) ? inDays(3 * 365) : q.value_type === "date" ? (q.shape.datePrecision === "month" ? "2015-01" : "2015-01-01") : q.value_type === "number" ? "5000"
  : q.value_type === "address" ? { street_name: "Sample Road", city: "Sample City", country: "Canada" } : /email/.test(q.fact) ? "client.a@example.com" : "SAMPLE";
/** Answers and confirms every required fact the case's forms read, for everyone, with Sample values; "none apply" on
 *  required repeating groups. Returns true when GET …/forms says every form is ready (the built P-71 readiness). */
export async function fillEverything(caseId: string): Promise<boolean> {
  for (let pass = 0; pass < 4; pass++) {
    const forms = (await call("GET", `/runtime/cases/${caseId}/forms`, undefined, OFFICER)).body?.forms ?? [];
    if (forms.length && forms.every((f: { applies: boolean; readiness: { ready: boolean } }) => !f.applies || f.readiness.ready)) return true;
    const v = await agent(caseId);
    for (const q of questions(v).filter((q) => q.required && !q.hidden && !q.group && !q.answer?.confirmed && q.fact !== "person.date_of_birth")) await answer(caseId, q.subjectId, q.fact, sample(q));
    for (const s of (v?.sections ?? []).filter((x: { group: { required: boolean; rows: number; none_apply: unknown } | null }) => x.group?.required && x.group.rows === 0 && !x.group.none_apply))
      await call("PUT", `/runtime/cases/${caseId}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: true, expectedId: null }, OFFICER);
    for (const subj of [...new Set(questions(v).map((q) => q.subjectId))]) await confirmAll(caseId, subj);
  }
  return false;
}

/** GET /runtime/cases/:id/prepare (r5c §6): filings, groups, items, fees, readiness, version. */
export type Prepare = {
  portal: string | null; version: string | number;
  filings: { id: string; combination: string; applicants: { subject: string; role: string; mode: string }[]; group: string; status: string; number?: string | null; waitsFor?: string | null }[];
  groups: { id: string; kind: string; filings: string[]; splittable: boolean }[];
  items: { id: string; kind: "form" | "document" | "step"; form?: string; document_type?: string; step?: string; filing: string; subject: string; channel?: string; accepts?: string[]; signature?: string; signers?: string[]; state: string; neededBefore?: string; waitsFor?: string | null; copy_not_for_filing?: boolean; reason?: string }[];
  fees: { filing: string; subject?: string; payer?: string; line: string; amount: number; exempt?: boolean; reason?: string; source?: string }[];
  readiness: { filing: string; ready: boolean; blocks: { code: string; item?: string; words: string }[]; warns: { code: string; item?: string; words: string }[]; owes?: Record<string, unknown> }[];
};
export async function prepare(caseId: string, actor = OFFICER): Promise<{ res: Res; p: Prepare | null }> {
  const res = await call("GET", `/runtime/cases/${caseId}/prepare`, undefined, actor);
  return { res, p: res.status === 200 && res.body && Array.isArray(res.body.filings) ? res.body as Prepare : null };
}
export const filingOf = (p: Prepare | null, subject: string) => p?.filings.find((f) => f.applicants.some((a) => a.subject === subject)) ?? null;
export const itemsOf = (p: Prepare | null, subject: string, form?: string) => (p?.items ?? []).filter((i) => i.subject === subject && (!form || i.form === form));
export const readinessOf = (p: Prepare | null, filing: string | undefined) => p?.readiness.find((r) => r.filing === filing) ?? null;

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
  const r = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(form)}/${subject}/generate`, { idempotencyKey: key }, OFFICER);
  const id: string | undefined = r.body?.id; if (!id) return null;
  await until(async () => ["GENERATED", "FAILED"].includes((await call("GET", `/runtime/form-copies/${id}`, undefined, OFFICER)).body?.status), 90_000);
  return id;
}
export async function copyBytes(copyId: string): Promise<Buffer> {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/form-copies/${copyId}/file`, { headers: { "x-actor": OFFICER } }).catch(() => null);
  return res?.ok ? Buffer.from(await res.arrayBuffer()) : Buffer.alloc(0);
}
export const asValidated = (b: Buffer) => Buffer.concat([b, Buffer.from("\n% Saved after Validate (simulated in this check)\n")]);
export async function sendFile(path: string, file: Buffer, name: string, actor = OFFICER) {
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(file)]), name);
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd }).catch(() => null);
  return { status: res?.status ?? 0, body: await res?.json().catch(() => null) };
}
/** Generate, then send the validated copy back (read back by the built C-9 route). Returns the copy id. */
export async function validateRoundTrip(caseId: string, form: string, subject: string): Promise<string | null> {
  const id = await generateCopy(caseId, form, subject); if (!id) return null;
  const r = await sendFile(`/runtime/form-copies/${id}/validated`, asValidated(await copyBytes(id)), `${form.replace(" ", "")}-validated.pdf`);
  return r.status === 201 ? id : null;
}
/** A signed scan (P-143 "signed by hand and scanned"): a synthetic PDF standing in for the printed, signed, scanned page. */
export const signedScan = (label: string) => Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: signed scan of ${label} (Sample)\n%%EOF\n`, "latin1");

/** Takes every filing of a case to "Ready to file" the way C7.6 does (facts, IMM 5257 validated read back, IMM 5476
 *  signed scan, the representative's review, warnings passed with a reason). Returns the filing ids that got there. */
export async function readyToFile(caseId: string, rep: string | null, officer = OFFICER): Promise<string[]> {
  await fillEverything(caseId);
  let p = (await prepare(caseId, officer)).p;
  for (const i of (p?.items ?? []).filter((x) => x.kind === "form")) {
    if (i.form === "IMM 5257" && i.channel === "PDF_UPLOAD") await validateRoundTrip(caseId, i.form, i.subject);
    if (i.signature === "HAND_SCANNED") { await generateCopy(caseId, i.form!, i.subject); await sendFile(`/runtime/items/${i.id}/signed-scan`, signedScan(i.form!), "signed.pdf", officer); }
  }
  p = (await prepare(caseId, officer)).p;
  const done: string[] = [];
  for (const f of p?.filings ?? []) {
    await call("POST", `/runtime/filings/${f.id}/review`, { note: "Reviewed (Sample)" }, rep ?? "");
    for (const w of readinessOf((await prepare(caseId, officer)).p, f.id)?.warns ?? []) await call("POST", `/runtime/filings/${f.id}/warnings/${w.code}/pass`, { reason: "Passed for the acceptance test (Sample)" }, officer);
    if ((await call("POST", `/runtime/filings/${f.id}/ready`, {}, officer)).status === 200) done.push(f.id);
  }
  return done;
}
