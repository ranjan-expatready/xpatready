# Review — C11.17 "Add to Program structure": every refusal under its own field (QA-183)

Reviewer agent (did not build it), 4 Nov 2026. PR #867, commit **8494b7a87d6bf802ea4207ac88f73178b89e7067** (branch
claude/exciting-mendel-kzb37s), diff against origin/main 9caa043b: `web/src/components/add-to-structure.tsx`, new
`tests/check_c1117_field_messages_browser.ts`, `build-notes.md`. UI words only: no schema, money or permissions.
Own isolated copy `rev1117` on :4477 (web rebuilt by `isolated.sh`), stopped afterwards. Live AI off, US$0.

## Verdict: Ship (no Blocker, no Major; four Minors below, fix or list them in the PR)

## What I checked and what held
* **Builder evidence re-run:** `acceptance/C11.17.test.ts` 24/24 on two fresh copies (a third run on the same copy stops
  at step 2 because the pack's fixed name "Transit visa (acceptance C11.17)" already exists: the pack was there before
  this PR and is not changed by it). `check_c1117_field_messages_browser.ts` 24/24 three times. `tsc -p web` clean.
  The builder's "9/24 on main" was not re-run by me; by reading, every fail case needs the new `nameProblem` or `slotOf`.
* **Root cause and fix are right:** `problemFromZod` joins zod paths (`category.label`, `allowedLocations.0`); `slotOf`
  maps the first segment to the six places the pop-up has (`add-to-structure.tsx:29-32`). Refusals with no place of their
  own (`decision`, `close_names`, `exists` without errors, `race`) keep their full words (`:216-220`). `close_names`
  still feeds only the "Did you mean … Keep mine" box (AD-4), unchanged.
* **As-you-type check cannot disagree with the server:** both sides call the one `labelProblem` (which runs
  `cleanLabel` itself); the server's `label` schema is `transform(cleanLabel)` + `labelProblem`
  (`contracts/structure.ts:24`); the pop-up sends `trim()`, which the server cleans the same way. Checked edge cases on
  the copy: 7 × U+FDFA (NFKC grows it to 126) refused by both; a 125-character raw name that cleans to under 120 accepted
  by both (201); zero-width-only → "Give it a name." under Pathway with Add off. No duplicated rule (STANDARDS §7).
* **Disabling Add is right for the existing flows** (EXPERIENCE §2.8 prevent errors; this is a hard refusal, not a
  warning, so §2.9 is not breached): *Add and add another* clears the last field while saving, so it is never blocked by
  its own sent name; a too-long next name turns both buttons off, a valid one saves (J2). *Prefill* fills existing names
  (`sel` set → no check), so a prefilled pop-up is never blocked (J3). *Keep mine*: a too-long name replaces the close box
  with the rule (name-check skipped, `:160`), shortening brings the check back; `keep` resets on typing as before.
  Only levels in `path` block, so a name under a level that will not be sent (Sub-category under "None") never blocks.
* **Data:** a refused name is never sent (0 POSTs) or saved; after fixing, one row under Visitors, one audit line,
  nothing else changed (J1). Server authorisation unchanged (approver 403, acceptance pack).
* **Keyboard, sizes, axe:** keyboard-only main path works (focus starts in Pathway, Enter moves on, Tab reaches Add);
  axe WCAG 2.2 A/AA clean on the open pop-up with a message at 1024 px, 1024 px at 200 % (512 CSS px) and 1440 px; no
  sideways scroll at those widths. (400 px scrolls sideways on the page itself with or without the pop-up: pre-existing,
  and P-128 is desktop only in wave 1, so not a finding.)
* **Graph (P-86):** `graph.mjs` G1 0 · G2 0 · G4 0 · G5 0; `POST /structure/path` and `/structure/name-check` are
  reached by tests; the new check names C11.17. No element of this diff is scaffolding.

## Issues (ranked; all Minor, all Should)
1. **Should — while typing, the suggestion list covers the new note and offers to add the refused name.** The listbox is
   absolute directly under the input (`add-to-structure.tsx:331-342`), over the hint row (`:344-345`), and keeps the
   "Add “…” New" option for a name that breaks a rule. The note shows only once the person leaves the field; the red
   border is the only cue meanwhile. Seen at 1440 px and at 200 %. Fix: when `nameProblem(lv)` is set, show the rule in
   place of the "Add “…” New" option (or close the list when there is no match), so the message is visible as you type.
