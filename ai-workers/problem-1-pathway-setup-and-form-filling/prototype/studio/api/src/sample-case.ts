// QA-231 (P-67, DEMO.md row 11): a combination's Sample case, opened on its newest release through the case officer's own
// steps (Runtime.createCase, addPerson, CaseForms.generate), as a person opens one on Cases. The demo story's (the
// configured checkpoint's row 11) is the family case; a new edition held later (row 17) then shows open cases staying on
// the release they started on. The people are made up (Sample); nothing is filed, no AI (US$0).
// C10.1 rows 11–12 (#1009, Lead 9's and Lead 10's rulings): each case is answered once from its Sample record before the
// copies are made, so the application form is filled for each applicant from the case's answers.
// BK-12 (P-448, P-452; Bake plan row 26): WHICH Sample case a combination opens (its reference, people, record, made-up
// facts, answers file and saved read-backs) is data, samples/sample-cases.json, by combination key; the form whose copies
// are counted is the combination's application form (samples/form-setup.json). This file names no combination and no
// form, so a pathway gets its own Sample case by data alone (P-449).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sampleFamilyFacts } from "../../engine/import.ts";
import { FIRM_RECORD } from "../../engine/runtime/team.ts";
import { RUNTIME_ACTORS, STUDIO, type Db } from "./core.ts";
import type { CaseForms } from "./fill-case.ts";
import { FORM_SETUP } from "./form-setup.ts";
import type { Runtime } from "./runtime.ts";
import { replaySavedReadBacks, savedReadBacks } from "./sample-validated.ts";

/** One combination's Sample case as samples/sample-cases.json gives it (its "about" says what each field means). */
export type SampleCaseData = { reference: string; principal: string; people: { id: string; role: string; displayName: string }[]; answers: string;
  record?: string[]; made_up?: Record<string, Record<string, unknown>>; family_name_from_principal?: string[]; validated?: string };
export type SampleCases = { story: string; cases: Record<string, SampleCaseData> };
export const SAMPLE_CASES_FILE = join(STUDIO, "samples", "sample-cases.json");
const KNOWN = new Set(["about", "reference", "principal", "people", "answers", "record", "made_up", "family_name_from_principal", "validated"]);
/** BK-12: the Sample cases from one data file (exported, pure, so a test reads a changed copy). Refuses, naming the
 *  combination, an entry without its reference, principal or answers file, a person without an id, a role or a name, an
 *  id given twice or named by the made-up facts but on no one, an unknown field, two cases with one reference, and a
 *  story that names no case. */
export function sampleCasesFrom(file = SAMPLE_CASES_FILE): SampleCases {
  const d = JSON.parse(readFileSync(file, "utf8")) as { story?: unknown; cases?: Record<string, SampleCaseData & Record<string, unknown>> };
  const problems: string[] = [];
  const cases = d.cases && typeof d.cases === "object" ? d.cases : {};
  const refs = new Map<string, string>();
  for (const [key, c] of Object.entries(cases)) {
    const say = (p: string) => problems.push(`${key}: ${p}`);
    for (const f of Object.keys(c)) if (!KNOWN.has(f)) say(`"${f}" is not a known name`);
    for (const f of ["reference", "principal", "answers"] as const) if (typeof c[f] !== "string" || !c[f].trim()) say(`needs its ${f}`);
    if (typeof c.reference === "string") { if (refs.has(c.reference)) say(`reference ${c.reference} is also ${refs.get(c.reference)}'s`); refs.set(c.reference, key); }
    if (!Array.isArray(c.people)) say("needs its people (an empty list for a principal alone)");
    const ids = ["case", "principal", ...(Array.isArray(c.people) ? c.people : []).map((p) => p?.id)];
    for (const p of Array.isArray(c.people) ? c.people : []) if (!p?.id || !p.role || !p.displayName) say("each person needs an id, a role and a displayName");
    if (new Set(ids).size !== ids.length) say("a person's id is given twice");
    for (const id of [...(c.record ?? []), ...Object.keys(c.made_up ?? {}), ...(c.family_name_from_principal ?? [])]) if (!ids.includes(id)) say(`${id} is on no one of this case`);
  }
  if (typeof d.story !== "string" || !cases[d.story]) problems.push(`story: ${JSON.stringify(d.story ?? null)} names no case of this file`);
  if (problems.length) throw new Error(`samples/sample-cases.json: ${problems.join("; ")}`);
  return { story: d.story as string, cases };
}
export const SAMPLE_CASES = sampleCasesFrom();
/** The demo story's Sample case (DEMO.md rows 11–12): the one the data's "story" names. */
export const SAMPLE_CASE = SAMPLE_CASES.cases[SAMPLE_CASES.story];

