# `/qa after-merge` — runtime R1d (forms panel, P-71 gate, never-overwrite, "none apply") and the qa R1c fixes on main 8aef175, 25 Oct 2026

Tester: the qa lane, cloud session on `claude/qa-e01030`, Lead note 2026-10-25 02:00 (one run only: weekly usage). Tested: **main 8aef175** (PR 13). Own copies on 4474 and 4477 (`xr_studio_qa_*`), stopped. No paid AI: no live spend-ledger line, US$0. The suites' by-products were restored, and none were committed. Every walk was headless (the cloud has no display). Evidence: `reports/2026-10-25-after-merge/`.

## Verdict
**Ready: no Blocker, Critical, Major or new Minor finding.** QA-35, QA-36, QA-37 and the rest of QA-26 are all closed. The R1d forms panel and "none apply" work for the officer and the client at 1440 and 390 px. axe was clean on every state walked. Coverage rose again and the floor was raised. The only open finding is QA-19 (the founder's demo data, the Lead's).

## Retests
| # | Result | Evidence |
|---|---|---|
| QA-35 Major | **Closed** | Demo menu "Open the case area" and `/cases` typed as the author both show the case area as the officer (`check_qa_r1c_walk.cjs` 27/27) |
| QA-36 Minor | **Closed** as decided (Lead, P-47: save and flag) | Back with 31 Feb: the part stays with the summary and the typing; the status reads "Saved: 1 answer needs a fix", not "✓ Saved"; the answer is stored flagged. My check now tests the decision rather than my earlier assumption |
| QA-37 Minor | **Closed** | `check_qa16_box_words.ts`: 0 in the web app, 0 in API messages |
| QA-26 Minor | **Closed** | `check_qa_r1a_probe.ts` 71/71: "Say whether the person is travelling (true or false)." |

## R1d walked (`check_qa_r1d_walk.cjs`, 35/35; the builders' `check_runtime_r1d.ts` 63/63)
* **Forms panel (officer, 1440 px):** each PDF form of the release is listed per person with what blocks filing. **Generate a copy**, double-clicked, makes one copy, shown as Generated. **P-71:** while the form is not ready, Filed and Validated copy uploaded back are disabled and the row says "Not yet: …"; underneath, the lock is refused with 409 "43 facts to answer or confirm before filing: do that, then generate a new copy." **Out of date:** a confirmed fact changed after the copy → "Out of date", with "Generate a new copy" offered. **Filed:** once ready (setup through the API), a new copy, then Filed, then Lock leaves one filed copy in the database.
* **Stale after filing:** the client (390 px) changes the filed group to "Entries apply after all" and adds an entry. The officer then sees the filed copy as "Stale · Filed". **Its file and row are unchanged** (same sha256: never overwritten), and readiness goes back to not ready.
* **"None apply" (client, 390 px):** the empty required group "Education history" is named as a blocker ("Entries in … : add them, or say none apply"). The client presses None apply: it shows as said, with "Entries apply after all", and the group stops blocking (the client's own answer counts as confirmed). The client withdraws it and the group blocks again.
* **"None apply" (officer):** saved but not confirmed, and it still blocks. After Confirm section the group stops blocking. *The confirm went through the API: the button itself was not clicked.*
* **Online form not offered:** a case pinned to a copy of the release that files IMM 5257 Online. At 390 px its forms panel offers IMM 5707 only (fixture as in the builders' suite).
* 390 and 1440 px: no sideways scroll; axe clean on all nine states walked; no page errors.

## Smoke of every Works capability
M2 journeys J1–J8 47/47 (one run): warm first view 833 ms, filter 182 ms, create 313 ms. The R1c walk ran 27/27 again. Decision impact: no Gap (run on 12e7207; no new decision rows since).

## Suites on 8aef175 (`run-suites.sh --demo` under coverage, one run)
**21/21 effectively.** 20 passed. `check_p2_guard.ts` failed only under the coverage preload and passes 75/75 plain, as in earlier runs. The runtime suites are new or grown: case engine 50, R1c 120, R1d 63, R1a 99. The rest are unchanged: launch paths 55, slice 2b 60, Screen 01 browser 136, Studio browser 40.

## Coverage (c8 12.0.0, every suite above)
api/src **96.25% lines / 81.55% branches** · engine **99.42% / 88.24%**. The floor is raised to api 96 / 81 and engine 99 / 88. New code: `fill-case.ts` 98.0 / 85.7, `engine/runtime/forms.ts` 100 / 97.9, `runtime.ts` 100 / 89.6.

## Open after this run
**0 Blocker · 0 Critical · 0 Major · 1 Minor (QA-19, demo data, Lead).**

## Could not cover (one run)
* The officer's **Confirm section** click and the officer's own None apply click in the agent view: both went through the API (the builders' R1c journey clicks them).
* An **Adobe** check of a generated copy (evidence lane).
* The copy's **download** in the browser (API download covered by the builders' suite).
* A real **Online** release (fixture only; a release with an approved online version needs Screen 02).
* 200% zoom and a screen reader.
* The founder's :4400 (QA-19).
* Repeat runs for flakiness: everything ran once, except the R1c walk, which ran twice while I aligned QA-36.

## Questions for the Lead
None.

## Suggestions (never built by qa)
* "Ready to file" while 96 of 161 form fields stay unwritten (optional facts) may surprise an officer. The row could say how many optional fields are empty. *Later · Capability.*
