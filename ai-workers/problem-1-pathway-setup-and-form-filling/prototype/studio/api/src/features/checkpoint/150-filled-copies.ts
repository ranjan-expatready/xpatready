// C10.1 row 12: a copy generated for each applicant on the family case (120); the read-back needs a person's Validate in
// Adobe Reader (P-46, P-171); B99 (row 12b) reads back each copy validated in Adobe (api/src/sample-validated.ts).
import type { CheckpointStep } from "./_context.ts";
import { familyCase } from "./120-family-case.ts";

export default {
  async run(ctx) {
    const { fam } = familyCase(ctx);
    const allFilled = !!fam && fam.applicants > 0 && fam.applicationCopies === fam.applicants;
    // B99 (row 12b, P-349): each copy's Validate in Adobe, read back on the Mac (samples/validated-imm5257.json), counts
    // only when the copy reads the same facts as the one validated (api/src/sample-validated.ts); never simulated.
    // QA-285: a copy whose saved read-back counts but whose validated file is not in the local folder (GitHub, a fresh
    // machine) is said in words, kept on the Mac (Sample); its file is never faked or downloaded as validated.
    const allRead = allFilled && fam!.validated + fam!.validatedKeptOnMac === fam!.applicants && !fam!.validatedWhy.length;
    const otherCopies = fam?.copiesRefused.length ? [`Other forms' copies not made: ${fam.copiesRefused.slice(0, 4).join(" · ")}`] : [];
    ctx.row({ row: "12", title: "IMM 5257 filled as a PDF and read back equal", status: allRead ? "done" : allFilled ? "partial" : "waiting",
      shows: fam?.applicationCopies ? `${fam.applicationForm} generated for ${fam.applicationCopies} of ${fam.applicants} applicants on release 1 (C7.1)${fam.validated ? `; ${fam.validated} validated in Adobe and read back equal, the form's own Validate passed (P-171)` : ""}${fam.validatedKeptOnMac ? `; ${fam.validatedKeptOnMac} validated in Adobe on the Mac and read back equal, the form's own Validate passed (P-171, Sample): the validated files are kept on the Mac, not in these working files, so they are not downloaded or filed here` : ""}` : "The fill is built (C7.1)",
      why: allRead ? otherCopies.join(" ") || null : allFilled ? [...(fam!.validatedWhy.length ? fam!.validatedWhy : ["Validate each copy in Adobe Reader and upload the validated copy on the case's Forms tab: the checkpoint cannot press Validate (P-46, P-171), so the read-back waits for a person."]), ...otherCopies].join(" ") : !fam ? "Waits for the Visitor visa's release 1 (a case runs on a release)." : [...fam.refused, ...fam.copiesRefused].join(" · ") || "IMM 5257 was not generated for every applicant." });
  },
} satisfies CheckpointStep;
