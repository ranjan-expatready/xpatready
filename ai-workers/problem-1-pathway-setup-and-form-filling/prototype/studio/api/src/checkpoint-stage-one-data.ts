// B104 (P-351): the configured checkpoint's J7 Stage 1 data (samples/checkpoint-stage-one.json, P-319) and its guard, read
// by api/src/checkpoint-stage-one.ts and by tests/check_b104_stage_one.ts. No decorators and no Nest imports, on purpose
// (as form-setup.ts), so an offline test can read it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IRCC_ACCOUNTS } from "../../contracts/forms.ts";
import { SIGNED_BY } from "../../contracts/workspace.ts";

export type StageOne = { account?: { value: string; cite: string }; signers?: { form: string; signedBy: string; cite: string }[]; eligibility?: { gates: unknown[]; judgement: string[]; cite: string } };
export const STAGE_ONE_FILE = join(import.meta.dirname, "..", "..", "samples", "checkpoint-stage-one.json");
export const stageOneOf = (key: string | undefined, file = STAGE_ONE_FILE): StageOne | null =>
  (JSON.parse(readFileSync(file, "utf8")) as { combinations: Record<string, StageOne> }).combinations[key ?? ""] ?? null;

/** What is wrong with a combination's Stage 1 data, in words (empty = nothing): a value the product does not know, a
 *  value with no source (P-170), a form named twice. Checked before anything is written, so a bad file sets nothing. */
export function stageOneProblems(setup: StageOne): string[] {
  const out: string[] = [], cited = (c: unknown) => typeof c === "string" && c.trim().length >= 20;
  if (setup.account) {
    if (!(IRCC_ACCOUNTS as readonly string[]).includes(setup.account.value)) out.push(`IRCC account "${setup.account.value}" is not one the product knows (${IRCC_ACCOUNTS.join(", ")})`);
    if (!cited(setup.account.cite)) out.push("the IRCC account has no source quoted");
  }
  const seen = new Set<string>();
  for (const s of setup.signers ?? []) {
    if (!SIGNED_BY.some((x) => x.key === s.signedBy)) out.push(`${s.form}: "${s.signedBy}" is not a signer the product knows (${SIGNED_BY.map((x) => x.key).join(", ")})`);
    if (!cited(s.cite)) out.push(`${s.form}: who signs it has no source quoted`);
    if (seen.has(s.form)) out.push(`${s.form} is named twice`);
    seen.add(s.form);
  }
  if (setup.eligibility && !cited(setup.eligibility.cite)) out.push("the eligibility gates have no source quoted");
  return out;
}
