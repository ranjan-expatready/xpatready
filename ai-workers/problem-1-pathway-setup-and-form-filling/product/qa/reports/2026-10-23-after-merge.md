# `/qa after-merge` — forms F1 slice 1 and QA-0 on main, 23 Oct 2026

Tester: the qa lane. Tested: **main 65826022** (merges a983e7b4 QA-0, d795b019 F1 slice 1; app changes since 141194dc: `api/src/forms.ts`, `form-lines.ts`, `engine/capture|channels|options|twin.ts`, schema +2 migrations, `main.ts`, `intake.ts`, `sources.ts`, `fill.ts`, `snapshot.ts`, `validate.ts`, `normalize.ts`). Own copies on 4470–4479, `xr_studio_qa_*`; the shared demo :4400 walked **read-only**. No paid AI: spend ledger unchanged. The qa copy now has its own copy-on-write clone of the studio packages (as `lane.sh` does for schema lanes) so `prisma generate` never touched the client :4400 uses.

## Verdict
**Slice 1 is sound through the API; main is still not ready.** Every slice-1 rule I probed holds except one wording point (QA-15). QA-2 is closed. QA-4 is half fixed. QA-1 (Critical) still reproduces. New: QA-13 (confirmed), QA-14 (same name created at once is stored twice — the builders' grounding suite is red because of it), QA-16 (P-63 words), QA-17, and QA-18 (engine branch coverage fell below the floor with the new files).
**Browser journeys could not be measured fairly:** machine load rose from 20 to 112 during the run (18 app servers across lanes, a large copy, other desktop apps). Journeys failed on timeouts and empty pages that the same steps pass through the API in under 1 s; I report them as *not reliable*, not as bugs.

## Retests
| # | Result on 65826022 |
|---|---|
| QA-2 | **Closed** — `check_ai_drafting` 48/48, runs to the end with 6 saved answers (`qa/BUGS-CLOSED.md`) |
| QA-4 | **Half fixed** — every page address opens in a lane copy; source and filled-PDF downloads still 404 (`main.ts:61`, `:74`) |
| QA-1 | Open — Release 2 published with an unsigned SME change, submitter user-A (`check_qa1_release_bypass.ts`) |
| QA-5 | Open — stored 19,800 s early |
| QA-8 | Open — orchestration 19/22, Studio A8 (forms lane proved the cause) |
| QA-9 | Open — the three stale checks unchanged |
| QA-6, 7, 10, 11, 12 | Not touched by the merge; QA-7 and QA-11 seen again in the journeys |

## Slice 1 through the API (C2.5, C3.5, C3.8; `tests/qa/check_qa_f1_probe.ts`, 25/26)
* **Portal capture (C2.5, P-66):** French title and labels kept exactly; a hidden form token is ignored; a typed value, a tick, a chosen option and a date value are each refused with "Refused: this screen holds an answer (…)", nothing kept, an audit line each; a value in a `data-` attribute is not kept; a PDF given as a screen is refused in plain words; no screen → "Add at least one screen before finishing"; the approver cannot start a capture (403); the capturer cannot approve ("A second person approves a capture…"); two approvals at the same moment → one online version, the other told "an identical online version was approved at the same moment". **QA-15:** "imm 5257" is refused ("A form code in capitals") although "IMM-5257" is accepted.
* **Aliases and merges (C3.5, P-65):** a French alias kept; the same alias in other capitals or with hyphens on another field is refused, naming the field that holds it; approver cannot add aliases; merge into itself and between fields of different kinds refused in plain words; the proposer cannot approve ("A different person approves a merge (P-15, P-65)"); a second person's approval redirects; released configurations unchanged.
* **Channel validation (C3.8):** an Online line without a portal is an error in plain words and blocks submission; an unknown channel lists the three choices.
* Builders' `check_forms_channels.ts` **106/106** on my copy.

## New findings (detail in `qa/BUGS.md`)
| # | Type · Sev. | One line | Req./decision |
|---|---|---|---|
| QA-13 | Bug · Major | Add IMM 5707 → remove → add again: 409 "the database refused a duplicate" (`check_qa13_readd_form.ts`) | BR-12, P-25 |
| QA-14 | Bug · Major | The same category sent 4× at once: 11 of 20 names stored twice (`…cat_2`, `…cat_2-2`); `check_grounding_db` 28/29 for this, three runs | BR-6 |
| QA-15 | UX · Minor | Lower-case form code refused at capture start | P-66, F1 break M4 |
| QA-16 | Gap · Minor | "box(es)" in 20 screen texts and 18 API messages; checklists shown as "boxes not mapped yet" (`check_qa16_box_words.ts`) | P-63 |
| QA-17 | UX · Minor | "Recent steps" shows a time without a date: 21 Oct steps read "10:53:20 PM" on 23 Oct | EXPERIENCE |
| QA-18 | Gap · Major | `engine/` branch coverage 84.71% < 85% floor; new files 81.6–84.9% | P-69 |
Totals open: **0 Blocker · 1 Critical · 7 Major · 9 Minor** (QA-1, 3–18 less 2).

## Read-only walk on the shared demo (:4400)
Catalogue (22 Individual, 8 Corporate; 21 need work, 1 Live), Visitor visa page, Forms library, AI work. Seen: Visitor visa's next step "Add 1 form from the library" is the QA-13 trap (not clicked); "Boxes mapped", "mapped boxes", "Read 242 data boxes" (QA-16); step times without dates (QA-17); actor ids "user-A" on AI work (QA-10). The demo runs the **pre-merge** code on an un-migrated database (`/api/captures` 404; last migration `20261021230000`), and the shared database client was generated before the merge. The demo also holds a test program named after a person (data hygiene, not a bug; name not repeated here). Screenshots: `2026-10-23-after-merge/demo-*.jpg`.

## Suites on 65826022 (red first)
| Suite | Result | Note |
|---|---|---|
| `check_grounding_db.ts` | **28/29** (3 runs) | QA-14 race |
| `check_ai_orchestration.ts` | **19/22** | QA-8 (lane copy) |
| `check_studio_browser.cjs` | **19 pass · 2 fail · stops** | A4 download (QA-4), A8 stub (QA-8), Pass B stale (QA-9); temporary copy measures the download instead of waiting |
| `scale_100` + `check_catalogue_scale` | cannot run | QA-9 |
| `check_screen01_browser.cjs` | **100/101** | only "first view < 1 s" (1,713 ms at load ~40); an earlier run at load 47 had 4 load failures |
| `check_forms_channels.ts` | 106/106 | |
| `check_screen01_api.ts` | 94/94 | still asserts the QA-1 bypass as a pass |
| `check_ai_drafting.ts` | 48/48 | QA-2 closed |
| `check_screen01_rules.ts` · `check_engine.ts` | 54/54 · 38/38 | |
| qa journeys (headed, headless ×2) | 21/10 · 35/11 · 34/12 | **not reliable** (load 22–94): screenshot and page-wait timeouts; repeated real ones are QA-1, 6, 7, 11 |

## Coverage (c8 12.0.0)
api/src **94.71% lines / 76.44% branches** (floor was 93/74 → raised to 94/76) · engine **98.80% / 84.71%** (floor 94/85 → lines raised to 98; branches below the floor: QA-18). Lowest branches: `engine/ai-run.ts` 62.7%, `api/src/sources.ts` 61.5%, `studio.ts` 71.4%. Business rules with no failing test: unchanged from QA-0 (BR-5; BR-15/16 pass only); new: no test sends the same name concurrently from separate connections (the grounding check does, and fails).

## Could not test
Browser journeys at a fair load (and so 400/1024/1440 headless twice, keyboard, axe on the new run); slice-1 pages (not built, slice 3); the portal extension (F2); QA-3. Journey score not re-awarded this run (QA-0: 7.5/10 with a 0, unchanged by this merge).

## Questions for the Lead
1. A quiet window for browser checks: machine load reached 112 (18 studio servers across lanes, other apps). Can lanes stop idle copies, or can qa run its browser pass when you say the machine is quiet?
2. Before :4400 restarts on main, the main copy needs `prisma migrate deploy` and `prisma generate` (the shared client predates the merge) — will you do that with the restart?
3. `qa/BUGS-CLOSED.md` holds closed findings because `history/` is a Lead file; move it there, or keep it in `qa/`?

## Suggestions (never built by qa)
* Make same-parent names unique in the database (normalised name) rather than only in code (fixes QA-14 for good) — *Needed for the proof · Capability*.
* Accept any case for form codes at capture start, as punctuation already is — *Later · Capability*.
* Each lane stops its isolated copies at the end of a stage (`isolated.sh … stop`) — *Needed for the proof · Scaffolding*.
