-- F2 (forms lane, N8; P-156 (2), P-176; setup checklist step 1): the official page a person confirmed for a combination.
-- Only the confirmation is stored: the rules' proposal is worked out from the combination's attached pages on every read
-- (engine/official-pages.ts), so it never goes stale when sources change and needs no back-fill. New table only; nothing
-- else changes. No foreign key (as the other per-combination tables here): demo reset and the approved delete of a
-- combination (lifecycle.ts) remove its row. Rollback (STANDARDS §5): DROP TABLE "combination_official_pages" (no other
-- table refers to it).
CREATE TABLE "combination_official_pages" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "combination_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "matches" INTEGER NOT NULL,
    "confirmed_by" TEXT NOT NULL,
    "confirmed_as" TEXT NOT NULL,
    "confirmed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combination_official_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "combination_official_pages_combination_id_key" ON "combination_official_pages"("combination_id");
CREATE INDEX "combination_official_pages_workspace_id_idx" ON "combination_official_pages"("workspace_id");
