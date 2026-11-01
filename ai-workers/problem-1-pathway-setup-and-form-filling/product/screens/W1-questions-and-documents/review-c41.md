# Review: F6 / C4.1, a combination's section order (Move up / Move down, released with it) — commit 04cf6e5f (code reviewed at d9885cef)

**Verdict: Approve** for **04cf6e5f** (branch `claude/wizardly-bell-gr02rj`). There is no open Blocker or Major.
* **Why the verdict carries to 04cf6e5f:** I tested d9885cef. From d9885cef to 04cf6e5f there is no change under studio `api/`, `engine/`, `web/`, `prisma/` or `contracts/` (`git diff --name-only`, checked by me). The only changes are records (`qa/CAPABILITIES.md` back to main's copy per P-221, `qa/built/C4.1.md` added, main's STATE/BUGS/reports) and main's qa walk check `tests/qa/check_qa_am_1101e_walk.cjs`. So the tested code is the code at 04cf6e5f. A later commit needs a fresh look.
* The Major from round 1 (d39f10ea) is fixed, and I checked the fix in the browser.
* Minors m1, m2, m3, m5 and m6 are fixed.
* m4 (zod contract) is still open as a Minor, listed in the PR as a follow-up.
* One new Minor is below.

Reviewer: an independent session that did not build this. I used my own copy `runtime_c41r` on :4439 (runtime range), never :4400 or the builder's 4432. The web build was from 12:53, after the last source edit at 12:52, and contains the new strings. No AI was used (US$0). 1 Nov.

Concept: `c41-concept-draft.md` on `origin/claude/runtime-c41-concept`, rules R1–R5 (P-216 answer 1). Rename and "Ask it in…" are out of scope (P-216 answers 2 and 3).

## What I re-ran on d9885cef
* `check_c41_section_order.ts 4439 xr_studio_runtime_c41r`: **32/32**. This includes the two new m1 steps:
  * a section removed and added back goes last, with 18/18 distinct places;
  * a stored tie reads the same on the tab as in the move order.
* `check_c41_section_order_browser.cjs 4439 xr_studio_runtime_c41r`: **28/28**. This includes the two new Major 1 steps: Enter on another section's header keeps focus there, and "Open all sections" keeps its focus.
* Neighbours on my copy:
  * `check_c48_sqr_release` 25/25
  * `check_s5_slice2` 31/31
  * `check_qa92_95_browser` 23/23
  * `check_w115_slice2_browser` 55/55
* `tsc -p api/tsconfig.json` reports one error, in `tests/check_c18_age_case.ts:59`. This change does not touch that file.
* **Fail proof (round 1):** I removed the author check, the stale `seen` check and the Review line in a /tmp copy. The API check fell to 19/30, so those rules' tests fail when the rules are removed.
* **Fail proof for the new focus steps:** on d39f10ea my probe saw focus leave the header, so the new step would be red on the old code. This is inferred from that probe; I did not re-run the new check against d39f10ea.
* The checks rewrote tracked screenshots. I restored them, so the tree has only this file changed.

## Round 1 findings, re-checked by hand (my scripts in /tmp/c41rev, not committed)
| # | Was | Now | Evidence |
|---|---|---|---|
| Major 1 | Focus pulled back to the Move button on every render | **Fixed** | `questionnaires.tsx` effect now has `[moved]` deps and calls `setMoved(null)`. After a move, see the table below. |
| m1 | Remove and re-add duplicated a place; tab and buttons disagreed | **Fixed** | `max+1` in `selectSection`; `sectionKey` tie-break in `snapshot.ts:74`. Re-add gives 18 rows with 18 places, the tab tail equals the move order, and the greyed "already the last section" is on the section shown last |
| m2 | "1 row not changed", "Reload…" | **Fixed** | The notice is titled "Section not moved" and says "The order shown now is the current one; move it again if you still want to." Axe is clean |
| m3 | Ordinal function copied | **Fixed** | One `ordinal` in `engine/validate.ts`, imported by `studio.ts` |
| m4 | No zod contract for the two routes | **Open (Minor)** | A follow-up in the PR. STANDARDS §4 [M] "contract first" is still unmet for these routes |
| m5 | Icon-only buttons with no tooltip at 200 % | **Fixed** | Enabled wrapper title, e.g. "Move up: Residence and immigration status" |
| m6 | Port 4441 (screens range) | **Fixed** | Usage lines now use 4432 |

