-- S4 FIX (Lead note 28 Oct, founder change 4): Load sample sets what IRCC accepts from its Sample fixtures (IRCC's own
-- sentence on the recorded canada.ca page, no AI call), shown "Sample · canada.ca words" and never as read by AI.
ALTER TABLE "form_edition" DROP CONSTRAINT "form_edition_accepted_basis";
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_accepted_basis" CHECK ("accepted_basis" IS NULL OR "accepted_basis" IN ('AI_SAMPLE', 'PERSON_SAMPLE', 'EXPERT', 'SAMPLE_FIXTURE'));
-- Rollback (STANDARDS §5):
--   UPDATE "form_edition" SET "accepted_channels" = NULL, "accepted_basis" = NULL, "accepted_quote" = NULL WHERE "accepted_basis" = 'SAMPLE_FIXTURE';
--   ALTER TABLE "form_edition" DROP CONSTRAINT "form_edition_accepted_basis";
--   ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_accepted_basis" CHECK ("accepted_basis" IS NULL OR "accepted_basis" IN ('AI_SAMPLE', 'PERSON_SAMPLE', 'EXPERT'));
