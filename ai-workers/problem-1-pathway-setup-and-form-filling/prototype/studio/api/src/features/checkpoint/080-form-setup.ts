// QA-144 slice 1, after the second person's approval (row 5, 070): on each combination set up from its forms (060), each
// needed fact placed in the section of its form box (the shared rules step), each form field no saved answer proposed
// filled by hand (ruling 2), each form line set by IRCC's words (ruling 3). All as the author, through the screens' own
// services. The work for one combination is the steps of combination/, in their file-name order (features.ts
// featureSteps), all inside the one timing "questions, form fields and form rules (rules)". Row 7 says the totals (090).
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { featureSteps, stateOf } from "../../features.ts";
import { FORM_SETUP } from "../../form-setup.ts";
import type { CheckpointContext, CheckpointStep } from "./_context.ts";
import { sections } from "./060-sections-from-forms.ts";
import { LATER_BY_KEY } from "./040-field-map-review.ts";

/** One combination of the form setup, as each step of combination/ is given it. `setup` is its row of FORM_SETUP.
 *  BK-16 (P-496): `held` is the forms of its sources marked "later" (samples/wave1.json); `pass` is "own" (every
 *  combination's own forms, in order) or "later" (after every combination, only the held forms). */
export type CombinationContext = { c: { id: string; label: string; files: number }; key: string | undefined; setup: (typeof FORM_SETUP)[string] | undefined;
  held?: ReadonlySet<string>; pass?: "own" | "later" };
export type CombinationStep = { run: (ctx: CheckpointContext, cc: CombinationContext) => Promise<void> };

/** What the steps of combination/ add up over every combination, for row 7 (090). */
export const formSetup = stateOf(() => ({ placedFacts: [] as string[], refused: [] as string[], unchosen: [] as string[], byHand: 0, lines: 0, documentLines: 0 }));

let steps: CombinationStep[] = [];
let laterSteps: CombinationStep[] = [];
/** BK-16 (P-496): the steps a held form needs after every combination: its line and rule (100), the library's approval
 *  (150), its questions placed where nobody is asked yet (200, with 220's results) and its form fields (400). Run after
 *  every combination's own pass, so the questions the other combinations' forms ask are placed first and kept. */
const LATER_STEPS = ["100-", "150-", "200-", "220-", "400-"];

/** The forms behind a combination's later sources (the library edition read from that official file). */
async function heldForms(ctx: CheckpointContext, key: string | undefined): Promise<Set<string>> {
  const files = LATER_BY_KEY.get(key ?? "");
  if (!files?.size) return new Set();
  const eds = await ctx.db.formEdition.findMany({ where: { workspaceId: ctx.workspaceId }, select: { officialFile: true, form: { select: { formKey: true } } } });
  return new Set(eds.filter((e) => e.officialFile && files.has(e.officialFile.replace(/^.*\//, ""))).map((e) => e.form.formKey));
}

export default {
  async init() {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "combination");
    const all = await featureSteps<CombinationStep>(dir);
    steps = all;
    laterSteps = all.filter((s) => LATER_STEPS.some((p) => basename(s.file).startsWith(p)));
    if (laterSteps.length !== LATER_STEPS.length) throw new Error(`080-form-setup.ts: the later pass needs the steps ${LATER_STEPS.join(", ")} of combination/ and found ${laterSteps.length}`);
  },
  async run(ctx) {
    await ctx.timed("questions, form fields and form rules (rules)", async () => {
      const later: CombinationContext[] = [];
      for (const c of sections(ctx).fromForms) {
        const key = ctx.keyOf.get(c.id);
        const cc: CombinationContext = { c, key, setup: FORM_SETUP[key ?? ""], held: await heldForms(ctx, key), pass: "own" };
        for (const s of steps) await s.run(ctx, cc);
        if (cc.held?.size) later.push(cc);
      }
      for (const own of later) { const cc: CombinationContext = { ...own, pass: "later" }; for (const s of laterSteps) await s.run(ctx, cc); }
    });
  },
} satisfies CheckpointStep;
