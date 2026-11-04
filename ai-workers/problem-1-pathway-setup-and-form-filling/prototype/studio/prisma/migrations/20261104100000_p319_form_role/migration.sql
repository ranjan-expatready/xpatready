-- P-319 (founder, 4 Nov: "no combination is hard-coded"): a library form's role to IRCC's rules, set per form by an author
-- (contracts/form-library.ts FORM_ROLES). [IRCC-F09]'s family information rule reads it instead of a list of form numbers
-- in the code (engine/form-completeness.ts). Additive: one nullable column, nothing existing is changed or dropped, so the
-- code on main before this runs on this schema unchanged (it reads no such column).
ALTER TABLE "gov_form_def" ADD COLUMN "form_role" TEXT;
ALTER TABLE "gov_form_def" ADD CONSTRAINT "gov_form_def_form_role_known" CHECK ("form_role" IS NULL OR "form_role" IN ('family_information'));
