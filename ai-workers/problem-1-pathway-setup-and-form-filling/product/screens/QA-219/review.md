# QA-219 review: C3.5, Other names and merges on a field's page

Reviewer: an independent session that did not build this. Commit reviewed: **5f50a5731** (`git diff origin/main...5f50a5731`, 6 files, +264/-6), branch `claude/forms-qa-219-merge-alias`. Evidence: code; screenshots `screenshots/01`–`07` at 1440 and 1024 px; GitHub nightly runs 41822757967 and 41822773915 on 5f50a5731, both `packs (C3.5)` success, `C3.5.test.ts on the six: exit 0` (78 s; `Gate B: passed`). `node product/tools/graph.mjs --check`: exit 0 (G1 0, G2 0); the new check is linked to C3.5. As briefed: no copy, server or browser started. Live AI off, US$0.

**Verdict (screen-review): Ship after fixes.** One Major: a new refusal rule has no test. Journey score **8/10** (pass, no 0): `journey-test-reviewer-2026-11-04.md`.

## The question for the tech lead: should a second person approve an alias?
**I agree with the builder: an alias applies directly and is logged.** P-266 says "every other rename, label and alias stays direct and logged (P-96)". P-253's risk table says the same in its own words ("wording, labels and aliases direct and logged"). P-65 asks for review only on merges ("a person approves it"). A brief that asks for a second person on an alias goes against two founder decisions. Under AGENTS.md rule 2 that is the founder's call, not the build's. Raising it as a PR question is right. The page shows the rule ("Applies now and is logged") and the activity entry is written. The check proves that entry at line 94.

## What the bug asked, and what the page now does
| Asked (BUGS.md QA-219) | Built | Evidence |
|---|---|---|
| From a field's page, propose a merge with another field and a reason | "Merge into…" opens a dialog. It offers only fields with the same kind of answer, never the field itself, sorted by name. The reason needs 10 or more characters (also enforced on the server, `NewMerge` min 10). It shows "What this change touches" and sends the preview's fingerprint as `expected`. | shot 03; check lines 98–108 |
| It waits on To review for a second person | The merge row is PROPOSED and its change set is `waiting`. The page says "Waits for a second person" and links to "Open it on To review". No second merge is offered. The author's own approval gets 403. | shot 04; lines 113–118 |
| The page lists the field's other names | "Other names" shows them as pills, plus "Add another name" (direct). The field that stays shows "Merged in: … · approved by Approver · reason". The field that went away says where it went, with a link. | shots 06, 07; lines 136–146 |

## Standards, [M] lines this change touches
* Errors as Problem Details, said on the field: **met** for the alias field (shot 02) and the reason field. **Partly met** in the merge dialog: some refusals still name keys (Minor 3).
* Authorisation on the server, author ≠ approver: **met**. `need(actor,"author")` guards the alias and the proposal, `need(actor,"review")` guards approval, and the proposer gets 403 (line 118).
* Plain words, no IDs on the main path (EXPERIENCE §46, PRODUCT §4): **met** for the alias refusal, the pending-merge refusal and the merged-into refusal. Minors 2–3 list the gaps.
* Prevent errors (EXPERIENCE 8): **met**. Choices come from a list, Send stays off until the check passes, and duplicates are refused before saving.
* One next action per status (EXPERIENCE 5): **not met** on the merged-away page (Minor 2).
* Accessible (EXPERIENCE 12): axe WCAG 2.2 A/AA and 1024 px without sideways scroll are checked on all 7 states (green on CI). Keyboard-only and 200 % zoom are **not verified** (no browser in this review).
* No per-row requests (STANDARDS): **met**. There is one GET `/library/merges`, the field list is shared through the cache, and the dialog makes one change-check per choice.
* Every rule has a passing and a failing test (WAY-OF-WORKING "Every PR"): **not met** for the new confirmed-name rule (Major 1).
* Waits fail loudly: **mostly met**. The steps turn timeouts into FAIL. One silent wait is left (Minor 4).

