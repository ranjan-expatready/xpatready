// C10.2: Demo › Load the finished story (POST /api/demo/checkpoints/finished-story).
import type { Feature } from "../features.ts";
import { DemoCheckpointsController } from "../demo-finished-story.ts";
export default { controllers: [DemoCheckpointsController] } satisfies Feature;
