# qa after-merge 5 — main 6b424941 (1 Nov 2026)

**Run:** `git log --first-parent 63168762..6b424941`: #241 (forms F2 C2.12 slice 3, the guided path), #245 (screens QA-77, one name per person), #244 (screens X1b, the filing tag), #243 (screens, a focus ring app-wide), #250 (runtime QA-116, a suite wait) and #246 (records). Cloud qa session (P-212), started from the handover on #253.
Copies (isolated.sh, no STUDIO_*_LIVE, US$0): qa_wk :4472 (Load sample), qa_rt :4473 and qa_r1d :4476 (`setup_visitor_visa.ts`), qa_c48 :4474, qa_x1 :4475, qa_c212 :4478 (the builders' checks), qa_216 :4477 (#216's branch fb500e6c, before it merges).

## Verdict
**Ready for what merged.** #241, #243, #244 and #245 do what they say. Their builders' checks pass on main, and a person's walk passes. There is no new Blocker, Critical or Major. One new Minor: QA-130 (the guided path's "Your next step" link). QA-77 is closed. QA-119 (Major) is still open: #216 fixes it in qa's check but is dequeued.

## What was tested
| PR | Like a person | Underneath |
|---|---|---|
| #241 C2.12 slice 3 | Author walks the step chip on each form row of each combination, opens the guided path with the keyboard, reloads (`?setup=` resumes), presses Escape (focus goes back to the chip), opens each step link and what's-left link, then a form that is gone (`IMM 9999`), a 90-character nonsense value, the wrong role by URL (case officer, client), widths 400/1024/1440 and axe | Every chip agrees with GET …/progress (6 forms on 5 combinations). The wrong role gets 403 with a message. `check_forms_c212_rail_browser.cjs` 31/31. `tests/qa/check_qa_am_1101d_c212_walk.cjs` 27/28, the same on 3 runs (QA-130) |
| #245 QA-77 | Visitor visa: six tabs read for person names | `check_qa77_names_browser.cjs` 17/17. The qa walk's QA-77 lines pass: one set of names on every tab |
| #244 X1b | (the builder's check walks the Programs card) | `check_x1b_filing_tag_browser.cjs` 11/11 |
| #243 focus ring | The client's questionnaire by keyboard at 200% zoom and at 1024 px | `check_qa_am_1101c_runtime_walk.cjs` focus lines green on 2 runs. The same check on the pre-#243 copy fails on the "Cases home" link and the person picker, so the check tells fixed from not fixed |
| #250 | (a suite wait only) | It passed in the merge batch (#255) |

Suites on the exact commit: the merge batch #255 (#113 was dropped from it; #241, #243, #244, #245, #246 and #250 merged) ran CI green (P-85). I did not run the full suite set, the graph, c8 or live AI, on purpose (brief).

## Retests
- **QA-119** (Major, open): still on all 5 combinations on 6b424941. The fix is #216. On its branch (fb500e6c, copy :4477), `check_qa_am_1101c_walk.cjs` passes the QA-119 line, **5/5 combinations agree**. I updated the check for #216's header (`[data-header-next]`, "Next step · <step>"), with a fallback for today's main. When #216 merges, rerun it; then look at QA-129 (With an LMIA).
- **Focus ring (#243): fixed.** My round-4 check was wrong on two counts, now corrected:
  - It read the style the instant Tab landed. Buttons ease their ring in (`transition-all`), so it now waits for the element's transitions to finish.
  - Its pattern only knew `rgb(…)` rings. It now parses every shadow layer (`rgba`, `oklab`).
  - The page's heading, which receives focus after a step (`tabindex=-1`), is no longer counted as a Tab stop.
  - So round 4's failing button stops were the check, not the product. The plain link and the select really had no ring before #243.
- **QA-77: closed** (moved to `history/qa-bugs-closed-2026-11-01.md`).
- **QA-76: still open.** "No answer list yet (forms slice 2)" is shown on the case page.
- **QA-122: still open** (`check_qa_am_1101b_api.ts` 6/7). **QA-126 to QA-128: still open** (`check_qa_am_1101c_validated.ts` 5/9, after `check_runtime_r1d.ts` 80/80). These were rerun because #245 touched the runtime case page. Their fixes have not merged.
- **QA-123 to QA-125:** not rerun. No merged change touches them, and their fixes are not merged.
- **QA-120 and QA-121:** their fix is #256, which is open and not merged.

## New finding
- **QA-130** · UX · Minor · C2.12 · forms. On IMM 5257's guided path (Visitor visa), "Your next step: Draft with AI or add from the library" only closes the panel.
  - The address is the same Forms tab. Keyboard focus goes to the top of the page, so a keyboard or screen-reader user loses their place. A sighted person sees the row scrolled into view.
  - The words offer both actions on every form. IMM 5257 can only be drafted ("Read: ready for AI drafting"); IMM 5707 is the one in the library.
  - Expected: the link names that form's one action and lands on it, with its button focused.
  - Evidence: `03-c212-after-next-step-click-1440.png`.

## Seen, not a new row
- **To review with `?form=`:** the screen ignores it. GET /review-queue filters by it (#179), but `web/src/pages/to-review.tsx` never reads `form`, and no guided-path link uses it yet: step links go straight to the item's page. The F3 build notes (`screens/F3-add-form-wizard/build-notes.md:74`) put the screen's `?form=` in later slices 5–8, so the walk prints it as INFO, not a failure. Recorded on the C2.12 row.
- **P-209**, renaming the sample's "Applicant" to "Principal applicant", is not in yet. It is backlog row X1c (runtime).
- The Forms tab of Visitor visa still says "No form find yet … Nothing was spent yet" with 2 forms attached. That is QA-78; #252 fixes it and is approved but not merged.

## Not tested
- The shared demo :4400, read-only: this is a cloud copy.
- Headed walks: there is no display here, so the walks ran headless with screenshots at each decision point.
- A fill trial as a person: there is still no screen for it.
- Coverage (c8): partial c8 is allowed until the weekly nightly run.

## Checks committed
- `tests/qa/check_qa_am_1101d_c212_walk.cjs` (new): 27/28. The failing line is QA-130; QA-77's two lines pass.
- `tests/qa/check_qa_am_1101c_walk.cjs`: the header locator now works on main and on #216.
- `tests/qa/check_qa_am_1101c_runtime_walk.cjs`: the focus ring is read after transitions, any colour form is accepted, and programmatic focus targets are skipped. 18/19 on main; the failing line is QA-76.

## Questions for the Lead
1. #216 is dequeued, and it's the fix for QA-119 (Major). Its branch passes qa's QA-119 check. Re-queue it? *Recommend:* yes, after merging main into it.
2. QA-130: should "Your next step" on the guided path name the form's one action, rather than "Draft with AI or add from the library"? *Recommend:* yes. The API already knows which applies (the row shows one button).

## Suggestions
- *Later · Capability:* when the guided path reaches step 3 (review), link "What's left" to `/review?form=<form>` once the screen reads `?form=`, so the form's To review items are one click away.

Bugs: 0 Blocker · 0 Critical · 0 Major new · 1 Minor new (QA-130). Closed: QA-77.
