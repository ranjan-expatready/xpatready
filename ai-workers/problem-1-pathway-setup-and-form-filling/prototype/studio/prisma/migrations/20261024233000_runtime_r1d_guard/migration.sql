-- Runtime lane R1d FIX (break report M5, m5): never overwrite also means never delete, never fabricate. Expand only:
-- triggers. A copy or the facts it read are deleted only with their case (the demo reset); a new copy starts empty and
-- queued; a lock keeps the workspace and is stamped now. Rollback: DROP TRIGGER trg_form_instance_no_delete ON
-- form_instance; DROP TRIGGER trg_answer_snapshot_no_delete ON answer_snapshot; DROP TRIGGER trg_form_instance_insert ON
-- form_instance; DROP FUNCTION runtime_copy_no_delete(), runtime_form_instance_insert(); restore
-- runtime_form_instance_guard() from 20261024230000_runtime_r1d_forms.

CREATE FUNCTION runtime_copy_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Deleting the case (its cascade) is the only way: by then the case row is gone.
  IF EXISTS (SELECT 1 FROM runtime_case WHERE id = OLD.case_id) THEN
    RAISE EXCEPTION 'runtime_copy_no_delete: a copy and the facts it read are kept as long as their case';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_form_instance_no_delete BEFORE DELETE ON "form_instance" FOR EACH ROW EXECUTE FUNCTION runtime_copy_no_delete();
CREATE TRIGGER trg_answer_snapshot_no_delete BEFORE DELETE ON "answer_snapshot" FOR EACH ROW EXECUTE FUNCTION runtime_copy_no_delete();

CREATE FUNCTION runtime_form_instance_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'QUEUED' OR NEW.path IS NOT NULL OR NEW.sha256 IS NOT NULL OR NEW.result_json IS NOT NULL OR NEW.locked_at IS NOT NULL OR NEW.finished_at IS NOT NULL THEN
    RAISE EXCEPTION 'runtime_form_instance_insert: a copy starts queued and empty; only the generation job writes it';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_form_instance_insert BEFORE INSERT ON "form_instance" FOR EACH ROW EXECUTE FUNCTION runtime_form_instance_insert();

CREATE OR REPLACE FUNCTION runtime_form_instance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL OR OLD.status = 'FAILED' THEN RAISE EXCEPTION 'runtime_form_instance_guard: a locked or failed copy never changes'; END IF;
  IF NEW.id <> OLD.id OR NEW.workspace_id <> OLD.workspace_id OR NEW.case_id <> OLD.case_id OR NEW.subject_id <> OLD.subject_id OR NEW.form_number <> OLD.form_number
     OR NEW.config_release_id <> OLD.config_release_id OR NEW.snapshot_id <> OLD.snapshot_id OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'runtime_form_instance_guard: a copy keeps what it is a copy of'; END IF;
  IF OLD.status = 'GENERATED' THEN
    IF NEW.status <> 'GENERATED' OR NEW.path IS DISTINCT FROM OLD.path OR NEW.sha256 IS DISTINCT FROM OLD.sha256 OR NEW.result_json IS DISTINCT FROM OLD.result_json
       OR NEW.error IS DISTINCT FROM OLD.error OR NEW.finished_at IS DISTINCT FROM OLD.finished_at OR NEW.locked_at IS NULL THEN
      RAISE EXCEPTION 'runtime_form_instance_guard: a generated copy is never overwritten; only a lock may be added, once'; END IF;
    IF abs(extract(epoch FROM NEW.locked_at - now())) > 300 THEN
      RAISE EXCEPTION 'runtime_form_instance_guard: a lock is stamped when it is made'; END IF;
  ELSIF NOT ((OLD.status = 'QUEUED' AND NEW.status IN ('RUNNING', 'FAILED')) OR (OLD.status = 'RUNNING' AND NEW.status IN ('GENERATED', 'FAILED'))) THEN
    RAISE EXCEPTION 'runtime_form_instance_guard: a copy moves only forward (% to %)', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END $$;
