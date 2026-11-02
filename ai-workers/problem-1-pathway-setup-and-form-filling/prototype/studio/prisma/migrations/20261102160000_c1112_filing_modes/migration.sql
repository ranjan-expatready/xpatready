-- C11.12 filing modes (P-233; concept r2 §6, challenge m1): two check widenings, nothing else. Additive and old-code
-- compatible: the code before C11.12 writes only 'files_own'/'on_principal' filings and 'applying' applicants, which
-- both checks still accept. No column, no table, no data step: the prepare view's sync already deactivates a filing whose
-- owner no longer files (api/src/case-prepare.ts), and every row here is derived from the case and its release.
--   * filing.mode: 'co_filed', a sponsorship that is always sent with the principal's application (BR-4, decision
--     P-233 (2)). 'on_principal' stays allowed for rows stored before C11.12 and for the 2 Nov rollback; no code
--     writes it any more.
--   * filing_applicant.mode: 'declared_only', a person named on the principal's application but not accompanying
--     (BR-6, decision P-233 (1)): no fee line, no forms until a "for non-applying people" marker exists.
-- Rollback (STANDARDS §5): stop the app, run this in one transaction, then start the code before C11.12:
--   UPDATE "filing" SET "active" = false WHERE "mode" = 'co_filed';
--   UPDATE "filing" SET "mode" = 'files_own' WHERE "mode" = 'co_filed';
--   DELETE FROM "filing_applicant" WHERE "mode" = 'declared_only';
--   ALTER TABLE "filing" DROP CONSTRAINT "filing_mode_check", ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own', 'on_principal'));
--   ALTER TABLE "filing_applicant" DROP CONSTRAINT "filing_applicant_mode_check", ADD CONSTRAINT "filing_applicant_mode_check" CHECK ("mode" IN ('applying'));
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261102160000_c1112_filing_modes';  -- so a roll-forward applies it again
-- (The older code then re-derives one filing per applying person on the next read; ids of filings it re-creates are new.)

ALTER TABLE "filing" DROP CONSTRAINT "filing_mode_check";
ALTER TABLE "filing" ADD CONSTRAINT "filing_mode_check" CHECK ("mode" IN ('files_own', 'on_principal', 'co_filed'));

ALTER TABLE "filing_applicant" DROP CONSTRAINT "filing_applicant_mode_check";
ALTER TABLE "filing_applicant" ADD CONSTRAINT "filing_applicant_mode_check" CHECK ("mode" IN ('applying', 'declared_only'));
