# Inventory index: every route and state, and its file (round 1, `main` fbfb263c7)

**68 files**, one per screen or state, each crawled at 1440 and 375 px with axe (`../tools/crawl.mjs`). Routes come from the router: `web/src/App.tsx` (Studio, `/link`, `/inbox`) and `web/src/runtime/cases.tsx` (`/cases/*`). A route or state not reached says why, so the next round (and UX-0's states file) can reach it. Each file holds: purpose, persona, pattern, on journey or not, every section with its fields (label, type, required, hint; the error text when a field is invalid, from `aria-describedby`), actions (filled or not, disabled, icon-only, tooltip, opens a dialog), links, fold-outs (arrow or not), tabs and notices, the counts, axe at both widths, the 14 scores, top problems and finding ids. A field's own purpose is its label and hint; the screen's purpose is written once per file.

## Set-up (Product Studio)

| Route | Files | Persona and data |
|---|---|---|
| `/` | `programs`, `programs--empty`, `programs--story` | author · the six, empty, finished story |
| `/` as case staff | `studio--as-case-staff` | case officer (permission notice) |
| `/structure` | `structure` | author · the six |
| `/review` | `to-review`, `to-review--approver`, `to-review--empty` | author, Approver |
| `/review/proposals` | `to-review-proposals` | author |
| `/review/change/:id` | `review-change` | Approver · configured (a decided change) |
| `/review/edition/:id` | `review-edition` (4 tabs as states) | author · configured |
| `/review/batch/:id` | **not reached** | needs a batch of AI changes applied and waiting for a second person (apply on an AI field map after deciding its proposals) |
| `/review/merge/:id` | **not reached** (its dialog is: `dialog-field-merge`) | needs a merge proposal waiting for a second person |
| `/review/held/:id` | **not reached** | needs an uploaded file held for a second person (upload with no matching form) |
| `/review/form-fields/:id` | **not reached** | needs an edition's Yes/No form fields waiting to be asked ("Ask as its own question") |
| `/c/:id/overview` · `forms` · `questionnaires` · `documents` · `preview` · `tests` · `review` · `sources` | `pathway-overview`, `pathway-forms`, `pathway-questionnaires`, `pathway-documents`, `pathway-preview`, `pathway-tests`, `pathway-review`, `pathway-sources` | author · the six (Visitor visa) |
| `/c/:id/preview?view=studio` | `pathway-preview--studio` | author |
| `/c/:id/overview` as Approver | `pathway-overview--approver` | Approver |
| `/c/:id/jobs/:jobId` | `pathway-ai-job` | author · IMM 5257 SCH1's field map |
| `/library/fields` · `sections` · `documents` · `forms` · `checks` · `rules` | `lib-fields`, `lib-fields--empty`, `lib-sections`, `lib-documents`, `lib-forms`, `lib-checks`, `lib-rules` | author |
| `/library/fields/:key` | `field-page`, `dialog-field-merge`, `dialog-field-must-verify` (inline panel) | author · Date of birth |
| `/release` | `release`, `release--empty`, `release--story` | author, Approver |
| `/releases` | `releases`, `releases--story` | author |
| `/ai`, `/ai/:batchId` | `ai`, `ai-batch` | author |
| `/activity` | `activity` | author |
| `*` | `not-found` | — |

## Cases and the client

| Route | Files | Persona and data |
|---|---|---|
| `/cases` | `cases`, `cases--empty`, `open-case-dialog`, `open-case-dialog--error` | case officer |
| `/cases/:id` | `case-page--officer` (+14 Agent view person tabs as states), `case-page--representative`, `case-page--new-case`, `case-page--client-blocked` | finished story family; a new family case (walk) |
| `/cases/:id` dialogs | `add-person-dialog`, `dialog-correct-number`, `dialog-send-link`, `dialog-keep-private`, `dialog-case-team` | case officer |
| `/cases/:id` dialogs **not reached** | Acknowledge… and Dismiss… a finding (need an open finding); Pass with a reason… (needs an open warning on Ready to file); Record the submission… (disabled once submitted); Not applicable… on a document line; Change channel; Add a form to a filing | each needs a case mid-way with that state: UX-0's states file builds it on the checkpoint |
| `/cases/:id/questionnaire` | `client-questionnaire` (task list, done), `client-task-list--new`, `client-question-page`, `client-question-page--long`, `client-questionnaire--as-staff`, `dialog-client-send-to-adult` | Client A; staff |
| `/cases/:id/questionnaire` "Check these answers" | **walked, not crawled** (`../tools/walk.log`, parts 19 and 43) | the state needs a conditional answer left empty |
| `/cases/:id/eligibility` | `case-eligibility` | case officer |
| `/cases/:id/review` | `case-check` | case officer (the priced "Live" run never pressed) |
| `/cases/:id/representative-review` | `representative-review` | representative |
| `/cases/:id/representative-review/:round` | `representative-review-round1` (error state: an unknown round) | representative |
| `/cases/:id/sheet/:itemId` | `answer-sheet` | case officer |
| `/cases/*` unknown case | `cases--not-found` | case officer |
| `/link` | `client-link` | Client A (scaffolding) |
| `/inbox` | `demo-inbox` | scaffolding: not scored, never ported |

## Not in the inventory, on purpose
* **Demo menu and its dialogs** (Load sample, Reset, Load the finished story): scaffolding (P-33, PRODUCT §5), never ported.
* **Loading, conflict (409) and slow-network states:** the crawl waits for the network to settle, so skeletons and conflicts are not seen. UX-0 adds a throttled pass and a stale-save step.
* **Dark theme:** not scored this round (`01-rubric.md` §1).
