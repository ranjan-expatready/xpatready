// PF-23: GET /api/health/live and /api/health/ready (the logger, request lines and console are hooked in main.ts, one line).
import type { Feature } from "../features.ts";
import { LiveReadyController, Readiness } from "../platform/observability/health.ts";
export default { controllers: [LiveReadyController], providers: [Readiness] } satisfies Feature;
