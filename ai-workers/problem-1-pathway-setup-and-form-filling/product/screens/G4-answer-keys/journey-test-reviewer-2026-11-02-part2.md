# Journey test (reviewer): G4 part 2, the combination's Tests tab (commit 860bf1a9)

Reviewer role, 2 Nov 2026. A fresh context that did not build this. Local branch `g4-part2-local`, part 2 = `a04bf210..860bf1a9` on top of 43487860. Isolated copies `forms_g4r` (:4451) and `forms_g4rb` (:4452), never :4400. Live AI off, US$0. Chromium via Playwright (`/opt/pw-browsers/chromium`), walked through the screen only (setup: `setup_visitor_visa.ts`, plus one `PUT …/eligibility-gates` with two Sample gates so the rule-set item exists). My walk scripts and screenshots are outside the repo, in the session scratchpad.

## Journeys (from concept §1, §3–§5, challenge M5 b)
1. **Main path (author, user-A).** "Write a made-up family, write what the form should hold, run it, and see where it is wrong." Steps: Tests tab → Write a family → Write expected values (IMM 5257) → Run → Lines.
2. **Expert signs (user-C).** Sign a key; change a signed key without a reason, then with one.
3. **Rule set (user-C).** Write the expected outcome and gates for the eligibility rules, then Run.
4. **Wrong role.** The approver (user-B) reads and presses each action. The expert writes a family.
5. **Error: bad input.** A duplicate family key; an empty key save; a family name with Ñ (the form refuses it).
6. **Recovery.** Two tabs change the same key; Escape with unsaved edits.
7. **Boundary.** A family change sends a signed key back to Draft and marks it Not run.
8. **Empty.** A fresh copy with no families.

## What held
- **Main path.** On a fresh copy the empty state reads "No test families yet. Write a made-up family: never a real client." (concept §5, word for word).
  - Write a family is reached in 2 Tabs from the tab, and Enter opens it.
  - The family is saved as typed. Non-English text renders (ÉLODIE ÑÚÑEZ-测试), and the family lists with Sample, "1 person · 4 facts".
- **Expected editor.**
  - Opens in 200 ms with **161 boxes in the form's order**. Each box shows its caption, its meaning and whose fact it reads.
  - Choice boxes pick from the form's own options, label beside code ("F Female (Female)"). Empty means "(stays blank)", and there is no "fill from a run".
  - Saved in 401 ms.
- **Run** takes 336 ms and reads Failed (5 of 6), failures first.
  - Each failure gives the filler's reason: "confirmed with a problem, not written: Use English or French letters…" for Ñ, and "written, not expected: add it to the key or fix the map" for the date-of-birth boxes the key left out.
  - The given name passes.
- **Sign.** The author's Sign is greyed with "Only the immigration expert signs expected values." The expert signs with the keyboard (Enter), and the pill reads Signed, with "Signed by Content reviewer on 2026-11-02" on hover.
  - Changing a signed key without a reason is refused on the reason field.
  - With a reason the key reads "Draft · Sample · Not run · Back to Draft: …".
- **Family edit after a sign.** The reason field is shown up front ("1 signed answer key uses this family…"). After the save the key reads Draft, "Back to Draft: Family changed: Date of birth corrected", Not run.
- **Rule set.** An empty save is refused: "Give the expected result for at least one person." Outcome and gates are picked from lists. Run gives two failing lines, each with its reason.
- **Errors.**
  - A duplicate key is refused on the Key field.
  - A 403 is said in the dialog in the server's words.
  - Escape with unsaved edits asks before discarding (the shared Dialog guard).
- **Accessibility and sizes.**
  - axe WCAG 2.2 A/AA found **no violation** on the empty state, the family editor, the Expected editor, failed lines, the approver's view and the rule-set editor (my runs), and on the builder's 8 states (its check).
  - No sideways scroll at 400, 720 (200 % zoom) or 1024 px. The lines table scrolls inside its own region.
