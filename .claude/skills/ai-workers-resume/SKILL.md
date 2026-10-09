---
name: ai-workers-resume
description: Resume the Expat Ready AI Workers workstream in a new session without losing context. Use when the user says resume, continue, carry on, or mentions AI Workers, Doers-with-AI, VisaFlo, AI pricing or the investor story.
---

# Resume AI Workers

1. Read `ai-workers/README.md`, then `ai-workers/NEXT.md`. Do not read chat history or `archive/` to reconstruct state; these two files are the state.
2. Freshness check:
   - Run `zsh ai-workers/tools/freshness.sh` (it is a zsh script).
   - Search Drive (Google Drive search tool) for `modifiedTime > '<newest snapshot date>T00:00:00Z'`, excluding folders.
   - If either is newer, tell Ranjan in one line and make the `source-keeper` agent's new snapshot the first task. Never cite a stale snapshot for a fact a newer version may have changed.
3. Tell Ranjan in three lines: where we are, what waits for him (the AIW-D decisions), and the proposed next step.
4. Work only under an approved wave brief (`ai-workers/wave-brief-W*.md`). Launch agents from `.claude/agents/` in parallel; each writes only to its own folder.
5. Before showing Ranjan anything: run `adversarial-reviewer`, then fix or record the findings.
6. End of session: replace `ai-workers/NEXT.md` (state, decisions waiting, next), and keep the one-line pointer in `product/NEXT.md` current.
