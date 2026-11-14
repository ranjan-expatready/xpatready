-- FO-1a (P-558, P-559; rows rev 3.1 (lead-b-rows-2026-11-14.md); contracts platform-and-front-office-contracts-2026-11-14.md
-- §0, §2.1, §2.6, §7 binding; the team's requirement AG-02 v2.6; schema file prisma/schema/front-office-sales.prisma, owner
-- Lead B (front office)). New tables only; no existing table, column or row changes. Front-office rows carry no
-- workspace_id: the demo reset (one workspace's rows) leaves them; api/src/front-office/firm-seed.ts (idempotent) seeds each
-- firm once. Consent is not here (P-584 (1): msg_consent, msg_consent_wording are the platform's, PF-19a).
--   * the tables: fo_sales_setup (a firm's front office: number counters and the seed mark), fo_person, fo_arrival_receipt,
--     fo_lead, fo_lead_attribution, fo_company, fo_company_contact, fo_prospect, fo_stage, fo_reason, fo_call, fo_note,
--     fo_stage_move, fo_web_form, fo_service.
--   * rules Prisma cannot say, at the end: L-/P- numbers per firm under the setup row's lock; attribution, notes and stage
--     moves written once; a prospect's stage of its own firm and type's pipeline (key), lost needs a reason, WON names how,
--     an open Corporate prospect's primary contact linked to its company (checked at commit); lead close fields and reason
--     list, a lead with a prospect stays ENGAGED; one live PRIMARY contact; stage and reason keys fixed, system reasons
--     and one live ACTIVE stage per pipeline kept; stage moves match their prospect; counters only go forward and the
--     seed mark is set once; owners are staff of the same firm; rows never move firm.
--   * the rules that read other rows (the Corporate contact, the engaged lead, the last ACTIVE stage) lock what they read
--     and assume READ COMMITTED, the app's level (Prisma's default); a REPEATABLE READ or SERIALIZABLE writer of these
--     tables is not covered (break R2-3).
--   * no data: the per-firm seed is firm-seed.ts (stages AG-2-52, reasons AG-2-80 rule 2 and AG-2-44 rule 2, one web form
--     off, the services list from released combinations' names).
-- Rollback: DROP TABLE "fo_stage_move", "fo_note", "fo_call", "fo_prospect", "fo_company_contact", "fo_company",
--   "fo_lead_attribution", "fo_arrival_receipt", "fo_lead", "fo_web_form", "fo_service", "fo_reason", "fo_stage",
--   "fo_person", "fo_sales_setup" CASCADE; DROP TYPE "FoDoor", "FoArrivalOutcome", "FoLeadState", "FoFirstResponseKind",
--   "FoPipeline", "FoStageKind", "FoReasonKind", "FoContactRole", "FoWonVia", "FoMoveCause", "FoCallDirection",
--   "FoCallOutcome", "FoNoteVisibility", "FoClickIdKind"; DROP FUNCTION fo_sales_setup_firm_exists(), fo_firm_fixed(),
--   fo_insert_only(), fo_next_number(uuid, text), fo_lead_number(), fo_prospect_number(), fo_number_fixed(),
--   fo_owner_in_firm(), fo_prospect_rules(), fo_prospect_contact_linked(), fo_company_contact_still_linked(),
--   fo_stage_fixed(), fo_reason_fixed(), fo_sales_setup_forward(), fo_has_word(text), fo_lead_stays_engaged(),
--   fo_stage_move_matches(), fo_prospect_lead_engaged();
--   delete this folder's row from _prisma_migrations.

-- CreateEnum
CREATE TYPE "FoDoor" AS ENUM ('WEB_FORM', 'MANUAL', 'BOOKING');

-- CreateEnum
CREATE TYPE "FoArrivalOutcome" AS ENUM ('PENDING', 'CREATED', 'ON_OPEN_PROSPECT', 'REJECTED_NO_CONTACT', 'FAILED');

-- CreateEnum
CREATE TYPE "FoLeadState" AS ENUM ('OPEN', 'ENGAGED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FoFirstResponseKind" AS ENUM ('CALL', 'EMAIL', 'MESSAGE');

-- CreateEnum
CREATE TYPE "FoPipeline" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "FoStageKind" AS ENUM ('ACTIVE', 'WON', 'LOST', 'NURTURE');

-- CreateEnum
CREATE TYPE "FoReasonKind" AS ENUM ('LEAD_CLOSE', 'PROSPECT_LOST');

-- CreateEnum
CREATE TYPE "FoContactRole" AS ENUM ('PRIMARY', 'SIGNATORY', 'HR', 'BILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "FoWonVia" AS ENUM ('E_SIGNED', 'SIGNED_OFFLINE', 'CONVERTED');

-- CreateEnum
CREATE TYPE "FoMoveCause" AS ENUM ('PERSON', 'BOOKING', 'RETAINER_SENT', 'RETAINER_EXECUTED', 'SIGNED_OFFLINE', 'CONVERT', 'CHANGE_TYPE');

-- CreateEnum
CREATE TYPE "FoCallDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "FoCallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'LEFT_VOICEMAIL', 'BUSY', 'WRONG_NUMBER', 'CALLBACK_REQUESTED', 'NOT_IN_SERVICE');

-- CreateEnum
CREATE TYPE "FoNoteVisibility" AS ENUM ('INTERNAL', 'CLIENT_VISIBLE');

-- CreateEnum
CREATE TYPE "FoClickIdKind" AS ENUM ('GCLID', 'FBCLID', 'MSCLKID', 'TTCLID', 'OTHER');

-- CreateTable
CREATE TABLE "fo_sales_setup" (
    "firm_id" UUID NOT NULL,
    "next_lead_no" INTEGER NOT NULL DEFAULT 1,
    "next_prospect_no" INTEGER NOT NULL DEFAULT 1,
    "seeded_at" TIMESTAMPTZ,
    "seeded_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_sales_setup_pkey" PRIMARY KEY ("firm_id")
);

-- CreateTable
CREATE TABLE "fo_person" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "given_names" TEXT,
    "family_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "phone_readable" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT,
    "time_zone" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_arrival_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "door" "FoDoor" NOT NULL,
    "web_form_id" UUID,
    "intake_key" TEXT NOT NULL,
    "outcome" "FoArrivalOutcome" NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "lead_id" UUID,
    "person_id" UUID,
    "payload_hash" TEXT NOT NULL,
    "ip_hash" TEXT,

    CONSTRAINT "fo_arrival_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_lead" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "person_id" UUID NOT NULL,
    "door" "FoDoor" NOT NULL,
    "source" TEXT NOT NULL,
    "source_detail" TEXT,
    "interested_in_service_id" UUID,
    "interested_in_text" TEXT,
    "owner_staff_id" UUID,
    "state" "FoLeadState" NOT NULL DEFAULT 'OPEN',
    "close_reason_id" UUID,
    "close_reason_kind" "FoReasonKind",
    "close_note" TEXT,
    "closed_at" TIMESTAMPTZ,
    "closed_by" TEXT,
    "engaged_at" TIMESTAMPTZ,
    "engaged_by" TEXT,
    "first_response_at" TIMESTAMPTZ,
    "first_response_by" TEXT,
    "first_response_kind" "FoFirstResponseKind",
    "possible_match_person_id" UUID,
    "previous_lead_id" UUID,
    "arrived_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_lead_attribution" (
    "firm_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "click_id" TEXT,
    "click_id_kind" "FoClickIdKind",
    "landing_page" TEXT,
    "referrer_url" TEXT,
    "platform" TEXT,
    "platform_lead_id" TEXT,
    "platform_form_id" TEXT,
    "platform_page_id" TEXT,
    "ad_id" TEXT,
    "ad_set_id" TEXT,
    "campaign_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_lead_attribution_pkey" PRIMARY KEY ("firm_id","lead_id")
);

-- CreateTable
CREATE TABLE "fo_company" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "operating_name" TEXT NOT NULL,
    "normalised_name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_company_contact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" "FoContactRole" NOT NULL,
    "valid_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMPTZ,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "fo_company_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_prospect" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "lead_id" UUID NOT NULL,
    "type" "FoPipeline" NOT NULL,
    "stage_id" UUID NOT NULL,
    "subject_person_id" UUID,
    "subject_company_id" UUID,
    "primary_contact_person_id" UUID NOT NULL,
    "owner_staff_id" UUID,
    "value_cents" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
    "close_date" DATE,
    "won_via" "FoWonVia",
    "won_at" TIMESTAMPTZ,
    "lost_reason_id" UUID,
    "lost_reason_kind" "FoReasonKind",
    "lost_note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_stage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "pipeline" "FoPipeline" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "kind" "FoStageKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_reason" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "kind" "FoReasonKind" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_call" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "lead_id" UUID,
    "prospect_id" UUID,
    "direction" "FoCallDirection" NOT NULL,
    "outcome" "FoCallOutcome" NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "by_actor" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "lead_id" UUID,
    "prospect_id" UUID,
    "visibility" "FoNoteVisibility" NOT NULL DEFAULT 'INTERNAL',
    "text" TEXT NOT NULL,
    "by_actor" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_stage_move" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "prospect_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "cause" "FoMoveCause" NOT NULL,
    "by_actor" TEXT NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seq" BIGSERIAL NOT NULL,

    CONSTRAINT "fo_stage_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_web_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "public_token" TEXT NOT NULL,
    "allowed_sites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "consent_wording_version_id" UUID,
    "thank_you_text" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_web_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "combination_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fo_person_firm_id_email_idx" ON "fo_person"("firm_id", "email");

-- CreateIndex
CREATE INDEX "fo_person_firm_id_phone_idx" ON "fo_person"("firm_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "fo_person_firm_id_id_key" ON "fo_person"("firm_id", "id");

-- CreateIndex
CREATE INDEX "fo_arrival_receipt_firm_id_received_at_idx" ON "fo_arrival_receipt"("firm_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "fo_arrival_receipt_firm_id_door_intake_key_key" ON "fo_arrival_receipt"("firm_id", "door", "intake_key");

-- CreateIndex
CREATE INDEX "fo_lead_firm_id_state_owner_staff_id_idx" ON "fo_lead"("firm_id", "state", "owner_staff_id");

-- CreateIndex
CREATE INDEX "fo_lead_firm_id_person_id_idx" ON "fo_lead"("firm_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_lead_firm_id_id_key" ON "fo_lead"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_lead_firm_id_number_key" ON "fo_lead"("firm_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "fo_lead_firm_id_id_person_id_key" ON "fo_lead"("firm_id", "id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_lead_attribution_lead_id_key" ON "fo_lead_attribution"("lead_id");

-- CreateIndex
CREATE INDEX "fo_company_firm_id_normalised_name_idx" ON "fo_company"("firm_id", "normalised_name");

-- CreateIndex
CREATE UNIQUE INDEX "fo_company_firm_id_id_key" ON "fo_company"("firm_id", "id");

-- CreateIndex
CREATE INDEX "fo_company_contact_firm_id_company_id_idx" ON "fo_company_contact"("firm_id", "company_id");

-- CreateIndex
CREATE INDEX "fo_company_contact_firm_id_person_id_idx" ON "fo_company_contact"("firm_id", "person_id");

-- CreateIndex
CREATE INDEX "fo_prospect_firm_id_type_stage_id_idx" ON "fo_prospect"("firm_id", "type", "stage_id");

-- CreateIndex
CREATE INDEX "fo_prospect_firm_id_owner_staff_id_idx" ON "fo_prospect"("firm_id", "owner_staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_prospect_firm_id_id_key" ON "fo_prospect"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_prospect_firm_id_number_key" ON "fo_prospect"("firm_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "fo_stage_firm_id_pipeline_key_key" ON "fo_stage"("firm_id", "pipeline", "key");

-- CreateIndex
CREATE UNIQUE INDEX "fo_stage_firm_id_pipeline_id_key" ON "fo_stage"("firm_id", "pipeline", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_stage_firm_id_id_key" ON "fo_stage"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_reason_firm_id_kind_key_key" ON "fo_reason"("firm_id", "kind", "key");

-- CreateIndex
CREATE UNIQUE INDEX "fo_reason_firm_id_id_kind_key" ON "fo_reason"("firm_id", "id", "kind");

-- CreateIndex
CREATE INDEX "fo_call_firm_id_person_id_started_at_idx" ON "fo_call"("firm_id", "person_id", "started_at");

-- CreateIndex
CREATE INDEX "fo_note_firm_id_person_id_created_at_idx" ON "fo_note"("firm_id", "person_id", "created_at");

-- CreateIndex
CREATE INDEX "fo_stage_move_firm_id_prospect_id_seq_idx" ON "fo_stage_move"("firm_id", "prospect_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "fo_stage_move_seq_key" ON "fo_stage_move"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "fo_web_form_public_token_key" ON "fo_web_form"("public_token");

-- CreateIndex
CREATE UNIQUE INDEX "fo_web_form_firm_id_id_key" ON "fo_web_form"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_service_firm_id_id_key" ON "fo_service"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_service_firm_id_combination_id_key" ON "fo_service"("firm_id", "combination_id");

-- AddForeignKey
ALTER TABLE "fo_person" ADD CONSTRAINT "fo_person_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_firm_id_web_form_id_fkey" FOREIGN KEY ("firm_id", "web_form_id") REFERENCES "fo_web_form"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_firm_id_lead_id_person_id_fkey" FOREIGN KEY ("firm_id", "lead_id", "person_id") REFERENCES "fo_lead"("firm_id", "id", "person_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_firm_id_person_id_fkey" FOREIGN KEY ("firm_id", "person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_person_id_fkey" FOREIGN KEY ("firm_id", "person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_possible_match_person_id_fkey" FOREIGN KEY ("firm_id", "possible_match_person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_interested_in_service_id_fkey" FOREIGN KEY ("firm_id", "interested_in_service_id") REFERENCES "fo_service"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_close_reason_id_close_reason_kind_fkey" FOREIGN KEY ("firm_id", "close_reason_id", "close_reason_kind") REFERENCES "fo_reason"("firm_id", "id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_firm_id_previous_lead_id_fkey" FOREIGN KEY ("firm_id", "previous_lead_id") REFERENCES "fo_lead"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead_attribution" ADD CONSTRAINT "fo_lead_attribution_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_lead_attribution" ADD CONSTRAINT "fo_lead_attribution_firm_id_lead_id_fkey" FOREIGN KEY ("firm_id", "lead_id") REFERENCES "fo_lead"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_company" ADD CONSTRAINT "fo_company_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_company_contact" ADD CONSTRAINT "fo_company_contact_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_company_contact" ADD CONSTRAINT "fo_company_contact_firm_id_company_id_fkey" FOREIGN KEY ("firm_id", "company_id") REFERENCES "fo_company"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_company_contact" ADD CONSTRAINT "fo_company_contact_firm_id_person_id_fkey" FOREIGN KEY ("firm_id", "person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_lead_id_fkey" FOREIGN KEY ("firm_id", "lead_id") REFERENCES "fo_lead"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_type_stage_id_fkey" FOREIGN KEY ("firm_id", "type", "stage_id") REFERENCES "fo_stage"("firm_id", "pipeline", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_subject_person_id_fkey" FOREIGN KEY ("firm_id", "subject_person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_subject_company_id_fkey" FOREIGN KEY ("firm_id", "subject_company_id") REFERENCES "fo_company"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_primary_contact_person_id_fkey" FOREIGN KEY ("firm_id", "primary_contact_person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_firm_id_lost_reason_id_lost_reason_kind_fkey" FOREIGN KEY ("firm_id", "lost_reason_id", "lost_reason_kind") REFERENCES "fo_reason"("firm_id", "id", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_stage" ADD CONSTRAINT "fo_stage_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_reason" ADD CONSTRAINT "fo_reason_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_call" ADD CONSTRAINT "fo_call_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_call" ADD CONSTRAINT "fo_call_firm_id_person_id_fkey" FOREIGN KEY ("firm_id", "person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_call" ADD CONSTRAINT "fo_call_firm_id_lead_id_person_id_fkey" FOREIGN KEY ("firm_id", "lead_id", "person_id") REFERENCES "fo_lead"("firm_id", "id", "person_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_call" ADD CONSTRAINT "fo_call_firm_id_prospect_id_fkey" FOREIGN KEY ("firm_id", "prospect_id") REFERENCES "fo_prospect"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_note" ADD CONSTRAINT "fo_note_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_note" ADD CONSTRAINT "fo_note_firm_id_person_id_fkey" FOREIGN KEY ("firm_id", "person_id") REFERENCES "fo_person"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_note" ADD CONSTRAINT "fo_note_firm_id_lead_id_person_id_fkey" FOREIGN KEY ("firm_id", "lead_id", "person_id") REFERENCES "fo_lead"("firm_id", "id", "person_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_note" ADD CONSTRAINT "fo_note_firm_id_prospect_id_fkey" FOREIGN KEY ("firm_id", "prospect_id") REFERENCES "fo_prospect"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_stage_move" ADD CONSTRAINT "fo_stage_move_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_stage_move" ADD CONSTRAINT "fo_stage_move_firm_id_prospect_id_fkey" FOREIGN KEY ("firm_id", "prospect_id") REFERENCES "fo_prospect"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_stage_move" ADD CONSTRAINT "fo_stage_move_firm_id_from_stage_id_fkey" FOREIGN KEY ("firm_id", "from_stage_id") REFERENCES "fo_stage"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_stage_move" ADD CONSTRAINT "fo_stage_move_firm_id_to_stage_id_fkey" FOREIGN KEY ("firm_id", "to_stage_id") REFERENCES "fo_stage"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_web_form" ADD CONSTRAINT "fo_web_form_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_service" ADD CONSTRAINT "fo_service_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "fo_sales_setup"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- =====================================================================================================================
-- Rules Prisma cannot say (FO-1a). Each names the requirement card or contract line it follows.
-- =====================================================================================================================

-- A front office belongs to a platform firm. No foreign key yet: it needs one back-relation line in platform.prisma
-- (asked of Lead B in FO-1a's PR); until then this trigger refuses a firm that does not exist. Platform firms are never
-- deleted (a firm that leaves is DELETED by status, contracts §7 §1.1).
CREATE FUNCTION fo_sales_setup_firm_exists() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "platform_firm" f WHERE f."id" = NEW."firm_id") THEN
    RAISE EXCEPTION 'fo_sales_setup_firm_exists: % is no platform firm', NEW."firm_id" USING ERRCODE = 'foreign_key_violation';
  END IF;
  -- A setup row starts unseeded at number 1 (break R2-7: one written already marked seeded would never be seeded).
  IF NEW."seeded_at" IS NOT NULL OR NEW."seeded_by" IS NOT NULL OR NEW."next_lead_no" <> 1 OR NEW."next_prospect_no" <> 1 THEN
    RAISE EXCEPTION 'fo_sales_setup_firm_exists: a front office starts unseeded, at number 1' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_sales_setup_firm_exists" BEFORE INSERT ON "fo_sales_setup" FOR EACH ROW EXECUTE FUNCTION fo_sales_setup_firm_exists();
ALTER TABLE "fo_sales_setup" ADD CONSTRAINT "fo_sales_setup_numbers_check" CHECK ("next_lead_no" >= 1 AND "next_prospect_no" >= 1);
ALTER TABLE "fo_sales_setup" ADD CONSTRAINT "fo_sales_setup_seeded_check" CHECK (("seeded_at" IS NULL) = ("seeded_by" IS NULL));
-- The counters only go forward (a counter wound back would block new leads, or give a removed lead's number again), and
-- the seed mark is set once (a cleared mark would seed again over a person's changes; break minors).
CREATE FUNCTION fo_sales_setup_forward() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."next_lead_no" < OLD."next_lead_no" OR NEW."next_prospect_no" < OLD."next_prospect_no" THEN
    RAISE EXCEPTION 'fo_sales_setup_forward: a number counter never goes back' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD."seeded_at" IS NOT NULL AND (NEW."seeded_at" IS DISTINCT FROM OLD."seeded_at" OR NEW."seeded_by" IS DISTINCT FROM OLD."seeded_by") THEN
    RAISE EXCEPTION 'fo_sales_setup_forward: a firm is seeded once; the seed mark never changes' USING ERRCODE = 'check_violation';
  END IF;
  -- The mark is set only with what the seed writes (break R3-3): both pipelines' WON, LOST and NURTURE stages, both
  -- reason lists and a web form.
  IF OLD."seeded_at" IS NULL AND NEW."seeded_at" IS NOT NULL AND (
       (SELECT count(*) FROM "fo_stage" s WHERE s."firm_id" = NEW."firm_id" AND s."kind" <> 'ACTIVE') < 6
    OR (SELECT count(DISTINCT r."kind") FROM "fo_reason" r WHERE r."firm_id" = NEW."firm_id") < 2
    OR NOT EXISTS (SELECT 1 FROM "fo_web_form" w WHERE w."firm_id" = NEW."firm_id")) THEN
    RAISE EXCEPTION 'fo_sales_setup_forward: a firm is marked seeded only with its stages, reasons and web form' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_sales_setup_forward" BEFORE UPDATE ON "fo_sales_setup" FOR EACH ROW EXECUTE FUNCTION fo_sales_setup_forward();

-- A name, label or text a person reads has at least one letter or digit, in any script: ICU's [[:alnum:]] (the
-- databases use the C locale, where [[:alnum:]] knows only ASCII: break R2-1, so 株式会社さくら, Виза and السعر are
-- names), after the Hangul fillers, which Unicode counts as letters but which show nothing, are taken out. Spaces,
-- punctuation, symbols such as the Braille blank, combining marks, joiners and other format characters alone are no
-- name (break R3-2). ICU is in every PostgreSQL 18 the studio runs on (Homebrew on the Mac, pgdg's apt build in CI, the
-- npm build in cloud copies), so this migration fails loudly on one without it.
CREATE FUNCTION fo_has_word(t text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(t, '[\u115f\u1160\u3164\uffa0]', '', 'g') ~ ('[[:alnum:]]' COLLATE "und-x-icu") $$;

-- A front-office row never moves to another firm (the (firm_id, id) keys refuse it for rows that are pointed at; this
-- refuses it for every row, the setup row included).
CREATE FUNCTION fo_firm_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."firm_id" IS DISTINCT FROM OLD."firm_id" THEN
    RAISE EXCEPTION '%: a front-office row never moves to another firm', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fo_sales_setup', 'fo_person', 'fo_arrival_receipt', 'fo_lead', 'fo_company', 'fo_company_contact',
    'fo_prospect', 'fo_stage', 'fo_reason', 'fo_call', 'fo_web_form', 'fo_service'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OF "firm_id" ON %I FOR EACH ROW EXECUTE FUNCTION fo_firm_fixed()', t || '_firm_fixed', t);
  END LOOP;
END $$;

-- Write-once and add-only rows: lead attribution (AG-2-8a rule 4), notes (AG-13-21, -24) and stage moves (history,
-- AG-2-26) are never changed or removed; a correction is a new note.
CREATE FUNCTION fo_insert_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: rows are written once, never changed or removed (% refused)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fo_lead_attribution', 'fo_note', 'fo_stage_move'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fo_insert_only()', t || '_insert_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION fo_insert_only()', t || '_no_truncate', t);
  END LOOP;
END $$;

-- L- and P- numbers per firm (AG-2-84 rule 9, AG02-D12: `L-` + 5 digits, per firm, no year; P- likewise). The next number
-- is taken from the firm's fo_sales_setup row with UPDATE … RETURNING, which holds that row's lock to the end of the
-- transaction: two inserts of one firm wait for each other, so a number never repeats, and a rolled-back insert gives its
-- number back. A number given by the writer is replaced; past 99999 the number grows a digit (never cut). A number never
-- changes once given. The unique (firm_id, number) index is the last guard.
CREATE FUNCTION fo_next_number(firm uuid, which text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  IF which = 'L' THEN
    UPDATE "fo_sales_setup" SET "next_lead_no" = "next_lead_no" + 1 WHERE "firm_id" = firm RETURNING "next_lead_no" - 1 INTO n;
  ELSE
    UPDATE "fo_sales_setup" SET "next_prospect_no" = "next_prospect_no" + 1 WHERE "firm_id" = firm RETURNING "next_prospect_no" - 1 INTO n;
  END IF;
  IF n IS NULL THEN
    RAISE EXCEPTION 'fo_next_number: firm % has no front office set up (fo_sales_setup)', firm USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN which || '-' || CASE WHEN n < 100000 THEN lpad(n::text, 5, '0') ELSE n::text END;
END $$;
CREATE FUNCTION fo_lead_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."number" := fo_next_number(NEW."firm_id", 'L');
  RETURN NEW;
END $$;
CREATE FUNCTION fo_prospect_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."number" := fo_next_number(NEW."firm_id", 'P');
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_lead_number" BEFORE INSERT ON "fo_lead" FOR EACH ROW EXECUTE FUNCTION fo_lead_number();
CREATE TRIGGER "fo_prospect_number" BEFORE INSERT ON "fo_prospect" FOR EACH ROW EXECUTE FUNCTION fo_prospect_number();
CREATE FUNCTION fo_number_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."number" IS DISTINCT FROM OLD."number" THEN
    RAISE EXCEPTION '%: a number never changes (% stays)', TG_TABLE_NAME, OLD."number" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_lead_number_fixed" BEFORE UPDATE OF "number" ON "fo_lead" FOR EACH ROW EXECUTE FUNCTION fo_number_fixed();
CREATE TRIGGER "fo_prospect_number_fixed" BEFORE UPDATE OF "number" ON "fo_prospect" FOR EACH ROW EXECUTE FUNCTION fo_number_fixed();
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_number_check" CHECK ("number" ~ '^L-[0-9]{5,}$');
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_number_check" CHECK ("number" ~ '^P-[0-9]{5,}$');

-- A staff member named as owner is a staff member of the same firm (platform_staff; checked here, not by a foreign key,
-- so platform.prisma needs no more lines). Staff rows are never deleted (deactivated, PF-4) and never move firm (PF-3).
CREATE FUNCTION fo_owner_in_firm() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."owner_staff_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "platform_staff" s WHERE s."firm_id" = NEW."firm_id" AND s."id" = NEW."owner_staff_id") THEN
    RAISE EXCEPTION '%: owner % is no staff member of this firm', TG_TABLE_NAME, NEW."owner_staff_id" USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_lead_owner_in_firm" BEFORE INSERT OR UPDATE OF "owner_staff_id", "firm_id" ON "fo_lead" FOR EACH ROW EXECUTE FUNCTION fo_owner_in_firm();
CREATE TRIGGER "fo_prospect_owner_in_firm" BEFORE INSERT OR UPDATE OF "owner_staff_id", "firm_id" ON "fo_prospect" FOR EACH ROW EXECUTE FUNCTION fo_owner_in_firm();

-- A person: email lower case with no space (as platform emails); a readable phone is E.164 (AG-2-84 rule 5; BR-18); one
-- that could not be read is kept as typed with phone_readable false.
ALTER TABLE "fo_person" ADD CONSTRAINT "fo_person_email_check" CHECK ("email" IS NULL OR ("email" = lower("email") AND "email" !~ '[[:space:][:cntrl:]]' AND "email" LIKE '_%@_%'));
ALTER TABLE "fo_person" ADD CONSTRAINT "fo_person_phone_check" CHECK ("phone" IS NULL OR NOT "phone_readable" OR "phone" ~ '^\+[1-9][0-9]{1,14}$');

-- An arrival receipt: the intake key carries its door (AG-2-84 rule 2): `form:<web form id>:<submission id>` for the web
-- form (and the form is named), `booking:<booking id>`, `manual:<request id>`. PENDING has no completion; CREATED names
-- its lead and person.
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_key_check" CHECK (
  CASE "door"
    WHEN 'WEB_FORM' THEN "web_form_id" IS NOT NULL AND "intake_key" LIKE 'form:' || "web_form_id"::text || ':_%'
    WHEN 'BOOKING' THEN "web_form_id" IS NULL AND "intake_key" LIKE 'booking:_%'
    WHEN 'MANUAL' THEN "web_form_id" IS NULL AND "intake_key" LIKE 'manual:_%'
  END AND "intake_key" ~ '^[!-~]+$');   -- printable ASCII only: keys are made by our code from ids (break R2-6, R3-2)
ALTER TABLE "fo_arrival_receipt" ADD CONSTRAINT "fo_arrival_receipt_outcome_check" CHECK (
  (("outcome" = 'PENDING') = ("completed_at" IS NULL))
  AND ("outcome" <> 'CREATED' OR ("lead_id" IS NOT NULL AND "person_id" IS NOT NULL))
  AND ("outcome" <> 'ON_OPEN_PROSPECT' OR ("door" = 'BOOKING' AND "lead_id" IS NULL AND "person_id" IS NOT NULL))
  -- A receipt naming a lead names its person, so the key (firm_id, lead_id, person_id) is always checked: with an
  -- empty person PostgreSQL would check no key at all, and a receipt could name another firm's lead (review R2-M1).
  AND ("lead_id" IS NULL OR "person_id" IS NOT NULL));

-- A lead (AG-2-80 rules 1-2, 7. Data): CLOSED exactly when it has a close reason, and that reason is from the lead list
-- (the key (firm_id, close_reason_id, close_reason_kind)); ENGAGED needs engaged_at; the first response is all or none
-- (AG-2-37a); a possible match is another person, a previous lead another lead.
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_close_check" CHECK (
  (("state" = 'CLOSED') = ("close_reason_id" IS NOT NULL))
  AND (("close_reason_id" IS NULL) = ("close_reason_kind" IS NULL))
  AND ("close_reason_kind" IS NULL OR "close_reason_kind" = 'LEAD_CLOSE')
  AND (("close_reason_id" IS NULL) = ("closed_at" IS NULL))
  AND (("closed_at" IS NULL) = ("closed_by" IS NULL)));
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_engaged_check" CHECK (("state" <> 'ENGAGED' OR "engaged_at" IS NOT NULL) AND (("engaged_at" IS NULL) = ("engaged_by" IS NULL)));
-- Engaged stays engaged (AG-2-80 rule 5): a lead that has a prospect never goes back to OPEN or to CLOSED.
CREATE FUNCTION fo_lead_stays_engaged() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."state" <> 'ENGAGED' AND EXISTS (SELECT 1 FROM "fo_prospect" p WHERE p."firm_id" = NEW."firm_id" AND p."lead_id" = NEW."id") THEN
    RAISE EXCEPTION 'fo_lead_stays_engaged: a lead with a prospect stays ENGAGED (AG-2-80 rule 5)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_lead_stays_engaged" BEFORE UPDATE OF "state" ON "fo_lead" FOR EACH ROW EXECUTE FUNCTION fo_lead_stays_engaged();
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_first_response_check" CHECK (num_nulls("first_response_at", "first_response_by", "first_response_kind") IN (0, 3));
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_links_check" CHECK (("possible_match_person_id" IS DISTINCT FROM "person_id") AND ("previous_lead_id" IS DISTINCT FROM "id"));
ALTER TABLE "fo_lead" ADD CONSTRAINT "fo_lead_source_check" CHECK (fo_has_word("source"));

-- A company contact (AG-2-77 rules 3, 6): the same person and role are never linked twice while live; one live PRIMARY
-- per company; an end is not before the start.
CREATE UNIQUE INDEX "fo_company_contact_live_role_key" ON "fo_company_contact" ("firm_id", "company_id", "person_id", "role") WHERE "valid_to" IS NULL;
CREATE UNIQUE INDEX "fo_company_contact_one_primary_key" ON "fo_company_contact" ("firm_id", "company_id") WHERE "role" = 'PRIMARY' AND "valid_to" IS NULL;
ALTER TABLE "fo_company_contact" ADD CONSTRAINT "fo_company_contact_dates_check" CHECK ("valid_to" IS NULL OR "valid_to" >= "valid_from");
ALTER TABLE "fo_company" ADD CONSTRAINT "fo_company_names_check" CHECK (fo_has_word("operating_name") AND fo_has_word("normalised_name"));

-- A prospect (AG-2-52 rule 2, AG-2-77 rules 4, 6; contracts §7 §2.1): INDIVIDUAL → a person subject who is the primary
-- contact; CORPORATE → a company subject; the lost reason is from the prospect list; a value is not negative.
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_subject_check" CHECK (
  CASE "type"
    WHEN 'INDIVIDUAL' THEN "subject_person_id" IS NOT NULL AND "subject_company_id" IS NULL AND "primary_contact_person_id" = "subject_person_id"
    WHEN 'CORPORATE' THEN "subject_company_id" IS NOT NULL AND "subject_person_id" IS NULL
  END);
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_lost_reason_check" CHECK (
  (("lost_reason_id" IS NULL) = ("lost_reason_kind" IS NULL)) AND ("lost_reason_kind" IS NULL OR "lost_reason_kind" = 'PROSPECT_LOST'));
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_value_check" CHECK (("value_cents" IS NULL OR "value_cents" >= 0) AND "currency" ~ '^[A-Z]{3}$');
ALTER TABLE "fo_prospect" ADD CONSTRAINT "fo_prospect_won_check" CHECK (("won_via" IS NULL) = ("won_at" IS NULL));

-- A prospect's stage decides what it must carry (AG-2-44 rule 2: lost needs a reason; contracts §2.6: WON names how).
CREATE FUNCTION fo_prospect_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE k "FoStageKind";
BEGIN
  SELECT s."kind" INTO k FROM "fo_stage" s WHERE s."firm_id" = NEW."firm_id" AND s."id" = NEW."stage_id";
  IF k = 'LOST' AND NEW."lost_reason_id" IS NULL THEN
    RAISE EXCEPTION 'fo_prospect_rules: a lost prospect needs a reason (AG-2-44)' USING ERRCODE = 'check_violation';
  END IF;
  IF k IS DISTINCT FROM 'LOST' AND NEW."lost_reason_id" IS NOT NULL THEN
    RAISE EXCEPTION 'fo_prospect_rules: only a lost prospect carries a lost reason' USING ERRCODE = 'check_violation';
  END IF;
  IF (k = 'WON') <> (NEW."won_via" IS NOT NULL) THEN
    RAISE EXCEPTION 'fo_prospect_rules: a prospect in the WON stage, and only there, names how it was won' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_prospect_rules" BEFORE INSERT OR UPDATE ON "fo_prospect" FOR EACH ROW EXECUTE FUNCTION fo_prospect_rules();

-- A Corporate prospect's primary contact has a live link (any role) to its company (AG-2-77 rule 4), checked at commit
-- while the prospect is open (not WON or LOST), so the primary can be swapped in one transaction (AG-2-77 rule 6: end or
-- demote the old PRIMARY link first, since one live PRIMARY per company is an index checked at once; then add the new
-- PRIMARY and repoint the prospect, in either order) and a contact may leave the company once the
-- prospect is closed. Both checks lock what they read (break B2): the prospect's check takes a share lock on the link it
-- relies on, so a transaction ending that link waits for it and then sees the prospect; the link's check reads the open
-- prospects afresh at commit, so a prospect committed meanwhile is seen.
CREATE FUNCTION fo_prospect_contact_linked() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p "fo_prospect"%ROWTYPE;
BEGIN
  SELECT * INTO p FROM "fo_prospect" WHERE "firm_id" = NEW."firm_id" AND "id" = NEW."id";   -- the row as it is at commit
  IF NOT FOUND OR p."type" <> 'CORPORATE' OR EXISTS (SELECT 1 FROM "fo_stage" s WHERE s."firm_id" = p."firm_id" AND s."id" = p."stage_id" AND s."kind" IN ('WON', 'LOST')) THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM "fo_company_contact" c WHERE c."firm_id" = p."firm_id" AND c."company_id" = p."subject_company_id"
    AND c."person_id" = p."primary_contact_person_id" AND c."valid_to" IS NULL LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fo_prospect_contact_linked: % — a Corporate prospect''s primary contact is linked to its company (AG-2-77 rule 4)', p."number" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "fo_prospect_contact_linked" AFTER INSERT OR UPDATE ON "fo_prospect" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fo_prospect_contact_linked();

-- A prospect is made by Engage, so its lead is ENGAGED (AG-2-75, AG-2-80 rule 5; break R2-2), checked at commit (Engage
-- writes the lead and the prospect in either order) with a share lock on the lead: closing the lead at the same time
-- waits for it and then sees the prospect (fo_lead_stays_engaged).
CREATE FUNCTION fo_prospect_lead_engaged() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st "FoLeadState"; lid uuid;
BEGIN
  SELECT p."lead_id" INTO lid FROM "fo_prospect" p WHERE p."firm_id" = NEW."firm_id" AND p."id" = NEW."id";
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT l."state" INTO st FROM "fo_lead" l WHERE l."firm_id" = NEW."firm_id" AND l."id" = lid FOR SHARE;
  IF st IS DISTINCT FROM 'ENGAGED' THEN
    RAISE EXCEPTION 'fo_prospect_lead_engaged: a prospect''s lead is ENGAGED (Engage makes both; AG-2-75)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "fo_prospect_lead_engaged" AFTER INSERT OR UPDATE OF "lead_id" ON "fo_prospect" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fo_prospect_lead_engaged();
CREATE FUNCTION fo_company_contact_still_linked() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n text;
BEGIN
  -- One removal check at a time per company (Devin review on #1742): a person with two live roles whose two links are
  -- ended in two transactions at once would otherwise pass both checks, each seeing the other's link as live. The lock
  -- is held to commit, so the second check reads the first one's committed end. NO KEY UPDATE: inserts that only point
  -- at the company (a new contact, a new prospect) do not wait for it.
  PERFORM 1 FROM "fo_company" c WHERE c."firm_id" = OLD."firm_id" AND c."id" = OLD."company_id" FOR NO KEY UPDATE;
  SELECT p."number" INTO n FROM "fo_prospect" p JOIN "fo_stage" s ON s."firm_id" = p."firm_id" AND s."id" = p."stage_id"
    WHERE p."firm_id" = OLD."firm_id" AND p."type" = 'CORPORATE' AND p."subject_company_id" = OLD."company_id"
      AND p."primary_contact_person_id" = OLD."person_id" AND s."kind" NOT IN ('WON', 'LOST')
      AND NOT EXISTS (SELECT 1 FROM "fo_company_contact" c WHERE c."firm_id" = OLD."firm_id" AND c."company_id" = OLD."company_id"
        AND c."person_id" = OLD."person_id" AND c."valid_to" IS NULL)
    LIMIT 1;
  IF n IS NOT NULL THEN
    RAISE EXCEPTION 'fo_company_contact_still_linked: this person is the primary contact of open prospect %; make another person primary first (AG-2-77 rule 6)', n USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "fo_company_contact_still_linked" AFTER UPDATE OR DELETE ON "fo_company_contact" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fo_company_contact_still_linked();
CREATE TRIGGER "fo_company_contact_no_truncate" BEFORE TRUNCATE ON "fo_company_contact" FOR EACH STATEMENT EXECUTE FUNCTION fo_insert_only();

-- Stages (AG-2-52 rule 3): one WON, one LOST and one NURTURE per pipeline; a stage's key, pipeline and kind never change
-- (reports and the move rules read them); a WON, LOST or NURTURE stage is never removed or turned off.
CREATE UNIQUE INDEX "fo_stage_one_end_kind_key" ON "fo_stage" ("firm_id", "pipeline", "kind") WHERE "kind" <> 'ACTIVE';
ALTER TABLE "fo_stage" ADD CONSTRAINT "fo_stage_label_check" CHECK (fo_has_word("label") AND "key" ~ '^[A-Z][A-Z0-9_]*$');
CREATE FUNCTION fo_stage_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."kind" <> 'ACTIVE' THEN
      RAISE EXCEPTION 'fo_stage_fixed: the % stage of a pipeline is never removed', OLD."kind" USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  -- Each pipeline keeps at least one live ACTIVE stage (AG-2-20 rule 5); one lock per firm and pipeline, so two removals
  -- at once cannot both pass.
  IF OLD."kind" = 'ACTIVE' AND OLD."active" AND (TG_OP = 'DELETE' OR NOT NEW."active") THEN
    PERFORM pg_advisory_xact_lock(hashtext('fo_stage:' || OLD."firm_id"::text || ':' || OLD."pipeline"::text));
    IF NOT EXISTS (SELECT 1 FROM "fo_stage" s WHERE s."firm_id" = OLD."firm_id" AND s."pipeline" = OLD."pipeline" AND s."kind" = 'ACTIVE' AND s."active" AND s."id" <> OLD."id") THEN
      RAISE EXCEPTION 'fo_stage_fixed: a pipeline keeps at least one active ACTIVE stage (AG-2-20 rule 5)' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  IF NEW."key" <> OLD."key" OR NEW."pipeline" <> OLD."pipeline" OR NEW."kind" <> OLD."kind" THEN
    RAISE EXCEPTION 'fo_stage_fixed: a stage''s key, pipeline and kind never change (% stays)', OLD."key" USING ERRCODE = 'check_violation';
  END IF;
  IF OLD."kind" <> 'ACTIVE' AND NOT NEW."active" THEN
    RAISE EXCEPTION 'fo_stage_fixed: the % stage of a pipeline is never turned off', OLD."kind" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_stage_fixed" BEFORE UPDATE OR DELETE ON "fo_stage" FOR EACH ROW EXECUTE FUNCTION fo_stage_fixed();

-- Reasons (AG-2-80 rule 2): a reason's key, list and system flag never change; a system reason is never removed or
-- turned off (its label may be renamed).
ALTER TABLE "fo_reason" ADD CONSTRAINT "fo_reason_label_check" CHECK (fo_has_word("label") AND "key" ~ '^[A-Z][A-Z0-9_]*$');
CREATE FUNCTION fo_reason_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."is_system" THEN
      RAISE EXCEPTION 'fo_reason_fixed: a system reason (%) is never removed', OLD."key" USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."key" <> OLD."key" OR NEW."kind" <> OLD."kind" OR NEW."is_system" <> OLD."is_system" THEN
    RAISE EXCEPTION 'fo_reason_fixed: a reason''s key, list and system flag never change (% stays)', OLD."key" USING ERRCODE = 'check_violation';
  END IF;
  IF OLD."is_system" AND NOT NEW."active" THEN
    RAISE EXCEPTION 'fo_reason_fixed: a system reason (%) is never turned off', OLD."key" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_reason_fixed" BEFORE UPDATE OR DELETE ON "fo_reason" FOR EACH ROW EXECUTE FUNCTION fo_reason_fixed();

-- Calls on exactly one of a lead or a prospect (contracts §2.1); seconds not negative. Notes in at most one context and
-- never empty. A stage move goes somewhere else.
ALTER TABLE "fo_call" ADD CONSTRAINT "fo_call_context_check" CHECK (num_nonnulls("lead_id", "prospect_id") = 1 AND "seconds" >= 0);
ALTER TABLE "fo_note" ADD CONSTRAINT "fo_note_context_check" CHECK (num_nonnulls("lead_id", "prospect_id") <= 1 AND fo_has_word("text"));
ALTER TABLE "fo_stage_move" ADD CONSTRAINT "fo_stage_move_check" CHECK ("from_stage_id" IS DISTINCT FROM "to_stage_id");
-- A stage move records the prospect's own change (review m3): written after it in the same transaction, it moves to the
-- prospect's stage then; a move between pipelines is Change type and only Change type (contracts §7 §2.1).
-- The history is one chain (break R2-4): a move starts where the last one ended (the first starts nowhere), under the
-- prospect's row lock, in the order seq gives there; a move made by a signature, Signed offline or Convert ends in the
-- WON stage, and no other move does (AG-2-28a).
CREATE FUNCTION fo_stage_move_matches() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cur uuid; prev uuid; pf "FoPipeline"; pt "FoPipeline"; kt "FoStageKind";
BEGIN
  SELECT p."stage_id" INTO cur FROM "fo_prospect" p WHERE p."firm_id" = NEW."firm_id" AND p."id" = NEW."prospect_id" FOR UPDATE;
  -- The chain's order is taken here, under the prospect's row lock (review R3-M1): `at` is the transaction's start time
  -- and the id is random, so neither orders moves made in one transaction or in two at once. A seq given is replaced.
  NEW."seq" := nextval(pg_get_serial_sequence('"fo_stage_move"', 'seq'));
  NEW."at" := clock_timestamp();   -- the time of the move, never a writer's (break R3-1: a back-dated move)
  IF cur IS DISTINCT FROM NEW."to_stage_id" THEN
    RAISE EXCEPTION 'fo_stage_move_matches: a move goes to the prospect''s stage (write the prospect first)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT m."to_stage_id" INTO prev FROM "fo_stage_move" m WHERE m."firm_id" = NEW."firm_id" AND m."prospect_id" = NEW."prospect_id" ORDER BY m."seq" DESC LIMIT 1;
  IF prev IS DISTINCT FROM NEW."from_stage_id" THEN
    RAISE EXCEPTION 'fo_stage_move_matches: a move starts where the last one ended (the first starts nowhere)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT s."kind" INTO kt FROM "fo_stage" s WHERE s."firm_id" = NEW."firm_id" AND s."id" = NEW."to_stage_id";
  IF (NEW."cause" IN ('RETAINER_EXECUTED', 'SIGNED_OFFLINE', 'CONVERT')) <> (kt = 'WON') THEN
    RAISE EXCEPTION 'fo_stage_move_matches: a signature, Signed offline or Convert moves to the WON stage, and only they do (AG-2-28a)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT s."pipeline" INTO pt FROM "fo_stage" s WHERE s."firm_id" = NEW."firm_id" AND s."id" = NEW."to_stage_id";
  SELECT s."pipeline" INTO pf FROM "fo_stage" s WHERE s."firm_id" = NEW."firm_id" AND s."id" = NEW."from_stage_id";
  IF (pf IS NOT NULL AND pf <> pt) <> (NEW."cause" = 'CHANGE_TYPE') THEN
    RAISE EXCEPTION 'fo_stage_move_matches: only Change type moves between pipelines, and it always does' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "fo_stage_move_matches" BEFORE INSERT ON "fo_stage_move" FOR EACH ROW EXECUTE FUNCTION fo_stage_move_matches();

-- A web form is turned on only with a consent wording to show (SA-11-29; the wording is the platform's, PF-19a); its
-- public token is long enough not to be guessed; a service has a name.
ALTER TABLE "fo_web_form" ADD CONSTRAINT "fo_web_form_consent_check" CHECK (NOT "enabled" OR "consent_wording_version_id" IS NOT NULL);
ALTER TABLE "fo_web_form" ADD CONSTRAINT "fo_web_form_token_check" CHECK (length("public_token") >= 22 AND fo_has_word("name"));
ALTER TABLE "fo_service" ADD CONSTRAINT "fo_service_label_check" CHECK (fo_has_word("label"));
