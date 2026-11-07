# B145 · C9.5 journey test, reviewer role: 7 Nov 2026 (IST)

Commit `14ef16070829203a6b11c16f1bc55ce9824bd96f`. Isolated copy `review_c95` on :4443, configured checkpoint, started and stopped in the same command. Playwright Chromium, headless (no visible browser pane in this cloud session), keyboard first. Script and screenshots are in the reviewer's scratchpad (`/tmp/claude-0/-home-user-xpatready/817c2f4b-527a-5840-818a-34659fe2bbbd/scratchpad/journey.mts`, `race.mts`, `shots/`; not committed). AI off, US$0.

## Journeys (persona · goal · expected)
1. **Main, keyboard only.** Case officer: "Release 6 is out: what does it change for this family, and can I move now?" Open SAMPLE-VV-FAMILY-1, Tab to "What changes for this case", read it, move with the pre-filled reason, land in Prepare. Expected: one new revision; nothing re-filled; groups in Prepare.
2. **Alternate, later.** "Not now": nothing stored, the notice stays, Ready to file warns only on touched filings (pack C9.5-2, C9.5-8).
3. **Empty.** A case opened on the newest release: no notice.
4. **Error.** Reason cut to "a": the error appears on the field and the text is kept.
5. **Refused.** A later Sample release turns the organisation name into a date: the panel names the answer and the person, and Move is off.
6. **Wrong role.** Client, configuration author and another firm reach the case by API and URL.
7. **Recovery.** Double Enter on Move, and a non-English reason.
8. **Boundary.** Prepare after the move: the signed IMM 5476 is out of date because of the release, with no fact lines and no Undo; the review is withdrawn.
9. **Two tabs.** Two moves at once, then a third press from a stale panel.

## What held
* J1: notice text "Release 6 of Visitor visa is out (released 7 Nov). This case stays on Release 1 until you move it." The button is reached in **9 Tabs**. Focus opens on the reason. Panel: Forms · 5 changes, each with the people and old → new, and the fees line. After the move, the toast reads "Moved to Release 6. 10 items filed another way now; 3 items no longer required; nothing finished was changed." Focus goes to "Moved to Release 6 on 7 Nov", and the header reads Release 6. axe is clean on the notice, panel, reason error, refused panel and moved Prepare.
* J3: no notice; target null.
* J4: "Say why this case moves to the new release (at least 3 characters)." appears on the field, "a" is kept, and the pin count stays 1.
* J5: "Can't move yet: Client A (Sample)'s answer to "Name of the firm or organization a person works for or acts through" does not fit the new release (it expects a date). Change the answer, then move. Nothing was changed." Move is disabled, and Escape returns focus to the opener.
* J6: 403, 403, 404, and 404 for a bad id. The client never sees the notice.
* J7: two Enters make exactly 1 new revision. "résumé 日本語" is stored as typed. A 750-character hostile reason gets 400 "Keep it to 500 characters." Wrong types or a punctuation-only reason get 400 with one error per field.
* J8: "Out of date because of the release: this signed form was made on Release 6, and Release 7 fills IMM 5476's form fields differently. Nothing in it was changed. Press Fill to make it on Release 7." It has no Undo button and no "changed from" lines.
* J9 (server): one 200, one 409 `stale`, and one revision 3.
* Data underneath: pin revisions 1 and 2 are kept. The reason is on the pin, and there is one `moved_release` audit line per move (pack C9.5-14). The database refuses a gap, a backward move, no reason, and an update. Fill racing a move that goes first gets 409, with no copy on the old release.
* Sizes: the panel has no sideways scroll at 1024 px and fits at 720 px (200 % of 1440) and at 400 px. At 720 × 450 the reason footer takes about 45 % of the height.

## Findings
* **Major: J9, a stale panel after another tab moved the case.** Move answers "This case is on the newest release (Release 7): there is nothing to move to" over the old list. Behind it, the header and notice still say Release 6, and there is no "Read the list again" (`api/src/release-update.ts:133-135`; `web/src/runtime/release-update.tsx:133`). This is review F1.
* **Minor:** the notice appears about 2.4 s after navigation and pushes the page down. `GET …/release-update` takes 497-814 ms, and prepare 400-450 ms (review m8).
* **Minor:** in Prepare after a move, the 10 "Filed another way now" drafts have no Fill there. The Online IMM 5257 drafts can never leave the list (review m9).
* **Not this PR:** at 720 and 400 px the case page scrolls sideways, because of C7.7's "Read back the validated copy" row (900 px). The same happens with the notice removed.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: moved by keyboard; the pack's Fill made the copy on the new release |
| Next step obvious | ½ | the notice and button are clear; filed-another-way rows have no Fill in the groups (m9) |
| Plain words | 1 | the J1, J5 and J8 quotes; counts say what they count |
| Feedback and state | ½ | toast and focus are good; J9 state contradicts itself; the notice is late |
| Correct data | 1 | one revision under a double press and under concurrent moves; trigger; race 409; nothing re-filled |
| Error recovery | ½ | field error with the text kept; refusal names the fix; J9 has no recovery offered |
| Accessibility and screen sizes | 1 | axe clean in 5 states; 9-Tab path; focus returns; 1024/720/400 px panel fits |
| Speed | ½ | 0.5-0.8 s list; notice at 2.4 s |
| Visual quality | 1 | team Panel and Notice, calm groups, old → new rows (J1-panel-1440) |
| Trust and sources | 1 | release and date named; reason kept; fees line honest; no AI |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0) |

Fixes that raise it, most valuable first: the J9 conflict code and a refetch (feedback, recovery); compute prepare once and reserve the notice's space (speed); Fill on filed-another-way rows, and words that do not promise the list empties (next step).

## Not tested
A visible browser pane (headless only); a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); validated copies (kept on the Mac, QA-285); entered Online sections on a changed map.
