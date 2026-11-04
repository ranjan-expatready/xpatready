# C1.6 forms channel slice: journey test (reviewer, 4 Nov 2026)

PR #870 at c74dbcda. 3557aa1a, pushed while I was testing, changes only a comment. Isolated copy `rev_c16` on :4458,
Reset to the six, live AI off, US$0. Playwright (headless Chromium) driven only through what a person sees, then the API
read underneath. I fixed nothing.

## Journeys
1. **Main path (author):** see which forms of Visitor visa go online and through which account, then file IMM 5645 online.
   Programs card ("PDF upload: …", PDF only) → open the card → Forms tab → IRCC account "IRCC secure account" → IMM 5645
   "Online" → the line says "Typed into the IRCC secure account from the answer sheet, in portal order" → back on Programs,
   the card and the List show "Online · IRCC secure account: IMM 5645" and "PDF upload: …", with the tag Mixed. **Held.**
2. **Alternate (account not set):** the Online line says "IRCC account not set: choose above the account it is typed into", and
   the card says "Online · IRCC account not set: IMM 5645". **Held** (the builder's check covers this; I confirmed it in the API rows).
3. **Alternate (paper filing with an Online line):** the card says "Online · no IRCC account (paper filing): IMM 5645". The
   Forms tab shows the red problem note, then a grey line saying the same thing again. **Held, with words shown twice (review m2).**
4. **Empty:** a combination with no form lines shows no channel list on its card. **Held.**
5. **Wrong role (approver, user-B):** read-only words, and a channel change by API is refused 403 with the row unchanged. The
   approver is told to "choose above", but has no picker. **Held, words m3.**
6. **Keyboard:** List grid: arrow keys move between rows, Enter opens the combination, and Tab goes from the row to its Needs you mark.
   The new list adds no tab stop and does not trap focus. **Held.**
7. **Sizes:** 400 px, 1024 px, and 512 px at 2× (= 1024 px at 200 %): no sideways scroll on cards, List or the Forms tab.
   **Held**, but the portal is cut with "…" in List rows at 1024 and 400 px (m5).
8. **Recovery:** reload and Back keep the saved channel and account. A second tab's stale account choice is refused
   (`check_qa_am_ch_1030.cjs` 47/47 on a fresh copy). **Held.**
9. **Across the screen boundary:** the card's name button and the List row's Enter open `/c/<id>`, and the Forms tab shows the
   same channel and filing method as the row. **Held.**

## Data underneath
`GET /catalogue` row for Visitor visa: `account` is null on the six, then `IRCC_SECURE_ACCOUNT` once set, and null again once
cleared. `forms[].channel` for IMM 5645 is `ONLINE`, and the other filed lines are `PDF_UPLOAD`. `filing` changes from "PDF only" to
"Mixed: online and PDF". The account on the row is the draft's, the same as on the Forms tab. Nothing else changed.

## Break it
Words from `channelWithPortal` for null, "", PAPER, each account, and an unknown key: no enum spelling reaches the screen for any
key the server accepts. axe on cards and List: 0 violations. Page and console errors: none. A decision id remains in a Forms tab
tooltip, "(P-143; …)" on the Signature column (m4), which the new check's innerText scan cannot see.

## Score (0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journey 1 end to end through the UI |
| Next step obvious | 1 | Needs you and Resume setup on the row; the Forms tab names the account to choose |
| Plain words | ½ | "P-143" in the Signature tooltip (m4); the paper message twice (m2); "choose above" for the approver (m3) |
| Feedback and state | 1 | toasts "Filed through the IRCC secure account", "IMM 5645 filed as Online"; the tag turns Mixed |
| Correct data | 1 | the API row matches the screen; approver 403; values exact |
| Error recovery | 1 | stale choice refused; reload and Back keep the state |
| Accessibility and screen sizes | ½ | axe clean, keyboard fine, no sideways scroll; portal cut in narrow List rows (m5); the grid row's name leaves out the channels (m6) |
| Speed | 1 | cards view 639 ms on the six; no per-row request |
| Visual quality | 1 | quiet, team tokens, one line per channel group |
| Trust and sources | 1 | no AI here; the Forms tab marks the values Sample until the immigration expert confirms |

**9/10, no criterion at 0: pass.** To raise the two halves: (1) drop "(P-143; …)" from the Signature tooltip, show the paper
message once, and give the approver only the fact; (2) keep the portal label whole in List rows and add the channels to the
row's accessible description.

## Not tested
A real screen reader. An intended user's unaided walk (D17, D20: the founder's). Keyboard-only use of the native pickers on the
Forms tab. Hostile files and non-English text (this slice takes no free text).
