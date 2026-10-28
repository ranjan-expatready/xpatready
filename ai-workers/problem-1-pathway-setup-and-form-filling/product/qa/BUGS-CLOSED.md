# Findings closed after a qa retest (the qa lane writes this file; the Lead may move it to `history/`)

| # | Type · Severity | Capability | Found | Closed on | How it was retested |
|---|---|---|---|---|---|
| QA-2 | Bug · Major | C3.3 | main eeea376f (Lead audit) | main 65826022 (forms F1 merge d795b019), 23 Oct | `check_qa2_ai_drafting.ts`: `check_ai_drafting.ts` 48 pass, 0 fail, runs to the end with 6 saved IMM 1344 answers on file |
| QA-1 | Bug · Critical | C5.2 | eeea376f | e742bc59 (Screen 01 merge 1cb174a6), 24 Oct | `check_qa1_release_bypass.ts` 7/7 (shared release refuses unsubmitted, unsigned changes); journeys J7 in the browser, 3 runs |
| QA-3 | Bug · Minor | lane tooling | Lead check 23 Oct | e742bc59, 24 Oct | restart on :4477 replaced only its own process, another copy's kept; a port with no database refused |
| QA-5 | Bug · Minor | audit trail | 141194dc | e742bc59, 24 Oct | `check_qa5_stored_times.ts` (stored within 2 min). Old rows on :4400 remain early: QA-19 |
| QA-6 | Bug · Minor | C1.2 | 141194dc | e742bc59, 24 Oct | journeys J3 ×3: "Use letters or digits in the name, not only punctuation." on the field, nothing stored |
| QA-7 | Bug · Major | C1.2 | 141194dc | e742bc59, 24 Oct | journeys J3 ×3: "Keep the name under 120 characters." on the field, Create off, nothing stored |
| QA-9 | Bug · Major | suites | 141194dc | e742bc59, 24 Oct | Studio browser runs both passes (38/40: QA-4, QA-8); scale fixture + check 17/17 |
| QA-10 | UX · Minor | C5.1 | 141194dc | e742bc59, 24 Oct | journeys J6 ×3: "Submitted by Configuration author" |
| QA-11 | UX · Minor | C1.2 | 141194dc | e742bc59, 24 Oct | journeys J2 ×3: opens /c/<id> |
| QA-12 | UX · Minor | scaffolding | 141194dc | e742bc59, 24 Oct | fresh copy + hand-made row: loaded false, programsExist true, menu item disabled with the reason |
| QA-13 | Bug · Major | C1.4, C2.4 | Lead walk 23 Oct | e742bc59, 24 Oct | `check_qa13_readd_form.ts` 6/6 (add, remove, add again) |
| QA-16 | Gap · Minor | all screens | Lead walk 23 Oct | e742bc59, 24 Oct | `check_qa16_box_words.ts` PASS (no screen text or message). Stored old texts on :4400: QA-19 |
| QA-18 | Gap · Major | C2.5, C3.5, C3.8 | 65826022 | e742bc59, 24 Oct | c8: engine branches 86.22% ≥ 85% floor (per file still: twin 83.2, capture 83.9, options 84.9) |
| QA-14 | Bug · Major | C1.2 | 65826022 | db468e38 (Screen 01 small FIX 23cd9bf4), 24 Oct | `check_qa14_name_race.ts` 20 names × 4 at once → one 201 each, no duplicate; new `check_qa14_variants.ts` 20/20 (case, double space, hyphen, underscore, trailing dot sent at once, category and sub-category: one row, the rest 409 "… already exists under …"); `check_grounding_db` 29/29 |
| QA-17 | UX · Minor | C1.4 | 65826022 | db468e38, 24 Oct | a step moved two days back reads "Oct 22, 6:18 p.m.", today's "today 6:18 p.m." (`reports/2026-10-24-after-merge-2/QA-17-recent-steps.png`) |
| QA-8 | Bug · Major | C3.1, C3.3 | 141194dc | db468e38 (forms slice 2, `--preserve-symlinks`), 24 Oct | `check_ai_orchestration.ts` 22/22 in a lane copy under `.claude/worktrees/` with the main copy's `node_modules` linked (the failing set-up); 22/22 in the plain copy |
| QA-21 | Bug · Minor | suites | e742bc59 | db468e38 (screens L2 waits), 24 Oct | `check_screen01_browser.cjs` 136/136 in two full suite runs in the qa copy |
| QA-4 | Bug · Major | all (lane copies) | 141194dc | 12e7207 (screens small FIX), 24 Oct | `check_qa4_page_address.ts` in a lane copy under `.claude/worktrees/`: pages 5/5 and a stored source downloads (200 application/pdf) |
| QA-20 | Bug · Minor | C1.6, C1.7 | e742bc59 | 12e7207, 24 Oct | `check_qa_s01_channels.cjs` 19/19: combination page with channels 400 px wide at 400 px, 1024 at 1024 |
| QA-22 | UX · Minor | C1.1 | db468e38 | 12e7207, 24 Oct | `check_qa22_author_flash.cjs` (session held 1.5 s): skeleton until the person is known, then the author's own message; New combination not disabled for the author |
| QA-15 | UX · Minor | C2.5 | 65826022 | 12e7207 (forms slice 2b), 24 Oct | `check_qa_f1_probe.ts` 26/26 (lower-case form code accepted at capture start) |
| QA-23 | Bug · Major | C6.6 (D1) | db468e38 | 12e7207 (runtime R1c), 24 Oct | `check_qa_r1a_probe.ts`: after a row is removed, Confirm section with every shown answer → 201 |
| QA-24 | Bug · Major | C6.10, C6.6 (D2) | db468e38 | 12e7207, 24 Oct | impossible and future birth dates no longer count as a minor; the principal's answer for that child does not reach IMM 5257/5707 as a confirmed fact; an unconfirmed birth date also holds the answer (probe NOTE) |
| QA-25 | Bug · Minor | C6.3 | db468e38 | 12e7207, 24 Oct | terminal escape and bell in a typed answer refused or flagged (`check_qa_r1a_probe.ts`) |
| QA-28 | Gap · Minor | C6.2 | db468e38 | 12e7207, 24 Oct | the same idempotency key sent twice at once adds one child (201, 201, one row); the key with a different person → 409 plain; in the browser a double-clicked Add adds one child (`check_qa_r1c_walk.cjs`) |
| QA-27 | UX · Minor | C3.1, C3.9 | db468e38 | 12e7207, 24 Oct | `check_qa_s2_probe.ts`: the six screen-map start and accept refusals in plain words |
| QA-29 | Bug · Major | C3.9 (D3) | db468e38 | 12e7207, 24 Oct | a LIVE start with proposals waiting returns the waiting draft (reused, US$0): no new job, no ledger line (`check_qa_s2_probe.ts`); a STUB start still makes a free second pass (note) |
| QA-30 | Bug · Minor | C3.1 | db468e38 | 12e7207, 24 Oct | draft request with no mode → 400 "Choose how to draft this form: live, replay or stub …" |
| QA-31 | Gap · Minor | C3.9 | db468e38 | 12e7207, 24 Oct | LIVE screen-map drafts now have AI work and the one cancel: retested through the builders' `check_ai_launch_paths.ts` 55/55 (fake launcher, US$0) run by qa on 12e7207 and the code (`forms.ts:499`, `:557`); qa did not write its own LIVE-cancel probe (one-run budget). A STUB pass has nothing to cancel (by design) |
| QA-32 | UX · Minor | C3.3 | db468e38 | 12e7207, 24 Oct | retry after a mid-run cancel runs a new step (201) and finishes at US$0 (`check_qa_s2_probe.ts`) |
| QA-33 | Gap · Minor | C3.1 | db468e38 | 12e7207, 24 Oct | a field that changed from date to text between editions is not reused (`check_qa_s2_probe.ts`) |
| QA-34 | Gap · Major | coverage | db468e38 | 12e7207, 24 Oct | api 95.95% lines / 80.95% branches (floor 95 / 79) with the fake-launcher suite |
| QA-35 | Bug · Major | C6.1 | 12e7207 | 8aef175 (runtime R1d), 25 Oct | `check_qa_r1c_walk.cjs`: Demo menu "Open the case area" and `/cases` typed as the author both show the case area as the officer |
| QA-36 | Bug · Minor | C6.2 | 12e7207 | 8aef175, 25 Oct | as decided by the Lead (P-47, save and flag): Back with 31 Feb keeps the part, the summary and the typing; status "Saved: 1 answer needs a fix", not "✓ Saved"; stored flagged (`check_qa_r1c_walk.cjs`) |
| QA-37 | UX · Minor | C3.10 | 12e7207 | 8aef175, 25 Oct | `check_qa16_box_words.ts`: 0 in the web app, 0 in API messages |
| QA-26 | UX · Minor | C6.2, C6.3, C6.6 | db468e38 | 8aef175, 25 Oct | `check_qa_r1a_probe.ts` 71/71: `applies` as text → "Say whether the person is travelling (true or false)." |
| QA-19 | UX · Minor | C3.10, C1.4 | e742bc59 (shared demo) | 25 Oct (Mac, after the founder's demo reset; Lead note) | `check_qa19_demo_leftovers.ts` passed on the Mac :4400 after the reset (Lead's check; :4400 is not reachable from the cloud, P-88) |
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
