// B99 (C10.1 row 12b): records the Sample family's validated IMM 5257 read-backs for the checkpoint, after a person ran
// the form's own Validate in Adobe on the Mac and each saved file went through the product's upload door (POST
// /api/runtime/form-copies/:id/validated, tools/read_validated.py). Reads the newest read-back that passed for each copy
// from the copy's database and writes samples/validated-imm5257.json (file hash, facts hash, compared values, the form's
// flag and date, source). The PDFs stay on the Mac. Writes nothing, exit 1, unless every applicant's copy has one.
// QA-285: each entry names its file in the local validated folder (STUDIO_VALIDATED_DIR, api/src/sample-validated.ts),
// found there by its checksum, so the checkpoint loader can send it through the upload door again on the Mac.
//   cd prototype/studio && DATABASE_URL=postgresql://xr_studio@127.0.0.1:54329/<db> TSX_TSCONFIG_PATH=api/tsconfig.json \
//     node --import tsx tools/record-validated-samples.ts "<who ran Validate, a role>"
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Db, STUDIO } from "../api/src/core.ts";
import { SAMPLE_CASE } from "../api/src/sample-case.ts";
import { copiesWithHash, VALIDATED_FILE, validatedDir, type SavedReadBack } from "../api/src/sample-validated.ts";

const by = process.argv[2];
if (!by) { console.error("Name who ran Validate, by role (for example: the tech lead, Adobe Acrobat on the Mac)."); process.exit(2); }
const db = new Db();
const c = await db.case.findFirst({ where: { reference: SAMPLE_CASE.reference }, select: { id: true } });
if (!c) { console.error(`No case ${SAMPLE_CASE.reference} in this database.`); process.exit(1); }
const out: SavedReadBack[] = [], missing: string[] = [], dir = validatedDir();
const local = new Map<string, string>();
if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".pdf"))) local.set(createHash("sha256").update(readFileSync(`${dir}/${f}`)).digest("hex"), f);
for (const copy of await copiesWithHash(db, c.id)) {
  const reads = await db.validatedCopy.findMany({ where: { formInstanceId: copy.id }, orderBy: { readAt: "desc" } });
  const passed = reads.find((r) => (r.readBack as { ok?: boolean; validation?: { passed?: boolean } }).ok === true && (r.readBack as { validation?: { passed?: boolean } }).validation?.passed === true);
  if (!passed || passed.factsHash !== copy.snapshot!.inputHash) { missing.push(copy.person); continue; }
  if (!copy.valuesHash) { missing.push(`${copy.person} (its values cannot be read)`); continue; }
  out.push({ person: copy.person, family_facts_hash: copy.familyHash, values_sha256: copy.valuesHash, copy_sha256: copy.sha256!, validated_sha256: passed.sha256, ...(local.has(passed.sha256) ? { file: local.get(passed.sha256) } : {}), read_back: passed.readBack as SavedReadBack["read_back"], read_at: passed.readAt.toISOString(),
    source: `Validate in Adobe by ${by}; read back through the product's upload door and tools/read_validated.py on the Mac. The validated PDF stays on the Mac.` });
}
const applicants = await db.caseParticipant.count({ where: { caseId: c.id, applies: true, role: { in: ["principal", "spouse_or_partner", "child"] } } });
await db.$disconnect();
if (missing.length || out.length !== applicants) { console.error(`Not written: no passed read-back with the copy's current facts for ${missing.join(", ") || `${applicants - out.length} applicant(s)`}.`); process.exit(1); }
writeFileSync(join(STUDIO, VALIDATED_FILE), JSON.stringify({
  label: "Sample: the read-backs of the one Sample family's four IMM 5257 copies, validated in Adobe (B99, C10.1 row 12b). Never a client, never submit. Unconfirmed: expert. Legal: Unconfirmed: no counsel.",
  basis: "Each copy was made by the product from the configured checkpoint, validated with the form's own Validate button in Adobe on the Mac (never simulated), saved, and read back through the product's upload door. The checkpoint loader (api/src/sample-validated.ts) writes a validated_copy row only when a copy's family facts hash and the hash of the values it writes equal the ones here.",
  case_reference: SAMPLE_CASE.reference, form: "IMM 5257",
  copies: out.sort((a, b) => a.person.localeCompare(b.person)) }, null, 1) + "\n");
console.log(JSON.stringify({ written: out.length, file: VALIDATED_FILE, people: out.map((x) => x.person) }));
