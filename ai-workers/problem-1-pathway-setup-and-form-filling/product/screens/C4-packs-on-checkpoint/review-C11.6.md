# Review: row C4, pack 3 of 4, C11.6 onto the configured checkpoint (branch `claude/zen-fermi-poiqv8-c116`)

Independent Opus reviewer (P-303), 7 Nov 2026. Commit **abe28c251fd989e51343568f75c8ed19b5ee9564**, base `origin/main` 3470dc992. I did not build it. The only code file is `prototype/studio/acceptance/C11.6.test.ts` (+31/−14). The record is `C11.6.md` with `runs/C11.6-*.txt`. This row has no concept.md, so I checked it against these:
* row C4 (`design/m3-sprint-plan-2026-11-06.md:164-172`) and hand-over H4 (line 261);
* R1/P-380, P-319 and P-330 (7);
* Lead 30's answers on #1225, which are in `README.md` on #1249's branch, including diagnosis (d) on C11.6-8a;
* AGENTS rules 4 and 5.

The sister reviews are `review.md` (C7.6) and `review-C9.2.md`.

**Outcome: Ship (Approve).** There is no Blocker or Major. Three Minors (m1 to m3).

## What I ran myself (own copies, both stopped afterwards; live AI off; US$0)
* **Checkpoint** (`rv_c116` on :4471; Demo › Reset, then Load configured):
  * branch: **14/14, exit 0**. -3 reads `IMM 5257 ONLINE, IMM 5645 PDF_UPLOAD, IMM 5476 PDF_UPLOAD`; -8a says "here PAPER on IMM 5476"; -9 says the spouse keeps ONLINE.
  * `main`'s pack on the same copy: **9/14**, with -3, -5, -8a, -9 and -12 red, as `C11.6.md` records.
* **Fixture** (`rv_c116fx` on :4472):
  * setup: `setup_visitor_visa.ts` 15/15; `setup_vv_m3.ts` 44/46, with only S2w and S7a red, the same as #1249 and #1283.
  * branch: **14/14, exit 0**. -8a says "here ONLINE on IMM 5257", the same pair and the same 422 text as before.
  * `main`'s pack on the same copy: **14/14**. The fixture's behaviour is unchanged.
* **Vacuity mutations.** Three copies of the branch pack, each with one form name forced to `""`, run on both data sets:

  | Name forced empty | Steps that went red | Checkpoint | Fixture |
  |---|---|---|---|
  | `BC` | -3, -7, -8, -8b, -9, -10, -11, -12 | 6/14 | 6/14 |
  | `FAM` | -3, -5 | 12/14 | 12/14 |
  | `HS` | -3, -4, -5, -6, plus -8a on the checkpoint | 9/14 | 10/14 |

  Every step that reads a form goes red when that form's name is missing; none falls back to "every item". -8a stays green with `BC` empty because it does not depend on `BC`: it still finds a real pair that gets a 422.
* **Probe:** a PATCH to `/runtime/items/undefined/channel` answers 404 "No such item.". So -8b (line 47) cannot pass without an item, even though it has no `!!i5257` guard.
* **Accepts records** (`form_edition_accept`):
  * Checkpoint: IMM 5475 and IMM 5476 `ANY {PDF_UPLOAD}` with IRCC's quote; IMM 5406 and IMM 5669 `IRCC_SECURE_ACCOUNT {ONLINE}`. There is no APR Portal record.
  * Fixture: the same IMM 5475 and IMM 5476 records, plus S4a's `IMM 5257 APR_PORTAL {PDF_UPLOAD,PAPER}` (Sample, set by user-C).

## Against the rules
* **Steps (P-330 (7)).** The ids -1 to -12 with -8a and -8b are identical on `main` and on the branch: 14 steps, none dropped or added. -1 and -2 are untouched. The changed steps are:
  * -3, -9, -10, -12: the literal is replaced by the line's value.
  * -6, -7, -8, -11: the same predicates, now behind a guard.
  * -8a: discussed below. It is also stricter now: it checks that the channel is unchanged (line 44), which `main` did not.
* **Lines from C1 (R1).** Lines 21-23 read `expectedFor(c.id)["Sample Client A"]` over `forms` and `waiting`; on release 2, IMM 5476 sits in `waiting`. The kinds `barcode`, `family` and `handSigned` are the helper's own (`lib/m3.ts:198, 207-209, 263-266`).
  * The spouse's line (line 28) comes from the same helper.
  * -12 compares the configured `combination_form` channel with `BCL.channel`, the released line, exactly.
  * The diff touches one file under `prototype/`, so `lib/m3.ts` is unchanged.
