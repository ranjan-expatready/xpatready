// C6.5 part 2 (M3 plan row C7): documents read into proposed facts, one "Confirm & use" per document, typed-versus-document checks.
import type { Feature } from "../features.ts";
import { CaseDocuments, CaseDocumentsController } from "../case-documents.ts";
export default { controllers: [CaseDocumentsController], providers: [CaseDocuments] } satisfies Feature;
