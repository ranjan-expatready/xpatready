# Review: PR "C5.4 release with its sources, reachable from the Demo menu" (commit 260f0429)
Reviewer did not build it. Ran an isolated copy on port 4479 (US$0, no STUDIO_*_LIVE). Journey score is in this file (no separate report).

## What I ran
* `tsx acceptance/C5.4.test.ts 4479 xr_studio_rv3`: 22/22 PASS.
* Walked as a person (Chromium, 1440 and 400 px): Demo > Reset to the six > Demo > Start With an LMIA from its reviewed release... > dialog > Start > lands on Review and release, "Numbers without a source (17)", 6 items, Add source buttons, cut-off date listed. About 1.5 s. No sideways scroll at 400 or 1440. Keyboard-only (Enter on Demo, Enter on the item, Enter in dialog) works; focus moves into the dialog; Esc closes it; dialog has title and description.
* Done-when is met: the view is reachable from the menu on the six.

## Findings
### Blocker / Major
None.

### Minor
1. Double click on "Start from the reviewed release" fires the call twice: one 201 and one 409. The person sees a green "started" toast next to a red "A sample load or a reset is running" toast (screenshot read at 1440). Harmless (server `loading` flag holds; one release only) but noisy. `web/src/App.tsx:~233` (the button is only `busy` after the first re-render). Fix: ignore a second mutate while pending.
2. After the release exists the menu item stays enabled (`App.tsx:221`, `disabled={!loaded}` only). A second run opens the dialog, then shows a red toast "already has a release: choose Demo > Reset to the six" and the dialog stays open. Words are plain and the server refuses correctly, so no data risk. The dialog line "Once only after Reset to the six" tells the person up front.
3. Not atomic: `releaseWithSources` (`api/src/demo.ts:~155-160`) sets sourceBasis SOURCE_BACKED first, then imports without a transaction. A failure mid-import leaves a half-imported combination; a retry would hit the import again. Recovery is Reset to the six (the error text says so for the 409 paths only). Demo scaffolding, so Minor.
4. The route overwrites the combination's `basisNote` (the sample note) with the scaffolding sentence; the six's own note is lost for that row. Cosmetic.
5. Pack C5.4 writes the screenshot into the repo on every run (`C5.4.test.ts` SHOT path): running it dirtied the committed PNG (I restored it). Prefer writing only when `C54_SHOT=1`. Pack also does not cover: the not-in-demo-workspace refusal (`isDemoWorkspace`) or two concurrent calls; the draft change, source answers, submit, signoff and approve are API calls (declared in the header; the menu path to the view IS through the UI). Time-outs: every wait is explicit (10 to 180 s) and throws; `settle` throws after 30 s. Good.
6. Dialog words: "published number", "Release 1" are from the G1 concept and PRODUCT.md and acceptable; the description "A release with its sources to check" is vague. Not a standard breach.

## Refactor of loadSteps: behaviour-preserving
* `fromReviewedRelease` holds the same five operations in the same order (import, buildSnapshot, packVersion, configRelease, attachments to IN_LIBRARY). Same summary and basis strings.
* Pack version changed from the literal `1` to `last+1`; the schema has `@@unique([workspaceId, version])` (prisma/schema.prisma ~1130), so the old literal could only work for one import per workspace; the first import still gets 1. Safe, and it is what the new route needs.
* sourceBasis: loadSteps still sets SOURCE_BACKED at `createCombination` (`demo.ts:180`); the new route sets it by update before import. Attachments: unchanged (READ/RECOGNISED to IN_LIBRARY). The new route does not read the combination's official files first (the six already did that at load).

## Safety
* Author only (`need(actor,"author")`; APPROVER gets 403, tested). Demo workspace only (`isDemoWorkspace`). Once (409 when a release exists; tested and walked). Retired and missing combinations refused in words. Concurrency: shares the `loading` flag with load and reset (409 seen in the walk).
* Starting point of the six for anyone who does not choose it: unchanged. The new menu item is inert until clicked; no change to `loadSix`.
* Menu item P-35: lives in the Demo menu, labelled as demo scaffolding; audit line "loaded / reviewed release" written. P-33 is met: the product's own Review and release tab is what is reached; the control only creates the starting state.
* Accessibility: a real `menuitem` with text name; disabled state text says "(load the six first)"; dialog via the shared Dialog (labelled, focus trapped, Esc, Cancel). 400 px dialog fits. I did not run axe on the dialog.

## Standards [M] lines I could check
Plain words (met, minor 6), no sideways scroll at 400 (met), keyboard (met), errors in words with recovery (met), no per-row requests (met), server authorisation (met), test fails when the rule is removed: the 403, 409 and held-back assertions would (met).

## Journey score (journey-test, reviewer role): 8.5 / 10
task completed 1 · next step obvious 1 · plain words 1/2 (0.5) · feedback and state 0.5 (double click toast clash; 409 leaves dialog open) · correct data 1 (17 numbers named, release 1 only) · error recovery 1 · accessibility and sizes 0.5 (axe not run on the dialog) · speed 1 (1.5 s) · visual quality 1 · trust and sources 1 (sources listed, "None published" wording intact). No criterion at 0. Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).

Verdict: Approve (commit 260f0429). No open Blocker or Major; the Minors above are optional.
