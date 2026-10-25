# Screen 02 — journey test (reviewer, CHECK, 25 Oct) · **5/10, fail**

Commit ea493c1, isolated copy `screens_rev` :4446. Headless Chrome (Playwright), driven by clicks and keys only, with axe WCAG 2.2 A/AA on every page and widths 1440, 1024 and 720 px (720 px stands in for 200 % zoom). Data was checked in PostgreSQL after each journey. The script and screenshots are in `/tmp/claude-0/-home-user-xpatready/1f334bc0-32ae-5e0b-9629-22309fa37d0a/scratchpad/j/` (outside the repo). AI cost US$0 (one saved answer replayed).

## Journeys (persona · goal · result)
1. **Author: "draft the Super visa forms and get them to review"**
   - Steps: Programs › Super visa → next step "Add 1 form" → next step "Draft setup" (a right panel with the cost line) → Start → progress done → To review "Review 84 AI proposals" → J/A keys, bulk reuse → Apply.
   - **Held up through apply.** Then a wrong turn: the 14 undecided form fields can be found only through Sources › "details" (12-missing.png gives a wrong next step).
2. **Author: "decide the form fields no shared field fills"**
   - Steps: Decide → Not a fact with a reason, 14 times.
   - Worked. A missing reason shows only as a toast (15-ff-noreason.png).
3. **Second person: "approve the new shared fields"**
   - Steps: To review shows 37 rows, one per field → page → Approve, with Return by keyboard.
   - Worked. 37 single-page approvals is heavy.
   - One field had a 64 % library match and no reason (BR-7 bypass through Accept).
4. **Second person returns a field; the author recovers.**
   - **Dead end:** the read-only page has no step (21-returned-A.png).
   - The combination is frozen.
5. **Approver: "release what is ready"**
   - To review says "Ready to release · Release" (24-review-B.png).
   - The release gives 409 "returned to the author" (25-release-attempt.png).
   - The shared Release page published the 36 approved fields as Release 2: correct.
6. **Uploader and second person: held file (P-80)**
   - The uploader's To review row has no step. The second person's row says "Needs you", but Approve is disabled (29-held-C.png).
   - Recorded the page by URL: a bad URL is refused with a plain message. Approval then worked, and the re-intake held the file as a new edition.
7. **Author: new edition impact (IMM 5476 2021 → 11-2025)**
   - Four counts, three tabs, "no AI, US$0", Accept → toast. The tabs can be reached with Tab.
   - No Undo. The ArrowRight key does nothing on the tabs.
   - After accept, 53 form fields are "left for a person" and appear nowhere.
8. **Error: an in-product-approved edition**
   - The impact page says "Only an approved official file is compared" (33-impact-approvedsource.png). The row is stuck.
9. **Wrong role**
   - A client actor (`user-P`) reads `/review-queue` (200, configuration rows).
   - A case officer is refused on writes (403, builder's test re-run).
10. **Break-it**
    - 3 parallel K1 decisions on one carried form field: 3 × 201, one draft row (safe).
    - A 5,000-character description and non-Latin text on Describe it: a plain "no match".
    - A quote in the queue search: fine.

## Data underneath
- Records exist once:
  - 36 RELEASED and 1 RETURNED `library_change`;
  - 37 fields (36 PUBLISHED, 1 DRAFT);
  - one `approved_source`;
  - the intake row moved HELD → DONE.
- Audit lines are written for every decision.
- Not right:
  - the RETURNED field blocks for good;
  - the BR-7 reason is empty on a close match.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Draft → release of the library works; the combination never releases after one return; the new edition does not close |
| Next step obvious | 0 | Four dead ends: K1 not linked, held-file uploader, returned field, "Release" offered but refused |
| Plain words | ½ | Model name and run id (05-draft-setup.png), keys in the advisory check, "checksum", raw form-field paths |
| Feedback and state | ½ | Toasts after every decision; no Undo; errors not at the field; replay batch titled "Live AI" |
| Correct data | ½ | Server claims are safe; the queue and the release disagree; BR-7 bypass; carried count raw |
| Error recovery | 0 | A returned field and an approved-source edition cannot be recovered |
| Accessibility and screen sizes | ½ | axe 0 violations; no sideways scroll at 1024 or 720 px on To review and impact; tabs without arrows; focus lost after A |
| Speed | 1 | Queue API 39–62 ms; pages under 1.1 s headless |
| Visual quality | 1 | Team look, aligned tables (07b-review-A-1024.png, 18-change-C.png) |
| Trust and sources | ½ | AI marked and US$0 shown; held file gives nothing to compare; advisory check by key |
| **Total** | **5/10** | **Fail (below 8, two zeros)** |

## What would raise it, most valuable first
1. Give a step for a returned field and for an approved-source edition (error recovery → 1).
2. Link the K1 decisions and the held-file page from To review and the problem text; use one gate for To review and release (next step → 1, correct data → 1).
3. Fix the BR-7 reason on Accept and the plain words in Draft setup and progress (plain words → 1).
4. Add Undo on accept, errors at the field, and focus kept after A (feedback and accessibility → 1).

## Not tested
- A real screen reader.
- A headed browser beside a person.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Live AI.
- The budget-limit state with a paid plan.
- Carrying maps from an edition that had real maps.
