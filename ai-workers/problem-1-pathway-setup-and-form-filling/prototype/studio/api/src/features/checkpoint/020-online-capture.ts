// C10.1 row 2: online forms captured with the browser extension, parked (P-102, W6).
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    ctx.row({ row: "2", title: "Online forms captured with the browser extension", status: "out", shows: "Parked (P-102, W6)", why: null });
  },
} satisfies CheckpointStep;
