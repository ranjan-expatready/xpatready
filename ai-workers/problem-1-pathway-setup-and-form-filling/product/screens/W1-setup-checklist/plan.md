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

## Slice A build brief (30 Oct, after the founder's Go on board v4, P-180)
The Lead's OK covers slice A and then the card (concept v4 §6–§7). Base branch: `claude/screens-board-v4` (from `origin/lead/2026-10-29-s2a`, holds the #96 fixes); move to main once #96 merges. GitHub CI is blocked on billing: the local run-suites result on the exact commit is the evidence.
* **What exists today** (sized 30 Oct): `engine/programs.ts` (176 lines) holds the five functions slice A replaces: `setupActionOf` (l.30), `missingItems` (l.49), `statusOf` (l.82), `nextActionOf` (l.113), `waitsForPerson` (l.150); plus `rowCounts`, `needsWork`, `isLive`. They are used by `api/src/programs.ts` (`leafStates` l.179, `catalogue` l.185, `summary` l.432), `api/src/structure.ts`, `contracts/programs.ts` and `tests/check_screen01_rules.ts`. Existing checks on the card and catalogue: `check_w1_programs_r3.cjs`, `check_w1_programs_s2.cjs`, `check_w1_start_setup.ts` (+ browser), `check_catalogue_scale.cjs`.
* **No official-pages record exists yet** (nothing in `prisma/schema.prisma`, `api/src` or `contracts`): `officialPagesOf(ids)` returns "no record yet" for every combination, and step 1 shows as open with no item until the forms lane lands it.
* **Order:** (1) `contracts/setup-checklist.ts` (zod, concept §8 `SetupChecklist`); (2) `engine/setup-checklist.ts` `setupChecklistOf(input)`: five steps (concept §4), Not ready problems first (§6), the `where` → step and kind → step tables (§6, a test fails on any value without a row), one `counts`; `forViewer(checklist, actor)` from the duty and tier table (§5): the button word per state for the author, **Open** for everyone else, `needsYou` when an item on the viewer's duty waits (P-180 Q1); (3) parity: re-express the five old functions on top of it and prove the same answers on the six sample combinations and the scale fixture, then delete them; (4) `catalogue` rows and `summary` return `setup`; per-combination cache keyed on what `rows()` already reads (concept §8); (5) checks named `C11.10: …`, `C11.16: …`, `C1.4: …` (P-86), each rule with a pass and a fail; 150 combinations cold < 1.5 s, warm < 200 ms. **No visible change** in slice A.
* **Then the card** (concept v4 §7; board v4): `web/src/pages/programs.tsx` card and list row read `setup`; the status filter becomes All · Not started · In progress · Live (+ Retired) and Needs you (P-180 Q2); Pathway › Program sections with "n of m live", fold state per person; one primary colour, `--color-primary` (P-180 Q3: already the token). Slice B's Overview strip still waits for forms' pages record (F2).

## Slice A built (30 Oct, branch `claude/screens-slice-a-62933a`)
* **Built:** `contracts/setup-checklist.ts` (zod: five steps, open items, chip, bar, counts, viewer overlay, `CardSetup`); `engine/setup-checklist.ts` (`setupChecklistOf`, `forViewer`, `mayAct`, `actsOn`, `WHERE_STEP` (8), `KIND_STEP` (11)); `api/src/programs.ts` `rows()` builds one `SetupInput` per combination from what it already reads plus one `groupBy` combination × form edition × kind and the latest submission; `officialPagesOf(ids)` answers "no record yet"; `GET /catalogue` cards carry `setup` (steps without items, the viewer's button, Needs you); `GET /combinations/:id/summary` carries the full `setup` with the viewer's overlay; both read `x-actor`. No visible change: no page reads `setup` yet.
* **Check:** `tests/check_setup_checklist.ts` 46/46 (37 engine, each rule a pass and a fail; 9 API on an isolated copy: parity of the setup action, counts, bar and Live on every started sample combination; 150 combinations cold 549 ms, warm 30 ms).
* **Not done as briefed, with reasons (for the Lead):**
  1. *The five old functions are not deleted yet.* Parity is proven (the check's C1.4 line), but the Overview's "Missing before firms can use it" list and header "Next step" still read `row.missing` and `row.nextAction`, and the Overview strip is slice B, which waits for forms' pages record (F2). Deleting them now would change the Overview. They go when slice B replaces those two places; `rowCounts`, `checkedOf`, `comparePaths`, `editionMonth` stay (not part of the checklist).
  2. *Cache:* the checklist is cached with the rows (one key for the workspace, as today), not per combination. The 150-combination budget holds with room (549 ms cold of 1 500); a per-combination key is a refactor of `rows()` worth doing only when a measured case needs it.
  3. *Release's "never an author of the changes":* on the card the Release item's `notBy` holds the submitter only (`draftAuthors` is one query per combination); the server's release still refuses an author (BR-14), so nothing wrong can happen, only a Needs you mark could show for an approver who also authored (no sample persona does both).
  4. *People tier:* no `participantsConfirmedAs` is stored yet (Q1, P-176): a saved list counts as confirmed, at the tier of the person who saved it. The confirm endpoint and the field come with the people card (slice C or the forms lane's confirm work).

## Open for the Lead before build
1. Concept v3 folding P-161 (3) as F1, P-174 and contract v2 as F4, and marking Q1–Q3 answered (Lead's file).
2. F1's two questions (rules-only pages; "unusual"), to the founder if the Lead does not settle them.
3. F3: who builds slice C.
4. F5: the C11.10 and C11.16 rows.
