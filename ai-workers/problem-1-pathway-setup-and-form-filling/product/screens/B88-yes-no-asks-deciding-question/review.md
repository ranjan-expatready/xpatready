# B88 review: a worked-out Yes/No asks its form's own deciding question (QA-239, C4.11)

The reviewer agent did not build this. This file holds two rounds. Round 1 was on 2d85215f3 (`git diff d68a8b79a..2d85215f3`; B86 #1053 is the base). Round 2, the last, is on **7ce4a9630**, diff only (`git diff 2d85215f3..7ce4a9630`). It covers my 4 Majors, the breaker's 5 (`break-report.md`), and the tech lead's request (#1068, 6651254531) to try to break the step-finding by data path. Date: 5 Nov 2026. US$0, live AI off. My own copies ran on :4456 and :4457, never :4400, and are stopped.

## Round 2 verdict (7ce4a9630): **Ship after fixes**. **Verdict: Block**: 1 new Major (R2-M1), no Blocker
All 4 of my round-1 Majors and the breaker's 5 are fixed, each with a test, and I re-checked each one on my own copies. The step-finding holds on the six and on every reading I tried. On the case path it never writes a wrong value, because QA-165 refuses a No while a named detail is recorded. One Major is left: **the step B88 writes turns a person's No into Y wherever QA-165 does not run first**, and one product route fills a PDF that way.

### Re-run on 7ce4a9630 (fresh copies)
`check_forms_b88_spread.ts` 36/36 · `check_forms_b88_panel_browser.cjs` 47/47 (screenshots sent to my scratchpad) · `check_forms_b88_fill.ts` 31/31 · `check_forms_b86_fill.ts` 29/29. I did not run qa's `C4.11-spread.test.ts`; I read it.

### Round-1 Majors (mine; breaker M1, M4, M5)
* **M1 fixed.** The h1 reads "Change the question a form field asks: … asks "Has used other name" (Y when Yes, N when No)". `CODES` now catches upper snake codes and the test checks the h1 (browser, spread).
* **M2 fixed.** The names are now "Asks the same question: “…”", "Undo: …" and B86's "Undo: take the condition off …". axe `label-content-name-mismatch` finds none at 1440/400 px (test, and my own run on the new followers section).
* **M3 fixed.** In my walk, the approver proposed an Undo and returned it through the page. The ask went back to APPROVED with its own note, and its chip reads "Approved · in the next release". The spread test covers return, then withdraw, and withdraw while waiting.
* **M4 fixed.** The spread test changes the condition, and then the form field, between proposal and approval (both in the DB, then put back). Each answers 409 "Changed since" with nothing written, then passes once restored. Simulating the concurrent change in the DB is acceptable here, because no route can step between proposal and approval.
* **Breaker M2 fixed.** "Form fields that follow a question's condition (2)" is closed by default. From the keyboard I opened it and proposed Undo there. It loads in 386 ms with axe AA clean, and has no sideways scroll at 1024/512/400 px.
* **Breaker M3 fixed** (test moves the record to another edition id, row stays "asked" with Undo).

### Step-finding by data path (tech lead's request)
Method: I ran `blockFacts`/`askedStep` on **all 39 worked-out Yes/No form fields in the six's maps**, in every edition. I also ran them on **all 147 Yes/No boxes with a printed question in `p1/inventory/*.inventory.json`**, with every reading field standing in as a fact. I compared each block with its reading, its rows, its person, the fields one level up, `RECORDED` (`p5/transforms.ts:68`) and `gatesOf`/QA-165 (`engine/runtime/forms.ts:34,55-57`).
* **The 9 asked boxes are right.** Each block holds exactly the printed block's details: 2 names, 4 national ID facts, 2 US card facts. Every field the reading prints there is mapped. No block holds rows or another person's details. `recordedDerivation(askedStep(…))` reads back exactly the same facts.
* **Rows and repeating people are covered.** `knownOf` (`engine/runtime/case.ts:240`) also stores row 0 under the plain key, so QA-165 sees a recorded row. IMM 0008 DEP is one form per dependant, about `form_subject`.
* **Too far:** the `≤ 8` and "must hold the question" guards stop every section-sized block, e.g. IMM 1294 `PersonalDetails` (61 fields) and IMM 1344 `SponsorEA` (18). The re-check at approval compares the whole step again, so a changed block answers 409.

**R2-M1 (Major, Must): a No is written as Y on the Studio's sample PDF fill.** The filler's `RECORDED` step sets `any = present(v) || facts.some(present)` (`p5/transforms.ts:109`). So with the deciding answer No and any named detail recorded, it gives **Y**. Only `formCoverage`'s QA-165 stops this.
* `Fill.fill` (`api/src/fill.ts:72-84`, the sample-profile PDF proof) fills from `studio.preview` render coverage. That path has no QA-165. Its profile facts are "confirmed" (`api/src/studio.ts:506`).
* Proven with the fill test's own made-up form (deciding answer No, block note "kept a note"):
  * case path `{"Note":"kept a note"}` (Yes/No refused, as it should be);
  * sample-fill path `{"Indicator":"Y","Note":"kept a note"}`.
* Through render, a hidden stale name also counts (render has no B86 BR-5).
* **Reachable today?** No. The only profile (Client A, `expected/p5-case-c1.json`) holds none of these facts, and no route edits profiles. Case copies use `formCoverage` and are safe.
* B52's IMM 5257 boxes already carry this step shape. B88 puts it on 9 more, and BR-6 ("writes the person's own Yes/No") is false on this route. That is why it is Major and not Minor. The tech lead may rank it a Blocker under the wrong-value rule; I did not, because no product step reaches it.
* **Fix (one place, safe for every caller):** in `runTransform`'s RECORDED branch, an explicit `v === false` with a named fact present returns `hand("answered No, but … is recorded")` and never Y. Add a pure test on the render path (above).

### Round-2 Minors (Should)
* **R2-m1. A block shared with another Yes/No takes that Yes/No's fact as a "detail".** Readings: IMM 1294/5257 `BackgroundInfo` Choice[0]/[1] (3 fields, 1 other Yes/No); the passport `TaiwanPIN`/`IsraelPassportIndicator` blocks (IMM 0008, 1294, 5257, 5710). Once asked, a No is refused ("… is recorded") whenever the other one is Yes. That is a box stuck with the person, not a wrong value. None of them can be asked on the six. **Fix:** leave mapped Yes/No boxes out of `blockFacts`, or refuse when the block holds one.
* **R2-m2. The page stop is case-sensitive** (`engine/form-field-condition.ts:94`: `Page|Part`). `IMM_5532[0].page1[0]…` and `IMM_5707[0].page1[0]…` climb to the whole page, which only the `≤ 8` guard stops. **Fix:** `/i`.
* **R2-m3.** `restoreReplaced` sets RELEASED without `releasedIn` (`api/src/form-field-condition.ts:88`).
* **R2-m4.** The self-approval refusal still says "change of when a form field is filled" (`library-changes.ts:34,125`, by kind).
* **R2-m5.** The followers route runs `rowsOf` once per conditioned question (about 4 queries each), and the web renders one panel request per question even while `<details>` is closed. I saw 11 API requests on load, in 386 ms, inside the budget. Load the panels when the section opens.
* Still open from round 1 and not taken (concept §10): m6, the returned page's "Correct it and send it again" form (B86's page).

