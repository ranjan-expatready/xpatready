# D3: replay recordings, spend plan (draft; nothing run, US$0 spent)

The plan is in the PR body (#D3 PR). Costs come from the code's own estimators (`p2/ledger.ts costUsd`, `ai.ts estimate`,
`sources.ts draftSplit` with `engine/parts.ts planDraft`, `rounds.ts worstRoundUsd`), model claude-opus-5-5 (US$4 / US$20 per
million input / output tokens), run cap US$5 a run. "Usual" figures are estimates from past live runs of the same kind.
Nothing becomes Saved until the tech lead and qa have checked each result (P-227).
