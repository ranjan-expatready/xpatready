# /qa after-merge — PR #71 (S5 Combination workspace) on main e2cb27a4 (29 Oct)

**Scope:** PR #71 (runtime lane, S5 slices 1–3 and Lead check L1–L12). I tested:
* the Forms tab;
* Filed as;
* minimum age and signer;
* Who can be in this application;
* QA-38 and QA-40 on the case side;
* QA-53 on the new workspace routes.

I also moved the three older checks that stopped on the old controls.

Isolated copies `qa_s5` :4472, `qa_s5b` :4473, `qa_s5c` :4474; the shared demo :4400 was not touched. US$0, no model call. The forms FIX (QA-61..68, R69-1..3) is not on main yet, so those bugs were not retested.

## Verdict
**Ready, with one new Minor.**
* **QA-38 is closed** (Major): the case opens on the newest release, and Open a case says so.
* **QA-40 is closed:** an Online line stays on the case, "filed Online (later wave), No PDF copy".
* **QA-53** holds on every new route.
* **New QA-69 (UX, Minor):** the Forms tab still offers Undo after a release. The people section correctly does not.

Nothing is Blocker, Critical or Major.

## Suites
* **CI** on the merged tree (run 40745393561, head ffc07685; main e2cb27a4 is its merge with the same app code): **57/57 green**. That includes:
  * `check_s5_slice1/2/3` (55, 31, 23);
  * `check_s5_leadcheck` 46;
  * `check_s5_people_ai` 15;
  * the four S5 browser suites (52, 61, 35, 18).
* I did not rerun them locally: the Mac carries other lanes' runs.

## What works (walked in the browser pane, then replayed headless)
* **QA-53 on the S5 routes:**
  * The three workspace tabs, `/library/roles` and the people plan answer:
    * nobody and an unknown name: 401;
    * the officer and the client: 403;
    * the author, approver and SME: 200/201.
  * Every new write (people save and Undo, forms Undo, line edit, Remove, people proposal) refuses nobody and unknown names (401). It also refuses the approver, the officer and the client (403), and nothing changes.
* **Forms tab:**
  * The finder strip shows "No form find yet" with how Start setup runs.
  * Each row's ⋯ menu offers Redo with AI, Replace edition (checks canada.ca) and Remove from this combination.
  * Remove asks first, naming the form and saying it stays in the library.
  * Removed forms are listed under "Removed in this draft" with Add back, and one Undo bar names the last change.
  * Two removes at once: one goes through, the other gets 409.
  * Undo and Add back each return the line.
* **Minimum age and signer:**
  * Ages 0, 100, 17.5, "18" and −3 are refused with "Minimum age is a whole number from 1 to 99, or empty", shown on the field in the panel.
  * A signer not in the list is refused with "Choose who signs it from the list".
  * Age 18 and "The person the form is about" save.
  * A stale revision gets 409 naming who changed it.
  * Undo restores no age and no signer.
* **Filed as:**
  * The line names the ways IRCC accepts and why.
  * The panel's list greys any way the edition does not accept.
  * On this sample the library records no accepted ways ("Sample: … does not record"), so all three were open. The refusal itself is the runtime lane's L4 test (CI green); I did not see it greyed in a walk.
* **Who can be in this application:**
  * Roles come from the shared library.
  * A typed label ("Common-law partner") is kept, and released labels stay in the release.
  * An old version gets 409: "Configuration author changed who can be in this application at 19:07 UTC. Reload their version…".
  * Fewest more than most, and a list without the principal, are refused with 400 in words.
  * Undo restores the label.
  * After a release, Undo is not offered, and the API refuses it with 409 "Released since".
  * Fill from the guide offers Rules only (US$0) and Use saved AI answers (US$0); AI now (not approved yet) is greyed.
* **QA-38:** after three releases, a case opens on release 3, and the officer's Open a case lists "With an LMIA · release 3".
* **QA-40:** with IMM 5707 filed Online and released, `GET /runtime/cases/:id/forms` lists it under `online`. The case page says "IMM 5707 · filed Online (later wave) No PDF copy", and the officer types it from the answer sheet.

## Findings
| # | Type | What | Lane |
|---|---|---|---|
| QA-69 | UX · Minor | See the list below. | runtime (the bar) · forms (the words) |

QA-69 in detail:
* After a release, the Forms tab still shows "Last change: Added IMM 5257 · Undo". The people section hides its Undo after a release (Lead check L6, "as on the Forms tab").
* Clicking Undo after a real change was released answers 409 "Changed since … Change it by hand". It should say "Released since", as people does, and the bar should not be offered at all.
* A no-op step (Add back of a line the release already has) is still undone after two releases. It removes a released form in the draft without a word about the release.

Screenshots: `2026-10-29-after-merge-s5/` (01 removal with one Undo and Add back, 02 age error on the field, 03 Fill from the guide modes, 04 Open a case naming release 3).

## Replayed checks (headless)
| Check | Result | Note |
|---|---|---|
| `check_qa_am_s5_1029.cjs` (new) | 50/50 | API, browser, QA-38/40 |
| `check_qa_am_s4_1028.cjs` (moved to the written row action and side panel; counts form rows only) | 58/62 | Fails are only QA-62 ×2, QA-63, QA-64 (forms FIX not merged). A first run under load also failed the Guides chip, search and held-upload steps; by hand the chip filters (18 → 4) and the rerun passed them: timing, not the app. |
| `check_qa_am_1027.cjs` (Preview step moved to the S5 Preview list) | 47 pass, 8 fail | Every fail comes from part B's setup: it needs a Visitor visa released through the old PDF path, which a fresh sample does not have. Its QA-38/40 steps now live in the new check. |
| `check_qa_explore_1025.cjs` | Retired | It reads portal fixtures that W1-02 deleted (`tests/fixtures/portal/…`); QA-38/40 moved to the new check. |

## Graph
Gaps: G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0.
* New G3: `POST /combinations/:id/attachments`. S5's L12 moved the only test that reached it to S4's Upload PDF, and no page uses it now. **The Lead decides** whether to remove the route (dead after S4) or test it. It stays one line here, not a bug row.
* `GET /attachments/:id/file` stays as before (tested through a built address).

## Coverage
**Not rerun** (the Mac is busy). The clean coverage rerun is still owed (handover item 1); it is due now that S5 added about 3,700 lines.

## Could not test
* :4400: the brief says never.
* "Picked by AI · Sample" on a row, Redo with AI and Replace edition: these need a live or replayed finder run with saved answers. The menu items were seen, not run (US$0).
* A greyed Filed as choice: the sample library records no accepted ways (see above).
* 390 px and 200 % zoom: the workspace is desktop-only in wave 1. 1440 px was walked; the runtime lane's suites cover 1024 px.

## Questions for the Lead
1. **QA-69:** should the Forms tab's Undo follow the people rule, with no Undo after any release since the step and "Released since" words?
2. **`POST /combinations/:id/attachments`:** remove it (no page or test uses it after L12), or keep it for a later wave?

## Suggestions
* *Needed for the proof · Capability:* the sample should record IRCC's accepted ways for at least one form (from the expert's line, Sample), so Filed as can be seen greyed in a walk.
* *Later · Scaffolding:* one `canUndo` rule shared by the Forms and people Undo bars (release since the step, retired combination), so the two cannot drift.
