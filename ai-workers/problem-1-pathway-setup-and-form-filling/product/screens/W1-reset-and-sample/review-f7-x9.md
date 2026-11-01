# Review: runtime F7 (X9a, X9b) at 446a4d82

Independent reviewer, 31 Oct, fresh context. Scope: `git diff origin/claude/reverent-mahavira-cef858..HEAD` (c4a7f412 + 446a4d82, 8 files). PR #113 (ebb18ce5) is approved already and was not re-reviewed.
Copies: isolated, prefix `rv_`, ports 4431–4439. The :4400 demo was not touched. Cost: US$0. No `*_LIVE=approved` was set by hand. The only launcher setting was `STUDIO_FAKE_LAUNCHER` alone, from the m7 suite's own usage line.
Journey report: `journey-test-reviewer-2026-10-31-f7.md` (score 9/10).

## Verdict: Ship after fixes (**Verdict: Approve**, commit 446a4d821ed313707a9d75f2917a84749ca0dd1f). No open Blocker or Major. The Minors below are Should-fix follow-ups.

## Suites run on this head
| Suite | Result |
|---|---|
| check_c10_1_configured | 25/0 |
| check_c3_11_signed_scan | 32/0 |
| check_x9b_ai_now_refused | 6/0 |
| check_c10_1_browser | 12/0 |
| check_c3_11_browser | 21/0 |
| check_forms_demo | 23/0 |
| check_forms_channels | 105/0 |
| check_s5_leadcheck | 49/0 |
| check_preview_sets | 29/0 |
| check_engine | 41/41 |

* **Not run here:** a full `run-suites.sh`. The diff touches `demo.ts`, so `select-suites.mjs` selects ALL. I rely on the builder's 106-pass run for the rest. `check_qa91_*` fails on Linux because of `ps -E`; that is fixed elsewhere (4e373f4c).
* **Mutations** (both restored with `git checkout`):
  * Old `engine/sources.ts`: C3.11 drops to 30/32. Both X9b m6 checks fail, for example "not set × each_applicant × PRINCIPAL: tab [principal] vs case [child, principal, spouse]".
  * `LIVE_APPROVED … || usesFakeLauncher()`: x9b drops to 4/6. The two plan checks fail. See issue m1 for the two that still pass.

## Point 1: X9a held-file approval. Honest, and inside DEMO.md
* **Same services as the screens.** `demo.ts:48-59` calls `Intake.intake`, then `recordPage` (author), then `decideHeld` (Approver), all through the real gates:
  * the uploader cannot approve;
  * the page must be recorded first;
  * the page compared must be the page recorded;
  * the claim and the approved list change in one transaction.
* **Not a faked approval** in DEMO.md's sense. It is a second simulated person on the product's own path, as `forms-demo.ts:56-66` already does.
* **The copy really is off the list.** It is the official bytes plus one comment line, so it has its own checksum (72975baa…). The fail-guard checks this against `manifest.json`.
* **The IRCC page is the form's real canada.ca page** (manifest `page-imm5476.html`).
* **Data after loading:**
  * 1 `approved_source` row (uploaded by user-A, approved by user-B).
  * 2 `intake_item` rows: DONE/held, then HELD/older_edition_held.
  * 0 `form_edition` rows for 11-2021.
  * 3 audit lines: recorded by the author, approved by the Approver, kept aside.
* **Drafting guard's approved folder:** `recordApproval` writes `var/isolated-*/workspaces/demo/approved-sources/<sha>.{pdf,approval.json}`. That is per copy, and Reset removes it (checked).
* **Other suites:** `forms_demo`, `c10_1_browser` and `forms_channels` are unaffected. Only `check_c10_1_configured` loads "configured".
* **To review side effect:** see issue m2.

