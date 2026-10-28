-- S4 Form library, slice 1 (W1-06, challenge.md M2–M7, m1–m2; P-123, P-116). Expand only: new nullable columns, two new
-- tables and one enum value; no row is moved, renamed or rewritten.
-- 1. The finder's automatic attach is its own origin ("Picked by AI · Sample").
ALTER TYPE "Origin" ADD VALUE IF NOT EXISTS 'AI_FOUND';
-- 2. A library form's own canada.ca page and its lifecycle (retired by a release, P-116).
ALTER TABLE "gov_form_def" ADD COLUMN "form_page_url" TEXT;
ALTER TABLE "gov_form_def" ADD COLUMN "retired_at" TIMESTAMPTZ;
ALTER TABLE "gov_form_def" ADD COLUMN "retired_by" TEXT;
-- 3. Where an edition came from, what canada.ca showed, freshness, what IRCC accepts (Sample) and a newer same-edition file.
ALTER TABLE "form_edition" ADD COLUMN "origin" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "form_page_url" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "source_url" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "canada_updated" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "checked_at" TIMESTAMPTZ;
ALTER TABLE "form_edition" ADD COLUMN "accepted_channels" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "accepted_basis" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "accepted_quote" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "newer_file_sha256" TEXT;
-- The database refuses what the contracts refuse (Lead, 27 Oct): the same short lists, empty allowed.
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_origin" CHECK ("origin" IS NULL OR "origin" IN ('DOWNLOADED', 'UPLOADED', 'SAMPLE'));
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_accepted_channels" CHECK ("accepted_channels" IS NULL OR "accepted_channels" IN ('PDF', 'ONLINE', 'PDF_OR_ONLINE', 'READ_BY_AI'));
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_accepted_basis" CHECK ("accepted_basis" IS NULL OR "accepted_basis" IN ('AI_SAMPLE', 'PERSON_SAMPLE', 'EXPERT'));
-- 4. Official downloads: the same evidence as the manifest, so no second person (M2, Q-L1).
CREATE TABLE "official_download" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "sha256" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "code" TEXT,
  "edition" TEXT,
  "title" TEXT,
  "form_page_url" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "stored_path" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "basis" TEXT NOT NULL,
  "batch_id" UUID,
  "started_by" TEXT NOT NULL,
  "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "official_download_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "official_download_https_canada" CHECK ("source_url" LIKE 'https://www.canada.ca/%' OR "source_url" LIKE 'https://ircc.canada.ca/%'),
  CONSTRAINT "official_download_basis" CHECK ("basis" IN ('download', 'fingerprint_match'))
);
CREATE UNIQUE INDEX "official_download_workspace_id_sha256_key" ON "official_download"("workspace_id", "sha256");
-- 5. The finder run that attached a line, and the forms list's changes for Undo.
ALTER TABLE "combination_form" ADD COLUMN "finder_batch_id" UUID;
CREATE TABLE "form_line_action" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "combination_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "detail" JSONB NOT NULL,
  "by" TEXT NOT NULL,
  "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "undone_at" TIMESTAMPTZ,
  "undone_by" TEXT,
  CONSTRAINT "form_line_action_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "form_line_action_kind" CHECK ("action" IN ('attach', 'remove', 'finder_attach', 'edit'))
);
CREATE INDEX "form_line_action_combination_id_at_idx" ON "form_line_action"("combination_id", "at");
-- 6. An upload started from a combination's "Not found" form: attached when the file becomes usable (S5 ask).
ALTER TABLE "intake_item" ADD COLUMN "for_combination_id" UUID;
ALTER TABLE "intake_item" ADD COLUMN "for_code" TEXT;
-- 7. A library run (Upload PDF through AI) belongs to no combination (M7).
ALTER TABLE "drafting_job" ALTER COLUMN "combination_id" DROP NOT NULL;
-- Rollback (STANDARDS §5):
--   ALTER TABLE "intake_item" DROP COLUMN "for_code", DROP COLUMN "for_combination_id";
--   DELETE FROM "drafting_job" WHERE "combination_id" IS NULL; ALTER TABLE "drafting_job" ALTER COLUMN "combination_id" SET NOT NULL;
--   DROP TABLE "form_line_action"; ALTER TABLE "combination_form" DROP COLUMN "finder_batch_id";
--   DROP TABLE "official_download";
--   ALTER TABLE "form_edition" DROP CONSTRAINT "form_edition_accepted_basis", DROP CONSTRAINT "form_edition_accepted_channels",
--     DROP CONSTRAINT "form_edition_origin";
--   ALTER TABLE "form_edition" DROP COLUMN "newer_file_sha256", DROP COLUMN "accepted_quote", DROP COLUMN "accepted_basis",
--     DROP COLUMN "accepted_channels", DROP COLUMN "checked_at", DROP COLUMN "canada_updated", DROP COLUMN "source_url",
--     DROP COLUMN "form_page_url", DROP COLUMN "origin";
--   ALTER TABLE "gov_form_def" DROP COLUMN "retired_by", DROP COLUMN "retired_at", DROP COLUMN "form_page_url";
--   UPDATE "combination_form" SET "origin" = 'AI_PROPOSAL' WHERE "origin" = 'AI_FOUND'; (PostgreSQL cannot drop an enum
--   value; it stays unused)
