# QA-218 — Saved masters run on the screen (C3.4), build notes

Row: QA-218 (Gap · Major, C3.4). No screen offered the saved AI masters run (#771); it was reachable only through
`POST /attachments/:id/draft-masters {mode:"replay"}`.

## Plan
1. `web/src/components/ai-launch.tsx` `FormMasters`: for each recognised form and guide, ask the existing
   `POST /attachments/:id/draft-masters/plan {mode:"replay"}` whether a saved run exists (US$0, no model call).
2. Where it does, show **"Saved · US$0"** next to "Draft sections and lists · US$0"; it posts
   `{mode:"replay"}` through the one door (P-149 (1), P-120): the server's own lock, once-per-edition rule and
   identity rules decide; nothing is drafted in the browser.
3. Where none exists, say so in plain words; Live stays off (P-175), shown greyed, never clickable here.
4. The result line says how many proposals wait on To review, with "Open Proposals".
5. New browser check `tests/check_forms_qa218_saved_masters_browser.cjs` on an isolated copy reset to the six, 1440 px.

## Built (after the review of 2db26cc18)
* **Review M1, fixed:** one request per screen view. `GET /combinations/:id/masters-readings` (and
  `GET /attachments/:id/masters-reading` for the Library dialog) says, for each form and the guide, whether a Saved AI
  run exists and whether its one AI draft is done, with its queue group (api/src/form-masters.ts `readings`, the plan's
  own `saved()` and the draft's own once-per-source key `aiContext()`). It names no run file and no cost, so like
  `checklist-readings` it needs no author duty. Fail test: the check counts the masters requests a view sends (was 8).
* **m2, fixed with M1:** a page that is neither a form nor the guide is left out on the server, so no 400 in the console.
* **m3, fixed:** after a click, focus moves to the row's "Open Proposals".
* **m4, fixed:** a drafted form or guide reads "Drafted with AI (Saved, US$0)" with Open Proposals, and no second Saved.

## Deviations, for the tech lead (never silent)
* **m5, Live is not shown greyed with its cost.** The row's "Expected" asks for it. The server cannot plan a Live cost
  while the live switch is off: `draft-masters/plan {mode:"live"}` answers 409 "AI now is not approved yet" before it
  reads anything (P-175). Showing a cost would mean a second cost route that bypasses that refusal. The panel says
  "Live waits for the founder's OK on its cost" instead, as the Checklists panel beside it does (P-227: only Live and
  Saved are offered; no priced button in a check). Recommendation: keep; add the greyed Live with its cost when the
  plan can price it with the switch off.
* **m6, placement.** The panel is reused, unchanged in shape, on the combination's Forms tab under the Sources line
  (authors only), because on the six the guide's saved run had no other door. The combination's Draft setup opens only
  at Map forms, and the Form library lists guides with no attachment, since a guide's run is per combination. It is the
  last block of a long tab, and the step card does not point to it. The tab now also shows the rules buttons for every
  form. Recommendation: keep for QA-218, and let the forms concept place it (or point the step card at it) when the
  Forms tab's next concept is drawn.

## After the reviewer's Approve of 048bc1cfe: the suites found one break (fixed)
* `check_s5_slice2_browser.cjs` failed "fix 1: each form appears once (no second list of the same forms) — 2": the panel
  on the Forms tab listed the forms a second time, against the S5 early-look fix 1. Fixed: on the Forms tab the panel
  shows **only the guide** (`FormMasters guidesOnly`), whose AI run belongs to the combination. A form's masters are per
  edition, so its door stays Library › Forms › its ⋯ › Re-read with AI (one form, already there). This also settles
  m6's "the tab now shows the rules buttons for every form". On a combination with no AI-drafted guide (With an LMIA),
  the tab shows no panel.
* After the fix, on fresh copies: the QA-218 check 22/22 twice (exit 0), `check_s5_slice2_browser.cjs` 63/63 (exit 0),
  `check_forms_c34_masters_browser.cjs` 9/9 (exit 0).
* Not this change: `check_qa184_live_state_browser.cjs` stops in 1 s on this cloud machine ("Please run npx playwright
  install": it launches Chromium without this machine's browser path). The file and the code it covers are not touched.
* Reviewer's round-2 Minors, left as follow-ups: the drafted line always says "Saved, US$0", even for a Live draft (only
  on a copy with the live switch on), and `readings` does one job lookup per source (at most 9 on the six, one request).
