-- F1-P (Screen 02 Q3, SA-1B-11, 12, 27): a list row's purpose and overflow on its field map, { kind, overflow }.
-- Expand only: existing rows keep null ("Purpose: not set", a release warning, never an error).
ALTER TABLE "form_field_map" ADD COLUMN "list_purpose" JSONB;
-- Rollback (STANDARDS §5): ALTER TABLE "form_field_map" DROP COLUMN "list_purpose";
