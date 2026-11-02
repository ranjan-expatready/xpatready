# Review: K11 (C11.15 Minors), forms, commit a6a94750

**Branch** `claude/elegant-knuth-y7lnq9`, exact commit `a6a94750`, diff `git diff origin/main...a6a94750` (6 files, +218 / −7). The shared contract `contracts/workspace.ts` is named in the commit body. The reviewer did not build this change. 2 Nov.

**Verdict: Block.** There is one Major: an existing suite fails at this commit. The five fixes themselves hold as claimed (see the table). When the fix for M1 is committed, re-review only that delta.

## Runs (own copies, US$0, never :4400 / 4452 / 4453)
* `check_forms_k11_words.ts`: **12/12** (no server).
* `check_forms_k11_minors_browser.cjs`: **20/20** on `forms_k11r` :4454, where the web was rebuilt (dist was 39 s older than the commit). On a copy built from main's 4 source files plus this branch's test (:4455): **10 passed, 10 failed**, the same 10 the builder reports. The 10 failures are QA-78 ×3, QA-105 ×3, QA-110 ×2, QA-111 ×1 and QA-107 strip ×1.
* `check_forms_qa101_103.cjs`: **22/22** on a fresh :4454.
* QA-98, `check_w1_start_setup_browser.cjs`: **43/43** on a fresh :4454. All 4 QA-98 checks pass. Tip steps 2.20 + 1.70 + 1.70 = at most US$5.60. With the page chosen, the dialog shows 1.70 + 1.70 = US$3.40, which is the button's figure less the page pick. A plan with crossed fingerprints is refused with 409. The code is on main (`api/src/finder.ts:189–201`) and this diff does not touch it. **Confirmed: QA-98 is already fixed on main.** Closing it is qa's call; it is still Open in `qa/BUGS.md`.
* `check_forms_demo.ts` on an exact copy of the a6a94750 studio (every tracked file matches by hash, :4455, fresh DB): **13 passed, then "the check stopped"** at `tests/check_forms_demo.ts:75` (M1).
* graph.mjs: G1 0 · G2 0; nothing in G3–G6 is in these files. `qa/graph.json`, which the tool rewrites, was restored afterwards.

## Findings
**Major**
* **M1. An existing suite fails at this commit.** `tests/check_forms_demo.ts:74` finds its row with `p.locator("tr", { hasText: "imm1344e-check-copy.pdf" })`. The QA-78 change (`web/src/pages/workspace/forms.tsx:152`) took the file name off that row, so the "Read form" click at :75 times out after 30 s and the check stops. The suite is in `product/tools/suite-times.tsv` (27 s), and CI's `--changed` selection picks it up for `forms.tsx`. Fix: give the pending row a stable hook and find the row by its attachment. The builder's uncommitted working-tree change (seen at 10:41) does exactly that: it adds `data-attachment={a.id}` and looks the id up by the held item's sha256. It looks right, but it is not part of a6a94750. Commit it, rerun `check_forms_demo.ts`, and run the full `run-suites.sh --changed` set (the PR reports only 3 suites).

**Minor**
* **m1. QA-110 is only half fixed: Redo with AI from the line's menu still drops focus to the page body.** `finder.tsx:62` captures `document.activeElement` on the first render. When the dialog opens from `DropdownMenu.Item onSelect={onRedo}` (`forms.tsx:230`), that element is the menu item, which unmounts at once. `opener.isConnected` is then false, nothing is focused, and focus ends on BODY. The reviewer walk got BODY after both keyboard Escape and mouse Cancel. The comment at `finder.tsx:60–61` says focus goes back to "the line's menu button", which is not true. Fix: if the opener is inside `[role="menu"]`, use the menu's trigger, `document.getElementById(menu.getAttribute("aria-labelledby"))`. Or pass the element to return to from `LineMenu`. Add a browser step for this path.
* **m2. The QA-107 page step cannot fail on this fixture.** "QA-107 fail (page): no IRCC's words … keep '(opens in a new tab)'" also passed on the copy without the fix. No recorded canada.ca page carries link text, and `/IRCC's words[^\n]*/` over `main` mostly matches the column header "Why it is here (IRCC's words)". The regex is guarded only by the unit check, which does fail without it. Fix: rename the step as a smoke step, or feed a quote with the link text through the stand-in answer.
* **m3. The `irccWords` space rule is wider than its reason.** `\s+([.,;])` runs over the whole quote, not only where the link text was removed. Reviewer probes: `"Version 1 .5"` became `"Version 1.5"`, `"Section 4\n. next"` became `"Section 4. next"`, and `"$ .50"` became `"$.50"`. Commas inside quotes ("\" , \"") lose their space too. No IRCC sentence seen is hurt, and the change is display only, so this is low risk. Fix: drop the space only where the link text was removed, `q.replace(/\s*\(opens in a new (?:tab|window)\)(?:\s+(?=[.,;]))?/gi, "")`, and add a failing case (`" .5"`) to the unit check.

