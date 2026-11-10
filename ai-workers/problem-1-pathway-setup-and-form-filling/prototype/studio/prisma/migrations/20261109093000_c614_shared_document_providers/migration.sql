-- C6.14 (row B136, P-406; SA-1B-151, SA-1B-214; concept product/screens/B136/concept.md): expand only, no row changed.
-- (1) A document type's default provider roles: an ordered list of person-role keys (SA-1B-151 §7 defaultProviderRoles),
--     used only on a line asked once for the application or once for the couple. Empty = not set (every existing row).
-- (2) On a case, the officer's choice of providers for a shared checklist line (SA-1B-214 rule 2), with the reason, who
--     and when. Empty providers = the type's defaults apply; a choice always carries a reason (a check below).
-- Rollback: ALTER TABLE "checklist_line" DROP CONSTRAINT "checklist_line_providers_reason_check", DROP COLUMN
-- "providers", DROP COLUMN "providers_reason", DROP COLUMN "providers_by", DROP COLUMN "providers_at"; ALTER TABLE
-- "document_type" DROP COLUMN "default_provider_roles". Dropping loses the roles and choices made since (audited).
ALTER TABLE "document_type" ADD COLUMN "default_provider_roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "checklist_line" ADD COLUMN "providers" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "providers_reason" TEXT,
  ADD COLUMN "providers_by" TEXT,
  ADD COLUMN "providers_at" TIMESTAMPTZ;
ALTER TABLE "checklist_line" ADD CONSTRAINT "checklist_line_providers_reason_check"
  CHECK (cardinality("providers") = 0 OR length(btrim(coalesce("providers_reason", ''))) > 0);
