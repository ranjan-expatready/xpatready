-- S5 Combination workspace, slice 1 (runtime lane; challenge M3, M4; S6 challenge m1). Expand only.
-- 1. Person roles: one list read by "Who can be in this application", the validator and the runtime (no list in code).
CREATE TABLE "person_role" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "role_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "meaning" TEXT NOT NULL,
  "takes_part_in_case" BOOLEAN NOT NULL,
  "may_be_applicant" BOOLEAN NOT NULL,
  "basis" TEXT NOT NULL DEFAULT 'SAMPLE',
  "built_in" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "retired_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "person_role_pkey" PRIMARY KEY ("id"),
  -- A person who is not on the case cannot file their own application.
  CONSTRAINT "person_role_applicant_check" CHECK ("takes_part_in_case" OR NOT "may_be_applicant")
);
CREATE UNIQUE INDEX "person_role_workspace_id_role_key_key" ON "person_role" ("workspace_id", "role_key");
-- The six built-in starting roles for every workspace that exists (new workspaces get them from samples/person-roles.json,
-- the same values; tests/check_s5_slice1.ts compares them). Sample until the immigration expert confirms.
INSERT INTO "person_role" ("workspace_id", "role_key", "label", "meaning", "takes_part_in_case", "may_be_applicant", "built_in", "display_order")
SELECT w."id", r.k, r.l, r.m, r.t, r.a, true, r.o FROM "workspace" w CROSS JOIN (VALUES
  ('principal', 'Principal applicant', 'The person the application is about; exactly one on every case.', true, true, 1),
  ('spouse_or_partner', 'Spouse or partner', 'The principal applicant''s spouse or common-law partner, when they are on the case.', true, true, 2),
  ('child', 'Child', 'A dependent child of the principal applicant; under 18 the principal answers for them.', true, true, 3),
  ('sponsor', 'Sponsor', 'The person in Canada who sponsors the principal applicant; on the case, never an applicant.', true, false, 4),
  ('representative', 'Representative', 'The person who represents the applicants (IMM 5476); on the case, never an applicant.', true, false, 5),
  ('parent', 'Parent', 'A parent named on a form (for example IMM 5707); described on forms only, never a person on the case.', false, false, 6)
) AS r(k, l, m, t, a, o)
ON CONFLICT DO NOTHING;
-- 1b. A case person's role is any person role key (M3: no role list in code or schema); which roles a case may hold,
--     and how many, is the pinned release's "Who can be in this application", checked by the runtime under the case lock.
ALTER TABLE "case_participant" DROP CONSTRAINT "ck_case_participant_role";
ALTER TABLE "case_participant" ADD CONSTRAINT "ck_case_participant_role" CHECK ("role" ~ '^[a-z][a-z0-9_]{1,40}$');
--     The database still refuses a role that is not a person role of the workspace taking part in a case (defence in depth,
--     R1a FIX B14), read from person_role rather than a list.
CREATE FUNCTION "case_participant_role_known"() RETURNS trigger AS $$
BEGIN
  IF NEW."role" <> 'case' AND NOT EXISTS (SELECT 1 FROM "person_role" r WHERE r."workspace_id" = NEW."workspace_id" AND r."role_key" = NEW."role" AND r."takes_part_in_case") THEN
    RAISE EXCEPTION 'case_participant: % is not a person role that takes part in a case', NEW."role" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "case_participant_role_known" BEFORE INSERT OR UPDATE OF "role" ON "case_participant" FOR EACH ROW EXECUTE FUNCTION "case_participant_role_known"();
-- 2. "Who can be in this application" saved with a version (a stale save is a 409 naming who saved).
ALTER TABLE "combination" ADD COLUMN "participants_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "combination" ADD COLUMN "participants_by" TEXT;
-- 3. A form line's minimum age and who signs it (Sample until the immigration expert confirms).
ALTER TABLE "combination_form" ADD COLUMN "min_age" INTEGER;
ALTER TABLE "combination_form" ADD COLUMN "signed_by" TEXT;
ALTER TABLE "combination_form" ADD CONSTRAINT "combination_form_min_age_check" CHECK ("min_age" IS NULL OR "min_age" BETWEEN 1 AND 99);
-- Rollback (STANDARDS §5):
--   ALTER TABLE "combination_form" DROP CONSTRAINT "combination_form_min_age_check", DROP COLUMN "signed_by", DROP COLUMN "min_age";
--   ALTER TABLE "combination" DROP COLUMN "participants_by", DROP COLUMN "participants_version";
--   DROP TRIGGER "case_participant_role_known" ON "case_participant"; DROP FUNCTION "case_participant_role_known"();
--   DROP TABLE "person_role";
--   ALTER TABLE "case_participant" DROP CONSTRAINT "ck_case_participant_role";
--   ALTER TABLE "case_participant" ADD CONSTRAINT "ck_case_participant_role" CHECK ("role" IN ('case', 'principal', 'spouse_or_partner', 'child'));
--   (only once no case holds a sponsor or representative)
