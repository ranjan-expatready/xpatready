// QA-231 (P-67, DEMO.md row 11): the configured checkpoint's Sample family case on the Visitor visa's release 1, opened
// through the case officer's own steps (Runtime.createCase, addPerson, CaseForms.generate), as a person opens one on
// Cases. A new edition held later (row 17) then shows open cases staying on the release they started on. The people are
// made up (Client A's family of expected/p5-case-c1.json, Sample); nothing is filed, no AI (US$0).
// C10.1 rows 11–12 (#1009, Lead 9's and Lead 10's rulings): DEMO.md's family of four (a second child, 18 or over, who
// answers for themselves), answered once from the one Sample record before the copies are made, so IMM 5257 is filled for
// each applicant from the case's answers. The record has one child and no child's date of birth: the second child's
// name and both children's dates of birth are made up here, labelled Sample.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sampleFamilyFacts } from "../../engine/import.ts";
import { RUNTIME_ACTORS, STUDIO, type Db } from "./core.ts";
import type { CaseForms } from "./fill-case.ts";
import type { Runtime } from "./runtime.ts";
import { replaySavedReadBacks } from "./sample-validated.ts";

// The people of the one Sample family (engine/import.ts sampleFamilyFacts), each labelled Sample.
export const SAMPLE_CASE = { reference: "SAMPLE-VV-FAMILY-1", principal: "Client A (Sample)", family: [{ role: "spouse_or_partner", displayName: "Partner (Sample)", record: "spouse_or_partner" }, { role: "child", displayName: "Child (Sample)", record: "child-1" }, { role: "child", displayName: "Child 18 or over (Sample)", record: null }] };
/** Sample facts made up for the people the record lacks or leaves without a date of birth (the record's child is under 18). */
const MADE_UP: Record<string, [string, unknown][]> = {
  "child-1": [["person.date_of_birth", "2016-05-20"]],
  "child-2": [["person.given_names", "SECOND CHILD"], ["person.date_of_birth", "2007-03-14"]],
};
// B99 (C10.1 row 12b): the IMM 5257 answers of the one Sample family (Sample, Unconfirmed: expert), so every copy carries
// values. Brackets are refused in a name, so the made-up second child is "SECOND CHILD", labelled Sample by its person.
type FamilyFile = { case: Record<string, unknown>; everyone: Record<string, unknown>; people: Record<string, Record<string, unknown> & { job?: Record<string, unknown> }>; job_place: Record<string, unknown>; not_answered?: Record<string, string>; none_apply?: { groups: string[]; why: string } };
export const sampleFamilyFile = (): FamilyFile => JSON.parse(readFileSync(join(STUDIO, "samples", "sample-family-imm5257.json"), "utf8"));

export type SampleCase = { caseId: string | null; release: number | null; people: number; copies: string[]; refused: string[]; copiesRefused: string[];
  /** C10.1 row 11: the record's answers saved, the made-up ones, the record's facts the case did not take, dates of birth saved. */
  fromRecord: number; madeUp: number; notTaken: number; births: number;
  /** C10.1 row 12: the applicants, and how many of them have a generated IMM 5257 copy. */
  applicants: number; imm5257: number;
  /** B99: the Sample file's answers saved, the rows added, the groups said none apply, the sections confirmed, and what was refused. */
  sampleAnswers: number; rows: number; noneApply: number; confirmed: number; answerRefused: string[];
  /** B99 (row 12b): the IMM 5257 copies whose saved validated read-back counts (same facts as the copy validated), and why not. */
  validated: number; validatedWhy: string[] };

/** How long one copy may take before the next is asked for (a fill takes about a second). */
const COPY_WAIT_MS = 60_000;

/** Opens the case, adds the family, and asks for a copy of every form the release files for each person (each copy is
 *  filled from the case's answers, none yet), one at a time: a case holds at most 5 copies waiting or running (review M1),
 *  so the next is asked for only when the last has finished. Each refusal is kept in words; nothing is forced. */
