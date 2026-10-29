-- W1-15 Questions and documents, slice 1 (runtime lane; P-130, challenge M1, M6, m2). Expand only.
-- 1. A section whose questions only the client answers (P-97: declarations and background).
ALTER TABLE "logical_section" ADD COLUMN "client_only" BOOLEAN NOT NULL DEFAULT false;
-- 2. Whom a fact a document supplies is about, when not the holder ({ fact: "holder.spouse" | "holder.parent" }).
ALTER TABLE "document_type" ADD COLUMN "supplies_about" JSONB;
-- 3. A person's choice over the rules' default for one fact of one person role on a combination: where the answer
--    comes from, and the Pre-qualification tick. Versioned like document requirements.
CREATE TABLE "fact_source" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "combination_id" UUID NOT NULL,
  "lineage_key" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "canonical_field_key" TEXT NOT NULL,
  "source" TEXT,
  "document_type_key" TEXT,
  "prequalification" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "version" INTEGER NOT NULL,
  "status" "DefinitionStatus" NOT NULL,
  "supersedes_id" UUID,
  "origin" "Origin" NOT NULL,
  "updated_by" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fact_source_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fact_source_combination_id_fkey" FOREIGN KEY ("combination_id") REFERENCES "combination"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fact_source_source_check" CHECK ("source" IS NULL OR "source" IN ('DOCUMENT', 'CLIENT', 'AGENT')),
  CONSTRAINT "fact_source_document_check" CHECK ((COALESCE("source", '') = 'DOCUMENT') = ("document_type_key" IS NOT NULL))
);
CREATE UNIQUE INDEX "fact_source_combination_id_lineage_key_version_key" ON "fact_source" ("combination_id", "lineage_key", "version");
-- Rollback (STANDARDS §5): DROP TABLE "fact_source"; ALTER TABLE "document_type" DROP COLUMN "supplies_about";
--   ALTER TABLE "logical_section" DROP COLUMN "client_only";
