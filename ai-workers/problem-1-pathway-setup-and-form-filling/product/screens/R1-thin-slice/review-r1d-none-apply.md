# R1d "None apply" for required repeating groups: review (CHECK) · independent reviewer, 25 Oct 2026

Commit `3ba91b6` on `claude/runtime-r1-8f1db8`, diffed against `e619113`. I did not build this. I read the Lead's answer to break M3 (P-71/P-72/P-78), `build-notes-r1d.md` ("None apply") and the diff, then walked it on :4430 with headless Chromium, as Client A at 390 px and as the officer at 1440 and 1024 px. I read the database after each step. Case `REV-NA-…` (`d13809b5`) has a principal and an adult spouse. Screenshots are in `screenshots/review-r1d-none-apply/`. The journey score is in this file.

## Verdict: Ship after fixes. Journey score 8/10 (passes, no criterion at 0)
The rule holds on the server and in readiness:
* One answer per person and group. A group asked for the application ("Your visit") is answered once, for the application.
* "None apply" never stands beside entries. Three concurrent calls (add an entry, client none apply, officer none apply) gave 409, 409 and 200, and the database ended with 1 none apply and 0 entries.
* Changing back is a new version. History is append-only (the trigger, plus a partial unique index on the current answer).
* A stale answer gets 409. Confirm section refuses an answer it has not seen and names `group:<section>`.
* P-72/P-78 hold. The principal's own answer counts. The principal's answer for the adult spouse shows "Answered by the principal" and blocks until Confirm section (03, 05). The officer's own answer waits.
* The blocking list names each group in plain words (04). axe found 0 violations in 3 states, nothing scrolls sideways at 390 or 1024 px, and a save takes about 310 ms.

Two Majors block a ship: the client's part status contradicts the new rule, and keyboard focus is lost after the new buttons.

## Findings
**Major 1. The questionnaire's part status ignores the rule** (EXPERIENCE §2.5 [M] "statuses are calculated", §2.9; D11)
* The section's `missing` list (`engine/runtime/case.ts`, sections map) does not count an empty required group. `partState` (`web/src/runtime/questionnaire.tsx:231-237`) reads only that list.
* So "Previous countries of residence", passed with Save and continue and nothing added, shows **Done**, while IMM 5257 still lists it as blocking. "Education history" with none apply recorded shows **Optional** (07).
* Save and continue on an empty required group passes silently, with no summary. The agent section header has no "missing" pill for the group either.
* Fix: in `caseView`, add `groupLabel(title)` to the section's `missing` while the group is required, has 0 rows and has no `none_apply.value`. Then the summary's warn-don't-block path ("leave them for now and continue") and the "N to answer" status apply. Count a recorded none apply as answered, so the part reads Done.

**Major 2. Focus drops to `<body>` after "None apply" and after "Entries apply after all", in both views** (EXPERIENCE §2.12 [M]; WCAG 2.4.3; D13)
* The pressed button unmounts (`NoneApply`, `questionnaire.tsx` ~425-455). Measured with `document.activeElement`: BODY after Enter on each button, at 390 px as the client and at 1440 px as the officer.
* A keyboard or screen-reader user is sent back to the top of the page. On the agent tab that means passing every section again.
* Fix: after the save, focus the control that replaces the pressed one ("Entries apply after all", or "None apply"/"Add an entry"), using a ref and `requestAnimationFrame`, as `closeEdit` does (`questionnaire.tsx:483`).

**Minor 3. The agent-view buttons have the same accessible name in every group.** A person's tab has three groups, each with "None apply", "Add an entry" and "Entries apply after all", and nothing says which section or person a button belongs to. The Edit buttons do have this context (`aria-label` at `questionnaire.tsx` ~566). Fix: `aria-label="None apply: <title> for <person>"`, and the same for the other two.

**Minor 4. The agent view shows no provenance for none apply** (D18). Other answers show "questionnaire · Client A · time · confirmed by …". None apply shows only the pill (05). Fix: reuse the provenance line, using `none_apply.answered`, `.by` and `.at`.

**Minor 5. The section counts leave out none apply.** The header pill stays at "0 answered · 0 confirmed" (05), while Confirm section's toast and the audit say "1 answer confirmed". Fix: count the group answer in `answered` and `confirmed`, or show "None apply · confirmed" in the pill.

**Minor 6. An "entries apply" answer is confirmed without being shown.**
* When the group has entries, `NoneApply` renders nothing. Yet `seen` and `open` (`questionnaire.tsx:525-526`) still include `none_apply.id`.
* So Confirm section turns an invisible `none_apply=false` row into VERIFIED, and the button turns primary for an item the officer cannot see.
* It has no filing effect, but it breaks "never confirm unseen" in letter. Fix: send and count it only when it is displayed (value true, or 0 rows). Or leave `noneApply=false` rows out of the confirmation on the server.

