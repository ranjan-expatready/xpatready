# C8.3 Representative review: verdict on nightly 42738773981

## Verdict
**Works** (was Partial): pack green on main's head on GitHub's runners on the checkpoint, gate A PASS, no open Major or Critical; the row must record that C6.17 (#1262) changed C8.3's code after the walk.

## Evidence checked
* **Run (qa's API read, `run-42738773981.md` in this folder; not re-fetched by me, no network):** nightly.yml 42738773981, workflow_dispatch on main, head_sha 2cfdad961 = my local origin/main head (merge of #1459). Conclusion success; job 129574443172 "packs (C8.3)" success; env GATE_B_DATA=checkpoint; log "C8.3.test.ts on the checkpoint: exit 0, 25/25 passed", "Gate B: passed". Real server and Postgres (cloud-setup.sh), checkpoint loaded, so not the fixture-only case of P-405. P-322 and P-339 are met once the run id is in the row.
* **Row (CAPABILITIES.md:92):** Partial, and it gives one reason only: no GitHub run. That run now exists.
* **Gate A (`2026-11-09-c83b/walk.md`, report, prior verdict):** PASS by screens on 7e32ee210, checkpoint loaded by screen, 1024 px. It walks send, send back, round 2, the read-back stamp, a file withdrawal, re-approve and Ready to file. It ends at C8.2's first step (walk rows 18-19, shots 33-35: "Prepared by · Reviewed by: Case officer · Representative").
* **Code since gate A (`git diff 7e32ee210 2cfdad961`):** #1262 (C6.17 stages) edited `api/src/review-rounds.ts`. It adds `stageId` filters on filings and checklist lines, `newestPin` in `lockCase`, and an ended-stage 409 in `rowOf`. It also touched the gate's last step: `filing-record.ts`, `submission.ts` and `submission-record.ts`, plus a schema migration. On a single-stage case these filters select the same rows. The pack on 2cfdad961 runs every edited review route (send, open, checks, decision, reapprove, lockCase) and passes. The Review page web files (`review.tsx`, `representative-review.tsx`) are unchanged since #1440. Unlike C7.3's Works ("code unchanged since"), C8.3's code did change, but the change is covered by the green pack on the head.
* **Open bugs (BUGS.md):** QA-346, QA-347, QA-376, QA-377 and QA-378 are all Minor (UX or accessibility). No Blocker, Critical or Major names C8.3 or B144. Nothing in `scout/FINDINGS.md`.
* **Pack (`studio/acceptance/C8.3.test.ts`, 25 checks) against the row text:**
  * Send one or more filings: C8.3-1, -2, -3.
  * Each program's checklist items: -5.
  * Approve, or send back with reasons: -6, -7, -8, -12.
  * Rounds: -7.
  * "Changed since review": -11.
  * Stamp with snapshot and file fingerprint: -1 and -9 (the validated copy's sha), -22.
  * A later fact change withdraws the approval: -10.
  * Re-approve (P-412): -17, -18.
  * Permissions and races: -13 to -21.
  * Ruling (a) for barcode forms: -22, -23.
  * The checks are guarded (`!!qP`, `!!qS`, `!!qbc`), so a missing fact fails them rather than passing them silently. A green pack plus gate A shows the capability as the concept defines it.

## What would hold it
* Nothing now, under the rules as written. Three things would:
  * the Lead rules that ruling (a) covers every filed file (Q2) or the signed scan (Q3), and qa logs it as a Major;
  * a gate A re-walk on 2cfdad961 fails;
  * a C8.2 run on the head goes red. C8.2's pack did not run in 42738773981. C6.17 touched the record path, and only the 7e32ee210 walk covers that path.

## Open questions for the Lead (do not hold the row)
* **Q2 (PDF-upload forms):** not a confirmed defect.
  * QA-345's option (a) says "the first file **read back** after an approval that stamped none is stamped to it". Read-back is the validated-copy (barcode) event.
  * Concept B2 says "validated copy, else the generated copy that matches, else none". "Beaten" names the file only for a barcode form.
  * `fileStampCurrent` (engine/runtime/review.ts:56-62) states its scope: a form with no validated copy "is covered by its stamp as it is". The QA-345 review accepted that, and the Lead merged it.
  * Any later generated copy with different facts already withdraws the approval on the facts hash (BR-7). With the same facts, the copy is the server's render of the approved snapshot.
  * The open scope point: the row says "stamped with its file fingerprint", which a form approved before any file exists cannot meet. If the Lead keeps facts-only stamps for non-barcode forms, the row should say "its file where one exists" (QA-345's option (b) pattern). The words `none: "…an online form has none"` (review-rounds.ts:44) on a PDF-upload form are a Minor that is not logged: log it or fold it into QA-378.
* **Q3 (hand-signed IMM 5476, stamped `generated_copy`):** not a confirmed defect. No concept line, decision or ruling names the signed scan as the stamped file. The stamp holds the copy the client signs, made from the approved facts. Whether "the file that is filed" means the scan is a new scope call.

## Confidence
Medium-high. I verified the run only through qa's API notes, not by fetching it. Gate A is one commit behind the head, and C8.3's code changed in between (stage-scoping only; the pack on the head covers it). Recommend the row cite run 42738773981 and job 129574443172, and state "gate A on 7e32ee210; #1262's stage filters in review-rounds.ts since, covered by this run".

Fresh reader (Opus), ran nothing, 10 Nov 2026
