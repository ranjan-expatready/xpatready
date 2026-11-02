# UX-A part 1 re-review, round 3: one definition per count (commit 2c877d10)

Reviewer agent (did not build it), 2 Nov 2026. This round checks **2c877d10** (on top of 6446a2db) against my round 2 (`review-part1-r2.md`: Block on N1; minors n1–n4). Spec: BACKLOG row UX-A (P-273), finding 1 of `screens/UX-baseline-2026-11-02/findings.md`.

## How the commit was run
The shared checkout's code had moved on past 2c877d10 while I worked. These files had uncommitted changes, so a copy started from that checkout would not run this commit:
* `contracts/counts.ts`: `removedInDraft` by release snapshot, and the newest attachment per form.
* `api/src/workspace.ts`.
* `api/src/programs.ts`: attachments ordered by `createdAt`.
* `finder.tsx` and `forms.tsx`: a Retry on the finder line.
* `check_uxa1_counts_rules.ts`.

`web/dist` there was also rebuilt at 16:03, after those web edits.

So I ran the exact commit instead:
* `git archive 2c877d10` of `prototype/` and `official-sources/` into my scratch folder, with `node_modules` symlinked and the web built there (bundle `index-CIsedw8p.js`).
* A database of its own, `xr_studio_rev_uxa1c`, served on :4446. I started it by hand with the same steps as `isolated.sh`, which cannot check the database from a scratch path.
* `POST /api/demo/load` as user-A. US$0: no live AI, no priced button.

Earlier runs against the moving checkout are used below only where that code is identical to the commit (noted).

## Verdict: Approve

N1 is fixed, and I found no new Blocker or Major. n1–n3 are fixed; n4 goes in the PR body.

## Round 2 findings
| Item | Status | Evidence (exact commit unless noted) |
|---|---|---|
| **N1** form approved in the product | **Fixed** | See the steps below. |
| n1 Preview against Questionnaires | Fixed (words) | The Preview says "Every question for Principal applicant in this Sample family … Counted as the Questionnaires tab counts them; that tab reads the largest household the combination allows, so a person's number can differ with the family chosen here" (`preview.tsx:117`). In LMIA without a spouse the numbers stay 136 against 135, but the screen now says why (walked on the checkout; this file is identical to the commit). |
| n2 finder on a failed count | Fixed (code) | "The forms count could not be loaded (Retry on the filing line below)" (`finder.tsx:151`). I could not make the summary fail live. |
| n3 footer | Fixed | "143 questions for Principal applicant, from the largest household the combination allows." |
| n4 contract changes | In the PR body | I cannot see the PR. |

**N1 steps.** On the demo Visitor visa:
1. I uploaded a byte-different IMM 1344, recorded its IRCC page, and user-B approved it ("added … Attached to Visitor visa", `RECOGNISED`).
2. The summary then said 3 forms · 0 set up.
3. The Forms tab says "On this combination: 3 forms · 0 set up". Its filing line says the same, and its sentence reads "1 can be added from the library now; 2 need reading and drafting with AI".
4. IMM 1344 has its own row with **Read form**.
5. The card list is IMM 1344, 5257, 5707.

`check_forms_demo.ts` passes 23/23, including the approved form's Read → Draft dialog (C3.1 + D2). `contracts/counts.ts` now keeps every `kind: "Form"` attachment, keyed by `edition ?? officialFile ?? id`. The rules check's counted case is an approved-in-product form, and its not-counted case is an "Unrecognised file", which is what the intake writes (`api/src/sources.ts:138-157`).

