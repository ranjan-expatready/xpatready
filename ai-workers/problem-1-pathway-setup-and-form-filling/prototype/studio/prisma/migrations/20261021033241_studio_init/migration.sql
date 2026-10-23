-- CreateEnum
CREATE TYPE "DefinitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProgramNodeKind" AS ENUM ('PATHWAY', 'PROGRAM', 'STREAM', 'CATEGORY');

-- CreateEnum
CREATE TYPE "FieldDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "FieldScope" AS ENUM ('CLIENT_LEVEL', 'CASE_LEVEL');

-- CreateEnum
CREATE TYPE "ConditionEffect" AS ENUM ('SHOW', 'HIDE', 'REQUIRE', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "AttachMode" AS ENUM ('COMBINATION_MANDATORY', 'ANSWER_CONDITIONAL');

-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('IMPORTED_RELEASE', 'AI_PROPOSAL', 'HUMAN');

-- CreateEnum
CREATE TYPE "SourceBasis" AS ENUM ('SOURCE_BACKED', 'ILLUSTRATIVE');

-- CreateTable
CREATE TABLE "workspace" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_def" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "program_node_key" TEXT NOT NULL,
    "parent_node_key" TEXT,
    "node_kind" "ProgramNodeKind" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "source_basis" "SourceBasis" NOT NULL DEFAULT 'SOURCE_BACKED',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "program_def_id" UUID NOT NULL,
    "composition_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "participants" JSONB NOT NULL,
    "source_basis" "SourceBasis" NOT NULL DEFAULT 'SOURCE_BACKED',
    "basis_note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_attachment" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "recognised" BOOLEAN NOT NULL,
    "official_file" TEXT,
    "edition" TEXT,
    "approval" TEXT,
    "status" TEXT NOT NULL,
    "status_detail" TEXT,
    "uploaded_via" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "inventory_file" TEXT,
    "inventory_summary" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gov_form_def" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "form_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "form_kind" TEXT NOT NULL DEFAULT 'data_form',

    CONSTRAINT "gov_form_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_edition" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "gov_form_def_id" UUID NOT NULL,
    "edition_label" TEXT NOT NULL,
    "official_file" TEXT,
    "sha256" TEXT,
    "inventory_file" TEXT,
    "data_bound_boxes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "form_edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition_form" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "gov_form_def_id" UUID NOT NULL,
    "lineage_key" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "attach_mode" "AttachMode" NOT NULL,
    "predicate_json" JSONB,
    "condition_plain" TEXT,
    "source_quote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "composition_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field_map" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "form_edition_id" UUID NOT NULL,
    "data_path" TEXT NOT NULL,
    "caption" TEXT,
    "heading" TEXT,
    "outcome" TEXT NOT NULL,
    "person" TEXT,
    "row" INTEGER,
    "canonical_field_key" TEXT,
    "transform" TEXT,
    "condition" TEXT,
    "confidence" TEXT,
    "evidence_quote" TEXT,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "drafting_run_id" TEXT,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_field_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_field" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "canonical_field_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "meaning" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,
    "data_type" "FieldDataType" NOT NULL,
    "scope" "FieldScope" NOT NULL,
    "subject_kind" TEXT NOT NULL,
    "origin" "Origin" NOT NULL,
    "source_ref" TEXT,
    "note" TEXT,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canonical_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logical_section" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "title" TEXT NOT NULL,
    "meaning" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logical_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_question" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lineage_key" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "canonical_field_key" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "question_text" TEXT,
    "help_text" TEXT,
    "repeats" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "collected_from" TEXT NOT NULL,
    "client_visible" BOOLEAN NOT NULL DEFAULT true,
    "predicate_json" JSONB,
    "condition_effect" "ConditionEffect",
    "condition_plain" TEXT,
    "rule_only" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sqr_section_selection" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "section_order" INTEGER NOT NULL,

    CONSTRAINT "sqr_section_selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "document_type_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirement" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "lineage_key" TEXT NOT NULL,
    "document_type_key" TEXT NOT NULL,
    "attach_mode" "AttachMode" NOT NULL,
    "predicate_json" JSONB,
    "condition_plain" TEXT,
    "applies_to_roles" TEXT NOT NULL,
    "provided_by" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "source_quote" TEXT,
    "source_file" TEXT,
    "note" TEXT,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicate" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "predicate_key" TEXT NOT NULL,
    "predicate_json" JSONB NOT NULL,
    "when_plain" TEXT,
    "then_plain" TEXT NOT NULL,
    "for_whom" TEXT NOT NULL,
    "source_quote" TEXT,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derived_field" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "derived_key" TEXT NOT NULL,
    "calculation" TEXT NOT NULL,
    "inputs" TEXT[],
    "reference" TEXT NOT NULL,
    "plain" TEXT,
    "executable" BOOLEAN NOT NULL,

    CONSTRAINT "derived_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_def" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "check_key" TEXT NOT NULL,
    "check_group" TEXT NOT NULL,
    "applies_to" TEXT,
    "predicate_json" JSONB,
    "severity" TEXT NOT NULL,
    "message" TEXT,
    "source_quote" TEXT,
    "illustrative" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    "status" "DefinitionStatus" NOT NULL,
    "supersedes_id" UUID,
    "origin" "Origin" NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafting_job" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "attachment_id" UUID,
    "kind" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "run_id" TEXT,
    "run_file" TEXT,
    "cost_usd" DOUBLE PRECISION,
    "detail" JSONB,
    "started_by" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "drafting_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalization_item" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "form_edition_id" UUID NOT NULL,
    "proposed_key" TEXT NOT NULL,
    "proposed_meaning" TEXT NOT NULL,
    "proposed_type" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "matched_key" TEXT,
    "candidates" JSONB NOT NULL,
    "persons" TEXT[],
    "boxes" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "affected" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "decided_key" TEXT,
    "decided_by" TEXT,
    "decision_note" TEXT,
    "decided_at" TIMESTAMPTZ,

    CONSTRAINT "normalization_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_release" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "author_id" TEXT NOT NULL,
    "submitter_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "released_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_submission" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "composition_id" UUID NOT NULL,
    "draft_sha256" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "change_summary" JSONB NOT NULL,
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ,
    "decision_note" TEXT,

    CONSTRAINT "review_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_signoff" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "item_ref" TEXT NOT NULL,
    "duty" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_signoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_key" TEXT,
    "summary" TEXT NOT NULL,
    "detail" JSONB,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_profile" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "profile_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "people" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_fact" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "person_id" TEXT NOT NULL,
    "canonical_field_key" TEXT NOT NULL,
    "row" INTEGER,
    "value" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "sample_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_artifact" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "detail" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_artifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_key_key" ON "workspace"("key");

-- CreateIndex
CREATE UNIQUE INDEX "program_def_workspace_id_program_node_key_key" ON "program_def"("workspace_id", "program_node_key");

-- CreateIndex
CREATE UNIQUE INDEX "composition_workspace_id_composition_key_key" ON "composition"("workspace_id", "composition_key");

-- CreateIndex
CREATE INDEX "source_attachment_workspace_id_sha256_idx" ON "source_attachment"("workspace_id", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "gov_form_def_workspace_id_form_key_key" ON "gov_form_def"("workspace_id", "form_key");

-- CreateIndex
CREATE UNIQUE INDEX "form_edition_workspace_id_edition_label_key" ON "form_edition"("workspace_id", "edition_label");

-- CreateIndex
CREATE UNIQUE INDEX "composition_form_composition_id_lineage_key_version_key" ON "composition_form"("composition_id", "lineage_key", "version");

-- CreateIndex
CREATE INDEX "form_field_map_workspace_id_canonical_field_key_idx" ON "form_field_map"("workspace_id", "canonical_field_key");

-- CreateIndex
CREATE UNIQUE INDEX "form_field_map_form_edition_id_data_path_version_key" ON "form_field_map"("form_edition_id", "data_path", "version");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_field_workspace_id_canonical_field_key_version_key" ON "canonical_field"("workspace_id", "canonical_field_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "logical_section_workspace_id_section_key_version_key" ON "logical_section"("workspace_id", "section_key", "version");

-- CreateIndex
CREATE INDEX "section_question_workspace_id_canonical_field_key_idx" ON "section_question"("workspace_id", "canonical_field_key");

-- CreateIndex
CREATE UNIQUE INDEX "section_question_workspace_id_lineage_key_version_key" ON "section_question"("workspace_id", "lineage_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "sqr_section_selection_composition_id_section_key_key" ON "sqr_section_selection"("composition_id", "section_key");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_workspace_id_document_type_key_version_key" ON "document_type"("workspace_id", "document_type_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirement_composition_id_lineage_key_version_key" ON "document_requirement"("composition_id", "lineage_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "predicate_composition_id_predicate_key_version_key" ON "predicate"("composition_id", "predicate_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "derived_field_workspace_id_derived_key_key" ON "derived_field"("workspace_id", "derived_key");

-- CreateIndex
CREATE UNIQUE INDEX "check_def_composition_id_check_key_version_key" ON "check_def"("composition_id", "check_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "config_release_composition_id_version_key" ON "config_release"("composition_id", "version");

-- CreateIndex
CREATE INDEX "audit_event_workspace_id_at_idx" ON "audit_event"("workspace_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "sample_profile_workspace_id_profile_key_key" ON "sample_profile"("workspace_id", "profile_key");

-- CreateIndex
CREATE INDEX "sample_fact_profile_id_canonical_field_key_idx" ON "sample_fact"("profile_id", "canonical_field_key");

-- AddForeignKey
ALTER TABLE "composition" ADD CONSTRAINT "composition_program_def_id_fkey" FOREIGN KEY ("program_def_id") REFERENCES "program_def"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_attachment" ADD CONSTRAINT "source_attachment_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_edition" ADD CONSTRAINT "form_edition_gov_form_def_id_fkey" FOREIGN KEY ("gov_form_def_id") REFERENCES "gov_form_def"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_form" ADD CONSTRAINT "composition_form_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_form" ADD CONSTRAINT "composition_form_gov_form_def_id_fkey" FOREIGN KEY ("gov_form_def_id") REFERENCES "gov_form_def"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field_map" ADD CONSTRAINT "form_field_map_form_edition_id_fkey" FOREIGN KEY ("form_edition_id") REFERENCES "form_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sqr_section_selection" ADD CONSTRAINT "sqr_section_selection_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirement" ADD CONSTRAINT "document_requirement_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicate" ADD CONSTRAINT "predicate_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_def" ADD CONSTRAINT "check_def_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafting_job" ADD CONSTRAINT "drafting_job_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalization_item" ADD CONSTRAINT "normalization_item_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "drafting_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_release" ADD CONSTRAINT "config_release_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_fact" ADD CONSTRAINT "sample_fact_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "sample_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
