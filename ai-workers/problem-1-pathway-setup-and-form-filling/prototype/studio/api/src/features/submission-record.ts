// C8.2 Record the submission (M3-F, runtime lane): one record per submission group, and "Correct a number".
import type { Feature } from "../features.ts";
import { Submission, SubmissionController } from "../submission.ts";
export default { controllers: [SubmissionController], providers: [Submission] } satisfies Feature;
