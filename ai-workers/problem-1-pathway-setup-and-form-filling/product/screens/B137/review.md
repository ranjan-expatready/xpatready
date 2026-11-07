# B137 — C6.15 document substitute sets: independent review (PR #1268)

Commit reviewed: `79cde660c107b782b4d54ae53f7a20800d56585a` (branch `claude/festive-hawking-1m5f2a`). Reviewer did not build it. Copy `rev615` on :4436, fresh database, Demo › Load the configured checkpoint (90 s). Bar: SA-1B-19, SA-1B-20 (requirements-2026-11-02, SA-01B v2.1), BACKLOG B137 "Done when", `screens/B137/README.md`, STANDARDS, EXPERIENCE, QUALITY. No `concept.md` for this row; the README is the concept. Journey score: `journey-test-reviewer-2026-11-07.md` (7.5/10).

**Verdict: Ship after fixes** on the screen-review scale; for the merge: **Block**, 4 Musts (end of this file).

## What I ran
* `acceptance/C6.15.test.ts 4436 xr_studio_rev615`: **25/25, exit 0** on the checkpoint. `tests/check_c615_document_sets.ts`: 31/31. Two rules removed by hand (alternative needs client words; all-of needs every member): the pure check fails each time (1 and 2 FAILs), restored.
* Break scripts through the API (passport as an alternative, member retire, parallel picks/proposals, roles) and Playwright at 1440, 1024, 400 px and 200 % (720 px): drawer, editor, To review compare, case Documents panel. axe WCAG 2.2 A/AA: 0 violations on each. No sideways scroll at any width. Keyboard: ⋯ opens with Enter, first item focused, Escape returns focus to the line's ⋯.
* `graph.mjs --check`: exit 0 (G3 13, G6 6, see S7).
* Note: during the review another session edited this working tree (5 code files and `screens/B137/break-report.md`, 13:50-13:51 UTC, after my runs). Those uncommitted changes are not reviewed here.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | SA-1B-19 r1-r5, SA-1B-20 r1-r4 built and tested; "any member meets the line" fails when the member is also its own line (M1); r6 "no member is retired" is checked when the change is approved, but not at the release (S1) |
| D2 Data integrity | 3 | Parallel proposals 409 ("already waits"), parallel picks 409, upload version lock; a stale pick overwrites silently (M3); a cross-line upload replaces another line's file (M1) |
| D3 Reuse | 4 | Sets live once on the library type; a line only picks by name |
| D4 Rule integrity | 3 | A missing set is a release error (validate.ts:154); a retired member is carried with no warning (S1); dangling pick not shown in the drawer (S3) |
| D5 Stability | 4 | A refused upload leaves no file; withdrawing an approved change puts the draft's sets back; a failed apply puts the change back to waiting |
| D6 Governance | 3 | Proposed/approved/withdrawn lines with who and why; Activity reads "approved … (sET_SETS)" (M2) |
| D7 AI trust | N/A | No AI (US$0) |
| D8 Orientation | 4 | Drawer inside Visitor visa › Documents; change page has its path |
| D9 Flow | 4 | Drawer → Send → To review → Approve → next release → case, walked in the UI |
| D10 Language | 2 | Approver's H1 "SET_SETS a document's substitute sets: …" (walk/04); the expert's sign-off line reads "Proof of financial support: supplies no facts" for a sets change (S2) |
| D11 Feedback | 3 | Case line shows "Not requested" with "Met by Passport information page copy" (M1); editor errors appear below the Send button, out of view (S4) |
| D12 Visual | 3 | Editor rows wrap "Remove" under each field (walk/02); Reason printed twice on the change page (S8) |
| D13 Accessibility | 5 | axe 0 on 4 states; 400/1024/1440/200 % no sideways scroll; keyboard menu and focus return |
| D14 Team look | 4 | Team controls, Pill, Notice, drawer section like "Facts it supplies" |
| D15 Speed | 4 | Case panel 0.4 s; drawer sets 0.6 s warm (1.3 s cold, with page load); one sets request per drawer |
| D16 Testability | 4 | Pack + pure test + mutation catch; the cross-line case and the stale pick have no test; graph sees no test of the sets routes (S7) |
| D17 | simulated only | No intended user walked it |
| D18 Provenance | 3 | Sample labelled everywhere; the sign-off does not say what changed (S2) |
| D19 Closure | 4 | Configure → approve → release → case → Received, for any one of and all of |
| D20 | simulated only | — |

## BIC scorecard (case Documents panel; EXPERIENCE §6)
| BIC | Score | Evidence |
|---|---|---|
| 01-03, 05-10, 12, 15, 16 | N/A | No facts, AI values, roles, tasks, filing or signing on this change |
| 04 Incomplete is normal | Met | "1 of 2 received; still to come: Host's bank statements (Sample)" (walk/11) |
| 11 One primary, named | Partly | Menu items "Upload <member>…" (walk/08); while editing, the drawer has two filled buttons, "Send for a second person" and "Edit" (walk/02) |
| 13 Errors where they happen | Partly | One message under the Send button, not on the field, no focus move (sets-panel.tsx:109) |
| 14 Tooltips | Met | No new icon-only control or chip |
| 17 Review | Met | Self-approve 403, withdraw by others 403; before → after by name (walk/04) |
| 18 States | Partly | Empty "None: … is its own only member" good; "Loading the sets…" text, not a skeleton; contradictory line state (M1) |
| 19 Layout | Partly | Status text contradicts itself on the line (M1); see BIC-11 |
| 20 Accessible | Met | Keyboard path, axe 0, 1024 px and 200 % |

