# UX-A part 3: break report (commit 4ee92384, diff de7ee3b0..4ee92384)

Claim (P-273, UX baseline finding 7): each combination state has one word everywhere (`contracts/status-words.ts`: Not started · In progress · Not ready · Live · Retired). The same word shows on Programs chips and cards, the combination header, Structure filters, rows and Used by. A Live combination's header next step and setup strip say the open steps are for the next release, and a non-live one never does. The draft bar, the header's "N draft changes" and the Review and release tab's list and step card count the same draft changes.

Setup: isolated copy `brk_uxa3` on :4471, headless Chromium. I used the demo sample (reset + load) and the six (reset-to-six), as user-A (author), user-B (approver) and user-C (expert). Releases went through the API (submit A, sign C, approve B) and once through the Approve button. Nothing was priced (US$0), no `*_LIVE` setting was used, and :4400 was not touched. Screenshots are in the scratchpad only; the repo has none of mine.

## Breaks

**B1 (Blocker): one released combination is "Not ready" in the header and Structure, but "Live" on Programs and in the setup strip.**
- Steps (demo sample):
  1. Super visa: user-A runs `POST /combinations/:id/forms {"formKey":"IMM 5257"}`, then submits.
  2. user-C signs every item; user-B approves.
- Expected: one word for its state on every screen.
- Actual: `/summary` gives `row.status` NOT_READY ("No form fields mapped yet for IMM 5257", "No questions yet for …"), while `setup.chip.status` is LIVE.
  - The header chip says **Not ready**, and the setup strip under it says **"Live · setup steps for the next release: 1 of 5 done"**.
  - The header next step has no "for the next release" text, but the strip does.
  - The Programs card says **✓ Live**, and the Programs line counts it as "2 live" (`catalogue.counts`: live 2 and not_ready 1, at the same time).
  - The Structure row and the "Not ready" filter say Not ready.
- Cause: there are two definitions. The header, NextStep and Structure use `statusOf` (missing items: `engine/programs.ts:89`; `combination.tsx:102,166`). The strip and Programs use the checklist chip (release *errors* only: `engine/setup-checklist.ts:121,190`; `setup-strip.tsx:44`; `programs.tsx:113`). The new strip text makes the contradiction visible on one page.
- Releasing an incomplete combination is not refused, so this is the normal path, not an edge case. Screenshot: `sv-0.png` (header "Not ready" above "Live · setup steps for the next release").

**M1 (Major): a retired combination's header says Live (or Not ready), and Live comes with "Next step for the next release".**
- Steps (demo sample):
  1. With an LMIA: user-A runs `POST /combinations/:id/retire`.
  2. user-B runs `POST /library/changes/:id/approve`, then `POST /pack/release {"expectedChanges":1}`.
- Expected: the header says Retired and gives no next step, as the Programs card does ("Retired at Release 1") and the Overview body does ("Retired at Release 1. … nothing new is set up on it").
- Actual:
  - LMIA: the chip says **Live**, and the header box says "**Next step for the next release** · Confirm the checklist page" with a button.
  - Super visa retired the same way: the chip says **Not ready**, the header still gives a next step, and the tabs show "Forms 4 to do" and "Documents 1 to do".
- Cause: `combination.tsx:102` maps `row.status` and ignores `row.retired`. `combination.tsx:166` sets `live = row.status === "READY"`, which is still true for a retired combination, so "a non-live one never does" fails here too. Screenshot: `retired-0.png`.

**M2 (Major): after Approve and release on the Review tab, the header keeps the old state and count.**
- Steps: Super visa (above) is submitted and signed. As user-B, open `/c/<id>/review` and click **Approve and release**. Do not reload.
- Expected: the header, the bar and the tab update together.
- Actual, 2.5 s and 18 s later:
  - The chip still says **In progress**.
  - The facts read "**Released · 23 draft changes**", which contradicts itself.
  - The header next step is unchanged.
  - The tab says "compared with released version 1 (**0**)" and "0 draft changes".
  - The bar changed only on its 15 s poll.
- Cause: `review.tsx:32` invalidates neither `["combination-summary", id]` nor `["draft"]`, and `lib/api.ts:29` sets `refetchOnWindowFocus: false`. The tab's list now depends on that stale summary count (`review.tsx:45`).

