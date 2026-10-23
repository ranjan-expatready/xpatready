
-- AlterTable
ALTER TABLE "drafting_job" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "batch_id" UUID,
ADD COLUMN     "fingerprint" TEXT;

-- CreateTable
CREATE TABLE "ai_batch" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "scope_kind" TEXT NOT NULL,
    "scope_label" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "plan_sha256" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "spend_limit_usd" DOUBLE PRECISION NOT NULL,
    "worst_case_usd" DOUBLE PRECISION NOT NULL,
    "expected_usd" DOUBLE PRECISION,
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "started_by" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "ai_batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_batch_workspace_id_idempotency_key_key" ON "ai_batch"("workspace_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "drafting_job_batch_id_idx" ON "drafting_job"("batch_id");

-- AddForeignKey
ALTER TABLE "drafting_job" ADD CONSTRAINT "drafting_job_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ai_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- D280: at most one QUEUED or RUNNING step per source and kind. A second launch for the same form fails here
-- (unique violation, reported to the person as "already running"), whatever the screen or API path. Earlier
-- RUNNING rows are marked FAILED by the server at start, so the index never blocks recovery.
UPDATE "drafting_job" SET "status" = 'FAILED', "message" = 'Interrupted before the one-active-step rule existed; nothing was applied.' WHERE "status" IN ('QUEUED', 'RUNNING');
CREATE UNIQUE INDEX "drafting_job_one_active_per_source" ON "drafting_job" ("attachment_id", "kind") WHERE "status" IN ('QUEUED', 'RUNNING') AND "attachment_id" IS NOT NULL;
