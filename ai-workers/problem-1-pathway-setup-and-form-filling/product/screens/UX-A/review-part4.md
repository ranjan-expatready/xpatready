# UX-A part 4 review: internal identifiers behind "Details (for admins)"; saved AI answers named by form and date (commit 513e0533)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff 86f88a9c 513e0533` (base: UX-A part 3, approved). The row is BACKLOG UX-A (P-273), finding 4 of `screens/UX-baseline-2026-11-02/findings.md`, and EXPERIENCE §5. Done when a check proves, on the Fields list, a field's page and the Draft with AI dialog, at 1440, 1024 and 400 px with axe clean, that no data path, model name or run file is visible outside Details.

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`, with its web build.
* `isolated.sh rev_uxa4 4448`, fresh database, `demo/load` as user-A. :4400 was never used.
* US$0: no live switch, no draft started, no priced button clicked. Dialogs were opened and closed only, and `drafting_job` counts were unchanged.
* The builder's check overwrites the committed `uxa4-*` screenshots. I restored them with `git checkout`; the only file I changed is this one.

## Verdict: Block
One Major (M1). Fix it with a fail test, then re-request review. The Minors can be fixed or listed in the PR.

## What holds (evidence on 513e0533)
* **Builder's check:** `check_uxa4_details_browser.cjs 4448 xr_studio_rev_uxa4` passed 18/18, run twice.
* **Fields list:** no field key on any row at 1440, 1024 or 400 px. No `title` attributes, no sideways scroll, axe clean at all three widths. Load time is 491–660 ms.
* **Field page header:** the key is only under a closed "Details (for admins)" (`library.tsx:133`).
  * Keyboard: from the list, 21 Tabs reach the first field and Enter opens it. Two more Tabs reach the summary, and Space opens it.
  * axe is clean at 1440, 1024 and 400 px. No sideways scroll at 400 px or at 200 % zoom.
* **Draft with AI dialog:** checked on both forms that offer it (Visitor visa and Super visa, IMM 5257).
  * The main path has no model name, job id, run file or budget line.
  * The saved answer reads "IMM 5257 · saved Oct 21, 2026, 6:09 a.m. · paid US$1.55 then".
  * Details holds the job, the saved run's id and "US$0.00 of the US$120.00 experiment cap · Wave 1: US$0.00 of US$60.00".
  * The main path says "US$60.00 left before the AI spending cap". That is the smaller room (the wave's), so the figure is correct.
  * Tab order: radio → select → summary → Cancel → Use Saved. The dialog fits at 1024, 400 and 200 % zoom.
* **`AdminDetails`** is a native `<details>`, closed by default. It renders nothing when it has no values, and long values break inside the `dd`.
* **Search still matches a field key** (`library.tsx` FieldsPage filter), so an admin can paste one in.
* **Graph:** no new route or page. The G3 and G6 items are not from this diff.

## Blockers
None.

## Majors
**M1. A release hash and AI run file names are still on the main path of every field page (164 of 164).**
* **Where:** "Where it comes from" reads, for example, "From the reviewed work-permit release 2c66472f3758 · proposed by AI runs c1-fieldmap-imm5707-live-20261020t052222731z".
  * Source: `api/src/library-sources.ts:40-43` (`releaseLine`), rendered at `web/src/pages/library.tsx:172`.
  * Screenshot: `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots/field-release-hash.png`.
  * I confirmed it through `/library/fields/:key/sources` for all 164 fields: every one has the hash and at least one run file.
* **Why it blocks:** "a field's page" is a named screen, and the done-when says no run file outside Details. EXPERIENCE §5 [M] also forbids hashes.
* **Why the check passed:** it tests the field page only against `KEY`, never against `INTERNAL` (`check_uxa4_details_browser.cjs:48`). It also reads the page before `[data-sources]` has loaded.
* **Fix:**
  * Keep the origin in words on the main path, for example "From the reviewed work-permit release (Release 1) · proposed by AI". Trust and sources need the "proposed by AI" part.
  * Move the release hash and the run names into the page's `AdminDetails`, for example `["Release", hash]` and `["AI runs", runs]`.
  * Fail test: wait for `[data-sources]`, then assert `INTERNAL`, plus a 12-hex pattern, is absent from the main path. Run it on a field whose form field has no label, at 1440, 1024 and 400 px.

## Minors (fix, or list in the PR)
**n1. The model name was removed, not moved.**
* The row says model names go "behind" Details, and the header of `details.tsx:1-5` says Details holds "the AI model". The dialog passes no model (`sources.tsx:177`).
* An admin can no longer see which model a Live run (up to US$5) would call. The server still knows it (`api/src/sources.ts:264`, `claude-opus-5-5`).
* Fix: add a `["Model", …]` line, taken from the options response rather than hard-coded.
* Related: the running-job message `api/src/sources.ts:524` still says "Claude Opus 5.5" on the Forms tab. That is outside the named screens, and I could not walk it (it would mean starting a priced run).

**n2. The `title` on an unlabeled form field puts a data path outside Details** (`library.tsx:179`).
* Example: `IMM_5707[0].page1[0].SectionA[0].Parent1[0]…yesno[0]` on `relationship.accompanies_subject_to_canada`, with 4 such rows on IMM 5707. There are 17 such rows on 12 fields.
* Hover shows the path to every role. Keyboard and touch users cannot reach it.
* The main path does not need it: rows are told apart by "Whose value" and "Row".
* Fix: put the paths under the page's Details, or drop the `title`.

**n3. The same page says `form field ""` for those 12 boxes.**
* Source: `library-sources.ts:64` uses `??`, so an empty caption is kept. A null caption would print the data path.
* Fix: use the new words, "a form field with no label".

**n4. Other codes remain on the field page's main path.** These were not added by this diff.
* A check code, `OR_PGWP_LANGUAGE_PROOF`, in "Conditions that read it" (`library.tsx:186`).
* Transformation codes in mono, for example `yes_no_code:1/2` and `phone_part:nanp_area_code (3 digits)`.
* Rule text that names `case.lmia_or_offer_number`.
* These fall under EXPERIENCE §5 (IDs). Either record them as a follow-up row or render names for them.

**n5. The field URL still holds the key** (`/library/fields/case.application_date`). Finding 4 names the URL. A key in the URL is common practice, so I accept it, but the decision should be written in the PR or in `challenge.md` and not left open.

**n6. Visual.**
* At 1440 px the saved-answer select is cut off at "paid US$1.55 ther". The form and date come first, so they stay readable.
* `break-all` splits "U / S$0.00" in the Details spending line.

**n7. Check coverage.**
* The field page is not checked at 1024 or 400 px.
* The dialog gets axe only at 1440.
* `KEY` misses the `relationship.`, `organisation.` and `document.` prefixes, and all three exist in the demo.
* `check_cost_warning_browser.cjs` was read, not run: it clicks Start Live and Continue. The assertion moves look correct.

## For the Lead (questions the builder raised; not findings of this diff)
* **Other main-path screens:** I scanned `main` text in the demo state of /review, /review/proposals, Visitor visa overview, Forms and Preview, the Forms library, AI work, Activity, and a rules-only job page. I found no field keys, data paths, hashes or run files.
  * The key-based AI proposals page (`job.tsx`) needs an AI job with proposals. Producing one needs a draft, so I could not see it.
  * To review rows and the studio Preview were empty or default in this state. Both should be in the fresh UX walk that the row's done-when asks for.
* **The `title` question:** not acceptable as the only place for the path (n2).

## D1–D20 (1–5; only those this diff moves)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | The list, field header and dialog are met. The field page's sources line fails the done-when (M1). |
| D10 Language | 3 | Saved answers are named well. A hash, run files, codes and `""` remain on a named screen (M1, n3, n4). |
| D11 Feedback and state | 4 | Details is closed until opened. The model is no longer visible to an admin (n1). |
| D13 Accessibility | 5 | axe 0 on the list and field page at three widths and on the dialog. Keyboard and 200 % zoom pass. |
| D16 Testability | 3 | Pass and fail cases exist, but the field-page fail case misses `INTERNAL`, async sources and two widths (M1, n7). |
| D17 First-use / D20 Pain and wow | Simulated only | — |

## Journey test (reviewer, 2 Nov 2026)
Walked headless with Playwright on :4448. Scratch screenshots are in `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots/`.

| Journey (persona: goal) | Result |
|---|---|
| J1 author: "what is Application date and where is it asked?" Fields → field page | Named by name and meaning. The sources line shows a hash and a run file (M1). |
| J2 admin: "which key is this?" Details on the field page | Holds. The correct key, opened by keyboard. |
| J3 author: "which form fields read this?" on a field with unlabeled boxes | 4 rows with the same label, told apart by "Whose value". The path is on hover only (n2), and the sources line shows `""` (n3). |
| J4 author: "redo the IMM 5257 map with the saved answer" (opened, not started) | Holds. Named by form and date, with the room left before the cap. |
| J5 admin: "which job, run and budget?" Details in the dialog | Holds. The model is missing (n1). |
| J6 recovery: Escape or Cancel, reload | Holds. No job is created, and Details is closed again. |
| J7 keyboard only, list → field → Details; dialog Tab order | Holds. |
| J8 1440, 1024, 400 px and 200 % zoom | Holds. No sideways scroll; the select is cut off (n6). |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Find, open, read the key, and choose a saved answer all work. |
| Next step obvious | 1 | Unchanged flows; Details is labelled. |
| Plain words | ½ | M1 hash and run files; n3, n4. |
| Feedback and state | 1 | Details is closed until opened and stays in place at each width. |
| Correct data | 1 | Key, date and cost match the API. No job is created. |
| Error recovery | 1 | Cancel, Escape and reload leave nothing behind. |
| Accessibility and sizes | 1 | axe 0. Keyboard and 200 % zoom pass. |
| Speed | 1 | List ≤ 660 ms; slowest field page 465 ms. |
| Visual quality | ½ | n6: the select is cut off and "U / S$" is split. |
| Trust and sources | ½ | Origin is shown, but through a hash and file names (M1). The model is gone for admins (n1). |
| **Total** | **8.5 / 10** | **Pass on score.** The verdict is still Block because of M1. Fix M1 first, then n1. |

**Could not test:**
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A running Live draft or a job page with AI proposals (both priced).
* Two saved answers for one form in the same minute, which would be listed with identical names.
* CI for the check, which uses the Mac's psql path.
