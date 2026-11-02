# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 18:15 UTC by the tech lead, **handing over at about 245k tokens (P-276)** · milestone: **M2 — Super Admin configuration**, gate 59/60 with held parts named (P-265); tech lead's estimate now **about 4 Nov** if the parallel push holds (P-280), against P-255's 11–12 Nov · M3 per row (P-261) · how we work: `WAY-OF-WORKING.md` (P-224, amended by P-250, P-259, P-267, P-270, P-275, P-277, P-278) · decisions to read word for word: DECISIONS **P-270 … P-282**

## Start here (fresh `/lead` on the Mac)
1. `bash product/tools/lane.sh whoami` → lead; read DECISIONS P-270…P-282 word for word, then this page and the lead skill.
2. **Active rules tonight:** no token stop, report the weekly plan at each check, the founder says when to stop (P-281); the tech lead Gos each paid run M2 needs, cost quoted first, within US$25 a day (P-232) and R-146's US$50 (P-281); qa scores `main` per merge batch, per-PR head only for money, schema, permissions, new screens (P-277); Sonnet for every subagent, a one-day pilot to judge on 3 Nov against qa scores and golden journey 2 (P-278); one row per builder session; GitHub Pro bought (P-282: 40 machines).
3. **Start sessions only in a turn the founder typed** (the app refuses starts from a cron check: propose a card instead). Cards start locally on the Mac; a typed-turn start with `target: "cloud"` starts in the cloud.
4. Each check (CronCreate, 30 minutes, minute 13 and 43): `bash product/tools/flow-watch.sh` (RED count), `get_usage`, merges, qa batch verdicts, comments starting "Question for the tech lead". Records PRs merge directly only when no batch is checking; cancel CI only by explicit run id (the permission guard refused a cancel at 17:55: ask the founder, never work around it).
5. **Records PR #578** (P-281, P-282, this page) waits only on `decision-impact.sh`: P-279 needs qa to cite it on C5.4 in `qa/CAPABILITIES.md` (qa's file); ask qa in its next batch PR, then merge #578 directly when no batch is checking.
6. **Next improvement to bring the founder (tech lead's recommendation):** qa scores the Mergify batch branch *before* it lands, once per batch, so bugs are caught pre-merge at about P-277's token cost.

## Progress (qa on main 8f2b3975, #567, 17:30 UTC)
M2 **43/60 Works**, 15 Partial, 2 Not built (C5.4, C5.5). Up since 15:40: C3.12, C11.12, C5.7; down: C3.13 (pack runs again, 8/23: BR-2, BR-3, BR-10 never built). M3: 2 Works (C6.9, C6.11), 8 Partial (C6.12, C6.4, C7.6, C7.7, C7.3, C11.5, C11.6, C8.2 slice 1), 7 Not built (C1.3, C3.16, C6.5, C7.5, C8.1, C9.2, C10.2). AI spend today US$9.12. Weekly plan 34% at 17:30 UTC. Golden journey 1: 4/8 (#542); journey 2 by the qa-batch session at about 18:00–19:00 UTC.
**Forecast (estimates):** 48–50 by ~21:00 UTC once the approved PRs merge and qa scores them; 52–54 by 3 Nov morning; 59 about 4 Nov.

## M2 rows not Works, and who has them
| Row | In flight | Then |
|---|---|---|
| C4.7, C4.11 | #566 QA-162 (approved) + #563 QA-163 (approved) | qa re-score; C4.11 may need PF/paid re-run |
| C11.3 | #564 (approved, queued) | qa |
| C11.15 | #565 (approved; qa head check, run path) | qa |
| C2.6 | #574 (approved) | qa |
| C3.6 | #573 (tech lead read `studio.ts`, accepted) | label after reviewer; follow-ups C3.6-F1/F2 in BACKLOG |
| C11.8 | #570 (reviewer Block M1; tech lead allowed the fake-launcher pairing in two checks, or a dated follow-up row) | label, qa head check (money path) |
| C3.13 | fresh session requested 18:10 (`c313-forms`) | — |
| C11.7 | #576 PD (approved) | IMM 5532 paid re-run on the tech lead's Go (about US$1.55, worst US$3.22) on the Mac paid runner |
| C3.4 | local session `local_506439b7-511d-4f01-b6dc-22bc1592202d` (C3.4 AI step + job files, PB) | paid runs on the Go (about US$1–1.5 each) |
| C9.1 | row C9.1-AI: shape the AI impact step first (#576 option a) | the next tech lead shapes it |
| C5.4 | #569 G1 PR 1 migration (SQL read, approved) → wiring PRs by the G1 session | — |
| C5.5 | #568 G2 concept approved (E7 error; new-or-changed scope; failing key refuses a Demo release) | build PRs |
| C11.14 | G-CORE B2/B3 (B1 merged #556) | — |
| C10.1 | needs a released Visitor visa (QA-144): after QA-163 and Saved results | — |
| C11.13 | only the held "did you mean" part left: ask qa to score "Works, held part excluded" (P-265) | — |
| C5.1 | held (SA-01B product owner, P-251) | — |
Also approved, no M2 row change: #557 K13 names (tech lead merged main in for a conflict), #554 UX-A part 1, #562 S4, #572 QA-165 part 1.

## Sessions (all report by PR; the tech lead steers every one, whichever Lead started it)
Started this chat (cloud, one row each, end when labelled): QA-163, QA-162, qa-batch, C3.6, C11.8, C2.6, C11.3, C11.15, G2, PD, C3.13 · local: C3.4 AI step · from the previous Lead, still pushing: runtime (QA-164 merged, S4 #562, QA-165 #572), screens UX-A (#554), screens G1 (#558 merged, #569), forms G-CORE (#556 merged, B2/B3), screens K13 (#557), runtime C8.2 (#553 merged) · Mac paid runner: finished (To archive); start a fresh one per Go.
**M3 plan (for the founder when M2 merges thin out, about 3 Nov):** add two runtime builders per P-261: C8.1 → C7.7 rest → C9.2, and C6.5 → C7.5 (both paid AI: quote first); C1.3 and C3.16 need concepts first.

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 · L-SA6–L-SA11 · G5 · the P-236 rename · C11 · E1–E6 · design-only items · SH3/SH4 contracts go to the product owner with them.

## To archive (P-283)
* **Nested sessions move with their parent in the sidebar** (18:35 UTC: moving the previous Lead into "To archive" took its 11 lanes with it, several still working; moved back to Ungrouped at once). So: move a Lead chat only when none of its lanes is still working; until then archive finished lanes one by one. Finished on the Mac: the paid runner (`local_a6af81b9-…`, copy clean, PRs merged; a fresh runner per Go).
* Cloud (founder archives on claude.ai/code): the old forms L5 Track B, forms L8 and qa lanes (replaced by the QA-162, QA-163, qa-batch sessions); forms L4 Track A (closed, no PR); each one-row session started today once its PR has merged (check its hand-over first). qa-batch ends after golden journey 2; qa-batch-2 scores tonight's batches until about 01:00 UTC.

## Waiting for the founder
1. **Open a new chat and type `/lead`** (this hand-over).
2. **Archive** the previous Lead chat on the Mac (Remote Control attached, so the tech lead could not) and the old forms L5, forms L8 and qa lanes on claude.ai/code.
3. **Send the SA-01B product owner** the reply drafted on the Mac (`archive/2026-11-02-founder-drafts/`), the SH3 contract (#509), the G-CORE concept (#504) and `design/note-to-sa01b-po-2026-11-02-sqr.md`: the only way G5 and the held parts unblock.
4. Tell the team they drop their "Fill this screen" (P-245), pending the product owner's ruling.

## Founder asks of 2 Nov, this chat (P-228 (9))
A46 token savers: qa per batch (P-277) ✓, Sonnet pilot (P-278) ✓ · A47 G1 dates count (P-279) ✓ · A48 55 in 2–3 hours, the whole build today, close idle lanes: answered with evidence (not reachable without a lower bar), six more one-row builders (P-280) ✓ · A49 no token stop, paid-run Go within US$25 a day (P-281) ✓ · A50 machines: GitHub Pro bought (P-282) ✓ · A51 Wave 1 (= M2) today? no, about 4 Nov (estimate); "11–12" is P-255's gate date; why bugs after merge and how to reduce (item 5 above); who leads (the tech lead alone, every session); when to switch (now) ✓ · A52 breakdown of built / half-built / not built and the M3 plan: this page ✓. Earlier asks of 2 Nov (A3–A45): git history of this file.

## Lessons of 2 Nov evening
A records commit pushed after its PR merged is stranded (P-281 was): check the PR is open before each push · Mergify's final `ci` job waits for a machine even after its shards pass: measure machine waits before blaming builders · sessions cannot be started from a cron turn.
