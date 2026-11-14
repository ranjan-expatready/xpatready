-- PF-25 (rows rev 15, rev 16; P-599, P-600; SA-2-27, SA2-D8, AG-4-16, AG-4-17, AG01-1): each firm's own web address
-- `<address>.expatready.com`. Schema: prisma/schema/platform-web-address.prisma, and platform_firm's two back-relations on
-- PF-25's own slot line in platform.prisma (no platform_firm column). Additive only: two new tables and their rules, and
-- one AFTER INSERT trigger on platform_firm for the Sample firms; no existing table, column or row changes.
--   * platform_firm_web_address: a firm's address, one per firm, unique: one DNS label (lower-case letters, digits,
--     hyphens; 3-63 characters; no hyphen at either end; not xn--), not one of ExpatReady's reserved names (Sample: www,
--     api, app, admin, mail, status, help, book, portal). A firm has none until sign-up (PF-5) gives it. Never removed.
--   * platform_firm_address_history: each change by ExpatReady staff (old address, new address, until, reason, who),
--     a first address set by staff included (no old address, no until). Insert-only. The old address redirects to the
--     firm's current one until `until` (exactly 90 days after changed_at, both set here; SA2-D8) and no other firm may
--     take it before.
--   * rules Prisma cannot say: the shape and reserved names (checks); an address changes only together with its redirect
--     record, written first in the same transaction, and every record is matched by its change at commit; a history row
--     names the firm's address as it is; a held address is never taken by another firm; a row never moves firm and is
--     never removed; a reason is 3-500 characters with no control or direction character; one advisory lock per
--     address, so two transactions never both take or hold one address (writes under READ COMMITTED only, so the checks
--     see each other's commits).
--   * data: a Sample firm (key `sample-…`) gets its key as its address, now and whenever one is inserted later
--     (api/src/platform/seed-sample-firms.ts runs after migrations on an empty copy), when the key is an allowed address
--     that is free: the one trigger on platform_firm (AFTER INSERT; Lead B's table, for the release holder). No other
--     firm gets one from its key, and no person may choose an address starting with sample- (service rule).
-- Every function carries the platform_ prefix (rows rev 15.2).
-- Rollback: DROP TRIGGER "platform_firm_web_address_sample" ON "platform_firm"; DROP TABLE
--   "platform_firm_address_history", "platform_firm_web_address"; DROP FUNCTION platform_firm_web_address_sample(),
--   platform_firm_web_address_rules(), platform_firm_web_address_kept(), platform_firm_address_history_insert_only(),
--   platform_firm_address_history_names_current(), platform_firm_address_history_followed(),
--   platform_web_address_reason_ok(text), platform_web_address_free_for(text, uuid),
--   platform_web_address_held_by_other(text, uuid), platform_web_address_lock(text), platform_web_address_allowed(text);
--   delete this folder's row from _prisma_migrations.

-- CreateTable
CREATE TABLE "platform_firm_web_address" (
    "firm_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "set_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "platform_firm_web_address_pkey" PRIMARY KEY ("firm_id")
);

-- CreateTable
CREATE TABLE "platform_firm_address_history" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "old_address" TEXT,
    "new_address" TEXT NOT NULL,
    "until" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_firm_address_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_firm_web_address_address_key" ON "platform_firm_web_address"("address");

-- CreateIndex
CREATE INDEX "platform_firm_address_history_firm_id_changed_at_idx" ON "platform_firm_address_history"("firm_id", "changed_at");

-- CreateIndex
CREATE INDEX "platform_firm_address_history_old_address_until_idx" ON "platform_firm_address_history"("old_address", "until");

-- AddForeignKey
ALTER TABLE "platform_firm_web_address" ADD CONSTRAINT "platform_firm_web_address_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_firm_address_history" ADD CONSTRAINT "platform_firm_address_history_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------------- rules (PF-25)

-- The shape of an address and the reserved names, as api/src/platform/web-address/rules.ts checks them.
CREATE FUNCTION platform_web_address_allowed(a text) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT a ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'
     AND a NOT LIKE 'xn--%'
     AND a <> ALL (ARRAY['www', 'api', 'app', 'admin', 'mail', 'status', 'help', 'book', 'portal'])
$$;
-- A reason: 3-500 characters once spaces of any kind (also no-break and zero-width) are trimmed; no control or
-- direction-changing character (break m6, m9). The service applies the same rule (service.ts readReason).
CREATE FUNCTION platform_web_address_reason_ok(r text) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT length(regexp_replace(r, '^[\s\u00a0\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\s\u00a0\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]+$', '', 'g')) BETWEEN 3 AND 500
     AND r !~ '[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]'
$$;
ALTER TABLE "platform_firm_web_address"
  ADD CONSTRAINT "platform_firm_web_address_allowed" CHECK (platform_web_address_allowed("address")),
  ADD CONSTRAINT "platform_firm_web_address_set_by" CHECK ("set_by" ~ '^(staff|system|seed):[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$');
ALTER TABLE "platform_firm_address_history"
  ADD CONSTRAINT "platform_firm_address_history_addresses" CHECK (("old_address" IS NULL OR platform_web_address_allowed("old_address")) AND platform_web_address_allowed("new_address") AND "old_address" IS DISTINCT FROM "new_address"),
  ADD CONSTRAINT "platform_firm_address_history_until" CHECK (("old_address" IS NULL AND "until" IS NULL) OR ("old_address" IS NOT NULL AND "until" = "changed_at" + interval '90 days')),
  ADD CONSTRAINT "platform_firm_address_history_reason" CHECK (platform_web_address_reason_ok("reason")),
  ADD CONSTRAINT "platform_firm_address_history_changed_by" CHECK ("changed_by" ~ '^(staff|system|seed):[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$');

-- One lock per address for the rest of the transaction: whoever takes or holds an address waits for anyone else doing so,
-- so the checks below see the other's commit. That needs READ COMMITTED (each check a new snapshot): under REPEATABLE
-- READ or SERIALIZABLE a check would read an old snapshot (break m6), so writes there are refused. The app's
-- transactions are READ COMMITTED (PostgreSQL's default).
CREATE FUNCTION platform_web_address_lock(a text) RETURNS void LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'platform_web_address_lock: web addresses are written under READ COMMITTED only (this is %)', current_setting('transaction_isolation') USING ERRCODE = 'invalid_transaction_state';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('platform_web_address:' || a, 0));
END $$;

-- An address another firm gave up less than 90 days ago (its history row's until is still ahead on the database's clock;
-- the service decides on ClockPort, the same time in production, and the database is the backstop).
CREATE FUNCTION platform_web_address_held_by_other(a text, firm uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM "platform_firm_address_history" h WHERE h."old_address" = a AND h."firm_id" <> firm AND h."until" > now())
$$;

-- Free for this firm: allowed, no other firm has it, no other firm holds it.
CREATE FUNCTION platform_web_address_free_for(a text, firm uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT platform_web_address_allowed(a)
     AND NOT EXISTS (SELECT 1 FROM "platform_firm_web_address" w WHERE w."address" = a AND w."firm_id" <> firm)
     AND NOT platform_web_address_held_by_other(a, firm)
$$;

-- On platform_firm_web_address: a held address is never taken; a row never moves firm; an address changes only with its
-- redirect record (written first, in this transaction, from this address to the new one).
CREATE FUNCTION platform_firm_web_address_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."firm_id" IS DISTINCT FROM OLD."firm_id" THEN
    RAISE EXCEPTION 'platform_firm_web_address_rules: a web address never moves to another firm' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."address" = OLD."address" THEN
    RETURN NEW;
  END IF;
  PERFORM platform_web_address_lock(NEW."address");
  IF platform_web_address_held_by_other(NEW."address", NEW."firm_id") THEN
    RAISE EXCEPTION 'platform_firm_web_address_rules: the address % is held for another firm''s redirect', NEW."address" USING ERRCODE = 'unique_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND NOT EXISTS (
    SELECT 1 FROM "platform_firm_address_history" h
    WHERE h."firm_id" = NEW."firm_id" AND h."old_address" = OLD."address" AND h."new_address" = NEW."address" AND h."changed_at" = now()
  ) THEN
    RAISE EXCEPTION 'platform_firm_web_address_rules: a firm''s web address changes only with its redirect record (% stays)', OLD."address" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_firm_web_address_rules" BEFORE INSERT OR UPDATE ON "platform_firm_web_address" FOR EACH ROW EXECUTE FUNCTION platform_firm_web_address_rules();

-- A firm's address is never removed (its old links would answer for no one).
CREATE FUNCTION platform_firm_web_address_kept() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'platform_firm_web_address_kept: a firm''s web address is never removed (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "platform_firm_web_address_kept" BEFORE DELETE ON "platform_firm_web_address" FOR EACH ROW EXECUTE FUNCTION platform_firm_web_address_kept();
CREATE TRIGGER "platform_firm_web_address_no_truncate" BEFORE TRUNCATE ON "platform_firm_web_address" FOR EACH STATEMENT EXECUTE FUNCTION platform_firm_web_address_kept();

-- On the history: insert-only.
CREATE FUNCTION platform_firm_address_history_insert_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'platform_firm_address_history_insert_only: address history is never changed or removed (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "platform_firm_address_history_insert_only" BEFORE UPDATE OR DELETE ON "platform_firm_address_history" FOR EACH ROW EXECUTE FUNCTION platform_firm_address_history_insert_only();
CREATE TRIGGER "platform_firm_address_history_no_truncate" BEFORE TRUNCATE ON "platform_firm_address_history" FOR EACH STATEMENT EXECUTE FUNCTION platform_firm_address_history_insert_only();

-- A history row names the firm's address as it is now (no made-up hold on someone's address), or no old address for a
-- firm that has none. changed_at is always the database's own transaction time and until exactly 90 days after it,
-- whatever the writer sent: the address trigger above can then tell a record written in this transaction (savepoints
-- included), and no hold is shorter or longer than SA2-D8's 90 days (break m6).
CREATE FUNCTION platform_firm_address_history_names_current() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM platform_web_address_lock(coalesce(NEW."old_address", NEW."new_address"));
  IF NEW."old_address" IS NULL THEN
    IF EXISTS (SELECT 1 FROM "platform_firm_web_address" w WHERE w."firm_id" = NEW."firm_id") THEN
      RAISE EXCEPTION 'platform_firm_address_history_names_current: this firm has a web address, so the record names it' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM "platform_firm_web_address" w WHERE w."firm_id" = NEW."firm_id" AND w."address" = NEW."old_address") THEN
    RAISE EXCEPTION 'platform_firm_address_history_names_current: % is not this firm''s web address', NEW."old_address" USING ERRCODE = 'check_violation';
  END IF;
  NEW."changed_at" := now();
  NEW."until" := CASE WHEN NEW."old_address" IS NULL THEN NULL ELSE now() + interval '90 days' END;
  RETURN NEW;
