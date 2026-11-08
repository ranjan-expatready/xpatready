# B155 journey test, reviewer role, 8 Nov 2026 (the one score for this check)

**Commit:** `0dd8397ee`. **Copy:** isolated `rev155` on :4471, configured checkpoint, Visitor visa release 2.
**Browser:** headless Chromium (`/opt/pw-browsers/chromium`), Playwright plus axe-core (WCAG 2.2 A/AA). US$0, Sample people only.
**Setup:** the case `REV155-WALK` (the pack's FAMILY) was opened by the pack helper, as the builder did. Every B155 step after that was done on screen.
**Screenshots:** my scratch folder, not committed (`/tmp/claude-0/-home-user-xpatready/5076e1b1-d806-5c26-b06f-95de502862b4/scratchpad/shots/`). The builder's `walk/*.jpg` show the same states.

## Journeys
1. **Main (officer, 1440).** Goal: "record the client's brother and confirm it". Steps:
   * Open the case. The tab "Sample Client A's brothers and sisters · 1 missing" shows (tab switch 144 ms).
   * The empty state reads "No entries. The forms need one or the other before filing." with **Add an entry** and **None apply**.
   * Add an entry, then **Add** on "The person's full name (entry 1)". The dialog is titled "Sample Client A's brothers and sisters · entry 1 · fills IMM 5645 for Sample Client A (7 form fields)".
   * Type the name and press Enter: saved. The section reads "1 answered · 1 to confirm · 6 missing".
   * Confirm section gives "1 answered · 0 to confirm".
   * Result as expected.
2. **Keyboard-only (officer).** Focus moves to the Add button, which is named in full ("Add The person's full name (entry 1) for Sample Client A's brothers and sisters"). Enter, type, Enter saves. Confirm section works with Enter. Focus is visible.
3. **Client on a phone (400).**
   * The overview says "…and for the parents, brothers and sisters its forms ask about".
   * The part "Brothers and sisters · 6 to answer" reads "Answering for Sample Client A's brothers and sisters (not on this application)".
   * Add another, then type entry 2's name, then "Save and come back later". Stored as `questionnaire` by the client (checked by API).
4. **Alternate: none apply (client, 400).** On the spouse's part, **None apply** gives "✓ Saved" and "None apply · Answered by the principal for Sample Spouse A's brothers and sisters". Stored DECLARED (API).
5. **Edge: 7 and 8 entries (client 400, officer 1440).**
   * Only entry 7 asks "accompany to Canada", as the release maps it.
   * Entry 8 shows "This entry does not fit on the form … your officer adds it on an extra sheet" and keeps every question.
   * **But** with entries 1–7 complete and entry 8 holding a name only, IMM 5645 is `ready: true` and the section has nothing missing (review Major #1).
6. **Wrong role and wrong keys (API).**
   * Client Confirm section: 403.
   * Another case's person: 404.
   * The application's sibling: 404.
   * A parent as a list: 404.
   * No row: 422, in words.
7. **Recovery and race.**
   * Two adds raced with "none apply": 201, 201, 409 "This group has 2 entries; remove them first, then say none apply." One subject only.
   * The builder's check covers a stale save (409).
8. **Across the boundary.** Generate a copy: entries 1 and 2 are in Section C rows 1 and 2 of the PDF. Row 3 onward reads "nothing to write: … have 2 entries, none for row 3" (B155-9, -9a, re-run 27/27). The next step (Prepare › IMM 5645) is unchanged.

## Automated replay (my script, run twice, same results)
* **axe:** clean on officer empty and confirmed states (1440), 1024, 720 (200 % zoom), the officer dialog, the client overview and the client part (400).
* **Layout:** no sideways scroll at any width.
* **Page errors:** none.
* **Timings:** case page 2.4 s (an existing page, not this row), tab 144 ms, client questionnaire 1.4 s, save round trip under 1.3 s.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | journeys 1–4 done on screen; 27/27; PDF read back |
| next step obvious | ½ | the intro lists "accompany" for every entry, though only entry 7 asks it |
| plain words | ½ | "(7 form fields)" on a one-entry save; library meanings with periods as questions |
| feedback and state | 1 | toast, "1 answered · 1 to confirm · 6 missing", "✓ Saved" |
| correct data | ½ | storage, rows and fill are right; the 8th entry is never waited on (Major #1); hidden answers are confirmed (Minor #3) |
| error recovery | 1 | 409s and refusals in words |
| accessibility and screen sizes | 1 | axe clean; 400/720/1024/1440 with no sideways scroll; keyboard save and confirm |
| speed | 1 | tab 144 ms; client view 1.4 s |
| visual quality | 1 | team look; the "does not fit" notice and pill are clear |
| trust and sources | 1 | "Agent view · Case officer · time · fills IMM 5645"; "Entered by staff · to confirm" |

**Score: 8.5/10, pass (no 0).** The fixes worth most: Major #1 (correct data), then the intro and save-count words (#4, #6).

## Could not test
* A real screen reader, and an intended user's unaided walk (D17, D20 stay with the founder).
* Signing and filing after Prepare.
