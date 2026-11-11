# B171 review: every IRCC account in words on the case side (forms lane, PR #1543)

Reviewer: a fresh session that did not build this row, 11 Nov 2026. Commit reviewed: **042dd0ac244db99005761d174f99780011b128e1**
(branch `claude/funny-mendel-9e71b5`; diff `git diff origin/main...042dd0ac2`: `api/src/case-prepare.ts`, `web/src/runtime/submission.tsx`,
`tests/check_b171_account_words.ts`, 7 screenshots). This is a small code fix with no new screen: the screen-review skill is applied
as far as it fits (no concept.md; the row text in the PR and Lead 16 is the bar). Live AI off, US$0. Ports: forms lane 4456 and 4457.

## What I ran (my own isolated copies, never :4400)
1. **Branch, fresh copy** (`isolated.sh rv_b171 4456`): `check_b171_account_words.ts` **14/14** (the builder's 13 plus the
   checkpoint-load setup line, which prints only on a fresh copy). Run time 2 min 47 s.
2. **Main's code, same test** (scratch worktree at 042dd0ac2 with main's two files, `rv_b171m 4457`): **6/14**. All 8 behaviour
   checks fail for the right reason, each with the raw key in its output: `"Filed through PR_PORTAL: …"` (API, case page, IMM 0008
   answer sheet), `"Filed through PAPER: …"` (paper), `"…acknowledged it through PR_PORTAL."` (dialog), and the recorded line. The
   6 that pass are setup lines and the unchanged APR line. So the test fails when the fix is removed.
3. **Branch merged with B169** (`pull/1523/head` 6476965d9, merged in the scratch worktree only, with no commit): B169's test **14/14**.
   After Demo › Load the configured checkpoint, `fs.spouse` = `PR_PORTAL` from B169's own data, not set by SQL. B171's test **13/13**,
   run twice on the same copy (the second run on a copy that was not fresh also passed). Afterwards `fs.spouse` was back on PR_PORTAL
   and `vv.single` on APR_PORTAL.
4. **Walk as the case officer** (Playwright, on the B169-merged copy, a real fs.spouse case): the case page reads "Filed through PR
   Portal: set by the combination, not on the case" at 1440, at 1024, and at 1024 with 200 % zoom. No sideways scroll. axe WCAG 2.2
   A/AA: 0 violations at each size. No console or page errors. No raw account key anywhere in `main`. Followed the "Open answer
   sheet: IMM 0008…" link the way a person would: the sheet reads the same line.
5. `check_c116_channels_browser.ts` (it pins the APR wording at :75) **54/54** on the branch. `graph.mjs --check` exit 0. `count-any`
   418 (ratchet baseline 433). `tsc -p web` clean. `git merge-tree` against today's main (255c9882b): clean.
   `acceptance/C11.6.test.ts` needs its own setup scripts first, so I did not run it. The APR line it pins was checked by 1 and 5.

## Verdict: Approve
There is no open Blocker or Major. The row's "Done when" is met: the fail test fails on main and passes on the branch. With B169's
data, the case page, the IMM 0008 Online answer sheet and Prepare (`portal_words`) read "PR Portal" and never a raw code. The suites
the change touches pass unchanged. B169's Major 1 is closed once this merges before #1523.

## Findings (ranked; none blocks)
1. **Should (minor, follow-up), D3/D10: the phrasing rule is written twice, and it differs from the Forms tab's.**
   `api/src/case-prepare.ts:55` (`filedThrough`) and `web/src/runtime/submission.tsx:37` (`through`) are the same one-line helper.
   Both sit beside `contracts/forms.ts:44 throughAccount`, which says "through **the** X". The case side now says "through PR Portal",
   while the Forms tab toast says "Filed through the PR Portal" (`web/src/components/channels.tsx:88`). The words come from one table
   (`ACCOUNT_WORDS`), so there is no raw key, but there are now three sentence shapes. On the case side this also reads oddly for
   accounts without "Portal" in the name: "Filed through IRCC secure account", "through LMIA Online (ESDC)" (this is B171-2's own
   output). The builder kept "Filed through APR Portal" word for word because C11.6 pins it, which is a fair reason under the row's
   scope. Fix in a later row: one contract export (for example `filedThroughWords` in `contracts/forms.ts`) used by both files, and
   one decided phrasing (with or without "the"), with the C11.6 pin updated in the same PR.
2. **Note (not this row): `api/src/finished-story.ts:307` `p.portal_words ?? p.portal`.** This cannot print a raw key.
   `portal_words` is null only when `portal` is null (`case-prepare.ts:670`), so the fallback is dead code. With no account set, it
   would print "(null)" in the story's line. The finished story runs on the Visitor visa (APR Portal), so nothing shows today.
   Delete the fallback when that file is next touched.
