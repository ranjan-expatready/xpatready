-- C6.9 Staff eligibility page (M3-D; concept screens/C6.9/concept.md §6 "Storage"; the tech lead's approval on #391: one
-- migration for both parts). Expand only: one nullable column on "combination" and three new tables; no existing row
-- changes, and a combination whose "eligibility" stays null keeps its snapshot and fingerprint (engine/snapshot.ts).
--   * combination.eligibility (part 1, BR-1…BR-6): the draft's gates as data { gates, judgement, disclaimer, version, by }.
--   * assessment, assessment_override, assessment_review (parts 2–3, BR-8, BR-15, BR-16): created now, written from part 2.
--     An assessment row is never updated (trigger below, as form_instance and answer_snapshot); review and override
--     are rows of their own.
-- Rollback (STANDARDS §5), run by hand in this order, then delete this row from "_prisma_migrations":
--   DROP TRIGGER "trg_assessment_frozen" ON "assessment"; DROP FUNCTION "assessment_frozen"();
--   DROP TABLE "assessment_review", "assessment_override", "assessment";
--   ALTER TABLE "combination" DROP COLUMN "eligibility";
-- (Nothing else refers to the three tables. Dropping the column loses only draft gates; released gates stay inside
-- each config_release.snapshot.)

-- AlterTable
ALTER TABLE "combination" ADD COLUMN "eligibility" JSONB;

-- CreateTable
CREATE TABLE "assessment" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "config_release_id" UUID NOT NULL,
    "result_json" JSONB NOT NULL,
    "run_type" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_override" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "program_key" TEXT NOT NULL,
    "from_outcome" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "stamp" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_review" (
    "assessment_id" UUID NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "stamp" JSONB NOT NULL,

    CONSTRAINT "assessment_review_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateIndex
CREATE INDEX "assessment_case_id_subject_id_created_at_idx" ON "assessment"("case_id", "subject_id", "created_at");

-- CreateIndex
CREATE INDEX "assessment_override_assessment_id_idx" ON "assessment_override"("assessment_id");

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_override" ADD CONSTRAINT "assessment_override_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_review" ADD CONSTRAINT "assessment_review_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- BR-8: MANUAL is a person's first run, RERUN every later one.
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_run_type_check" CHECK ("run_type" IN ('MANUAL', 'RERUN'));

-- BR-8 (AG-3-25, BR-10): a run is a frozen record. Any UPDATE is refused; a case's deletion still removes its runs.
CREATE FUNCTION "assessment_frozen"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'assessment_frozen: an eligibility run is never changed; review and override are rows of their own'; END $$;
CREATE TRIGGER "trg_assessment_frozen" BEFORE UPDATE ON "assessment" FOR EACH ROW EXECUTE FUNCTION "assessment_frozen"();
