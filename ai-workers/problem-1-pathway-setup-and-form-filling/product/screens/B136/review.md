# C6.14 (B136) review: one document for the whole application, with default providers

**Commit reviewed:** `0b51fe3b9028958c6c421e99219723b915207dc6` (PR #1392, branch `claude/bold-cerf-dstnrw`), diff `origin/main..0b51fe3b9 -- ai-workers/`. While I was reviewing, the branch moved to `08ef01c0d`. That commit changes only the pack's passport query. The working tree also had uncommitted builder edits made after my runs. **This verdict covers 0b51fe3b9 only.**
**Reviewer:** independent, fresh context. Isolated copy `rev614` on :4437, Demo › Load the configured checkpoint (reloaded fresh 3 times). Playwright at `/opt/pw-browsers/chromium`. Live AI off, US$0. Journey test: `journey-test-reviewer-2026-11-09.md` (this folder), **8/10**.
**Round 1 (skill words): Ship after fixes.** Round 2 is at the end.

## Evidence verified, not trusted
* `tests/check_c614_providers.ts`: 18/18. I removed rules one at a time and the matching tests failed each time: BR-4 age check, unknown age read as adult, `couple_once` dropped from `SHARED_WHO`, representative allowed, fallback removed (the file was restored afterwards).
* `acceptance/C6.14.test.ts` **at 0b51fe3b9**: 31/31 on a fresh checkpoint. `tests/walk_c614_1440.ts`: 11/11 (screenshots sent to my scratchpad; the builder's `walk/` was not touched).
* check_engine 44/44 · check_c615_document_sets 34/34 · check_c316_field_scope 40/40 · check_vv_checklist 76/76 · check_prisma_schema 5/5 · check_c64_storage_api 48/48 · check_c65_documents_api 58/58 · check_b83_undo_withdraw 173/173.
* `count-any.mjs --against origin/main`: 418 = 418, so live code gains no explicit `any`. No combination key in the engine (P-425): `providersFor` reads the line's `who` and the type's roles only. Roles are labelled Sample everywhere (AGENTS rule 4). The migration only adds columns (expand), records its rollback and has a reason CHECK.
* Races: two proposals at once gave 201 + 409 with one open change. Two officer saves at once gave 200 + 409. The proposer cannot approve (403, and no Approve button). Withdrawal works for the proposer only, and the roles revert.

## Issues (Must = Blocker/Major, Should = Minor)
**Major 1 (Must): the raw code "SET_PROVIDERS" is the title of the second person's page and appears on the release list.** `api/src/library-changes.ts:35`: `ACTION_WORD` has no `SET_PROVIDERS` (the action is set in `document-providers.ts:22`), so `actionWord` returns the key. `web/src/pages/review-items.tsx:71` and `web/src/pages/release.tsx:19` print it.
* Scenario: the approver opens the change on To review and reads "SET_PROVIDERS who provides a shared document: …". The builder's own `walk/04-second-person-compares.png` shows it, and so does my `b2-approver-compare`.
* This breaks EXPERIENCE §5 [M] (no codes on the main path) and BIC-19.
* Fix: add `SET_PROVIDERS: "Change"`, plus one pack assertion on `action_word`.

**Major 2 (Must): the expert signs off a release line that does not say who provides the document.** `engine/validate.ts:342` builds the "Document type … changed" label from `supplies_facts` and `sets` only. This PR adds `default_provider_roles` to the snapshot (`engine/snapshot.ts:229`).
* Scenario (reproduced): propose `[sponsor, principal]` on Proof of financial support, approve, submit. The sign-off item reads "Proof of financial support: supplies no facts" (needs_sme true). The expert signs a line that does not describe the change. That breaks governance (P-253, BIC-17).
* Fix: add "; who provides it when shared: …" as C6.15 did for sets, and add a pack step on the change summary.

**Major 3 (Must): a provider change can be saved with no audit line while the officer is told it failed.**
* `api/src/case-checklist.ts:208` commits the row. Then `:211` writes the audit outside that transaction, with the reason in jsonb. `contracts/documents.ts:38` strips `INVISIBLE` but not lone surrogates.
* Reproduced: `reason: "Spouse \ud83d only"` gives **500** "Something went wrong". The row moved to version 2 with the reason stored, and **0 audit events**. A retry gets 409.
* This breaks BR-6 ("audited") and STANDARDS §8 validation. (The breaker reports it too.)
* Fix: reject lone surrogates and control characters in the contract (as `contracts/runtime.ts` does), or write the row and the audit in one transaction.

**Minor 1: when nobody matches, the fallback names a minor or a person of unknown age, and the words contradict each other.** `engine/runtime/case-checklist.ts:281` applies no age check to the holder. Pack C6.14-17 expects the 17-year-old spouse as provider.
* The line then reads "…is 17…: nobody under 18 provides a document. Sample Spouse C, the person the item is for, provides it". The dialog pre-ticks a person it will refuse.
* SA-1B-151 r3 says "the filing's first applicant provides" literally. BR-4 says "is not named".
* Fix: put this to the tech lead and founder as a question. Until it is settled, word the line as an explicit exception.

**Minor 2: a line waiting for an answer answers 404 "No such checklist line." where the concept says 409.** Concept BR-6, §5, challenge m4 and the Lead response all say 409 with a test. Neither the 409 nor the test exists (`api/src/case-checklist.ts:144-148` via `line()`). The UI never offers the action on a waiting line.

**Minor 3: after a change is returned, the author is offered "Change who provides it…", but sending always fails with 409 "already waits on To review".** `providers-panel.tsx:49` enables the button for RETURNED, while `document-providers.ts:23,97` counts RETURNED as open. The words are wrong too: the change was returned, not waiting. Fix: keep the button disabled and say "withdraw it first", or leave RETURNED out of `OPEN` for this check.

**Minor 4: the audit and the dropped-provider words show raw keys.** `api/src/case-checklist.ts:210` writes "…to the principal and the spouse_or_partner"; it should use the role labels. At `:114`, "Left out now: …" is followed by the next sentence with no full stop.

**Minor 5: "Use the defaults" is shown only when the rule is `changed`.** `web/src/runtime/checklist.tsx:239`. When every chosen person has been dropped, the stored choice cannot be cleared from the screen, and it comes back if that person qualifies again.

**Minor 6: author panel ergonomics.**
* The reason error appears in a notice under the buttons, not on the field: the textarea has no `aria-invalid` (`providers-panel.tsx:64,71`; EXPERIENCE §1.10, BIC-13). The officer's dialog does put the error on the field.
* After "Up" moves a role to the top, focus stays on a button that is now disabled (`:31`).

**Minor 7: other small gaps.**
* Saving the same providers again is accepted: new version, new audit line, where the library side returns "Nothing changes".
* The library reason only trims (`document-providers.ts:31`), so a reason of zero-width spaces passes.
* `review-items.tsx:415`: C6.15's doc comment now sits above `ProvidersCompare`.
* The concept names `tests/runtime/check_c614_providers.ts`; the file is `tests/check_c614_providers.ts`.

## D1–D20 (1–5)
D1 4: BR-1 to BR-6 built; the BR-4/BR-5 conflict is open (Minor 1) · D2 4: version and advisory lock hold under races, but the save without audit is not handled (Major 3) · D3 5: roles live on the library type, released with it · D4 4: fallback never empty; the minor fallback is unresolved · D5 4: stale 409 then reload and retry works; double click guarded; 500 after commit (Major 3) · D6 3: second person enforced, but the expert's sign-off line misreports the change (Major 2) · D7 N/A (no AI) · D8 4: drawer, To review and case line each say where the rule comes from · D9 4: one next action each; returned dead end (Minor 3) · D10 3: "SET_PROVIDERS" (Major 1), raw keys in the audit · D11 4: sent, waits, chosen-by with time and reason · D12 4: team components, calm · D13 4: axe clean in 7 states, no sideways scroll at 1024/400 px or 200 % zoom, keyboard path works; author field error (Minor 6) · D14 4: same patterns as C6.15/C4.5 · D15 4: drawer section 130 ms; the case page's first view is 1.3–1.6 s (page on main) · D16 4: pass and fail test per rule, mutation-checked; no test for the 409 waiting line or the sign-off words · D17 simulated only · D18 4: each provider carries its rule; Sample labels · D19 4: author to approver to release to case to officer, all on screens (release and case opening by their own routes, as C6.15) · D20 simulated only.

## BIC scorecard (case side: the shared line and the "Change providers" dialog; 1440 `c1/c2/c5`, 1024 `c7`)
| BIC | Score | Evidence |
|---|---|---|
| 01, 02, 05, 06, 07, 09, 10, 12, 15, 16 | N/A | No facts asked, no AI, no roles moved, no filing |
| 03 | Met | A provider's birth date corrected to 16: dropped on read and named (pack 28) |
| 04 | Met | Reason under 3 characters refused at the field, input kept (`c3`) |
| 08 | Met | The shared line names each provider and why; per-provider "Received from" is a named stand-in (BR-7) |
| 11 | Met | One primary "Save providers" (`c2`, `c7`) |
| 13 | Partly | Dialog errors on the field; a surrogate in the reason gets a 500 while the save went through (Major 3) |
| 14 | Met | No new icon-only control; the rule is visible text |
| 17 | Met | The proposer cannot approve (403, no button); the officer's change is separate |
| 18 | Met | Loading, conflict ("changed after you opened it", then reload), read-only for the approver |
| 19 | Met | Case side clean; the config-side heading code is Major 1 |
| 20 | Met | Keyboard: ⋯ menu, arrows to "Change providers…", dialog focus; axe 0; no sideways at 1024/512/400 px |

## Graph (P-86)
`graph.mjs` ran (G1 0 · G2 0 · G3 22 · G4 0 · G5 0 · G6 8). GRAPH.md has no C6.14-specific gap: the two new routes are named by the pack.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Contrast was checked by axe only. The release and case opening steps ran through their own routes, not their screens (other capabilities).

**Round 1 result: Block** (commit 0b51fe3b9). Fix Major 1 (`SET_PROVIDERS` heading), Major 2 (sign-off words for provider roles) and Major 3 (unaudited save on bad reason text), each with a pack step. The Minors can be fixed or listed as a follow-up row.

## Round 2: re-review of `0b51fe3b9..81f399cc963730019de748a174f66987b9945e58` (diff only)
**Verified on a fresh copy `rev614b` (:4437, checkpoint loaded fresh twice):** pack C6.14 **35/35** · walk 11/11 · check_c614_providers 23/23 · check_engine 44 · c615 34 · c316 40 · vv_checklist 76 · prisma_schema 5. All exit 0.
**Round-1 Majors, all closed:**
* Major 1: `library-changes.ts:35` has `SET_PROVIDERS: "Change"`. The H1 reads "Change who provides a shared document: …" (pack C6.14-7, walk step 3).
* Major 2: `validate.ts:344` names the roles on the line the expert signs, and "not set" when they are cleared (engine "break M2", pack 10b).
* Major 3: `UNSTORABLE` refuses lone surrogates and control characters (400) before any write, on both routes (engine "break M1", pack 25b).
**Round-1 Minors, all closed:** waiting line 404 (pack 24b) · editor disabled after a Return (I checked) · audit in words · "Use the defaults" · same people → 409 (26b) · zero-width reason · retired → 409 · field error with `aria-invalid`/`aria-describedby` (axe 0) · wrapping. The fallback-to-a-minor point is kept per SA-1B-151 r3, listed for the tech lead, and no longer pre-ticked.
**Major R2-1 (Must): the explicit-`any` ratchet fails, so CI fails.**
* `node tools/count-any.mjs --against 0b51fe3b9` (and `--against origin/main`): 419 against 418. CI runs it at `.github/workflows/ci.yml:270`.
* New `any`: `engine/validate.ts:344`, `(a.get(key) as any)?.default_provider_roles`; validate.ts went from 23 to 24.
* Scenario: CI's "no any" step goes red, so the PR cannot merge on green (STANDARDS §7 [M]).
* Fix: `(a.get(key) as { default_provider_roles?: string[] } | undefined)`.

**Minor R2-2: Add pulls focus away after a move.** `providers-panel.tsx`: the `[moved, edit]` effect runs on every edit change. Up on Sponsor, then Enter on "Add", leaves focus on "Move Sponsor down". Fix: clear `moved` once it has been focused.
**Minor R2-3: role words copied into `validate.ts:338`.** `providerWords` hard-codes the labels of four role keys. That repeats `roleWords`/`WHO_WORDS`, and custom role labels are not used. Fix: reuse one source.
**Minor R2-4: double full stop.** The drawer's returned note reads "…: Return: check the order.." when the note already ends in a full stop.

**Round 2 result: Block** (commit 81f399cc9): Major R2-1.
## Round 3: re-review of `81f399cc9..9be06cd0d643c053084a9ba0f9aa2419fbcf056b` (diff only)
**R2-1 closed:**
* `engine/validate.ts:344` now casts to `{ default_provider_roles?: string[] } | undefined`.
* `count-any.mjs --against origin/main` and `--against 0b51fe3b9` both give 418 = 418.
* No tsc error in the touched files.

**R2-3 closed:** `providerWords` now uses `roleWords` (gives "principal applicant", "spouse or partner", "child", "sponsor"; a custom role key reads with spaces).

**R2-2 closed:** Add clears `moved`.

**R2-4 closed:** the note's trailing full stops are stripped.

**Rerun here:** check_c614_providers 23/23 (break M2 ×3), check_engine 44/44, check_c615 34/34. The diff touches nothing the pack or walk read beyond those words; the builder's pack 35/35 and walk 11/11 at dcd861aec were not rerun here. No new finding.

**Round 3 result: Approve** (commit 9be06cd0d; carried to 2e3cf9764, a review.md-only commit).

## Round 4: re-review of `2e3cf9764..e3c6772b75ec9b93f468f57719da0d600378c597` (diff only; two Devin findings)
**(1) Withdrawing a returned or waiting provider change is now possible on its page: closed.**
* `review-items.tsx`: the RETURNED branch for `providers` has the "Propose it again" note and Withdraw. A WAITING change shows Withdraw to its proposer.
* `providers-panel.tsx`: "Open the change" links to `/review/change/<id>`, and a returned change says "Withdraw it on its page, then propose again".
* Checked on a fresh copy `rev614c`: walk **13/13**, including steps 10-11, where a returned change is withdrawn by screen and the library is unchanged. Separately I followed the drawer link to a waiting change: Withdraw was offered, the change became WITHDRAWN, and the roles were unchanged. Axe found no violations on that page.

**(2) The merge no longer makes a needed per-person line shared through a requirement that does not apply: closed.**
* `engine/runtime/case-checklist.ts:232`: the shared fields are copied only when `ORDER[drop.need] <= ORDER[keep.need]`.
* `check_c614_providers` 27/27, with 4 new checks covering both orders.
* With the guard removed, the 2 "Devin fail" checks fail (25/27), so the test catches the rule. File restored.

**Also rerun:** check_vv_checklist 76/76 · check_engine 44/44 · count-any 418 = 418 · `tsc -p web` shows no errors in the touched files. The pack was not rerun; the builder reports 35/35 at cf57401d1. The diff changes no API route or pack step. No new finding.

**Verdict: Approve** (commit e3c6772b75ec9b93f468f57719da0d600378c597). No open Blocker or Major. The round-1 fallback point stays with the tech lead (SA-1B-151 r3).
