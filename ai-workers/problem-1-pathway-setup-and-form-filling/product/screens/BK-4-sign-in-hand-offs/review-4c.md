# BK-4c review: case hand-offs (PR #1589)

Independent reviewer: skill screen-review plus journey-test (reviewer role, the one journey score for this check). Fresh context; I did not build this. 12 Nov 2026 IST. **Commit reviewed: `5a13935ede2d7721e36fb611e42fa473f8658f06`** (branch `claude/screens-bk4c-handoffs`, stacked on BK-4a `975779226`). Scope: 4c's own diff only (`git diff 975779226..5a13935e`): new `runtime/hand-off.tsx`; `runtime/cases.tsx`, `questionnaire.tsx` and `readiness.tsx`; the tests. Spec: `concept.md` rev 2 (approved, P-484) read from `origin/claude/epic-feynman-qiq6u6`, §3, BR-1 to BR-8, §5 "4c", §7, §8 and §10.
Test copy: :4461 (db `xr_studio_screens_bk4cr`), never :4400, stopped afterwards. Live AI was off, no priced button was pressed, and the cost was US$0. My scripts and screenshots are in the reviewer's scratchpad (`walk.cjs`, `shots/`), not in the repo. The journey report is in this file, because I was asked to write only this file.

## What I re-ran (at the exact commit)
* **Type check:** `tsc` (web) exit 0. **Graph:** `graph.mjs --check` exit 0 (G1 0, G4 0). 4c adds no page and no API route.
* **Code checks:** `check_bk4c.ts` 13/13 and `check_bk4a.ts` 22/22.
* **Browser checks**, run from scratch copies so no tracked screenshot was overwritten: `check_bk4c_browser.cjs` **40/40** (configured checkpoint, then finished story) and `check_bk4a_browser.cjs` **46/46**.
* **Mutations of `check_bk4c.ts`** (scratch copy of `runtime/`): each turns one line red (12/13): removing the firm-staff guard on `from`; removing `plainClick`; showing the representative hand-off to the representative themself; dropping `from` between parts; a literal `"user-P"` target.
* **Not re-run:** `check_bk3_*` and the packs. Nothing in `tests/` or `qa/` depends on the old words "Open it as" or "Act as Client A" (git grep).
* **C11.1 pack failing on the configured checkpoint:** this is **not caused by this change**. The PR has no diff under `api/`, `prisma/` or `contracts/`. The refusal ("IMM 5707 was removed from this combination") is a server answer during the pack's API set-up, before any screen is read, so the base `975779226` serves the same API and data. It is pre-existing; it belongs to C11.1's pack and data, not to this PR.

## Concept fit
| Item | Result |
|---|---|
| §3: 4c only calls `setActor(id)` in a click handler, then navigates; targets come from data | Met. `hand-off.tsx` is the only new `setActor` site. Targets come from `c.client`, the questionnaire view's `case.client`, `?from=` and `rounds.representative`. The notice comes from 4a and shows once (double-click: one notice). |
| Case page: "Hand to Client A (simulated) →" with `?from=<officer>` | Met (my `j1-02-case.png`; `screenshots/bk4c-case-to-client-1440.png`). Client B's case targets Client B. |
| "Act as Client A" at `:278` → the case's own client | Met. It reads the same query as `useCaseView` (same key), so no extra request. |
| Client "Every part is answered" → "Hand back to <from> →" to `/cases/:id`; not on a person's own link; not without `from` | Met. Only shown when `from` is a firm person. Fail sides checked: no `from`, a Studio person, an unknown person, a client. `from` survives part navigation and reload (J5). |
| "Send for review" → "Hand to <representative of record> →" to the round; solo firm none | Met. The round is worked out from the rounds, so it survives a reload. It is hidden for the representative themself. The solo-firm case is guarded in the source only (`rep !== actor`), with no browser step. |
| BR-1 / P-456 (3): 0 person changes outside sign-in, picker, hand-off | Met. My J1 had 4 writes of the person: sign-in, then 3 hand-offs, and nothing else. Ctrl-click and Shift-click change nobody (BR-7). |
| BR-2: shown only when the next step belongs to someone else, computed from the step's state | Partly: see Minor 1 (the case page's "Next: Client A answers" stays after every part is answered). |
| BR-3: target not refused by the server | Partly: see Minor 3 (a hand-typed `from` of a firm person outside this case). |
| BR-4, BR-5, BR-7 | Met. Each button lands where the person works next. Client A at the round URL gets "Only the case officer can do this." Every hand-off is a button. |
| §8: 4c guards its own scope `runtime/`; allowed list updated | Met (`check_bk4a.ts` ALLOWED: `cases.tsx` 2, `hand-off.tsx` 1). |
| §8 browser at 1440 and 375 px | The checks run at 1440 and **400** px, not 375. Both are below the 640 px step, and I also checked 512 px (200 % zoom at 1024): 0 px of sideways scroll. Accepted, as the lead's done-when says 400. |

