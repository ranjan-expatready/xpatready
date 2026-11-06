-- B86 (QA-237): a form field can hold its question's condition in a form the rule can read. Additive; old rows read as "not confirmed".
ALTER TABLE "form_field_map" ADD COLUMN "condition_rule" JSONB;
