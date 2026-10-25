# Inbox — findings for the Lead, picked up without the founder relaying them

Any outside checker (Devin, the scout, a team member) drops findings here; the Lead drains the inbox at the start of every `/lead` chat and every scheduled Lead run (`bash tools/lane.sh inbox`).

## How to drop (never on `main`, P-87)
1. Push a branch `devin/<date>-<topic>` (Devin) from the newest `main` with **one new file** `ai-workers/problem-1-pathway-setup-and-form-filling/product/inbox/<date>-<source>-<topic>.md` (not a folder at the repository root). Nothing else in that commit unless it is a small fix the founder allowed (below).
2. The file: one line saying who checked what and on which `main` commit, then one row per finding: `id · type (Bug, Gap, UX, Ambiguity) · severity (Blocker, Critical, Major, Minor) · steps · expected · actual · evidence (screenshot path, API call or failing test) · suggested lane`. Plain words; no personal names; immigration values only as Sample.
3. Check `qa/BUGS.md` and `scout/FINDINGS.md` first: a finding already listed gets your evidence in your file, not a new id.

## What the Lead does with it
Each finding goes to a lane's Lead note (and, through the qa lane's note, a `qa/BUGS.md` row with its `D-n` id at qa's next run), to BACKLOG or the founder, or gets a line saying why not. Then the Lead **merges the checker's branch into its own Lead branch** (always, even when nothing is accepted) and moves the file to `history/devin/` in the same PR. When that PR merges, the branch's tip is in `main`, so `lane.sh inbox` no longer lists it: an empty listing means everything was handled. A Blocker stops that lane's next merge, as a qa Blocker does (P-92 applies to every outside checker).

## Small fixes by an outside checker
Only when the founder has allowed it for that checker. The rules are the scout's (skill `scout` section 4): at most 40 changed app lines, never a file an open lane branch changes (`bash tools/scout.sh busy <file>` prints `free`), never `prisma/`, `contracts/`, rules or docs outside the inbox, a test that fails before and passes after. A separate branch `devin/fix-<id>` per fix; the Lead reviews and merges it by PR like any lane.