* **`pick` (line 26).** It returns `undefined` for an empty name, so `itemsOf(p, P, "")` (`lib/m3.ts:182`) can no longer hand a step every item. Lines 29, 31, 34, 36, 37, 51, 52, 54 and 57 add `!!BCL`, `!!FL`, `!!HL`, `!!HS`, `!!BC` or `!!i5257` guards. The mutations above show they hold.
* **Product gaps (Lead 30).** No warning is passed and no fact is answered. -8b still requires the 400 for "Paper without a reason". -9 uses the founder's Q3 reason, worded "(Sample)", the same as on `main`.
* **Rule 5.** No personal names appear in the diff, `C11.6.md` or the runs.

## -8a: the same rule, deterministic, not vacuous
* **Same rule: yes.** The assertion is still "status 422, the reason matches `/PDF upload|accept/`, and the item's channel is unchanged" (line 44). That is r5c's "outside what IRCC accepts is refused with the reason, nothing changed".
  * The server takes Paper on IMM 5476 through the accepts check before the accommodation-reason check (`engine/runtime/prepare.ts:108-113`). So the pair is refused with IRCC's quote, not with the reason 400. Had the order been reversed, -8a would go red, not pass.
  * The pair -6 already tries (Online on the hand-signed form) is excluded (line 42), so -8a is a second refusal, not a repeat.
* **Deterministic: yes.** The channel order (Online, PDF upload, Paper) and the item order (barcode, hand-signed, family) are fixed literals, and `accepts` comes from the release's records.
  * My runs picked the same pairs as the builder's logs: ONLINE on IMM 5257 on the fixture, PAPER on IMM 5476 on the checkpoint.
* **Never vacuous: yes.** With no outside pair, `!!outside` fails; the `HS`-empty mutation on the checkpoint shows it (-8a went red). Any pair the server would accept also fails the 422.
* **What it no longer covers on the checkpoint (m2).** On release 2 the pair rests on IMM 5476's `ANY` record, the same record -6 is refused on. The account-scoped choice ("for its edition on this account", `engine/channels.ts:54-59` picking an `APR_PORTAL` record) is covered only on the fixture. That follows from release 2's data, since it accepts IMM 5257 Online, Paper and PDF upload. It is not a gap the pack passes over, and adding a Sample record inside the pack would be scaffolding.
* **Where the choice comes from.** The pair is chosen from `/prepare`'s `accepts`, not from the configuration. That is acceptable because the expected outcome is fixed, and on release 2 the chosen pair is pinned independently by -4 (IMM 5476 PDF upload only, VV-R10, `compliance-trace.md:43`).

## -3, -5, -9, -12 against release 2's lines
| Step | What the step checks | What I measured |
|---|---|---|
| -3 | Each of the three items equals its line's channel exactly | ONLINE, PDF_UPLOAD, PDF_UPLOAD = BCL, FL, HL |
| -5 | IMM 5476 is HAND_SCANNED; the family form equals `FL.signature` | TYPED_NAME on both data sets. As before, only the case "the line's signature fits the channel" is exercised; the fallback to the channel's first signature (`prepare.ts:95`) was not covered on `main` either |
| -9 | The principal is on Paper; the spouse is on `spouseBC` from their own line | ONLINE on the checkpoint, PDF_UPLOAD on the fixture, with a `!!spouseBC` guard |
| -12 | The configured line equals the released line after the case change | ONLINE = ONLINE (the target was PAPER, so a leak would show). The SQL string is built only after `/^[A-Z0-9 ]+$/` passes on `BC` (line 56) |

## Issues
1. **m1, Minor (Should): -6 keeps a hard-coded channel (P-319).** Line 34 checks "nothing changed" with `=== "PDF_UPLOAD"`. It should read `HL.channel`, as -8a does with `outside.i.channel`. Its meaning does not change on either data set.
   * Literals in other checks that are acceptable: -4's `"PDF_UPLOAD"` (line 30) is the cited VV-R10 value. -5's `"HAND_SCANNED"` (line 31) is how `handSigned` is defined (`lib/m3.ts:265`).
2. **m2, Minor (Should): the record overstates what -8a covers on the checkpoint.** `C11.6.md` says "The rule is the same". Add that on release 2, -8a uses IMM 5476's form-wide record, the one -6 uses. The account-scoped record is exercised on the fixture only (setup S4a), so a checkpoint 14/14 is not evidence for it. One sentence; no code change.
3. **m3, Minor (Could): -8b has no guard.** -8b (line 47) is the only item step without `!!i5257`. It cannot pass vacuously (the 404 probe above), so add the guard for consistency only.

