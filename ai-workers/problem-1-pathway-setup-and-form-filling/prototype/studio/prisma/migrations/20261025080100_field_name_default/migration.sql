-- Screen 02 slice 2 (Screen 04 M1): every shared field has a name and a group, whichever code path creates it (import,
-- sample load, an applied proposal, a merge's closing row). A create that gives none gets the same default as the
-- back-fill (first alias, else the key's last part), marked for a person to check (label_checked stays false).
CREATE FUNCTION canonical_field_name_default() RETURNS trigger AS $$
BEGIN
  IF NEW."group_key" IS NULL THEN NEW."group_key" := split_part(NEW."canonical_field_key", '.', 1); END IF;
  IF NEW."label" IS NULL OR NEW."label" = '' THEN
    NEW."label" := COALESCE(NULLIF(NEW."aliases"[1], ''), initcap(replace(split_part(NEW."canonical_field_key", '.', 2), '_', ' ')));
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER canonical_field_name_default BEFORE INSERT ON "canonical_field" FOR EACH ROW EXECUTE FUNCTION canonical_field_name_default();
-- Rollback: DROP TRIGGER canonical_field_name_default ON "canonical_field"; DROP FUNCTION canonical_field_name_default();
