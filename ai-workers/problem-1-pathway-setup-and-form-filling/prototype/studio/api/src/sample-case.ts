// QA-231 (P-67, DEMO.md row 11): the configured checkpoint's Sample family case on the Visitor visa's release 1, opened
// through the case officer's own steps (Runtime.createCase, addPerson, CaseForms.generate), as a person opens one on
// Cases. A new edition held later (row 17) then shows open cases staying on the release they started on. The people are
// made up (Client A's family of expected/p5-case-c1.json, Sample); nobody answers anything, nothing is filed, no AI (US$0).
import { RUNTIME_ACTORS } from "./core.ts";
import type { CaseForms } from "./fill-case.ts";
import type { Runtime } from "./runtime.ts";

// The people of the one Sample family (engine/import.ts sampleFamilyFacts), each labelled Sample.
export const SAMPLE_CASE = { reference: "SAMPLE-VV-FAMILY-1", principal: "Client A (Sample)", family: [{ role: "spouse_or_partner", displayName: "Partner (Sample)" }, { role: "child", displayName: "Child (Sample)" }] };

export type SampleCase = { caseId: string | null; release: number | null; people: number; copies: string[]; refused: string[] };

/** Opens the case, adds the family, and asks for a copy of every form the release files for each person (each copy is
 *  filled from the case's answers, none yet). Each refusal is kept in words; nothing is forced. */
export async function openSampleFamilyCase(runtime: Runtime, forms: CaseForms, combinationId: string): Promise<SampleCase> {
  const officer = RUNTIME_ACTORS.find((a) => a.id === "user-O")!;
  const out: SampleCase = { caseId: null, release: null, people: 0, copies: [], refused: [] };
  const said = (e: unknown) => String((e as { response?: { detail?: string; message?: string } }).response?.detail ?? (e as { response?: { message?: string } }).response?.message ?? (e as Error).message).slice(0, 200);
  let opened: { id: string; pin?: { release_version?: number }; people?: unknown[] };
  try { opened = await runtime.createCase(officer, { combinationId, reference: SAMPLE_CASE.reference, clientActor: "user-P", principal: { displayName: SAMPLE_CASE.principal }, idempotencyKey: "sample-vv-family-1" }) as typeof opened; }
  catch (e) { out.refused.push(`the case: ${said(e)}`); return out; }
  out.caseId = opened.id; out.release = opened.pin?.release_version ?? null; out.people = 1;
  for (const p of SAMPLE_CASE.family) {
    try { await runtime.addPerson(officer, opened.id, { ...p, idempotencyKey: `sample-vv-family-1-${p.role}` }); out.people++; } catch (e) { out.refused.push(`${p.displayName}: ${said(e)}`); }
  }
  for (const f of (await forms.list(officer, opened.id)).forms.filter((x) => x.applies && x.for_filing)) {
    try { await forms.generate(officer, opened.id, f.form, f.subject_id, { idempotencyKey: `sample-vv-family-1-${f.form}-${f.subject_id}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 80) }); out.copies.push(`${f.form} (${f.person})`); }
    catch (e) { out.refused.push(`${f.form} for ${f.person}: ${said(e)}`); }
  }
  return out;
}
