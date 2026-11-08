-- QA-165 (#1318; the tech lead's option 1): expand only, no row changed. "Mandatory form fields left empty"
-- (engine/runtime/readiness.ts fields_left_empty: a field IRCC's form marks mandatory that a copy would leave empty and no
-- copy lists "To write by hand") is a CRITICAL line, passed by staff with a written reason like every readiness line
-- (P-237, P-238). So both checks of 20261104120000_c76_readiness gain it: the passable codes (last set by
-- 20261108030000_c77_hand_write) and the codes whose pass is CRITICAL (unchanged since 20261104120000_c76_readiness:60).
-- Rollback: restore both checks without 'fields_left_empty', as 20261108030000_c77_hand_write and
-- 20261104120000_c76_readiness set them. Once a pass row has that code the restore is refused ("violated by some row"), so
-- first delete those rows (DELETE FROM "readiness_pass" WHERE "code" = 'fields_left_empty'; their lines then show as open
-- again), or add the restored checks NOT VALID to keep them.
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update', 'hand_write', 'fields_left_empty'));
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_severity_matches_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_severity_matches_check" CHECK (("severity" = 'critical') = ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'fields_left_empty')));
