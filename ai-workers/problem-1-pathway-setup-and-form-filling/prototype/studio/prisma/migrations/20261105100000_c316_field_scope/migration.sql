-- C3.16 (L-SA4; SA-1B-130 rule 1; tech lead's approval on #1054): a shared field's scope takes four values. Only the two
-- new values are added; CLIENT_LEVEL and CASE_LEVEL stay and are read as the team's PERSON and FILING in one reader
-- (engine/field-scope.ts; SA-1B-130 rule 6 as changed, tech lead on #1054). No backfill: Postgres refuses a new enum
-- value inside the transaction that adds it, and a published field's scope never changes (SA-1B-130 rule 4).
ALTER TYPE "FieldScope" ADD VALUE IF NOT EXISTS 'HOUSEHOLD';
ALTER TYPE "FieldScope" ADD VALUE IF NOT EXISTS 'ORGANISATION';
