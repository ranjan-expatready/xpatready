# Review: C7.6 pack records the Paper IMM 5257's pen steps (PR #1334)

Reviewer (did not build it) · 8 Nov 2026 · head `25a4687ae` on base `0b6b41c63` · branch `claude/runtime-c76-pen`
Scope: the acceptance pack only (`prototype/studio/acceptance/C7.6.test.ts`, +25/-3) and two walk screenshots. No app code changed, so this is a test review. Live AI off, US$0. Ports used: 4460, 4461 (gate copies), 4462 (my walk copy, stopped). Never :4400.

## What I ran
| Run | Result |
|---|---|
| `GATE_B_DATA=checkpoint GATE_B_PORT=4460 … gate-b.mjs --title C7.6 --kind code` | exit 0, **27/27** on the checkpoint (144 s) |
| `GATE_B_DATA=six … PORT=4461` (the pack's own fixture) | exit 0, **26/26** fixture only (setup_vv_m3 exit 1, 44/46: its known gaps, as the gate allows; not this PR) |
| Own copy :4462, Demo › Load the configured checkpoint, then the pack with tsx | 27/27; -10b, -10c, -12, -19 PASS lines read (below) |
| `graph.mjs --check` | exit 0 (G1 0 · G2 0 · G3 15 · G4 0 · G5 0 · G6 6; `POST /runtime/items/:id/sign-steps/:key` has tests) |
| `count-any.mjs` | 418 explicit `any` (baseline 433), unchanged |

## The seven questions
1. **Route and actor: yes.** `C7.6.test.ts:101-102` posts `print` then `sign_in_pen` to `POST /runtime/items/:id/sign-steps/:key` (`api/src/sign-steps.ts:231`) as `officer` (= `f.officer`, a case officer who is not a representative, `lib/m3.ts` `firms()`). `print` gets `{ copy: vcopy }`, the id `validateRoundTrip` returns only when the validated copy was read back (201). The server takes only that copy (`sign-steps.ts:141`). Data underneath (copy :4462): two live `sign_step` rows for IMM 5257, `print` (copy `b9868dec…`, which is the `form_instance_id` of the `validated_copy` row) and `sign_in_pen`, both `done_by user-O`. No row by `user-P`. Audit lines "Case officer marked IMM 5257 "Printed"" and ""Signed in pen"" are there.
2. **Nothing is passed, faked or written to SQL.** The diff has no `sql(` call, no `/warnings/…/pass` call and no seeded rows. The only passes in the pack are the ones it had before (-17 `missing_document`; -22's solo case, by design). On the checkpoint, -12's warnings are only `representative_review` and three `missing_document`, with no `missing_signature`. -19's body opens with `passed: [missing_document …]`.
3. **-10b checks the fail side; -10c checks the pass side.** -10b (`:98-100`): item `signature === "PEN"`, plus a warning with `code missing_signature`, `severity critical`, `owes client`, words that name `BC` and match `/in pen/`, plus a client `print` refused 403. The live line: `"CRITICAL: IMM 5257 for Sample Client A must be signed in pen by the person."`, client 403. `owes` comes from `engine/runtime/readiness.ts:152`. The rule is read from a fresh `prepare` (`:96`), after the validate. -10c (`:105-107`): both calls 200 and the Paper line reads `print` and `sign_in_pen` `done === true`. If the rule is removed, a line goes red: with no pen warning, -10b fails; if a client could record, -10b fails (and its print would make the officer's print 409, so -10c fails too); if the pen steps did not clear the signature, -12 fails.
4. **-12 and -19 are unchanged.** The diff touches only lines 30-32 and 87-108. -12 (`:114`) and -19 (`:128`) keep their exact words and conditions, and both PASS on the checkpoint.
5. **The fixture branch is sound, with one weak point (m1). The gate handles 10b and 10c.** `BCC` is the item's channel read after `asPaper` (`:49`). If the switch were refused, BCC stays ONLINE and -6 fails (`readiness.ts`: Online has no Validate block), so nothing passes silently there. `stepsVerdict` (`tools/gate-b.mjs:227-233`) matches `C7.6[- ]10b(?![0-9A-Za-z])`, so `10`, `10b` and `10c` stay distinct, as `6b`, `20a` and `20b` already do. A run with no named steps is judged on exit status and FAIL lines (`:244-246`).
6. **The header is accurate and short, with one word fix (m4).**
7. **Silent failures: none in the PAPER branch.** `call` turns a crash into status 0, which fails each check. `vcopy` null makes `print` return 409, so -10c fails. `pen0` undefined sends the call to `/items/undefined/…` (404), so -10b fails. `pen1` undefined leaves `done` undefined, so -10c fails. The fixture branch is the exception: m1.

## Issues
No Blocker. No Major in this diff.
* **m1 (Should), `C7.6.test.ts:108`.** The fixture branch passes when `pen0` is undefined (`undefined !== "PEN"`), and it never checks the "PDF upload" its words name. Fix: `!!pen0 && pen0.channel === "PDF_UPLOAD" && pen0.signature !== "PEN"`.
* **m2 (Should), `:105-107`.** -10c's words say "Printed from its validated copy", but the check only reads `done === true`. The prepare view's step has no copy id. Fix: read `GET /runtime/items/:id` and assert `sign_steps[print].done.copy === vcopy` (true on my copy, so this only makes the claim tested).
* **m3 (Minor), `:93`.** `as unknown as PenItem`, twice. `Prepare.items` in `lib/m3.ts` already types `signature` and `steps`; it lacks only `record?`. Adding `record?: string` there would remove both casts. Not counted as `any`.
* **m4 (Minor), `:32`.** "it is never passed with a reason here": the solo case's Paper IMM 5257 (`:147`) has its pen signature passed with a reason in -22 (`:156`), by design. Say "Client A's is never passed with a reason here".

## Outside this PR (for the tech lead; not counted in this verdict)
* **The screen shows no pen steps for a Paper line.** `web/src/runtime/sign-steps.tsx:71` renders the step block only for `HAND_SCANNED`. The IMM 5257 Paper line shows "Who signs: Sample Client A · Signed in pen" with no Printed / Signed in pen steps, done or to do. The builder's own `1-imm5257-paper-no-pen-steps-on-screen.png` shows this, and so did my walk at 1440 and 1024 px. A case officer can record these steps only through the API, which is P-33 territory (a step a person cannot do on the product's screen). B132's done-when (`BACKLOG.md:42`) names the server and `paperLine`, not a screen. I recommend a row; this test PR cannot fix it.

## D1-D20 (test-only change: D scores read the pack, not a new screen)
D1 Met: P-380 Q3 and B132 rules exercised, -12/-19 green · D2 Met: one row per step, no client row, repeats 409 · D3 N/A · D4 Met: order enforced (`signed` on a pen item 409 in words) · D5 Met: repeat calls refused, no duplicate · D6 Met: audit lines with actor · D7 N/A (no AI) · D8-D14 N/A (no UI change) · D15 N/A · D16 Met with m1/m2: removing either rule turns a line red · D17, D20 simulated only · D18 Met: Sample and "Unconfirmed: no counsel" kept in header · D19 Partly: the outcome is reached via route, not on screen (above).
BIC-01-20 (`EXPERIENCE.md` §6): N/A for this diff. No case-side UI changed. The screen gap above is the only relevant observation (screenshots 1 and 2 at 1440 px; my 1024 px walk matched).

## Not checked
Keyboard-only and 200% zoom (no UI changed); a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); CI on the PR itself.

Journey test: `journey-test-reviewer-2026-11-08.md`, **7.5/10**. Every criterion below 1 traces to the missing on-screen pen steps (outside this diff), not to the pack.

Verdict: Approve
