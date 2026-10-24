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
