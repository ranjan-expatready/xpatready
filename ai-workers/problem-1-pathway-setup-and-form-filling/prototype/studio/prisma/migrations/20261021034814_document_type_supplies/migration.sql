-- AlterTable
ALTER TABLE "document_type" ADD COLUMN     "reader_profile" JSONB,
ADD COLUMN     "supplies_facts" TEXT[] DEFAULT ARRAY[]::TEXT[];