END $$;
CREATE TRIGGER "platform_firm_address_history_names_current" BEFORE INSERT ON "platform_firm_address_history" FOR EACH ROW EXECUTE FUNCTION platform_firm_address_history_names_current();

-- At commit, every history row written is matched by the change it records (break m6: a record with no change would hold
-- an address for nothing): the firm's address is its new address, or a later record in the same transaction moved on
-- from it.
CREATE FUNCTION platform_firm_address_history_followed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "platform_firm_web_address" w WHERE w."firm_id" = NEW."firm_id" AND w."address" = NEW."new_address")
     AND NOT EXISTS (SELECT 1 FROM "platform_firm_address_history" h WHERE h."firm_id" = NEW."firm_id" AND h."old_address" = NEW."new_address" AND h."changed_at" = NEW."changed_at" AND h."id" <> NEW."id") THEN
    RAISE EXCEPTION 'platform_firm_address_history_followed: a record of a change to % was written but the address did not change', NEW."new_address" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "platform_firm_address_history_followed" AFTER INSERT ON "platform_firm_address_history" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION platform_firm_address_history_followed();

-- The Sample firms' address from their key: now, and for a Sample firm inserted later. Only when the key is free, so the
-- Sample seed never fails on it. The one PF-25 trigger on platform_firm (Lead B's table; listed for the release holder).
-- The service never lets a person choose an address starting with sample- (rules.ts checkAddressChoice; break m10).
CREATE FUNCTION platform_firm_web_address_sample() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."key" LIKE 'sample-%' AND platform_web_address_allowed(NEW."key") THEN
    PERFORM platform_web_address_lock(NEW."key");
    IF platform_web_address_free_for(NEW."key", NEW."id") THEN
      INSERT INTO "platform_firm_web_address" ("firm_id", "address", "set_by", "updated_at") VALUES (NEW."id", NEW."key", 'seed:PF-25', now());
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER "platform_firm_web_address_sample" AFTER INSERT ON "platform_firm" FOR EACH ROW EXECUTE FUNCTION platform_firm_web_address_sample();

INSERT INTO "platform_firm_web_address" ("firm_id", "address", "set_by", "updated_at")
SELECT f."id", f."key", 'seed:PF-25', now() FROM "platform_firm" f
WHERE f."key" LIKE 'sample-%' AND platform_web_address_free_for(f."key", f."id")
ORDER BY f."key";
