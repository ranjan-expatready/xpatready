-- G4 (forms lane, C5.7; P-240; SA-01B v2.1 SA-1B-296 field 7, SA-1B-181, SA-1B-199): answer-key families, keys and
-- runs. Additive: three new tables, nothing existing is changed or dropped, so the code on main before this runs on
-- this schema unchanged (it reads none of them).
--   * test_family: a made-up family (people, facts, "none apply" groups), shared by the workspace's combinations.
--     Never a client: no case, no firm, no link to an answer.
--   * answer_key: what one item gives for one family in one combination (item_kind field_map + form number, or
--     rule_set + "eligibility"); DRAFT until the immigration expert signs it (SIGNED); a change to a signed key needs a
--     reason and returns it to DRAFT. Removed with its family or its combination.
--   * answer_key_run: one run, frozen: result, every line, the key version and the fingerprints it read.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "answer_key_run"; DROP TABLE "answer_key"; DROP TABLE "test_family";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261102160000_g4_answer_keys';
-- Families, keys, signatures and runs are lost by a rollback; nothing else reads them.

-- CreateTable
CREATE TABLE "test_family" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "family_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reference_date" TEXT NOT NULL,
    "people" JSONB NOT NULL,
    "facts" JSONB NOT NULL,
    "none_apply" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_key" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "combination_id" UUID NOT NULL,
    "item_kind" TEXT NOT NULL,
    "item_ref" TEXT NOT NULL,
    "expected" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "signed_by_user_id" TEXT,
    "signed_at" TIMESTAMPTZ,
    "change_reason" TEXT,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_key_run" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key_id" UUID NOT NULL,
    "key_version" INTEGER NOT NULL,
    "item_fingerprint" VARCHAR(64) NOT NULL,
    "inputs_fingerprint" VARCHAR(64) NOT NULL,
    "result" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "ran_by" TEXT NOT NULL,
    "ran_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_key_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_family_workspace_id_family_key_key" ON "test_family"("workspace_id", "family_key");

-- CreateIndex
CREATE INDEX "answer_key_combination_id_idx" ON "answer_key"("combination_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_key_family_id_combination_id_item_kind_item_ref_key" ON "answer_key"("family_id", "combination_id", "item_kind", "item_ref");

-- CreateIndex
CREATE INDEX "answer_key_run_key_id_ran_at_idx" ON "answer_key_run"("key_id", "ran_at");

-- AddForeignKey
ALTER TABLE "answer_key" ADD CONSTRAINT "answer_key_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "test_family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_key" ADD CONSTRAINT "answer_key_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_key_run" ADD CONSTRAINT "answer_key_run_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "answer_key"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- States as data, checked where they are stored.
ALTER TABLE "answer_key" ADD CONSTRAINT "answer_key_state_check" CHECK ("state" IN ('DRAFT', 'SIGNED'));
ALTER TABLE "answer_key" ADD CONSTRAINT "answer_key_item_kind_check" CHECK ("item_kind" IN ('field_map', 'rule_set'));
ALTER TABLE "answer_key" ADD CONSTRAINT "answer_key_signed_check" CHECK (("state" = 'SIGNED') = ("signed_by_user_id" IS NOT NULL AND "signed_at" IS NOT NULL));
ALTER TABLE "answer_key_run" ADD CONSTRAINT "answer_key_run_result_check" CHECK ("result" IN ('PASSED', 'FAILED'));
