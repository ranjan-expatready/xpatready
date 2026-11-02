# Review: C2.6 checklist lines through the review queue's one door (PR #574, commit 643a2116, QA-157)

Reviewer: independent, did not build. Basis: `git diff origin/main...643a2116 -- prototype/studio`, the running app on isolated copies (4452, and a fresh one on 4453), the code, the tests. No live AI, US$0 (drafting_job cost 0 throughout). No concept.md exists for C2.6; judged against `acceptance/C2.6.test.ts`, QA-157, P-149, P-134, P-121, P-158, STANDARDS, EXPERIENCE.

## Verdict: Block (2 Major open)

## What held
- `acceptance/C2.6.test.ts`: 32/32 on two fresh copies. `check_forms_c26_checklist` 38/38, `check_screen02_fix` 61/61, `check_screen02_slice2` 54/54. `check_forms_c411_draft_qd` 59/72: the 13 failures are all its Live steps (it needs STUDIO_AI_LIVE and a fake launcher; not set by me by rule), so that suite is not verified here.
- Accept goes through `POST /api/review/proposals/decide` and lands a DRAFT document line (`origin AI_PROPOSAL`, IMM 5484 file and quote kept); the document type it needs lands in the same decision and waits for a second person. `apply-checklist` and the checklist page's per-item decide answer 410 and write nothing.
- Non-author: user-B and user-C get 403 "does not hold the author duty" on accepting a line; nothing written. Three parallel accepts of one line: one 201, two 409 (no duplicate line, no duplicate type).
- Edit checks: bad person, condition without tree, bad tree, duplicate line, rejected type each refused in words; atomic (nothing half-written).
- Rules: IMM 5484 gives 9 lines (Check 6, Decide 3), the 10 Super visa lines and "any additional documents" are left out with the reason; IMM 5488 (the other saved reading) is unchanged by the Super visa part (no such heading), keeps 12 lines, its visa-office marriage line becomes Decide, which its own note says.
- Browser: axe WCAG 2.2 A/AA clean on queue and job page at 400, 1024, 1440; no sideways scroll; each loads in about 0.4 s; keyboard: Tab reaches Open, Enter opens, Accept reached in one Tab, Esc closes; no console errors (one expected 409).

## Findings

### Major 1: a second door still decides checklist lines without writing them
`api/src/sources.ts:767` `acceptClean` (`POST /api/jobs/:id/accept-clean`, needs only the review duty, so a reviewer who cannot author may call it) was not closed for `checklist_draft` jobs. On a checklist job it marks every waiting item accepted (`recordChoice`, `decidedKey` = a proposed key) and returns `{accepted: 6}`, writing no document line and no library type. Observed on 4452: 3 lines and 3 types showed "accepted" in `proposal_item` with no `document_requirement` or `document_type` row; the queue no longer lists them; the lines are silently lost until another replay. This is the P-149 breach the row exists to close, and it leaves the queue and the draft disagreeing. Fix: in `acceptClean` (and `recompare`/`apply` already refuse) reject `kind === "checklist_draft"` with the same 410 words as `decideChecked`, plus a test line in `check_forms_c26_checklist.ts` that calls it and asserts nothing changed.

### Major 2: Decide lines tell the person to "edit it", and the queue has no edit
`api/src/checklist.ts` (the `why` text for `l.office`, about line 111) and `api/src/proposals.ts` `landRequirementLine` (the 409 "Say when ... is needed before accepting it: edit it to give its condition, or to make it always needed", and the "edit the line ..." refusals) all send the person to Edit. The queue panel (`web/src/pages/proposals.tsx:158-168`) offers only Reject and Accept (Edit exists only as "Accept the checker's reading", and a checklist line has no checker round). Walked in the browser: "Purpose of travel evidence" (a Decide line with no condition) cannot be accepted; Accept shows the 409 asking to edit, the only exit is Reject and adding the line by hand. The other two Decide lines accept as they stand with the AI's "Draft condition: ... defers to the responsible visa office" sentence written as the line's condition (Marriage then reads `person.marital_status`, which is not in the library, so release is blocked: correct per P-223, but the person was never asked). Fix: say what the screen does (for a Decide line: "Accept writes the AI's draft; to change it, reject it and add the line on the combination's Documents tab"; and for the no-condition case "reject it and add it by hand"), or give the panel an edit; the first is within the row. Also drop "Draft condition: ... The checklist states no condition and defers..." from the sentence that lands (keep only the condition).

### Minor 3: Undo of a document type leaves a dangling document line
`api/src/proposals.ts` `undo` (about line 560) guards a type that another accepted item "reuses" but not a type a later accepted document line landed against (`t.decidedKey` branch of `landRequirementLine`). Reproduced by API: accept the type item (batch 1), accept its line (batch 2), undo batch 1 within 10 s: the type is deleted, `fee_payment_receipt:each_applicant` stays DRAFT with no document type. The same happens when two lines share one new type and the first is undone. The UI offers only the latest Undo, so it is API-reachable, hence Minor. Fix: in `undo`, refuse when an accepted `requirement_line` outside the batch has `relatesTo` in this batch's types (or a `documentRequirement.documentTypeKey` in its added type keys), in words, as the reuse guard does.

### Minor 4: words a person reads (EXPERIENCE [M]: no decision numbers, keys)
- Document type reason "never by AI vision (P-134)" (`api/src/checklist.ts` docTypeOf reason): a decision number on the main path.
- Job message and its "left out" list print raw keys: "visa_office_additional_documents", "n/a_processing_delay_notice"; 12 items run together in one paragraph (400 px screenshot: a full screen of it). Use `typeName`, and say "12 left out" with the list under it.
- Job page prints "Us nonimmigrant visa copy" (`web/src/pages/job.tsx` ChecklistJob) while the queue says "US ...".
- Kind word "Requirement line" on the queue (`contracts/review-proposals.ts:19`) versus "document line" on the checklist page and Documents tab: one name.
- Edit of a line to another type while its related type item is rejected says "Its document type X was rejected" about the old type, not the one now named (`landRequirementLine`, relatesTo is read even after an edit changed `documentType`).

### Minor 5: smaller
- Accept is offered to a person without the author duty (user-B, user-C) and refused after the click; the refusal words are plain.
- A refused duplicate accept in a race says "the database refused a duplicate", plain enough, not specific.
- Proposed document types carry no near-match against the library (`near: []`), unlike QA-159's concern for fields; Check keeps them out of bulk.
- No concept.md/build-notes.md in this folder, so the retrofit mapping is not recorded here.
- The "Saved · US$0" start button sits in the AI launch dialog behind setup state; I started the replay by API and walked everything after it in the browser (see journey report).

## D1-D20 (short)
D1 concept fit 3/5 (one door shut for 2 of 3 routes, see Major 1). D2 words 3/5 (Minor 4). D3 errors 3/5 (Major 2). D4 data integrity 3/5 (Major 1, Minor 3). D5 authorisation 4/5 (author on landing, review on accept-clean). D6 concurrency 4/5. D7 audit 4/5 (decide logged; replay logged). D8 accessibility 5/5 (axe clean, keyboard). D9 sizes 5/5. D10 speed 5/5. D17, D20: simulated only.

## Not checked
Real screen reader; an intended user's unaided walk; the Live steps of `check_forms_c411_draft_qd`; 200 % zoom beyond the 400 px width (400 px is the same reflow). One of my copies (4453) was stopped from outside by the builder starting on it; results quoted are from reruns on fresh copies.

Verdict: Block. Fix Major 1 and Major 2 (Minor 3 and 4 should go in the same commit); a diff-only re-review of the fix commit is enough.
