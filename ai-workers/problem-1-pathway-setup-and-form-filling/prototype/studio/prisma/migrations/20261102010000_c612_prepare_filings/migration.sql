-- C6.12 /prepare (runtime lane, M3-B2; r5c BR-1, BR-16, contract §6): a case's submission groups, filings, applicants
-- and filed items, stored the first time GET /runtime/cases/:id/prepare derives them, so each keeps its id. Expand only:
-- four new tables, no change to an existing table or row. Cases opened before this get their rows on their first
-- /prepare read. Rollback (STANDARDS §5): DROP TABLE "filing_item", "filing_applicant", "filing", "submission_group"
-- (nothing else refers to them).
CREATE TABLE "submission_group" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submission_group_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "submission_group_case_id_idx" ON "submission_group"("case_id");
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_kind_check" CHECK ("kind" IN ('family'));

CREATE TABLE "filing" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "submission_group_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "combination_key" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "application_number" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "filing_case_id_subject_id_key" ON "filing"("case_id", "subject_id");
ALTER TABLE "filing" ADD CONSTRAINT "filing_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing" ADD CONSTRAINT "filing_submission_group_id_fkey" FOREIGN KEY ("submission_group_id") REFERENCES "submission_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "filing" ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own'));

CREATE TABLE "filing_applicant" (
    "id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    CONSTRAINT "filing_applicant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "filing_applicant_filing_id_subject_id_key" ON "filing_applicant"("filing_id", "subject_id");
ALTER TABLE "filing_applicant" ADD CONSTRAINT "filing_applicant_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_applicant" ADD CONSTRAINT "filing_applicant_mode_check" CHECK ("mode" IN ('applying'));

CREATE TABLE "filing_item" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "form_key" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "channel" "FilingChannel" NOT NULL,
    "channel_reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "filing_item_filing_id_kind_form_key_subject_id_key" ON "filing_item"("filing_id", "kind", "form_key", "subject_id");
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_kind_check" CHECK ("kind" IN ('form'));
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_version_check" CHECK ("version" >= 1);
