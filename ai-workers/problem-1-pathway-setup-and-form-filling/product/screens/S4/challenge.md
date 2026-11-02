# S4 challenge: the catalogue's status mixes the next draft into the release (raised by the S4 reviewer, ea7f28b2)

**The finding.** Immigration programs gives a released row its status from `relProblems = [...structure, ...validate(relSnap)]` (`api/src/programs.ts`, catalogue). `structure` is `Studio.structureProblems`, which includes the **draft's** form fields with no decision yet (K1, `undecidedFormFields(…, "DRAFT")`). So when an author starts the next draft and leaves a form field undecided, the **release**, which has not changed, shows as **Not ready**.

**Against the catalogue's own rule.** Its comment says: "Status is about what firms can use: the released snapshot when there is one; the draft only explains In setup."

**What S4 does.**
* S4 judges a release from the release alone: the row-level structure lines (`where: "Row"`) and every rule against the live library. The draft's K1 lines are left out, so drafting never stops cases on an unchanged release. `tests/check_s4_startable.ts` has a pass line for this; it fails on the version that mixed them in.
* **The consequence:** in that one state the catalogue says Not ready while a case still opens. Every other Not ready, a rule that no longer resolves for example, is refused by S4 with the catalogue's own lines.

**Recommendation (for the tech lead; the catalogue belongs to the screens lane).** A small screens row:
* the catalogue's release status uses the same release-only problems;
* the K1 draft lines stay where they belong, in the draft's setup checklist and the release gate;
* one shared helper, so the catalogue and S4 cannot drift apart again.

Not changed here, so this PR moves no other screen.
