-- C7.5 part 1 Review findings (runtime lane, M3-E; r5c BR-19; AG-11-69, -70, -71; M3-CONTRACT C7.5): the findings of a
-- case's independent review, in the team's words: severity CRITICAL · MAJOR · MINOR · INFO, source rules · ai · manual,
-- state open → acknowledged (reason) → resolved, open → waived (CRITICAL only, reason), dismissed (reason; does not return
-- for the same source and facts). Additive: one new table, nothing existing is changed or dropped, so the code on main
-- before this runs on this schema unchanged (it reads no such table).
--   * One row per finding. A rules finding carries its rule and a fingerprint of the facts it compared; while it is not
--     resolved there is at most one row per case and fingerprint (a partial unique index), so two reads at once never
--     make it twice. Part 2 (the replayed AI review) fills agreement, reasons, replayed and run_id.
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "review_finding";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261103230000_c75_review_finding';
-- Findings and their acknowledgements are lost by a rollback (the audit lines stay); the rules findings come back on the
-- next read, open.

CREATE TABLE "review_finding" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "filing_id" UUID,
    "subject_id" UUID NOT NULL,
    "form" TEXT,
    "field" TEXT,
    "severity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rule_key" TEXT,
    "fingerprint" TEXT,
    "state" TEXT NOT NULL DEFAULT 'open',
    "quote" TEXT NOT NULL,
    "agreement" TEXT,
    "reasons" JSONB,
    "replayed" BOOLEAN NOT NULL DEFAULT false,
    "run_id" UUID,
    "state_reason" TEXT,
    "state_by" TEXT,
    "state_at" TIMESTAMPTZ,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_finding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "review_finding_case_id_idx" ON "review_finding"("case_id");
CREATE UNIQUE INDEX "review_finding_one_live_rule" ON "review_finding"("case_id", "fingerprint") WHERE "source" = 'rules' AND "state" <> 'resolved';
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_filing_id_fkey" FOREIGN KEY ("filing_id") REFERENCES "filing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_severity_check" CHECK ("severity" IN ('CRITICAL', 'MAJOR', 'MINOR', 'INFO'));
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_source_check" CHECK ("source" IN ('rules', 'ai', 'manual'));
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_state_check" CHECK ("state" IN ('open', 'acknowledged', 'resolved', 'waived', 'dismissed'));
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_agreement_check" CHECK ("agreement" IS NULL OR "agreement" IN ('high', 'low'));
-- Only a CRITICAL finding is waived (BR-19); a rules finding always names its rule and facts.
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_waive_check" CHECK ("state" <> 'waived' OR "severity" = 'CRITICAL');
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_rule_check" CHECK ("source" <> 'rules' OR ("rule_key" IS NOT NULL AND "fingerprint" IS NOT NULL));
-- Acknowledged, waived and dismissed always carry who, when and why.
ALTER TABLE "review_finding" ADD CONSTRAINT "review_finding_reason_check" CHECK ("state" NOT IN ('acknowledged', 'waived', 'dismissed') OR ("state_reason" IS NOT NULL AND "state_by" IS NOT NULL AND "state_at" IS NOT NULL));
