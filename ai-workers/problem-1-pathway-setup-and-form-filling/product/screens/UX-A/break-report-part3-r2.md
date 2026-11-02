# UX-A part 3, round 2: break report (commit 91d53c66, diff 4ee92384..91d53c66)

**Scope.** I re-ran B1, M1, M2 and M3 from `break-report-part3.md` and tried to break the one-state rule.
- I used Not ready from a release problem and Not ready from the startable check, Live with draft changes, and retired after a release (both a Live and a Not ready combination).
- I used the demo sample (reset + load), as user-A, user-B and user-C.
- Copy `brk_uxa3` on :4471, headless Chromium, US$0. No `*_LIVE` setting was used, and :4400 was not touched.

## Re-runs
- **B1: fixed.**
  - **Steps:** Super visa: add IMM 5257, submit (A), sign every item (C), then click **Approve and release** as B in the browser.
  - **Result:** the header chip says Not ready. The strip says "Setup steps · 0 of 5 done", with no "Live" and no "for the next release". The Programs card shows "0 of 5 steps" (folded into In progress, P-180), and the Programs line says "1 live · 4 in progress". The Structure row says Not ready.
  - The catalogue has `status` NOT_READY and `setup.chip` NOT_READY.
- **M1: fixed.**
  - **Retired LMIA (was Live):** the header says **Retired**, with no next-step box, no strip and no tab badges, at 1440, 1024 and 400 px.
  - **Retired Super visa (was Not ready):** also Retired, with no next step.
- **M2: fixed.** Right after Approve and release, without a reload:
  - At 2.5 s the chip says Not ready and the facts say "In Release 2 · draft matches the release".
  - The tab shows "(0)", and the bar says "No unreleased changes. Firms use Release 2".
  - Nothing changed between 2.5 s and 18 s.
- **M3: fixed for a library-only draft.**
  - The bar says "Draft · 1 change in the shared library, released with the next release", with no "across 0 combinations", at 1440, 1024 and 400 px. The combination's header and Review tab say 0.
  - The mixed case is still open (n1).
- **m2: fixed** while the summary loads (4 s delay). The tab shows "Counting the draft changes…" and never lists the 22 library items. Then it shows 23 for a real change, matching the bar. A failed summary is n3.
- **m3:** not re-run (Documents refresh now includes `combination-summary`, `documents.tsx:61`).

## One-state attacks
- **Not ready from a release problem.**
  - **Steps:** LMIA (Live). I inserted one undecided DRAFT form-field row on IMM 5409's edition in my isolated database. This is what a new edition produces (`impact.ts:80`); the audit bump only refreshes the catalogue cache.
  - **Result:** everything agrees.
    - The header says Not ready, with the next step "Forms · Fix 1 problem: firms cannot open cases until it is fixed".
    - The strip says "Setup steps · 1 of 5 done".
    - The card shows "1 of 5 steps" with Needs you.
    - Structure says Not ready, including under its Not ready filter.
    - The bar, the header and the Review tab all say "1 draft change". **Holds.**
- **Live with draft changes** (LMIA, IMM 5409 removed):
  - The header says Live, with "Next step for the next release". The strip says "Live · setup steps for the next release: 2 of 5 done", and the card says ✓ Live.
  - The bar, the header, the Review list and the step card all say 2. **Holds.**
- **Retired after a release, Live and Not ready:** Retired on the header, card and Structure row (see M1). **Holds**, apart from n2 and n4.

## Still breaks (no Blocker, no Major)
**n1 (Minor): a mixed library and combination draft is still counted as one combination's changes.**
- **Steps:** LMIA has 2 changes, and the approved retirement of LMIA is waiting for release.
- **Result:** the bar says "Draft · **3** changes across **1** combination", while LMIA's header and Review tab say 2.
- **Cause:** `App.tsx:145` adds `library.length` to the number before "across N". The Release page says it correctly ("3 draft changes across 1 combination and 1 library change"). This is the second half of round 1's M3.

**n2 (Minor): a retired combination keeps its draft and can still be submitted and released.**
- **Steps:** with LMIA's 2 changes unreleased, its retirement is released in Release 3 (LMIA is held back as not submitted).
- **Result:**
  - The page says Retired, but the facts say "2 draft changes", and the bar keeps "Draft · 2 changes across 1 combination".
  - The Review tab offers **Submit for review**, enabled.
  - Submit (A), sign (C) and `pack/release` (B) succeed: Release 4 holds "With an LMIA, version 2".
  - The card then says "**Retired at Release 4**", although it was retired in Release 3.
- The state word stays Retired; the draft count and the release number contradict it.

**n3 (Minor): when the summary fails, the Review tab waits for good with no way out.**
- **Steps:** make `/summary` return 500, then open the Review tab of a combination with 23 changes.
- **Result:** it shows "Counting the draft changes…" and "Counting draft changes; 0 problems to fix" with no end. Submit is disabled, and the tab has no Try again, while the bar shows 23.
- **Cause:** `review.tsx:45-49`, and `combination.tsx` passes `undefined` while `sum.isError`.

**n4 (Minor): Structure's status filters ignore retirement.**
- **Steps:** turn Show retired on. Filter Live (`?r=1&s=live`), then Not ready (`?r=1&s=notready`).
- **Result:** the Live filter lists With an LMIA, whose row says **Retired**. The Not ready filter lists Super visa, also **Retired**.
- **Cause:** the `/api/structure` combination keeps `status` READY / NOT_READY beside `statusText` "Retired", and the filter tests in `structure.tsx:47-49` do not check `retired`.

**Not changed, as the builder listed (unchanged and not re-scored):**
- m1: "setup draft" still appears in Structure's Can't delete / Can't retire reasons.
- m4: a retired Super visa is reported as "still in use".
- m5: the first form on a never-set-up combination counts 23 changes.

**Wording note:** the library-only bar says "in the shared library" when the one change is a combination's retirement.

## What held
- No "In setup" on Programs, Structure, Release, To review, Activity or AI work. Every walk ran with no page error.
- B1, M1 and M2 are fixed as above. The four state paths agree on the header, the strip, the card, the Programs counts and Structure.
- The bar, the header and the Review tab agree for real changes on a combination, on a Live combination, on a release-problem Not ready, and after a release.

## Verdict
**Approved on 91d53c66.** The claim holds. The Blocker and all three Majors are fixed, and every attack on the one-state rule held. n1–n4 are Minor and can follow.
- n1 is the remaining half of M3.
- n2 is lifecycle: a retired combination still has a draft that can be released.
- n3 is a failure path.
- n4 shows only with Show retired on.
