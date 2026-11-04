// C9.2 Undo a changed fact (M3-F, runtime lane): POST /runtime/cases/:id/changes/undo.
import type { Feature } from "../features.ts";
import { CaseChanges, CaseChangesController } from "../case-changes.ts";
export default { controllers: [CaseChangesController], providers: [CaseChanges] } satisfies Feature;
