-- C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-1..BR-10; the team's AG-15-56, AG-07 C3.5,
-- AG-7-107 Q71 option B, SA-1B-269 rules 2 and 10; founder P-412). Expand only: four new columns on case_participant
-- (each with a default or nullable, so every row and all code before this keep working) and four new tables nothing
-- older reads. Independent of any other migration in flight.
--   * case_participant.keep_private (+ at, by, why): the team's one stored setting per adult, "Keep private from the
--     principal". On at the adult's first right code or a staff tick with a reason; it stays on (M3 has no untick, Q1):
--     a trigger refuses true -> false. Every client-route filter reads this column, never an age.
--   * person_link: a link sent to one adult's address (32-byte token and 6-digit code, both kept only as sha256),
--     who gave the address, 14 days, wrong tries, accepted, consent, and why it died (taken back, superseded, locked).
--     At most one link per person is not dead (a partial unique index), so two sends at the same moment cannot leave
--     two working links.
--   * person_link_try: code sends and code tries, for the per-address and per-server limits (as extension_code_try).
--   * person_link_session: the adult's 8-hour session (token sha256 only), revocable; scoped to its link.
--   * demo_message: the email stand-in (SI-20): the demo inbox by address, demo workspace only; a code message is
--     deleted when the code is used or replaced, every message of a link when the link dies.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "demo_message"; DROP TABLE "person_link_session"; DROP TABLE "person_link_try"; DROP TABLE "person_link";
--   DROP TRIGGER "case_participant_private_stays" ON "case_participant"; DROP FUNCTION "c616_private_stays"();
--   ALTER TABLE "case_participant" DROP CONSTRAINT "case_participant_private_check", DROP COLUMN "keep_private",
--     DROP COLUMN "private_at", DROP COLUMN "private_by", DROP COLUMN "private_why";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261109100000_c616_person_link';
-- A rollback loses every link, session and privacy setting (the answers stay; the principal sees them again).

ALTER TABLE "case_participant" ADD COLUMN "keep_private" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "private_at" TIMESTAMPTZ, ADD COLUMN "private_by" TEXT, ADD COLUMN "private_why" TEXT;
ALTER TABLE "case_participant" ADD CONSTRAINT "case_participant_private_check"
  CHECK (NOT "keep_private" OR ("private_at" IS NOT NULL AND "private_by" IS NOT NULL AND char_length(btrim(coalesce("private_why", ''))) >= 5));
-- Q1 (P-412): privacy stays on; the staff untick is not built in M3.
CREATE FUNCTION "c616_private_stays"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."keep_private" AND NOT NEW."keep_private" THEN
    RAISE EXCEPTION 'c616: keep private stays on once set (no untick in M3)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "case_participant_private_stays" BEFORE UPDATE OF "keep_private" ON "case_participant" FOR EACH ROW EXECUTE FUNCTION "c616_private_stays"();

CREATE TABLE "person_link" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "address_masked" TEXT NOT NULL,
    "address_given_by" TEXT NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "code_hash" CHAR(64),
    "code_expires_at" TIMESTAMPTZ,
    "wrong_tries" INTEGER NOT NULL DEFAULT 0,
    "sent_by" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "consented_at" TIMESTAMPTZ,
    "voided_at" TIMESTAMPTZ,
    "void_why" TEXT,
    "voided_by" TEXT,
    "void_reason" TEXT,
    "superseded_by_id" UUID,
    "send_key" TEXT,
    CONSTRAINT "person_link_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "person_link_token_hash_key" ON "person_link"("token_hash");
-- One link per person that has not died (a resend supersedes the old one in the same transaction).
CREATE UNIQUE INDEX "person_link_one_open" ON "person_link"("subject_id") WHERE "voided_at" IS NULL;
CREATE INDEX "person_link_case_id_idx" ON "person_link"("case_id");
-- The same Send pressed twice (one key) sends once.
CREATE UNIQUE INDEX "person_link_case_id_send_key_key" ON "person_link"("case_id", "send_key");
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "person_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_void_why_check" CHECK ("void_why" IS NULL OR "void_why" IN ('taken_back', 'superseded', 'locked'));
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_voided_check" CHECK (("voided_at" IS NULL) = ("void_why" IS NULL));
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_code_check" CHECK (("code_hash" IS NULL) = ("code_expires_at" IS NULL));
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_wrong_tries_check" CHECK ("wrong_tries" BETWEEN 0 AND 5);
ALTER TABLE "person_link" ADD CONSTRAINT "person_link_address_check" CHECK (char_length("address") BETWEEN 3 AND 254 AND "address" = lower("address"));

CREATE TABLE "person_link_try" (
    "id" BIGSERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "address" VARCHAR(254) NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_link_try_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "person_link_try_kind_at_address_idx" ON "person_link_try"("kind", "at", "address");
ALTER TABLE "person_link_try" ADD CONSTRAINT "person_link_try_kind_check" CHECK ("kind" IN ('code_sent', 'code_try'));

CREATE TABLE "person_link_session" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    CONSTRAINT "person_link_session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "person_link_session_token_hash_key" ON "person_link_session"("token_hash");
CREATE INDEX "person_link_session_link_id_idx" ON "person_link_session"("link_id");
ALTER TABLE "person_link_session" ADD CONSTRAINT "person_link_session_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "person_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "demo_message" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "demo_message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "demo_message_address_created_at_idx" ON "demo_message"("address", "created_at");
ALTER TABLE "demo_message" ADD CONSTRAINT "demo_message_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "person_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demo_message" ADD CONSTRAINT "demo_message_kind_check" CHECK ("kind" IN ('link', 'code'));
