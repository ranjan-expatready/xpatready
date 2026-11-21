-- migration · PF-15 part 1b (brief design/lead-b-briefs/PF-15.md, DW3's booking, DW4, DW5; SA-3-58..61, SA-4-56):
-- a firm's booked move to another plan. Schema: prisma/schema/platform-entitlements.prisma (+ back-relations in
-- platform.prisma). Additive, plus one function replaced in place (platform_entitlement_limit, same arguments and
-- result). The stamp is set at PR time (P-600).
--   * platform_subscription_change: one row per booking. At most one open (neither withdrawn nor applied) per firm, by a
--     partial unique index. Its insert is stamped by the database: the time (clock, after the subscription's lock), the
--     live subscription and the plan it moves from, and when it takes effect: during a trial at once (applied in the same
--     insert, the trial end unchanged: SA-3-61, SA-4-56), otherwise at the next renewal (SA-3-60). Afterwards only
--     withdrawn_at or applied_at is set, once each, never both; never deleted. Applying it moves the live subscription to
--     the target plan (still from the plan it was booked from, or nothing changes and the apply is refused).
--   * platform_entitlement_limit: as before (PF-15 part 2), and while a move is open every metric uses the lower of the
--     current and the target plan's limit (SA-3-59; null = Unlimited, no row = 0). Only a booking made on the live
--     subscription, still on the plan it was booked from, counts (review m1: a booking left by an ended subscription or
--     overtaken by another plan change lowers nothing; the daily job withdraws it).
--   * Outside a trial a raise (by price, where both plans have one) is refused: it applies at once through Stripe (PF-16).
-- Renewal (Unconfirmed, as PF-15 part 2): platform_subscription keeps no billing period on main, so the next renewal is
-- current_period_end when it is still ahead (Stripe's own period end, a year or a month: PF-5 part 2 stores it), else
-- monthly from current_period_end, else trial_ends_at, else created_at. Dates are worked out in UTC.
-- Who may book: the firm's own session (the walls apply); the app checks the Owner, the downgrade conflicts (SA-3-58: no
-- booking while any remains) and the firm's lock before it inserts (entitlements/plan-booking.ts).
-- Rollback (as the migration's owner; on a role that is not superuser, first ALTER FUNCTION … OWNER TO CURRENT_USER for
--   the two functions PF-12's pattern gives to xr_wall_reader): DROP TABLE "platform_subscription_change";
--   DROP FUNCTION platform_subscription_change_book(), platform_subscription_change_kept();
--   re-run the CREATE FUNCTION platform_entitlement_limit(text, text, timestamptz, timestamptz) block of
--   20261119051500_pf15_limit_changes as CREATE OR REPLACE; delete this folder's row from _prisma_migrations. A plan an
--   applied booking wrote to platform_subscription stays (the rows hold from and to).

CREATE TABLE "platform_subscription_change" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "from_plan_id" UUID NOT NULL,
    "to_plan_id" UUID NOT NULL,
    "booked_by" TEXT NOT NULL,
    "booked_at" TIMESTAMPTZ NOT NULL,
    "effective_at" TIMESTAMPTZ NOT NULL,
    "withdrawn_at" TIMESTAMPTZ,
    "applied_at" TIMESTAMPTZ,

    CONSTRAINT "platform_subscription_change_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_subscription_change_firm_id_idx" ON "platform_subscription_change"("firm_id");
CREATE INDEX "platform_subscription_change_effective_at_idx" ON "platform_subscription_change"("effective_at");

ALTER TABLE "platform_subscription_change" ADD CONSTRAINT "platform_subscription_change_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "platform_firm"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "platform_subscription_change" ADD CONSTRAINT "platform_subscription_change_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "platform_subscription"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "platform_subscription_change" ADD CONSTRAINT "platform_subscription_change_from_plan_id_fkey" FOREIGN KEY ("from_plan_id") REFERENCES "platform_plan"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "platform_subscription_change" ADD CONSTRAINT "platform_subscription_change_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "platform_plan"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ------------------------------------------------------------------------------------------ rules Prisma cannot say
-- One open booking per firm (a second one, or two at once, is refused here whatever the app does).
CREATE UNIQUE INDEX "platform_subscription_change_one_open" ON "platform_subscription_change"("firm_id") WHERE "withdrawn_at" IS NULL AND "applied_at" IS NULL;
ALTER TABLE "platform_subscription_change" ADD CONSTRAINT "platform_subscription_change_values_ok" CHECK (
  "from_plan_id" <> "to_plan_id" AND "effective_at" >= "booked_at" AND NOT ("withdrawn_at" IS NOT NULL AND "applied_at" IS NOT NULL)
  AND ("withdrawn_at" IS NULL OR "withdrawn_at" >= "booked_at") AND ("applied_at" IS NULL OR "applied_at" >= "effective_at")
  AND isfinite("booked_at") AND isfinite("effective_at") AND ("withdrawn_at" IS NULL OR isfinite("withdrawn_at")) AND ("applied_at" IS NULL OR isfinite("applied_at"))
  AND "booked_by" ~ '^(staff|system|seed):');

-- The booking itself: under the live subscription's row lock, stamp the time, the subscription, the plan it moves from
-- and when it takes effect; during a trial apply it at once. Owned by xr_wall_reader (it writes the subscription).
CREATE FUNCTION platform_subscription_change_book() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp SET TimeZone = 'UTC' AS $fn$
DECLARE s record; anchor timestamptz; at timestamptz; n integer; cur_price integer; new_price integer;
BEGIN
  SELECT id, plan_id, status, current_period_end AS pe, trial_ends_at AS te, created_at AS ca INTO s
    FROM platform_subscription WHERE firm_id = NEW.firm_id AND status <> 'ENDED' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'platform_subscription_change: the firm has no live subscription' USING ERRCODE = '23514'; END IF;
  IF s.status = 'PAYMENT_HOLD' THEN RAISE EXCEPTION 'platform_subscription_change: the firm is on payment hold' USING ERRCODE = '23514'; END IF;
  PERFORM 1 FROM platform_plan WHERE id = NEW.to_plan_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'platform_subscription_change: no such active plan' USING ERRCODE = '23503'; END IF;
  IF s.plan_id = NEW.to_plan_id THEN RAISE EXCEPTION 'platform_subscription_change: the firm is already on that plan' USING ERRCODE = '23514'; END IF;
  NEW.subscription_id := s.id; NEW.from_plan_id := s.plan_id;
  NEW.booked_at := date_trunc('milliseconds', clock_timestamp()); NEW.withdrawn_at := NULL;
  -- A trial whose end has passed is no longer a trial for this rule (break m3: free switches only while it runs).
  IF s.status = 'TRIAL' AND (s.te IS NULL OR s.te > NEW.booked_at) THEN   -- SA-3-61, SA-4-56: at once, nothing charged, the trial end stays
    NEW.effective_at := NEW.booked_at; NEW.applied_at := NEW.booked_at;
    UPDATE platform_subscription SET plan_id = NEW.to_plan_id, updated_at = NEW.booked_at WHERE id = s.id;
    RETURN NEW;
  END IF;
  NEW.applied_at := NULL;
  -- A raise is never booked for the renewal (SA4-D28(a): it applies at once, charged, through Stripe: PF-16), so a
  -- booking can never give a firm more than it pays for (break B1). A raise: a dearer price where both plans carry one
  -- (prices live in Stripe on main), or a target allowing more on any metric (seats, or a limit higher or Unlimited
  -- where today's is finite; no row = 0).
  SELECT monthly_price_cents INTO cur_price FROM platform_plan WHERE id = s.plan_id;
  SELECT monthly_price_cents INTO new_price FROM platform_plan WHERE id = NEW.to_plan_id;
  IF (cur_price IS NOT NULL AND new_price IS NOT NULL AND new_price > cur_price)
     OR (SELECT t.seats_limit > c.seats_limit FROM platform_plan t, platform_plan c WHERE t.id = NEW.to_plan_id AND c.id = s.plan_id)
     OR EXISTS (SELECT 1 FROM (
          SELECT CASE WHEN cl.plan_id IS NULL THEN 0 ELSE cl.limit_value END AS c_eff, CASE WHEN tl.plan_id IS NULL THEN 0 ELSE tl.limit_value END AS t_eff
          FROM unnest(enum_range(NULL::platform_limit_metric)) AS m(metric)
          LEFT JOIN platform_plan_limit cl ON cl.plan_id = s.plan_id AND cl.metric = m.metric
          LEFT JOIN platform_plan_limit tl ON tl.plan_id = NEW.to_plan_id AND tl.metric = m.metric) v
        WHERE v.c_eff IS NOT NULL AND (v.t_eff IS NULL OR v.t_eff > v.c_eff)) THEN
    RAISE EXCEPTION 'platform_subscription_change: a raise applies at once, it is not booked' USING ERRCODE = '23514';
  END IF;
  IF isfinite(s.pe) AND s.pe > NEW.booked_at THEN at := s.pe;   -- Stripe's period end, still ahead: the renewal
  ELSE
    anchor := CASE WHEN isfinite(s.pe) THEN s.pe WHEN isfinite(s.te) THEN s.te ELSE s.ca END;
    n := greatest(0, (extract(year FROM age(NEW.booked_at, anchor)) * 12 + extract(month FROM age(NEW.booked_at, anchor)))::int - 1);
    at := anchor + n * interval '1 month';
    WHILE at <= NEW.booked_at LOOP n := n + 1; at := anchor + n * interval '1 month'; END LOOP;
  END IF;
  NEW.effective_at := date_trunc('milliseconds', at + interval '999 microseconds');
  RETURN NEW;
END $fn$;
CREATE TRIGGER "platform_subscription_change_book" BEFORE INSERT ON "platform_subscription_change" FOR EACH ROW EXECUTE FUNCTION platform_subscription_change_book();

-- Afterwards: only withdrawn_at or applied_at, once each, never both; applying moves the live subscription, which must
-- still be on the plan the booking moves from. Never deleted.
CREATE FUNCTION platform_subscription_change_kept() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp AS $fn$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'platform_subscription_change: a booking is a record, never removed' USING ERRCODE = '23514'; END IF;
  IF (NEW.id, NEW.firm_id, NEW.subscription_id, NEW.from_plan_id, NEW.to_plan_id, NEW.booked_by, NEW.booked_at, NEW.effective_at)
     IS DISTINCT FROM (OLD.id, OLD.firm_id, OLD.subscription_id, OLD.from_plan_id, OLD.to_plan_id, OLD.booked_by, OLD.booked_at, OLD.effective_at)
     OR OLD.withdrawn_at IS NOT NULL OR OLD.applied_at IS NOT NULL THEN
    RAISE EXCEPTION 'platform_subscription_change: only an open booking is withdrawn or applied, once' USING ERRCODE = '23514';
  END IF;
  IF NEW.withdrawn_at IS NOT NULL THEN NEW.withdrawn_at := greatest(clock_timestamp(), NEW.booked_at); END IF;   -- the database's time (break m4)
  IF NEW.applied_at IS NOT NULL THEN
    PERFORM 1 FROM platform_plan WHERE id = NEW.to_plan_id AND active;   -- break m2: never onto a plan switched off since
    IF NOT FOUND THEN RAISE EXCEPTION 'platform_subscription_change: the plan it moves to is no longer offered' USING ERRCODE = '23514'; END IF;
    UPDATE platform_subscription SET plan_id = NEW.to_plan_id, updated_at = NEW.applied_at
      WHERE id = NEW.subscription_id AND status NOT IN ('ENDED', 'PAYMENT_HOLD') AND plan_id = NEW.from_plan_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'platform_subscription_change: the subscription is no longer live on the plan it was booked from' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END $fn$;
CREATE TRIGGER "platform_subscription_change_kept" BEFORE UPDATE OR DELETE ON "platform_subscription_change" FOR EACH ROW EXECUTE FUNCTION platform_subscription_change_kept();
CREATE TRIGGER "platform_subscription_change_no_truncate" BEFORE TRUNCATE ON "platform_subscription_change" FOR EACH STATEMENT EXECUTE FUNCTION platform_subscription_change_kept();

-- The firm's session inserts and updates its own rows (the triggers check the rest); it never deletes.
REVOKE DELETE, TRUNCATE ON "platform_subscription_change" FROM xr_data;

-- ------------------------------------------------------------------------------------------- PF-12's walls (#1910)
ALTER TABLE "platform_subscription_change" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY "pf12_firm" ON "platform_subscription_change" USING ("firm_id" = platform_session_firm()) WITH CHECK ("firm_id" = platform_session_firm());
CREATE TRIGGER "0_pf12_firm_first" BEFORE INSERT OR UPDATE ON "platform_subscription_change" FOR EACH ROW EXECUTE FUNCTION platform_firm_first('firm_id');
ALTER FUNCTION platform_subscription_change_kept() SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION platform_subscription_change_kept() OWNER TO xr_wall_reader;
ALTER FUNCTION platform_subscription_change_book() OWNER TO xr_wall_reader;

-- ------------------------------------------------------------------------------------------- the one limit read
-- Part 2's function, unchanged in its own part (now the CTE `base`), and then SA-3-59: while a move is open, the lower of
-- the current limit and the target plan's (null = Unlimited; a target with no row for a metric: 0).
CREATE OR REPLACE FUNCTION platform_entitlement_limit(p_firm text, p_metric text, p_hard_since timestamptz, p_now timestamptz)
  RETURNS TABLE (firm_id uuid, plan_code text, plan_name text, seats integer, limit_value integer, has_row boolean, storage_hard boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp
  AS $fn$ WITH f AS (
            SELECT f.id FROM platform_firm f
            WHERE (f.id::text = lower(p_firm) OR f.key = p_firm)
              AND (platform_session_firm() IS NULL OR platform_session_firm() = f.id)   -- a firm's session reads only itself
            ORDER BY (f.id::text = lower(p_firm)) DESC LIMIT 1
          ), cur AS (
            SELECT f.id, s.id AS sub_id, s.created_at AS since, p.id AS plan_id, p.code, p.name, p.seats_limit, l.limit_value, l.plan_id IS NOT NULL AS has_row
            FROM f LEFT JOIN platform_subscription s ON s.firm_id = f.id AND s.status <> 'ENDED'   -- one live row (index platform_subscription_one_live)
            LEFT JOIN platform_plan p ON p.id = s.plan_id
            LEFT JOIN platform_plan_limit l ON l.plan_id = p.id AND l.metric::text = p_metric
          ), pending AS (   -- SA-3-43: lowerings not yet in effect for this firm, approved while its subscription was live
            SELECT c.old_value FROM cur JOIN platform_limit_change c ON c.plan_id = cur.plan_id AND c.metric = p_metric AND c.lowered AND c.approved_at >= cur.since
            JOIN platform_limit_change_firm r ON r.change_id = c.id AND r.firm_id = cur.id AND r.effective_at > p_now
          ), kept AS (   -- the highest value it had before any of them (null: Unlimited)
            SELECT CASE WHEN bool_or(old_value IS NULL) THEN NULL ELSE max(old_value) END AS old_value FROM pending HAVING count(*) > 0
          ), base AS (
            SELECT cur.id, cur.sub_id, cur.plan_id, cur.code, cur.name,
              CASE WHEN p_metric = 'SEATS' AND EXISTS (SELECT 1 FROM kept) THEN greatest(cur.seats_limit, (SELECT old_value FROM kept)) ELSE cur.seats_limit END AS seats,
              CASE WHEN p_metric <> 'SEATS' AND EXISTS (SELECT 1 FROM kept) THEN
                CASE WHEN cur.limit_value IS NULL OR (SELECT old_value FROM kept) IS NULL THEN NULL ELSE greatest(cur.limit_value, (SELECT old_value FROM kept)) END
              ELSE cur.limit_value END AS limit_value,
              cur.has_row
            FROM cur
          ), booked AS (   -- PF-15 part 1b, SA-3-59: the open booking's target plan (at most one: platform_subscription_change_one_open)
            SELECT t.seats_limit AS seats, tl.limit_value, tl.plan_id IS NOT NULL AS has_row
            FROM base JOIN platform_subscription_change b ON b.firm_id = base.id AND b.subscription_id = base.sub_id AND b.withdrawn_at IS NULL AND b.applied_at IS NULL AND b.from_plan_id = base.plan_id
            JOIN platform_plan t ON t.id = b.to_plan_id
            LEFT JOIN platform_plan_limit tl ON tl.plan_id = t.id AND tl.metric::text = p_metric
          )
          SELECT base.id, base.code, base.name,
            CASE WHEN EXISTS (SELECT 1 FROM booked) THEN least(base.seats, (SELECT seats FROM booked)) ELSE base.seats END,
            CASE WHEN p_metric <> 'SEATS' AND EXISTS (SELECT 1 FROM booked) THEN (
              SELECT CASE WHEN a IS NULL THEN b WHEN b IS NULL THEN a ELSE least(a, b) END
              FROM (SELECT CASE WHEN base.has_row THEN base.limit_value ELSE 0 END AS a, CASE WHEN booked.has_row THEN booked.limit_value ELSE 0 END AS b FROM booked) v)
            ELSE base.limit_value END,
            base.has_row OR (p_metric <> 'SEATS' AND EXISTS (SELECT 1 FROM booked)),
            COALESCE((SELECT o.back_under_at IS NULL AND o.first_over_at <= p_hard_since FROM platform_storage_over o WHERE o.firm_id = base.id), false)
          FROM base $fn$;
