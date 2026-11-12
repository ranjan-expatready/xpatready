# BK-4a break report: sign in by role, one person picker (PR #1580)

Breaker (P-278), 11 Nov 2026, on `claude/screens-bk4a-picker` at **6de01ae84**, against the isolated copy on **:4443** (database `xr_studio_screens_bk4b`, configured checkpoint, one case `SAMPLE-VV-FAMILY-1`). Scope: the concept's 4a parts (`concept.md` rev 2 on `b53d739b1`: §3, §5 sign-in and picker, BR-1, BR-5, BR-6, BR-8; P-484). 4b and 4c hand-offs are not checked. Live AI off, no priced button, US$0. Playwright (Chromium, Linux), curl for the API. Code check `tests/check_bk4a.ts`: 21/21 pass. Paths are under `prototype/studio/web/src/`.

**Verdict: 0 Blocker · 2 Major · 7 Minor.** Unknown and tampered people, deny by default, BR-8's notice, and Ctrl-click are solid. Both Majors are ways to change the person that BR-1 does not allow.

## Major

**M1 · A Studio person on BR-8's notice page who clicks "Product Studio →" becomes the Configuration author. The link does not name that person.**
Steps: sign in as the Approver (or Content reviewer). Open the case area: Demo menu "Open the case area", a typed `/cases/<id>`, or Back. "Cases are worked by the firm" appears (correct). Click the where-line's **"Product Studio →"**.
Expected: the Approver returns to the Studio as the Approver. If the link changes the person, it names them ("Product Studio (as Configuration author) →", concept §5; BR-1).
Actual: `xr-actor` goes from `user-B` to `user-A`. The Studio opens as the Configuration author, and the notice "Now: Configuration author" is the only sign. The Approver now lacks the approve duty, with no named control used.
Cause: `components/frame.tsx:55` drops "(as …)" for any Studio person (`isStudioPerson(me)`), but the click still calls `leaveCasesAsStudio`, which always sets `STUDIO_AUTHOR` (`frame.tsx:21-24`, `:74`). The check misses it because it counts `setActor(` sites, not who a helper sets compared with what its label says.

