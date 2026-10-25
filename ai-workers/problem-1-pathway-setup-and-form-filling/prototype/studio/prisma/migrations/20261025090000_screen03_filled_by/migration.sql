-- Screen 03 slice S2 (runtime lane, B2, RD-6): who fills a shared field, the client or the case officer. Null keeps today's
-- meaning (worked out from where the field is placed). A change is a new draft version of the field, like any field edit,
-- until the screens lane's library change approval merges (Lead, 25 Oct). Expand only. Rollback: drop the column.
ALTER TABLE "canonical_field" ADD COLUMN "filled_by" TEXT;
ALTER TABLE "canonical_field" ADD CONSTRAINT "canonical_field_filled_by_check" CHECK ("filled_by" IS NULL OR "filled_by" IN ('CLIENT', 'CASE_OFFICER'));
