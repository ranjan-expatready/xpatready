# Journey test (reviewer), PR #398 at 398c780f: Add pop-up when the structure list arrives late

Isolated copy `screens_s2` on :4444, headless Chrome (Playwright), 1440 px. The structure list GET is held 1.5 s, as on a slow
Mac nightly. US$0.

## Journeys (configuration author)
1. **Main path, new name typed early (no filter).** Immigration programs › Add combination. Type a new Pathway before the list
   arrives. Expected: the text stays and Program opens. **Held** (builder step; 138/138 in `check_w1_structure_browser`).
2. **Alternate, existing name typed early (no filter).** Type "Temporary residence", then a Program, then a new Category, then Add.
   Expected: the existing Pathway is used and the name is added under it. **Failed:** the Pathway is tagged New ("no exact match"),
   Program reads "(new, under a new name)", and Add returns 409 "already exists … choose it instead". Nothing is written; recovery
   is to retype or pick.
3. **Filtered page, different Pathway typed early.** `/?p=temporary_residence&prog=temporary_residence.visitors`. Type "Brand new
   pathway B", then a Category, then Add. Expected: the Program is cleared and the name is added under the new Pathway.
   **Failed (Blocker):** the screen shows "Brand new pathway B · Uses the existing pathway › Visitor programs". Add returns 201 and
   writes "Late seed cat B" under **Temporary residence**. The screen and the data disagree.
4. **Recovery: close and reopen with a prefill; Add and add another.** Expected: the reopened pop-up has a fresh prefill, and
   add-another keeps the levels above. **Held** (suite steps pass; the close-time clearing does not run while it stays open).
5. **Type switch Retail ↔ Corporate.** Expected: the fields reset. **Held** (code `:217`, suite steps).
6. **Boundary to Immigration programs.** Expected: the card appears after Add. **Held** for journey 1 (c1116 30/31; the one failure
   needs a LIVE AI flag and is unrelated).

## Data underneath
Journey 3: the POST body was `pathway:{key:"temporary_residence"}`, `program:{key:"temporary_residence.visitors"}`, and the 201
`trail` was "Retail › Temporary residence › Visitor programs › Late seed cat B". Journey 2: the 409 left nothing written.

## Break-it
Typing before the list arrives, combined with a filter prefill, is the break (journey 3). Double click and long text are not
affected by this diff.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1 holds; J2 refused, J3 lands in the wrong place |
| Next step obvious | ½ | J2 says "new, under a new name" for an existing pathway |
| Plain words | 1 | the 409 message is plain |
| Feedback and state | 0 | J3 "Uses the existing pathway" next to a name that does not exist |
| Correct data | 0 | J3 writes under a pathway other than the one shown |
| Error recovery | ½ | J2 can be recovered by retyping; J3 gives no signal |
| Accessibility and sizes | 1 | axe and 1024 px steps pass; no markup change |
| Speed | 1 | the seed runs when the list arrives; nothing added |
| Visual quality | 1 | unchanged |
| Trust and sources | 1 | the New / existing tag is the trust signal; covered under state |

**6.5 / 10, fail** (two criteria at 0).

Fixes, most valuable first:
* Merge as one path: the person's text and sel together from the first level they set; prefill only above it.
* Match kept text against the arrived options, as `typeIn` does.
* Add late-list steps for J2 and J3 that check the database.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); the Mac nightly itself.

---

# Round 2: eaeba3e1

Same set-up (screens_s2 on :4444, list GET held 1.5 s, 1440 px, US$0).

1. **New name typed early (no filter):** held.
2. **Existing name typed early (no filter):** **held.** "Uses the existing pathway"; Add sends the keys and gets 201; the category
   is under Visitor programs.
3. **Filtered page, different Pathway typed early:** **held.** Program is cleared and the typed label is sent with no key. The
   server's close-name 409 offers "add yours anyway" in plain words.
4. **Two levels typed early:** held. Both are matched, and focus goes to Category.
5. **Recovery, add-another, type switch, boundary:** held (suite 140/140; c1116 30/31, where the one failure is the LIVE flag).

**Break-it:** a person typing at the moment the list arrives ("Temporary res" | list | "idence"). Focus jumps to Program, which gets
"idence", and Pathway is "Temporary res" (New). Two wrong names would be added if this goes unnoticed (review M2).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1–J4 hold; the break-it splits the typed name |
| Next step obvious | 1 | New/existing tags and the preview are right |
| Plain words | 1 | unchanged |
| Feedback and state | ½ | focus moves without being asked |
| Correct data | ½ | right in J2/J3; the split word can write wrong names |
| Error recovery | 1 | the 409s explain and offer the way on |
| Accessibility and sizes | ½ | unexpected focus change (WCAG 3.2.2) |
| Speed | 1 | unchanged |
| Visual quality | 1 | unchanged |
| Trust and sources | 1 | the tag matches what is sent |

**8 / 10** (no zero). The pass is held back by Major M2 and by T1 (the tests do not prove the late list).