## D1–D20 (1–5)
D1 Requirement fit 4: all three asks of QA-219 are met, and P-65 and P-266 are followed · D2 Data integrity 4: the alias is saved under a row lock, one merge per field is pending, the DB checks show one row · D3 Reuse 4: the merge joins a real duplicate (IMM 5257 and IMM 1294 phone fields) · D4 Rule integrity 4: the merge goes through the change-set rules check · D5 Stability 4: a stale preview refetches, and typing again clears a refusal · D6 Governance 4: proposer, approver and reason are shown, and the alias is logged · D7 AI trust 4: unchanged, "Made by a person" on the preview · D8 Orientation 4: breadcrumb, and the section sits beside Definition · D9 Flow 4: the waiting notice links to To review · D10 Language 3: Minors 2–3 · D11 Feedback 3: the merges list has no loading or failed state (Minor 1) · D12 Visual 4: team cards, notices and pills (shots 01–07) · D13 Accessibility 3: axe and 1024 px pass, keyboard and zoom unverified · D14 Team look 4 · D15 Speed 3: not measured against §9, whole check 56 s on CI · D16 Testability 3: Major 1 · D17 simulated only · D18 Provenance 4: "approved by" and the reason on the merged-in line · D19 Closure 4: author → To review → approver → both pages, in one browser check · D20 simulated only.

## Findings, most important first
**Major 1 (Must): the new alias rule has no test, passing or failing.** `api/src/forms.ts:73` adds `(!!r.labelChecked && !!r.label && normLabel(r.label) === k)`: an alias is now refused when it equals another field's confirmed name. No test sets up that case. The browser check's refusal ("Phone number") matches through `person.phone_number`'s key words (the clause that was already there), and `check_forms_channels.ts` has no case either. Delete the new clause and every check stays green. Fix: add a failing step and a passing step labelled `C3.5:`. Failing: rename or confirm field X as a name that is not its key's words, then add that name as an alias of Y and expect 409 naming X. Passing: the same name differing only in case or apostrophe is still refused, and an unrelated name is accepted.

**Minor 1 (Should): "Merge into…" shows while the merges list is still loading, and a failed load shows nothing.** `web/src/pages/library.tsx:249` gates on `!waiting`. While `merges` loads, `waiting` is undefined, so the button appears even when a merge is waiting. If the GET fails, the page silently shows no merges. The server still refuses a second merge, in field names, so no data is at risk. Fix: hide the merge row until `merges.data` arrives, and show a short error notice if it fails.

**Minor 2 (Should): the merged-away page gives two contradicting instructions.** Shot 07 shows "Retired — It takes no change or new use. Restore it on Fields (choose the Retired filter) first." and also "Merged — This field was merged into Alternate telephone number". The server refuses to restore a merged field (`api/src/library-items.ts:51`, "never retired, restored or deleted"). The header pill also says "Retired". Fix: when `cur.mergedIntoKey` is set, drop the Retired restore notice (`library.tsx:145`) and show "Merged" in place of the Retired pill (`library.tsx:141`).

**Minor 3 (Should): some refusals the merge dialog shows still use raw keys.** The dialog shows `send.error.message` on "Field that stays". These messages are still written with keys: `api/src/forms.ts:319` (P2002 race, "`${b.merge}` is already in a merge…"), `:303` ("`${k}` is not an active field…", reachable if a field is retired after the list loaded), `:304` (different kinds) and `:160` (alias 404). Fix: use `this.shown(rows, …)` the way the other refusals in this change already do.

**Minor 4 (Should): one silent wait is left in the check.** `tests/check_qa219_merge_alias_browser.cjs:35` has `waitForLoadState("networkidle").catch(() => {})`. This is the shape WAY-OF-WORKING forbids, and it caused this check's own first failure: the page was read before the merges list loaded. Every later read now waits explicitly, so nothing depends on this line any more. Fix: remove it, or let it throw.

**Minor 5 (Should): check labels and ports.** The step labels start with "QA-219:" and should name the capability they prove ("C3.5: …", WAY-OF-WORKING "Every PR"). The default port 4445 (`check_qa219…cjs:14`, `acceptance/C3.5.test.ts:14`) is in the screens range; the forms lane uses 4450–4459. The last line, "PASS  every step", does not match gate-b's summary pattern, so CI shows "no summary line" and no count. Fix: rename the labels, default to 445x, and end with "n/n passed".

**Minor 6 (Should): "Field that stays" lists names only.** Two fields in different groups can share a name (the rename rule is unique only "in this group"), so an option can be ambiguous among 300 or more text fields. Fix: add the group or subject to the option text, as the preview's path does.

## What I could not check
A walk in a live browser, keyboard-only, at 200 % zoom and at 400 px. A real screen reader. Timings against STANDARDS §9. D17 and D20 stay with the founder. I read the second GitHub run's job results but could not fetch its full log text (gh returned an empty log); its jobs show success on the same SHA.

**Verdict: Changes needed.** Blockers: none. Majors: 1. Minors: 1–6 (they may ride in this PR or the forms lane's daily minor-bugs PR).
