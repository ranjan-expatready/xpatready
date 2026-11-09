-- C6.17 A multi-stage case (B139; concept screens/B139/concept.md §2, BR-1..BR-10; challenge B1, B2, M3, M4, M5; founder
-- P-412 F13). One case, stages in sequence: a stage is one combination on the case's route (data, no new tree level).
-- Expand, backfill, constrain:
--   * route: an ordered list of existing combinations, kept as data (pack content; the Sample import, no firm).
--   * case_stage: the case's stages, frozen from the route at opening; one CURRENT stage per case, whose combination is
--     the case's (a deferred check at commit); forward-only states; key details on the stage record (SA-1B-212 §7).
--   * stage_id on filing, submission_group, checklist_line, review_finding, case_task: every existing row is on its case's
--     one stage (backfill: one CURRENT stage per case, the case's own combination and application subject), then NOT NULL.
--   * uniques widened to the stage: filing (case, stage, subject), checklist_line (case, stage, subject, type), the one
--     FAMILY group (case, stage) (challenge B2), the one live rules finding (case, stage, fingerprint).
--   * an ended stage's rows are history: inserting a row on a stage that is not CURRENT, or changing one, is refused
--     ("case_stage_ended"), with the case row taken FOR KEY SHARE so a write racing "Start next stage" (which holds the
--     case FOR UPDATE) waits for it and then sees the stage ended (BR-10, challenge M4).
-- Rollback (only while every case has one stage): drop the five triggers trg_*_stage_current and function
-- runtime_stage_row_current(); drop trigger trg_case_stage_forward, trg_case_stage_current, trg_runtime_case_stage and
-- their functions; recreate the four uniques without stage_id; drop column stage_id on the five tables; drop table
-- case_stage, route.

-- CreateTable
CREATE TABLE "route" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'SAMPLE',
    "stages" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "route_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "route_basis_check" CHECK ("basis" IN ('SAMPLE', 'CITED')),
    CONSTRAINT "route_stages_list" CHECK (jsonb_typeof("stages") = 'array' AND jsonb_array_length("stages") >= 2)
);
CREATE UNIQUE INDEX "route_workspace_id_key_key" ON "route"("workspace_id", "key");

-- CreateTable
CREATE TABLE "case_stage" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "firm_key" TEXT NOT NULL,
    "ord" INTEGER NOT NULL,
    "stage_key" TEXT NOT NULL,
    "staff_name" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "combination_id" UUID NOT NULL,
    "application_subject_id" UUID,
    "state" TEXT NOT NULL,
    "started_from" TEXT,
    "key_details" JSONB NOT NULL DEFAULT '{}',
    "deadline_rule" JSONB,
    "route_key" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "started_by" TEXT,
    "started_at" TIMESTAMPTZ,
    "ended_by" TEXT,
    "ended_at" TIMESTAMPTZ,
    "recorded_by" TEXT,
    "recorded_at" TIMESTAMPTZ,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_stage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "case_stage_state_check" CHECK ("state" IN ('DONE_BEFORE', 'CURRENT', 'ENDED_NEXT_STARTED', 'NOT_STARTED', 'NOT_RECORDED')),
    CONSTRAINT "case_stage_started_from_check" CHECK ("started_from" IS NULL OR "started_from" IN ('BEGIN', 'NEXT_STAGE')),
    -- A worked stage (current or ended) has its own application subject and a start; a done-before stage has neither (rule 4).
    CONSTRAINT "case_stage_worked_has_subject" CHECK (("state" IN ('CURRENT', 'ENDED_NEXT_STARTED') AND "application_subject_id" IS NOT NULL AND "started_from" IS NOT NULL) OR ("state" NOT IN ('CURRENT', 'ENDED_NEXT_STARTED') AND "application_subject_id" IS NULL AND "started_from" IS NULL)),
    CONSTRAINT "case_stage_key_details_object" CHECK (jsonb_typeof("key_details") = 'object')
);
CREATE UNIQUE INDEX "case_stage_case_id_ord_key" ON "case_stage"("case_id", "ord");
CREATE UNIQUE INDEX "case_stage_case_id_combination_id_key" ON "case_stage"("case_id", "combination_id");
CREATE UNIQUE INDEX "case_stage_application_subject_id_key" ON "case_stage"("application_subject_id");
CREATE UNIQUE INDEX "case_stage_one_current" ON "case_stage"("case_id") WHERE "state" = 'CURRENT';
CREATE INDEX "case_stage_workspace_id_case_id_idx" ON "case_stage"("workspace_id", "case_id");
ALTER TABLE "case_stage" ADD CONSTRAINT "case_stage_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_stage" ADD CONSTRAINT "case_stage_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "case_stage" ADD CONSTRAINT "case_stage_application_subject_id_fkey" FOREIGN KEY ("application_subject_id") REFERENCES "answer_subject"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Backfill: one CURRENT stage per case, on its own combination, with its existing application subject (role "case").
INSERT INTO "case_stage" ("id", "workspace_id", "case_id", "firm_key", "ord", "stage_key", "staff_name", "client_name", "combination_id", "application_subject_id", "state", "started_from", "started_by", "started_at")
SELECT gen_random_uuid(), k."workspace_id", k."id", k."firm_key", 1, c."combination_key", c."label", c."label", k."combination_id",
       (SELECT p."subject_id" FROM "case_participant" p WHERE p."case_id" = k."id" AND p."role" = 'case' ORDER BY p."order" LIMIT 1),
       'CURRENT', 'BEGIN', k."created_by", k."created_at"
