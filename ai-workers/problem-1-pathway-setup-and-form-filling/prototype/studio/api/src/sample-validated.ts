// B99 (C10.1 row 12b, P-349): the checkpoint's validated copies. A person ran the form's own Validate in Adobe on the
// four IMM 5257 copies of the fixed Sample family's case, and each saved file went through the product's upload door
// (POST /api/runtime/form-copies/:id/validated, tools/read_validated.py) on the Mac. Their read-backs are kept in
// samples/validated-imm5257.json; the PDFs stay on the Mac (never committed). On every load, a read-back counts for a copy
// only when that copy reads exactly the same confirmed facts as the copy that was validated: the same facts hash, with
// each person named by their Sample name instead of the case's own ids, which are new on every load. Otherwise nothing
// is written and row 12 says why: "validate again". The values the copy writes must be the same too (review on #1123,
// M1: a later engine or release can write other values from the same facts). Never a simulated Validate
// (tools/simulate_validate.py is not used).
// QA-285 (founder ~10:05 IST 6 Nov: "Files stay on the Mac"): the validated PDFs are read from one local folder outside
// git (STUDIO_VALIDATED_DIR, else .tools/solution-1-prototype/validated-imm5257/ in the working copy's root; AGENTS rule
// 1: never committed). A file whose checksum is the saved one is sent through the product's own upload door, which keeps
// it in the copy's storage and records the validated copy (P-322: never a direct validated_copy write), so Download gives
// that file. A file with another checksum is refused in words and never counted. Where the folder or a file is absent
// (GitHub, a fresh machine) nothing is faked: no validated copy is recorded and nothing is written to the copy (a
// generated copy is never changed); the copy's view and row 12 say in words that the validated file is kept on the Mac
// (Sample), read from the saved read-back and the copy's own facts and values each time (keptOnMacWords).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, STUDIO, type Db } from "./core.ts";

export const VALIDATED_FILE = "samples/validated-imm5257.json";
/** QA-285: the env var naming the local folder that holds the validated PDFs (an absolute path: a relative one is read
 *  from each process's own working folder, so the server and a test could read different folders), and its default
 *  (outside git). */
export const VALIDATED_DIR_ENV = "STUDIO_VALIDATED_DIR";
export const validatedDir = (env: NodeJS.ProcessEnv = process.env) => env[VALIDATED_DIR_ENV]?.trim() || join(ROOT, ".tools", "solution-1-prototype", "validated-imm5257");
type Fact = { box: string; fact: string; about: string; row: number | null; value: unknown };
/** One copy's saved read-back, as the upload door recorded it on the Mac. */
export type SavedReadBack = { person: string; family_facts_hash: string; values_sha256: string; copy_sha256: string; validated_sha256: string; file?: string; read_back: { ok: boolean; validation?: { passed?: boolean; flag?: string | null; date_last_validated?: string | null } } & Record<string, unknown>; read_at: string; source: string };
/** case_reference and form: the one Sample case and the form the read-backs belong to (QA-285: the kept-on-the-Mac words
 *  are said only on that case's copies of that form, never on a real case with the same answers). */
type SavedFile = { label: string; basis: string; case_reference?: string; form?: string; copies: SavedReadBack[] };

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

let cached: { at: number; file: SavedFile } | null = null;
/** The saved read-backs (read again when the file changes; a copy's view reads them). */
export const savedReadBacks = (): SavedFile | null => {
  const p = join(STUDIO, VALIDATED_FILE);
  if (!existsSync(p)) return null;
  const at = statSync(p).mtimeMs;
  if (cached?.at !== at) cached = { at, file: JSON.parse(readFileSync(p, "utf8")) as SavedFile };
  return cached.file;
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

/** QA-285: the words a copy and row 12 show when its validated file is not in the local folder (Sample). */
export const KEPT_ON_MAC = "Validated in Adobe on the Mac and read back equal (Sample): the validated file is kept on the Mac, not in these working files";

/** QA-285: the saved read-back's validated file in the local folder, checked against its saved checksum before it is
 *  used. "absent": no folder, no file named, or no such file; "refused": a file whose checksum differs (never used). */
export function localValidatedFile(dir: string, s: Pick<SavedReadBack, "person" | "file" | "validated_sha256">): { kind: "found"; bytes: Buffer; name: string } | { kind: "absent" } | { kind: "refused"; words: string } {
  const name = s.file?.trim();
  // Only a plain file name inside the folder (never a path out of it).
  if (!name || name !== name.replace(/^.*[\\/]/, "") || name.startsWith(".") || !existsSync(dir)) return { kind: "absent" };
  if (!readdirSync(dir).includes(name)) return { kind: "absent" };
  const bytes = readFileSync(join(dir, name)), sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== s.validated_sha256) return { kind: "refused", words: `${s.person}: the file ${name} in the validated folder is not the file that was validated in Adobe (its checksum is ${sha.slice(0, 12)}…, the saved one ${s.validated_sha256.slice(0, 12)}…), so it is not used and the copy is not counted as validated.` };
  return { kind: "found", bytes, name };
}

