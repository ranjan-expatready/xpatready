// BK-12 (P-448, P-452; Bake plan row 26): which Sample case each combination opens, read from one data file,
// samples/sample-cases.json, by combination key (its "about" says what each field means). Pure: it reads files only and
// never loads core.ts, so a test reads it (and a changed copy of the data) without a server. api/src/sample-case.ts opens
// the case; this file names no combination and no form.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, "..", "..");
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
export type FamilyFile = { case: Record<string, unknown>; everyone: Record<string, unknown>; people: Record<string, Record<string, unknown> & { job?: Record<string, unknown> }>; job_place?: Record<string, unknown>; not_answered?: Record<string, string>; none_apply?: { groups: string[]; why: string } };
export const sampleAnswersFile = (name: string): FamilyFile => JSON.parse(readFileSync(join(STUDIO, "samples", name), "utf8"));
