-- X5 slice a (forms lane; P-156 (1), plan-p156 P156-1/2): the form library filled from IRCC's forms index. Three nullable
-- columns on gov_form_def; nothing is back-filled (a form is "listed" once the first fill runs). Rollback (STANDARDS §5):
-- drop the three columns.
ALTER TABLE "gov_form_def" ADD COLUMN "listed_on_index_at" TIMESTAMPTZ;
ALTER TABLE "gov_form_def" ADD COLUMN "index_date_modified" TEXT;
ALTER TABLE "gov_form_def" ADD COLUMN "newer_on_index_at" TIMESTAMPTZ;
