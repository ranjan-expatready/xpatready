-- F1 forms channels, CHECK fixes (forms lane, 23 Oct): additive only. A revision number on each portal capture, so two
-- writes to one capture cannot both win (review 4, break M2); database checks behind the API's rules (break m13); one
-- pending merge per field (break M5). Existing rows already satisfy every check (proven on a copy of the demo data).

-- AlterTable
ALTER TABLE "portal_capture" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

-- Checks (Prisma does not model CHECK constraints; they live here).
ALTER TABLE "portal_capture" ADD CONSTRAINT "portal_capture_status_check" CHECK ("status" IN ('OPEN', 'HELD', 'APPROVED', 'RETURNED', 'IN_LIBRARY', 'ABANDONED'));
ALTER TABLE "portal_capture" ADD CONSTRAINT "portal_capture_portal_check" CHECK ("portal_key" IN ('ircc_portal', 'apr_portal', 'rep_pr_portal', 'lmia_online'));
ALTER TABLE "combination" ADD CONSTRAINT "combination_portal_check" CHECK ("portal_key" IS NULL OR "portal_key" IN ('ircc_portal', 'apr_portal', 'rep_pr_portal', 'lmia_online'));
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_online_identity_check" CHECK ("channel" <> 'ONLINE' OR ("portal_key" IS NOT NULL AND "content_sha256" IS NOT NULL));
ALTER TABLE "field_merge" ADD CONSTRAINT "field_merge_status_check" CHECK ("status" IN ('PROPOSED', 'APPLIED', 'REJECTED'));
ALTER TABLE "field_merge" ADD CONSTRAINT "field_merge_two_fields_check" CHECK ("keep_key" <> "merge_key");
ALTER TABLE "canonical_field" ADD CONSTRAINT "canonical_field_not_merged_into_itself" CHECK ("merged_into_key" IS NULL OR "merged_into_key" <> "canonical_field_key");
UPDATE "canonical_field" SET "aliases" = ARRAY[]::TEXT[] WHERE "aliases" IS NULL;
ALTER TABLE "canonical_field" ALTER COLUMN "aliases" SET NOT NULL;

-- A field waits in at most one merge at a time (keep or merge side is checked by the API at proposal and approval).
CREATE UNIQUE INDEX "field_merge_one_pending" ON "field_merge"("workspace_id", "merge_key") WHERE "status" = 'PROPOSED';

-- Rollback of F1 (both migrations), recorded for the Lead (STANDARDS §5); run by hand, newest first, then delete the two
-- rows from "_prisma_migrations":
--   DROP INDEX "field_merge_one_pending"; ALTER TABLE "canonical_field" ALTER COLUMN "aliases" DROP NOT NULL;
--   ALTER TABLE "canonical_field" DROP CONSTRAINT "canonical_field_not_merged_into_itself";
--   ALTER TABLE "field_merge" DROP CONSTRAINT "field_merge_two_fields_check", DROP CONSTRAINT "field_merge_status_check";
--   ALTER TABLE "form_edition" DROP CONSTRAINT "form_edition_online_identity_check";
--   ALTER TABLE "combination" DROP CONSTRAINT "combination_portal_check";
--   ALTER TABLE "portal_capture" DROP CONSTRAINT "portal_capture_portal_check", DROP CONSTRAINT "portal_capture_status_check", DROP COLUMN "revision";
--   (20261023083353_forms_channels) DROP INDEX "form_edition_online_identity"; DROP TABLE "portal_capture", "field_merge",
--   "answer_list_value", "answer_list"; ALTER TABLE "form_field_map" DROP COLUMN "input_order", DROP COLUMN "option_map",
--   DROP COLUMN "screen_key", DROP COLUMN "screen_order"; ALTER TABLE "form_edition" DROP COLUMN "captured_on",
--   DROP COLUMN "channel", DROP COLUMN "content_sha256", DROP COLUMN "portal_key", DROP COLUMN "recheck_by";
--   ALTER TABLE "combination_form" DROP COLUMN "channel"; ALTER TABLE "combination" DROP COLUMN "portal_key";
--   ALTER TABLE "canonical_field" DROP COLUMN "aliases", DROP COLUMN "answer_list_key", DROP COLUMN "merged_into_key";
--   DROP TYPE "FilingChannel"; DROP TYPE "EditionChannel"; (the 'CODE_MATCH' value of "Origin" stays: Postgres cannot
--   drop an enum value; no row uses it after the tables above are dropped).
