# qa findings closed on 1 Nov 2026 (moved word for word from `qa/BUGS.md` and `qa/reports/bugs-open-detail.md`, AGENTS.md rule 8)

## QA-100 — closed 1 Nov 2026 (after-merge 52768cd2)

Closed by the qa lane on main **52768cd2** (fixed by #112, P-175): on test copy qa_pr :4472 started by isolated.sh (no STUDIO_*_LIVE in the server's environment, checked in /proc), the finder plan says `live.on: false` with "AI now is switched off on this copy (no paid AI call can start here)…" and a live start is refused 409 with the same words before any process starts (`sources.ts` aiLive, `finder.ts:233`; the launcher refuses every live mode too, `sources.ts:449`). Check: `studio/tests/qa/check_qa_am_1101_api.ts` (QA-100 line). US$0.

Row as it stood in `qa/BUGS.md`:

| QA-100 | Gap · Critical | C11.8, C11.15 · P-175 (live AI off by default on every copy), P-110 | a9fe60c0 (explore) | Every copy, isolated test copies too, makes live finder calls: one click on "Find forms with AI (about … · at most …)" spends real money; only the people AI has a live switch (`people-ai.ts:33`); the key file is shared. A qa check spent US$0.27 unapproved this way … Lead 29 Oct: forms fixes it (live finder off on any copy unless its server starts with an explicit switch; :4400 by the founder) | forms | Open |

Detail as it stood in `qa/reports/bugs-open-detail.md`:

| QA-100 | Gap · Critical | C11.8, C11.15 · P-175 (founder: live AI off by default on every copy, :4400 included; a server switch turns it on), P-110, R-140 | **a9fe60c0** (explore 29 Oct, qa_ex :4473) | Start an isolated copy with no switch (`isolated.sh qa_ex 4473 start`), Load sample → Study permit › Forms › "Find forms with AI (about US$0.31 · at most US$5.58)" → expected: a test copy cannot call paid AI unless it is started with a live switch (as the people AI's `STUDIO_PEOPLE_AI_LIVE=approved`) → actual: two paid rounds ran at once (US$0.132 + US$0.134 = US$0.27), settled in the copy's own `p2/ledger/spend.jsonl` (QA-90: not on main). The click is designed (P-125: run only on a click, price on the button); the gap is that any copy (any check, any lane) with the shared key file can spend. The qa explore check clicked it unplanned: US$0.27 spent without founder approval (reported to the Lead at once). | `reports/2026-10-29-explore/ledger-unplanned-live-find.diff`, the two live run files beside it, `live-find-run-page.txt`; code `api/src/people-ai.ts:33` (the only live switch), `p2/guard.ts:327` (shared key file). Check: `check_qa_explore_1029.cjs` now stops if the ledger grows. Lead 29 Oct: assigned to forms; the US$0.27 counts against the founder's US$6.49 ceiling (US$5.94 left; US$0.55 spent of US$6.49) | forms | Open |

## QA-90 — closed 1 Nov 2026 (after-merge 52768cd2)

Closed by the qa lane on main **52768cd2** (fixed by #112): the ledger is one folder per machine. `p2/ledger/spend.jsonl` is no longer tracked (`.gitignore`); unset P2_LEDGER_DIR resolves to the main copy's `.tools/p2-ledger` (printed here: `/home/user/xpatready/.tools/p2-ledger`); `tests/check_p2_shared_ledger.ts` 9/9 here (two processes reserve into one ledger and the cap counts both; a relative path is refused; the seed union keeps shared lines once). Not checked: two real lane copies on the Mac reading the one ledger (cloud copy has no worktrees).

Row as it stood in `qa/BUGS.md`:

| QA-90 | Gap · Critical | C11.8 · P-110 (US$60 Wave 1 cap), P-139 … | 170659bc | The spending ledger `p2/ledger/spend.jsonl` is a tracked file and each copy has its own: the demo's 29 Oct spend (US$0.96, five calls) exists only in the demo copy; main … | Lead (shared tooling) | Open |

Detail as it stood in `qa/reports/bugs-open-detail.md`:

| QA-90 | Gap · Critical | C11.8 · P-110 (US$60 Wave 1 cap), P-139, AIW-D282 (US$100 experiment cap) | **170659bc** | The spending ledger `p2/ledger/spend.jsonl` is a tracked file and each copy has its own: the demo's 29 Oct spend (US$0.96, five calls) exists only in the demo copy; main and the 8 other copies still count Wave 1 at US$2.00. Every lane is told to put the ledger back to HEAD after a suite run. The caps are therefore per copy and can be reset by a checkout → expected: one ledger outside the repository that every copy reads and writes, with the lock already in `ledger.ts` | ledger sums per copy, report §2 | Lead (shared tooling) | Open |
| QA-113 | UX · Minor | C4.9, C5.3 · PRODUCT §4 | **5f6c8deb** (after-merge) | Approver › To review › Approve or return on a who-fills change → expected: "Change who fills a question: …" → actual: "Change who fills who fills a question: IRCC application file number of the case · filled by the client, for every combination". Also at 1024 px: the To review table is 25 px wider than its box (760 in 735), scrolls sideways, "Item" shows as "em"; once, the first click on Approve or return stayed on /review (the address itself worked) | Walked at 1024 px (approver) | runtime (heading) · screens (table width) | Open | **Closed 1 Nov on 832ee5bd (qa after-merge, `reports/2026-11-01-after-merge-2.md` §2): walked at 1440 and 1024 as author and approver; fixed.**
| QA-74 | UX · Minor (was Major) | C5.x Releases, Activity · PRODUCT §4 (no hashes, ids) | **f7cb40d9** | **Retest deda0e6b: Releases and Activity fixed (role names, one date format, fingerprint only in a tip). Still on the combination's Review and release › versions table: a Fingerprint column (`b228b666d2cff378`) and "10/29/2026, 8:34:03 PM".** Before: Releases and Activity show internal values: "user-A / user-A / user-B" (the combination's own tab says "Configuration author / … / Approver"); Fingerprint `0c8fcb19c2d4d2e2`; Activity "Who: user-A", "opened case d5e3f41b … (0c8fcb19c2d4)", "51 program nodes", Item "configuration row" (§4 Not word). Dates in three formats: "10/29/2026, 7:53:23 AM", "today 7:53 a.m.", "2026-10-29". Fix: role names; case reference instead of id; fingerprint under Details; "names", "combination"; one date format | `ws/`ev-releases.png, ev-activity.png | screens | Open | **Closed 1 Nov on 832ee5bd (qa after-merge, `reports/2026-11-01-after-merge-2.md` §2): walked at 1440 and 1024 as author and approver; fixed.**

## QA-77 — closed 1 Nov 2026 (after-merge 6b424941)

Closed by the qa lane on main **6b424941** (fixed by #171 and #245): on test copy qa_wk :4472 (Load sample, no STUDIO_*_LIVE), every tab of Visitor visa (Overview, Forms, Documents, Questionnaires, Preview, Review and release) names the people one way: "Applicant", "Spouse or partner", "Child" (`tests/qa/check_qa_am_1101d_c212_walk.cjs`, the two QA-77 lines; the builder's `check_qa77_names_browser.cjs` 17/17). The sample's rename to "Principal applicant" (P-209) is backlog row X1c (runtime), not part of this bug.

Row as it stood in `qa/BUGS.md`:

| QA-77 | UX · Minor | C11.12 · PRODUCT §4 person roles | f7cb40d9 | Visitor visa names its people two ways on one page: header and Overview "Applicant, Spouse or partner (travelling), Child (travelling)"; Questionnaires table "Principal … | runtime | Open |

Detail as it stood in `qa/reports/bugs-open-detail.md`:

| QA-77 | UX · Minor | C11.12 · PRODUCT §4 person roles | **f7cb40d9** | Visitor visa names its people two ways on one page: header and Overview "Applicant, Spouse or partner (travelling), Child (travelling)"; Questionnaires table "Principal applicant, Spouse or partner, Child". §4 says Principal applicant. Fix: one set of names, from the people table | `ws/`ev-people-names.png, combo2-overview-1440.png | runtime | Open |

