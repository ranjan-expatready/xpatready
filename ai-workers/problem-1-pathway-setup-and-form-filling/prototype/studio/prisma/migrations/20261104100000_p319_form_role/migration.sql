-- P-319 (founder, 4 Nov: "no combination is hard-coded"): a library form's role to IRCC's rules, set per form by an author
-- (contracts/form-library.ts FORM_ROLES). [IRCC-F09]'s family information rule reads it instead of a list of form numbers
-- in the code (engine/form-completeness.ts). Additive: one nullable column, nothing existing is changed or dropped, so the
-- code on main before this runs on this schema unchanged (it reads no such column).
ALTER TABLE "gov_form_def" ADD COLUMN "form_role" TEXT;
ALTER TABLE "gov_form_def" ADD CONSTRAINT "gov_form_def_form_role_known" CHECK ("form_role" IS NULL OR "form_role" IN ('family_information'));
-- Breaker M1: the forms the code listed until now (IMM 5707, IMM 5645; Guide 5256, [IRCC-F09]) keep their role in every
-- workspace that already has them (the shared demo is upgraded in place, never reset), so the rule gives the same results
-- the day this runs. From here an author changes a form's role in the library; nothing in the code names a form.
UPDATE "gov_form_def" SET "form_role" = 'family_information' WHERE "form_key" IN ('IMM 5707', 'IMM 5645') AND "form_role" IS NULL;
