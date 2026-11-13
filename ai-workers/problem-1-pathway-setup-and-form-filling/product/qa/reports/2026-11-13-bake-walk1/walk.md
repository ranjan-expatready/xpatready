# Walk 1 (BK-6) step log: Visitor visa, counted for E1
Commit b26ad94309165104f6f688d80490f7251dbfb2f7 (tech lead's go, Lead 28, 13 Nov 07:4x IST). Copy qa_w1 :4471, fresh database, Live AI off, US$0. Chromium 153 headed on Xvfb :99, 1440 x 1000, driven by `scripts/drive.mjs` (prints only what a person sees).
Counts: L = extra login, D = dead end, H = help (rules in plan.md §3).

| # | Person (how changed) | Step | What the screen showed | L/D/H · finding |
|---|---|---|---|---|
| 1 | — | Typed `/sign-in` (the only typed URL) | "Who are you today?" four cards, More people (5) | — |
| 2 | Configuration author (the one sign-in) | Sign in as Configuration author | Lands on Demo › Starting points; three doors; "Last loaded: Nothing set up" | — |
| 3 | author | Door 2 "Pathways released, ready to walk" › Start here › dialog "Empty and start" | Clear dialog (goes / comes back / kept, US$0); progress "Loading the configured checkpoint… N s"; ~140 s; lands on Immigration programs by itself | — |
| 4 | author | Read Immigration programs | 5 combinations, each "✓ Live · Next release: N of 5 steps to do" and "Needs you"; banner "Draft · 73 changes in the shared library, released with the next release" | Watch: every just-released pathway reads "Needs you" (Minor UX, see findings); banner = QA-423 seen again |
| 5 | author | Visitor visa › Open | Overview: breadcrumb + Back, "Live · Release 6", tabs, "Open a case on Release 6" | — |
| 6 | author | Documents › Spouse tab › Add a document: first tried Save before choosing (my driver missed the select) | Save to draft with no type chosen: dialog stays, **no message** | QA-424 / QA-419 M1 seen again (Minor) |
| 7 | author | Document type "Birth certificate of accompanying dependent child", Whose "Each child", client, Base › Save to draft | Dialog closes, **no message**; list stays on the Spouse tab (new line not in view); "Child (travelling) · 10" (was 9); header "2 draft changes" | QA-424 seen again (Minor). Note: one line = "2 draft changes" |
| 8 | author | Review and release tab | 3 steps (author submits / expert signs / second person releases), "2 draft changes; 0 problems to fix", 0 errors · 35 warnings | — |
| 9 | author | Submit for review | "Submitted by Configuration author"; line shows **"Hand to the Content reviewer →"**; Sign, Submit, Return to author, Approve and release shown disabled beside it | QA-422 seen again (Minor) |
| 10 | → Content reviewer (**hand-off button**) | Hand to the Content reviewer → | Same page, "You are acting as Content reviewer" | — |
| 11 | Content reviewer | Select all I can sign › "Sign 2" | "2 of 2 … signed"; **"Hand to the Approver →"** | — |
| 12 | → Approver (**hand-off button**) | Hand to the Approver → › Approve and release | "In Release 7 · draft matches the release", "Last released: version 3, in Release 7, by Approver"; **"Open a case on Release 7 (as Case officer) →"**; banner still "73 changes in the shared library, released with the next release" | QA-423 seen again (Minor) |
