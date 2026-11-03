# UX-A part 4, r7: diff-only re-review (def11289..060f4302)

Scope: one test file, check_uxa4_details_browser.cjs.

- The wait is correct. `det.waitFor({timeout: 20000})` waits for the first `main [data-admin-details]` to be visible. A closed `<details>` shows its summary, so it counts as visible.
- It fails loudly. A timeout sets `detSeen=false`, and both the main-path step and the "Details is there and closed" step require `detSeen`. A missing Details fails both, so a half-drawn page can't pass.
- No assertion is weakened. All the original conditions remain, plus `detSeen`. The main-path text is now read after the wait, which is the fix. `detSeen` was added to the failure detail.
- Nothing else changed. The step order and the later steps are untouched.

Verdict: Approve
