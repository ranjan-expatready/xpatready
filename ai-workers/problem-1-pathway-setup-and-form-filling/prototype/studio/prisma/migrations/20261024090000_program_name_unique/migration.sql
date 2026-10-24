-- QA-14 (BR-6 in the database): one name per parent, compared ignoring case, spaces and punctuation. The app writes
-- name_key with contracts/programs.ts normalizeLabel; existing rows are filled here with the closest SQL equivalent
-- (NFKC, lower case, letters and digits). Rows that were already duplicates keep a null name_key (the oldest keeps the
-- name), so the index can be built on any existing data; they are listed by the query below and left for a person.
ALTER TABLE "program_def" ADD COLUMN "name_key" TEXT;
UPDATE "program_def" SET "name_key" = lower(regexp_replace(normalize("label", NFKC), '[^[:alnum:]]+', '', 'g'));
UPDATE "program_def" p SET "name_key" = NULL
  WHERE EXISTS (SELECT 1 FROM "program_def" o WHERE o."workspace_id" = p."workspace_id" AND o."parent_node_key" IS NOT DISTINCT FROM p."parent_node_key"
                AND o."name_key" = p."name_key" AND (o."created_at", o."id") < (p."created_at", p."id"));
CREATE UNIQUE INDEX "program_def_parent_name_key" ON "program_def" ("workspace_id", COALESCE("parent_node_key", ''), "name_key") WHERE "name_key" IS NOT NULL AND "name_key" <> '';
-- Legacy duplicates (to review): SELECT label, program_node_key FROM program_def WHERE name_key IS NULL;
-- Rollback (STANDARDS §5): DROP INDEX "program_def_parent_name_key"; ALTER TABLE "program_def" DROP COLUMN "name_key";
