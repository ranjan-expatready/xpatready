// S6 Shared library (plan §2 R1–R2, N1; slice R): the one AI step "Draft fields" for ONE form edition. A draft round and
// a blind checker round run on the shared step runner (rounds.ts), keyed by the edition (`edition:<code>:<edition>`), so
// a form is drafted once and every combination that files it reuses the answer (P-120, P-138). This file holds the step
// and the plan of a run; the queue that turns both readings into Ready · Check · Decide items is slice 1.
//  - Capability: the step (prompts, shape, key), the worst case per round, the "fits" checks before any call.
//  - The recording pass that fills saved answers for the Sample forms is Scaffolding (tools/record-field-drafts.ts).
// Which boxes a form has and what they mean are Sample until the immigration expert confirms (AGENTS rule 4).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { costUsd, inputTokenBound } from "../../../p2/ledger.ts";
import { partOutputTokens } from "../../engine/parts.ts";
import { editionContextKey } from "../../engine/rounds.ts";
import { OFFICIAL, PROTOTYPE, SOLUTION } from "./core.ts";
import { MODEL, worstRoundUsd, type AiStep, type RoundOut, type StepRunner } from "./rounds.ts";

/** The answer both rounds give (p2/prompts/field-map-output.v2.schema.json), read loosely. */
export type FieldMapOutput = {
  form_edition: string;
  canonical_fields: { id: string; meaning: string; value_type: string }[];
  entries: { data_path: string; outcome: "mapped" | "unresolved" | "never_filled" | "not_a_fact"; person: string; row: number | null; fact: string | null; transform: string | null; condition: string | null; confidence: string; unresolved_reason: string | null; evidence_quote: string }[];
};
const OUTCOMES = new Set(["mapped", "unresolved", "never_filled", "not_a_fact"]);
/** An answer is used only when it has this shape; anything else is never used and the step says why. */
export function fieldMapShapeOk(o: unknown): o is FieldMapOutput {
  const x = o as FieldMapOutput;
  return !!x && typeof x.form_edition === "string" && Array.isArray(x.canonical_fields) && Array.isArray(x.entries) && x.entries.length > 0
    && x.canonical_fields.every((c) => c && typeof c.id === "string" && typeof c.meaning === "string")
    && x.entries.every((e) => e && typeof e.data_path === "string" && e.data_path.length > 0 && OUTCOMES.has(e.outcome) && typeof e.person === "string");
}

/** The answer reads exactly this edition: both prompts give the printed edition as a fact to copy (known_fact). */
export const sameEdition = (o: FieldMapOutput, e: Pick<EditionSource, "printed">) => o.form_edition.trim() === e.printed;

export const FIELD_DRAFT_WORDS = {
  noSaved: "No saved AI draft of this form edition yet: Draft fields with AI runs it (about US$x · at most US$y), or a person maps the form fields.",
  badSaved: "The saved AI draft of this form edition could not be read, so it was not used.",
  nothingUsed: "Nothing of it was used: a person maps the form fields, or Draft fields with AI runs again.",
  otherEdition: (got: string, want: string) => `The AI answer was for another form edition (${got}), not ${want}. Nothing of it was used: a person maps the form fields, or Draft fields with AI runs again.`,
};

/** The step. Whole-form readings: a 250-box form answers with up to about 64 000 output tokens (IMM 1295, 20 Oct); each
 *  edition's own limit is set by its box count (stepFor), so a small form never reserves a large form's worst case. */
export const FIELD_MAP_EDITION: AiStep = {
  kind: "field_map_edition", jobBase: "s6-fieldmap", configurationVersion: "s6-shared-library",
  template: "field-map.v2.md", check: "field-map-check.v1.md", schema: "field-map-output.v2.schema.json",
  effort: "high", max_output_tokens: 64_000, shapeOk: fieldMapShapeOk, words: FIELD_DRAFT_WORDS,
};

/** The step for one edition: its output limit from its box count, as a part's (engine/parts.ts, about 300 a box), and an
 *  answer is used only when it names this edition (replay skips another edition's answer; a live one is refused). */
export const stepFor = (e: Pick<EditionSource, "fields" | "printed">): AiStep => ({ ...FIELD_MAP_EDITION, max_output_tokens: partOutputTokens(e.fields), shapeOk: (o) => fieldMapShapeOk(o) && sameEdition(o, e) });

/** What one live attempt may spend under the runner's job budget. rounds.ts fixes `budget_usd` at 1 for every step; the
 *  forms lane was asked (29 Oct) for a per-step value. Until a step carries its own, a reading above it is refused before
 *  any call, never sent to fail inside the launcher. */
export const runnerBudgetUsd = (step: AiStep) => (step as AiStep & { budget_usd?: number }).budget_usd ?? 1;

