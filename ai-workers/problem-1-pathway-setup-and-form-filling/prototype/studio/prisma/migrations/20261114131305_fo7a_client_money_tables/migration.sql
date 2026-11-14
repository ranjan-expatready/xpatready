-- FO-7a (P-558, P-559, P-575 (1), P-576, P-599, P-600; BACKLOG row FO-7a rows rev 7, rev 10 part 2, amended by rev 13;
-- contracts platform-and-front-office-contracts-2026-11-14.md §2.5, §7 binding (§2.5 trust), §8; AG-06: AG-6-1, -4,
-- -19, -44, -46, -59, -60, -61, -63, -69, -73, -76; Code SOR/2022-128 s. 32, s. 33(3), legal reading Unconfirmed: no
-- counsel; schema file prisma/schema/client-money.prisma, owner Lead B (client money, contracts §8)). New tables only;
-- no existing table, column or row changes (platform_firm gains only a back-relation in Prisma, no column). Rows carry
-- no workspace_id: the demo reset leaves them. Nothing outside api/src/client-money/ writes them.
--   * the tables of the row: money_payment_settings, money_payment_account, money_number_series, money_invoice,
--     money_invoice_line, money_credit_note, money_payment, money_refund, money_receipt, money_trust_request,
--     money_trust_entry; rev 13: money_write_off, money_move_batch, money_move_line.
--   * person_id and company_id name FO-1a's fo_person and fo_company; FO-1a is not on main, so they have no foreign key
--     yet: FO-1k adds them (rows rev 16). case_id names the case side's case: no key across the module wall.
--   * rules Prisma cannot say, at the end: numbers from a per-firm series taken in the writing transaction (no gaps, never
--     reused); an issued invoice frozen; insert-only tables; trust withdrawal names an issued invoice; a party's trust
--     balance never below zero (running balance, serialised); one write-off per invoice; moves and undo batches; checks
--     on amounts, currencies, texts and ids.
-- Rollback (in this order): DROP TABLE "money_move_line", "money_move_batch", "money_write_off", "money_receipt",
--   "money_trust_entry", "money_refund", "money_payment", "money_trust_request", "money_credit_note",
--   "money_invoice_line", "money_invoice", "money_number_series", "money_payment_account", "money_payment_settings";
--   DROP FUNCTION money_text_ok(text, integer), money_tax_rates_ok(jsonb), money_missing(text, text, uuid),
--   money_firm_fixed(), money_insert_only(), money_format_number(text, integer), money_take_number(uuid,
--   "MoneySeriesKind"), money_number_series_write(), money_invoice_write(), money_invoice_line_write(),
--   money_invoice_total(uuid, uuid), money_issued_invoice(uuid, uuid, "MoneyCurrency", text), money_credit_note_write(),
--   money_write_off_write(), money_trust_on(uuid, text), money_trust_request_write(), money_payment_write(),
--   money_payment_trust_deposited(), money_refund_write(), money_receipt_write(), money_trust_entry_write(),
--   money_move_batch_write(), money_move_line_write(); DROP TYPE "MoneyMoveDirection",
--   "MoneyMoveKind", "MoneySeriesKind", "MoneyTrustEntryKind", "MoneyReceiptKind", "MoneyRefundRoute",
--   "MoneyAccountKind", "MoneyPaymentMethod", "MoneyLineKind", "MoneyAccountStatus", "MoneyCurrency"; delete this
--   folder's row from _prisma_migrations. (Truncate is refused by trigger: drop the tables, never truncate them.)

-- CreateEnum
CREATE TYPE "MoneyCurrency" AS ENUM ('CAD', 'USD');

-- CreateEnum
CREATE TYPE "MoneyAccountStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'ACTIVE', 'RESTRICTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "MoneyLineKind" AS ENUM ('FEE', 'DISBURSEMENT', 'GOVERNMENT_FEE');

