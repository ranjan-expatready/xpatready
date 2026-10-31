# N8 (forms lane): F2 official-pages record and confirm, DV-d1-1, DV-d1-2: independent re-review (CHECK on the fix)

Reviewer agent, 31 Oct. Commit **2c3ba2f8** on `claude/forms-n8-devin-06zafk` (PR #122), diff `48c8fbef..2c3ba2f8`. The earlier CHECK on 0810c25e is in git history (this file and `break-report-f2.md`). Isolated copies on :4457 only, each with its own empty ledger; all stopped and dropped at the end. US$0: no AI, no live switch, no priced button. Journey test: `journey-test-reviewer-2026-10-31-f2b.md`, **8 / 10**, the one score for this check.

Verdict: Ship after fixes

The fixes hold, and each has a check that fails without it. One Major remains, and it was already in 0810c25e. The rule counts every attached "Web page" as the IRCC apply page, but 10 of the 12 `web-pages/` files in the official manifest are single-form pages. That lets the author confirm a form's page as the checklist page on the "sure" tier.

## Checks run
* `check_official_pages.ts` **37/37**. `check_setup_checklist.ts` (fresh copy) **54/54**. `check_forms_s4_library_browser.cjs` (fresh copy, web built at the commit) **73/73**. `graph.mjs --check`: G1 0 · G2 0 · G3 2 (the old attachments routes) · G4–G6 0.
* **Mutation run:** I reverted the seven code fixes at once (REVIEWS, the expert-hold line, `recordHolds` in the reader, the retired 409, the idempotent return, `readerOf`), and **9 checks failed**, at least one per fix: M1, M2 (unit and API), break M2 (unit and API), m1, m2, m6. The files were restored, and the code matches 2c3ba2f8.
* Probes, browser walk and data checks: see the journey report.

## Each earlier finding at 2c3ba2f8
| Finding | Holds? | Evidence |
|---|---|---|
| review M2 / break M1: the author overwrites the expert's choice | **Yes, for one person at a time** | 403 "only the immigration expert changes it", and the row stays `user-C|expert`. Under a race it does not hold: see issue 2 |
| break M2: a "sure" confirmation stays done after a second apply page | Yes | `recordHolds` (`engine/official-pages.ts:23`). The API check shows proposed, 2 matches, `choose_pages` |
| review M1 / break M3: Needs you on an action no screen offers | **Yes for Needs you.** Resume setup is still open (issue 3) | Author and expert Needs you = 0 on the sample (chip "Needs you 0"). Resume setup on Visitor visa lands on `/forms?focus=pages%3Arecord` |
| m1: confirm on a retired combination | Yes | 409 "is retired … Restore it first" |
| m2: re-confirming writes again | Yes | Same page, same person, same tier: `again: true` and no audit line. 10 parallel first confirms gave 1 row and 1 audit line |
| m3: the audit does not say what it replaced | Yes | "It replaces …, confirmed by user-A (author tier)". `replaced` is in the details |
| m4: orphaned record on an approved delete | Yes, but **no check** | Confirmed fs.outside, deleted it, user-B approved: combination 0 rows, record 0 rows. No test asserts it (issue 5) |
| m5: refusal text contradicts itself and shows P-176 | Yes | One plain reason, no decision code (checked by the test) |
| m6: case person gets the configuration explanation | Yes | Client gets 403 "Not for case people" (`readerOf`) |
| m7: `[]` body | Yes | 400 "Send the page to confirm as { attachmentId }." |
| review m1: no foreign key | Answered by deletion in `lifecycle.ts:421` instead of an FK | Acceptable: there are only two delete paths (demo reset and the approved delete), and both now remove the row |

## Judgement on s1 (the confirmed page is "the checklist page"; Document checklist PDFs are not checked). **Accepted, with a condition.**
* **Why it is acceptable:** the step's own words are "Confirm the checklist page". The step 1 tooltip names "IRCC's apply page and document checklist". On canada.ca, the apply or forms-and-documents page is where the document checklist is listed. So one confirmed IRCC page is a reasonable reading of concept §4 step 1, and "at least one checklist" needs no separate rule.
* **Condition 1:** the deviation must be written down. The PR body at head 2c3ba2f8 does not yet state it, and neither does `plan.md` or `challenge.md`. The previous review asked for that.
* **Condition 2:** the reading holds only if "the checklist page" is a page that carries a checklist. A single-form page does not, which is why issue 1 is a Major and not a watch point.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | F2 record, tier, 403s and Devin fixes done. s1 accepted, but the rule takes form pages as apply pages (1) |
| D2 Data integrity | 3 | Expert hold, idempotency, retired, delete cleanup. A race still loses the expert's choice (2). A form page is stored as "sure" (1) |
| D3 Reuse | 5 | `mayAct`, `readerOf`, one reader `officialPagesOf`. `recordHolds` is shared by the reader and the writer |
| D4 Rule integrity | 3 | P-176 is held one request at a time. It is broken by the apply-page rule (1) and under concurrency (2) |
| D5 Stability | 4 | Parallel identical confirms: 1 row, 1 audit line. Detaching a page reopens the step. Reset clears the table |
| D6 Freshness and governance | 4 | The audit names what is replaced. The reset inventory leaves the table out (4) |
| D7 AI trust | 5 | No AI on this path |
| D8 Orientation | 4 | No change. The card's Resume setup lands on the Forms tab |
| D9 Flow | 3 | No dead Needs you any more. Resume setup on 4 of 6 sample combinations targets step 1, which no screen offers (3) |
| D10 Language | 5 | Every 400, 403 and 409 is in plain words, with no codes |
| D11 Feedback | 3 | Step 1 shows done after an API confirm. There is no on-screen action yet (slice C) |
| D12 Visual | 4 | Used-by count is a link-style button (73/73 suite, screenshots) |
| D13 Accessibility | 4 | axe clean on Programs at 1440 and 1024 as author and expert, and on the library. Keyboard Enter on Resume setup works. Focus lands on `<body>` |
| D14 Team look | 4 | Unchanged components |
| D15 Speed | 4 | Programs about 0.65–1.0 s to network idle. Confirm well under 1 s |
| D16 Testability | 4 | A failing check per fix (mutation run). None for m4, the race, or a form page as a match |
| D17 First use | – | Simulated only |
| D18 Provenance | 4 | Who, tier, page, matches and the replaced record. "Sure" can be wrong (1) |
| D19 Capability closure | 3 | Step 1 closes only through the API until slice C. Needs you no longer claims otherwise |
| D20 Wow | – | Simulated only |

## Issues, ranked
1. **Must · Major: a single-form page counts as the IRCC apply page, so the author confirms it "sure".**
   * **Where:** `engine/official-pages.ts:10,18`. Every `web-pages/` manifest file becomes kind "Web page" (`api/src/sources.ts:36`), and the manifest holds `page-imm1295.html`, `page-imm5257.html` and 8 more form pages.
   * **Repro:** upload `official-sources/ircc/web-pages/page-imm5257.html` to Study permit through the product's attach route. GET gives `proposed, 1 match`, "IMM5257 form page [match]". The author's confirm returns 201 and is audited "the rules found exactly this page; configuration author tier, sure". Step 1 is `done`. A visitor-visa form page is now Study permit's checklist page on the author's tier, against P-176.
   * **The other direction:** attaching a form page next to a real apply page reopens a confirmed step 1 as the expert's choice (`recordHolds`).
   * **Fix:** count as apply pages only the manifest's package and forms-and-documents pages (by manifest path or edition role), and keep form pages as candidates for the expert. Add a fail check: one form page attached → `choose_pages`, expert tier.
   * Devin's PR comment raises the same point.
2. **Should · Minor: two people at once still lose the expert's choice.**
   * **Where:** the guard reads `held` (`api/src/official-pages.ts:62`) and then upserts outside a transaction (`:75`).
   * **Repro:** author confirms M while the expert chooses G, in parallel, from no record. Over 12 rounds both got 201 in 11, and the row ended `user-A|author` (the expert's G lost) in 5.
   * **Fix:** a conditional write, for example `updateMany` keyed on the held `confirmedAt` or `confirmedAs`, with 409 "changed meanwhile, reload", or a transaction with a row lock.
3. **Should · Minor (Lead to accept or fix): Resume setup still targets step 1.**
   * `setup.next` is still "Official pages: Confirm the checklist page" → `/forms?focus=pages%3Arecord` for Visitor visa, Super visa and two others. Nothing on the web reads `focus`, and the header's Next step names "Add 1 form from the library".
   * The author is not stuck, because the Forms tab is where step 3 works anyway. The fix commit follows the `confirm_people` precedent ("counts in Next").
   * **Fix:** the Lead records this as accepted until slice C, or skip held-back items in `next`.
4. **Should · Minor: the reset inventory leaves out the new table.**
   * **Where:** `api/src/demo.ts:129` `rows` does not count `officialPagesRecord`, so `removed_rows` under-reports by one per confirmation.
   * **Fix:** add the row count. Devin's PR comment raises the same point.
5. **Should · Minor: m4 has no check.**
   * `lifecycle.ts:421` works (verified by hand), but no test asserts that an approved delete removes the record, so removing the line goes unnoticed.
6. **Should: write s1 down** in the PR or `plan.md`, as judged above.

## Could not check
* An intended user's unaided walk (D17, D20), and a real screen reader.
* 200 % zoom on a step 1 control, because there is none until slice C.
* `check_screen01_*`: the counts are the builder's; I did not re-run them.
