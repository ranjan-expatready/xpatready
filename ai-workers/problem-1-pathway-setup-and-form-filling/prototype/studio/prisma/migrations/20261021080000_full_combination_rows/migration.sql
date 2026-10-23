-- AlterTable
ALTER TABLE "audit_event" ADD COLUMN     "composition_id" UUID;

-- AlterTable
ALTER TABLE "program_def" ADD COLUMN     "allowed_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "client_type" TEXT;

-- CreateIndex
CREATE INDEX "audit_event_composition_id_at_idx" ON "audit_event"("composition_id", "at");

