# UX-A part 3, review r8 (diff-only, 0f9a2201 to 713b5c10, PR #622)

- c261814a, part-problems.tsx: the draft-error branch now renders `<div className="mt-2" data-startable><StartableNotice/></div>` under the draft's Notice. The notice sits inside the one wrapper that carries `data-focus`, and the new div has none, so there is no duplicate focus target. `mt-2` separates it from the Notice above. Nothing renders when `startable` is empty (the conditional, and StartableNotice also returns null on empty). The two earlier branches are unchanged. The cause now shows beside the draft errors, as FormsProblems does.
- startable-notice.tsx: the title is "Firms cannot open cases on the released version: 1 thing / N things to fix". The grammar is right, it fits the notice and agrees with the body line ("Fix it / them in this draft"), and it closes r7 Minor 1.
- 713b5c10, check_uxa3_status_words_browser.cjs: the wait now resolves to a boolean and a step records it, so a landing that fails to render fails the check instead of being swallowed. The `.catch` on the later `innerText` read is harmless because the step above guards it.
- `npx tsc -p . --noEmit`: no errors outside tests. I did not run the browser checks (the builder reports exit 0).

No Blocker, Major or Minor findings. The r7 journey score is unchanged (no flow change).

**Verdict: Approve** (for head 713b5c10)
