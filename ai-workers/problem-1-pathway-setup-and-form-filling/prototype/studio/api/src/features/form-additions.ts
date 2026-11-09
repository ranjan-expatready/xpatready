// C7.8 Add a library form to one filing (B141, screens lane): the addable list, one form's coverage, add, remove, blank PDF.
import type { Feature } from "../features.ts";
import { FormAdditions, FormAdditionsController } from "../form-additions.ts";
export default { controllers: [FormAdditionsController], providers: [FormAdditions] } satisfies Feature;
