# C11.8 — challenge: a Live start when every part already has a saved answer (for the tech lead)

**Found by:** the Opus reviewer of #872 (Major 2), confirmed by the builder. 4 Nov, main 9caa043b, own copies, live AI off, stand-in launcher, US$0.

## What happens today
On a form drafted in parts (IMM 5645: four parts, each with a saved paid answer from #746), Forms › IMM 5645 › Draft with AI › **Live** (`POST /attachments/:id/draft {mode:"live"}`):
* is **accepted** (201), even while live AI is off. In `Ai.plan`, the LIVE target is `draft` with `worst_usd` 0, so `callsModel` is false and the live-off door (`ai.ts:321`) does not refuse it;
* runs each part's stub pass, then takes each part's saved answer (`runParts`: `p.saved_run`, US$0). **No model is called and nothing is spent**;
* is then labelled **"Live AI draft in 4 parts …"**, and its run page is badged **Live**, at US$0.00, with no "no model was called" line. A Saved run of the same parts says "Saved AI answers of its 4 parts (no model call, US$0)".

## Why it matters
P-227 says Live is a real model call and Saved is labelled wherever it is shown. A person reading "Live AI draft" believes a fresh model answer was made, but this one is the saved answer. Nothing is wrongly spent, so this is a trust and labelling issue, not a money one.

P-194 (one Continue covers retries of the same run) is about retries paying only for what failed. It explains why a part with a saved answer costs nothing, but not why the run is called Live.

## Options
1. **Relabel (recommended).** When every part of a Live start was served from a saved answer, the run's message and badge say so: "Started as Live: every part had a saved answer, so no model was called (US$0)", badged Saved. When only some parts were saved, it reads "n of m parts from saved answers, k by the AI". This keeps P-194's "pay only what failed" unchanged. Size: S, in `sources.ts` (`runParts` / the compare message) and the run page badge; a money-adjacent label, so a breaker.
2. **Turn it into Saved at the plan.** A LIVE plan whose parts all have saved answers returns the same `reuse_saved_output` + `a4` target as REPLAY. The Live start is then a Saved run, labelled as one. This is simpler to read, but a person who chose Live gets Saved without being asked.
3. **Refuse Live** when every part is saved, pointing to Saved. This is strict, but it blocks nothing useful, and it changes a door that `check_forms_c118_acceptance.ts` and `check_cost_override.ts` cover.

## Not changed in #872
#872 changes only the dialog's Start for forms being mapped in another combination (review Major 1), plus the pack. Its pack does not claim that a Live start of IMM 5645 is refused. It proves that the refusal happens only when a part would call the model (part 2 hidden).