2. **Should — a refusal outlives the name it was about.** `typeIn` empties the levels below but clears only
   `errors[lv]` (`:169`); the Pathway type switch clears only `errors.pathwayType` (`:243`). After a server refusal under
   Category, changing the Program empties Category but leaves its red border and "Keep the name under 120 characters."
   under an empty field (reproduced). The pattern existed for level-keyed refusals before; this PR makes more refusals
   land there. Fix: clear `errors` for `below` in `typeIn`, and all field errors on the type switch.
3. **Should — the two new notes are not tied to their control.** `FieldNote` (`:292-294`) is `role=alert` (announced
   once), but the Pathway type and "Cases may be opened from" radiogroups get no `aria-describedby`/`aria-invalid`, so a
   screen-reader user re-reading the control does not hear why (name fields do this right, `:320`). Fix: give each
   radiogroup an id-linked description to its note. Reachable today only by an older pop-up or a direct client.
4. **Should — words.** While blocked, the "Add and add another" tip still says "Adds, then keeps the levels above…"
   (`:234`); only Add's tip says "Fix the category first: see the note under it." Use the same blocked tip on both.
   "see the note under Cases may be opened from." reads more clearly with the name quoted.

Outside this diff, for qa (not part of this verdict): Escape pressed while a name field's suggestion list is open closes
the whole pop-up and drops what was typed (the field's `stopPropagation` does not stop the dialog's own Escape).

## Scores (independent reviewer, browser and script evidence; 1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | P-127/P-128 "checks under each field as you type": rule notes under all four names, refusals under their part |
| D2 Data integrity | 4 | Refused names never sent or saved (0 POSTs, count unchanged); server rules unchanged |
| D3 Reuse | 4 | One `labelProblem` shared by web and API, no copy of the rule |
| D4 Rule integrity | Not yet evidenced | No dependent rules in this diff |
| D5 Stability, recovery | 4 | Add and add another, re-open, fix-and-add all held; stale note (issue 2) |
| D6 Governance | 4 | One audit line per added name (J1) |
| D7 AI trust | n/a | No AI |
| D8 Orientation | 4 | "You are adding" trail unchanged and correct |
| D9 Flow | 4 | Note names the fix; Add tip names the field; list hides the note while typing (issue 1) |
| D10 Language | 4 | Plain words; tip mismatch on Add and add another (issue 4) |
| D11 Feedback, state | 4 | Message on its field, alert points to it; issues 1 and 2 |
| D12 Visual quality | 4 | Team danger token, same note style as name fields (screenshots 1–6) |
| D13 Accessibility | 4 | Keyboard path, axe clean at 1024/200 %/1440; issue 3 |
| D14 Team look | 4 | Existing components and tokens only |
| D15 Speed | 5 | Pure client check, no request; name-check skipped for a refused name |
| D16 Testability | 4 | Pass and fail per field, axe, data checks; stable over 3 runs |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | n/a | No sourced values in this diff |
| D19 End to end | n/a | One pop-up fix |
| D20 Pain solved | simulated only | No intended user walked it |

**Journey score (reviewer, the one score for this check): 8.5 / 10 — pass** (no criterion at 0). Report:
`screens/C11.17-field-messages/journey-test-reviewer-2026-11-04.md`.

## Could not check
A real screen reader (announcement order of the nested `role=alert` inside the polite hint region); an intended user's
unaided walk (D17, D20 stay with the founder); the builder's 9/24 on main (not re-run). My screenshots and script are
outside the repo (`/tmp/claude-0/-home-user-xpatready/7c1e1616-e8b3-5ce2-bb1b-dc7ecbd9fe0d/scratchpad/out/`, `journeys.ts`).

**Verdict: Approve** — commit 8494b7a87d6bf802ea4207ac88f73178b89e7067 (no open Blocker or Major; Minors 1–4 to fix or list in the PR).
