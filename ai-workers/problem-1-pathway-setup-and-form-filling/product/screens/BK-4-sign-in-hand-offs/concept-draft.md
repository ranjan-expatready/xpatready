# BK-4: sign in by role, and hand-off buttons where work changes hands (concept DRAFT)

Concept lane (skill screen-concept, steps A1-A7), 11 Nov 2026, for the tech lead's approval (P-223 (4)); not yet `concept.md`. Row: Bake plan row 4 (`design/bake-plan-2026-11-10.md`), P-447 (2); squeeze S1-S2 (`design/bake-squeeze-2026-11-11.md`, #1572), P-481; measure P-456 (3); style P-473. Board: `design/board-bk4.html`. Paths under `prototype/studio/` unless stated; read on `origin/main` 68a7b59d1.

## 1. Job and journey
* **Job:** one person walks the whole journey and changes role only by (a) signing in once on a role card, (b) the frame's one person picker, or (c) a hand-off button that names who takes over. Nothing else changes the person.
* **Personas:** all nine simulated people (`api/src/core.ts:38-55`): Studio (Configuration author, Content reviewer, Approver), Firm (Case officer, Representative, Second representative, Solo representative), Clients (Client A, Client B).
* **Journey (E1, P-456 (1)):** sign in → finish and submit one unreleased pathway → expert signs → Approver releases → firm opens a case → Client A answers → back to the firm → send for representative review → representative decides.
* **Measure (P-456 (3)):** person changes not by hand-off button or the picker, today **4** (BK-1 §2.1); after BK-4: **0**.

## 2. Ten layers
* **Today (facts):** the person lives in one place, `web/src/lib/api.ts:7-11` (`actor`, key `xr-actor`, `getActor/setActor/useActorId`, sent as `x-actor`); the server decides every right (`actorOf`, `core.ts:58`). But there are **two pickers** (Studio `PersonaSwitch`, `App.tsx:158-172`, 3 people from `/session`; case area select, `runtime/cases.tsx:66-70`, 6 people hard-coded at `:32-39`) and **four silent switches** (case area forces the Case officer, `cases.tsx:60`; `Cases →`/`Product Studio →` and the release pill, `components/frame.tsx:20-23, :67`; `actAsCaseStaff`, `cases.tsx:45`). Five places tell the walker to "Switch to …" by hand (`pages/review-items.tsx:162, 311, 350, 439`, `pages/release.tsx:83`).
* **Team's model:** three separate sign-in groups, Expat Ready staff, firm users, clients (SA-07 §3.0, `domain/requirements-2026-11-02/02-functional-requirements/super-admin/SA-07-platform-users_v2.17_2026-10-17.md:370-373`). Our groups copy that; no passwords (simulated, P-335).
* **New:** a sign-in page, one picker, a person-change notice, nine hand-off buttons. **No schema, no migration, no new record.** One additive field on `/session` (4a) and one on the client's case view (4c, Q2).

