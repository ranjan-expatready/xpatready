// B107: a form field's gate, or "filled by hand", from the form's own words, approved by a second person (no route: the
// configured checkpoint proposes them from cited data). Registers the approval hooks (api/src/form-field-gates.ts).
import { FormFieldGates } from "../form-field-gates.ts";
import type { Feature } from "../features.ts";

export default { providers: [FormFieldGates] } satisfies Feature;