## Checks run (exact commit)
* `check_uxa1_counts_rules.ts`: 16/16.
* `check_uxa1_counts_browser.cjs`: 47/47, twice. I ran a copy that saves its screenshots to scratch.
* `check_forms_demo.ts`: 23/23 on a fresh database.
* `check_screen01_api.ts`: 135/135, including "BR-10 pass (UX-A part 1)" (questions are the chips' sum). Its evidence file was written inside the scratch copy, not the repo.
* `check_x1_tabs_focus_browser.cjs`: 47/47 on a fresh demo, run on the checkout. Its tab code (`combination.tsx`, `setup-checklist.ts`) is identical to the commit. A first run failed C11.10 only because the demo still held the counts check's no-spouse LMIA; it passed after a reset.

## Blockers
None.

## Majors
None.

## Minors (list in the PR or carry to the next round)
* **n5 (from the code, not reproduced).** `attachedNotSetUp` keeps the **first** attachment per form number. The catalogue query's attachments have no order (`programs.ts:117`). The Forms tab's `attachmentFor` takes the newest (`web/src/pages/sources.tsx:30`).
  * With two editions of one form attached, the row and its step could therefore come from the older file. The count (one form) is right.
  * It cannot happen with today's official manifest, which has one edition per form. An approved newer edition would trigger it.
  * The builder's uncommitted change already picks the newest attachment and orders by `createdAt`. That work, and the `removedInDraft` rework, are **not covered by this review**: they need their own review once committed.
* **Carried, already listed as follow-ups:** m8 and breaks 4–6 (Preview per family, "to do" adding unlike items, the finder's "AI found N forms"). The older attach race (two IMM 5409 files from parallel attaches) is outside this row.
* **Existing wording, not this row:** a form approved in the product and uploaded by a person reads "Attached from the Form library" on its row.

## Journey score (reviewer, this round): 9.5 / 10, pass
I re-walked these journeys:
* Visitor visa counts.
* LMIA question totals.
* Single-parent household.
* Remove then release (round 2, same rule in this commit).
* The attach race.
* **To review → approve an off-list form → Forms → Read form**: now held.
* Keyboard at 720 px, and reviewer and approver views.

Scores:
* Task completed 1.
* Next step 1.
* Plain words ½: the Preview's note is correct, but at 40 words it is long for a hint, and the approved form's "Attached from the Form library" is wrong (existing wording).
* Feedback 1.
* Correct data 1.
* Recovery 1.
* Accessibility and sizes 1: axe clean, 400–1440 px, name = visible text.
* Speed 1.
* Visual 1.
* Trust 1.

## D1–D20 (only those this row moves)
* D1 5.
* D2 4: n5.
* D3 5.
* D5 5.
* D9 5.
* D10 4: the Preview note is long.
* D11 5.
* D13 5.
* D15 5.
* D16 5: pass and fail cases, P-80 covered by `check_forms_demo`.
* D17 and D20 are not scored: simulated only.

## Not checked
* A real screen reader, touch, and an intended user's unaided walk.
* The summary failing live.
* `graph.mjs`: it rewrites `qa/graph.json`. No route was added.
* `check_forms_p80_guard.ts`: it writes into the shared `p2/` folders. `check_forms_demo` covers the same approved form in the browser.
* `run-suites.sh`: left to CI.

**Verdict: Approve** on 2c877d10. No Blocker or Major is open. n4 goes in the PR body. n5 and the follow-ups are Minor. The uncommitted rework in the checkout needs its own review once it is committed.

---

## Round 3b: e964defb (code), committed as ffc2ef74 (records only)
I reviewed `git diff 2c877d10 e964defb`. ffc2ef74 adds only this file, so its code is e964defb's.

**How it was run.** I restarted `rev_uxa1b` on :4446 from the checkout. Its code equals e964defb: the only local change is `evidence/screen01/api-checks.json`. I then ran `POST /api/demo/load`.

The served bundle `index-DQXOHcAi.js` was built at 16:03. `contracts/counts.ts` changed later, at 16:06, so I checked the bundle against e964defb:
* It contains e964defb's `attachedNotSetUp` (newest wins, `createdAt`, ties to the later attachment).
* It contains `data-count-retry`.
* The later change touches only `removedInDraft`, which the web does not import.

US$0 throughout.

### The four changes
1. **Newest attachment stands for its form (n5 above): fixed.** All three sides now read attachments the same way:
   * `attachedNotSetUp` keeps the newest per form number (`contracts/counts.ts:47-60`).
   * The catalogue reads attachments oldest first (`programs.ts:117`).
   * `GET /combinations/:id` already lists them oldest first (`studio.ts:357`), and the tab's `attachmentFor` takes the last (`sources.tsx:30`).

   The rules check has a pass case and a fail case for both orders (20/20). I did not reproduce two editions live, because the official manifest has one edition per form.
2. **Finder Retry: works live.** I made `…/summary` answer 500 in the browser:
   * The empty combination (0 forms, no filing line) reads "The forms count could not be loaded. Retry".
   * Visitor visa shows that line and the filing line's "forms count not loaded Retry".
   * Retry, pressed with the keyboard after the summary recovered, restored "Its forms and checklists come from canada.ca…" (empty) and "On this combination: 2 forms · 0 set up" (Visitor visa).
3. **Removed in this draft means removed from the latest release (re-break N2): works live.** On released LMIA I removed IMM 5475, added it back from the library, then pressed Undo twice. At every step "Removed in this draft" agreed with the draft change count and with the forms count:

   | State | Removed in this draft | Changes | Forms |
   |---|---|---|---|
   | After remove | IMM 5475 | 2 | 7 |
   | After re-add | none | 0 | 8 |
   | After the first Undo | IMM 5475 | 2 | 7 |
   | After the second Undo | none | 0 | 8 |

   * IMM 5802, removed before the release, stays in `removedEver` and never appears as "removed in this draft".
   * The count (`removedLines`) does not change; the new rule only affects the tab's list (`workspace.ts:94-97`, the only caller).
   * With nothing released, every removal still counts as in this draft (rules check).
4. **S5 checks follow the new words:** `check_s5_slice1_browser.cjs` 52/52 and `check_s5_slice3_browser.cjs` 35/35. I ran copies that save their screenshots to scratch, so the W1 screenshots in the repo were not changed.

### Checks on e964defb
* `check_uxa1_counts_rules.ts` 20/20.
* `check_uxa1_counts_browser.cjs` 47/47.
* S5 slices 1 and 3, as above.
* No console or page error on any walk.

### Findings on e964defb
* **Blockers:** none.
* **Majors:** none.
* **Minor (observation, no fix needed for this row):** when a combination has lines and the summary fails, the Forms tab shows two "Retry" buttons, one on the finder line and one on the filing line. They do the same thing; one would do.
* **n5:** closed.
* **Still open as Minors:** m8 and breaks 4–6 (follow-ups), and n4 (PR body).

**Journey score unchanged: 9.5 / 10.** The re-add and Undo journey and the failed-count recovery both held.

**Verdict: Approve** on ffc2ef74 (e964defb's code). No Blocker or Major is open. Put n4 in the PR body; m8 and breaks 4–6 stay as listed follow-ups.

**Round 3c, 8126e2c7: Approve.** `git diff f9a5880a 8126e2c7` changes only two regexes in `tests/check_qa78_words_browser.cjs`, so the product code is still e964defb's, which was approved above.
* The check now expects the one forms words ("On this combination: N forms · N set up"). It passed 4/4 twice on `rev_uxa1b` (:4446).
* Minor: the new wait pattern `[Oo]n this combination` also matches the loading title "Forms on this combination". The check could therefore read the panel before the count arrives. The same race existed before this change. Waiting for `/On this combination: \d/` would close it.
