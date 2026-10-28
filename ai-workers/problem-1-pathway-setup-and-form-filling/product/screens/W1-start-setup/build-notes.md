# S3 Start setup: build notes (screens lane, 28 Oct)

Built from the agreed challenge (`challenge.md`, Lead response 28 Oct; founder: live AI only on a click). Desktop only (1440, 1024). AI spent US$0: every finder run in the checks replays a saved answer or uses the fake launcher of an isolated copy.

| Item | What was built | Where | Proof |
|---|---|---|---|
| **M1** what Start setup spends | `POST /combinations/start {nodeKey}` creates the combination (idempotent: 201 when created, 200 with the same one after). When a saved finder answer was made for this combination, it replays it by itself at US$0 (`savedFor`, using the finder's own rule: the saved run's combination key). Otherwise nothing runs. The landing offers one button, "Find forms with AI (about US$x)". The "about" figure is the saved runs' mean; the tip states the worst case before anything is spent. The run starts only on the click. Rules only is the fallback when the AI cap cannot cover the worst case. | `api/src/start-setup.ts` (its own file; it calls the forms lane's finder only through plan and launch); words in `contracts/start-setup.ts` | `check_w1_start_setup.ts`: saved replay attaches forms at US$0; no saved answer starts no run; the offer and its tip; the click starts the live run; a run that attached nothing shows the offer again. Browser: the offer, its tip, no AI batch before the click, the run card after. |
| **M2** the end of New combination | The `/new` page, its route, its menu match and the `/new?leaf=` links are removed. So are `POST /combinations/path` and `POST /path-proposal`, with `CreatePathBody`, `PathProposal` and the word helpers only they used. | `App.tsx`, `programs.tsx`, `structure.tsx`, `api/src/main.ts`, `programs.ts`, `screen02.ts`, `contracts/programs.ts`, `contracts/screen02.ts` | Both endpoints answer 404; `/new` shows "Page not found" with the way back. Their name-rule checks moved to Program structure's endpoints (`check_screen01_api`, `check_screen01_rules`). "Describe it" went with the page; names are checked in the Add pop-up (AD-4). |
| **M3** start guard | `startWhy` in the one guard. It refuses a retired name, a name under a retired one, and a name under an open change (on it or above it). The words are in `WHY.start*`. It shows on Program structure rows (`combination.startWhy`), on Immigration programs cards (`startWhy`) and in `createCombination`, which answers 409 for both `POST /combinations` and `/combinations/start`. | `api/src/lifecycle.ts`, `contracts/lifecycle.ts`, `api/src/structure.ts`, `api/src/programs.ts` | API: three fails with the same words on the row, the card and the API; after a withdraw the same name passes; `POST /combinations` is held to the guard too. Browser: the greyed button with the reason written under it; clicking it starts nothing. |
| **M4** the split with runtime slice 3 | "Sources and forms" gets the `FinderStart` block on top: the finder's newest run (the shared `RunCard`) or the offer. `sources.tsx` (runtime's forms list) is untouched. | `web/src/components/start-setup.tsx`, `pages/combination.tsx` | Browser: the block on the landing; the run card after the click. |
| **m5** one Start setup | `useStartSetup` and `StartSetupButton` are used by the card and List next step (it keeps `data-next-step="start"`), by the Program structure Edit panel, and by the next-step hook. It leaves once per double click (QA-50); the server returns the same combination. Its "i" says what it does, with an example and how cases use it once Live. | `components/start-setup.tsx`, `components/next-step.tsx` | `check_w1_s1s2_fix` (a double click starts one and one Back returns); `check_w1_programs_s2` (Edit panel → workspace); browser tip text. |
| **m6** the place, read-only | The workspace's place links are drawn in the level colours (`data-place`), with no control to change them. | `pages/combination.tsx` | Browser: at least two colours, no editable place field. |
| **m7** tab name | Kept "Sources and forms". | | |
| **m10** say only what runs | The words name forms and checklists only. | `contracts/start-setup.ts` | |
| S2 fix 3 kept | Clicking a Not started name opens no page. A toast says "… is not started yet. Start setup on it begins its setup." | `pages/programs.tsx` | `check_screen01_browser`, `check_w1_programs_s2` |

**Checks moved off `/new`:**
- the studio journey's Pass B: names through the Add pop-up from Immigration programs, then Start setup on the card;
- `check_screen01_browser`, `check_w1_programs_s2`, `check_w1_s1s2_fix` and `check_screen02_slice2_browser`;
- qa's `check_qa_am_s2_1027`, routed in its own commit named for qa (f8d6e0cb), only that change.

qa's `check_qa_m2_journeys.cjs` was already stale before S3: it presses a "New combination" button that left main in round 3. It needs qa's own rewrite.

**Scaffolding (P-33, said in the check):** the only saved finder answer is the sample's Visitor visa (key `vv.single`, and that combination is already started by Load sample). To prove the free replay, `check_w1_start_setup.ts` copies that answer under its own combination's key and removes the copies at the end.

**Not in S3 (left as agreed):** m8 (the next step counting a form whose removal waits) and m9 (rule messages naming field codes) wait until runtime slice 2 is on main.

**Seen in the screenshots, for the Lead:** on a just-started combination, the page's own "Next step: Add sources" still shows above the finder offer. That gives two calls to action. The step comes from the shared next-step rule (`engine/programs.ts`). Changing it to "Find forms" is a question for the Lead, since runtime's slice 3 owns the forms on that tab.

**Evidence:** see the lane file Handover (exact commit, run-suites, journey).