- **Data.** Exact values stored (the builder's check reads them back). Officer and client get 403 and nobody gets 401 on the two new reads (`/answer-keys/fields`, `…/answer-keys/boxes`). An unknown form gets 404.
- **Speed.** List 114–188 ms, boxes about 65 ms, fields about 15 ms. A cold first view takes 1.66 s (SPA load).
- **Scripted.** `check_g4_tests_tab_browser.ts` passed 37/37 twice on fresh copies. `check_g4_answer_keys.ts` passed 87/87 twice on the same copy, so it can now be run twice on one copy.

## Findings
- **Major: no read-only state for people who may not act** (EXPERIENCE §4 [M] "read-only (… no permission)"; §2.8 [M] "Prevent errors before messaging them").
  - The approver sees Write a family, Edit, Change, Run and Write expected values all enabled. Each is refused only after the click: Run gives the toast "Approver (simulated) does not hold the author or the immigration expert duty"; Change and Write a family are refused only after the whole form is filled in.
  - The expert can type a whole family and then gets "does not hold the author duty".
  - Only Sign is greyed. The app already has the pattern (`useSessionView`, QA-22).
  - Build-notes deviation 6 records this, but an [M] line cannot be waived.
  - Where: `answer-keys.tsx:53-54`; `answer-key-editors.tsx:167, 174, 280`.
- **Major: a 409 cannot be recovered in the app.**
  - Two tabs change the same key. The second gets "Changed by someone else … Reload their version". Cancel and reopen Change: it still shows the old values ("Not eligible", not the other tab's "Possibly eligible"), and Save gives 409 again, every time. Only a browser reload gets out of it.
  - The row behind it also stays stale.
  - Cause: `useSave` (`answer-key-editors.tsx:34-37`) invalidates nothing on error, and the editor is seeded from the list cache (`answer-keys.tsx:61`; `staleTime` 2 s, no refetch on focus). The family editor has the same cause.
  - The build notes say "closing and reopening loads the latest": it does not.
  - Fix: on 409, invalidate the list and the families (or load the 409's `current`), and add a fail line for it.
- Minor: rule-set lines show codes: `NOT_ELIGIBLE`, `POSSIBLY_ELIGIBLE`, `not_met`, `not_answered`, and "missing: person.passport_number" (`answer-keys.tsx:28-29`). The editor beside them uses words (`OUTCOME_WORDS`).
- Minor: the rule-set editor says "Write what the **form** should hold…" (`answer-key-editors.tsx:219`).
- Minor: the counts disagree. The toast counts passes ("failed, 1 of 6 values"), while the pill counts failures ("Failed (5 of 6)"); `answer-keys.tsx:42` vs `:50`.
- Minor: after a family change, the key's reason reads "Not run since the expected values changed": the family changed, not the expected values.
- Minor: the family editor's field picker lists library keys ("person.family_name") as the option text (`answer-key-editors.tsx:130`; EXPERIENCE §5, no IDs on the main path).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3 and 7 done through the screen only |
| Next step obvious | 1 | Empty states teach; "Write expected values" sits under each item; G2 consequence said |
| Plain words | ½ | Rule-set codes, field keys in the picker, rules editor says "form", counts disagree |
| Feedback and state | ½ | No read-only state for approver or expert; stale row after a 409; wrong stale reason after a family change |
| Correct data | 1 | Stored as typed; duplicate refused; 409 on a stale save; officer and client refused |
| Error recovery | ½ | Field errors are good; the 409 loop needs a browser reload |
| Accessibility and screen sizes | 1 | axe clean on every state; 400/720/1024 px without sideways scroll; keyboard to Write, Sign, Run |
| Speed | 1 | Reads 15–190 ms; run 336 ms; editor 200 ms |
| Visual quality | 1 | Team components and tokens; dense table; one row of tabs |
| Trust and sources | 1 | Sample badges and tooltip, signed by and on, change reason, never "fill from a run", no AI |

**Score: 8.5/10. Pass on the score (8 or more, no 0).** The two Majors still block the verdict.

## Could not test
- A real screen reader, and a person using it unaided (D17 and D20 stay with the founder).
- Mac Chrome.
- The 16 amended IMM 5257 values as an expert would read them before signing.