export async function openSampleFamilyCase(db: Db, runtime: Runtime, forms: CaseForms, combinationId: string): Promise<SampleCase> {
  const officer = RUNTIME_ACTORS.find((a) => a.id === "user-O")!;
  const out: SampleCase = { caseId: null, release: null, people: 0, copies: [], refused: [], copiesRefused: [], fromRecord: 0, madeUp: 0, notTaken: 0, births: 0, applicants: 0, imm5257: 0, sampleAnswers: 0, rows: 0, noneApply: 0, confirmed: 0, answerRefused: [], validated: 0, validatedWhy: [] };
  const said = (e: unknown) => String((e as { response?: { detail?: string; message?: string } }).response?.detail ?? (e as { response?: { message?: string } }).response?.message ?? (e as Error).message).slice(0, 200);
  let opened: { id: string; pin?: { release_version?: number }; people?: unknown[] };
  try { opened = await runtime.createCase(officer, { combinationId, reference: SAMPLE_CASE.reference, clientActor: "user-P", principal: { displayName: SAMPLE_CASE.principal }, idempotencyKey: "sample-vv-family-1" }) as typeof opened; }
  catch (e) { out.refused.push(`the case: ${said(e)}`); return out; }
  out.caseId = opened.id; out.release = opened.pin?.release_version ?? null; out.people = 1;
  const subjects: Record<string, string> = { principal: (opened.people as { role: string; subject_id: string }[] | undefined)?.find((x) => x.role === "principal")?.subject_id ?? "", case: (opened.people as { role: string; subject_id: string }[] | undefined)?.find((x) => x.role === "case")?.subject_id ?? "" };
  let n = 1;
  for (const p of SAMPLE_CASE.family) {
    const key = p.record ?? `child-${++n}`;
    try { const added = await runtime.addPerson(officer, opened.id, { role: p.role, displayName: p.displayName, idempotencyKey: `sample-vv-family-1-${key}` }) as { subject_id: string }; subjects[key] = added.subject_id; out.people++; } catch (e) { out.refused.push(`${p.displayName}: ${said(e)}`); }
  }
  // Each person's answers, once: the record's facts first (a fact the release does not ask, or a value its list does not
  // hold, is counted and left), then the made-up Sample facts. Every answer is new, so no earlier answer is named.
  const put = async (subject: string | undefined, field: string, value: unknown) => { if (!subject) return false; try { await runtime.putAnswer(officer, opened.id, subject, field, { value, expectedId: null }); return true; } catch { out.notTaken++; return false; } };
  const fam = sampleFamilyFacts(), file = sampleFamilyFile(), skip = new Set(Object.keys(file.not_answered ?? {}));
  // A fact the Sample file leaves unanswered (the form keeps it only under another answer) is not taken from the record either.
  const recordOf = (pid: string) => fam.facts.filter((f) => f.personId === pid && f.row === null && !skip.has(f.key));
  for (const pid of ["case", "principal", "spouse_or_partner", "child-1"]) for (const f of recordOf(pid)) if (await put(subjects[pid], f.key, f.value)) { out.fromRecord++; if (f.key === "person.date_of_birth") out.births++; }
  const family = recordOf("principal").find((f) => f.key === "person.family_name")?.value ?? "SAMPLE";
  for (const [pid, facts] of Object.entries({ ...MADE_UP, "child-2": [["person.family_name", family], ...MADE_UP["child-2"]] as [string, unknown][] }))
    for (const [k, v] of facts) if (await put(subjects[pid], k, v)) { out.madeUp++; if (k === "person.date_of_birth") out.births++; }
  await answerFromFile(runtime, officer, opened.id, subjects, file, out, said);
  for (const f of (await forms.list(officer, opened.id)).forms.filter((x) => x.applies && x.for_filing)) {
    let copy: { id: string };
    try { copy = await forms.generate(officer, opened.id, f.form, f.subject_id, { idempotencyKey: `sample-vv-family-1-${f.form}-${f.subject_id}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 80) }); }
    catch (e) { out.copiesRefused.push(`${f.form} for ${f.person}: ${said(e)}`); continue; }
    const until = Date.now() + COPY_WAIT_MS;
    let status = "QUEUED";
    while (Date.now() < until && (status === "QUEUED" || status === "RUNNING")) { await new Promise((r) => setTimeout(r, 150)); status = (await db.formInstance.findUnique({ where: { id: copy.id }, select: { status: true } }))?.status ?? "FAILED"; }
    if (status === "GENERATED") { out.copies.push(`${f.form} (${f.person})`); if (f.form === "IMM 5257") out.imm5257++; }
    else out.copiesRefused.push(`${f.form} for ${f.person}: the copy ${status === "FAILED" ? "failed" : "did not finish within a minute"}.`);
  }
  out.applicants = (await forms.list(officer, opened.id)).forms.filter((x) => x.applies && x.for_filing && x.form === "IMM 5257").length;
  // B99 (row 12b): a person's Validate in Adobe, read back on the Mac, counts only for a copy with the same facts.
  const v = await replaySavedReadBacks(db, opened.id, officer.id);
  out.validated = v.written; out.validatedWhy = v.why;
  return out;
}

type View = { sections: { subjectId: string; section: string; group?: { rows: number; none_apply: { id: string } | null } | null;
  questions: { fact: string; answer?: { id?: string; value?: unknown } | null; rows?: { answer?: { id?: string } | null }[] }[] }[] };
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** B99 (C10.1 row 12b; #1123 part 1: the copies were blank, 46 of 46 mandatory fields empty, because nothing was confirmed):
 *  the Sample file's answers saved through the officer's own steps (an answer the record already holds is changed only when
 *  the file says otherwise), one job row per person, "none apply" on every other empty group of a person, then each section
 *  confirmed as the officer saw it. Only then are the copies made, so each copy is filled from confirmed answers. A refusal
 *  is kept in words; nothing is forced. */
async function answerFromFile(runtime: Runtime, officer: (typeof RUNTIME_ACTORS)[number], caseId: string, subjects: Record<string, string>, file: FamilyFile, out: SampleCase, said: (e: unknown) => string) {
  const view = async (mode: "sqr" | "agent" = "agent") => (await runtime.view(officer, caseId, mode)) as unknown as View;
  let v = await view();
  const held = (subject: string, fact: string) => v.sections.filter((x) => x.subjectId === subject).flatMap((x) => x.questions).find((q) => q.fact === fact);
  const put = async (subject: string | undefined, fact: string, value: unknown, row?: string) => {
    if (!subject) return;
    const q = held(subject, fact);
    if (!q) { out.answerRefused.push(`${fact}: not asked by this release`); return; }
    if (!row && sameValue(q.answer?.value, value)) return;
    try { await runtime.putAnswer(officer, caseId, subject, fact, { value, expectedId: row ? null : q.answer?.id ?? null, ...(row ? { row } : {}) }); out.sampleAnswers++; }
    catch (e) { out.answerRefused.push(`${fact}: ${said(e)}`); }
  };
  for (const [k, value] of Object.entries(file.case)) await put(subjects.case, k, value);
  for (const [pid, own] of Object.entries(file.people)) {
    const subject = subjects[pid];
    if (!subject) { out.answerRefused.push(`${pid}: not on the case`); continue; }
    const { job, ...facts } = own;
    for (const [k, value] of Object.entries({ ...file.everyone, ...facts })) await put(subject, k, value);
    if (job) {
      try {
        const { row } = await runtime.addRow(officer, caseId, subject, { group: "employment" }) as { row: string };
        out.rows++;
        for (const [k, value] of Object.entries({ ...job, ...file.job_place })) await put(subject, k, value, row);
      } catch (e) { out.answerRefused.push(`${pid} job: ${said(e)}`); }
    }
  }
  // The repeating groups the Sample file says have none, for each person with no entry: "none apply", as the officer
  // says it on screen (review on #1123, m2: never a group the file does not name).
  v = await view();
  const noneGroups = new Set(file.none_apply?.groups ?? []);
  for (const s of v.sections) {
    if (s.subjectId === subjects.case || !s.group || s.group.rows || s.group.none_apply || !noneGroups.has(s.section)) continue;
    try { await runtime.noneApply(officer, caseId, s.subjectId, s.section, { noneApply: true, expectedId: null }); out.noneApply++; }
    catch (e) { out.answerRefused.push(`${s.section} none apply: ${said(e)}`); }
  }
  // Each section confirmed with the answers the officer's view shows (QA-164: the confirm covers exactly those).
  v = await view();
  for (const s of v.sections) {
    const seen = [...s.questions.flatMap((q) => [q.answer?.id, ...(q.rows ?? []).map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter((x): x is string => !!x);
    if (!seen.length) continue;
    try { await runtime.confirmSection(officer, caseId, s.section, { subjectId: s.subjectId, seen }); out.confirmed++; }
    catch (e) { out.answerRefused.push(`confirm ${s.section}: ${said(e)}`); }
  }
}