/** One Sample form edition with the inventory read from its official file (p1/inventory, same checksum). */
export type EditionSource = { code: string; edition: string; printed: string; inventory: string; inventorySha256: string; inventoryBytes: number; fields: number };
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const PRINTED = /^(IMM [0-9A-Z ]+?) \(([0-9]{2}-[0-9]{4})\)$/;

/** The form editions of the official manifest that have a box inventory read from exactly that file: the Sample forms
 *  the recording pass drafts. Checklists and guides have no boxes to map and are left out. */
export function sampleEditions(): EditionSource[] {
  const manifest = JSON.parse(readFileSync(join(OFFICIAL, "manifest.json"), "utf8")) as { items?: { path?: string; edition?: string; sha256?: string }[] };
  const out: EditionSource[] = [];
  for (const it of manifest.items ?? []) {
    const m = PRINTED.exec(it.edition ?? "");
    if (!m || !it.path?.startsWith("forms/") || !it.path.endsWith(".pdf")) continue;
    const rel = `prototype/p1/inventory/${it.path.slice("forms/".length).replace(/\.pdf$/, "")}.inventory.json`;
    let bytes: Buffer; try { bytes = readFileSync(join(SOLUTION, rel)); } catch { continue; }
    const inv = JSON.parse(bytes.toString("utf8")) as { summary?: { sha256?: string }; fields?: { data_path?: string }[] };
    if (it.sha256 && inv.summary?.sha256 !== it.sha256) continue; // read from another file: never drafted as this edition
    out.push({ code: m[1], edition: m[2], printed: it.edition!, inventory: rel, inventorySha256: sha(bytes), inventoryBytes: bytes.length, fields: (inv.fields ?? []).filter((f) => f.data_path).length });
  }
  return out.sort((a, b) => a.inventoryBytes - b.inventoryBytes || a.code.localeCompare(b.code));
}

export const editionKey = (e: Pick<EditionSource, "code" | "edition">) => editionContextKey(e.code, e.edition);

/** One round's money before it runs: one attempt at the step's output limit, the ledger's worst (both attempts, at most
 *  the run cap), and whether one attempt fits the runner's job budget. */
export function roundCost(e: Pick<EditionSource, "inventoryBytes" | "fields" | "printed">) {
  const step = stepFor(e);
  const template = readFileSync(join(PROTOTYPE, "p2", "prompts", step.template), "utf8");
  const attempt = costUsd(MODEL, inputTokenBound("x".repeat(e.inventoryBytes + template.length)), step.max_output_tokens);
  return { attemptUsd: attempt, worstUsd: worstRoundUsd(step, e.inventoryBytes + template.length), fitsBudget: attempt <= runnerBudgetUsd(step) };
}

export type EditionRounds = { key: string; draft: RoundOut<FieldMapOutput>; check: RoundOut<FieldMapOutput>; costUsd: number };

/** Both readings of one edition: the draft round, then the blind checker round on the same inventory. In replay mode both
 *  come from saved answers of exactly this edition, prompt and file, or say there are none (US$0). A live round is sent
 *  only in mode "live" (P-138: a click) or "fill" (the logged recording pass: a round with a saved reading replays it at
 *  US$0 and only a missing round is sent, so the pass spends exactly what it budgeted). */
export async function draftEdition(runner: StepRunner, e: EditionSource, mode: "live" | "replay" | "fill", wanted: () => Promise<boolean>, batchId?: string): Promise<EditionRounds> {
  const ctx = { trail: e.printed, contextKey: editionKey(e), inputs: [{ file: e.inventory, sha256: e.inventorySha256 }], wanted, batchId };
  const step = stepFor(e);
  const round = async (isCheck: boolean): Promise<RoundOut<FieldMapOutput>> => {
    if (mode !== "live") {
      const saved = await runner.round<FieldMapOutput>(step, isCheck, { ...ctx, mode: "replay" });
      if (saved.ok || mode === "replay") return saved;
    }
    // A live answer of the right shape that names another edition is refused in plain words (it is never used).
    let other: string | null = null;
    const shapeOk = (o: unknown) => {
      if (step.shapeOk(o)) return true;
      if (fieldMapShapeOk(o)) other = o.form_edition;
      return false;
    };
    const got = await runner.round<FieldMapOutput>({ ...step, shapeOk }, isCheck, { ...ctx, mode: "live" });
    return other !== null && !got.ok ? { ...got, reason: FIELD_DRAFT_WORDS.otherEdition(other, e.printed) } : got;
  };
  const draft = await round(false);
  if (draft.ok === false && (draft.blocked || draft.cancelled)) return { key: ctx.contextKey, draft, check: { ok: false, costUsd: 0, reason: "Not started: the draft round did not finish." }, costUsd: draft.costUsd };
  const check = await round(true);
  return { key: ctx.contextKey, draft, check, costUsd: draft.costUsd + check.costUsd };
}
