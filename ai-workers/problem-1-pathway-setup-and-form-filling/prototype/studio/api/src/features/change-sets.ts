// G-CORE (P-253): the guarded change pipeline's check and preview (api/src/change-sets.ts) and, from B2, the rename door
// with its roll-back (api/src/rename-door.ts).
import type { Feature } from "../features.ts";
import { ChangeSets, ChangeSetsController } from "../change-sets.ts";
import { Renames, RenamesController } from "../rename-door.ts";
export default { controllers: [ChangeSetsController, RenamesController], providers: [ChangeSets, Renames] } satisfies Feature;
