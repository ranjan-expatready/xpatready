-- C7.9 (row B142, L-SA8; P-242; SA-1B-1 rule 9, SA-1B-261 rule 7): the "must verify before filing" flag on a library
-- field. One column on one existing table, default false: every field keeps today's meaning until the immigration expert
-- approves a flag.
-- Rollback (STANDARDS §5): stop the app, then ALTER TABLE "canonical_field" DROP COLUMN "must_verify_before_filing"; and
-- delete this migration's row from _prisma_migrations. Every flag is lost; no answer or form changes.
ALTER TABLE "canonical_field" ADD COLUMN "must_verify_before_filing" BOOLEAN NOT NULL DEFAULT false;
