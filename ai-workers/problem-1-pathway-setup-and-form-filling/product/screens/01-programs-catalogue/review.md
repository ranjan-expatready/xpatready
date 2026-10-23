# Screen 01 — review (reviewer agent, 23 Oct, closing FIX pass)

Earlier rounds (early look, Lead decisions, first review, Lead checks, static-analysis triage) are in git history (`9f3bbf77` and before).

**Commit reviewed:** `c0e8ff98` on `claude/screens-01-fix-c3010a`. **Verdict: Ship after fixes.** 2 Must, 5 Should. **Journey score 8.5/10, a pass** (`journey-test-reviewer-2026-10-23.md`).
**How checked:** I read the concept, challenge, build notes ("Fixes (one FIX pass…)"), lead-check, BUGS.md, the standards and the diff `9f3bbf77..c0e8ff98`. I ran isolated copies on :4440 (`xr_studio_screens_rv`, `_rv2`, `_rv3`, each fresh, now stopped and dropped) behind the page proxy on :4441 (QA-4). Model calls were refused at `ANTHROPIC_BASE_URL=http://127.0.0.1:9`, so no paid AI ran. Seven journeys were walked in headless Chrome (Playwright), plus API and SQL probes.
**Suites I reran:** rules **61/61** · API **121/121** (fresh copy) · browser **115/115 twice** (fresh copy each time; timings: first view warm 207/215 ms, cold 1732/831 ms; filter 141/120 ms). The suite outputs went to my scratchpad, not to the repo.
**Mutation spot-check** (in a scratch copy of `contracts/` + `engine/`): removing `sharedStep` → 3 FAIL. Removing the punctuation-only rule → 1 FAIL. Removing the 120-character limit → 1 FAIL.

## Each bug this pass had to fix: checked in the running app
| Item | Result | Evidence |
|---|---|---|
| QA-1 shared release skipped review | **Fixed** | An approver sees "Held back: Not submitted for review" and the button reads "Nothing ready to release", disabled. `POST /pack/release` → 409. After submit with SME items unsigned: "2 changes need the content reviewer's SME sign-off" on both release routes. After the SME signs in the UI it says "Will be released". Changed after submit → held. Author → 403, submitter → 403 (suite). The DB records submitter user-A, approver user-B and the submission APPROVED. Three concurrent releases → one release, two 409s |
| QA-13 re-add a removed form | **Fixed, with a new defect (Must 2)** | Re-adding after a draft removal works, and so does re-adding after a released removal (v4 DRAFT supersedes RETIRED v3). A second add → 409. Five parallel adds → one line (201 + 4×409) and one audit line. Removing a released line now gives RETIRED v2 |
| "+ Add line" default channel (F1) | **Fixed** (PDF path seen) | New lines got `PDF_UPLOAD` on rows with no portal. I did not exercise the Online path; the forms suite (106) covers it |
| QA-7 / QA-6 name rules | **Fixed** | A 121-character name shows "Keep the name under 120 characters." in red, `aria-invalid`, and Create is off. "!!!" shows "Use letters or digits…". "Visa d'été — 日本語" was created by keyboard only at 1024 px |
| QA-11 | **Fixed** | "Open the existing combination" → `/c/6a6512f7…` |
| QA-10 | **Fixed** | "Submitted by Configuration author at 6:18:30 PM" |
| QA-12 | **Fixed** | Menu reads loaded → after reset "Load sample inputs" → hand-made program "Load sample inputs (programs exist: reset first)", disabled |
| QA-5 | **Fixed** | DB zone Asia/Kolkata. `updated_at` 18:15:29+05:30 matched `now()` |
| QA-3 | **Fixed** (read) | `restart-api.sh` and `stop.sh` kill only the listener on `STUDIO_PORT`. `stop.sh` still stops the shared database, as noted |
| P-63 words | **Fixed** | 19 pages swept: no "box" or "box map" on screen. Server strings use "form field" / "field map" |
| Next step said once | **Fixed** | Visitor visa: "Next step for all of these: Add 1 form from the library." A single line keeps its own step |
| QA-9 stale builder checks | **Not in the commit (Must 1)** | See below |

## Issues
**Must 1: QA-9 is not fixed in `c0e8ff98`.** The updated `tests/check_studio_browser.cjs`, `tests/check_catalogue_scale.cjs` and `tests/fixtures/scale_100.ts` exist only as uncommitted changes in the lane copy. The committed files are still stale: `check_studio_browser.cjs:176` clicks "Add program or category"; `check_catalogue_scale.cjs:24` waits for "Programs and their combinations"; `scale_100.ts:38` posts to `/programs`. The build notes say "(see below)" but there is nothing below. **Fix:** commit the three files and their evidence, and add the run result to the build notes.

**Must 2: undoing a removal resets the form line's content without saying so** (`api/src/form-lines.ts:33-36`). The undo-in-place writes the default `line` (who `each_applicant`, `COMBINATION_MANDATORY`, no condition) over the retired version, so the released who and when are lost.
* Walked in the UI on Live "With an LMIA": IMM 5409 was "Once per couple, conditional" in Release 1. Remove it, then click the header's "Add 1 form from the library". Result: the line is DRAFT, `each_applicant`, mandatory. The header says "1 draft change", and that change went out in Release 2 with no SME item.
* The build notes call this "undone in place", but the result is a different line. The API check (`check_screen01_api.ts:180`) asserts only version and status, so it passes.
* **Fix:** when undoing a pending removal, restore the superseded published row's who, attach mode, condition and channel (or drop the retired draft version). Assert "0 draft changes after remove + re-add".