**M3 (Major): when the draft holds only a library change, the bar counts it and nothing else does.**
- Steps: approve the retirement of a combination (as in M1), and release nothing else.
- Actual:
  - The bar reads "**Draft · 1 change across 0 combinations**" with "Review and release (1)".
  - The retiring combination's header says "draft matches the release", and its Review tab says "0 draft changes" and "The draft is identical to the released version".
  - No combination page mentions the pending retirement.
- With one combination also changed, the bar says "Draft · 3 changes across 1 combination" while that combination's header and Review tab say 2. The Release page says "3 draft changes across 1 combination and 1 library change".
- Cause: `App.tsx:145` adds `library.length` to the total but not to "across N".

**m1 (Minor): Structure still says "setup draft" for the In progress state.**
- On the six and the demo, at 1440, 1024 and 400 px, the Structure page shows: "Can't delete: its setup draft uses it.", "Can't delete: "Visitor visa" under it has a setup draft.", "… have setup drafts: release or discard them first".
- The Where-used API returns "Combination with a setup draft: it can't be deleted".
- Sources: `contracts/lifecycle.ts:25,26,41` and `api/src/lifecycle.ts:172`.
- The claim names "Setup draft" as a retired word. Only Used by was changed.

**m2 (Minor): the Review tab lists library items again while the summary is loading or has failed.**
- Steps: Visitor visa (demo, nothing configured). Delay `/summary` by 4 s, or make it return 500.
- Actual:
  - With the delay, the tab shows "**22** draft changes" and lists 22 Calculated items for 4 s, then 0.
  - With the 500, it shows 22 for good, beside "No unreleased changes".
- Cause: `review.tsx:45` falls back to `v.draft.changes` whenever `changesCount` is not exactly 0.

**m3 (Minor): after removing a document on the Documents tab, the header keeps the old count.**
- Steps: six, Visitor visa (9 changes). In the row menu, choose **Remove from checklist**, then open the Review tab.
- Actual: the bar says 7 and the Review tab says 7 (list and step card), but the header still says "**9 draft changes**". The server summary says 7.
- Cause: `pages/workspace/documents.tsx:61` `refresh` does not invalidate `combination-summary`. Adding a document through the dialog did refresh correctly.

**m4 (Minor): a retired combination is reported as still in use on Structure.**
- After Super visa is retired and released, its own row says **Retired**. The parent's Retire reason says ""Super visa" under it is still in use: retire it first" (`/structure/nodes/individual.visitors/uses` `can.retire`), while its uses list says "Combination, retired".
- The node's `retired_at` stays null, and only the combination's is set.

**m5 (Minor, wording): adding one form to a never-set-up combination counts 23 draft changes.**
- On Super visa (demo), adding one form jumps the header, the bar and the Review tab from 0 to 23. 22 of them are the shared Calculated definitions.
- The counts agree, but the finding's "22 changes nobody made" now shows up on the first edit instead.

## What held
- No "In setup" on any screen I read (Programs cards and list, Structure, the combination header and all tabs, Release, Releases, AI work, To review, Activity) at 1440, 1024 or 400 px, on the six and the demo. "Setup draft" no longer appears in Used by ("Nothing yet: not released" logic, `structure.tsx:59`).
- The Programs chips are Not started · In progress · Live (plus Retired), with matching tips. The Structure filters use the same words. The header chip matches the card for In progress and plain Live.
- LMIA (Live) on the demo: the header says "Next step for the next release", the strip says "Live · setup steps for the next release: 3 of 5 done", and neither text appears on any In progress combination. This holds at 400 and 1024 px with no sideways scroll.
- Real draft changes on one combination (LMIA, one form removed): the bar, the header, the Review list and the step card all show 2, including while a submission waits. With 2 combinations the bar shows the shared total ("across 2"), as its own text says.
- A never-set-up combination: the Review tab shows 0, "Nothing configured yet" and Submit disabled. `POST …/submit` is refused by the server ("Nothing to release yet"), so the UI-only filter cannot be bypassed.
- The six: Visitor visa shows 7 in the bar, the header and the Review tab. Study permit shows no count, the same in all three. No page errors on any walk.
- Structure at 400 px scrolls sideways by 73 px (UX finding 9, already with the founder), which is not part 3's.

## Verdict
**Not approved.**
- B1: one combination is both Live and Not ready, on Programs and the strip against the header and Structure, after a normal release. That is the exact contradiction finding 7 is about.
- M1: a retired combination's header says Live and offers a next step "for the next release".
- M2 and M3: the bar, the header and the Review tab still disagree after a release from the Review tab, and when the draft holds only a library change.
- m1–m5 can follow.
