-- Runtime lane R1d (Lead answer to break M3, P-71/P-72): "none apply" for a required repeating group, a fact confirmed
-- like any other. Expand only: one new table, append-only like answers. Rollback: DROP TABLE client_group_answer.
CREATE TABLE "client_group_answer" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "group_key" TEXT NOT NULL,
    "none_apply" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "superseded_by_id" UUID,
    "source_json" JSONB NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMPTZ,
    "effective_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_group_answer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_group_answer_status_check" CHECK ("status" IN ('DECLARED', 'VERIFIED')),
    CONSTRAINT "client_group_answer_verified_check" CHECK (("status" = 'VERIFIED') = ("verified_by" IS NOT NULL AND "verified_at" IS NOT NULL))
);
CREATE INDEX "client_group_answer_subject_id_group_key_idx" ON "client_group_answer"("subject_id", "group_key");
-- One current answer per person and group.
CREATE UNIQUE INDEX "uq_group_answer_current" ON "client_group_answer" ("subject_id", "group_key") WHERE "superseded_by_id" IS NULL;
ALTER TABLE "client_group_answer" ADD CONSTRAINT "client_group_answer_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_group_answer" ADD CONSTRAINT "client_group_answer_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "client_group_answer"("id") ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
-- Append-only: the only change is stamping a row superseded, once (the same rule as answers and rows).
CREATE TRIGGER trg_group_answer_append_only BEFORE UPDATE ON "client_group_answer" FOR EACH ROW EXECUTE FUNCTION runtime_answer_append_only();
