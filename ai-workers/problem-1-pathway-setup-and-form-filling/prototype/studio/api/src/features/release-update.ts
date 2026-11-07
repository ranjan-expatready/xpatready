// C9.5 Adopt a published update on an open case (B145): GET and POST /runtime/cases/:id/release-update.
import type { Feature } from "../features.ts";
import { ReleaseUpdates, ReleaseUpdatesController } from "../release-update.ts";
export default { controllers: [ReleaseUpdatesController], providers: [ReleaseUpdates] } satisfies Feature;
