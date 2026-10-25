-- Screen 02 FIX (Lead re-check 25 Oct, item 5; as QA-14 did for program names): one shared-field name per group in a
-- workspace, in the database and not only in the app's check (library-changes.ts sameName). Field rows are versioned,
-- so the name is reserved per key in its own table, kept by a trigger; a second key with the same name is refused by
-- the unique index (23505, answered as 409 "already exists"). Compared ignoring case, spaces and punctuation for plain
-- ASCII names; a name in another script is compared as written (lower case, spaces tidied), so the database never
-- refuses what the app's own rule (normalizeLabel) allows. A merged-away field frees its name.
CREATE TABLE "canonical_field_name" (
  "workspace_id" UUID NOT NULL,
  "canonical_field_key" TEXT NOT NULL,
  "group_key" TEXT NOT NULL,
  "name_key" TEXT NOT NULL,
  PRIMARY KEY ("workspace_id", "canonical_field_key")
);
CREATE FUNCTION canonical_field_name_key(label TEXT) RETURNS TEXT AS $$
  SELECT CASE WHEN label ~ '^[\x20-\x7E]*$' THEN lower(regexp_replace(label, '[^A-Za-z0-9]+', '', 'g')) ELSE lower(regexp_replace(btrim(label), '\s+', ' ', 'g')) END
$$ LANGUAGE sql IMMUTABLE;
CREATE FUNCTION canonical_field_name_reserve() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM "canonical_field" WHERE "workspace_id" = OLD."workspace_id" AND "canonical_field_key" = OLD."canonical_field_key") THEN
      DELETE FROM "canonical_field_name" WHERE "workspace_id" = OLD."workspace_id" AND "canonical_field_key" = OLD."canonical_field_key";
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."merged_into_key" IS NOT NULL THEN
    DELETE FROM "canonical_field_name" WHERE "workspace_id" = NEW."workspace_id" AND "canonical_field_key" = NEW."canonical_field_key";
  ELSIF NEW."status" <> 'SUPERSEDED' THEN
    INSERT INTO "canonical_field_name" VALUES (NEW."workspace_id", NEW."canonical_field_key", COALESCE(NEW."group_key", ''), canonical_field_name_key(COALESCE(NEW."label", '')))
      ON CONFLICT ("workspace_id", "canonical_field_key") DO UPDATE SET "group_key" = EXCLUDED."group_key", "name_key" = EXCLUDED."name_key";
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
-- Existing names (the oldest key keeps a name already used twice; none in the sample data).
INSERT INTO "canonical_field_name"
  SELECT DISTINCT ON (f."workspace_id", f."canonical_field_key") f."workspace_id", f."canonical_field_key", COALESCE(f."group_key", ''), canonical_field_name_key(COALESCE(f."label", ''))
  FROM "canonical_field" f WHERE f."merged_into_key" IS NULL ORDER BY f."workspace_id", f."canonical_field_key", f."version" DESC
  ON CONFLICT DO NOTHING;
UPDATE "canonical_field_name" n SET "name_key" = ''
  WHERE EXISTS (SELECT 1 FROM "canonical_field_name" o WHERE o."workspace_id" = n."workspace_id" AND o."group_key" = n."group_key" AND o."name_key" = n."name_key" AND o."canonical_field_key" < n."canonical_field_key");
CREATE UNIQUE INDEX "canonical_field_name_unique" ON "canonical_field_name" ("workspace_id", "group_key", "name_key") WHERE "name_key" <> '';
CREATE TRIGGER canonical_field_name_reserve AFTER INSERT OR UPDATE OF "label", "group_key", "merged_into_key", "status" OR DELETE ON "canonical_field" FOR EACH ROW EXECUTE FUNCTION canonical_field_name_reserve();
-- Legacy duplicates (to review): SELECT canonical_field_key FROM canonical_field_name WHERE name_key = '';
-- Rollback (STANDARDS §5): DROP TRIGGER canonical_field_name_reserve ON "canonical_field"; DROP FUNCTION canonical_field_name_reserve(); DROP FUNCTION canonical_field_name_key(TEXT); DROP TABLE "canonical_field_name";
