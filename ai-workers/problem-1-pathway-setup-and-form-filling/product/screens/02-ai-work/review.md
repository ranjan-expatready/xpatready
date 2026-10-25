# Screen 02 — AI work and reviews · independent review (CHECK, slices 2 and 3, 25 Oct)

Reviewer: a fresh session that did not build this. Branch `claude/screens-01-fix-c3010a` @ **ea493c1**, isolated copy `screens_rev` on :4446 (db `xr_studio_screens_rev`). The server was started before the builder's FIX edits (HEAD moved to d3a65af during the review; `tsx` without watch), so every result below is ea493c1 code. AI cost US$0: one saved answer replayed, no live call. Journey report: `journey-test-reviewer-2026-10-25.md` (score **5/10, fail**). Screenshots I took: `/tmp/claude-0/-home-user-xpatready/1f334bc0-32ae-5e0b-9629-22309fa37d0a/scratchpad/j/*.png` (names below).

## Verdict: **Ship after fixes**. Not shippable as it stands: fix the Musts, then run CHECK again (journey ≥ 8)
The back end is careful: status claims against races, one publisher in both release paths, a migration that only adds, axe clean, To review in about 40–60 ms. But the journeys have four dead ends, and the two lists that must agree disagree. Several Needed elements of the concept are missing and not recorded. `check_screen02_slice2.ts` re-ran on my copy: 57/57 pass.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Most BRs have a behaviour and a test. BR-5 is broken (bulk accept of new fields, no Undo), and so is BR-7 (reason bypass, M3). BR-15, option map per channel, "Draft without AI" and kind tabs are missing (M8) |
| D2 Data integrity | 3 | Claims are safe under races (double approve/accept 409; 3 parallel K1 decisions gave one draft row). BR-7 is bypassed through Accept (M3). The breaker found duplicate names in one job (break M1) |
| D3 Reuse | 3 | `keyFor` and same-name refusal work. The closest-field check is skipped on Accept (M3). The impact accept carries maps, but no test proves it carries any (S6) |
| D4 Rule integrity | 2 | Form fields left by an impact accept block release, and no page decides them (M5). The K1 block holds for job drafts |
| D5 Stability and recovery | 2 | A returned field freezes its combination (M2). An in-product-approved new edition is stuck (M7). The checklist apply is not atomic (break M7) |
| D6 Freshness and governance | 4 | There is an audit line on every decision. `released_in`, `labelChecked`, decided by and when are kept |
| D7 AI trust | 3 | Cost US$0 and "no AI" are said. Problems: a replay batch is labelled "Live AI" (06-progress-done.png), new definitions can be bulk-accepted (S1), and the advisory verdict is skipped on Accept |
| D8 Orientation | 4 | Crumbs "To review › …" on each review page. To review is first under Configure with its count |
| D9 Flow | 2 | Dead ends: K1 decisions not linked (M4), the uploader never asked for the IRCC page (M6), a returned field (M2), "Release" offered on a held row (M1) |
| D10 Language | 3 | The model name and run ids show in Draft setup and progress (M9). So do field keys in the advisory check (18-change-C.png), "checksum not on approved source manifest", and raw paths like `IMM_5476[0].Page1[0]…` |
| D11 Feedback and state | 3 | Toasts after each decision. No Undo on accept (S1, S5). A K1 error appears only as a toast, not at the Reason field (15-ff-noreason.png). Focus drops to `<body>` after A |
| D12 Visual quality | 4 | Team tokens and pills; tables aligned (07b-review-A-1024.png, 18-change-C.png) |
| D13 Accessibility | 3 | axe has 0 violations on every page I opened. No sideways scroll at 1024 or 720 px on To review and impact. The impact tabs ignore arrow keys. Focus is lost after A. The breaker saw sideways scroll on proposals at 1024 px |
| D14 Team look | 4 | Panel (P-48) for Draft setup and merge; team components |
| D15 Speed | 4 | `GET /review-queue` 39–62 ms (5 runs, 38 rows). Pages 0.6–1.1 s headless including the bundle |
| D16 Testability | 3 | 57/57 rerun by me. The carry test proves `carried: 0` (S6). The queue-vs-release gate and the BR-7 Accept path have no test, which is why M1 and M3 passed |
| D17 First-use | 2 | Simulated only. I needed the job URL to find K1 and the held page |
| D18 Provenance | 3 | Who and when on every row; reasons shown. The held file gives nothing to compare (break M6). The advisory check names keys |
| D19 E2E closure | 3 | Draft → decide → apply → K1 → submit → approve fields → release works once nothing is returned. New edition → accept → release does not close (M5) |
| D20 Pain solved | 2 | Simulated only. One queue is a real gain. The second person approves 37 new fields one page at a time |

