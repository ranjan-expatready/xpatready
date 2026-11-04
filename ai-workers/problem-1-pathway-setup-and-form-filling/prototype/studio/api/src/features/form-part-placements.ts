// QA-144 part 1 (P-318 (6)): the Smart questionnaire tab's placement step (api/src/form-part-placements.ts).
import type { Feature } from "../features.ts";
import { FormPartPlacementsController } from "../form-part-placements.ts";
export default { controllers: [FormPartPlacementsController] } satisfies Feature;
