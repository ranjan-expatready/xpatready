-- S6 slice 1a (screens lane; P-149 one door, contract v2 contracts/proposal-item.ts): one ProposalItem table for every
-- AI, rules or person proposal. The NormalizationItem rows are copied onto it, the `rule` rows (and any kind the contract
-- does not know) are dropped, both are logged (Q-L4: a NOTICE and one audit_event per workspace naming the counts and the
-- dropped keys), then normalization_item is dropped.
-- Kinds: field → field, section → section, answer_list → answer_list (library); document_requirement → requirement_line,
-- check → cross_check (combination). Copied rows are pre-contract: their payload keeps the old keys beside `kind`; only
-- new writes go through the contract parse (proposals.ts insertProposals).
-- Rollback (STANDARDS §5): restore normalization_item from the backup taken before the deploy; the copy below is lossless
-- for every copied row (the old columns are kept in `work`), so a reverse INSERT … SELECT is also possible.

CREATE TABLE "proposal_item" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "run_id" UUID,
    "step" TEXT NOT NULL,
    "form_edition" TEXT,
    "combination_id" UUID,
    "lands_on" TEXT NOT NULL,
    "reuse" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "source" JSONB,
    "rounds" JSONB NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "agreement" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "reason" TEXT,
    "origin" TEXT NOT NULL,
    "add_reason" TEXT,
    "identity" JSONB NOT NULL,
    "identity_key" TEXT NOT NULL,
    "relates_to" UUID,
    "revision" JSONB,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "decided_by" TEXT,
    "decided_at" TIMESTAMPTZ,
    "decision_reason" TEXT,
    "batch_id" UUID,
    "basis" TEXT NOT NULL DEFAULT 'SAMPLE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "choice" TEXT,
    "decided_key" TEXT,
    "work" JSONB,
    CONSTRAINT "proposal_item_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "proposal_item_workspace_id_status_idx" ON "proposal_item"("workspace_id", "status");
CREATE INDEX "proposal_item_workspace_id_kind_identity_key_idx" ON "proposal_item"("workspace_id", "kind", "identity_key");
CREATE INDEX "proposal_item_combination_id_idx" ON "proposal_item"("combination_id");
CREATE INDEX "proposal_item_form_edition_idx" ON "proposal_item"("form_edition");
CREATE INDEX "proposal_item_run_id_idx" ON "proposal_item"("run_id");
CREATE INDEX "proposal_item_batch_id_idx" ON "proposal_item"("batch_id");
ALTER TABLE "proposal_item" ADD CONSTRAINT "proposal_item_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "drafting_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "library_change" ADD COLUMN "proposal_item_id" UUID, ADD COLUMN "batch_id" UUID;

-- The copy. Near matches (score 0.55 or more) become identity.near, with the comparison's reason as the near reason.
INSERT INTO "proposal_item" ("id", "workspace_id", "kind", "run_id", "step", "form_edition", "combination_id", "lands_on", "reuse", "payload", "source", "rounds", "rules",
  "agreement", "confidence", "reason", "origin", "identity", "identity_key", "status", "decided_by", "decided_at", "decision_reason", "basis", "choice", "decided_key", "work")
SELECT n.id, n.workspace_id, k.new_kind, n.job_id, j.kind, left(coalesce(fe.edition_label, sa.edition), 60), j.combination_id, k.lands_on,
  CASE WHEN n.kind = 'field' AND n.outcome = 'REUSE' THEN jsonb_build_object('match', 'reuse', 'existingKey', n.matched_key) ELSE jsonb_build_object('match', 'new', 'existingKey', NULL) END,
  CASE WHEN n.kind = 'field' THEN jsonb_build_object('kind', 'field', 'label', left(coalesce(n.payload->>'label', n.proposed_key), 120), 'aliases', '[]'::jsonb, 'meaning', n.proposed_meaning,
         'valueType', n.proposed_type, 'subject', NULL, 'formBox', NULL)
       ELSE coalesce(n.payload, '{}'::jsonb) || jsonb_build_object('kind', k.new_kind) END,
  CASE WHEN sa.sha256 ~ '^[0-9a-f]{64}$' AND coalesce(n.source_quote, n.evidence->'quotes'->>0) IS NOT NULL
       THEN jsonb_build_object('file', sa.file_name, 'sha256', sa.sha256, 'edition', sa.edition, 'page', NULL, 'quote', left(coalesce(n.source_quote, n.evidence->'quotes'->>0), 1000), 'quoteFound', true) END,
  '{"draft": null, "check": null}'::jsonb, '[]'::jsonb, 'one_round',
  CASE WHEN n.kind <> 'field' THEN 'check' WHEN n.outcome = 'REUSE' THEN 'ready' WHEN n.outcome = 'NEW' THEN 'check' ELSE 'decide' END,
  CASE WHEN n.kind = 'field' AND n.outcome = 'REUSE' THEN NULL ELSE left(n.reason, 500) END,
  'ai',
  jsonb_build_object('key', n.proposed_key, 'near', coalesce(near.keys, '[]'::jsonb), 'nearReason', CASE WHEN near.keys IS NULL THEN NULL ELSE left(n.reason, 300) END),
  n.proposed_key,
  CASE n.decision WHEN 'PENDING' THEN 'waiting' WHEN 'ACCEPTED' THEN 'accepted' WHEN 'RETURNED' THEN 'rejected' ELSE 'edited' END,
  n.decided_by, n.decided_at, n.decision_note, 'SAMPLE',
  CASE WHEN n.decision = 'PENDING' THEN NULL ELSE n.decision END, n.decided_key,
  jsonb_build_object('proposedKey', n.proposed_key, 'outcome', n.outcome, 'matchedKey', n.matched_key, 'candidates', n.candidates, 'persons', to_jsonb(n.persons), 'boxes', n.boxes,
    'evidence', n.evidence, 'affected', n.affected, 'reason', n.reason, 'legacyKind', n.kind, 'legacyPayload', n.payload, 'sourceQuote', n.source_quote, 'formEditionId', n.form_edition_id)
