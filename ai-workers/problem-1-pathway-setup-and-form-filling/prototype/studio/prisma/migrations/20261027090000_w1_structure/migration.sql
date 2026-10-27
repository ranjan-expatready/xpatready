-- W1-03 (concept §3, challenge B1, addendum A1/A2): several Pathways per Pathway type, and the lifecycle of structure
-- names and combinations (P-116 = P-52 L1–L6). Expand only: no row is moved or renamed (challenge M2).
-- 1. One name per parent, and at the top level one name per Pathway type: "Temporary residence" may exist under both
--    Retail and Corporate and employers, never twice in one type. client_type is set on PATHWAY rows only.
DROP INDEX IF EXISTS "program_def_parent_name_key";
CREATE UNIQUE INDEX "program_def_parent_type_name_key" ON "program_def" ("workspace_id", COALESCE("parent_node_key", ''), COALESCE("client_type", ''), "name_key") WHERE "name_key" IS NOT NULL AND "name_key" <> '';
-- 2. A version for stale-edit checks on rename and locations (409 with the current row), and who retired a name when.
ALTER TABLE "program_def" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "program_def" ADD COLUMN "retired_at" TIMESTAMPTZ;
ALTER TABLE "program_def" ADD COLUMN "retired_by" TEXT;
-- 3. A retired combination: set by the release that carries its approved retire. No new case opens on it; open cases
--    keep their pinned release (P-52 L2).
ALTER TABLE "combination" ADD COLUMN "retired_at" TIMESTAMPTZ;
ALTER TABLE "combination" ADD COLUMN "retired_by" TEXT;
-- Rollback (STANDARDS §5):
--   ALTER TABLE "combination" DROP COLUMN "retired_by", DROP COLUMN "retired_at";
--   ALTER TABLE "program_def" DROP COLUMN "retired_by", DROP COLUMN "retired_at", DROP COLUMN "version";
--   DROP INDEX "program_def_parent_type_name_key";
--   CREATE UNIQUE INDEX "program_def_parent_name_key" ON "program_def" ("workspace_id", COALESCE("parent_node_key", ''), "name_key") WHERE "name_key" IS NOT NULL AND "name_key" <> '';
--   (the old index cannot be built while two Pathways of different types share a name: rename one first)
