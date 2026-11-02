// C11.13 "Draft fields" (S6 plan slice 1b item 6, P-138): a form edition's saved AI draft onto the review queue at US$0.
import type { Feature } from "../features.ts";
import { FieldDrafts, FieldDraftsController } from "../field-drafts-routes.ts";
export default { controllers: [FieldDraftsController], providers: [FieldDrafts] } satisfies Feature;
