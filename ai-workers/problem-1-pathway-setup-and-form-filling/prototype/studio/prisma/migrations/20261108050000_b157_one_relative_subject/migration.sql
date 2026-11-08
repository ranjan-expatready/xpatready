-- B157 (STANDARDS §3.4, "every link checked twice": database constraint and service rule; B128 #1256, B155 #1367): one
-- answer subject per person (party) and relation for the relatives a form describes (a parent: 'parent_1', 'parent_2';
-- the list of brothers and sisters: 'sibling'). The API makes them on their first answer under an advisory lock
-- (api/src/runtime.ts subjectFor); this index is the database's own check, so two can never exist even past the lock.
-- Partial: a party holds one 'case' and one 'principal' subject per case it is on (api/src/runtime.ts createCase), which
-- stays allowed. Expand only: no row changes. The lock has kept one per party and relation since B128, so no row breaks
-- it; should one ever, the index is refused ("could not create unique index") and nothing changes: keep the lowest id
-- (the one every read takes, relativesOf), move its twins' answers to it, then apply again.
-- Rollback: DROP INDEX "answer_subject_one_relative_per_party";
CREATE UNIQUE INDEX "answer_subject_one_relative_per_party" ON "answer_subject" ("party_id", "subject_kind") WHERE "subject_kind" IN ('parent_1', 'parent_2', 'sibling');
