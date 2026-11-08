# C6.9 red on main: held, QA-312 (a pack fault since #1246). 8 Nov 2026, 14:12–14:24 IST

The tech lead, Lead 34, asked for this at about 14:11 IST, ahead of the re-scores.
* Live AI off, US$0.
* One Mac copy at a time on :4470, each stopped in its own command.
* Evidence is in `2026-11-08-c69-regression/`.

## What is red
* **GitHub:**
  * Run **42464045938**, job **128679355266**: nightly `capabilities=C6.9 data=checkpoint`, on main **f18fb0e66**, dispatched by the tech lead at 14:12 IST. Exit 1, 20/21.
  * #1337's batch, run 42460302002, job 128668204613: red twice.
* **The only FAIL:** "C6.9-18 pass (B124, all confirmed): nothing rests on an unconfirmed answer, so the line goes — ["person.criminal_history"]".
* **Mac:** main's code on a fresh checkpoint copy gives 20/21, failing the same step (`mac-C6.9-main.txt`).

## Cause
**`person.criminal_history` is a background answer.** IMM 5257 reads it inside its own Background information block (`engine/runtime/background.ts`).
* Since C6.18 (B140, P-244), an officer's background answer waits for the client to re-confirm it.
* The officer's Confirm section does not confirm it. The probe recorded Background information "confirmed: 0", and the answer reads "waits for the client to re-confirm it before signing" (`mac-C6.9-18-probe-sections.txt`).
* Step -18 has the officer answer and confirm every section, so after P-244 its "all confirmed" state can no longer be reached that way.

**Bisect** (each its own copy, Reset, Load the configured checkpoint, the pack alone):

| Commit | What | C6.9 |
|---|---|---|
| 283f4d151 | the merge before #1246 | **21/21, exit 0** |
| e2a6c59a5 | #1246 (B140, C6.18 officer entry) | **20/21, -18 red** |
| f18fb0e66 | main now | 20/21, -18 red |

#1246 changes nothing under `prisma/`, so both bisect copies ran the same database client. The four merges the tech lead named (#1328, #1331, #1334, #1340) came later and are not the cause.

**The product is right** (`scripts/c69_18_reconfirm.mts`, on main: **2/2, exit 0**):
* As in the pack, the officer answers and confirms every section. Only criminal_history still rests on an unconfirmed answer.
* The client (user-P) re-confirms it: POST …/answers/<id>/reconfirm returns 201, nothing rests, and the result stays Qualifies.

## Records
* `qa/REGRESSION-HELD.md`: a `- C6.9` hold naming both runs and QA-312.
* **QA-312** (Bug · Major, C6.9 pack step -18, owned by the screens lane as B124's pack): the step should have the client re-confirm, as `acceptance/lib/m3.ts` `fillEverything` already does.
* C6.9 row: a held note. The status is not changed here; it is re-scored when the pack step is fixed and green on main on GitHub.

## Not done
* No verdict by a fresh reader on whether the row stays Works while held (P-360 (3)). It goes with the re-score.
* The pack itself was not changed (qa never fixes app or pack code).
