# C11.12 PR 2: journey test (reviewer role, 2 Nov)

**Commit:** `1c47a293`. **Copies:** :4441 (`xr_studio_revpr2`) and :4442. Never :4400. US$0, live AI off.

**Scope:** PR 2 changes no screen. The web has no reader of `GET …/prepare` or `…/filings`, and the Filing column and preview panel are PR 3. So the journeys were walked through the API as the case officer and the author would cause them, with the database read underneath. No browser walk was possible for this PR.

## Journeys
1. **Main path** (author, then reviewer and approver, then case officer).
   - Steps: the author releases a Visitor visa with Child On the principal's (Guide 5256 warning shown). The officer opens a case and adds a spouse and a child, then opens Prepare.
   - Expected: 2 filings (the principal's with the child on it, and the spouse's own); the child's forms on the principal's filing; 3 fee lines per fee.
   - Result: **held** (`check_c1112_prepare_api` 16/16).
2. **Alternate: the travelling switch.**
   - Steps: mark the child not travelling, then travelling again.
   - Expected: same filing id; declared only with no fee line and no forms; then applying with the forms back.
   - Result: **held**.
3. **Declared only start value.**
   - Steps: on a release with Child Declared only, add a child without saying whether they travel.
   - Expected: not travelling.
   - Result: **held** (201, `applies: false`).
4. **Co-filing.**
   - Steps: on a release with Sponsor 1..1 Files the sponsorship (Sample), add a sponsor.
   - Expected: a second filing (`co_filed`) in the principal's group, not splittable.
   - Result: **held**.
5. **Wrong action.**
   - Steps: switch the sponsor's travelling; split either filing out of the co-filed group.
   - Expected: refused in words.
   - Result: **held** (422 "The sponsor's application is always sent with the principal's."; 409 "…sent together and cannot be split.").
6. **Fees not worked out.**
   - Steps: open Prepare on a combination with modes but no fee rule.
   - Expected: filings and groups shown, no amount.
   - Result: **partly held.** Filings are shown with "Fees not worked out yet", but each group carries `total_cents: 0` (review M2).
7. **Family maximum with children on the principal's filing** (engine, ages 40/40/10/15).
   - Expected: one line per person, each naming whose it is.
   - Result: **failed.** The 15-year-old's covered biometrics line reads as the principal's (review M1).
8. **Recovery: double reads and a race.**
   - Steps: 8 parallel first reads, then a travelling switch raced against 6 reads.
   - Expected: one row per filing and applicant, ids kept.
   - Result: **held** (2 filings, 3 applicant rows, 1 group, 0 duplicate items).
9. **Across the boundary.** C6.12 acceptance on a fresh copy after `setup_vv_m3`: 24/24.

## Data underneath
- `filing_applicant` holds the child on the principal's filing as `applying`, then `declared_only` after the switch.
- No new rows appear on re-reads.
- The widened checks refuse `sometimes` and `on_principal_applying`, and accept `co_filed`.
- The audit line for the travelling switch is unchanged.
- The server enforces the 422 and the 409.

## Break-it
| Severity | Finding | Where |
|---|---|---|
| Major | A fee line covered by the family maximum, for someone on the principal's filing, names no person; the stored `subject` is the filing owner | `filings.ts:369`, `case-prepare.ts:166` |
| Major | A group's `total_cents` is 0 when fees are not worked out | `filings.ts:381` |
| Major | The 422, the 409, the Declared only start value and the co-filed group placement have no test | `runtime.ts:187,198`, `case-prepare.ts:105,234` |
| Minor | "One submission for 4 people" counts the declared-only child and the sponsor | `filings.ts:377` |

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–5 |
| Next step obvious | ½ | No screen yet; the API's `why` and `fees_why` words carry it |
| Plain words | ½ | Refusals are clear; "Covered by the family maximum on principal 0's filing" on the principal's own filing; the group count of people |
| Feedback and state | 1 | 422 and 409 in words; `not_filing` says why |
| Correct data | ½ | The fee line's person is lost (M1); a 0 total for unknown fees (M2) |
| Error recovery | 1 | The switch round-trips with the same id; races leave no duplicates |
| Accessibility and screen sizes | 1 | No screen change in this PR; PR 1's axe run stands |
| Speed | 1 | Prepare reads 68–96 ms |
| Visual quality | ½ | Nothing visible until PR 3 |
| Trust and sources | ½ | Sample and "not worked out yet" are said; a number 0 and a misattributed line undercut it |
| **Total** | **7.5 / 10** | Below the pass of 8; no criterion at 0 |

**Fixes that raise it, most valuable first:**
1. Give every fee line its person (M1): raises Correct data, Plain words and Trust.
2. Make the group total null when fees are not worked out (M2): raises Correct data and Trust.
3. Count only the people applying, or say "N people (1 declared only)", in the group label.

**Not tested:** a real screen reader, any browser walk (no screen in this PR), and an intended user's unaided walk (D17 and D20 stay with the founder).
