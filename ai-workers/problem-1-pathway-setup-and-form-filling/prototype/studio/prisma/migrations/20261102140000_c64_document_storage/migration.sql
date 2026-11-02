-- C6.4 storage slice (runtime lane, M3-C; r5c BR-3; P-169; stand-in SI-14): requesting a document from a person,
-- uploading it, and the states after "Not requested". Additive: two new tables, nothing existing is changed or dropped,
-- so the code on main before this runs on this schema unchanged (it reads neither table).
--   * checklist_line: one row per filing person x document on a case, written by GET /runtime/cases/:id/checklist when
--     the line is needed (the list itself is still worked out from the release on every read). A row keeps its id and
--     state when the answers take the line away and bring it back. States are the team's (M3-CONTRACT C6.4).
--   * case_document: an uploaded file, owned by the person (answer_subject), not by the case; the line it answered is
--     kept for history. One current file per person and document type (a partial unique index); a new upload keeps the
--     old one as history (current = false, superseded_at set). The file itself is in the working files (var/), named by
--     the row id, checked by its sha256 before it is read.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "case_document"; DROP TABLE "checklist_line";
-- Requests, uploads and Not applicable reasons are lost by a rollback (the files stay in var/ until a Reset); the
-- derived checklist is unaffected (it is worked out from the release on every read).

CREATE TABLE "checklist_line" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "lineage" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'not_requested',
    "state_reason" TEXT,
    "state_by" TEXT,
    "state_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "checklist_line_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checklist_line_case_id_subject_id_document_type_key" ON "checklist_line"("case_id", "subject_id", "document_type");
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_state_check" CHECK ("state" IN ('not_requested', 'requested', 'received', 'being_checked', 'approved', 'rejected', 'not_applicable'));
-- A Not applicable line always says why (C6.4-16).
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_reason_check" CHECK ("state" <> 'not_applicable' OR length(btrim(coalesce("state_reason", ''))) > 0);

CREATE TABLE "case_document" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "checklist_line_id" UUID,
    "file_name" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "path" TEXT NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMPTZ,
    CONSTRAINT "case_document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "case_document_subject_id_document_type_idx" ON "case_document"("subject_id", "document_type");
CREATE UNIQUE INDEX "case_document_one_current" ON "case_document"("subject_id", "document_type") WHERE "current";
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "answer_subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_checklist_line_id_fkey" FOREIGN KEY ("checklist_line_id") REFERENCES "checklist_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_media_type_check" CHECK ("media_type" IN ('application/pdf', 'image/jpeg', 'image/png'));
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_size_check" CHECK ("size_bytes" > 0);
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_superseded_check" CHECK ("current" = ("superseded_at" IS NULL));
