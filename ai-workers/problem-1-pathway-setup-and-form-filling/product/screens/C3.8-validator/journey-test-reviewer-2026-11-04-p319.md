# Journey test (reviewer): P-319, family information forms as a library role (ce36f9cd5)

PR #833. Reviewer role, 4 Nov 2026. US$0.

**I walked nothing in a browser.** Lead 3 paused every copy and server on the Mac (disk), so these journeys were traced through the code and the pure suites only. This score is provisional and is the one journey score for this check. Re-walk it on a copy once the disk is cleared.

## Journeys (persona · goal · expected)
1. **Main path.** Author, Work permit (family). "Release it without IRCC returning it."
   - Expected: IMM 5707 is removed while the package lists it, and Review and release names IMM 5707 as missing, as on main.
   - Traced: holds on a fresh load. `importConfiguration` sets the role before the snapshot (`import.ts:118`), and `studio.ts:236` reads it.
2. **Alternate.** Author. "IMM 5645 counts as the family form."
   - Expected: either form with the role fills the line.
   - Traced: holds (`form-completeness.ts:53-56`; check_c38 24/24).
3. **New family form.** Author. "Mark another form as the family form."
   - Expected: `POST /library/forms/:code/role` with a reason; an Activity line; the line is filled.
   - Traced: holds in code. check_p319 has not run. There is no screen control (a later row by ruling).
4. **Error.** Author. Sends an unknown role, no reason, a form that is not in the library, or a retired form.
   - Expected: 400, 400, 404 and 409, each in words.
   - Traced: holds (`form-library.ts:260-272`, `FormRoleBody`).
5. **Wrong role.** The SME (user-C) tries to set a role.
   - Expected: 403.
   - Traced: holds (`need(author)`).
6. **Recovery.** The founder's live demo after the merge (data kept, no reset).
   - Expected: IMM 5707 is still recognised.
   - **Fails:**
     - Every role is null (no data step in the migration), so IRCC-F09 says nothing.
     - IMM 5707's no-field-map words offer "or remove the form".
     - No screen can put the role back.
7. **Across the boundary.** Demo › Load configured, then the Visitor visa's Review and release.
   - Expected: after Release 1, the draft matches the release.
   - **Fails:** the roles are set after the releases (`demo.ts:96` vs `demo.ts:420-436`), so Review shows a "Form changed: Family Information" line that nobody made, and the submits ran without IRCC-F09.
8. **Saved release fixture.**
   - Expected: QA-180's m1 words still hold.
   - **Fails:** `check_qa180_one_rule.ts` 25/26, red on CI.

## Break it (from the code)
- Two authors set a role at once: both are told "changed", and one Activity line has the wrong "was". Minor.
- "Start With an LMIA from its reviewed release" after an author removed IMM 5707's role: the role is silently set back. Minor.
- Unknown role written straight to the database: refused by the CHECK constraint.

## Score (0 / ½ / 1, with evidence)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Works on a fresh load; fails on kept data (journey 6) and the configured load (7) |
| Next step obvious | ½ | Where the rule goes quiet nothing says why, and there is no screen control |
| Plain words | 1 | The Activity line and the 404 and 409 words are plain |
| Feedback and state | ½ | Unexplained draft change after the configured load; the Review line does not name the role |
| Correct data | ½ | Roles missing on kept data; configured releases frozen without them |
| Error recovery | ½ | API refusals are good; kept data can only be fixed by Reset |
| Accessibility and screen sizes | ½ | No screen change; not walked |
| Speed | 1 | One indexed query per review |
| Visual quality | ½ | No screen change; not seen |
| Trust and sources | 1 | Guide 5256 quoted with its date, marked Sample until the immigration expert confirms |

**6.5 / 10: does not pass** (needs 8 or more). No criterion is at 0.

Fixes that raise it, most valuable first:
- (1) A data step in the migration setting the roles on kept data (journey 6).
- (2) Set the roles inside `loadSix`, before any release (journey 7).
- (3) Fixture `form_role` for QA-180 m1 (journey 8).
- (4) A Review line that names the role change.

## Not tested
- A visible-browser walk; axe; the 400, 1024 and 1440 px widths; keyboard; timings.
- check_p319_family_role.ts on the branch and on main.
- A real screen reader.
- D17 and D20 stay with the founder.
