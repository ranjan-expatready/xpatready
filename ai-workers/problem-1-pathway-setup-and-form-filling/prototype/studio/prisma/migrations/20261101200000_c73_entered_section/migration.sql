-- C7.3 (runtime lane, M3-E; r5c §6, P-62 §6, P-65): "Entered in the portal" per section of an Online form item's answer
-- sheet. One new table, nothing else changes: each tick names the item (filing_item) and the section (the PDF twin's
-- group, contracts/pdf-sections.json, until the portal's screens, W6), who and when, and the answer snapshot that froze
-- the answers it showed (answer_snapshot, as form copies already do). One tick per item and section. Rollback
-- (STANDARDS §5): DROP TABLE "entered_section" (no other table refers to it; its answer_snapshot rows stay as history).
-- CreateTable
CREATE TABLE "entered_section" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "section_key" TEXT NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "entered_by" TEXT NOT NULL,
    "entered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entered_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entered_section_snapshot_id_key" ON "entered_section"("snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "entered_section_item_id_section_key_key" ON "entered_section"("item_id", "section_key");

-- AddForeignKey
ALTER TABLE "entered_section" ADD CONSTRAINT "entered_section_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "filing_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entered_section" ADD CONSTRAINT "entered_section_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "answer_snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

