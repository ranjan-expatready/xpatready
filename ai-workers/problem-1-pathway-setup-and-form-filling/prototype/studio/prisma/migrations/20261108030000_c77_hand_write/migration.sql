-- C7.7 BR-9 (C7.7-18; the tech lead's ruling on #1317): expand only, no row changed. The "line to write by hand" warning
-- (engine/runtime/readiness.ts hand_write) is passed with a reason like every warning (P-237): the passable-codes check of
-- 20261104120000_c76_readiness:58 (last set by 20261107220000_c95_pin_guards) gets it. A warning, not a CRITICAL line, so
-- readiness_pass_severity_matches_check is unchanged.
-- Rollback: restore the check without 'hand_write', as 20261107220000_c95_pin_guards sets it. Once a pass row has that code
-- the restore is refused ("violated by some row", rehearsed by the breaker), so first delete those rows
-- (DELETE FROM "readiness_pass" WHERE "code" = 'hand_write'; their warnings then show as open again), or add the restored
-- check NOT VALID to keep them.
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write'));