FROM "runtime_case" k JOIN "combination" c ON c."id" = k."combination_id";

-- AlterTable: the stage on each case row (expand, backfill, constrain).
ALTER TABLE "filing" ADD COLUMN "stage_id" UUID;
ALTER TABLE "submission_group" ADD COLUMN "stage_id" UUID;
ALTER TABLE "checklist_line" ADD COLUMN "stage_id" UUID;
ALTER TABLE "review_finding" ADD COLUMN "stage_id" UUID;
ALTER TABLE "case_task" ADD COLUMN "stage_id" UUID;
UPDATE "filing" t SET "stage_id" = s."id" FROM "case_stage" s WHERE s."case_id" = t."case_id" AND s."state" = 'CURRENT';
UPDATE "submission_group" t SET "stage_id" = s."id" FROM "case_stage" s WHERE s."case_id" = t."case_id" AND s."state" = 'CURRENT';
UPDATE "checklist_line" t SET "stage_id" = s."id" FROM "case_stage" s WHERE s."case_id" = t."case_id" AND s."state" = 'CURRENT';
UPDATE "review_finding" t SET "stage_id" = s."id" FROM "case_stage" s WHERE s."case_id" = t."case_id" AND s."state" = 'CURRENT';
UPDATE "case_task" t SET "stage_id" = s."id" FROM "case_stage" s WHERE s."case_id" = t."case_id" AND s."state" = 'CURRENT';
ALTER TABLE "filing" ALTER COLUMN "stage_id" SET NOT NULL;
ALTER TABLE "submission_group" ALTER COLUMN "stage_id" SET NOT NULL;
ALTER TABLE "checklist_line" ALTER COLUMN "stage_id" SET NOT NULL;
ALTER TABLE "review_finding" ALTER COLUMN "stage_id" SET NOT NULL;
ALTER TABLE "case_task" ALTER COLUMN "stage_id" SET NOT NULL;
ALTER TABLE "filing" ADD CONSTRAINT "filing_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "case_stage"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "submission_group" ADD CONSTRAINT "submission_group_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "case_stage"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "case_stage"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "case_stage"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "case_task" ADD CONSTRAINT "case_task_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "case_stage"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE INDEX "filing_stage_id_idx" ON "filing"("stage_id");
CREATE INDEX "submission_group_stage_id_idx" ON "submission_group"("stage_id");
CREATE INDEX "checklist_line_stage_id_idx" ON "checklist_line"("stage_id");
CREATE INDEX "review_finding_stage_id_idx" ON "review_finding"("stage_id");
CREATE INDEX "case_task_stage_id_idx" ON "case_task"("stage_id");

-- Uniques widened to the stage (challenge B2 and M3).
DROP INDEX "filing_case_id_subject_id_key";
CREATE UNIQUE INDEX "filing_case_id_stage_id_subject_id_key" ON "filing"("case_id", "stage_id", "subject_id");
DROP INDEX "checklist_line_case_id_subject_id_document_type_key";
CREATE UNIQUE INDEX "checklist_line_case_id_stage_id_subject_id_document_type_key" ON "checklist_line"("case_id", "stage_id", "subject_id", "document_type");
DROP INDEX "submission_group_one_family";
CREATE UNIQUE INDEX "submission_group_one_family" ON "submission_group" ("case_id", "stage_id") WHERE "kind" = 'FAMILY';
DROP INDEX "review_finding_one_live_rule";
CREATE UNIQUE INDEX "review_finding_one_live_rule" ON "review_finding"("case_id", "stage_id", "fingerprint") WHERE "source" = 'rules' AND "state" <> 'resolved';

