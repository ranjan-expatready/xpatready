# Journey test, reviewer role: C3.4 AI step (2026-11-02, commit 0700958f)

No screen exists for Live or Saved yet, so every journey was walked through the API on an isolated copy (:4458), the way the panel will call it. No browser walk, no accessibility or width test (nothing to render): stated, not scored as pass.

| # | Journey (persona: author) | Result |
|---|---|---|
| 1 | Main: draft IMM 5257 sections and lists by rules | 201, 13 sections, 13 lists, marital list 8 choices, all Sample, quotes found, US$0 |
| 2 | Alternate: Saved before any run is recorded | 409 "No saved AI answer ... yet", plain words, no job |
| 3 | Alternate: Saved with a recorded run (builder's check, fake launcher) | both rounds replayed from one run, 28 proposals, US$0, second click returns the same draft |
| 4 | Error: Live with the switch off, and its plan | 409 "Live is not open yet", no job, no spend |
| 5 | Error: bad mode, bad id, null body, checklist attachment | 400, 404, 400, 400 in plain words |
| 6 | Wrong role: viewer drafts | 403 (plan readable by a viewer, no spend) |
| 7 | Recovery: five parallel clicks | 5 x 201, one job, no duplicates |
| 8 | Recovery: failure after a paid Live run | cost and run files lost from the job (review M1); not walked paid, found in code |
| 9 | Across the boundary: accept a section, accept a form check | section lands; form check refused "not yet on this queue" (review Minor 3) |
| 10 | Identity document the model mislabels | AI-read passport comes out Ready (review M2), run on the pure function |

Data underneath: `drafting_job` count matches clicks, cost 0, queue rows once each, audit line written on the AI path.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0.5 | rules and Saved paths work; Live and Saved have no entry a person can use; acceptance 2/16 until a saved run exists |
| Next step obvious | 0.5 | refusals say what to do; no screen |
| Plain words | 1 | every refusal and note in business words, no paths |
| Feedback and state | 1 | plan states worst case first; job note says counts, cost, Sample |
| Correct data | 0.5 | M2 identity case |
| Error recovery | 0.5 | M1: paid then failed loses cost, no Saved offer |
| Accessibility and sizes | 0.5 | not testable, no UI |
| Speed | 1 | all calls under 1 s |
| Visual quality | 0.5 | not testable, no UI |
| Trust and sources | 1 | AI marked as origin, source quote found, examples unconfirmed, Sample |

**7 / 10** (no 0; below the 8 bar). Raise: fix M1 and M2 (+1), a Live or Saved entry on the screen (+1).
