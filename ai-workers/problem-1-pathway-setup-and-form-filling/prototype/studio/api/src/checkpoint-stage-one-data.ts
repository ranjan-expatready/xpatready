// B104 (P-351): the configured checkpoint's J7 Stage 1 data (samples/checkpoint-stage-one.json, P-319) and its guard, read
// by api/src/checkpoint-stage-one.ts and by tests/check_b104_stage_one.ts. No decorators and no Nest imports, on purpose
// (as form-setup.ts), so an offline test can read it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IRCC_ACCOUNTS, SIGNATURE_WORDS, SIGNATURES, throughAccount } from "../../contracts/forms.ts";
import { SIGNED_BY, signedByLabel } from "../../contracts/workspace.ts";

export type StageOne = { account?: { value: string; cite: string }; signers?: { form: string; signedBy: string; cite: string }[];
  /** Row A3: how a line is signed (the Forms tab's Signature column, PATCH …/forms/:code/channel), on the line's own channel. */
  signatures?: { form: string; signature: string; cite: string }[];
  eligibility?: { gates: unknown[]; judgement: string[]; cite: string } };
export const STAGE_ONE_FILE = join(import.meta.dirname, "..", "..", "samples", "checkpoint-stage-one.json");
export const stageOneOf = (key: string | undefined, file = STAGE_ONE_FILE): StageOne | null =>
  (JSON.parse(readFileSync(file, "utf8")) as { combinations: Record<string, StageOne> }).combinations[key ?? ""] ?? null;
/** Row A3: the parts of a combination's release 2 (its `release_two`), set inside release 2's draft before it is submitted. */
export const releaseTwoOf = (key: string | undefined, file = STAGE_ONE_FILE): StageOne | null =>
  (JSON.parse(readFileSync(file, "utf8")) as { combinations: Record<string, StageOne & { release_two?: StageOne }> }).combinations[key ?? ""]?.release_two ?? null;

/** What is wrong with a combination's Stage 1 data, in words (empty = nothing): a value the product does not know, a
 *  value with no source (P-170), a form named twice. With the gates' own check (applyStageOne), it is run before anything
 *  is written, so a bad file sets nothing. */
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
  const signed = new Set<string>();
  for (const s of setup.signatures ?? []) {
    if (!(SIGNATURES as readonly string[]).includes(s.signature)) out.push(`${s.form}: signature "${s.signature}" is not one the product knows (${SIGNATURES.join(", ")})`);
    if (!cited(s.cite)) out.push(`${s.form}: how it is signed has no source quoted`);
    if (signed.has(s.form)) out.push(`${s.form}: how it is signed is named twice`);
    signed.add(s.form);
  }
  if (setup.eligibility && !cited(setup.eligibility.cite)) out.push("the eligibility gates have no source quoted");
  return out;
}

/** What the step reads and writes, as the screens' own services do it (api/src/checkpoint-stage-one.ts builds it from
 *  them; tests/check_b104_stage_one.ts from fakes). Each write refuses in the service's own words by throwing. */
export type StageOnePort = {
  account(): Promise<string | null>;
  setAccount(from: string | null, to: string): Promise<void>;
  /** The combination's form lines, newest version of each: its status, who signs it and its revision (the newest row's save time). */
  lines(): Promise<{ form: string; retired: boolean; signedBy: string | null; revision: string; channel: string | null; signature: string }[]>;
  saveSigner(form: string, signedBy: string, revision: string): Promise<void>;
  /** As the Signature column sends it: the line's own channel kept, claimed on the channel and signature the author saw. */
  saveSignature(form: string, channel: string, from: string, to: string): Promise<void>;
  gates(): Promise<{ count: number; version: number }>;
  /** The gates' content checked as the gates service checks it (facts the library holds, value types), in words. */
  gatesProblems(e: NonNullable<StageOne["eligibility"]>): Promise<string[]>;
  putGates(e: NonNullable<StageOne["eligibility"]>, version: number): Promise<{ gates: number; judgement: number }>;
};

/** B104: sets one combination's Stage 1 parts on its draft. Nothing is written when the data is wrong (the guard and the
 *  gates' own check, both first); after that each part a rule refuses stays undone and is said in the rule's words, and
 *  the others go on. A line not on the combination is said, never added; gates already saved are left as they are; a
 *  value already set is not saved again. Returns what was set and what was refused, in plain words. */
export async function applyStageOne(port: StageOnePort, setup: StageOne | null, said: (e: unknown) => string): Promise<{ done: string[]; refused: string[] }> {
  const done: string[] = [], refused: string[] = [];
  if (!setup) return { done, refused };
  const gatesNow = setup.eligibility ? await port.gates() : null;
  const bad = [...stageOneProblems(setup), ...(setup.eligibility && !gatesNow!.count ? await port.gatesProblems(setup.eligibility) : [])];
  if (bad.length) return { done, refused: [`samples/checkpoint-stage-one.json: ${bad.join("; ")}; nothing was set`] };
  if (setup.account) {
    const from = await port.account();
    if (from !== setup.account.value) {
      try { await port.setAccount(from, setup.account.value); done.push(`filed ${throughAccount(setup.account.value)}`); }
      catch (e) { refused.push(`IRCC account: ${said(e)}`); }
    }
  }
  const lines = new Map((await port.lines()).map((l) => [l.form, l]));
  for (const s of setup.signers ?? []) {
    const line = lines.get(s.form);
    if (!line || line.retired) { refused.push(`${s.form}: not a line of this combination, so who signs it is not set`); continue; }
    if (line.signedBy === s.signedBy) continue;
    try { await port.saveSigner(s.form, s.signedBy, line.revision); done.push(`${s.form} signed by ${signedByLabel(s.signedBy).toLowerCase()}`); }
    catch (e) { refused.push(`${s.form}: ${said(e)}`); }
  }
  // Row A3: how a line is signed, after who signs it (a signer saved above changes the line's revision, not its channel).
  if (setup.signatures?.length) {
    const now = new Map((await port.lines()).map((l) => [l.form, l]));
    for (const s of setup.signatures) {
      const line = now.get(s.form);
      if (!line || line.retired || !line.channel) { refused.push(`${s.form}: not a filed line of this combination, so how it is signed is not set`); continue; }
      if (line.signature === s.signature) continue;
      try { await port.saveSignature(s.form, line.channel, line.signature, s.signature); done.push(`${s.form}: ${SIGNATURE_WORDS[s.signature as keyof typeof SIGNATURE_WORDS].toLowerCase()}`); }
      catch (e) { refused.push(`${s.form} signature: ${said(e)}`); }
    }
  }
  if (setup.eligibility && !gatesNow!.count) {
    try { const v = await port.putGates(setup.eligibility, gatesNow!.version); done.push(`${v.gates} eligibility gates and ${v.judgement} officer's judgement lines`); }
    catch (e) { refused.push(`eligibility gates: ${said(e)}`); }
  }
  return { done, refused };
}
