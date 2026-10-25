# Screen 02 — build notes

## Slice 1 (BUILD, 25 Oct): To review page + AI work log on today's data; QA-41, QA-42

### Top 5 production improvements over the board (written before the page code)
1. **One count, two places:** the AI proposals row reads the same newest-step-per-source count as the Programs row ("Review 84 AI proposals" in both), so the two pages never disagree. A test checks it.
2. **Same gate as release:** submitted combinations go through `releaseGates` (QA-1), so To review, the Release page and both release routes say the same thing about who acts next.
3. **No dead links:** a step whose page is not built yet (capture review, merge, screen map) shows its label with "(not built yet)" and a focusable tooltip, never a link to a page that cannot take it. Held files and new editions link to the combination page's held list, which exists.
4. **Names, never ids:** "Configuration author", not `user-A`, on To review and on AI work (the log showed ids before).
5. **The menu tells you:** To review is first under Configure with its "Needs you" count, refreshed every 15 s like the draft bar.

### What was built
| Element | Record (existing) | API | Rule | Tests (`check_screen02_slice1.cjs`) |
|---|---|---|---|---|
| To review list | job items, submissions + gate, captures, online editions, merges, intake items, AI batches | `GET /review-queue?filter=&kind=&q=` (new; contract `contracts/review-queue.ts`) | BR-9: the maker waits; the step is offered only to a person whose duty can take it | capturer, proposer, uploader, submitter wait; a second person needs it |
| Views and filters | — | same | counts add up; oldest first | Needs you · Waiting · Running · All; Kind; search by name and form code; unknown view → 400; unknown person → 401 |
| States | — | — | EXPERIENCE §4 | empty, nothing matches, loading (skeleton + status), error (Try again, "decisions saved") |
| Menu item | — | same (`filter=needs`) | P-79 | first under Configure; badge = Needs you |
| AI work log | `AiBatch` | `GET /ai/batches[/:id]` + `started_by_name` | BR-16 | names, plain dates, "Decisions happen in To review" |
| QA-41 | — | — | keyboard | `Dialog` and `Panel` open on their first field (or on themselves), never on Close. Open a case, Reset, + Add form. Fail-before: all three focused Close |
| QA-42 | audit events | `GET /combinations/:id` `basis_note` | C1.4 | as loaded: the sample's note; after a person's change: "Sample: from the sample inputs; its setup has changed since they were loaded." Fail-before: the stale note stayed |

### Files
New: `api/src/review-queue.ts`, `contracts/review-queue.ts`, `web/src/pages/to-review.tsx`, `tests/check_screen02_slice1.cjs`. Changed: `api/src/main.ts` (module), `api/src/ai.ts` (names), `api/src/studio.ts` (QA-42 `basisNote`), `web/src/App.tsx` (menu, route), `web/src/pages/ai.tsx` (log words), `web/src/components/ui/controls.tsx` (QA-41). No migration; `combination.tsx` (runtime lane) untouched.

### Team-name mapping and real vs mock
Rows read the team-named records already in use (`DraftingJob`, `ReviewSubmission`, `PortalCapture`, `FieldMerge`, `IntakeItem`, `AiBatch`); no new record. Everything is real data from the isolated copy. Scaffolding: the sample load and one replayed saved AI answer (US$0), as in Screen 01's checks.

### Deviations from the board (for EARLY-LOOK)
* **Steps not built yet:** "Approve or return" (capture), "Approve or reject the merge", "Review / Draft the screen map" have no page in slice 1, so they show as "(not built yet)" with a tooltip. Board views 5, 6, 8 and 9 are in no slice yet (see challenge.md Build discoveries).
* **Merge rows name fields by key** (`case.application_type → case.application_number`): shared fields have no display name until Screen 04 (C3.6); the board shows names.
* **"New shared field" rows** (board row 5) are absent: no record holds a new field waiting for a second person yet (P-53 arrives with slice 2's decision kinds).
* **AI work log:** the board's "Parts" column waits for slice 2 (`detail.a4.parts`, challenge point 5); the existing "Steps" column stays.
* Running rows appear only while AI work runs; none in the screenshots.

### Checks run (STANDARDS)
§6 contract: zod query, Problem Details 400, 401 for an unknown person. §4/§5 states and keyboard: Tab + Enter opens a step; focus tooltip. Accessibility: axe WCAG 2.2 AA clean on 7 states at 1440 px; no sideways scroll at 1024 px. Performance: first view 224 ms with the sample data (budget 1 s). `tsc` clean for api and web; `graph.mjs --check` G1 0 · G2 0.

### Self-score (honest, D1–D20 short form)
Job clarity 4 · data truth 5 (same counts and gate as Programs and Release) · roles 5 · states 4 · keyboard 4 · accessibility 4 · words 4 (merge keys) · visual match to the board 4 · completeness 3 (four steps not built yet, by design of slice 1). AI cost US$0.

### Known gaps
Board views 2–9 and 11 are later slices. The queue recomputes the release gate for open submissions on each call. Fine for the sample (1–5 rows); measured again at slice 2 with more data.
