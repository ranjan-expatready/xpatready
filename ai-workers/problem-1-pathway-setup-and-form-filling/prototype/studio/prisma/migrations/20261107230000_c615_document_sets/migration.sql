-- C6.15 (row B137; SA-1B-19, SA-1B-20): document substitute sets. Two nullable columns on two existing tables, nothing
-- else: a library document type's named sets ("any one of" / "all of", ordered members, "when acceptable" wording) and the
-- set a combination's document line picks. No backfill: null keeps today's meaning (the type is its own only member;
-- the line picks "Standard").
ALTER TABLE "document_type" ADD COLUMN "sets" JSONB;
ALTER TABLE "document_requirement" ADD COLUMN "set_name" TEXT;
