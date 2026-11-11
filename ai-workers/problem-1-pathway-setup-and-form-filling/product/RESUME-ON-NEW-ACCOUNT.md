# Resume on the new account (P-344 (1)): one page, kept by the tech lead

**Tested on a real switch, 5 Nov 19:14 IST; corrected the same evening.** Canary requested and pushed inside 5 minutes; nothing on GitHub lost. The work lives on GitHub (P-82), so an account switch loses at most what a lane has not pushed. Every lane pushes after each step (P-344 (1)).

**First row on the new account (P-459, 11 Nov):** B168, the app starts on any Mac (co-founder copy), in a founder-typed turn. Also owed after the switch (founder, 11 Nov 11:3x IST): the fresh barcode check on a Paper IMM 5257 copy made by today's app (Adobe draws the barcode page; `prototype/p1/decode_barcodes.py`, then `prototype/evidence-lane/E1/tools/barcode_compare.py`); proof so far in `design/demo-pdf-proof-2026-11-11.md`.

**State at the switch (Lead 12 (series 2), 11 Nov 11:4x IST; founder: "Keep the stop" at 96%, P-458):** M2 60/60, M3 29/29 Works. Bake (M3.5) merged so far: BK-2, M3-S5, expert pack #1510, BK-10 #1518 (form rules into data), M3-S2 #1513 (conditional extra filing); #1519 BK-3 PR 1 (one frame) queued, merges by itself. Stopped at 96% with work pushed (read each lane's last PR comment for where it stopped): forms lane B169 (`fs.spouse` IRCC account), runtime lane M3-S3 (waivable line with a reason; holds the schema + case-prepare baton), screens lane BK-3 PR 2 (scope in its PR comment). On the new account, in order: B168 (P-459); finish those three rows (restart each lane by its claude.ai session or a fresh session per row); qa re-score of #1518, #1513, #1519 (G5); qa finding to log: after "Load the finished story", other Paper copies (IMM 5475, IRM 0002 for Child …) read "Out of date"; the fresh barcode check (above); **B170, the team's XFA engine reuse lane (founder ask A16; brief `design/xfa-engine-reuse-brief-2026-11-11.md`), in parallel**. Paid US$0.

**Found on the real switch:**
* **Connectors (P-445 (2), A11, 11 Nov):** on a new account check the Lead's start read with `get_usage` (about 115-120k on 11 Nov). Notion, Google Drive and Claude Docs are off by default; a new account can switch them back on: turn them off again (composer + menu, Connectors).
* **Token rules carry over (P-440):** they live in `RULES.md` "Tokens: hard rules" and the `lead` and `lead-watch` skills, not in any account. The new Lead reads `RULES.md` plus only the newer DECISIONS rows, hands over at about 250k context, and watches the burn per hour at every check (over 3%/h at two checks: find the cause).
* **The new account may not be empty.** It read 87% weekly on arrival, not 0%. Run `get_usage` first and tell the founder before starting lanes: the crew depends on it (P-356).
* The app's session list shows nothing from the old account, running or not. A cloud lane on the old account may still push until its limit: read each stack head again before a label.
* The built-in browser keeps its own sign-in, separate from the app's: it was signed out. The founder's step 1 is needed even when the app is signed in, and a sign-in only counts once claude.ai/code reads as text.
* The Lead's last records branch may not be on `main` (84e9b9197 was not): compare `origin/main..origin/lead/*` before starting a records branch.
* The notes folder is `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/`, outside the repository.
* `find ~` runs past the 2-minute limit; `mdfind -name` finds a note at once.

## Ollama Cloud (P-361): read this first if you run on Ollama. Not yet tested on this project.
**Route chosen by the founder, ~23:58 IST: the desktop app (P-362).** Ollama app → Apps → Connect Claude, restart Claude, then a new session in the Code tab in this folder. Models: Ollama → Settings → Apps. Main and Sonnet `glm-5.3`; Opus `kimi-k3.1-pro`, since reviews ask for `opus`; Haiku `glm-5.3-flash`; Fable `glm-5.3`, our flow doesn't use it. "You can use the same model for more than one option" (Ollama's docs). The founder saw a picture of a mapping in that screen; no public page was found with one (5 Nov): if it differs from these, tell the founder and follow the evidence from the canary. Ollama's docs list subagents, web search, Cowork and auto mode; the Code tab and computer use aren't mentioned, and Remote Control and Anthropic-hosted cloud are off on third-party inference. **While connected, every desktop session uses Ollama, standbys and qa included. Disconnecting, quitting Ollama or `ollama launch claude-desktop --restore` puts Claude back, so a quit Ollama means Claude's plan is being spent without notice: check the route at each check.** A Claude re-check or the Acrobat step, if computer use fails on Ollama: disconnect at a clean pause, run it, reconnect. Add to the test below: 7. `start_session`, `list_sessions` and `get_usage` still work; 8. computer use can open Acrobat (the founder approves it). Terminal route, kept as the fallback:

