# B140 — C6.18 journey test (reviewer role, 7 Nov 2026)

PR 1246 at `69c33c235`. Copy `rev140` on :4439: reset, then the configured checkpoint loaded, cases opened on Visitor visa release 2 (Sample people). Playwright ran headless Chromium (1243). The scripts and screenshots are in the session scratchpad and are not committed. axe-core WCAG 2.2 A/AA. US$0, live AI off.

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 | Case officer · "record what the client told me on the phone" | Case → Sample Client A tab → Background information → Add "criminal offence" → Save blank → No → Save → Confirm section | Note on the section; hint in the dialog; no radio preselected; blank refused; "Waits for the client" and "Officer" (who, when); confirm does not confirm it | **Held.** Dialog: 2 radios, 0 checked; blank: "Give an answer; an answer can be changed but not cleared."; toast "…Marked Officer: the client re-confirms it before signing."; after confirm, toast "1 answer confirmed. 2 recorded by staff wait for the client to re-confirm." |
| J2 | Client · "check what my officer wrote" | Questionnaire overview → "Check what your case officer recorded (n)" → keyboard Tab ×4–6 → Enter on "This is right" | Each answer with value and who/when; re-confirmed; list shrinks or goes | **Held.** Toast "Re-confirmed: it is your own answer now." (0.41 s); the list went from 2 to 1, then disappeared |
| J3 | Client · alternate: "that's wrong" | Change → the part (line above the question) → pick No → Save | Own answer; the line goes; Officer mark gone | **Held.** Stored `questionnaire`, confirmed, not marked |
| J4 | Client · error: officer changed it meanwhile | Overview open; officer changes the value; client presses "This is right" | Refused in words; the newer value is shown | **Held.** "This answer changed after you opened it; nothing was re-confirmed. Check the newer answer shown, then re-confirm that one." The row shows the new value |
| J5 | Wrong role | Re-confirm via the API as user-O, user-R, user-A, user-Q; bad id | Refused | 403, 403, 403, 404, 404 |
| J6 | Recovery | Double click "This is right"; reload | One version; state kept | One `client_reconfirm` row; reload kept it |
| J7 | Empty | All re-confirmed | No list | The list is gone |
| J8 | Across the boundary | The officer's Forms and Ready to file after the wait | IMM 5257 not ready; the waiting fact owed by the client | Forms `reason: "waits for the client to re-confirm"`; Ready to file `owes: client`, but its words are hidden in "and 62 more" (review m3) |
| B1 | Break: draft differs | Client ticks Yes under the line, then presses "This is right" | Refused, or the Yes kept | **Failed (Major, review M1):** No stored as the client's, confirmed; the screen still shows Yes; success toast |
| B2 | Break: blank shapes | The officer PUTs `"   "` on a yes/no | 400 | 200, stored with the problem "Answer yes or no."; the client sees an empty value with "This is right" (review m1). The UI dialog refuses it |
| B3 | Break: parallel re-confirm ×3 | — | One wins | 201, 409, 409 |
| B4 | Break: same question on Schedule 1 | Read the release: SCH1's `has_military_or_security_service`, `has_held_government_position` | Marked background | Not marked (review M2) |

## Automated replay
* **Two runs of J1 and J2 on two fresh cases.** Same results. No page errors. One console 409 in run 1, from J4 on purpose.
* **axe.** 0 violations on the officer's Add dialog, the Agent view after the save, the client overview with its list, and the client part with the line.
* **No sideways scroll** on the client overview at 400 and 1024 px, the client at 720 px (1440 at 200 %), and the Agent view at 1024 and 720 px.
* **Keyboard.** "This is right" is reached by Tab and pressed with Enter. The focus ring is the shared Button's.
* **Timings.** Client view 0.62 s. Case page 1.1 s (networkidle, the whole case page). Officer save 0.97 s. Re-confirm 0.41 s. The §9 catalogue budget does not apply to this page.

## Data underneath
* **J1.** Stored as `agent_view`, actor user-O, status DECLARED. After the client's re-confirmation: `client_reconfirm` by user-P, `from` names the officer's answer, and `recorded` gives who and when.
* **Confirm section** then gives `confirm_section`, VERIFIED, with the Officer mark kept.
* **Audit.** The lines are "…; a background answer recorded by staff, marked Officer…" and "Client A re-confirmed … the case officer user-O recorded (Officer)". The officer is named by id (review m5).
* **Undo** of the officer's later change restores the client's re-confirmed version: not waiting, still marked.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3 complete through the screens |
| Next step obvious | ½ | Confirm section stays primary when only answers waiting for the client remain; two actions on one answer in the part (B1) |
| Plain words | 1 | Note, hint, list and line are short and plain |
| Feedback and state | ½ | B1: success toast while the screen shows another value |
| Correct data | ½ | Exact on J1–J6; B1 stores a value the client rejected on screen |
| Error recovery | 1 | J4's stale refusal refreshes to the newer value; blank refused on the field |
| Accessibility and sizes | 1 | axe 0, keyboard, 400/720/1024 px |
| Speed | 1 | Under 1 s on each action |
| Visual quality | 1 | Team pills, Notice and Button; at 400 px the label column is narrow but readable |
| Trust and sources | ½ | Officer pill with who and when; the Sample loader re-confirms as Client A without a label (review m4) |
| **Total** | **8 / 10** | **Pass (8+, no 0).** The review still blocks on M1 and M2 |

**Fixes that raise the low criteria, most valuable first:**
1. B1: refuse or disable "This is right" while the draft differs. This raises correct data and feedback.
2. Leave answers waiting for the client out of the Confirm-section primary state. This raises next step.
3. Label the loader's re-confirmations as Sample. This raises trust.

**Not tested:**
* a real screen reader;
* an intended user's unaided walk (D17 and D20 stay with the founder);
* a visible headed browser (headless here);
* the PDF bytes after B1.
