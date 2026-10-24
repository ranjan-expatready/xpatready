# Screen 01 — journey test, round 2 (reviewer role, 23 Oct 2026)

**Commit:** `8d020757` (closing fix pass + P-74 extension). **Copies:** `xr_studio_screens_rv` on :4440 for the walks; fresh `screens_rv2`–`rv9` on :4441 for suites, probes and mutations. Sample inputs loaded through the Demo endpoint; model calls refused (`ANTHROPIC_BASE_URL=http://127.0.0.1:9`), so no paid AI ran. Every copy is stopped and its database dropped at the end.
**How:** I wrote the journeys from the concept, P-61/P-62/P-66/P-74 and C1.6, C1.7, C2.7, C2.10, C3.10 before using the app. I walked them in Chrome (Playwright, headless). At each decision point I took a screenshot and read the page text, using only what a person sees. After each journey I read the API and SQL. Scripts and screenshots are in my scratchpad (`jt/`); none are committed.
**Replay:** the builder's browser suite on two fresh copies: **133/134 both times**. The one failure is the same each time: "C2.7 … opens a right panel with the combination's portal chosen". See finding 4; the builder's evidence says 134/134. Each run includes axe on every state, 1024 and 1440 px, console errors and timings. First view was 122/174 ms warm and 392/459 ms cold; filtering took 25/27 ms.

## Journeys (persona · goal · result)
| # | Persona and goal | Result |
|---|---|---|
| J1 Main (C1.6) | Author: "See how With an LMIA is filed, and file IMM 5476 as a signed PDF" | **Held, with a word defect.** The row reads "Filed: PDF only". The Forms panel shows "Filing: PDF only", plus a "Filed as" choice on each line with its default marked and the signature in words. The change saves in 90 ms with a toast, the draft goes up by 1 and the signature becomes "Printed, signed by hand, scanned and uploaded". **But** the filing method on the row and the panel becomes "PDF only; plus signed pdf upload when Needed when the applicant uses an authorized representative, …". It is a three-line sentence that makes the row 102 px tall (`J1-row-filing.png`). The edited line also jumps to the top of the table |
| J2 Alternate (C1.7) | Author: "This is filed through the IRCC Portal; use the online version where there is one" | **Held.** The portal is picked from a list ("Sample portals until the immigration expert confirms…"). "+ Add form" of IMM 5257, which has an approved online version from that portal, makes the line "Online (default)". It shows "Blocks release: … no screen map yet" (`J2-3-online-line.png`). Defaults are never applied silently |
| J3 Error → main (C2.7) | Author: "Add the IMM 5257 online form from saved portal pages" | **Held, with one dead end.** A page with answers is refused, with the reason and "Nothing of it was kept". Three blank pages are added in 826 ms and show "Awaiting a second person: it is not used until someone other than you approves it". Self-approval is refused (403). A second person approves (API: the review screen is Screen 02), and the page then reads "Approved: an online version in the library". **But** the refused attempt left a row "Being captured: add the remaining screens, then finish", and no screen can finish or abandon it. Each failed try adds another such row (`J2-3`) |
| J4 Governance | Author → SME → approver: release the channel changes | **Held through the product's own screens.** The author submits ("Submitted by Configuration author"). The SME signs 2. The approver sees "Will be released", and Visitor visa is held back with its reason. Release 2 is published. **But** the portal I had changed on this row went into Release 2 (`config_release.snapshot.combination.portal = ircc_portal`), and the review list ("Changes … (2)") never showed it |
| J5 C2.10 | Author: "Draft IMM 5257 from the online screens only" | **Held.** The Sources tab says, per form, what drafting reads: "Reads the PDF version (IMM 5257 (09-2023)) first, then the IRCC Portal screens for what differs". Choosing "Online screens only" changes the sentence. The approver sees words only; author-only buttons are hidden (breaker m9) |
| J6 Wrong role | Approver and SME on the same pages, plus direct calls | **Held.** No select boxes and no Add buttons for the approver. SME → 403 on channel, portal and capture. A missing or unknown `x-actor` still acts as the author (open since round 1; Lead) |
| J7 Recovery (round-1 Must 2) | Author: remove IMM 5409 from the Live row, then add it back | **Fixed.** After the removal the Overview shows IMM 5409 as an attached source, and "+ Add form" offers Add. The re-add brings back "couple once · Needed once per couple…". Draft changes return to the count before the removal, and v2 RETIRED is gone, so v1 PUBLISHED stands |
| J8 Back | Author: open Super visa, then press browser Back | **Fixed.** `?sel=…` is in the history entry, and the row is highlighted and focused |
| J9 Keyboard and sizes | Author, keyboard only at 1024 px | **Held.** 34 Tabs reach "How IMM 5707 is filed", with a 3 px focus ring. A type-ahead key changes it (toast). There is no sideways scroll at 1024 px or 512 px (200 %). At 400 px the portal select pushes the combination page 13 px wide |
| J10 C3.10 | Anyone: never see "box" | **Held.** 24 pages, tabs and both panels contain no "box" |

