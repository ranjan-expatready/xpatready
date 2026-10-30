-- W1-15 Questions and documents, slice 3 (runtime lane; board v2 frame 3, P-147): the checklist order per person and
-- the alternatives that count instead of a line's document ("Passport · or Travel document"). Expand only; both are in
-- the snapshot only when set, so released combinations keep their fingerprint.
ALTER TABLE "document_requirement" ADD COLUMN "position" INTEGER;
ALTER TABLE "document_requirement" ADD COLUMN "alternatives" JSONB;
-- Rollback (STANDARDS §5): ALTER TABLE "document_requirement" DROP COLUMN "alternatives"; ALTER TABLE "document_requirement" DROP COLUMN "position";
