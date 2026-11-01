# Review: C11.5 part 1, "Relies on an employer case" (runtime lane, M3-A2)

Commit reviewed: `e68bc9d2` (branch claude/compassionate-sagan-24h24c). Reviewer did not build it. 1 Nov 2026.
Inputs: board r5c frame 1 (`M3-agent-view/design/draft-agent-view.html:212`), frame 10 "How it works" (:452), concept BR-13 (`M3-agent-view/concept-draft.md:45`), P-106, EXPERIENCE, STANDARDS. Running copy :4437 (read-only use: API calls, the dialog opened but not submitted, existing case C115B-mvy055ja). Journey test: `journey-test-reviewer-2026-11-01.md`. **Journey score 8.5/10 (pass)**.

**Verdict: Approve** (no open Blocker or Major). The Minors below are for the next part of C11.5 or a follow-up.

## Scope checked
Part 1 only: the offer rule (Retail + released forms read `organisation.` facts → offered; Corporate → never; none → "Not offered: the Visitor visa has no employer facts"), on "Open a case" and the case header. The link itself, the read-only facts, unlinking, SI-10 and "Linked to" (C11.16) are out of scope and not findings (P-26).

## Concept fit
* Frame 1 line: the label "Relies on an employer case", the ⓘ tooltip and the reason are present in the dialog and the case header (my screenshots at 1024, 720 @2x and 400 px; the builder's `screenshots/after-open-a-case.png`, `after-case-header.png`). The words match, with two trivial differences: a full stop added, and the tooltip says "from a Corporate case" instead of the board's "from that case". Both read fine.
* BR-13 / frame 10 "Offered only when the combination's forms need employer facts" (`engine/runtime/employer.ts:12-26`). It reads mapped field-map entries (`engine/snapshot.ts:131`, `outcome`/`fact`), and `client_type` comes from the PATHWAY node (`snapshot.ts:157`). Correct.
* The case answer comes from the pinned release (`runtime.ts:125`, `snapshotOf` = pins[0]); the dialog answer comes from the newest release, which is the one the case will pin (`runtime.ts:133`, same default `combos[0]` as the submit, `cases.tsx:116,131`). Consistent.

## Code (STANDARDS)
* Authorisation: the new route needs the `case` duty. I checked it on :4437: officer and rep 200, client 403, configuration author 403, no actor 401. Workspace-scoped combination lookup, malformed id 404 (no 500), no release 409 with the opening words.
* No schema change, no writes, so no migration, race or duplicate risk. One request per dialog (keyed by combination), none per row. The case GET adds a pure in-memory computation.
* Removing a rule fails its test: dropping the CORPORATE branch fails the "Corporate never links" check, dropping the `organisation.` prefix or the `mapped` filter fails the "unmapped / look-alike" check, and changing the words fails the board-words check (`check_c115_employer.ts:21-30`).
* Graph (P-86): `GET /runtime/combinations/:id/employer-link` is named by `check_c115_employer.ts`. The graph shows `webUse:false` because it does not resolve the template URL in `employer.tsx:22`, which is a tool quirk and not a gap. No new G1/G2 gap.

## Issues
**Blocker:** none. **Major:** none.

**Minor**
1. *Should.* The tooltip cannot be reached by keyboard (EXPERIENCE §10 [M], "every status … has a tooltip"). `web/src/runtime/employer.tsx:14` uses `title` plus `aria-label` on a non-focusable span, so screen readers get the text but a sighted keyboard user never sees it (my walk: 25 Tab stops, the ⓘ is never focused). Fix: wrap it in the shared `Tip` with `focusable` (`components/status.tsx:15`). Other runtime chips (`team.tsx:69`) have the same pattern.
2. *Should.* The "Offered" reason names facts the form may not read. `engine/runtime/employer.ts:25` always says "(the employer's name, address, LMIA or offer number)", whatever `facts` holds (e.g. one `organisation.name` gives "1 employer fact (the employer's name, address, LMIA or offer number)"). That overstates the source (trust). Fix: name the actual facts from their labels, or drop the parenthesis.
3. *Should.* The client gets `employer_link` on `GET /runtime/cases/:id` (checked: user-P 200 with the field), while the stand-alone route refuses the client and the header's `team` is officer-only (`runtime.ts:120`). The client page does not show it (`client sees line: 0`), so nothing leaks to the screen, but the API is inconsistent. Fix: gate it like `team`.
4. *Note for part 2.* The Offered and Corporate outcomes are proven only in the pure rule. No released work-permit or Corporate combination exists on the copy, so neither the API nor the browser shows them. Cover them end to end once SI-10's Sample employer case exists.

## Standards [M] (relevant lines)
Met: plain words with no ids on the main path · loading skeleton and error text on the line (`employer.tsx:15`) · axe WCAG 2.2 A/AA clean on the dialog and the case page at 1024, 720 @2x and 400 px (mine) and at 1440 and 390 (the builder's) · no sideways scroll · no console or page errors · line shown in ≤150 ms · server authorisation · Sample/Stand-in honesty (no immigration values invented; the fact list is derived). Not met: tooltip on keyboard focus (Minor 1).

## D1–D20 (short)
D1 concept fit 9, the frame 1 line is exact · D2 words 9, Minor 2 · D3 states 9, loading/error/not-offered · D4 a11y 8, Minor 1 · D5 responsive 10 at 400–1440 · D6 speed 10 · D7 visual 9, team look, muted second line · D8 data correct 10, pinned release · D9 authz 9, Minor 3 · D10 errors 9, 404/409 words · D11 tests 8, the pure rule covers all branches and the API/browser cover not-offered only · D12 no scaffolding 10 · D13 migrations n/a · D14 concurrency n/a (read-only) · D15 perf 10 · D16 trust 8, Minor 2 · D17 simulated only · D18 retrofit: the commit records no mapping beyond the code comments (stand-in SI-10 named in `employer.ts:1`), acceptable for a read-only line · D19 code clarity 9 · D20 simulated only.

## Could not check
A real screen reader. True browser 200 % zoom (simulated as 720 px at 2× scale). A live Offered or Corporate case (nothing released on the copy, and I did not change it during the running suite). An intended user's unaided walk (D17/D20 stay with the founder).