## D1-D20 (a pack-only change: no screen, route or schema)
* D1 Requirement fit 9: row C4's Done-when is met for C11.6: 14/14 on a fresh checkpoint and on the fixture, step for step, with R1 held.
* D2 Data integrity 9: -9, -10 and -12 hold on the checkpoint; -8a now also checks that nothing changed.
* D4 Rule integrity 8: each step tests the same rule on both data sets. On the checkpoint, -8a does not reach the account-scoped record (m2).
* D16 Testability 9: the mutations show each form-reading step fails without its form.
* D18 Provenance 9: Sample, Q3 and VV-R10 are cited, and the runs are logged.
* D19 Closure 9.
* D3 and D5-D15: not applicable or unchanged. D7: no AI. D17 and D20: simulated only.

## Journey test (reviewer; the one score for this check, scored on the pack's path)
Journeys, all as the case officer unless named:
* J1: on release 2, opens a family case and reads each item's channel, accepts and signature (-1 to -5).
* J2: tries channels IRCC does not accept (-6, -8a).
* J3: a client tries to change a channel (-8).
* J4: sends an unknown channel (-7).
* J5: switches IMM 5257 to Paper, first without a reason and then with one; the spouse's item and the configuration stay as they were (-8b to -10, -12).
* J6: saves from a stale version (-11).
* J7: all of the above on the fixture.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 14/14 on both data sets, run by me |
| Next step obvious | 1 | The 422 says "Choose a way IRCC accepts", with IRCC's line |
| Plain words | 1 | The 400 names the four channels; the Paper 400 asks for the reason |
| Feedback and state | 1 | Each step line names the form and the pair it used |
| Correct data | 1 | Only the principal's item changes; the audit names the form; the configuration is unchanged |
| Error recovery | 1 | 409 Reload; each refusal leaves the channel unchanged |
| Accessibility and screen sizes | ½ | No screen changed; not walked in a browser for this PR |
| Speed | ½ | Not timed against the §9 budgets |
| Visual quality | ½ | No screen changed |
| Trust and sources | 1 | The IRCC quote and URL are in the refusal; the reason is labelled Sample |

**Score 8.5/10, no 0: pass.** What would raise it: a browser walk of the item's channel change at 1024 and 1440 px, and a timed `/prepare` refresh.

## Not checked
* The graph (P-86): `tools/graph.mjs` rewrites `qa/GRAPH.md`, which I may not edit.
* The BIC table (EXPERIENCE §6): no case-side screen changed.
* A real screen reader; an intended user's unaided walk.
* Whether release 2's acceptance of IMM 5257 Online, PDF upload and Paper on the APR Portal is right. That is an immigration value (rule 4), and the pack asserts nothing about it.

**Verdict: Approve** (abe28c251fd989e51343568f75c8ed19b5ee9564). Blockers: none. Majors: none. Minors: m1, m2, m3.

## Round 2 (diff only, 7 Nov)
Diff `abe28c251..dc8a36fcb4b662c1e266f4dd3f226bdd2917de3d`, one commit. The pack changes in two lines (+2/−2) and `C11.6.md` gains two lines. This file is committed byte-identical to what I wrote. No other file under `prototype/studio/` changed, so `lib/m3.ts` is still untouched.
* **m1, fixed.** -6 (line 34) now reads `!!HL && … channel === HL.channel` instead of `"PDF_UPLOAD"`. The value is PDF_UPLOAD on both data sets, so the meaning is unchanged.
* **m2, fixed.** `C11.6.md:27-28` says that on release 2, -8a rests on IMM 5476's form-wide record, the same one -6 uses, and that the account-specific choice is tested on the fixture only.
* **m3, fixed.** -8b (line 47) now needs `!!i5257`.
* **Nothing else moved.** The step ids and labels are unchanged; no step was weakened, dropped or added; no form number or channel was added to a check.
* **Run logs not refreshed.** The `runs/C11.6-*.txt` logs are not in this diff, although the round-2 message says they were refreshed. The logs on the branch are still those of abe28c251. No step label changed, so their text still matches this head, and my runs below cover dc8a36fcb. Not a finding.
* **My runs on this head.** I ran dc8a36fcb's pack against the unchanged `lib/m3.ts` on fresh copies: `rv_c116b` on :4471 and `rv_c116bfx` on :4472, both stopped; live AI off; US$0.
  * checkpoint: **14/14, exit 0**; -8a says "here PAPER on IMM 5476";
  * fixture: setup 15/15 and 44/46 (only S2w and S7a red, as before); the pack gives **14/14, exit 0**; -8a says "here ONLINE on IMM 5257".
* **Journey score:** 8.5/10, unchanged.

**Verdict: Approve (dc8a36fcb4b662c1e266f4dd3f226bdd2917de3d).** Blockers: none. Majors: none. Minors: none open.
