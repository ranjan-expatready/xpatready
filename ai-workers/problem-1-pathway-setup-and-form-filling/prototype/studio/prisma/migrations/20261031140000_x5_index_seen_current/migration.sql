-- X5 fill hardening (PR #146; break M10/M11, the automated reviews of 89cccd71 and c5b8be03): "Newer edition on canada.ca"
-- is judged from dates plus a baseline per file, the index date last seen as current for that edition (set by a "Check
-- against canada.ca" that found it current; for an undated file, by the fill's reads). It replaces the event-set mark
-- gov_form_def.newer_on_index_at. Expand, carry over, contract (STANDARDS §5): a form marked newer keeps reading newer
-- (its editions get a baseline before any index date), then the mark goes. Rollback: add newer_on_index_at TIMESTAMPTZ back,
-- set it where an edition's baseline is '1990-01-01', drop form_edition.index_date_seen_current.
ALTER TABLE "form_edition" ADD COLUMN "index_date_seen_current" TEXT;
UPDATE "form_edition" e SET "index_date_seen_current" = '1990-01-01'
  FROM "gov_form_def" d WHERE e."gov_form_def_id" = d."id" AND d."newer_on_index_at" IS NOT NULL;
ALTER TABLE "gov_form_def" DROP COLUMN "newer_on_index_at";
