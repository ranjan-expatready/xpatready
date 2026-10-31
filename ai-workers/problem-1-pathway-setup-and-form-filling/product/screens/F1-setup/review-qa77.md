# Review — QA-77 one name per person (C11.12) · commit d77a984e

Reviewer did not build this. Tested commit d77a984e from its own extract (`git archive d77a984e` → /tmp, its own `vite build`, isolated copy `screens_rev2` on :4444, server cwd confirmed in the extract). Not the main copy: that copy changed branch while this review ran. One early run there against the other branch's build failed 3/10, which shows the check catches the bug when the fix is missing.

## The decision: combination's label first, library name as fallback
**Right, and it does not contradict QA-77.** The bug is "names its people two ways on one page", and the fix it asks for is "one set of names". Before this commit, the header, Overview, Questionnaires role chips (`engine/runtime/questionnaires.ts:39`, `p.label`) and Preview person chips (`engine/runtime/preview.ts:28-34`, `label(role, fallback)`) all used the combination's label already. Only the folded Who can be line and its table used the library name. Changing those two is the smallest change that makes the page consistent, and it follows L7 (`engine/people.ts:30`: typed label kept, else library label). Using library names everywhere would mean changing the runtime engine and dropping typed labels that L7 keeps on purpose.
"§4 says Principal applicant" is about the **role term**. That term stays visible as "role: Principal applicant" under the typed label. The only reason "Applicant" shows at all is the sample's typed label in `samples/programs.json` (runtime's data). Whether that sample should say "Principal applicant" is runtime's call (Should, below). It doesn't count against this commit.

## Other places that name people (all checked, all consistent now)
| Place | Source | After d77a984e |
|---|---|---|
| Header "people:" (every tab), Overview people list | combination label | Applicant · Spouse or partner (travelling) · Child (travelling) |
| Who can be folded line + table + edit-mode aria-labels | `nameOf` (new) | same, plus "role: <library>" when different |
| Questionnaires role chips (~l.351), coverage line, "for <person>" texts (`role?.label`) | `QuestionnaireRole.label` = participant label | same (code read: Visitor visa has no forms in the fresh sample, so the chips don't render) |
| Preview person chips | `familyPeople` → participant label, else library | same (code read, same reason) |
| AddPerson select, AI proposal table | library / proposal labels | by design: those choose a role, they don't name an existing person. Not in scope |

## Evidence
- Builder check `check_qa77_names_browser.cjs` (copied to /tmp, screenshots to /tmp): **10/10 twice**; first run 11/11 (that run also loaded the sample).
- My walk (1440): all five tabs' header lines match. Who can be opened with the keyboard (focus + Enter). In edit mode the aria-labels read "Fewest/Most/Remove Spouse or partner (travelling)". Save with no edits keeps participants byte-identical in the DB (labels kept, L7). Whole page has 0 axe A/AA violations. 400 px and 1024 px have no sideways scroll. No page errors.
- Does the test fail if the rule is removed? Yes: on a build without the fix, the table-order check and the role-note check fail.

## Findings
- **Should (runtime, not this PR):** the sample's Visitor visa typed labels ("Applicant", "(travelling)") read like a second naming scheme to a content publisher. Either relabel the sample principal "Principal applicant" or keep it as an L7 example. Ask runtime/QA when they retest QA-77.
- **Minor (pre-existing, not this PR):** the library calls the child role "Child", while PRODUCT §4 says "Dependent child". That's a library wording gap; record it with QA rather than here.
- **Minor (check portability):** `check_qa77_names_browser.cjs:13` hardcodes `/opt/homebrew/opt/postgresql@18/bin/psql`, while the browser path on the next lines has a fallback. It runs here only because that path exists.

## Journey score (reviewer, the one score for this check): 9.5 / 10, pass
Task completed 1 · next step obvious 1 · plain words 1 · feedback and state 1 · correct data 1 (save round-trip unchanged) · error recovery ½ (no error path touched by this change; not exercised beyond the save) · accessibility and sizes 1 · speed 1 · visual quality 1 · trust and sources 1 (library role shown under a typed label).
Not checked: a real screen reader, an intended user's unaided walk (D17/D20 stay with the founder), and the chips with a family that has forms (Visitor visa has none in the fresh sample; code read only).

No open Blocker or Major.

**Verdict: Approve** — commit d77a984e.
