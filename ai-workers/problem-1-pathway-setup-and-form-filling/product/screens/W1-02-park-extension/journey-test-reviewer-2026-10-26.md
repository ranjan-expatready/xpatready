# W1-02 Park the browser extension — journey test (reviewer, 26 Oct 2026)

Role: reviewer agent, the one journey score for this check. Copy `forms_rev` on :4450 (fresh database per run, sample
inputs loaded, forms story run on the Visitor visa), commit d575150 synced to 8a56f23. US$0: no model call. Scripts
(Playwright, headless, screenshots read by eye) in the reviewer's scratchpad: `journey.cjs` 57/57 run twice (first run
showed one harness fault: headless Chrome on the Mac opens a closed select's popup on ArrowUp, the same note as
build-notes item 4; replaced by type-ahead), `preview.cjs`, `addform.cjs`.

## Journeys
| # | Persona · goal | Steps | Result |
|---|---|---|---|
| J1 | Content publisher: "this form goes in online; record it" | Programs › With an LMIA › Forms › Filed as IMM 5707 › Online (later wave) | Saved, toast in 103 ms; line says "Needs the browser extension (later wave)"; filing "Mixed: online and PDF"; one warning, no "cannot be filed"; reload keeps it; Review and release lists the warning |
| J2 | Same, keyboard only | Focus the select, type-ahead "p", Tab | PDF upload saved once; focus moves on |
| J3 | Content publisher: attach and read the visitor visa's PDFs | Visitor visa › Sources and forms | Files, read results and "Draft with AI" shown; no drafting-sources table, no "Add an online form"; Overview has no empty online section |
| J4 | Content publisher: library and history | Forms library, AI work, To review, Release, Activity | All load in 0.5–0.8 s; no portal, capture, screen-map or extension words; Add form dialog lists PDF editions only |
| J5 | Anyone with an old bookmark | `/extension`, `/review/capture/x`, `/review/screen-map/x` | "Page not found" with "Back to programs" |
| J6 | Second person (approver user-B, reviewer user-C) | Combination, To review; try to change a channel by URL | Channel and later-wave note as text, no select; no capture or screen-map items; server refuses the change (403) |
| J7 | Wrong door: old extension or capture API calls | 12 parked routes | All 404 |
| J8 | Error: a saved portal page dropped in the Forms library | Choose files › `saved-portal-screen.html` | Refused: "forms come in only as their official PDF. Add the form's PDF from IRCC instead. Nothing was added or attached." |
| J9 | Across the screen boundary: Preview fills the forms | IMM 5707 Online › Preview › Forms and coverage › Fill PDF | **Fails:** enabled button, red toast "its answers go on the portal sheet, not in a PDF" (409). IMM 1295 (PDF): filled, 64/64 read back, intact, 808 ms |

## Data underneath
Summary after J1: IMM 5707 `channel: ONLINE` once; `channelProblems` = one warning; no `portal`, `onlineForms` or
`defaultChannel` keys. Approver and reviewer PATCH → 403. Re-run suites on this copy: channels 53/53, demo 25/25, PDF
hardening 49/49, P-80 held files 41/41, F3a-1c second-draft guard 33/33.

## Break it (15 min)
Old URLs and parked API routes (J5, J7): handled. Wrong role by URL (J6): refused. Hostile file (J8): refused. Flip
Online → PDF → Online and reload: consistent. A dead action on the next screen (J9): **Major**, see review M1. Minor:
the same later-wave sentence appears four times on the Forms card; the Reset dialog lists "parked portal captures".

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J8 pass; PDF fill intact (J9, IMM 1295) |
| Next step obvious | ½ | Warning says "File it as a PDF upload to fill its PDF", but Preview offers a Fill button that always fails (J9) |
| Plain words | ½ | "portal sheet" on J9; the later-wave sentence four times; "parked portal captures" in the Reset dialog |
| Feedback and state | 1 | Toast, filing line, warning count and draft bar update at once |
| Correct data | 1 | One line changed, warning not error, roles enforced on the server, parked routes 404 |
| Error recovery | 1 | Reload keeps the choice; stale save 409 and checklist refusal (channels suite); refused file explains the fix |
| Accessibility and screen sizes | 1 | axe 0 violations on Online and Sources states; no sideways scroll at 400, 1024, 1024 at 200 %; keyboard pick saves once |
| Speed | 1 | Pages 0.5–0.8 s to network idle; save 103 ms; PDF fill 808 ms |
| Visual quality | 1 | Team shell unchanged; Forms card still aligned (repetition counted under words) |
| Trust and sources | 1 | Online marked "later wave" everywhere; no AI path changed; refusals say why |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise the low criteria, most valuable first: (1) Preview shows an Online line's fill as unavailable
with "Needs the browser extension (later wave)" and both fill refusals use those words (`web/src/pages/preview.tsx:128`,
`api/src/fill.ts:30`, `api/src/fill-case.ts:118`); (2) drop the filing-line note (`web/src/components/channels.tsx:50`);
(3) relabel the Reset row (`api/src/demo.ts:124`).

## Not tested
A visible (headed) browser walk; a real screen reader; an intended user's unaided walk (D17, D20 stay with the
founder); the case officer's fill of an Online line inside a case (read in code only).
