# QA-218 — journey test (reviewer role), 4 Nov 2026

Commit 2db26cc18 (PR #929, branch claude/busy-einstein-w2ugbm). Isolated copy `rev218` on :4486, reset to the six with
`POST /api/demo/reset-to-six` (201, 21.7 s), headless Chromium driven like a person (click, Tab, Enter, read). Live AI off;
no priced button clicked; copy stopped afterwards. Screenshots were kept in the session scratchpad only (not committed).

## Journeys (main path first)
1. **Author, main path (keyboard only), 1440 px.** Immigration programs › Visitor visa › Forms tab › "Forms and guide: sections,
   answer lists and checks" › Tab to "Saved · US$0" beside IMM 5257 (09-2023) › Enter. Result line "Saved AI draft (US$0): 47
   proposals wait on To review. Open Proposals" after 811 ms. Held.
2. **Author, guide (mouse).** Same panel › "Saved · US$0" beside "Guide 5256 page" › "13 proposals wait on To review" (245 ms) ›
   Open Proposals opens To review › Proposals with the Visitor visa combination group selected (13, Cross-check, AI pill). Held.
3. **Empty/alternate.** The other six Visitor visa forms show "No Saved AI draft of its checks yet; Live waits for the founder's
   OK on its cost." and only the rules button. With an LMIA shows five such forms and no guide row. Held.
4. **Recovery: second click, reload, double click.** After a reload, Saved on the guide answers "Already drafted with AI: … 13
   proposals for To review …"; a double click on a fresh IMM 5257 made one job and 47 proposals, no error. Held, but after a
   reload the row looks exactly as before the run (blue "Saved · US$0", no drafted state).
5. **Rules after Saved.** "Draft sections and lists · US$0" on IMM 5257 after Saved: "Already drafted for this edition: Saved AI
   draft of IMM 5257 (09-2023) (US$0.00) …". No second job. Held.
6. **Wrong role.** Acting as Approver: no panel, no Saved button. By URL: plan and draft as user-B and user-C give 403 "does not
   hold the author duty"; no actor gives 401. Held.
7. **Race (break-it).** Three parallel `{mode:"replay"}` POSTs on a fresh guide: one 201, two 409 "This source is already being
   drafted with AI. Wait for that run to end, then look at To review."; 13 proposals, 1 job. Held.
8. **Hand-off across the screen boundary.** From the result line to To review (edition group "IMM 5257 (09-2023)", 131 items incl.
   form checks; combination group for the guide). Held.

## Data underneath (after journeys 1–2)
proposal_item: masters_edition section 13 + answer_list 13, masters_form form_check 17 + document_type 4 (= 47), masters_guide
cross_check 13. drafting_job: 2 × masters_edition REPLAY COMPLETED, cost 0, started_by user-A. Total spend 0; LIVE jobs 0;
audit_event +2. Nothing else changed.

## Automated replays
* Builder's `tests/check_forms_qa218_saved_masters_browser.cjs 4486 xr_studio_rev218`: 17/17, exit 0 (27.8 s).
* `acceptance/C3.4.test.ts 4486 xr_studio_rev218` after a fresh reset to the six: 20/20, exit 0.
* axe WCAG 2.2 A/AA on the panel (before, after, other combination): 0 violations. Sideways scroll 0 at 1440, 1024, 720
  (1440 at 200 %) and 400 px. Page errors 0.

## Findings
| # | Sev | Where | What |
|---|---|---|---|
| J1 | Major | `web/src/components/ai-launch.tsx:160–162` | One `POST …/draft-masters/plan` per row: 8 requests per Visitor visa Forms view (42–78 ms each), again on every refetch (staleTime 0). STANDARDS §5 [M] "one request per screen view, not per row" and §9 "no request per row", D15. |
| J2 | Minor | `ai-launch.tsx:173–181`, shared `Button` disabled-while-busy | Keyboard: after Enter on Saved, focus drops to BODY and the next Tab starts at the page top; "Open Proposals" is ~95 Tab stops away again. |
| J3 | Minor | `ai-launch.tsx:187–190` | After a reload a drafted row is indistinguishable from a never-run one (blue "Saved · US$0" again); only a click reveals "Already drafted". |
| J4 | Minor | `ai-launch.tsx:160` | Every recognised non-checklist attachment is probed; on With an LMIA the guide 5553 page gets a 400, logged in the browser console as "Failed to load resource … 400". |
| J5 | Minor | `pages/workspace/forms.tsx:177` | Placement: the panel is the last block of a ~3 700 px Forms tab (93 Tab stops in); the step card ("See it on Forms") does not lead to it. |

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J2: both saved runs started from a screen, drafts in To review |
| Next step obvious | ½ | J5: the panel sits at the bottom of a long tab; Open Proposals is offered right after the run |
| Plain words | 1 | Result, refusal and empty lines are plain; "Guide 5256 page · Guide" repeats itself (nit) |
| Feedback and state | ½ | Result line with count; J3: no drafted state after reload |
| Correct data | 1 | 47 = 13+13+17+4, one job each, US$0, audit +2, race safe |
| Error recovery | 1 | Second click, rules after Saved and race all answer in plain words; nothing duplicated |
| Accessibility and screen sizes | ½ | axe 0, no sideways scroll at 400–1440 px; J2 focus lost after Enter |
| Speed | 1 | Panel settled 414 ms after the tab click; Saved 811 ms / 245 ms |
| Visual quality | 1 | Matches the Checklists panel (one primary per row, team buttons) at 1440 / 1024 / 200 % |
| Trust and sources | 1 | US$0 on each button, "Saved AI draft (US$0)", AI pill and Sample on To review |

**Score: 8.5 / 10, no criterion at 0: pass.** Fixes that would raise it, most valuable first: one per-combination read of the
saved state (J1, also clears J4); keep focus on the button or move it to the result line (J2); show "Drafted · Open Proposals"
for a row already drafted (J3).

## Not tested
A real screen reader; a visible (headed) browser pane, so the walk was headless with screenshots; an intended user's unaided
walk (D17, D20 stay with the founder); Live (never clicked, by rule).
