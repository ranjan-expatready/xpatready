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