3. **Note (not this row): Prepare reads the account from the live combination** (`case-prepare.ts:161` `own.portalKey`). Other case
   reads take it from the pinned release snapshot (`form-additions.ts:151`, `fill-case.ts:199`). B171's test switches the account
   with SQL on the live row, which depends on this. The setup guard ("…its combination now on the PR Portal", `p.portal ===
   "PR_PORTAL"`) would fail loudly, not quietly, if Prepare moved to the pinned snapshot. This is an existing inconsistency, outside
   this row's scope.

## Other places that could print a raw IRCC account key (asked by the tech lead)
I searched `web/src` and `api/src`, plus `engine/`, for `portal`, `.account`, `portalKey` and `portal_words`. On the case side, an
account reaches a person in only three places: `portal_words` (case page `item-channels.tsx:62`, answer sheet `answer-sheet.tsx:92`)
and the two lines in `submission.tsx` (:139, :233). All three are fixed here. The other account words already go through
`ACCOUNT_WORDS`, `throughAccount` or `accountSubject`:
- `engine/channels.ts:73,85,88` and `engine/runtime/prepare.ts:111` (refusal text)
- `api/src/workspace.ts:114` and `api/src/forms.ts:136`
- `programs.tsx` through `channelGroups`

`ChannelDialog` uses `portal` only as logic (`item-channels.tsx:33`). The submission audit line (`api/src/submission.ts:173`) does not
name the account. Nothing remains for this row, and only finding 2 is left for a follow-up.

## Test quality (asked by the tech lead)
- **Restore:** the `finally` block puts both combinations' accounts back (`check_b171_account_words.ts:107`), and I confirmed it in
  the database after each run. The Visitor visa case it records stays recorded in that copy only.
- **Flakiness:** the suite's usage line starts its own copy (`forms_b171` on 4451). That name is used by no other suite, and 4451 is
  shared only in the usual serial way. Its SQL touches only its own database, so it cannot affect another suite. It passed twice
  on a copy that was not fresh.
- **Right reason:** the checks compare exact strings built from `ACCOUNT_WORDS` and also look for keys with a regex (`RAW`). On main
  they fail on the raw key, as shown in step 2 above. The screen checks read the same `[data-portal]` nodes a person sees.
- **Side effect:** each run rewrites the committed screenshots in `screens/B171/screenshots/`, as other suites do with theirs. After
  my run I restored them to HEAD. Two of them showed as modified again later, written by the builder's own `run-suites` in this same
  working tree. I did not touch them.

## Scores (D1–D20, for this row only; the rest of the screen is unchanged)
D1 5 (the row's three places and paper, with B169 data) · D2 5 (only words change; the stored `filing_record.portal` stays the key) ·
D3 3 (the helper is duplicated, finding 1) · D4 N/A · D5 5 (reload and rerun pass) · D6 N/A · D7 N/A (no AI) · D8 5 unchanged ·
D9 5 unchanged · D10 4 (no raw key; article inconsistent, finding 1) · D11 5 (lock icon, read-only line) · D12 5 (screenshots
01–04) · D13 5 (axe 0, 200 % zoom, dialog opened by keyboard in B171-7) · D14 5 · D15 4 (line shown in 1.4–2.3 s cold; the same
on main) · D16 5 (fails on main, passes on the branch) · D17 and D20 simulated only · D18 5 ("set by the combination, not on the
case") · D19 5 (case page → answer sheet → record → recorded).

## BIC scorecard (EXPERIENCE §6; only the checks this row touches)
| Check | Result | Evidence |
|---|---|---|
| BIC-15 Filing channel per form explicit | Met | case page at 1440 and 1024: "Filed through PR Portal" (`screenshots/01-…`, my walk) |
| BIC-16 Signing and submission recorded events | Met | dialog "…acknowledged it through PR Portal." and recorded line "· through PR Portal" (`03-…`, `04-…`) |
| BIC-19 Low cognitive load by layout | Met | one line under the panel heading at 1440, 1024 and 200 % zoom; no sideways scroll |
| BIC-20 Accessible and keyboard-complete | Met | axe 0 at all three sizes; dialog opened with Enter (B171-7) |
| BIC-01–14, 17, 18 | N/A | not changed by this row |

## Journey score
**9/10, pass** (details: `screens/B171/journey-test-reviewer-2026-11-11.md`). Plain words scored ½ (finding 1). Speed scored ½
(time to first view; not a change from main).

## Could not check
- A real screen reader. An intended user's own walk without help (D17 and D20 stay with the founder).
- The builder's `run-suites.sh --changed` exit code (it was still running in the builder's session).
- `acceptance/C11.6.test.ts` (it needs its own setup scripts first).
