-- Runtime lane R1c (qa QA-28): adding a person to a case is idempotent. Expand only: two nullable columns and a unique
-- index; existing rows keep NULL keys (PostgreSQL allows many NULLs). Rollback: drop the index and the two columns.
ALTER TABLE "case_participant" ADD COLUMN "idempotency_key" TEXT, ADD COLUMN "idempotency_fingerprint" VARCHAR(64);

CREATE UNIQUE INDEX "case_participant_case_id_idempotency_key_key" ON "case_participant"("case_id", "idempotency_key");
