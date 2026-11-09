-- C8.3 Representative review (screens lane, B144; P-406, P-412, P-155 (1); concept screens/B144/concept.md r2, B1, B2,
-- BR-1 to BR-10): review rounds with a status per filing, each form frozen when sent and stamped when approved, and the
-- checklist copied into the round. Additive: four new tables, nothing existing changes, so the code on main before this
-- runs on this schema unchanged (it reads nothing of it). C7.6's `filing_review` is still written on every approval.
--   * review_round: one send (kind send · review_now on a solo firm, sent and opened in one step · one_step, the C7.6
--     route POST …/filings/:id/review, challenge M1 · reapprove, P-412's one-click re-approve of changed forms only);
--     number counts per case.
--   * review_round_filing: one filing in one round, with its own status (sent → under_review → approved | sent_back),
--     its own round number per filing (AG-7-29 r9), who opened and decided it, the reasons (sent back), the checklist
--     items confirmed unticked (approved, AG17-D78), the representative of record at the decision, the self-review
--     statement (P-155 (1)) and the filing_review row written. At most one open row (sent or under_review) per filing.
--   * review_round_form: one form of the filing in the round (by filing item, B2), frozen at send: its own answer
--     snapshot (the facts the form reads then) and facts hash, and its file (validated copy, else the generated copy
--     whose facts match, else none; "waits" for a form that cannot start yet, m8). stamp_*: written once, on approval.
--   * review_check: one checklist item of one filing in the round (default · program · confirmations · form), its words
--     and live state when sent, and who ticked it.
-- Append-only (BR-10), by triggers: a round is never changed; a filing row moves only along the allowed states and a
-- decided row never changes; a form row's frozen part never changes and its stamp is written once; a check is ticked or
-- unticked only while its filing is open. No row is deleted while its case exists; rows go with their case (ON DELETE
-- CASCADE, as a demo reset deletes cases). TRUNCATE is not guarded (only a full database reset uses it).
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "review_check"; DROP TABLE "review_round_form"; DROP TABLE "review_round_filing"; DROP TABLE "review_round";
--   DROP FUNCTION "c83_no_update"(); DROP FUNCTION "c83_no_delete"(); DROP FUNCTION "c83_filing_guard"();
--   DROP FUNCTION "c83_form_guard"(); DROP FUNCTION "c83_check_guard"();
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261109010000_c83_review_rounds';
-- A rollback loses the rounds, the reasons and the per-form stamps; every approval also wrote its filing_review row
-- (C7.6), so Ready to file and the record's "Reviewed by" read the same as before. The answer snapshots the rounds froze
-- stay (no other row names them).

CREATE TABLE "review_round" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_round_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_round_case_id_number_key" ON "review_round"("case_id", "number");
ALTER TABLE "review_round" ADD CONSTRAINT "review_round_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round" ADD CONSTRAINT "review_round_kind_check" CHECK ("kind" IN ('send', 'review_now', 'one_step', 'reapprove'));
ALTER TABLE "review_round" ADD CONSTRAINT "review_round_number_check" CHECK ("number" >= 1);

CREATE TABLE "review_round_filing" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "filing_round" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "opened_by" TEXT,
    "opened_at" TIMESTAMPTZ,
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ,
    "reasons" JSONB,
    "confirmed_unticked" JSONB,
    "representative" TEXT,
    "review_kind" TEXT,
    "self_statement" TEXT,
    "filing_review_id" UUID,
    CONSTRAINT "review_round_filing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_round_filing_round_id_filing_id_key" ON "review_round_filing"("round_id", "filing_id");
CREATE UNIQUE INDEX "review_round_filing_filing_id_filing_round_key" ON "review_round_filing"("filing_id", "filing_round");
-- BR-1: a filing is in at most one open round (the API names it with a 409 first; this is the second check).
CREATE UNIQUE INDEX "review_round_filing_one_open" ON "review_round_filing"("filing_id") WHERE "status" IN ('sent', 'under_review');
CREATE INDEX "review_round_filing_case_id_idx" ON "review_round_filing"("case_id");
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "review_round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_status_check" CHECK ("status" IN ('sent', 'under_review', 'approved', 'sent_back'));
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_round_check" CHECK ("filing_round" >= 1);
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_kind_check" CHECK ("review_kind" IS NULL OR "review_kind" IN ('reviewed', 'self_reviewed'));
-- Opened and decided name who and when together; a decided row names its decision's parts (BR-4, BR-5).
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_opened_check" CHECK (("opened_by" IS NULL) = ("opened_at" IS NULL));
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_decided_check" CHECK (("decided_by" IS NULL) = ("decided_at" IS NULL) AND (("status" IN ('approved', 'sent_back')) = ("decided_by" IS NOT NULL)));
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_reasons_check" CHECK (("status" = 'sent_back') = ("reasons" IS NOT NULL) AND ("reasons" IS NULL OR (jsonb_typeof("reasons") = 'array' AND jsonb_array_length("reasons") >= 1)));
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_approved_check" CHECK (("status" = 'approved') = ("review_kind" IS NOT NULL AND "representative" IS NOT NULL AND "filing_review_id" IS NOT NULL));
ALTER TABLE "review_round_filing" ADD CONSTRAINT "review_round_filing_self_check" CHECK (("review_kind" = 'self_reviewed') = ("self_statement" IS NOT NULL));

CREATE TABLE "review_round_form" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "round_filing_id" UUID NOT NULL,
    "filing_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "form_number" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "snapshot_id" UUID,
    "facts_hash" VARCHAR(64),
    "file_kind" TEXT NOT NULL,
    "file_id" UUID,
    "file_sha256" VARCHAR(64),
    "stamp_snapshot_id" UUID,
    "stamp_hash" VARCHAR(64),
    "stamp_file_kind" TEXT,
    "stamp_file_sha256" VARCHAR(64),
    "stamped_by" TEXT,
    "stamped_at" TIMESTAMPTZ,
    CONSTRAINT "review_round_form_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_round_form_round_filing_id_item_id_key" ON "review_round_form"("round_filing_id", "item_id");
CREATE INDEX "review_round_form_item_id_idx" ON "review_round_form"("item_id");
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_round_filing_id_fkey" FOREIGN KEY ("round_filing_id") REFERENCES "review_round_filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "filing_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "answer_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_stamp_snapshot_id_fkey" FOREIGN KEY ("stamp_snapshot_id") REFERENCES "answer_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_file_kind_check" CHECK ("file_kind" IN ('validated_copy', 'generated_copy', 'none', 'waits') AND ("stamp_file_kind" IS NULL OR "stamp_file_kind" IN ('validated_copy', 'generated_copy', 'none')));
-- m8: a form that waits has no snapshot, hash or file; every other form has its own snapshot and hash (B2), and a file
-- exactly when its kind names one.
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_frozen_check" CHECK ((("file_kind" = 'waits') = ("snapshot_id" IS NULL)) AND (("snapshot_id" IS NULL) = ("facts_hash" IS NULL)) AND (("file_kind" IN ('validated_copy', 'generated_copy')) = ("file_sha256" IS NOT NULL)));
ALTER TABLE "review_round_form" ADD CONSTRAINT "review_round_form_stamp_check" CHECK (("stamped_at" IS NULL) = ("stamped_by" IS NULL) AND ("stamped_at" IS NULL) = ("stamp_snapshot_id" IS NULL) AND ("stamped_at" IS NULL) = ("stamp_hash" IS NULL) AND ("stamped_at" IS NULL) = ("stamp_file_kind" IS NULL) AND (("stamp_file_kind" IN ('validated_copy', 'generated_copy')) = ("stamp_file_sha256" IS NOT NULL)));

CREATE TABLE "review_check" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "round_filing_id" UUID NOT NULL,
    "item_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "wording" TEXT NOT NULL,
    "live" JSONB,
    "ticked_by" TEXT,
    "ticked_at" TIMESTAMPTZ,
    CONSTRAINT "review_check_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_check_round_filing_id_item_key_key" ON "review_check"("round_filing_id", "item_key");
ALTER TABLE "review_check" ADD CONSTRAINT "review_check_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_check" ADD CONSTRAINT "review_check_round_filing_id_fkey" FOREIGN KEY ("round_filing_id") REFERENCES "review_round_filing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_check" ADD CONSTRAINT "review_check_source_check" CHECK ("source" IN ('default', 'program', 'confirmations', 'form'));
ALTER TABLE "review_check" ADD CONSTRAINT "review_check_ticked_check" CHECK (("ticked_by" IS NULL) = ("ticked_at" IS NULL));
ALTER TABLE "review_check" ADD CONSTRAINT "review_check_wording_check" CHECK ("wording" ~ '[^[:space:]]' AND char_length("wording") <= 300);

-- BR-10: a round is never changed.
CREATE FUNCTION "c83_no_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: send a new round instead', TG_TABLE_NAME;
END $$;
CREATE TRIGGER "review_round_no_update" BEFORE UPDATE ON "review_round" FOR EACH ROW EXECUTE FUNCTION "c83_no_update"();
-- No row is deleted while its case exists; a case deleted (a demo reset) still takes its rows with it.
CREATE FUNCTION "c83_no_delete"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "runtime_case" WHERE "id" = OLD."case_id") THEN
    RAISE EXCEPTION '% is append-only: its rows go only with their case', TG_TABLE_NAME;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER "review_round_no_delete" BEFORE DELETE ON "review_round" FOR EACH ROW EXECUTE FUNCTION "c83_no_delete"();
