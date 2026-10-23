-- F1 forms channels (forms lane, slice 1): additive only. Existing rows keep their meaning: every edition is a PDF
-- edition, every form line is a PDF upload, no field has aliases, an answer list or a merge.

-- CreateEnum
CREATE TYPE "FilingChannel" AS ENUM ('PDF_UPLOAD', 'ONLINE', 'SIGNED_PDF_UPLOAD');

-- CreateEnum
CREATE TYPE "EditionChannel" AS ENUM ('PDF', 'ONLINE');

-- AlterEnum
ALTER TYPE "Origin" ADD VALUE 'CODE_MATCH';

-- AlterTable
ALTER TABLE "canonical_field" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "answer_list_key" TEXT,
ADD COLUMN     "merged_into_key" TEXT;

-- AlterTable
ALTER TABLE "combination" ADD COLUMN     "portal_key" TEXT;

-- AlterTable
ALTER TABLE "combination_form" ADD COLUMN     "channel" "FilingChannel" NOT NULL DEFAULT 'PDF_UPLOAD';

-- AlterTable
ALTER TABLE "form_edition" ADD COLUMN     "captured_on" DATE,
ADD COLUMN     "channel" "EditionChannel" NOT NULL DEFAULT 'PDF',
ADD COLUMN     "content_sha256" TEXT,
ADD COLUMN     "portal_key" TEXT,
ADD COLUMN     "recheck_by" DATE;

-- AlterTable
ALTER TABLE "form_field_map" ADD COLUMN     "input_order" INTEGER,
ADD COLUMN     "option_map" JSONB,
ADD COLUMN     "screen_key" TEXT,
ADD COLUMN     "screen_order" INTEGER;

-- CreateTable
CREATE TABLE "answer_list" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "answer_list_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "source_basis" "SourceBasis" NOT NULL DEFAULT 'ILLUSTRATIVE',
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_list_value" (
    "id" UUID NOT NULL,
    "answer_list_id" UUID NOT NULL,
    "value_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "answer_list_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_merge" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "keep_key" TEXT NOT NULL,
    "merge_key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "proposed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ,
    "decision_note" TEXT,
    "moved" JSONB,

    CONSTRAINT "field_merge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_capture" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "portal_key" TEXT NOT NULL,
    "form_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "application_type" TEXT,
    "way" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "status_detail" TEXT,
    "record" JSONB NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "content_sha256" TEXT,
    "changes_edition_id" UUID,
    "difference" JSONB,
    "twin_file" TEXT,
    "review_file" TEXT,
    "form_edition_id" UUID,
    "captured_on" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "captured_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ,
    "decision_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_capture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "answer_list_workspace_id_answer_list_key_version_key" ON "answer_list"("workspace_id", "answer_list_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "answer_list_value_answer_list_id_value_key_key" ON "answer_list_value"("answer_list_id", "value_key");

-- CreateIndex
CREATE INDEX "field_merge_workspace_id_status_idx" ON "field_merge"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "portal_capture_workspace_id_form_key_portal_key_idx" ON "portal_capture"("workspace_id", "form_key", "portal_key");

-- AddForeignKey
ALTER TABLE "answer_list_value" ADD CONSTRAINT "answer_list_value_answer_list_id_fkey" FOREIGN KEY ("answer_list_id") REFERENCES "answer_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One online version per form, portal and content fingerprint: two approvals of the same capture at the same moment
-- cannot store it twice (the second is refused by the database and answered "already in the library").
CREATE UNIQUE INDEX "form_edition_online_identity" ON "form_edition"("workspace_id", "gov_form_def_id", "portal_key", "content_sha256") WHERE "channel" = 'ONLINE';
