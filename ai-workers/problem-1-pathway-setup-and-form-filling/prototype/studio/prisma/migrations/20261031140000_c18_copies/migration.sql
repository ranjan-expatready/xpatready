-- C1.8 (screens, F1): copies of a form line for each person it names. Expand only: a new column with today's behaviour
-- (one copy) as the default, and a check so the database refuses what the API refuses (1 to 9).
ALTER TABLE "combination_form" ADD COLUMN "copies" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "combination_form" ADD CONSTRAINT "combination_form_copies_check" CHECK ("copies" BETWEEN 1 AND 9);
