// C6.9 (M3-D): part 1, eligibility gates as data on a combination's draft (PUT/GET /combinations/:id/eligibility-gates);
// part 2, the runs (POST/GET /runtime/cases/:id/assessments, GET /runtime/assessments/:aid).
import type { Feature } from "../features.ts";
import { EligibilityGates, EligibilityGatesController } from "../eligibility.ts";
import { Assessments, AssessmentsController } from "../assessments.ts";
export default { controllers: [EligibilityGatesController, AssessmentsController], providers: [EligibilityGates, Assessments] } satisfies Feature;
