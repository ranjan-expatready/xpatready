-- Screen 01 fix pass (C2.7, C2.10): a capture remembers the combination it was added from; a library form says which
-- source drafting reads. Additive only: existing captures have no combination, existing forms read the PDF first.
ALTER TABLE "gov_form_def" ADD COLUMN "draft_from" TEXT NOT NULL DEFAULT 'PDF_FIRST';
ALTER TABLE "gov_form_def" ADD CONSTRAINT "gov_form_def_draft_from_check" CHECK ("draft_from" IN ('PDF_FIRST', 'ONLINE_ONLY'));
ALTER TABLE "portal_capture" ADD COLUMN "combination_id" UUID;
CREATE INDEX "portal_capture_combination_id_idx" ON "portal_capture"("combination_id");
ALTER TABLE "portal_capture" ADD CONSTRAINT "portal_capture_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Rollback (STANDARDS §5), in this order:
--   ALTER TABLE "portal_capture" DROP CONSTRAINT "portal_capture_combination_id_fkey";
--   DROP INDEX "portal_capture_combination_id_idx";
--   ALTER TABLE "portal_capture" DROP COLUMN "combination_id";
--   ALTER TABLE "gov_form_def" DROP CONSTRAINT "gov_form_def_draft_from_check";
--   ALTER TABLE "gov_form_def" DROP COLUMN "draft_from";