**The builder's claims, judged:** the "(simulated)" label is accepted (§5 4c writes it so; it matches 4a's frame links). Ignoring a modified click is correct for a button. Discovery 1 (part navigation dropped `from`) is real, fixed and tested. Discovery 2 is true: only the finished story has a fully answered case, and on the configured checkpoint the client returns by the picker, which BR-1 allows. Discovery 3 (the C11.1 pack): agreed, see above.

## Standards ([M] lines touched)
**Met:** STANDARDS §6, the server still decides (BR-5 above; no API change) · §5, no per-row request · §7: strict TS, no `any` added; dead code removed (the `ExternalLink` import, the literal id); a rule's test fails when the rule is removed (mutations above); axe WCAG 2.2 AA clean on every hand-off at 1440, 1024, 512 and 400 px and on the whole client `main` · §9: hand back → case page 330 ms, → round 845 ms; hand to client → questionnaire with 90 parts 2.3 s, the existing view load · EXPERIENCE §2.5, the next step is named · §2.12 keyboard: 10 Tabs to the hand-off, visible focus ring, Enter and Space both work · P-473: hand-offs are secondary buttons, none adds a filled button · demo chrome separate: "(simulated)" on every button.

**Partly:** BIC-14, because the tip is `title` only (Minor 2).

## D1–D20
D1 4: every 4c hand-off is wired; BR-2 and BR-3 partly (Minors 1, 3) · D2 4: the only write is `xr-actor`; the server decides · D3 4: one component, no copy of the person · D4 N/A · D5 4: reload, double-click, Ctrl-click hold; Back loses the hand back (Minor 4) · D6 N/A · D7 N/A · D8 4: each button names who takes over · D9 5: one click per hand-off · D10 3: mixed words (Minor 5) · D11 4: one notice per change · D12 4: team tokens, secondary buttons · D13 4: axe clean, keyboard OK, tip hover-only · D14 4 · D15 4 · D16 4: pass and fail lines per BR, mutations caught · D17 simulated only · D18 4: "(simulated)" on each · D19 4: with 4a, the E1 case leg runs on buttons only · D20 simulated only.

## Best in class (concept §6: BIC-11, 14, 18, 20; BIC-19 always)
| Check | Score | Evidence |
|---|---|---|
| BIC-11 one primary, named | Met | No filled button added; each hand-off names the action and person (`j1-02-case.png`, `j1-04-rep-handoff.png`) |
| BIC-14 help in place | Partly | The tip "You act as … Use the person picker to come back." is a `title`: no tooltip on keyboard focus (J9). Concept §7 says "keyboard too" (Minor 2) |
| BIC-18 states drawn | Partly | Shown and hidden states are right; the case page still says "Next: Client A answers" at 90 of 90 (Minor 1) |
| BIC-19 low load | Met | One line plus one button; at 400 px the button wraps under the words (`j4-case-top-400.png`) |
| BIC-20 accessible | Met | Keyboard path, ring, 0 px sideways scroll at 1024, 512 and 400, axe clean |
| BIC-01–10, 12, 13, 15–17 | N/A | Concept §6 |

## Journey test (reviewer role), score
**Journeys:**
* **J1 main**, Case officer: `/sign-in` → case list → SAMPLE-VV-FAMILY-1 → Hand to Client A → 90 of 90 → Hand back → case page → Send for review → "Sent for review (round 4) · Next: Representative (Sample) checks each form…" → Hand to the Representative → "Representative's review · Round 4". Held, with 0 changes outside the hand-offs.
* **J2 Back** after the hand-off: the client meets "This page is for the case officer"; its link drops `from`, and the hand back is gone (Minor 4).
* **J3 keyboard-only**, **J4 sizes** (1024, 512, 400 px) and **J5 reload**: held. **J6 double-click:** one notice. **J7 wrong role by URL:** the server refuses.
* **J8 forged `from=user-S`:** the button shows and lands on "No such case" (Minor 3).
* **Data underneath:** `xr-actor` was exact at every step, and one round was created for one send.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 end to end by buttons |
| Next step obvious | 1 | Each hand-off names who and what |
| Plain words | ½ | Minor 5 |
| Feedback and state | ½ | A stale "Next" on the case page (Minor 1) |
| Correct data | 1 | Person exact; one round per send |
| Error recovery | ½ | Back loses the hand back; a forged `from` dead-ends (Minors 3, 4) |
| Accessibility and screen sizes | 1 | axe clean at 4 widths; keyboard; ring |
| Speed | 1 | 330–845 ms; 2.3 s is the questionnaire's own load |
| Visual quality | 1 | Calm secondary buttons; no orange |
| Trust and sources | 1 | "(simulated)" on every hand-off |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0). Fixes that raise it, most valuable first: Minors 1, 4, 5 |

