-- W1-10 slice 1 channels, database guards (forms lane; break report m3, m4; review S7). Expand only: checks and triggers,
-- no data changes. What the API already refuses, the database now refuses too.

-- 1. m3 / S7, C-10: a validated copy read back is insert-only history. It is never changed, and it is deleted only with
--    its case (the demo reset's cascade, as the copy it belongs to: runtime_copy_no_delete).
CREATE FUNCTION validated_copy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'validated_copy_guard: a validated copy read back is kept as it was read'; END IF;
  IF EXISTS (SELECT 1 FROM form_instance f JOIN runtime_case c ON c.id = f.case_id WHERE f.id = OLD.form_instance_id) THEN
    RAISE EXCEPTION 'validated_copy_guard: a validated copy is kept as long as its case';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_validated_copy_guard BEFORE UPDATE OR DELETE ON "validated_copy" FOR EACH ROW EXECUTE FUNCTION validated_copy_guard();

-- 2. m4: what IRCC accepts names at least one way, each once (contracts/form-library.ts AcceptsBody).
CREATE FUNCTION channels_each_once("FilingChannel"[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS
  $$ SELECT cardinality($1) >= 1 AND (SELECT count(DISTINCT x) FROM unnest($1) AS x) = cardinality($1) $$;
ALTER TABLE "form_edition_accept" ADD CONSTRAINT "form_edition_accept_channels_check" CHECK (channels_each_once("channels"));
-- Break M6: no account (paper filing) is accepted on paper only.
ALTER TABLE "form_edition_accept" ADD CONSTRAINT "form_edition_accept_paper_check" CHECK ("account" <> 'PAPER' OR "channels" = ARRAY['PAPER']::"FilingChannel"[]);

-- 3. m4, C-2: a line's signature fits its channel (contracts/forms.ts SIGNATURE_FITS): Online none or typed name; PDF
--    upload none, signed by hand and scanned, or typed name; Paper signed in pen; Not needed none.
ALTER TABLE "combination_form" ADD CONSTRAINT "combination_form_signature_check" CHECK (
  ("channel" = 'ONLINE' AND "signature" IN ('NONE', 'TYPED_NAME'))
  OR ("channel" = 'PDF_UPLOAD' AND "signature" IN ('NONE', 'HAND_SCANNED', 'TYPED_NAME'))
  OR ("channel" = 'PAPER' AND "signature" = 'PEN')
  OR ("channel" = 'NOT_NEEDED' AND "signature" = 'NONE'));

-- Rollback: ALTER TABLE "combination_form" DROP CONSTRAINT "combination_form_signature_check"; ALTER TABLE
-- "form_edition_accept" DROP CONSTRAINT "form_edition_accept_paper_check", DROP CONSTRAINT
-- "form_edition_accept_channels_check"; DROP FUNCTION channels_each_once("FilingChannel"[]); DROP TRIGGER
-- trg_validated_copy_guard ON "validated_copy"; DROP FUNCTION validated_copy_guard().
