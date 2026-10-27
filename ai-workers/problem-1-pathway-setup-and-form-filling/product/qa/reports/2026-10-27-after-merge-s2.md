# `/qa after-merge` — S2 Immigration programs on main f289ec7, 27 Oct 2026

Tester: the qa lane, Mac, worktree `claude/qa-after-merge-s1-21bfdf`, Lead note of 27 Oct ("After-merge report read (b93d2ba)"). Tested: **main f289ec7** (PR #53). Main is now 57f6f8c, which changes only Lead documents, so the app code is the same.

Scope: the Immigration programs page and the two S1 fixes it carries. The Form library, the combination workspace and New combination (S3) were out of scope.

I used my own copies: :4472 (Reset, then Load sample from the Demo menu, as a person would) and :4471/:4476 for the retests. I never touched :4400. AI cost: US$0 (one saved replay).

Evidence: `reports/2026-10-27-after-merge-s2/`. New check: `tests/qa/check_qa_am_s2_1027.cjs`. It passed **41/46** on a quiet Mac, and **40/46** during the coverage run, where the timing step went over (first view 1567 ms, search 458 ms). Every other fail is a finding. The check's sample load now allows 240 s, because the sample load ran past the 30 s request default under load.

## Verdict
**Ready, with Minors.** Design D works for a content publisher. Nothing new is Blocker, Critical or Major. Two new Minors go to the screens lane:
* **QA-49:** the page ignores the Structure's order.
* **QA-50:** after a double click on Start setup, one Back stays on New combination.

**QA-48 (Major, already assigned) now also shows here.** Once a combination is retired, it disappears from Immigration programs, and nothing on the page lets a person find it.

The open findings from the last run are unchanged on f289ec7, and S2 caused no regression on Structure, W1-02 or the runtime paths.

## S2 walked like a content publisher (headed in the browser pane, then replayed headless)
* **Empty after Reset:** Retail and Corporate each say "Nothing set up in … yet" and offer one button, Open Structure. From Corporate it lands on the Structure's Corporate tab.
* **After Load sample:**
  * Retail 21, Corporate 8.
  * The Pathway cards (All pathways · Temporary residence 12 · Permanent residence 8 · Citizenship 1 · + Add pathway) each show "none need you".
  * Counts line: "21 combinations · 1 Live · 4 In setup · 16 Not started". Below it: "Names are Sample until the immigration expert confirms".
  * Each card carries the five-part trail and a status chip, the bar or "Not started", the forms and "Filed:" line, and one next step.
* **Pathway cards:** a card shows only its own section and puts `p=` in the address; All brings back every section. Enter on a card opens it and keeps focus. "+ Add pathway" opens the Structure.
* **Cards / List:** the List shows full trails, sortable status, the setup bar and the next step. It is remembered for this person, and the approver still gets Cards.
* **Status:** every option, with a Pathway chosen, shows exactly the count the menu states. All 12 · Needs work 11 · Not started 8 · In setup 3 · Not ready 0 · Live 1. Keyboard works in the menu.
* **Search:** these were tried:
  * "imm 5257" in lower case finds 3, with "Matches: … IMM 5257".
  * "working HOLIDAY" finds its sub-category.
  * A Pathway's name finds its combinations.
  * "签证 visa de résident" gives "No combination matches … in Retail" with Clear search.
  * A 300-character search is cut, not refused.
  * Spaces only shows all 21.

  "LMIA" and "Global Talent" from Retail offer "6 matches / 1 match in Corporate and employers. Show them / Show it", never mixed in. Show it keeps the search on the Corporate tab. Back from a combination restores the search, the tab and focus.
* **Need you:** I made one combination wait on a person (a saved replay on Super visa gives AI proposals). It shows "1 needs you" on the Temporary residence card, on All pathways and in its section. Needs work lists it. Not started and Live are never counted. At 390 px the chip stays on screen.
* **Start setup never creates anything.** I tried the card button, the card name, a List row and a double click. Each opens Start setup with the trail filled, and the `combination` table count stays the same. **QA-50:** a double click pushes New combination into the history twice.
* **The Structure and the page agree:**
  * A category added on the Structure is a Not started card at once, and its Pathway card counts 13.
  * A rename shows at once, with the same key.
  * A remove waiting for approval keeps the card. Once approved, the card goes and the counts drop back.
* **QA-49:** the order does not agree. Inside a Pathway, cards and List rows are alphabetical. The sample already differs: the Structure has Visitors · Work permits · Study permits, while the page has Study permits · Visitors · Work permits. A Structure reorder (201) is ignored, and the List's sort tip says "Back to Structure order" while the List is alphabetical (`api/src/programs.ts:246`).
* **Corporate:** the callout "How employer and worker cases connect" appears with its Sample examples on the Corporate tab only. Its Pathway cards are separate from Retail's.
* **Read-only approver:**
  * New combination and + Add pathway are disabled, and each says why.
  * Clicking a Not started card's name gives "… is not started yet. A configuration author starts it." The approver stays on the page and nothing is created.
  * On the server, a start by the approver gets 403 with plain words; one with no person gets 401.
* **Widths and zoom:**
  * 1440 px: 3 columns. 1024 px: 2 columns. 390 px: 1 column.
  * There is no sideways scroll at any width, in Cards or List.
  * Search, Status, Cards/List and New combination stay on screen.
  * At 200 % zoom (720 px at 2×) nothing scrolls sideways and the next steps can be reached.
  * axe is clean at 390 px (cards and list) and on the approver's view.
* **Keyboard:** ⌘K focuses the search. Tab then reaches Clear search → Status → Cards → List → sections → each card's chip, bar and next step. The focus ring is visible.
* **Speed (sample size, quiet Mac):** first view under 1 s and search under 400 ms (STANDARDS §9). Under load they went over (see above); that is not logged as a finding.
* **A retired combination (QA-48):** I retired With an LMIA through the API, it was approved, and it was released. It leaves All, and the Status menu has no Retired option, so the person cannot see it to restore it. The API keeps `filter=retired`. This is added to QA-48 rather than logged again.

**Noted, not logged:**
* A Corporate In setup card with no forms (High-wage position) still says "Add sources". That is the old intake word; S4/S5 replace it with automatic forms (P-123).
* The Load sample dialog lists "pathway 'Temporary residence' (Sample)" twice, once per type, without saying which type. It is scaffolding (suggestion below).
* Already decided by the Lead and in the next screens FIX: review m1 (the bar vs the next step) and break m8 (reads without a known person). Break m9 (scale) goes to the team's scale work.

**Journey score, Immigration programs (journey-test, simulated author): 9/10, pass.**
| Criterion | Score |
|---|---|
| Task completed | 1 |
| Next step obvious | ½ (bar vs next step, review m1; "Add sources" on one card) |
| Plain words | 1 |
| Feedback and state | ½ (QA-49 order) |
| Correct data | 1 |
| Error recovery | 1 |
| Accessibility and screen sizes | 1 |
| Speed | 1 |
| Visual quality | 1 |
| Trust and sources | 1 |

No criterion is at 0. D17 and D20 were not awarded.

## Retests on f289ec7 (`check_qa_am_1027.cjs` on fresh copies: 50/57, same as on 76628a4)
| # | Result |
|---|---|
| QA-38 | **Open** ("Visitor visa · release 1" while the case opens on release 2) |
| QA-39 | **Open** (source: "Canonical fields") |
| QA-40 | **Open** (IMM 5707 Online absent from the case panel) |
| QA-44 | **Open** ("orporate and employers"); screens FIX now |
| QA-45 | **Open**; screens FIX now |
| QA-46 | **Open**; screens FIX now |
| QA-47 | **Open**; runtime S5 slice 1 |
| QA-48 | **Open**; screens, own slice after S3; now also on Immigration programs |

Everything else in that check still passes on S2: W1-02 removal, the PDF path end to end (fill 44/44 intact), the Structure typed on the page, roles and widths.

**Open after this run:** 0 Blocker · 0 Critical · 3 Major (QA-38, QA-45, QA-48) · 7 Minor (QA-39, QA-40, QA-44, QA-46, QA-47, QA-49, QA-50).

## Suites
* **CI:** the full suites ran on exactly this code (run 40476585351 on ec1e49f; main's run 40491828654 reused it by code fingerprint). Result: **36/36 PASS**, including check_w1_programs_s2 87/87, check_w1_structure 83/83 and its browser check 61/61, S1-finish 33/33, the studio journey 45/45 and runtime R1c 120/120.
* **Mac, under coverage (no `--demo`, one run):** **30 of 35 passed.** Red:
  * check_screen02_slice1: first view 1214 ms.
  * check_w1_programs_s2: Status change 205 ms against 200 ms at scale.
  * check_w1_structure_s1finish: setup timed out.
  * check_runtime_r1c: background copy steps; case page 6.8 s.
  * check_p2_guard: known; it fails under the coverage preload.

  Another session was running checks against the same database cluster during this run.
* **Mac, plain rerun of those five, without coverage:** check_p2_guard 75/75. Three others stopped on request timeouts or a dropped connection while loading the sample: check_screen02_slice1, check_w1_programs_s2 and check_w1_structure_s1finish. The Mac's load average was 13–18 with the other lanes running, and the sample load alone took 21–25 s (2 runs) against the checks' 30 s request limit. check_runtime_r1c was not rerun. **Not a code finding:** CI ran every suite green on the same code.

## Coverage (c8 12.0.0)
api/src **97.10% lines / 82.17% branches**; engine **99.38% / 89.19%**. Both rose since 76628a4 (96.78/81.84 · 99.38/89.05). The api floor rises from 96/81 to **97/82**; the engine floor stays at **99/89**. The demo-reset browser suite was not run under coverage on the Mac, so these figures are without it.

## Graph and decisions
* `graph.mjs --write`: G1 0 · G2 0 · G3 1 (`GET /attachments/:id/file`, the old gap, already explained) · G4 0 · G5 0 · G6 0.
* G5 had flagged C11.1 (Works, but no check named it). I added the id to my own W1-02 labels in `check_qa_am_1027.cjs`; no app change.
* `decision-impact.sh`: every product decision has a capability row or a backlog item.

## Could not test
* The AI-running card and Stop: W1-07, not built.
* A real screen reader.
* Old pre-W1-02 data.
* New combination itself: S3 replaces it.
* The Form library and the combination workspace: out of scope.

## Questions for the Lead
1. QA-49: should the page follow the Structure's order inside each Pathway, as the concept's test says? Or is alphabetical intended? If alphabetical is intended, the List's "Back to Structure order" tip needs other words.
2. QA-48: the screens slice that adds Retire/Restore of a combination should also let Immigration programs show retired combinations (a Retired status or a "1 retired, show" note). Shall I add that to the QA-48 row as part of the expected result?

## Suggestions (never built by qa)
* Sort `rows` by the Structure's display order (as `tree` already is) when `sort=path` (fixes QA-49). *Needed for the proof · Capability*
* Ignore a second click on Start setup while it navigates, or navigate with replace (QA-50). *Later · Capability*
* Load sample dialog: name the type on each Pathway line ("Retail › Temporary residence"). *Later · Scaffolding*
* The qa lane's milestone and coverage runs go to the cloud, or to a window when no lane runs on the Mac. Today the sample load (21–25 s) sits near the checks' 30 s limit whenever the Mac is busy. *Later · Scaffolding*