## Must (fix before the Lead's check passes)
1. **To review offers "Release" on a combination the release refuses.** The row says "every change that needs a sign-off is signed. Ready to release", but the Release page holds it back. Pressing "Approve and release" gives 409 "it uses … returned to the author" (24-review-B.png, 25-release-attempt.png). `review-queue.ts:89-94` uses `releaseGates` but not `unapprovedAdds`, so the slice-1 promise "same gate as release" is broken. Fix: one gate function that includes the library check, used by both, with a test.
2. **A returned new shared field freezes its combination.** The proposer's page is read-only (21-returned-A.png). `unapprovedAdds` matches RETURNED for good (`library-changes.ts:56-59`). Same as break B1. Fix: give the proposer a step (correct the name or meaning and re-propose, or withdraw and map the form field to another field or "not a fact"), and test it.
3. **BR-7 is bypassed by "Accept".** A NEW proposal with a library field at 64 % (`person.alternate_telephone_number` vs `person.telephone_number`) is accepted by the A key with no reason. The LibraryChange has `reason` empty and verdict "Could be person.telephone_number" (db row; 11a-new-close-card.png). Only `decideNew` asks for the reason (`sources.ts:545-546` vs `:568`). Fix: refuse ACCEPTED/CHANGED for a NEW item with a candidate ≥ 0.55 without a reason, or send it to the N form. Test it.
4. **K1 decisions cannot be found.** After apply the author lands on Preview. The problem text says "change how it is filed (Overview › Forms)" (12-missing.png), and To review shows nothing to do (13-review-A). The list sits only at the bottom of the applied job page (`job.tsx:90`), reached through a "details" link on Sources. Fix: the problem and a To review row link to the decisions.
5. **Form fields left by a new-edition accept cannot be decided anywhere.** `impact.ts:78` writes them `unresolved` DRAFT. `studio.ts:111,119` then blocks every combination using the form. The only K1 UI needs a job (`screen02.ts:195-201`), and To review lists nothing after accept (empty queue, checked). BR-12's "AI maps only new or reworded ones" is not offered either. Fix: a decision list per edition (`/editions/:id/form-fields` exists), linked from the accept toast and from To review.
6. **The held-file uploader is never asked to record the IRCC page.** The uploader's row is "Waiting… a different person checks the source" with no step (`review-queue.ts:137`, API output checked). The second person's row says "Needs you", but Approve is disabled "Waiting for the uploader" (29-held-C.png). The combination's held list has no link (30-held-list.png). Fix: the uploader's row is "Needs you · Record the IRCC page" until the page is recorded.
7. **A new edition approved in the product can never be reviewed** (`impact.ts:91-92` reads only the manifest). Reproduced through the UI: approve held → "New edition: impact review needed" → the impact page says "Only an approved official file is compared" (33-impact-approvedsource.png). This is the screens lane's file, not the forms guard. Same as break M5.
8. **Needed concept elements are missing and not recorded** ("never deviate silently"). Concept §6b lists option map per channel (BR-11) as Capability · Needed, and there is no UI (no web caller of `option-maps`). Also missing: "Draft without AI" in Draft setup, the view 4 kind tabs, list purpose and overflow (BR-15, Q3; waits on forms F1-P), and the screen-map leftover mapping (noted). Fix: build them, or record each in build-notes with the Lead's acceptance.
9. **BR-16 on the views claimed as built.** Draft setup shows "Guarded route, Claude Opus 5.5" (`ai-launch.tsx:16`) and run id `studio-fieldmap-imm5257e-live-…` (05-draft-setup.png). Progress (06-progress-done.png) and proposals do the same, along with "Library revision f5328d656c". Fix: plain words on the main path, ids under Details.

## Should
1. BR-5: "Accept clean new definitions (22)" bulk-accepts new fields (`job.tsx:75`), and the bulk toasts have no Undo (checked: 0 undo buttons). Bulk only for exact reuse or same element id, with Undo.
2. "Needs a decision" counts only Ambiguous and Conflict (`job.tsx:72`). A NEW item that needs a reason (close match) is hidden there, so the footer says "1 still to decide" while the view is empty.
3. Draft setup: the scaffolding modes (Replay, Stub) are top-level radios, not inside "Prototype options" (§6b), and a replay batch is titled "Live AI".
4. To review is readable by a client (`user-P` → 200 with configuration rows). The new GETs (`/library/changes`, `/jobs/:id/form-fields`, `/intake/held/:id/impact`, `/library/merges/:id`) take no actor. This is the app's existing read pattern, but STANDARDS §6 [M] says deny by default.
5. No Undo after accepting a new edition (view 7 state "toast with Undo"). The re-fetch after accept logs a 409 in the console.
6. The carry test proves `carried: 0` (empty library), so removing the carry code would not fail it (STANDARDS §7 [M]). Add a case with a mapped earlier edition.
7. The carried warning counts raw PUBLISHED rows, not effective ones (`studio.ts:119`): IMM 1295 shows 16 after one was decided, while the edition list shows 15.
8. Accessibility: the impact tabs (`review-items.tsx:193`) have no arrow keys and no labelled tabpanel. After A, focus goes to `<body>`. After N, focus stays on the card. K1 errors are not on the field.
9. 37 new fields are approved one page at a time (each page → Approve → back to the list). Offer approving the next one in place, at least, without bulk-approving meanings.

## Breaker report
Not repeated here, except where I reproduced it (M2 = B1, M7 = M5). Break M1, M2, M4, M6, M7 and M8 stand as the breaker wrote them; I did not re-test them.

## Graph (P-86)
`graph.mjs`: G1 0 · G2 0 · G4 0. No G3 or G5 entry belongs to Screen 02. Every page and route of this screen is reached by a test.

## Retrofit mapping
Recorded in build-notes (team-named records: `DraftingJob`, `NormalizationItem`, `PortalCapture`, `FieldMerge`, `IntakeItem`; new `LibraryChange`, `ApprovedSource`). The migration only adds and has its rollback written.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20). Live AI, budget-limit and AI-unavailable states with a real model (plan refusals only read in code, `ai.ts:173-174`). Carrying maps for an edition that had real maps (no such sample pair). A visible (headed) browser: walks were headless Chrome, driven by clicks and keys only. The SME sign and 36 of 37 field approvals were done through the API to save time (the UI path was shown once).
