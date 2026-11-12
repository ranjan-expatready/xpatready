-- M3-S4 (P-172, P-380, P-425): a document line may be configured as never waivable ("never", release data on the
-- line, M3-S3's waiver column): the case officer can neither waive it nor mark it Not applicable, and Ready to file is
-- blocked until it is received. Additive: only the allowed values widen; existing lines keep their value.
-- Rollback (STANDARDS §5): a never waivable line goes back to no waiver (a missing one is then a warning again), then
-- the check as 20261111120000_m3s3_waivable_line wrote it. Released snapshots keep "never" (they are signed), so cases
-- pinned to them keep blocking until the code is rolled back too (break m7; as M3-S3's rollback):
--   UPDATE "document_requirement" SET "waiver" = NULL WHERE "waiver" = 'never';
--   ALTER TABLE "document_requirement" DROP CONSTRAINT "document_requirement_waiver_check";
--   ALTER TABLE "document_requirement" ADD CONSTRAINT "document_requirement_waiver_check" CHECK ("waiver" IS NULL OR "waiver" IN ('waivable'));
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261111200000_m3s4_never_waivable_line';
ALTER TABLE "document_requirement" DROP CONSTRAINT "document_requirement_waiver_check";
ALTER TABLE "document_requirement" ADD CONSTRAINT "document_requirement_waiver_check" CHECK ("waiver" IS NULL OR "waiver" IN ('waivable', 'never'));