**Should 1: the removed-form state contradicts itself.** After a removal the Overview Forms table still lists IMM 5409 with no "Removed" mark. "+ Add form" shows it as "Added", because `combination.tsx:136` passes `row.forms`, which includes forms attached only as sources. Meanwhile the header's next step is "Add 1 form from the library" (screenshot J6-5). The same "Added" pill appears for any form attached only as a source (Visitor visa IMM 5707). **Fix:** pass only form lines as `have`, mark removed-in-draft lines, and show source-only forms as addable.

**Should 2: `approve()` repeats the release gate instead of calling `releaseGate`** (`studio.ts:504-521` vs `:536`). This breaks STANDARDS §7 (no duplicated logic). It also shows the approver "approved hash differs from the submitted configuration". **Fix:** call `releaseGate` and use its plain message.

**Should 3: the "Changed after it was submitted" branch has no test.** I confirmed it by hand: held, and approve → 409. **Fix:** add a pass and a fail to the API suite.

**Should 4: `addFormLine` catches P2002 inside the AI-apply transaction** (`sources.ts:402`). In PostgreSQL the transaction is already aborted at that point, so under a race the apply fails instead of answering "already". **Fix:** use a savepoint, or check under a row lock.

**Should 5: browser Back loses the highlight.** Browser Back from a combination page returns to `/?f=all` with no highlighted or focused row. The in-page "Programs" link restores the row and the scroll (Extend stay in Canada, scrollY 307). The concept says "Back … the opened row highlighted". **Fix:** restore from history state on popstate.

## [M] standards (met unless listed)
**Not met:**
* STANDARDS §6 deny by default: an unknown or missing `x-actor` creates a combination (201). The builder labels this "Not built: simulated people"; the Lead should accept or route it.
* EXPERIENCE §5: the Review tab shows "Fingerprint 20a20b34…", internal item keys (`review_test_letter:principal_applicant`) and derived-field keys. The builder assigns these to Screen 03 and they are not counted here.
* EXPERIENCE §1 type scale: the path-builder hints use `text-[12.5px]` (`new-combination.tsx:157`).

**Met, with evidence:**
* Problem Details with field errors.
* Server authorisation by duty: approver → 403 on create; author → 403 on release.
* One request per view: catalogue 12 ms.
* axe: 0 violations on 19 pages and every suite state.
* No sideways scroll at 1024 px or 200 % zoom (list, combination, new, release).
* Keyboard path: tab to the grid, arrow keys, Enter, in-page Back.
* Race safety: shown above.
* Freshness: shown.
* Demo chrome separate: "Demo" menu and "Prototype" badge.

**Scaffolding (P-33):** the sample load and my document-requirement setup used the API. The release, sign-off, submit, remove and re-add steps used the product's own screens.

## D1–D20 (1–5; independent reviewer, browser/script)
| D | Score and evidence |
|---|---|
| D1 Requirement fit | 4: 11 of 12 fix items verified live; QA-9 not committed (Must 1) |
| D2 Data integrity | 3: races refused by the DB (adds, releases); undo resets released content (Must 2); deny by default open |
| D3 Reuse | 4: one `addFormLine` for three callers; library forms reused, not copied |
| D4 Rule integrity | 4: one gate on the shared release; status calculated; rule mutations caught |
| D5 Stability and recovery | 4: 30 s release transaction; reload and in-page Back hold; browser Back loses the highlight (Should 5) |
| D6 Freshness and governance | 4: stored times correct (QA-5); refused releases audited; real submitter recorded |
| D7 AI trust | 4: AI steps marked, with tooltips (suite F3); no AI step run here (QA-8, no paid AI) |
| D8 Orientation | 4: full clickable path; Back to the row via the page link |
| D9 Flow | 4: one step, said once; removed-form signals conflict (Should 1) |
| D10 Language | 4: P-63 complete on 19 pages; hashes and keys remain on the Review tab (Screen 03) |
| D11 Feedback and state | 4: field errors, held reasons, draft bar, toasts |
| D12 Visual quality | 4: clean and aligned; one off-scale size |
| D13 Accessibility | 4: axe 0, keyboard, 1024 px and 200 % zoom; no real screen reader |
| D14 Team look | 4: team tokens and patterns; team-name mapping recorded in the build notes |
| D15 Speed | 4: warm first view 207–215 ms, filter 120–141 ms; one cold load at 1.7 s on a busy machine |
| D16 Testability | 4: suites rerun green by a non-maker; mutations caught; gaps in Must 2 and Should 3; c8 coverage not run by me |
| D17 First-use | Simulated only. The founder's walk is pending (lead-check) |
| D18 Provenance | 4: origin pills, sources tab, release by and when |
| D19 End-to-end | Not yet evidenced beyond configure → release (case onward is later screens) |
| D20 Pain and wow | Simulated only |

## What I could not check
* The Online-channel default (forms suite only).
* AI drafting and its review (QA-8 in lane copies; no paid AI).
* A real screen reader.
* A visible (headed) browser walk: I used headless Chrome and looked at the screenshots.
* Rule mutations on the API side. That needs a scratch copy of the server; I did spot-checks by reading the code.
* c8 coverage.

My screenshots are temporary, in my scratchpad (`…/scratchpad/jt/shots/`), and are not committed.
