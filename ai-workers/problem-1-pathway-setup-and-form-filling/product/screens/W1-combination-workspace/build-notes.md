# S5 Combination workspace (W1-08, P-123) — build notes

## Slice 1 (BUILD, 27 Oct, runtime lane) → EARLY-LOOK
Agreed design: walkthrough v2 S5 (`design/walkthrough-s3-s7.html#s5`) with `challenge.md` and its Lead response (M1, M3, M4, m1–m7; Q-L4: six built-in roles kept by Reset). AI cost US$0 (no model call).

**Top 5 production improvements over the board**
1. A Forms row opens a 560 px drawer (the team's Panel, same as S4's library row) instead of settings spread over the row; the ⋯ actions come with the finder (slice 3).
2. "Only if" in words with no rule is its own state (M1): "No rule yet" on the row, a notice that release waits, "Cannot tell yet: no rule" in Preview, a release error that names the fix.
3. "Who can be in this application" is saved at the version read: a stale save names who changed it and offers "Reload their version"; Undo restores the last save (M4).
4. Removing a person that a form names asks first and names the form; "Keep the person" puts them back in the edit.
5. Preview keeps family, person and tried answers in the address (shareable, Back works); the tried answers fold away.

**What is built**
| Part | Files | Notes |
|---|---|---|
| Person roles (M3, C11.12) | `prisma/schema.prisma` `PersonRole`; migration `20261027160000_s5_person_roles`; `samples/person-roles.json`; `api/src/core.ts` (a new workspace gets the six); `GET /api/library/roles` | Built in, Sample, kept by Reset (Reset never deletes the table). DB check: not on a case ⇒ not an applicant. `case_participant` role check is now a key shape, not a list of three. S6 adds `POST` (the one Add). |
| Who can be (C11.12, M4) | `engine/people.ts` (rules), `api/src/studio.ts` `savePeople`/`undoPeople`/`peopleState`/`checkParticipants`, `contracts/workspace.ts` | `PATCH /combinations/:id/people` {participants, version, confirmRemove?}; `POST …/people/undo` {version}. `Combination.participantsVersion`, `participantsBy`. Older callers (New combination, sample loader) go through the same roles, not strict. |
| Runtime honours the release (M3) | `contracts/runtime.ts` (`NewPerson.role` any key, `CaseRole` string), `api/src/runtime.ts` | Any role the pinned release lists, within its maximum; 422 otherwise. |
| Form lines (C11.6) | `CombinationForm.minAge`, `signedBy`; `studio.saveForm`; `engine/snapshot.ts` (only when set: no fingerprint change otherwise); `engine/render.ts` (age gate, words-only, placement order F-R1c-1, sponsor) | Filed as uses the existing channel route; offers all three ways as Sample until the Form library records what IRCC accepts (forms lane, S4). |
| M1 | `engine/render.ts` `wordsOnly`, `engine/validate.ts` | Error "Turn "…" into a rule" blocks submit. |
| Tabs and pages | `web/src/pages/combination.tsx` (shell, redirects), `pages/workspace/{overview,forms,questionnaires,preview}.tsx`, `pages/configuration.tsx` (`ConfigArea`), `runtime/questionnaire.tsx` (`PreviewQuestions`), `api/src/workspace.ts` (`GET …/workspace?tab=forms|questionnaires|preview`) | Overview · Forms · Questionnaires · Documents · Preview · Review and release. `/sources`, `/configuration?area=` redirect. |
| Preview (C4.3) | `engine/runtime/preview.ts` | Unsaved case of a Sample family through `caseView`; any other role listed (sponsor, representative) joins once. |
| Scaffolding removed (m5) | Sources tab gone (its desktop upload, "Attach a sample file" and the sample picker); `components/participants.tsx` deleted; Overview "Add form", Held, Recent steps, People edit gone; Documents' "Attach official checklist" and five "Sample inputs" buttons gone | Held files stay on To review and in the Form library. |
| Kept on Forms (build discovery) | `pages/sources.tsx` → `ReadingSection`: Read form · Draft with AI · Review AI proposals per form, each step dated; "Add a form from the library" (the existing `FormPicker`, no upload); the inline "How … is filed" picker in the Filed as column; filing problems listed under the lines | See challenge "Build discoveries". Older checks moved to these places: `check_screen01_browser`, `check_screen02_slice1`, `check_forms_demo`, `check_studio_browser`. |
| Carried fixes | QA-38 (`runtime/cases.tsx`), QA-40 (`fill-case.ts`, `runtime/forms.tsx`: Online forms listed, P-113 wording), QA-47 (`fill.ts`: 400 naming form and person), D-1 (`signoff` without body or action → 400), D-2 (only the author submits) | |

