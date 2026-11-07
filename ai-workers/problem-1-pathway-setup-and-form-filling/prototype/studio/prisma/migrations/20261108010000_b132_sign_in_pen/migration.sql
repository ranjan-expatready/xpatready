-- B132 (C7.7 part 2, P-380 Q3): a form signed in pen on Paper records "Printed" (an existing key) then "Signed in pen".
-- Only the check on sign_step.key widens: no table, column or row changes; every existing key stays allowed.
--
-- Rollback (STANDARDS §5; tried on a copy by the B132 breaker run): first deploy the code before B132 (the new code
-- writes 'sign_in_pen', which the old check refuses with a 500), then in ONE transaction (run apart, the DROP goes
-- through and the ADD fails, leaving no check at all):
--   BEGIN;
--   DELETE FROM "sign_step" WHERE "key" = 'sign_in_pen';
--   ALTER TABLE "sign_step" DROP CONSTRAINT "sign_step_key_check";
--   ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_key_check" CHECK ("key" IN ('print', 'signed', 'scan_received', 'uploaded_to_ircc'));
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261108010000_b132_sign_in_pen';
--   COMMIT;
-- A rollback loses the "Signed in pen" steps (superseded ones too: the check covers every row); the audit line of each
-- ("… marked IMM 5257 "Signed in pen" …") stays. NOT VALID is not a way round it: the old code updates those rows.
ALTER TABLE "sign_step" DROP CONSTRAINT "sign_step_key_check";
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_key_check" CHECK ("key" IN ('print', 'signed', 'scan_received', 'uploaded_to_ircc', 'sign_in_pen'));
