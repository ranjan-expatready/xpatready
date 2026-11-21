-- FO-6 part 1 (BACKLOG row FO-6 and its brief (Lead B); contracts platform-and-front-office-contracts-2026-11-14.md §0,
-- §2.4, §7 binding; P-563, P-564, P-600; AG-5-20, -21, -25, -26, -28, -31, -37, -41, -62, -68; schema file
-- prisma/schema/front-office-signing.prisma, owner Lead B (front office)). New tables only; no existing table, column or
-- row changes (the two platform.prisma lines are back-relations under the "signing (FO-6)" slot: no SQL). Rows carry no
-- workspace_id: the demo reset leaves them. Legal reading (e-signature identity, D-6): Unconfirmed: no counsel.
--   * the tables: fo_signature_request, fo_signer, fo_signing_evidence, fo_signing_hook_receipt (firm_id first in every
--     index; RESTRICT foreign keys to platform_firm, platform_staff (firm_id, id) and this file's own request).
--     document_id / document_version_id name FO-5's fo_retainer / fo_retainer_version and person_id FO-1a's fo_person:
--     uuids with no foreign key (FO-6d's OTHER kind will name other documents; the API checks them).
--   * rules Prisma cannot say, at the end (P-600 (3): every function and trigger is named fo_signing_*): status moves
--     (SENT → VIEWED → CLIENT_SIGNED → SIGNED; DECLINED, CANCELLED from any live state; EXPIRED only before any client
--     signed); final states never change; one live request per document; a version sent once (unique key); a client
--     signer is a person in order 1, the firm signer the one staff member in order 2; no signature without consent; the
--     firm signs only after every client; SIGNED only with its evidence; moments written once; sha256 and key shapes;
--     a receipt names its request's own provider document; nothing is deleted or truncated.
-- Rollback (in this order): DROP POLICY "pf12_firm" and TRIGGER "0_pf12_firm_first" on the four tables; DROP TABLE "fo_signing_hook_receipt", "fo_signing_evidence", "fo_signer",
--   "fo_signature_request"; DROP FUNCTION fo_signing_request_write(), fo_signing_signer_write(), fo_signing_evidence_write(),
--   fo_signing_receipt_write(), fo_signing_no_delete(), fo_signing_sha_ok(text), fo_signing_ref_ok(text, integer),
--   fo_signing_key_ok(text); DROP TYPE "FoSignerRole", "FoSigningCancelReason", "FoSignatureRequestStatus",
--   "FoSigningProvider", "FoSigningDocumentKind"; delete this folder's row from _prisma_migrations.

-- CreateEnum
CREATE TYPE "FoSigningDocumentKind" AS ENUM ('RETAINER', 'CONSULTATION');
-- CreateEnum
CREATE TYPE "FoSigningProvider" AS ENUM ('FAKE', 'BOLDSIGN');
-- CreateEnum
CREATE TYPE "FoSignatureRequestStatus" AS ENUM ('SENT', 'VIEWED', 'CLIENT_SIGNED', 'SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED');
-- CreateEnum
CREATE TYPE "FoSigningCancelReason" AS ENUM ('UPDATED', 'WITHDRAWN', 'SIGNED_OFFLINE');
-- CreateEnum
CREATE TYPE "FoSignerRole" AS ENUM ('CLIENT', 'FIRM');
-- CreateTable
CREATE TABLE "fo_signature_request" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "document_kind" "FoSigningDocumentKind" NOT NULL,
    "document_id" UUID NOT NULL,
    "document_version_id" UUID NOT NULL,
    "document_version" INTEGER NOT NULL,
    "provider" "FoSigningProvider" NOT NULL,
    "provider_document_id" TEXT NOT NULL,
    "status" "FoSignatureRequestStatus" NOT NULL DEFAULT 'SENT',
    "sent_by" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "cancel_reason" "FoSigningCancelReason",
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_signature_request_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fo_signer" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "role" "FoSignerRole" NOT NULL,
    "sign_order" INTEGER NOT NULL,
    "person_id" UUID,
    "staff_id" UUID,
    "link_token_sha256" TEXT NOT NULL,
    "viewed_at" TIMESTAMPTZ,
    "code_sha256" TEXT,
    "code_expires_at" TIMESTAMPTZ,
    "code_failures" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "code_verified_at" TIMESTAMPTZ,
    "consent_text_version" TEXT,
    "consented_at" TIMESTAMPTZ,
    "signed_at" TIMESTAMPTZ,
    "declined_at" TIMESTAMPTZ,

    CONSTRAINT "fo_signer_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fo_signing_evidence" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "sealed_file_key" TEXT NOT NULL,
    "sealed_sha256" TEXT NOT NULL,
    "audit_file_key" TEXT NOT NULL,
    "audit_sha256" TEXT NOT NULL,
    "consent_text_version" TEXT NOT NULL,
    "stored_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_signing_evidence_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "fo_signing_hook_receipt" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "provider" "FoSigningProvider" NOT NULL,
    "provider_document_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_signing_hook_receipt_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "fo_signature_request_firm_id_document_kind_document_id_idx" ON "fo_signature_request"("firm_id", "document_kind", "document_id");
-- CreateIndex
CREATE INDEX "fo_signature_request_firm_id_status_expires_at_idx" ON "fo_signature_request"("firm_id", "status", "expires_at");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signature_request_firm_id_document_kind_document_version_key" ON "fo_signature_request"("firm_id", "document_kind", "document_version_id");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signature_request_provider_provider_document_id_key" ON "fo_signature_request"("provider", "provider_document_id");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signature_request_firm_id_id_key" ON "fo_signature_request"("firm_id", "id");
-- CreateIndex
CREATE INDEX "fo_signer_firm_id_request_id_idx" ON "fo_signer"("firm_id", "request_id");
-- CreateIndex
CREATE INDEX "fo_signer_firm_id_person_id_idx" ON "fo_signer"("firm_id", "person_id");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signer_firm_id_link_token_sha256_key" ON "fo_signer"("firm_id", "link_token_sha256");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signing_evidence_firm_id_request_id_key" ON "fo_signing_evidence"("firm_id", "request_id");
-- CreateIndex
CREATE INDEX "fo_signing_hook_receipt_firm_id_request_id_idx" ON "fo_signing_hook_receipt"("firm_id", "request_id");
-- CreateIndex
CREATE UNIQUE INDEX "fo_signing_hook_receipt_firm_id_provider_provider_document__key" ON "fo_signing_hook_receipt"("firm_id", "provider", "provider_document_id", "event_id");
-- AddForeignKey
ALTER TABLE "fo_signature_request" ADD CONSTRAINT "fo_signature_request_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- AddForeignKey
ALTER TABLE "fo_signature_request" ADD CONSTRAINT "fo_signature_request_firm_id_sent_by_fkey" FOREIGN KEY ("firm_id", "sent_by") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- AddForeignKey
ALTER TABLE "fo_signer" ADD CONSTRAINT "fo_signer_firm_id_request_id_fkey" FOREIGN KEY ("firm_id", "request_id") REFERENCES "fo_signature_request"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- AddForeignKey
ALTER TABLE "fo_signer" ADD CONSTRAINT "fo_signer_firm_id_staff_id_fkey" FOREIGN KEY ("firm_id", "staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- AddForeignKey
ALTER TABLE "fo_signing_evidence" ADD CONSTRAINT "fo_signing_evidence_firm_id_request_id_fkey" FOREIGN KEY ("firm_id", "request_id") REFERENCES "fo_signature_request"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- AddForeignKey
ALTER TABLE "fo_signing_hook_receipt" ADD CONSTRAINT "fo_signing_hook_receipt_firm_id_request_id_fkey" FOREIGN KEY ("firm_id", "request_id") REFERENCES "fo_signature_request"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ------------------------------------------------------------------------------------------------ rules Prisma cannot say
-- Every function fixes its search_path, so a writer's own function of the same name elsewhere never stands in for these.
CREATE FUNCTION fo_signing_sha_ok(t text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS
  $$ SELECT t IS NOT NULL AND t ~ '^[0-9a-f]{64}$' $$;
-- A provider's id, an event id or a text version: 1 to n letters, digits and . _ : - (no space, no control, no slash).
CREATE FUNCTION fo_signing_ref_ok(t text, n integer) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS
  $$ SELECT t IS NOT NULL AND char_length(t) BETWEEN 1 AND n AND t ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$' $$;
-- A FilesPort key under signing/ (ports/files.ts FileKey): lower-case segments, no . or .. segment.
CREATE FUNCTION fo_signing_key_ok(k text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS
  $$ SELECT k IS NOT NULL AND char_length(k) <= 300 AND k ~ '^signing/[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$'
       AND NOT (k ~ '(^|/)\.\.?(/|$)') $$;

ALTER TABLE "fo_signature_request"
  ADD CONSTRAINT "fo_signature_request_version_check" CHECK ("document_version" BETWEEN 1 AND 100000),
  ADD CONSTRAINT "fo_signature_request_provider_document_id_check" CHECK (fo_signing_ref_ok("provider_document_id", 200)),
  ADD CONSTRAINT "fo_signature_request_times_check" CHECK (isfinite("sent_at") AND isfinite("expires_at") AND "expires_at" > "sent_at"
    AND ("ended_at" IS NULL OR (isfinite("ended_at") AND "ended_at" >= "sent_at"))),
  -- Ended exactly when final; a cancel reason exactly when CANCELLED (IS NOT DISTINCT FROM: a NULL check passes).
  ADD CONSTRAINT "fo_signature_request_ended_check" CHECK (("ended_at" IS NOT NULL) = ("status" IN ('SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED'))),
  ADD CONSTRAINT "fo_signature_request_cancel_reason_check" CHECK (("cancel_reason" IS NOT NULL) = ("status" IS NOT DISTINCT FROM 'CANCELLED')),
  -- Expired only once its time has come (review m5).
  ADD CONSTRAINT "fo_signature_request_expired_check" CHECK ("status" IS DISTINCT FROM 'EXPIRED' OR "ended_at" >= "expires_at");

-- One live request per document (AG-5-65 r2-r4: Send updated version leaves exactly one).
CREATE UNIQUE INDEX "fo_signature_request_one_live" ON "fo_signature_request" ("firm_id", "document_kind", "document_id")
  WHERE "status" IN ('SENT', 'VIEWED', 'CLIENT_SIGNED');

ALTER TABLE "fo_signer"
  -- A client is a person in order 1 (clients sign in any order); the firm signer is a staff member in order 2.
  ADD CONSTRAINT "fo_signer_party_check" CHECK (
    ("role" = 'CLIENT' AND "person_id" IS NOT NULL AND "staff_id" IS NULL AND "sign_order" = 1)
    OR ("role" = 'FIRM' AND "staff_id" IS NOT NULL AND "person_id" IS NULL AND "sign_order" = 2)),
  ADD CONSTRAINT "fo_signer_link_check" CHECK (fo_signing_sha_ok("link_token_sha256")),
  ADD CONSTRAINT "fo_signer_code_check" CHECK (
    (("code_sha256" IS NULL) = ("code_expires_at" IS NULL)) AND ("code_sha256" IS NULL OR fo_signing_sha_ok("code_sha256"))
    AND "code_failures" BETWEEN 0 AND 6 AND ("code_failures" < 6 OR "locked_until" IS NOT NULL) AND ("code_expires_at" IS NULL OR isfinite("code_expires_at"))
    AND ("locked_until" IS NULL OR isfinite("locked_until")) AND ("code_verified_at" IS NULL OR isfinite("code_verified_at"))),
  ADD CONSTRAINT "fo_signer_consent_check" CHECK (
    ("consented_at" IS NULL AND "consent_text_version" IS NULL)
    OR ("consented_at" IS NOT NULL AND isfinite("consented_at") AND fo_signing_ref_ok("consent_text_version", 40))),
  -- No signature without consent (AG-5-25); signed or declined, never both.
  ADD CONSTRAINT "fo_signer_signed_check" CHECK (
    ("signed_at" IS NULL OR ("consented_at" IS NOT NULL AND isfinite("signed_at") AND "signed_at" >= "consented_at"))
    AND NOT ("signed_at" IS NOT NULL AND "declined_at" IS NOT NULL) AND ("declined_at" IS NULL OR isfinite("declined_at"))
    AND ("viewed_at" IS NULL OR isfinite("viewed_at")));

-- One firm signer per request; a person signs a request once.
CREATE UNIQUE INDEX "fo_signer_one_firm_signer" ON "fo_signer" ("firm_id", "request_id") WHERE "role" = 'FIRM';
CREATE UNIQUE INDEX "fo_signer_one_per_person" ON "fo_signer" ("firm_id", "request_id", "person_id") WHERE "person_id" IS NOT NULL;

ALTER TABLE "fo_signing_evidence"
  ADD CONSTRAINT "fo_signing_evidence_files_check" CHECK (
    fo_signing_key_ok("sealed_file_key") AND fo_signing_key_ok("audit_file_key") AND "sealed_file_key" <> "audit_file_key"
    AND fo_signing_sha_ok("sealed_sha256") AND fo_signing_sha_ok("audit_sha256")),
  ADD CONSTRAINT "fo_signing_evidence_consent_check" CHECK (fo_signing_ref_ok("consent_text_version", 40)),
  ADD CONSTRAINT "fo_signing_evidence_stored_at_check" CHECK (isfinite("stored_at"));

ALTER TABLE "fo_signing_hook_receipt"
  ADD CONSTRAINT "fo_signing_hook_receipt_ids_check" CHECK (fo_signing_ref_ok("provider_document_id", 200) AND fo_signing_ref_ok("event_id", 200)
    AND "event_type" ~ '^[a-z][a-z_.]{0,59}$'),
  ADD CONSTRAINT "fo_signing_hook_receipt_received_at_check" CHECK (isfinite("received_at"));

-- Nothing here is deleted or truncated: a signing request is a record (the evidence of who agreed to what).
CREATE FUNCTION fo_signing_no_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION '%: % is refused; signing records are kept', TG_TABLE_NAME, lower(TG_OP) USING ERRCODE = 'restrict_violation';
END $$;
CREATE TRIGGER fo_signing_request_no_delete BEFORE DELETE ON "fo_signature_request" FOR EACH ROW EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_request_no_truncate BEFORE TRUNCATE ON "fo_signature_request" FOR EACH STATEMENT EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_signer_no_delete BEFORE DELETE ON "fo_signer" FOR EACH ROW EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_signer_no_truncate BEFORE TRUNCATE ON "fo_signer" FOR EACH STATEMENT EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_evidence_no_delete BEFORE DELETE ON "fo_signing_evidence" FOR EACH ROW EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_evidence_no_truncate BEFORE TRUNCATE ON "fo_signing_evidence" FOR EACH STATEMENT EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_receipt_no_delete BEFORE DELETE ON "fo_signing_hook_receipt" FOR EACH ROW EXECUTE FUNCTION fo_signing_no_delete();
CREATE TRIGGER fo_signing_receipt_no_truncate BEFORE TRUNCATE ON "fo_signing_hook_receipt" FOR EACH STATEMENT EXECUTE FUNCTION fo_signing_no_delete();

-- A request: born SENT; its identity, document, provider, sender and expiry never change; status moves only forward
-- along the signing path; CLIENT_SIGNED once every client signed, SIGNED once every signer signed and the evidence is
-- stored, EXPIRED only while no client signed (BR-16); a final request never changes again. The end time is the
-- caller's (the injected clock), else the database's. Lock order for writers (review m10): the request row first, then
-- its signers (the signer trigger locks the request too), so two writers never wait on each other in a circle.
CREATE FUNCTION fo_signing_request_write() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE live constant text[] := ARRAY['SENT', 'VIEWED', 'CLIENT_SIGNED'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'SENT' OR NEW."ended_at" IS NOT NULL OR NEW."cancel_reason" IS NOT NULL THEN
      RAISE EXCEPTION 'fo_signature_request: a request starts SENT' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW."id", NEW."firm_id", NEW."document_kind", NEW."document_id", NEW."document_version_id", NEW."document_version", NEW."provider",
      NEW."provider_document_id", NEW."sent_by", NEW."sent_at", NEW."expires_at")
     IS DISTINCT FROM (OLD."id", OLD."firm_id", OLD."document_kind", OLD."document_id", OLD."document_version_id", OLD."document_version", OLD."provider",
      OLD."provider_document_id", OLD."sent_by", OLD."sent_at", OLD."expires_at") THEN
    RAISE EXCEPTION 'fo_signature_request: only the status and its end change' USING ERRCODE = 'restrict_violation';
  END IF;
  IF NOT (OLD."status"::text = ANY (live)) THEN
    RAISE EXCEPTION 'fo_signature_request: a % request is final', OLD."status" USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."status" = OLD."status" THEN
    IF NEW."ended_at" IS DISTINCT FROM OLD."ended_at" OR NEW."cancel_reason" IS DISTINCT FROM OLD."cancel_reason" THEN
      RAISE EXCEPTION 'fo_signature_request: a live request has no end' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  -- Once the evidence is stored only SIGNED may follow (review M3: a fully signed request is never cancelled or declined).
  IF EXISTS (SELECT 1 FROM "fo_signing_evidence" e WHERE e."firm_id" = NEW."firm_id" AND e."request_id" = NEW."id") AND NEW."status" <> 'SIGNED' THEN
    RAISE EXCEPTION 'fo_signature_request: the evidence is stored; only SIGNED follows' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT ((OLD."status" = 'SENT' AND NEW."status" IN ('VIEWED', 'CLIENT_SIGNED', 'EXPIRED'))
       OR (OLD."status" = 'VIEWED' AND NEW."status" IN ('CLIENT_SIGNED', 'EXPIRED'))
       OR (OLD."status" = 'CLIENT_SIGNED' AND NEW."status" = 'SIGNED')
       OR NEW."status" IN ('DECLINED', 'CANCELLED')) THEN
    RAISE EXCEPTION 'fo_signature_request: % → % is not a signing move', OLD."status", NEW."status" USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."status" IN ('CLIENT_SIGNED', 'SIGNED') AND (EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id"
      AND s."request_id" = NEW."id" AND s."role" = 'CLIENT' AND s."signed_at" IS NULL)
      OR NOT EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."id" AND s."role" = 'CLIENT')) THEN
    RAISE EXCEPTION 'fo_signature_request: % needs every client''s signature', NEW."status" USING ERRCODE = 'check_violation';
  END IF;
  -- SIGNED: every signer signed, the one firm signer among them (review M1: an empty set of signers proves nothing).
  IF NEW."status" = 'SIGNED' AND (EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."id" AND s."signed_at" IS NULL)
      OR NOT EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."id" AND s."role" = 'FIRM' AND s."signed_at" IS NOT NULL)
      OR NOT EXISTS (SELECT 1 FROM "fo_signing_evidence" e WHERE e."firm_id" = NEW."firm_id" AND e."request_id" = NEW."id")) THEN
    RAISE EXCEPTION 'fo_signature_request: SIGNED needs every signature and the stored evidence' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."status" = 'EXPIRED' AND EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."id"
      AND s."role" = 'CLIENT' AND s."signed_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'fo_signature_request: a request a client signed never expires' USING ERRCODE = 'check_violation';
  END IF;
  -- DECLINED is a signer's answer (review m8): a firm that stops a request withdraws it (CANCELLED).
  IF NEW."status" = 'DECLINED' AND NOT EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."id" AND s."declined_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'fo_signature_request: DECLINED needs a signer who declined' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."status" IN ('SIGNED', 'DECLINED', 'EXPIRED', 'CANCELLED') THEN NEW."ended_at" := coalesce(NEW."ended_at", now()); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_signing_request_write BEFORE INSERT OR UPDATE ON "fo_signature_request" FOR EACH ROW EXECUTE FUNCTION fo_signing_request_write();

-- A signer: added while its request is SENT, with no moment yet; who it is and its link never change; viewed, consented,
-- signed and declined are written once each; the email code's fields change only before signing or declining; nothing
-- changes once the request is final; the firm signs only after every client (checked here, whatever the webhook's order).
CREATE FUNCTION fo_signing_signer_write() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE st "FoSignatureRequestStatus";
BEGIN
  -- A no-op update of the request, not only a lock (Devin on #2038): a REPEATABLE READ writer whose snapshot predates
  -- this change then fails to serialise instead of acting on what it no longer sees.
  UPDATE "fo_signature_request" r SET "status" = r."status" WHERE r."firm_id" = NEW."firm_id" AND r."id" = NEW."request_id" RETURNING r."status" INTO st;
  IF TG_OP = 'INSERT' THEN
    IF st IS DISTINCT FROM 'SENT' OR NEW."viewed_at" IS NOT NULL OR NEW."consented_at" IS NOT NULL OR NEW."signed_at" IS NOT NULL
       OR NEW."declined_at" IS NOT NULL OR NEW."code_failures" <> 0 OR NEW."code_verified_at" IS NOT NULL THEN
      RAISE EXCEPTION 'fo_signer: a signer is added to a SENT request, before any step' USING ERRCODE = 'check_violation';
    END IF;
    -- Signers are added only before anyone acted (review M2: a late signer would sign after the firm).
    IF EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."request_id"
        AND (s."viewed_at" IS NOT NULL OR s."consented_at" IS NOT NULL OR s."signed_at" IS NOT NULL OR s."declined_at" IS NOT NULL OR s."code_verified_at" IS NOT NULL)) THEN
      RAISE EXCEPTION 'fo_signer: a signer is added only before anyone acted' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW."id", NEW."firm_id", NEW."request_id", NEW."role", NEW."sign_order", NEW."person_id", NEW."staff_id", NEW."link_token_sha256")
     IS DISTINCT FROM (OLD."id", OLD."firm_id", OLD."request_id", OLD."role", OLD."sign_order", OLD."person_id", OLD."staff_id", OLD."link_token_sha256") THEN
    RAISE EXCEPTION 'fo_signer: who signs and the link never change' USING ERRCODE = 'restrict_violation';
  END IF;
  IF st IS NULL OR st NOT IN ('SENT', 'VIEWED', 'CLIENT_SIGNED') THEN
    RAISE EXCEPTION 'fo_signer: the request is % and final', st USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD."signed_at" IS NOT NULL OR OLD."declined_at" IS NOT NULL THEN
    RAISE EXCEPTION 'fo_signer: a signer who signed or declined does not change' USING ERRCODE = 'restrict_violation';
  END IF;
  IF (OLD."viewed_at" IS NOT NULL AND NEW."viewed_at" IS DISTINCT FROM OLD."viewed_at")
     OR (OLD."consented_at" IS NOT NULL AND (NEW."consented_at", NEW."consent_text_version") IS DISTINCT FROM (OLD."consented_at", OLD."consent_text_version")) THEN
    RAISE EXCEPTION 'fo_signer: viewed and consent are written once' USING ERRCODE = 'restrict_violation';
  END IF;
  IF NEW."signed_at" IS NOT NULL AND NEW."role" = 'FIRM' AND EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id"
      AND s."request_id" = NEW."request_id" AND s."role" = 'CLIENT' AND s."signed_at" IS NULL) THEN
    RAISE EXCEPTION 'fo_signer: the firm signs last, after every client' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_signing_signer_write BEFORE INSERT OR UPDATE ON "fo_signer" FOR EACH ROW EXECUTE FUNCTION fo_signing_signer_write();

