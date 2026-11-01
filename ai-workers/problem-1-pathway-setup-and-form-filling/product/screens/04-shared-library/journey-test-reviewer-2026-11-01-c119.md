# C11.9 journey test, reviewer, round 2 (1 Nov): Fields and Document types: delete, retire, restore

Commit **7c83a30f**. Isolated copy `b5crev` on :4462, sample inputs, US$0 (no live AI). Playwright ran **headless** in Chrome: no visible browser pane is available in this container. Walk scripts and screenshots are in `/tmp/b5probe/` (outside the repo, not committed). Review: `review-c119.md`. Paths are under `prototype/studio/`.

## Journeys (written from concept BR-8 to BR-10 before walking)
1. **Main, keyboard only (content publisher):** "Retire a field nobody uses any more." Fields → search → Tab to Retire → Enter → reason → Send → toast with Undo.
2. **Approver:** "Approve the retire I was asked for." To review → change page → Approve. Expected: the re-check line is shown before the click; the field is retired at once.
3. **Refused (publisher):** "Retire Family name." Expected: why, in words, and every use with a link, with no Send.
4. **Retired filter and restore:** Fields → Retired → Restore → confirm.
5. **Recovery:** Undo after the approver has already acted. Expected: "Not undone: …" in words.
6. **Across the screen boundary (publisher):** a combination's Documents tab → Add a document. Expected: a retired type is in neither picker.
7. **Wrong role:** the approver (no author duty) opens Fields. Expected: the actions are greyed with the reason. A person with no actor gets 401 by URL.
8. **Screen sizes:** 1024 px, 720 px (1440 at 200 %), 400 px.
9. **Field page of a retired field (publisher):** open it from the Retired list.

## What held
* J1: Retire is reached in 5 Tabs. Focus lands in the reason box. The panel says what happens, who approves ("A second person, on To review") and when ("When it is approved"). Send stays off until a reason is given. The toast reads `Sent for approval: Retire "Walk spare". Undo`. Data underneath: one LibraryChange, WAITING.
* J2: the change page says "Checked again just now: nothing new uses it." Approve gives RELEASED, and the field is RETIRED in the database. axe is clean.
* J3: "Can't retire yet: "Work permits › … › With an LMIA" still uses it: remove it there first." Each use is linked. Releases and library form fields are listed as kept. Escape closes the panel, and focus goes back to Retire.
* J4: the Retired filter lists the field with "Retired: hidden from pickers and AI; earlier releases and open cases keep it" and Restore. axe is clean. Restore approved → PUBLISHED.
* J7: the approver sees the action greyed (`aria-disabled`) with the reason. An unknown actor gets 401 on the uses and retire routes.
* J8: no sideways scroll at any width. At 720 px the panel is a 440 px overlay, fully visible.
* Break: 25 parallel approve-plus-withdraw rounds: never both succeed, and the data matches. Two retire requests at once: 201 and 409, one open change. A 301-character reason: 400. A non-English reason: 201. A withdraw after the change is applied: 409 in words. `PATCH {retire}`: 410.

## Findings (severity; file:line is in the review)
* **Major:** after a retire, a Screen 02 field-map decision with a typed key maps 2 IMM 5257 form fields to the retired field, and the Visitor visa setup now reads it (`api/src/sources.ts:701-707`, `:806`).
* **Major:** a merged field offers Retire. Retire then restore leaves its merged row PUBLISHED (`api/src/library-items.ts:31`, `:146-147`).
* Minor, J5: the "Not undone: This change is released: nothing to withdraw." toast is shown for one render and then cleared. Seen in the DOM, never readable (`components/lifecycle/index.tsx:128`).
* Minor, J4: the Restore confirm says "with the next release" but "Takes effect: When it is approved".
* Minor, J6: the type picker hides the retired type, but **Add an alternative offers it** (`web/src/pages/configuration.tsx:99`). Save then answers 409.
* Minor, J9: the retired field's page reads "Removed in draft" and offers Rename, Save as draft and Save placement as draft. Each one answers 409.
* Minor, J1: after Send, focus drops to `<body>`, and the keyboard user loses their place.
* Minor: on Document types, a new type still waiting for approval offers Delete, which is always refused.
* Minor: a `fact_source` use says "Its document checklist lists it" and links to the Documents tab.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 to J4 complete through the product's own screens |
| Next step obvious | ½ | Delete on a waiting new type is a dead end; the retired field page offers edits that are refused |
| Plain words | ½ | The Restore confirm contradicts itself; "Removed in draft"; "reads person.x, which is not in the library" |
| Feedback and state | ½ | The failed Undo is invisible; focus is lost after Send |
| Correct data | ½ | The retired field is mapped (Major 1); the merged field is half un-merged (Major 2) |
| Error recovery | ½ | Refusals are clear and linked; a failed Undo gives no way forward |
| Accessibility and screen sizes | 1 | axe clean on every state; keyboard path; 1024, 720 and 400 px with no sideways scroll |
| Speed | 1 | Lists 70 ms, uses 30 ms, change page 0.7 s; Fields 1.1–1.5 s to heading from a cold headless load |
| Visual quality | 1 | Team panel, pills and toast; rows aligned |
| Trust and sources | 1 | Who approves and when, History and audit lines, every use linked |
| **Total** | **7.5 / 10** | **Fail** (below 8; no criterion at 0) |

**Fixes that raise the score, most valuable first:** (1) refuse retired keys in the field-map decision and apply, and refuse retire and restore on merged fields (correct data); (2) keep the "Not undone" toast and return focus after Send (feedback, recovery); (3) item wording in the Restore confirm, a read-only retired field page with a Retired pill, and retired-field words in conditions (plain words); (4) no dead-end Delete on waiting new types, and filter retired types out of the alternatives picker (next step).

**Could not test:** a real screen reader, a headed browser, and an intended user's unaided walk (D17 and D20 stay with the founder).
