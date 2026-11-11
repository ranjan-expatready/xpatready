// Row 11 (QA-231, P-67; C10.1 rows 11–12, #1009): the story's Sample case (the family of four) opens on its release 1
// through the case officer's own steps, answered from the one Sample record, each form's copy made (C7.1), before row 17
// (170), so the case is seen staying on its release (api/src/sample-case.ts). Validate is a person's step in Adobe
// Reader (P-46, P-171): never simulated here, so the read-back waits for a person. Rows 11 and 12 are said after
// release 2 (140, 150).
import { stateOf } from "../../features.ts";
import { CaseForms } from "../../fill-case.ts";
import { Runtime } from "../../runtime.ts";
import { openSampleCase, SAMPLE_CASES } from "../../sample-case.ts";
import type { CheckpointStep } from "./_context.ts";
import { releaseOne } from "./110-release-one.ts";

export const familyCase = stateOf(() => ({ fam: null as Awaited<ReturnType<typeof openSampleCase>> | null }));

export default {
  async run(ctx) {
    // BK-12: the story's Sample case is the one samples/sample-cases.json's "story" names, opened once its combination
    // has release 1 (row 10).
    const id = [...ctx.keyOf].find(([, k]) => k === SAMPLE_CASES.story)?.[0];
    const released = !!id && ctx.six.combinations.some((c) => c.id === id && releaseOne(ctx).released.includes(c.label));
    familyCase(ctx).fam = released && id ? await ctx.timed("sample family case (rows 11, 12)", () => openSampleCase(ctx.db, ctx.get(Runtime), ctx.get(CaseForms), id)) : null;
  },
} satisfies CheckpointStep;
