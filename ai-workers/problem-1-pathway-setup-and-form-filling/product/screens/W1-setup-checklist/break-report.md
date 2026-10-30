# Break report: setup checklist card v4 (P-180) on Immigration programs

Stage CHECK, branch `claude/screens-card-aba78e` at 33c77518 (web build of 30 Oct 15:00, same as the source). Scope: concept-draft v4 §6–§7 (the card, the button map, the page around the cards) and §8 where the card reads it. Private copies only: `brk_card` on :4447 (sample data, then one combination retired through propose → approve → `pack/release`) and `brk_scale` on :4448 (`tests/fixtures/scale_100.ts`: 272 Retail + 121 Corporate combinations). Both are stopped. Live AI was off throughout, and no priced button was pressed. The machine's load average was 11–18 during every timing, so each timing was taken at least twice.

## Major

**M1. Every combination that has started shows "1 of 5 steps" when nothing is done.** Step 4 counts as done with 0 forms, 0 documents and 0 questions.
Steps: load the sample data, then `GET /api/catalogue?pathway=INDIVIDUAL` as user-A, or `POST /combinations/start {nodeKey:"individual.visitors.extend_stay"}`. Every In progress card reads "1 of 5 steps" and its edge bar fills part 1. Its steps are pages "todo", people "next", forms "todo · 0 forms", **questions_documents "done" · "0 documents · 0 questions"** and release "todo".
Expected (§4, 4a): done only when "every applicant role has at least one document line". The 3 applicant roles have none.
Cause: `api/src/programs.ts:215` sets `rolesWithout: docLines.length ? … : 0`, so no documents means 0 roles without documents. `engine/setup-checklist.ts:123` opens "Draft questions and documents" only when `forms.lines > 0`. So the card's one progress line over-reports on every In progress card. The bar's first part lights up as if Official pages (step 1) were done.

**M2. Choosing a Pathway that the person has folded shows an empty page.**
Steps: fold "Temporary residence" (or set `localStorage["xr-programs-fold:user-C"]='["retail.temporary_residence"]'`), then click the "Temporary residence 12" Pathway chip. Result: `?p=retail.temporary_residence`, 0 cards, one closed band. The stats line says 12 combinations.
Expected (§7): "A filter or search opens every section holding a match". Status, Program, Needs you and search all reopen sections, but the Pathway chip does not.
Cause: `web/src/pages/programs.tsx:159` builds `filtering` without `pathwayKey`, so `useFolds` (`:168`) keeps the saved folds.

**M3. The concept's speed budget is missed at scale** (§8: 150 combinations cold < 1.5 s, warm < 200 ms; STANDARDS §9: filter < 200 ms).
Steps: `brk_scale` with 393 combinations, restarted, then the first `GET /catalogue?pathway=INDIVIDUAL`.
Results:
- Server `timing_ms.rows`: 66.6 s on the first start and **14.4 s** on the second restart (and 29.5 s during the fixture run).
- Warm server time: 30–110 ms, which holds.
- Payload: **2.37 MB** for 272 cards, about 8.7 KB per card. Every row still carries the old `missing`, `nextAction`, `progress`, `forms` and `counts` alongside `setup`.
- Browser at 1440, measured 3 times: the Live chip takes **0.73–1.25 s** to filter and the first view takes 0.5–2.3 s.

Even allowing for the machine's load, cold time is about 10× the budget. The payload makes every filter click slow. The cache (one entry per combination) works when warm. Nothing measures the cold path at 150 combinations.

## Minor

