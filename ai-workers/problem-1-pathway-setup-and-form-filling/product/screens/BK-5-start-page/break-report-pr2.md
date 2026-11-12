# BK-5 PR 2 break report (sign-in → Starting points; the disabled doors link to sign-in)

Breaker, 12 Nov 2026. PR #1628 at exact commit 45009b714. Isolated copy `brk_bk5p2` on :4483 (fresh database; the six loaded by API for the "programs exist" runs), stopped afterwards. Playwright + Chromium, plus curl with `x-actor`. Scope: concept §9 "BK-5 PR 2" and challenge m4 only: `web/src/pages/sign-in.tsx:23` (where a card lands) and `web/src/pages/start.tsx:98` (the disabled state's link). The Demo menu's other items are Not built (concept §8) and are not findings here.

**Verdict: no Blocker, no Major. 3 Minor (one predates this PR).** The person changes only at the sign-in card, and each change gives exactly one "Now: …" notice. Nobody gets stranded or bounced by the new landing or the new link.

## Findings

### m1 (Minor): in a workspace that is not the demo, the author still lands on a page where nothing can be done
* **Steps:** intercept `GET /api/session` so it returns `workspace.demo: false` (Playwright `ctx.route`). Store `xr-actor=user-B`. On `/sign-in`, click "Configuration author".
* **Expected:** challenge m4's reasoning ("a stop with nothing to do") and the comment at `sign-in.tsx:21-22` ("never on doors they cannot open (BR-3)") point to `/`, where the author's work is.
* **Actual:** the author lands on `/start`. All three doors are disabled, the "Not the demo" notice has no action (`start.tsx:98`, `demo && authorPerson`), and with programs present ("Another state") there is no Continue link either. The page has 0 enabled buttons or links; the menu is the only way out. Measured at 1440 and 375 px.
* **Where:** `sign-in.tsx:23` decides only on `p.duties.includes("author")` and never reads `workspace.demo`. The concept §9 row says "author → /start" with no exception, so this is a gap in the rule more than a deviation from it. Evidence: scratchpad `nondemo-other-1440.png`, `nondemo-author-start-1440.png`.

### m2 (Minor): at 375 px the disabled-state notice squeezes its text into a 74 px column
* **Steps:** at 375×800, as the Approver, open `/start`.
* **Expected:** the notice reads as a normal paragraph. EXPERIENCE: nothing cramped at phone width.
* **Actual:** the link "Sign in as the Configuration author" takes 225 px of the notice's row. The title and the line "Approver (simulated) can look, not start. …" wrap to one or two words per line: text box 74×197 px. At 512 px (200 % of 1024) it is 203 px wide; at 1024 px, 476 px. There is no sideways scroll, and axe finds nothing (wcag2a/aa, 21aa, 22aa) at 375, 512 and 1024.
* **Where:** `start.tsx:98` puts the link in `Notice action`. PR 1's button had the same text and width, so this is carried over, not new. Evidence: scratchpad `start-B-375.png`.

### m3 (Minor, predates this PR, BK-4a's `lib/api.ts:10-12`): another tab's sign-in changes this tab's person on reload, with no notice
* **Steps:** in one browser profile, tab 1 sits on `/start` as the Approver. In tab 2, `/sign-in` → Configuration author: tab 2 shows one notice and lands on `/start`. Back in tab 1 it is still the Approver (the picker and `x-actor` say user-B; consistent within the tab). Reload tab 1.
* **Expected (BK-4 BR-1; PR 2's "Done when": 0 person changes outside BR-1):** a change of person comes only from a listed place and is named once.
* **Actual:** after the reload, tab 1 is the Configuration author. The doors are enabled and no "Now: …" notice appears: `actor` is read from `localStorage` at module load, and only `setActor` triggers the notice. Also, if tab 1 instead follows the new link to `/sign-in`, the Approver card is marked "signed in now" while storage already holds user-A. Picking the author then gives one notice (correct for that tab).
* **Note:** the same thing happens on any page since BK-4a. PR 2 neither adds nor removes it. It is listed because the brief asks whether any path changes the person without the notice.

## What held (each tried; result)
* **Every card** (9, with "More people" opened, stored person = Approver): Configuration author → `/start` (H1 "Starting points"). Content reviewer and Approver → `/` (Immigration programs). Case officer, Representative, Second representative and Solo representative → `/cases`. Client A and Client B → `/cases` (the client notice, per BK-4 Q3). Each change gave exactly 1 notice, read from the DOM 100 ms, 400 ms and 1.5 s after the click.
* **Back/Forward after signing in** (`/` → `/sign-in` → author → `/start`): Back → `/sign-in`, Back → `/`, Forward ×2 → `/start`. `xr-actor` stayed user-A throughout, with no new notice.
* **Signing in again as the same person:** the card says "(signed in now)". Clicking it → `/start`, no notice, no query reset (`setActor`'s `changed` is false). A browser with no stored person (the default author) → `/start` with no notice: correct, no change happened.
* **The link from /start's disabled state:**
  * It is an `<a href="/sign-in">` and changes nobody (no notice, `xr-actor` unchanged).
  * Approver: picks the author → `/start` with all 3 doors enabled, one notice, 0 POSTs. Picks themselves again → `/`. Back → `/sign-in` → `/start`; nobody is bounced.
  * Content reviewer: the same results. Their own card is under "More people", which is BK-4a's layout.
  * Case officer, Representative and Client A on `/start`: they get "This page is for the configuration people" with "Open your cases". There is no doors link and nobody is stranded.
* **Unknown stored person** (`xr-actor=user-Z`) opening `/start`: sent to `/sign-in?unknown=1` with the "Choose who you are" notice and 0 POSTs. Picking the author → `/start` + 1 notice. Back → `/sign-in?unknown=1`, with no unknown notice now (break m3 of BK-4a).
* **Double click** on the author, Approver and Case officer cards at 1440 and 375, on both an empty workspace and the six: one notice, one landing, and the second click hits plain text. No dialog opened and 0 POST/PUT/DELETE.
* **Keyboard only** (1440 and 375): Tab reaches the link (19 Tabs at 1440, 7 at 375), Enter → `/sign-in`, 1 Tab reaches the author card, Enter → `/start` with 1 notice. Space on the Approver card → `/`. No sideways scroll at 375 on either page.
* **Two tabs, no reload:** tab 1 keeps acting as the Approver (doors disabled, `x-actor` user-B), so no request is sent as someone the tab does not show.
* **API by role** (`x-actor`): `POST /demo/reset` as user-B, C, O and P → 403 "… does not hold the author duty". As user-Z or with no header → 401 "Choose a simulated person first". `GET /session` as user-Z → 401. The server refuses whatever the page shows.
* **Person changes outside BK-4 BR-1:** the PR removes the old `setActor` import and call from `start.tsx`. A search of `web/src` finds `setActor` only at the sign-in card, the picker, the frame links, the hand-offs and `runtime/cases.tsx`. Every path I tried changed the person only there, with one notice each (except m3's reload).

Evidence: screenshots and scripts in this session's scratchpad (`…/scratchpad/brk/`, not committed); the copy's log is at `prototype/studio/var/isolated-logs/brk_bk5p2-api.log`.