CREATE TRIGGER "review_round_filing_no_delete" BEFORE DELETE ON "review_round_filing" FOR EACH ROW EXECUTE FUNCTION "c83_no_delete"();
CREATE TRIGGER "review_round_form_no_delete" BEFORE DELETE ON "review_round_form" FOR EACH ROW EXECUTE FUNCTION "c83_no_delete"();
CREATE TRIGGER "review_check_no_delete" BEFORE DELETE ON "review_check" FOR EACH ROW EXECUTE FUNCTION "c83_no_delete"();
-- BR-3, BR-4, BR-5 (M4): a filing row moves only sent → under_review (opened once), and under_review → approved or
-- sent_back (decided once); who it is, and anything decided, never changes.
CREATE FUNCTION "c83_filing_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" <> OLD."id" OR NEW."workspace_id" <> OLD."workspace_id" OR NEW."case_id" <> OLD."case_id" OR NEW."round_id" <> OLD."round_id"
     OR NEW."filing_id" <> OLD."filing_id" OR NEW."filing_round" <> OLD."filing_round" THEN
    RAISE EXCEPTION 'review_round_filing: which round and filing a row is never changes';
  END IF;
  IF OLD."status" = 'sent' AND NEW."status" = 'under_review' AND OLD."opened_by" IS NULL AND NEW."opened_by" IS NOT NULL
     AND NEW."decided_by" IS NULL AND NEW."reasons" IS NULL AND NEW."confirmed_unticked" IS NULL AND NEW."representative" IS NULL
     AND NEW."review_kind" IS NULL AND NEW."self_statement" IS NULL AND NEW."filing_review_id" IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD."status" = 'under_review' AND NEW."status" IN ('approved', 'sent_back') AND OLD."decided_by" IS NULL
     AND NEW."opened_by" IS NOT DISTINCT FROM OLD."opened_by" AND NEW."opened_at" IS NOT DISTINCT FROM OLD."opened_at" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'review_round_filing: % → % is not an allowed move (only sent → under_review → approved or sent_back, once)', OLD."status", NEW."status";
