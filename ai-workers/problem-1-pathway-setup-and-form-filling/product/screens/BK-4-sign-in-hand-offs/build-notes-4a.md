# BK-4a: sign in by role, one person picker — build notes

**Row:** BK-4a (concept `concept.md` §3, §5 "4a", §8, §10; approved by the tech lead at 2fa228923, rulings P-484, records PR #1575). PR #1580, screens lane, cloud, 11 Nov 2026. Web only.

## What a person sees
* `/sign-in`: "Who are you today?", four cards (Configuration author, Approver, Case officer, Representative), "More people (5)" in the team's three groups (Expat Ready staff · Firm · Clients). A page, not a gate (P-484 (3)).
* One picker in the header of both areas ("Acting as", names in three groups, "Sign-in page…"). A pointer choice applies at once; with the keyboard, arrows mark a choice and Enter makes it (WCAG 3.2.2).
* One notice on every change of person: "Now: <name> (simulated). <job>."
* Frame links and the case's release pill name who you become when they change the person ("Cases (as Case officer)", "Product Studio (as Configuration author)", "Release 1 (as Configuration author)"); for someone who stays who they are, the link reads only the area.
* A Studio person chosen on purpose who opens a case address sees "Cases are worked by the firm" and "Continue as Case officer" (BR-8); a browser with no stored person still arrives as the Case officer (QA-35, its first person).
* An unknown stored person opens `/sign-in` with "Choose who you are" (BR-6).

## Build discoveries (for the concept's records)
1. **`lib/people.ts` already existed** (the words for who can be in an application, used by `pages/combination.tsx` and `pages/workspace/questionnaires.tsx`). The list of simulated people is `web/src/lib/simulated-people.ts` instead. Same content as concept §2/§3.
2. **The keyboard rule (break M2):** a native select applies every arrow key at once on Windows and Linux. The picker now waits for Enter after keyboard moves; a pointer pick and the browser's own open list apply at once. Not in the concept; needed for WCAG 3.2.2.
3. **A Studio person leaving Cases stays who they are (break M1).** `leaveCasesAsStudio` changes the person only for a case person, so the link's words ("Product Studio" vs "Product Studio (as Configuration author)") always match what happens.
4. **The release pill names the person on screen (review M2).** Its accessible name now starts with its visible words (WCAG 2.5.3).

## For the BK-4b and BK-4c lanes
* `tests/check_bk4a.ts` lists every `setActor(` site (`ALLOWED`) and every use of the person-changing helpers (`HELPERS_ALLOWED`) with its reason. A hand-off adds its file and count there.
* BK-4b: "Open a case on Release N" (`pages/combination.tsx:116`) changes the person through `actAsCaseStaff` without naming them on screen (break m6): name it "(as Case officer)" as concept §5 says.
* BK-4c: Ctrl-click on "Open it as Client A" (`runtime/cases.tsx`, `setActor(c.client)`) also changes the current tab (break, outside 4a): give it `plainClick` as the frame links have. "Act as Client A" still uses the literal `user-P`.

## Known limits, not fixed here
* One stored person per browser (BR-7): another tab's choice applies to this tab on its next reload, with no notice (break m2).
* The picker keeps the page when the change stays inside the case area, so Client A choosing Client B on A's questionnaire meets the server's refusal (break m7); the server decides (BR-5).
* The case page scrolls sideways at 375 px with 200 % zoom (its people table; seen by the breaker, outside 4a).
