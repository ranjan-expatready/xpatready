-- C6.12 + C11.6 (runtime lane, M3-B; r5c BR-1, BR-16, §6 "items"; P-122, P-135): evolves the four tables of
-- 20261102010000_c612_prepare_filings (#325) to what the unified "Prepare application" view needs. Additive, with the
-- existing values converted in this migration (the tech lead's instruction, 2 Nov): columns are added, two NOT NULLs are
-- relaxed, checks are widened, kinds are upper-cased and #325's stored line channels become null. No table, column or
-- row is dropped. Not old-code compatible (break r3 M2): #325's code writes kind 'family' and no case_id/item_key, so it
-- does not run on this schema; the migration and the code that reads it ship together, and a rollback runs the SQL
-- below, with the app stopped, before #325's code starts. Every row here is derived by GET /runtime/cases/:id/prepare from the case and its
-- release (#325 has no route that writes by hand), so the conversions lose nothing.
--   * submission_group: a split-out group (SEPARATE) with its reason (BR-16); kinds upper-cased (family -> FAMILY);
--     at most one FAMILY group per case.
--   * filing: the on_principal filing mode (M3-0, a mode the release sets per role).
--   * filing_item: document and step items besides forms (C6.4 checklist, VV-R15 biometrics), keyed by item_key for
--     every kind (form_key kept, nullable, read by no code; dropped by a later contract migration); the case id on
--     each item; the channel the case officer chose (C11.6) with who and when, null meaning the combination line's
--     channel. #325 stored the line's channel on every item and had no way to change it, so those become null.
-- Rollback (STANDARDS §5): stop the app, run this in one transaction, then start #325's code:
--   DELETE FROM "filing_item";  -- every item row goes: #325's /prepare makes the form items again on the next read, with
--                                  NEW ids and the line's channel. Item ids and any channel the officer chose (C11.6) do
--                                  not survive a rollback (filings and groups keep their ids).
--   DROP INDEX "filing_item_filing_id_kind_item_key_subject_id_key"; DROP INDEX "filing_item_case_id_idx";
--   ALTER TABLE "filing_item" DROP CONSTRAINT "filing_item_case_id_fkey", DROP CONSTRAINT "filing_item_kind_check",
--     DROP COLUMN "case_id", DROP COLUMN "item_key", DROP COLUMN "channel_by", DROP COLUMN "channel_at",
--     ALTER COLUMN "form_key" SET NOT NULL, ALTER COLUMN "channel" SET NOT NULL,
--     ADD CONSTRAINT "filing_item_kind_check" CHECK ("kind" IN ('form'));
--   CREATE UNIQUE INDEX "filing_item_filing_id_kind_form_key_subject_id_key" ON "filing_item"("filing_id", "kind", "form_key", "subject_id");
--   UPDATE "filing" SET "mode" = 'files_own' WHERE "mode" = 'on_principal';
--   ALTER TABLE "filing" DROP CONSTRAINT "filing_mode_check", ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own'));
--   DELETE FROM "submission_group" g WHERE g."kind" = 'SEPARATE' AND NOT EXISTS (SELECT 1 FROM "filing" f WHERE f."submission_group_id" = g."id");
--   UPDATE "filing" f SET "submission_group_id" = (SELECT g."id" FROM "submission_group" g WHERE g."case_id" = f."case_id" AND g."kind" = 'FAMILY') WHERE f."submission_group_id" IN (SELECT "id" FROM "submission_group" WHERE "kind" = 'SEPARATE');
--   DELETE FROM "submission_group" WHERE "kind" = 'SEPARATE';
--   DROP INDEX "submission_group_one_family";
--   ALTER TABLE "submission_group" DROP CONSTRAINT "submission_group_kind_check", DROP CONSTRAINT "submission_group_reason_check";
--   UPDATE "submission_group" SET "kind" = lower("kind");
--   ALTER TABLE "submission_group" DROP COLUMN "reason", DROP COLUMN "created_by", ADD CONSTRAINT "submission_group_kind_check" CHECK ("kind" IN ('family'));

-- submission_group
ALTER TABLE "submission_group" ADD COLUMN "reason" TEXT, ADD COLUMN "created_by" TEXT;
ALTER TABLE "submission_group" DROP CONSTRAINT "submission_group_kind_check";
UPDATE "submission_group" SET "kind" = upper("kind");
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_kind_check" CHECK ("kind" IN ('FAMILY', 'SEPARATE'));
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_reason_check" CHECK ("kind" = 'FAMILY' OR length(btrim(coalesce("reason", ''))) > 0);
CREATE UNIQUE INDEX "submission_group_one_family" ON "submission_group" ("case_id") WHERE "kind" = 'FAMILY';

-- filing
ALTER TABLE "filing" DROP CONSTRAINT "filing_mode_check";
ALTER TABLE "filing" ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own', 'on_principal'));

-- filing_item
ALTER TABLE "filing_item" ADD COLUMN "case_id" UUID, ADD COLUMN "item_key" TEXT, ADD COLUMN "channel_by" TEXT, ADD COLUMN "channel_at" TIMESTAMPTZ;
UPDATE "filing_item" i SET "case_id" = f."case_id", "item_key" = i."form_key" FROM "filing" f WHERE f."id" = i."filing_id";
ALTER TABLE "filing_item" ALTER COLUMN "case_id" SET NOT NULL, ALTER COLUMN "item_key" SET NOT NULL;
ALTER TABLE "filing_item" ALTER COLUMN "form_key" DROP NOT NULL, ALTER COLUMN "channel" DROP NOT NULL;
UPDATE "filing_item" SET "channel" = NULL WHERE "channel_reason" IS NULL;
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "filing_item_case_id_idx" ON "filing_item"("case_id");
DROP INDEX "filing_item_filing_id_kind_form_key_subject_id_key";
CREATE UNIQUE INDEX "filing_item_filing_id_kind_item_key_subject_id_key" ON "filing_item"("filing_id", "kind", "item_key", "subject_id");
ALTER TABLE "filing_item" DROP CONSTRAINT "filing_item_kind_check";
ALTER TABLE "filing_item" ADD CONSTRAINT "filing_item_kind_check" CHECK ("kind" IN ('form', 'document', 'step'));
