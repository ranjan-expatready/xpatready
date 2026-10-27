# S4 Form library (W1-06, W1-07 run card): independent review, 27 Oct 2026

Reviewer: not the builder. Reviewed commit 6a32505 (`forms/2026-10-27-s4-form-library`) against:
* walkthrough v2 S4 and P-123 (with the C11.18 addition and the M1/M2 annotations), P-116, P-121, P-110 and P-125;
* C11.2, C11.8, C11.11, C11.14, C11.15 and C11.18;
* challenge.md with the Lead response, build-notes.md, STANDARDS, EXPERIENCE and PRODUCT §3–4.

Method: an isolated copy on :4450 with the stand-in launcher (stub probe first; no paid call, no canada.ca), walked in headed Chrome. Journey test: `journey-test-reviewer-2026-10-27.md`. Screenshots: `review-shots/r01–r61`. US$0.

## Verdict: **Ship after fixes**
The run card, Stop, Upload PDF (rules first) and the C11.18 server rules are solid. One Must, a data-loss path, and seven Majors stand between this and a clean ship. **Journey score 6.5/10: not a pass** (no criterion at 0).

## Must
1. **A form in use can be deleted, including an approved official edition.**
   * Evidence (journey 9): IMM 5257 has its PDF attached as a source on Visitor visa and Super visa, with 3 field-map jobs. Its `uses` returns `[]` and `can.delete` is `null`. The author asked, user-B approved, and `gov_form_def` IMM 5257 was gone while its 2 attachments remained.
   * The library itself shows this use: "Re-read with AI" on IMM 5257 targets Visitor visa's copy (`form-library.ts:57,72`). Yet the row and the drawer say "Not used / Nothing uses it" (r01, r05).
   * It breaks P-116 ("Where used shows before any action"; "an approved official form edition is retired, never deleted (P-51)") and STANDARDS §3.5.
   * Cause: `form-uses.ts:32-47` counts only form lines, releases, held files and open changes.
   * Fix: count source attachments and their drafting jobs or field maps as uses that block. Refuse Delete for any edition on the manifest, approved, or an official download (offer Retire). Show the same uses in "Used by". Add a pass test and a fail test.

## Major
2. **Load sample leaves the library thin, against P-123.** After the load (journey 1):
   * 12 rows, Guides 0.
   * Only "With an LMIA" appears under Used by.
   * Visitor visa, Super visa, Study permit and Spouse show nothing.

   P-123 says "Load sample replays the finder and must pick up every PDF, checklist and guide the sample combinations need". `fillSample` only adds pages and dates. Fix: Load sample replays the saved finder runs at US$0, or the Lead records that this belongs to S5's Start setup.
3. **The drawer goes stale after "Send for a second person".**
   * It keeps "Not set yet" with no "Change waiting", and offers Set again; the second send gets a 409 (r31).
   * Cause: `library-forms.tsx:51,105` passes a snapshot `Row`.
   * Fix: the drawer reads its row by code from the live list query.
4. **The C11.18 review wording and content.**
   * To review reads "Set_accepts the what IRCC accepts." (r32).
   * The change page title reads "Set what IRCC accepts for what IRCC accepts: IMM 1295 · IRCC accepts: …".
   * The page has no before value and no link to the form or its canada.ca page for the second person to compare (r33). EXPERIENCE §3 "Change set" asks for before and after.

   Fix: plain action words for `form_accepts`; show before → after; link the form page.
5. **At 1024 px, Status and the ⋯ actions sit off-screen inside the table.**
   * "Used by" reads only "Work permits ...", which hides the combination (r06-list-1024).
   * EXPERIENCE §2.12 requires 1024 px to work.

   Fix: keep Status and ⋯ visible (pin them, or drop or merge Type and Edition below 1280). Show the trail's last part first.
6. **The held and failed upload cards give the wrong next step.**
   * "See the details" links to `/library/forms`, the page already open (`runs.ts:61,65`).
   * The held card says "Waiting for a second person on To review", while To review asks the uploader to "Record the IRCC page" first (journey 3).
   * An unread held file never appears in the list's "Needs your OK".

   Fix: link a held run to `/review/held/:id` with the uploader's real next step; for a failed run, offer "Upload another file".
7. **A stopped finder run leaves job files in `prototype/p2/jobs` (the source tree), and they break a later replay.**
   * Evidence: `check_forms_s4_finder` gave 81/83 with them present ("replay reuses the saved answers …" → `[]`; "Find again never attaches back …"). After removing them it gave 83/83.

   Fix: write the job files under the copy's `var/`, or remove them when the run ends or stops. Add a test: replay works after a stopped run.
