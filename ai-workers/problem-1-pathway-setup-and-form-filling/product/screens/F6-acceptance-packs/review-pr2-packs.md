# Review: acceptance packs C3.10, C5.2, C11.1, C11.17 (commit ccb07720)

Reviewer run on port 4478, a fresh copy before each pack, US$0.

| Pack | Exit | Pass |
|---|---|---|
| C3.10 | 1 | 7/8 |
| C5.2 (after setup_visitor_visa 13/13) | 0 | 32/32 |
| C11.1 (after setup_visitor_visa 13/13) | 0 | 16/16 |
| C11.17 run 1 | 1 | 22/24 |
| C11.17 run 2 (fresh copy) | 1 | 23/24 |

The pack work is faithful to the rows and the diff touches no app code. The red results are reported honestly. No Blocker. Two Majors are pack defects to fix before the packs gate anything.

## Major

1. **C3.10 part 2 red is real but over-reports (acceptance/C3.10.test.ts:19, 60-65).** The 18 hits are genuine user-visible "box" wording against P-63 and PRODUCT.md §4 (the field-drafts and fill-case messages, `web/src/pages/library-forms.tsx:339` "fields and boxes", `engine/masters-ai.ts:157`). Three kinds of hit are not that rule:
   - "drop-down boxes" (`api/src/form-masters.ts:212`) is a control, as are the "number boxes" on the filing portal's own form (`engine/form-steps.ts:92,111`). BAD at line 19 excludes "search/check box" only.
   - Some hits are only guidance for the builder, not words the author reads.
   - The row's evidence says the screens, not source, are the test. The source scan is an extension beyond "every screen and message". It is defensible, but the real count is lower than 18.
   - Fix: add the control senses to the exclusion list and report the true hits, so the red is a defect list nobody can wave away.
2. **C11.17 Pathway-chip check is racy (acceptance/C11.17.test.ts:~122-125).** `waitForURL(/[?&]p=/)` returns before the list re-renders. Run 1 failed with the Retail › Temporary residence lines still showing. Run 2 passed, and my isolated probe also showed 2 correct lines straight away, so the app is right. This is a false positive, and the wait does not guard what the next line reads. Fix: wait until every trail line includes "Permanent residence", or use `expect.poll`, and let that wait time out loudly.

## Minor

3. **C11.17 over-limit check (C11.17.test.ts:~60-68) is real but loosely worded.** The pop-up sends the 250-character name and the server answers 400. The message "Keep the name under 120 characters" shows in the pop-up footer, not under the field. The field itself still reads "New · no exact match". The row says "checks under each field", so this is a real gap against it, but the 120-character limit is not in the row (it comes from a decision or a concept). Cite that source in the comment. It failed in both runs, so it is not flaky.
4. **C11.1 "way back" link (C11.1.test.ts:~44)** matches any link with /back|home|programs|start/, so one nav link satisfies it. It passes for a weak reason. Minor.
5. **C11.1 OFFER regex** is narrow by design and documented. The `p.waitForTimeout(900)` and `(600)` waits in C11.17 are pauses, not conditions, but each is followed by an assertion that can fail.
6. **C5.2 goes beyond the row.** The stale-count 409, the author 403 and the self-sign 403 checks are extras, but they all concern bypass and sign-off, so they are acceptable. The wait-free API flow cannot silently time out.
7. **C3.10 page walk misses closed menus.** Closed dropdown items, such as the "Re-read with AI (fields and boxes)" menu item, are not read by the walk. The source scan is what catches them.

## Passing checks that could pass for the wrong reason

- C3.10 "none blank" uses > 40 characters, and the "form field", "shared field" and "field map" checks only need one page anywhere. This is acceptable for the row.
- `W.settle` throws on timeout, which honours the loud-wait rule. The `waitFor` calls in C11.17 also throw.

## Journey score (packs as human-like tests): 8/10

The packs use the real browser as the real roles, pick or type like a person, read the page, and cross-check the database. Points off for the racy chip check, the pause-based waits and the over-broad source scan.

**Verdict: Block** for commit ccb07720. Fix items 1 and 2 (an exclusion list so the C3.10 red is a true defect list, and a loud wait on the chip filter), then re-review. The remaining reds (the "box" words in the messages, and the over-limit message not under its field) are findings to keep, not packs to hide.

## Re-review 2554e99b (diff ccb07720..HEAD, packs and comments only; no app code)

- **M2 chip race: fixed.** `C11.17.test.ts` now waits with `waitForFunction` (10 s, throws) until every trail line includes "Permanent residence", and the same for Find (fewer lines than before). The wait is on the List content, not the address. Accepted; the builder's three runs of 23/24 are consistent with my own two.
- **m3: fixed.** The 120 limit is cited as `contracts/programs.ts` LABEL_MAX. The check stays red, a real finding (message in the footer, not under the field).
- **m4: fixed.** The way back is now `main` then a link named /^Back to /.
- **M1: withdrawn.** PRODUCT.md §4 defines a form field as a fillable spot on a PDF or an input on a portal screen, so "drop-down boxes" and "boxes are mandatory" about the IRCC PDF's fields are the form-field sense. The header of `C3.10.test.ts` now records this. I name no remaining false-positive line. The 18 hits stand as a defect list; the red C3.10 is a finding on main, not a pack fault.

I did not re-run the packs; the diff is wait, regex and comment changes only.

**Verdict: Approve** for 2554e99b.
