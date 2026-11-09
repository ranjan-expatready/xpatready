// C6.16 Adult privacy and "Send to …" (B138): the runtime routes, the adult's own /api/link/* routes and the demo inbox.
import type { Feature } from "../features.ts";
import { DemoInboxController, LinkController, LinkOnlyGuard, PersonLinks, PersonLinksController } from "../person-link.ts";
export default { controllers: [PersonLinksController, LinkController, DemoInboxController], providers: [PersonLinks, LinkOnlyGuard] } satisfies Feature;
