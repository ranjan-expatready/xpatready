-- C8.1 signed PDFs (runtime lane, M3-F; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; M3-CONTRACT C8.1): the steps of a
-- form signed by hand and scanned, and the signed scans. Additive: two new tables, nothing existing is changed or
-- dropped, so the code on main before this runs on this schema unchanged (it reads neither table).
--   * sign_step: one row per step done on a form item (print · signed · scan_received · uploaded_to_ircc), with who and
--     when; "print" names the generated copy printed (form_instance). One current row per item and step (a partial unique
--     index); superseded_at is for C9.2 (a fact changed after signing re-opens the steps, keeping the old ones as history).
--   * signed_scan: a signed scan of a form item, append-only (a trigger refuses any UPDATE: a scan is never changed in
--     place, C8.1-14); the file is in the working files (var/), named by the row id, checked by its sha256 before it is
--     read, as C6.4's case_document (stand-in SI-14).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "signed_scan"; DROP TABLE "sign_step"; DROP FUNCTION "signed_scan_append_only"();
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261102200000_c81_signed_scan';
-- Signing steps and scans are lost by a rollback (the files stay in var/ until a Reset); items fall back to their state
-- worked out from the facts.

CREATE TABLE "sign_step" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "copy_id" UUID,
    "done_by" TEXT NOT NULL,
    "done_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMPTZ,
    CONSTRAINT "sign_step_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sign_step_item_id_idx" ON "sign_step"("item_id");
CREATE UNIQUE INDEX "sign_step_one_current" ON "sign_step"("item_id", "key") WHERE "superseded_at" IS NULL;
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "filing_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "form_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_key_check" CHECK ("key" IN ('print', 'signed', 'scan_received', 'uploaded_to_ircc'));
-- "print" always names the copy printed (C8.1-5, C8.1-6).
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_print_copy_check" CHECK ("key" <> 'print' OR "copy_id" IS NOT NULL);

CREATE TABLE "signed_scan" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signed_scan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "signed_scan_item_id_idx" ON "signed_scan"("item_id");
ALTER TABLE "signed_scan" ADD CONSTRAINT "signed_scan_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_scan" ADD CONSTRAINT "signed_scan_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "filing_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_scan" ADD CONSTRAINT "signed_scan_media_type_check" CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png'));
-- Append-only (C8.1-14): a scan is never changed in place. Deleting stays possible, so a case's Reset still removes its rows.
CREATE FUNCTION "signed_scan_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'signed_scan is append-only: a signed scan is never changed in place';
END $$;
CREATE TRIGGER "signed_scan_no_update" BEFORE UPDATE ON "signed_scan" FOR EACH ROW EXECUTE FUNCTION "signed_scan_append_only"();
