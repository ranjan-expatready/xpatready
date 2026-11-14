-- FO-5 (P-558, P-559, P-576, P-600; BACKLOG row FO-5 rows rev 6.2, 9, 10 part 2; contracts
-- platform-and-front-office-contracts-2026-11-14.md §2.3, §7 binding; concept fo-5s-retainer-signing r2 §3 BR-1..BR-11;
-- AG-05: AG-5-3, -4, -7, -9, -34, -39, -47, -50, -64, -65; schema file prisma/schema/front-office-retainers.prisma, owner
-- Lead B (front office)). New tables only; no existing table, column or row changes. Rows carry no workspace_id: the demo
-- reset leaves them.
--   * the tables of the row: fo_retainer_template, fo_retainer, fo_retainer_version, fo_retainer_fee_row.
--   * rules Prisma cannot say, at the end (every function carries the fo_retainer_ prefix, rows rev 15.2): one live
--     RETAINER per prospect (partial unique index; WITHDRAWN and EXPIRED free it, BR-10); status moves (BR-9..BR-11,
--     AG-5-34, AG-5-65); a new version only while the retainer is DRAFT, contiguous, never after the client signed; the
--     superseded version's request ended first; versions write-once (only sent_at, then ended_at with end_reason, each
--     once); fee rows insert-only, written with their version, CAD, minor units; withdraw and Signed offline carry their
--     reason (1-200 characters), time, actor and (offline) the PDF's key and sha256; the template's version only grows,
--     by one, with a new file; firm_id and the fixed columns never change; no delete or truncate of a retainer, version or
--     fee row; shapes of names, keys, hashes and placeholders (checks).
--   * prospect_id, signer_person_id and company_id name FO-1a's fo_prospect, fo_person and fo_company, not on main yet:
--     plain uuids, no foreign key; FO-1k adds the keys (rows rev 16).
-- Rollback (in this order): DROP TABLE "fo_retainer_fee_row", "fo_retainer_version", "fo_retainer",
--   "fo_retainer_template"; DROP FUNCTION fo_retainer_key_ok(text), fo_retainer_placeholders_ok(text[]),
--   fo_retainer_firm_fixed(), fo_retainer_no_delete(), fo_retainer_template_write(), fo_retainer_write(),
--   fo_retainer_version_write(), fo_retainer_fee_row_write(); DROP TYPE "FoRetainerRequestEnd", "FoRetainerFeeWhen",
--   "FoRetainerSubject", "FoRetainerStatus", "FoRetainerKind"; delete this folder's row from _prisma_migrations.
-- CreateEnum
CREATE TYPE "FoRetainerKind" AS ENUM ('RETAINER', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "FoRetainerStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'CLIENT_SIGNED', 'SIGNED', 'SIGNED_OFFLINE', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FoRetainerSubject" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "FoRetainerFeeWhen" AS ENUM ('ON_SIGNING', 'ON_DATE', 'WHEN_SUBMITTED', 'WHEN_DECIDED', 'WHEN_DONE');

-- CreateEnum
CREATE TYPE "FoRetainerRequestEnd" AS ENUM ('UPDATED', 'WITHDRAWN', 'SIGNED_OFFLINE', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "fo_retainer_template" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FoRetainerKind" NOT NULL DEFAULT 'RETAINER',
    "version" INTEGER NOT NULL DEFAULT 1,
    "file_key" TEXT NOT NULL,
    "file_sha256" TEXT NOT NULL,
    "placeholders" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_retainer_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_retainer" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "kind" "FoRetainerKind" NOT NULL DEFAULT 'RETAINER',
    "prospect_id" UUID,
    "subject" "FoRetainerSubject" NOT NULL DEFAULT 'PERSON',
    "signer_person_id" UUID,
    "company_id" UUID,
    "representative_staff_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version" INTEGER NOT NULL,
    "template_file_key" TEXT NOT NULL,
    "status" "FoRetainerStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "withdrawn_reason" TEXT,
    "withdrawn_at" TIMESTAMPTZ,
    "withdrawn_by" TEXT,
    "offline_reason" TEXT,
    "offline_file_key" TEXT,
    "offline_file_sha256" TEXT,
    "offline_at" TIMESTAMPTZ,
    "offline_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fo_retainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_retainer_version" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "retainer_id" UUID NOT NULL,
    "n" INTEGER NOT NULL,
    "merge_values" JSONB NOT NULL,
    "file_key" TEXT NOT NULL,
    "original_sha256" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "end_reason" "FoRetainerRequestEnd",
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fo_retainer_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fo_retainer_fee_row" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount_minor" BIGINT,
    "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
    "when" "FoRetainerFeeWhen" NOT NULL,
    "due_on" DATE,

    CONSTRAINT "fo_retainer_fee_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fo_retainer_template_firm_id_kind_active_idx" ON "fo_retainer_template"("firm_id", "kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_template_firm_id_name_key" ON "fo_retainer_template"("firm_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_template_firm_id_id_key" ON "fo_retainer_template"("firm_id", "id");

-- CreateIndex
CREATE INDEX "fo_retainer_firm_id_prospect_id_idx" ON "fo_retainer"("firm_id", "prospect_id");

-- CreateIndex
CREATE INDEX "fo_retainer_firm_id_representative_staff_id_idx" ON "fo_retainer"("firm_id", "representative_staff_id");

-- CreateIndex
CREATE INDEX "fo_retainer_firm_id_status_idx" ON "fo_retainer"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_firm_id_id_key" ON "fo_retainer"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_version_firm_id_retainer_id_n_key" ON "fo_retainer_version"("firm_id", "retainer_id", "n");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_version_firm_id_id_key" ON "fo_retainer_version"("firm_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fo_retainer_fee_row_firm_id_version_id_position_key" ON "fo_retainer_fee_row"("firm_id", "version_id", "position");

-- AddForeignKey
ALTER TABLE "fo_retainer_template" ADD CONSTRAINT "fo_retainer_template_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_retainer" ADD CONSTRAINT "fo_retainer_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_retainer" ADD CONSTRAINT "fo_retainer_firm_id_template_id_fkey" FOREIGN KEY ("firm_id", "template_id") REFERENCES "fo_retainer_template"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_retainer" ADD CONSTRAINT "fo_retainer_firm_id_representative_staff_id_fkey" FOREIGN KEY ("firm_id", "representative_staff_id") REFERENCES "platform_staff"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_retainer_version" ADD CONSTRAINT "fo_retainer_version_firm_id_retainer_id_fkey" FOREIGN KEY ("firm_id", "retainer_id") REFERENCES "fo_retainer"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "fo_retainer_fee_row" ADD CONSTRAINT "fo_retainer_fee_row_firm_id_version_id_fkey" FOREIGN KEY ("firm_id", "version_id") REFERENCES "fo_retainer_version"("firm_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ---------------------------------------------------------------------------------------------------------------------
-- Rules Prisma cannot say (FO-5). Every function carries the fo_retainer_ prefix (rows rev 15.2).

-- A file-store key (ports/files.ts FileKey): lower-case path segments, no . or .. segment, at most 300 characters.
CREATE FUNCTION fo_retainer_key_ok(k text) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT k IS NOT NULL AND char_length(k) <= 300 AND k ~ '^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$'
       AND NOT ('/' || k || '/') ~ '/\.\.?/' $$;
-- Placeholder names (BR-1): dotted lower-case names (client.name, fees.amount), distinct, at most 200 of them.
CREATE FUNCTION fo_retainer_placeholders_ok(a text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT a IS NOT NULL AND coalesce(array_length(a, 1), 0) <= 200
       AND NOT EXISTS (SELECT 1 FROM unnest(a) p WHERE p IS NULL OR p !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){0,4}$' OR char_length(p) > 100)
       AND (SELECT count(*) FROM unnest(a)) = (SELECT count(DISTINCT p) FROM unnest(a) p) $$;

ALTER TABLE "fo_retainer_template"
  ADD CONSTRAINT "fo_retainer_template_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120 AND "name" = btrim("name")),
  ADD CONSTRAINT "fo_retainer_template_version_check" CHECK ("version" >= 1),
  ADD CONSTRAINT "fo_retainer_template_file_key_check" CHECK (fo_retainer_key_ok("file_key")),
  ADD CONSTRAINT "fo_retainer_template_file_sha256_check" CHECK ("file_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fo_retainer_template_placeholders_check" CHECK (fo_retainer_placeholders_ok("placeholders"));

ALTER TABLE "fo_retainer"
  -- A retainer is for a prospect; a consultation agreement may come from a booking before there is one (FO-3c).
  ADD CONSTRAINT "fo_retainer_prospect_check" CHECK ("kind" = 'CONSULTATION' OR "prospect_id" IS NOT NULL),
  ADD CONSTRAINT "fo_retainer_subject_check" CHECK (("subject" = 'COMPANY') = ("company_id" IS NOT NULL)),
  ADD CONSTRAINT "fo_retainer_template_version_check" CHECK ("template_version" >= 1),
  ADD CONSTRAINT "fo_retainer_current_version_check" CHECK ("current_version" >= 1),
  ADD CONSTRAINT "fo_retainer_template_file_key_check" CHECK (fo_retainer_key_ok("template_file_key")),
  -- Withdraw (BR-10, AG-5-34): reason 1-200 characters, time and actor, all together and only on WITHDRAWN.
  ADD CONSTRAINT "fo_retainer_withdrawn_check" CHECK (
    ("status" = 'WITHDRAWN') = ("withdrawn_at" IS NOT NULL)
    AND ("withdrawn_at" IS NULL) = ("withdrawn_reason" IS NULL) AND ("withdrawn_at" IS NULL) = ("withdrawn_by" IS NULL)
    AND ("withdrawn_reason" IS NULL OR char_length(btrim("withdrawn_reason")) BETWEEN 1 AND 200)),
  -- Signed offline (BR-11, AG-5-39, AG-5-47): the PDF's key and sha256, a reason 1-200 characters, time and actor.
  ADD CONSTRAINT "fo_retainer_offline_check" CHECK (
    ("status" = 'SIGNED_OFFLINE') = ("offline_at" IS NOT NULL)
    AND ("offline_at" IS NULL) = ("offline_reason" IS NULL) AND ("offline_at" IS NULL) = ("offline_by" IS NULL)
    AND ("offline_at" IS NULL) = ("offline_file_key" IS NULL) AND ("offline_at" IS NULL) = ("offline_file_sha256" IS NULL)
    AND ("offline_reason" IS NULL OR char_length(btrim("offline_reason")) BETWEEN 1 AND 200)
    AND ("offline_file_key" IS NULL OR fo_retainer_key_ok("offline_file_key"))
    AND ("offline_file_sha256" IS NULL OR "offline_file_sha256" ~ '^[0-9a-f]{64}$'));

ALTER TABLE "fo_retainer_version"
  ADD CONSTRAINT "fo_retainer_version_n_check" CHECK ("n" >= 1),
  ADD CONSTRAINT "fo_retainer_version_merge_values_check" CHECK (jsonb_typeof("merge_values") = 'object'),
  ADD CONSTRAINT "fo_retainer_version_file_key_check" CHECK (fo_retainer_key_ok("file_key")),
  ADD CONSTRAINT "fo_retainer_version_sha256_check" CHECK ("original_sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "fo_retainer_version_end_check" CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL));

ALTER TABLE "fo_retainer_fee_row"
  ADD CONSTRAINT "fo_retainer_fee_row_position_check" CHECK ("position" BETWEEN 1 AND 50),
  ADD CONSTRAINT "fo_retainer_fee_row_label_check" CHECK (char_length(btrim("label")) BETWEEN 1 AND 120),
  -- Minor units (cents), never negative, at most CAD 100 million (a typing slip, not a fee).
  ADD CONSTRAINT "fo_retainer_fee_row_amount_check" CHECK ("amount_minor" IS NULL OR "amount_minor" BETWEEN 0 AND 10000000000),
  ADD CONSTRAINT "fo_retainer_fee_row_currency_check" CHECK ("currency" = 'CAD'),
  -- A date only for ON_DATE (empty on a draft shows "missing", BR-6).
  ADD CONSTRAINT "fo_retainer_fee_row_due_on_check" CHECK ("due_on" IS NULL OR "when" = 'ON_DATE');

-- One live retainer per prospect (BR-10): WITHDRAWN and EXPIRED free the prospect for a new one; DECLINED stays live
-- (Edit and resend, AG-5-65 r1).
CREATE UNIQUE INDEX "fo_retainer_one_live_per_prospect" ON "fo_retainer" ("firm_id", "prospect_id")
  WHERE "kind" = 'RETAINER' AND "status" NOT IN ('WITHDRAWN', 'EXPIRED');

CREATE FUNCTION fo_retainer_firm_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.firm_id IS DISTINCT FROM OLD.firm_id THEN
    RAISE EXCEPTION '%: firm_id never changes', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_retainer_template_firm_fixed BEFORE UPDATE OF firm_id ON "fo_retainer_template" FOR EACH ROW EXECUTE FUNCTION fo_retainer_firm_fixed();
CREATE TRIGGER fo_retainer_firm_fixed BEFORE UPDATE OF firm_id ON "fo_retainer" FOR EACH ROW EXECUTE FUNCTION fo_retainer_firm_fixed();

-- Records keep their facts: a retainer, a version or a fee row is never deleted or truncated.
CREATE FUNCTION fo_retainer_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%: rows are never deleted (% refused)', TG_TABLE_NAME, TG_OP USING ERRCODE = 'restrict_violation';
END $$;
CREATE TRIGGER fo_retainer_no_delete BEFORE DELETE ON "fo_retainer" FOR EACH ROW EXECUTE FUNCTION fo_retainer_no_delete();
CREATE TRIGGER fo_retainer_no_truncate BEFORE TRUNCATE ON "fo_retainer" FOR EACH STATEMENT EXECUTE FUNCTION fo_retainer_no_delete();
CREATE TRIGGER fo_retainer_version_no_delete BEFORE DELETE ON "fo_retainer_version" FOR EACH ROW EXECUTE FUNCTION fo_retainer_no_delete();
CREATE TRIGGER fo_retainer_version_no_truncate BEFORE TRUNCATE ON "fo_retainer_version" FOR EACH STATEMENT EXECUTE FUNCTION fo_retainer_no_delete();
CREATE TRIGGER fo_retainer_fee_row_no_delete BEFORE DELETE ON "fo_retainer_fee_row" FOR EACH ROW EXECUTE FUNCTION fo_retainer_no_delete();
CREATE TRIGGER fo_retainer_fee_row_no_truncate BEFORE TRUNCATE ON "fo_retainer_fee_row" FOR EACH STATEMENT EXECUTE FUNCTION fo_retainer_no_delete();

-- A template's version only grows, by one, and only with a new file (BR-1); its kind never changes (retainers copy it).
CREATE FUNCTION fo_retainer_template_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.version <> 1 THEN
      RAISE EXCEPTION 'fo_retainer_template: a template starts at version 1, not %', NEW.version USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.kind IS DISTINCT FROM OLD.kind OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'fo_retainer_template: kind, created_by and created_at never change' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.version = OLD.version THEN
    IF NEW.file_key IS DISTINCT FROM OLD.file_key OR NEW.file_sha256 IS DISTINCT FROM OLD.file_sha256 OR NEW.placeholders IS DISTINCT FROM OLD.placeholders THEN
      RAISE EXCEPTION 'fo_retainer_template: a new file makes version % (the version''s file never changes)', OLD.version + 1 USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'fo_retainer_template: version moves from % to %, not %', OLD.version, OLD.version + 1, NEW.version USING ERRCODE = 'check_violation';
  ELSIF NEW.file_key = OLD.file_key THEN
    RAISE EXCEPTION 'fo_retainer_template: version % needs its own file key', NEW.version USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_retainer_template_write BEFORE INSERT OR UPDATE ON "fo_retainer_template" FOR EACH ROW EXECUTE FUNCTION fo_retainer_template_write();

-- A retainer's status moves and fixed columns (BR-9..BR-11; AG-5-34, AG-5-39, AG-5-65).
CREATE FUNCTION fo_retainer_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  t record;
  allowed text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.current_version <> 1 THEN
      RAISE EXCEPTION 'fo_retainer: a retainer is written DRAFT at version 1, not % at %', NEW.status, NEW.current_version USING ERRCODE = 'check_violation';
    END IF;
    SELECT kind, version, active INTO t FROM "fo_retainer_template" WHERE firm_id = NEW.firm_id AND id = NEW.template_id;
    IF FOUND AND t.kind <> NEW.kind THEN
      RAISE EXCEPTION 'fo_retainer: a % template cannot make a % agreement', t.kind, NEW.kind USING ERRCODE = 'check_violation';
    END IF;
    IF FOUND AND (NEW.template_version > t.version) THEN
      RAISE EXCEPTION 'fo_retainer: template version % does not exist yet (the template is at %)', NEW.template_version, t.version USING ERRCODE = 'check_violation';
    END IF;
    IF FOUND AND NOT t.active THEN
      RAISE EXCEPTION 'fo_retainer: an inactive template is not used for new drafts' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('SIGNED', 'SIGNED_OFFLINE', 'WITHDRAWN') THEN
    RAISE EXCEPTION 'fo_retainer: a % retainer does not change', OLD.status USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.kind IS DISTINCT FROM OLD.kind OR NEW.prospect_id IS DISTINCT FROM OLD.prospect_id OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.template_id IS DISTINCT FROM OLD.template_id
     OR NEW.template_version IS DISTINCT FROM OLD.template_version OR NEW.template_file_key IS DISTINCT FROM OLD.template_file_key
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'fo_retainer: kind, prospect, subject, company, template and creation never change' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    allowed := CASE OLD.status
      WHEN 'DRAFT' THEN ARRAY['SENT', 'SIGNED_OFFLINE']
      WHEN 'SENT' THEN ARRAY['VIEWED', 'CLIENT_SIGNED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SIGNED_OFFLINE', 'DRAFT']
      WHEN 'VIEWED' THEN ARRAY['CLIENT_SIGNED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'SIGNED_OFFLINE', 'DRAFT']
      WHEN 'CLIENT_SIGNED' THEN ARRAY['SIGNED', 'WITHDRAWN', 'SIGNED_OFFLINE']
      WHEN 'DECLINED' THEN ARRAY['DRAFT']
      WHEN 'EXPIRED' THEN ARRAY['DRAFT']
      ELSE ARRAY[]::text[] END;
    IF NOT (NEW.status::text = ANY (allowed)) THEN
      RAISE EXCEPTION 'fo_retainer: status cannot move from % to %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Back to DRAFT only by an edit (a new version), and a new version only on the way to (or in) DRAFT (AG-5-65).
  IF NEW.current_version IS DISTINCT FROM OLD.current_version THEN
    IF NEW.current_version <> OLD.current_version + 1 THEN
      RAISE EXCEPTION 'fo_retainer: current_version moves from % to %, not %', OLD.current_version, OLD.current_version + 1, NEW.current_version USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'fo_retainer: a new version is made only as a draft (AG-5-65: never once the client signed)' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.status = 'DRAFT' AND OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'fo_retainer: % comes back to DRAFT only with a new version', OLD.status USING ERRCODE = 'check_violation';
  END IF;

  -- The signer and the representative change only with a new version (or on the draft itself).
  IF (NEW.signer_person_id IS DISTINCT FROM OLD.signer_person_id OR NEW.representative_staff_id IS DISTINCT FROM OLD.representative_staff_id)
     AND NOT (OLD.status = 'DRAFT' AND NEW.status = 'DRAFT') AND NEW.current_version = OLD.current_version THEN
    RAISE EXCEPTION 'fo_retainer: the signer and the representative change only by an edit' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_retainer_write BEFORE INSERT OR UPDATE ON "fo_retainer" FOR EACH ROW EXECUTE FUNCTION fo_retainer_write();

-- A version (AG-5-3, AG-5-65; BR-7, BR-9): written as the retainer's current version while it is DRAFT, after the
-- previous version's request ended (if it was sent); then write-once except sent_at, then ended_at with end_reason.
CREATE FUNCTION fo_retainer_version_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r record;
  prev record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status, current_version INTO r FROM "fo_retainer" WHERE firm_id = NEW.firm_id AND id = NEW.retainer_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN NEW; -- the foreign key refuses it
    END IF;
    IF r.status <> 'DRAFT' OR NEW.n <> r.current_version THEN
      RAISE EXCEPTION 'fo_retainer_version: version % is written only as the current version (%) of a DRAFT retainer (it is %)', NEW.n, r.current_version, r.status USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.sent_at IS NOT NULL OR NEW.ended_at IS NOT NULL THEN
      RAISE EXCEPTION 'fo_retainer_version: a version is written unsent' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.n > 1 THEN
      SELECT sent_at, ended_at INTO prev FROM "fo_retainer_version" WHERE firm_id = NEW.firm_id AND retainer_id = NEW.retainer_id AND n = NEW.n - 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'fo_retainer_version: version % needs version %', NEW.n, NEW.n - 1 USING ERRCODE = 'check_violation';
      END IF;
      IF prev.sent_at IS NOT NULL AND prev.ended_at IS NULL THEN
        RAISE EXCEPTION 'fo_retainer_version: version %''s request must end before version % (BR-9)', NEW.n - 1, NEW.n USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.firm_id IS DISTINCT FROM OLD.firm_id OR NEW.retainer_id IS DISTINCT FROM OLD.retainer_id
     OR NEW.n IS DISTINCT FROM OLD.n OR NEW.merge_values IS DISTINCT FROM OLD.merge_values OR NEW.file_key IS DISTINCT FROM OLD.file_key
     OR NEW.original_sha256 IS DISTINCT FROM OLD.original_sha256 OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'fo_retainer_version: a version never changes (only its request: sent_at, then ended_at)' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.sent_at IS NOT NULL AND NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'fo_retainer_version: sent_at is set once' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.ended_at IS NOT NULL AND (NEW.ended_at IS DISTINCT FROM OLD.ended_at OR NEW.end_reason IS DISTINCT FROM OLD.end_reason) THEN
    RAISE EXCEPTION 'fo_retainer_version: a request ends once' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.ended_at IS NOT NULL AND OLD.sent_at IS NULL AND NEW.sent_at IS NOT NULL THEN
    RAISE EXCEPTION 'fo_retainer_version: an ended version is not sent' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_retainer_version_write BEFORE INSERT OR UPDATE ON "fo_retainer_version" FOR EACH ROW EXECUTE FUNCTION fo_retainer_version_write();

-- Fee rows (BR-5, AG-5-64): insert-only, and only into the current, unsent version of a DRAFT retainer.
CREATE FUNCTION fo_retainer_fee_row_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'fo_retainer_fee_row: fee rows never change (an edit makes a new version)' USING ERRCODE = 'check_violation';
  END IF;
  SELECT ver.n, ver.sent_at, ver.ended_at, ret.status, ret.current_version INTO v
    FROM "fo_retainer_version" ver JOIN "fo_retainer" ret ON ret.firm_id = ver.firm_id AND ret.id = ver.retainer_id
   WHERE ver.firm_id = NEW.firm_id AND ver.id = NEW.version_id;
  IF NOT FOUND THEN
    RETURN NEW; -- the foreign key refuses it
  END IF;
  IF v.status <> 'DRAFT' OR v.n <> v.current_version OR v.sent_at IS NOT NULL OR v.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'fo_retainer_fee_row: fee rows are written only with the current unsent version of a DRAFT retainer' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fo_retainer_fee_row_write BEFORE INSERT OR UPDATE ON "fo_retainer_fee_row" FOR EACH ROW EXECUTE FUNCTION fo_retainer_fee_row_write();
