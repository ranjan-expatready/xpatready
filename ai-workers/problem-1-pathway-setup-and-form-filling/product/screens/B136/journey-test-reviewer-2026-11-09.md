# C6.14 (B136) journey test, reviewer role, 9 Nov (commit 0b51fe3b9)

**Copy:** isolated `rev614` on :4437, configured checkpoint. Headless Playwright (`/opt/pw-browsers/chromium`) driven only by what a person sees (role, label, text). Two exceptions: case opening and the release (submit, sign-off, approve) ran by their own routes, as in the builder's walk. Axe-core WCAG 2.2 A/AA ran on every state. Screenshots are in the session scratchpad, `jt/` (not committed). US$0.

## Journeys
1. **Author, main path:** "make the couple's marriage certificate come from both of them". Visitor visa › Documents › Spouse chip › Marriage certificate copy › "Who provides it when shared" › Set › add Principal applicant, then Spouse or partner › Up/Down › reason › Send. Done by keyboard (Enter, arrows in the select, Tab). Result: "Sent: a second person approves it…", and the drawer shows the waiting change with a link to To review. One change in the database, even after a **double click** on Send.
2. **Author, error:** send with no reason. Result: "Say why (3 to 300 characters)…"; the notice takes focus; nothing is stored.
3. **Approver, wrong role, then main path:** in the drawer the approver sees the roles but no edit button. On To review the change opens with before → after in words; Approve by keyboard; the type's draft carries `principal,spouse_or_partner`. **Wrong turn:** the page title reads "**SET_PROVIDERS** who provides a shared document: …".
4. **Author on their own change:** no Approve button; the API answers 403.
5. **Boundary, after the release:** a new case shows **one** shared item, on the spouse's list: "Shared · Provided by Sample Client A and Sample Spouse A · Default from the document type". A case opened before the release keeps "The person the item is for".
6. **Case officer, main path, keyboard only:** ⋯ › Change providers… › the dialog lists the 3 people; the child of 10 is disabled, with the reason in words. A reason of "ab" is refused on the field and the input is kept. Untick the spouse, give a reason, Save. The line then reads "Chosen by the case officer on 9 Nov, 04:35 (Case officer): <reason>". Focus returns to ⋯. Audited.
7. **Recovery, two tabs:** another tab saves first. Save here gives "changed after you opened it… Nothing was changed"; the "Now:" line refreshes; Save again succeeds.
8. **Back to defaults:** "Use the defaults" with a reason brings back both providers and the words record the return.
9. **Per-person and waiting lines:** the passport's menu has no "Change providers". A waiting line has no action; by API it answers 404 (the concept says 409).
10. **Client, wrong role:** POST answers 403; GET of the library route as officer or client answers 403.

## Break pass (15 min)
* Non-English reason (Cyrillic and Japanese, about 150 characters): stored and shown.
* Proposal races: 201 + 409, one open change. Officer save races: 200 + 409.
* Withdraw by a non-proposer: 403. Withdraw by the proposer: draft roles revert.
* **Lone surrogate in the officer's reason: 500, yet the row is saved and the audit is missing (Major).**
* After a returned change, the edit button stays live but every send gets 409 (Minor; seen in code, and also in the breaker's run).

## Data underneath
Each journey was read back from SQL or the API:
* one `library_change` row per proposal;
* `document_type` v2 DRAFT holding the roles, PUBLISHED after the release;
* `checklist_line.providers` and the reason exactly as typed, version +1;
* audit lines "providers changed".
The sign-off item for a provider-role change reads "…: supplies no facts" (Major 2 in `review.md`).

## Timings (sample data)
| Step | Time |
|---|---|
| Documents tab first view | 1.06 s |
| Drawer section | 0.13 s |
| Case page first view (a page on main) | 1.27–1.61 s |

No request per row.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3, 5, 6 and 8 done on the product's screens |
| Next step obvious | ½ | Link to To review after sending; the returned change is a dead end (Minor 3) |
| Plain words | ½ | "SET_PROVIDERS" title; raw role keys in the audit; contradictory fallback words for a 17-year-old |
| Feedback and state | 1 | Sent, waits, chosen-by with time and reason, conflict message |
| Correct data | ½ | Records exact and race-safe; but a save with no audit (Major 3) and a misworded sign-off item (Major 2) |
| Error recovery | 1 | Stale 409, reload, retry; reason errors keep input |
| Accessibility and screen sizes | 1 | Axe 0 violations in 7 states; no sideways scroll at 1024, 400 or 512 px (200 %); keyboard-complete. Author reason error not on the field (Minor) |
| Speed | 1 | New parts well under budget |
| Visual quality | 1 | Team components; one primary action per panel (`c2`, `c7`) |
| Trust and sources | 1 | Each provider says which rule chose them; Sample labels on roles |

**Score: 8/10, pass. No criterion at 0.** The review still blocks on its three Majors. Most valuable fixes:
1. Action word for `SET_PROVIDERS` (plain words).
2. Sign-off label with the provider roles (correct data).
3. Strip lone surrogates, or audit in the same transaction (correct data).
4. Disable or explain the edit button after a return (next step).

**Not tested:** a real screen reader; an intended user's unaided walk (D17/D20, the founder's).
