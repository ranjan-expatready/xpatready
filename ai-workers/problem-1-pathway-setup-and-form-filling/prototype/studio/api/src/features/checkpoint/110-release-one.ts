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
import { type CombinationContext, formSetup } from "./080-form-setup.ts";
import { askOwnYesNo } from "./combination/140-own-yes-no.ts";
import approveLibrary from "./combination/150-approve-library.ts";
import { placed } from "./combination/_placed.ts";
import { placeFromFormParts } from "../../form-part-placements.ts";
import placementResults from "./combination/220-placement-results.ts";

/** The combinations released (the result's `released`), whether the Visitor visa is one (its case and release 2), and
 *  (P-598) those given a release 2 for their "later" own questions (`later`). */
export const releaseOne = stateOf(() => ({ released: [] as string[], visitor: false, later: [] as string[] }));

export default {
  async run(ctx) {
    const { db, author, sme, approver } = ctx;
    const studio = ctx.get(Studio);
    const state = releaseOne(ctx);
    const released = state.released, notReleased: string[] = [], noForm: string[] = [];
    ctx.result.released = released;
    // P-598 (tech lead on #1747): a reviewed release is never edited, so a combination's "later" own questions
    // (samples/own-yes-no.json: boxes on a form edition other combinations file too, IMM 5707) are asked only after every
    // combination's release 1, in the order they were always made (a shared item's status is set by the first release that
    // carries it, so the order is kept: P-496 (1)'s check), and that combination gets a release 2 with them (P-484: a named
    // change released N+1). The others pick the question up at their next release. Data names the boxes; no combination is
    // named here (B164).
    const laterOf = (id: string) => (FORM_SETUP[ctx.keyOf.get(id) ?? ""]?.ownYesNo ?? []).filter((y) => y.later);
    const release = async (c: { id: string }, why: string) => {
      // G1 (tech lead on #558): the six are Sample, so the seed answers their numbers with Sample entries (passes only in
      // the demo workspace, as a Demo release); a number nobody answered would refuse the submit.
      await seedSampleSources(db, c.id);
      const sub = await studio.submit(author, c.id, why);
      const items = (sub.changeSummary as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`);
      if (items.length) await studio.signoff(sme, c.id, { items, action: "signed", note: "Signed by the sample loader as the SME (C10.1 checkpoint)." });
      await studio.approve(approver, c.id);
    };
    for (const c of ctx.six.combinations) {
      // An empty combination is never released as "configured": the rules would allow it today (finding for the Lead),
      // but a release with no form says nothing about the configuration.
      if (!(await db.combinationForm.count({ where: { combinationId: c.id } }))) { noForm.push(c.label); continue; }
      try {
        await ctx.timed("review and release", () => release(c, "Submitted by the sample loader (C10.1 checkpoint)."));
        released.push(c.label);
      } catch (e) { notReleased.push(`${c.label}: ${ctx.said(e)}`); }
    }
    for (const c of ctx.six.combinations.filter((x) => released.includes(x.label) && laterOf(x.id).length)) {
      const setup = FORM_SETUP[ctx.keyOf.get(c.id) ?? ""]!;
      try {
        await ctx.timed("later own questions and release 2 (P-598)", async () => {
          // The same steps a combination's own pass takes for them (080): ask (140), the second person approves the new
          // field (150), place where nobody is asked yet (200, checking again only the sections it places into) and record what it refused (220); then its release 2.
          const cc: CombinationContext = { c: sections(ctx).fromForms.find((x) => x.id === c.id) ?? { id: c.id, label: c.label, files: 0 }, key: ctx.keyOf.get(c.id), setup, held: new Set(), pass: "own" };
          await askOwnYesNo(ctx, setup, laterOf(c.id));
          await approveLibrary.run(ctx, cc);
          // As 200 does, but checking again only the sections it places into: steps 085–105 have changed the draft since
          // the form setup, and a choice this placement does not touch stays as release 1 made it.
          placed(cc).p = await placeFromFormParts(db, studio, author, c.id, new Set(), true);
          formSetup(ctx).placedFacts.push(...placed(cc).p!.placed.map((x) => x.fact));
          await placementResults.run(ctx, cc);
          await release(c, "Submitted by the sample loader (C10.1 checkpoint, P-598): the questions asked on a form other combinations file too, after their release 1.");
        });
        state.later.push(c.label);
      } catch (e) { notReleased.push(`${c.label} (release 2, P-598): ${ctx.said(e)}`); }
    }
    ctx.row({ row: "10", title: "Review and release: submit, expert ticks, a different person releases", ...releaseRowTen(released, notReleased, noForm) });
    state.visitor = released.some((l) => /Visitor visa/.test(l));
  },
} satisfies CheckpointStep;