// B99 (C10.1 row 12b): a case's answers file (Sample, Unconfirmed: expert), so every copy carries values.
type FamilyFile = { case: Record<string, unknown>; everyone: Record<string, unknown>; people: Record<string, Record<string, unknown> & { job?: Record<string, unknown> }>; job_place?: Record<string, unknown>; not_answered?: Record<string, string>; none_apply?: { groups: string[]; why: string } };
export const sampleAnswersFile = (name: string): FamilyFile => JSON.parse(readFileSync(join(STUDIO, "samples", name), "utf8"));
/** The demo story's answers file (sample-family-imm5257.json today). */
export const sampleFamilyFile = (): FamilyFile => sampleAnswersFile(SAMPLE_CASE.answers);

export type SampleCase = { caseId: string | null; release: number | null; people: number; copies: string[]; refused: string[]; copiesRefused: string[];
  /** BK-12: the combination's key, the reference its data gives (null when it gives none) and its application form. */
  combination: string | null; reference: string | null; applicationForm: string | null;
  /** C10.1 row 11: the record's answers saved, the made-up ones, the record's facts the case did not take, dates of birth saved. */
  fromRecord: number; madeUp: number; notTaken: number; births: number;
  /** C10.1 row 12: the applicants, and how many of them have a generated copy of the application form. */
  applicants: number; applicationCopies: number;
  /** B99: the Sample file's answers saved, the rows added, the groups said none apply, the sections confirmed, and what was refused. */
  sampleAnswers: number; rows: number; noneApply: number; confirmed: number; answerRefused: string[];
  /** C6.18: the background answers the client re-confirmed (the officer entered them from the record). */
  reconfirmed: number;
  /** B99 (row 12b): the copies whose saved validated read-back counts (same facts as the copy validated), and why not. */
  validated: number; validatedWhy: string[];
  /** QA-285: the copies whose saved read-back counts but whose validated file is not in the local folder (kept on the Mac). */
  validatedKeptOnMac: number };

/** How long one copy may take before the next is asked for (a fill takes about a second). */
const COPY_WAIT_MS = 60_000;

/** BK-12: the words when a combination's data gives no Sample case. */
export const NO_SAMPLE_CASE = (label: string) => `No Sample case is set for ${label}: samples/sample-cases.json names none for it (a Sample case is added there, as data).`;

/** Opens the combination's Sample case as its data gives it (samples/sample-cases.json, by its key), adds its people,
 *  and asks for a copy of every form the release files for each person (each copy is filled from the case's answers,
 *  none yet), one at a time: a case holds at most 5 copies waiting or running (review M1), so the next is asked for only
 *  when the last has finished. Each refusal is kept in words; nothing is forced. Loading twice opens the same case (each
 *  step's idempotency key starts with the reference). `cases`: the data (a test passes a changed copy). */
