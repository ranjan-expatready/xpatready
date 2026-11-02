// D1 (P-226): Demo › Reset to the six (POST /api/demo/reset-to-six {confirm:"RESET"}).
import type { Feature } from "../features.ts";
import { DemoResetToSixController } from "../demo-reset-to-six.ts";
export default { controllers: [DemoResetToSixController] } satisfies Feature;
