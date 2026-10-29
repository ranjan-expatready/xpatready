-- W1-15 Questions and documents, slice 2 (runtime lane; P-147 board v2): a bulk change on ticked rows saves its rows
-- with one batch id, so one Undo takes the whole bulk change back. Expand only.
ALTER TABLE "fact_source" ADD COLUMN "batch_id" UUID;
CREATE INDEX "fact_source_combination_id_batch_id_idx" ON "fact_source" ("combination_id", "batch_id");
-- Rollback (STANDARDS §5): DROP INDEX "fact_source_combination_id_batch_id_idx"; ALTER TABLE "fact_source" DROP COLUMN "batch_id";
