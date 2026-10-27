# `/qa after-merge` — screens S1/S2 FIX on main 027174d, 27 Oct 2026

Tester: the qa lane, Mac, worktree `claude/qa-after-merge-s1-21bfdf`, Lead note of 27 Oct 22:50. Tested: **main 027174d** (PR #59). Its app code is the same as 9fc749f. Main is now 4fb0749, which changes only Lead documents.

Scope: the seven fix items (QA-44, 45, 46, 49, 50, review m1, break m8) on Program structure and Immigration programs. Layout points are suggestions only, because Program structure is redrawn next (P-127).

I used my own copies: :4472 (Reset, then Load sample) and :4471/:4476 for the earlier checks. I never touched :4400. AI cost: US$0 (one saved replay).

New check: `tests/qa/check_qa_am_fix_1027.cjs`, 9/14; every fail is a finding. Earlier checks on this code:
* `check_qa_am_s2_1027.cjs`: 45/46.
* `check_qa_am_1027.cjs`: 54/58, twice.

## Verdict
**Ready. All seven fix items pass and are closed.** The FIX broke nothing in the earlier checks.

Four new Minors, none blocking:
* **QA-53:** most configuration reads other than the five S2 ones still answer nobody and case people.
* **QA-54:** a case person who reaches a Studio page by its address is told "could not load … Retry".
* **QA-51:** To review's trail leaves out the Pathway type.
* **QA-52:** approving a removal says "released with the next release" while the name is removed at once.

## The seven items, walked like a content publisher (headed in the browser pane, then replayed headless)
| Item | Result |
|---|---|
| QA-44 typed letters kept while a name saves | **Closed.** By hand: Enter on "Outside Canada", then "Inside Canada" typed at once was kept whole. The check passed 2 of 2 runs; it was lost on 6 of 7 before. |
| QA-45 Add sub-category under a leaf category | **Closed.** "Add sub-category" on Study permit extension (no sub-categories) opens a row under it, typed in place. The locations come from the category. Enter adds it, the category becomes a group, and typing continues in its row. |
| QA-46 "Remove" wording | **Closed.** The Structure's panel says Remove ("Why remove …? Send for approval"). To review lists "Remove the structure name. Reason: …". The item page title is "Remove structure name: …". |
| QA-49 page follows the Structure's order | **Closed.** The sample's programs follow the Structure (Visitors · Work permits · Study permits). A reorder of Visitors' categories shows on the cards and in the List, also after "Back to Structure order". |
| QA-50 one Back after a double click | **Closed.** A double click on Start setup opens New combination once and creates nothing. One Back returns to Immigration programs. |
| review m1 bar agrees with next step | **Passes.** This was checked on every started card through the API and on the page:<ul><li>Not ready "See 1 missing" now shows Step 2 of 4 · Draft (it used to show Step 4 · Release).</li><li>"Review 84 AI proposals" shows Step 2.</li><li>"Add 1 form from the library" shows Step 1.</li><li>Live keeps "all four steps done".</li></ul> |
| break m8 reads refused | **Passes for the five S2 reads.** `/catalogue`, `/structure`, `/path-options`, `…/uses` and `POST /structure/name-check` refuse nobody or an unknown name with 401. The officer and the client get 403 "Case officer (simulated) works on cases; the configuration is read in the Product Studio by its own people." The author, reviewer and approver read. The officer's and client's own screens call none of these, so nothing broke for them. |

## New findings
* **QA-53 (Gap, Minor; the Lead decides the lane).** Deny by default (STANDARDS §6) stops at the five S2 reads. 16 other configuration reads answer 200 to nobody, the officer and the client:
  * a combination, its `/config`, `/review`, `/preview` and `/attachments`;
  * the library's fields, forms, sections, document types and changes;
  * `/masters`, `/official-library`, `/intake/held`, `/ai/batches` and `/ledger` (the AI spend ledger).

  `/review-queue` and `/draft` refuse nobody but answer case people. The reads a case person needs (their cases, and `/releases` for Open a case) must stay open.
* **QA-54 (UX, Minor, screens).** An officer who opens `/` or `/structure` by its address gets:
  * "The combinations / structure could not load", then the server's plain reason, then "Your work is safe." and Retry, which can never help;
  * on Immigration programs only, also "If it keeps failing, restart the studio".

  The header's person menu says "Configuration author", because it lists only Studio people. Only reachable by URL.
* **QA-51 (UX, Minor, screens).** To review shows the trail without the type: "Remove structure name: Temporary residence › Visitors › Visitor record". Retail and Corporate both have a "Temporary residence", so the approver cannot tell which is meant (BR-7). The same trail was already there on 76628a4.
* **QA-52 (UX, Minor, screens).** Approving the removal of an unused name removes it at once, which is correct. But the message says "'…' approved: it is released with the next release" (`web/src/pages/review-items.tsx:58`, one message for every approval).

## Still open (unchanged on 027174d)
QA-38 Major (Open a case names release 1) · QA-48 Major (combination Retire/Restore only by API, no Retired view; screens slice after S3) · QA-39, QA-40, QA-47 Minor.

**Open after this run:** 0 Blocker · 0 Critical · 2 Major (QA-38, QA-48) · 7 Minor (QA-39, QA-40, QA-47, QA-51, QA-52, QA-53, QA-54).

## Suites
* **CI:** run 40515291839 on 9fc749f (main's run on 027174d reused it by code fingerprint): **37/37 PASS**, including the builder's `check_w1_s1s2_fix.cjs` 30/30.
* **Mac, under coverage (no `--demo`, nothing else of mine running, load average 5–8):** **35 of 36 passed.** The only red is `check_p2_guard`, the known clash with the coverage preload; it passes plain (75/75 on f289ec7).

## Coverage (c8 12.0.0)
api/src **97.09% lines / 82.10% branches**; engine **99.38% / 89.09%**. Both are above the floor (97/82 · 99/89), which stays. Branch coverage dipped by under 0.1 point against f289ec7 (82.17 · 89.19): the new reader guard and `progressFollows` add branches that only the builder's FIX check and my checks reach. The demo-reset browser suite was not run under coverage on the Mac.

## Graph and decisions
* `graph.mjs --write`: G1 0 · G2 0 · G3 1 (the old `GET /attachments/:id/file`) · G4 0 · G5 0 · G6 0.
* `decision-impact.sh`: every product decision has a capability row or a backlog item.

## Could not test
* A real screen reader.
* The AI meaning check: off until W1-07.
* Retire/Restore of a combination on a screen: QA-48, not built.
* 200 % zoom of the Structure was not repeated: the page is redrawn next (P-127).

## Questions for the Lead
1. QA-53: should every configuration read refuse nobody and case people now? Or only once the Studio and the case side are separate apps? It touches routes owned by three lanes.

## Suggestions (never built by qa; layout ones for the P-127 redraw)
* A case person who reaches a Studio address gets one page: "This is the Product Studio, for the configuration people", with a link to their cases (QA-54). *Later · Capability*
* To review's trail starts with the type, like every other list (QA-51). *Needed for the proof · Capability*
* Approval messages per kind: "removed", "retired with the next release", "released with the next release" (QA-52). *Later · Capability*
* P-127 redraw: keep the add row's locations defaulting from the category, and keep the cursor in the row after the category turns into a group. Both work now. *Later · Capability*
