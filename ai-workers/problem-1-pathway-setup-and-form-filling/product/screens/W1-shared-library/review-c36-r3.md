# Review round 3: C3.6 "Add the fact this rule needs" (P-158 (5), P-223 (a)), commit add03ae4

Reviewer agent (independent; did not build it). PR #329 (replaces #320), branch `claude/focused-wright-ydjmqc`, diff `e539a616..efcc4501` (add03ae4 only merges origin/main). Bar: `plan-p158.md` §5–§6, `acceptance/C3.6.test.ts`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, P-223 (a).
Isolated copy `rev_c36r3` on :4456 (stopped after); :4400 and the builder's ports not touched; US$0, no live AI. Scripts outside the repo (`/tmp/rev_c36r3/`).
Journey test: `journey-test-reviewer-c36-r3-2026-11-01.md`. **Journey score 8.5/10 (pass, no 0).**

## Re-run and probes
* `check_forms_c36_rule_facts.ts` on my copy: **41/41** (run with `--tsconfig api/tsconfig.json`; without it tsx fails on decorators, as for every API check).
* Graph: G1–G6 unchanged (the only G3 is the unrelated `GET /attachments/:id/file`).
* Probes: curl and Playwright at 1024 px, keyboard only, axe. They covered:
  * a draft rule reading a retired field;
  * an edit at accept to a live field's name;
  * Preview and release of a draft that reads an unknown fact.

## Round-2 findings
* **MA1 fixed.**
  * The Day-0 route stores `work.forRule` plus `keyPreview`. The lander builds the key at accept (`proposals.ts:165`, `keyFor` against every key).
  * Verified: "Résumé gap" and "Resume gap" landed as `person.resume_gap` and `person.resume_gap_2`.
  * Verified: an edit at accept landed as `sponsor.sponsor_earlier_refusal`.
  * A retired field's name gets 409 at proposal, naming the field to restore.
  * An edit at accept to a live field's name gets a clean 409, not a 500.
* **MA2 fixed.** The lock is `rule-fact:${workspaceId}:${normalizeLabel}`, the same scope as the waiting check. The parallel test across two combinations gave 201 and 409, with one waiting item.
* **m1 fixed.** "Name of the visa officer" is proposed directly. "Country of birth abroad" is still flagged as close to "Country Of Birth".
* **m2 fixed.** After a refusal, focus goes to `#rf-new-err`. When a reason is asked for, focus goes to `[data-near-reason]`. axe is clean on that state. `aria-invalid`/`aria-describedby` are still absent; with focus now on the message, that is acceptable.
* **m3, m4 and the document type on a requirement:** unfixed by choice and listed in the PR. Unchanged; they stay Minor.
* **m5 (Where used on retire):** now declared as owed in `qa/built/C3.6.md`. Closed as a finding.

## P-223 (a): does a draft that reads an unknown fact break anything?
* **Saves.** `draftErrors` (`studio.ts:22`) drops only `reads <group.name>, which is not in the library` at the four saves (:496, :626, :649, :685). A malformed key and any other error still refuse (test: `>` on a text field gives 400).
* **Release and submit.** `validate()` still reports the read as an error (`engine/validate.ts:57,82,86,89`). `studio.ts:749,791,844` and `programs.ts:187` block on errors. I confirmed the problem list shows "Condition reads person.zz_unknown, which is not in the library." as an error.
* **Draft Preview.** I saved a rule reading `person.zz_unknown` and opened Preview. It returns 200, and the rule shows `applies: "cannot_tell"`, `missing: ["person.zz_unknown"]`. Nothing crashes. A rule-only question for it is listed under its raw key with type `text`; this is draft-only and acceptable.
* **Runtime of cases.** Only released snapshots run, and those cannot carry the error.
* **Not changed, consistent enough:** the AI checklist apply (`checklist.ts:200`) still skips a conditional requirement whose condition reads an unknown fact. Checks reading one stay a warning, as before.
* **Conclusion:** no other path breaks. The one new reachable effect is MA3 below; its dead end predates P-223.

## Issues
**MA3 (Major, D2/D5/D10; missed in round 2, my error): a rule that reads a retired field is offered "Add the fact this rule needs", and the item can never land.**
* **Steps:**
  1. Retire a field a rule reads (retire allows it; Where used is owed).
  2. Or save a draft rule reading a retired key: `libraryTypes` (`studio.ts:592`) counts retired keys, so the save passes.
  3. `RuleFacts.state` (`rule-facts.ts:109`) counts only DRAFT/PUBLISHED as library, so Questionnaires lists the fact as needed.
  4. `add()` (`rule-facts.ts:137-146`) gives 201.
  5. At accept, the lander (`proposals.ts:164`) sees the key in `taken` and refuses.
* **Verified result:**
  * `person.criminal_history` was retired, then the rule R-02 was saved; the add gave 201.
  * The second person's accept gave 409: "person.criminal_history is already in the library (added since it was proposed): reject this one…".
  * That message is untrue (the field was retired before, not added since), and the item can never land. It is the round-2 MA1 dead end, now on the round-1 route.
* **Fix (small, same pattern as MA1):**
  * In `add()`, before writing, refuse a fact key that is a retired, non-merged field with 409: "`<key>` is a retired library field: restore it in Library › Fields; the rule can then read it."
  * Optionally mark it so in `list()`.
  * Make the lander's 409 at :164 say "retired" when the key is retired.
  * Add a pass/fail check: retire, add, then a 409 that names the restore.

**m6 (Minor):**
* The retired-name refusal (`rule-facts.ts:190-192`) matches across all groups. The database reserves a name per group (`canonical_field_name_unique` on workspace, group_key, name_key).
* So "Biometrics required" about the sponsor is refused when only a `person.` field of that name is retired.
* **Fix:** also match `groupKey === b.subject`.

**m7 (Minor):**
* The Day-0 waiting check works across the whole workspace by identity. The round-1 route checks only per combination and fact key (`rule-facts.ts:151`).
* So a waiting Day-0 "Refused a visa before" does not stop a round-1 add with the same name. The twin check at accept still keeps the library clean.
* **Fix:** also check the waiting identity in `add()`.

Still open, by choice (from round 2): m3 (a long, ungrouped rule select), m4 (request schemas outside `contracts/`).

## D1–D20 (this item)
D1 4: §5 reachable; Where used owed and declared · D2 3: MA3 · D3 4: keys built at landing; MA1, MA2 closed · D4 4: rules, identity, near, retired name · D5 3: MA3 dead end · D6 4: audit line, US$0, second person · D7 4: Sample, not meaning-checked, rule source · D8 4: on Questionnaires · D9 3: rule select (m3) · D10 3: the MA3 409 text is untrue · D11 4: done line says "key … when accepted as it stands" · D12 4: team look · D13 4: focus fixed, axe clean · D14 4: team controls · D15 5: under a second · D16 4: 41 checks incl. retired name, collision, edit, cross-combination race; none for a rule reading a retired key · D17 simulated only · D18 4: "Needed by Rule …" · D19 4: no SQL on the product path · D20 simulated only.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder). Mutation tests. CI typecheck (left to CI).

**Verdict: Block.** Fix MA3: refuse at add, in words, a fact key that is a retired field (restore it instead); correct the lander's message; add a pass/fail check. m6 and m7 are one-liners, best done in the same pass.