export async function openSampleCase(db: Db, runtime: Runtime, forms: CaseForms, combinationId: string, cases: SampleCases = SAMPLE_CASES): Promise<SampleCase> {
  const officer = RUNTIME_ACTORS.find((a) => a.id === "user-O")!;
  const out: SampleCase = { caseId: null, release: null, people: 0, copies: [], refused: [], copiesRefused: [], combination: null, reference: null, applicationForm: null, fromRecord: 0, madeUp: 0, notTaken: 0, births: 0, applicants: 0, applicationCopies: 0, sampleAnswers: 0, rows: 0, noneApply: 0, confirmed: 0, answerRefused: [], reconfirmed: 0, validated: 0, validatedWhy: [], validatedKeptOnMac: 0 };
  const said = (e: unknown) => String((e as { response?: { detail?: string; message?: string } }).response?.detail ?? (e as { response?: { message?: string } }).response?.message ?? (e as Error).message).slice(0, 200);
  const comb = await db.combination.findUnique({ where: { id: combinationId }, select: { combinationKey: true, label: true } });
  if (!comb) { out.refused.push("the case: no such combination."); return out; }
  out.combination = comb.combinationKey;
  const sample = cases.cases[comb.combinationKey];
  if (!sample) { out.refused.push(`the case: ${NO_SAMPLE_CASE(comb.label)}`); return out; }
  out.reference = sample.reference; out.applicationForm = FORM_SETUP[comb.combinationKey]?.application ?? null;
  const once = sample.reference.toLowerCase();
  let opened: { id: string; pin?: { release_version?: number }; people?: unknown[] };
  try { opened = await runtime.createCase(officer, { combinationId, reference: sample.reference, clientActor: "user-P", principal: { displayName: sample.principal }, idempotencyKey: once }) as typeof opened; }
  catch (e) { out.refused.push(`the case: ${said(e)}`); return out; }
  out.caseId = opened.id; out.release = opened.pin?.release_version ?? null; out.people = 1;
  const subjects: Record<string, string> = { principal: (opened.people as { role: string; subject_id: string }[] | undefined)?.find((x) => x.role === "principal")?.subject_id ?? "", case: (opened.people as { role: string; subject_id: string }[] | undefined)?.find((x) => x.role === "case")?.subject_id ?? "" };
  for (const p of sample.people) {
    try { const added = await runtime.addPerson(officer, opened.id, { role: p.role, displayName: p.displayName, idempotencyKey: `${once}-${p.id}` }) as { subject_id: string }; subjects[p.id] = added.subject_id; out.people++; } catch (e) { out.refused.push(`${p.displayName}: ${said(e)}`); }
  }
  // Each person's answers, once: the record's facts first (a fact the release does not ask, or a value its list does not
  // hold, is counted and left), then the made-up Sample facts. Every answer is new, so no earlier answer is named.
  const put = async (subject: string | undefined, field: string, value: unknown) => { if (!subject) return false; try { await runtime.putAnswer(officer, opened.id, subject, field, { value, expectedId: null }); return true; } catch { out.notTaken++; return false; } };
  const file = sampleAnswersFile(sample.answers), skip = new Set(Object.keys(file.not_answered ?? {}));
  const fam = sample.record?.length || sample.family_name_from_principal?.length ? sampleFamilyFacts() : { facts: [] };
  // A fact the Sample file leaves unanswered (the form keeps it only under another answer) is not taken from the record either.
  const recordOf = (pid: string) => fam.facts.filter((f) => f.personId === pid && f.row === null && !skip.has(f.key));
  for (const pid of sample.record ?? []) for (const f of recordOf(pid)) if (await put(subjects[pid], f.key, f.value)) { out.fromRecord++; if (f.key === "person.date_of_birth") out.births++; }
  const family = recordOf("principal").find((f) => f.key === "person.family_name")?.value ?? "SAMPLE";
  const madeUp: Record<string, [string, unknown][]> = Object.fromEntries(Object.entries(sample.made_up ?? {}).map(([pid, facts]) => [pid, Object.entries(facts)]));
  for (const pid of sample.family_name_from_principal ?? []) madeUp[pid] = [["person.family_name", family], ...(madeUp[pid] ?? [])];
  for (const [pid, facts] of Object.entries(madeUp))
    for (const [k, v] of facts) if (await put(subjects[pid], k, v)) { out.madeUp++; if (k === "person.date_of_birth") out.births++; }
  await answerFromFile(runtime, officer, opened.id, subjects, file, out, said);
  // QA-246: every form the release files, those whose rule still waits for an answer included, as before (the checkpoint's
  // copies are unchanged; C9.5's later Sample release refits one of them, IMM 5475).
  for (const f of (await forms.list(officer, opened.id, { includeWaiting: true })).forms.filter((x) => x.applies && x.for_filing)) {
    let copy: { id: string };
    try { copy = await forms.generate(officer, opened.id, f.form, f.subject_id, { idempotencyKey: `${once}-${f.form}-${f.subject_id}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 80) }); }
    catch (e) { out.copiesRefused.push(`${f.form} for ${f.person}: ${said(e)}`); continue; }
    const until = Date.now() + COPY_WAIT_MS;
    let status = "QUEUED";
    while (Date.now() < until && (status === "QUEUED" || status === "RUNNING")) { await new Promise((r) => setTimeout(r, 150)); status = (await db.formInstance.findUnique({ where: { id: copy.id }, select: { status: true } }))?.status ?? "FAILED"; }
    if (status === "GENERATED") { out.copies.push(`${f.form} (${f.person})`); if (f.form === out.applicationForm) out.applicationCopies++; }
    else out.copiesRefused.push(`${f.form} for ${f.person}: the copy ${status === "FAILED" ? "failed" : "did not finish within a minute"}.`);
  }
  out.applicants = (await forms.list(officer, opened.id)).forms.filter((x) => x.applies && x.for_filing && x.form === out.applicationForm).length;
  // B99 (row 12b): a person's Validate in Adobe, read back on the Mac, counts only for a copy with the same facts; only a
  // case whose data names its saved read-backs has any. QA-285: each validated file from the local folder goes through
  // the product's own upload door, as the officer sends it.
  if (sample.validated) {
    const v = await replaySavedReadBacks(db, opened.id, (copyId, file) => forms.validated(officer, copyId, [file]), undefined, savedReadBacks(sample.validated));
    out.validated = v.written; out.validatedKeptOnMac = v.keptOnMac; out.validatedWhy = v.why;
  }
  return out;
}

type View = { sections: { subjectId: string; section: string; group?: { rows: number; none_apply: { id: string } | null } | null;
  questions: { fact: string; answer?: { id?: string; value?: unknown; channel?: string; awaits_client?: boolean } | null; rows?: { answer?: { id?: string; awaits_client?: boolean } | null }[] }[] }[] };
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
  // C6.18 (P-244): the record's background answers, entered here by the officer, are the client's: the client re-confirms
  // each on their questionnaire (Client A, the case's client), as a person does, before the officer confirms the sections.
  const client = RUNTIME_ACTORS.find((a) => a.id === "user-P");
  v = await view();
  for (const a of v.sections.flatMap((s) => s.questions.flatMap((q) => [q.answer, ...(q.rows ?? []).map((r) => r.answer)]))) {
    if (!a?.awaits_client || !a.id || !client) continue;
    try { await runtime.reconfirm(client, caseId, a.id); out.reconfirmed++; }
    catch (e) { out.answerRefused.push(`re-confirm ${a.id}: ${said(e)}`); }
  }
  // Each section confirmed with the answers the officer's view shows (QA-164: the confirm covers exactly those). As the
  // screen does (questionnaire.tsx, `seen`), never an answer the firm record gives (C6.11: "Uses a representative" from the
  // case team; its id is not an answer's, so confirm refuses it and the section's other answers would stay unconfirmed).
  v = await view();
  for (const s of v.sections) {
    const seen = [...s.questions.flatMap((q) => [q.answer?.channel === FIRM_RECORD ? undefined : q.answer?.id, ...(q.rows ?? []).map((r) => r.answer?.id)]), s.group?.none_apply?.id].filter((x): x is string => !!x);
    if (!seen.length) continue;
    try { await runtime.confirmSection(officer, caseId, s.section, { subjectId: s.subjectId, seen }); out.confirmed++; }
    catch (e) { out.answerRefused.push(`confirm ${s.section}: ${said(e)}`); }
  }
}
