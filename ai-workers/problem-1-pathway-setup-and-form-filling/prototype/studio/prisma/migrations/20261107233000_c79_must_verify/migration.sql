-- C7.9 (row B142, L-SA8; P-242; SA-1B-1 rule 9, SA-1B-261 rule 7): the "must verify before filing" flag on a library
-- field (one column, default false: every field keeps today's meaning until the immigration expert approves a flag), and
-- its CRITICAL warning "must_verify" is a code a Ready to file pass may name, as a critical one (the known-codes and
-- severity checks gain one value).
-- Rollback (STANDARDS §5): stop the app, then delete the readiness_pass rows with code 'must_verify', recreate
-- readiness_pass_known_code_check and readiness_pass_severity_matches_check without it (as 20261104120000_c76_readiness), ALTER TABLE "canonical_field" DROP COLUMN
-- "must_verify_before_filing", and delete this migration's row from _prisma_migrations. Every flag and every pass of it
-- is lost; no answer or form changes.
ALTER TABLE "canonical_field" ADD COLUMN "must_verify_before_filing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'must_verify'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'must_verify')));