-- CreateEnum
CREATE TYPE "MoneyPaymentMethod" AS ENUM ('CARD', 'E_TRANSFER', 'CHEQUE', 'WIRE', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "MoneyAccountKind" AS ENUM ('OPERATING', 'TRUST');

-- CreateEnum
CREATE TYPE "MoneyRefundRoute" AS ENUM ('CARD', 'OFFLINE');

-- CreateEnum
CREATE TYPE "MoneyReceiptKind" AS ENUM ('PAYMENT', 'TRUST');

-- CreateEnum
CREATE TYPE "MoneyTrustEntryKind" AS ENUM ('DEPOSIT', 'WITHDRAWAL_TO_INVOICE', 'REFUND_TO_CLIENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "MoneySeriesKind" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'RECEIPT', 'TRUST_REQUEST');

-- CreateEnum
CREATE TYPE "MoneyMoveKind" AS ENUM ('TRUST_APPLIED', 'WRONG_ACCOUNT', 'CARD_FEE_ON_TRUST');

-- CreateEnum
CREATE TYPE "MoneyMoveDirection" AS ENUM ('TRUST_TO_OPERATING', 'OPERATING_TO_TRUST');

-- CreateTable
CREATE TABLE "money_payment_settings" (
    "firm_id" UUID NOT NULL,
    "operating_details" TEXT,
    "trust_details" TEXT,
    "tax_number" TEXT,
    "tax_rates" JSONB NOT NULL DEFAULT '[]',
    "trust_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_currency" "MoneyCurrency" NOT NULL DEFAULT 'CAD',
    "due_in_days" INTEGER NOT NULL DEFAULT 14,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "money_payment_settings_pkey" PRIMARY KEY ("firm_id")
);

-- CreateTable
CREATE TABLE "money_payment_account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "stripe_account_id" TEXT,
    "status" "MoneyAccountStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "money_payment_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_number_series" (
    "firm_id" UUID NOT NULL,
    "kind" "MoneySeriesKind" NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_number_series_pkey" PRIMARY KEY ("firm_id","kind")
);

-- CreateTable
CREATE TABLE "money_invoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "person_id" UUID,
    "company_id" UUID,
    "case_id" UUID,
    "number" TEXT,
    "currency" "MoneyCurrency" NOT NULL DEFAULT 'CAD',
    "due_date" DATE,
    "issued_at" TIMESTAMPTZ,
    "issued_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "money_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_invoice_line" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "MoneyLineKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount_minor" INTEGER NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "tax_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "tax_minor" INTEGER NOT NULL DEFAULT 0,
    "currency" "MoneyCurrency" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_credit_note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "number" TEXT,
    "full" BOOLEAN NOT NULL DEFAULT false,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_credit_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "invoice_id" UUID,
    "trust_request_id" UUID,
    "method" "MoneyPaymentMethod" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "received_into" "MoneyAccountKind" NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL,
    "reference" TEXT,
    "evidence_file_key" TEXT,
    "stripe_payment_intent_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "recorded_by" TEXT,
    "cleared" BOOLEAN NOT NULL DEFAULT true,
    "cleared_at" TIMESTAMPTZ,
    "cleared_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_refund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "reason" TEXT NOT NULL,
    "route" "MoneyRefundRoute" NOT NULL,
    "stripe_refund_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "refund_ordinal" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "number" TEXT,
    "kind" "MoneyReceiptKind" NOT NULL,
    "payment_id" UUID,
    "trust_entry_id" UUID,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_trust_request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "number" TEXT,
    "person_id" UUID,
    "company_id" UUID,
    "case_id" UUID,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL DEFAULT 'CAD',
    "purpose" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,
    "sent_by" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" TEXT,
    "cancel_reason" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "money_trust_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_trust_entry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "person_id" UUID,
    "company_id" UUID,
    "case_id" UUID,
    "kind" "MoneyTrustEntryKind" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "balance_after_minor" INTEGER NOT NULL DEFAULT 0,
    "invoice_id" UUID,
    "payment_id" UUID,
    "trust_request_id" UUID,
    "corrects_entry_id" UUID,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_trust_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_write_off" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_write_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_move_batch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "transfer_date" DATE,
    "undoes_batch_id" UUID,
    "reason" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_move_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_move_line" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firm_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "kind" "MoneyMoveKind" NOT NULL,
    "direction" "MoneyMoveDirection" NOT NULL,
    "currency" "MoneyCurrency" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "source_trust_entry_id" UUID,
    "source_payment_id" UUID,
    "move_ordinal" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "money_move_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "money_payment_account_firm_id_key" ON "money_payment_account"("firm_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_payment_account_stripe_account_id_key" ON "money_payment_account"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_number_series_firm_id_prefix_key" ON "money_number_series"("firm_id", "prefix");

-- CreateIndex
CREATE INDEX "money_invoice_firm_id_person_id_idx" ON "money_invoice"("firm_id", "person_id");

-- CreateIndex
CREATE INDEX "money_invoice_firm_id_company_id_idx" ON "money_invoice"("firm_id", "company_id");

-- CreateIndex
CREATE INDEX "money_invoice_firm_id_case_id_idx" ON "money_invoice"("firm_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_invoice_firm_id_id_key" ON "money_invoice"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "money_invoice_firm_id_number_key" ON "money_invoice"("firm_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "money_invoice_line_firm_id_invoice_id_position_key" ON "money_invoice_line"("firm_id", "invoice_id", "position");

-- CreateIndex
CREATE INDEX "money_credit_note_firm_id_invoice_id_idx" ON "money_credit_note"("firm_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_credit_note_firm_id_number_key" ON "money_credit_note"("firm_id", "number");

-- CreateIndex
CREATE INDEX "money_payment_firm_id_invoice_id_idx" ON "money_payment"("firm_id", "invoice_id");

-- CreateIndex
CREATE INDEX "money_payment_firm_id_trust_request_id_idx" ON "money_payment"("firm_id", "trust_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_payment_firm_id_id_key" ON "money_payment"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "money_payment_firm_id_stripe_payment_intent_id_key" ON "money_payment"("firm_id", "stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_payment_firm_id_idempotency_key_key" ON "money_payment"("firm_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "money_refund_firm_id_payment_id_idx" ON "money_refund"("firm_id", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_refund_firm_id_idempotency_key_key" ON "money_refund"("firm_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "money_refund_firm_id_stripe_refund_id_key" ON "money_refund"("firm_id", "stripe_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_refund_firm_id_payment_id_refund_ordinal_key" ON "money_refund"("firm_id", "payment_id", "refund_ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "money_receipt_firm_id_number_key" ON "money_receipt"("firm_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "money_receipt_firm_id_payment_id_key" ON "money_receipt"("firm_id", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_receipt_firm_id_trust_entry_id_key" ON "money_receipt"("firm_id", "trust_entry_id");

-- CreateIndex
CREATE INDEX "money_trust_request_firm_id_person_id_idx" ON "money_trust_request"("firm_id", "person_id");

-- CreateIndex
CREATE INDEX "money_trust_request_firm_id_company_id_idx" ON "money_trust_request"("firm_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_request_firm_id_id_key" ON "money_trust_request"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_request_firm_id_number_key" ON "money_trust_request"("firm_id", "number");

-- CreateIndex
CREATE INDEX "money_trust_entry_firm_id_invoice_id_idx" ON "money_trust_entry"("firm_id", "invoice_id");

-- CreateIndex
CREATE INDEX "money_trust_entry_firm_id_case_id_idx" ON "money_trust_entry"("firm_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_entry_firm_id_id_key" ON "money_trust_entry"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_entry_firm_id_person_id_currency_seq_key" ON "money_trust_entry"("firm_id", "person_id", "currency", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_entry_firm_id_company_id_currency_seq_key" ON "money_trust_entry"("firm_id", "company_id", "currency", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "money_trust_entry_firm_id_payment_id_key" ON "money_trust_entry"("firm_id", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_write_off_firm_id_invoice_id_key" ON "money_write_off"("firm_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_move_batch_firm_id_id_key" ON "money_move_batch"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "money_move_batch_firm_id_undoes_batch_id_key" ON "money_move_batch"("firm_id", "undoes_batch_id");

-- CreateIndex
CREATE INDEX "money_move_line_firm_id_batch_id_idx" ON "money_move_line"("firm_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "money_move_line_firm_id_source_trust_entry_id_kind_move_ord_key" ON "money_move_line"("firm_id", "source_trust_entry_id", "kind", "move_ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "money_move_line_firm_id_source_payment_id_kind_move_ordinal_key" ON "money_move_line"("firm_id", "source_payment_id", "kind", "move_ordinal");

-- AddForeignKey
ALTER TABLE "money_payment_settings" ADD CONSTRAINT "money_payment_settings_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_payment_account" ADD CONSTRAINT "money_payment_account_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_number_series" ADD CONSTRAINT "money_number_series_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_invoice" ADD CONSTRAINT "money_invoice_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_invoice_line" ADD CONSTRAINT "money_invoice_line_firm_id_invoice_id_fkey" FOREIGN KEY ("firm_id", "invoice_id") REFERENCES "money_invoice"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_credit_note" ADD CONSTRAINT "money_credit_note_firm_id_invoice_id_fkey" FOREIGN KEY ("firm_id", "invoice_id") REFERENCES "money_invoice"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_payment" ADD CONSTRAINT "money_payment_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_payment" ADD CONSTRAINT "money_payment_firm_id_invoice_id_fkey" FOREIGN KEY ("firm_id", "invoice_id") REFERENCES "money_invoice"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_payment" ADD CONSTRAINT "money_payment_firm_id_trust_request_id_fkey" FOREIGN KEY ("firm_id", "trust_request_id") REFERENCES "money_trust_request"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_refund" ADD CONSTRAINT "money_refund_firm_id_payment_id_fkey" FOREIGN KEY ("firm_id", "payment_id") REFERENCES "money_payment"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_receipt" ADD CONSTRAINT "money_receipt_firm_id_payment_id_fkey" FOREIGN KEY ("firm_id", "payment_id") REFERENCES "money_payment"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_receipt" ADD CONSTRAINT "money_receipt_firm_id_trust_entry_id_fkey" FOREIGN KEY ("firm_id", "trust_entry_id") REFERENCES "money_trust_entry"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_request" ADD CONSTRAINT "money_trust_request_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_entry" ADD CONSTRAINT "money_trust_entry_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_entry" ADD CONSTRAINT "money_trust_entry_firm_id_invoice_id_fkey" FOREIGN KEY ("firm_id", "invoice_id") REFERENCES "money_invoice"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_entry" ADD CONSTRAINT "money_trust_entry_firm_id_payment_id_fkey" FOREIGN KEY ("firm_id", "payment_id") REFERENCES "money_payment"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_entry" ADD CONSTRAINT "money_trust_entry_firm_id_trust_request_id_fkey" FOREIGN KEY ("firm_id", "trust_request_id") REFERENCES "money_trust_request"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_trust_entry" ADD CONSTRAINT "money_trust_entry_firm_id_corrects_entry_id_fkey" FOREIGN KEY ("firm_id", "corrects_entry_id") REFERENCES "money_trust_entry"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_write_off" ADD CONSTRAINT "money_write_off_firm_id_invoice_id_fkey" FOREIGN KEY ("firm_id", "invoice_id") REFERENCES "money_invoice"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_move_batch" ADD CONSTRAINT "money_move_batch_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "money_payment_settings"("firm_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_move_batch" ADD CONSTRAINT "money_move_batch_firm_id_undoes_batch_id_fkey" FOREIGN KEY ("firm_id", "undoes_batch_id") REFERENCES "money_move_batch"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_move_line" ADD CONSTRAINT "money_move_line_firm_id_batch_id_fkey" FOREIGN KEY ("firm_id", "batch_id") REFERENCES "money_move_batch"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_move_line" ADD CONSTRAINT "money_move_line_firm_id_source_trust_entry_id_fkey" FOREIGN KEY ("firm_id", "source_trust_entry_id") REFERENCES "money_trust_entry"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "money_move_line" ADD CONSTRAINT "money_move_line_firm_id_source_payment_id_fkey" FOREIGN KEY ("firm_id", "source_payment_id") REFERENCES "money_payment"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ------------------------------------------------------------------------------------------------ rules Prisma cannot say
-- Every function and trigger here carries the area's prefix money_ (rows rev 15.2). Refusals use SQLSTATE 23514
-- (check_violation) for a broken rule and 42501 (insufficient_privilege) for a change to an insert-only row, as PF-3 does.

-- Free text a person typed: 1..max characters, at least one visible character, no control characters and no bidi
-- controls. The databases run with the C ctype, where [:space:] is ASCII only, so every Unicode space, invisible
-- format character and line or paragraph separator is listed (break B-9: an ideographic space, RLM, a bidi override
-- or U+2028 passed as a reason).
CREATE FUNCTION money_text_ok(t text, max_len integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT t IS NOT NULL AND char_length(t) BETWEEN 1 AND max_len
       AND t ~ '[^[:space:]\u0085\u00a0\u00ad\u034f\u061c\u115f\u1160\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\u3164\ufeff\uffa0]'
       AND t !~ '[[:cntrl:]\u0085\u2028\u2029\u202a-\u202e\u2066-\u2069]' $$;
-- The firm's tax rates: a JSON list (at most 10) of { "name": 1..40 characters, "rateBp": 0..10000 }.
CREATE FUNCTION money_tax_rates_ok(j jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT jsonb_typeof(j) = 'array' AND jsonb_array_length(j) <= 10 AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(j) e WHERE jsonb_typeof(e) <> 'object'
         OR jsonb_typeof(e -> 'name') IS DISTINCT FROM 'string' OR NOT money_text_ok(e ->> 'name', 40)
         OR jsonb_typeof(e -> 'rateBp') IS DISTINCT FROM 'number' OR (e ->> 'rateBp') !~ '^[0-9]{1,5}$' OR (e ->> 'rateBp')::integer > 10000) $$;

-- A row a trigger checks against must be visible to it. A row written earlier in the same statement (a data-modifying
-- CTE, an earlier row of a multi-row INSERT) is not, and its foreign key passes only at the end of the statement, so
-- "not found" is refused rather than left to the key (break B-1: a 1,000,000 trust deposit from a 1-cent card payment
-- into operating, written in one CTE, skipped every check).
CREATE FUNCTION money_missing(what text, ref text, id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: % % is not visible to this statement (not in the firm, or written in this same statement: write it first)', what, ref, id USING ERRCODE = 'foreign_key_violation';
END $$;

ALTER TABLE "money_payment_settings"
  ADD CONSTRAINT "money_payment_settings_details_check" CHECK (("operating_details" IS NULL OR money_text_ok("operating_details", 2000)) AND ("trust_details" IS NULL OR money_text_ok("trust_details", 2000))),
  ADD CONSTRAINT "money_payment_settings_tax_number_check" CHECK ("tax_number" IS NULL OR money_text_ok("tax_number", 40)),
  ADD CONSTRAINT "money_payment_settings_tax_rates_check" CHECK (money_tax_rates_ok("tax_rates")),
  ADD CONSTRAINT "money_payment_settings_due_check" CHECK ("due_in_days" BETWEEN 0 AND 365),
  ADD CONSTRAINT "money_payment_settings_by_check" CHECK (money_text_ok("updated_by", 200));
ALTER TABLE "money_payment_account"
  ADD CONSTRAINT "money_payment_account_id_check" CHECK ("stripe_account_id" IS NULL OR "stripe_account_id" ~ '^acct_[A-Za-z0-9]{1,64}$'),
  -- Not connected: no account and nothing enabled; any other status names the account; only an ACTIVE or RESTRICTED
  -- account can have charges or payouts on.
  ADD CONSTRAINT "money_payment_account_status_check" CHECK (
    ("status" = 'NOT_CONNECTED') = ("stripe_account_id" IS NULL)
    AND (NOT ("charges_enabled" OR "payouts_enabled") OR "status" IN ('ACTIVE', 'RESTRICTED')));
ALTER TABLE "money_number_series"
  -- Letters then a dash (INV-, CN-, R-, DR-, TOR-): a digit or a missing dash could make two series write one
  -- number (CN1 + 0001 = CN + 10001; break B-6).
  ADD CONSTRAINT "money_number_series_prefix_check" CHECK ("prefix" ~ '^[A-Z]{1,10}-$'),
  ADD CONSTRAINT "money_number_series_next_check" CHECK ("next_number" BETWEEN 1 AND 999999999);
ALTER TABLE "money_invoice"
  ADD CONSTRAINT "money_invoice_party_check" CHECK (num_nonnulls("person_id", "company_id") = 1),
  -- A draft has no number and no issue time; an issued invoice has both, who issued it and a due date.
  ADD CONSTRAINT "money_invoice_issue_check" CHECK (
    ("number" IS NULL AND "issued_at" IS NULL AND "issued_by" IS NULL)
    OR ("number" IS NOT NULL AND "issued_at" IS NOT NULL AND money_text_ok("issued_by", 200) AND "due_date" IS NOT NULL)),
  ADD CONSTRAINT "money_invoice_by_check" CHECK (money_text_ok("created_by", 200));
ALTER TABLE "money_invoice_line"
  ADD CONSTRAINT "money_invoice_line_text_check" CHECK (money_text_ok("description", 500)),
  ADD CONSTRAINT "money_invoice_line_position_check" CHECK ("position" BETWEEN 1 AND 500),
  ADD CONSTRAINT "money_invoice_line_amount_check" CHECK ("quantity" BETWEEN 1 AND 100000 AND "unit_amount_minor" >= 0 AND "amount_minor" = "quantity" * "unit_amount_minor"),
  -- Tax is the line's amount at its rate, rounded per line half away from zero (AG-6-1 rule 3: 850.00 at 13 % is
  -- 110.50); a line never carries a tax unrelated to its amount (break: 2,000,000,000 tax on a 1-cent line).
  -- "Prices include tax" (AG-6-4 rule 6, under Advanced) is not in month one; it would change this check.
  ADD CONSTRAINT "money_invoice_line_tax_check" CHECK ("tax_rate_bp" BETWEEN 0 AND 10000 AND "tax_minor" = round("amount_minor"::numeric * "tax_rate_bp" / 10000)),
  -- A government fee is never taxed (AG-6-4 rule 3: "no override").
  ADD CONSTRAINT "money_invoice_line_government_fee_untaxed" CHECK ("kind" <> 'GOVERNMENT_FEE' OR ("tax_rate_bp" = 0 AND "tax_minor" = 0));
ALTER TABLE "money_credit_note"
  ADD CONSTRAINT "money_credit_note_number_set" CHECK ("number" IS NOT NULL),
  ADD CONSTRAINT "money_credit_note_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "money_credit_note_text_check" CHECK (money_text_ok("reason", 200) AND money_text_ok("created_by", 200));
ALTER TABLE "money_payment"
  ADD CONSTRAINT "money_payment_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "money_payment_target_check" CHECK (num_nonnulls("invoice_id", "trust_request_id") <= 1),
  -- Card money goes to operating only: card into trust waits (contracts §7 §2.5; Code s. 32(c)).
  ADD CONSTRAINT "money_payment_card_not_trust" CHECK ("method" <> 'CARD' OR "received_into" = 'OPERATING'),
  ADD CONSTRAINT "money_payment_intent_check" CHECK ("stripe_payment_intent_id" IS NULL OR ("method" = 'CARD' AND "stripe_payment_intent_id" ~ '^pi_[A-Za-z0-9]{1,64}$')),
  ADD CONSTRAINT "money_payment_key_check" CHECK ("idempotency_key" ~ '^[A-Za-z0-9:._-]{8,200}$'),
  ADD CONSTRAINT "money_payment_reference_check" CHECK ("reference" IS NULL OR money_text_ok("reference", 200)),
  -- A FilesPort key (FO-7t's optional deposit evidence), never the file or a link with a token.
  ADD CONSTRAINT "money_payment_evidence_check" CHECK ("evidence_file_key" IS NULL OR "evidence_file_key" ~ '^[A-Za-z0-9][A-Za-z0-9/._-]{0,299}$'),
  -- A payment recorded by hand names who recorded it (AG-6-19 rule 5); a card payment comes from the processor.
  ADD CONSTRAINT "money_payment_recorded_check" CHECK (("method" = 'CARD' AND "recorded_by" IS NULL) OR money_text_ok("recorded_by", 200)),
  -- Only a cheque waits to clear (AG-6-63 rule 7); once ticked it says when and by whom.
  ADD CONSTRAINT "money_payment_cleared_check" CHECK (("method" = 'CHEQUE' OR "cleared")
    AND (("cleared_at" IS NULL AND "cleared_by" IS NULL) OR ("cleared" AND "cleared_at" IS NOT NULL AND money_text_ok("cleared_by", 200))));
ALTER TABLE "money_refund"
  ADD CONSTRAINT "money_refund_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "money_refund_text_check" CHECK (money_text_ok("reason", 200) AND money_text_ok("created_by", 200)),
  ADD CONSTRAINT "money_refund_key_check" CHECK ("idempotency_key" ~ '^[A-Za-z0-9:._-]{8,200}$'),
  ADD CONSTRAINT "money_refund_route_check" CHECK ("stripe_refund_id" IS NULL OR ("route" = 'CARD' AND "stripe_refund_id" ~ '^re_[A-Za-z0-9]{1,64}$'));
ALTER TABLE "money_receipt"
  ADD CONSTRAINT "money_receipt_number_set" CHECK ("number" IS NOT NULL),
  ADD CONSTRAINT "money_receipt_kind_check" CHECK (
    ("kind" = 'PAYMENT' AND "payment_id" IS NOT NULL AND "trust_entry_id" IS NULL)
    OR ("kind" = 'TRUST' AND "trust_entry_id" IS NOT NULL AND "payment_id" IS NULL));
ALTER TABLE "money_trust_request"
  ADD CONSTRAINT "money_trust_request_party_check" CHECK (num_nonnulls("person_id", "company_id") = 1),
  ADD CONSTRAINT "money_trust_request_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "money_trust_request_text_check" CHECK (money_text_ok("purpose", 500) AND money_text_ok("created_by", 200)),
  ADD CONSTRAINT "money_trust_request_sent_check" CHECK (
    ("sent_at" IS NULL AND "sent_by" IS NULL AND "number" IS NULL) OR ("sent_at" IS NOT NULL AND money_text_ok("sent_by", 200) AND "number" IS NOT NULL)),
  ADD CONSTRAINT "money_trust_request_cancel_check" CHECK (
    ("cancelled_at" IS NULL AND "cancelled_by" IS NULL AND "cancel_reason" IS NULL)
    OR ("cancelled_at" IS NOT NULL AND money_text_ok("cancelled_by", 200) AND money_text_ok("cancel_reason", 200)));
ALTER TABLE "money_trust_entry"
  ADD CONSTRAINT "money_trust_entry_party_check" CHECK (num_nonnulls("person_id", "company_id") = 1),
  -- The sign follows the kind: a deposit adds, a withdrawal or a refund takes away, a correction does either.
  ADD CONSTRAINT "money_trust_entry_sign_check" CHECK (
    ("kind" = 'DEPOSIT' AND "amount_minor" > 0) OR ("kind" IN ('WITHDRAWAL_TO_INVOICE', 'REFUND_TO_CLIENT') AND "amount_minor" < 0)
    OR ("kind" = 'CORRECTION' AND "amount_minor" <> 0)),
  -- A withdrawal names the invoice it pays (Code s. 32(f): invoice before withdrawing); only a withdrawal does.
  ADD CONSTRAINT "money_trust_entry_withdrawal_invoice" CHECK (("kind" = 'WITHDRAWAL_TO_INVOICE') = ("invoice_id" IS NOT NULL)),
  -- A deposit names the payment received into trust that brought it; only a deposit does.
  ADD CONSTRAINT "money_trust_entry_deposit_payment" CHECK (("kind" = 'DEPOSIT') = ("payment_id" IS NOT NULL)),
  ADD CONSTRAINT "money_trust_entry_reason_check" CHECK (CASE WHEN "kind" IN ('REFUND_TO_CLIENT', 'CORRECTION') THEN money_text_ok("reason", 200) ELSE "reason" IS NULL END),
  ADD CONSTRAINT "money_trust_entry_corrects_check" CHECK ("corrects_entry_id" IS NULL OR ("kind" = 'CORRECTION' AND "corrects_entry_id" <> "id")),
  ADD CONSTRAINT "money_trust_entry_by_check" CHECK (money_text_ok("created_by", 200)),
  -- Never below zero (row FO-7a; Code s. 32(d)); seq starts at 1 per party and currency.
  ADD CONSTRAINT "money_trust_entry_balance_check" CHECK ("balance_after_minor" >= 0 AND "seq" >= 1);
ALTER TABLE "money_write_off"
  ADD CONSTRAINT "money_write_off_amount_check" CHECK ("amount_minor" > 0),
  ADD CONSTRAINT "money_write_off_text_check" CHECK (money_text_ok("reason", 200) AND money_text_ok("created_by", 200));
ALTER TABLE "money_move_batch"
  -- A batch records a bank transfer (its date, no reason); an undo names the batch it undoes and a reason.
  ADD CONSTRAINT "money_move_batch_kind_check" CHECK (
    ("undoes_batch_id" IS NULL AND "transfer_date" IS NOT NULL AND "reason" IS NULL)
    OR ("undoes_batch_id" IS NOT NULL AND "undoes_batch_id" <> "id" AND money_text_ok("reason", 200))),
  ADD CONSTRAINT "money_move_batch_by_check" CHECK (money_text_ok("recorded_by", 200));
ALTER TABLE "money_move_line"
  ADD CONSTRAINT "money_move_line_amount_check" CHECK ("amount_minor" > 0 AND "move_ordinal" >= 1),
  -- A trust application comes from a trust withdrawal; a wrong-account amount and a card fee come from a payment.
  ADD CONSTRAINT "money_move_line_source_check" CHECK (num_nonnulls("source_trust_entry_id", "source_payment_id") = 1
    AND ("kind" = 'TRUST_APPLIED') = ("source_trust_entry_id" IS NOT NULL));

-- ------------------------------------------------------------------------------------- firm_id and insert-only tables
CREATE FUNCTION money_firm_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.firm_id IS DISTINCT FROM OLD.firm_id THEN
    RAISE EXCEPTION '%: firm_id never changes', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER money_payment_settings_firm_fixed BEFORE UPDATE OF firm_id ON "money_payment_settings" FOR EACH ROW EXECUTE FUNCTION money_firm_fixed();
CREATE TRIGGER money_payment_account_firm_fixed BEFORE UPDATE OF firm_id ON "money_payment_account" FOR EACH ROW EXECUTE FUNCTION money_firm_fixed();

-- Ledger rows are never changed or removed (row FO-7a; rev 13): update, delete and truncate are refused. A mistake is
-- a new row (a correction entry, a credit note, a refund, an undo batch).
CREATE FUNCTION money_insert_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: rows are never changed or removed (% refused); a mistake is a new row', TG_TABLE_NAME, TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER money_credit_note_insert_only BEFORE UPDATE OR DELETE ON "money_credit_note" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_refund_insert_only BEFORE UPDATE OR DELETE ON "money_refund" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_receipt_insert_only BEFORE UPDATE OR DELETE ON "money_receipt" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_trust_entry_insert_only BEFORE UPDATE OR DELETE ON "money_trust_entry" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_write_off_insert_only BEFORE UPDATE OR DELETE ON "money_write_off" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_move_batch_insert_only BEFORE UPDATE OR DELETE ON "money_move_batch" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_move_line_insert_only BEFORE UPDATE OR DELETE ON "money_move_line" FOR EACH ROW EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_credit_note_no_truncate BEFORE TRUNCATE ON "money_credit_note" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_refund_no_truncate BEFORE TRUNCATE ON "money_refund" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_receipt_no_truncate BEFORE TRUNCATE ON "money_receipt" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_trust_entry_no_truncate BEFORE TRUNCATE ON "money_trust_entry" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_write_off_no_truncate BEFORE TRUNCATE ON "money_write_off" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_move_batch_no_truncate BEFORE TRUNCATE ON "money_move_batch" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_move_line_no_truncate BEFORE TRUNCATE ON "money_move_line" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
-- Payments and issued numbers are records too: no truncate of payments, invoices, trust requests or the series.
CREATE TRIGGER money_payment_no_truncate BEFORE TRUNCATE ON "money_payment" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_invoice_no_truncate BEFORE TRUNCATE ON "money_invoice" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_invoice_line_no_truncate BEFORE TRUNCATE ON "money_invoice_line" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_trust_request_no_truncate BEFORE TRUNCATE ON "money_trust_request" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();
CREATE TRIGGER money_number_series_no_truncate BEFORE TRUNCATE ON "money_number_series" FOR EACH STATEMENT EXECUTE FUNCTION money_insert_only();

-- ------------------------------------------------------------------------------------------------ the connected account
-- One Stripe account belongs to one firm: the unique index money_payment_account_stripe_account_id_key (in the schema,
-- @unique). It is the one money_ index without firm_id first, on purpose: webhooks are routed by the account id before
-- the firm is known, and a trigger could not keep it unique at REPEATABLE READ (review, round 1, m1); as PF-3's
-- platform_subscription.stripe_subscription_id.

-- ---------------------------------------------------------------------------------------------------- number series
-- AG-6-44: INV-0001, CN-0001, R-0001, DR-0001, growing past 9999 (INV-9999 → INV-10000). A number is taken only here,
-- inside the transaction that writes the numbered row, by one UPDATE on the series row: a second writer waits for the
-- first to commit (or fails to serialise), and a rolled-back writer gives its number back. So numbers never repeat
-- and never skip. A firm moving from another system may raise next_number; it never goes back, and the row is never
-- deleted. The series row is made on first use with the default prefix.
CREATE FUNCTION money_format_number(prefix text, n integer) RETURNS text LANGUAGE sql IMMUTABLE AS
  $$ SELECT prefix || CASE WHEN n < 10000 THEN lpad(n::text, 4, '0') ELSE n::text END $$;
CREATE FUNCTION money_take_number(f uuid, k "MoneySeriesKind") RETURNS text LANGUAGE plpgsql AS $$
DECLARE p text; n integer;
BEGIN
  INSERT INTO "money_number_series" (firm_id, kind, prefix, next_number, updated_at)
    VALUES (f, k, CASE k WHEN 'INVOICE' THEN 'INV-' WHEN 'CREDIT_NOTE' THEN 'CN-' WHEN 'RECEIPT' THEN 'R-' ELSE 'DR-' END, 1, now())
    ON CONFLICT (firm_id, kind) DO NOTHING;
  UPDATE "money_number_series" SET next_number = next_number + 1, updated_at = now()
    WHERE firm_id = f AND kind = k RETURNING prefix, next_number - 1 INTO p, n;
  RETURN money_format_number(p, n);
END $$;
CREATE FUNCTION money_number_series_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'money_number_series: a number series is never deleted (its numbers would be reused)' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF (NEW.firm_id, NEW.kind) IS DISTINCT FROM (OLD.firm_id, OLD.kind) THEN
    RAISE EXCEPTION 'money_number_series: firm_id and kind never change' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.next_number < OLD.next_number THEN
    RAISE EXCEPTION 'money_number_series: the next % number cannot go back from % to % (numbers are never reused)', OLD.kind, OLD.next_number, NEW.next_number USING ERRCODE = 'check_violation';
  END IF;
  -- A firm moving from another system sets its first number when it writes the series row (AG-6-44 rule 2); after
  -- that the series moves only by taking a number, so a jump never leaves a gap (break B-6).
  IF NEW.next_number > OLD.next_number + 1 THEN
    RAISE EXCEPTION 'money_number_series: the next % number moves one at a time once the series exists (% to % would leave a gap); set the first number when the series is written', OLD.kind, OLD.next_number, NEW.next_number USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER money_number_series_write BEFORE UPDATE OR DELETE ON "money_number_series" FOR EACH ROW EXECUTE FUNCTION money_number_series_write();
-- Two series of one firm never share a prefix: the unique index money_number_series_firm_id_prefix_key (break B-6: an
-- invoice and a credit note both CN-10001).

-- -------------------------------------------------------------------------------------------------------- invoices
CREATE FUNCTION money_invoice_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE wrong integer; total bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.issued_at IS NOT NULL THEN
      RAISE EXCEPTION 'money_invoice: issued invoices can''t be edited — use a credit note (% is never deleted)', OLD.number USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.number IS NOT NULL OR NEW.issued_at IS NOT NULL OR NEW.issued_by IS NOT NULL THEN
      RAISE EXCEPTION 'money_invoice: an invoice is written as a draft (no number, not issued); its number is the database''s' USING ERRCODE = 'check_violation';
    END IF;
    NEW.created_at := now();
    RETURN NEW;
  END IF;
  IF NEW.firm_id IS DISTINCT FROM OLD.firm_id THEN
    RAISE EXCEPTION 'money_invoice: firm_id never changes' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.issued_at IS NOT NULL THEN
    IF (NEW.number, NEW.issued_at, NEW.issued_by, NEW.person_id, NEW.company_id, NEW.case_id, NEW.currency, NEW.created_by, NEW.created_at)
       IS DISTINCT FROM (OLD.number, OLD.issued_at, OLD.issued_by, OLD.person_id, OLD.company_id, OLD.case_id, OLD.currency, OLD.created_by, OLD.created_at) THEN
      RAISE EXCEPTION 'money_invoice: issued invoices can''t be edited — use a credit note (% is fixed)', OLD.number USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.number IS DISTINCT FROM OLD.number OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'money_invoice: the number and the times are the database''s' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.issued_at IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM "money_invoice_line" l WHERE l.firm_id = NEW.firm_id AND l.invoice_id = NEW.id) THEN
      RAISE EXCEPTION 'money_invoice: an invoice with no lines is not issued' USING ERRCODE = 'check_violation';
    END IF;
    SELECT count(*) INTO wrong FROM "money_invoice_line" l WHERE l.firm_id = NEW.firm_id AND l.invoice_id = NEW.id AND l.currency <> NEW.currency;
    IF wrong > 0 THEN
      RAISE EXCEPTION 'money_invoice: % line(s) are not in the invoice''s currency %', wrong, NEW.currency USING ERRCODE = 'check_violation';
    END IF;
    -- Every amount written against it (a credit note, a write-off, a payment) is an integer column, so its total is
    -- one too (break: a total past 2^31 − 1 cents could never be fully credited).
    total := money_invoice_total(NEW.firm_id, NEW.id);
    IF total > 2147483647 THEN
      RAISE EXCEPTION 'money_invoice: a total of % cents is more than one invoice can hold (21,474,836.47)', total USING ERRCODE = 'check_violation';
    END IF;
    NEW.number := money_take_number(NEW.firm_id, 'INVOICE');
    NEW.issued_at := now();  -- the issue time is the database's: never backdated (break B-10)
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER money_invoice_write BEFORE INSERT OR UPDATE OR DELETE ON "money_invoice" FOR EACH ROW EXECUTE FUNCTION money_invoice_write();

CREATE FUNCTION money_invoice_line_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE inv record; r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.firm_id, NEW.invoice_id) IS DISTINCT FROM (OLD.firm_id, OLD.invoice_id) THEN
    RAISE EXCEPTION 'money_invoice_line: a line never moves to another invoice or firm' USING ERRCODE = 'check_violation';
  END IF;
  SELECT i.issued_at, i.number, i.currency INTO inv FROM "money_invoice" i WHERE i.firm_id = r.firm_id AND i.id = r.invoice_id FOR SHARE;
  IF NOT FOUND THEN PERFORM money_missing('money_invoice_line', 'invoice', r.invoice_id); END IF;
  IF inv.issued_at IS NOT NULL THEN
    RAISE EXCEPTION 'money_invoice_line: issued invoices can''t be edited — use a credit note (% is fixed)', inv.number USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.currency <> inv.currency THEN
    RAISE EXCEPTION 'money_invoice_line: a line is in its invoice''s currency (%), not %', inv.currency, NEW.currency USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER money_invoice_line_write BEFORE INSERT OR UPDATE OR DELETE ON "money_invoice_line" FOR EACH ROW EXECUTE FUNCTION money_invoice_line_write();

-- An invoice's total: its lines and their tax (frozen once issued).
CREATE FUNCTION money_invoice_total(f uuid, inv uuid) RETURNS bigint LANGUAGE sql STABLE AS
  $$ SELECT coalesce(sum(l.amount_minor::bigint + l.tax_minor), 0) FROM "money_invoice_line" l WHERE l.firm_id = f AND l.invoice_id = inv $$;

-- The invoice an amount is written against (a credit note, a write-off, a trust withdrawal): it is issued and in the
-- same currency. Each of them touches the invoice row (updated_at, the one column an issued invoice may change
-- besides its due date) before reading what is already written against it. So writers on one invoice go one at a
-- time: at READ COMMITTED the second waits and then reads the first's row; at REPEATABLE READ the second fails to
-- serialise (40001) because the row changed after its snapshot (review round 1: a row lock alone does not refresh a
-- snapshot). Returns what is still open to credit, write off or pay from trust: the total less credit notes and the
-- write-off (break B-8: a full credit note and a write-off exceeded the total).
CREATE FUNCTION money_issued_invoice(f uuid, inv uuid, cur "MoneyCurrency", what text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE i record; credited bigint; written bigint;
BEGIN
  UPDATE "money_invoice" x SET updated_at = now() WHERE x.firm_id = f AND x.id = inv RETURNING x.issued_at, x.currency INTO i;
  IF NOT FOUND THEN PERFORM money_missing(what, 'invoice', inv); END IF;
  IF i.issued_at IS NULL THEN
    RAISE EXCEPTION '%: a draft invoice cannot have one (issue it first)', what USING ERRCODE = 'check_violation';
  END IF;
  IF i.currency <> cur THEN
    RAISE EXCEPTION '%: in the invoice''s currency (%), not %', what, i.currency, cur USING ERRCODE = 'check_violation';
  END IF;
  SELECT coalesce(sum(amount_minor), 0) INTO credited FROM "money_credit_note" WHERE firm_id = f AND invoice_id = inv;
  SELECT coalesce(sum(amount_minor), 0) INTO written FROM "money_write_off" WHERE firm_id = f AND invoice_id = inv;
  RETURN money_invoice_total(f, inv) - credited - written;
END $$;

-- Credit notes (AG-6-48): on an issued invoice, in its currency; together with any write-off never more than its total;
-- a full credit note credits all that is left. The CN- number is the database's.
CREATE FUNCTION money_credit_note_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE open_amount bigint;
BEGIN
  IF NEW.number IS NOT NULL THEN
    RAISE EXCEPTION 'money_credit_note: the number is the database''s' USING ERRCODE = 'check_violation';
  END IF;
  open_amount := money_issued_invoice(NEW.firm_id, NEW.invoice_id, NEW.currency, 'money_credit_note');
  IF NEW.amount_minor > open_amount THEN
    RAISE EXCEPTION 'money_credit_note: % is more than is left to credit on the invoice (%)', NEW.amount_minor, open_amount USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."full" AND NEW.amount_minor <> open_amount THEN
    RAISE EXCEPTION 'money_credit_note: a full credit note credits all that is left (%)', open_amount USING ERRCODE = 'check_violation';
  END IF;
  NEW.number := money_take_number(NEW.firm_id, 'CREDIT_NOTE');
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_credit_note_write BEFORE INSERT ON "money_credit_note" FOR EACH ROW EXECUTE FUNCTION money_credit_note_write();

-- Write-offs (AG-6-76): one per invoice (unique index), never on a draft, in its currency, never more than its total.
-- Write-offs (AG-6-76): one per invoice (unique index), never on a draft, in its currency, never more than is left
-- after credit notes.
CREATE FUNCTION money_write_off_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE open_amount bigint;
BEGIN
  open_amount := money_issued_invoice(NEW.firm_id, NEW.invoice_id, NEW.currency, 'money_write_off');
  IF NEW.amount_minor > open_amount THEN
    RAISE EXCEPTION 'money_write_off: % is more than is left on the invoice (%)', NEW.amount_minor, open_amount USING ERRCODE = 'check_violation';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_write_off_write BEFORE INSERT ON "money_write_off" FOR EACH ROW EXECUTE FUNCTION money_write_off_write();

-- ---------------------------------------------------------------------------------------------------- trust requests
-- Trust is off until the Owner says Yes (AG-6-59): no trust request is written or sent, no money is received into
-- trust and no deposit is recorded while trust_enabled is false. Withdrawals, refunds to the client and corrections of
-- money already held stay possible (AG-6-59 rule 6: Yes → No while money is held).
CREATE FUNCTION money_trust_on(f uuid, what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce((SELECT s.trust_enabled FROM "money_payment_settings" s WHERE s.firm_id = f), false) THEN
    RAISE EXCEPTION '%: the firm does not hold client money in trust (trust is off)', what USING ERRCODE = 'check_violation';
  END IF;
END $$;
-- A trust request takes its DR- number when it is sent (AG-6-44 rule 7). Once sent, its number, party, case, currency
-- and sending never change; its amount and purpose may change only while nothing is paid on it (AG-6-61 rule 10). A
-- cancel needs a reason, keeps the number and is final. A sent request is never deleted. Sending and cancelling are
-- stamped by the database (break B-10). Only with trust on.
CREATE FUNCTION money_trust_request_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sent_at IS NOT NULL THEN
      RAISE EXCEPTION 'money_trust_request: a sent request (%) is never deleted; cancel it with a reason', OLD.number USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM money_trust_on(NEW.firm_id, 'money_trust_request');
    IF NEW.number IS NOT NULL THEN
      RAISE EXCEPTION 'money_trust_request: the number is the database''s, taken when the request is sent' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION 'money_trust_request: a request is not written cancelled' USING ERRCODE = 'check_violation';
    END IF;
    NEW.created_at := now();
    IF NEW.sent_at IS NOT NULL THEN NEW.number := money_take_number(NEW.firm_id, 'TRUST_REQUEST'); NEW.sent_at := now(); END IF;
    RETURN NEW;
  END IF;
  IF NEW.firm_id IS DISTINCT FROM OLD.firm_id THEN
    RAISE EXCEPTION 'money_trust_request: firm_id never changes' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.cancelled_at IS NOT NULL AND (NEW.number, NEW.person_id, NEW.company_id, NEW.case_id, NEW.amount_minor, NEW.currency, NEW.purpose, NEW.sent_at, NEW.sent_by, NEW.cancelled_at, NEW.cancelled_by, NEW.cancel_reason, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM (OLD.number, OLD.person_id, OLD.company_id, OLD.case_id, OLD.amount_minor, OLD.currency, OLD.purpose, OLD.sent_at, OLD.sent_by, OLD.cancelled_at, OLD.cancelled_by, OLD.cancel_reason, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'money_trust_request: a cancelled request (%) never changes', coalesce(OLD.number, 'unsent') USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.number IS DISTINCT FROM OLD.number OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'money_trust_request: the number and the times are the database''s' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL THEN NEW.cancelled_at := now(); END IF;
  IF OLD.sent_at IS NULL THEN
    IF NEW.sent_at IS NOT NULL THEN
      PERFORM money_trust_on(NEW.firm_id, 'money_trust_request');
      NEW.number := money_take_number(NEW.firm_id, 'TRUST_REQUEST');
      NEW.sent_at := now();
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.sent_at, NEW.sent_by, NEW.person_id, NEW.company_id, NEW.case_id, NEW.currency, NEW.created_by)
     IS DISTINCT FROM (OLD.sent_at, OLD.sent_by, OLD.person_id, OLD.company_id, OLD.case_id, OLD.currency, OLD.created_by) THEN
    RAISE EXCEPTION 'money_trust_request: a sent request''s party, case, currency and sending never change (%)', OLD.number USING ERRCODE = 'check_violation';
  END IF;
  -- A payment on the request share-locks it first (money_payment_write), so this read sees every payment that could
  -- race the change: the change waits for it, and at REPEATABLE READ a payment committed after this snapshot makes
  -- the payment's lock fail instead (break B-4).
  IF (NEW.amount_minor, NEW.purpose) IS DISTINCT FROM (OLD.amount_minor, OLD.purpose)
     AND EXISTS (SELECT 1 FROM "money_payment" p WHERE p.firm_id = OLD.firm_id AND p.trust_request_id = OLD.id) THEN
    RAISE EXCEPTION 'money_trust_request: % has money recorded on it; its amount and purpose stay', OLD.number USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER money_trust_request_write BEFORE INSERT OR UPDATE OR DELETE ON "money_trust_request" FOR EACH ROW EXECUTE FUNCTION money_trust_request_write();

-- ------------------------------------------------------------------------------------------------- payments, refunds
-- A payment is written against an issued invoice, a sent and not cancelled trust request (never by card), or nothing;
-- in that document's currency. Money into trust only with trust on. Afterwards only a cheque's "Cleared" tick changes
-- it, once. It is never deleted.
CREATE FUNCTION money_payment_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'money_payment: a payment is never deleted; a mistake is a refund or a correction' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.cleared = false AND NEW.cleared = true)
       OR (NEW.id, NEW.firm_id, NEW.invoice_id, NEW.trust_request_id, NEW.method, NEW.amount_minor, NEW.currency, NEW.received_into, NEW.received_at, NEW.reference, NEW.evidence_file_key, NEW.stripe_payment_intent_id, NEW.idempotency_key, NEW.recorded_by, NEW.created_at)
          IS DISTINCT FROM (OLD.id, OLD.firm_id, OLD.invoice_id, OLD.trust_request_id, OLD.method, OLD.amount_minor, OLD.currency, OLD.received_into, OLD.received_at, OLD.reference, OLD.evidence_file_key, OLD.stripe_payment_intent_id, OLD.idempotency_key, OLD.recorded_by, OLD.created_at) THEN
      RAISE EXCEPTION 'money_payment: a payment never changes; only an uncleared cheque is ticked "Cleared", once' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.received_into = 'TRUST' THEN PERFORM money_trust_on(NEW.firm_id, 'money_payment'); END IF;
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT i.issued_at, i.currency INTO d FROM "money_invoice" i WHERE i.firm_id = NEW.firm_id AND i.id = NEW.invoice_id;
    IF NOT FOUND THEN PERFORM money_missing('money_payment', 'invoice', NEW.invoice_id); END IF;
    IF d.issued_at IS NULL THEN
      RAISE EXCEPTION 'money_payment: a draft invoice takes no payment (issue it first)' USING ERRCODE = 'check_violation';
    END IF;
    IF d.currency <> NEW.currency THEN
      RAISE EXCEPTION 'money_payment: a payment is in its invoice''s currency (%), not %', d.currency, NEW.currency USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.trust_request_id IS NOT NULL THEN
    -- Share-locked: a cancel or an amount change of the request waits for this payment, or this payment for it, and
    -- reads it after (break B-4: a cancelled request was paid, and its amount changed with money on it).
    SELECT r.sent_at, r.cancelled_at, r.currency INTO d FROM "money_trust_request" r WHERE r.firm_id = NEW.firm_id AND r.id = NEW.trust_request_id FOR SHARE;
    IF NOT FOUND THEN PERFORM money_missing('money_payment', 'trust request', NEW.trust_request_id); END IF;
    IF d.sent_at IS NULL OR d.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION 'money_payment: only a sent, not cancelled, trust request takes a payment' USING ERRCODE = 'check_violation';
    END IF;
    IF d.currency <> NEW.currency THEN
      RAISE EXCEPTION 'money_payment: a payment is in its request''s currency (%), not %', d.currency, NEW.currency USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.method = 'CARD' OR NEW.received_into <> 'TRUST' THEN
      RAISE EXCEPTION 'money_payment: a trust request is paid straight into the trust account, never by card (contracts §7 §2.5)' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_payment_write BEFORE INSERT OR UPDATE OR DELETE ON "money_payment" FOR EACH ROW EXECUTE FUNCTION money_payment_write();
-- Money received into trust is in the trust ledger by the end of its transaction: a payment into TRUST without its
-- DEPOSIT entry is refused at commit (break: a payment into trust had no ledger entry, so the ledger and the bank
-- would never agree).
CREATE FUNCTION money_payment_trust_deposited() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.received_into = 'TRUST' AND NOT EXISTS (SELECT 1 FROM "money_trust_entry" e WHERE e.firm_id = NEW.firm_id AND e.payment_id = NEW.id AND e.kind = 'DEPOSIT') THEN
    RAISE EXCEPTION 'money_payment: money received into trust is recorded in the trust ledger (a DEPOSIT entry) in the same transaction' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER money_payment_trust_deposited AFTER INSERT ON "money_payment" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION money_payment_trust_deposited();

-- Refunds of one payment never exceed it, in its currency; a card refund only of a card payment. Money received into
-- trust goes back to the client as a trust entry (REFUND_TO_CLIENT, FO-7t), never as a refund here, so the trust
-- ledger always follows the money (review round 1, m7). The payment row is locked for update, so at READ COMMITTED
-- refunds of one payment are written one at a time, each reading the others after the lock. At REPEATABLE READ a row
-- lock does not refresh the snapshot (review round 1, Major 1, break B-2: two refunds of 700.00 on a 1,000.00 payment
-- both passed), so refund_ordinal (the count of the payment's earlier refunds + 1, the database's) is unique per
-- payment: a writer whose snapshot misses a committed refund computes an ordinal already taken and is refused (23505).
CREATE FUNCTION money_refund_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p record; refunded bigint; earlier integer;
BEGIN
  SELECT x.amount_minor, x.currency, x.method, x.received_into INTO p FROM "money_payment" x WHERE x.firm_id = NEW.firm_id AND x.id = NEW.payment_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM money_missing('money_refund', 'payment', NEW.payment_id); END IF;
  IF p.received_into = 'TRUST' THEN
    RAISE EXCEPTION 'money_refund: money received into trust goes back as a trust entry (refund to client), not a refund' USING ERRCODE = 'check_violation';
  END IF;
  IF p.currency <> NEW.currency THEN
    RAISE EXCEPTION 'money_refund: a refund is in its payment''s currency (%), not %', p.currency, NEW.currency USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.route = 'CARD' AND p.method <> 'CARD' THEN
    RAISE EXCEPTION 'money_refund: only a card payment is refunded to the card' USING ERRCODE = 'check_violation';
  END IF;
  SELECT coalesce(sum(amount_minor), 0), count(*) INTO refunded, earlier FROM "money_refund" WHERE firm_id = NEW.firm_id AND payment_id = NEW.payment_id;
  IF refunded + NEW.amount_minor > p.amount_minor THEN
    RAISE EXCEPTION 'money_refund: % would refund more than the payment % (already refunded %)', NEW.amount_minor, p.amount_minor, refunded USING ERRCODE = 'check_violation';
  END IF;
  NEW.refund_ordinal := earlier + 1;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_refund_write BEFORE INSERT ON "money_refund" FOR EACH ROW EXECUTE FUNCTION money_refund_write();

-- Receipts (AG-6-63): a payment receipt names a payment against an invoice; a trust receipt names a deposit entry
-- whose payment is not against an invoice (money paid on an invoice under "Trust first" gets the payment receipt only,
-- AG-6-69 rule 5; review round 1, m3). The R- number is the database's, from the one receipt series.
CREATE FUNCTION money_receipt_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.number IS NOT NULL THEN
    RAISE EXCEPTION 'money_receipt: the number is the database''s' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.kind = 'PAYMENT' AND NOT EXISTS (SELECT 1 FROM "money_payment" p WHERE p.firm_id = NEW.firm_id AND p.id = NEW.payment_id AND p.invoice_id IS NOT NULL) THEN
    RAISE EXCEPTION 'money_receipt: a payment receipt names a payment against an invoice (money into trust gets a trust receipt)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.kind = 'TRUST' AND NOT EXISTS (SELECT 1 FROM "money_trust_entry" e JOIN "money_payment" p ON p.firm_id = e.firm_id AND p.id = e.payment_id
       WHERE e.firm_id = NEW.firm_id AND e.id = NEW.trust_entry_id AND e.kind = 'DEPOSIT' AND p.invoice_id IS NULL) THEN
    RAISE EXCEPTION 'money_receipt: a trust receipt names a trust deposit that was not paid on an invoice (that one gets the payment receipt)' USING ERRCODE = 'check_violation';
  END IF;
  NEW.number := money_take_number(NEW.firm_id, 'RECEIPT');
  NEW.issued_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_receipt_write BEFORE INSERT ON "money_receipt" FOR EACH ROW EXECUTE FUNCTION money_receipt_write();

-- ------------------------------------------------------------------------------------------------------- trust ledger
-- One running balance per party and currency (Code s. 32(d)). Each entry takes a lock for its party and currency held
-- to the end of its transaction, then reads the last entry (a fresh read, after the lock) and writes seq + 1 and the
-- new balance; a balance below zero is refused (row FO-7a). Two transactions withdrawing at once: the second waits for
-- the first, then sees its entry. At REPEATABLE READ or SERIALIZABLE a stale read would compute a seq already taken:
-- the unique index (firm, party, currency, seq) refuses it (23505), so the balance never forks.
-- A deposit names a payment received into trust, of the same amount and currency (its trust request, if any, and its
-- invoice under "Trust first", if any, of the same party), and only with trust on; a withdrawal names an issued
-- invoice of the same party and currency (s. 32(f)) and never pays more than is open on it after credit notes and the
-- write-off (review round 1, m4; break B-5); a correction names, if any, an entry of the same party and currency.
CREATE FUNCTION money_trust_entry_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d record; last_seq integer; last_balance bigint; party uuid := coalesce(NEW.person_id, NEW.company_id); bal bigint; applied bigint; open_amount bigint;
BEGIN
  IF NEW.kind = 'DEPOSIT' THEN
    PERFORM money_trust_on(NEW.firm_id, 'money_trust_entry');
  END IF;
  -- A missing id is the checks' to refuse (money_trust_entry_deposit_payment, _withdrawal_invoice).
  IF NEW.kind = 'DEPOSIT' AND NEW.payment_id IS NOT NULL THEN
    SELECT p.amount_minor, p.currency, p.received_into, p.trust_request_id, p.invoice_id, i.person_id AS inv_person, i.company_id AS inv_company INTO d
      FROM "money_payment" p LEFT JOIN "money_invoice" i ON i.firm_id = p.firm_id AND i.id = p.invoice_id WHERE p.firm_id = NEW.firm_id AND p.id = NEW.payment_id;
    IF NOT FOUND THEN PERFORM money_missing('money_trust_entry', 'payment', NEW.payment_id); END IF;
    IF d.received_into <> 'TRUST' THEN
      RAISE EXCEPTION 'money_trust_entry: a deposit comes from a payment received into trust (this one went to %)', d.received_into USING ERRCODE = 'check_violation';
    END IF;
    IF (d.amount_minor, d.currency) IS DISTINCT FROM (NEW.amount_minor, NEW.currency) THEN
      RAISE EXCEPTION 'money_trust_entry: a deposit is its payment''s amount and currency (% %)', d.amount_minor, d.currency USING ERRCODE = 'check_violation';
    END IF;
    -- "Trust first" (AG-6-69 rule 5): money paid on an invoice into trust is held for that invoice's party (review round 1, m2).
    IF d.invoice_id IS NOT NULL AND (d.inv_person, d.inv_company) IS DISTINCT FROM (NEW.person_id, NEW.company_id) THEN
      RAISE EXCEPTION 'money_trust_entry: a deposit paid on an invoice is held for that invoice''s party' USING ERRCODE = 'check_violation';
    END IF;
    IF d.trust_request_id IS NOT NULL AND NEW.trust_request_id IS DISTINCT FROM d.trust_request_id THEN
      IF NEW.trust_request_id IS NOT NULL THEN
        RAISE EXCEPTION 'money_trust_entry: a deposit names its payment''s trust request' USING ERRCODE = 'check_violation';
      END IF;
      NEW.trust_request_id := d.trust_request_id;
    END IF;
  END IF;
  IF NEW.trust_request_id IS NOT NULL THEN
    SELECT r.person_id, r.company_id, r.currency INTO d FROM "money_trust_request" r WHERE r.firm_id = NEW.firm_id AND r.id = NEW.trust_request_id;
    IF NOT FOUND THEN PERFORM money_missing('money_trust_entry', 'trust request', NEW.trust_request_id); END IF;
    IF (d.person_id, d.company_id, d.currency) IS DISTINCT FROM (NEW.person_id, NEW.company_id, NEW.currency) THEN
      RAISE EXCEPTION 'money_trust_entry: an entry is on its trust request''s party and currency' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.kind = 'WITHDRAWAL_TO_INVOICE' AND NEW.invoice_id IS NOT NULL THEN
    SELECT i.issued_at, i.person_id, i.company_id, i.currency INTO d FROM "money_invoice" i WHERE i.firm_id = NEW.firm_id AND i.id = NEW.invoice_id;
    IF NOT FOUND THEN PERFORM money_missing('money_trust_entry', 'invoice', NEW.invoice_id); END IF;
    IF d.issued_at IS NULL THEN
      RAISE EXCEPTION 'money_trust_entry: trust is applied only to an issued invoice (Code s. 32(f): invoice before withdrawing)' USING ERRCODE = 'check_violation';
    END IF;
    IF (d.person_id, d.company_id, d.currency) IS DISTINCT FROM (NEW.person_id, NEW.company_id, NEW.currency) THEN
      RAISE EXCEPTION 'money_trust_entry: trust pays only an invoice of the same party and currency' USING ERRCODE = 'check_violation';
    END IF;
    -- Touches the invoice row, so it goes one at a time with the invoice's credit notes and write-off (see
    -- money_issued_invoice); returns what is open after them.
    open_amount := money_issued_invoice(NEW.firm_id, NEW.invoice_id, NEW.currency, 'money_trust_entry');
  END IF;
  IF NEW.corrects_entry_id IS NOT NULL THEN
    SELECT e.person_id, e.company_id, e.currency INTO d FROM "money_trust_entry" e WHERE e.firm_id = NEW.firm_id AND e.id = NEW.corrects_entry_id;
    IF NOT FOUND THEN PERFORM money_missing('money_trust_entry', 'entry', NEW.corrects_entry_id); END IF;
    IF (d.person_id, d.company_id, d.currency) IS DISTINCT FROM (NEW.person_id, NEW.company_id, NEW.currency) THEN
      RAISE EXCEPTION 'money_trust_entry: a correction is on the same party and currency as the entry it corrects' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('money_trust:' || NEW.firm_id || ':' || party || ':' || NEW.currency, 0));
  IF NEW.kind = 'WITHDRAWAL_TO_INVOICE' AND NEW.invoice_id IS NOT NULL THEN
    SELECT coalesce(-sum(e.amount_minor), 0) INTO applied FROM "money_trust_entry" e WHERE e.firm_id = NEW.firm_id AND e.invoice_id = NEW.invoice_id;
    IF applied - NEW.amount_minor > open_amount THEN
      RAISE EXCEPTION 'money_trust_entry: % from trust would pay more than is open on the invoice (% open after credit notes and write-off, % already paid from trust)', -NEW.amount_minor, open_amount, applied USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.person_id IS NOT NULL THEN
    SELECT e.seq, e.balance_after_minor INTO last_seq, last_balance FROM "money_trust_entry" e
      WHERE e.firm_id = NEW.firm_id AND e.person_id = NEW.person_id AND e.currency = NEW.currency ORDER BY e.seq DESC LIMIT 1;
  ELSE
    SELECT e.seq, e.balance_after_minor INTO last_seq, last_balance FROM "money_trust_entry" e
      WHERE e.firm_id = NEW.firm_id AND e.company_id = NEW.company_id AND e.currency = NEW.currency ORDER BY e.seq DESC LIMIT 1;
  END IF;
  bal := coalesce(last_balance, 0) + NEW.amount_minor;
  IF bal < 0 THEN
    RAISE EXCEPTION 'money_trust_entry: the trust balance would go below zero (held % %, entry %)', coalesce(last_balance, 0), NEW.currency, NEW.amount_minor USING ERRCODE = 'check_violation';
  END IF;
  NEW.seq := coalesce(last_seq, 0) + 1;
  NEW.balance_after_minor := bal;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_trust_entry_write BEFORE INSERT ON "money_trust_entry" FOR EACH ROW EXECUTE FUNCTION money_trust_entry_write();

-- ---------------------------------------------------------------------------------------------------- the "To move" list
-- An undo batch undoes a batch that is not itself an undo, in the same currency; one undo per batch (unique index).
-- An undo batch undoes a batch that is not itself an undo, in the same currency; one undo per batch (unique index).
CREATE FUNCTION money_move_batch_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record;
BEGIN
  IF NEW.undoes_batch_id IS NOT NULL THEN
    SELECT x.undoes_batch_id, x.currency INTO b FROM "money_move_batch" x WHERE x.firm_id = NEW.firm_id AND x.id = NEW.undoes_batch_id;
    IF NOT FOUND THEN PERFORM money_missing('money_move_batch', 'batch', NEW.undoes_batch_id); END IF;
    IF b.undoes_batch_id IS NOT NULL THEN
      RAISE EXCEPTION 'money_move_batch: an undo is never undone (record the moves again instead)' USING ERRCODE = 'check_violation';
    END IF;
    IF b.currency <> NEW.currency THEN
      RAISE EXCEPTION 'money_move_batch: an undo is in the currency of the batch it undoes (%)', b.currency USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  NEW.recorded_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_move_batch_write BEFORE INSERT ON "money_move_batch" FOR EACH ROW EXECUTE FUNCTION money_move_batch_write();

-- A line goes into a batch written in this same transaction (one click, "I moved these"): a recorded batch never gains
-- lines later, and an undone one never (review round 1, m5; break B-7). It is in the batch's currency and matches its
-- source: a trust application moves up to its withdrawal (less what was returned before moving), trust to operating;
-- a wrong-account amount goes back towards the account it belonged in, at most the payment; a card fee on the trust
-- account is covered from operating, for a card payment received into trust, at most the payment (none can exist
-- while card into trust waits). A source (and kind) is in at most one batch that has not been undone: the lock
-- serialises two writers of the same source, every earlier line of it must be in an undone batch, and move_ordinal
-- (the count of its earlier lines + 1) is unique per source and kind, so even a stale read at REPEATABLE READ is
-- refused (23505) rather than moved twice. The lookups go by the source's own column (its unique index).
CREATE FUNCTION money_move_line_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE b record; s record; src uuid := coalesce(NEW.source_trust_entry_id, NEW.source_payment_id); earlier integer; live uuid;
BEGIN
  SELECT x.undoes_batch_id, x.currency, x.xmin::text = (pg_current_xact_id()::xid)::text AS mine INTO b FROM "money_move_batch" x WHERE x.firm_id = NEW.firm_id AND x.id = NEW.batch_id;
  IF NOT FOUND THEN PERFORM money_missing('money_move_line', 'batch', NEW.batch_id); END IF;
  IF b.undoes_batch_id IS NOT NULL THEN
    RAISE EXCEPTION 'money_move_line: an undo batch carries no lines (the undone batch''s lines go back to the list)' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT b.mine THEN
    RAISE EXCEPTION 'money_move_line: a batch takes its lines in the transaction that records it; a recorded batch is never added to' USING ERRCODE = 'check_violation';
  END IF;
  IF b.currency <> NEW.currency THEN
    RAISE EXCEPTION 'money_move_line: a line is in its batch''s currency (%), not %', b.currency, NEW.currency USING ERRCODE = 'check_violation';
  END IF;
  IF num_nonnulls(NEW.source_trust_entry_id, NEW.source_payment_id) <> 1 OR (NEW.kind = 'TRUST_APPLIED') <> (NEW.source_trust_entry_id IS NOT NULL) THEN
    RETURN NEW;  -- money_move_line_source_check refuses it
  END IF;
  IF NEW.kind = 'TRUST_APPLIED' THEN
    SELECT e.kind, e.amount_minor, e.currency INTO s FROM "money_trust_entry" e WHERE e.firm_id = NEW.firm_id AND e.id = NEW.source_trust_entry_id;
    IF NOT FOUND THEN PERFORM money_missing('money_move_line', 'trust entry', NEW.source_trust_entry_id); END IF;
    IF s.kind <> 'WITHDRAWAL_TO_INVOICE' OR NEW.direction <> 'TRUST_TO_OPERATING' OR NEW.amount_minor > -s.amount_minor OR NEW.currency <> s.currency THEN
      RAISE EXCEPTION 'money_move_line: a trust application moves at most its withdrawal (% %) from trust to operating', -s.amount_minor, s.currency USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    SELECT p.amount_minor, p.currency, p.received_into, p.method INTO s FROM "money_payment" p WHERE p.firm_id = NEW.firm_id AND p.id = NEW.source_payment_id;
    IF NOT FOUND THEN PERFORM money_missing('money_move_line', 'payment', NEW.source_payment_id); END IF;
    IF NEW.amount_minor > s.amount_minor OR NEW.currency <> s.currency THEN
      RAISE EXCEPTION 'money_move_line: at most the payment''s amount (% %)', s.amount_minor, s.currency USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.kind = 'WRONG_ACCOUNT' AND ((s.received_into = 'OPERATING') <> (NEW.direction = 'OPERATING_TO_TRUST')) THEN
      RAISE EXCEPTION 'money_move_line: money received into % moves out of it', s.received_into USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.kind = 'CARD_FEE_ON_TRUST' AND (s.method <> 'CARD' OR s.received_into <> 'TRUST' OR NEW.direction <> 'OPERATING_TO_TRUST') THEN
      RAISE EXCEPTION 'money_move_line: a card fee on the trust account is for a card payment into trust, covered from operating into trust' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('money_move:' || NEW.firm_id || ':' || src || ':' || NEW.kind, 0));
  IF NEW.source_trust_entry_id IS NOT NULL THEN
    SELECT l.batch_id INTO live FROM "money_move_line" l
      WHERE l.firm_id = NEW.firm_id AND l.source_trust_entry_id = NEW.source_trust_entry_id AND l.kind = NEW.kind
        AND NOT EXISTS (SELECT 1 FROM "money_move_batch" u WHERE u.firm_id = l.firm_id AND u.undoes_batch_id = l.batch_id) LIMIT 1;
    SELECT count(*) INTO earlier FROM "money_move_line" l WHERE l.firm_id = NEW.firm_id AND l.source_trust_entry_id = NEW.source_trust_entry_id AND l.kind = NEW.kind;
  ELSE
    SELECT l.batch_id INTO live FROM "money_move_line" l
      WHERE l.firm_id = NEW.firm_id AND l.source_payment_id = NEW.source_payment_id AND l.kind = NEW.kind
        AND NOT EXISTS (SELECT 1 FROM "money_move_batch" u WHERE u.firm_id = l.firm_id AND u.undoes_batch_id = l.batch_id) LIMIT 1;
    SELECT count(*) INTO earlier FROM "money_move_line" l WHERE l.firm_id = NEW.firm_id AND l.source_payment_id = NEW.source_payment_id AND l.kind = NEW.kind;
  END IF;
  IF live IS NOT NULL THEN
    RAISE EXCEPTION 'money_move_line: already moved in batch % (undo that batch first)', live USING ERRCODE = 'unique_violation';
  END IF;
  NEW.move_ordinal := earlier + 1;
  NEW.created_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER money_move_line_write BEFORE INSERT ON "money_move_line" FOR EACH ROW EXECUTE FUNCTION money_move_line_write();
