// C10.1 row 6: Reset returns to a blank workspace (Demo › Reset demo).
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    ctx.row({ row: "6", title: "Reset returns to a blank workspace", status: "done", shows: "Demo › Reset demo", why: null });
  },
} satisfies CheckpointStep;
