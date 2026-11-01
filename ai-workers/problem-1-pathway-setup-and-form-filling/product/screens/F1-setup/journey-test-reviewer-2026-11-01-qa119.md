# Journey test (reviewer): QA-119, the header's Next step (commit 11485f0d), 2026-11-01

**Setup.** Fresh isolated copy `rv_q119` on :4449, sample loaded, web app rebuilt from 11485f0d. Headless Chromium driven like a person: clicks, Tab and Enter, reading the page. The API was used only to set up states (steps 1–2 have no UI before F2) and to read data afterwards. No live AI (US$0).
**Roles:** configuration author (user-A), approver (user-B), immigration expert (user-C).

## Journeys
| # | Persona and goal | Steps | Result |
|---|---|---|---|
| 1 | Author: "carry on setting up Super visa" | Programs card → Resume setup → read the header | Held. Lands on Forms with `pages:record` focused in 339 ms. Header: "Next step · Official pages / Waiting for the immigration expert: Choose the checklist page (No page matches) / See it on Forms". No button. Strip ⧗ on the same row |
| 2 | Author: see where the waiting item is | Header "See it on Forms" | Held. Lands on Official pages, focused |
| 3 | Approver: what is next on Super visa and Visitor visa | Open each page | Held. Waiting lines ("… immigration expert: Choose …", "… configuration author: Map 1 form"). No button on either |
| 4 | Expert, keyboard only: do my step on Study permit | Tab ×22 to the header button → Enter | Held. "Choose the checklist page" has a visible 3 px ring and lands focused on `pages:record` |
| 5 | Author: Live With an LMIA, back-filled pages | Read the header → click | Partly held. "Confirm the checklist page" lands on "Proposed by the rules, not confirmed" with no Confirm control (F2; note) |
| 6 | Author: Visitor visa after steps 1–2 | Header "Add 1 form found" → "Map 1 form" | Held (in the check). Form added from the library and the header moved on; Map opens the cost-checked dialog, and nothing runs before Start |
| 7 | Author: the summary fails | Overview with the summary forced to 500 → Retry | Held. "The setup steps could not be loaded · Retry". Retry shows "Loading the setup steps…", then the strip. Focus falls to `<body>` |
| 8 | Author: why "· sure"? | Focus the tier words on the people row | Held. Tooltip in the concept's words, linked with `aria-describedby` |
| 9 | Wrong role | Approver `POST official-pages/confirm`; expert `PATCH people` | Held. Both refused by the server (403) |
| 10 | Screen sizes | Super visa Overview at 400, 1024 and 720 css px ×2 (200 %) | Held. No sideways scroll; header box visible; axe clean (approver page, and four states in the check) |

## Data underneath
* After journey 6: Visitor visa's summary no longer lists `add_forms_found`, and the header's `data-header-next` equals the summary's new `next.item.focus` (in the check).
* Journeys 1–5 and 7–8 only read and navigate. Afterwards the job count on High-wage position was still 0.
* Only the author's confirm (data setup) changed With an LMIA, to `confirm_people` for the expert.

## Break it
* **Double click** on the expert's header link (High-wage position): one navigation and no write.
* **Reload** on `/forms?focus=…`: lands again.
* **Forced 500 on the summary:** covered by journey 7.
* **Not done:** two tabs and hostile text (no text input in this change); double click on the paired Add forms found (that state was used up).

## Findings (details in `review-qa119.md`)
* **m1 (Minor):** "See it on …" (`combination.tsx:159`) and Retry (`overview.tsx:27`) show no focus indicator. Computed `outline: none`, `box-shadow: none`.
* **m2 (Minor):** Retry drops focus to `<body>`.
* **Note:** journey 5 and the expert's step 2 land on read-only places until forms F2. This is the tech lead's order and is not counted against this change.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The header always leads to the right item, but steps 1–2 cannot be finished in the product before F2 (J5) |
| Next step obvious | 1 | One next step per page; header = strip = badge on 6 combinations × 2 roles |
| Plain words | 1 | "Waiting for the immigration expert: Choose the checklist page (No page matches)"; "See it on Forms" |
| Feedback and state | 1 | Waiting, loading, error and Retry states |
| Correct data | 1 | No stray writes; the paired add moves the checklist exactly once |
| Error recovery | 1 | Retry restores the strip |
| Accessibility and screen sizes | ½ | axe clean; 400, 1024 and 200 % fine; two controls without visible focus (m1) |
| Speed | 1 | 339 ms from the card to the header |
| Visual quality | 1 | Builder screenshots qa119/01–03; the header box sits beside the title at 1440 px and stacks at 400 px |
| Trust and sources | 1 | AI mark on Map forms; cost check before any run; tier tooltip says who confirms what |

**9/10, pass, no criterion at 0.** Fixes that would raise the score, most valuable first:
1. Add a focus ring to "See it on …" and Retry (m1).
2. Forms F2's Confirm controls (task completed).

**Not tested:**
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The paired Find forms and View AI progress buttons: no product path reaches them before F2.

My screenshots are working files only, not committed: `/tmp/rvq119/shots/` (j1, j3, j4-focus, j5, j6-*, tier-tip, see-it-focus, strip-error).
