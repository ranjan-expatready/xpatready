-- X5 slice c (forms lane; P-156 (1); the tech lead's answer on #138: "remember a deletion"): a library form a second person
-- approved deleting is remembered by its number, so a later fill from IRCC's forms list skips it until a person adds the
-- form back (an upload, a canada.ca download by Find again, a sample load forget it). New table only; nothing else changes,
-- nothing to carry over (deletions approved before this are not known). No foreign key: the form's row is gone by design.
-- Rollback (STANDARDS §5): DROP TABLE "library_form_deletion" (no other table refers to it).
CREATE TABLE "library_form_deletion" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "form_key" TEXT NOT NULL,
    "deleted_by" TEXT NOT NULL,
    "change_id" UUID,
    "deleted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_form_deletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "library_form_deletion_workspace_id_form_key_key" ON "library_form_deletion"("workspace_id", "form_key");
