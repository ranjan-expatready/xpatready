-- Forms lane, review-2 Minor 1 (Lead note 26 Oct, Pass A item 1): wrong pairing codes are counted per code, in the
-- database, instead of per address in the server's memory (a shared office address paused everyone; a restart forgot
-- the count). A code's first three characters find it (stored as they are: they cannot be used without the other five,
-- which stay hashed); a wrong code with those characters counts against it, and the fifth wrong try voids it.
-- Expand only: three new columns. Rollback (STANDARDS §5): DROP INDEX "extension_pairing_selector_idx";
-- ALTER TABLE "extension_pairing" DROP COLUMN "selector", DROP COLUMN "wrong_tries", DROP COLUMN "voided_at";
ALTER TABLE "extension_pairing" ADD COLUMN "selector" VARCHAR(3),
  ADD COLUMN "wrong_tries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "voided_at" TIMESTAMPTZ;
ALTER TABLE "extension_pairing" ADD CONSTRAINT "extension_pairing_wrong_tries_check" CHECK ("wrong_tries" >= 0);
CREATE INDEX "extension_pairing_selector_idx" ON "extension_pairing"("selector");
