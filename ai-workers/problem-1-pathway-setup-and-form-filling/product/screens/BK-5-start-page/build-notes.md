# BK-5 PR 1 build notes (screens lane, 11 Nov 2026)

Concept: `concept.md` rev 2, approved (P-484); rulings: E1 is a named change on Visitor visa (P-484 (1)); door 2 is two calls (P-484 (2)).

## Files changed (all product code in `web/src/`)
* `web/src/pages/start.tsx` (new): the page, the three door cards, the confirm dialog.
* `web/src/App.tsx`: route `/start`, tab title, Demo menu item "Starting points…" first.
* `web/src/components/where.ts`: "Demo › Starting points", Back to Immigration programs.
* `tests/check_bk5_start_browser.cjs` (new): a pass and a fail per BR-1…BR-7, gate A per door.

## Calls (existing routes only; no API, schema or engine change)
| Door | Calls | RESET typed |
|---|---|---|
| 1 Nothing set up | `POST /demo/reset` | only when programs exist |
| 2 Pathways released, ready to walk | `POST /demo/reset`, then `POST /demo/load {sample:"configured"}` | only when programs exist |
| 3 The finished story | `POST /demo/checkpoints/finished-story` (job; progress from `/demo/status`) | only when programs exist |

## Deviations from the concept, with reasons
1. **Door 2 always empties first** (§7 says "reset when programs exist"). BR-1 says every starting point empties first and the done notice says whether the kept files are byte-identical; only the reset's answer carries that check. With no programs the page sends RESET for the person (nothing they made is lost; BR-2).
2. **"Sign in as the Configuration author" switches the simulated person** (no sign-in page until BK-4a). PR 2 makes it a link to `/sign-in`.
3. **Door 1 on an empty demo** shows its Continue as secondary, so the page keeps one filled button (E1's door), per P-473 / BIC-11.
4. **Done notice** is a toast (as the concept says); the toast stack keeps it 4.5 s.

## Build discovery (server, not changed here)
`GET /demo/status` reads the checkpoint line before the story job's state (`api/src/demo.ts` `status()`), so the answer that first says the story is "done" can carry the checkpoint from before the story's last line. The page now reads again once the job stops (fixed in web, seen in this check's run 2). For the Lead: a one-line server fix (read `this.story` first) would close it for every reader.

## Checks
* `check_bk5_start_browser.cjs` 39/39 (run 3; door 2 end to end 111.7 s). Runs 1-2 failures were the check's own waits and the status race above.
* `check_bk3_frame.ts` 130/130; `check_bk3_frame_browser.cjs` 431/431; `check_bk3_links_browser.cjs` 56/56; `check_c10_1_browser.cjs` 12/12; `check_s7_dialogs_browser.cjs` 12/12.
* `graph.mjs --check` exit 0; `count-any.mjs` 418 = base.
* Gate A walk by screens at 1440 (`screenshots/walk/`): Demo › Starting points → Start here (130.7 s) → Immigration programs → Visitor visa → Review and release.

## Known gaps
* Removing the Demo menu's other items: Not built (concept §8, follow-up).
* Server down: the frame's own notice; the page adds "The demo's state could not be read".

AI cost: US$0 (no live AI route; BR-7 checked).
