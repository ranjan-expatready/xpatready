// C6.9 part 1 (M3-D): eligibility gates as data on a combination's draft (PUT/GET /combinations/:id/eligibility-gates).
import type { Feature } from "../features.ts";
import { EligibilityGates, EligibilityGatesController } from "../eligibility.ts";
export default { controllers: [EligibilityGatesController], providers: [EligibilityGates] } satisfies Feature;
