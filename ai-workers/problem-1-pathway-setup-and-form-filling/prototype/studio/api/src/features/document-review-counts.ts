// C6.5 part 2c (P-243, L-SA9): staff corrections of document values, counted per review mode.
import type { Feature } from "../features.ts";
import { DocumentReviewCounts, DocumentReviewCountsController } from "../document-review-counts.ts";
export default { controllers: [DocumentReviewCountsController], providers: [DocumentReviewCounts] } satisfies Feature;