**Checked and holding (no finding)**
* **QA-78 words.** The builder's choice is right. P-113 and P-152(3) make Online a real channel today: the case officer types the answer sheet into the portal until the extension (W6). "Online (not yet)" would wrongly suggest it cannot be chosen. The caption beside it, "Needs the browser extension (later wave)", is P-107's own wording, which the API problems also use (`check_forms_channels.ts:129`); qa's narrowed retest did not cite it. Rows for attached forms not yet set up show the edition, and fall back to "Not read yet" with the file stem in bold when there is no edition.
* **QA-105.** The description changes with the mode: Saved, Rules and Live each read correctly, and the Sample note stays in every mode. The `only` (Redo) and `page` variants use the same mode texts.
* **QA-107.** "Last find today at 10:39 a.m. · rules only, US$0." has one full stop. `endSentence` covers "running now" too. The stored quotes are unchanged: `irccWords` is used only in output (`api/src/workspace.ts:84` and 4 web views).
* **QA-110 side effects.** Start disables Find again, the `disabled` guard skips it, and focus goes to the body. That was already so on main and is outside QA-110 (Escape and Cancel). The cleanup's `setTimeout` runs before Radix's own unmount focus, which calls `preventDefault` and focuses a null trigger, so focus is not taken back. StrictMode's double effects are a no-op, because the dialog already has focus.
* **QA-111.** The ref starts at the current state, so the effect does not fire on mount. QUEUED→RUNNING does not fire it. It fires only when a run goes from active to ended. A changed `id` prop at most refreshes the new combination once. For a run started here, a second refresh of the 6 reads can follow the run card's `onEnded` once per run: measured 2× per read from Start to settled, the same as main. That is not a per-row request.
* **Waits.** Every wait in the new browser check either throws or becomes a named FAIL step. There is no `.catch(() => undefined)` after a wait.
* **Roles.** The approver sees no Find again and no channel choice, and a find as the approver returns 403.
* **Screen sizes.** 1024 px, 200 % zoom (512 css px) and 400 px: no sideways scroll, and the dialog fits. axe found no WCAG 2.2 AA violations on Study permit or Visitor visa. No page or console errors.

## D1–D20 (only what this change moves; others not affected)
D1 4: five Minors fixed as qa wrote them, QA-98 confirmed on main · D5 4: QA-111 refresh without a reload · D10 4: "later wave" is gone from the choice, but "(P-113)" is still on the Online line (`forms.tsx:143`, older than this PR, PRODUCT §4) · D11 4: the strip and lines refresh, with one full stop · D13 3: focus is lost on the Redo-from-menu path (m1), the rest holds · D16 3: one existing suite is red (M1), and the QA-107 page step is vacuous (m2) · D17, D20: simulated only.

## Journey score (reviewer): 9 / 10, pass
See `journey-test-reviewer-2026-11-02.md`.

## Could not check
A real screen reader. A live find with real AI (US$0 rule; QA-111 was driven with the fake launcher and the run card's poll held on RUNNING, as the builder did). The full `run-suites.sh` set at this commit; only the 5 suites above were run.

**Verdict: Block.** To fix: M1 (commit the `data-attachment` row hook, rerun `check_forms_demo.ts` and the changed suites). Recommended in the same PR: m1–m3.
