-- Forms lane, review-2 Minor 1 (Lead note 26 Oct, Pass A item 1): wrong pairing codes are counted per code, in the
-- database, instead of per address in the server's memory (a shared office address paused everyone; a restart forgot
-- the count). A code's first three characters find it (stored as they are); a wrong code with those characters counts
-- against it, and the fifth wrong try voids it. Note (break 26 Oct): someone who can read this table could recover an
-- open code from its row by trying the other characters against the hash, as they could before from the hash alone;
-- codes live five minutes and the Studio's sign-in is simulated (P-33). A keyed hash is the team's (M3 security).
-- Review-3 Major 2: and a generous throttle kept in the database too (each try to exchange a code, per address and for
-- the whole server, in the last minute), so one client cannot sweep every code; a shared office never reaches it.
-- Expand only: three new columns and one new table. Rollback (STANDARDS §5): DROP TABLE "extension_code_try";
-- DROP INDEX "extension_pairing_selector_idx";
-- ALTER TABLE "extension_pairing" DROP COLUMN "selector", DROP COLUMN "wrong_tries", DROP COLUMN "voided_at";
ALTER TABLE "extension_pairing" ADD COLUMN "selector" VARCHAR(3),
  ADD COLUMN "wrong_tries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "voided_at" TIMESTAMPTZ;
ALTER TABLE "extension_pairing" ADD CONSTRAINT "extension_pairing_wrong_tries_check" CHECK ("wrong_tries" >= 0);
CREATE INDEX "extension_pairing_selector_idx" ON "extension_pairing"("selector");

CREATE TABLE "extension_code_try" (
    "id" BIGSERIAL NOT NULL,
    "address" VARCHAR(64) NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extension_code_try_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "extension_code_try_at_address_idx" ON "extension_code_try"("at", "address");
