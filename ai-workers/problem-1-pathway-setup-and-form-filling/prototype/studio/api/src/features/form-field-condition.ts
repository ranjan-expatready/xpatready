// B86 (QA-237, C4.11): a form field can hold its question's condition in a form the rule can read (api/src/form-field-condition.ts).
import type { Feature } from "../features.ts";
import { FormFieldConditions, FormFieldConditionsController } from "../form-field-condition.ts";
export default { controllers: [FormFieldConditionsController], providers: [FormFieldConditions] } satisfies Feature;
