# C10.2 The finished story, phase 1 — build notes (runtime lane, PR #1330)

**Row:** C10.2, DEMO.md checkpoint 3 (the M3 gate). Founder, 8 Nov ~09:35 IST: every journey walkable end to end on seeded data. Phase 1 is Visitor visa only. Phase 2 (one seeded case per other combination) is a later row.

## What gets built
* `POST /api/demo/checkpoints/finished-story`. It needs the author duty (anyone else gets 403) and works only in the demo workspace (409 elsewhere). It is a job: it answers 202 at once. When the demo has content, it needs `{"confirm":"RESET"}` (400 otherwise), and one load runs at a time (409). `GET /api/demo/status` gains `checkpoint` ("configured" or "finished_story", read from the load's audit line; Reset removes it) and `story` (running, done with its stages and rows, or failed with its words).
* `api/src/demo.ts` `finishedStory` empties the demo, then loads the configured checkpoint with `ctx.story = "finished"`. Two checkpoint steps run only then:
  * `features/checkpoint/125-thin-case.ts` opens `SAMPLE-VV-THIN-1` on release 1, before release 2 goes out (step 130).
  * `features/checkpoint/200-finished-story.ts` runs `api/src/finished-story.ts`: the family case `SAMPLE-VV-FAMILY-1` taken through the **app's own HTTP routes, as the person who acts**. The case officer moves it to release 2 (C9.5). The client answers for themselves and the minor; the officer answers on another adult's behalf with a reason, and the client re-confirms; the officer confirms each section. The officer ticks the IMM 5257 Online answer sheet "Entered in the portal", fills the PDF copies, and for IMM 5476 does print, signed, then scan upload. Passport pages are requested and uploaded. The representative of record reviews each filing; the officer passes the remaining warnings with a reason and marks Ready to file; the officer records the group submission (BR-11).
  * It writes rows 13–16 and 18, and the stages in `result.story`.
* Values come from `samples/finished-story.json`, all Sample; scans and passports are synthetic one-line PDFs. US$0: no model call.
* Web: Demo › "Load the finished story…" with a tooltip; its dialog (`web/src/components/demo-finished-story.tsx`) shows the RESET field when needed, a running state polled from status, and the result with links to both cases.

## Not built (not findings)
* Phase 2: other combinations, and row 18 (B reuses A's facts).
* Row 13: online auto-fill (W6, parked).
* The Online IMM 5257 reaching Done waits on QA-165 (1).
* IMM 5645's parents and siblings wait on QA-153.
* Release 1's validated read-back is kept on the Mac (QA-285); Validate is never simulated (P-46, P-171).
* The remaining documents (fee receipt, proof of funds, marriage certificate) are not collected; their warnings are passed with a Sample reason.

## Acceptance pack changes (named in the PR question)
Checks 3 and 10 read the status as the author. Check 5 counts the group as recorded. Check 6 reads release 2 as configured, plus PENDING 6b (QA-165) and 6c (QA-285). Check 9 counts batches that are not replays, as C10.1 does. Check 10 loads again with RESET and compares the stages.

## Run
`zsh prototype/studio/tools/isolated.sh <name> <port> start && tsx --tsconfig prototype/studio/api/tsconfig.json prototype/studio/acceptance/C10.2.test.ts <port> xr_studio_<name>` (about 10 minutes: two loads). Walk scripts (Playwright, 1440 px): see the PR.
