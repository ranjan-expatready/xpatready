# Review: G3 Demo release path and mark (C5.6, P-240), PR #471 on 56268d55

Reviewer: fresh context, did not build it. Read: P-240 (DECISIONS.md), BACKLOG row G3, LeadX's answer on #469 (07:26 UTC), the diff `origin/main...56268d55`, EXPERIENCE.md, QUALITY.md. There is no concept.md for G3. The acceptance is the BACKLOG row as narrowed by LeadX: "Sample content (`sourceBasis ILLUSTRATIVE` **or a value marked Sample**) makes a Demo release, marked on Review and release, Releases and the combination header, and left out of the real-publish counts. Refused elsewhere waits for a second workspace."
Ran: an isolated copy on :4446 (own worktree at 56268d55, `vite build`, own DB `xr_studio_rev_g3`). The builder's check passed 10/10. I did a Playwright walk at 1440, 1024, 720 (about 200 % zoom) and 400 px, with axe and keyboard, and a break-it pass through the API. Journey report: `journey-test-reviewer-2026-11-02.md`.

## Verdict: Ship after fixes. Journey score 7/10

**Verdict: Block** on 56268d55. One Major is open (M1).

## Issues

**M1, Major (Must): "a value marked Sample" is not covered, so a release that holds Sample content is counted as a real publish.**
`api/src/studio.ts:1021` and `api/src/programs.ts:363` derive `demo` only from the live `combination.sourceBasis`. LeadX's answer on #469 defines Sample content as "`sourceBasis ILLUSTRATIVE` or a value marked Sample". The PR body drops the second half without saying so.
The product's own screen produces such a value. A section check saved with no source quote is stored `illustrative: true` ("labelled Sample", `studio.ts:751`).
Reproduced on :4446:
1. Add a check with no quote to "With an LMIA" (SOURCE_BACKED). The API answered `"illustrative":true`.
2. Submit, sign as user-C, then release as user-B (pack 2).
3. `GET /releases` returns v2 with `demo: false`. The snapshot holds 1 illustrative check (`snapshot->'checks'`). Releases reads "2 real releases · 0 demo releases" (screenshot 01).

This is exactly the miscount that P-240 forbids ("never counted as a real publish").
Fix: derive from the frozen release, not the live row. In `releases()`, use `demo = snap.combination.source_basis === "ILLUSTRATIVE" || snap.checks.some(c => c.illustrative)`, plus any other Sample flag the snapshot carries that is in scope. In `draft()`, do the same over the draft's illustrative checks. Add a pass and a fail browser step that make the Sample check through the product.

**m1, Minor (Should): derived from the live row, not the snapshot.** The snapshot already stores `combination.source_basis` (`engine/snapshot.ts:179`). Today `sourceBasis` is set only at create (`studio.ts:207`, `structure.ts:184`), so past releases cannot be rewritten through the product. The check's SQL flip does rewrite them, though: it relabels both v1 and v2. The M1 fix (read the snapshot) also fixes this.

**m2, Minor (Should): some screens that show the release have no mark.**
- The Review and release tab's own "Released versions" table (`review.tsx:97`; screenshot 07, bottom). LeadX named this screen.
- Overview, "Released versions: Release N" (`pages/workspace/overview.tsx:43`).
- The case header's frozen-release pill and the Open a case dialog's "· release N" (`runtime/cases.tsx:155`, `:124`).

BACKLOG G3 says "every screen that shows the release". The review tab table is the one to fix now. The others are for LeadX to place.

**m3, Minor (Should): the tip is title-only and names a decision number.** The pills at `history.tsx:21`, `combination.tsx:99`, `release.tsx:50` and `review.tsx:93` use a `title` attribute. The keyboard never reaches it: 60 Tabs on Releases never landed in `[data-demo-release]`. Its text ends "(P-240)", and EXPERIENCE.md:46 bans decision numbers on the main path. Fix: use the existing focusable `Tip` (`components/status.tsx:15`) and drop "(P-240)". The Releases counts line does say the meaning in visible text.

**m4, Minor (Should): the review tab mark is misaligned.** It sits above the button baseline, between "Submit for review" and "Approve and release" (screenshot 07).

