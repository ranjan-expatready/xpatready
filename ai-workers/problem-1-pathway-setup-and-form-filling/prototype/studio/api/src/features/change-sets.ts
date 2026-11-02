// G-CORE (P-253): the guarded change pipeline's check and preview (api/src/change-sets.ts).
import type { Feature } from "../features.ts";
import { ChangeSets, ChangeSetsController } from "../change-sets.ts";
export default { controllers: [ChangeSetsController], providers: [ChangeSets] } satisfies Feature;
