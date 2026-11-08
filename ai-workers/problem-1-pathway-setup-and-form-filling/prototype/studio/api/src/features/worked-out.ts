// A6 (B102, C6.4): "Work it out instead" for a fact a rule reads (api/src/worked-out.ts).
import type { Feature } from "../features.ts";
import { WorkedOut, WorkedOutController } from "../worked-out.ts";
export default { controllers: [WorkedOutController], providers: [WorkedOut] } satisfies Feature;