**Start, in a terminal (the desktop app is untouched and stays on Claude; don't set its third-party inference):**
`ollama signin`, then in this folder: `ANTHROPIC_DEFAULT_OPUS_MODEL=kimi-k3.1-pro:cloud ANTHROPIC_DEFAULT_SONNET_MODEL=glm-5.3-flash:cloud ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-5.3-flash:cloud ollama launch claude --model glm-5.3:cloud`.
The `glm-5.3:cloud` tag is on Ollama's page; the other two `:cloud` tags and whether the launcher passes these variables on are inferred: test 2 proves them. **Fallback, by Ollama's docs, with a key from Ollama's settings, never in a file in this repository or in chat:** `ANTHROPIC_BASE_URL=https://ollama.com ANTHROPIC_AUTH_TOKEN="$OLLAMA_API_KEY" ANTHROPIC_API_KEY="" claude --model glm-5.3`, with the aliases named `kimi-k3.1-pro` and `glm-5.3-flash`.

**Connection test, before any lane; exit codes, not prose. Report each line to the founder:**
1. `/status` shows the Ollama base URL. `bash product/tools/lane.sh whoami` says `lead`; `gh auth status` passes; the session-start hook printed STATE; `/lead` loads.
2. An Agent call with `model: opus` works and says which model answered; `model: sonnet` likewise.
3. AskUserQuestion reaches the founder. CronCreate fires once. A commit on the lead branch pushes past the push guard.
4. WebFetch reads a canada.ca page (hosted WebSearch is not fully supported; immigration facts still need page, quote and date).
5. A Playwright screenshot of :4400 can be read back by the qa model (GLM-5.3 lists no vision).
6. After about ten calls read `ollama.com/settings/usage`: cached input or not? Report tokens per call. If uncached, tell the founder the cost per lane-hour before starting lanes.
Any failure goes to the founder at once with a proposal. If tests 1 to 3 cannot pass, use the fallback in STATE.

**Canary row:** B115 when #1052 lands: a new lane on `glm-5.3`, Kimi review, then a Claude qa re-check in the desktop app. Report the misses and the tokens. Only then more lanes. Prefer rows with clear tests first; keep money, permissions and schema PRs for a Claude review while plan remains.

**What is different on the CLI, the terminal route only:** no `mcp__ccd_*` tools, so no `start_session`, cards, sidebar, standbys, `list_sessions` or `get_usage`; lanes are terminals or background `ollama launch claude --model glm-5.3:cloud --yes -- -p "<brief>"` runs, one worktree each, permission rules decide what runs unattended; never `--dangerously-skip-permissions` here. No Remote Control, no claude.ai cloud lanes, no built-in browser. Computer use (Acrobat): desktop app. Concurrency: 3 on Pro, 10 on Max, over that queued, then refused. Claude Code assumes a 200K window for these model names and compacts there: write rulings to PR comments first. Cross-session messages from the CLI to a desktop lane are unproven: use PR comments, and ask the founder if a lane must be woken.

## Before the switch (the Lead, if there is warning)
1. `get_usage`: note the weekly figure and time.
2. Rewrite `STATE.md`, push; message each Mac lane "push now"; check with `gh pr list` that each row's last push is recent.
3. Run `bash product/tools/factory-board.sh` and paste its output under "Board at the switch" in `STATE.md`.
4. A labelled PR needs nothing: Mergify merges it without any account (Mergify and GitHub Actions do not use the Claude account).

If there is no warning, nothing above is needed to resume: read the board on the new account instead.

## What does not depend on the Claude account
GitHub (code, PRs, labels, comments), Mergify, GitHub Actions, the demo at :4400, the Mac's copies under `.claude/worktrees/`, the side-session notes folder `lead10-saved-2026-11-05/`, `product/` records.

## What does
Every Claude session, Mac and cloud. **Assume none carries over**; a session that does is a bonus. Scheduled checks die with their session.

## The founder, on the new account (about 5 minutes)
1. Sign in to the Claude desktop app with the new account and to claude.ai in the built-in browser.
2. In the Code tab open this folder (`Desktop/Xpatready` in the founder's home folder) and type `/lead`.

## The new Lead, in order
0. **No watcher:** the P-354 trial lapsed and was not restarted (P-370 (5)). Before starting a lane, read its PR's comments and check runs: on 7 Nov, A3's Approve line was already on the PR, so it needed a label, not a lane (P-398).
1. **Connection checklist (P-326 (5)):** no "Connect GitHub" on claude.ai/code; `gh auth status`; Mergify sees the repo; Drive read works; the nightly ran. A cloud canary that cloned and pushed comes before any cloud lane is counted as running (20 of 20 cloud lanes died unseen on 4 Nov because this was missed).
2. Read `RULES.md`, the newer `DECISIONS.md` rows, `STATE.md`, per the `lead` skill.
3. Create the 30-minute check; start two standby Leads in the founder's typed turn (P-286).
4. **Restart lanes from `STATE.md` "In flight" plus the board, one per row, critical path first** (the board lists only rows with a PR; a row with no PR yet is only in STATE). Mac memory is full, so cloud first unless a row needs `sources/` or `code/`.
   Brief for each: "Row <id>, PR #<n>, branch <b>. Continue from its last push. Read the PR's comments, including the Lead's rulings. Standard rules (lead skill, Sessions and tokens). Done when: <the row's Done when>."
5. Check for unpushed Mac work before reusing a copy: `git -C .claude/worktrees/<copy> status -s` and `git -C … log @{u}..`. Commit and push any to its own branch first. Never delete a copy until that is done.
6. qa first if its re-scores are behind: the qa lane is the one writer of `qa/CAPABILITIES.md` and `qa/BUGS.md`.
7. Tell the founder in one line what restarted, what did not, and what was lost; then correct this page.

## What could be lost, and the guard
| Risk | Guard |
|---|---|
| A lane's unpushed step | push after each step; at worst one step |
| A running review or breaker | the row's head is unchanged, so re-run it |
| A Lead's unwritten rulings | rulings go on PR comments first (P-336); records follow |
| Paid run in progress | runs only on the Mac paid runner with the ledger; check `prototype/p2/ledger.ts` totals before any retry |
| Notes under a session's id | keep notes in `lead10-saved-2026-11-05/`, never in a folder named for a session (archiving removed Lead 5's) |