END $$;
CREATE TRIGGER "review_round_filing_guard" BEFORE UPDATE ON "review_round_filing" FOR EACH ROW EXECUTE FUNCTION "c83_filing_guard"();
-- B2: a form row's frozen part never changes; its stamp is written once.
CREATE FUNCTION "c83_form_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."id", NEW."workspace_id", NEW."case_id", NEW."round_id", NEW."round_filing_id", NEW."filing_id", NEW."item_id", NEW."form_number", NEW."subject_id")
     IS DISTINCT FROM (OLD."id", OLD."workspace_id", OLD."case_id", OLD."round_id", OLD."round_filing_id", OLD."filing_id", OLD."item_id", OLD."form_number", OLD."subject_id")
     OR (NEW."snapshot_id", NEW."facts_hash", NEW."file_kind", NEW."file_id", NEW."file_sha256") IS DISTINCT FROM (OLD."snapshot_id", OLD."facts_hash", OLD."file_kind", OLD."file_id", OLD."file_sha256") THEN
    RAISE EXCEPTION 'review_round_form: what a round froze never changes';
  END IF;
  IF OLD."stamped_at" IS NOT NULL THEN
    RAISE EXCEPTION 'review_round_form: a stamp is written once';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "review_round_form_guard" BEFORE UPDATE ON "review_round_form" FOR EACH ROW EXECUTE FUNCTION "c83_form_guard"();
-- BR-2: a check is ticked or unticked only while its filing is open; its words never change.
CREATE FUNCTION "c83_check_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."id", NEW."workspace_id", NEW."case_id", NEW."round_filing_id", NEW."item_key", NEW."source", NEW."wording", NEW."live")
     IS DISTINCT FROM (OLD."id", OLD."workspace_id", OLD."case_id", OLD."round_filing_id", OLD."item_key", OLD."source", OLD."wording", OLD."live") THEN
    RAISE EXCEPTION 'review_check: an item''s words never change';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "review_round_filing" WHERE "id" = OLD."round_filing_id" AND "status" IN ('sent', 'under_review')) THEN
    RAISE EXCEPTION 'review_check: the filing is decided; its checklist is closed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "review_check_guard" BEFORE UPDATE ON "review_check" FOR EACH ROW EXECUTE FUNCTION "c83_check_guard"();
