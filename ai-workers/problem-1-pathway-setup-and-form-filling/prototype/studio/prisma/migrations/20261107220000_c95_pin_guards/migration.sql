-- C9.5 review round 1 (B145 break report B1, m4, m5): expand only, no row changed.
-- B1: the "newer release" warning (engine/runtime/readiness.ts release_update) is passed with a reason like every
-- warning (P-237): the passable-codes check of 20261104120000_c76_readiness:58 gets it (a warning, not a CRITICAL line,
-- so readiness_pass_severity_matches_check is unchanged).
-- m4: a pin is never deleted on its own (forward only holds for deletes too); it goes only with its case (the demo reset
-- and the case's own cascade).
-- m5: the insert rule also checks the pin's content hash against its release, its combination against the case's, and a
-- reason of only white space (tabs and new lines too).
-- Rollback: restore the check without 'release_update' (only once no pass row has that code); drop trigger
-- trg_pack_work_pin_no_delete and function runtime_pin_no_delete(); restore runtime_pin_chain() from
-- 20261107180000_c95_pin_revisions.
ALTER TABLE "readiness_pass" DROP CONSTRAINT "readiness_pass_known_code_check";
ALTER TABLE "readiness_pass" ADD CONSTRAINT "readiness_pass_known_code_check" CHECK ("code" IN ('missing_facts', 'fact_problem', 'open_check', 'out_of_date', 'missing_signature', 'edition_expired', 'representative_review', 'missing_document', 'finding', 'edition_superseded', 'copy_stale', 'entered_out_of_date', 'release_update'));

CREATE FUNCTION runtime_pin_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- The case's own delete cascades to its pins after the case row is gone: that is allowed; anything else is refused.
  IF EXISTS (SELECT 1 FROM runtime_case WHERE id = OLD.case_id) THEN
    RAISE EXCEPTION 'runtime_pin_no_delete: a case''s pin is never deleted (a move is a new revision; the case keeps every revision)'; END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_pack_work_pin_no_delete BEFORE DELETE ON "pack_work_pin" FOR EACH ROW EXECUTE FUNCTION runtime_pin_no_delete();

CREATE OR REPLACE FUNCTION runtime_pin_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev_revision integer; prev_version integer; new_version integer; new_combination uuid; new_sha varchar; case_combination uuid;
BEGIN
  SELECT r.version, r.combination_id, r.sha256 INTO new_version, new_combination, new_sha FROM config_release r WHERE r.id = NEW.config_release_id;
  IF new_combination IS DISTINCT FROM NEW.combination_id THEN
    RAISE EXCEPTION 'runtime_pin_chain: a pin''s release must be a release of the pin''s own combination'; END IF;
  SELECT k.combination_id INTO case_combination FROM runtime_case k WHERE k.id = NEW.case_id;
  IF case_combination IS DISTINCT FROM NEW.combination_id THEN
    RAISE EXCEPTION 'runtime_pin_chain: a pin is for the case''s own combination'; END IF;
  IF NEW.content_hash IS DISTINCT FROM new_sha THEN
    RAISE EXCEPTION 'runtime_pin_chain: a pin''s content hash is its release''s fingerprint'; END IF;
  SELECT p.revision, r.version INTO prev_revision, prev_version FROM pack_work_pin p JOIN config_release r ON r.id = p.config_release_id
    WHERE p.case_id = NEW.case_id AND p.combination_id = NEW.combination_id ORDER BY p.revision DESC LIMIT 1;
  IF prev_revision IS NULL THEN
    IF NEW.revision <> 1 THEN RAISE EXCEPTION 'runtime_pin_chain: a case''s first pin is revision 1'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.revision <> prev_revision + 1 THEN
    RAISE EXCEPTION 'runtime_pin_chain: the next pin is revision % (the previous one + 1), not %', prev_revision + 1, NEW.revision; END IF;
  IF new_version <= prev_version THEN
    RAISE EXCEPTION 'runtime_pin_chain: a case moves forward only, to a release with a higher version than % (got %)', prev_version, new_version; END IF;
  IF NEW.reason IS NULL OR length(regexp_replace(NEW.reason, '[[:space:]]', '', 'g')) < 3 THEN
    RAISE EXCEPTION 'runtime_pin_chain: a move to another release needs a reason'; END IF;
  RETURN NEW;
END $$;
