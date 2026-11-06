// B120 (review m6): what demo.ts and the checkpoint's steps both read, here so no step imports its runner.
import { join } from "node:path";
import { PROTOTYPE, STUDIO } from "../../core.ts";

/** QA-144 slice 1 (ruling 2): a form field no saved answer proposed is filled by hand, never "not a fact". */
export const BY_HAND_REASON = "Not proposed by the saved AI answer, so it is filled by hand on the PDF until a person maps it on this form's field map (sample loader rule, QA-144; Sample)";
/** The reviewed work-permit release c1-v3 (the suites' fixture, Start With an LMIA, the checkpoint's With an LMIA lines). */
export const RELEASE = join(PROTOTYPE, "p3", "releases", "c1-v3");
/** The sample programs (Screen 01): an import file, not constants in code (STANDARDS §3.1). Seven Individual and four
 *  Corporate programs covering the kinds of case in domain/TAXONOMY.md; names are illustrative and shown as Sample.
 *  Rows with a "setup" block get their combination and official files through the normal upload path; one of them
 *  starts from the reviewed work-permit release. Everything else shows as Not started. */
export const SAMPLES = join(STUDIO, "samples", "programs.json");