-- Evidence: insert-only, once every signer of a live request signed. Receipts: insert-only, naming their request's own
-- provider and provider document (a receipt can never attach one firm's event to another request).
CREATE FUNCTION fo_signing_evidence_write() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'fo_signing_evidence: evidence never changes' USING ERRCODE = 'restrict_violation'; END IF;
  -- The request row is updated first (a no-op), so a cancel waits for the evidence and then sees it (review M3), and a
  -- REPEATABLE READ cancel whose snapshot predates the evidence fails to serialise (Devin on #2038).
  UPDATE "fo_signature_request" r SET "status" = r."status" WHERE r."firm_id" = NEW."firm_id" AND r."id" = NEW."request_id";
  IF NOT EXISTS (SELECT 1 FROM "fo_signature_request" r WHERE r."firm_id" = NEW."firm_id" AND r."id" = NEW."request_id" AND r."status" = 'CLIENT_SIGNED')
     OR EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."request_id" AND s."signed_at" IS NULL)
     -- The firm signer among them (review R2-1: evidence on a clients-only request would leave it stuck, only SIGNED may follow).
     OR NOT EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."request_id" AND s."role" = 'FIRM' AND s."signed_at" IS NOT NULL) THEN
    RAISE EXCEPTION 'fo_signing_evidence: stored only when every signer of a live request signed' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM "fo_signer" s WHERE s."firm_id" = NEW."firm_id" AND s."request_id" = NEW."request_id" AND s."consent_text_version" IS DISTINCT FROM NEW."consent_text_version") THEN
    RAISE EXCEPTION 'fo_signing_evidence: the consent text version is the one every signer agreed to' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_signing_evidence_write BEFORE INSERT OR UPDATE ON "fo_signing_evidence" FOR EACH ROW EXECUTE FUNCTION fo_signing_evidence_write();