/** QA-285: for a copy with no validated copy read back here, the words that its validated file is kept on the Mac
 *  (Sample), only on the Sample case's copies of the saved form (its case reference and form, from the saved file) and
 *  only when the saved read-back is this copy's (it passed the form's own Validate; the same family facts and
 *  the same written values, as the loader checks) and the local folder has no file for it. Read when the copy is shown
 *  (fill-case.ts copyOf and file): nothing is stored, and a copy with other answers or values never gets the words. */
export function keptOnMacWords(copy: { subjectId: string; formNumber: string; path: string | null; snapshot: { factsJson: unknown } | null }, caseReference: string, nameOf: (about: string) => string, dir = validatedDir(), saved = savedReadBacks()): string | null {
  // Only the Sample case's copies of the form the saved file names (both read from the saved file, never assumed).
  if (!saved?.case_reference || !saved.form || caseReference !== saved.case_reference || copy.formNumber !== saved.form) return null;
  const person = nameOf(copy.subjectId), s = saved.copies.find((x) => x.person === person);
  if (!s || s.read_back?.ok !== true || s.read_back?.validation?.passed !== true) return null;
  if (s.family_facts_hash !== familyFactsHash(((copy.snapshot?.factsJson as { facts?: Fact[] } | null)?.facts ?? []), nameOf)) return null;
  const values = valuesHash(copy.path);
  if (!values || values !== s.values_sha256) return null;
  return localValidatedFile(dir, s).kind === "absent" ? KEPT_ON_MAC : null;
}

/** A refusal's words (an HttpException's detail or message, else the error's message). */
const wordsOf = (e: unknown) => { const r = (e as { getResponse?: () => unknown }).getResponse?.(); return typeof r === "string" ? r : (r as { detail?: string; message?: string } | undefined)?.detail ?? (r as { message?: string } | undefined)?.message ?? (e as Error).message; };

/** The upload door (CaseForms.validated, POST /api/runtime/form-copies/:id/validated), as the loader sends a file to it. */
export type UploadDoor = (copyId: string, file: { originalname: string; buffer: Buffer }) => Promise<unknown>;

/** For each copy whose saved read-back passed the form's own Validate and whose facts and values are the ones that were
 *  validated: its validated file from the local folder, checked, through the upload door (QA-285); without the file, the
 *  copy says in words that the file is kept on the Mac. Returns how many were read back, how many are kept on the Mac,
 *  and, in words, why the others count for neither. */
export async function replaySavedReadBacks(db: Db, caseId: string, upload: UploadDoor, dir = validatedDir(), saved = savedReadBacks()): Promise<{ written: number; keptOnMac: number; why: string[] }> {
  if (!saved) return { written: 0, keptOnMac: 0, why: [`No validated copy is saved yet (${VALIDATED_FILE}): Validate each copy in Adobe on the Mac and read it back through the case's Forms tab.`] };
  let written = 0, keptOnMac = 0; const why: string[] = [];
  for (const c of await copiesWithHash(db, caseId)) {
    const s = saved.copies.find((x) => x.person === c.person);
    if (!s) { why.push(`${c.person}: no validated copy is saved for this person.`); continue; }
    if (s.read_back?.ok !== true || s.read_back?.validation?.passed !== true) { why.push(`${c.person}: the saved read-back did not pass the form's own Validate.`); continue; }
    if (s.family_facts_hash !== c.familyHash) { why.push(`${c.person}: this copy reads different answers from the copy that was validated, so its Validate does not count: validate this copy again.`); continue; }
    if (!c.valuesHash || s.values_sha256 !== c.valuesHash) { why.push(`${c.person}: this copy writes different values from the copy that was validated (the same answers, filled by another release or rule), so its Validate does not count: validate this copy again.`); continue; }
    const f = localValidatedFile(dir, s);
    if (f.kind === "refused") { why.push(f.words); continue; }
    // Nothing is written for it (a generated copy is never changed); the copy's own view says so (keptOnMacWords).
    if (f.kind === "absent") { keptOnMac++; continue; }
    try { await upload(c.id, { originalname: f.name, buffer: f.bytes }); written++; }
    catch (e) { why.push(`${c.person}: the upload door refused ${f.name}: ${wordsOf(e)}`); }
  }
  return { written, keptOnMac, why };
}
