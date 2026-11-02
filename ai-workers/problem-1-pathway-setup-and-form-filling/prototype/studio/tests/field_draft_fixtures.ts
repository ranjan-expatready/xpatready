// Saved readings of the "Draft fields" step (api/src/field-drafts.ts) written for a check into p2/runs, exactly as the
// recording pass would save them (same job prefix, prompt checksum, inputs and edition key), and removed after. US$0.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { editionKey, FIELD_MAP_EDITION, type EditionSource, type FieldMapOutput } from "../api/src/field-drafts.ts";
import { RUNS } from "../api/src/rounds.ts";
import { jobIdFor } from "../engine/rounds.ts";

const PROMPTS = join(import.meta.dirname, "..", "..", "p2", "prompts");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
type F = FieldMapOutput["canonical_fields"][number];

/** A field map answer naming `edition`: each field with one box whose printed words the AI quoted. */
export const fieldMap = (edition: string, fields: F[], quotes: Record<string, string>): FieldMapOutput => ({ form_edition: edition, canonical_fields: fields,
  entries: fields.map((f, n) => ({ data_path: `form1[0].Page1[0].Box${n}[0]`, outcome: "mapped" as const, person: "form_subject", row: null, fact: f.id, transform: "as_is", condition: null, confidence: "high", unresolved_reason: null, evidence_quote: quotes[f.id] ?? "" })) });

/** Writes saved readings; `clear()` removes every file it wrote. */
export function savedReadings(tag: string) {
  const written: string[] = [];
  return {
    save(e: EditionSource, isCheck: boolean, o: FieldMapOutput, n: number) {
      const file = `${jobIdFor(FIELD_MAP_EDITION.jobBase, isCheck, e.printed, `${tag}-${n}`)}-live-2099010${n}t000000000z-${tag}.json`;
      writeFileSync(join(RUNS, file), JSON.stringify({ caller: "live", contract_valid: true, raw_output: JSON.stringify(o),
        drafting_run: { status: "completed", usage: { cost_usd: 0.3 }, inputs: { combination: editionKey(e), official_files: [{ file: e.inventory, sha256: e.inventorySha256 }] } },
        launch_evidence: { template_sha256: sha(readFileSync(join(PROMPTS, isCheck ? FIELD_MAP_EDITION.check : FIELD_MAP_EDITION.template))), known: { form_edition: e.printed } } }));
      written.push(file);
    },
    clear() { for (const f of written.splice(0)) rmSync(join(RUNS, f), { force: true }); },
  };
}
