// C6.17 A multi-stage case (B139): GET /runtime/cases/:id/stages, …/stages/:stage, …/stages/next; POST …/stages/next;
// PUT …/stages/:stage/key-details.
import type { Feature } from "../features.ts";
import { CaseStagesController, CaseStagesService } from "../case-stages.ts";
export default { controllers: [CaseStagesController], providers: [CaseStagesService] } satisfies Feature;
