# QA-172 review — the author's Smart questionnaire (SQR) tab: section titles and short names (PR #722)

Reviewer (did not build it), 3 Nov, on exact commit **b0544c4e7** (base origin/main 762dbae6). My own worktree of b0544c4e7 with a fresh `web/dist` built from it (bundle `index-CabEH4Wl.js`, the one served), isolated copy `rev_qa172` on :4448 (never :4400, no `STUDIO_*_LIVE`, US$0). The shared tree was being switched between branches by another session while I worked, so nothing was run from it. No `concept.md` for this item: judged against the `qa/BUGS.md` row QA-172, QA-82 (#469) and `PRODUCT.md` §4. The journey-test report is the section below (the lead asked for this one file only).

**Verdict: Approve** (no Blocker, no Major). Two Minors to fix in this PR or list in it (m1 takes one line).

## What I ran
* `tests/check_qa172_plain_titles_browser.cjs 4448 xr_studio_rev_qa172`: **8/8 twice**, each on a fresh copy (26 s).
* Remove-the-rule check: without `?? libraryTitles.get(part.section)` (questionnaires.ts:77) and with `f.label` back at questionnaires.tsx:538, **5 of 8 fail** (API key, page heading, short name, no meaning, 1024 heading). Both rules have failing tests. Restored afterwards.
* `check_c41_questionnaire_roles.ts` 9/9 (QA-82: Preview and the client keep the meaning) · `check_g1_source_register.ts` 53/53 (factName through the render.ts re-export) · web `tsc` clean; api `tsc` reports errors only in older `tests/` files, none in the changed files.
* Graph (`graph.mjs`, in my worktree): nothing for this item. `engine/fact-name.ts` is imported by both sides; no new route; C4.1 (6) and C11.12 (34) are named by tests.

## Points weighed
1. **Library-title fallback: wrong title in two reachable states (m1).** `api/src/workspace.ts:118` reads sections with `status: { not: "RETIRED" }` (right for the "Add a library section" picker) and `:127` builds `libraryTitles` from that same list. A section with placed questions can be retired: the library says "Questions are placed in it: it can be retired, not deleted" (library-items.ts:99), and IMM 5476 still reads `organisation.name`. Seen on :4448 (approval's effect applied to the row):
   * `intended_work` v1 RETIRED → heading **`intended_work`** again, after reload too (the QA-172 bug back; screenshot `…/rev172/shots/brk-3-retired.png`).
   * renamed then retired (v1 SUPERSEDED "Intended work in Canada", v2 RETIRED "Work you will do in Canada") → heading shows the **superseded old title**.
   * The control holds: renamed and published → the new title. A pending DRAFT rename shows the draft title, the same as the draft snapshot does for chosen sections. That is consistent.
   Fix: take titles from every version, newest first, whatever the status (as `library-sources.ts:173/256` do), and add a fail case "retired section keeps its title, never its key".
2. **Short name and information loss: acceptable.** In 164 library keys no two share a last segment, so `factName` never gives two rows the same name. The meaning is still one click away. For a placed question it appears as "Meaning: …" in Details. For an "Answered without a question" row it is the drawer's **title** (m2). "Name" for `organisation.name` (the IMM 5476 row) is vague, but that is QA-82's rule (#469, questionnaires.ts:82), not new here, and Details says "Legal or operating name of an organisation…".
3. **The factName move changes no output.** The `ABBREVIATIONS`, `PROPER` and `factName` lines in `engine/fact-name.ts` are byte-identical to main's render.ts (diffed). render.ts re-exports the function and keeps no other use of either constant. source-register 53/53 and c41 9/9 pass. It also removes a web/API duplication risk (STANDARDS §7).
4. **Other raw keys and meanings on the author's pages** (I looked and am reporting them here; this PR does not need to fix them):
   * Same tab, "Only if" column: "Only if required when **person.alternate_telephone_number** is answered", and the same for `person.current_residence_status`, `person.applying_from_status`, `case.visit_purpose` (4 rows). The text is stored `condition_plain`, shown at questionnaires.ts:83. `source-register.ts:97-100` already swaps keys for short names. Not in BUGS.
   * Preview tab: the section heading reads **`intended_work`** (`…/shots/preview-intended-work.png`). Cause: `engine/render.ts:241` `section_title: sectionTitle.get(p.section_id) ?? p.section_id`. It is the same fallback behind QA-167 on the officer's page. Not in BUGS.
   * Review and release: "Questions · Legal or operating name of an organisation (here the prospective employer): Placed in section intended_work, which this combination's questionnaire does not use." This shows the meaning as the label and the raw key (`engine/validate.ts:85`; already QA-133). The changes table on the same tab shows `organisation.name` and `IMPORTED_RELEASE` (`…/shots/review-intended-work.png`).
   * Same tab, copy: the "Answered without a question" header says "read from a document or entered by the case officer", while its only row (Has children) says Comes from **Client** (questionnaires.tsx:535). This was already there before this PR.
5. **QA-152's remaining half → runtime: agree, with one note.** The open part is on the officer's side: the representative's firm name is asked per applicant under employer words and filled from a placement instead of the firm record (#357 fills the rest of the block). That belongs to runtime, which owns the row. The note: two things sit outside runtime's files. (a) The cause is the library placement and field map (`organisation.name` placed in `intended_work` with an "employer" meaning, IMM 5476 boxes mapped to the representative), so the forms lane or the library owner may need to change it. (b) QA-167's raw key comes from the shared `render.ts:241` fallback. One engine fix (the render view carries library titles) would close the Preview key, QA-167 and this PR's local patch together. That fix belongs to whoever owns `engine/render.ts`. It is not a reason to hold this PR.

## Issues
| # | Sev | Where | Failing scenario | Fix |
|---|---|---|---|---|
| m1 | Minor (Should) | api/src/workspace.ts:118, :127 | Shared library › Sections › retire "Intended work in Canada" (approved) → Visitor visa › SQR shows heading `intended_work`; renamed-then-retired shows the old title | Build `libraryTitles` from all versions, newest first, any status; add the retired fail case to the test |
| m2 | Minor (Should) | web/src/pages/workspace/sources.tsx:159, :181, :195 | Click "Has children" (Answered without a question) → Details opens titled "Whether the person has any children (natural, adopted or step), derived from…" and has no "Meaning:" line; saving says `"Whether the person…" saved for this combination` (`…/shots/a-drawer-has-children.png`). The row and its details use different names | When `q` is null, title = `factName(fact)` and show `f.label` as "Meaning:" (as a placed question does) |
| obs | (not this PR) | see point 4; QA-123 | Closing Details (Escape) drops focus to `<body>`, on both kinds of row (WCAG 2.4.3, already QA-123) | — |

## D1–D20 (1–5)
D1 4: both halves of the row are fixed on the named tab; m1 is the gap · D2 5: read path only, no writes changed · D3 5: one `factName` for the web and the engine · D4 4: not touched, the question is still asked · D5 4: stable after reload, 8/8 twice; a retired section brings the key back · D6 4: not touched · D7 n/a (no AI) · D8 4: section now named in words; Preview still shows the key · D9 4: unchanged · D10 3: two labels fixed; the same tab still shows 4 field keys under "Only if" · D11 4: read-only change; the save toast uses the meaning (m2) · D12 4: a long French title wraps cleanly at 1024 (`brk-2-long-french.png`) · D13 3: axe 0 at 1440; no sideways scroll at 400, 1024 and 512 (1024 at 200 %); keyboard path works; focus is lost after close (QA-123) · D14 4: team components · D15 4: API 0.18–0.30 s; titles come from the query already made, no per-row request · D16 4: pass and fail per rule, mutation-checked; no retired or renamed case · D17 simulated only · D18 4: the meaning stays in Details; drawer title mismatch (m2) · D19 3: the officer's half is still open (QA-152, QA-167) · D20 simulated only.
Retrofit mapping: none needed (no schema, contract or team-model change); `qa/built/QA-172.md` records the fix.

## Journey test (reviewer, 3 Nov) — persona: content publisher (user-A); approver read checked
| # | Goal in their words | Result |
|---|---|---|
| J1 main | "Where does IMM 5476's firm-name question sit?" Visitor visa › SQR, open all sections | Held: "Intended work in Canada · 1 question", row "Name · No question written yet" |
| J2 alternate | Switch to Spouse or partner, then Dependent child | Held: no key in any heading; "Has children" under Answered without a question for the spouse |
| J3 details | Open "Has children" | Meaning present, but as the drawer title (m2) |
| J4 keyboard | Tab to the section (105 tabs), Enter, Tab to "Details of: Name", Enter, Escape | Works; focus drops to body (QA-123) |
| J5 sizes | 1440, 1024, 512 (200 %), 400 | No sideways scroll; axe 0 |
| J6 error | Library retires the section | Raw key `intended_work` returns (m1) |
| J7 edge | Section renamed, then retired | Superseded title shown (m1) |
| J8 recovery | Reload; long non-English title | Stable; wraps |
| J9 wrong role | Approver and reviewer read the view (200); no actor (401) | Held; the server enforces it |
| J10 boundary | Preview, then Review and release | Preview heading `intended_work`; Review shows key and meaning (point 4) |
Data underneath: read-only screen; the `logical_section` rows changed only by my break steps, then restored; nothing else written.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 |
| Next step obvious | 1 | Details › "Change in the library…" offered |
| Plain words | ½ | "Only if … person.alternate_telephone_number" on the same tab; Preview key |
| Feedback and state | 1 | Read-only; reload keeps the state |
| Correct data | ½ | Retired section shows the key; old version's title (m1) |
| Error recovery | ½ | No way back to a title once retired (m1) |
| Accessibility and sizes | ½ | axe 0, every width fine; focus lost after Details (QA-123) |
| Speed | 1 | First section 1.0 s including setup navigation; API ≤ 0.3 s |
| Visual quality | 1 | `a-questionnaires-1440.png`, `brk-2-long-french.png` |
| Trust and sources | ½ | Meaning kept, but as the drawer title for unasked rows (m2) |
| **Total** | **7.5 / 10** | **Below pass (8).** Fixing m1 and m2 raises it to 9. The other two ½ (keys under "Only if", QA-123) were already there before this PR |

Not checked: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the retire through the real two-person approval (I applied its effect to the row directly on my copy); Safari or Firefox.
Screenshots (not committed): `/tmp/claude-0/-home-user-xpatready/9b94cd17-2d4a-57e5-947f-5401998bbe17/scratchpad/rev172/shots/`.

## Re-review — diff b0544c4e7..0fab07310 (3 Nov)
How I ran it: my own detached worktree of 0fab07310, `web/dist` built from it (`index-30DV8a2H.js`), copy `rev_qa172` on :4448, US$0. The changed files type-check cleanly.
* **m1 fixed.** `api/src/workspace.ts:129` reads every `logical_section` version, newest first, any status (one extra query per view, not one per row). On :4448:
  * retired v1 → "Intended work in Canada";
  * renamed then retired (v1 SUPERSEDED, v2 RETIRED) → the newest title, "Work you will do in Canada" (no longer the superseded one);
  * restored → the title.
  Remove-the-rule check: with the old filtered list back, the new step fails (`{"title":"intended_work"}`, 9/10).
* **m2 fixed.** `sources.tsx:162-163, :199`: when there is no question, the drawer title is `factName(f.fact)` and the meaning moves to "Meaning:". "Has children" now opens a drawer titled "Has children" with one "Meaning: Whether the person has any children…" line. The placed "Name" drawer still has exactly one Meaning line. axe on both drawers: no violations. The save message uses the same `title` (:185), so it now quotes the short name. `FactDrawer` has one caller (questionnaires.tsx:545), so no other page changes. Remove-the-rule check: with the old title and meaning back, the check stops at the `[data-fact-meaning]` wait (exit 1). It fails, but as a stopped check, not a FAIL line.
* `check_qa172_plain_titles_browser.cjs`: **10/10 twice**, each on a fresh copy.
* Nits, no action needed: `drawerText` just repeats `drawerTitle` (test :55). The m2 step could check for the Meaning line with `count()` so that removing the rule prints a FAIL line instead of a timeout.
* New observation (already there before this PR, outside this diff, not in BUGS): on a renamed-then-retired section, "Add a library section…" offers it again under its old title. The cause is `api/src/workspace.ts:118-120`: the `available` list drops only RETIRED rows, so the SUPERSEDED v1 still qualifies. Seen on :4448 (`available` includes `intended_work`). This belongs to the C4.1 or library owner.
* Journey score updated: correct data 1, error recovery 1, trust and sources 1 → **9 / 10, pass**. The remaining ½ points are the keys under "Only if" and QA-123's focus loss, both there before this PR.

**Re-review verdict: Approve** at 0fab07310. No Blocker, Major or open Minor from this review.
