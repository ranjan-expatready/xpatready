-- C6.5 part 2 (runtime lane, M3 plan row C7; P-242, P-243, P-142, P-133, P-134): documents read into proposed facts,
-- one "Confirm & use" per document, and the typed-versus-document check. Additive: three new tables, nothing existing
-- changes, so the code on main before this runs on this schema unchanged (it reads nothing of it).
--   * document_review: one read of one stored document (case_document), by one reader (mrz: the passport's coded lines
--     by rules; ai_vision: a letter, replayed from a saved read only, US$0). Its "Confirm & use" (P-242) is recorded
--     once, with who and when; a second one is refused (the row's confirmed_* stay as first written).
--   * read_value: one value the read proposes, with its page, reader, confidence and review mode (P-243: collapsed only
--     when the passport's check digits passed). It stays apart from answers (BR-4) until Confirm & use, then says what
--     happened to it (used, agreed, conflict, not_asked) and the answer it wrote or agreed with. corrected_*: a staff
--     correction before Confirm & use (P-243 counts them per review mode); written by the drawer row (C6.5 part 2b).
--   * answer_check: a typed answer and a document value that differ (BR-7, P-242): never settled silently; one open
--     check per person and fact (partial unique index); resolved only with a reason, keeping the answer or the document.
-- Rows go with their case (ON DELETE CASCADE, as a demo reset deletes cases); a read and its values go with their
-- document. Reasons are never written to the audit log (STANDARDS §5), only here.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "answer_check"; DROP TABLE "read_value"; DROP TABLE "document_review";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261108090000_c65_document_reads';
-- A rollback loses the reads, the Confirm & use records and the checks; the answers Confirm & use wrote stay (their
-- source_json still names the document), so nothing on the forms changes.

CREATE TABLE "document_review" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "reader" TEXT NOT NULL,
    "replayed" BOOLEAN NOT NULL DEFAULT false,
    "unreadable" JSONB NOT NULL,
    "read_by" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMPTZ,
    CONSTRAINT "document_review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_review_document_id_key" ON "document_review"("document_id");
CREATE INDEX "document_review_case_id_subject_id_idx" ON "document_review"("case_id", "subject_id");
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_reader_check" CHECK ("reader" IN ('mrz', 'ai_vision'));
-- Confirm & use names who and when together, or neither.
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_confirmed_check" CHECK (("confirmed_by" IS NULL) = ("confirmed_at" IS NULL));
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_unreadable_check" CHECK (jsonb_typeof("unreadable") = 'array');

CREATE TABLE "read_value" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "fact" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "page" INTEGER NOT NULL,
    "reader" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "review" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "state" TEXT NOT NULL DEFAULT 'proposed',
    "answer_id" UUID,
    "corrected_value_json" JSONB,
    "corrected_by" TEXT,
    "corrected_at" TIMESTAMPTZ,
    CONSTRAINT "read_value_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "read_value_review_id_fact_key" ON "read_value"("review_id", "fact");
CREATE INDEX "read_value_case_id_subject_id_idx" ON "read_value"("case_id", "subject_id");
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "document_review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_reader_check" CHECK ("reader" IN ('mrz', 'ai_vision'));
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_review_check" CHECK ("review" IN ('collapsed', 'expanded'));
-- P-243: only a value backed by a passed check digit is collapsed.
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_collapsed_checked_check" CHECK ("review" = 'expanded' OR "checked");
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_state_check" CHECK ("state" IN ('proposed', 'used', 'agreed', 'conflict', 'not_asked'));
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_page_check" CHECK ("page" >= 1);
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1);
-- A correction names its value, who and when together, or none of them.
ALTER TABLE "read_value" ADD CONSTRAINT "read_value_corrected_check" CHECK ((("corrected_value_json" IS NULL) = ("corrected_by" IS NULL)) AND (("corrected_by" IS NULL) = ("corrected_at" IS NULL)));

CREATE TABLE "answer_check" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "fact" TEXT NOT NULL,
    "read_value_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "answer_id" UUID NOT NULL,
    "typed_value_json" JSONB NOT NULL,
    "document_value_json" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "kept" TEXT,
    "reason" TEXT,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMPTZ,
    CONSTRAINT "answer_check_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "answer_check_case_id_subject_id_idx" ON "answer_check"("case_id", "subject_id");
-- BR-7: one open check per person and fact.
CREATE UNIQUE INDEX "answer_check_one_open" ON "answer_check"("subject_id", "fact") WHERE "state" = 'open';
ALTER TABLE "answer_check" ADD CONSTRAINT "answer_check_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answer_check" ADD CONSTRAINT "answer_check_read_value_id_fkey" FOREIGN KEY ("read_value_id") REFERENCES "read_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answer_check" ADD CONSTRAINT "answer_check_state_check" CHECK ("state" IN ('open', 'resolved'));
-- Open: nothing decided yet. Resolved: which value was kept, a reason (a letter or a digit, at most 500 characters),
-- who and when (C6.5-14: never without a reason).
ALTER TABLE "answer_check" ADD CONSTRAINT "answer_check_resolution_check" CHECK (
    ("state" = 'open' AND "kept" IS NULL AND "reason" IS NULL AND "resolved_by" IS NULL AND "resolved_at" IS NULL)
 OR ("state" = 'resolved' AND "kept" IN ('answer', 'document') AND "reason" ~ '[[:alnum:]]' AND char_length("reason") <= 500 AND "resolved_by" IS NOT NULL AND "resolved_at" IS NOT NULL));
