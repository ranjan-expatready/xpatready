# UX friction sweep of the whole journey (founder ask A25)

**Mode:** `/qa explore whole journey: UX friction`. Asked for by the founder (12 Nov, ~13:1x IST): *"you have to identify all such problems throughout end-to-end journey … all of those small UI UX experiences should be there"*. Reports to the current tech lead (Lead 24).
**Tested on:** `main` **3ea36a0d3** (#1566 on top of #1552, #1591, #1589, #1614, #1583). One fresh isolated copy (`qa_ux`, :4472, own database, stopped at the end). Live AI off, **US$0**, no priced button pressed. The shared demo (:4400) was not touched. 12 Nov 2026, ~07:29-08:20 UTC.
**How:** headless Chromium driven screen by screen at 1440 px. Each role was walked through the screens only: sign-in card, hand-off buttons, and the picker where no button exists. Set-up data came from Demo › Load the configured checkpoint (99 s; scaffolding, P-33). Client A's answers went in through the screen filler from the rehearsal (`scripts/answer2.js`), which also saved every part's questions and input types (`client-parts/`). A few Ready to file passes were typed on screen. The three filings were then marked Ready to file through the endpoint that the "Ready to file" button calls (`scripts/pass.js`), which saved typing 21 reasons. The key screens were also checked at 375 px (`scripts/sweep.js`), and the keyboard path through the case dialogs was checked (`scripts/kb.js`).
**Judged against:** EXPERIENCE (§2, §5, BIC-01 to BIC-20), STANDARDS, and P-473 (calm work app; plain second person with "Why we ask" for clients; IRCC wording on staff views).
**Not re-logged (in hand):** the case number (A24-1/A24-2, P-492); QA-415 to QA-419; QA-393/QA-394; and the UX planner's UXF-01 to UXF-25 with their UX-0 to UX-14 rows (`design/ux-2026-11-11/`). Where a row here is the cheap slice of a UXF item, it says so.

## 1. Verdict
Both families complete the journey on `main` with **0 dead ends that stop the work**, but a cold reader meets a lot of small friction. **24 new rows (QA-421 to QA-444): 3 Major, 21 Minor, 0 Blocker or Critical.** The 3 Majors mislead on the journey:
* **QA-421:** the release page hands the author's work to the Approver while the author's own change is still held back.
* **QA-427:** the case page keeps saying "Next: Client A answers" after the client has finished, after approval, and after filing.
* **QA-439:** the client is asked about a toddler's military service and common-law partner, because each person's date of birth and marital status come last.

Almost every row has a **small (S) fix**. The best value for the cost is the top block of the table in §3.

## 2. The walk
| Step | Person (how the person changed) | Visitor visa family (Principal, Spouse, Child 0-4) | Study permit family (Student, Spouse, Child) |
|---|---|---|---|
| 1 Configure and release | author (sign-in card) → content reviewer → approver (hand-off buttons) | Add a document (Marriage certificate copy, Spouse) → submit → sign → **Release 7**. Friction: QA-421, 422, 423, 424, 425, 426 | (the checkpoint's Release 2) |
| 2 Open the case, invite the client | officer ("Open a case on Release 7" button) | UXS-VV-1; the new document reached the spouse. QA-433, 434 | UXS-SP-1 (picker to officer). QA-434, 438 |
| 3 Client A answers | Client A ("Hand to Client A") | 56 → 55 → 63 → 69 → 62 parts (QA-388); 2nd pass for 5 parts. QA-439 to 443 | 46 parts, 40 done in one pass. QA-439, 442, 443, 444 |
| 4 Officer confirms | officer ("Hand back to the Case officer") | **63 "Confirm section" clicks** across 10 person tabs, 83 s (UX-14). QA-427, 428, 432 | 40 clicks. Fees wait on the child (QA-418 again) |
| 5 Forms prepared and checked | officer | 15 copies, each "read back and checked" | 9 copies |
| 6 Representative review | representative ("Hand to the Representative") | 3 filings approved. QA-436 | (not walked; C8.3 covered on VV) |
| 7 Record the submission | representative | Ready to file had 21 "Pass with a reason…" lines (UXF-05) → Record the submission. QA-429, 430 | not filed |
| 8 After | representative, officer | Read-only; "Correct a number…". Case still "Open"; findings still live (QA-431). Nothing else is built after filing (C8.4 is the lifecycle) | — |

Person changes: 6 by button, 2 by picker (back to the officer on the Study permit case; officer → representative after the review to record). Typed logins after the first: 0.

## 3. Rows, by value to the user against the fix cost
Value: **H** (every case or every client meets it, or it misleads), **M** (often, or costs real time), **L** (rare, or cosmetic). Cost: **S** (one screen or one data line, under a day), **M** (several files, or data with the expert), **L** (a new piece).

| # | Value · cost | Screen | Lane | Friction (short) | Simplest fix |
|---|---|---|---|---|---|
| QA-439 | **H · S-M** | Client questionnaire | forms, runtime | DOB and marital status come last, so a 0-4 child gets military, government, and common-law questions; gate questions come after their details | Each person's Personal details first, and each gate question before its details |
| QA-427 | **H · S** | Case page, client card | screens | "Next: Client A answers…" at every stage, even after filing | The card reads the case state |
| QA-421 | **H · S** | Review and release (shared) | screens | "Hand to the Approver" while the author's change is not submitted | "Submit Visitor visa for review →" first |
| QA-441 | **H · S** | Client questionnaire | screens | On a second pass, Save and continue walks through every done part | Go to the next part that is not done |
| QA-428 | **M-H · S** | Case › Documents | runtime | Asks for an application date it never offers; Study permit uses today | Today, then the recorded "Submitted on" |
| QA-429 | M · S | Record the submission | runtime | UCI empty though answered and confirmed | Prefill from the confirmed answer |
| QA-442 | M · S | Client questionnaire | forms | Choice labels show codes (`school_dormitory`, `authorize`); a list rendered as one radio | Labels from the answer list; split the list |
| QA-432 | M · S | Agent view › The application | runtime, forms | "Write appoint or cancel" typed; "pass with reason 'new application'" on every new case, ×3 | Two-choice list pre-set to appoint; "New application" choice |
| QA-443 | M · S | Client questionnaire, addresses | forms, screens | Canada typed for an address in Canada; province typed; no "same as mailing" | Canada set; province list (cited); one tick |
| QA-430 | M · S | People and filings | screens | Every filing shows the principal's application number | Each row shows its own number |
| QA-431 | M · S | Cases, case header, Review | screens | "Not started" beside "Approved"; "Open" after filing; live findings on a read-only case | Status names the step; "Submitted"; findings read-only |
| QA-436 | M · S | Representative's review | screens | No next step after the last approval; spouse listed first | "All approved · Next: Ready to file →"; principal first |
| QA-440 | M · S | Client questionnaire | forms | Married principal still asked common-law full name and life insurance; parents get a common-law part | The common-law condition on those questions |
| QA-444 | M · S-M | Client questionnaire (SP) | forms, runtime | School name and address asked twice | Work part 2's box out from part 1 |
| QA-426 | M · S | Studio header at 375 px | screens | Picker reads "C…" for three people | Short name below 640 px |
| QA-437 | M · S | Case dialogs (keyboard) | screens | Escape drops focus to the page body (as QA-110, QA-123) | Shared dialog returns focus to its opener |
| QA-424 | M · S | Documents › Add a document | screens | Save says nothing; the new line is hidden by the filter | Toast, and switch to the line's person |
| QA-425 | M · S / M | Add a document › type | screens / forms | Near-twin document types | "Used in N" hint now; merge later with the expert |
| QA-435 | L-M · S | Ready to file, Agent view, client text | screens, runtime | "(P-242, P-411)", "cicc", "(not built here)", "(M3)", "(CIC on the form)" | Drop them; "CICC" |
| QA-422 | L-M · S | Combination's Review and release tab | screens | Every duty's button shown, disabled with no reason | Only the person's buttons; reason on a disabled one |
| QA-423 | L · S | Studio draft banner | screens | "Released with the next release", but Release 7 left them out | Truthful words |
| QA-433 | L · S | People and filings | screens | Add spouse offered at the limit; refused after typing | Disable with the reason |
| QA-434 | L · S | Open a case, case page | screens | "Relies on an employer case · Not offered" on every non-employer case | Hide when not offered |
| QA-438 | L · S | Case › Stages (SP) | screens | "Start next stage: Work permit" enabled on day 0 | Disable until the stage is filed |

**By lane.** Screens: QA-421, 422, 423, 424, 425 (hint), 426, 427, 430, 431, 433, 434, 435, 436, 437, 438, 441, 443 (tick). Forms: QA-425 (merge), 432, 439, 440, 442, 443, 444. Runtime: QA-428, 429, 432, 435, 439, 444. **By screen:** Studio release (421, 422, 423, 426); Documents tab (424, 425); case page (427, 428, 430, 431, 432, 433, 434, 438); case dialogs (433, 437); representative's review (436); Record the submission (429); client questionnaire (439 to 444).

**Not worth it (value below cost; no row):**
* Prefilling the passport family and given names from "Principal applicant's name" at Open a case. The case name is a display name, not the passport name, so a wrong prefill costs more than the typing.
* One fee receipt for all three filings in Record the submission. It is rare, and an upload per filing is safe.
* The "⌘K" hint on a phone.
* "For example, 14 6 2019" under future dates.
* The tab title "Immigration programs · Product Studio" on combination pages. This is QA-390's class: fix it with QA-390, no new row.

## 4. Checks at 375 px and by keyboard
* **375 px, 11 screens** (Programs; Visitor visa overview, Documents and Review tabs; Review and release; Cases; both case pages; the representative's review; the client task list; a client part): **no page scrolls sideways.** The Studio picker is 47 px wide (QA-426). The breadcrumb breaks "Representati-ve's review" (UXF-15). Small targets (< 24 px): up to 9 on the representative's review and 7 on the case pages (UXF-15). Shots `s04`, `s07`, `s09`, `s10`, `s11`, `07`, `26`, `31`.
* **Keyboard:** the Open a case dialog keeps focus inside it. An empty submit shows both field errors, but focus stays on the button (UXF-12). Escape closes the dialog but focus goes to the page body (QA-437). The client's error summary "There is a problem" takes focus and keeps the typed value: good.

## 5. Seen again (rows open; nothing new logged)
* QA-388: totals 56 → 55 → 63 → 69 → 62, and 5 parts skipped.
* QA-402: visit purpose "other" asked first.
* QA-405: part titles such as "Your parent 1 (mother or father)". The Study permit says "first/second parent" where the Visitor visa says "mother/father".
* QA-406: "will accompany" asked for the parents.
* QA-407: the review says "Sent … 02:49 a.m." while the case says "07:49".
* QA-408: "Visitor visa · release 3" opens "Release 7".
* QA-415: "kind of application" as free text.
* QA-417: "Declared ✓" answers in "0 to confirm" sections that still offer Confirm section.
* QA-418: the Study permit fees "wait for Sample Child S's answer".
* QA-419 M3, M4, M5: the client's own phone on Section B; "(as asked on imm1294e.pdf)"; "(IMM 5484 p. 1; IMM 5476)".
* QA-390: the tab title "Product Studio".
* UXF-01, 02, 03, 05, 12, 14, 15, 17, 19, 20.

## 6. Not done, and why
* **No replayable checks in `tests/qa/`.** Each row's fix is small and owned by its lane, which adds the check with the fix. The reproductions are the committed walk scripts (`scripts/`) and the client prompt dumps (`client-parts/`). Headless replays at 400 and 1024 px, axe, coverage and the suites were not run: this was an exploration, not a capability gate.
* **Representative review of the Study permit case:** not walked (the Visitor visa case covered C8.3). The Study permit was not filed.
* **Seen once, not reproduced (no row):** after approving the spouse's filing by script, the principal's filing showed no Approve or Send back until a reload. Clicking through by hand did not repeat it.
* **Filler's values:** the filler's own wrong values (dates in country boxes, "Sample" addresses) are the filler's, not findings. The missing lists are the findings (UXF-03, QA-443).
* D17 and D20: simulated people only.

## 7. Questions for the tech lead: answered (Lead 25, series 2, 12 Nov 15:0x IST, on #1637; P-498)
The rows were renumbered QA-421 to QA-444 at the tech lead's ask: QA-420 is #1627's row.
1. **QA-439's severity and owner:** *asked:* Major? Forms first? **Ruled:** it stays **Major**. The forms lane owns it first; the runtime lane only if section order is not data.
2. **Proof of financial support and a fee receipt "for each applicant", including a 0-4 child** (Visitor visa Documents): IRCC's rule or a sample default? **Ruled:** it goes to the **immigration expert** (Sample, Unconfirmed: expert). No row until the expert answers.
3. **Bake or after:** *asked:* take the H·S rows a cold walker meets first? **Ruled:** **QA-421, QA-427, QA-441 and QA-439 go into the Bake.**
