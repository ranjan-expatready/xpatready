# Findings closed after a qa retest (the qa lane writes this file; the Lead may move it to `history/`)

Older rows (closed up to 26 Oct): `history/qa-bugs-closed-to-2026-10-26.md`.

| # | Type · Severity | Capability | Found | Closed on | How it was retested |
|---|---|---|---|---|---|
| QA-41 | UX · Minor | C6.1, C6.3 | 8360565 | 76628a4, 27 Oct | `check_qa_am_1027.cjs`: the Open a case dialog opens with focus on "Case reference" (an input), not Close |
| QA-42 | UX · Minor | C1.4 | 8360565 | 76628a4, 27 Oct | `check_qa_am_1027.cjs`: Visitor visa (Live, forms released) no longer shows the "not set up yet" seed note |
| QA-43 | Bug · Minor | C2.7 | 8360565 | 76628a4 (W1-02 removed the route, P-102), 27 Oct | `check_qa_am_1027.cjs`: `GET /combinations/:id/online-forms` is gone (404), with the other capture, pairing and portal routes |
| QA-45 | Bug · Major | C11.3 | 76628a4 | main 027174d (screens S1/S2 FIX, PR #59), 27 Oct | `check_qa_am_1027.cjs` QA-45 step; by hand: "Add sub-category" on Study permit extension opened a row under it (locations from the category), typed in place, added |
| QA-44 | UX · Minor | C11.3 | 76628a4 | main 027174d (screens S1/S2 FIX, PR #59), 27 Oct | `check_qa_am_1027.cjs` QA-44 step passed 2 of 2 runs (was lost on 6 of 7); by hand: "Inside Canada" typed straight after Enter kept whole |
| QA-46 | UX · Minor | C11.9 | 76628a4 | main 027174d (screens S1/S2 FIX, PR #59), 27 Oct | `check_qa_am_1027.cjs` and `check_qa_am_fix_1027.cjs`: To review list and item page say "Remove structure name" (trail wording: QA-51) |
| QA-49 | Bug · Minor | C11.10 | f289ec7 | main 027174d (screens S1/S2 FIX, PR #59), 27 Oct | `check_qa_am_s2_1027.cjs` 3 QA-49 steps: sample order = Structure order; a reorder shows on cards and List, also after 'Back to Structure order' |
| QA-50 | UX · Minor | C11.10 | f289ec7 | main 027174d (screens S1/S2 FIX, PR #59), 27 Oct | `check_qa_am_s2_1027.cjs` QA-50 step: one Back after a double click returns to Immigration programs; nothing created |
| QA-51 | UX · Minor | C11.9 | 76628a4 | main dccd87e (PR #66), 28 Oct | `check_qa_am_fix_1027.cjs` QA-51 step: the To review title reads "Delete structure name: Retail › Temporary residence › Visitors › Visitor record" |
| QA-52 | UX · Minor | C11.9 | 027174d | main dccd87e (PR #66), 28 Oct | `check_qa_am_fix_1027.cjs` QA-52 step: "… approved and deleted. The History line stays."; the name is gone at once |
| QA-54 | UX · Minor | C11.10, C11.3 | 027174d | main dccd87e (PR #66), 28 Oct | `check_qa_am_fix_1027.cjs` 2 QA-54 steps: a case person on `/` and `/structure` is told the page is for the configuration people |
| QA-57 | Bug · Minor | C11.3, C11.10 | dccd87e | main 06a8fc30 (PR #65, the forms lane's contrast fix in `structure.tsx`), 28 Oct | `check_qa_am_r3_1028.cjs` 5 axe steps clean (Tree, List, Impact panel, approver, 1024 px); 64/69 |
| QA-53 | Gap · Minor | C11.10, all configuration reads | 027174d | main 38722933 (PR #69, 368b8c32: one shared read guard, deny by default), 28 Oct | `check_qa_am_fix_1027.cjs` 14/14 (each of the 17 named reads); `check_qa_am_r69_1028.cjs`: 10 configuration GETs incl. upper case, trailing slash and HEAD refuse nobody/unknown 401, officer/client 403, answer the three Studio people. Reads outside the guard follow as QA-65 |
| QA-38 | Bug · Major | C6.1 | 8360565 | main e2cb27a4 (PR #71, S5), 29 Oct | `check_qa_am_s5_1029.cjs`: the case opens on release 3 and Open a case says "With an LMIA · release 3" |
| QA-40 | UX · Minor | C7.6, C7.7 | 8360565 | main e2cb27a4 (PR #71, S5), 29 Oct | `check_qa_am_s5_1029.cjs`: `GET /runtime/cases/:id/forms` lists IMM 5707 under `online`; the case page says "IMM 5707 · filed Online (later wave) No PDF copy" |
| QA-55 | UX · Minor | C11.9 | dccd87e | main db5e0208 (PR #67, 3858216e), 29 Oct | `check_qa_am_r3_1028.cjs` 68/69 (only QA-48 fails): a released Program's retire reason no longer calls unused names "in use" |
| QA-56 | UX · Minor | C11.3 | dccd87e | main db5e0208 (PR #67, 3858216e), 29 Oct | `check_qa_am_r3_1028.cjs`: Enter on a new typed name accepts it and moves to the next level |
| QA-58 | UX · Minor | C11.9 | dccd87e | main db5e0208 (PR #67, 3858216e), 29 Oct | `check_qa_am_r3_1028.cjs`: after the 10 s toast an own-draft delete can still be undone from the page |
| QA-59 | UX · Minor | C11.9 | dccd87e | main db5e0208 (PR #67, 3858216e), 29 Oct | `check_qa_am_r3_1028.cjs`: a returned deletion says on its row that it was returned and why |
| QA-60 | Bug · **Major** | C11.3 | dccd87e | main db5e0208 (PR #67, 3858216e), 29 Oct | `check_qa_am_1027.cjs` part A: typing at once after Add and add another keeps every letter ("Tourist visa (to remove)") |
| QA-61 | Bug · Minor | C11.11, C11.6 | 06a8fc30 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_s4_filing.ts` 9/9 and `check_qa_am_s4_1028.cjs` 62/62: a paper or mail line is never a PDF upload |
| QA-62 | UX · Minor | C11.15, AI work | 06a8fc30 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_s4_1028.cjs` 62/62: a replay with no saved answer says so in plain words; AI work names a finder run by its place |
| QA-63 | UX · Minor | C11.15 | 06a8fc30 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_s4_1028.cjs` 62/62: a waiting finder card links onward to the Sources page (forms f2dfa1e9), not to itself |
| QA-64 | Conflict · Minor | C11.11, C11.9 | 06a8fc30 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_s4_1028.cjs` 62/62: the retire dialog says a library retire takes effect at approval, and it does |
| QA-65 | Gap · Minor | C11.10, C11.15 | 38722933 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_r69_1028.cjs` 33/33: the releases list, finder plan, AI plan and condition check refuse nobody (401) and case people (403) |
| QA-66 | Bug · Minor | C11.9 | 38722933 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_r69_1028.cjs` 33/33: a returned change keeps Withdraw on the row and names the right action |
| QA-67 | Bug · Minor | C11.9 | 38722933 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_r69_1028.cjs` 33/33: row actions follow a person switch without a reload |
| QA-68 | Bug · Minor | C11.9 | 38722933 | main db5e0208 (PR #73, 56f04113), 29 Oct | `check_qa_am_r69_1028.cjs` 33/33: Send again asks only what changed; a Name sent with it is refused in words (400), never dropped |
