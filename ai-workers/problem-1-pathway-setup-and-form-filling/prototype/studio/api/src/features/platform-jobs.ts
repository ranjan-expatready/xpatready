// PF-14: background jobs behind JobPort (pg-boss in its own schema; api/src/platform/jobs/).
import type { Feature } from "../features.ts";
import { PlatformJobs } from "../platform/jobs/platform-jobs.ts";
export default { providers: [PlatformJobs] } satisfies Feature;
