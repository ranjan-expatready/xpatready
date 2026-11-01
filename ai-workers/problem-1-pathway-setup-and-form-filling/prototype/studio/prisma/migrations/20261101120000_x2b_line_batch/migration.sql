-- X2b slice (b) (screens lane; C1.5, concept v3 BR-C3, BR-C4): one copy or removal of a form or document line across many
-- combinations is recorded as one batch, with an idempotency key (a retried request changes nothing twice) and, per
-- target, the line rows before and after (what one Undo puts back). New table only (expand); nothing else changes and
-- nothing is carried over (no batch existed before). No foreign key: a batch outlives a reset's removed combinations
-- only until the reset deletes it with the workspace's other rows.
-- Rollback (STANDARDS §5): DROP TABLE "line_batch" (no other table refers to it; the line rows it wrote stay as drafts).
CREATE TABLE "line_batch" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "line_key" TEXT NOT NULL,
    "source_combination_id" UUID NOT NULL,
    "targets" JSONB NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undone_at" TIMESTAMPTZ,
    "undone_by" TEXT,

    CONSTRAINT "line_batch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "line_batch_op_check" CHECK ("op" IN ('add', 'remove')),
    CONSTRAINT "line_batch_kind_check" CHECK ("kind" IN ('form', 'document'))
);

-- The request key is unique within a workspace (as the other keyed tables).
CREATE UNIQUE INDEX "line_batch_workspace_id_idempotency_key_key" ON "line_batch"("workspace_id", "idempotency_key");
CREATE INDEX "line_batch_workspace_id_at_idx" ON "line_batch"("workspace_id", "at");
