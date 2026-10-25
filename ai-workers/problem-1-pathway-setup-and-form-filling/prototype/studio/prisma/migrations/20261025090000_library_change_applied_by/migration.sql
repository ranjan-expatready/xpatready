-- Screen 02 FIX (break M2): the person who applied the draft that created a new shared field is not the second person
-- who approves it, any more than the person who decided it. Nullable: rows from before this column have none.
ALTER TABLE "library_change" ADD COLUMN "applied_by" TEXT;
-- Rollback: ALTER TABLE "library_change" DROP COLUMN "applied_by";
