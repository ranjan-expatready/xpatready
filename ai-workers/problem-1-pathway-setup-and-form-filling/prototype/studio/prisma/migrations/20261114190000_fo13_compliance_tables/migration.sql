-- FO-13 (P-579, P-584 (8), P-599, P-600; BACKLOG row FO-13 and its brief (Lead B, rows rev 16), which wins: no complaint
-- tables here, they are PF-21's; contracts platform-and-front-office-contracts-2026-11-14.md §0, §7 binding; case-side
-- contract v0.1 §3.1 PartySearchPort; schema file prisma/schema/front-office-compliance.prisma, owner Lead B (front
-- office)). New tables only; no existing table, column or row changes. Rows carry no workspace_id: the demo reset leaves
-- them. Code of Professional Conduct for College Licensees (SOR/2022-128) s. 15, 16, 24(2)(a), 24(3)(o); legal reading
-- Unconfirmed: no counsel.
--   * the tables of the row: fo_conflict_check, fo_identity_check (firm_id first in every index; RESTRICT foreign keys
--     to platform_firm and to platform_staff (firm_id, id)). person_id, company_id and prospect_id name FO-1a's tables,
--     not on main yet: uuids with no foreign key; FO-1k adds them (rows rev 16).
--   * rules Prisma cannot say, at the end (P-600: every function and trigger is named fo_compliance_*): a conflict check
--     names exactly one party of its kind and at least one searched term; its matches are a JSON array of known shape;
--     POTENTIAL_CONFLICT needs the disclosure text (s. 24(3)(o)) and only it carries a disclosure or a consent reference;
--     a check with hidden matches (hidden_count > 0, PartySearchPort) holds no result or a result other than
--     NO_CONFLICT until another active staff member of the firm confirms, as a later step (contract v0.1 §3.1); once
--     written, a conflict check only gains, once each, the confirmation (with the result it confirms, if none yet) and the
--     written-consent reference; checked_at and confirmed_at are the database's time; an identity check keeps only the last 4 characters of the document number (VARCHAR(4) and a shape
--     check: a full number never fits), never changes, and names its document fully or not at all; neither table is
--     ever deleted from or truncated.
-- Rollback (in this order): DROP TABLE "fo_identity_check", "fo_conflict_check"; DROP FUNCTION
--   fo_compliance_conflict_check_write(), fo_compliance_identity_check_insert(), fo_compliance_staff_active(uuid, uuid, text),
--   fo_compliance_refuse_change(), fo_compliance_matches_ok(jsonb), fo_compliance_distinct_details("FoIdentityDetail"[]),
--   fo_compliance_no_document_number(text), fo_compliance_long_text_ok(text, integer), fo_compliance_text_ok(text, integer);
--   DROP TYPE "FoIdentityDetail", "FoIdentityDocumentType", "FoIdentityMethod", "FoConflictPartyKind", "FoConflictResult";
--   delete this folder's row from _prisma_migrations.
-- Breaker round 1 (screens/FO-13/break-report.md): breaks 1, 2, 3, 5, 6, 7, 8 and 9 closed here, each with a fail test;
--   break 4 (the app's role may switch triggers off) is the platform's (PF-12), 10 and 11 are PostgreSQL's own behaviour.

-- CreateEnum
CREATE TYPE "FoConflictResult" AS ENUM ('NO_CONFLICT', 'POTENTIAL_CONFLICT', 'CONFLICT_CANNOT_ACT');

-- CreateEnum
CREATE TYPE "FoConflictPartyKind" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "FoIdentityMethod" AS ENUM ('IN_PERSON', 'VIDEO', 'DOCUMENT_COPY', 'OTHER');

-- CreateEnum
CREATE TYPE "FoIdentityDocumentType" AS ENUM ('PASSPORT', 'NATIONAL_IDENTITY_CARD', 'DRIVERS_LICENCE', 'PERMANENT_RESIDENT_CARD', 'OTHER_GOVERNMENT_PHOTO_ID');

-- CreateEnum
CREATE TYPE "FoIdentityDetail" AS ENUM ('NAME', 'HOME_ADDRESS', 'PHONE', 'EMAIL', 'BUSINESS_DETAILS');

-- CreateTable
CREATE TABLE "fo_conflict_check" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "party_kind" "FoConflictPartyKind" NOT NULL,
    "person_id" UUID,
    "company_id" UUID,
    "prospect_id" UUID,
    "searched_name" TEXT,
    "searched_email" TEXT,
    "searched_phone" TEXT,
    "matches" JSONB NOT NULL DEFAULT '[]',
    "hidden_count" INTEGER NOT NULL DEFAULT 0,
    "result" "FoConflictResult",
    "disclosure_text" TEXT,
    "written_consent_ref" TEXT,
    "checked_by" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ,

    CONSTRAINT "fo_conflict_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_identity_check" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "method" "FoIdentityMethod" NOT NULL,
    "method_detail" TEXT,
    "document_type" "FoIdentityDocumentType",
    "issuing_country" CHAR(2),
    "document_expiry" DATE,
    "document_number_last4" VARCHAR(4),
    "copy_file_key" TEXT,
    "copy_sha256" TEXT,
    "details_corroborated" "FoIdentityDetail"[],
    "checked_by" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_identity_check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fo_conflict_check_firm_id_person_id_checked_at_idx" ON "fo_conflict_check"("firm_id", "person_id", "checked_at");

-- CreateIndex
CREATE INDEX "fo_conflict_check_firm_id_company_id_checked_at_idx" ON "fo_conflict_check"("firm_id", "company_id", "checked_at");

-- CreateIndex
CREATE INDEX "fo_conflict_check_firm_id_prospect_id_idx" ON "fo_conflict_check"("firm_id", "prospect_id");

-- CreateIndex
CREATE INDEX "fo_identity_check_firm_id_person_id_checked_at_idx" ON "fo_identity_check"("firm_id", "person_id", "checked_at");

-- AddForeignKey
ALTER TABLE "fo_conflict_check" ADD CONSTRAINT "fo_conflict_check_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_conflict_check" ADD CONSTRAINT "fo_conflict_check_firm_id_checked_by_fkey" FOREIGN KEY ("firm_id", "checked_by") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_conflict_check" ADD CONSTRAINT "fo_conflict_check_firm_id_confirmed_by_fkey" FOREIGN KEY ("firm_id", "confirmed_by") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_identity_check" ADD CONSTRAINT "fo_identity_check_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_identity_check" ADD CONSTRAINT "fo_identity_check_firm_id_checked_by_fkey" FOREIGN KEY ("firm_id", "checked_by") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;



-- ------------------------------------------------------------------------------------------------ rules Prisma cannot say
-- Every function here fixes its search_path (break 9: a writer's own function of the same name in another schema must
-- never stand in for these). The database's character type is C, so [[:alnum:]] is ASCII only and a name in another
-- script would fail it: "visible" is said instead as "not only spaces and invisible characters" (break 5).
--
-- A one-line text: present, at most n characters, at least one visible character (spaces, no-break, zero-width,
-- filler, braille-blank, soft-hyphen, variation-selector and combining-only text counts as blank), no control
-- character and no direction or format control (U+200E/F, U+202A-E, U+2066-9, U+061C: they reorder what a reader sees).
CREATE FUNCTION fo_compliance_text_ok(t text, n integer) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT t IS NOT NULL AND char_length(t) BETWEEN 1 AND n
    AND t ~ '[^[:space:] ­͏ᅟᅠ឴឵᠋-᠎ -‏ -  -⁯⠀　ㅤ︀-️﻿ﾠ̀-ͯ]'
    AND t !~ '[\u0001-\u001f\u007f-\u009f]' AND t !~ '[‎‏‪-‮⁦-⁩؜]'
$$;
-- The same for a text of paragraphs (the disclosure, break 2): line breaks and tabs are allowed, other controls are not.
CREATE FUNCTION fo_compliance_long_text_ok(t text, n integer) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT t IS NOT NULL AND char_length(t) BETWEEN 1 AND n
    AND t ~ '[^[:space:] ­͏ᅟᅠ឴឵᠋-᠎ -‏ -  -⁯⠀　ㅤ︀-️﻿ﾠ̀-ͯ]'
    AND t !~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]' AND t !~ '[‎‏‪-‮⁦-⁩؜]'
