-- C6.15 (row B137; SA-1B-19, SA-1B-20): document substitute sets. Two nullable columns on two existing tables, nothing
-- else: a library document type's named sets ("any one of" / "all of", ordered members, "when acceptable" wording) and the
-- set a combination's document line picks. No backfill: null keeps today's meaning (the type is its own only member;
-- the line picks "Standard").
-- Rollback (STANDARDS §5): stop the app, then ALTER TABLE "document_requirement" DROP COLUMN "set_name"; ALTER TABLE
-- "document_type" DROP COLUMN "sets"; and delete this migration's row from _prisma_migrations. Every set and every line's
-- pick is lost (lines fall back to their own type); files uploaded as a member stay, under the member's type.
ALTER TABLE "document_type" ADD COLUMN "sets" JSONB;
ALTER TABLE "document_requirement" ADD COLUMN "set_name" TEXT;
