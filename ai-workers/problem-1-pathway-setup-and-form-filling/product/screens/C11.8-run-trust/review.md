# C11.8 run trust — review of local/c118 at 976e8a6a (base 4ffb5e80)

Reviewer: a fresh agent that did not build this. 1 Nov 2026. Own copy `rev118` on :4466 with the stand-in launcher, no live switch, US$0. Journey test: `journey-test-reviewer-2026-11-01.md` (8.5/10, pass).

**Ship verdict (screen-review): Ship.** No Blocker, no Major. Four Minors, each a Should.

## What I ran
* `tests/check_forms_c118_acceptance.ts` on my copy: **16 pass, 0 fail, 2 skipped** (the stand-in section), as claimed.
* **Rule removal:** I disabled the new door line (`api/src/ai.ts:271`). AT-2 and AT-9b then **fail** (201, "Queued: Draft field map"), so the rule's test catches its removal. Restored afterwards.
* **Browser walk at 1440, 1024, 400 and 720 px (200 % zoom):**
  * Visitor visa › Map 1 form › Draft setup.
  * Live (the default) with the saved answer: "Start 1 step, US$0" is enabled and there is no notice.
  * Draft again in Live: the notice "AI now is switched off" appears and "Start 1 step, up to US$7.27" is disabled.
  * axe finds no violations; nothing scrolls sideways.
  * Keyboard only: ArrowRight moves to Replay, Start becomes enabled, Enter starts the run and lands on `/ai/:id` at US$0.
* **Job page:** opened with `?form=IMM+5257&c=…`. After the decisions, Apply stays on the page (14 form fields left). "Preview the draft" then lands on `/c/…/preview?form=IMM+5257&c=…` with the return strip. #285 m2 holds.
* **Graph:** G1–G6 are 0 for this item; the one G3 entry is an unrelated attachments route. The test is picked up by `run-suites.sh` through its usage line.

## Answers to the lead's questions
* **Can a person path start a paid call with the switch off?** No. `launch()` refuses at the door, and `launchSource` goes through `launch()`. Whatever gets past that, `launchOnce` still refuses before any process starts (`sources.ts:459`). One person path does still *queue* a live step: see m1.
* **Is any free path wrongly refused?** No. In Live, the saved answer and library reuse start (plan `model_calls: 0`). Replay and Stub start. A stub pass and a replay both ran at US$0.
* **Dialog wording, and Live as the default:** Live as the default is acceptable. On a live-off copy, Live still starts saved answers at US$0, and the notice shows only when a model call would be needed. The words need one fix: see m3.
* **Run card error line:** the finder and upload are unchanged, because their `nextOf` branches return first. Field-map failures never render in `RunCard`: `/ai/:id` uses `RunCard` only for find_forms and upload_form (`web/src/pages/ai.tsx:57`). The new field-map error line is therefore API-only; see m4. who-can-be runs pick up the new label wrongly; see m2.
* **job.tsx return from the rail:** works (above).
* **Is the cost_warning change safe?**
  * It pairs `STUDIO_AI_LIVE=approved` with the fixture launcher, as P-192 allows.
  * The queue is held, so no step ever reaches a launcher, and the ledger is a scratch file.
  * It only calls `/ai/plan`, `/ai/batches` and cancel, all for field-map.
  * Nothing can be sent or spent. I did not rerun it, because I was told to launch nothing else.

## Blocker
None.

## Major
None.

## Minor (all Should)
**m1. Retry is a second door that the switch does not guard.**
* Where: `Ai.retry` (`api/src/ai.ts:445`) has no `aiLive()` check.
* Repro, on my copy:
  1. Set a failed step and its batch to `mode='LIVE'` (SQL).
  2. With no switch, send `POST /api/ai/batches/<id>/retry`. It answers **201**: attempt 2 is queued as a LIVE step and then fails.
* Effect: US$0 and no paid attempt counted, but it uses up a run attempt (towards `MAX_ATTEMPTS_PER_SOURCE`). The new next step "Retry the failed step" invites exactly this click. This can happen on any copy that has older live runs once its switch is off.
* Fix: in `retry()`, refuse with the same 409 `AI now is switched off. ${START.liveOff}` when any step to redo is `mode === "LIVE" && kind === "field_map"` and `!aiLive()`. Add the failing case to the test.