**Team names:** `PersonRole` mirrors the team's role master idea (no direct team table in the capture: Unverified); `participants` keeps today's JSON shape.

**Checks run** (isolated copies, never :4400): `tests/check_s5_slice1.ts` 51/51 (API, a pass and a fail per rule, concurrency); `tests/check_s5_slice1_browser.cjs` 51/51 (journey like a person, axe WCAG 2.2 AA on 11 states, no sideways scroll at 1024, no page errors). Screenshots: `screenshots/slice1/` (11 states × 1440 and 1024). `count-any` 424 (baseline 434); `graph.mjs --check` exit 0 (G3: the combination upload routes `POST /combinations/:id/attachments` and `GET /attachments/:id/file` are no longer reached by a page now the Sources tab is gone — they go with S4). Full suites (`run-suites.sh`, 27 Oct): 35 of 38 passed; the 3 that drove removed scaffolding or a fixed role list (`check_forms_w102_fix` opened `/preview` for the coverage view, `check_screen01_smallfix` looked for "Filed as" on Overview, `check_runtime_r1a` FIX B14 expected the database to refuse an unknown role) were fixed and rerun green (23/23, all passed, 99/99), with R1c 120/120 and R1d 63/63 on the same copy; `check_studio_browser.cjs` (demo journey, CI-only on :4400) ran on its own copy via `STUDIO_URL`: 45/45. The Mac ran at load average 14–19 (other sessions), so timing checks (`check_screen01_browser` "changing the view under 200 ms", `check_screen02_slice1` "To review under 1 s") failed here on pages S5 does not touch; CI decides them.

**Design choices made in the build (small, for the early look):** the "Filed as by default" column is the existing inline picker ("How IMM 1295 is filed") for authors, words for others; the filing line shows C1.6's short words with the detail on hover; the Forms tab's one request also carries the filing problems, so the words and the warning always arrive together (a separate summary request lagged seconds under load). Each missing line on Overview is itself the link to its tab. "Try answers that change what applies" on Preview folds away (57 questions on the work permit); rules and checks fold below the questions.

**Deviations from the board (for the early look)**
* "Why AI picked it" shows the line's source quote, or "Added by a person"; AI picking arrives with the finder (slice 3).
* "Add a form from the library" uses today's picker (`POST /combinations/:id/lines`); no ⋯ (Redo, Replace, Undo) and no AI stage strip yet: slice 3, on the forms lane's endpoints and run component, which replaces the "Reading and matching" list. "Remove from this combination" stays in the drawer footer (today's route) until the forms lane's `DELETE` lands.
* The picker's empty text ("Upload the IRCC PDF below", forms lane's `FormPicker`) points at an upload this panel no longer has; the panel's footer links to the Form library instead. Ask: the forms lane rewords it.
* "Answered by" is read-only (m6); Representative shows "The firm" (judgment: the firm fills the representative's own facts).
* Questionnaires keeps today's questions-by-section list, with rules and checks folded below; slice 2 rebuilds it per person with coverage.

**Known gaps**
* The "Online" warning in `engine/channels.ts` and `ONLINE_LATER` in `contracts/forms.ts` (forms lane files) still say "needs the browser extension"; this tab uses the P-113 wording (m3). Ask: the forms lane aligns its wording.
* `contracts/programs.ts` `Participant.role` (screens lane file) is still an enum of five keys; the server now checks roles against the library, so a Sponsor from New combination would be refused by that zod enum before reaching it. One-line change for the screens lane (S3).
* Form-capacity check on Save (IMM 0008 dependants) not built (m6).

**Self-score (D1–D20, honest):** most dimensions 7–8; lowest: D-visual polish of Questionnaires (temporary list below the card) 6, AI (none in this slice) n/a.