**m5, Minor (Should): test quality.** `check_g3_demo_release_browser.cjs` has a real pass and a real fail; hard-coding `demo` either way fails it. But:
- It makes a Demo release by an SQL flip of a field the product never changes, on the imported release. The product path exists: a combination created on a Sample node inherits ILLUSTRATIVE (`studio.ts:207`), as `check_screen01_browser.cjs:86-92` releases one.
- No step covers the `/release` rows or the review tab mark (the PR says so).
- Nothing covers the M1 case.

**Not findings, for the Lead:**
- The only real release in the demo is the imported "With an LMIA" release. Its basis note starts "Sample:" and its release basis says "not specialist-confirmed". Whether that is a real publish under P-240 is G2's gate (signed answer-key test), not G3's.
- "Live" on Immigration programs and "Firms use Release N" in the draft bar are not publish counts. They state whether firms can use the release, and in the demo workspace firms can. Leave them unless LeadX says otherwise.

## Code check
- **Correctness:** right for combinations. Every person-created combination in the demo inherits ILLUSTRATIVE, so new releases are Demo releases. Values are not covered (M1).
- **No migration, no schema change.** `releases()` adds no query (`include: { combination: true }` already). `draft()` adds one batched query, not one per row.
- **Server authorisation:** unchanged and read-only.
- **Concurrency and duplicates:** not affected.
- **Graph (P-86):** C5.6 is named by the new test. No new untested route.

## D1–D20 (1–5)
D1 3 (M1: half the agreed definition) · D2 3 (a miscount is possible, M1) · D3 5 (one `demo` field reused across four screens) · D4 n/a · D5 5 (derived on read; reload is consistent) · D6 4 (the release basis text is kept) · D7 n/a (no AI) · D8 5 (mark beside the name) · D9 5 (a passive mark, no action needed) · D10 4 ("(P-240)" in the tip, m3) · D11 4 (counts line plus mark; some screens unmarked, m2) · D12 4 (team Pill, warn tone; review tab alignment, m4) · D13 4 (axe clean on 4 pages, no sideways scroll at 400/720/1024; the tip is not keyboard-reachable, m3) · D14 5 (team components) · D15 5 (Releases 479 ms) · D16 3 (pass and fail exist; SQL flip; two screens and the M1 case untested, m5) · D17 simulated only · D18 3 (Sample checks not traced to the mark) · D19 4 (release → case still works; the case page has no mark) · D20 simulated only.

## Could not check
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- "Refused elsewhere": there is no second workspace, by LeadX's ruling.
- I did not re-run the builder's regression suites (screen01 116, slice2, qa_1029 63). I accepted them as reported.

## Round 3: a3decbdf (any-ratchet fix only)

Scope: `git diff 815284a8 a3decbdf` only. Round 2 approved 815284a8 with journey score 8.5/10. The round 2 text is not in this file; this section follows round 1. Three files, +8/−6. No route, schema, copy or layout change.

- **`engine/validate.ts`:** `isDemoSnapshot(raw: unknown)` narrows to an object, then reads `checks` only when it is an array. I ran 11 direct cases: null, undefined, string, number, `[]`, `{}`, ILLUSTRATIVE, SOURCE_BACKED with `null` and non-Sample checks, a Sample check after a `null`, and `checks` as an object. All give the same result as the 815284a8 version. One case differs: `checks` that is a non-array object used to throw (`.some` is not a function) and now returns false. That is safer, and no real snapshot has that shape.
- **`api/src/studio.ts`:** two `r.snapshot as any` casts are removed. The Prisma `JsonValue` goes straight into `unknown`, so the types stay sound and runtime is unchanged.
- **`web/src/pages/review.tsx`:** `(y: any)` becomes `(y: { id: string; demo?: boolean })`. This affects types only. The outer `d: any` and `x: any` were already there before this commit and stay.
- **Re-run:** `count-any --against origin/main` gives 427 (the base is 427). `tsc --noEmit` on the api and web projects shows no error in the touched files. `check_g3_demo_release_browser.cjs` passed 11/11 on a fresh isolated copy (`screens_g3r3`, :4447, live AI off), then I stopped the copy.
- **Journey:** no user-visible change, so round 2's journey score of 8.5/10 stands. I did not re-walk it.

No Blocker, Major or new Minor.

**Verdict: APPROVE** on a3decbdf.