**Major 1 probes after a move:**

| Action after the move | Where focus ends | Page scroll |
|---|---|---|
| Click "Open all sections" | Stays on it ("Close all sections") | — |
| Tick a row | Stays on the checkbox | Unchanged (658) |
| Click a person chip | Stays on the chip | — |
| Press Enter on the "Travel history" header | Stays on the header | Unchanged (1976 → 1976) |
| Press Enter on Move down four times in a row, waiting 3 s after the last | Stays on "application_details \| down" each time (now 5th) | — |

So focus survives the refetch that reorders the sections.

## Journey (reviewer score, journey-test skill)
* **Persona:** the content publisher (author) on "With an LMIA".
* **Goal:** "ask Languages straight after Application details for everyone, and have it go out with the next release."

What I saw on the walk, headless Chrome at 1440 and 512 px:
* **Move:** keyboard Move up takes 103 ms. The toast gives the new place, with Undo.
* **Review:** the line reads `Sections reordered: "Languages" now 2nd, "Personal details" now 3rd`, and axe is clean there.
* **Stale tab:** the move is refused in the new notice.
* **Approver:** the Approver has no buttons, and a direct call returns 403.
* **Release:** proven by API check R5.

Break-it pass:
* Two parallel moves sent with the same `seen` give 201 and 409, and a double click gives 201 and 409, with unique places kept.
* A hostile key gives 409 in words.
* One audit line per move.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Move, Review line, one release with the new order (R5) |
| Next step obvious | 1 | Toast with the new place; the draft change shows on Review |
| Plain words | 1 | "Section not moved" with what to do; titles, never keys |
| Feedback and state | 1 | Toast, focus kept, the draft line |
| Correct data | 1 | Unique places after a race and after a re-add; one audit line |
| Error recovery | 1 | Undo; stale and double moves refused without harm |
| Accessibility and screen sizes | 1 | Axe clean; focus kept and never stolen; 1024 and 512 px with no sideways scroll; tooltips |
| Speed | 1 | Move about 0.1–0.2 s; tab first load 1.07 s |
| Visual quality | 1 | Team look; quiet buttons on the header |
| Trust and sources | 1 | No AI; a draft until release, and the released order is unchanged before approve |

**Score: 10/10. Pass.**

## Blockers
None.

## Majors
None.

## Minors (open)
1. **m4, contract first (STANDARDS §4 [M]).** `GET …/section-order` and `POST …/sections/:key/move` have no zod schema in `contracts/`. The web types them inline, and the body is checked by hand. This is tracked as a PR follow-up and should get a BACKLOG or bug row so it is not lost.
2. **New: the refusal words are rewritten on the client by matching the server's text.** At `questionnaires.tsx:291`, a `replace(/ Reload to see the order now, then move it again\.$/ …)` swaps the end of the server's message. If the API words change, the UI silently shows the old "Reload" advice again, and no check pins the two together.
   * **Fix:** have the API return a field-level code or reason, or drop the "Reload" sentence from the API message. The 409 itself stays as it is.

## What I could not check
* A real screen reader.
* A visible (headed) browser: the walk was headless scripts.
* An intended user's unaided walk (D17/D20 stay with the founder).
* `tools/graph.mjs`, because it rewrites `qa/GRAPH.md`.
* The other neighbours the builder listed (engine, preview_sets, pqr, w115_slice1, who_fills). I relied on the builder's counts for those.
* D1–D20 per-dimension scores: this is a one-capability slice, so I scored the journey and the concept rules instead.