$$;
-- No word that looks like an identity-document number (break 3): a run of 6 or more digits, or a word of 6 or more
-- letters, digits and hyphens with a letter and at least 3 digits (AB1234567, K1234567, A1234-56789). Dates
-- (2026-11-14) and phone groups pass. Used on the identity check's free-text note: only the last 4 are kept.
CREATE FUNCTION fo_compliance_no_document_number(t text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT t IS NULL OR NOT EXISTS (SELECT 1 FROM regexp_matches(t, '[A-Za-z0-9-]{6,}', 'g') AS m(w)
    WHERE w[1] ~ '[0-9]{6,}' OR (w[1] ~ '[A-Za-z]' AND w[1] ~ '[0-9][^0-9]*[0-9][^0-9]*[0-9]'))
$$;
CREATE FUNCTION fo_compliance_distinct_details(a "FoIdentityDetail"[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS
  $$ SELECT cardinality(a) = (SELECT count(DISTINCT x) FROM unnest(a) x) $$;

-- A conflict check's matches: a JSON array of at most 500 objects and 256 KiB, each { source, kind, recordId (a uuid),
-- matchedOn } with optional displayName and score (0 to 1, at most 4 decimals: break 6) and, for a CASE match only,
-- PartySearchPort's caseId, caseNumber, clientId and roleOnCase (break 7, review m2); no other key, and no record twice.
-- recordId is the matched row's id: for FRONT_OFFICE the lead, prospect, person, company or company-contact row; for
-- CASE the party's row in the case side's party index (case_party_index, contract v0.1 §3.1). FRONT_OFFICE kinds are the front office's records;
-- CASE kinds are PartySearchPort's (contract v0.1 §3.1). Visible matches only: the hidden ones are only counted.
CREATE FUNCTION fo_compliance_matches_ok(m jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE e jsonb; k text; on_list text[]; uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF m IS NULL OR jsonb_typeof(m) <> 'array' OR jsonb_array_length(m) > 500 OR octet_length(m::text) > 262144 THEN RETURN false; END IF;
  FOR e IN SELECT x FROM jsonb_array_elements(m) x LOOP
    IF jsonb_typeof(e) <> 'object' OR NOT (e ?& ARRAY['source', 'kind', 'recordId', 'matchedOn']) THEN RETURN false; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('source', 'kind', 'recordId', 'caseId', 'caseNumber', 'clientId', 'roleOnCase', 'displayName', 'matchedOn', 'score') THEN RETURN false; END IF;
    END LOOP;
    IF jsonb_typeof(e->'source') <> 'string' OR jsonb_typeof(e->'kind') <> 'string' THEN RETURN false; END IF;
    IF NOT ((e->>'source' = 'FRONT_OFFICE' AND e->>'kind' IN ('LEAD', 'PROSPECT', 'PERSON', 'COMPANY', 'COMPANY_CONTACT') AND NOT (e ?| ARRAY['caseId', 'caseNumber', 'clientId', 'roleOnCase']))
         OR (e->>'source' = 'CASE' AND e->>'kind' IN ('CLIENT', 'APPLICANT', 'FAMILY_MEMBER', 'SPONSOR', 'EMPLOYER', 'OTHER_PARTY'))) THEN
      RETURN false;
    END IF;
    IF jsonb_typeof(e->'recordId') <> 'string' OR e->>'recordId' !~ uuid_re THEN RETURN false; END IF;
    IF e ? 'caseId' AND (jsonb_typeof(e->'caseId') <> 'string' OR e->>'caseId' !~ uuid_re) THEN RETURN false; END IF;
    IF e ? 'clientId' AND (jsonb_typeof(e->'clientId') <> 'string' OR e->>'clientId' !~ uuid_re) THEN RETURN false; END IF;
    IF e ? 'roleOnCase' AND (jsonb_typeof(e->'roleOnCase') <> 'string' OR e->>'roleOnCase' !~ '^[A-Z][A-Z_]{0,39}$') THEN RETURN false; END IF;
    IF e ? 'caseNumber' AND (jsonb_typeof(e->'caseNumber') <> 'string' OR e->>'caseNumber' !~ '^[A-Z][A-Z0-9]{0,5}(-[0-9]{1,8}){1,3}$') THEN RETURN false; END IF;
    IF e ? 'displayName' AND (jsonb_typeof(e->'displayName') <> 'string' OR NOT fo_compliance_text_ok(e->>'displayName', 300)) THEN RETURN false; END IF;
    IF jsonb_typeof(e->'matchedOn') <> 'array' OR jsonb_array_length(e->'matchedOn') NOT BETWEEN 1 AND 3 THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(e->'matchedOn') v WHERE jsonb_typeof(v) <> 'string') THEN RETURN false; END IF;
    on_list := ARRAY(SELECT jsonb_array_elements_text(e->'matchedOn'));
    IF NOT (on_list <@ ARRAY['NAME', 'EMAIL', 'PHONE']) OR cardinality(on_list) <> (SELECT count(DISTINCT x) FROM unnest(on_list) x) THEN RETURN false; END IF;
    IF e ? 'score' AND (jsonb_typeof(e->'score') <> 'number' OR (e->'score')::text !~ '^(0|1)(\.[0-9]{1,4})?$' OR (e->>'score')::numeric > 1) THEN RETURN false; END IF;
  END LOOP;
  IF jsonb_array_length(m) <> (SELECT count(DISTINCT (x->>'source', x->>'kind', x->>'recordId')) FROM jsonb_array_elements(m) x) THEN RETURN false; END IF;
  RETURN true;
END $$;

ALTER TABLE "fo_conflict_check"
  -- Exactly one party, of the check's kind.
  ADD CONSTRAINT "fo_conflict_check_party_check" CHECK (
    ("party_kind" = 'PERSON' AND "person_id" IS NOT NULL AND "company_id" IS NULL)
    OR ("party_kind" = 'COMPANY' AND "company_id" IS NOT NULL AND "person_id" IS NULL)),
  -- At least one searched term; each one a short text; an email with an @ and a dot after it, a phone of 7 to 15 digits.
  ADD CONSTRAINT "fo_conflict_check_terms_check" CHECK (
    ("searched_name" IS NOT NULL OR "searched_email" IS NOT NULL OR "searched_phone" IS NOT NULL)
    AND ("searched_name" IS NULL OR fo_compliance_text_ok("searched_name", 300))
    AND ("searched_email" IS NULL OR (fo_compliance_text_ok("searched_email", 320) AND "searched_email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
    AND ("searched_phone" IS NULL OR (fo_compliance_text_ok("searched_phone", 40) AND "searched_phone" ~ '^\+?[0-9 ()./-]+$'
         AND char_length(regexp_replace("searched_phone", '[^0-9]', '', 'g')) BETWEEN 7 AND 15))),
  ADD CONSTRAINT "fo_conflict_check_matches_check" CHECK (fo_compliance_matches_ok("matches")),
  ADD CONSTRAINT "fo_conflict_check_hidden_count_check" CHECK ("hidden_count" BETWEEN 0 AND 100000),
  -- No result only while hidden matches wait for the confirmation.
  ADD CONSTRAINT "fo_conflict_check_result_check" CHECK ("result" IS NOT NULL OR ("hidden_count" > 0 AND "confirmed_by" IS NULL)),
  -- Hidden matches (contract v0.1 §3.1): NO_CONFLICT only once a person who may see them has confirmed.
  ADD CONSTRAINT "fo_conflict_check_hidden_confirmed_check" CHECK ("result" IS DISTINCT FROM 'NO_CONFLICT' OR "hidden_count" = 0 OR "confirmed_by" IS NOT NULL),
  -- s. 24(3)(o): a potential conflict carries the disclosure the client reads in the retainer (paragraphs allowed);
  -- nothing else carries one, a check still waiting for its result included (IS NOT DISTINCT FROM: break 1, a CHECK
  -- that comes out NULL passes).
  ADD CONSTRAINT "fo_conflict_check_disclosure_check" CHECK (
    ("result" IS NOT DISTINCT FROM 'POTENTIAL_CONFLICT' AND fo_compliance_long_text_ok("disclosure_text", 10000))
    OR ("result" IS DISTINCT FROM 'POTENTIAL_CONFLICT' AND "disclosure_text" IS NULL)),
  -- s. 15(1): the client's written consent, recorded by reference, for a potential conflict only (not for a check that
  -- has no result yet: break 1).
  ADD CONSTRAINT "fo_conflict_check_consent_check" CHECK (
    "written_consent_ref" IS NULL OR ("result" IS NOT DISTINCT FROM 'POTENTIAL_CONFLICT' AND fo_compliance_text_ok("written_consent_ref", 500))),
  -- The confirmation: both its columns or neither, only for hidden matches, by another staff member, not before the check.
  ADD CONSTRAINT "fo_conflict_check_confirmation_check" CHECK (
    ("confirmed_by" IS NULL AND "confirmed_at" IS NULL)
    OR ("confirmed_by" IS NOT NULL AND "confirmed_at" IS NOT NULL AND "hidden_count" > 0 AND "confirmed_by" <> "checked_by"
        AND isfinite("confirmed_at") AND "confirmed_at" >= "checked_at")),
  ADD CONSTRAINT "fo_conflict_check_checked_at_check" CHECK (isfinite("checked_at"));

ALTER TABLE "fo_identity_check"
  -- The note says how; it never holds a document number (break 3).
  ADD CONSTRAINT "fo_identity_check_method_detail_check" CHECK (
    ("method_detail" IS NULL OR (fo_compliance_text_ok("method_detail", 500) AND fo_compliance_no_document_number("method_detail")))
    AND ("method" <> 'OTHER' OR "method_detail" IS NOT NULL)),
  -- A document is named fully (type, issuing country, last 4 characters) or not at all; a copy needs a document.
  ADD CONSTRAINT "fo_identity_check_document_check" CHECK (
    ("document_type" IS NOT NULL AND "issuing_country" IS NOT NULL AND "document_number_last4" IS NOT NULL)
    OR ("document_type" IS NULL AND "issuing_country" IS NULL AND "document_number_last4" IS NULL AND "document_expiry" IS NULL AND "copy_file_key" IS NULL)),
  ADD CONSTRAINT "fo_identity_check_document_copy_method_check" CHECK ("method" <> 'DOCUMENT_COPY' OR "document_type" IS NOT NULL),
  ADD CONSTRAINT "fo_identity_check_country_check" CHECK ("issuing_country" IS NULL OR "issuing_country" ~ '^[A-Z]{2}$'),
  -- Only the last 4 characters of the number (VARCHAR(4) refuses more: 22001); upper-case letters and digits, exactly 4.
  ADD CONSTRAINT "fo_identity_check_number_last4_check" CHECK ("document_number_last4" IS NULL OR "document_number_last4" ~ '^[A-Z0-9]{4}$'),
  ADD CONSTRAINT "fo_identity_check_expiry_check" CHECK ("document_expiry" IS NULL OR "document_expiry" BETWEEN DATE '1900-01-01' AND DATE '2199-12-31'),
  -- The copy is FilesPort's: its key and the sha256 put returned, both or neither (IS NOT NULL: a CHECK that is NULL
  -- passes). The key is lower-case words and uuids joined by /, with a file type (break 3: no free text, so no document
  -- number and no ../ in it), e.g. identity/<firm uuid>/<check uuid>.pdf.
  ADD CONSTRAINT "fo_identity_check_copy_check" CHECK (
    ("copy_file_key" IS NULL AND "copy_sha256" IS NULL)
    OR ("copy_file_key" IS NOT NULL AND char_length("copy_file_key") <= 300
        AND "copy_file_key" ~ '^[a-z]+(-[a-z]+)*(/([a-z]+(-[a-z]+)*|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))+\.(pdf|jpg|jpeg|png|heic|webp)$'
        AND "copy_sha256" IS NOT NULL AND "copy_sha256" ~ '^[0-9a-f]{64}$')),
  ADD CONSTRAINT "fo_identity_check_details_check" CHECK (
    "details_corroborated" IS NOT NULL AND cardinality("details_corroborated") >= 1
    AND array_position("details_corroborated", NULL) IS NULL AND fo_compliance_distinct_details("details_corroborated")),
  ADD CONSTRAINT "fo_identity_check_checked_at_check" CHECK (isfinite("checked_at"));

-- Never deleted or truncated (both), never changed (an identity check: a correction is a new check).
-- Erasure (Lead B, #1755): PF-21d will anonymise an identity check's personal fields, keeping the record that a check
-- happened, only through one function fo_compliance_erase(...) run by the erasure job; never by opening updates generally.
CREATE FUNCTION fo_compliance_refuse_change() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION '%: % is refused; a check is a record (write a new check instead)', TG_TABLE_NAME, lower(TG_OP)
    USING ERRCODE = 'restrict_violation';
END $$;
CREATE TRIGGER fo_compliance_identity_check_no_update BEFORE UPDATE ON "fo_identity_check" FOR EACH ROW EXECUTE FUNCTION fo_compliance_refuse_change();
CREATE TRIGGER fo_compliance_identity_check_no_delete BEFORE DELETE ON "fo_identity_check" FOR EACH ROW EXECUTE FUNCTION fo_compliance_refuse_change();
CREATE TRIGGER fo_compliance_identity_check_no_truncate BEFORE TRUNCATE ON "fo_identity_check" FOR EACH STATEMENT EXECUTE FUNCTION fo_compliance_refuse_change();
CREATE TRIGGER fo_compliance_conflict_check_no_delete BEFORE DELETE ON "fo_conflict_check" FOR EACH ROW EXECUTE FUNCTION fo_compliance_refuse_change();
CREATE TRIGGER fo_compliance_conflict_check_no_truncate BEFORE TRUNCATE ON "fo_conflict_check" FOR EACH STATEMENT EXECUTE FUNCTION fo_compliance_refuse_change();

-- The staff member named is an ACTIVE staff member of the firm (break 8: a suspended or deactivated person neither
-- checks nor confirms). A staff id that does not exist is left to the foreign key (23503).
CREATE FUNCTION fo_compliance_staff_active(firm uuid, staff uuid, what text) RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "platform_staff" s WHERE s.firm_id = firm AND s.id = staff AND s.status <> 'ACTIVE') THEN
    RAISE EXCEPTION '%: staff member % is not active', what, staff USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- An identity check's time is the database's (break 8), and its checker is active.
CREATE FUNCTION fo_compliance_identity_check_insert() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.checked_at := now();
  PERFORM fo_compliance_staff_active(NEW.firm_id, NEW.checked_by, 'fo_identity_check: the checker');
  RETURN NEW;
END $$;
CREATE TRIGGER fo_compliance_identity_check_insert BEFORE INSERT ON "fo_identity_check" FOR EACH ROW EXECUTE FUNCTION fo_compliance_identity_check_insert();

-- A conflict check (contract v0.1 §3.1; s. 15(1)):
--   * is written with the database's time and an active checker, and never already confirmed: the confirmation is its
--     own later step by another person (break 8);
--   * once written, only gains the confirmation (confirmed_by, an active staff member; confirmed_at, the database's
--     time), once; with it, and only with it, the result when it had none (and the disclosure that result needs);
--   * and the written-consent reference, once.
-- Everything else (firm, party, terms, matches, hidden count, checker, time, and a result already given) never changes.
CREATE FUNCTION fo_compliance_conflict_check_write() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE confirming boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.confirmed_by IS NOT NULL OR NEW.confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'fo_conflict_check: a check is confirmed afterwards, by another person, never as it is written' USING ERRCODE = 'check_violation';
    END IF;
    NEW.checked_at := now();
    PERFORM fo_compliance_staff_active(NEW.firm_id, NEW.checked_by, 'fo_conflict_check: the checker');
    RETURN NEW;
  END IF;
  confirming := OLD.confirmed_by IS NULL AND NEW.confirmed_by IS NOT NULL;
  IF (NEW.id, NEW.firm_id, NEW.party_kind, NEW.person_id, NEW.company_id, NEW.prospect_id, NEW.searched_name, NEW.searched_email,
      NEW.searched_phone, NEW.matches, NEW.hidden_count, NEW.checked_by, NEW.checked_at)
     IS DISTINCT FROM
     (OLD.id, OLD.firm_id, OLD.party_kind, OLD.person_id, OLD.company_id, OLD.prospect_id, OLD.searched_name, OLD.searched_email,
      OLD.searched_phone, OLD.matches, OLD.hidden_count, OLD.checked_by, OLD.checked_at)
     OR NEW.matches::text IS DISTINCT FROM OLD.matches::text THEN
    RAISE EXCEPTION 'fo_conflict_check: what was checked and found never changes (write a new check instead)' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.confirmed_by IS NOT NULL AND (NEW.confirmed_by, NEW.confirmed_at) IS DISTINCT FROM (OLD.confirmed_by, OLD.confirmed_at) THEN
    RAISE EXCEPTION 'fo_conflict_check: the confirmation is given once and never changes' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.confirmed_by IS NULL AND NEW.confirmed_by IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    RAISE EXCEPTION 'fo_conflict_check: a confirmation names who confirmed' USING ERRCODE = 'check_violation';
  END IF;
  IF confirming THEN
    NEW.confirmed_at := now();
    PERFORM fo_compliance_staff_active(NEW.firm_id, NEW.confirmed_by, 'fo_conflict_check: the confirmer');
  END IF;
  IF (NEW.result, NEW.disclosure_text) IS DISTINCT FROM (OLD.result, OLD.disclosure_text) AND NOT (OLD.result IS NULL AND confirming) THEN
    RAISE EXCEPTION 'fo_conflict_check: the result is given once, at the check or with the confirmation, and never changes (write a new check instead)' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.written_consent_ref IS NOT NULL AND NEW.written_consent_ref IS DISTINCT FROM OLD.written_consent_ref THEN
    RAISE EXCEPTION 'fo_conflict_check: the written-consent reference is recorded once and never changes' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_compliance_conflict_check_write BEFORE INSERT OR UPDATE ON "fo_conflict_check" FOR EACH ROW EXECUTE FUNCTION fo_compliance_conflict_check_write();
