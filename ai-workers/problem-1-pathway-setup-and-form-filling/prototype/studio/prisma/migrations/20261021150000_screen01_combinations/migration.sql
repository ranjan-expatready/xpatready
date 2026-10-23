-- Screen 01 (Programs): the "composition" identity becomes the combination (audit F1, challenge O9), renamed in place
-- so every existing record is kept; one combination per last-level node; one release for the whole shared draft (P-23);
-- a plain link label on program nodes (P-26: labels only). Rollback: rename back (combination → composition) and drop
-- pack_version, config_release.pack_version_id, program_def.link_label, form_edition.stored_path and the two guard triggers.

ALTER TABLE "composition" RENAME TO "combination";
ALTER TABLE "combination" RENAME COLUMN "composition_key" TO "combination_key";
ALTER TABLE "combination" RENAME CONSTRAINT "composition_pkey" TO "combination_pkey";
ALTER TABLE "combination" RENAME CONSTRAINT "composition_program_def_id_fkey" TO "combination_program_def_id_fkey";
ALTER INDEX "composition_workspace_id_composition_key_key" RENAME TO "combination_workspace_id_combination_key_key";

ALTER TABLE "composition_form" RENAME TO "combination_form";
ALTER TABLE "combination_form" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "combination_form" RENAME CONSTRAINT "composition_form_pkey" TO "combination_form_pkey";
ALTER TABLE "combination_form" RENAME CONSTRAINT "composition_form_composition_id_fkey" TO "combination_form_combination_id_fkey";
ALTER TABLE "combination_form" RENAME CONSTRAINT "composition_form_gov_form_def_id_fkey" TO "combination_form_gov_form_def_id_fkey";
ALTER INDEX "composition_form_composition_id_lineage_key_version_key" RENAME TO "combination_form_combination_id_lineage_key_version_key";

ALTER TABLE "source_attachment" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "source_attachment" RENAME CONSTRAINT "source_attachment_composition_id_fkey" TO "source_attachment_combination_id_fkey";
ALTER TABLE "sqr_section_selection" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "sqr_section_selection" RENAME CONSTRAINT "sqr_section_selection_composition_id_fkey" TO "sqr_section_selection_combination_id_fkey";
ALTER INDEX "sqr_section_selection_composition_id_section_key_key" RENAME TO "sqr_section_selection_combination_id_section_key_key";
ALTER TABLE "document_requirement" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "document_requirement" RENAME CONSTRAINT "document_requirement_composition_id_fkey" TO "document_requirement_combination_id_fkey";
ALTER INDEX "document_requirement_composition_id_lineage_key_version_key" RENAME TO "document_requirement_combination_id_lineage_key_version_key";
ALTER TABLE "predicate" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "predicate" RENAME CONSTRAINT "predicate_composition_id_fkey" TO "predicate_combination_id_fkey";
ALTER INDEX "predicate_composition_id_predicate_key_version_key" RENAME TO "predicate_combination_id_predicate_key_version_key";
ALTER TABLE "check_def" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "check_def" RENAME CONSTRAINT "check_def_composition_id_fkey" TO "check_def_combination_id_fkey";
ALTER INDEX "check_def_composition_id_check_key_version_key" RENAME TO "check_def_combination_id_check_key_version_key";
ALTER TABLE "drafting_job" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "drafting_job" RENAME CONSTRAINT "drafting_job_composition_id_fkey" TO "drafting_job_combination_id_fkey";
ALTER TABLE "config_release" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "config_release" RENAME CONSTRAINT "config_release_composition_id_fkey" TO "config_release_combination_id_fkey";
ALTER INDEX "config_release_composition_id_version_key" RENAME TO "config_release_combination_id_version_key";
ALTER TABLE "review_submission" RENAME COLUMN "composition_id" TO "combination_id";
ALTER TABLE "audit_event" RENAME COLUMN "composition_id" TO "combination_id";
ALTER INDEX "audit_event_composition_id_at_idx" RENAME TO "audit_event_combination_id_at_idx";

-- A combination is never deleted with its program node (disable, never delete; BR-9).
ALTER TABLE "combination" DROP CONSTRAINT "combination_program_def_id_fkey";
ALTER TABLE "combination" ADD CONSTRAINT "combination_program_def_id_fkey" FOREIGN KEY ("program_def_id") REFERENCES "program_def"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One combination per last-level node (challenge O9). Existing records: the loader already made one row per node.
CREATE UNIQUE INDEX "combination_program_def_id_key" ON "combination"("program_def_id");

ALTER TABLE "program_def" ADD COLUMN "link_label" TEXT;
ALTER TABLE "form_edition" ADD COLUMN "stored_path" TEXT;

CREATE TABLE "pack_version" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "author_ids" TEXT[],
    "approver_id" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "released_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pack_version_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pack_version_workspace_id_version_key" ON "pack_version"("workspace_id", "version");
ALTER TABLE "config_release" ADD COLUMN "pack_version_id" UUID;
CREATE INDEX "config_release_pack_version_id_idx" ON "config_release"("pack_version_id");
ALTER TABLE "config_release" ADD CONSTRAINT "config_release_pack_version_id_fkey" FOREIGN KEY ("pack_version_id") REFERENCES "pack_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Level rules in the database as well as the service (STANDARDS §3.4; BR-3, BR-4, SA-1B-55/56):
--  a combination sits only on a category or sub-category that has no sub-categories;
--  a node cannot be added under a node that already has a combination (nothing above a combination).
CREATE FUNCTION "combination_on_leaf_only"() RETURNS trigger AS $$
DECLARE kind TEXT; node_key TEXT; ws UUID;
BEGIN
  SELECT node_kind::text, program_node_key, workspace_id INTO kind, node_key, ws FROM program_def WHERE id = NEW.program_def_id;
  IF kind NOT IN ('STREAM', 'CATEGORY') THEN
    RAISE EXCEPTION 'combination_level: a combination belongs to a category or sub-category, not a %', kind USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM program_def WHERE workspace_id = ws AND parent_node_key = node_key) THEN
    RAISE EXCEPTION 'combination_level: this category has sub-categories; each sub-category is its own combination' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "combination_on_leaf_only" BEFORE INSERT OR UPDATE OF program_def_id ON "combination" FOR EACH ROW EXECUTE FUNCTION "combination_on_leaf_only"();

CREATE FUNCTION "program_node_not_under_combination"() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_node_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM combination c JOIN program_def p ON p.id = c.program_def_id
    WHERE p.workspace_id = NEW.workspace_id AND p.program_node_key = NEW.parent_node_key) THEN
    RAISE EXCEPTION 'combination_level: % already has its own setup, so nothing can be added under it', NEW.parent_node_key USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "program_node_not_under_combination" BEFORE INSERT OR UPDATE OF parent_node_key ON "program_def" FOR EACH ROW EXECUTE FUNCTION "program_node_not_under_combination"();
