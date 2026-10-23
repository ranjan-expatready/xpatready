-- Runtime lane R1a FIX (review Must/Major, break report B1, B4, B10, B14): the database holds the case's integrity, not
-- only the service. Rollback: drop the triggers and functions below, the two new unique indexes and the CHECK; restore
-- ON DELETE CASCADE on the two foreign keys; drop runtime_case.idempotency_fingerprint.
-- DropForeignKey
ALTER TABLE "pack_work_pin" DROP CONSTRAINT "pack_work_pin_config_release_id_fkey";

-- DropForeignKey
ALTER TABLE "runtime_case" DROP CONSTRAINT "runtime_case_combination_id_fkey";

-- DropIndex
DROP INDEX "pack_work_pin_case_id_combination_id_revision_key";

-- AlterTable
ALTER TABLE "runtime_case" ADD COLUMN     "idempotency_fingerprint" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "pack_work_pin_case_id_combination_id_key" ON "pack_work_pin"("case_id", "combination_id");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_case_workspace_id_reference_key" ON "runtime_case"("workspace_id", "reference");

-- AddForeignKey
ALTER TABLE "runtime_case" ADD CONSTRAINT "runtime_case_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_work_pin" ADD CONSTRAINT "pack_work_pin_config_release_id_fkey" FOREIGN KEY ("config_release_id") REFERENCES "config_release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A pin never changes after it is written (team: PackWorkPin is insert-only; a move is a new revision via ADOPT, not built).
CREATE FUNCTION runtime_pin_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'runtime_pin_frozen: a case''s pin to its release never changes'; END $$;
CREATE TRIGGER trg_pack_work_pin_frozen BEFORE UPDATE ON "pack_work_pin" FOR EACH ROW EXECUTE FUNCTION runtime_pin_frozen();

-- Answers are append-only: the only change ever made to a row is stamping it superseded, once, by another row.
CREATE FUNCTION runtime_answer_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.superseded_by_id IS NULL AND NEW.superseded_by_id IS NOT NULL AND NEW.superseded_by_id <> NEW.id
     AND (to_jsonb(NEW) - 'superseded_by_id') = (to_jsonb(OLD) - 'superseded_by_id') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'runtime_answer_append_only: an answer is never changed in place; save a new answer instead';
END $$;
CREATE TRIGGER trg_answer_append_only BEFORE UPDATE ON "client_canonical_answer" FOR EACH ROW EXECUTE FUNCTION runtime_answer_append_only();
CREATE TRIGGER trg_fact_record_append_only BEFORE UPDATE ON "client_fact_record" FOR EACH ROW EXECUTE FUNCTION runtime_answer_append_only();

-- An answer belongs to the party of the person it is about (team: partyId denormalised from the subject, D7).
CREATE FUNCTION runtime_answer_party() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.party_id IS DISTINCT FROM (SELECT party_id FROM answer_subject WHERE id = NEW.subject_id) THEN
    RAISE EXCEPTION 'runtime_answer_party: an answer''s party must be the party of the person it is about'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_answer_party BEFORE INSERT ON "client_canonical_answer" FOR EACH ROW EXECUTE FUNCTION runtime_answer_party();

ALTER TABLE "client_canonical_answer" ADD CONSTRAINT "ck_answer_not_self_superseded" CHECK ("superseded_by_id" IS NULL OR "superseded_by_id" <> "id");
ALTER TABLE "client_fact_record" ADD CONSTRAINT "ck_fact_record_not_self_superseded" CHECK ("superseded_by_id" IS NULL OR "superseded_by_id" <> "id");
ALTER TABLE "case_participant" ADD CONSTRAINT "ck_case_participant_role" CHECK ("role" IN ('case', 'principal', 'spouse_or_partner', 'child'));
-- Each live row of a person's group has its own place (concurrent adds can never share one).
CREATE UNIQUE INDEX "uq_fact_record_order" ON "client_fact_record" ("subject_id", "group_key", "order") WHERE "superseded_by_id" IS NULL;
