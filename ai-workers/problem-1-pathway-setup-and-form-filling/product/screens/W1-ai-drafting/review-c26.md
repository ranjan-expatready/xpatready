# Review: C2.6 checklist replay into requirement proposals (F4, P-219)

Reviewer: a fresh agent that did not build it. Branch `claude/forms-c26-checklist`.

**Current: commit 8ec21dfb (re-review of the fixes for the f30a7a7f Block). Verdict: Block.** One new Major is open. The four earlier Majors are fixed, but the M1 fix made checklist proposals disappear from the To review inbox.

I ran isolated copy `rev_c26b` on :4425, with this commit's web build on :4426. No `*_LIVE` variable, no paid call, US$0. Journey report: `journey-test-reviewer-2026-11-01-8ec21dfb.md`.

## Re-review of 8ec21dfb (`git diff f30a7a7f 8ec21dfb`)
Builder suite on my copy: `check_forms_c26_checklist.ts 4425 xr_studio_rev_c26b` gave **34 passed, 0 failed**. I did not re-run `check_s6_p149.ts` (the builder reports 73/73).

| Earlier finding | Status | Evidence |
|---|---|---|
| M1: queue Accept dead end | **Fixed in the queue** | On /review/proposals, all 12 rows show "Decide on its checklist page", and the link opens `/c/<combo>/jobs/<job>`. axe is clean. The API accept answers 409 and nothing changes. Tested with a pass and a fail. |
| M2: duplicates on re-replay | **Fixed** | `linesOnCombination` (checklist.ts:95) takes each lineage's newest non-retired version. A second replay proposed 2 and dropped 11, 10 of them as "already on this combination". Applying it wrote 0 rows and no suffixed lineage copies. Tested with a pass and a fail. |
| M3: skipped lines invisible | **Fixed** | After "Apply to the draft" the page stays put. The "Applied: 10 document requirements added" panel lists both skipped lines with their reasons, plus "Back to the combination" (screenshot 42). axe is clean, with no sideways scroll at 400 px. `detail.applied` is tested. |
| M4: no checksum fail test | **Fixed** | `savedReading(file, { root })`: the same text in another folder still matches, and one changed word (another checksum) gives null. Both are tested. |
| Minor 6, 7, 8 | Fixed | No doubled "when" (job page: "For principal applicant · Only when IRCC…"). The panel says "12 lines". The ai.ts note now points to the Checklists panel below. |
| Minor 5, 9, 10, 11, 12 | Open, to be listed in the PR | As the builder states, unchanged. |

## Issues on 8ec21dfb (ranked)
1. **Major (Must, regression from the M1 fix): waiting checklist proposals vanish from To review.**
   - **Cause:** `review-queue.ts:53` builds the inbox's proposal groups with `step: { notIn: [...ON_ITS_PAGE] }`. Field-map items are shown there through their own `draftingJob` rows, but that list only reads kinds `field_map` and `reuse_map` (review-queue.ts:51). Adding `checklist_draft` to `ON_ITS_PAGE` (proposals.ts:215) therefore removed checklist drafts from the inbox, and nothing replaces them.
   - **Evidence:** with 12 proposals waiting, then again with 2 waiting after a second replay, `/review` as user-C reads "Nothing waits for you · All 0" (screenshot 40). `GET /review-queue` gives `{"needs":0,"waiting":0,"running":0,"all":0}` for user-A and user-C, while `GET /review/proposals` holds the group "LMIA-exempt (employer offer): 2".
   - **Comparison:** on f30a7a7f the same state showed the To review badge "1" (screenshot 22).
   - **Impact:** the combination's next step stays "Draft setup" (`aiProposals` 0), so a reviewer has no way in except the direct URL or the author clicking Replay again.
   - **Fix:** either list waiting `checklist_draft` jobs in the inbox, linking to their checklist page (as field-map jobs are), or exclude only `field_map` at review-queue.ts:53.
   - **Test:** add to `check_forms_c26_checklist.ts` a step asserting that `/review-queue` has an item for the waiting checklist draft with the job link. It must fail on 8ec21dfb.
2. Minor (Should): the queue's 409 names the identity key, for example `"requirement_line:9e25b29f-…:copy of imm 5802 …" is decided on its checklist page…` (proposals.ts:246). That puts an internal id in the words. It is only reachable through the API now, because the page shows the link. Fix: use the item's label.
3. Minor (Should): a replay where every line is already on the combination makes a job with 0 items. The job page then says "The stub pass proves the path only…" (job.tsx:254), which is wrong words for a replay. Fix: refuse with 409 "every line of the saved reading is already on this combination", or word the notice for replays.
4. Minor (nit): apply marks a document type and person as taken (`have.add`, checklist.ts:195) before the person and condition checks. A later line with the same type and person, under a different name, would then read "already on this combination" although nothing was written. This is rare, because `linesOf` already removes same-name repeats.
5. Still open from f30a7a7f, as the builder lists them:
   - the queue source is shown as the inventory path, and the PDF checksum is not compared;
   - applied rows read "Edited by a person" (origin HUMAN);
   - the replay writes with `createMany` instead of `insertProposals`;
   - no browser check covers the Replay button;
   - the apply loop is not one transaction.

## D1–D20 on 8ec21dfb (0–5)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Behaves as claimed. |
| D2 | 4 | No duplicate lines (M2 tests). |
| D3 | 3 | — |
| D4 | 4 | Conditions are checked before writing. |
| D5 | 4 | Double click, parallel replays and re-replay are all safe. |
| D6 | 3 | — |
| D7 | 3 | AI origin is lost after apply. |
| D8 | 4 | — |
| D9 | 2 | The inbox hides waiting work (issue 1). |
| D10 | 4 | — |
| D11 | 3 | Applied panel is good; the inbox shows a false "Nothing waits". |
| D12 | 4 | — |
| D13 | 4 | axe clean; keyboard and 400/1024 px fine; 200 % not checked. |
| D14 | 4 | — |
| D15 | 4 | 581 ms replay to the job page. |
| D16 | 4 | Every claimed rule has a pass and a fail; the inbox is not covered. |
| D17 | — | Simulated only. |
| D18 | 3 | Source shown as the inventory path. |
| D19 | 3 | Closes only if the reviewer finds the queue. |
| D20 | — | Simulated only. |

**Journey score (reviewer) on 8ec21dfb: 8.5/10.** That passes, but issue 1 is open, so the verdict stays Block.

## Earlier round (f30a7a7f, Block)
Four Majors:
1. Queue Accept was a dead end.
2. A re-replay wrote duplicate lines (9 → 19).
3. Skipped lines were shown only as a count.
4. The checksum rule had no fail test.

There were also eight Minors. Journey score 7/10. Details are in git history and in `journey-test-reviewer-2026-11-01-f30a7a7f.md`. The rules that held then still hold: the quote check, the source-file filter, stub runs never replayed, contract parse 12/12, one open replay under 8 parallel calls, live 409, and the conditional apply.

## Could not check
- A visible-browser walk by a person (headless Playwright only).
- A real screen reader.
- 200 % zoom.
- An intended user's unaided walk (D17/D20).
- CI logs.

Screenshots are in `/tmp/revc26/shots` and are not committed.
