-- FO-1b (P-558, P-559 (2); BACKLOG row FO-1b rows rev 3.1; contracts platform-and-front-office-contracts-2026-11-14.md
-- §2.2, §7 binding; AG-04: AG-4-1, -4, -9, -26, -36, -62, BR-3; schema file prisma/schema/front-office-booking.prisma,
-- owner Lead B (front office)). New tables only; no existing table, column or row changes. Rows carry no workspace_id:
-- the demo reset leaves them; api/src/front-office/booking-seed.ts copies a firm's business hours to its staff.
--   * the tables of the row: fo_consultation_type, fo_availability, fo_time_off, fo_booking, fo_booking_token.
--   * rules Prisma cannot say, at the end: the btree_gist extension; no two active bookings (SCHEDULED, RESCHEDULED) of one
--     host overlap on the range padded by the type's gaps (exclusion, BR-3, AG-4-26); block_range and sequence are the
--     database's (trigger); status moves; a time change is a reschedule; a token expires at the meeting's end, is voided
--     when the booking is cancelled or moved, and only its voided_at changes, once (AG-4-36); no two windows of one person
--     overlap on a day and a person's windows share one zone (AG-4-62); firm_id never changes; staff, hosts and the firm
--     exist in the same firm (triggers, until Lead B's back-relation lines on platform.prisma let them be foreign keys);
--     ranges and shapes of minutes, slugs, links, zones and hashes (checks).
-- Rollback (in this order; review m4): DROP TRIGGER fo_platform_staff_kept ON "platform_staff"; DROP TRIGGER
--   fo_platform_firm_kept ON "platform_firm"; DROP TABLE "fo_booking_token", "fo_booking", "fo_time_off", "fo_availability",
--   "fo_consultation_type"; DROP FUNCTION fo_zone_ok(text), fo_distinct_uuids(uuid[]), fo_distinct_modes("FoMeetingMode"[]),
--   fo_firm_fixed(), fo_staff_in_firm(), fo_consultation_type_refs(), fo_availability_zone(), fo_booking_write(),
--   fo_booking_void_tokens(), fo_booking_token_write(), fo_platform_staff_kept(), fo_platform_firm_kept(); DROP TYPE
--   "FoBookingStatus", "FoMeetingMode", "FoConsultationPurpose"; delete this folder's row from _prisma_migrations.
--   btree_gist stays (other rows may use it).

-- CreateEnum
CREATE TYPE "FoConsultationPurpose" AS ENUM ('FREE_CONSULT');

-- CreateEnum
CREATE TYPE "FoMeetingMode" AS ENUM ('VIDEO', 'PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "FoBookingStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "fo_consultation_type" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" "FoConsultationPurpose" NOT NULL DEFAULT 'FREE_CONSULT',
    "modes" "FoMeetingMode"[],
    "host_staff_ids" UUID[],
    "minutes" INTEGER NOT NULL,
    "gap_before_minutes" INTEGER NOT NULL DEFAULT 0,
    "gap_after_minutes" INTEGER NOT NULL DEFAULT 10,
    "min_notice_minutes" INTEGER NOT NULL DEFAULT 240,
    "window_days" INTEGER NOT NULL DEFAULT 60,
    "self_service_limit_minutes" INTEGER NOT NULL DEFAULT 240,
    "slot_interval_minutes" INTEGER,
    "meeting_link" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_consultation_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_availability" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "time_zone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_time_off" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_booking" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "type_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "person_id" UUID,
    "prospect_id" UUID,
    "status" "FoBookingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "mode" "FoMeetingMode" NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "visitor_time_zone" TEXT NOT NULL,
    "block_range" tstzrange,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_booking_token" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "voided_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_booking_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fo_consultation_type_firm_id_slug_key" ON "fo_consultation_type"("firm_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "fo_consultation_type_firm_id_id_key" ON "fo_consultation_type"("firm_id", "id");

-- CreateIndex
CREATE INDEX "fo_availability_firm_id_staff_id_weekday_idx" ON "fo_availability"("firm_id", "staff_id", "weekday");

-- CreateIndex
CREATE INDEX "fo_time_off_firm_id_staff_id_starts_at_idx" ON "fo_time_off"("firm_id", "staff_id", "starts_at");

-- CreateIndex
CREATE INDEX "fo_booking_firm_id_staff_id_starts_at_idx" ON "fo_booking"("firm_id", "staff_id", "starts_at");

-- CreateIndex
CREATE INDEX "fo_booking_firm_id_starts_at_idx" ON "fo_booking"("firm_id", "starts_at");

-- CreateIndex
CREATE INDEX "fo_booking_firm_id_type_id_idx" ON "fo_booking"("firm_id", "type_id");

-- CreateIndex
CREATE INDEX "fo_booking_firm_id_person_id_idx" ON "fo_booking"("firm_id", "person_id");

-- CreateIndex
CREATE INDEX "fo_booking_firm_id_prospect_id_idx" ON "fo_booking"("firm_id", "prospect_id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_booking_firm_id_id_key" ON "fo_booking"("firm_id", "id");

-- CreateIndex
CREATE INDEX "fo_booking_token_firm_id_booking_id_idx" ON "fo_booking_token"("firm_id", "booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_booking_token_firm_id_token_hash_key" ON "fo_booking_token"("firm_id", "token_hash");

-- AddForeignKey
ALTER TABLE "fo_booking" ADD CONSTRAINT "fo_booking_firm_id_type_id_fkey" FOREIGN KEY ("firm_id", "type_id") REFERENCES "fo_consultation_type"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_booking_token" ADD CONSTRAINT "fo_booking_token_firm_id_booking_id_fkey" FOREIGN KEY ("firm_id", "booking_id") REFERENCES "fo_booking"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ------------------------------------------------------------------------------------------------ rules Prisma cannot say
-- btree_gist ships with PostgreSQL and is a trusted extension (a database owner may create it).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A zone is an IANA name in its own spelling that this server knows. No IANA name but Etc/GMT±N has a digit or a plus,
-- while POSIX zone strings do (America/Toronto5 would be accepted by the server as a fixed offset: break B-4), so the
-- shape refuses them. Stable, not immutable (the zone list is the server's), so it is used in triggers, not in checks.
CREATE FUNCTION fo_zone_ok(z text) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF z IS NULL OR z !~ '^(UTC|Etc/GMT[+-][0-9]{1,2}|[A-Z][A-Za-z_-]*(/[A-Z][A-Za-z_-]*)+)$' THEN RETURN false; END IF;
  PERFORM now() AT TIME ZONE z;
  RETURN true;
EXCEPTION WHEN invalid_parameter_value THEN RETURN false;
END $$;
CREATE FUNCTION fo_distinct_uuids(a uuid[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT cardinality(a) = (SELECT count(DISTINCT x) FROM unnest(a) x) $$;
CREATE FUNCTION fo_distinct_modes(a "FoMeetingMode"[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT cardinality(a) = (SELECT count(DISTINCT x) FROM unnest(a) x) $$;

ALTER TABLE "fo_consultation_type"
  ADD CONSTRAINT "fo_consultation_type_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length("slug") <= 80),
  ADD CONSTRAINT "fo_consultation_type_name_check" CHECK (char_length("name") BETWEEN 1 AND 80 AND "name" ~ '[^[:space:]\u00a0\u200b\u200c\u200d\u2060\ufeff]' AND "name" !~ '[[:cntrl:]]'),
  ADD CONSTRAINT "fo_consultation_type_modes_check" CHECK ("modes" IS NOT NULL AND cardinality("modes") >= 1 AND array_position("modes", NULL) IS NULL AND fo_distinct_modes("modes")),
  ADD CONSTRAINT "fo_consultation_type_hosts_check" CHECK ("host_staff_ids" IS NOT NULL AND array_position("host_staff_ids", NULL) IS NULL AND fo_distinct_uuids("host_staff_ids")),
  ADD CONSTRAINT "fo_consultation_type_minutes_check" CHECK ("minutes" BETWEEN 5 AND 480),
  ADD CONSTRAINT "fo_consultation_type_gaps_check" CHECK ("gap_before_minutes" BETWEEN 0 AND 1440 AND "gap_after_minutes" BETWEEN 0 AND 1440),
  ADD CONSTRAINT "fo_consultation_type_notice_check" CHECK ("min_notice_minutes" BETWEEN 0 AND 525600 AND "self_service_limit_minutes" BETWEEN 0 AND 525600),
  ADD CONSTRAINT "fo_consultation_type_window_check" CHECK ("window_days" BETWEEN 1 AND 730),
  ADD CONSTRAINT "fo_consultation_type_interval_check" CHECK ("slot_interval_minutes" IS NULL OR "slot_interval_minutes" BETWEEN 5 AND 480),
  ADD CONSTRAINT "fo_consultation_type_link_check" CHECK ("meeting_link" IS NULL OR ("meeting_link" ~ '^https://[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]+$' AND char_length("meeting_link") <= 2000));
ALTER TABLE "fo_availability"
  ADD CONSTRAINT "fo_availability_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
  ADD CONSTRAINT "fo_availability_minutes_check" CHECK ("start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute"),
  ADD CONSTRAINT "fo_availability_no_overlap" EXCLUDE USING gist ("firm_id" WITH =, "staff_id" WITH =, "weekday" WITH =, int4range("start_minute", "end_minute") WITH &&),
  -- One zone per person, checked at commit, so one statement can move all of a person's windows to a new zone (review m5).
  ADD CONSTRAINT "fo_availability_one_zone" EXCLUDE USING gist ("firm_id" WITH =, "staff_id" WITH =, "time_zone" WITH <>) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "fo_time_off" ADD CONSTRAINT "fo_time_off_range_check" CHECK (isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at"),
  ADD CONSTRAINT "fo_time_off_created_by_check" CHECK (char_length(btrim("created_by")) >= 1);
ALTER TABLE "fo_booking"
  -- Finite, and at most a day long (a type is at most 480 minutes; break B-3: an endless booking blocked its host forever).
  ADD CONSTRAINT "fo_booking_range_check" CHECK (isfinite("starts_at") AND isfinite("ends_at") AND "starts_at" < "ends_at" AND "ends_at" - "starts_at" <= interval '24 hours'),
  ADD CONSTRAINT "fo_booking_sequence_check" CHECK ("sequence" >= 0),
  ADD CONSTRAINT "fo_booking_block_range_set" CHECK ("block_range" IS NOT NULL AND NOT isempty("block_range")),
  -- BR-3, AG-4-26: one host's active bookings never overlap on the padded range (a CANCELLED, COMPLETED or NO_SHOW row
  -- leaves the rule at once). Two transactions writing overlapping rows: the second waits, then fails 23P01.
  ADD CONSTRAINT "fo_booking_no_overlap" EXCLUDE USING gist ("firm_id" WITH =, "staff_id" WITH =, "block_range" WITH &&)
    WHERE ("status" IN ('SCHEDULED', 'RESCHEDULED'));
ALTER TABLE "fo_booking_token"
  ADD CONSTRAINT "fo_booking_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fo_booking_token_voided_check" CHECK ("voided_at" IS NULL OR "voided_at" >= "created_at");

-- firm_id never changes on any of these rows.
CREATE FUNCTION fo_firm_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.firm_id IS DISTINCT FROM OLD.firm_id THEN
    RAISE EXCEPTION '%: firm_id never changes', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_consultation_type_firm_fixed BEFORE UPDATE OF firm_id ON "fo_consultation_type" FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed();
CREATE TRIGGER fo_availability_firm_fixed BEFORE UPDATE OF firm_id ON "fo_availability" FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed();
CREATE TRIGGER fo_time_off_firm_fixed BEFORE UPDATE OF firm_id ON "fo_time_off" FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed();
CREATE TRIGGER fo_booking_firm_fixed BEFORE UPDATE OF firm_id ON "fo_booking" FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed();
CREATE TRIGGER fo_booking_token_firm_fixed BEFORE UPDATE OF firm_id ON "fo_booking_token" FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed();

-- The staff member a row names is a staff member of the row's firm (23503, as a foreign key would answer).
CREATE FUNCTION fo_staff_in_firm() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM "platform_staff" s WHERE s.firm_id = NEW.firm_id AND s.id = NEW.staff_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '%: staff % is not a staff member of firm %', TG_TABLE_NAME, NEW.staff_id, NEW.firm_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_availability_staff BEFORE INSERT OR UPDATE OF firm_id, staff_id ON "fo_availability" FOR EACH ROW EXECUTE FUNCTION fo_staff_in_firm();
CREATE TRIGGER fo_time_off_staff BEFORE INSERT OR UPDATE OF firm_id, staff_id ON "fo_time_off" FOR EACH ROW EXECUTE FUNCTION fo_staff_in_firm();
CREATE TRIGGER fo_booking_staff BEFORE INSERT OR UPDATE OF firm_id, staff_id ON "fo_booking" FOR EACH ROW EXECUTE FUNCTION fo_staff_in_firm();

-- A type's firm exists and each of its hosts is a staff member of that firm.
CREATE FUNCTION fo_consultation_type_refs() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE missing uuid;
BEGIN
  PERFORM 1 FROM "platform_firm" f WHERE f.id = NEW.firm_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fo_consultation_type: firm % does not exist', NEW.firm_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  -- The hosts' rows are key-share locked, so a delete of one of them waits for this write (and then sees it).
  PERFORM 1 FROM "platform_staff" s WHERE s.firm_id = NEW.firm_id AND s.id = ANY (NEW.host_staff_ids) FOR KEY SHARE;
  SELECT h INTO missing FROM unnest(NEW.host_staff_ids) h
    WHERE NOT EXISTS (SELECT 1 FROM "platform_staff" s WHERE s.firm_id = NEW.firm_id AND s.id = h) LIMIT 1;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'fo_consultation_type: host % is not a staff member of firm %', missing, NEW.firm_id USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_consultation_type_refs BEFORE INSERT OR UPDATE OF firm_id, host_staff_ids ON "fo_consultation_type" FOR EACH ROW EXECUTE FUNCTION fo_consultation_type_refs();

CREATE FUNCTION fo_availability_zone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT fo_zone_ok(NEW.time_zone) THEN
    RAISE EXCEPTION 'fo_availability: "%" is not an IANA time zone, e.g. America/Toronto', NEW.time_zone USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_availability_zone BEFORE INSERT OR UPDATE OF time_zone ON "fo_availability" FOR EACH ROW EXECUTE FUNCTION fo_availability_zone();

-- A booking's write (AG-4-25/-26, AG-4-12, AG-4-36 rule 6, AG-4-39, AG-4-47; AG-04 C2):
--   * written SCHEDULED with sequence 0; then sequence is the database's: +1 when the time, host, type, mode or status
--     changes, unchanged otherwise (the invite's SEQUENCE never goes back);
--   * moves: SCHEDULED or RESCHEDULED → RESCHEDULED, CANCELLED, COMPLETED, NO_SHOW; COMPLETED ↔ NO_SHOW (the answer may
--     change); CANCELLED is final; nothing goes back to SCHEDULED; COMPLETED and NO_SHOW only once the meeting has
--     started (the attendance question comes after it, AG-4-39; break B-6);
--   * a change of time or host is a reschedule (status RESCHEDULED; AG-04 C2, review m6); only an active booking changes
--     time, host, type or mode;
--   * the host is one of the type's hosts and the mode one of its modes, when written or when host, type or mode change
--     (a later change to the type's lists leaves existing bookings; AG-4-12, AG-4-11; break B-5);
--   * block_range = [start − the type's gap before, end + the type's gap after), computed when the booking is written or
--     its time or type changes, never taken from the app; a later change to the type's gaps leaves it (AG-4-4 rule 8).
CREATE FUNCTION fo_booking_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t record;
BEGIN
  IF NOT fo_zone_ok(NEW.visitor_time_zone) THEN
    RAISE EXCEPTION 'fo_booking: "%" is not an IANA time zone, e.g. America/Toronto', NEW.visitor_time_zone USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SCHEDULED' THEN
      RAISE EXCEPTION 'fo_booking: a booking is written SCHEDULED, not %', NEW.status USING ERRCODE = 'check_violation';
    END IF;
    NEW.sequence := 0;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
         (OLD.status IN ('SCHEDULED', 'RESCHEDULED') AND NEW.status IN ('RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'))
      OR (OLD.status IN ('COMPLETED', 'NO_SHOW') AND NEW.status IN ('COMPLETED', 'NO_SHOW'))) THEN
      RAISE EXCEPTION 'fo_booking: status cannot move from % to %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('COMPLETED', 'NO_SHOW') AND now() < NEW.starts_at THEN
      RAISE EXCEPTION 'fo_booking: attendance (%) is recorded once the meeting has started', NEW.status USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.starts_at, NEW.ends_at, NEW.staff_id, NEW.type_id, NEW.mode) IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.staff_id, OLD.type_id, OLD.mode) THEN
      IF OLD.status NOT IN ('SCHEDULED', 'RESCHEDULED') THEN
        RAISE EXCEPTION 'fo_booking: a % booking is not moved or changed', OLD.status USING ERRCODE = 'check_violation';
      END IF;
      IF (NEW.starts_at, NEW.ends_at, NEW.staff_id) IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.staff_id) AND NEW.status <> 'RESCHEDULED' THEN
        RAISE EXCEPTION 'fo_booking: a change of time or host is a reschedule (status RESCHEDULED)' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    NEW.sequence := OLD.sequence + CASE WHEN (NEW.starts_at, NEW.ends_at, NEW.staff_id, NEW.type_id, NEW.mode, NEW.status)
      IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.staff_id, OLD.type_id, OLD.mode, OLD.status) THEN 1 ELSE 0 END;
  END IF;
  IF TG_OP = 'INSERT' OR (NEW.starts_at, NEW.ends_at, NEW.type_id, NEW.staff_id, NEW.mode) IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.type_id, OLD.staff_id, OLD.mode) THEN
    SELECT tt.gap_before_minutes, tt.gap_after_minutes, tt.host_staff_ids, tt.modes INTO t FROM "fo_consultation_type" tt WHERE tt.firm_id = NEW.firm_id AND tt.id = NEW.type_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'fo_booking: consultation type % is not a type of firm %', NEW.type_id, NEW.firm_id USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF (TG_OP = 'INSERT' OR (NEW.staff_id, NEW.type_id) IS DISTINCT FROM (OLD.staff_id, OLD.type_id)) AND NOT (NEW.staff_id = ANY (t.host_staff_ids)) THEN
      RAISE EXCEPTION 'fo_booking: staff % is not a host of consultation type %', NEW.staff_id, NEW.type_id USING ERRCODE = 'check_violation';
    END IF;
    IF (TG_OP = 'INSERT' OR (NEW.mode, NEW.type_id) IS DISTINCT FROM (OLD.mode, OLD.type_id)) AND NOT (NEW.mode = ANY (t.modes)) THEN
      RAISE EXCEPTION 'fo_booking: mode % is not offered by consultation type %', NEW.mode, NEW.type_id USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'INSERT' OR (NEW.starts_at, NEW.ends_at, NEW.type_id) IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.type_id) THEN
    IF NOT (isfinite(NEW.starts_at) AND isfinite(NEW.ends_at) AND NEW.starts_at < NEW.ends_at) THEN
      RAISE EXCEPTION 'fo_booking: a booking has finite times and ends after it starts' USING ERRCODE = 'check_violation', CONSTRAINT = 'fo_booking_range_check';
    END IF;
    NEW.block_range := tstzrange(NEW.starts_at - make_interval(mins => t.gap_before_minutes), NEW.ends_at + make_interval(mins => t.gap_after_minutes), '[)');
  ELSE
    NEW.block_range := OLD.block_range;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_booking_write BEFORE INSERT OR UPDATE ON "fo_booking" FOR EACH ROW EXECUTE FUNCTION fo_booking_write();

-- AG-4-36 rule 3: leaving the active set (cancelled, or attendance recorded) or changing time or host voids every live
-- token of the booking (a reschedule's email carries a new one, written after this update).
CREATE FUNCTION fo_booking_void_tokens() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status NOT IN ('SCHEDULED', 'RESCHEDULED') AND OLD.status IN ('SCHEDULED', 'RESCHEDULED'))
     OR (NEW.starts_at, NEW.ends_at, NEW.staff_id) IS DISTINCT FROM (OLD.starts_at, OLD.ends_at, OLD.staff_id) THEN
    UPDATE "fo_booking_token" SET voided_at = now() WHERE firm_id = NEW.firm_id AND booking_id = NEW.id AND voided_at IS NULL;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER fo_booking_void_tokens AFTER UPDATE OF status, starts_at, ends_at, staff_id ON "fo_booking" FOR EACH ROW EXECUTE FUNCTION fo_booking_void_tokens();

-- A token (AG-4-36): written live for an active booking (SCHEDULED or RESCHEDULED), expiring exactly at the meeting's
-- end; afterwards only voided_at changes, once, to the database's own clock; a token is never deleted (its hash stays
-- taken, so an old link can never come back live; break B-7).
-- Writing a token touches its booking's row (a no-op update of sequence), so a cancel or reschedule running at the same
-- time is ordered with it at any isolation level (break B-1): in READ COMMITTED the later one waits and then sees the
-- other; in REPEATABLE READ or SERIALIZABLE the later one fails with a serialization error and is retried. A shared
-- lock alone would not do: a REPEATABLE READ cancel waited for it and then could not see the new token.
CREATE FUNCTION fo_booking_token_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'fo_booking_token: a token is voided, never deleted' USING ERRCODE = 'check_violation';
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE "fo_booking" SET sequence = sequence WHERE firm_id = NEW.firm_id AND id = NEW.booking_id RETURNING status, ends_at INTO b;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'fo_booking_token: booking % is not a booking of firm %', NEW.booking_id, NEW.firm_id USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF b.status NOT IN ('SCHEDULED', 'RESCHEDULED') THEN
      RAISE EXCEPTION 'fo_booking_token: a % booking gets no self-service link', b.status USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.expires_at IS DISTINCT FROM b.ends_at THEN
      RAISE EXCEPTION 'fo_booking_token: a token expires when the meeting ends (%)', b.ends_at USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.voided_at IS NOT NULL THEN
      RAISE EXCEPTION 'fo_booking_token: a token is written live' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF (NEW.id, NEW.booking_id, NEW.token_hash, NEW.expires_at, NEW.created_at) IS DISTINCT FROM (OLD.id, OLD.booking_id, OLD.token_hash, OLD.expires_at, OLD.created_at)
       OR (OLD.voided_at IS NOT NULL AND NEW.voided_at IS DISTINCT FROM OLD.voided_at) THEN
      RAISE EXCEPTION 'fo_booking_token: only voided_at changes, once' USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.voided_at IS NULL AND NEW.voided_at IS NOT NULL THEN
      NEW.voided_at := greatest(now(), OLD.created_at);
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER fo_booking_token_write BEFORE INSERT OR UPDATE OR DELETE ON "fo_booking_token" FOR EACH ROW EXECUTE FUNCTION fo_booking_token_write();

-- The delete side of the references to platform rows (break B-2), until Lead B's back-relation lines let them be
-- foreign keys: a staff member named by an fo_ row (hours, time off, a booking, a type's hosts), or a firm with an fo_
-- row, is not deleted and does not change id (23503, as ON DELETE RESTRICT answers in READ COMMITTED, which every code
-- path uses). Under REPEATABLE READ a delete racing a new row for that person can still pass (review m11): no code
-- deletes staff or firms today, and real foreign keys (whose checks see past the snapshot) close it once Lead B's
-- back-relation lines land. These triggers sit on the platform's tables as a foreign key's own checks would; they
-- change no platform column and no platform row.
CREATE FUNCTION fo_platform_staff_kept() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.id, NEW.firm_id) IS NOT DISTINCT FROM (OLD.id, OLD.firm_id) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM "fo_availability" WHERE firm_id = OLD.firm_id AND staff_id = OLD.id)
     OR EXISTS (SELECT 1 FROM "fo_time_off" WHERE firm_id = OLD.firm_id AND staff_id = OLD.id)
     OR EXISTS (SELECT 1 FROM "fo_booking" WHERE firm_id = OLD.firm_id AND staff_id = OLD.id)
     OR EXISTS (SELECT 1 FROM "fo_consultation_type" WHERE firm_id = OLD.firm_id AND OLD.id = ANY (host_staff_ids)) THEN
    RAISE EXCEPTION 'platform_staff: staff % is still named by front-office booking rows (hours, time off, bookings or a type''s hosts)', OLD.id USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER fo_platform_staff_kept BEFORE DELETE OR UPDATE OF id, firm_id ON "platform_staff" FOR EACH ROW EXECUTE FUNCTION fo_platform_staff_kept();
CREATE FUNCTION fo_platform_firm_kept() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.id IS NOT DISTINCT FROM OLD.id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM "fo_consultation_type" WHERE firm_id = OLD.id) OR EXISTS (SELECT 1 FROM "fo_booking" WHERE firm_id = OLD.id)
     OR EXISTS (SELECT 1 FROM "fo_availability" WHERE firm_id = OLD.id) OR EXISTS (SELECT 1 FROM "fo_time_off" WHERE firm_id = OLD.id) THEN
    RAISE EXCEPTION 'platform_firm: firm % still has front-office booking rows', OLD.id USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER fo_platform_firm_kept BEFORE DELETE OR UPDATE OF id ON "platform_firm" FOR EACH ROW EXECUTE FUNCTION fo_platform_firm_kept();