## Round 1 summary (2d85215f3)
**Block on 4 Majors**, all fixed above:
* M1: raw code `SET_FORM_FIELD_QUESTION` in the title;
* M2: WCAG 2.5.3 on the new buttons;
* M3: closeReplaced left a WITHDRAWN "Replaced by a later change" record, shown as "Released", on an ask that was still in force;
* M4: no test for the approval re-checks.

Round-1 Minors taken (concept §10): label instead of meaning, BR-10 tested, concept updated, no double count, Undo restores origin and evidence, ports.

The Done when was met in round 1 and is still met. The six held 2/7/5/7 Hiding errors before and 0 after, through product steps only, each approved by a second person. Unreachable 0; the rule is unchanged (P-303); the P-319 table is data; the list is unmoved; US$0.

## D1–D20 on 7ce4a9630 (1–5; changes from round 1 only)
D2 Data integrity 4 (records now true; R2-M1 on the sample path) · D5 Stability 5 · D6 Governance 4 · D9 Flow 4 (Undo reachable; inherited returned form) · D10 Language 4 · D11 Feedback 4 · D13 Accessibility 4 · D16 Testability 4 (every round-1 rule now fails its test when removed; R2-M1 untested). The rest are as in round 1: D1 4, D3 5, D4 5, D7 4, D8 4, D12 4, D14 4, D15 5, D18 4, D19 4. D17 and D20 are simulated only.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20); a full release record on the six; a client case filled end to end in the browser; real 200 % zoom (simulated at 512 px).

Journey test: `journey-test-reviewer-2026-11-05.md`: round 1 **7/10**, round 2 **8½/10** (passes; no criterion at 0).

**Verdict: Block.** Fix R2-M1 with its test. Fix R2-m1 to R2-m5 or list them in the PR.
