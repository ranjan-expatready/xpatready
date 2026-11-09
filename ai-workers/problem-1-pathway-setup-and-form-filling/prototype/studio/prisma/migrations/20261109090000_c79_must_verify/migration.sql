-- C7.9 (row B142, L-SA8; P-242, P-237; SA-1B-1 rule 9, SA-1B-261 rule 7): the "must verify before filing" flag on a library
-- field (one column, default false: every field keeps today's meaning until the immigration expert approves a flag), and
-- its CRITICAL warning "must_verify" is a code a Ready to file pass may name, as a critical one. Expand only, no row
-- changed. Stamped after every migration on main (9 Nov) and both lists rewritten from the newest ones,
-- 20261108041500_b162_no_copy, plus 'must_verify', so no code is dropped (tests/check_readiness_pass_codes.ts holds the
-- newest lists equal to the engine's WARN_CODES and CRITICAL_CODES).
-- Rollback (STANDARDS §5): stop the app; DELETE FROM "readiness_pass" WHERE "code" = 'must_verify' (those lines show as
-- open again); restore both checks as 20261108041500_b162_no_copy sets them; ALTER TABLE "canonical_field" DROP COLUMN
-- "must_verify_before_filing"; delete this migration's row from _prisma_migrations. Every flag and every pass of it is
-- lost; no answer or form changes.
ALTER TABLE "canonical_field" ADD COLUMN "must_verify_before_filing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write', 'fields_left_empty', 'no_copy', 'must_verify'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'fields_left_empty', 'no_copy', 'must_verify')));
