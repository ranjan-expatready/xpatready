// Row 11 (QA-231, P-67; C10.1 rows 11–12, #1009): the family of four's Sample case opens on the Visitor visa's release 1
// through the case officer's own steps, answered from the one Sample record, each form's copy made (C7.1), before row 17
// (170), so the case is seen staying on its release (api/src/sample-case.ts). Validate is a person's step in Adobe
// Reader (P-46, P-171): never simulated here, so the read-back waits for a person. Rows 11 and 12 are said after
// release 2 (140, 150).
import { stateOf } from "../../features.ts";
import { CaseForms } from "../../fill-case.ts";
import { Runtime } from "../../runtime.ts";
import { openSampleFamilyCase } from "../../sample-case.ts";
import type { CheckpointStep } from "./_context.ts";
import { releaseOne } from "./110-release-one.ts";

export const familyCase = stateOf(() => ({ fam: null as Awaited<ReturnType<typeof openSampleFamilyCase>> | null }));

export default {
  async run(ctx) {
    const { vvId } = ctx;
    familyCase(ctx).fam = releaseOne(ctx).visitor && vvId ? await ctx.timed("sample family case (rows 11, 12)", () => openSampleFamilyCase(ctx.db, ctx.get(Runtime), ctx.get(CaseForms), vvId)) : null;
  },
} satisfies CheckpointStep;
