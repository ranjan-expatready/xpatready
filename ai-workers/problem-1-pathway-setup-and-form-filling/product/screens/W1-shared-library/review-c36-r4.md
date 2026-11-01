# Review round 4: C3.6 "Add the fact this rule needs" (P-158 (5), P-223 (a)), commit 0425ca6e

Reviewer agent (independent; did not build it). PR #329, branch `claude/focused-wright-ydjmqc`, diff `add03ae4..0425ca6e`: `rule-facts.ts`, `proposals.ts` and one new check. Bar: as in round 3.
Isolated copy `rev_c36r4` on :4456 (stopped after); :4400 and the builder's ports not touched; US$0, no live AI. Scripts outside the repo (`/tmp/rev_c36r4/`).
Journey test: `journey-test-reviewer-c36-r4-2026-11-01.md`. **Journey score 9/10 (pass, no 0).**

## Re-run
* `check_forms_c36_rule_facts.ts` on my copy: **42/42**, run twice (`tsx --tsconfig studio/api/tsconfig.json`).
* Typecheck: `tsc -p api/tsconfig.json` shows no error in `rule-facts.ts`, `proposals.ts` or the C3.6 check. The errors it does print are in unrelated older tests.
* Graph: G1–G6 unchanged (the only G3 is the unrelated `GET /attachments/:id/file`).

## Round-3 findings
* **MA3 fixed.**
  * `add()` now refuses a retired, not-merged key with 409, before anything is written.
  * My probe: retired `person.biometrics_required`, then saved a rule reading it (201).
    * The add gave 409: "person.biometrics_required is a retired library field: restore it in Library › Fields, and the rule can read it again."
    * No waiting item was written.
    * After a restore, the add says it is already in the library.
  * Walked in the browser by keyboard: the message shows in the row's alert. axe is clean.
  * The lander's 409 now says "retired" when it is. Probe: an item was waiting for `person.zz_probe`, then a retired field with that key was inserted. The accept said "person.zz_probe is a retired library field: reject this one and restore it in Library › Fields."
  * The builder's new check covers the add.
* **m6 fixed.** A retired `person.criminal_history` ("Criminal History"):
  * still refuses that name for a person (409, naming the restore);
  * lets the sponsor have it: proposed, and landed as `sponsor.criminal_history`.
* **m7 fixed.** One waiting name now holds across both routes, in either order and ignoring case (409 "already waiting … decide it there").
* m3 and m4 are still open by choice, as in round 3.

## Issues
**m8 (Minor, D13): after a refusal on a "Facts a rule needs" row, focus falls to the page body.**
* This is the per-fact form (`FactRow`, `rule-facts.tsx:33-37`). The round-2 m2 focus fix covered only the new-fact form.
* MA3 now ends on this row's refusal, so the gap is more reachable. The message has `role="alert"`, so it is announced.
* Fix: focus the alert after an error, as `#rf-new-err` does.

**n1 (Note):**
* The m7 check in `add()` runs before that route's lock. That lock is per combination and fact, while the new-fact route locks per workspace and name.
* So two exactly simultaneous adds of one name, one from each route, could both wait.
* The twin check at accept still keeps the library clean. Not worth a round.

**n2 (Note, test hygiene):** the MA3 check sets the field back to `DRAFT` whatever its status was before. It passes, but a later check reading that field's status would see a changed row.

## D1–D20 (changes from round 3)
D2 4 (MA3 closed) · D5 4 (no dead end left) · D10 4 (messages true) · D13 4 (m8 is Minor; axe clean) · D16 5 (42 checks, the MA3 case included). Everything else is as in round 3.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder). Mutation tests. CI's own run (left to CI).

**Verdict: Approve** (commit 0425ca6e). No open Blocker or Major. Minor m8 and the two notes are optional; m3 and m4 stay open by choice.
