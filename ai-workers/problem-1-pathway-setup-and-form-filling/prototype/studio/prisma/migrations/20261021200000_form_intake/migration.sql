-- One form intake (P-51, Screen 01 early look item 9): every uploaded file is recorded with what was read from it and
-- its outcome; a new edition of a known form, or an unreadable file, is held here for a person (P-32) instead of being
-- added to the library or attached. New table only; no existing record changes. Rollback: DROP TABLE "intake_item".
CREATE TABLE "intake_item" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "combination_id" UUID,
    "file_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT,
    "edition_label" TEXT,
    "published" TEXT,
    "outcome" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intake_item_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "intake_item_workspace_id_status_idx" ON "intake_item"("workspace_id", "status");
CREATE INDEX "intake_item_workspace_id_sha256_idx" ON "intake_item"("workspace_id", "sha256");
