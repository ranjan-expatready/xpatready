-- QA-345 (C8.3, screens lane, B144 follow-up; the tech lead's ruling (a), 9 Nov 18:35 IST): an approval stamps the file
-- it approved. An approval that stamped no validated copy (stamp_file_kind none, or generated_copy) is stamped, once,
-- with the first validated copy read back for the facts it approved (api/src/review-stamp.ts, inside the read-back's
-- transaction). The form guard keeps every other rule of 20261109100000_c83_review_rounds: what a round froze never
-- changes, and a written stamp never changes, except this one move on the newest round of its filing, approved:
-- stamp_file_kind none or generated_copy → validated_copy, to the sha256 of a kept validated copy, every other stamp
-- column equal. No table or column changes; the
-- code before this runs on it unchanged (it never makes that move).
-- Rollback (STANDARDS §5): restore the function as 20261109100000_c83_review_rounds wrote it, then
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261109190000_qa345_stamp_read_back';
-- (stamps already moved to a validated copy stay; the audit line "review_stamp_file" names what each held before:
-- its kind and its fingerprint, was and was_sha256).
CREATE OR REPLACE FUNCTION "c83_form_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."id", NEW."workspace_id", NEW."case_id", NEW."round_id", NEW."round_filing_id", NEW."filing_id", NEW."item_id", NEW."form_number", NEW."subject_id")
     IS DISTINCT FROM (OLD."id", OLD."workspace_id", OLD."case_id", OLD."round_id", OLD."round_filing_id", OLD."filing_id", OLD."item_id", OLD."form_number", OLD."subject_id")
     OR (NEW."snapshot_id", NEW."facts_hash", NEW."file_kind", NEW."file_id", NEW."file_sha256") IS DISTINCT FROM (OLD."snapshot_id", OLD."facts_hash", OLD."file_kind", OLD."file_id", OLD."file_sha256") THEN
    RAISE EXCEPTION 'review_round_form: what a round froze never changes';
  END IF;
  IF OLD."stamped_at" IS NOT NULL THEN
    -- QA-345: the one move a written stamp may make, once, on an approved row.
    IF OLD."stamp_file_kind" IN ('none', 'generated_copy') AND NEW."stamp_file_kind" = 'validated_copy' AND NEW."stamp_file_sha256" IS NOT NULL
       AND (NEW."stamp_snapshot_id", NEW."stamp_hash", NEW."stamped_by", NEW."stamped_at") IS NOT DISTINCT FROM (OLD."stamp_snapshot_id", OLD."stamp_hash", OLD."stamped_by", OLD."stamped_at")
       AND EXISTS (SELECT 1 FROM "review_round_filing" o WHERE o."id" = OLD."round_filing_id" AND o."status" = 'approved'
                   AND NOT EXISTS (SELECT 1 FROM "review_round_filing" n WHERE n."filing_id" = o."filing_id" AND n."filing_round" > o."filing_round"))
       AND EXISTS (SELECT 1 FROM "validated_copy" v WHERE v."sha256" = NEW."stamp_file_sha256") THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'review_round_form: a stamp is written once';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "review_round_filing" WHERE "id" = OLD."round_filing_id" AND ("status" = 'under_review' OR "xmin" = pg_current_xact_id()::xid)) THEN
    RAISE EXCEPTION 'review_round_form: a stamp is written only while its filing is under review';
  END IF;
  RETURN NEW;
END $$;
