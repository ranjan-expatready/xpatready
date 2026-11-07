-- C8.2 B149 (screens lane, P-408; board agent-view frame 7 "Record the filings"): the fee receipt's evidence, IRCC's
-- "Transaction Approved" page, uploaded on a recorded filing. The typed receipt number (filing_record.fee_receipt) stays
-- optional and unchanged. Additive: one new table, nothing existing is changed or dropped, so the code on main before
-- this runs on this schema unchanged (it reads no such table).
--   * fee_receipt_file: one row per upload, append-only (a trigger refuses any UPDATE: a receipt is never changed in
--     place); a wrong file is followed by a new upload, the newest is the receipt and earlier ones stay as history. Its
--     filing_id references filing_record(filing_id), so a receipt exists only on a recorded filing. The file is in the
--     working files (var/), named by the row id, checked by its sha256, as C8.1's signed_scan (stand-in SI-14).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "fee_receipt_file"; DROP FUNCTION "fee_receipt_file_append_only"();
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261107170000_b149_fee_receipt_file';
-- Uploaded receipts are lost by a rollback (the files stay in var/ until a Reset); the typed number is kept.

CREATE TABLE "fee_receipt_file" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fee_receipt_file_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fee_receipt_file_filing_id_idx" ON "fee_receipt_file"("filing_id");
ALTER TABLE "fee_receipt_file" ADD CONSTRAINT "fee_receipt_file_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_receipt_file" ADD CONSTRAINT "fee_receipt_file_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing_record"("filing_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fee_receipt_file" ADD CONSTRAINT "fee_receipt_file_media_type_check" CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png'));
ALTER TABLE "fee_receipt_file" ADD CONSTRAINT "fee_receipt_file_size_check" CHECK ("size_bytes" > 0);
-- Append-only: a receipt is never changed in place. Deleting stays possible, so a case's Reset still removes its rows.
CREATE FUNCTION "fee_receipt_file_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fee_receipt_file is append-only: a fee receipt is never changed in place';
END $$;
CREATE TRIGGER "fee_receipt_file_no_update" BEFORE UPDATE ON "fee_receipt_file" FOR EACH ROW EXECUTE FUNCTION "fee_receipt_file_append_only"();
