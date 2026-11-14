-- PF-19a (rows rev 14/16, P-584 (1), P-600): the platform's messages tables and the consent store (platform-messages.prisma).
-- Additive only: new types, new msg_ tables, their keys, checks and triggers; no other area's table changes. Every function
-- and trigger here is prefixed msg_ (rows rev 15.2). The fo_web_form → msg_consent_wording key is FO-1k's (FO-1a was not on
-- main when this was written; its brief). Nothing here changes a row that exists.

-- CreateEnum
CREATE TYPE "MsgSubjectKind" AS ENUM ('FO_PERSON', 'CASE_PARTY', 'STAFF');

-- CreateEnum
CREATE TYPE "MsgChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MsgPurpose" AS ENUM ('SERVICE', 'MARKETING');

-- CreateEnum
CREATE TYPE "MsgConsentBasis" AS ENUM ('EXPRESS', 'IMPORT_DECLARED');

-- CreateEnum
CREATE TYPE "MsgConsentSource" AS ENUM ('WEB_FORM', 'META_LEAD_AD', 'WHATSAPP_OPT_IN_REPLY', 'BOOKING_FORM', 'STAFF_RECORDED', 'IMPORT_DECLARED', 'PORTAL', 'API');

-- CreateEnum
CREATE TYPE "MsgRecorderKind" AS ENUM ('SELF_SERVICE', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MsgWithdrawalVia" AS ENUM ('UNSUBSCRIBE', 'STOP', 'STAFF', 'PORTAL', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "MsgSuppressionReason" AS ENUM ('HARD_BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'STOP', 'STAFF');

-- CreateEnum
CREATE TYPE "MsgTemplateOwner" AS ENUM ('PLATFORM', 'FIRM');

-- CreateEnum
CREATE TYPE "MsgClass" AS ENUM ('TRANSACTIONAL', 'SERVICE', 'MARKETING');

-- CreateEnum
CREATE TYPE "MsgOutboxState" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "MsgEventKind" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateTable
CREATE TABLE "msg_firm" (
    "firm_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_firm_pkey" PRIMARY KEY ("firm_id")
);

-- CreateTable
CREATE TABLE "msg_consent_wording" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "channel" "MsgChannel" NOT NULL,
    "purpose" "MsgPurpose" NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "text_hash" TEXT NOT NULL,
    "published_by" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_consent_wording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_consent" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "subject_kind" "MsgSubjectKind" NOT NULL,
    "subject_id" UUID NOT NULL,
    "channel" "MsgChannel" NOT NULL,
    "purpose" "MsgPurpose" NOT NULL,
    "wording_id" UUID,
    "basis" "MsgConsentBasis" NOT NULL,
    "source" "MsgConsentSource" NOT NULL,
    "source_ref" TEXT,
    "evidence_ref" TEXT,
    "locale" TEXT,
    "ip_hash" TEXT,
    "jurisdiction" TEXT,
    "recorded_kind" "MsgRecorderKind" NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "copied_from_id" UUID,
    "given_at" TIMESTAMPTZ NOT NULL,
    "withdrawn_at" TIMESTAMPTZ,
    "withdrawn_by" TEXT,
    "withdrawn_via" "MsgWithdrawalVia",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_consent_withdrawal" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "subject_kind" "MsgSubjectKind" NOT NULL,
    "subject_id" UUID NOT NULL,
    "channel" "MsgChannel" NOT NULL,
    "purpose" "MsgPurpose" NOT NULL,
    "via" "MsgWithdrawalVia" NOT NULL,
    "withdrawn_by" TEXT NOT NULL,
    "withdrawn_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_consent_withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_suppression" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "channel" "MsgChannel" NOT NULL,
    "address" TEXT NOT NULL,
    "reason" "MsgSuppressionReason" NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_suppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_template" (
    "id" UUID NOT NULL,
    "firm_id" UUID,
    "owner" "MsgTemplateOwner" NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" "MsgChannel" NOT NULL,
    "language" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "msg_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_template_version" (
    "id" UUID NOT NULL,
    "firm_id" UUID,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "must_keep" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_by" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_template_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_outbox" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "subject_kind" "MsgSubjectKind",
    "subject_id" UUID,
    "channel" "MsgChannel" NOT NULL,
    "address" TEXT NOT NULL,
    "template_version_id" UUID,
    "rendered_hash" TEXT NOT NULL,
    "class" "MsgClass" NOT NULL,
    "state" "MsgOutboxState" NOT NULL DEFAULT 'QUEUED',
    "state_reason" TEXT,
    "consent_id" UUID,
    "idempotency_key" TEXT,
    "provider_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "msg_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_event" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "outbox_id" UUID NOT NULL,
    "kind" "MsgEventKind" NOT NULL,
    "provider_event_id" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "msg_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "msg_send_counter" (
    "firm_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "msg_send_counter_pkey" PRIMARY KEY ("firm_id","day")
);

-- CreateIndex
CREATE UNIQUE INDEX "msg_consent_wording_firm_id_id_key" ON "msg_consent_wording"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "msg_consent_wording_firm_id_id_channel_purpose_key" ON "msg_consent_wording"("firm_id", "id", "channel", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "msg_consent_wording_firm_id_channel_purpose_locale_version_key" ON "msg_consent_wording"("firm_id", "channel", "purpose", "locale", "version");

-- CreateIndex
CREATE INDEX "msg_consent_firm_id_subject_kind_subject_id_channel_purpose_idx" ON "msg_consent"("firm_id", "subject_kind", "subject_id", "channel", "purpose", "given_at");

-- CreateIndex
CREATE INDEX "msg_consent_firm_id_wording_id_idx" ON "msg_consent"("firm_id", "wording_id");

-- CreateIndex
CREATE UNIQUE INDEX "msg_consent_firm_id_id_key" ON "msg_consent"("firm_id", "id");

-- CreateIndex
CREATE INDEX "msg_consent_withdrawal_firm_id_subject_kind_subject_id_chan_idx" ON "msg_consent_withdrawal"("firm_id", "subject_kind", "subject_id", "channel", "purpose", "withdrawn_at");

-- CreateIndex
CREATE UNIQUE INDEX "msg_suppression_firm_id_channel_address_key" ON "msg_suppression"("firm_id", "channel", "address");

-- CreateIndex
CREATE UNIQUE INDEX "msg_template_firm_id_key_channel_language_key" ON "msg_template"("firm_id", "key", "channel", "language");

-- CreateIndex
CREATE UNIQUE INDEX "msg_template_version_firm_id_template_id_version_key" ON "msg_template_version"("firm_id", "template_id", "version");

-- CreateIndex
CREATE INDEX "msg_outbox_firm_id_state_created_at_idx" ON "msg_outbox"("firm_id", "state", "created_at");

-- CreateIndex
CREATE INDEX "msg_outbox_firm_id_provider_id_idx" ON "msg_outbox"("firm_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "msg_outbox_firm_id_id_key" ON "msg_outbox"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "msg_outbox_firm_id_idempotency_key_key" ON "msg_outbox"("firm_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "msg_event_firm_id_outbox_id_occurred_at_idx" ON "msg_event"("firm_id", "outbox_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "msg_firm" ADD CONSTRAINT "msg_firm_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_consent_wording" ADD CONSTRAINT "msg_consent_wording_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_consent" ADD CONSTRAINT "msg_consent_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_consent" ADD CONSTRAINT "msg_consent_firm_id_wording_id_channel_purpose_fkey" FOREIGN KEY ("firm_id", "wording_id", "channel", "purpose") REFERENCES "msg_consent_wording"("firm_id", "id", "channel", "purpose") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_consent" ADD CONSTRAINT "msg_consent_firm_id_copied_from_id_fkey" FOREIGN KEY ("firm_id", "copied_from_id") REFERENCES "msg_consent"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_consent_withdrawal" ADD CONSTRAINT "msg_consent_withdrawal_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_suppression" ADD CONSTRAINT "msg_suppression_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_template" ADD CONSTRAINT "msg_template_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_template_version" ADD CONSTRAINT "msg_template_version_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_template_version" ADD CONSTRAINT "msg_template_version_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "msg_template"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_outbox" ADD CONSTRAINT "msg_outbox_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_outbox" ADD CONSTRAINT "msg_outbox_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "msg_template_version"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_outbox" ADD CONSTRAINT "msg_outbox_firm_id_consent_id_fkey" FOREIGN KEY ("firm_id", "consent_id") REFERENCES "msg_consent"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_event" ADD CONSTRAINT "msg_event_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_event" ADD CONSTRAINT "msg_event_firm_id_outbox_id_fkey" FOREIGN KEY ("firm_id", "outbox_id") REFERENCES "msg_outbox"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "msg_send_counter" ADD CONSTRAINT "msg_send_counter_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "msg_firm"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ----------------------------------------------------------------------------------------------------- rules Prisma cannot say
-- Addresses are kept in one form so the gate's lookup is exact (ports/consent.ts normaliseAddress): email ASCII, lower case,
-- a dotted domain with no trailing dot (EMAIL_KEPT); WhatsApp numbers in E.164.
CREATE FUNCTION msg_address_ok(channel "MsgChannel", address TEXT) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE channel
    WHEN 'EMAIL' THEN address ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' AND length(address) <= 320
    WHEN 'WHATSAPP' THEN address ~ '^\+[1-9][0-9]{6,14}$'
  END
$$;

-- Who wrote a row: `staff:<id>`, `system:<door>` or `seed:<row>` (the same pattern as PF-0p's AuditActor in
-- ports/audit.ts; AG-2-83 rule 4: a public door writes `system:<door>`).
CREATE FUNCTION msg_actor_ok(actor TEXT) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT actor ~ '^(staff|system|seed):[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$'
$$;

ALTER TABLE "msg_consent_wording"
  ADD CONSTRAINT "msg_consent_wording_purpose_check" CHECK ("purpose" = 'MARKETING' OR "channel" = 'WHATSAPP'),
  ADD CONSTRAINT "msg_consent_wording_locale_check" CHECK ("locale" ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  ADD CONSTRAINT "msg_consent_wording_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "msg_consent_wording_text_check" CHECK (length(btrim("text")) BETWEEN 1 AND 4000),
  ADD CONSTRAINT "msg_consent_wording_hash_check" CHECK ("text_hash" = encode(sha256(convert_to("text", 'UTF8')), 'hex')),
  ADD CONSTRAINT "msg_consent_wording_by_check" CHECK (msg_actor_ok("published_by"));

ALTER TABLE "msg_consent"
  -- Service email needs no consent: a SERVICE consent is the WhatsApp opt-in only (AG-2-83 rule 3).
  ADD CONSTRAINT "msg_consent_purpose_check" CHECK ("purpose" = 'MARKETING' OR "channel" = 'WHATSAPP'),
  -- Every consent names the words the person saw, except an importer's declaration (AG-2-83 rules 2, 5).
  ADD CONSTRAINT "msg_consent_wording_check" CHECK ("basis" = 'IMPORT_DECLARED' OR "wording_id" IS NOT NULL),
  ADD CONSTRAINT "msg_consent_basis_check" CHECK (("basis" = 'IMPORT_DECLARED') = ("source" = 'IMPORT_DECLARED')),
  -- A SYSTEM row is a Link or Merge copy and names the row it copies (AG-2-83 rules 3, 8).
  ADD CONSTRAINT "msg_consent_copy_check" CHECK ((("recorded_kind" = 'SYSTEM') = ("copied_from_id" IS NOT NULL)) AND "copied_from_id" IS DISTINCT FROM "id"),
  ADD CONSTRAINT "msg_consent_ip_hash_check" CHECK ("ip_hash" IS NULL OR ("source" = 'WEB_FORM' AND "ip_hash" ~ '^[0-9a-f]{64}$')),
  ADD CONSTRAINT "msg_consent_jurisdiction_check" CHECK ("jurisdiction" IS NULL OR "jurisdiction" ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
  ADD CONSTRAINT "msg_consent_locale_check" CHECK ("locale" IS NULL OR "locale" ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  ADD CONSTRAINT "msg_consent_by_check" CHECK (msg_actor_ok("recorded_by")),
  ADD CONSTRAINT "msg_consent_times_check" CHECK (isfinite("given_at") AND ("withdrawn_at" IS NULL OR isfinite("withdrawn_at"))),
  ADD CONSTRAINT "msg_consent_withdrawal_check" CHECK (
    ("withdrawn_at" IS NULL AND "withdrawn_by" IS NULL AND "withdrawn_via" IS NULL)
    OR ("withdrawn_at" IS NOT NULL AND msg_actor_ok("withdrawn_by") AND "withdrawn_via" IS NOT NULL AND "withdrawn_at" >= "given_at"));

-- A withdrawal is kept whether or not a live consent existed (AG-10-24), with who and how; insert-only (below).
ALTER TABLE "msg_consent_withdrawal"
  ADD CONSTRAINT "msg_consent_withdrawal_purpose_check" CHECK ("purpose" = 'MARKETING' OR "channel" = 'WHATSAPP'),
  ADD CONSTRAINT "msg_consent_withdrawal_by_check" CHECK (msg_actor_ok("withdrawn_by")),
  ADD CONSTRAINT "msg_consent_withdrawal_at_check" CHECK (isfinite("withdrawn_at"));

ALTER TABLE "msg_suppression"
  ADD CONSTRAINT "msg_suppression_address_check" CHECK (msg_address_ok("channel", "address")),
  ADD CONSTRAINT "msg_suppression_by_check" CHECK (msg_actor_ok("created_by"));

ALTER TABLE "msg_template"
  ADD CONSTRAINT "msg_template_owner_check" CHECK (("owner" = 'PLATFORM') = ("firm_id" IS NULL)),
  ADD CONSTRAINT "msg_template_key_check" CHECK ("key" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$' AND length("key") <= 120),
  ADD CONSTRAINT "msg_template_language_check" CHECK ("language" ~ '^[a-z]{2}(-[A-Z]{2})?$');
-- The platform's own templates have no firm, so the firm-first unique index above does not hold them: these two partial
-- indexes do (the only msg_ indexes that do not start with firm_id; they cover rows that have no firm).
CREATE UNIQUE INDEX "msg_template_platform_key" ON "msg_template" ("key", "channel", "language") WHERE "firm_id" IS NULL;

ALTER TABLE "msg_template_version"
  ADD CONSTRAINT "msg_template_version_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "msg_template_version_body_check" CHECK (length(btrim("body")) >= 1),
  ADD CONSTRAINT "msg_template_version_by_check" CHECK (msg_actor_ok("published_by"));
CREATE UNIQUE INDEX "msg_template_version_platform_version" ON "msg_template_version" ("template_id", "version") WHERE "firm_id" IS NULL;

ALTER TABLE "msg_outbox"
  ADD CONSTRAINT "msg_outbox_address_check" CHECK (msg_address_ok("channel", "address")),
  ADD CONSTRAINT "msg_outbox_subject_check" CHECK (("subject_kind" IS NULL) = ("subject_id" IS NULL)),
  ADD CONSTRAINT "msg_outbox_rendered_hash_check" CHECK ("rendered_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "msg_send_counter"
  ADD CONSTRAINT "msg_send_counter_sent_check" CHECK ("sent" >= 0);

-- Write-once rows: consent wording versions, withdrawals, template versions and delivery events refuse update, delete and
-- truncate.
CREATE FUNCTION msg_write_once() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is write-once: % refused', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END $$;
CREATE TRIGGER "msg_consent_wording_write_once" BEFORE UPDATE OR DELETE ON "msg_consent_wording" FOR EACH ROW EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_consent_wording_no_truncate" BEFORE TRUNCATE ON "msg_consent_wording" FOR EACH STATEMENT EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_template_version_write_once" BEFORE UPDATE OR DELETE ON "msg_template_version" FOR EACH ROW EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_template_version_no_truncate" BEFORE TRUNCATE ON "msg_template_version" FOR EACH STATEMENT EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_consent_withdrawal_insert_only" BEFORE UPDATE OR DELETE ON "msg_consent_withdrawal" FOR EACH ROW EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_consent_withdrawal_no_truncate" BEFORE TRUNCATE ON "msg_consent_withdrawal" FOR EACH STATEMENT EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_event_insert_only" BEFORE UPDATE OR DELETE ON "msg_event" FOR EACH ROW EXECUTE FUNCTION msg_write_once();
CREATE TRIGGER "msg_event_no_truncate" BEFORE TRUNCATE ON "msg_event" FOR EACH STATEMENT EXECUTE FUNCTION msg_write_once();

-- A consent is evidence: the only change ever made is its withdrawal, set once and never cleared; it is never deleted.
CREATE FUNCTION msg_consent_withdraw_once() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'msg_consent is evidence: % refused', TG_OP USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD."withdrawn_at" IS NOT NULL THEN
    RAISE EXCEPTION 'msg_consent %: a withdrawn consent never changes (withdrawn at %)', OLD."id", OLD."withdrawn_at" USING ERRCODE = 'restrict_violation';
  END IF;
  IF (to_jsonb(NEW) - 'withdrawn_at' - 'withdrawn_by' - 'withdrawn_via') IS DISTINCT FROM (to_jsonb(OLD) - 'withdrawn_at' - 'withdrawn_by' - 'withdrawn_via') THEN
    RAISE EXCEPTION 'msg_consent %: only the withdrawal is ever set on a consent', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "msg_consent_withdraw_once" BEFORE UPDATE OR DELETE ON "msg_consent" FOR EACH ROW EXECUTE FUNCTION msg_consent_withdraw_once();
CREATE TRIGGER "msg_consent_no_truncate" BEFORE TRUNCATE ON "msg_consent" FOR EACH STATEMENT EXECUTE FUNCTION msg_consent_withdraw_once();

-- A template's owner and firm never change, so its versions and the outbox rows naming them stay in its firm.
CREATE FUNCTION msg_template_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."firm_id" IS DISTINCT FROM OLD."firm_id" OR NEW."owner" IS DISTINCT FROM OLD."owner" OR NEW."channel" IS DISTINCT FROM OLD."channel" THEN
    RAISE EXCEPTION 'msg_template %: owner, firm_id and channel never change', OLD."id" USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "msg_template_fixed" BEFORE UPDATE ON "msg_template" FOR EACH ROW EXECUTE FUNCTION msg_template_fixed();

-- A template version carries its template's firm (none for the platform's).
CREATE FUNCTION msg_template_version_in_firm() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t_firm UUID;
BEGIN
  SELECT "firm_id" INTO t_firm FROM "msg_template" WHERE "id" = NEW."template_id";
  IF FOUND AND NEW."firm_id" IS DISTINCT FROM t_firm THEN
    RAISE EXCEPTION 'msg_template_version: firm_id % is not its template''s firm (%)', NEW."firm_id", t_firm USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "msg_template_version_in_firm" BEFORE INSERT ON "msg_template_version" FOR EACH ROW EXECUTE FUNCTION msg_template_version_in_firm();

-- An outbox row names a template version of the platform or of its own firm, on its own channel.
CREATE FUNCTION msg_outbox_template_in_firm() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_firm UUID; t_channel "MsgChannel";
BEGIN
  IF NEW."template_version_id" IS NULL THEN RETURN NEW; END IF;
  SELECT v."firm_id", t."channel" INTO v_firm, t_channel FROM "msg_template_version" v JOIN "msg_template" t ON t."id" = v."template_id" WHERE v."id" = NEW."template_version_id";
  IF FOUND AND ((v_firm IS NOT NULL AND v_firm <> NEW."firm_id") OR t_channel <> NEW."channel") THEN
    RAISE EXCEPTION 'msg_outbox: template version % is not the platform''s or firm %''s on channel %', NEW."template_version_id", NEW."firm_id", NEW."channel" USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "msg_outbox_template_in_firm" BEFORE INSERT OR UPDATE OF "template_version_id", "firm_id", "channel" ON "msg_outbox" FOR EACH ROW EXECUTE FUNCTION msg_outbox_template_in_firm();
