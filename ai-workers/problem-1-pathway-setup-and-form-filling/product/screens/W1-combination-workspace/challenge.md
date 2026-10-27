# S5 Combination workspace (W1-08, P-123): challenge and slice plan

Runtime lane builder, stage DESIGN, 27 Oct 2026. No code. Challenged against these, in this order: **P-123** (with the founder's confirmation and the Lead annotations: no confirm or approve on canada.ca downloads; a hand upload keeps a second person unless its fingerprint equals canada.ca's PDF; uploads are read by rules first), P-122, P-121, P-120, P-119, P-118, P-116, P-113, P-107, **walkthrough v2 S5** (`design/walkthrough-s3-s7.html#s5`, marked OK, with the blue Lead note), `concept-draft.md` (older), the forms lane's S4 challenge (`screens/W1-form-library/challenge.md` on `origin/forms/2026-10-27-s4-form-library`, 7677dfa), the S6 Shared library challenge m1 and its Lead answer (`screens/W1-shared-library/challenge.md`, Lead copy, reaching main in the next Lead PR), the earlier Screen 03 challenge and Lead response (`screens/03-combination-workspace/challenge.md`), this lane's unmerged Screen 03 S1/S2 work (`origin/claude/runtime-r1-8f1db8`, 3 commits, 9dfe9b8), and today's code on `main` 76628a4 (`prototype/studio`). Facts carry a file reference; judgment says so. Every immigration value (which forms, who can be on a case, how many, what IRCC accepts) is **Sample until the immigration expert confirms**.

Capabilities proved (ids for the checks' labels, P-86): C1.4, C1.6, C4.1–C4.3, C4.9, C5.1, C11.2 (the combination half), C11.6 (the combination default), C11.7, C11.15 (its buttons).

## Verdict
**Build after these changes.** The board is sound and most of it can be built on what exists (the line PATCH, the condition builder, the validator, the release flow, the Screen 03 S1/S2 engine work). Three things would make it dishonest if built as drawn: a line AI picked with only a condition *in words* would apply to everyone (M1); the Forms tab has no record for a form AI proposed but could not find, or for a hand upload waiting for its second person (M2); and "Who can be in this application" has three different role lists today, so the runtime would refuse people the screen allows (M3; Lead decision 27 Oct after the S6 challenge m1: S5 creates the Person roles record). Nothing below adds scope; four points narrow it.

## Objections, ranked

### Major

**M1 · A form AI picked with a condition in words only would apply to every person.** *Needed for the proof.*
* Fact: `engine/render.ts` line ~108 decides a line with `evalCondition(…, f.condition, …)`, and `evalCondition` answers "applies" when there is no rule (line 52). `studio.saveRequirement` refuses a conditional line without its rule (`api/src/studio.ts` line 429), but the finder attaches lines itself (forms challenge: `CombinationForm` origin `AI_FOUND`, with `conditionPlain` and `sourceQuote` and no rule; turning words into a real rule stays with W1-10, forms m1).
* What breaks: IMM 5409 "Is in a common-law union" shows for a single applicant in Preview, coverage counts its boxes for everyone, and a release would carry a condition no case can evaluate.
* Fix (judgment, high confidence): a line whose "Only if" is words without a rule is a third state, **"Only if (in words, no rule yet)"**. Preview shows the form as "Cannot tell yet: no rule", never as applying; review lists it as an error "Turn 'Is in a common-law union' into a rule" with the line drawer's existing condition builder as the fix (by hand today, AI proposals with W1-10). One pass and one fail test.

**M2 · The Forms tab needs the finder's results, not only the attached lines.** *Needed for the proof.*
* Fact: `CombinationForm.govFormDefId` is required (`prisma/schema.prisma` model CombinationForm), so a form AI named but could not find (board: IMM 5645 "Not found · Upload PDF · Find again") has no line to show. The forms plan keeps proposals in the run's `DraftingJob.detail` (forms challenge, back-end plan "Form finder"). A hand upload waits for a second person (P-80, Lead annotation) before it is usable, so it is not a line yet either.
* What breaks: the board's Not found row, the "Why AI picked it (IRCC's words)" column for missing forms and the "waiting for a second person" state cannot be drawn from real data; a second "Find again" would re-attach a form a person just removed.
* Fix (asks of the forms lane, all inside its slice 1 endpoints): see "What the Forms tab needs from the forms lane" below; the key items are (a) one read of the latest finder result per combination, with a state per proposed form; (b) an upload started from a combination's Not found row attaches when it becomes usable; (c) **"Find again" and "Redo" never re-attach a form a person removed in this draft**: it comes back as "Removed by a person · Add back".

