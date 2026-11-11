// M1: GET /api/health (database, disk, fill queue, git commit; 503 naming what is not well).
import type { Feature } from "../features.ts";
import { HealthController, HealthService } from "../health.ts";
export default { controllers: [HealthController], providers: [HealthService] } satisfies Feature;