## Point 2: K1. Verified
* 72deaf61 (#118 Minor 2) is an ancestor of the base and changed `studio.ts` so the example is a caption.
* Row 10 on my run reads `(for example "If you do not have an email address, provide either your…")`.
* The fail-guard proves that raw-path, caption-less undecided fields exist in the load, so the caption is chosen and not luck.

## Point 3: m6. One rule, and the right one
* **One rule.** `formSigners` (`render.ts:100-112`) lists who a form is about by `subjectsFor(people, f.who)`. That is exactly how render's own form rows list them (`render.ts:157`): the condition decides whether a form applies, never who it is about.
* **Consistent with the form rows.** Document requirements do narrow by subject kind, but a signed scan belongs to a form line, so following the form rows is the consistent choice.
* **Render side:** the behaviour is the same as before (the same signer map, `none` gives nobody).
* **Documents tab:** changes only when a form's condition has subjectKind PRINCIPAL, SPOUSE, DEPENDENT or CASE.
* **Sample data:** no sample form is PDF upload + HAND_SCANNED (the PDF-upload default signature is NONE, `contracts/forms.ts:26`), so nothing visible changes.
* **Reason wording:** principal_for_family on a principal-only form no longer says "(for the family members it is about)". That is more accurate, and it now matches the case side. parent_for_minor now says it when the principal signs a child's form, which was the old disagreement. Acceptable.

## Point 4: m7. Proves the server for the plan route; the usage line works
* **What it proves.** It starts a real fake-launcher-only server, then:
  * refuses to run unless the fake launcher is on and every `*_LIVE` is off;
  * checks that the database matches the server;
  * asserts the live plan gets 409 "AI now is not approved yet" and that the rules plan says `live.approved: false`.
* **Usage line under `run-suites.sh`.** I replayed its parser with `PREFIX=runtime`:
  * name `runtime_runtime_m7`, port 18434;
  * env `STUDIO_FAKE_LAUNCHER=…` is passed through;
  * args become `18434 xr_studio_runtime_runtime_m7`;
  * the suite's `VAR` (`isolated-runtime_runtime_m7`) equals isolated.sh's VARDIR.
* **Process environment.** `/proc` works on Linux. `ps -E` works on the macOS CI runner. `psql` and `lsof` are used as in the other suites.
* **Port.** 4434 is shared with `runtime_qa91b`. That is harmless because run-suites starts and stops copies one at a time.

## Issues
| # | Sev | Where | Failure scenario | Fix |
|---|---|---|---|---|
| m1 | Minor (Should) | `tests/check_x9b_ai_now_refused.ts:314-316` | The start check sends the **rules** plan's sha. With `LIVE_APPROVED` widened, `POST …/people/propose {mode:"live"}` still returns 409, but titled "Look at the plan again" (sha mismatch). So "starting AI now is refused too" and "nothing was launched" pass under the mutation and prove nothing about the start route. | Assert `run.body.title === "AI now is not approved yet"`. Better: send the sha a live plan would carry, so a widened gate really launches the fake and the launch-log guard bites. |
| m2 | Minor (Should) | `api/src/demo.ts:57` row 1 words; To review | After the checkpoint, To review › All lists "New edition IMM 5476 (11-2021) … Waiting for others · The configuration author reviews it". The "configured" demo therefore carries one open to-do that row 1 does not mention (row 1 says only "kept it aside … not used"). The demo also shows the Approver approving a 2021 copy against a canada.ca page that offers 11-2025: a careful approver would set it aside. X9a names this file, so this is recorded, not re-scoped. | Row 1 says the older copy waits on To review for the author to set aside. Or the loader has the author set it aside with a reason through the same `decideHeld(…, "reject")` path, so To review is clean. |
| m3 | Minor (Should) | `product/screens/W1-reset-and-sample/screenshots/c10-1-02-configured-result-{1440,1024}.png` (last committed 31a87498, 30 Oct) | The committed screenshots still show row 1 as "Partly … nothing for a second person to approve". `check_c10_1_browser` re-shoots them, but the new ones were not committed (D16: screenshots for every screen). | Commit the re-shot pair from a passing `check_c10_1_browser` run on this head. |
| n1 | Note | `demo.ts:56`, `intake.ts:139-178` | `decideHeld` approve ignores `note`, so "Sample: compared with the IRCC page" is stored nowhere. The Sample label lives only in the PDF's comment line. The forms demo does the same. | Drop the dead note, or leave it. No action required. |

## D1–D20
Not scored one by one: this is a lane feature with no single concept.md (as in the #113 reviews).
* **D1, D2, D16** are evidenced above.
* **D10:** row words are plain.
* **D13:** axe 0, no sideways scroll at 400, 1024 and 1440 px, keyboard path (journey report).
* **D17 and D20:** simulated only.

## What I could not check
* A real screen reader. An intended user's unaided walk.
* A full `run-suites.sh` on 446a4d82.
* Visible-browser walking: I used headless Chrome through Playwright.
* Whether a later row-17 build (the official 2021 upload) interacts with the approved 2021 copy. Row 17 is "not built yet".
* `graph.mjs`: G1/G2/G4/G5/G6 are 0. The two G3 routes (`POST /combinations/:id/attachments`, `GET /attachments/:id/file`) are not touched here.
* The builder's working tree has about 460 modified evidence/screenshot files from suite runs. They are outside the diff. My reruns also re-shot some of them. None are committed.

**Verdict: Approve** (commit 446a4d821ed313707a9d75f2917a84749ca0dd1f). Should-fix follow-ups: m1, m2, m3.
