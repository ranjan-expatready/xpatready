-- C8.2 Record the submission (runtime lane, M3-F; r5c BR-11, BR-12, BR-15, BR-16, BR-21; AV-6, P-142 D7, P-155, P-168;
-- M3-CONTRACT C8.2): what a submission group was filed as, per filing and per person, its corrections, and the tasks a
-- change after filing opens. Additive: four new tables, nothing existing is changed or dropped, so the code on main
-- before this runs on this schema unchanged (it reads none of them). `filing.status` already exists (SUBMITTED is a new
-- value of it) and `filing.application_number` already exists (C8.2 slice 1, #553).
--   * filing_record: one per filing, written once when the group is recorded: the portal (the combination's), our
--     reference, the date it was submitted, IRCC's application number, the fee receipt, Prepared by (the case officer who
--     recorded it) and Reviewed by (the representative of record), and `filed_facts`, the facts each of its forms was
--     filed with (as answer_snapshot keeps them), so a later change reads "Filed with an earlier value" (BR-12).
--   * filing_person_record: the UCI IRCC gave each person on the filing; only `uci` changes in place, through a
--     correction (a trigger refuses any other change).
--   * filing_record_correction: "Correct a number": the application number or a person's UCI before and after (a UCI
--     added later has no before), the reason, who and when. Append-only.
--   A filing_record row changes in place only in its application number, through a correction (a trigger).
--   * case_task: a task on a case; kind `after_filing_change` (BR-12, P-142 D7): a fact changed after filing, so the form
--     is re-signed or IRCC is told (Unconfirmed: no counsel). One open task per item and kind (a partial unique index).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "case_task"; DROP TABLE "filing_record_correction"; DROP TABLE "filing_person_record";
--   DROP TABLE "filing_record"; DROP FUNCTION "c82_append_only"(); DROP FUNCTION "c82_record_only_corrected"();
--   UPDATE "filing" SET "status" = 'READY_TO_FILE' WHERE "status" = 'SUBMITTED';
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261104150000_c82_filing_record';
-- Records, UCIs, corrections and tasks are lost by a rollback; recorded filings fall back to Ready to file (their
-- application numbers stay on `filing`).

CREATE TABLE "filing_record" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "submission_group_id" UUID NOT NULL,
    "portal" TEXT,
    "our_reference" TEXT NOT NULL,
    "submitted_on" DATE NOT NULL,
    "application_number" TEXT NOT NULL,
    "fee_receipt" TEXT,
    "prepared_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filed_facts" JSONB NOT NULL,
    CONSTRAINT "filing_record_pkey" PRIMARY KEY ("id")
);
-- BR-15: a filing is recorded once.
CREATE UNIQUE INDEX "filing_record_filing_id_key" ON "filing_record"("filing_id");
CREATE INDEX "filing_record_case_id_idx" ON "filing_record"("case_id");
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_submission_group_id_fkey" FOREIGN KEY ("submission_group_id") REFERENCES "submission_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_our_reference_check" CHECK (char_length(btrim("our_reference")) BETWEEN 1 AND 100);
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_application_number_check" CHECK (char_length("application_number") BETWEEN 1 AND 40);
ALTER TABLE "filing_record" ADD CONSTRAINT "filing_record_fee_receipt_check" CHECK ("fee_receipt" IS NULL OR char_length(btrim("fee_receipt")) BETWEEN 1 AND 100);

CREATE TABLE "filing_person_record" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "uci" TEXT NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_person_record_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "filing_person_record_filing_id_subject_id_key" ON "filing_person_record"("filing_id", "subject_id");
ALTER TABLE "filing_person_record" ADD CONSTRAINT "filing_person_record_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_person_record" ADD CONSTRAINT "filing_person_record_uci_check" CHECK (char_length("uci") BETWEEN 1 AND 40);

CREATE TABLE "filing_record_correction" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "field" TEXT NOT NULL DEFAULT 'application_number',
    "subject_id" UUID,
    "before" TEXT,
    "after" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "corrected_by" TEXT NOT NULL,
    "corrected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_record_correction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "filing_record_correction_filing_id_idx" ON "filing_record_correction"("filing_id");
ALTER TABLE "filing_record_correction" ADD CONSTRAINT "filing_record_correction_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_record_correction" ADD CONSTRAINT "filing_record_correction_field_check" CHECK ("field" IN ('application_number', 'uci'));
-- A number correction has a before and no person; a UCI correction names its person (a UCI added later has no before).
ALTER TABLE "filing_record_correction" ADD CONSTRAINT "filing_record_correction_shape_check" CHECK (("field" = 'application_number' AND "subject_id" IS NULL AND "before" IS NOT NULL) OR ("field" = 'uci' AND "subject_id" IS NOT NULL));
ALTER TABLE "filing_record_correction" ADD CONSTRAINT "filing_record_correction_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 400);
ALTER TABLE "filing_record_correction" ADD CONSTRAINT "filing_record_correction_changed_check" CHECK ("before" IS DISTINCT FROM "after");

CREATE TABLE "case_task" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID,
    "item_id" UUID,
    "kind" TEXT NOT NULL,
    "words" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "done_by" TEXT,
    "done_at" TIMESTAMPTZ,
    CONSTRAINT "case_task_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "case_task_case_id_idx" ON "case_task"("case_id");
CREATE UNIQUE INDEX "case_task_one_open" ON "case_task"("item_id", "kind") WHERE "state" = 'open';
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "filing_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_kind_check" CHECK ("kind" IN ('after_filing_change'));
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_state_check" CHECK ("state" IN ('open', 'done'));
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_done_check" CHECK (("state" = 'done') = ("done_at" IS NOT NULL));

-- A correction is never changed in place (a new correction is a new row). A record changes in place only in its
-- application number, and a person's record only in its UCI, each through a correction that keeps the old value (break
-- m on #924). Deleting stays possible, so a case's Reset still removes its rows.
CREATE FUNCTION "c82_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: add a new row instead', TG_TABLE_NAME;
END $$;
CREATE TRIGGER "filing_record_correction_no_update" BEFORE UPDATE ON "filing_record_correction" FOR EACH ROW EXECUTE FUNCTION "c82_append_only"();
CREATE FUNCTION "c82_record_only_corrected"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'filing_record' AND (to_jsonb(NEW) - 'application_number') IS DISTINCT FROM (to_jsonb(OLD) - 'application_number') THEN
    RAISE EXCEPTION 'filing_record changes only in its application number, through a correction';
  END IF;
  IF TG_TABLE_NAME = 'filing_person_record' AND (to_jsonb(NEW) - 'uci') IS DISTINCT FROM (to_jsonb(OLD) - 'uci') THEN
    RAISE EXCEPTION 'filing_person_record changes only in its UCI, through a correction';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "filing_record_only_corrected" BEFORE UPDATE ON "filing_record" FOR EACH ROW EXECUTE FUNCTION "c82_record_only_corrected"();
CREATE TRIGGER "filing_person_record_only_corrected" BEFORE UPDATE ON "filing_person_record" FOR EACH ROW EXECUTE FUNCTION "c82_record_only_corrected"();
