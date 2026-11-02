# C11.12 filing modes — build notes (screens builder, 2 Nov)

Three PRs as concept r2 §6b splits them (P-233). Live AI off, US$0.

## Files
* PR 1 (#445): `engine/filing-modes.ts` (new, pure), `engine/people.ts`, `contracts/workspace.ts`, `api/src/studio.ts`, `api/src/workspace.ts`, `engine/programs.ts`, `engine/setup-checklist.ts`, `engine/structure.ts`, `contracts/programs.ts`, `api/src/case-prepare.ts`/`case-filings.ts` (release modes), `web/src/pages/workspace/questionnaires.tsx` (BR-8), samples, `acceptance/lib/setup_vv_m3.ts`, `acceptance/C11.12.test.ts` line 57, `tests/check_c1112_modes.ts`.
* PR 2: `engine/runtime/filings.ts` (plan-based filings, per-person fees, co-filing, BR-10), `api/src/case-prepare.ts` (owner-keyed filings, applicant upsert/compare, items on the filing a person is on, split refusal), `api/src/case-filings.ts`, `api/src/runtime.ts` (BR-6), `contracts/runtime.ts`, migration `20261102160000_c1112_filing_modes`, tests (`check_c1112_prepare_api.ts` new, `check_vv_filings`, `check_vv_prepare`, `check_vv_prepare_store_api`, `C6.12.test.ts:22` per the Lead).
* PR 3: the Filing and Fees columns, the per-line warning, "What a case gets" (worked out in the browser with the server's pure functions), cards under 760 px, the blocking release line (`FILING_NOT_SET_BLOCKS = true`), the people step's Fix item (n3), fixtures that release now set modes, `tests/check_c1112_filing_browser.cjs` (new).

## Team names and mapping
Line modes `files_own · on_principal · declared_only · co_files`; filing modes `files_own · co_filed` (`on_principal` history only); applicant modes `applying · declared_only`. One mapping: `filingOf()`; one release reading: `releaseModes()`.

## Mock vs real
Real: rules, save, release check, case filings, stored rows, fees for Visitor visa (Sample amounts). Sample: every filing mode in the samples (ASSUMPTIONS C1), until the immigration expert confirms. Not built: PR and sponsorship fee amounts; forms for declared-only people; linked combinations for Files-own family members.

## Checks
Every BR has a pass and a fail (`check_c1112_modes`, `check_vv_filings`, `check_c1112_prepare_api`, `check_c1112_filing_browser`). axe clean on the card. 375 px and 200 % zoom: the card fits (the page's tab bar overflows on main too). Reviewer and breaker on each PR; findings in `review*.md`, `break-report-pr2.md`.

## Known gaps
`C11.12.test.ts` line 90 (sample principal labels; fails on main). `check_runtime_r1c` "Confirm section" fails on main too. Minors listed in each PR body.