## Issues, ranked (no Blocker, no Major)
1. **Minor (Should), BR-2: the case page's line ignores the client's state** (`runtime/cases.tsx` ~224). On the finished story (90 of 90) it still says "Next: Client A answers on their phone…". **Fix:** when every part is answered, say so ("Client A answered every part"). Keep the button, because the client can still change answers.
2. **Minor (Should), BIC-14 and concept §7 "keyboard too": the tip is `title` only** (`runtime/hand-off.tsx:39`). **Fix:** use the team's Radix `Tooltip` (opens on focus), or drop the tip; the button already names the person.
3. **Minor (Should), BR-3: the hand back trusts any firm person in `?from=`** (`questionnaire.tsx` ~458). A hand-typed `from=user-S` hands back to the Solo representative, who gets "This case could not be opened · No such case." **Fix:** show it only when `from` is on this case's team (the representative or an officer); otherwise show nothing.
4. **Minor (Should), recovery: Back after "Hand to Client A" loses the hand back.** The client then sees "This page is for the case officer", and its link (`cases.tsx:206`) drops `from`. The client then needs the picker, which is not a dead end (BR-1 allows it). **Fix:** carry the current `from` on that link.
5. **Minor (Should), words:**
"Next: Representative (Sample) checks…" uses the team's name beside "Hand to the Representative (simulated)" (`readiness.tsx:93`); "Next: Case officer reviews your answers." has no "the" (concept §7: "Next: the Content reviewer…") and repeats the line above it ("Your officer reviews your answers…"). **Fix:** use `handName()` in both "Next:" lines; drop the repeat.

## Could not check
A real screen reader · Safari and macOS · the solo firm in a browser (source guard only) · re-running the packs (reasoned above) · an intended user's unaided walk (D17, D20 stay with the founder).

**Verdict: Approve (5a13935ede2d7721e36fb611e42fa473f8658f06).** There are 0 Blockers and 0 Majors. Fix Minors 1–5 in this PR, or list each as a follow-up row.

## Re-review (96d47a1)
Same reviewer, diff only (`git diff 5a13935e..96d47a1a`), at the exact head `96d47a1a376804d6b57c26db0d4244e49ae5d86e`. Fresh copy on :4461, web rebuilt at this head (the bundle contains `xr-handed-from`), stopped afterwards. Checks ran from scratchpad copies, so no tracked screenshot was touched. US$0, no priced button.
**Re-run:** tsc (web) exit 0 · `check_bk4c.ts` 16/16 · `check_bk4a.ts` 22/22 · `check_bk4c_browser.cjs` **46/46**. My own probes on the finished story (`probe2.cjs`): every frame was sampled during each hand-off; data, 1024 px and 400 px were checked.
**My round 1 Minors and the breaker's findings:**
* **Break M1 (BR-2) and my m1: fixed.**
  * Every required question answered: "Client A has answered every required question and can still check the answers." No "Next", and the button stays.
  * A round waiting: "Client A answers on their phone, for everyone travelling. Round 4 is with the representative of record now." There is no client button, and this holds after a reload, so there is one "Next" on the page.
  * With answers owed (configured checkpoint): "Next: Client A answers…" (check line 2). The card is axe clean, with 0 px of sideways scroll at 1024 and 400 px.
* **m2 / break m6: fixed.** The tip is a Radix Tooltip. Tab shows "You act as Client A (simulated) in this tab…", Escape closes it, and the focus ring is visible.
* **m3 / break m1: fixed.** The hand back shows only when `from` is the person who handed over in this tab (`sessionStorage`). A hand-typed `from=user-S`, or `from=user-O` with no hand-off in this tab, shows nothing (check lines). This is a fair proxy, since the client's view carries no case team.
* **m4 / break m4: fixed.** Back, then "your Client questionnaire", keeps `from=user-O` and the hand back.
* **m5 / break m5: fixed.** The lines now read "Next: the Representative checks each form…" and "Next: the Case officer picks up from here.", with no repeated sentence.
* **Break m3: fixed.** In my per-frame sampling, 0 of 71 frames (to client), 0 of 52 (hand back) and 0 of 129 (to the representative) showed an intermediate notice to the wrong person. The notice showed once per hand-off.
* **Break m2 (stale representative after another session changes it):** accepted as a known limit (`build-notes-4c.md`). The server keeps that person read-only (BR-5), and a reload corrects it.

**New in this round:**
* **Minor (records): a committed screenshot is blank.** `screenshots/bk4c-case-handoffs-400.png` at 96d47a1 is an empty grey frame (2.9 KB). My run of the same check produced the right image (Ready to file with "Hand to the Representative", 400 px). **Fix:** re-capture it, or wait for the hand-off to be visible before the shot. No code change.

No Blocker or Major is open.

**Verdict: Approve (96d47a1a376804d6b57c26db0d4244e49ae5d86e)**
