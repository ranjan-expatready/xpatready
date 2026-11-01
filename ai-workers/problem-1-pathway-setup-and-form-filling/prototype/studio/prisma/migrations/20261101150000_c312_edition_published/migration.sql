-- C3.12 (forms lane, swarm B1b; P-123, P-32): the date the PDF itself says it was published (its ModDate, else its
-- CreationDate, as tools/read_form_identity.py reads it), kept on each form edition so the Forms list and its drawer can
-- show it. It differs from the printed edition: IMM 0008 Schedule 4 is edition 06-2020 but published 2022-12-06.
-- Expand-only: one new nullable column, no default, nothing else changes. NULL = not read yet (rows made before this; the
-- Forms list reads each such file once and keeps the answer); '' = read, and the file names no date.
-- Rollback (STANDARDS §5): ALTER TABLE "form_edition" DROP COLUMN "published" (nothing else refers to it).
ALTER TABLE "form_edition" ADD COLUMN "published" TEXT;
