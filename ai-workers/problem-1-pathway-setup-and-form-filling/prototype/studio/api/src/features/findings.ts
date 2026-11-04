// C7.5 part 1 Review findings (M3-E, runtime lane): the rules cross-checks and the finding's life.
import type { Feature } from "../features.ts";
import { FindingsController, FindingsService } from "../findings.ts";
export default { controllers: [FindingsController], providers: [FindingsService] } satisfies Feature;
