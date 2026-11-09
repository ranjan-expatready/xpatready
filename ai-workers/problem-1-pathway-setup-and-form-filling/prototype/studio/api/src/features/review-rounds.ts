// C8.3 Representative review (B144, screens lane): send for review, the round read safely, open, checks, decision and
// the one-click re-approve of changed forms (P-412).
import type { Feature } from "../features.ts";
import { ReviewRounds, ReviewRoundsController } from "../review-rounds.ts";
export default { controllers: [ReviewRoundsController], providers: [ReviewRounds] } satisfies Feature;
