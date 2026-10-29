-- W1-10 slice 1 filing channels (forms lane; P-140, P-143, P-144, P-171; plan-slice1-channels.md §2, §8a).
-- 1. Four channels and a signature value per line. "Signed PDF upload" becomes PDF upload + signed by hand and scanned,
--    on every version (its meaning does not change, only its spelling). Released snapshots are never rewritten: the
--    engine reads the old spelling (engine/channels.ts lineOf) and the fingerprint keeps it (C-8).
CREATE TYPE "SignatureKind" AS ENUM ('TYPED_NAME', 'HAND_SCANNED', 'PEN', 'NONE');
ALTER TABLE "combination_form" ADD COLUMN "signature" "SignatureKind" NOT NULL DEFAULT 'NONE';
ALTER TYPE "FilingChannel" RENAME TO "FilingChannel_old";
CREATE TYPE "FilingChannel" AS ENUM ('PDF_UPLOAD', 'ONLINE', 'PAPER', 'NOT_NEEDED');
ALTER TABLE "combination_form" ALTER COLUMN "channel" DROP DEFAULT;
UPDATE "combination_form" SET "signature" = 'HAND_SCANNED' WHERE "channel"::text = 'SIGNED_PDF_UPLOAD';
ALTER TABLE "combination_form" ALTER COLUMN "channel" TYPE "FilingChannel"
  USING (CASE WHEN "channel"::text = 'SIGNED_PDF_UPLOAD' THEN 'PDF_UPLOAD' ELSE "channel"::text END)::"FilingChannel";
ALTER TABLE "combination_form" ALTER COLUMN "channel" SET DEFAULT 'PDF_UPLOAD';
DROP TYPE "FilingChannel_old";

-- 2. What IRCC accepts, per form edition and per IRCC account (C-3). Each existing record becomes one row for every
--    account (ANY): PDF → {PDF_UPLOAD}, ONLINE → {ONLINE}, PDF_OR_ONLINE → {PDF_UPLOAD, ONLINE}; READ_BY_AI is not a record.
CREATE TABLE "form_edition_accept" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "form_edition_id" UUID NOT NULL,
  "account" TEXT NOT NULL,
  "channels" "FilingChannel"[] NOT NULL,
  "basis" TEXT NOT NULL,
  "quote" TEXT,
  "source_url" TEXT,
  "read_on" DATE,
  "set_by" TEXT NOT NULL,
  "set_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "form_edition_accept_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "form_edition_accept_form_edition_id_fkey" FOREIGN KEY ("form_edition_id") REFERENCES "form_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "form_edition_accept_form_edition_id_account_key" ON "form_edition_accept" ("form_edition_id", "account");
CREATE INDEX "form_edition_accept_workspace_id_idx" ON "form_edition_accept" ("workspace_id");
INSERT INTO "form_edition_accept" ("workspace_id", "form_edition_id", "account", "channels", "basis", "quote", "source_url", "set_by")
SELECT "workspace_id", "id", 'ANY',
  CASE "accepted_channels" WHEN 'PDF' THEN ARRAY['PDF_UPLOAD']::"FilingChannel"[] WHEN 'ONLINE' THEN ARRAY['ONLINE']::"FilingChannel"[] ELSE ARRAY['PDF_UPLOAD', 'ONLINE']::"FilingChannel"[] END,
  CASE WHEN "accepted_basis" IN ('PERSON_SAMPLE', 'EXPERT', 'SAMPLE_FIXTURE') THEN "accepted_basis" ELSE 'AI_SAMPLE' END, "accepted_quote", "form_page_url", 'migration'
FROM "form_edition" WHERE "accepted_channels" IN ('PDF', 'ONLINE', 'PDF_OR_ONLINE');
ALTER TABLE "form_edition" DROP COLUMN "accepted_channels", DROP COLUMN "accepted_basis", DROP COLUMN "accepted_quote";

-- 2b. Plan §8 Q1: a combination's IRCC account (contracts/forms.ts IRCC_ACCOUNTS). The parked extension's portal keys
--     (P-102) take their account's name; the check follows the new list. Portal captures keep their own keys (parked).
ALTER TABLE "combination" DROP CONSTRAINT "combination_portal_check";
UPDATE "combination" SET "portal_key" = CASE "portal_key" WHEN 'ircc_portal' THEN 'IRCC_PORTAL' WHEN 'apr_portal' THEN 'APR_PORTAL' WHEN 'rep_pr_portal' THEN 'PR_PORTAL' WHEN 'lmia_online' THEN 'LMIA_ONLINE' ELSE "portal_key" END WHERE "portal_key" IS NOT NULL;
ALTER TABLE "combination" ADD CONSTRAINT "combination_portal_check" CHECK ("portal_key" IS NULL OR "portal_key" IN ('IRCC_SECURE_ACCOUNT', 'PR_PORTAL', 'IRCC_PORTAL', 'APR_PORTAL', 'LMIA_ONLINE', 'PAPER'));
ALTER TABLE "form_edition_accept" ADD CONSTRAINT "form_edition_accept_account_check" CHECK ("account" IN ('ANY', 'IRCC_SECURE_ACCOUNT', 'PR_PORTAL', 'IRCC_PORTAL', 'APR_PORTAL', 'LMIA_ONLINE', 'PAPER'));
ALTER TABLE "form_edition_accept" ADD CONSTRAINT "form_edition_accept_basis_check" CHECK ("basis" IN ('AI_SAMPLE', 'PERSON_SAMPLE', 'SAMPLE_FIXTURE', 'FOUNDER_SAMPLE', 'EXPERT'));
-- C-4: Not needed only for a named account, and alone.
ALTER TABLE "form_edition_accept" ADD CONSTRAINT "form_edition_accept_not_needed_check" CHECK (NOT ('NOT_NEEDED' = ANY ("channels")) OR ("account" <> 'ANY' AND cardinality("channels") = 1));

-- 3. Pending changes to what IRCC accepts take the new payload, for every account; applied ones stay as history.
UPDATE "library_change" SET "matches" = jsonb_set(jsonb_set(jsonb_set("matches"::jsonb, '{account}', '"ANY"'),
    '{channels}', CASE "matches"->>'channels' WHEN 'PDF' THEN '["PDF_UPLOAD"]' WHEN 'ONLINE' THEN '["ONLINE"]' ELSE '["PDF_UPLOAD","ONLINE"]' END::jsonb),
    '{before}', CASE "matches"->>'before' WHEN 'PDF' THEN '["PDF_UPLOAD"]' WHEN 'ONLINE' THEN '["ONLINE"]' WHEN 'PDF_OR_ONLINE' THEN '["PDF_UPLOAD","ONLINE"]' ELSE 'null' END::jsonb)
WHERE "kind" = 'form_accepts' AND "status" IN ('WAITING', 'RETURNED', 'APPROVED') AND jsonb_typeof("matches"::jsonb->'channels') = 'string';

-- 4. C-9/C-10: the validated copy read back into the case (insert-only history).
CREATE TABLE "validated_copy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "form_instance_id" UUID NOT NULL,
  "path" TEXT NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "facts_hash" VARCHAR(64) NOT NULL,
  "read_back" JSONB NOT NULL,
  "read_by" TEXT NOT NULL,
  "read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "validated_copy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "validated_copy_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "validated_copy_form_instance_id_read_at_idx" ON "validated_copy" ("form_instance_id", "read_at");
-- Rollback (STANDARDS §5): restore the dump taken before deploy. The old spelling cannot come back without data loss
-- review: a PAPER or NOT_NEEDED line has no old value, and per-account records collapse to one per edition.
