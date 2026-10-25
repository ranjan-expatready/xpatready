-- F2b (forms lane, P-90; plan §4): the browser extension's pairing codes and sessions, and "Re-capture needed" tasks.
-- Expand only: three new tables. Rollback (STANDARDS §5): DROP TABLE "recapture_task"; DROP TABLE "extension_session"; DROP TABLE "extension_pairing";
CREATE TABLE "extension_pairing" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "person" TEXT NOT NULL,
    "modes" TEXT[],
    "code_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extension_pairing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "extension_pairing_modes_check" CHECK ("modes" <@ ARRAY['capture', 'fill']::TEXT[] AND cardinality("modes") > 0)
);
CREATE UNIQUE INDEX "extension_pairing_code_hash_key" ON "extension_pairing"("code_hash");
CREATE INDEX "extension_pairing_person_created_at_idx" ON "extension_pairing"("person", "created_at");

CREATE TABLE "extension_session" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "person" TEXT NOT NULL,
    "modes" TEXT[],
    "extension_id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "pairing_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "extension_session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "extension_session_modes_check" CHECK ("modes" <@ ARRAY['capture', 'fill']::TEXT[] AND cardinality("modes") > 0)
);
CREATE UNIQUE INDEX "extension_session_token_hash_key" ON "extension_session"("token_hash");
-- One session per pairing code: a code used twice at the same moment gives one session (the other insert fails).
CREATE UNIQUE INDEX "extension_session_pairing_id_key" ON "extension_session"("pairing_id");
CREATE INDEX "extension_session_person_created_at_idx" ON "extension_session"("person", "created_at");

CREATE TABLE "recapture_task" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "form_edition_id" UUID NOT NULL,
    "screen_page" TEXT NOT NULL,
    "screen_title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "differences" JSONB NOT NULL DEFAULT '[]',
    "affected" JSONB NOT NULL DEFAULT '{}',
    "times" INTEGER NOT NULL DEFAULT 1,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ,
    CONSTRAINT "recapture_task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recapture_task_kind_check" CHECK ("kind" IN ('changed', 'not_captured')),
    CONSTRAINT "recapture_task_status_check" CHECK ("status" IN ('OPEN', 'DONE'))
);
CREATE INDEX "recapture_task_form_edition_id_status_idx" ON "recapture_task"("form_edition_id", "status");
-- XT-6: one open task per online version, screen and kind; a second mismatch updates it (concurrent: one row).
CREATE UNIQUE INDEX "uq_recapture_task_open" ON "recapture_task"("form_edition_id", "screen_page", "kind") WHERE "status" = 'OPEN';
ALTER TABLE "recapture_task" ADD CONSTRAINT "recapture_task_form_edition_id_fkey" FOREIGN KEY ("form_edition_id") REFERENCES "form_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
