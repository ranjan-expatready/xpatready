# W1 setup checklist (P-157, P-161; C11.10, C11.16): plan

Screens lane, 29 Oct evening. From `concept-draft.md` v2, the board (five steps), `challenge.md` (first challenge M1–M5, m1–m6; fresh challenge F1–F5) and P-161, P-174. **No code until the founder's early look and the Lead's OK.** US$0 throughout (no AI in any slice). Ports 4440–4449, databases `screens_*`.

## Slices
| Slice | What | Owner | Waits for | Visible change |
|---|---|---|---|---|
| **A. Engine and contract** | `engine/setup-checklist.ts`: `setupChecklistOf(input)` (five steps, marks, precedence, Not ready first, `where` → step and kind → step tables, one `counts`), `forViewer(checklist, actor)` (duty per item, F1); `contracts/setup-checklist.ts` (zod); `rows()` and `summary()` return `setup`; cache per combination; step 1 read through `officialPagesOf(ids)`, which returns "no record yet" until forms lands it | screens | the Lead's OK on F1–F4 | none: today's card and Overview stay; the old five functions are re-expressed on top of it, parity-tested, then deleted |
| **B. Card and Overview** | Programs card: bar "n of 5 done · Next: …", Next line, one button in one place (filled per `forViewer`), every state of v2 §5; Overview strip replaces "Missing before firms can use it" and the "Next step" box; the people card leaves Overview; "need you" counts (Pathway band, Needs you filter, To review row) read `setup`; `useFocusItem` and `StepBadge` shared pieces; "Review n …" opens the review queue filtered by combination and step | screens | slice A; forms' official-pages record on main (F2) | yes |
| **C. Tabs** | "Before forms" block (official pages · who can be in this application) on Forms, the people card moved from Questionnaires, tab badges from `setup`, `?focus=` landing on Forms, Documents, Questionnaires | runtime, or screens if the Lead hands over `workspace/forms.tsx` and `questionnaires.tsx` (F3) | slice B; runtime PR #94 (Documents tab) | yes |

Forms lane, asked through the Lead (F2): the official-pages record first in its queue item (2): table, back-fill from what is attached as *proposed*, a confirm endpoint that stores `confirmedBy` and `confirmedAs` and refuses by the same duty rule (F1), imported from `engine/setup-checklist.ts`.

## Back end (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Step 1 pages | forms' pages record (proposed / confirmed, tier) | `rows()` batch read | done = confirmed; Live keeps its chip | Live + proposed → step 1 open, chip Live / never "Open" |
| Step 2 people | `combination.participants`, `participantsBy`; person_role proposals | existing | applicant role saved, nothing waiting | person_role waiting → "Review 1 people proposal" / never ✓ |
| Step 3 forms | snapshot lines, field maps, HELD intake | `rows()` | v2 §3, source files not set up are an open item | 3 finder results → "Add 3 forms found" / never "Find forms"; held edition reopens 3 only |
| Step 4a / 4b | requirement lines, `engine/sources.ts`, proposal kinds | one `groupBy` combination × kind | F4 | a fact read by a form and asked of nobody → 4b open / ✓ only with no gap |
| Step 5 | releases, `releaseGates` | existing | Not ready problems first | Not ready + draft ✓ → filled fix / never outline Open |
| Duties | ACTORS + proposal `agreement`, `confidence` | `x-actor` on catalogue and summary | F1 | 3 personas × every board state; agreed + ready → author filled, differ → expert filled / author's confirm of a `differ` item → 403 |
| Tables | — | — | every `where` (8) and every kind (11) has a step | a new value without a row fails the check |
| Counts | `setup.counts` | read by card, Overview, tab headers, need-you counts | v2 §7 definitions | four surfaces equal on the six sample combinations / a second count path fails |
| Scale | per-combination cache | — | one edit rebuilds one entry | 150 combinations cold < 1.5 s, warm < 200 ms |

Checks named by capability (P-86): `C11.10: …`, `C1.4: …`, `C11.16: …`; `node tools/graph.mjs --check` passes; every new route reached by a test.

## Team model
No onboarding checklist in the team's code; the `role="progressbar"` bar of `wizard-step-card.tsx` is reused per segment (v2 §2). The five steps map onto the team's setup screens with no new master.

## Open for the Lead before build
1. Concept v3 folding P-161 (3) as F1, P-174 and contract v2 as F4, and marking Q1–Q3 answered (Lead's file).
2. F1's two questions (rules-only pages; "unusual"), to the founder if the Lead does not settle them.
3. F3: who builds slice C.
4. F5: the C11.10 and C11.16 rows.
