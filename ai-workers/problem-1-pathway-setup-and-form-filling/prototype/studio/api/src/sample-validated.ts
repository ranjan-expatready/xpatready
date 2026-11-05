// B99 (C10.1 row 12b, P-349): the checkpoint's validated copies. A person ran the form's own Validate in Adobe on the
// four IMM 5257 copies of the fixed Sample family's case, and each saved file went through the product's upload door
// (POST /api/runtime/form-copies/:id/validated, tools/read_validated.py) on the Mac. Their read-backs are kept in
// samples/validated-imm5257.json; the PDFs stay on the Mac (never committed). On every load, a read-back counts for a copy
// only when that copy reads exactly the same confirmed facts as the copy that was validated: the same facts hash, with
// each person named by their Sample name instead of the case's own ids, which are new on every load. Otherwise nothing
// is written and row 12 says why: "validate again". The values the copy writes must be the same too (review on #1123,
// M1: a later engine or release can write other values from the same facts). Never a simulated Validate
// (tools/simulate_validate.py is not used).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, STUDIO, type Db } from "./core.ts";

export const VALIDATED_FILE = "samples/validated-imm5257.json";
type Fact = { box: string; fact: string; about: string; row: number | null; value: unknown };
/** One copy's saved read-back, as the upload door recorded it on the Mac. */
export type SavedReadBack = { person: string; family_facts_hash: string; values_sha256: string; copy_sha256: string; validated_sha256: string; read_back: { ok: boolean; validation?: { passed?: boolean; flag?: string | null; date_last_validated?: string | null } } & Record<string, unknown>; read_at: string; source: string };
type SavedFile = { label: string; basis: string; copies: SavedReadBack[] };

/** The facts hash of a copy with each person named by their name on the case (engine/runtime/forms.ts inputHash, the
 *  same order and fields), so the same family's same answers give the same hash on every load. */
export function familyFactsHash(facts: Fact[], nameOf: (about: string) => string): string {
  const sorted = [...facts].sort((a, b) => a.box.localeCompare(b.box)).map((f) => [f.box, f.fact, nameOf(f.about), f.row, f.value]);
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

/** The values a copy writes (its .request.json, form field → value), hashed in form-field order. Null when unreadable. */
export function valuesHash(copyPath: string | null | undefined): string | null {
  if (!copyPath) return null;
  try {
    const values = (JSON.parse(readFileSync(join(ROOT, copyPath.replace(/\.pdf$/, ".request.json")), "utf8")) as { values?: Record<string, string> }).values;
    if (!values) return null;
    return createHash("sha256").update(JSON.stringify(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
  } catch { return null; }
}

export const savedReadBacks = (): SavedFile | null => {
  const p = join(STUDIO, VALIDATED_FILE);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) as SavedFile : null;
};

/** The case's IMM 5257 copies with their family facts hash, for the person who records the read-backs and for the loader. */
export async function copiesWithHash(db: Db, caseId: string) {
  const people = await db.caseParticipant.findMany({ where: { caseId }, select: { subjectId: true, subject: { select: { label: true } } } });
  const nameOf = (about: string) => about === "case" ? "case" : people.find((p) => p.subjectId === about)?.subject.label ?? about;
  const copies = await db.formInstance.findMany({ where: { caseId, formNumber: "IMM 5257", status: "GENERATED" }, orderBy: { createdAt: "desc" }, select: { id: true, workspaceId: true, subjectId: true, sha256: true, path: true, snapshot: { select: { inputHash: true, factsJson: true } } } });
  const newest = new Map<string, (typeof copies)[number]>();
  for (const c of copies) if (!newest.has(c.subjectId)) newest.set(c.subjectId, c);
  return [...newest.values()].map((c) => ({ ...c, person: nameOf(c.subjectId), familyHash: familyFactsHash(((c.snapshot?.factsJson as { facts?: Fact[] } | null)?.facts ?? []), nameOf), valuesHash: valuesHash(c.path) }));
}

/** Writes a validated_copy row for each copy whose saved read-back passed the form's own Validate and whose facts are the
 *  ones that were validated. Returns how many were written and, in words, why the others were not. */
export async function replaySavedReadBacks(db: Db, caseId: string, readBy: string): Promise<{ written: number; why: string[] }> {
  const saved = savedReadBacks();
  if (!saved) return { written: 0, why: [`No validated copy is saved yet (${VALIDATED_FILE}): Validate each copy in Adobe on the Mac and read it back through the case's Forms tab.`] };
  let written = 0; const why: string[] = [];
  for (const c of await copiesWithHash(db, caseId)) {
    const s = saved.copies.find((x) => x.person === c.person);
    if (!s) { why.push(`${c.person}: no validated copy is saved for this person.`); continue; }
    if (s.read_back?.ok !== true || s.read_back?.validation?.passed !== true) { why.push(`${c.person}: the saved read-back did not pass the form's own Validate.`); continue; }
    if (s.family_facts_hash !== c.familyHash) { why.push(`${c.person}: this copy reads different answers from the copy that was validated, so its Validate does not count: validate this copy again.`); continue; }
    if (!c.valuesHash || s.values_sha256 !== c.valuesHash) { why.push(`${c.person}: this copy writes different values from the copy that was validated (the same answers, filled by another release or rule), so its Validate does not count: validate this copy again.`); continue; }
    await db.validatedCopy.create({ data: { workspaceId: c.workspaceId, formInstanceId: c.id, path: `${VALIDATED_FILE} (the validated PDF stays on the Mac)`, sha256: s.validated_sha256, factsHash: c.snapshot!.inputHash, readBack: { ...s.read_back, source: s.source, read_at: s.read_at } as object, readBy } });
    written++;
  }
  return { written, why };
}
