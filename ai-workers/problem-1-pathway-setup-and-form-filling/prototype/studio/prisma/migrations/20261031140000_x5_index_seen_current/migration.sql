-- X5 fill hardening (PR #146; break M10/M11, the automated review on 89cccd71): "Newer edition on canada.ca" is judged from
-- dates plus one baseline per form, the index date last seen as current (set by the first read of a form that already had a
-- file, and by a "Check against canada.ca" that found its PDF current). It replaces the event-set mark newer_on_index_at.
-- Nothing is back-filled. Rollback (STANDARDS §5): drop index_date_seen_current and add newer_on_index_at TIMESTAMPTZ back.
ALTER TABLE "gov_form_def" DROP COLUMN "newer_on_index_at";
ALTER TABLE "gov_form_def" ADD COLUMN "index_date_seen_current" TEXT;
