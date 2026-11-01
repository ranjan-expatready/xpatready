# Built, awaiting qa (P-221)

A builder adds `<capability ID>.md` here in the PR that finishes the capability (one line: the PR and what a person can now do). One file per capability, so parallel PRs never collide on `CAPABILITIES.md`. qa deletes the file in the round that re-scores the row in `CAPABILITIES.md`. `tools/progress.sh` counts a row with a file here as "Built, awaiting qa" until qa scores it Works.
