# Journey test: B142 / C7.9 "must verify before filing", reviewer, 9 Nov 2026

Commit 177378a54 (PR #1282). Isolated copy `rev142` on :4436 (stopped afterwards), configured checkpoint, Chromium (`/opt/pw-browsers/chromium`), axe-core WCAG 2.2 A/AA. Simulated people: user-A author, user-B approver, user-C immigration expert, user-O case officer, user-P client. My screenshots were kept in the session scratchpad (not committed); the builder's `walk/01–14` cover the same 1440 px states.

## Journeys
| # | Who · goal | Steps | Result |
|---|---|---|---|
| J1 main | Author: "the passport number must be checked before filing" | Field page › Propose (keyboard: Enter, type the reason, Tab, Enter) › To review › expert Approve › release › case | Holds: sent notice; expert sees before → after (walk/06); released v3 carries `must_verify`; the line shows on Ready to file |
| J2 main | Officer: file with an unchecked client passport number | Ready to file › CRITICAL line › Pass with a reason… (keyboard) at 1024 px | Holds: line visible about 2.1 s after opening the case page; "Passed with your reason: who and when are recorded"; the line moves to Passed |
| J3 alternate | Officer: check rather than pass | Staff correction of the client's value; Confirm section | Holds: both clear the line (S2b, C7.9-13) |
| J4 alternate | Principal answers for an adult spouse | Client types the spouse's passport number | Holds: "IMM 5257 for Sample Spouse A … not verified" |
| J5 wrong role | Approver without the expert duty, and the proposer | Approve or Return the change | Holds: 403 in words, "does not hold the immigration expert's duty" (walk/05) |
| J6 error / recovery | Author after the expert returns it | Field page › Propose again; Open it › Send again; Withdraw | **Fails in words**: false "already waits on To review"; Name/Meaning form refused; the only exit is labelled "Withdraw the new field" (works; field untouched) |
| J7 boundary | Officer: a flagged fact about a parent (IMM 5645) | Expert flags date of birth (v4); client types the spouse's mother's DOB | **Fails**: no must-verify line; engine returns `[]` (wrong subject, `split("/")[0]`) |
| J8 new value | Client changes a passed value | New value after the pass | Holds: the line is back (C7.9-12) |
| J9 empty | Nothing answered, or a field without the flag | — | Holds: no line (C7.9-8, 15) |

## Automated replay and data
* `acceptance/C7.9.test.ts` 15/15, exit 0 (one run on a fresh checkpoint; my scenario script ran twice with the same results).
* axe: field page 0, case Ready to file 0 (1024 px and 512 css px at 2x = 200 %). No sideways scroll on the field page (1024 px, 200 %), the change page (200 %) or the case page (1024 px, 200 %). The console shows only the expected 409s of J6.
* Data: one `library_change` per proposal (WAITING → RETURNED → WITHDRAWN, or → APPROVED → RELEASED); `canonical_field` gets a new draft only at approval; `readiness_pass` has one row with code `must_verify`, severity critical, the reason, who and when; the audit line names the code and case. The audit `detail.keys` holds a 12-hex hash of the passport number (review issue 4).

## Break it
Two proposals at once: refused by the lock and one-open ("Already waiting"). The proposer approving their own change: refused. Re-proposing the current state: 409 "Nothing changes". A reason that is only "x": 400 in words. A removed repeating row's answer still counts (review issue 3, from the code; not walked).

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J3 end to end; pack 15/15 |
| Next step obvious | ½ | Main path clear ("Check against the document and confirm, or pass with a reason"); J6 offers actions that are refused |
| Plain words | ½ | The line is plain; "already waits on To review" (false) and "Withdraw the new field" (wrong object) |
| Feedback and state | 1 | Sent notice, open-change line with link, "Passed with your reason", Passed list |
| Correct data | ½ | Own facts right; parent and application facts missed (J7); removed rows counted |
| Error recovery | ½ | Server recovers (withdraw works); the screen route to it misleads (J6) |
| Accessibility and screen sizes | 1 | axe 0; keyboard propose and pass; 1024 px and 200 % clean |
| Speed | 1 | prepare 0.35–0.55 s; the line shows with the case page |
| Visual quality | 1 | Team cards, pill, before → after list (walk/06, 09) |
| Trust and sources | ½ | Sample is said on the field and the change; the line hides whose value (a parent's) it means once relatives count |
| **Total** | **6.5 / 10** | **Below the pass (8)**; no 0 |

**Fixes that raise the score, most valuable first:** (1) judge answers on the whole `about` and name the relative (correct data, trust); (2) give a returned must-verify change its own "Propose it again · Withdraw it" branch, and have the field page say "withdraw it first" (next step, words, recovery); (3) skip removed rows and key passes by answer id, not value hash.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).
