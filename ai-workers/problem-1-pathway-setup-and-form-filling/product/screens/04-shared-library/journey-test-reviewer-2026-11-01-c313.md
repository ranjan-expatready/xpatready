# Journey test, reviewer, 1 Nov 2026: C3.13 reused vs new (Screen 04 BR-4), commit c0006eb0

Copy: isolated `rev_c313` on :4449, sample inputs loaded, user-A (Configuration author). Headless Chromium (Playwright), driven only through what a person sees. My walk script and screenshots are in `/tmp/revc313/` (not committed). Builder suites rerun on fresh copies: 15/15 and 24/24.

## Journeys (persona: content publisher, unless noted)
1. **Main.** "How much of the LMIA combination is new to the library?" Sections → keyboard Tab to Combination → arrow to a combination → read the totals and the row pills. *Held:* the chooser is reached in 16 Tabs with a visible ring, the totals appear at once, and the URL keeps `?combination=`.
2. **Alternate.** Visitor visa reuses a section the LMIA uses. *Held:* "uses 1 section · 1 reused · 0 new here", pill Reused (builder suite, rerun).
3. **Empty.** Fields for Visitor visa. *Held:* "Visitor visa uses no fields yet" with a teaching line; axe clean.
4. **Error.** `?combination=no.such`. *Held:* an alert in words, the full list kept, the chooser back on All combinations; axe clean.
5. **Recovery.** Reload, then All combinations. *Held:* the choice survives reload; All restores the full list and clears the URL.
6. **Wrong role and no person** (API). No person gives 401, an unknown person 401, a studio reader 200.
7. **Sizes.** 400, 1024 and 1440 px, and 200 % zoom (720 CSS px at DPR 2), on all three pages. *Held:* no sideways scroll anywhere.
8. **Fields with a combination.** Totals against rows. **Broke:** "uses 185 fields · 185 new here" against "164 of 164" rows. The 21 extra are calculated facts, not library fields.
9. **Who brought it in (break-it).** Study permit adds a new document type, and LMIA adds the same type one second later. **Broke:** Study permit shows "Reused, Brought in by With an LMIA" and LMIA shows "New here", the reverse of what happened.
10. **Release flips the label (break-it).** Study permit then High-wage position each add the same new type, so Study permit is New. I re-saved Study permit's draft row exactly as release does (`studio.ts:809`). **Broke:** Study permit flipped to Reused (brought in by High-wage position) and High-wage to New, with no change to the item.

## Data underneath
Nothing is written by this read model. The reuse figures for Sections and Document types match `used_in` on the list routes. For Fields they include 21 keys that are not on the list (journey 8). The attribution depends on `updatedAt` (journeys 9 and 10).

## Findings
* **Major:** "brought in" is ranked by the combination that started first, not by when each combination took up the item (`library-sources.ts:58-67`).
* **Major:** the ordering uses `updatedAt`, so release and retire flip the labels.
* **Major:** the Fields totals count calculated facts that are not library fields.
* **Minor:** "Brought in by" is only a hover `title`, which keyboard and touch users cannot reach.
* **Minor:** the full list flashes before the filter applies.
* **Minor:** two requests per view instead of the contract's one.
* **Minor:** the suites cannot be rerun on the same copy.

Detail and fixes are in `review-c313.md`.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Choose a combination and read the totals and pills on all three lists |
| Next step obvious | ½ | The empty state says "set up this combination first" but gives no link to it |
| Plain words | 1 | "Reused", "New here", "uses 18 sections · 0 reused · 18 new here" |
| Feedback and state | ½ | Error alert is good; the full list flashes before the filter |
| Correct data | ½ | Sections and Document types are right on the sample; Fields totals are wrong; attribution is wrong in journeys 9 and 10 |
| Error recovery | 1 | Unknown combination in words; reload and All recover |
| Accessibility and screen sizes | ½ | axe clean, keyboard, 400/1024/200 % fit; "brought in by" cannot be reached by keyboard |
| Speed | 1 | First view 600 ms; reuse route 6–44 ms |
| Visual quality | 1 | Team Pill, Select and EmptyState; aligned |
| Trust and sources | ½ | The origin combination is named, but it can be wrong and is hover-only |
| **Total** | **7.5 / 10** | **Fail** (pass is 8 or more with no 0) |

Fixes that would raise it, most valuable first: rank per item with a time that never changes (Correct data, Trust); count only library fields in the Fields totals (Correct data); make "brought in by" readable without hover (Accessibility); hold the list until the reuse answer arrives (Feedback).

## Not tested
A real screen reader. A full two-person release through the UI (simulated by the same column update the release code makes, on my isolated database only). An intended user's unaided walk (D17 and D20 stay with the founder).