- **m1. "need you" counts disagree inside one band** (programs.tsx:421, :581; api/src/programs.ts:308). With `?f=in_progress&n=1` as user-C, the band reads "Temporary residence · 3 shown · **4 need you**" and the page's Needs you chip says 4. With `?f=live`, the Needs you chip says 1 while the "All" Pathway chip says "5 need you". `sections[].needs` ignores the status filter and search, while `mineNeeds` (`:230`) follows them. §8 asks for one count.
- **m2. The API's `counts.needs` and `filter=needs` are not tied to the viewer.** `counts.needs` is 20 for user-A, user-B and user-C alike (it reads the old `leaf.needs`, api/src/programs.ts:274, :286), while the person's actual Needs you is 0 or 5. The page does not show it, but the response still holds a "needs" number that contradicts the card. `?f=needs` is still accepted and answers with the old "Needs work" set.
- **m3. "Retired at Release 1" names the wrong release.** The combination was Live in Release 1 and was retired by Release 2 (`pack/release` answered `pack: 2`), but the card reads "Retired at Release 1". `engine/setup-checklist.ts:172` uses the last release that held it, with `?? 1`, which invents "Release 1" when there is none.
- **m4. The List view's roving focus leaks.** Every "Start setup" button is its own Tab stop, while Resume setup and Open on inactive rows are tabindex −1. Tab after the first row walks through all 16 Start setup buttons. Cause: `StartSetupButton` gets no `tabIndex` (programs.tsx:476).
- **m5. Heading levels clash.** Program bands (`h3`, programs.tsx:429) and card names (`h3`, `:496`) share a level, so a screen reader's heading list mixes "Visitors" with "Visitor visa". axe passes.
- **m6. A Program from the other tab stays in the address.** With `?prog=corporate.lmia` on Retail, the server ignores it, but the URL keeps it, the Program select points at a value it does not have, every band says "· n shown" as if filtered, and no chip offers to clear it. `?p=` from the other tab is cleared correctly (`:211`), but `prog` is not.
- **m7. Just added clears more filters than needed.** At `?p=retail.temporary_residence&prog=individual.visitors&f=in_progress&q=visa`, adding a category under Visitors clears p, prog, f and q (programs.tsx:219). Only f and q hid the new card. The card does show in view, outlined for about 1.4 s and gone by 2.6 s (holds).
- **m8. "Open" does not open for a non-author on a Not started card.** As the immigration expert or the approver, the button says Open, but pressing it only shows the toast "… is not started yet. A configuration author starts it." (programs.tsx:190). The §7 word is right, but the action does nothing.
- **m9. The stats line keeps the typed spaces.** `?q=%20%20VISA%20%20` shows the chip as `" VISA "` and the empty state quotes the raw text. Matching trims and ignores case (holds).

## What held

- **Roles (§5, §7):** all 21 + 8 cards checked for each person. The author sees Start setup (16), Resume setup (4) and Open (1, Live). The immigration expert and the approver see Open on every card. Needs you shows only for the person whose item waits: the expert has 5 ("Confirm who can apply", including the Live one), and the author and the approver have 0. `/summary` gives the same bar, chip and viewer for all three. `POST /combinations/start` returns 403 for the approver and the expert.
- **Switching person in the same tab:** buttons, marks, chip counts and the `n=1` view change at once (A → C → B → A, with no stale cache). Folds and the Cards/List choice stay with each person, and the expert's fold does not reach the author.
- **Hostile `x-actor`:** missing, `nobody`, `<script>` and `"user-A, user-B"` get 401. The case officer and Client A get 403. A repeated header gets 401.
- **Odd query values:** bad `filter`, `sort`, `pathway` or repeated `filter` get a 400 with field errors. An unknown `pathwayKey`, `program` or `under` is ignored. `q` over 120 characters is cut. Hindi text and `<img onerror>` are shown as escaped text, with no script.
- **Address-bar filters:** p + prog + f + n + q combined, then reload, gives the same 2 cards with chips and Clear all. A bad `sort` falls back to path order.
- **Corrupt fold values** (`null`, `{}`, a string, `[1,2,null]`, `garbage{`, `true`, `1e999`, 5,000 keys): no crash, and unknown keys are ignored.
- **List view, Progress sort:** none → ascending (In progress, Not started, Live) → descending (Live first) → none, with `aria-sort` and the URL kept in step. The Pathway band sticks under the 56 px header without covering the column header.
- **Keyboard:** each card has two stops (the name and its one button). Back returns with `sel` and focus on the opened card.
- **axe** (WCAG 2.2 AA tags): 0 violations on Cards as the author and as the expert, on List, and on the Retired view.
- **Widths:** 4 columns at 1440, 3 at 1024, 2 at 800 and 1 at 375. No sideways scroll, no clipped card, and Needs you never overlaps the name. Button sizes are the same on every card.
- **Retired:** chip "Retired 1" shows only while one is retired. The card has no bar and an Open button, and is left out of All with "1 retired, not shown". The band's "n of m live" and the cards agree at every Program and Pathway level (sample and scale).
- **Concurrent Start setup:** 4 at once from the author return one combination (1 × 201, 3 × 200, same id), and the card becomes Resume setup at once (the cache is rebuilt).
- **Just added:** a name with doubled spaces and Chinese characters is cleaned and shown in place with the plain note.