FROM "normalization_item" n
JOIN "drafting_job" j ON j.id = n.job_id
JOIN (VALUES ('field', 'field', 'library'), ('section', 'section', 'library'), ('answer_list', 'answer_list', 'library'),
             ('document_requirement', 'requirement_line', 'combination'), ('check', 'cross_check', 'combination')) AS k(old_kind, new_kind, lands_on) ON k.old_kind = n.kind
LEFT JOIN "source_attachment" sa ON sa.id = j.attachment_id
LEFT JOIN "form_edition" fe ON fe.id = n.form_edition_id
LEFT JOIN LATERAL (SELECT jsonb_agg(c->>'key') AS keys FROM (SELECT c FROM jsonb_array_elements(CASE WHEN jsonb_typeof(n.candidates) = 'array' THEN n.candidates ELSE '[]'::jsonb END) c
  WHERE (c->>'score') ~ '^[0-9.]+$' AND (c->>'score')::float >= 0.55 LIMIT 10) s) near ON true;

-- The log (Q-L4): what was copied and what was dropped, per workspace.
INSERT INTO "audit_event" ("id", "workspace_id", "actor", "action", "entity", "entity_key", "summary", "detail")
SELECT gen_random_uuid(), w.workspace_id, 'system', 'migrated', 'AI proposals', 'proposal_item',
  format('Moved %s AI proposals onto the one review queue; dropped %s that the queue does not take (%s)', w.copied, w.dropped,
    CASE WHEN w.dropped = 0 THEN 'none' ELSE left(w.dropped_keys, 400) END),
  jsonb_build_object('migration', '20261029200000_s6_proposal_item', 'copied', w.copied, 'rows_by_old_kind', w.by_kind, 'dropped', w.dropped, 'dropped_items', w.dropped_items)
FROM (
  SELECT n.workspace_id,
    count(*) FILTER (WHERE n.kind IN ('field', 'section', 'answer_list', 'document_requirement', 'check')) AS copied,
    count(*) FILTER (WHERE n.kind NOT IN ('field', 'section', 'answer_list', 'document_requirement', 'check')) AS dropped,
    coalesce(string_agg(n.kind || ' ' || n.proposed_key, ', ') FILTER (WHERE n.kind NOT IN ('field', 'section', 'answer_list', 'document_requirement', 'check')), '') AS dropped_keys,
    coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'key', n.proposed_key, 'decision', n.decision, 'payload', n.payload))
      FILTER (WHERE n.kind NOT IN ('field', 'section', 'answer_list', 'document_requirement', 'check')), '[]'::jsonb) AS dropped_items,
    (SELECT jsonb_object_agg(kind, c) FROM (SELECT kind, count(*) AS c FROM "normalization_item" x WHERE x.workspace_id = n.workspace_id GROUP BY kind) g) AS by_kind
  FROM "normalization_item" n GROUP BY n.workspace_id
) w;

DO $$
DECLARE copied bigint; dropped bigint;
BEGIN
  SELECT count(*) INTO copied FROM "proposal_item";
  SELECT count(*) INTO dropped FROM "normalization_item" WHERE kind NOT IN ('field', 'section', 'answer_list', 'document_requirement', 'check');
  IF copied + dropped <> (SELECT count(*) FROM "normalization_item") THEN
    RAISE EXCEPTION 's6_proposal_item: % copied + % dropped is not every normalization_item row', copied, dropped;
  END IF;
  RAISE NOTICE 's6_proposal_item: copied % proposals onto proposal_item, dropped % (rule rows and unknown kinds; listed in audit_event)', copied, dropped;
END $$;

DROP TABLE "normalization_item";