**M2 · Keyboard: one arrow key on the person picker changes the person and moves to another area.**
Steps: as the Approver on `/`, Tab to "Simulated person" and press ArrowDown once.
Expected: the keyboard can move through the options and confirm one. The concept calls the native select "keyboard-complete".
Actual: ArrowDown on the closed select fires `change` at once (Chromium and Firefox on Windows/Linux). The person becomes the Case officer, the page jumps to `/cases`, the notice shows, and focus falls to `<body>`. As Client B, one ArrowDown opens the sign-in page. Reaching the 5th person takes 4 person changes, 4 notices and up to 4 area moves. This fails WCAG 3.2.2 On Input (a change of context on selection). Cause: `frame.tsx:144` `onChange={(e) => pick(...)}` with `nav(...)` at `:139`. (On macOS the arrow opens the list, so the founder's Mac may not show it.)

## Minor

**m1 · A browser with no stored person that first loads a case address misses the notice, and its next change to the Configuration author is silent.** Fresh browser, open `/cases` or `/cases/<id>/questionnaire`: it becomes the Case officer silently (allowed, first person). Then click "Product Studio (as Configuration author) →", or pick Configuration author: `xr-actor` = `user-A`, no "Now:" notice (BR-1: every change, one notice). Cause: the switch runs in `runtime/cases.tsx:55`'s layout effect before `PersonNotice` subscribes (`lib/api.ts:18` subscribes in `useEffect`). So `last` at `frame.tsx:163` stays `user-A`, and a later change to `user-A` looks like no change. Coming from the Studio by the Demo menu, it works (the notice shows).

**m2 · Another tab's choice takes over this tab on reload, with no notice.** Tab 1 is the Approver. Tab 2 picks Client A. Tab 1 keeps acting as the Approver (its requests send `x-actor: user-B`, which is consistent). After a reload, tab 1 is Client A with no notice, now on "This page is for the configuration people". One `xr-actor` per browser is by design (BR-7); the silent change on reload is not covered by BR-1.

**m3 · "The person this browser remembered is not in this workspace" shows for a known person.** `xr-actor=user-Z`, open `/review` → `/sign-in?unknown=1` (correct). Pick the Approver → `/`. Press Back: the warning shows again, though the Approver is known. Cause: `pages/sign-in.tsx:33` trusts `?unknown=1` from the address alone.

**m4 · At 375 px the picker shows a cut-off "Appr…", not the name.** Concept §5: "below 640 px the name only". In the Studio the select is 62 px wide and shows "Name · role" cut to 4 letters ("Appr…", "Conf…", "Cont…", "Clie…" for both clients). In the case area it shows "Approver · Content publi…". At every width the select is 17 px tall (WCAG 2.5.8 asks for 24 px; a click on the wrapping label does not open it).

**m5 · BR-8's notice wording is wrong for the Approver and the Content reviewer.** `runtime/cases.tsx:87` gives "Approver (simulated) sets up pathways in Product Studio". The Approver releases, and the reviewer signs. Concept §7: "The Configuration author sets up pathways; a firm person opens and works cases."

**m6 · A person change the code check does not see: "Open a case on Release 6" (combination page).** As the Approver, the button (`pages/combination.tsx:116`, `actAsCaseStaff`) changes the person to the Case officer. It does not name the person, and only the notice tells. `check_bk4a.ts` (3) says nothing else changes a person, but it counts only literal `setActor(` and does not list helper call sites. 4b adds a named echo and keeps this one (concept §5). Either name the person here or list the helper's callers in the check.

**m7 · The picker can leave a person on a page the server refuses.** Client A on their own questionnaire picks Client B: the page stays and says "This questionnaire is not available to you · No such case". `frame.tsx:136-139` only moves between the Studio and the rest, so a change from client to client (or from the Case officer to Client A on a staff case page) keeps an address the new person cannot use. This conflicts with BR-5's "nothing shown that the server would refuse". Their home `/cases` would be a safe place to land.

Outside 4a (for 4c, no count): Ctrl-click on "Open it as Client A (simulated)" (`runtime/cases.tsx:223`, no `plainClick`) opens the new tab **and** makes this tab Client A, with a notice. Concept m2 asked for `plainClick` there. Also outside 4a: the case page's people table makes the page scroll sideways at 375 px (525 px) and at 200 % (180 px).

## What held
* **BR-6, tampered values:** I tried 11 stored values: none, `user-Z`, `""`, `approver` (a persona the server accepts), JSON `{"id":"user-B"}`, `" user-B"`, `USER-B`, `null`, `undefined`, `用户`, and `a\nb`. I opened each on `/`, `/cases`, `/cases/<id>/questionnaire`, `/review`, `/release`, `/c/<id>/review` and `/sign-in`. Every unknown value goes to `/sign-in?unknown=1` with "Choose who you are", sends no API request carrying the bad header, and gives no console error. No value crashes `fetch`, the non-Latin and newline values included. `/link` and `/inbox` are not affected. With no stored person, the Studio opens as the Configuration author and a case address as the Case officer.
* **BR-8:** I checked all three Studio people on `/cases/<id>`, `/questionnaire`, `/review` and `/representative-review`. Each sees "Cases are worked by the firm" with one "Continue as Case officer", and `xr-actor` stays unchanged. I reached it by typed address, the Demo menu, and Back after the release pill or "Product Studio (as …)". "Continue" makes one change with one notice. Forward and Back after it change nobody.
* **Ctrl, Shift and middle-click** on "Cases (as Case officer) →", "Product Studio (as …) →" and the release pill: this tab changes nobody. The new tab opens as the browser's stored person (by design, m2 of the challenge).
* **Sign-in:** a double-click on a card makes one change, one notice and one move. A fast second click on another card cannot land. "Sign-in page…" in the picker changes nobody, and Back returns. The current person's card is marked. Tab reaches the four cards and "More people"; Enter opens it and reaches all five other people. There is no filled button.
* **BR-5 against the API** (curl, each `x-actor`): the server accepts all nine ids on `/session`. Studio people get 403 on `/runtime/cases`, case people 403 on `/review-queue`, and an empty or unknown person 401. On screen, case people on Studio addresses see "This page is for the configuration people", with no Studio menu or draft bar. Clients on staff case pages see "This page is for the case officer". The picker offers only the nine people the server knows.
* **One picker, one notice:** the only "Simulated person" select is the frame's, in both areas. Each change by the picker, the sign-in page, a named frame link or BR-8's button showed exactly one "Now: <name> (simulated)" (except m1).
* **Layout:** at 1024 px and at 200 % zoom, the sign-in page, BR-8's notice and the Studio header have no sideways scroll. At 375 px, the sign-in page, the notice and the Studio do not scroll sideways, and the named frame link wraps.

Scripts (scratchpad, not committed): `s1.cjs` (tampered values), `s2.cjs`/`s3.cjs`/`s7.cjs` (person changes, keyboard, tabs), `s4.cjs` (deep links per person), `s5.cjs` (widths, zoom, keyboard).
