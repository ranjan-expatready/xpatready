# B169 review: spousal sponsorship's IRCC account on the six and the checkpoint (PR #1523)

Reviewed commit `9540d3057` (branch `claude/amazing-davinci-wvk1b3`), base `origin/main` `fbfb263c7`. Reviewer did not build it.
Copies on :4521 (branch data), :4531 (main's `form-library-sample.json` swapped in, restored with `git checkout 9540d3057 --`),
gate B slots :4540-4547, :4525. Live AI off, US$0 (scratch ledger). Journey test: `journey-test-reviewer-2026-11-11.md`.

**Verdict (screen-review scale): Ship after fixes.** The data, the citation and the test are right; one Must on the case side.

## What I checked, with evidence
1. **Citation (P-170).** The quote is the recorded page's sentence (line 360: `<strong>principal applicant</strong>` and two spaces
   before "(PR) Portal"; equal once tags and spaces are collapsed). `dcterms.modified` = 2026-09-11 (`dcterms.issued` 2023-08-04).
   The URL is the page's own `rel="canonical"` and its `canada/index.json` entry. The file's SHA-256 matches the index (`dcf53d72…`).
   `read` 2026-10-27 = the index's `recorded_utc`. Labelled "Sample, Unconfirmed: expert". Met.
2. **Main vs branch data, real copies.** Main: `check_b169` 2/9, with "Reset to the six" and "Load the configured checkpoint" both
   leaving `fs.spouse` at `(none)`. Branch: 9/9, PR_PORTAL on both. Checkpoint diff, main vs branch: fs.spouse's release-1 snapshot
   differs only in `+combination.portal = PR_PORTAL` (933 KB JSON compared key by key). Form lines are identical (IMM 0008, 5406,
   5669 Online; the others PDF upload). Sources are identical, and Guide 5289 was already a source, so "guides linked: 0".
   Library guides are the same. Other combinations' accounts are unchanged (vv.single APR_PORTAL, lm.high_wage LMIA_ONLINE).
   `GET /combinations/:id/channels` changes only in `account` (null → PR_PORTAL); `lines` and `problems` match.
3. **Release check and C7.3, re-run by me.** qa144 28/28 on the checkpoint. Gate B C7.3 on the checkpoint: 14/14, 15/15, 15/15.
   On the six (fixture only): 14/14, 15/15, 15/15, with setup_vv_m3 at 44/46 as on main. These are **regression proof only**:
   no qa144 or C7.3 step reads the account, and every C7.3 pack runs on a Visitor visa case. Only `check_b169` fails without the entry.
4. **Other readers of the file.** `check_forms_s4_runs.ts` 91/91 on a fresh copy: the guide set is unchanged (one URL shared with
   fs.outside). `fillSample` writes the account before any release (loadSix runs before the checkpoint steps), so the release takes it.
   `check_m3s5_sheet_only.ts` reads only `account_accepts`, which this PR does not change. Not re-run.
5. **The new rule.** `missingAccounts` is sound for what it covers: a combination of the six whose canada.ca page has a recorded
   account under another key must also have that account under its own key. The fail case is real: it names `fs.spouse` both on a
   clone and on main's file. The explicit fs.spouse assertions also fail on main's data, by API and database.
6. **Scope (P-449, P-452).** The diff is 1 JSON file, 1 test and 1 PNG. Nothing in `engine/`, `api/src/` or `web/src/`.
   `graph.mjs`: G1 0, G4 0 (no page or route here).

