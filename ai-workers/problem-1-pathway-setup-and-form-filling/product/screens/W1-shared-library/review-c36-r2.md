# Review round 2: C3.6 "Add the fact this rule needs" (P-158 (5)), commit e539a616

Reviewer agent (independent; did not build it). Branch `claude/focused-wright-ydjmqc`, diff `origin/main..e539a616`. Bar: `plan-p158.md` §5–§6, the Day-0 test `acceptance/C3.6.test.ts`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`.
Isolated copy `rev_c36r2` on :4456 (stopped after); :4400 not touched; US$0, no live AI.
Journey test: `journey-test-reviewer-c36-r2-2026-11-01.md`. **Journey score 8/10 (pass, no 0).**

## Re-run and probes
* Re-run on my copy: `check_forms_c36_acceptance.ts` 17/17. I took the builder's 32/32 and 16/16 as given.
* Graph: G1–G6 have no gap for `rule-facts` (the only G3 is `GET /attachments/:id/file`, not related).
* Probes, with curl and Playwright, scripts outside the repo:
  * an approver edit at accept
  * a retired key
  * two labels that build one key
  * parallel adds in one combination and across two
  * near-duplicate false positives
  * keyboard only, 400 / 1024 px, axe

## Round-1 findings
* **M1 fixed.** The product now has a path of its own: name an existing rule, propose the fact, the second person accepts, and the field lands DRAFT. The rule can then read it. No SQL in the acceptance checks.
* **M2 fixed within one combination.** Three parallel adds gave 201, 409, 409. Across combinations it is not fixed (MA2 below).
* m1 approver read-only: fixed. m2 "(P-158)" and the doubled rule key: fixed. m3 focus after Propose: fixed. m4 400 px key wrap: fixed.
* m5 schemas outside `contracts/` and m6 "Where used" on retire: still open (m4 and m5 below).

## Issues
**MA1 (Major, correct data / error recovery, D2/D3): the key built from words is frozen as if a rule already read it.**
* What happens: `addForRule` stores its built key in `work.ruleFact` (`api/src/rule-facts.ts:206`). The lander treats any `ruleFact` as fixed: it lands it unchanged or refuses (`api/src/proposals.ts:161-164`). The key is built only against live library keys (`rule-facts.ts:181,189`), while landing checks every key (`taken`, `proposals.ts:150`).
* Verified results:
  * **Retired field's name:** propose "Biometrics required" after `person.biometrics_required` was retired. It gets 201 with key `person.biometrics_required`. Accept then gives 409 "already in the library (added since it was proposed)". That message is untrue and the item can never land.
  * **Two names, one built key:** "Résumé gap" and "Resume gap" have different identities but both give 201 with key `person.resume_gap`. The second can never land.
  * **Approver edit is not honoured:** an edit at accept that changes the name to "Sponsor's earlier refusal" and the subject to sponsor landed as `person.visa_refused_before`, subject PERSON.
* **Fix:** do not put a built key in `work.ruleFact`. Keep that field for the round-1 route, where the rule really reads the key. Use a separate marker for the Day-0 route, for example `work.forRule`. The lander then builds the key with `keyFor(f.subject, f.label, used)` at accept time, from the item as decided. Add tests for a retired name, two labels that build one key, and an edit at accept.

**MA2 (Major, STANDARDS §4 [M] idempotent creates, D2): the lock and the waiting check cover different scopes.**
* What happens: the lock is per combination and label (`rule-facts.ts:193`, `rule-fact:${c.id}:…`), but the waiting check is workspace-wide by `identityKey` (`:194`). `insertProposals` checks only within its batch and against the library (`proposals.ts:92-97`).
* Verified: the same label proposed three times in parallel on wp.family R-07 and on vv.single gave 201 on both and left **two waiting items with one identity**. The accept-time twin check keeps the library clean, but the queue holds a duplicate.
* **Fix:** lock on `rule-fact:${c.workspaceId}:${normalizeLabel(b.label)}`, the same scope as the check. Add a parallel test across two combinations.

**m1 (Minor, near-duplicate false positives):** `nearLabels` (`rule-facts.ts:90-94`) flags any label that contains a one-word library label. "Name of the visa officer" is flagged against "Name", "Home address abroad" against "Address", "Employer email" against "Email". The reason field lets the author through, so this is friction, not a block. **Fix:** do not count a match when the shorter label is a single word, or compare whole-label similarity.

**m2 (Minor, EXPERIENCE 12 keyboard; field errors):**
* After a refusal, focus falls to `<body>` (verified).
* The new "Why it is not the same" field appears without focus.
* Errors are one `role=alert` paragraph, with no `aria-invalid` or `aria-describedby` on the field (`web/src/components/rule-facts.tsx:74,86-92`).
* **Fix:** focus the reason field on "close to", otherwise the alert, and link the error to its field.

**m3 (Minor, D9):**
* The rule select lists 108 options of up to 300 characters, with no grouping by kind (`rule-facts.tsx:85`).
* The option value is the bare `r.key` and the server takes the first match across kinds (`rule-facts.ts:178`), so a form and a rule with the same key are ambiguous.
* **Fix:** group by kind with `<optgroup>` and send `kind:key`.

**m4 (Minor, STANDARDS §5 contract first, carried over from round-1 m5):** `AddRuleFact` and `AddFactForRule` live in `api/src/rule-facts.ts`, and the web repeats them by hand. **Fix:** move both to `studio/contracts/`.

**m5 (Minor, carried over from round-1 m6):** `qa/built/C3.6.md` now lists only the document-type check as owed. **Fix:** also list "When the rule retires, Where used flags it" (plan §5) as owed.

Not a finding: the 474 px sideways scroll at 400 px comes from the page header and tabs, outside `[data-rule-facts]`. The deliberately owed `saveRequirement` document-type check is declared.

## D1–D20 (this item)
D1 4: §5 reachable from the product; Where used on retire owed (m5) · D2 3: MA1, MA2 · D3 3: built key collides or goes stale (MA1) · D4 4: rules, identity and near checks · D5 3: a false 409 dead end (MA1) · D6 4: audit line, DraftingJob US$0, second person · D7 4: origin rules, Sample, not meaning-checked · D8 4: on Questionnaires beside Rules and checks · D9 3: long, ungrouped rule select (m3) · D10 4: plain messages; the MA1 409 text is untrue · D11 4: done line and focused link · D12 4: team look · D13 3: axe clean; focus lost after a refusal (m2) · D14 4: team controls · D15 5: sub-second · D16 3: no tests for a retired name, a key collision, an edit, or a cross-combination race · D17 simulated only · D18 4: "Needed by rule …" source · D19 4: end to end without SQL · D20 simulated only.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder). I did not run mutation tests.

**Verdict: Block.** Fix MA1 (build the key at landing from the decided item; tests for a retired name, a key collision, an edit at accept) and MA2 (lock scope = check scope; parallel test across combinations). m1–m5 are small and best done in the same pass.