## Data underneath
* Channel saves version the line: v1 PUBLISHED, v2 DRAFT. Two parallel saves give 409 + 200, with one row.
* Each capture is linked to its combination (`portal_capture.combination_id`). Approval writes an ONLINE `form_edition`.
* The re-add restores v1. Release 2 records submitter user-A and approver user-B.
* **Exception:** `combination.portal_key` is edited in place. The draft count stayed **0 → 0** after a portal change on a fresh Live row, and `diff()` leaves the portal out of its row-details meta (`engine/validate.ts:152`). So the change is never listed for review, yet it is published with the next release of that row.

## Findings (severity)
1. **Major:** a portal change bypasses review and is released unlisted (J4). Review Must 1.
2. **Major (words, main path):** the filing method sentence (`engine/channels.ts:34`, shown by `programs.tsx:323` and `channels.tsx:30`) has lower-case "pdf", "when Needed when", and the full condition text. C1.6 names the values: PDF only · Online only · Mixed. Review Must 2.
3. **Minor:** a refused or abandoned "Add an online form" leaves an OPEN capture that no screen can finish or abandon (`channels.tsx:128-136`).
4. **Minor:** opened right after a portal change, the online-form panel keeps the old portal for good (`channels.tsx:114-115`). In my runs the suite step fails 2/2, so it is flaky.
5. **Minor:** on an Online line without a screen map, the missing list says "1 rule does not resolve … Fix on the Configuration tab". It also says "No form fields mapped yet for IMM 5257. Next step: Add 1 form from the library" (`engine/programs.ts:62,69`). Both the cause and the step are wrong.
6. **Minor:** the edited line jumps to the top of the Forms table (`programs.ts` summary orders by version). The 400 px overflow comes from the portal select (`channels.tsx:34`).

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J5 and J7 completed on the product's screens. Capture approval is Screen 02 (out of scope) |
| Next step obvious | ½ | The online line's missing items name the wrong cause and step. The orphan "Being captured" row asks for something no screen offers |
| Plain words | ½ | The filing sentence on the row and the panel (finding 2). C3.10 is clean; channel and drafting words are good |
| Feedback and state | 1 | Toasts, per-file results, "Awaiting a second person", "(default)", "Blocks release", held reasons |
| Correct data | ½ | Lines, captures, re-add and races are exact. The portal reaches a release unreviewed (finding 1) |
| Error recovery | 1 | The answers refusal says what and how; a retry with blank pages works; 409s explain; nothing is lost on reload |
| Accessibility and screen sizes | 1 | axe 0 (combination, panel, Sources tab, approver view, list at 512 px). Keyboard path and focus ring work. 1024 px and 200 % are clean; at 400 px there is a 13 px overflow (minor) |
| Speed | 1 | List 265 ms, channel save 90 ms, online form added in 826 ms (3 requests), summary API 94 ms |
| Visual quality | ½ | The filing sentence turns a 44 px row into 102 px (EXPERIENCE §2: one line, full text on hover). The rest is aligned and in the team look |
| Trust and sources | 1 | Sample portals labelled, approval state shown, drafting source per form in words, AI steps marked as before |
| **Total** | **8 / 10** | **Pass** (8 or more, no criterion at 0), at the bar |

**To raise it, most valuable first:**
1. Put the portal in the draft diff, so it is reviewed and counted (correct data).
2. Show the short filing method on the row and the panel, and leave the per-line detail to "Filed as" (plain words, visual quality).
3. Abandon an empty capture, or let the row continue or abandon it (next step obvious).
4. Give channel problems their own missing item and step (next step obvious).

## Could not test
* A real screen reader. A headed browser walk: I used headless Chrome and read the screenshots.
* Capture approval on a screen (Screen 02).
* AI drafting (QA-8; no paid AI).
* PDF downloads (QA-4 family).
* An intended user's unaided walk: D17 and D20 stay with the founder.
