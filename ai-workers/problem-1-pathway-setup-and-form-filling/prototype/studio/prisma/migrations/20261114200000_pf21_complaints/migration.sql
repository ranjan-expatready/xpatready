-- PF-21 (P-579, P-584 (8), P-600; BACKLOG row PF-21, moved from FO-13k rev 12; contracts platform-and-front-office-
-- contracts-2026-11-14.md §0, §7, §9 binding; Code of Professional Conduct for College Licensees SOR/2022-128 s. 24(3)(r),
-- s. 29, s. 37; legal reading Unconfirmed: no counsel; schema file prisma/schema/platform-register.prisma, owner Lead B
-- (platform)). New tables only (P-600: own file, own folder, additive on own tables, plat_ names); no existing table,
-- column or row changes: platform.prisma gains only the two back-relation fields, which are no column. The one addition
-- outside its tables: five rows in PF-3's role catalogue for the row's two keys (P-600 (b)'s written exception, Lead 47). Rows carry no
-- workspace_id: the demo reset leaves them.
--   * the tables of the row: plat_complaint, plat_complaint_event.
--   * rules Prisma cannot say, at the end: nobody deletes or truncates a complaint or its events (kept for map row 105's
--     keep period; the staff "never deleted" line); events are insert-only, and once a complaint is closed only a NOTE
--     may follow; a closed complaint never changes; a complaint's facts never change (who, when received, channel,
--     category, summary, the acknowledge-by date, who recorded it); the acknowledgement and the response date are set
--     once, each only after its event; every complaint has its RECEIVED event; one-time events once; the complainant's
--     shape (an id for a front-office person or case party, a name for another person); closed means an outcome and a
--     closed date; dates finite, from 2000, in order (received ≤ acknowledged ≤ response; close after them) (checks).
--   The handler is a real foreign key to (firm_id, staff_id): a firm's complaint never names another firm's person.
-- Rollback (in this order): DELETE FROM "platform_role_permission" WHERE permission_key IN ('agent/complaint:record',
--   'agent/complaint:read'); DROP TABLE "plat_complaint_event", "plat_complaint"; DROP FUNCTION
--   plat_complaint_has_text(text), plat_complaint_one_line(text), plat_complaint_kept(), plat_complaint_write(),
--   plat_complaint_received(), plat_complaint_event_write(); DROP TYPE "PlatComplaintSubjectKind",
--   "PlatComplaintChannel", "PlatComplaintCategory", "PlatComplaintStatus", "PlatComplaintOutcome",
--   "PlatComplaintEventKind"; delete this folder's row from _prisma_migrations.

-- CreateEnum
CREATE TYPE "PlatComplaintSubjectKind" AS ENUM ('FRONT_OFFICE_PERSON', 'CASE_PARTY', 'OTHER_PERSON');

-- CreateEnum
CREATE TYPE "PlatComplaintChannel" AS ENUM ('EMAIL', 'PHONE', 'IN_PERSON', 'LETTER', 'WEB_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatComplaintCategory" AS ENUM ('SERVICE', 'FEES', 'COMMUNICATION', 'CONDUCT', 'PRIVACY', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatComplaintStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PlatComplaintOutcome" AS ENUM ('RESOLVED', 'UPHELD', 'NOT_UPHELD', 'WITHDRAWN', 'REFERRED_TO_COLLEGE');

-- CreateEnum
CREATE TYPE "PlatComplaintEventKind" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'STEP', 'NOTE', 'RESPONSE_SENT', 'HANDLER_CHANGED', 'REMINDER_SENT', 'CLOSED');

-- CreateTable
CREATE TABLE "plat_complaint" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "subject_kind" "PlatComplaintSubjectKind" NOT NULL,
    "subject_id" UUID,
    "complainant_name" TEXT,
    "complainant_contact" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL,
    "channel" "PlatComplaintChannel" NOT NULL,
    "category" "PlatComplaintCategory" NOT NULL,
    "summary" TEXT NOT NULL,
    "handler_staff_id" UUID NOT NULL,
    "acknowledge_by" TIMESTAMPTZ NOT NULL,
    "acknowledged_at" TIMESTAMPTZ,
    "response_sent_at" TIMESTAMPTZ,
    "status" "PlatComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" "PlatComplaintOutcome",
    "closed_at" TIMESTAMPTZ,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plat_complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plat_complaint_event" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "firm_id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "kind" "PlatComplaintEventKind" NOT NULL,
    "at" TIMESTAMPTZ NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plat_complaint_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plat_complaint_firm_id_status_acknowledge_by_idx" ON "plat_complaint"("firm_id", "status", "acknowledge_by");

