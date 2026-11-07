// C10.1 row 8: the Smart questionnaire (SQR) and Preview, worked out from the forms applied in rows 3–4 (040).
import type { CheckpointStep } from "./_context.ts";
import { fieldMapReview } from "./040-field-map-review.ts";

export default {
  async run(ctx) {
    const { applied } = fieldMapReview(ctx);
    ctx.row({ row: "8", title: "Smart questionnaire (SQR) per person, PQR picks, preview by person", status: applied ? "done" : "waiting", shows: "On each combination: the Smart questionnaire (SQR) and Preview tabs, worked out from the forms applied above", why: applied ? null : "No form was applied." });
  },
} satisfies CheckpointStep;
