-- M3-S3 (P-171 (6), P-380, P-425): a document line may be configured as waivable (release data, on the line), and a
-- case's checklist line on it may be waived by the case officer with a reason; who and when are the line's state_by
-- and state_at, as for Not applicable. Additive: an existing line is not waivable (null).
ALTER TABLE "document_requirement" ADD COLUMN "waiver" TEXT;
ALTER TABLE "document_requirement" ADD CONSTRAINT "document_requirement_waiver_check" CHECK ("waiver" IS NULL OR "waiver" IN ('waivable'));
ALTER TABLE "checklist_line" DROP CONSTRAINT "checklist_line_state_check";
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_state_check" CHECK ("state" IN ('not_requested', 'requested', 'received', 'being_checked', 'approved', 'rejected', 'not_applicable', 'waived'));
ALTER TABLE "checklist_line" DROP CONSTRAINT "checklist_line_reason_check";
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_reason_check" CHECK ("state" NOT IN ('not_applicable', 'waived') OR length(btrim(coalesce("state_reason", ''))) > 0);
