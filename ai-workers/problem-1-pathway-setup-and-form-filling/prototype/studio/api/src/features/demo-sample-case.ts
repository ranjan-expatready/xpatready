// BK-12: Demo › open a combination's Sample case, chosen in data (POST /api/demo/sample-case).
import type { Feature } from "../features.ts";
import { DemoSampleCase, DemoSampleCaseController } from "../demo-sample-case.ts";
export default { controllers: [DemoSampleCaseController], providers: [DemoSampleCase] } satisfies Feature;
