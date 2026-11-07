// Breaker M2: the demo's form roles (P-319) before any release is made.
import { applySampleFormRoles } from "../../../../engine/import.ts";
import type { CheckpointStep } from "./_context.ts";

export default {
  async run(ctx) {
    await applySampleFormRoles(ctx.db, ctx.workspaceId);
  },
} satisfies CheckpointStep;