**m2. who-can-be runs now read "Retry the failed step", and it retries nothing.**
* Where: `nextOf` (`api/src/runs.ts:93-95`) has no `WHO_OPERATION` branch. Its link is `/c/:id/questionnaires`, the page the card is already on (in the Fill dialog, `questionnaires.tsx:198`).
* The run itself says "Fill it again", and who-can-be has no retry endpoint.
* Repro: any failed who-can-be run → `GET /api/runs/<id>` → `error.next.label` is "Retry the failed step".
* Fix: limit the two new labels to `draft_field_maps`, or give who-can-be its own step ("Fill it again").

**m3. The live-off notice is repetitive and names a choice the panel does not offer.**
* Where: `ai-launch.tsx:76` with `contracts/start-setup.ts:32`.
* It reads "AI now is switched off" / "AI now is switched off on this copy … Use saved AI answers or rules only, both free."
* The title is repeated word for word. "Rules only" is not an option in this panel; the free options are named "Replay saved runs" and "Stub pass".
* Fix: for this panel, keep the title and say "No paid AI call can start on this copy. Choose Replay saved runs (US$0) or Stub pass."

**m4. The field-map "plain error" lives in an API no field-map screen reads.**
* `errorWhat` and `nextOf` feed `RunCard`, but `/ai/:id` for field-map still shows:
  * the count "0 done, 1 failed, 0 cancelled · spent US$0.00" as the run's line (`ai.tsx:79`);
  * each step's raw message, not passed through `plainRunText` (`ai.tsx:87`). With the stand-in launcher this was a Node stack trace with a local path.
* The page's own Retry button and step rows still give a way out, so J2 step 29 is reachable, but AT-3 is proven on the API only.
* Also, `failedStep` is the first FAILED attempt, not the latest (`runs.ts:70`). After a retry, `error.what` gave attempt 1's words while attempt 2 said "The form is in library; it cannot be drafted."
* Fix: on `/ai/:id`, show the run view's `error.what` in place of the count line and run step messages through `plainRunText`; choose the latest attempt for `failedStep`.

## D1–D20 (only what this change touches)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4/5 | P-175 door, plan `live` and the panel notice are met. AT-3 is on the API, not the field-map page (m4). |
| D2 Data integrity | 5/5 | A refused start queues nothing (AT-2, AT-9b). The ledger is unchanged byte for byte (AT-13). |
| D5 Stability and recovery | 4/5 | Retry on a live-off copy queues a doomed live step (m1). |
| D7 AI trust | 5/5 | Cost line, AI/rules marking and the live-off reason are shown before Start. |
| D9 Flow | 4/5 | The way out is clear on field-map. who-can-be's label is wrong (m2). |
| D10 Language | 3/5 | Repeated title, "rules only" (m3), raw step text on `/ai/:id` (m4). |
| D11 Feedback and state | 5/5 | Disabled Start plus a warn notice. The run page updates. |
| D12 / D14 Visual, team look | 5/5 | Shared `Notice`/`Panel`; screenshot 03. |
| D13 Accessibility | 5/5 | axe clean. Keyboard path works. No sideways scroll at 1024, 400 and 720 px (200 %). |
| D15 Speed | 5/5 | Plan and notice under ~1.5 s on the sample. |
| D16 Testability | 5/5 | Adopted test, CI-picked. The removed rule makes it fail. |
| D18 Provenance | 5/5 | The plan says why live is off. |
| D3, D4, D6, D8, D19 | n/a | Not touched by this change. |
| D17, D20 | simulated only | No intended user walked it. |

## Could not check
A real screen reader. A real live run (the J2 L1/L2 live gate needs the founder's Go). The cost_warning rerun (not launched, as instructed). A who-can-be failure in the browser (m2 is from code and the run view's shape).

Local evidence (not committed): `/tmp/rev118w/shots/` (03 live-off panel, 05 at 200 %, 08 failed field-map page, 12 preview with the return strip).

**Verdict: Approve.** No open Blocker or Major. The Minors m1–m4 are for the builder to fix here or log as follow-ups.
