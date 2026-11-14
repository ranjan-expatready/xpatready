-- PF-3 (P-558, P-559; BACKLOG row PF-3 rev 3.1; contracts platform-and-front-office-contracts-2026-11-14.md §0, §1.1, §1.2,
-- §7 binding; schema file prisma/schema/platform.prisma, owner Lead B (platform)). New tables only; no existing table,
-- column or row changes. Platform rows carry no workspace_id: the demo reset (one workspace's rows) leaves them, and
-- api/src/platform/seed-sample-firms.ts (idempotent) writes the Sample firms and staff.
--   * the tables of the row: platform_firm, platform_setting_definition, platform_firm_setting, platform_plan,
--     platform_subscription, platform_signup_link, platform_staff, platform_staff_credential, platform_role_grant,
--     platform_role_permission, platform_invitation, platform_session_revocation, webhook_receipt, module_event.
--   * rules Prisma cannot say, at the end: platform_firm.country_code and key never change (triggers); module_event refuses
--     update, delete and truncate and numbers its rows in commit order (triggers); a sign-up link is used once; an expired
--     invitation is closed by the next one; one open invitation per firm and email, one
--     live grant per person and role, one subscription not ENDED per firm (partial unique indexes); a licence record,
--     role grant or session revocation keys on (firm_id, staff_id), so it never names another firm's person, and a staff
--     member never moves firm (trigger); emails lower case;
--     country codes two capital letters; an invitation lives at most 72 hours and a sign-up link at most 14 days.
--   * data: the three Sample plans (Sample Solo 1 seat, Team 5, Firm 20; trial 14 days; no prices) and the starter
--     roles' permission keys from SA-06 v3.15 §10b (774 rows; per role as its Appendix C: 231, 213, 145, 99, 46, 40).
-- Rollback: DROP TABLE "module_event", "webhook_receipt", "platform_session_revocation", "platform_invitation",
--   "platform_role_permission", "platform_role_grant", "platform_staff_credential", "platform_staff",
--   "platform_signup_link", "platform_subscription", "platform_plan", "platform_firm_setting",
--   "platform_setting_definition", "platform_firm" CASCADE; DROP TYPE "PlatformRole", "PlatformStaffStatus",
--   "PlatformSubscriptionStatus", "PlatformFirmStatus"; DROP FUNCTION platform_firm_country_fixed(),
--   module_event_insert_only(), module_event_next_seq(), platform_firm_key_fixed(), platform_invitation_close_expired(),
--   platform_signup_link_used_once(), platform_staff_firm_fixed(), platform_roles_distinct("PlatformRole"[]); delete this folder's row from _prisma_migrations.

-- CreateEnum
CREATE TYPE "PlatformFirmStatus" AS ENUM ('PROVISIONING', 'TRIAL', 'ACTIVE', 'PAYMENT_HOLD', 'SECURITY_LOCK', 'ABANDONED', 'DELETED');

-- CreateEnum
CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'OVERDUE', 'PAYMENT_HOLD', 'ENDED');

-- CreateEnum
CREATE TYPE "PlatformStaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'ADMIN', 'CASE_MANAGER', 'CASE_OFFICER', 'BILLING_FINANCE', 'READ_ONLY');

