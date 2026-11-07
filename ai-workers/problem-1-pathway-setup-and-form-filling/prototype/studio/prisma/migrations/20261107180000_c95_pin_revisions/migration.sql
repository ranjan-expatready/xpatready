-- C9.5 (B145; concept BR-1, BR-5; challenge M1, m2): a case moves to a newer release of its own combination as a new pin
-- revision, never by changing a pin. Expand only: one nullable column, the one-pin-per-case unique widened to one pin per
-- case, combination and revision (the shape of 20261023220000_runtime_r1:139), and an insert rule. Every existing row is
-- revision 1 with no reason and stays as it is; the update-refusing trigger (trg_pack_work_pin_frozen) is kept.
-- Rollback (only while every case still has one pin): drop trigger trg_pack_work_pin_chain and function
-- runtime_pin_chain(); drop index pack_work_pin_case_id_combination_id_revision_key; create unique index
-- pack_work_pin_case_id_combination_id_key on (case_id, combination_id); drop column reason.

-- AlterTable
ALTER TABLE "pack_work_pin" ADD COLUMN "reason" TEXT;

-- DropIndex
DROP INDEX "pack_work_pin_case_id_combination_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "pack_work_pin_case_id_combination_id_revision_key" ON "pack_work_pin"("case_id", "combination_id", "revision");

-- A pin is written in order (SA-1B-254 rule 8, forward only): the first pin of a case and combination is revision 1; each
-- later one is the previous revision + 1, on a release of the same combination with a strictly higher version, with a
-- reason. Two moves at once both read the same previous revision, so the unique index above refuses the second.
CREATE FUNCTION runtime_pin_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prev_revision integer; prev_version integer; new_version integer; new_combination uuid;
BEGIN
  SELECT r.version, r.combination_id INTO new_version, new_combination FROM config_release r WHERE r.id = NEW.config_release_id;
  IF new_combination IS DISTINCT FROM NEW.combination_id THEN
    RAISE EXCEPTION 'runtime_pin_chain: a pin''s release must be a release of the pin''s own combination'; END IF;
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
  IF NEW.reason IS NULL OR length(btrim(NEW.reason)) < 3 THEN
    RAISE EXCEPTION 'runtime_pin_chain: a move to another release needs a reason'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pack_work_pin_chain BEFORE INSERT ON "pack_work_pin" FOR EACH ROW EXECUTE FUNCTION runtime_pin_chain();
