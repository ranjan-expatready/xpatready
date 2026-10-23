# Screen 01 — review

## Early look (Lead, 21 Oct, slice 1 screenshots `screenshots/slice1/`) — **Go, with these changes first**
Accepted: the builder's top-5 improvements (switcher, keyboard list, type-ahead pickers with inline Create, real ⌘K search) except the panel/sheet (P-50). Decisions on proposals: **P1** keep New combination as a page (it will hold the AI proposal; P-48 layouts follow the capability) · **P2** AI propose arrives with Screen 02 · **P3** add "Rules" to the menu when its page exists · **P4** superseded by P-49 ("Needs work") · **P5** next-step words accepted.

Apply before FINISH (founder's "Lead update", P-49, P-50):
1. **No side panel or sheet on Programs:** a row opens the combination page; its header shows the full path with every level clickable back to the filtered list; Back keeps pathway, filters, sort and scroll and highlights the opened row; "+ Add form" moves to the combination page.
2. **Filters:** Needs work (default: In setup, Not ready, and Live rows with something to do) · Live · All, with counts, plus Program; show "Ready" as **"Live"**; Status column sortable.
3. **Path never truncated in the middle:** two lines in the first cell — muted "Program › Category" above, the combination's own name in bold below; wrap, don't cut.
4. **Sentence-case column headers** (Combination · Status · Next step) — team rule (P-48).
5. **Samples:** Super visa is **one** combination, `Visitors › Super visa` (parent or grandparent is a condition, not a sub-category, P-35); demo combination names as in `SCREENS.md` "Demo combinations".
6. **Draft bar shorter:** "Draft · 44 changes not yet released" + "Review and release (44)".
7. **Combination page (now the row target), minimal clean-up until Screen 03 redesigns it:** no technical key on the main path (`individual.visitors.transit_visa`); remove the floating "AI for this combination…" button (one AI place = the next-step button, P-07); facts in one muted line.
8. **New-edition hold (P-32)** in the upload path: same form code, different edition → held as "New edition: impact review needed", never attached silently. Test it.
9. **One form intake (P-51):** every upload (combination sources, "+ Add form") goes through one intake service that accepts one **or many** files and returns a result per file: code, title, printed edition, published date, checksum, kind (form / checklist / guide) read from the file without AI; identical file → "already in the library"; same code, new edition → held (item 8); unreadable → held for a person. A new form enters the library and is attached to this combination; the library records "used by". Box mapping by AI runs only when the form is first used in a combination. The Forms library's own bulk "Add forms" (Screen 04) will reuse this service unchanged.
Then FINISH as written (tests per rule, states, axe and keyboard at 1440/1024, remove superseded files, drop react-virtual) → CHECK.

## Lead decisions at CHECK (21 Oct)
* **Accepted: the intake never edits a configuration.** An already-mapped form uploaded on a combination is attached and offered as the next step ("Add N forms from the library"), one click, no AI. Keeps a person in the loop (P-11, P-15) and draft counts honest.
* **Accepted: guides are sources, not library forms.** They attach to the combination (no edition to version) and are refused on the library-only door with that reason. Forms and checklists are library items.
* Builder's other choices (held editions kept out of `form_edition`; sample loader through the intake; `/summary` route) accepted.