## 3. "The current person": the one state, owned by 4a
`web/src/lib/api.ts` `actor` (`xr-actor`) stays **the only** current person. **4a owns** its code, the picker, the sign-in page and the one notice "Now: <name> (simulated)" that the frame shows on **every** change (a listener on `setActor`). **4b and 4c only call `setActor(id)`** on a plain click (`plainClick`, `frame.tsx:25`) and then navigate; they never write `xr-actor`, keep their own copy, or toast a change. Target ids come from server data (duties from `/session`, the case team, the case's `client`), never a literal id. `actAsCaseStaff` and `leaveCasesAsStudio` keep their names and signatures (4b uses the first).

## 4. Business rules
| BR | Rule | Source |
|---|---|---|
| BR-1 | A person changes only by the sign-in page, the frame picker or a hand-off button; every change shows "Now: <name> (simulated)" once. | P-456 (3); P-447 (1) |
| BR-2 | A hand-off button names the person who takes over and appears only when the next step belongs to someone else (calculated from the step's state, not stored). | EXPERIENCE §2.5; BK-1 §2.1 |
| BR-3 | The target holds the duty the step needs and is never the person the server will refuse (submitter ≠ approver; proposer ≠ decider). | `review.tsx:136`; `review-items.tsx:161-162`; D254 |
| BR-4 | A hand-off moves to the place the next person works on (same page in the Studio; the case, the client's questionnaire or the review round in Cases). | P-447 (1) "no dead end" |
| BR-5 | Rights stay on the server: the picker and buttons only choose who is asking; nothing is shown that the server would refuse to read. | STANDARDS §6 S-1; P-335 |
| BR-6 | An unknown or missing stored person opens the sign-in page with "Choose who you are", never a red error. | today `App.tsx:95-98` |
| BR-7 | A Ctrl/⌘-click on a hand-off opens a new tab and changes nobody in this tab. | `frame.tsx:24-25` |

## 5. Layout (pattern: Dialog-like page for sign-in; frame chrome for the picker; inline next step for hand-offs)
* **4a Sign-in page** `/sign-in` (own frame area, no menu): H1 "Who are you today?"; one line "Simulated people: no passwords. Pick a role; buttons carry you on when work changes hands." **Four cards**, each the first person of a stage: Configuration author ("Sets up and submits pathways"), Approver ("Releases what others prepared"), Case officer ("Opens cases and prepares forms"), Representative ("Reviews filings before they are filed"). Fold-out **More people** (FoldOut, BK-2 chevron): Content reviewer, Second representative, Solo representative, Client A, Client B, grouped Expat Ready staff · Firm · Clients. A card is one button; the current person is ticked. After choosing: Studio people → `/`, firm → `/cases`, clients → `/cases` (today's honest notice; Q3). BK-5 PR 2 later sends Studio people to `/start`.
* **4a Header picker** (one, both areas): `[Approver · Simulated ▾]`; menu lists the nine in the three groups with their role line; last item "Sign-in page". Choosing someone whose area differs goes to their home. It replaces `PersonaSwitch` and the case-area select. Below 640 px it shows the name only (the 375 px header has no room for the pill). The where-line's other-area link names the person it switches to: "Cases (as Case officer) →" (frame chrome, so it is the picker's family, BR-1).
* **Hand-off shape (4b, 4c):** under the step's own action, one line: ✓ what was done · "Next: <who> <does what>." · a secondary button "**Hand to <who> →**". Brand blue only for the page's one filled button (P-473); no orange (a hand-off is not "needs you").
* **4b Studio (5 hand-offs + 5 "Switch to" lines):** pathway Review and release (`review.tsx`): after Submit → "Hand to the Content reviewer"; after the last expert item is signed, or at once when none needs the expert → "Hand to the Approver"; after a Return → "Hand back to the Configuration author"; after release → "Open a case on Release N (as Case officer) →" (BK-3 PR 2's button, `combination.tsx:116`, moved/echoed here). Shared Release page `release.tsx:83` and the four `review-items.tsx` lines become "Hand to the Approver" / "Hand to the Content reviewer" buttons.
* **4c Cases (2 + header):** Client A's "Every part is answered" (`questionnaire.tsx:451`) → "Hand back to the firm: <officer> →" to `/cases/:id`; after "Send for review" (`readiness.tsx:296-303`) → "Hand to <representative of record> →" to the round. Solo firm: "Review now" already opens it (no change). "Open it as Client A" (`cases.tsx:216`) takes the hand-off look. Shares the case header with BK-3 PR 3-4: starts after BK-3 PR 3 merges.
* **States:** sign-in: normal, stored person unknown (BR-6), server down (today's notice, kept). Hand-off: shown, hidden (you are the next person, or no next step), target missing (no one holds the duty: words "No <duty> person in this workspace", no button), new-tab click.

## 6. Best in class (4b, P-392)
* **GitHub account switcher** (avatar menu "Switch account", no re-login; permissions never mix; github.blog changelog 2023-11-03; docs "Switching between accounts"): **copy** one picker in the header, current account marked. **Beat:** our notice names the new person on every change.
* **Salesforce "Log in as"** (admin acts as a user; a banner names who you are on every page; "Log out as …"; audit trail records it; Packt admin handbook ch. 2, third-party): **copy** the always-visible "acting as" name. **Beat:** no separate log-out step; the next button carries you.
* **DocuSign routing order** (recipients act in sequence; the next one is sent the envelope when the last finishes; university help pages, docusign.com blog "Quick tip: setting signing order"): **copy** the hand-off that names the next person in order. **Beat:** the next person is chosen by duty from data, so the walker never picks wrong.
* **Google account chooser** ("Choose an account" with "Use another account"; developers.google.com Sign in with Google button UX): **copy** a short list of known people plus "More people", not a long form.
* **Effort saved:** today 4 manual switches with a select of 3-6 names each; after: 0 selects, one click per hand-off, target never wrong (BR-3). BIC scorecard (case side): BIC-11 one filled button, BIC-14 tips on keyboard, BIC-18 states drawn, BIC-20 keyboard/375 px/contrast apply; the rest are about questions, documents, filing: N/A.

## 7. Copy
Notice: "Now: Approver (simulated). Releases what others prepared." · Hand-off line: "Submitted. Next: the Content reviewer signs the immigration content." · Button: "Hand to the Content reviewer →" (tip: "You act as the Content reviewer (simulated) on this page. Use the person picker to come back.") · No target: "No one in this workspace holds the approve duty, so nobody can release." · Sign-in unknown: "Choose who you are: the person this browser remembered is not in this workspace."

## 8. Contract and tests
* **4a:** `GET /api/session` adds `people: [{id, name, role, duties, area}]` (all nine; additive, `api/src/studio.ts:133`, named in the PR's first line); `cases.tsx` `PEOPLE` reads it. No other API.
* **4c:** the client's case view adds `officer: {id, name} | null` (the case's first officer), so "Hand back to the firm" has a target (Q2; `api/src/runtime.ts:324-325` gives the team to staff only).
* **Tests:** `tests/check_bk4_handoffs.ts` (code: no "Switch to" left in `web/src`; every `setActor(` call site is in the allowed list: `lib/api.ts`, the picker, the sign-in page, hand-off sites); browser `tests/check_bk4_walk_browser.cjs` at 1440 and 375 px, axe: one pass and one fail per BR (BR-3 fail: the submitter is never offered as the Approver; BR-5 fail: Client A from the picker opens no Studio page and no case list; BR-6 fail: `xr-actor=user-Z` lands on sign-in; BR-7: Ctrl-click keeps "Now:" unchanged). The walk counts person changes outside BR-1: 0.
* **Breaker (P-278) on 4a:** permissions: picker, sign-in, stale ids, deep links per person.

## 9. Capability or scaffolding; Needed for the proof
Sign-in page, picker, person notice: **Scaffolding** standing in for the team's three sign-in pages (P-33), marked Simulated · Needed (E1). Hand-off buttons: **Capability** (the product's "send to" steps; in production they assign work rather than switch people) · Needed. Assigning work to a named user, notifications: **Not built** (team's AG-07, M4).

## 10. The three PRs (built side by side after approval)
| PR | Files (web unless said) | Done when |
|---|---|---|
| **4a** role picker | `lib/api.ts` (notice hook), `components/frame.tsx` (picker, other-area words), new `pages/sign-in.tsx`, `App.tsx` (route, drop `PersonaSwitch`), `runtime/cases.tsx` (drop select and `PEOPLE` copy), `components/where.ts`, `api/src/studio.ts` (+`people`) | BR-1, BR-5, BR-6 pass and fail; one picker in both areas; breaker Approve; walk by screens 1440 px |
| **4b** Studio hand-offs | `pages/review.tsx`, `pages/release.tsx`, `pages/review-items.tsx`, `pages/combination.tsx` | BR-2, BR-3, BR-4, BR-7 on the Studio's 5 hand-offs; no "Switch to" in `pages/`; walk submit → sign → release → open a case with 0 picker use |
| **4c** case hand-offs (after BK-3 PR 3) | `runtime/questionnaire.tsx`, `runtime/readiness.tsx`, `runtime/cases.tsx` (case header), `api/src/runtime.ts` (+`officer`, Q2) | client done → officer and send → representative by buttons; walk case → client → firm → representative with 0 picker use |
Conflicts: 4a and 4b share no file; 4a and 4c share `cases.tsx` (different hunks); merge `main` only on a conflict (P-270).

## 11. Questions (recommendation first)
1. **First visit: page or gate?** *Rec: a page, not a gate, in the Bake:* the demo's walk starts at `/sign-in`; with no stored person the app still acts as the Configuration author, because at least 11 browser checks open the app without a stored person and would all change. A gate is a follow-up row after the Bake.
2. **"Hand back to the firm" target.** *Rec: one additive field `officer` on the client's case view (runtime file, 4c).* Alternative: the button goes to the firm's default case officer by a literal id (breaks "no literal ids", BR-3).
3. **A client signing in directly.** *Rec: clients stay under "More people" and land on today's notice;* the walk reaches Client A by "Open it as Client A". A client home page is the team's client portal (M4).

## Definition of ready
Acceptance tests named (§8); row text §10; decisions: Q1-Q3 answered by the Lead; fresh challenge done; Lead approval (P-223 (4)).
