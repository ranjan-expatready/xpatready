// C7.6 Ready to file (M3-E, runtime lane; L-SA3, P-315): the representative's review, a warning passed with a reason,
// "Ready to file", and an edition's accepted-until date.
import type { Feature } from "../features.ts";
import { EditionAcceptedUntilController, FilingReadinessController, FilingReadinessRoutes } from "../readiness.ts";
export default { controllers: [FilingReadinessController, EditionAcceptedUntilController], providers: [FilingReadinessRoutes] } satisfies Feature;
