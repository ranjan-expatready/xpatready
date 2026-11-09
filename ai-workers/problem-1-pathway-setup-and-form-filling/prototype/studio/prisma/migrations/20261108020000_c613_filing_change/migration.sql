-- C6.13 Filing changes while preparing (screens lane, B135; P-406 (1); concept screens/B135/concept.md r2, BR-6, M3):
-- each Make principal, Remove filing and Add filing back, with its reason, who and when, kept on a row (as the C6.12
-- split keeps its reason) and read back on the person's row. Additive: one new table, nothing existing changes, so the
-- code on main before this runs on this schema unchanged (it reads nothing of it).
--   * kind: make_principal (subject became principal, other_subject_id was) · remove_filing · add_back · travelling_flag
--     (the C11.12 PATCH …/people/:subject door, BR-10: same service, no reason typed).
--   * roles_before / roles_after: {subject: role} of the case's people around the change; applies_before / after for
--     the person whose filing changed. basis: the preview's fingerprint the change was applied over (BR-8).
--   Append-only: triggers refuse UPDATE, and DELETE while the row's case exists; rows go only with their case (ON
--   DELETE CASCADE, as a demo reset deletes cases). TRUNCATE is not guarded (only a full database reset uses it).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "filing_change"; DROP FUNCTION "c613_no_update"(); DROP FUNCTION "c613_no_delete"();
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261108020000_c613_filing_change';
-- The reasons and the history of changes are lost by a rollback; the people's roles and travelling flags stay as changed.
-- A case whose principal was changed then counts the new principal's answers as the client's own again (BR-3b).

CREATE TABLE "filing_change" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "other_subject_id" UUID,
    "roles_before" JSONB NOT NULL,
    "roles_after" JSONB NOT NULL,
    "reason" TEXT,
    "basis" VARCHAR(64),
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filing_change_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "filing_change_case_id_changed_at_idx" ON "filing_change"("case_id", "changed_at");
ALTER TABLE "filing_change" ADD CONSTRAINT "filing_change_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_change" ADD CONSTRAINT "filing_change_kind_check" CHECK ("kind" IN ('make_principal', 'remove_filing', 'add_back', 'travelling_flag'));
-- A typed change has a reason (1 to 500 characters); the travelling flag door has none.
-- (break m: NULL or only white space is not a reason; the API also asks for a letter or a digit.)
ALTER TABLE "filing_change" ADD CONSTRAINT "filing_change_reason_check" CHECK (("kind" = 'travelling_flag' AND "reason" IS NULL) OR ("kind" <> 'travelling_flag' AND "reason" IS NOT NULL AND "reason" ~ '[^[:space:]]' AND char_length("reason") <= 500));
ALTER TABLE "filing_change" ADD CONSTRAINT "filing_change_other_check" CHECK (("kind" = 'make_principal') = ("other_subject_id" IS NOT NULL));

CREATE FUNCTION "c613_no_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'filing_change is append-only: add a new row instead';
END $$;
CREATE TRIGGER "filing_change_no_update" BEFORE UPDATE ON "filing_change" FOR EACH ROW EXECUTE FUNCTION "c613_no_update"();
-- Break m: a row is not deleted while its case exists (deleting the case's first Make principal would change whose
-- answers count as the client's own, BR-3b); a case deleted (a demo reset) still takes its rows with it.
CREATE FUNCTION "c613_no_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "runtime_case" WHERE "id" = OLD."case_id") THEN
    RAISE EXCEPTION 'filing_change is append-only: its rows go only with their case';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER "filing_change_no_delete" BEFORE DELETE ON "filing_change" FOR EACH ROW EXECUTE FUNCTION "c613_no_delete"();
