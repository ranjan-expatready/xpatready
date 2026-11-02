-- G1 (screens lane, C5.4; P-240; SA-01B v2.1 SA-1B-290, SA-1B-193, SA-1B-294): the source register. Additive: one new
-- table, nothing existing is changed or dropped, so the code on main before this runs on this schema unchanged (it
-- reads nothing of it). Concept v2 and the tech lead's approval on #558 (2 Nov): screens/G1-source-register/concept.md.
--   * source_entry: the source of one published number in one item of a workspace's configuration. Either an
--     official citation (https URL, the words that state the number, the date read; page note optional) or "None
--     published – set by ExpatReady" with its reason (the government publishes nothing on the point). Never both.
--   * item_kind / item_key / value_path: the number's address by meaning (BR-2): item_key carries the combination
--     ("wp.family/R-01", "wp.family/form:IMM 5707"); value_path is "<field>|<op>|<k>", or "min_age" / "months".
--   * value: the number the entry was written for, in one canonical text (BR-5); a different number today is
--     refused as "changed" (BR-6) by the engine, not by the database.
--   * sample: an entry marked Sample passes only in the demo workspace, and only as a Demo release (tech lead's
--     condition on Decision 1, #558); a number with no entry is refused everywhere.
--   * version / updated_by / updated_at: a save with an old version gets 409 (challenge M2, BR-11).
--   No foreign key to the item: items are versioned rows; an entry whose address is gone reads "No longer used".
-- Rollback (STANDARDS §5): stop the app, then in one transaction:
--   DROP TABLE "source_entry";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261102183000_g1_source_entry';
-- Sources entered by people are lost by a rollback; nothing else reads them.

-- CreateTable
CREATE TABLE "source_entry" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "item_kind" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "value_path" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "citation_url" TEXT,
    "citation_page" TEXT,
    "citation_quote" TEXT,
    "citation_date" DATE,
    "none_published" BOOLEAN NOT NULL DEFAULT false,
    "none_published_reason" TEXT,
    "sample" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_entry_workspace_id_item_kind_item_key_value_path_key" ON "source_entry"("workspace_id", "item_kind", "item_key", "value_path");

-- The agreed checks (concept BR-3, BR-10, the tech lead's ⚑ changes and his Sample condition on #558; review MJ-1/MJ-2
-- and minor 1 on #569): a known kind; non-blank keys and value; and exactly one answer:
--   (a) an official citation: https URL, the words that state the number (≤ 300 characters), the date read, an optional
--       page note (≤ 200 characters);
--   (b) "None published – set by ExpatReady" with its reason (≥ 10 characters);
--   (c) Sample, with neither: honest demo content, which passes only in the demo workspace as a Demo release (G3).
-- "Blank" is any whitespace (tabs and line breaks too, as the engine's trim()): Devin on #569. "The date read is not in
-- the future" is the API's check (a CHECK cannot read the clock).
ALTER TABLE "source_entry" ADD CONSTRAINT "source_entry_item_kind_check" CHECK ("item_kind" IN ('check', 'rule', 'fee', 'threshold'));
ALTER TABLE "source_entry" ADD CONSTRAINT "source_entry_keys_check" CHECK ("item_key" ~ '[^[:space:]]' AND "value_path" ~ '[^[:space:]]' AND "value" ~ '[^[:space:]]');
ALTER TABLE "source_entry" ADD CONSTRAINT "source_entry_citation_check" CHECK (
  ("citation_url" IS NULL OR "citation_url" ~ '^https://[^[:space:]]+$')
  AND ("citation_quote" IS NULL OR ("citation_quote" ~ '[^[:space:]]' AND char_length("citation_quote") <= 300))
  AND ("citation_page" IS NULL OR ("citation_page" ~ '[^[:space:]]' AND char_length("citation_page") <= 200))
);
ALTER TABLE "source_entry" ADD CONSTRAINT "source_entry_answer_check" CHECK (
  -- (a) cited
  ("citation_url" IS NOT NULL AND "citation_quote" IS NOT NULL AND "citation_date" IS NOT NULL
    AND "none_published" = false AND "none_published_reason" IS NULL AND "sample" = false)
  OR
  -- (b) None published, with its reason
  ("none_published" = true AND "none_published_reason" IS NOT NULL AND char_length(regexp_replace("none_published_reason", '^[[:space:]]+|[[:space:]]+$', '', 'g')) >= 10
    AND "citation_url" IS NULL AND "citation_page" IS NULL AND "citation_quote" IS NULL AND "citation_date" IS NULL AND "sample" = false)
  OR
  -- (c) Sample, with no source claimed
  ("sample" = true AND "none_published" = false AND "none_published_reason" IS NULL
    AND "citation_url" IS NULL AND "citation_page" IS NULL AND "citation_quote" IS NULL AND "citation_date" IS NULL)
);
ALTER TABLE "source_entry" ADD CONSTRAINT "source_entry_version_check" CHECK ("version" >= 1);
