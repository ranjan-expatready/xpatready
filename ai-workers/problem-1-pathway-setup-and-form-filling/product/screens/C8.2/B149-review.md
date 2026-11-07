# B149 review: C7.6 review-warning words, C8.2 fee receipt upload (PR #1261)

**Commit reviewed:** `e9f2e6e797ca61bfeb99e5e37d04186d5f8fc5a6` on `claude/screens-b149-receipt`, against base `1e1ca443e`. Independent reviewer (Opus); I did not build it. I used isolated copies only: `rev_b149` on :4447, gate B copies on :4446 for the PR head and for the base. All of them are stopped and dropped. Live AI was off; the cost was US$0. Journey report: `B149-journey-test-reviewer-2026-11-07.md`.

**Overall (skill scale): Ship after fixes.** Part (1) of the row is right: the words now say what happens. The append-only receipt table, the route and its authorisation are sound. Two Majors remain on the upload screen: focus is lost after an upload, and the dialog finds out the page is refused only after the record, which cannot be undone, has been saved.

## What I ran (on this commit)
| Check | Result |
|---|---|
| `tests/check_c76_readiness.ts` | 77/77 |
| `tests/check_c82_record_api.ts` on :4447 | 70/70, exit 0 |
| Gate B `GATE_B_DATA=checkpoint`, PR head | C8.2 **exit 0, 19/19** · C7.6 **exit 1, 15/25** |
| Gate B `GATE_B_DATA=checkpoint`, base `1e1ca443e` (own tree, own Prisma client) | C7.6 **exit 1, 15/25**, with the same red steps (C7.6-3, -4, -5, -6, -10, …) |
| My journeys (Playwright + axe, 400/1024/1440 px and a 200 % zoom stand-in) | see the journey report; axe 0 on every state |
| `tsc --noEmit` web / api | web 0 errors · api 15, none in the changed files |
| `graph.mjs` | no G1/G2 gap. The new route shows `testedBy: []` because `sendFile` paths are not parsed, but the tests do reach it |

## Done when (row B149)
* Fail-first tests for both parts: **met.** `check_c76_readiness.ts:120-121` fails on the old words. The B149 block in `check_c82_record_api.ts`, C8.2-18 and C8.2-19 fail without the route.
* C8.2 pack exits 0 on the checkpoint: **met** (19/19).
* C7.6 pack exits 0 on the checkpoint: **not met, and not caused by this PR.** Base and head are both 15/25. The red steps are missing facts and signatures from the checkpoint's configuration (QA-228; `qa/verdicts/2026-11-04-C7.6-after-861.md` already recorded 16/25). No pack step reads the changed words. **For the tech lead:** the PR body must say this plainly. The row's Done-when needs a ruling ("no new red step", or a fix to the checkpoint first). I do not count this as a finding against this PR.

## Issues (ranked)
**Major 1 (Must): focus is lost after an upload from the filing (WCAG 2.4.3; EXPERIENCE §2.12 [M]).** `web/src/runtime/submission.tsx:154` passes `busy={busy}` to `Button`, and `Button` turns `busy` into `disabled` (`components/ui/controls.tsx:36`). The focused button drops focus, and after the upload `document.activeElement` is `<body>`. I checked this by keyboard (J2), and the breaker found it too (m3). On a long case page, a keyboard user has to start again from the top. The same thing was a Major on C1.3 (`C1.3-employer-link/review.md:25`). C6.4 already solved it (`runtime/checklist.tsx:110-119, 139-141`: `aria-busy` without `disabled`, then focus goes back to the trigger in `finally`). **Fix:** copy that pattern, and add a browser check that focus is on "Upload a new page…" after the upload.

**Major 2 (Must): the dialog saves the record, which cannot be undone, before it learns the page is refused. The reason is then shown only in a 9-second toast whose words contradict each other (EXPERIENCE §2.8 [M] prevent errors, §2.10 [M] error on the field with the fix).**
* The file field (`submission.tsx:203-204`) has no type or size check and no `error`.
* `submission.tsx:176-182` records first, then sends each page. A refused page becomes a red toast (`lib/api.ts:61`, gone after 9 s). It reads: "Submission recorded: these filings are now read-only. … Sample Client X's fee receipt was not stored (Send IRCC's "Transaction Approved" page as a PDF, JPEG or PNG … Nothing was stored.); upload it on the filing."
* So "Nothing was stored" sits inside a message about something that was stored.
* For a file over the limit, the words are also wrong. The route is not in the 413 wording map (`api/src/main.ts:189-192`), so I got "A file is larger than **25 MB** … add files up to 25 MB each", while the limit and the hint are 20 MB. The route's own size check (`api/src/submission.ts:196`) can never run.
* The person can recover, because the filing then reads "No Transaction Approved page uploaded" and offers its button. J3 has the screenshots.
* No test covers the `missed` branch.

