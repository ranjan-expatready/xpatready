-- B162 (the tech lead's answer 3 on #1331): expand only, no row changed. The CRITICAL "no copy made for filing" line
-- (engine/runtime/readiness.ts no_copy) is passed with a reason like every CRITICAL line (P-315): the passable-codes check
-- (last set by 20261108030000_c77_hand_write) gets it, and the severity check of 20261104120000_c76_readiness:60 counts it
-- among the CRITICAL codes, so its pass is stored as critical and never as a plain warning.
-- Rollback: restore both checks as 20261108030000_c77_hand_write and 20261104120000_c76_readiness:60 set them. Once a pass
-- row has the code the restore is refused, so first delete those rows (DELETE FROM "readiness_pass" WHERE "code" =
-- 'no_copy'; their lines then show as open again), or add the restored checks NOT VALID to keep them.
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write', 'no_copy'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'no_copy')));
