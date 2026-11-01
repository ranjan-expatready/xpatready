# F2 C2.12 slice 4: To review reads ?form= and ?c=, the return strip, Back to the steps · independent reviewer · 1 Nov 2026

Commit reviewed: **`95014fdf`** on `claude/optimistic-heisenberg-ra6v2n` (`git diff origin/main...95014fdf`: review-queue API and contract, `to-review.tsx`, new `return-strip.tsx`, `App.tsx`, `setup-rail.tsx`, `forms.tsx`, one new suite, one updated suite). I did not build it. While I reviewed, the builder added `cc96c35a` (one line in `qa/CAPABILITIES.md`). It is not part of this review.
- Copy: forms_rev on :4456, `xr_studio_forms_rev`. I rebuilt the web bundle from the commit (`index-VAa67AIN.js`). The copy is now stopped, its database dropped and its working files removed. I never used :4400, set no *_LIVE variable and made no AI calls (US$0, replay only).
- Scope: concept §4 "Return strip", challenge m1/m2, K1. The online slices (D7, asked-differently, X4) are parked by P-102 and are not reviewed here.

## Verdict: **Approve** (0 Blocker, 0 Major). Ship, with the Minors below as follow-ups
The gap qa named ("To review's screen still ignores ?form=") is closed. To review lists what the path counts for this form on this combination. The strip shows on every page a rail link opens, and Back to the steps lands focus on the current step. All of this holds in the running app, by keyboard, under axe, and at 390/1024/1440 px.

