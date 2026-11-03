# UX-A part 4, re-review r6 (diff 65ae1e81..def11289)

Verdict: Approve

- Fix correct. "Saved run file" now shows `runFile` (the select's value; state set to saved[0].file by the effect), null unless mode is replay and a file is chosen. New "Saved run" row shows the run id, same replay-only guard. AdminDetails hides null/empty rows, so nothing new appears outside the closed Details on the main path.
- New check step is a real fail case: it requires a non-empty select value and Details text containing `Saved run file<file>`. The old build labelled the run id there, so it failed. Not brittle: dt/dd textContent concatenates without separators, which is stable; the row order and the Saved run row are not asserted.
- Minor (non-blocking): if a saved file has no run_id the "Saved run" row is just hidden, which is right. Browser suite not re-run; builder reports 47/47.
