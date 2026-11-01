-- C11.9 (P-116 "reorder where order matters"; pack 3): the filing order of a combination's forms, as lineage keys.
-- Null keeps today's order (by line key), so existing snapshots and their hashes do not change.
ALTER TABLE "combination" ADD COLUMN "form_order" JSONB;
