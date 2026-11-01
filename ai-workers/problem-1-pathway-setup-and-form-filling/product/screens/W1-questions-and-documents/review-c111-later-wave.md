# Review: C11.1, "Online (later wave)" on each Preview line (forms lane)

Reviewer: a fresh context that did not build it, 1 Nov. Commit **0c511652**, branch `c111-later-wave` on origin/main 4ffb5e80, worktree `/home/user/ci-wt`. Isolated copies `rev_c111` on :4491 and `rev_c111b` on :4492. US$0, no AI.

**Spec:** CAPABILITIES C11.1 says "Wave 1 (P-102): no extension, capture, pairing, online-fill or 'Add an online form' anywhere; every PDF path still works". qa's remaining gap was: "Preview presents an Online line as filled on the portal with no 'later wave' word". C4.6 had put the note under the group heading, but qa reads the line (`[data-preview-form]`).

**The change:**
- `preview.tsx:149` adds a `Pill tone="ai"` showing `ONLINE_LATER_WAVE` ("Online (later wave)") on each line in the ONLINE group, with the line's `laterWave` sentence as its `title`.
- It adds two steps to `check_c46_preview_channels_browser.cjs`.
- It adds the qa/built/C11.1.md note.

I agree with how the builder read the spec. The capability asks that nothing presents an Online line as filled today. Marking the line itself is the smallest fix and adds no scope.

## Verdict: Approve (**Verdict: Approve**)
There is no open Blocker or Major. Three Minors are listed below. None of them blocks.

## Tests re-run on this commit (fresh copies, all green)
- `check_c46_preview_channels_browser.cjs` 25/25
- `qa/check_qa_am_1027.cjs` **55/55** (it was 54/55 on main)
- `check_preview_sets_browser.cjs` 24/0
- `check_s5_slice1_browser.cjs` 52/52
- graph `--check`: G1 0 · G2 0 · G3 1 (`GET /attachments/:id/file`, existing, not this PR) · G4–G6 0

## What I checked
- **Copy.** "Online (later wave)" is the same constant the case page uses ("IMM 5707 · filed Online (later wave)"), and the Forms tab's channel choice uses the same words. The title is the engine's single sentence (`engine/runtime/preview.ts:157`), so the words are not copied. There is no decision number, system name or ID on screen; the C4.6 fail-guards are still green.
- **P-102 wording.** The new copy does not mention capture, pairing, the Extension page or "Add an online form". "Browser extension" appears only inside "(later wave)", as P-102 allows (it returns in the last wave). The Online line offers no Fill PDF. The Studio fill is refused with 409 in later-wave words (qa step).
- **Accessibility of the pill.**
  - axe WCAG 2.2 A/AA finds 0 violations in light and in dark mode.
  - There is no sideways scroll at 400, 1024 or 1440 px, or at 200 % zoom (720 px at 2x). The pill (113 px, nowrap) fits and wraps after the title at 400 px.
  - It is a status, not a control, so it is rightly not in the tab order.
  - Its visible text carries the meaning on its own, so a keyboard or touch user loses nothing when the `title` tooltip is out of reach.
- **Duplication with the group note.** The visible text is short ("Online (later wave)"). The full sentence appears once, visibly, under the heading. The only duplicate is the `title`, which screen readers expose as a description (m2).
- **Nothing else on Preview regressed.** The count line, Paper and hand-signed lines, the checklist line, the couple Online sub-line, the PQR/SQR/Agent sets and the released-preview guard all still pass, through the suites above and my walk (`/tmp/rev_c111_shots/`).
- **Code.** Rendering on the client only, no extra request, no server or data change, no migration. The import of `contracts/runtime` into a workspace page is a plain constant import, and `web/src/runtime/forms.tsx:11` already does the same.
- **The test fails when the rule is removed.** Without the pill, an ONLINE line's text holds no "later wave" (the sub-line is skipped for `g.key === "ONLINE"`, `preview.tsx:152`). So "C11.1 pass" and qa's Preview step would both fail. "C11.1 fail" guards the other direction: no pill on Paper or PDF upload lines.

## Findings

### Blocker
None.

### Major
None.

### Minor (Should; none blocks)
1. **m1: one channel, two labels on the same screen.**
   - An Online line filed once for the couple or the application (IMM 5409 set to Online, Preview › Spouse) still shows the pill **"Online"** (`f.channelWords`, `preview.tsx:149`), with "Online: … in a later wave." on its sub-line.
   - An Online-group line shows **"Online (later wave)"**, and so do the Forms tab and the case page.
   - The later-wave words are on that line too, so qa's gap is not reopened. But P-113's real Online forms (IMM 0008, 5669, 5406) are application-level forms, so they will show the plain "Online" label.
   - Fix: when `f.channel === "ONLINE"`, show `ONLINE_LATER_WAVE` in that pill as well. The sub-line can then drop its "Online:" prefix. Screenshot: `/tmp/rev_c111_shots/couple-online-1440.png`.
2. **m2: the screen reader hears the sentence twice.**
   - The `title` copies the group note word for word, and Chrome exposes it as the pill's description. With three Online lines, a screen-reader user hears the long sentence four times.
   - Fix: drop the `title`, since the note is visible right above. Or keep a short tooltip that adds something, for example "The case officer types it into the portal from the answer sheet." That would still meet EXPERIENCE [M] 10 (tooltip on a status).
3. **m3: the purple `ai` tone marks a status that is not AI.**
   - The new pill uses `tone="ai"`. This follows the channel pill's existing choice, so it is not new to this PR. But purple is the product's AI mark (trust criterion, D7/D18), and this pill says nothing about AI.
   - Fix (Should, can be its own small item): use `info` or `neutral` for the channel, on both pills.
4. **Record note (not a product finding).** `qa/built/C11.1.md` names the branch `claude/gifted-bardeen-e0tgby` and "swarm B1b". The commit I reviewed is on `c111-later-wave`. Check that the note names the PR's real branch.

## D1–D20 (for the Preview Forms panel at 0c511652, scored 1 to 5)
- D1 5 · D2 n/a (read-only) · D3 5 (one constant, one sentence) · D4 n/a · D5 4 · D6 n/a · D7 3 (m3)
- D8 4 · D9 4 · D10 4 (m1) · D11 5 · D12 4 · D13 4 (m2) · D14 4 · D15 5 (406–525 ms) · D16 5 (pass and fail steps, qa 55/55)
- D17 simulated only · D18 4 · D19 4 (Forms tab → Preview → case all say "Online (later wave)") · D20 simulated only

## Journey score (reviewer, the one score for this check): **9 / 10, pass**
See `journey-test-reviewer-c111-2026-11-01.md`. Plain words scored ½ (m1) and trust and sources scored ½ (m3). Every other criterion scored 1.

## What I could not check
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- Real IRCC portal behaviour: Sample until the immigration expert confirms.

**Side effect to note:** the browser suites I re-ran rewrote 34 committed screenshots in this worktree (c46-preview-channels, preview, slice1, qa/reports/2026-10-28-after-merge-r3). I was told not to reset, so I left them modified. Restore them, or commit them, deliberately.
