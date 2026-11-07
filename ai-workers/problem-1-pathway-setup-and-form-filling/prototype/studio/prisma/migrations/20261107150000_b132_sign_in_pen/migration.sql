-- B132 (C7.7 part 2, P-380 Q3): a form signed in pen on Paper records "Printed" (an existing key) then "Signed in pen".
-- Only the check on sign_step.key widens: no table, column or row changes; every existing key stays allowed.
ALTER TABLE "sign_step" DROP CONSTRAINT "sign_step_key_check";
ALTER TABLE "sign_step" ADD CONSTRAINT "sign_step_key_check" CHECK ("key" IN ('print', 'signed', 'scan_received', 'uploaded_to_ircc', 'sign_in_pen'));
