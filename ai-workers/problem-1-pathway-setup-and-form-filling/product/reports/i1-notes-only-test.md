# I1 notes-only test (3 Nov)

A throwaway notes-only change (one `.md` under `product/reports/`), opened against the I1 branch so it runs I1's `ci.yml`
before I1 merges. Expected: job `kind` says **notes**, no `shard` part runs, and job `ci` runs only the push guard,
`check-docs.sh` and `decision-impact.sh`. Not to be merged: the tech lead closes it once I1 is judged.
