-- C6.12, C11.6 (runtime lane, M3-B; r5c BR-1, BR-16, §6 "items"; P-135, P-122): the stored side of a case's "Prepare
-- application" view. Four new tables, nothing else changes: a case's submission groups (one family group, plus any filing
-- split out with a reason), its filings (one per person who travels, derived on read and stored so its id stays; a person
-- who stops travelling keeps the row, withdrawn), each filing's applicants, and each filing's items (form, document, IRCC
-- step; a form's channel when the case officer changed it inside what IRCC accepts). Rows are made by the first read of
-- GET /runtime/cases/:id/prepare for cases opened before this, so no existing row is touched. Rollback (STANDARDS §5):
-- DROP TABLE "filing_item", "filing_applicant", "filing", "submission_group" (no other table refers to them).
-- CreateTable
CREATE TABLE "submission_group" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filing" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "combination_key" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "submission_group_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ,

    CONSTRAINT "filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filing_applicant" (
    "id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "filing_applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filing_item" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "channel" TEXT,
    "channel_reason" TEXT,
    "channel_by" TEXT,
    "channel_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ,

    CONSTRAINT "filing_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_group_case_id_created_at_idx" ON "submission_group"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "filing_submission_group_id_idx" ON "filing"("submission_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "filing_case_id_subject_id_key" ON "filing"("case_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "filing_applicant_filing_id_subject_id_key" ON "filing_applicant"("filing_id", "subject_id");

-- CreateIndex
CREATE INDEX "filing_item_case_id_idx" ON "filing_item"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "filing_item_filing_id_kind_item_key_key" ON "filing_item"("filing_id", "kind", "item_key");

-- AddForeignKey
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filing" ADD CONSTRAINT "filing_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filing" ADD CONSTRAINT "filing_submission_group_id_fkey" FOREIGN KEY ("submission_group_id") REFERENCES "submission_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filing_applicant" ADD CONSTRAINT "filing_applicant_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The rules the database keeps even if the service is bypassed: the known kinds and modes only; a separate group says
-- why it was split out; one current filing per person (the unique index above) and one row per item.
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_kind_check" CHECK ("kind" IN ('FAMILY', 'SEPARATE'));
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_reason_check" CHECK ("kind" = 'FAMILY' OR length(btrim(coalesce("reason", ''))) > 0);
CREATE UNIQUE INDEX "submission_group_one_family" ON "submission_group" ("case_id") WHERE "kind" = 'FAMILY';
ALTER TABLE "filing" ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own', 'on_principal'));
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_kind_check" CHECK ("kind" IN ('form', 'document', 'step'));
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_channel_check" CHECK ("channel" IS NULL OR "channel" IN ('ONLINE', 'PDF_UPLOAD', 'PAPER', 'NOT_NEEDED'));