**Minor 7. Test gaps** (STANDARDS §6 [M] "a rule's test fails when the rule is removed")
* I ran mutations on a scratch copy of the engine suite (`check_case_engine.ts`):

  | Mutation | Result |
  |---|---|
  | none apply's confirmation ignored in readiness | 43/44 (caught) |
  | group never required | 40/44 (caught) |
  | "entries apply" counted as none apply | 43/44 (caught) |
  | the confirming field set to the group's first fact instead of its client fact (`case.ts` `groupOf`) | 44/44 (survives) |

* No suite covers P-78 for a group: the principal saying none apply for the adult spouse, which should be "answered by the principal" and not confirmed. It works (DB rows from `user-P`, channel `questionnaire`, DECLARED, then VERIFIED only by `confirm_section`), but it is untested.
* Fix: add engine cases for a spouse's none apply and for a group whose first fact the officer collects. Add one journey step for the part status (Major 1).

**Minor 8. "Entries apply after all" reads as plain text and is a small target at 390 px** (02). It is a ghost `size="sm"` button, below the 44 px used elsewhere on the client's page. Fix: a secondary or link style, at `h-11` in the questionnaire.

**Minor 9. Wording.** Readiness says "not answered" when the person said "entries apply" but added none (`engine/runtime/forms.ts` group loop). Fix: say "no entries yet".

## Questions for the Lead (not findings, P-26)
* A group counts as "required" when any of its per-entry questions is required (`case.ts` `groupOf`). In the visitor visa every group qualifies, including Education history (post-secondary). That makes "none apply" a step everyone must take. Is that the intended configuration, or should a release say which groups need an answer?
* IMM 5707 for the principal is blocked by the **spouse's** Employment history group (04). This comes from the field map, and the immigration expert should confirm it.

## D1–D20 (this change only)
D1 5: the rule matches the Lead's answer (block, none apply, P-72/P-78) · D2 5: append-only, unique current, race-safe, 409 on stale · D3 4: a new table rather than a canonical field (a plan point for the Lead, per the build notes) · D4 4: hidden groups are skipped; "required" is derived (see Questions) · D5 4: reload and 409 recovery work; one double-click case not tested · D6 4: audit lines without values · D7 n/a: no AI · D8 4: the part shows who it is for · D9 3: Save and continue passes an empty required group (M1) · D10 4: plain words, form fields not boxes; "not answered" for "entries apply" (m9) · D11 3: part status contradicts readiness (M1, m5) · D12 4: the team look; the ghost button reads as text (m8) · D13 3: focus loss (M2) and ambiguous names (m3); axe 0; 390 and 1024 px fine · D14 4: team components · D15 5: ~310 ms per save, one view reload · D16 4: mutations caught, with gaps (m7) · D17 simulated only · D18 3: no provenance in the agent view (m4) · D19 4: client → officer → readiness closes the loop · D20 simulated only.

## Journey test (reviewer role)
Journeys: (1) the client says none apply on their own part, changes it back, then says it again · (2) the client answers for the adult spouse · (3) the client passes an empty group with Save and continue · (4) the officer reads the blocking list · (5) the officer confirms the spouse's answer after the client changed it twice behind the officer's back (refused, then confirmed) · (6) the officer says none apply by keyboard · (7) break: the race, another client (404), an unknown group (404), a non-boolean value (400, by the suite).

| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | All 6 journeys completed; DB rows as expected |
| next step obvious | ½ | Empty part shows "Done"/"Optional" (07) |
| plain words | 1 | "Add an entry, or say that none apply. The forms need one or the other before filing." |
| feedback and state | ½ | Toast is good; part status and pill counts wrong (M1, m5) |
| correct data | 1 | Versions, statuses and actors correct; no contradiction under race |
| error recovery | 1 | Stale confirm refused, then succeeds; changing back works |
| accessibility and screen sizes | ½ | axe 0, no sideways scroll; focus lost (M2), same names (m3) |
| speed | 1 | ~310 ms per save |
| visual quality | 1 | Team look (02, 05) |
| trust and sources | ½ | Agent view lacks who/when for none apply (m4) |

**8/10, pass.** Fixing M1 and M2 raises next step, feedback and accessibility; m4 raises trust.

**Not checked:** a real screen reader; 200 % zoom; an adult's own link (not built); the full suites (not run, to avoid touching the shared database beyond my own case); D17 and D20, which stay with the founder.
