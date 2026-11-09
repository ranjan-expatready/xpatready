-- B162 (the tech lead's answer 3 on #1331): expand only, no row changed. The CRITICAL "no copy made for filing" line
-- (engine/runtime/readiness.ts no_copy) is passed with a reason like every CRITICAL line (P-315): the passable-codes check
-- gets it, and the severity check counts it among the CRITICAL codes, so its pass is stored as critical and never as a plain
-- warning. Both lists are rewritten from the ones 20261108040000_qa165_fields_left_empty (#1318, merged first) sets, so
-- they keep 'fields_left_empty' (the tech lead's ruling on #1318; tests/check_readiness_pass_codes.ts holds the newest lists
-- equal to the engine's WARN_CODES and CRITICAL_CODES, so a dropped code fails).
-- Rollback: restore both checks as 20261108040000_qa165_fields_left_empty sets them. Once a pass
-- row has the code the restore is refused, so first delete those rows (DELETE FROM "readiness_pass" WHERE "code" =
-- 'no_copy'; their lines then show as open again), or add the restored checks NOT VALID to keep them.
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write', 'fields_left_empty', 'no_copy'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'fields_left_empty', 'no_copy')));
