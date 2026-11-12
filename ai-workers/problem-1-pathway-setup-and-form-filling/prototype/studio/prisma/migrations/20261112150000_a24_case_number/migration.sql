-- A24-1 (P-492; founder ask A24; design product/design/case-structure-a24-2026-11-12.md §5.2 CS-1, CS-7, §5.3): a case
-- number, the firm's reference optional, and one principal (the case's client person) per case in the database.
-- Expand, backfill, constrain:
--   * firm_case_counter: one row per (workspace, firm, year), the next running number. runtime_next_case_number()
--     takes the next one inside the opening transaction (an upsert, so two officers opening at once wait on the row and
--     never share a number; a refused opening rolls its increment back, so no gap). Format AG-7-3: C-<year>-<5 digits>,
--     e.g. C-2026-00042; the year is the opening's in the firm's zone (America/Toronto, as the database and
--     api/src/earlier-facts.ts FIRM_ZONE); past 99999 the number grows to 6 digits and keeps working.
--   * runtime_case.case_number: added nullable, every existing case numbered by opening date (created_at, then id) per
--     firm and year with no gap, the counters set after them, then NOT NULL and unique per firm. Never changed after.
--   * runtime_case.reference: optional (the firm's own reference); still unique per firm when given.
--   * case_participant: at most one principal per case (an exclusion constraint, deferred to commit so Make principal's
--     two updates pass), and at least one at commit (a deferred trigger on the people and on a new case). A case deleted
--     in the same transaction (a reset) is not checked.
-- Rollback: drop trigger trg_case_participant_principal on case_participant and trg_runtime_case_with_principal on
-- runtime_case, function runtime_case_has_principal(); drop constraint case_participant_one_principal; drop trigger
-- trg_runtime_case_number_fixed and function runtime_case_number_fixed(); drop column runtime_case.case_number (its
-- unique index and check go with it); drop function runtime_next_case_number(uuid, text, timestamptz); drop table
-- firm_case_counter; set runtime_case.reference NOT NULL (only while every case has one).

-- Break m3, first so nothing is half done: every existing case has exactly one principal before the rule is added (the
-- app always wrote one); a copy where one has none stops here in words, never later as an error on that case's next change.
DO $$ DECLARE bad integer; BEGIN
  SELECT count(*) INTO bad FROM runtime_case k WHERE (SELECT count(*) FROM case_participant p WHERE p.case_id = k.id AND p.role = 'principal') <> 1;
  IF bad > 0 THEN RAISE EXCEPTION 'a24_case_number: % case(s) without exactly one principal; reset the demo (Demo › Reset) or fix them, then start again', bad; END IF;
END $$;

-- CreateTable
CREATE TABLE "firm_case_counter" (
    "workspace_id" UUID NOT NULL,
    "firm_key" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_value" INTEGER NOT NULL,
    CONSTRAINT "firm_case_counter_pkey" PRIMARY KEY ("workspace_id","firm_key","year"),
    CONSTRAINT "firm_case_counter_year_check" CHECK ("year" BETWEEN 2000 AND 9999),
    CONSTRAINT "firm_case_counter_next_check" CHECK ("next_value" >= 1)
);

-- The next case number of a firm, taken inside the caller's transaction (the opening's).
CREATE FUNCTION runtime_next_case_number(ws uuid, firm text, at timestamptz) RETURNS text LANGUAGE plpgsql AS $$
DECLARE y integer := extract(year FROM at AT TIME ZONE 'America/Toronto')::integer; n integer;
BEGIN
  INSERT INTO firm_case_counter (workspace_id, firm_key, year, next_value) VALUES (ws, firm, y, 2)
    ON CONFLICT (workspace_id, firm_key, year) DO UPDATE SET next_value = firm_case_counter.next_value + 1
    RETURNING next_value - 1 INTO n;
  RETURN 'C-' || y || '-' || lpad(n::text, greatest(5, length(n::text)), '0');
END $$;

