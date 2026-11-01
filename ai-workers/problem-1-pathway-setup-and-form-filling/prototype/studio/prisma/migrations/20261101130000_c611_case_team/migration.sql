-- C6.11 (runtime lane, M3-A; BR-20, P-164 (3), stand-ins SI-9 and SI-15): the Sample firm a case belongs to, and its case
-- team with history (the representative of record and the case officers, shaped like the team's AG-07 CaseTeamMember).
-- One new column with a default (cases opened before this belong to the Sample firm, so nothing else changes) and one new
-- table. Cases opened before this have no team rows; the API shows them as "no representative of record yet" and the
-- firm admin assigns one. Rollback (STANDARDS §5): DROP TABLE "case_team_member"; ALTER TABLE "runtime_case" DROP COLUMN
-- "firm_key" (no other table refers to either).
ALTER TABLE "runtime_case" ADD COLUMN "firm_key" TEXT NOT NULL DEFAULT 'sample-firm';

CREATE TABLE "case_team_member" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "ended_by" TEXT,
    "end_reason" TEXT,

    CONSTRAINT "case_team_member_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_team_member_case_id_assigned_at_idx" ON "case_team_member"("case_id", "assigned_at");

ALTER TABLE "case_team_member" ADD CONSTRAINT "case_team_member_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "runtime_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The rules the database keeps even if the service is bypassed: two roles only; an ended row says who ended it and why;
-- one current representative of record per case; a person at most once per role at a time.
ALTER TABLE "case_team_member" ADD CONSTRAINT "case_team_member_role_check" CHECK ("role" IN ('LEAD_REPRESENTATIVE', 'OFFICER'));
ALTER TABLE "case_team_member" ADD CONSTRAINT "case_team_member_ended_check" CHECK (("ended_at" IS NULL AND "ended_by" IS NULL) OR ("ended_at" IS NOT NULL AND "ended_by" IS NOT NULL AND "end_reason" IS NOT NULL));
CREATE UNIQUE INDEX "case_team_member_one_representative" ON "case_team_member" ("case_id") WHERE "role" = 'LEAD_REPRESENTATIVE' AND "ended_at" IS NULL;
CREATE UNIQUE INDEX "case_team_member_once_per_role" ON "case_team_member" ("case_id", "user_id", "role") WHERE "ended_at" IS NULL;