-- CreateTable
CREATE TABLE "platform_firm" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "operating_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "country_code" CHAR(2) NOT NULL,
    "status" "PlatformFirmStatus" NOT NULL DEFAULT 'PROVISIONING',
    "owner_name" TEXT,
    "owner_email" TEXT,
    "owner_phone" TEXT,
    "business_address" JSONB,
    "billing_email" TEXT,
    "contact_email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_setting_definition" (
    "key" TEXT NOT NULL,
    "owner_module" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value_schema" JSONB NOT NULL,
    "default_value" JSONB NOT NULL,
    "change_permission" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_setting_definition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "platform_firm_setting" (
    "firm_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_firm_setting_pkey" PRIMARY KEY ("firm_id","key")
);

-- CreateTable
CREATE TABLE "platform_plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seats_limit" INTEGER NOT NULL,
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "monthly_price_cents" INTEGER,
    "yearly_price_cents" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
    "stripe_monthly_price_id" TEXT,
    "stripe_yearly_price_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_subscription" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "trial_ends_at" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_signup_link" (
    "id" UUID NOT NULL,
    "firm_id" UUID,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,

    CONSTRAINT "platform_signup_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_staff" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "family_name" TEXT,
    "given_names" TEXT,
    "display_name" TEXT NOT NULL,
    "identity_subject" TEXT,
    "actor_id" TEXT,
    "status" "PlatformStaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "deactivation_reason" TEXT,
    "last_sign_in_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_staff_credential" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "representative_type" TEXT NOT NULL,
    "licensing_body" TEXT NOT NULL,
    "licence_number" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_staff_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_grant" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "ended_by" TEXT,
    "end_reason" TEXT,

    CONSTRAINT "platform_role_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_permission" (
    "role" "PlatformRole" NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "platform_role_permission_pkey" PRIMARY KEY ("role","permission_key")
);

-- CreateTable
CREATE TABLE "platform_invitation" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "roles" "PlatformRole"[],
    "token_hash" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "platform_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_session_revocation" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "revoked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "platform_session_revocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_receipt" (
    "id" UUID NOT NULL,
    "firm_id" UUID,
    "service" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handled_at" TIMESTAMPTZ,
    "outcome" TEXT,

    CONSTRAINT "webhook_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_event" (
    "id" UUID NOT NULL,
    "seq" BIGSERIAL NOT NULL,
    "firm_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "module_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_firm_key_key" ON "platform_firm"("key");

-- CreateIndex
CREATE UNIQUE INDEX "platform_firm_contact_email_key" ON "platform_firm"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_plan_code_key" ON "platform_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscription_stripe_subscription_id_key" ON "platform_subscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "platform_subscription_firm_id_status_idx" ON "platform_subscription"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_signup_link_token_hash_key" ON "platform_signup_link"("token_hash");

-- CreateIndex
CREATE INDEX "platform_signup_link_firm_id_idx" ON "platform_signup_link"("firm_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_identity_subject_key" ON "platform_staff"("identity_subject");

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_actor_id_key" ON "platform_staff"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_firm_id_email_key" ON "platform_staff"("firm_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_firm_id_id_key" ON "platform_staff"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_staff_credential_firm_id_staff_id_key" ON "platform_staff_credential"("firm_id", "staff_id");

-- CreateIndex
CREATE INDEX "platform_role_grant_firm_id_staff_id_idx" ON "platform_role_grant"("firm_id", "staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_invitation_token_hash_key" ON "platform_invitation"("token_hash");

-- CreateIndex
CREATE INDEX "platform_invitation_firm_id_email_idx" ON "platform_invitation"("firm_id", "email");

-- CreateIndex
CREATE INDEX "platform_session_revocation_firm_id_staff_id_revoked_at_idx" ON "platform_session_revocation"("firm_id", "staff_id", "revoked_at");

-- CreateIndex
CREATE INDEX "webhook_receipt_firm_id_received_at_idx" ON "webhook_receipt"("firm_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_receipt_service_event_id_key" ON "webhook_receipt"("service", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_event_seq_key" ON "module_event"("seq");

-- CreateIndex
CREATE INDEX "module_event_firm_id_seq_idx" ON "module_event"("firm_id", "seq");

-- AddForeignKey
ALTER TABLE "platform_firm_setting" ADD CONSTRAINT "platform_firm_setting_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_firm_setting" ADD CONSTRAINT "platform_firm_setting_key_fkey" FOREIGN KEY ("key") REFERENCES "platform_setting_definition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscription" ADD CONSTRAINT "platform_subscription_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_subscription" ADD CONSTRAINT "platform_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "platform_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_signup_link" ADD CONSTRAINT "platform_signup_link_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff_credential" ADD CONSTRAINT "platform_staff_credential_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff_credential" ADD CONSTRAINT "platform_staff_credential_firm_id_staff_id_fkey" FOREIGN KEY ("firm_id", "staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "platform_role_grant" ADD CONSTRAINT "platform_role_grant_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_grant" ADD CONSTRAINT "platform_role_grant_firm_id_staff_id_fkey" FOREIGN KEY ("firm_id", "staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "platform_invitation" ADD CONSTRAINT "platform_invitation_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_session_revocation" ADD CONSTRAINT "platform_session_revocation_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_session_revocation" ADD CONSTRAINT "platform_session_revocation_firm_id_staff_id_fkey" FOREIGN KEY ("firm_id", "staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "webhook_receipt" ADD CONSTRAINT "webhook_receipt_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_event" ADD CONSTRAINT "module_event_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------------------------- rules
-- Each role once in an invitation's list (break R2-7).
CREATE FUNCTION platform_roles_distinct(r "PlatformRole"[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT r IS NULL OR cardinality(r) = (SELECT count(DISTINCT x) FROM unnest(r) x) $$;
-- Emails are stored lower case (so a unique index is case-blind); country codes are two capital letters (ISO 3166-1).
ALTER TABLE "platform_firm" ADD CONSTRAINT "platform_firm_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "platform_firm_contact_email_lower" CHECK ("contact_email" = lower(btrim("contact_email")) AND "contact_email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$'),
  ADD CONSTRAINT "platform_firm_key_check" CHECK ("key" ~ '^[a-z][a-z0-9-]{1,62}$'),
  ADD CONSTRAINT "platform_firm_owner_email_lower" CHECK ("owner_email" IS NULL OR ("owner_email" = lower(btrim("owner_email")) AND "owner_email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$')),
  ADD CONSTRAINT "platform_firm_billing_email_lower" CHECK ("billing_email" IS NULL OR ("billing_email" = lower(btrim("billing_email")) AND "billing_email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$'));
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_email_lower" CHECK ("email" = lower(btrim("email")) AND "email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$'),
  ADD CONSTRAINT "platform_staff_deactivation_reason_check" CHECK ("deactivation_reason" IS NULL OR char_length("deactivation_reason") BETWEEN 1 AND 200);
ALTER TABLE "platform_invitation" ADD CONSTRAINT "platform_invitation_email_lower" CHECK ("email" = lower(btrim("email")) AND "email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$'),
  ADD CONSTRAINT "platform_invitation_72_hours" CHECK ("expires_at" > "created_at" AND "expires_at" <= "created_at" + interval '72 hours'),
  ADD CONSTRAINT "platform_invitation_has_role" CHECK ("roles" IS NOT NULL AND cardinality("roles") >= 1 AND array_position("roles", NULL) IS NULL),
  ADD CONSTRAINT "platform_invitation_one_ending" CHECK ("accepted_at" IS NULL OR "revoked_at" IS NULL),
  ADD CONSTRAINT "platform_invitation_accepted_in_time" CHECK ("accepted_at" IS NULL OR "accepted_at" <= "expires_at"),
  ADD CONSTRAINT "platform_invitation_roles_distinct" CHECK (platform_roles_distinct("roles"));
ALTER TABLE "platform_signup_link" ADD CONSTRAINT "platform_signup_link_email_lower" CHECK ("email" = lower(btrim("email")) AND "email" ~ '^[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+@[^[:space:][:cntrl:]\u00a0\u200b\u200c\u200d\u2060\ufeff@]+$'),
  ADD CONSTRAINT "platform_signup_link_country_code_check" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "platform_signup_link_14_days" CHECK ("expires_at" > "created_at" AND "expires_at" <= "created_at" + interval '14 days'),
  ADD CONSTRAINT "platform_signup_link_used_with_firm" CHECK (("used_at" IS NULL) = ("firm_id" IS NULL));
ALTER TABLE "platform_plan" ADD CONSTRAINT "platform_plan_seats_check" CHECK ("seats_limit" >= 1),
  ADD CONSTRAINT "platform_plan_trial_days_check" CHECK ("trial_days" >= 0);
ALTER TABLE "platform_role_grant" ADD CONSTRAINT "platform_role_grant_ended_check" CHECK (("ended_at" IS NULL) = ("ended_by" IS NULL));
ALTER TABLE "platform_staff_credential" ADD CONSTRAINT "platform_staff_credential_filled" CHECK (btrim("representative_type") <> '' AND btrim("licensing_body") <> '' AND btrim("licence_number") <> '');

-- One open invitation per firm and email (neither accepted nor revoked; a resend revokes the old one first, PF-4). An
-- expired one is closed (revoked at its expiry) by the insert of the next one, so it never blocks it (break B-5); the seat
-- count (PF-4) counts only invitations not yet expired.
CREATE UNIQUE INDEX "platform_invitation_one_open" ON "platform_invitation" ("firm_id", "email") WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
CREATE FUNCTION platform_invitation_close_expired() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "platform_invitation" SET "revoked_at" = "expires_at"
   WHERE "firm_id" = NEW."firm_id" AND "email" = NEW."email" AND "accepted_at" IS NULL AND "revoked_at" IS NULL AND "expires_at" <= now();
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_invitation_close_expired" BEFORE INSERT ON "platform_invitation" FOR EACH ROW EXECUTE FUNCTION platform_invitation_close_expired();
-- One live grant per person and role (an ended grant keeps its row).
CREATE UNIQUE INDEX "platform_role_grant_one_live" ON "platform_role_grant" ("firm_id", "staff_id", "role") WHERE "ended_at" IS NULL;
-- One subscription that has not ENDED per firm.
CREATE UNIQUE INDEX "platform_subscription_one_live" ON "platform_subscription" ("firm_id") WHERE "status" <> 'ENDED';

-- A firm's country never changes (SA-2-1: one immutable country).
CREATE FUNCTION platform_firm_country_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."country_code" IS DISTINCT FROM OLD."country_code" THEN
    RAISE EXCEPTION 'platform_firm_country_fixed: a firm''s country never changes (% stays %)', OLD."key", OLD."country_code" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_firm_country_fixed" BEFORE UPDATE OF "country_code" ON "platform_firm" FOR EACH ROW EXECUTE FUNCTION platform_firm_country_fixed();

-- A firm's key never changes either: cases carry it (runtime_case.firm_key, the case side's column, no foreign key), so a
-- renamed key would leave them pointing at no firm (break B-4).
CREATE FUNCTION platform_firm_key_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."key" IS DISTINCT FROM OLD."key" THEN
    RAISE EXCEPTION 'platform_firm_key_fixed: a firm''s key never changes (% stays)', OLD."key" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_firm_key_fixed" BEFORE UPDATE OF "key" ON "platform_firm" FOR EACH ROW EXECUTE FUNCTION platform_firm_key_fixed();

-- A staff member never moves to another firm (break R2-2): someone joining another firm is a new staff row there. The
-- (firm_id, staff_id) keys also refuse the move (ON UPDATE RESTRICT), so grants and a licence never follow a person.
CREATE FUNCTION platform_staff_firm_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."firm_id" IS DISTINCT FROM OLD."firm_id" THEN
    RAISE EXCEPTION 'platform_staff_firm_fixed: a staff member never moves to another firm' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_staff_firm_fixed" BEFORE UPDATE OF "firm_id" ON "platform_staff" FOR EACH ROW EXECUTE FUNCTION platform_staff_firm_fixed();

-- The outbox is insert-only (contracts §0.5): no update, no delete, no truncate.
CREATE FUNCTION module_event_insert_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'module_event_insert_only: module events are never changed or removed (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "module_event_insert_only" BEFORE UPDATE OR DELETE ON "module_event" FOR EACH ROW EXECUTE FUNCTION module_event_insert_only();
CREATE TRIGGER "module_event_no_truncate" BEFORE TRUNCATE ON "module_event" FOR EACH STATEMENT EXECUTE FUNCTION module_event_insert_only();

-- seq is the readers' cursor, so it must follow commit order (break B-1: a sequence number taken at insert by a slow
-- transaction would commit after a later one and be skipped by a reader already past it). Each insert takes one lock held
-- to the end of its transaction and only then its number, so writers of module events commit one after another in seq
-- order; a seq the writer gives is replaced.
CREATE FUNCTION module_event_next_seq() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('module_event_seq'));
  NEW."seq" := nextval(pg_get_serial_sequence('"module_event"', 'seq'));
  RETURN NEW;
END $$;
CREATE TRIGGER "module_event_next_seq" BEFORE INSERT ON "module_event" FOR EACH ROW EXECUTE FUNCTION module_event_next_seq();

-- A sign-up link is used once: once used_at is set, the link never changes again.
CREATE FUNCTION platform_signup_link_used_once() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."used_at" IS NOT NULL THEN
    RAISE EXCEPTION 'platform_signup_link_used_once: this sign-up link was already used' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_signup_link_used_once" BEFORE UPDATE ON "platform_signup_link" FOR EACH ROW EXECUTE FUNCTION platform_signup_link_used_once();

-- ----------------------------------------------------------------------------------------------------------------- data
-- The plan catalogue: Sample (AGENTS rule 4); seat limits Sample; trial 14 days (SA-4-11); no price until the founder sets one.
INSERT INTO "platform_plan" ("id", "code", "name", "seats_limit", "trial_days") VALUES
  (gen_random_uuid(), 'solo', 'Solo (Sample)', 1, 14),
  (gen_random_uuid(), 'team', 'Team (Sample)', 5, 14),
  (gen_random_uuid(), 'firm', 'Firm (Sample)', 20, 14);

-- The starter roles' permission keys, copied from SA-06 v3.15 (2026-10-25) §10b "Firm permissions (LOCAL agent/*)",
-- domain/requirements-2026-11-02/02-functional-requirements/super-admin/SA-06-rbac_v3.15_2026-10-25.md: every row's
-- Owner / Admin / CaseMgr / CaseOff / Billing / ReadOnly ticks (rows ticked for no role, the withdrawn ones, are left
-- out). Counts per role equal its Appendix C: Owner 231, Admin 213, Case Manager 145, Case Officer 99, Billing / Finance
-- 46, Read-only 40 (tests/check_pf3_platform_schema.ts checks them). Starter roles are data (SA6-D12): later versions
-- come from Super Admin, not from code.
INSERT INTO "platform_role_permission" ("role", "permission_key") VALUES
  ('OWNER', 'agent/activity-type:manage'),
  ('ADMIN', 'agent/activity-type:manage'),
  ('OWNER', 'agent/ai:switch'),
  ('OWNER', 'agent/assessment:override'),
  ('ADMIN', 'agent/assessment:override'),
  ('CASE_MANAGER', 'agent/assessment:override'),
  ('OWNER', 'agent/assessment:pin-version'),
  ('ADMIN', 'agent/assessment:pin-version'),
  ('CASE_MANAGER', 'agent/assessment:pin-version'),
  ('OWNER', 'agent/assessment:review'),
  ('ADMIN', 'agent/assessment:review'),
  ('CASE_MANAGER', 'agent/assessment:review'),
  ('OWNER', 'agent/assessment:run'),
  ('ADMIN', 'agent/assessment:run'),
  ('CASE_MANAGER', 'agent/assessment:run'),
  ('CASE_OFFICER', 'agent/assessment:run'),
  ('OWNER', 'agent/assessment:share'),
  ('ADMIN', 'agent/assessment:share'),
  ('CASE_MANAGER', 'agent/assessment:share'),
  ('OWNER', 'agent/assessment:view'),
  ('ADMIN', 'agent/assessment:view'),
  ('CASE_MANAGER', 'agent/assessment:view'),
  ('CASE_OFFICER', 'agent/assessment:view'),
  ('READ_ONLY', 'agent/assessment:view'),
  ('OWNER', 'agent/assessment:view-stale'),
  ('ADMIN', 'agent/assessment:view-stale'),
  ('CASE_MANAGER', 'agent/assessment:view-stale'),
  ('OWNER', 'agent/audit:read'),
  ('ADMIN', 'agent/audit:read'),
  ('OWNER', 'agent/automation:configure'),
  ('ADMIN', 'agent/automation:configure'),
  ('OWNER', 'agent/automation:create'),
  ('ADMIN', 'agent/automation:create'),
  ('OWNER', 'agent/automation:delete'),
  ('ADMIN', 'agent/automation:delete'),
  ('OWNER', 'agent/automation:edit'),
  ('ADMIN', 'agent/automation:edit'),
  ('OWNER', 'agent/automation:enable'),
  ('ADMIN', 'agent/automation:enable'),
  ('OWNER', 'agent/automation:list'),
  ('ADMIN', 'agent/automation:list'),
  ('CASE_MANAGER', 'agent/automation:list'),
  ('CASE_OFFICER', 'agent/automation:list'),
  ('READ_ONLY', 'agent/automation:list'),
  ('OWNER', 'agent/automation:manage-minder'),
  ('ADMIN', 'agent/automation:manage-minder'),
  ('OWNER', 'agent/automation:retry-deadletter'),
  ('ADMIN', 'agent/automation:retry-deadletter'),
  ('OWNER', 'agent/automation:run'),
  ('ADMIN', 'agent/automation:run'),
  ('CASE_MANAGER', 'agent/automation:run'),
  ('OWNER', 'agent/automation:set-autonomy'),
  ('ADMIN', 'agent/automation:set-autonomy'),
  ('OWNER', 'agent/automation:show'),
  ('ADMIN', 'agent/automation:show'),
  ('CASE_MANAGER', 'agent/automation:show'),
  ('CASE_OFFICER', 'agent/automation:show'),
  ('READ_ONLY', 'agent/automation:show'),
  ('OWNER', 'agent/automation:simulate'),
  ('ADMIN', 'agent/automation:simulate'),
  ('OWNER', 'agent/automation:use-recipe'),
  ('ADMIN', 'agent/automation:use-recipe'),
  ('OWNER', 'agent/automation:view-deadletter'),
  ('ADMIN', 'agent/automation:view-deadletter'),
  ('OWNER', 'agent/automation:view-history'),
  ('ADMIN', 'agent/automation:view-history'),
  ('CASE_MANAGER', 'agent/automation:view-history'),
  ('OWNER', 'agent/billing-config:numbering'),
  ('ADMIN', 'agent/billing-config:numbering'),
  ('OWNER', 'agent/billing-config:tax'),
  ('ADMIN', 'agent/billing-config:tax'),
  ('OWNER', 'agent/billing-config:terms'),
  ('ADMIN', 'agent/billing-config:terms'),
  ('OWNER', 'agent/billing-report:view'),
  ('ADMIN', 'agent/billing-report:view'),
  ('BILLING_FINANCE', 'agent/billing-report:view'),
  ('OWNER', 'agent/billing:export'),
  ('ADMIN', 'agent/billing:export'),
  ('BILLING_FINANCE', 'agent/billing:export'),
  ('OWNER', 'agent/booking-event-type:configure-availability'),
  ('ADMIN', 'agent/booking-event-type:configure-availability'),
  ('OWNER', 'agent/booking-event-type:edit'),
  ('ADMIN', 'agent/booking-event-type:edit'),
  ('OWNER', 'agent/booking-event-type:list'),
  ('ADMIN', 'agent/booking-event-type:list'),
  ('CASE_MANAGER', 'agent/booking-event-type:list'),
  ('CASE_OFFICER', 'agent/booking-event-type:list'),
  ('READ_ONLY', 'agent/booking-event-type:list'),
  ('OWNER', 'agent/booking:create'),
  ('ADMIN', 'agent/booking:create'),
  ('CASE_MANAGER', 'agent/booking:create'),
  ('CASE_OFFICER', 'agent/booking:create'),
  ('OWNER', 'agent/booking:edit'),
  ('ADMIN', 'agent/booking:edit'),
  ('CASE_MANAGER', 'agent/booking:edit'),
  ('CASE_OFFICER', 'agent/booking:edit'),
  ('OWNER', 'agent/booking:list'),
  ('ADMIN', 'agent/booking:list'),
  ('CASE_MANAGER', 'agent/booking:list'),
  ('CASE_OFFICER', 'agent/booking:list'),
  ('READ_ONLY', 'agent/booking:list'),
  ('OWNER', 'agent/breach:manage'),
  ('ADMIN', 'agent/breach:manage'),
  ('OWNER', 'agent/case:assign'),
  ('ADMIN', 'agent/case:assign'),
  ('CASE_MANAGER', 'agent/case:assign'),
  ('OWNER', 'agent/case:configure-pack'),
  ('ADMIN', 'agent/case:configure-pack'),
  ('OWNER', 'agent/case:create'),
  ('ADMIN', 'agent/case:create'),
  ('CASE_MANAGER', 'agent/case:create'),
  ('CASE_OFFICER', 'agent/case:create'),
  ('OWNER', 'agent/case:edit'),
  ('ADMIN', 'agent/case:edit'),
  ('CASE_MANAGER', 'agent/case:edit'),
  ('CASE_OFFICER', 'agent/case:edit'),
  ('OWNER', 'agent/case:export'),
  ('ADMIN', 'agent/case:export'),
  ('CASE_MANAGER', 'agent/case:export'),
  ('OWNER', 'agent/case:form-approve'),
  ('CASE_MANAGER', 'agent/case:form-approve'),
  ('OWNER', 'agent/case:record-decision'),
  ('ADMIN', 'agent/case:record-decision'),
  ('CASE_MANAGER', 'agent/case:record-decision'),
  ('OWNER', 'agent/case:reopen'),
  ('CASE_MANAGER', 'agent/case:reopen'),
  ('OWNER', 'agent/case:review-approve'),
  ('CASE_MANAGER', 'agent/case:review-approve'),
  ('OWNER', 'agent/case:show'),
  ('ADMIN', 'agent/case:show'),
  ('CASE_MANAGER', 'agent/case:show'),
  ('CASE_OFFICER', 'agent/case:show'),
  ('BILLING_FINANCE', 'agent/case:show'),
  ('READ_ONLY', 'agent/case:show'),
  ('OWNER', 'agent/case:submit'),
  ('ADMIN', 'agent/case:submit'),
  ('CASE_MANAGER', 'agent/case:submit'),
  ('OWNER', 'agent/case:view.all'),
  ('ADMIN', 'agent/case:view.all'),
  ('CASE_MANAGER', 'agent/case:view.all'),
  ('CASE_OFFICER', 'agent/case:view.all'),
  ('BILLING_FINANCE', 'agent/case:view.all'),
  ('READ_ONLY', 'agent/case:view.all'),
  ('OWNER', 'agent/case:view.own'),
  ('ADMIN', 'agent/case:view.own'),
  ('CASE_MANAGER', 'agent/case:view.own'),
  ('CASE_OFFICER', 'agent/case:view.own'),
  ('BILLING_FINANCE', 'agent/case:view.own'),
  ('READ_ONLY', 'agent/case:view.own'),
  ('OWNER', 'agent/case:waive-deficiency'),
  ('ADMIN', 'agent/case:waive-deficiency'),
  ('CASE_MANAGER', 'agent/case:waive-deficiency'),
  ('CASE_OFFICER', 'agent/case:waive-deficiency'),
  ('OWNER', 'agent/client:create'),
  ('ADMIN', 'agent/client:create'),
  ('CASE_MANAGER', 'agent/client:create'),
  ('CASE_OFFICER', 'agent/client:create'),
  ('OWNER', 'agent/client:edit'),
  ('ADMIN', 'agent/client:edit'),
  ('CASE_MANAGER', 'agent/client:edit'),
  ('CASE_OFFICER', 'agent/client:edit'),
  ('OWNER', 'agent/client:export'),
  ('ADMIN', 'agent/client:export'),
  ('CASE_MANAGER', 'agent/client:export'),
  ('OWNER', 'agent/client:show'),
  ('ADMIN', 'agent/client:show'),
  ('CASE_MANAGER', 'agent/client:show'),
  ('CASE_OFFICER', 'agent/client:show'),
  ('BILLING_FINANCE', 'agent/client:show'),
  ('READ_ONLY', 'agent/client:show'),
  ('OWNER', 'agent/client:view.all'),
  ('ADMIN', 'agent/client:view.all'),
  ('CASE_MANAGER', 'agent/client:view.all'),
  ('CASE_OFFICER', 'agent/client:view.all'),
  ('BILLING_FINANCE', 'agent/client:view.all'),
  ('READ_ONLY', 'agent/client:view.all'),
  ('OWNER', 'agent/client:view.own'),
  ('ADMIN', 'agent/client:view.own'),
  ('CASE_MANAGER', 'agent/client:view.own'),
  ('CASE_OFFICER', 'agent/client:view.own'),
  ('BILLING_FINANCE', 'agent/client:view.own'),
  ('READ_ONLY', 'agent/client:view.own'),
  ('OWNER', 'agent/communication:bulk-send'),
  ('ADMIN', 'agent/communication:bulk-send'),
  ('CASE_MANAGER', 'agent/communication:bulk-send'),
  ('OWNER', 'agent/communication:export'),
  ('ADMIN', 'agent/communication:export'),
  ('CASE_MANAGER', 'agent/communication:export'),
  ('OWNER', 'agent/communication:manage-inbox'),
  ('ADMIN', 'agent/communication:manage-inbox'),
  ('CASE_MANAGER', 'agent/communication:manage-inbox'),
  ('CASE_OFFICER', 'agent/communication:manage-inbox'),
  ('OWNER', 'agent/communication:resolve-unmatched'),
  ('ADMIN', 'agent/communication:resolve-unmatched'),
  ('CASE_MANAGER', 'agent/communication:resolve-unmatched'),
  ('CASE_OFFICER', 'agent/communication:resolve-unmatched'),
  ('OWNER', 'agent/communication:send-email'),
  ('ADMIN', 'agent/communication:send-email'),
  ('CASE_MANAGER', 'agent/communication:send-email'),
  ('CASE_OFFICER', 'agent/communication:send-email'),
  ('OWNER', 'agent/communication:send-message'),
  ('ADMIN', 'agent/communication:send-message'),
  ('CASE_MANAGER', 'agent/communication:send-message'),
  ('CASE_OFFICER', 'agent/communication:send-message'),
  ('OWNER', 'agent/communication:view'),
  ('ADMIN', 'agent/communication:view'),
  ('CASE_MANAGER', 'agent/communication:view'),
  ('CASE_OFFICER', 'agent/communication:view'),
  ('READ_ONLY', 'agent/communication:view'),
  ('OWNER', 'agent/communication:view-analytics'),
  ('ADMIN', 'agent/communication:view-analytics'),
  ('CASE_MANAGER', 'agent/communication:view-analytics'),
  ('OWNER', 'agent/consent:manage'),
  ('ADMIN', 'agent/consent:manage'),
  ('OWNER', 'agent/data-export:request'),
  ('ADMIN', 'agent/data-export:request'),
  ('CASE_MANAGER', 'agent/data-export:request'),
  ('OWNER', 'agent/developer-api:manage'),
  ('ADMIN', 'agent/developer-api:manage'),
  ('OWNER', 'agent/developer-api:revoke'),
  ('ADMIN', 'agent/developer-api:revoke'),
  ('OWNER', 'agent/document:annotate'),
  ('ADMIN', 'agent/document:annotate'),
  ('CASE_MANAGER', 'agent/document:annotate'),
  ('CASE_OFFICER', 'agent/document:annotate'),
  ('OWNER', 'agent/document:bulk'),
  ('ADMIN', 'agent/document:bulk'),
  ('CASE_MANAGER', 'agent/document:bulk'),
  ('CASE_OFFICER', 'agent/document:bulk'),
  ('OWNER', 'agent/document:change-status'),
  ('ADMIN', 'agent/document:change-status'),
  ('CASE_MANAGER', 'agent/document:change-status'),
  ('CASE_OFFICER', 'agent/document:change-status'),
  ('OWNER', 'agent/document:create'),
  ('ADMIN', 'agent/document:create'),
  ('CASE_MANAGER', 'agent/document:create'),
  ('CASE_OFFICER', 'agent/document:create'),
  ('OWNER', 'agent/document:delete'),
  ('ADMIN', 'agent/document:delete'),
  ('CASE_MANAGER', 'agent/document:delete'),
  ('OWNER', 'agent/document:dispose'),
  ('OWNER', 'agent/document:download'),
  ('ADMIN', 'agent/document:download'),
  ('CASE_MANAGER', 'agent/document:download'),
  ('CASE_OFFICER', 'agent/document:download'),
  ('OWNER', 'agent/document:edit'),
  ('ADMIN', 'agent/document:edit'),
  ('CASE_MANAGER', 'agent/document:edit'),
  ('CASE_OFFICER', 'agent/document:edit'),
  ('OWNER', 'agent/document:generate'),
  ('ADMIN', 'agent/document:generate'),
  ('CASE_MANAGER', 'agent/document:generate'),
  ('CASE_OFFICER', 'agent/document:generate'),
  ('OWNER', 'agent/document:link'),
  ('ADMIN', 'agent/document:link'),
  ('CASE_MANAGER', 'agent/document:link'),
  ('CASE_OFFICER', 'agent/document:link'),
  ('OWNER', 'agent/document:list'),
  ('ADMIN', 'agent/document:list'),
  ('CASE_MANAGER', 'agent/document:list'),
  ('CASE_OFFICER', 'agent/document:list'),
  ('READ_ONLY', 'agent/document:list'),
  ('OWNER', 'agent/document:request'),
  ('ADMIN', 'agent/document:request'),
  ('CASE_MANAGER', 'agent/document:request'),
  ('CASE_OFFICER', 'agent/document:request'),
  ('OWNER', 'agent/document:show'),
  ('ADMIN', 'agent/document:show'),
  ('CASE_MANAGER', 'agent/document:show'),
  ('CASE_OFFICER', 'agent/document:show'),
  ('READ_ONLY', 'agent/document:show'),
  ('OWNER', 'agent/document:sign'),
  ('ADMIN', 'agent/document:sign'),
  ('CASE_MANAGER', 'agent/document:sign'),
  ('CASE_OFFICER', 'agent/document:sign'),
  ('OWNER', 'agent/document:view-access-log'),
  ('ADMIN', 'agent/document:view-access-log'),
  ('OWNER', 'agent/document:waive'),
  ('ADMIN', 'agent/document:waive'),
  ('CASE_MANAGER', 'agent/document:waive'),
  ('OWNER', 'agent/dsr:manage'),
  ('ADMIN', 'agent/dsr:manage'),
  ('OWNER', 'agent/entitlement:view'),
  ('ADMIN', 'agent/entitlement:view'),
  ('OWNER', 'agent/expense:create'),
  ('ADMIN', 'agent/expense:create'),
  ('CASE_MANAGER', 'agent/expense:create'),
  ('CASE_OFFICER', 'agent/expense:create'),
  ('BILLING_FINANCE', 'agent/expense:create'),
  ('OWNER', 'agent/expense:edit'),
  ('ADMIN', 'agent/expense:edit'),
  ('BILLING_FINANCE', 'agent/expense:edit'),
  ('OWNER', 'agent/expense:list'),
  ('ADMIN', 'agent/expense:list'),
  ('BILLING_FINANCE', 'agent/expense:list'),
  ('OWNER', 'agent/firm-capability:manage'),
  ('ADMIN', 'agent/firm-capability:manage'),
  ('OWNER', 'agent/firm-credential:manage'),
  ('ADMIN', 'agent/firm-credential:manage'),
  ('OWNER', 'agent/firm-data-export:request'),
  ('OWNER', 'agent/firm-profile:manage'),
  ('OWNER', 'agent/form:create'),
  ('ADMIN', 'agent/form:create'),
  ('CASE_MANAGER', 'agent/form:create'),
  ('CASE_OFFICER', 'agent/form:create'),
  ('OWNER', 'agent/form:read'),
  ('ADMIN', 'agent/form:read'),
  ('CASE_MANAGER', 'agent/form:read'),
  ('CASE_OFFICER', 'agent/form:read'),
  ('READ_ONLY', 'agent/form:read'),
  ('OWNER', 'agent/governance:read'),
  ('ADMIN', 'agent/governance:read'),
  ('OWNER', 'agent/import:run'),
  ('ADMIN', 'agent/import:run'),
  ('OWNER', 'agent/import:undo'),
  ('ADMIN', 'agent/import:undo'),
  ('OWNER', 'agent/import:view-report'),
  ('ADMIN', 'agent/import:view-report'),
  ('OWNER', 'agent/integration-mail-receive:manage'),
  ('ADMIN', 'agent/integration-mail-receive:manage'),
  ('OWNER', 'agent/integration-smtp:manage'),
  ('ADMIN', 'agent/integration-smtp:manage'),
  ('OWNER', 'agent/integration-whatsapp:manage'),
  ('ADMIN', 'agent/integration-whatsapp:manage'),
  ('OWNER', 'agent/integration:test'),
  ('ADMIN', 'agent/integration:test'),
  ('OWNER', 'agent/invoice:create'),
  ('ADMIN', 'agent/invoice:create'),
  ('CASE_MANAGER', 'agent/invoice:create'),
  ('CASE_OFFICER', 'agent/invoice:create'),
  ('BILLING_FINANCE', 'agent/invoice:create'),
  ('OWNER', 'agent/invoice:edit'),
  ('ADMIN', 'agent/invoice:edit'),
  ('BILLING_FINANCE', 'agent/invoice:edit'),
  ('OWNER', 'agent/invoice:issue'),
  ('ADMIN', 'agent/invoice:issue'),
  ('BILLING_FINANCE', 'agent/invoice:issue'),
  ('OWNER', 'agent/invoice:list'),
  ('ADMIN', 'agent/invoice:list'),
  ('CASE_MANAGER', 'agent/invoice:list'),
  ('CASE_OFFICER', 'agent/invoice:list'),
  ('BILLING_FINANCE', 'agent/invoice:list'),
  ('OWNER', 'agent/invoice:show'),
  ('ADMIN', 'agent/invoice:show'),
  ('CASE_MANAGER', 'agent/invoice:show'),
  ('CASE_OFFICER', 'agent/invoice:show'),
  ('BILLING_FINANCE', 'agent/invoice:show'),
  ('OWNER', 'agent/invoice:void'),
  ('ADMIN', 'agent/invoice:void'),
  ('BILLING_FINANCE', 'agent/invoice:void'),
  ('OWNER', 'agent/legal-hold:manage'),
  ('ADMIN', 'agent/legal-hold:manage'),
  ('OWNER', 'agent/legal-settings:manage'),
  ('OWNER', 'agent/note:create'),
  ('ADMIN', 'agent/note:create'),
  ('CASE_MANAGER', 'agent/note:create'),
  ('CASE_OFFICER', 'agent/note:create'),
  ('OWNER', 'agent/note:delete'),
  ('ADMIN', 'agent/note:delete'),
  ('CASE_MANAGER', 'agent/note:delete'),
  ('CASE_OFFICER', 'agent/note:delete'),
  ('OWNER', 'agent/note:edit'),
  ('ADMIN', 'agent/note:edit'),
  ('CASE_MANAGER', 'agent/note:edit'),
  ('CASE_OFFICER', 'agent/note:edit'),
  ('OWNER', 'agent/note:list'),
  ('ADMIN', 'agent/note:list'),
  ('CASE_MANAGER', 'agent/note:list'),
  ('CASE_OFFICER', 'agent/note:list'),
  ('BILLING_FINANCE', 'agent/note:list'),
  ('READ_ONLY', 'agent/note:list'),
  ('OWNER', 'agent/note:share-with-client'),
  ('ADMIN', 'agent/note:share-with-client'),
  ('CASE_MANAGER', 'agent/note:share-with-client'),
  ('CASE_OFFICER', 'agent/note:share-with-client'),
  ('OWNER', 'agent/notification:manage-preferences'),
  ('ADMIN', 'agent/notification:manage-preferences'),
  ('CASE_MANAGER', 'agent/notification:manage-preferences'),
  ('CASE_OFFICER', 'agent/notification:manage-preferences'),
  ('BILLING_FINANCE', 'agent/notification:manage-preferences'),
  ('READ_ONLY', 'agent/notification:manage-preferences'),
  ('OWNER', 'agent/onboarding:complete'),
  ('ADMIN', 'agent/onboarding:complete'),
  ('OWNER', 'agent/onboarding:view'),
  ('ADMIN', 'agent/onboarding:view'),
  ('OWNER', 'agent/pack:adopt'),
  ('ADMIN', 'agent/pack:adopt'),
  ('CASE_MANAGER', 'agent/pack:adopt'),
  ('CASE_OFFICER', 'agent/pack:adopt'),
  ('OWNER', 'agent/pack:extend'),
  ('ADMIN', 'agent/pack:extend'),
  ('CASE_MANAGER', 'agent/pack:extend'),
  ('CASE_OFFICER', 'agent/pack:extend'),
  ('OWNER', 'agent/pack:read'),
  ('ADMIN', 'agent/pack:read'),
  ('CASE_MANAGER', 'agent/pack:read'),
  ('CASE_OFFICER', 'agent/pack:read'),
  ('BILLING_FINANCE', 'agent/pack:read'),
  ('READ_ONLY', 'agent/pack:read'),
  ('OWNER', 'agent/party:view.all'),
  ('ADMIN', 'agent/party:view.all'),
  ('CASE_MANAGER', 'agent/party:view.all'),
  ('BILLING_FINANCE', 'agent/party:view.all'),
  ('READ_ONLY', 'agent/party:view.all'),
  ('OWNER', 'agent/party:view.own'),
  ('CASE_OFFICER', 'agent/party:view.own'),
  ('OWNER', 'agent/payment-rail:connect'),
  ('OWNER', 'agent/payment:online'),
  ('ADMIN', 'agent/payment:online'),
  ('BILLING_FINANCE', 'agent/payment:online'),
  ('OWNER', 'agent/payment:record'),
  ('ADMIN', 'agent/payment:record'),
  ('BILLING_FINANCE', 'agent/payment:record'),
  ('OWNER', 'agent/portal:configure-branding'),
  ('ADMIN', 'agent/portal:configure-branding'),
  ('OWNER', 'agent/portal:configure-corporate'),
  ('ADMIN', 'agent/portal:configure-corporate'),
  ('OWNER', 'agent/portal:configure-policy'),
  ('ADMIN', 'agent/portal:configure-policy'),
  ('OWNER', 'agent/portal:configure-visibility'),
  ('ADMIN', 'agent/portal:configure-visibility'),
  ('CASE_MANAGER', 'agent/portal:configure-visibility'),
  ('OWNER', 'agent/portal:invite'),
  ('ADMIN', 'agent/portal:invite'),
  ('CASE_MANAGER', 'agent/portal:invite'),
  ('CASE_OFFICER', 'agent/portal:invite'),
  ('OWNER', 'agent/portal:list'),
  ('ADMIN', 'agent/portal:list'),
  ('CASE_MANAGER', 'agent/portal:list'),
  ('CASE_OFFICER', 'agent/portal:list'),
  ('READ_ONLY', 'agent/portal:list'),
  ('OWNER', 'agent/portal:manage'),
  ('ADMIN', 'agent/portal:manage'),
  ('CASE_MANAGER', 'agent/portal:manage'),
  ('OWNER', 'agent/portal:message'),
  ('ADMIN', 'agent/portal:message'),
  ('CASE_MANAGER', 'agent/portal:message'),
  ('CASE_OFFICER', 'agent/portal:message'),
  ('OWNER', 'agent/portal:nudge'),
  ('ADMIN', 'agent/portal:nudge'),
  ('CASE_MANAGER', 'agent/portal:nudge'),
  ('CASE_OFFICER', 'agent/portal:nudge'),
  ('OWNER', 'agent/portal:request-work'),
  ('ADMIN', 'agent/portal:request-work'),
  ('CASE_MANAGER', 'agent/portal:request-work'),
  ('CASE_OFFICER', 'agent/portal:request-work'),
  ('OWNER', 'agent/portal:review-upload'),
  ('ADMIN', 'agent/portal:review-upload'),
  ('CASE_MANAGER', 'agent/portal:review-upload'),
  ('CASE_OFFICER', 'agent/portal:review-upload'),
  ('OWNER', 'agent/portal:show'),
  ('ADMIN', 'agent/portal:show'),
  ('CASE_MANAGER', 'agent/portal:show'),
  ('CASE_OFFICER', 'agent/portal:show'),
  ('READ_ONLY', 'agent/portal:show'),
  ('OWNER', 'agent/portal:view-access-log'),
  ('ADMIN', 'agent/portal:view-access-log'),
  ('OWNER', 'agent/portal:view-engagement'),
  ('ADMIN', 'agent/portal:view-engagement'),
  ('CASE_MANAGER', 'agent/portal:view-engagement'),
  ('OWNER', 'agent/prospect:assign'),
  ('ADMIN', 'agent/prospect:assign'),
  ('CASE_MANAGER', 'agent/prospect:assign'),
  ('OWNER', 'agent/prospect:bulk'),
  ('ADMIN', 'agent/prospect:bulk'),
  ('CASE_MANAGER', 'agent/prospect:bulk'),
  ('OWNER', 'agent/prospect:configure-form'),
  ('ADMIN', 'agent/prospect:configure-form'),
  ('OWNER', 'agent/prospect:configure-pipeline'),
  ('ADMIN', 'agent/prospect:configure-pipeline'),
  ('OWNER', 'agent/prospect:configure-source'),
  ('ADMIN', 'agent/prospect:configure-source'),
  ('OWNER', 'agent/prospect:convert'),
  ('ADMIN', 'agent/prospect:convert'),
  ('CASE_MANAGER', 'agent/prospect:convert'),
  ('CASE_OFFICER', 'agent/prospect:convert'),
  ('OWNER', 'agent/prospect:create'),
  ('ADMIN', 'agent/prospect:create'),
  ('CASE_MANAGER', 'agent/prospect:create'),
  ('CASE_OFFICER', 'agent/prospect:create'),
  ('OWNER', 'agent/prospect:delete'),
  ('ADMIN', 'agent/prospect:delete'),
  ('CASE_MANAGER', 'agent/prospect:delete'),
  ('OWNER', 'agent/prospect:edit'),
  ('ADMIN', 'agent/prospect:edit'),
  ('CASE_MANAGER', 'agent/prospect:edit'),
  ('CASE_OFFICER', 'agent/prospect:edit'),
  ('OWNER', 'agent/prospect:export'),
  ('ADMIN', 'agent/prospect:export'),
  ('CASE_MANAGER', 'agent/prospect:export'),
  ('OWNER', 'agent/prospect:log-call'),
  ('ADMIN', 'agent/prospect:log-call'),
  ('CASE_MANAGER', 'agent/prospect:log-call'),
  ('CASE_OFFICER', 'agent/prospect:log-call'),
  ('OWNER', 'agent/prospect:lose'),
  ('ADMIN', 'agent/prospect:lose'),
  ('CASE_MANAGER', 'agent/prospect:lose'),
  ('CASE_OFFICER', 'agent/prospect:lose'),
  ('OWNER', 'agent/prospect:merge'),
  ('ADMIN', 'agent/prospect:merge'),
  ('CASE_MANAGER', 'agent/prospect:merge'),
  ('OWNER', 'agent/prospect:sequence'),
  ('ADMIN', 'agent/prospect:sequence'),
  ('CASE_MANAGER', 'agent/prospect:sequence'),
  ('CASE_OFFICER', 'agent/prospect:sequence'),
  ('OWNER', 'agent/prospect:show'),
  ('ADMIN', 'agent/prospect:show'),
  ('CASE_MANAGER', 'agent/prospect:show'),
  ('CASE_OFFICER', 'agent/prospect:show'),
  ('BILLING_FINANCE', 'agent/prospect:show'),
  ('READ_ONLY', 'agent/prospect:show'),
  ('OWNER', 'agent/prospect:view-dashboard'),
  ('ADMIN', 'agent/prospect:view-dashboard'),
  ('CASE_MANAGER', 'agent/prospect:view-dashboard'),
  ('OWNER', 'agent/prospect:view-performance'),
  ('ADMIN', 'agent/prospect:view-performance'),
  ('CASE_MANAGER', 'agent/prospect:view-performance'),
  ('OWNER', 'agent/prospect:view.all'),
  ('ADMIN', 'agent/prospect:view.all'),
  ('CASE_MANAGER', 'agent/prospect:view.all'),
  ('CASE_OFFICER', 'agent/prospect:view.all'),
  ('BILLING_FINANCE', 'agent/prospect:view.all'),
  ('READ_ONLY', 'agent/prospect:view.all'),
  ('OWNER', 'agent/prospect:view.own'),
  ('ADMIN', 'agent/prospect:view.own'),
  ('CASE_MANAGER', 'agent/prospect:view.own'),
  ('CASE_OFFICER', 'agent/prospect:view.own'),
  ('BILLING_FINANCE', 'agent/prospect:view.own'),
  ('READ_ONLY', 'agent/prospect:view.own'),
  ('OWNER', 'agent/refund:create'),
  ('ADMIN', 'agent/refund:create'),
  ('BILLING_FINANCE', 'agent/refund:create'),
  ('OWNER', 'agent/reminder:create'),
  ('ADMIN', 'agent/reminder:create'),
  ('CASE_MANAGER', 'agent/reminder:create'),
  ('CASE_OFFICER', 'agent/reminder:create'),
  ('BILLING_FINANCE', 'agent/reminder:create'),
  ('OWNER', 'agent/reminder:delete'),
  ('ADMIN', 'agent/reminder:delete'),
  ('CASE_MANAGER', 'agent/reminder:delete'),
  ('CASE_OFFICER', 'agent/reminder:delete'),
  ('BILLING_FINANCE', 'agent/reminder:delete'),
  ('OWNER', 'agent/reminder:list'),
  ('ADMIN', 'agent/reminder:list'),
  ('CASE_MANAGER', 'agent/reminder:list'),
  ('CASE_OFFICER', 'agent/reminder:list'),
  ('BILLING_FINANCE', 'agent/reminder:list'),
  ('READ_ONLY', 'agent/reminder:list'),
  ('OWNER', 'agent/reminder:snooze'),
  ('ADMIN', 'agent/reminder:snooze'),
  ('CASE_MANAGER', 'agent/reminder:snooze'),
  ('CASE_OFFICER', 'agent/reminder:snooze'),
  ('BILLING_FINANCE', 'agent/reminder:snooze'),
  ('OWNER', 'agent/report:configure'),
  ('ADMIN', 'agent/report:configure'),
  ('OWNER', 'agent/report:export'),
  ('ADMIN', 'agent/report:export'),
  ('CASE_MANAGER', 'agent/report:export'),
  ('OWNER', 'agent/report:schedule'),
  ('ADMIN', 'agent/report:schedule'),
  ('CASE_MANAGER', 'agent/report:schedule'),
  ('OWNER', 'agent/report:view-compliance'),
  ('ADMIN', 'agent/report:view-compliance'),
  ('CASE_MANAGER', 'agent/report:view-compliance'),
  ('OWNER', 'agent/report:view-financial'),
  ('ADMIN', 'agent/report:view-financial'),
  ('BILLING_FINANCE', 'agent/report:view-financial'),
  ('OWNER', 'agent/report:view.all'),
  ('ADMIN', 'agent/report:view.all'),
  ('CASE_MANAGER', 'agent/report:view.all'),
  ('OWNER', 'agent/report:view.own'),
  ('ADMIN', 'agent/report:view.own'),
  ('CASE_MANAGER', 'agent/report:view.own'),
  ('CASE_OFFICER', 'agent/report:view.own'),
  ('BILLING_FINANCE', 'agent/report:view.own'),
  ('READ_ONLY', 'agent/report:view.own'),
  ('OWNER', 'agent/retainer:configure-template'),
  ('ADMIN', 'agent/retainer:configure-template'),
  ('OWNER', 'agent/retainer:countersign'),
  ('CASE_MANAGER', 'agent/retainer:countersign'),
  ('OWNER', 'agent/retainer:download'),
  ('ADMIN', 'agent/retainer:download'),
  ('CASE_MANAGER', 'agent/retainer:download'),
  ('CASE_OFFICER', 'agent/retainer:download'),
  ('BILLING_FINANCE', 'agent/retainer:download'),
  ('OWNER', 'agent/retainer:draft'),
  ('ADMIN', 'agent/retainer:draft'),
  ('CASE_MANAGER', 'agent/retainer:draft'),
  ('CASE_OFFICER', 'agent/retainer:draft'),
  ('OWNER', 'agent/retainer:export'),
  ('ADMIN', 'agent/retainer:export'),
  ('CASE_MANAGER', 'agent/retainer:export'),
  ('OWNER', 'agent/retainer:list'),
  ('ADMIN', 'agent/retainer:list'),
  ('CASE_MANAGER', 'agent/retainer:list'),
  ('CASE_OFFICER', 'agent/retainer:list'),
  ('BILLING_FINANCE', 'agent/retainer:list'),
  ('READ_ONLY', 'agent/retainer:list'),
  ('OWNER', 'agent/retainer:offline-sign'),
  ('ADMIN', 'agent/retainer:offline-sign'),
  ('CASE_MANAGER', 'agent/retainer:offline-sign'),
  ('OWNER', 'agent/retainer:send'),
  ('ADMIN', 'agent/retainer:send'),
  ('CASE_MANAGER', 'agent/retainer:send'),
  ('CASE_OFFICER', 'agent/retainer:send'),
  ('OWNER', 'agent/retainer:show'),
  ('ADMIN', 'agent/retainer:show'),
  ('CASE_MANAGER', 'agent/retainer:show'),
  ('CASE_OFFICER', 'agent/retainer:show'),
  ('BILLING_FINANCE', 'agent/retainer:show'),
  ('READ_ONLY', 'agent/retainer:show'),
  ('OWNER', 'agent/retainer:void'),
  ('ADMIN', 'agent/retainer:void'),
  ('CASE_MANAGER', 'agent/retainer:void'),
  ('OWNER', 'agent/retention-policy:manage'),
  ('ADMIN', 'agent/retention-policy:manage'),
  ('OWNER', 'agent/role:assign'),
  ('ADMIN', 'agent/role:assign'),
  ('OWNER', 'agent/role:manage'),
  ('ADMIN', 'agent/role:manage'),
  ('OWNER', 'agent/search:query'),
  ('ADMIN', 'agent/search:query'),
  ('CASE_MANAGER', 'agent/search:query'),
  ('READ_ONLY', 'agent/search:query'),
  ('OWNER', 'agent/security-policy:manage'),
  ('ADMIN', 'agent/security-policy:manage'),
  ('OWNER', 'agent/settings:edit'),
  ('ADMIN', 'agent/settings:edit'),
  ('OWNER', 'agent/settings:list'),
  ('ADMIN', 'agent/settings:list'),
  ('CASE_MANAGER', 'agent/settings:list'),
  ('CASE_OFFICER', 'agent/settings:list'),
  ('BILLING_FINANCE', 'agent/settings:list'),
  ('READ_ONLY', 'agent/settings:list'),
  ('OWNER', 'agent/sqr:assign'),
  ('ADMIN', 'agent/sqr:assign'),
  ('CASE_MANAGER', 'agent/sqr:assign'),
  ('CASE_OFFICER', 'agent/sqr:assign'),
  ('OWNER', 'agent/sqr:document-manage'),
  ('ADMIN', 'agent/sqr:document-manage'),
  ('CASE_MANAGER', 'agent/sqr:document-manage'),
  ('CASE_OFFICER', 'agent/sqr:document-manage'),
  ('OWNER', 'agent/sqr:export'),
  ('ADMIN', 'agent/sqr:export'),
  ('CASE_MANAGER', 'agent/sqr:export'),
  ('OWNER', 'agent/sqr:request-changes'),
  ('ADMIN', 'agent/sqr:request-changes'),
  ('CASE_MANAGER', 'agent/sqr:request-changes'),
  ('CASE_OFFICER', 'agent/sqr:request-changes'),
  ('OWNER', 'agent/sqr:verify'),
  ('CASE_MANAGER', 'agent/sqr:verify'),
  ('CASE_OFFICER', 'agent/sqr:verify'),
  ('OWNER', 'agent/sqr:view'),
  ('ADMIN', 'agent/sqr:view'),
  ('CASE_MANAGER', 'agent/sqr:view'),
  ('CASE_OFFICER', 'agent/sqr:view'),
  ('READ_ONLY', 'agent/sqr:view'),
  ('OWNER', 'agent/staff:manage'),
  ('ADMIN', 'agent/staff:manage'),
  ('OWNER', 'agent/subscription-invoice:view'),
  ('ADMIN', 'agent/subscription-invoice:view'),
  ('BILLING_FINANCE', 'agent/subscription-invoice:view'),
  ('OWNER', 'agent/subscription:cancel'),
  ('OWNER', 'agent/subscription:downgrade'),
  ('OWNER', 'agent/subscription:edit-billing-details'),
  ('OWNER', 'agent/subscription:pay'),
  ('ADMIN', 'agent/subscription:pay'),
  ('OWNER', 'agent/subscription:update-card'),
  ('ADMIN', 'agent/subscription:update-card'),
  ('OWNER', 'agent/subscription:upgrade'),
  ('OWNER', 'agent/support-access:manage'),
  ('OWNER', 'agent/support-access:revoke'),
  ('OWNER', 'agent/support-ticket:create'),
  ('ADMIN', 'agent/support-ticket:create'),
  ('CASE_MANAGER', 'agent/support-ticket:create'),
  ('CASE_OFFICER', 'agent/support-ticket:create'),
  ('BILLING_FINANCE', 'agent/support-ticket:create'),
  ('READ_ONLY', 'agent/support-ticket:create'),
  ('OWNER', 'agent/support-ticket:list'),
  ('ADMIN', 'agent/support-ticket:list'),
  ('CASE_MANAGER', 'agent/support-ticket:list'),
  ('CASE_OFFICER', 'agent/support-ticket:list'),
  ('BILLING_FINANCE', 'agent/support-ticket:list'),
  ('READ_ONLY', 'agent/support-ticket:list'),
  ('OWNER', 'agent/task:assign'),
  ('ADMIN', 'agent/task:assign'),
  ('CASE_MANAGER', 'agent/task:assign'),
  ('OWNER', 'agent/task:bulk'),
  ('ADMIN', 'agent/task:bulk'),
  ('CASE_MANAGER', 'agent/task:bulk'),
  ('OWNER', 'agent/task:create'),
  ('ADMIN', 'agent/task:create'),
  ('CASE_MANAGER', 'agent/task:create'),
  ('CASE_OFFICER', 'agent/task:create'),
  ('OWNER', 'agent/task:delete'),
  ('ADMIN', 'agent/task:delete'),
  ('CASE_MANAGER', 'agent/task:delete'),
  ('CASE_OFFICER', 'agent/task:delete'),
  ('OWNER', 'agent/task:edit'),
  ('ADMIN', 'agent/task:edit'),
  ('CASE_MANAGER', 'agent/task:edit'),
  ('CASE_OFFICER', 'agent/task:edit'),
  ('OWNER', 'agent/task:template'),
  ('ADMIN', 'agent/task:template'),
  ('CASE_MANAGER', 'agent/task:template'),
  ('OWNER', 'agent/task:view.all'),
  ('ADMIN', 'agent/task:view.all'),
  ('CASE_MANAGER', 'agent/task:view.all'),
  ('CASE_OFFICER', 'agent/task:view.all'),
  ('BILLING_FINANCE', 'agent/task:view.all'),
  ('READ_ONLY', 'agent/task:view.all'),
  ('OWNER', 'agent/task:view.own'),
  ('ADMIN', 'agent/task:view.own'),
  ('CASE_MANAGER', 'agent/task:view.own'),
  ('CASE_OFFICER', 'agent/task:view.own'),
  ('BILLING_FINANCE', 'agent/task:view.own'),
  ('READ_ONLY', 'agent/task:view.own'),
  ('OWNER', 'agent/template:configure'),
  ('ADMIN', 'agent/template:configure'),
  ('OWNER', 'agent/template:create'),
  ('ADMIN', 'agent/template:create'),
  ('OWNER', 'agent/template:delete'),
  ('ADMIN', 'agent/template:delete'),
  ('OWNER', 'agent/template:edit'),
  ('ADMIN', 'agent/template:edit'),
  ('OWNER', 'agent/template:list'),
  ('ADMIN', 'agent/template:list'),
  ('CASE_MANAGER', 'agent/template:list'),
  ('CASE_OFFICER', 'agent/template:list'),
  ('READ_ONLY', 'agent/template:list'),
  ('OWNER', 'agent/template:preview'),
  ('ADMIN', 'agent/template:preview'),
  ('CASE_MANAGER', 'agent/template:preview'),
  ('CASE_OFFICER', 'agent/template:preview'),
  ('OWNER', 'agent/template:publish'),
  ('ADMIN', 'agent/template:publish'),
  ('OWNER', 'agent/template:show'),
  ('ADMIN', 'agent/template:show'),
  ('CASE_MANAGER', 'agent/template:show'),
  ('CASE_OFFICER', 'agent/template:show'),
  ('READ_ONLY', 'agent/template:show'),
  ('OWNER', 'agent/template:view-usage'),
  ('ADMIN', 'agent/template:view-usage'),
  ('CASE_MANAGER', 'agent/template:view-usage'),
  ('CASE_OFFICER', 'agent/template:view-usage'),
  ('READ_ONLY', 'agent/template:view-usage'),
  ('OWNER', 'agent/time-entry:create'),
  ('ADMIN', 'agent/time-entry:create'),
  ('CASE_MANAGER', 'agent/time-entry:create'),
  ('CASE_OFFICER', 'agent/time-entry:create'),
  ('BILLING_FINANCE', 'agent/time-entry:create'),
  ('OWNER', 'agent/time-entry:delete'),
  ('ADMIN', 'agent/time-entry:delete'),
  ('CASE_MANAGER', 'agent/time-entry:delete'),
  ('OWNER', 'agent/time-entry:edit'),
  ('ADMIN', 'agent/time-entry:edit'),
  ('CASE_MANAGER', 'agent/time-entry:edit'),
  ('CASE_OFFICER', 'agent/time-entry:edit'),
  ('BILLING_FINANCE', 'agent/time-entry:edit'),
  ('OWNER', 'agent/time-entry:view.all'),
  ('ADMIN', 'agent/time-entry:view.all'),
  ('CASE_MANAGER', 'agent/time-entry:view.all'),
  ('BILLING_FINANCE', 'agent/time-entry:view.all'),
  ('OWNER', 'agent/time-entry:view.own'),
  ('ADMIN', 'agent/time-entry:view.own'),
  ('CASE_MANAGER', 'agent/time-entry:view.own'),
  ('CASE_OFFICER', 'agent/time-entry:view.own'),
  ('BILLING_FINANCE', 'agent/time-entry:view.own'),
  ('READ_ONLY', 'agent/time-entry:view.own'),
  ('OWNER', 'agent/timeline:list'),
  ('ADMIN', 'agent/timeline:list'),
  ('CASE_MANAGER', 'agent/timeline:list'),
  ('CASE_OFFICER', 'agent/timeline:list'),
  ('READ_ONLY', 'agent/timeline:list');