-- AlterTable: the case number, nullable first
ALTER TABLE "runtime_case" ADD COLUMN "case_number" TEXT;

-- Backfill: every existing case by opening date, per workspace, firm and year, from 1 with no gap.
UPDATE "runtime_case" k SET "case_number" = 'C-' || n.y || '-' || lpad(n.seq::text, greatest(5, length(n.seq::text)), '0')
FROM (SELECT id, extract(year FROM created_at AT TIME ZONE 'America/Toronto')::integer AS y,
             row_number() OVER (PARTITION BY workspace_id, firm_key, extract(year FROM created_at AT TIME ZONE 'America/Toronto') ORDER BY created_at, id) AS seq
      FROM "runtime_case") n
WHERE k.id = n.id;
INSERT INTO "firm_case_counter" (workspace_id, firm_key, year, next_value)
SELECT workspace_id, firm_key, extract(year FROM created_at AT TIME ZONE 'America/Toronto')::integer, count(*) + 1
FROM "runtime_case" GROUP BY 1, 2, 3;

-- Then required, unique per firm, in the agreed shape, and never changed.
ALTER TABLE "runtime_case" ALTER COLUMN "case_number" SET NOT NULL;
ALTER TABLE "runtime_case" ADD CONSTRAINT "runtime_case_number_check" CHECK ("case_number" ~ '^C-[1-9][0-9]{3}-([0-9]{5}|[1-9][0-9]{5,})$');
CREATE UNIQUE INDEX "runtime_case_workspace_id_firm_key_case_number_key" ON "runtime_case"("workspace_id", "firm_key", "case_number");
CREATE FUNCTION runtime_case_number_fixed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.case_number IS DISTINCT FROM OLD.case_number THEN RAISE EXCEPTION 'case_number_fixed: a case keeps its case number (case %)', OLD.id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_runtime_case_number_fixed BEFORE UPDATE OF "case_number" ON "runtime_case" FOR EACH ROW EXECUTE FUNCTION runtime_case_number_fixed();

-- The firm's own reference: optional.
ALTER TABLE "runtime_case" ALTER COLUMN "reference" DROP NOT NULL;

-- At most one principal per case, checked at commit (Make principal moves the role with two updates).
ALTER TABLE "case_participant" ADD CONSTRAINT "case_participant_one_principal" EXCLUDE USING btree ("case_id" WITH =) WHERE ("role" = 'principal') DEFERRABLE INITIALLY DEFERRED;

-- At least one principal per case at commit: after any change to a case's people, and for a new case. A case deleted in
-- the same transaction (a reset) is not checked.
CREATE FUNCTION runtime_case_has_principal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ks uuid[]; k uuid;
BEGIN
  -- The case or cases whose people changed: a new case; a person added or removed; a person changed, and the case they
  -- left when moved to another.
  IF TG_TABLE_NAME = 'runtime_case' THEN ks := ARRAY[NEW.id];
  ELSIF TG_OP = 'INSERT' THEN ks := ARRAY[NEW.case_id];
  ELSIF TG_OP = 'DELETE' THEN ks := ARRAY[OLD.case_id];
  ELSE ks := ARRAY[NEW.case_id, OLD.case_id]; END IF;
  FOREACH k IN ARRAY ks LOOP
    IF EXISTS (SELECT 1 FROM runtime_case WHERE id = k) AND NOT EXISTS (SELECT 1 FROM case_participant WHERE case_id = k AND role = 'principal') THEN
      RAISE EXCEPTION 'case_one_principal: a case has exactly one principal, its client person (case %)', k; END IF;
  END LOOP;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_case_participant_principal AFTER INSERT OR UPDATE OF "role", "case_id" OR DELETE ON "case_participant" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION runtime_case_has_principal();
-- Named to fire after trg_runtime_case_stage (deferred triggers on one event fire in name order), so a case with neither
-- names its stage first, as before.
CREATE CONSTRAINT TRIGGER trg_runtime_case_with_principal AFTER INSERT ON "runtime_case" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION runtime_case_has_principal();
