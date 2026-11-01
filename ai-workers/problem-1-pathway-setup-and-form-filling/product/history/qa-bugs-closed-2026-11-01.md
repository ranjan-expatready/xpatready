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
