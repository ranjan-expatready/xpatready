// C8.1 signed PDFs (M3-F, runtime lane): an item with who signs and its signing steps, and the signed scan.
import type { Feature } from "../features.ts";
import { SignSteps, SignStepsController } from "../sign-steps.ts";
export default { controllers: [SignStepsController], providers: [SignSteps] } satisfies Feature;
