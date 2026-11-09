// C6.4 checklist per person, C6.12 filings and /prepare (M3-B2, #325): the Visitor visa case's checklist, filings and
// prepare endpoints.
import type { Feature } from "../features.ts";
import { CaseChecklists, CaseChecklistsController } from "../case-checklist.ts";
import { CaseFilings, CaseFilingsController } from "../case-filings.ts";
import { CasePrepare, CasePrepareController } from "../case-prepare.ts";
import { FilingChanges, FilingChangesController } from "../filing-changes.ts"; // C6.13 (B135)
export default {
  controllers: [CaseChecklistsController, CaseFilingsController, CasePrepareController, FilingChangesController],
  providers: [CaseChecklists, CaseFilings, CasePrepare, FilingChanges],
} satisfies Feature;
