# Row C3 — a person's Paper choice decides "for filing" (Validate on release 2)

PR #1225 · M3 sprint plan row C3 · capabilities C7.6, C9.2, C7.7, C11.6 · founder ruling Q3 (6 Nov): a case officer may
switch one person's IMM 5257 to Paper only with a written accommodation reason; that copy goes through Validate.
**Sample until the immigration expert confirms. Unconfirmed: no counsel.** Base: `main` 9dc77d1ac (after A3 #1198).
Every run below: a fresh isolated copy, Demo › Reset then Demo › Load the configured checkpoint, live AI off, US$0.
`main` runs used a worktree of 9dc77d1ac with the same `node_modules`.

## The cause, as found
* `engine/runtime/prepare.ts` `paperLine`: a Paper line whose release line is Online said "Ask the Lead" and stayed To do,
  even after its validated copy was read back.
* `api/src/fill-case.ts`: a copy made while the person's form was Online is stamped "Copy, not for filing" and `lock`
  refused it, but `validated` accepted it after a switch to Paper (201), so readiness's Validate block cleared on a copy
  that can never be filed. Readiness (`api/src/case-prepare.ts`) also counted such a read-back (review m1).
* Already right on `main`: readiness and Validate follow the person's own channel, so once IMM 5257 is switched to Paper
  the Validate block, the round trip and Out of date work (see the "with the Paper switch" table).

## Row test: `tests/runtime/check_c3_paper_validate.ts`
| | main | branch |
|---|---|---|
| first version (18 lines) | 14/18, exit 1 | 18/18, exit 0 |
| after review m1, m4 (21 lines) | 16/21, exit 1 | **21/21, exit 0** |

`main` fails: the Paper line's "Ask the Lead"; In progress after the read-back; the stamped copy accepted at Validate
(201); the kept read-back of a stamped copy counted (m1); the Validate block cleared by it. (`runs/*check_c3*`)

## Packs as they are (each alone on the checkpoint)
| Pack | main | branch | Steps that change |
|---|---|---|---|
| C7.6 | 15/25 | 15/25 | none |
| C9.2 | 6/11 | 6/11 | none |
| C7.7 | 17/33 | **19/33** | **-20, -23 fail → pass** |
| C11.6 | 9/14 | 9/14 | none |
| C8.1 | 14/14, exit 0 | 14/14, exit 0 | none |

No step goes pass → fail. The packs never switch IMM 5257 off Online on the checkpoint (it is Online on release 2), so
C7.6's and C9.2's Validate steps cannot run there until row C4 moves each pack onto the case's own lines.

## The named steps with the Paper switch (temporary, uncommitted pack copies)
Each copy is the pack with one added call before the steps: `PATCH /runtime/items/:id/channel` → Paper with a reason
(200), for the principal (and C7.6's solo case). Nothing else changed. This is what row C4's pack moves will do.

| Pack + switch | main | branch | Named steps |
|---|---|---|---|
| C7.6 | 19/25 | 19/25 | -6, -6b, -10, -22 pass on both; **-12 fails on both**: blocks `[]` (the Validate part holds) but warnings `missing_facts`, `missing_signature`, `missing_document` remain, other rows' causes (as A3 found) |
| C9.2 | 10/11 | 10/11 | -2, -3, -4, -5 pass on both |
| C7.7 (switches itself) | 17/33 | 19/33 | -20, -23 pass only on the branch; -22 passes on both; -21 expects the spouse on PDF upload (row C4) |

So this row's code moves C7.7-20 and -23 and closes the stamped-copy hole; C7.6's and C9.2's named steps follow from the
switch itself, which `main` already honours. Said plainly so no one counts them as this fix's.

## Journey J-C3 by screens at 1440 px (`tests/runtime/check_c3_jc3_browser.ts`, `walk/`)
**25/25, exit 0**, axe (WCAG 2.2 A/AA) clean on each state, no sideways scroll, no page error. Change channel → Paper
without a reason refused on "Why on paper" (01) → saved with the reason, spouse stays Online (02) → Ready to file names
the missing validated copy (03) → copy generated and its validated copy read back (04) → no Validate block (05) → the
spouse's IMM 5257 reads "Copy, not for filing" (06) → family name changed: Out of date, block back (07). The Paper line's
own steps have no screen yet (row B3): read by route.

## Suites (each on its own fresh copy, by its usage line)
check_vv_prepare_api 40/40 · check_vv_prepare_store_api 35/35 · check_c116_item_channel_forms 16/16 ·
check_c116_channels_browser 54/54 · check_c76_readiness_api 23/23 · check_c76_ready_browser 53/53 ·
check_c81_signing_api 13/13 · check_c92_undo_api 27/27 · check_c1112_prepare_api 30/30; offline check_vv_prepare 32/32,
check_vv_prepare_store 27/27, check_engine 44/44, check_contract_seams 98/98, check_qa76_words 10/10. All exit 0.
`graph.mjs --check` exit 0; explicit `any` 418 = base; `tsc -p api` 15 errors = base (all in tests/).

## Review
`review.md` (Opus, fresh context): Approve on 4fb292a75 with four Minors; m1, m3, m4 fixed in 88c2b064d; m2 handed over
(below). Journey score 8/10 (`journey-test-reviewer-2026-11-07.md`).

**Hand-over m2 (screens):** `web/src/runtime/forms.tsx:133` still offers "Read back the validated copy" on a stamped
latest copy of a Paper line; the server refuses it in words (409, "Make a new copy"), but the button leads nowhere. Fix
row: hide it (or say "Make a new copy first") when `latest.copy_not_for_filing`.
