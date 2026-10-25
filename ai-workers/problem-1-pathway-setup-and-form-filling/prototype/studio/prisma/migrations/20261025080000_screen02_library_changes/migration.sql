-- Screen 02 slice 2 (challenge points 3 and 4; Screen 04 challenge B1, M1, M6). Expand only: every column is nullable or
-- has a default, so the older code keeps working on the new schema (STANDARDS §5).
-- 1. Shared fields get a name and a group (M1). Back-filled from the first alias, else from the key's last part, and
--    marked for a person to check. Not part of any snapshot (engine/snapshot.ts lists its field columns), so no
--    released or submitted fingerprint changes.
ALTER TABLE "canonical_field" ADD COLUMN "label" TEXT, ADD COLUMN "group_key" TEXT, ADD COLUMN "label_checked" BOOLEAN NOT NULL DEFAULT false;
UPDATE "canonical_field" SET "group_key" = split_part("canonical_field_key", '.', 1),
  "label" = COALESCE(NULLIF("aliases"[1], ''), initcap(replace(split_part("canonical_field_key", '.', 2), '_', ' ')));
-- 2. One record for a change to the shared library that a second person approves (B1): kept outside the snapshot.
CREATE TABLE "library_change" (
  "id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "kind" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT,
  "action" TEXT NOT NULL, "reason" TEXT, "ai_verdict" TEXT, "matches" JSONB NOT NULL DEFAULT '[]', "meaning_checked" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL, "proposed_by" TEXT NOT NULL, "proposed_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "decided_by" TEXT, "decided_at" TIMESTAMPTZ,
  "decision_note" TEXT, "released_in" INTEGER, "version" INTEGER NOT NULL DEFAULT 1, "source_job_id" UUID, "combination_id" UUID,
  CONSTRAINT "library_change_pkey" PRIMARY KEY ("id"));
CREATE INDEX "library_change_workspace_id_status_idx" ON "library_change" ("workspace_id", "status");
-- One open change per item: a second change waits until the first is decided or released.
CREATE UNIQUE INDEX "library_change_one_open" ON "library_change" ("workspace_id", "kind", "key") WHERE "status" IN ('WAITING', 'APPROVED');
-- 3. Proposals of other kinds than a field (challenge point 3).
ALTER TABLE "normalization_item" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'field', ADD COLUMN "payload" JSONB, ADD COLUMN "source_quote" TEXT;
-- 4. A held file approved in the product (P-80, challenge point 4): the intake reads the manifest and this table.
CREATE TABLE "approved_source" (
  "id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "sha256" TEXT NOT NULL, "kind" TEXT NOT NULL, "code" TEXT, "edition" TEXT, "file_name" TEXT NOT NULL,
  "ircc_page" TEXT NOT NULL, "intake_item_id" UUID, "uploaded_by" TEXT NOT NULL, "approved_by" TEXT NOT NULL, "approved_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "approved_source_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "approved_source_workspace_id_sha256_key" ON "approved_source" ("workspace_id", "sha256");
ALTER TABLE "intake_item" ADD COLUMN "ircc_page" TEXT;
-- Rollback: DROP TABLE "approved_source"; DROP TABLE "library_change"; ALTER TABLE "intake_item" DROP COLUMN "ircc_page";
--   ALTER TABLE "normalization_item" DROP COLUMN "kind", DROP COLUMN "payload", DROP COLUMN "source_quote";
--   ALTER TABLE "canonical_field" DROP COLUMN "label", DROP COLUMN "group_key", DROP COLUMN "label_checked";