-- Forward only (SA-1B-66 §6): NOT_STARTED -> CURRENT -> ENDED_NEXT_STARTED; DONE_BEFORE and NOT_RECORDED never change
-- state. A stage keeps its case, place, combination, key and route; its application subject is set once, when it starts.
CREATE FUNCTION runtime_case_stage_forward() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.case_id <> OLD.case_id OR NEW.ord <> OLD.ord OR NEW.combination_id <> OLD.combination_id OR NEW.stage_key <> OLD.stage_key
     OR NEW.route_key IS DISTINCT FROM OLD.route_key OR NEW.workspace_id <> OLD.workspace_id OR NEW.firm_key <> OLD.firm_key THEN
    RAISE EXCEPTION 'case_stage_forward: a stage keeps its case, place, combination and route'; END IF;
  IF OLD.application_subject_id IS NOT NULL AND NEW.application_subject_id IS DISTINCT FROM OLD.application_subject_id THEN
    RAISE EXCEPTION 'case_stage_forward: a stage keeps its application subject'; END IF;
  IF NEW.state <> OLD.state AND NOT ((OLD.state = 'NOT_STARTED' AND NEW.state = 'CURRENT') OR (OLD.state = 'CURRENT' AND NEW.state = 'ENDED_NEXT_STARTED')) THEN
    RAISE EXCEPTION 'case_stage_forward: a stage moves forward only (% to % refused)', OLD.state, NEW.state; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_case_stage_forward BEFORE UPDATE ON "case_stage" FOR EACH ROW EXECUTE FUNCTION runtime_case_stage_forward();

-- At commit (deferred): a case has exactly one CURRENT stage and it is on the case's combination (concept §2). A case
-- deleted in the same transaction (a reset) is not checked.
CREATE FUNCTION runtime_case_stage_current() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k uuid; case_combination uuid; current_count integer; current_combination uuid;
BEGIN
  IF TG_TABLE_NAME = 'runtime_case' THEN k := NEW.id; ELSE k := NEW.case_id; END IF;
  SELECT combination_id INTO case_combination FROM runtime_case WHERE id = k;
  IF case_combination IS NULL THEN RETURN NULL; END IF;
  SELECT count(*), min(combination_id::text)::uuid INTO current_count, current_combination FROM case_stage WHERE case_id = k AND state = 'CURRENT';
  IF current_count <> 1 THEN RAISE EXCEPTION 'case_stage_current: a case has exactly one current stage (case %, found %)', k, current_count; END IF;
  IF current_combination <> case_combination THEN RAISE EXCEPTION 'case_stage_current: the case''s combination is its current stage''s (case %)', k; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_case_stage_current AFTER INSERT OR UPDATE ON "case_stage" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION runtime_case_stage_current();
CREATE CONSTRAINT TRIGGER trg_runtime_case_stage AFTER INSERT OR UPDATE OF "combination_id" ON "runtime_case" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION runtime_case_stage_current();

-- An ended stage's rows are history (BR-5, BR-10): a new row goes on the case's CURRENT stage only, and a row of a stage
-- that is not CURRENT is never changed. The case row is taken FOR KEY SHARE first: "Start next stage" holds it FOR
-- UPDATE, so a write racing the start waits, then reads the stage as it is after the start. Cascades from a deleted case
-- or filing (foreign key actions, a nested trigger) are not refused.
CREATE FUNCTION runtime_stage_row_current() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st text; sc uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.stage_id <> OLD.stage_id THEN
    RAISE EXCEPTION 'case_stage_ended: a row keeps its stage'; END IF;
  PERFORM 1 FROM runtime_case WHERE id = NEW.case_id FOR KEY SHARE;
  SELECT state, case_id INTO st, sc FROM case_stage WHERE id = NEW.stage_id;
  IF sc IS DISTINCT FROM NEW.case_id THEN RAISE EXCEPTION 'case_stage_ended: the stage is not this case''s'; END IF;
  IF st <> 'CURRENT' THEN RAISE EXCEPTION 'case_stage_ended: this stage has ended; its rows are kept as they were'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_filing_stage_current BEFORE INSERT OR UPDATE ON "filing" FOR EACH ROW EXECUTE FUNCTION runtime_stage_row_current();
CREATE TRIGGER trg_submission_group_stage_current BEFORE INSERT OR UPDATE ON "submission_group" FOR EACH ROW EXECUTE FUNCTION runtime_stage_row_current();
CREATE TRIGGER trg_checklist_line_stage_current BEFORE INSERT OR UPDATE ON "checklist_line" FOR EACH ROW EXECUTE FUNCTION runtime_stage_row_current();
CREATE TRIGGER trg_review_finding_stage_current BEFORE INSERT OR UPDATE ON "review_finding" FOR EACH ROW EXECUTE FUNCTION runtime_stage_row_current();
CREATE TRIGGER trg_case_task_stage_current BEFORE INSERT OR UPDATE ON "case_task" FOR EACH ROW EXECUTE FUNCTION runtime_stage_row_current();
