-- One held record per file (Screen 01 FIX, review #2, break M1): the same file uploaded several times at the same
-- moment was held several times ("Held for a person (4)" for one file). A partial unique index makes the database refuse
-- the second held record; the intake then answers that file with "already waiting". Earlier duplicates (if any) are
-- closed first, keeping the oldest, so nothing is deleted.
-- Rollback: DROP INDEX "intake_item_one_held_per_file";
UPDATE "intake_item" d SET "status" = 'DONE', "reason" = COALESCE(d."reason", '') || ' (duplicate of an earlier held upload)'
WHERE d."status" = 'HELD' AND EXISTS (
  SELECT 1 FROM "intake_item" o WHERE o."status" = 'HELD' AND o."workspace_id" = d."workspace_id" AND o."sha256" = d."sha256"
    AND (o."created_at", o."id") < (d."created_at", d."id"));
CREATE UNIQUE INDEX "intake_item_one_held_per_file" ON "intake_item" ("workspace_id", "sha256") WHERE "status" = 'HELD';