## [M] lines (STANDARDS, EXPERIENCE) not met; all others met or N/A
* STANDARDS §4 optimistic concurrency: the pick sends no revision (M3). §5 recorded rollback: missing (M4). §4 field-level errors: set rule errors are one `detail` (S4).
* EXPERIENCE §7 / D10 no IDs on the main path: "SET_SETS" (M2). Rule 9 status by text: contradictory line (M1).

## Issues, ranked
**Must (Major)**
* **M1 — a member that is also its own line.** Repro on the checkpoint: Standard = any one of Proof of financial support, or Passport information page copy (when acceptable: …); release; new case. (a) Upload the passport on the Passport line: the Proof of financial support line shows **Not requested** and "Met by Passport information page copy (any one of the set counts)" with "Files: passport.pdf"; Ready to file still says not received. (b) Upload a passport through Proof of financial support's "Upload Passport information page copy…": the Passport line's current file is replaced (its own file becomes "1 earlier"), and its state and history do not say so. Cause: the state is set only for the line uploaded on (case-checklist.ts:197-201), while files and `set_status` are read by person and type across lines (:102, :109, :203). Fix: in the upload transaction, set the state of every line of that person whose set or type includes the member (version-guarded), or work Received out from the set at read time; say on the other line where its file came from. Add the scenario to the pack.
* **M2 — internal code on the approver's page.** `SET_SETS` is missing from `ACTION_WORD` (library-changes.ts:34): the To review change page H1 reads "SET_SETS a document's substitute sets: …" (walk/04), Activity reads "(sET_SETS)". Fix: `SET_SETS: "Change"`, as `SET_SUPPLIES`.
* **M3 — stale pick overwrites.** "Use this set" sends `{ setName }` only (sets-panel.tsx:36); the server checks `baseRevision` only when sent. Two authors, a type with 3 sets: tab A picks "Sponsor-funded", tab B (opened earlier) picks a third set: saved, A's pick gone, no 409. The sibling requirement editor sends `baseRevision` (configuration.tsx:98). Fix: carry the line's revision on `ChecklistLineRow` and send it.
* **M4 — migration rollback not recorded** (STANDARDS §5 [M]). 20261107230000_c615_document_sets has none; 49 of 61 migrations do. Fix: one comment, e.g. drop both columns; sets and picks are lost.

**Should (Minor)**
* **S1** Set membership is not a "use": where-used (where-used.ts:47) lets a member be retired (host's statements retired and approved with no mention), the next release went out with it, no warning (SA-1B-19 r6, §12). The drawer lists it unmarked and the editor shows it as "Choose a document type…". The README lists only the §12 warning; say that r6 is also not checked at the release, or count members in where-used.
* **S2** The expert's sign-off item for a sets change reads "Proof of financial support: supplies no facts" (validate.ts:335), and a pick reads only "Document requirement changed" (SA-1B-20 r4: a rule change). Name both in words, as C4.9 and P-319 do in `diff`.
* **S3** A pick of a set that a later change renamed or removed (or a line whose type is changed in Edit) is shown nowhere until submit: no "This line uses it" pill, the select shows the first set. Show "Picks 'X', which this type no longer has" in the drawer (SA-1B-20 §12).
* **S4** Editor errors: one Notice under the buttons, out of view at 1440 after Send; not on the field; nothing gets focus (BIC-13).
* **S5** SA-1B-19 r3 staff wording cannot be typed in the editor (API accepts `whenStaff`); the officer sees the client words as "acceptable when".
* **S6** The drawer still has the per-line "Alternatives" section above "Substitute sets" (documents.tsx:200-204): two "any one counts" rules on one line, against SA-1B-20 §13 and SA-1B-19 §3 knock-on. Record the follow-up in the README.
* **S7** Graph G3: `GET /library/document-types/:key/sets` "no test, no page"; POST sets has no `testedBy` (the pack builds the path in a variable). C6.15 in CAPABILITIES names only the pure test; name the pack too.
* **S8** Change page shows the reason twice (in the box and below it).

## Retrofit mapping
SA-1B-19 §3 names `DocumentRequirement.primacy`, `alternativeGroupId` and `alternativeGroupKey` in the team's code; the build stores `document_type.sets` (jsonb) and `document_requirement.set_name`, as §7 says. README gives no mapping from the team's group model to this one: add one line.

## Not checked
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); CI on the PR; typecheck and count-any (builder's word only); a member's own validity rule (README limit).

**Verdict: Block** — fix M1, M2, M3, M4 (each above with its failing scenario), then re-review this row on the new commit.
