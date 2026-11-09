# C7.3 answer sheet: journey test, reviewer role, round 2 (7 Nov 2026, PR #1075 at 7355f3055)

Skill journey-test, reviewer role: this is the one score for this check. Round 2 is a diff-only re-review (P-303) of
`a823f119e..7355f3055`. **No screen in this PR**, so the journeys were walked through the API the screen will call.
Skill steps 2 and 3 (visible browser, Playwright, axe, 400/1024/1440 px, keyboard) are n/a. Copy: `rv_c2` :4436 on the
local trial merge `/home/user/c2-trial` (7355f3055 + origin/main 9dc77d1ac, not pushed). It was reset, then
`configured` was loaded as user-A (78.0 s, `cost_usd: 0`, 5 combinations released, release 2 included). Stopped after;
live AI off, US$0, no priced button.

## Journeys (persona · goal · steps · expected → seen)
1. **Main, case officer:** "type the principal's Online form into the portal part by part". The release (row C1's
   `expectedFor`) gives IMM 5257 as Online, so no setup step. Read the sheet, confirm, tick the first part, change a
   fact. → Pack **13/13, exit 0**. Parts in the form's printed order: Personal details · National identity document ·
   US PR card · Contact information · Details of visit to Canada · Education · Employment · Background information ·
   Signature (first fields at 5, 109, 114, 117, 165, 182, 192, 219, 233 in the field list). The data paths' alphabet
   would give another order. Round-1 M1: held.
2. **Alternate, edit-named parts:** IMM 5257 SCH1 filed Online (C11.6, 200). Its parts were named by an **edit** before
   release 2, and all 7 show as named parts: Indicate whether you are · Full name · Date of birth and UCI · Military
   service · Membership or Association with Organizations · Government positions · Previous travel. There is **no
   "Other questions"**, so the long SCH1 paths land in their parts (M2 and m1: held). The "Signature" part of IMM 5257
   is also edit-named and shows.
3. **Empty:** before confirmation, only "still to confirm" shows (C7.3-4). Held.
4. **Error, stale tick:** wrong `version` gives 409: "The answers in "Indicate whether you are" changed since you read
   the sheet. Reload it, check them against the portal, then tick again." Held.
5. **Unnamed part, then named after the release:** IMM 5645's "Unnamed section 1" can be ticked (201,
   `part_70142da4`). A reviewer then names it on To review (user-C, edit). The released case keeps the same key, title
   and tick; it is not Out of date and nothing moves to "Other questions". Parts check **6/6, exit 0**. M3: held.
6. **Wrong role:** the client reads → 403 (C7.3-2, probe) and ticks → 403 (C7.3-8). Held.
7. **Recovery, double click:** 8 ticks at once gave one 201 and seven 200. Held.
8. **Across the boundary:** the pack takes its Online form from the case's own pinned release, not from /prepare.
   /prepare must then hold that item as Online (C7.3-1). An unreadable release stops the pack (exit 2), with no form
   number standing in for it. Held.

## Data underneath
The sheet reads proposals created by the time of `released_at`. A decision made after it counts as waiting, and an
edit made after it reads `work.beforeEdit`. Titles come from the snapshot's `sections` and `section_titles`. A decided
proposal cannot be decided again (`proposals.ts:796`). An undo is limited to 10 s and is refused once a second person
has approved, so a post-release undo cannot re-key a released part in practice.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Main path, the SCH1 edit-named path and the unnamed-then-named path all complete. |
| Next step obvious | 1 | The stale refusal says what to do. The unnamed-part refusal that led nowhere is gone (the tick now holds). |
| Plain words | ½ | The m4 words are better ("parts are not set up in this case's release"), but "Ask the Lead" names a project role, not a firm role (it is the API's existing phrase, 8 uses). |
| Feedback and state | 1 | 201 then 200, who and when, Out of date with the new value, 409 on a stale `version`. |
| Correct data | 1 | Printed order (M1), edit-named parts kept (M2), frozen at release (M3), long paths in their part (m1). |
| Error recovery | 1 | Reload words on a stale tick; a tick survives a later naming. |
| Accessibility and screen sizes | n/a | No screen in this PR. |
| Speed | 1 | Sheet 34 ms, Prepare 143 ms (budget 1 s). |
| Visual quality | n/a | No screen in this PR. |
| Trust and sources | 1 | Each answer carries its source. The `order_note` ("in the order the form prints its parts") is now true. |

**Score: 7½ of 8 applicable criteria (9.4 of 10 scaled). Pass** (8 or more scaled; no criterion at 0).
What would raise it: officer-facing words for the no-layout refusal instead of "Ask the Lead". This is a product-wide
phrase, so it belongs in a row of its own, not in this PR.

## Could not test
A visible-browser walk, axe, screen sizes and keyboard (no screen). A real screen reader. An intended user's unaided
walk (D17 and D20 stay with the founder). The real IRCC portal order (W6). The fixture copy (the builder's runs
only: setup 15/15, setup_vv_m3 44/46, C7.3 13/13 on IMM 5707, C7.7 33/33).
