# qa after-merge, batch 1 — 2 Nov evening (main 2ef4f15d → 9c516267)

Mode: after-merge per batch (P-277). Session: qa-batch-2 (scores tonight's batches until about 01:00 UTC). Sonnet subagents for the per-PR head checks (P-278); no live switch, no paid run (P-276).

## Verdict
Batch 1 (#562 S4, #564 C11.3) is sound on main: CI green on the batch (#575: 4 shards plus the final `ci` job), and both rows' own checks pass. No Blocker, Critical or Major. **No row moves to Works:** C11.3 and C11.13 stay Partial, and C6.1 stays Works.

## Rows
| Row | Before | Now (9c516267) | Evidence |
|---|---|---|---|
| C6.1 (S4, SA-1B-90) | Works | **Works** | `check_s4_startable.ts` 10/10: a Not-ready combination is refused with 409 "Not ready for cases" plus the catalogue's missing items; a Live one opens; open cases keep their release |
| C11.3 | Partial | **Partial** | `acceptance/C11.3.test.ts` 26/27: AT-9 loads the six as a person does, and every P-112 trail is there. Red: AT-5, the AI "did you mean" is not built ("The AI meaning check is off") |
| C11.13 | Partial | **Partial** (not "Works, held part excluded") | Held: AI "did you mean" (P-95, P-252). Not held and not met: **P-266** (QA-167). The rest: `check_c1113_draft_fields.ts` 42/42, `_browser.ts` 14/14, `check_forms_c1113_acceptance.ts` 21/21, `check_s6_p149.ts` pass |
| C5.4 | Not built | Not built | Records only: the row now cites P-279 (dates count as published numbers), so `decision-impact.sh` passes with #578's exempt list |

`qa/built/S4.md` and `qa/built/C11.3.md` removed (re-scored).

## Bugs
* **QA-167 (new) · Gap · Minor** (C11.13, G-CORE B2): one author's rename of a field that a released combination uses applies at once (200; the newest label changes), although `POST /change-sets/check` rates it `second_person` (P-266). Minor because released snapshots stay pinned and the change is unbuilt B2 scope, not a regression. Check: `prototype/studio/tests/qa/check_qa_c1113_rename_released.ts` (3/4 today).

## Per-PR head checks (P-277)
* **#565 C11.15 (money path): Pass** on head 9565bcc4 (comment on the PR). 7 suites green, including the C11.15 pack 37/37 and the redo check 23/23 run twice. Redo probes: roles, bad stage, stale plan, live refused while off, double start. Ledger US$0. Not run: the suites that set `STUDIO_AI_LIVE=approved` (CI covers them).
* #569 G1 migration: running. #570 C11.8: not yet approved.

## Could not test
* The shared demo (:4400) read-only walk: there is no demo in this cloud copy.
* Test infrastructure, not the product: two isolated copies running packs at the same moment made `POST /demo/reset` in one pack fail silently, so the next Load sample got 409 "The Structure already has names". The same checks pass when run alone. Packs ignore the reset's status (`acceptance/C11.3.test.ts:114`). *Suggestion (Later, Scaffolding):* packs should stop on a failed reset with its message.

## Questions for the tech lead
1. **C11.3's AI "did you mean" (AT-5)**: the builder calls it "held for X6", but P-265 names only C5.1, C11.13 and C3.6 as held. Does C11.3 count as "Works, held part excluded" too? If yes, it moves to Works at once (26/27 with only AT-5 red). qa's recommendation: yes, it is the same held P-252 co-pilot, but the founder's P-265 wording should name it.
2. **C11.13**: it reaches "Works, held part excluded" only after G-CORE B2 lands the guarded rename (QA-167). Should P-266 go into B2's "Done when"?
