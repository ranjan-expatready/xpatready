# S4 Form library: drift check before merge

Fresh checker with no lane context, 28 Oct. Branch `origin/forms/2026-10-27-s4-form-library`, head `08eb170` (code head `5825811`), against `origin/main` `8cfc043`. Read-only: no change to the lane branch, no commit, no push, :4400 untouched, US$0.

## Verdict: Merge after fixes

The code does what its Handover says. All five S4 checks pass again in an isolated copy, CI is green on `5825811`, and the D18 fix (an upload records where it came from and the canada.ca page it matched) is in the code and tested. Three things need fixing before the merge:

1. The branch no longer merges cleanly with main. Two app files conflict, and one of the conflicts is a clash over the word Delete versus Remove.
2. Two departures from the founder's P-123 words are written only in the build notes. They have not gone to the Lead or the founder.
3. Load sample does not yet cover all five sample combinations.

None of these is a Must. The code is sound. The work left is syncing with main, recording the two departures as decisions, and one follow-up on Load sample.

## Findings

| # | Severity | What | Evidence | Suggested fix |
|---|---|---|---|---|
| 1 | **Major** | **The branch is 21 commits behind main and does not merge cleanly.** P-124 says the lane syncs main before its check. Its last sync was `6a32505`, so the screens S1/S2 FIX (PR #59) and the Lead's handover note came later. Merging gives three conflicts: `api/src/library-changes.ts`, `api/src/review-queue.ts` and `product/lanes/forms.md`. The merged code has never been run. | `git merge-tree --write-tree origin/main origin/forms/…` → `CONFLICT (content)` in the three files. Merge base `641a0ed`. Main's `01e4f1f` (QA-46) changed `ACTION_WORD.DELETE` to "Remove" and the To review line to "Remove the …". The branch adds `library_form` and `form_accepts` with "Delete" on the same lines (`library-changes.ts:14-15`, `review-queue.ts:152-153`). | The lane syncs main and resolves the conflicts (see #2 for the wording). For `lanes/forms.md`, keep main's 00:30 Lead note above the lane's Handover. Then rerun `run-suites.sh` on the merge commit and get CI green on it before the Lead merges. |
| 2 | **Major** | **Delete or Remove on To review: one word, two meanings, once merged.** P-123 says that in the library a form is Retired, or Deleted only when nothing uses it. On a combination, Remove means the form stays in the library. Main's QA-46 now calls every unused-delete "Remove" on To review. If the merge keeps main's word map unchanged, a library-form delete will read "Remove the library form", which sounds as if the form stays in the library. | `library-forms.tsx:188` "Delete · only when nothing uses it"; P-123 ("Remove (stays in the library) … in the library Retire, and Delete only when nothing uses it"); `screens/W1-structure-programs/build-notes.md:8` (QA-46: "say Remove and never Delete"). | When resolving #1, say "Delete the library form" for a `library_form` delete and keep "Remove" for structure names and fields. Or the Lead picks one word for both and records it. Add a test for the To review line. |
| 3 | **Major** | **Departure from the founder's M1 (P-123) is in the build notes only.** The founder agreed that an upload is read by rules first and that AI with its checker round runs only when the rules cannot read the file. What was built: when the rules cannot read a hand upload, AI is never called. The file waits for a person and can never be approved ("upload the official PDF from canada.ca"). The board's "Upload PDF goes through AI" is therefore not true for unreadable files. The reasoning is sound (the drafting guard admits only canada.ca files or files a second person approved), but the founder has not been told. | `build-notes.md:96` ("Build discovery D8 … it is not built"); `api/src/upload-run.ts:115-116`; P-123 M1 sentence; walkthrough v2 S4 ("Upload PDF goes through AI"). Not in `LEAD.md` or `DECISIONS.md`. | The Lead records D8 against P-123 (annotation) and tells the founder in one line. No code change unless the founder wants AI to read unapproved uploads, which would need a change to the drafting-guard rule. |
| 4 | **Major** | **Load sample does not cover the five sample combinations as P-123 asks** (open point 3). P-123 says Load sample "replays the finder and must pick up every PDF, checklist and guide the sample combinations need". The code adds guides only where rules find a sure match, and what IRCC accepts only where a saved real answer quotes it. A fresh Load sample in an isolated copy added **2 guides (5256, 5269) for 6 combinations**. Only **1 of 7 data forms** has "IRCC accepts" set (IMM 5257); the other 6 show "Not set yet". The founder's slice 3 change (4) ("Load sample fills both") is half met. | `api/src/finder.ts:682-728` (`fillSample`); demo log line "8 canada.ca pages recorded, what IRCC accepts set for 1 from saved finder answers, 2 guides added by rules"; `build-notes.md:33` and `:51` (D9). | The Lead decides. Either approve one logged live finder pass for the other 4 combinations (about US$0.30 each, cost stated first; P-110) so the replay covers all of them, or record each combination's guide page by hand as a Sample fixture. Until then, say on the board that Visitor visa is the only fully replayed combination. Can follow the merge as the next forms item. |
| 5 | Should | **Superseded decisions cited as if live.** P-51 is struck through (superseded by P-103 and P-123), yet new code and notes cite it alone as the basis. P-107 is struck through (P-114, then P-122), yet the new schema cites it for "what IRCC accepts". P-116 does keep "P-51 retention" inside its own text, so the retention rule itself is live. | Added lines: `api/src/form-uses.ts:50, :71`; `api/src/lifecycle.ts:136`; `api/src/upload-run.ts:9`; `prisma/schema.prisma:271` (P-107); `tests/check_forms_s4_finder.ts:253`; `tests/check_forms_s4_library_browser.cjs:135`; `screens/W1-form-library/review.md:22`, `challenge.md:62`, `build-notes.md:7`. (`intake.ts:1`, `main.ts:73/129`, `sources.ts:310/805` and `programs.ts:476` already cited P-51 on main.) | Change the citations to "P-116 (retention)" for keep-not-delete, "P-103/P-123" for the one intake, and "P-122/P-123" for what IRCC accepts. Comments only. |
| 6 | Should | **The second person's retire page does not show Where used.** P-116 says "Where used shows before any action". The lane already lists this as open. | `web/src/pages/review-items.tsx:86-92` (no uses list on a `library_form` change). | Show the form's uses (the same `formUses` call the drawer makes) on the approval page. A pass test and a fail test. |
| 7 | Should | **To review still says "records the IRCC page it came from first" for an upload the rules could not read,** while the upload card says it cannot be approved. The lane already lists this as open. | `api/src/review-queue.ts:134-136`; `review.md:32, :47`. | Use the card's wording on To review and on the held page. |
| 8 | Minor | **Old review screenshots kept.** The branch adds 60 MB, of which 31 MB is `review-shots/` across 7 rounds (v3–v7 alone are 141 files). Only the last round is evidence of the current state. | `git diff --name-only … \| grep review-shots` → v3 29, v4 25, v5 26, v6 28, v7 33 files. | Keep `v7-*` (and `r*` if cited), and drop v3–v6 before the merge, or accept the size knowingly. |
| 9 | Minor | **Replay key uses the last two names** (open point 2). A saved answer replays for a combination with the same last two names, but only if it was also given the identical canada.ca pages and the same prompt. The risk is therefore narrower than the Handover suggests. | `api/src/finder.ts:50-52` (`sameCombination`), `:459` (`same`: the template hash, the input files and the trail's last two names). | Lead recommendation (full trail or the combination id) is cheap: compare the whole trail when the run record has it. A follow-up, not blocking. |
| 10 | Minor | **Concept file:** there is no `concept.md` for S4, only `concept-draft.md` (26 Oct, pre-P-123: lens, three groups, "Approve the held file"). The agreed design is the walkthrough v2 S4 together with P-123 and `challenge.md`. | `ls screens/W1-form-library/` on main. | The Lead writes a short `concept.md` that points to walkthrough v2 S4 and P-123, or marks the draft superseded, so the next reviewer does not score against v1. |

## Checks rerun (isolated copy, ports 4420–4423, US$0)

Copy: `git worktree` of `08eb170` in the scratchpad (8.7 GB free beforehand). `node_modules` cloned and the Prisma client generated for the branch's schema, web built with vite. The tests fix their working folders by name, so the lane's database names were used on the checker's ports. Afterwards the worktree was removed and the databases dropped.

| Check | Port | Result | Handover said |
|---|---|---|---|
| `check_forms_s4_finder.ts` (fake launcher, `canada-alt`) | 4420 | **113 passed, 0 failed** | 113/113 |
| `check_forms_s4_runs.ts` (fake launcher), includes D18 "a hand upload says it was uploaded by a person, with the canada.ca page its file matched" → `{"origin":"UPLOADED","page":".../imm5604.html"}` | 4421 | **76 passed, 0 failed** | 76/76 |
| `check_forms_s4_canada.ts` | none | **49 passed, 0 failed** | 49/49 |
| `check_forms_s4_library_browser.cjs` | 4422 | **51 passed, 0 failed** | 51/51 |
| `check_forms_s4_run_browser.cjs` | 4423 | **20 passed, 0 failed** | 20/20 |

D18 in code: `api/src/intake.ts:352-354` writes `origin: via === "SAMPLE" ? "SAMPLE" : "UPLOADED"` and the matched canada.ca `formPageUrl` and `sourceUrl` from `officialDownload` on the new edition.

## CI on the exact commits

* `5825811`: guard success, changes success, **suites success** (run 40552675085, head SHA `58258111…`). 41 suites, all PASS, including finder 113, runs 76, canada 49, library browser 51, run browser 20, s01 API 135 and studio browser 45/45. The `checks` job (graph, PostgreSQL engine) runs only on pull requests, so it was skipped here; it runs when the Lead opens the merge PR.
* `08eb170`: guard and changes success, suites skipped. That is correct: `git diff --stat 5825811 08eb170` shows only `product/lanes/forms.md` (10+/1−), which is a document, so there is no app code to test.

## Decisions (P-116, P-120–P-127)

* **P-116:** followed. Delete is offered only when nothing uses the form. An approved official file is retired, never deleted. Retire and delete wait for a second person. Retire is refused while a draft or the latest release uses the form, and the refusal lists each use (`form-uses.ts`). The gaps are #6 (Where used on the approval page) and #5 (citation).
* **P-120:** not in S4 scope. Masters are drafted when a form enters the library through S5/S6. "Re-read with AI" reuses the existing field-map dialog.
* **P-121:** the finder runs a draft round and a checker round, with rules on both. Only High is attached automatically and Low waits for a person (`build-notes.md:135`).
* **P-122:** the library records what IRCC accepts (PDF, Online, both), and the combination row picks inside it later. Followed, apart from the stale P-107 comment (#5).
* **P-123:** one list, three filters and a search. The row menu has Replace, Re-read with AI, See where it is used, Retire or Restore, and Delete only when unused. Upload PDF reads with rules first ("Rules read it: … No AI call was made.", `upload-run.ts:115`). A canada.ca download, or an upload identical to it, needs no confirm step. A hand upload needs a second person. A person can set what IRCC accepts by hand, checked by a second person. The departures are #3 and #4.
* **P-124:** stayed off the S2 pages. The shared changes are small and guarded: `programs.ts` addFormLine guard, `controls.tsx` Table `label` and `headClass`, the App top-bar `RunChip`, `index.css` scroll padding. The sync before the check went stale (#1).
* **P-125, P-127:** no menu or structure changes. Used by shows Program › Category › Sub-category trails. The finder has no button on the library page, as the board asks (finding lives on S5).
* **P-126:** nothing to check. No next-item code was found.

## Diff scope

* 356 files. Outside the lane's own screen and app files:
  * `official-sources/ircc/`: 35 canada.ca pages and 3 PDFs (`imm0008_4e`, `imm5782e`, `irm0002e`). Allowed by P-83/P-87. All 3 checksums are in the manifest, and no manifest row was removed.
  * `prototype/p1/inventory/`: 11 text inventories.
  * `prototype/p2/`: the guard accepts an `official-download/v1` record; launch accepts a `combination_trail` known fact; there is a Wave 1 cap constant, finder prompts and schemas, and the `find_forms`/`find_guide` kinds in `contracts/drafting-run.v0.schema.json`.
  * The ledger has 10 lines and 5 used launch tickets, all from the one approved live finder pass at 07:24–07:25 on 27 Oct (US$0.31), plus that pass's 2 live and 2 stub-pass run records. These are evidence, not leftovers from test runs.
* No other lane's screens, rules, skills, Lead files, logs, databases or `dist/` were committed. The only lane-file change is `lanes/forms.md`, below the Lead's note.
* The size is #8.

## The three open points the lane left for the Lead

| Point | What the code does today | Lead's recommendation (LEAD.md, lane note) |
|---|---|---|
| (1) Retire-not-delete for a form used as a source | A combination that reads the form's file as a source blocks **Delete** only (`retireOk: true`, `form-uses.ts`). Retire is allowed. The retired form's file stays where the combination reads it, AI never drafts a retired form, and new attaches are refused (`programs.ts` guard). The reviewer in round 6 judged this to conform to P-116. | Keep it (retire, never delete, for a source). The code already does this, so no change is needed. |
| (2) Replay key | A saved finder answer replays only when the prompt hash, the exact input pages, **and the last two names of the trail** match (`finder.ts:50-52, :459`). | Key it on the full trail, not the last two names. Small follow-up (#9). |
| (3) Load sample guides for all 5 combinations | Rules add guides only where a sure match exists: 2 guides for 6 combinations (Visitor visa, Study permit). IRCC accepts is set for 1 of 7 forms. The rest are left for S5 Start setup or a logged live pass. | Load sample must bring the guides of all 5. Not met (#4). |
