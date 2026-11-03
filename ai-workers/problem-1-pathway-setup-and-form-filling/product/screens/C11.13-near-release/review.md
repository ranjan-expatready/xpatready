# C11.13-R review (forms lane), commit 5cc243cd (studio unchanged at 65af5701), reviewer: not the builder

Verdict: **Approve** (no Blocker or Major; 2 Minor).

Run (ports 4801-4803, live AI off, US$0): acceptance/C11.13.test.ts 15/15 (pack untouched); tests/check_c1113_near_release.ts 19/19; browser check 19/19 (approver, 1440 + 400, axe clean, no page error). Screenshot release-near-1440.png read: two tables, "Will be released" vs "Waiting for a second person", near line under the row.

## Checked
- Release correctness: draft() counts only `will_release` (programs.ts changes = combos + releasing); release() passes only `releasing` ids; publishLibraryChanges also re-selects status APPROVED in the transaction, so a waiting change cannot be released even by a race. expectedChanges handshake: the page sends x.changes (approved only); a change approved between load and click moves the count, so 409 "draft changed". Held by the check "releasing now does not release a waiting change (stays WAITING)".
- Other readers of /draft: App.tsx bar uses summary=1 (APPROVED only, no near query): unchanged. release.tsx handles missing will_release (`!== false`). No other code reads `draft().library` (release() only). Release response `library` is from releaseRows, unchanged.
- Cost: summary adds 0 queries; full /draft adds 1 query (waiting+approved library changes, replaces the old one), plus 1 proposalItem query only if any change has a proposalItemId, plus 1 canonicalField query only if some item is near. Batch views: same two, once per list (no per-row). Acceptable.
- Honesty: `given` is false only for the rule's three words (NEAR_WHY, single source with nearWhy); shown as "Found close by the rules (...); no one said why: ask before approving, or return it", never as "Why it is not the same". The near data is read from the proposal identity, not parsed from reason text. P-251/P-252 "did you mean" is not built.
- Tests honest: the API check asserts waiting not counted, draft bar excludes waiting, release 409 with only waiting, given=false for a rule-found match, null near for a plain item; the acceptance line 76 fails on main (the waiting change was not in library at all).

## Issues
- Minor: api/src/field-drafts-items path, `api/src/field-draft-items.ts:115` sets nearReason to the AI's own `i.reason`. nearOf then reports `given: true`, so near-line.tsx:18 shows AI text as "Why it is not the same:" with no AI mark. Failing scenario: Demo-load AI field draft near "Family name", accepted; the approver sees an AI sentence presented as a person's one-line reason (P-120 asks for a person's reason; standards ask AI to be marked). Fix: carry origin in NearView (identity/ProposalItem.origin is "ai") and say "The AI's reason:" or treat as not given.
- Minor: web/src/components/near-line.tsx:11 `ownReason` uses endsWith(near.reason); withNearReason (proposals.ts:266) truncates the string to 1000 chars, so a very long own reason plus near reason no longer ends with it and the near text shows twice. Rare; fix by not relying on text (the API could return the decider's own reason).
- Note, not a finding: the waiting section text "A combination that uses one is held back until then" relies on existing unapprovedAdds behaviour, not changed here.

## Journey test (reviewer role, scoped to this diff): 8/10 (pass)
Scripted browser walk as Approver (not a headed human walk): task 1, next step 1 (To review link, clear waiting/will release), plain words 1, feedback 1, correct data 1 (API + UI agree), error recovery 0.5 (unexplained rule-only match says what to do; stale count 409 not walked in UI), a11y/sizes 1 (axe, 400/1440), speed 0.5 (not timed against budgets), visual 0.5 (near line is small text beside mono key; fine), trust 0.5 (Minor 1 above). No journey file written separately; this paragraph is the report.

Could not check: a real person's unaided walk (D17/D20), screen reader, 1024 px / 200% zoom, keyboard-only path.

## Round 2 (f715ce06)
Verdict: **Approve**. m1 fixed: nearOf returns `by` from ProposalItem.origin; near-line.tsx says "in the AI's words (no person has said it yet)" for by=ai; new check sets origin=ai and expects given=true, by=ai. m2 fixed: ownReason splits at the start of the appended "Close to" (startsWith or lastIndexOf(" Close to ")), so a 1000-char cut no longer duplicates. Reran at this head: API check and browser check (1440 + 400) results below in the hand-back; no new findings. Residual, not a finding: if a person's own reason itself contains " Close to " the split cuts there (needs a near item too).
