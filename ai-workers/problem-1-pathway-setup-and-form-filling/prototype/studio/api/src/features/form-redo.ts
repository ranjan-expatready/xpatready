// C11.15 Redo with AI on one form, per stage (forms lane; api/src/form-redo.ts).
import type { Feature } from "../features.ts";
import { FormRedo, FormRedoController } from "../form-redo.ts";
export default { controllers: [FormRedoController], providers: [FormRedo] } satisfies Feature;