## Issues, ranked
1. **Must (Major): the case side shows the raw key "PR_PORTAL" (EXPERIENCE §1 [M] plain words; D10).** As the case officer, on a
   new fs.spouse case (REV-B169-…), both the case page and the IMM 0008 answer sheet (M3-S5, C7.3's screen) read
   **"Filed through PR_PORTAL: set by the combination, not on the case"** at 1440 and 1024. Screenshots:
   `j3-fs-sheet-officer-1440.png` and `j3-fs-case-officer-1440.png` in my scratchpad walk folder. Cause:
   `api/src/case-prepare.ts:664` names only `APR_PORTAL` and prints any other key raw. `web/src/runtime/submission.tsx:34`
   (`PORTAL = { APR_PORTAL: "APR Portal" }`, used at :136 and :230) does the same when a submission is recorded. On main, fs.spouse
   had no account, so no line showed. This PR's data makes the raw key appear on the demo. The words already exist:
   `contracts/forms.ts` `ACCOUNT_WORDS` / `throughAccount` (the Forms tab correctly shows "PR Portal").
   **Fix:** this row may not touch code (P-452), so a small code row must land first or together with this one. It replaces both
   maps with `ACCOUNT_WORDS`/`throughAccount`, and its test reads "Filed through PR Portal" on an fs.spouse case. Then re-approve
   this PR unchanged. It is also evidence for the P-449 exit test: today, a data-only account produces raw words.
2. **minor: the page-date check is looser than its name.** `check_b169_fs_spouse_account.ts:51` passes on any
   `content="<date>"`. Setting `page_modified` to the `dcterms.issued` date 2023-08-04 still passed (mutation run). **Fix:** match
   `name="dcterms.modified"…content="…"`.
3. **minor: the cited page name is not the page's own.** The `why` (and the commit message) says "Apply to sponsor your spouse,
   partner or children". The recorded page's title is "Sponsor your spouse, partner or child: How to apply" (h1 "How to apply").
   **Fix:** use the title.
4. **minor (note):** the usage port 4484 is outside the forms ports (4450–4459) and is shared with `check_open_cases_at_once.ts`.
   run-suites runs them one after another, so they do not clash today. The guides entry changes nothing you can see (Guide 5289
   was already a source on both data sets). Harmless.

## D1–D20 (this row's scope; 1–5)
D1 5 the done-when is met (9/9, 28/28, C7.3 green, fail case on main) · D2 5 the snapshot diff is only the portal · D3 5 one shared
guide URL, no duplicate source · D4 N/A · D5 4 reload keeps PR Portal; reset and checkpoint both set it · D6 5 page, quote, date,
read date, recorded copy · D7 N/A (no AI) · D8 5 breadcrumb and Forms tab unchanged · D9 4 · **D10 2 raw "PR_PORTAL" on the case
side (issue 1)** · D11 4 · D12 4 · D13 5 axe 0 on the Forms tab and the sheet; 1440/1024/400 no sideways scroll; keyboard reaches the
account select (33 Tabs) · D14 4 · D15 4 Forms tab 1.2 s, case page 1.8 s, sheet 0.5–1.0 s (unchanged by data) · D16 4 the rule and
its fail case; the date check is loose (issue 2) · D17 simulated only · D18 4 the citation lives in data; the screens say Sample,
not the quote · D19 4 the account now reaches the release and the case · D20 simulated only.

## BIC (EXPERIENCE §6; case side touched only by the account line)
BIC-15 filing channel explicit: **Partly** (the account is named, but as a raw key: issue 1, Must). BIC-20 accessible and
keyboard-complete: **Partly** (axe 0 and no sideways scroll at 1024; plain words fail on that one line). BIC-01–14 and 16–19:
N/A (this row changes no question, document, review or signing flow; the screens are unchanged and C7.3 is green).

## Could not check
A visible (headed) browser: headless Chromium only. 200 % zoom. A real screen reader. An fs.spouse submission record (not
reachable on the checkpoint, B151). An intended user's walk (D17, D20 stay with the founder). Whether the PR Portal is right in
law: "Unconfirmed: expert".

**Journey score: 8.5 / 10** (no criterion at 0; plain words ½ for issue 1). Report: `journey-test-reviewer-2026-11-11.md`.

**Verdict: Request changes**: Major 1 (raw "PR_PORTAL" on the fs.spouse case page and answer sheet). It needs a companion code
fix (`case-prepare.ts:664`, `submission.tsx:34` → `ACCOUNT_WORDS`) merged first or together; this PR's data then stands unchanged.
minors 2–3 to fix in the same push if convenient.
