# STATE lines moved word for word (Lead 22, series 2, 12 Nov 08:4x IST, to keep STATE under 12 KB)

5. **Lessons tonight:** a re-run of a PR check takes today's main (ci.yml, D6), so after a CI fix merges, re-run the failed parts; do not merge main. qa records PRs conflict on `qa/BUGS.md` after every qa merge: their lanes re-merge, then the Lead posts a records Approve and relabels. A stacked chain is dequeued together. Lanes often stop at their guard before labelling, so for every green, unlabelled PR, look for an Approve line on its head and label it.
