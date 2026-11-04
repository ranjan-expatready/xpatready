// Re-applies the current field-map conversion (p2/convert.ts) to a stored live model output, with no new
// model call. The output must still match the hash its launcher recorded; the original run record is kept
// unchanged and the result is written beside it as <name>.reconverted.json, naming what changed.
//   node p2/reconvert.ts p2/runs/<run>.json [...]
// The studio calls reconvertFile for "Use the saved AI answer (no cost)" on a run that failed an earlier check.
import { Ajv } from "ajv";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { convertFieldMap } from "./convert.ts";
import { PROTOTYPE } from "./policy.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const ajv = new Ajv({ allErrors: true, strict: false });
for (const s of ["field-map-entry", "drafting-run"]) ajv.addSchema(JSON.parse(readFileSync(join(PROTOTYPE, "contracts", `${s}.v0.schema.json`), "utf8")));
const contract = ajv.getSchema("https://expatready.local/contracts/drafting-run.v0.json")!;

export type Reconverted = { file: string; dest?: string; valid: boolean; skipped?: string; status?: string; needs_person?: number; weak_evidence?: number; edition_note?: unknown };

export function reconvertFile(file: string): Reconverted {
  const bytes = readFileSync(file);
  const env = JSON.parse(bytes.toString("utf8"));
  if (env.caller !== "live" || env.drafting_run?.kind !== "field_map" || !env.raw_output) return { file, valid: false, skipped: "not a live field-map run with an answer" };
  if (sha(Buffer.from(env.raw_output, "utf8")) !== env.launch_evidence.output_sha256) return { file, valid: false, skipped: "output differs from its recorded hash; refused" };
  // QA-207: the edition the first conversion stamped (a previous edition's printed edition is not in the manifest).
  const c = convertFieldMap(JSON.parse(env.raw_output), env.drafting_run.inputs.official_files[0].file, env.drafting_run.entries?.[0]?.form_edition);
  const run = { ...env.drafting_run, entries: c.entries, status: c.status };
  const valid = contract(run) as boolean;
  const out = {
    ...env, drafting_run: run, contract_valid: valid, contract_errors: valid ? null : contract.errors,
    conversion: { weak_evidence: c.weak_evidence, edition_note: c.edition_note, needs_person: c.needs_person, set_aside_fields: c.set_aside_fields },
    reconverted: { from_file: file.split("/").pop(), from_sha256: sha(bytes), at: new Date().toISOString(), by: "p2/reconvert.ts with p2/convert.ts", convert_sha256: sha(readFileSync(join(PROTOTYPE, "p2", "convert.ts"))), fact_key_sha256: sha(readFileSync(join(PROTOTYPE, "contracts", "fact-key.ts"))), model_call: false },
  };
  const dest = file.replace(/\.json$/, ".reconverted.json");
  writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
  return { file, dest, valid, status: c.status, needs_person: c.needs_person.length, weak_evidence: c.weak_evidence.length, edition_note: c.edition_note };
}

if (import.meta.main) {
  let failed = 0;
  for (const file of process.argv.slice(2)) {
    const r = reconvertFile(file);
    if (r.skipped) { console.log(`${file}: ${r.skipped}`); if (r.skipped.includes("refused")) failed++; continue; }
    const note = r.edition_note as { manifest: string; drafted: string } | null;
    console.log(`${r.dest!.split("/").pop()}: contract ${r.valid}, status ${r.status}, needs a person ${r.needs_person}, weak evidence ${r.weak_evidence}, edition ${note ? `manifest ${note.manifest} / drafted "${String(note.drafted).slice(0, 40)}"` : "agrees"}`);
    if (!r.valid) failed++;
  }
  process.exit(failed ? 1 : 0);
}