-- CreateIndex
CREATE INDEX "plat_complaint_firm_id_handler_staff_id_idx" ON "plat_complaint"("firm_id", "handler_staff_id");

-- CreateIndex
CREATE INDEX "plat_complaint_firm_id_subject_kind_subject_id_idx" ON "plat_complaint"("firm_id", "subject_kind", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "plat_complaint_firm_id_id_key" ON "plat_complaint"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "plat_complaint_event_firm_id_complaint_id_seq_key" ON "plat_complaint_event"("firm_id", "complaint_id", "seq");

-- AddForeignKey
ALTER TABLE "plat_complaint" ADD CONSTRAINT "plat_complaint_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "plat_complaint" ADD CONSTRAINT "plat_complaint_firm_id_handler_staff_id_fkey" FOREIGN KEY ("firm_id", "handler_staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "plat_complaint_event" ADD CONSTRAINT "plat_complaint_event_firm_id_complaint_id_fkey" FOREIGN KEY ("firm_id", "complaint_id") REFERENCES "plat_complaint"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ------------------------------------------------------------------------------------------- rules Prisma cannot say
-- Text that is more than blanks (spaces of every width, invisible format marks, fillers and direction marks: break m4)
-- and holds no control character (C0 or C1). The service uses the same two lists (complaints.ts BLANK, CONTROL).
CREATE FUNCTION plat_complaint_has_text(t text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT t ~ '[^\u0009-\u000d \u0085 ­͏؜ᅟᅠ ᠎ -‏ -  -⁤⁦-⁯⠀　ㅤ︀-️﻿ﾠ]'
     AND t !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u0084\u0086-\u009f]'
$$;
-- One line: no line or paragraph break of any kind, no tab.
CREATE FUNCTION plat_complaint_one_line(t text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT t !~ '[\u0009-\u000d\u0085  ]'
$$;

ALTER TABLE "plat_complaint"
  ADD CONSTRAINT "plat_complaint_subject_check" CHECK (("subject_kind" = 'OTHER_PERSON') = ("subject_id" IS NULL)),
  ADD CONSTRAINT "plat_complaint_complainant_check" CHECK (
    ("subject_kind" <> 'OTHER_PERSON' OR "complainant_name" IS NOT NULL)
    AND ("complainant_name" IS NULL OR (char_length("complainant_name") <= 200 AND plat_complaint_has_text("complainant_name") AND plat_complaint_one_line("complainant_name")))
    AND ("complainant_contact" IS NULL OR (char_length("complainant_contact") <= 320 AND plat_complaint_has_text("complainant_contact") AND plat_complaint_one_line("complainant_contact")))),
  ADD CONSTRAINT "plat_complaint_summary_check" CHECK (char_length("summary") <= 4000 AND plat_complaint_has_text("summary")),
  ADD CONSTRAINT "plat_complaint_recorded_by_check" CHECK (char_length("recorded_by") <= 200 AND plat_complaint_has_text("recorded_by")),
  ADD CONSTRAINT "plat_complaint_closed_check" CHECK (("status" = 'CLOSED') = ("outcome" IS NOT NULL) AND ("status" = 'CLOSED') = ("closed_at" IS NOT NULL)),
  -- Dates are finite, from 2000 on, never before the complaint was received; the acknowledgement comes no later than
  -- the response, and the close no earlier than either (break m7).
  ADD CONSTRAINT "plat_complaint_dates_check" CHECK (
    isfinite("received_at") AND "received_at" >= '2000-01-01T00:00:00Z' AND isfinite("acknowledge_by") AND "acknowledge_by" > "received_at"
    AND ("acknowledged_at" IS NULL OR (isfinite("acknowledged_at") AND "acknowledged_at" >= "received_at"))
    AND ("response_sent_at" IS NULL OR (isfinite("response_sent_at") AND "response_sent_at" >= "received_at"))
    AND ("acknowledged_at" IS NULL OR "response_sent_at" IS NULL OR "acknowledged_at" <= "response_sent_at")
    AND ("closed_at" IS NULL OR (isfinite("closed_at") AND "closed_at" >= greatest("received_at", "acknowledged_at", "response_sent_at"))));

ALTER TABLE "plat_complaint_event"
  ADD CONSTRAINT "plat_complaint_event_actor_check" CHECK (char_length("actor") <= 200 AND plat_complaint_has_text("actor")),
  ADD CONSTRAINT "plat_complaint_event_note_check" CHECK (
    ("note" IS NULL OR (char_length("note") <= 4000 AND plat_complaint_has_text("note")))
    AND ("kind" NOT IN ('STEP', 'NOTE') OR "note" IS NOT NULL)),
  ADD CONSTRAINT "plat_complaint_event_at_check" CHECK (isfinite("at") AND "at" >= '2000-01-01T00:00:00Z');

-- Kept for the keep period (map row 105) and never deleted by anyone: no delete, no truncate, on either table. (The
-- table owner can still drop or switch off a trigger: the database role posture is PF-12's, as for module_event.)
CREATE FUNCTION plat_complaint_kept() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: complaints are kept and never deleted (% refused)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "plat_complaint_kept" BEFORE DELETE ON "plat_complaint" FOR EACH ROW EXECUTE FUNCTION plat_complaint_kept();
CREATE TRIGGER "plat_complaint_no_truncate" BEFORE TRUNCATE ON "plat_complaint" FOR EACH STATEMENT EXECUTE FUNCTION plat_complaint_kept();
CREATE TRIGGER "plat_complaint_event_kept" BEFORE DELETE ON "plat_complaint_event" FOR EACH ROW EXECUTE FUNCTION plat_complaint_kept();
CREATE TRIGGER "plat_complaint_event_no_truncate" BEFORE TRUNCATE ON "plat_complaint_event" FOR EACH STATEMENT EXECUTE FUNCTION plat_complaint_kept();

-- A complaint is written OPEN; while open, only the handler, the acknowledgement (once), the response date (once) and
-- the close change, each only with its event already written in the same transaction (the record follows its events:
-- break m5); a closed complaint never changes (a new event records anything later).
CREATE FUNCTION plat_complaint_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last_to text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'OPEN' OR NEW.acknowledged_at IS NOT NULL OR NEW.response_sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'plat_complaint: a complaint is written OPEN, not yet acknowledged or answered' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'CLOSED' THEN
    RAISE EXCEPTION 'plat_complaint: a closed complaint never changes (record a new event instead)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.firm_id IS DISTINCT FROM OLD.firm_id OR NEW.subject_kind IS DISTINCT FROM OLD.subject_kind
     OR NEW.subject_id IS DISTINCT FROM OLD.subject_id OR NEW.complainant_name IS DISTINCT FROM OLD.complainant_name
     OR NEW.complainant_contact IS DISTINCT FROM OLD.complainant_contact OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.channel IS DISTINCT FROM OLD.channel OR NEW.category IS DISTINCT FROM OLD.category OR NEW.summary IS DISTINCT FROM OLD.summary
     OR NEW.acknowledge_by IS DISTINCT FROM OLD.acknowledge_by OR NEW.recorded_by IS DISTINCT FROM OLD.recorded_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'plat_complaint: a complaint''s facts never change (who, received, channel, category, summary, acknowledge-by, recorded by)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at THEN
    IF OLD.acknowledged_at IS NOT NULL THEN
      RAISE EXCEPTION 'plat_complaint: the acknowledgement is recorded once' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "plat_complaint_event" e WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.id AND e.kind = 'ACKNOWLEDGED' AND e.at = NEW.acknowledged_at) THEN
      RAISE EXCEPTION 'plat_complaint: an acknowledgement needs its ACKNOWLEDGED event first' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.response_sent_at IS DISTINCT FROM OLD.response_sent_at THEN
    IF OLD.response_sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'plat_complaint: the response date is recorded once' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM "plat_complaint_event" e WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.id AND e.kind = 'RESPONSE_SENT' AND e.at = NEW.response_sent_at) THEN
      RAISE EXCEPTION 'plat_complaint: a response date needs its RESPONSE_SENT event first' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.status = 'CLOSED' AND NOT EXISTS (SELECT 1 FROM "plat_complaint_event" e WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.id
       AND e.kind = 'CLOSED' AND e.at = NEW.closed_at AND e.detail ->> 'outcome' = NEW.outcome::text) THEN
    RAISE EXCEPTION 'plat_complaint: a close needs its CLOSED event (same date and outcome) first' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.handler_staff_id IS DISTINCT FROM OLD.handler_staff_id THEN
    SELECT e.detail ->> 'to' INTO last_to FROM "plat_complaint_event" e WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.id AND e.kind = 'HANDLER_CHANGED' ORDER BY e.seq DESC LIMIT 1;
    IF last_to IS DISTINCT FROM NEW.handler_staff_id::text THEN
      RAISE EXCEPTION 'plat_complaint: a new handler needs its HANDLER_CHANGED event first' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "plat_complaint_write" BEFORE INSERT OR UPDATE ON "plat_complaint" FOR EACH ROW EXECUTE FUNCTION plat_complaint_write();

-- Every complaint has its RECEIVED event by the end of the transaction that wrote it (checked at commit).
CREATE FUNCTION plat_complaint_received() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "plat_complaint_event" e WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.id AND e.kind = 'RECEIVED') THEN
    RAISE EXCEPTION 'plat_complaint: a complaint is written with its RECEIVED event' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "plat_complaint_received" AFTER INSERT ON "plat_complaint" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION plat_complaint_received();

