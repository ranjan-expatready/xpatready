// C7.5 part 2 The independent AI review (M3-E, runtime lane): the run card, review runs (Saved or Live) and Stop.
import type { Feature } from "../features.ts";
import { ReviewRuns, ReviewRunsController } from "../review-runs.ts";
export default { controllers: [ReviewRunsController], providers: [ReviewRuns] } satisfies Feature;
