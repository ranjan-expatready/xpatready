# C6.16 verdict: Works · P-339 met (nightly 42707165919, green on GitHub's runners, on the checkpoint, main 751310cdb ≡ head) · no open Blocker, Critical or Major names C6.16

Reader: a fresh Opus subagent that ran nothing (P-303). Read only: `verdict.md`, `nightly-42707165919-C6.16.txt`, `qa/BUGS.md` (every row naming C6.16), the `| C6.16 |` row of `qa/CAPABILITIES.md`, `runs-on` in `.github/workflows/nightly.yml`, and the Lead's answers on #1452 as quoted to me. 10 Nov 2026.

## P-339
* **On GitHub's runners:** yes. `nightly.yml` run 42707165919 (run 264, workflow_dispatch by Lead 5), and every job in nightly.yml is `runs-on: ubuntu-latest`. qa read it through the GitHub API, not a local copy.
* **On the checkpoint, green, main's head:** yes on all three.
  * The step's env reads `GATE_B_DATA: checkpoint`, and the result line says "on the checkpoint". The step's name ("on the six where its run allows") is generic; the env and result decide it.
  * Conclusion success: packs (C6.16) success, Gate B passed.
  * head_sha 751310cdb. Main has since moved to 2cfdad961 (#1459), but the diff under `prototype/` is four files under `studio/tests/qa/` (README and the QA-376/377/378 checks). `acceptance/C6.16.test.ts` imports nothing from `tests/qa` (grep), and the app does not read them. So the run is equivalent to main's head for this pack.
* **Quote in the row:** run **42707165919**, job 129466930672 "packs (C6.16)": "C6.16.test.ts on the checkpoint: exit 0, 74/74 passed".

## Open Major or Critical naming C6.16: none
QA-359 (the only Major) is no longer in BUGS.md and was closed by the re-score. Every open row naming C6.16 is Minor.

## Open Minors that stay (they do not hold Works)
* QA-357, QA-358, QA-360 (widened), QA-368: UX · Minor.
* **QA-369:** under P-443 (the Lead under P-294, reversible under P-390; founder to confirm as STATE F19) it is ruled "kept as built": a take back only ends the open link, discloses nothing, sends nowhere Client A chose, and afterwards only the firm can send. Re-read it as **Gap · Minor (pack step owed after the 26, P-434)**, no longer an Ambiguity for the founder. It does not hold C6.16. Update the BUGS.md row to say so (its status column still reads "screens, after the founder rules").

## Row text (first in the evidence cell)
"**Works (was Partial — ready for Works). P-339: nightly.yml run 42707165919 on GitHub's runners, main 751310cdb (after #1453; main since changes only `tests/qa/`), data=checkpoint, job 129466930672 "packs (C6.16)": "C6.16.test.ts on the checkpoint: exit 0, 74/74 passed".** No open Blocker, Critical or Major names C6.16 (fresh reader, P-303, `qa/reports/2026-11-10-c616-rescore/verdict-works.md`). Open Minors: QA-357, QA-358, QA-360, QA-368 (UX); QA-369 ruled kept as built by P-443 (Lead, reversible P-390; founder confirms as STATE F19), Minor, pack step after the 26 (P-434). Records: P-412 to P-443 on `lead/2026-11-07-lead31`, not yet on main (they do not hold Works). Before: " followed by the current cell unchanged. Also set the status column to Works and the date/commit column to "751310cdb 10 Nov".

## Caveats
* The gate A limits in `verdict.md` stand: screens were walked on df52c9fc6, not 751310cdb; XFA values not re-read; no Partner save after re-entry; no Client A at 1024 px; one headless pass; case set up by script.
* The run's Gate B line says "claims Works for none (no bug check)", so the bug check is this reader's reading of BUGS.md, not CI's.
* P-412, P-441 and P-443 are cited from the Lead's branch, not main's DECISIONS.md, and STATE F12 still reads "open" in this copy. Under P-339 that does not hold Works, but the records PR (P-436 (3)) should land them.