-- Events are insert-only. Each insert locks its complaint (FOR UPDATE), so a complaint's events are written one at a
-- time: RECEIVED is the first (at the received date) and only the first; ACKNOWLEDGED, RESPONSE_SENT, REMINDER_SENT and
-- CLOSED are written once; no event is dated before the complaint was received; a closed complaint takes only a NOTE.
CREATE FUNCTION plat_complaint_event_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record; n bigint;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'plat_complaint_event: complaint events are never changed (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT status, received_at INTO c FROM "plat_complaint" WHERE firm_id = NEW.firm_id AND id = NEW.complaint_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;   -- the foreign key answers
  END IF;
  SELECT count(*) INTO n FROM "plat_complaint_event" WHERE firm_id = NEW.firm_id AND complaint_id = NEW.complaint_id;
  IF (n = 0) <> (NEW.kind = 'RECEIVED') THEN
    RAISE EXCEPTION 'plat_complaint_event: RECEIVED is a complaint''s first event and only its first' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.kind = 'RECEIVED' AND NEW.at <> c.received_at THEN
    RAISE EXCEPTION 'plat_complaint_event: the RECEIVED event is dated when the complaint was received' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.at < c.received_at THEN
    RAISE EXCEPTION 'plat_complaint_event: no event is dated before the complaint was received' USING ERRCODE = 'check_violation';
  END IF;
  IF c.status = 'CLOSED' AND NEW.kind <> 'NOTE' THEN
    RAISE EXCEPTION 'plat_complaint_event: a closed complaint takes only a NOTE, not %', NEW.kind USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.kind IN ('ACKNOWLEDGED', 'RESPONSE_SENT', 'REMINDER_SENT', 'CLOSED') AND EXISTS (SELECT 1 FROM "plat_complaint_event" e
       WHERE e.firm_id = NEW.firm_id AND e.complaint_id = NEW.complaint_id AND e.kind = NEW.kind) THEN
    RAISE EXCEPTION 'plat_complaint_event: % is recorded once', NEW.kind USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "plat_complaint_event_write" BEFORE INSERT OR UPDATE ON "plat_complaint_event" FOR EACH ROW EXECUTE FUNCTION plat_complaint_event_write();

-- The two permission keys of the row (FO-13k rev 12), in PF-3's role catalogue: added rows only, P-600 (b)'s one written
-- exception (Lead 47's answer on #1753, 14 Nov 18:5x IST): record for Owner, Admin and Case Manager (anyone who hears a
-- complaint can log it); read for Owner and Admin (the handler reads their own without it).
INSERT INTO "platform_role_permission" ("role", "permission_key") VALUES
  ('OWNER', 'agent/complaint:record'), ('ADMIN', 'agent/complaint:record'), ('CASE_MANAGER', 'agent/complaint:record'),
  ('OWNER', 'agent/complaint:read'), ('ADMIN', 'agent/complaint:read');