**M3 · "Who can be in this application" has three role lists, and the runtime refuses roles the screen offers.** *Needed for the proof (P-119: "the runtime refuses a role not listed or above the maximum").*
* Fact: `web/src/components/participants.tsx` offers principal, spouse_or_partner, child, representative, parent; `contracts/runtime.ts` `ROLES` is principal, spouse_or_partner, child; `contracts/runtime.ts` `NewPerson` accepts only spouse_or_partner or child, and `api/src/runtime.ts` `addPerson` parses it before it reads the release's limits (line ~115). The board adds Representative as a row; combination 5 (spousal sponsorship) needs a Sponsor (this lane's S2 added it as Sample on the old branch). There is no Person roles master yet (board: "Picks from Shared library › Person roles"; that is S6).
* What breaks: a publisher adds a Sponsor or Parent, releases, and the case officer cannot add that person; or the screen and the case disagree about who is an applicant.
* Fix (**Lead decision 27 Oct, S6 challenge m1: S5 creates the Person roles record**; S6 later adds the one Add for roles on top of it):
  * **`PersonRole`** record, as the S6 plan names it: key, label, **takes part in a case** (or "described on forms only", e.g. a parent named on IMM 5707 who never joins the case), **may be an applicant**, basis (Sample · Expert), `retiredAt`. Expand-only migration; one row per workspace and key.
  * `GET /api/library/roles` (S5): the editor, the validator and the runtime all read it; no code list remains (`participants.tsx` ROLES, `contracts/runtime.ts` ROLES and `NewPerson`'s enum go). `POST /api/library/roles` is S6's (the one Add, `LibraryChange` kind `person_role`, second person); S5 builds no add for roles.
  * The roles S5 needs, all Sample until the expert confirms: Principal applicant, Spouse or partner, Child (take part, may be applicants); Sponsor, Representative (take part, never applicants); Parent (described on forms only). See Q-L4 for where they come from.
  * "+ Add a person" on "Who can be" offers only roles that take part in a case; the Save rule refuses a forms-only or retired role, and an applicant tick on a role that may not be an applicant (replaces the hard-coded Representative rule in `studio.checkParticipants`).
  * `addPerson` accepts any role the pinned release lists, within its maximum, and refuses the rest (pass and fail test). A new kind of person is not added from S5.

**M4 · Saving "Who can be" has no real stale-save guard and no Undo.** *Needed for the proof (STANDARDS §4: a stale save is a 409 naming who saved).*
* Fact: `participants` is JSON on `Combination`; `updateCombination` guards with `where: { id, label: c.label }` (`api/src/studio.ts` line 178), so two people editing people never conflict unless the label changed. The board shows Undo next to Save.
* Fix: expand-only `Combination.participantsVersion` (int) and `participantsBy`; the PATCH sends the version it read; a stale save is 409 "Changed by <name> at <time>: reload their version". Each save writes one audit row with the previous list, so Undo restores it while the draft is open. The rules on Save (board): exactly one principal; 0 ≤ min ≤ max ≤ 9; Representative and Sponsor never applicants; removing a person that a form line names ("Principal + partner", "Each child") asks first and lists those lines. Each with a pass and a fail test.

**M5 · The four-stage AI strip must be the shared run component, and stage 4 does not exist yet.** *Needed for the proof (P-110).*
* Fact: stage 1 Find forms is the forms lane's finder; stage 2 Read each form is today's rules read (`studio/tools/read_form_identity.py`, then AI only when the rules cannot, P-123 M1); stage 3 Match to shared fields is today's field-map drafting batch (`api/src/ai.ts`); stage 4 "Draft questions and documents" is W1-10 (Not started, `WAVE-1.md`). The run card, Stop and the top-bar chip are W1-07 (forms slice 2).
* What breaks: a strip built on this page would be a second run panel; a stage 4 drawn as "waits for 3" promises work nobody is building in Wave 1's current slices.
* Fix: S5 renders the forms lane's run component with the run's own steps; stage 4 shows only once W1-10 adds that step (until then the strip has three stages and the Questionnaires and Documents tabs say "added by a person; AI drafting comes later"). Per-stage Redo and Stop are the run API's (ask below). S5 builds no run UI of its own.

### Minor

**m1 · The old Screen 03 branch is 177 commits behind main and touches the screens lane's files.** *Needed for the proof (keep the parts S5 keeps).*
* Fact: `origin/claude/runtime-r1-8f1db8` changes `api/src/programs.ts`, `contracts/programs.ts`, `api/src/studio.ts`, `engine/render.ts`, `web/src/pages/combination.tsx` and 60 more files on a base from 25 Oct.
* Fix: port by hand, never rebase or bring the branch in: take the pure parts (`engine/coverage.ts`, `engine/runtime/preview.ts` and `sqr.ts` with `tests/check_screen03_engine.ts`, the F-R1c-1 order fix in `render.ts`, the `contracts/workspace.ts` types S5 keeps, QA-38 and QA-40, D-1 signoff 400, D-2 submit author-only) and rewrite the pages to the S5 tabs. Dropped: PQR, Rules and Sources tabs, portal strip, copies, Links card.

**m2 · Overview's "Missing before firms can use it" and next step live in the screens lane's files.** *Needed for the proof.*
* Fact: they come from `api/src/programs.ts` `summary` and `engine/programs.ts` `missingItems` / `nextActionOf`, which S2 (Programs, "need you" = waiting on a person) is changing now.
* Fix: S5 only reads them; any wording or item S5 needs there (for example "a form condition has no rule yet", M1) is asked of the screens lane through the Lead, and S5 builds after S2 merges and syncs main.

**m3 · "Filed as" wording for portal-only forms.** *Needed for the proof.*
* Fact: `engine/channels.ts` warns every Online line "needs the browser extension (later wave), so the product does not fill it yet". For combinations 4 and 5, IMM 0008, 5669 and 5406 are filed online by design and the output is an answer sheet in the portal's order (P-113).
* Fix: Online reads "Online · answer sheet in portal order (P-113); the extension fills it later (W6)" in the cell, tooltip and warning; still a warning, never a block. The options offered are the library's `acceptedChannels` once the forms lane adds them; until then all three are offered with "Sample". The second deliverable "PDF copy, not for filing" (P-122) is the case's, not the combination default: *Not built here.*

**m4 · Rules and checks need a home once the Configuration sub-tabs go.** *Needed for the proof (nothing lost).*
* Fact: today's Configuration has Rules and Checks sub-tabs (`web/src/pages/configuration.tsx` SUBS); the board has neither.
* Fix: rules show where they act ("Only if" on forms, documents and questions, edited there with the condition builder); the combination's other rules and its checks show as a read-only "Rules and checks used here" list at the foot of Questionnaires, each linking to where it is edited. No Rules tab.

**m5 · Scaffolding still on the page stands in for capabilities (P-33).** *Needed for the proof.*
* Fact: "Add form" and the Held section on Overview, the Sources and forms tab with "Choose files", "Attach official checklist", and the five "Sample inputs (instead of typing)" document buttons (`configuration.tsx` SAMPLE_REQUIREMENTS) are on `main`.
* Fix: all go (P-118 Q2, Q3, Q5). Old links redirect: `/c/:id/sources` → Forms, `configuration?area=forms|documents|questions|rules|checks` → Forms, Documents, Questionnaires. Documents are added from the library's document types; a missing type uses the shared library's one Add (S6), never created from here.

**m6 · "Answered by" and the form-capacity check on Save.** *Narrows scope.*
* "Answered by" (Themselves · Principal, under 18) is P-78's rule (`contracts/runtime.ts` MINOR, age Sample): show it read-only with that tooltip; it is not a per-combination setting.
* "Counts within what the forms allow (IMM 0008 takes 5 dependants)" needs a people-per-form value the library does not hold. Judgment: derive it later from the field map's list rows (`list_purpose.overflow`, F1-P) once those maps exist; for now *Not built*, and the Save rules are the four in M4.

**m7 · Release review must show what AI picked.** *Needed for the proof (P-123, AGENTS rule 4).* Review and release lists "Picked by AI · Sample" forms with IRCC's quoted line and the person "who can be" list AI filled, so the second person signs off which forms apply. Reads `origin` from the line; no new record.

## What is sound
* One row of tabs in setup order; Overview only reports; "Who can be" edited at the top of Questionnaires where it decides each person's questions.
* Forms attached automatically with a visible "Picked by AI · Sample" and the quoted reason; every form has Redo, Replace, Remove (stays in the library) and Undo; the expert decides at release. Honest, and the second person is where it matters.
* "Filed as" is one default per form, inside what IRCC accepts; the case officer can switch per case (P-122).
* Preview made simple: one Sample family, person chips, three columns. The earlier Lead decision stands: Preview builds an unsaved case and calls `caseView()`, so it shows what a case will show.
* The coverage gate (blocks only for facts a form field needs for a role the combination has; each problem names the fix) carries over unchanged.

## Layout (modern, close to the board)
Keep the board. Three refinements inside existing patterns (EXPERIENCE §3): (1) a Forms row opens a **side drawer** (560 px) with Who fills it, minimum age, Only if (with the rule builder), Filed as, Signed by and History (including "Picked by AI · Sample" and the quote); the ⋯ menu keeps the actions; same drawer as S4's library row. (2) The AI strip collapses to one line ("Forms found · read · matched — 76 proposals to review") once the run ends; the run chip stays in the top bar. (3) After Save, "Who can be" folds to its one-line summary so the questions stay in view; "Edit" opens it again. Nothing else.

## What the Forms tab needs from the forms lane (its planned endpoints)
| Need | Planned endpoint (forms challenge) | Ask |
|---|---|---|
| List the lines with their AI origin and quote | lines come from today's combination read | `origin` `AI_FOUND`, `sourceQuote`, `conditionPlain` on each line (planned); S5 reads them |
| Not found, downloaded, waiting for a second person, newer file on canada.ca | proposals inside the run's `DraftingJob.detail` | **one read:** `GET /api/combinations/:id/forms/find/latest` → per proposed form {code, title, quote, conditionPlain, who, state: ATTACHED · DOWNLOADED_ATTACHED · NOT_FOUND · UPLOAD_WAITING_SECOND_PERSON · NEWER_FILE_SAME_EDITION · REMOVED_BY_PERSON, lineId?, runId} |
| Find again / Redo (find · read · match) | `POST …/forms/find`, `POST …/forms/:line/redo` | never re-attach a line a person removed in this draft (M2c); answer with the run id S5 shows in the strip |
| Upload PDF on a Not found row | `POST /api/library/forms/upload` | optional `forCombination` + `forCode`: attach when the file becomes usable (after the second person, or at once when its fingerprint equals canada.ca's PDF) |
| Replace edition · Remove · Undo | `POST …/forms/:line/replace`, `DELETE …/forms/:line`, `POST …/forms/undo` | each takes the line's version (409 when stale); **Undo covers S5's line edits too** (one "last change" per combination draft, built on `CombinationForm` versions), so the page has one Undo, not two |
| Add a form from the library | `GET /api/library/forms?q&status` | exclude retired and waiting editions; S5 marks "already here" from its own lines |
| What IRCC accepts | `FormEdition.acceptedChannels`, `acceptedBasis`, `acceptedQuote` | read-only on the line; S5 refuses a default outside it (422) |
| Strip, Stop, per-stage Redo | `GET /api/runs/:id`, `POST /api/runs/:id/stop` | a per-step redo (`POST /api/runs/:id/steps/:step/redo`) or say that Redo is the line's |

S5 keeps one write route for line settings (`PATCH /combinations/:id/forms/:form`: who, minimum age, only if, filed as, signed by, version); the forms lane owns attach, remove, replace, redo and undo. Two lanes never write the same field.

## Back-end plan (element → record → API → rule → test)
| Element | Record (expand-only additions in bold) | API | Rule | Test (pass · fail) |
|---|---|---|---|---|
| Tabs and old links | none | web route `/c/:id/:tab` | BR-1 six tabs; old `sources`, `configuration?area=` redirect; unknown → Overview | each tab opens · `/c/:id/sources` lands on Forms |
| Overview (read only) | reads summary | `GET /combinations/:id/workspace?tab=overview` | no add or edit control; each missing item links to its tab | no button but links · missing item opens its tab |
| Form line settings | `CombinationForm` + **`minAge`**, **`signedBy`** (old S1 migration, re-made) | `PATCH /combinations/:id/forms/:form` {who, minAge, onlyIf, defaultChannel, signedBy, version} | Filed as inside IRCC accepts (m3); stale → 409 | PDF on PDF-only saved · Online on PDF-only 422 · stale 409 |
| Only if in words (M1) | `conditionPlain` without `predicateJson` | same PATCH adds the rule | words-only line never applies in Preview; release error until a rule exists | words-only line: Preview "Cannot tell yet", review error · rule added: error gone |
| Person roles (M3) | **`PersonRole`** (key, label, takesPartInCase, mayBeApplicant, basis, retiredAt) | `GET /api/library/roles` (S5); `POST` is S6's | one list for editor, validator and runtime; no code list | six Sample roles listed · a forms-only role is not offered in "Who can be" |
| Who can be | `Combination.participants` (role key + quote, origin, basis per person), **`participantsVersion`**, **`participantsBy`** | `PATCH /combinations/:id/people` {participants, version} | role must exist, take part in a case and not be retired; applicant tick only where the role allows; M4 four rules; Undo from the audit row | Sponsor saved, case can add Sponsor · Parent (forms only) refused, two principals, sponsor as applicant, stale save refused |
| Runtime limits (M3) | `CaseParticipant.role` (string) | `POST /cases/:id/people` | role must be in the pinned release's list, ≤ its max | listed role added · unlisted role 422 · over max 409 |
| Questionnaires | `SqrSectionSelection`, `SectionQuestion` (existing) | `GET …/workspace?tab=questionnaires&role=` | filled by read-only (from the placement); coverage gate per role | covered fact passes · uncovered fact blocks release with its fix |
| Documents | `DocumentRequirement` (existing) | existing POST/PATCH requirements | type picked from the library; no free-text type from here | library type → line · free text 400 |
| Preview | none (unsaved case) | `GET …/workspace?tab=preview&family=&person=` | `caseView()` resolution; Sample families within the people limits | child 8 has no 18+ form, adult has · family above a maximum not offered |
| Review shows AI picks (m7) | `CombinationForm.origin` | existing review | AI-picked forms listed for the second person | AI line listed · person-added line not marked |

## Slice plan
Built in new files where possible (`api/src/workspace.ts`, `contracts/workspace.ts`, `web/src/pages/workspace/<tab>.tsx`); `combination.tsx` becomes the tab shell. S5 touches no Programs, Structure or New combination file, nor the forms lane's library, intake or finder files. Shared files both lanes may touch: `prisma/schema.prisma` (different models; one expand-only migration per slice, named by date), `api/src/main.ts` (one line per route). The Lead merges the forms lane first; this lane syncs main before each slice.

1. **Shell, Overview, Forms settings, Who can be, Preview.** Tabs and redirects; Overview read-only; Forms table and drawer on today's lines (who, minimum age, only if with M1, filed as within what IRCC accepts, signed by; no attach buttons yet: "Add a form from the library" waits for slice 3); the Person roles record and `GET /api/library/roles` (M3, before the editor, so S6 can build its Add on it); "Who can be" editor at the top of Questionnaires with M3 and M4 (incl. the runtime role check); Preview on `caseView()`; scaffolding removed (m5); QA-38, QA-40, D-1, D-2 carried. Port of the old branch's engine parts (m1). Real data, screenshots at 1440 and 1024 → EARLY-LOOK.
2. **Questionnaires, Documents, Review.** Sections and questions per person with filled by read-only and the coverage gate (run against every sample combination; fix the sample data, never the rule); Documents from library types; rules and checks in place (m4); review lists AI picks (m7).
3. **Forms from the finder (after forms slices 1 and 2 merge).** The finder result rows (M2), "Picked by AI · Sample" with the quote, Not found → Upload PDF or Find again, the ⋯ actions on the forms lane's endpoints, "Add a form from the library", the run strip as the shared component (M5), and "Who can be" filled by AI: a step that reads the same guide text the finder found, draft plus checker round (P-121), the quote must be on the page; replayed at US$0 for the sample, about US$0.01–0.02 per guide live (stated before any live run, inside the US$40 cap).

AI cost of this stage: US$0. Slices 1 and 2 make no AI calls.

## Questions
**For the founder:** none. Every point is settled by P-119, P-121, P-122, P-123 or the Lead's earlier Screen 03 answers.

**For the Lead (recommendation first):**
* **Q-L1** · M1: a line with a condition in words only is "Cannot tell yet" in Preview and an error at release until it has a rule. Recommended: yes. Or: allow release with a warning and treat the line as always applying (not recommended: wrong forms on cases).
* **Q-L2** · Slices 1 and 2 need no forms-lane endpoint; may slice 1 start as soon as S2 merges, with slice 3 waiting for forms slices 1 and 2? Recommended: yes. Or: wait for S4 slice 1 as the note says.
* **Q-L3** · Pass the asks in "What the Forms tab needs from the forms lane" to the forms lane (especially M2c "never re-attach a removed form" and one Undo for the page) before it finishes slice 1.
* **Q-L4** · Where the six Sample roles come from, since S6's Add is not built yet (M3). Recommended: they are the workspace's built-in starting roles, created with the workspace and **kept by Reset** like the two Pathway types (P-104), because no combination can be set up without a Principal applicant; each says "Sample until the immigration expert confirms". Or: Reset empties them and Load sample adds them back (P-108 read strictly), which leaves a reset workspace unable to set up "Who can be" until S6 lands.

## Lead response
_(empty)_

## Agreement
_(empty)_

## Build discoveries
_(empty)_
