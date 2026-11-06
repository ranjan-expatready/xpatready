// C10.1 row 11: a family case on release 1 (opened by 120).
import { SAMPLE_CASE } from "../../sample-case.ts";
import type { CheckpointStep } from "./_context.ts";
import { familyCase } from "./120-family-case.ts";

export default {
  async run(ctx) {
    const { fam } = familyCase(ctx);
    const rowEleven = !!fam?.caseId && fam.people === 4 && fam.births === 4 && fam.fromRecord > 0;
    ctx.row({ row: "11", title: "A family case on release 1", status: !fam ? "waiting" : rowEleven ? "done" : "partial",
      shows: fam?.caseId ? `Case ${SAMPLE_CASE.reference} on release ${fam.release}: ${fam.people} people (principal applicant, travelling spouse, a child under 18, a child 18 or over; Sample names); ${fam.fromRecord} answers from the Sample record and ${fam.madeUp} made up (Sample: the second child's name and both children's dates of birth)${fam.notTaken ? `; ${fam.notTaken} of the record's facts not asked by this release or not on its lists` : ""}; ${fam.copies.length} form cop${fam.copies.length === 1 ? "y" : "ies"} made` : "The case area is built (Demo › Open the case area)",
      why: !fam ? "Waits for the Visitor visa's release 1 (a case runs on a release)." : [...fam.refused, ...(rowEleven ? [] : [`${fam.births} of the 4 people have a date of birth on the case.`])].join(" · ") || null });
  },
} satisfies CheckpointStep;