## Reruns
- `check_forms_c212_to_review_browser.cjs 4456`: **25/25**, no page errors.
- `check_forms_c212_rail_browser.cjs 4456` (fresh copy): **31/31**, no page errors.
- `graph.mjs`: G1/G2/G4–G6 at 0. G3 lists 2 routes this change does not touch (`POST /combinations/:id/attachments`, `GET /attachments/:id/file`).
- Each rule is guarded by a test that fails without it:
  - Without the combination filter (`review-queue.ts:35`), "K1 fail" fails (the Visitor visa's job would appear).
  - Without `withReturn`, the rail suite's "BR-1 … with the way back" check and "every link carries ?form=&c=" fail.
  - Without the `.refine`, "a combination without a form is refused" fails.
- My tree note: both suites rewrite tracked screenshots. I restored `screenshots/c212/*` to their state before my runs. The tree also has many other screenshots and `evidence/screen01/*.json` modified. Those come from the builder's runs, so I did not touch them.

## Concept fit (§4 Return strip, m1, m2, K1)
| Item | Result | Evidence |
|---|---|---|
| m2: To review filtered by form | Met | `/review?f=all&form=IMM 5257&c=<Super visa>` shows the same rows as the API. The held file (no form) and the Visitor visa's job are not listed. Counts on the view buttons are this form's. The filter line reads "Only IMM 5257 on this combination, and the shared library's items for it." |
| K1: keyed by form and combination | Met | `review-queue.ts:35` applies the same rule as `engine/form-progress.ts:54` (this combination's items plus library-wide ones). `?combination=` without `form` gives a 400 in words. An unknown combination gives 200 with library-wide items only, all from the actor's workspace, so nothing leaks. |
| Strip in the shell, reads ?form=&c= | Met | One component in `App.tsx`. Hidden for case people and while `?setup=` is open. The 6-step count follows P-102 (step 7 parked). The words differ from the concept's ("Setting up … on …" rather than "Adding … to …"), which I accept. |
| Back returns focus to that step (m1) | Met | Keyboard walk: Forms row chip, Enter, 4 Tabs to the step link, Enter, job page with strip, Back to the steps, Enter. Focus lands on `[data-step="review"]`. Browser Back and Forward work. Escape drops `back=1` and returns focus to the chip. |
| Every rail link keeps the way back | Met | Every rail href carries `form=IMM 5257&c=<id>`. The `/review/proposals?group=…` links are unaffected: with a `group` present, `proposals.tsx:31` ignores `c`. |
| Empty and error states | Met with m3 | "Nothing for IMM 5257 in Waiting for others · 1 other item of this form is under All." A form number over 40 characters is refused with "Show every form" and no "Try again". |

## Your probes, answered
- **Appending `c=` to `/review/proposals`.** With `group=`, it changes nothing. Without `group=`, `c` is read as the PR #108 combination selector, so the server picks that combination's group. The page then rewrites the address to `{group}` only (`proposals.tsx:35`), which drops `form` and `c`, so the strip goes. Choosing another group (`:70`) also drops them. The rail never links to the page without `group`, so this is only m4.
- **Item pages that move on by themselves.** The job page's Apply / Preview the draft goes to `/c/:id/preview` (`job.tsx:90,99`) and drops the way back. So does every row link on To review opened from "Everything for IMM 5257" (`to-review.tsx:121` uses `i.next.href` as it is). See m1 and m2.
- **Keyboard and focus.** Fine, apart from m5.
- **axe.** Clean on the job page with the strip, To review with the strip, and the rail after Back (WCAG 2.2 AA, 1440/1024/390).
- **390 px.** To review with the filter line and the strip: no sideways scroll. The job page scrolls sideways at 390 px (scrollWidth 732) **with and without** `?form=&c=`. That comes from its own buttons, is already on main and is outside this change.
- **Speed.** `GET /review-queue?form=&combination=` takes 15–41 ms.

## Issues (none Must for this PR; all Should)
- **m1 (Should): To review rows drop the way back.** Repro: rail → "Everything for IMM 5257 on To review" → "Review 84 AI proposals". The job page has no strip. `to-review.tsx:121` links `i.next.href` without `form`/`c`. Fix: when `form` and `c` are both in the address, pass the href through `withReturn` (the "Everything…" link promises the way back). Recovery today is one browser Back.
- **m2 (Should): finishing the step loses the strip.** Repro: open the job page from the rail and press Apply to draft (or Preview the draft). It navigates to `/c/:id/preview` with no `form`/`c` (`job.tsx:90,99`). This is the moment the person most needs "Back to the steps". Fix: carry `location.search`'s `form`/`c` into that `nav()`.
- **m3 (Should): the 400 notice names the wrong field.** Repro: `/review?form=IMM 5257&c=<65 characters>`. The title is "This form number is not one the studio reads", but the body says "A combination reference has at most 64 characters." (`to-review.tsx` 400 branch). Fix: choose the title from `errors[0].field`, or say "This address is not one the studio reads".
- **m4 (Should): the strip's count does not say what it counts** (EXPERIENCE §2 item 7 [M], "counts say what they count"). The strip reads "Step 3 of 6 · Review · Your step · **1 open**" while the rail says "Review 84 AI proposals". The count is open queue items (`chipOf` → `s.count`). Fix: "1 item open", or the step's own words. Also m4b: `/review/proposals` without `group` drops `form`/`c` (above).
- **m5 (Should, WCAG 2.4.3): focus is lost after "Show every form".** Pressing Enter on it removes the line that holds the button, and focus falls to `<body>`. Fix: move focus to the page heading or the first view button.
- **m6 (Should): a crafted `c` blanks the app.** Repro: `/library/forms?form=IMM%205257&c=..%2F..%2Freview-queue%3Fx%3D1%23`. The page renders nothing (body text length 0) and throws "Cannot read properties of undefined (reading 'label')". `return-strip.tsx:16-17` and `setup-rail.tsx` `progressPath` put `c` into the API path unencoded, so `../..` resolves to `/api/review-queue`, which answers 200. Then `combo.data?.combination.label` throws. It is read-only, the person's own session and only a hand-made address, but it is a white screen. Fix: `encodeURIComponent(c)` in both paths (and in `backToSteps`), and `combination?.label`.
- **m7 (Should, cosmetic):** `?form=imm5257` filters correctly (the API normalises it), but the filter line echoes "Only imm5257", while the strip says "IMM 5257". Fix: show the normalised code.

## D1–D20 (this slice's surface; one line each)
- D1 job fit 5: the path to To review and back is one click each way.
- D2 concept fit 4: m1/m2 lose the strip one hop out.
- D3 one source 5: `review-queue.ts:35` uses the same rule as `form-progress.ts:54`, and a test checks the review step's count against To review.
- D4 words 4: m3, m4, m7.
- D5 states 5: filtered, every combination, empty-for-form, 400, unknown combination.
- D6 feedback 5.
- D7 errors 4: m3, m6.
- D8 keyboard 4: m5.
- D9 a11y (axe) 5.
- D10 sizes 5: To review at 390/1024 and at 200 % (720 px), no sideways scroll.
- D11 speed 5.
- D12 look 5: the team's tokens and Notice/EmptyState.
- D13 data correctness 5: K1 matches the path.
- D14 authorisation 5: actor-scoped queue, no new writes.
- D15 no per-row requests 5: one queue call, and the strip makes two GETs.
- D16 tests 5: pass and fail per rule; the guarding tests fail without their rules.
- D17 simulated only.
- D18 reuse 5: `withReturn`/`backToSteps` shared by the rail and the strip.
- D19 scope 5: nothing beyond m1/m2/K1.
- D20 simulated only.

**Journey score: 8.5/10 (pass, no 0)**: `journey-test-reviewer-2026-11-01-c212-95014fdf.md`.

**I could not check:** a real screen reader, an intended user walking it unaided (D17/D20 stay with the founder), or 200 % zoom on the browser itself (I emulated it with a 720 px viewport).

**Verdict: Approve**