**Fix:**
* (a) On choosing a file in the dialog, check its type (its first bytes, as `mediaOf` does, or at least `file.type` against `RECEIPT_ACCEPT`) and its size against `MAX_DOCUMENT_BYTES`. Show the refusal on that field and keep "Record the submission" from sending until it is fixed.
* (b) Add `/record/fee-receipt` (and C8.1's `/signed-scan` if it shares the gap) to the 20 MB branch at `main.ts:189`.
* (c) Word a page that is still refused after recording as its own sentence, for example "Recorded. Sample Client X's Transaction Approved page was not stored: <reason>. Upload it on the filing below." Do not nest it inside "Nothing was stored".
* (d) Add a browser step for the refused-after-record case, and an API step for 20 MB + 1 → its own words.

**Minor 1 (Should): a hint promises something that does not exist.** "The receipt number on that page, if you want it searchable" (`submission.tsx:206`). Nothing searches `fee_receipt` (grep of `api/src`, `engine`, `web/src`). This is the same kind of drift the row fixes. Say "if you want it on the record".

**Minor 2 (Should): the 20 MB limit is typed twice.** The hint hard-codes "up to 20 MB" (`submission.tsx:203`), while `MAX_DOCUMENT_MB` exists in `contracts/documents.ts:33` (STANDARDS §7, no duplicated logic). Use the constant.

**Minor 3 (Should): the dialog's file field is a bare native "Choose File" control.** Its text sits at the top of a 36 px box (my screenshot J1-dialog). Every other upload in the app uses a team `Button` with a hidden input (`checklist.tsx:138`, `forms.tsx:81`). EXPERIENCE §1 says team components.

**Minor 4 (Should): records.**
* `screens/C8.2/build-notes.md` has no B149 entry, so the retrofit mapping is not recorded (skill check 6).
* The refreshed C7.6 and C8.2 screenshots are in the working tree but not in the commit. The committed `C7.6/screenshots/B2-01-not-ready-1440.png` still shows "Nothing reaches IRCC unreviewed".
* A stale test comment at `check_c82_record_api.ts:108` says "(the spouse's line above has none)". That line now sends `SAMPLE-RECEIPT`.

**Minor 5 (Should): one breaker finding I accept as Minor.** m2, the existence oracle: `submission.ts:189-190` looks up the filing before `reach`. The other breaker Minors (m5 integrity in code only, m6 `%22` in names) match C8.1 and C6.4; they are not new here.

Not findings: there is no download or view of the uploaded page (as in C8.1; not in the row). The receipt is per filing, where the board's dialog shows one per group: concept BR-11 says per filing ("the fee receipt"), so the build is right. Assertions: none removed or weakened. The one rewritten B149 assertion now checks the right thing. Other old words: the only hits are in older records (`packs-2026-11-06.md`, qa walk notes).

## Code (check 5)
* **Migration:** additive. One table, with FKs to `runtime_case` and to `filing_record(filing_id)`, so a receipt can only exist on a recorded filing. It has CHECKs on media type and size, and an append-only trigger. It matches `schema.prisma` column for column and follows C8.1's `signed_scan`. The rollback note is correct and in the right order: dropping the table drops its trigger, then the function, then the `_prisma_migrations` row. It says that uploads are lost on rollback.
* **Server:** authorisation is on the server and denies by default (`CaseActorGuard`, then `reach(..., "officer")`). The type is judged by the bytes. Nothing is kept on a refusal (the file is removed when the insert fails). The audit line carries no file name or number. "fee receipt" is in `CASE_ENTITIES`, so the feed stays firm-scoped and fails closed.
* **Reads and races:** the view reads the receipts with one `include` (no N+1). Concurrent uploads append by design. The breaker ran 12 at once: 12 rows, 12 files.
* **Fail-when-removed:** C7.6's exact words, the 409 before recording and the UPDATE refusal each fail when their rule is removed. Nothing tests the 413 words or the dialog's `missed` path (Major 2).

## D1–D20 (this change only)
D1 4 both drifts closed (C7.6 words; upload as the evidence, number optional) · D2 5 FK to the record, CHECKs, append-only trigger, no row on 45 refusals (breaker) · D3 4 one table, reuses `mediaOf`/`cleanName`; the 20 MB limit typed twice (m2) · D4 n/a · D5 3 a page refused after the record is only a 9 s toast; reload keeps the uploads · D6 5 who and when on each upload, earlier ones kept, audit line · D7 n/a (no AI) · D8 4 inside the filing's record · D9 4 empty state offers the upload · D10 3 the 25 MB words, the nested "Nothing was stored", "searchable" · D11 3 partial failure transient (Major 2) · D12 4 team look apart from the native file control · D13 3 axe 0, widths fine, focus lost after upload (Major 1) · D14 4 follows C8.1 and C6.4 · D15 4 upload → listed 1.3 s with refetch · D16 3 fail-first present; 413 and `missed` untested · D17 simulated only · D18 4 receipt shows file, type, size, who, when · D19 4 record → evidence → later upload closes the loop · D20 simulated only.

## Could not check
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Safari and Firefox file pickers. CI on GitHub.

Blockers: none · Majors: 1 (focus lost after upload), 2 (record first, refusal only in a 9 s toast, 25 MB words) · Minors: 1–5 above.

**Verdict: Block** (fix Major 1 and Major 2, then re-review the new commit)
