-- Screen 03 slice S1 (runtime lane, concept §2 "Configuration"): a form line says how many copies, from what age, and who
-- signs it (Q2, SA-1B-102; the pick list is Sample until the immigration expert confirms). Expand only: three columns with
-- defaults, so every existing line keeps its meaning (one copy, no minimum age, signer not set). Rollback: drop the columns.
ALTER TABLE "combination_form" ADD COLUMN "copies" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "combination_form" ADD COLUMN "min_age" INTEGER;
ALTER TABLE "combination_form" ADD COLUMN "signed_by" TEXT;
ALTER TABLE "combination_form" ADD CONSTRAINT "combination_form_copies_check" CHECK ("copies" BETWEEN 1 AND 9);
ALTER TABLE "combination_form" ADD CONSTRAINT "combination_form_min_age_check" CHECK ("min_age" IS NULL OR "min_age" BETWEEN 1 AND 99);
