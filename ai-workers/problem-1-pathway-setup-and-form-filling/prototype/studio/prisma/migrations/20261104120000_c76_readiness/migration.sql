-- C7.6 Ready to file (runtime lane, M3-E; L-SA3 under P-315, P-237, P-238; P-144, P-151, P-155; M3-CONTRACT C7.6):
-- the representative's review of a filing, the warnings passed with a reason, and IRCC's accepted-until date of a form
-- edition. Additive: three new tables, nothing existing is changed or dropped, so the code on main before this runs on
-- this schema unchanged (it reads none of them). `filing.status` already exists (READY_TO_FILE is a new value of it).
--   * filing_review: the representative of record's review of one filing (P-155): "reviewed", or "self_reviewed" by a
--     solo firm's one person, with the licence number and when. Append-only (a trigger refuses UPDATE).
--   * readiness_pass: a warning of one filing passed with a written reason (who, when, reason; AG-07 BR-26, P-237,
--     P-238): `keys` are the warning lines it covered when written, so it never covers a line that appears later;
--     `severity` says whether a CRITICAL warning (a former block) was passed. Append-only.
--   * form_edition_accepted_until: IRCC's accepted-until date for an edition (P-151 (1)), set with a reason; the newest
--     row per edition counts, null clears it. Append-only (the history is the rows).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "form_edition_accepted_until"; DROP TABLE "readiness_pass"; DROP TABLE "filing_review";
--   DROP FUNCTION "c76_append_only"();
--   UPDATE "filing" SET "status" = 'NOT_STARTED' WHERE "status" = 'READY_TO_FILE';
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261104120000_c76_readiness';
-- Reviews, passes and accepted-until dates are lost by a rollback; filings fall back to not ready.

CREATE TABLE "filing_review" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "reviewed_by" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "licence_number" TEXT,
    "note" TEXT,
    "reviewed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_review_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "filing_review_filing_id_idx" ON "filing_review"("filing_id");
ALTER TABLE "filing_review" ADD CONSTRAINT "filing_review_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_review" ADD CONSTRAINT "filing_review_kind_check" CHECK ("kind" IN ('reviewed', 'self_reviewed'));

CREATE TABLE "readiness_pass" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "keys" TEXT[] NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "passed_by" TEXT NOT NULL,
    "passed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "readiness_pass_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "readiness_pass_filing_id_idx" ON "readiness_pass"("filing_id");
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_check" CHECK ("severity" IN ('critical', 'warning'));
-- A barcode form without its Validate is never passed (P-237): the database refuses it too.
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_code_check" CHECK ("code" <> 'barcode_not_validated');
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_reason_check" CHECK (char_length(btrim("reason")) >= 5);

CREATE TABLE "form_edition_accepted_until" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "form_edition_id" UUID NOT NULL,
    "accepted_until" DATE,
    "reason" TEXT NOT NULL,
    "set_by" TEXT NOT NULL,
    "set_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_edition_accepted_until_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "form_edition_accepted_until_form_edition_id_idx" ON "form_edition_accepted_until"("form_edition_id");
ALTER TABLE "form_edition_accepted_until" ADD CONSTRAINT "form_edition_accepted_until_form_edition_id_fkey" FOREIGN KEY ("form_edition_id") REFERENCES "form_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only: a review, a pass or a date is never changed in place. Deleting stays possible, so a Reset still works.
CREATE FUNCTION "c76_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: add a new row instead', TG_TABLE_NAME;
END $$;
CREATE TRIGGER "filing_review_no_update" BEFORE UPDATE ON "filing_review" FOR EACH ROW EXECUTE FUNCTION "c76_append_only"();
CREATE TRIGGER "readiness_pass_no_update" BEFORE UPDATE ON "readiness_pass" FOR EACH ROW EXECUTE FUNCTION "c76_append_only"();
CREATE TRIGGER "form_edition_accepted_until_no_update" BEFORE UPDATE ON "form_edition_accepted_until" FOR EACH ROW EXECUTE FUNCTION "c76_append_only"();
