// C6.4 checklist per person, C6.12 filings and /prepare (M3-B2, #325): the Visitor visa case's checklist, filings and
// prepare endpoints.
import type { Feature } from "../features.ts";
import { CaseChecklists, CaseChecklistsController } from "../case-checklist.ts";
import { CaseFilings, CaseFilingsController } from "../case-filings.ts";
import { CasePrepare, CasePrepareController } from "../case-prepare.ts";
export default {
  controllers: [CaseChecklistsController, CaseFilingsController, CasePrepareController],
  providers: [CaseChecklists, CaseFilings, CasePrepare],
} satisfies Feature;
