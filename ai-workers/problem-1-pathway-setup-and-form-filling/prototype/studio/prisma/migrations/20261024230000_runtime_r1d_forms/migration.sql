-- Runtime lane R1d (plan §8 RT-13…RT-16): generated copies of a case's forms and the confirmed facts each one read.
-- Expand only: two new tables, their indexes, keys and a guard trigger; nothing existing changes.
-- Rollback: DROP TRIGGER trg_form_instance_guard ON form_instance; DROP FUNCTION runtime_form_instance_guard();
-- DROP TABLE form_instance; DROP TABLE answer_snapshot.

-- CreateTable
CREATE TABLE "answer_snapshot" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "form_number" TEXT NOT NULL,
    "input_hash" VARCHAR(64) NOT NULL,
    "facts_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instance" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "form_number" TEXT NOT NULL,
    "config_release_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "path" TEXT,
    "sha256" VARCHAR(64),
    "result_json" JSONB,
    "error" TEXT,
    "locked_kind" TEXT,
    "locked_at" TIMESTAMPTZ,
    "locked_by" TEXT,
    "idempotency_key" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "form_instance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "form_instance_status_check" CHECK ("status" IN ('QUEUED', 'RUNNING', 'GENERATED', 'FAILED')),
    CONSTRAINT "form_instance_lock_check" CHECK (("locked_at" IS NULL AND "locked_kind" IS NULL AND "locked_by" IS NULL) OR ("status" = 'GENERATED' AND "locked_kind" IN ('validated_copy_uploaded', 'filed') AND "locked_by" IS NOT NULL))
);

-- CreateIndex
CREATE UNIQUE INDEX "form_instance_snapshot_id_key" ON "form_instance"("snapshot_id");

-- CreateIndex
CREATE INDEX "form_instance_case_id_form_number_subject_id_created_at_idx" ON "form_instance"("case_id", "form_number", "subject_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "form_instance_case_id_idempotency_key_key" ON "form_instance"("case_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "answer_snapshot" ADD CONSTRAINT "answer_snapshot_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instance" ADD CONSTRAINT "form_instance_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instance" ADD CONSTRAINT "form_instance_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "answer_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Never overwrite (P-65 d, RT-16): a copy moves only forward (QUEUED → RUNNING → GENERATED | FAILED, QUEUED → FAILED when
-- interrupted); its file, hash and result never change once written; a GENERATED copy is locked at most once; a locked
-- or failed copy never changes again. A snapshot of facts never changes.
CREATE FUNCTION runtime_form_instance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL OR OLD.status = 'FAILED' THEN RAISE EXCEPTION 'runtime_form_instance_guard: a locked or failed copy never changes'; END IF;
  IF NEW.id <> OLD.id OR NEW.case_id <> OLD.case_id OR NEW.subject_id <> OLD.subject_id OR NEW.form_number <> OLD.form_number OR NEW.config_release_id <> OLD.config_release_id
     OR NEW.snapshot_id <> OLD.snapshot_id OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'runtime_form_instance_guard: a copy keeps what it is a copy of'; END IF;
  IF OLD.status = 'GENERATED' THEN
    IF NEW.status <> 'GENERATED' OR NEW.path IS DISTINCT FROM OLD.path OR NEW.sha256 IS DISTINCT FROM OLD.sha256 OR NEW.result_json IS DISTINCT FROM OLD.result_json
       OR NEW.error IS DISTINCT FROM OLD.error OR NEW.finished_at IS DISTINCT FROM OLD.finished_at OR NEW.locked_at IS NULL THEN
      RAISE EXCEPTION 'runtime_form_instance_guard: a generated copy is never overwritten; only a lock may be added, once'; END IF;
  ELSIF NOT ((OLD.status = 'QUEUED' AND NEW.status IN ('RUNNING', 'FAILED')) OR (OLD.status = 'RUNNING' AND NEW.status IN ('GENERATED', 'FAILED'))) THEN
    RAISE EXCEPTION 'runtime_form_instance_guard: a copy moves only forward (% to %)', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_form_instance_guard BEFORE UPDATE ON "form_instance" FOR EACH ROW EXECUTE FUNCTION runtime_form_instance_guard();

CREATE FUNCTION runtime_snapshot_frozen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'runtime_snapshot_frozen: the facts a copy read never change'; END $$;
CREATE TRIGGER trg_answer_snapshot_frozen BEFORE UPDATE ON "answer_snapshot" FOR EACH ROW EXECUTE FUNCTION runtime_snapshot_frozen();
