// C10.1 row 10 (rows 9–12 start here): release 1 on each combination whose draft passes the validator, through submit,
// SME sign-off and a different person's approval. A combination the validator refuses stays a draft, with the
// validator's words. Lead 14 on #1052 (option A): a refused combination with forms (notReleased) and one with no form
// (noForm) are said apart.
import { stateOf } from "../../features.ts";
import { releaseRowTen } from "../../checkpoint-words.ts";
import { seedSampleSources } from "../../source-register.ts";
import { Studio } from "../../studio.ts";
import type { CheckpointStep } from "./_context.ts";

/** The combinations released (the result's `released`), and whether the Visitor visa is one (its case and release 2). */
export const releaseOne = stateOf(() => ({ released: [] as string[], visitor: false }));

export default {
  async run(ctx) {
    const { db, author, sme, approver } = ctx;
    const studio = ctx.get(Studio);
    const state = releaseOne(ctx);
    const released = state.released, notReleased: string[] = [], noForm: string[] = [];
    ctx.result.released = released;
    for (const c of ctx.six.combinations) {
      // An empty combination is never released as "configured": the rules would allow it today (finding for the Lead),
      // but a release with no form says nothing about the configuration.
      if (!(await db.combinationForm.count({ where: { combinationId: c.id } }))) { noForm.push(c.label); continue; }
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
    ctx.row({ row: "10", title: "Review and release: submit, expert ticks, a different person releases", ...releaseRowTen(released, notReleased, noForm) });
    state.visitor = released.some((l) => /Visitor visa/.test(l));
  },
} satisfies CheckpointStep;
