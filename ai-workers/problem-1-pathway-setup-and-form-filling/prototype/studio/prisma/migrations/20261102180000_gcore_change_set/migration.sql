-- G-CORE B1 (forms lane; P-253, concept screens/G-CORE-guarded-change/concept.md v2, approved on PR #504): one new table,
-- change_set, one row per guarded change to a shared library item (a person's or the AI's). Additive: nothing existing
-- is changed or dropped, and no existing code reads it, so the code on main runs on this schema unchanged. B1 writes no
-- row (its check endpoint only reads); B2 and B3 write rows inside the change's own transaction.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "change_set";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261102180000_gcore_change_set';
-- A rollback loses the change-set records only; the library rows, library_change and field_merge keep every change.

CREATE TABLE "change_set" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "made_by" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "problems" JSONB NOT NULL DEFAULT '[]',
    "tier" TEXT NOT NULL,
    "expert_at_release" BOOLEAN NOT NULL DEFAULT false,
    "fingerprint" VARCHAR(64) NOT NULL,
    "status" TEXT NOT NULL,
    "library_change_id" UUID,
    "field_merge_id" UUID,
    "proposal_batch_id" UUID,
    "before" JSONB,
    "rolled_back_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_set_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "change_set_made_by_check" CHECK ("made_by" IN ('person', 'ai', 'ai_edited', 'ai_draft')),
    CONSTRAINT "change_set_tier_check" CHECK ("tier" IN ('direct', 'second_person')),
    CONSTRAINT "change_set_status_check" CHECK ("status" IN ('applied', 'waiting', 'rolled_back', 'undone'))
);

CREATE INDEX "change_set_workspace_id_created_at_idx" ON "change_set"("workspace_id", "created_at");
CREATE INDEX "change_set_proposal_batch_id_idx" ON "change_set"("proposal_batch_id");
