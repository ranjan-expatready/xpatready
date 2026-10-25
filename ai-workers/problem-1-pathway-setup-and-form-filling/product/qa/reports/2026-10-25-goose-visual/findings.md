# Goose visual/accessibility/responsive pass — 25 Oct 2026 (main a21b15d)

Independent human-style tester (goose), fresh worktree on `origin/main` a21b15d, isolated app on :4470
(database `xr_studio_goosetest`, sample inputs loaded). 14 routes walked. Method: Playwright headed-equivalent —
axe WCAG scan, horizontal-overflow measurement at 1440/1024/400 px, and full visible-text copy review.
No vision model in this session, so pixel aesthetics are judged indirectly via DOM metrics + copy; findings are objective.

## Verdict
Accessibility fundamentals are strong (axe clean on every route). The systematic gap is **responsiveness of data
tables on narrow screens**, plus a handful of copy/jargon inconsistencies.

## Findings (priority order)

### 1. Data tables are not responsive (Major · UX · systematic)
Every data table runs far wider than a phone viewport and relies on an `overflow-x-auto` wrapper, so on mobile the
author must horizontally scroll ~1.4–2.3× the screen to read columns. Measured table widths at a 400 px viewport:
- Library · Fields: **909 px** (and its table still overflows at 1024 px → 1158 px)
- Library · Forms: **704 px**
- Library · Document types: **649 px**
- Library · Sections: **569 px**
- Combination "Forms" table: **622 px** (LMIA), **511 px** (Visitor visa)
- Releases: **586 px** · Activity: **494 px**
No card/stacked/column-priority mobile layout. A firm admin on a phone cannot scan these. Affects: `/library/*`,
`/c/:id` (Forms tab), `/releases`, `/activity`.

### 2. Combination tab row overflows at 400 px (Minor · UX)
`Preview` and `Review and release` tabs use `whitespace-nowrap` and extend to ~455 px and ~611 px; at 400 px the
row does not wrap (no page scroll — the right tab is pushed out of the visible row).

### 3. Combination "Configuration" page-level horizontal overflow at 400 px (Minor · UX)
`/c/…/configuration` has +22 px document overflow at 400 px (the "Checks (64)" button + table). At 720 px
(200%-zoom equivalent) it is clean, so this only bites very narrow screens.

### 4. Jargon in the combination subtitle (Minor · copy) — SC-5 still present
`/c/…` (LMIA, live): "… · **source-backed**" — an internal term a firm administrator will not understand.
Also "**cases opened outside Canada**" appears on both the Visitor visa and LMIA subtitles — cryptic to a first-time user.

### 5. Contradictory status words (Minor · copy) — SC-4 still present
Visitor visa (in setup): header "Missing before firms can use it (2) · 2 forms attached as sources, 0 set up"
vs the Forms table "**Filing: No forms yet**". "No forms yet" is wrong next to "2 forms attached"; the user sees
two attached forms and is told there are none.

### 6. Inconsistent timestamp formats (Minor · copy)
Combination "Recent steps" shows "today 5:03 p.m." while `/activity` shows "10/25/2026, 5:04:05 PM". Same event,
two formats. Pick one (and localise the "today"/"p.m." style consistently).

## What passed (positive)
- **axe (WCAG 2.x A/AA) clean on all 14 routes** — no colour-contrast, ARIA, heading or landmark violations.
- **Programs catalogue** and **Cases** pages are fully responsive (0 overflow at 1440/1024/400 px).
- **Focus visibility** is implemented via `focus-visible:ring-[3px]` (observed on tables/inputs); tab order is sensible
  (brand → Demo → person → nav → content).
- Plain-words empty states and "Next step" guidance on the combination page are good (best-in-class benchmark met).
- Honest scaffolding labels ("Sample portals until the immigration expert confirms…", "Sample (illustrative)").

## Evidence
Screenshots: `qa/reports/2026-10-25-goose-visual/*.png` (15)
Machine scan: `qa/reports/2026-10-25-goose-visual/scan.json` (axe + overflow per route)
Commit tested: `a21b15d` (origin/main). No app code changed; read-only on an isolated DB.

## What I could not test this session
- Literal pixel-level aesthetics (spacing, colour harmony, typography) — this model has no vision; the screenshots are
  saved for a vision-capable reviewer (or the founder's eye).
- 200%-zoom text reflow beyond the 720 px width check above.

---

# Addendum 2 — PR #27 browser-extension retest (main 2169ec3, merged 25 Oct)

The forms F2 browser extension merged (PR #27). Retested the **full functional journey** on the merged main:
- Studio page `/extension` (walked + screenshot): "Get a code" (one-time, mode + countdown), the person's sessions
  with Disconnect, and the "Re-capture needed" table for the review duty. Copy is honest ("It never submits",
  "Sample … until the immigration expert", "Unconfirmed: no counsel").
- API flow (probed): author pairs (capture-mode code) → code exchanged for a token-only session (correct Origin +
  fixed extension id) → session listed. A person without capture/case duty is refused 403 with a plain-words reason.
- **`tests/check_forms_f2d.ts` runs 37/37 on the merged head** — the full journey: manifest checks (XT-7), extension
  loads with its fixed id, axe clean on every panel state + the Studio page, author connects by keyboard, capture
  lists every text before sending (typed answers never among them), client-detail screen refused, second person
  approves → release files it; officer fills from confirmed facts ("Filled 6 of 9 · 3 need you") with sources in
  words, plan dropped on tab move, a refused value marked, submit never ran, a changed screen fills nothing and opens
  "Re-capture needed" (Studio lists it), re-capture approved closes the task, new case fills the re-captured screen.

**Verdict: the extension passes end to end. No new functional findings.** (One incidental 401 console line during the
disconnect step is the expected token-expiry path, not a defect.)

Setup note for anyone re-running: after a pull that adds a Prisma model, run `prisma generate` before
`isolated.sh restart` — `isolated.sh` migrates but does not regenerate the client (the stale client is what produced
a transient 500 on the pairing route until regenerated).
