-- Runtime lane R1 (P-67): case, pin, people, answers, repeating rows. Expand only: new tables, nothing existing changes.
-- Rollback: DROP TABLE client_canonical_answer, client_fact_record, case_participant, answer_subject, party_relationship,
--   party_profile, party, pack_work_pin, runtime_case CASCADE; (no existing row is touched by this migration).

-- CreateTable
CREATE TABLE "runtime_case" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "combination_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "client_actor_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT,

    CONSTRAINT "runtime_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_work_pin" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "combination_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "pack_version_id" UUID,
    "config_release_id" UUID NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SQR_ADVANCE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "actor_id" TEXT NOT NULL,
    "pinned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_work_pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PERSON',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_profile" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "locale_preference" TEXT,
    "contact_channels_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "party_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_relationship" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_party_id" UUID NOT NULL,
    "to_party_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "party_relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_subject" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "subject_kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "answer_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_participant" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "applies" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "case_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_fact_record" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "group_key" TEXT NOT NULL,
    "row_key" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "tombstone" BOOLEAN NOT NULL DEFAULT false,
    "superseded_by_id" UUID,
    "source_json" JSONB NOT NULL,
    "effective_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_fact_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_canonical_answer" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "canonical_field_id" UUID NOT NULL,
    "canonical_field_key" TEXT NOT NULL,
    "row_key" UUID,
    "value_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_by_id" UUID,
    "source_json" JSONB NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMPTZ,

    CONSTRAINT "client_canonical_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "runtime_case_workspace_id_created_at_idx" ON "runtime_case"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_case_workspace_id_idempotency_key_key" ON "runtime_case"("workspace_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "pack_work_pin_case_id_combination_id_revision_key" ON "pack_work_pin"("case_id", "combination_id", "revision");

-- CreateIndex
CREATE INDEX "party_workspace_id_idx" ON "party"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "party_profile_party_id_key" ON "party_profile"("party_id");

-- CreateIndex
CREATE INDEX "party_relationship_from_party_id_idx" ON "party_relationship"("from_party_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_participant_subject_id_key" ON "case_participant"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_participant_case_id_order_key" ON "case_participant"("case_id", "order");

-- CreateIndex
CREATE INDEX "client_fact_record_subject_id_group_key_idx" ON "client_fact_record"("subject_id", "group_key");

-- CreateIndex
CREATE INDEX "client_canonical_answer_subject_id_canonical_field_key_idx" ON "client_canonical_answer"("subject_id", "canonical_field_key");

-- AddForeignKey
ALTER TABLE "runtime_case" ADD CONSTRAINT "runtime_case_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_work_pin" ADD CONSTRAINT "pack_work_pin_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_work_pin" ADD CONSTRAINT "pack_work_pin_config_release_id_fkey" FOREIGN KEY ("config_release_id") REFERENCES "config_release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_profile" ADD CONSTRAINT "party_profile_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_relationship" ADD CONSTRAINT "party_relationship_from_party_id_fkey" FOREIGN KEY ("from_party_id") REFERENCES "party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_relationship" ADD CONSTRAINT "party_relationship_to_party_id_fkey" FOREIGN KEY ("to_party_id") REFERENCES "party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_subject" ADD CONSTRAINT "answer_subject_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_participant" ADD CONSTRAINT "case_participant_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_participant" ADD CONSTRAINT "case_participant_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_fact_record" ADD CONSTRAINT "client_fact_record_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_fact_record" ADD CONSTRAINT "client_fact_record_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "client_fact_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_canonical_answer" ADD CONSTRAINT "client_canonical_answer_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_canonical_answer" ADD CONSTRAINT "client_canonical_answer_canonical_field_id_fkey" FOREIGN KEY ("canonical_field_id") REFERENCES "canonical_field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_canonical_answer" ADD CONSTRAINT "client_canonical_answer_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "client_canonical_answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- One current answer per subject, field and row (team: the currency partial UNIQUE of 04-spine-constraints.sql).
CREATE UNIQUE INDEX "uq_answer_current" ON "client_canonical_answer" ("subject_id", "canonical_field_key", COALESCE("row_key", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "superseded_by_id" IS NULL;
-- One current version of each repeating row.
CREATE UNIQUE INDEX "uq_fact_record_current" ON "client_fact_record" ("row_key") WHERE "superseded_by_id" IS NULL;
-- Supersede = stamp the old row with the new row's id, then insert the new row, in one transaction: the link is checked
-- at commit, so the current-answer index never sees two current rows.
ALTER TABLE "client_canonical_answer" ALTER CONSTRAINT "client_canonical_answer_superseded_by_id_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "client_fact_record" ALTER CONSTRAINT "client_fact_record_superseded_by_id_fkey" DEFERRABLE INITIALLY DEFERRED;
-- A person is never related to themself (team: the PartyRelationship self-edge CHECK).
ALTER TABLE "party_relationship" ADD CONSTRAINT "ck_party_relationship_not_self" CHECK ("from_party_id" <> "to_party_id");
-- An answer's status is one of the team's two (AnswerStatus).
ALTER TABLE "client_canonical_answer" ADD CONSTRAINT "ck_answer_status" CHECK ("status" IN ('DECLARED', 'VERIFIED'));
