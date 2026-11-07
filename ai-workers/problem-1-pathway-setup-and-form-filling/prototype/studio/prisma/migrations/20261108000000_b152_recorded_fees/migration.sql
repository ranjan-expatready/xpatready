-- B152 (runtime, C6.12 and C8.2; FQ-7; Devin on #1233, Lead 31): a recorded submission group keeps its fee lines and
-- totals as they were when it was recorded. GET /runtime/cases/:id/prepare works out ages as at today on every read, so
-- without this a recorded group's fees changed after a birthday (a child turning 14 adds biometrics) although nothing new
-- was filed. "Record the submission" (api/src/submission.ts) writes the group's totals, total and fee lines from the view
-- it recorded, once, in the same transaction as the filing records; the prepare view reads a recorded group from it.
-- Additive: one nullable column on an existing table, nothing changed or dropped, so the code on main before this runs on
-- this schema unchanged (it never reads the column). Groups recorded before this have no snapshot (null) and are read as
-- before (worked out today).
-- Rollback (STANDARDS §5): stop the app, then: ALTER TABLE "submission_group" DROP COLUMN "recorded_fees";
ALTER TABLE "submission_group" ADD COLUMN "recorded_fees" JSONB;