CREATE FUNCTION fo_signing_receipt_write() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'fo_signing_hook_receipt: a receipt never changes' USING ERRCODE = 'restrict_violation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "fo_signature_request" r WHERE r."firm_id" = NEW."firm_id" AND r."id" = NEW."request_id"
      AND r."provider" = NEW."provider" AND r."provider_document_id" = NEW."provider_document_id") THEN
    RAISE EXCEPTION 'fo_signing_hook_receipt: the receipt names another request''s document' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_signing_receipt_write BEFORE INSERT OR UPDATE ON "fo_signing_hook_receipt" FOR EACH ROW EXECUTE FUNCTION fo_signing_receipt_write();

-- ------------------------------------------------------------------------------------------------- PF-12's walls
-- PF-12's wall on the four tables (forced policy naming the session's firm; the firm-first gate before the area's own
-- triggers); the trigger functions run as xr_wall_reader, so each sees its request's rows whoever writes (Devin on
-- #2038; tests/check_pf12_walls.ts). The webhook door, which names no firm, finds its request through a named bypass
-- use in the API part.
ALTER TABLE "fo_signature_request" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY "pf12_firm" ON "fo_signature_request" USING ("firm_id" = platform_session_firm()) WITH CHECK ("firm_id" = platform_session_firm());
ALTER TABLE "fo_signer" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY "pf12_firm" ON "fo_signer" USING ("firm_id" = platform_session_firm()) WITH CHECK ("firm_id" = platform_session_firm());
ALTER TABLE "fo_signing_evidence" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY "pf12_firm" ON "fo_signing_evidence" USING ("firm_id" = platform_session_firm()) WITH CHECK ("firm_id" = platform_session_firm());
ALTER TABLE "fo_signing_hook_receipt" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY "pf12_firm" ON "fo_signing_hook_receipt" USING ("firm_id" = platform_session_firm()) WITH CHECK ("firm_id" = platform_session_firm());
CREATE TRIGGER "0_pf12_firm_first" BEFORE INSERT OR UPDATE ON "fo_signature_request" FOR EACH ROW EXECUTE FUNCTION platform_firm_first('firm_id');
CREATE TRIGGER "0_pf12_firm_first" BEFORE INSERT OR UPDATE ON "fo_signer" FOR EACH ROW EXECUTE FUNCTION platform_firm_first('firm_id');
CREATE TRIGGER "0_pf12_firm_first" BEFORE INSERT OR UPDATE ON "fo_signing_evidence" FOR EACH ROW EXECUTE FUNCTION platform_firm_first('firm_id');
CREATE TRIGGER "0_pf12_firm_first" BEFORE INSERT OR UPDATE ON "fo_signing_hook_receipt" FOR EACH ROW EXECUTE FUNCTION platform_firm_first('firm_id');
DO $readers$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['fo_signing_no_delete()', 'fo_signing_request_write()', 'fo_signing_signer_write()', 'fo_signing_evidence_write()', 'fo_signing_receipt_write()'] LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp', f);
    EXECUTE format('ALTER FUNCTION %s OWNER TO xr_wall_reader', f);
  END LOOP;
END
$readers$;