8. **Focus and keyboard.**
   * Closing the drawer, or a retire or delete dialog opened from ⋯, sends focus to the page top or to `body` (WCAG 2.4.3).
   * The hidden file input is an invisible tab stop (2.4.7).
   * The chip is `hidden md:inline-flex` (`run-card.tsx:88`): it is gone at 390 px and at 200 % zoom on a 1440 screen.

   Fix: return focus to the trigger; `tabIndex={-1}` on the input; a compact chip at small widths.
9. **IMM 5802 (an employer's offer form) shows as Type "Checklist", IRCC accepts "Not filed".** Cause: `TYPE_OF` maps `document` to checklist (`form-library.ts:33`). It is a wrong statement about a filed document. Fix: a Document type, or map `document` to form wording.

## Minor
Chip appears up to 6 s late (idle poll; launch does not invalidate `runs-active`) · finder step 1 tagged "AI" while it says "No AI call was made" (r21) · table aria-label leaves out "IRCC accepts" · run cards lost on reload or leaving the page · a waiting retire or delete not shown on the row ("Ready") · "In the library (in library)." · Replace on a newer edition sends the person to "Find again on a combination" · `proposeAccepts` lacks the lifecycle's after-create guard (`form-library.ts:99-101`; a 20-way race still gave 1) · no CHECK constraints on `accepted_channels`, `accepted_basis`, `origin` (STANDARDS §3.4) · shared drafting dialog still says "A sent AI call cannot be recalled by Cancel", and a toast covers its footer (r51) · two routes read and stop a finder run (`/form-finder/runs/:id`, `/runs/:id`).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | One list, filters, drawer, Upload rules first, C11.18 and Stop are built. Load sample (P-123) and P-116 delete do not meet the decisions (Must 1, Major 2) |
| D2 Data integrity | 2 | Duplicates and races are refused, but a used, approved official form can be deleted (Must 1) |
| D3 Reuse | 4 | Stored once; a duplicate upload adds nothing; one intake |
| D4 Rule integrity | 3 | The "where used" rule is incomplete, so a delete leaves orphan attachments |
| D5 Stability and recovery | 3 | Stop in 1.8 s with no process left, and restart recovery. Stale job files break replay; cards are lost on reload |
| D6 Freshness and governance | 4 | Checked dates, "Updated on canada.ca", history, a second person. No before value on the change page |
| D7 AI trust | 4 | AI · Sample, IRCC's words, Picked by AI, "no AI call was made". Step 1 is mis-tagged |
| D8 Orientation | 3 | Breadcrumb and trails, but the trail is cut before the combination's own name |
| D9 Flow | 3 | Upload to library is short. Held and failed uploads link nowhere useful |
| D10 Language | 3 | Plain overall. "Set_accepts the what…", the doubled title, IMM 5802 "Checklist" |
| D11 Feedback and state | 3 | The card is excellent. The drawer is stale; a waiting lifecycle change is not on the row |
| D12 Visual quality | 4 | Calm, aligned, dense (r01, r21) |
| D13 Accessibility and responsive | 3 | axe clean on 16 states, no sideways scroll. Focus loss, the 1024 table, no chip below 768 |
| D14 Team look | 4 | Team tokens and components, the Studio shell |
| D15 Speed | 4 | First view 412–690 ms, filter 136 ms. Search sends one request per keystroke |
| D16 Testability | 3 | Runs 49/49, canada 49/49, finder 83/83 only on a clean folder. No test for source-attached use |
| D17 First use | 3 | Simulated only |
| D18 Provenance | 4 | Origin, PDF link, form page, fingerprint, who said what IRCC accepts |
| D19 End-to-end | 3 | The library does not show the sample combinations as users of their forms (Major 2) |
| D20 Pain and wow | 3 | Simulated only. The run card with a real Stop is the wow; a thin sample undercuts it |

## Standards [M], short
**Met:** authorisation on every write (403 upload, Stop, delete by URL; author ≠ approver) · Problem Details with field errors · idempotent finder launch · expand-only migration with rollback · one request per list view · axe on every state · uploads outside the web root · cost stated first and capped (US$60 wave) · every state drawn (empty, loading, no match, error, read-only, long title, running). **Not met:** §3.5 referenced items retired, never deleted (Must 1); EXPERIENCE §2.12 at 1024 px and focus (Majors 5, 8); §3 Change set before and after (Major 4). **Not judged:** OpenAPI generation, as elsewhere. **Graph (P-86):** no S4 gaps (G3 shows only the older `/attachments/:id/file`).

## Could not check
A paid live run, and whether a stopped real call is charged at its reserved cost (the stand-in has no ledger). A real screen reader, Firefox or Safari. Canada.ca live. D17 and D20 need the founder's or an intended user's walk.

**Housekeeping, for the Lead:** I removed five untracked finder job files from `prototype/p2/jobs`: two from my stopped run, and three of unknown origin that were present when the finder check failed. Two more appeared at 19:53, from another copy (`isolated-forms_brk` on :4451) working in this same worktree; I left them.
