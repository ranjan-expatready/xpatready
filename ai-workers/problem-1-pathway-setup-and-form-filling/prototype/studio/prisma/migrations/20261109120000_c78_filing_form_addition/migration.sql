-- C7.8 Add a library form to one filing (screens lane, B141; SA-1B-177 FilingFormAddition, SA-1B-102 rule 5; P-406).
-- Additive: one new table, and the readiness pass's two code lists gain one CRITICAL code. Nothing existing is dropped
-- or rewritten, so the code on main before this runs on this schema unchanged (it reads neither the table nor the code).
--   * filing_form_addition: a library form the case officer added to one filing, for one person on it (never a role,
--     never the combination). The edition, its published map rows and its fill trial are frozen into `frozen` with their
--     fingerprint (BR-4). Insert, then a removed mark only: a trigger refuses any other change, and refuses taking a
--     removed mark back; deleting stays possible, so a case's Reset still removes its rows (as signed_scan).
--     One live addition per filing, person and form (a partial unique index: a second add is refused, BR-2).
--   * readiness_pass: 'hand_filled_copy' (engine/runtime/readiness.ts): a blank added form with no completed copy
--     uploaded is a CRITICAL line, passed only with a reason (F2, P-315). Both lists are rewritten from the ones
--     20261108041500_b162_no_copy sets, keeping every earlier code (tests/check_readiness_pass_codes.ts holds the newest
--     lists equal to the engine's WARN_CODES and CRITICAL_CODES).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DELETE FROM "readiness_pass" WHERE "code" = 'hand_filled_copy';
--   restore both readiness_pass checks as 20261108041500_b162_no_copy sets them;
--   DROP TABLE "filing_form_addition"; DROP FUNCTION "filing_form_addition_mark_only"();
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261109120000_c78_filing_form_addition';
-- Added forms are lost by a rollback; their filing items stop being wanted and go inactive on the next Prepare read.

CREATE TABLE "filing_form_addition" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "form_key" TEXT NOT NULL,
    "edition_id" UUID NOT NULL,
    "edition_label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "frozen" JSONB NOT NULL,
    "frozen_sha256" VARCHAR(64) NOT NULL,
    "trial" JSONB,
    "channel" "FilingChannel" NOT NULL,
    "signature" TEXT NOT NULL,
    "signed_by" TEXT,
    "signature_reason" TEXT,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "removed_by" TEXT,
    "removed_at" TIMESTAMPTZ,
    "removed_reason" TEXT,
    CONSTRAINT "filing_form_addition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "filing_form_addition_case_id_idx" ON "filing_form_addition"("case_id");
CREATE UNIQUE INDEX "filing_form_addition_one_live" ON "filing_form_addition"("filing_id", "subject_id", "form_key") WHERE "removed_at" IS NULL;
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_kind_check" CHECK ("kind" IN ('fills', 'blank'));
-- M2: "fills" is promised only with the trial that proved it.
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_fills_trial_check" CHECK ("kind" <> 'fills' OR "trial" IS NOT NULL);
-- Q2: PDF upload or Paper only in M3 (never Online, never Not needed).
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_channel_check" CHECK ("channel" IN ('PDF_UPLOAD', 'PAPER'));
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_signature_check" CHECK ("signature" IN ('HAND_SCANNED', 'PEN', 'NONE'));
-- SA-1B-102 r5: a signature is switched off only with a reason.
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_signature_reason_check" CHECK ("signature" <> 'NONE' OR length(btrim(coalesce("signature_reason", ''))) > 0);
-- BR-8: a removed mark is whole: who, when and a reason, together.
ALTER TABLE "filing_form_addition" ADD CONSTRAINT "filing_form_addition_removed_check" CHECK (("removed_at" IS NULL AND "removed_by" IS NULL AND "removed_reason" IS NULL) OR ("removed_at" IS NOT NULL AND "removed_by" IS NOT NULL AND length(btrim(coalesce("removed_reason", ''))) > 0));
-- Insert, then a removed mark only (BR-4, BR-8): nothing frozen is changed in place, and a removal is never taken back.
CREATE FUNCTION "filing_form_addition_mark_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."removed_at" IS NOT NULL THEN
    RAISE EXCEPTION 'filing_form_addition: a removed addition is kept as it is';
  END IF;
  IF (to_jsonb(NEW) - 'removed_at' - 'removed_by' - 'removed_reason') IS DISTINCT FROM (to_jsonb(OLD) - 'removed_at' - 'removed_by' - 'removed_reason') THEN
    RAISE EXCEPTION 'filing_form_addition: only the removed mark is ever written after insert';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "filing_form_addition_no_change" BEFORE UPDATE ON "filing_form_addition" FOR EACH ROW EXECUTE FUNCTION "filing_form_addition_mark_only"();

ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write', 'fields_left_empty', 'no_copy', 'must_verify', 'hand_filled_copy'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'fields_left_empty', 'no_copy', 'must_verify', 'hand_filled_copy')));
