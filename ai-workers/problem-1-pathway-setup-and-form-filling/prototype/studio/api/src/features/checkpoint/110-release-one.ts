// C10.1 row 10 (rows 9–12 start here): release 1 on each combination whose draft passes the validator, through submit,
// SME sign-off and a different person's approval. A combination the validator refuses stays a draft, with the
// validator's words. Lead 14 on #1052 (option A): a refused combination with forms (notReleased) and one with no form
// (noForm) are said apart.
import { stateOf } from "../../features.ts";
import { releaseRowTen } from "../../checkpoint-words.ts";
import { seedSampleSources } from "../../source-register.ts";
import { Studio } from "../../studio.ts";
import { FORM_SETUP } from "../../form-setup.ts";
import type { CheckpointStep } from "./_context.ts";
import { sections } from "./060-sections-from-forms.ts";
import type { CombinationContext } from "./080-form-setup.ts";
import { askOwnYesNo } from "./combination/140-own-yes-no.ts";
import approveLibrary from "./combination/150-approve-library.ts";
import placeFromParts from "./combination/200-place-from-parts.ts";
import placementResults from "./combination/220-placement-results.ts";

/** The combinations released (the result's `released`), and whether the Visitor visa is one (its case and release 2). */
export const releaseOne = stateOf(() => ({ released: [] as string[], visitor: false }));

export default {
  async run(ctx) {
    const { db, author, sme, approver } = ctx;
    const studio = ctx.get(Studio);
    const state = releaseOne(ctx);
    const released = state.released, notReleased: string[] = [], noForm: string[] = [];
    ctx.result.released = released;
    // P-598 (tech lead on #1747): a reviewed release is never edited, so a combination's "later" own questions
    // (samples/own-yes-no.json: a box on a form edition other combinations file too, IMM 5707) are asked only after every
    // other combination's release 1, and that combination is released after them; the others pick the question up at
    // their next release. Data names the boxes; no combination is named here (B164).
    const laterOf = (id: string) => (FORM_SETUP[ctx.keyOf.get(id) ?? ""]?.ownYesNo ?? []).filter((y) => y.later);
    const place = new Map(ctx.six.combinations.map((c, i) => [c.label, i]));
    const order = [...ctx.six.combinations].sort((a, b) => Number(laterOf(a.id).length > 0) - Number(laterOf(b.id).length > 0));
    for (const c of order) {
      // An empty combination is never released as "configured": the rules would allow it today (finding for the Lead),
      // but a release with no form says nothing about the configuration.
      if (!(await db.combinationForm.count({ where: { combinationId: c.id } }))) { noForm.push(c.label); continue; }
      const later = laterOf(c.id), setup = FORM_SETUP[ctx.keyOf.get(c.id) ?? ""];
      if (later.length && setup) {
        await ctx.timed("later own questions (P-598)", async () => {
          // The same steps a combination's own pass takes for them (080): ask (140), the second person approves the new field
          // (150), place where nobody is asked yet (200) and record what it refused (220).
          const cc: CombinationContext = { c: sections(ctx).fromForms.find((x) => x.id === c.id) ?? { id: c.id, label: c.label, files: 0 }, key: ctx.keyOf.get(c.id), setup, held: new Set(), pass: "own" };
          await askOwnYesNo(ctx, setup, later);
          for (const step of [approveLibrary, placeFromParts, placementResults]) await step.run(ctx, cc);
        });
      }
      try {
        await ctx.timed("review and release", async () => {
          // G1 (tech lead on #558): the six are Sample, so the seed answers their numbers with Sample entries (passes only in
          // the demo workspace, as a Demo release); a number nobody answered would refuse the submit.
          await seedSampleSources(db, c.id);
          const sub = await studio.submit(author, c.id, "Submitted by the sample loader (C10.1 checkpoint).");
          const items = (sub.changeSummary as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`);
          if (items.length) await studio.signoff(sme, c.id, { items, action: "signed", note: "Signed by the sample loader as the SME (C10.1 checkpoint)." });
          await studio.approve(approver, c.id);
        });
        released.push(c.label);
      } catch (e) { notReleased.push(`${c.label}: ${ctx.said(e)}`); }
    }
    released.sort((a, b) => (place.get(a) ?? 0) - (place.get(b) ?? 0)); // the row lists them in the combinations' own order
    ctx.row({ row: "10", title: "Review and release: submit, expert ticks, a different person releases", ...releaseRowTen(released, notReleased, noForm) });
    state.visitor = released.some((l) => /Visitor visa/.test(l));
  },
} satisfies CheckpointStep;
