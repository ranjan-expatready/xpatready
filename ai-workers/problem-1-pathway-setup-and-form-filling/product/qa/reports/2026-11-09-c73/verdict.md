# Verdict: C7.3 on main 7e32ee210 (fresh Opus reader, ran nothing, P-303)

* **Gate A (P-348 (3)): PASS** (confidence high, ~85%). By screens, ends at C8.2's first step "Record the submission", whose output is used.
* **Row: Partial (stays)** (confidence high, ~95%). No GitHub run of C7.3's packs exists on 7e32ee210: P-339 is not met.
* **QA-165: no longer rightly holds C7.3** (confidence ~80%). What is left (the Adobe Validate proof of a PDF copy) is C7.2's and C10.2's. Recommend qa narrow it, with a one-line ack from the Lead.
* **QA-323: closed by #1430** (confidence high, ~95%): each of the 9 sections has the "Entered in the portal" button the words name (`walk/01`).
* **New findings: none.** QA-324 is still visible, unchanged ("Type these answers into the IRCC account" beside "Filed through APR Portal", `01`, `14`).
* **To Works:** a green `nightly.yml` run on main's head with data=checkpoint, its run id in the row, and QA-165 narrowed (list at the end).

Read: qa SKILL §4 and Gate A; RULES.md "When a capability counts as Works", lines 66 and 72; DECISIONS P-339 (4), P-322, P-348 (3), P-401, P-305 (3), P-136; CAPABILITIES row C7.3; BUGS QA-165, QA-323, QA-324 (and the Minors QA-171, QA-265, QA-348); walk-screens.md, walk-log.txt, setup-log.txt; screenshots 01, 02, 04, 05, 08, 09, 12, 13, 14; scripts/; local-gateb-C7.3-7e32ee210.txt; the facts and the #1430 summary given by the qa lane.

## 1. Gate A: PASS
* **By screens.** `walk_c73.mts` acts only through `click`, `focus` + `Enter`, `fill` and keys on roles and labels the page shows. It calls the API only for reads (`GET /answer-sheet`, `GET /prepare`) and for one write probe after the walk (10b, 409). The checkpoint was loaded through Demo › Load the configured checkpoint, on a fresh isolated copy (`qa_c73a`), which is the data P-322 counts.
* **What the screenshots show.** `01`: To do, 9 of 9 to tick, a Copy button on every answer. `02`: "Entered by Case officer (Sample), 9 Nov, 17:49", 8 of 9. `04`: "Tick taken off by … Reason: …", back to 9 of 9. `05`: Done, "Every section is ticked". `08`: the client gets "This page is for the case officer", with no controls. `09`: the Online line reads Done. `12`: the Record dialog. `13`: Submitted, V300000777. `14`: "Submitted to IRCC … read-only", no tick controls, the ticks kept.
* **Ends at the next capability's first step, with output it can use.** C8.2's Record is reached from the screen and recorded (`status: submitted`, prepared_by the officer, reviewed_by the representative). C7.3's state carries over: the sheet freezes after the record, and an untick is refused 409. Ready to file does not wait for the ticks, which is right: under P-136 only an *entered and out of date* item blocks.
* **Gaps, none failing:**
  * (a) R4 (a changed answer clears the tick and then blocks Ready to file under P-136) is the hand-off to C7.6 that matters most. It was not walked by qa; it rests on pack steps C7.3-31 (API) and C7.3-48 (screen script).
  * (b) Step 8 went back to the case by URL (a script slip: the link pattern matched the breadcrumb).
  * (c) The setup is by API: facts, signatures, review, and the 8 warnings passed with reasons. This matches earlier gate A precedent (C8.1, C7.7) and is not under test, but Ready to file was reached by passing warnings, not by clearing them.
  * (d) No axe scan, no 200% zoom, no headed pass, not on the shared demo :4400.

## 2. Row status: Partial
* **P-339 (4)** needs the pack green on main's head on GitHub's runners on the checkpoint, with the run id in the row. There is no such run:
  * the dispatch from this cloud lane was refused 403;
  * the latest nightly (42663208911) is on 1d07807c8, before #1430, so it has neither C7.3-tick nor C7.3-screen;
  * `local-gateb-C7.3-7e32ee210.txt` (15/15, 15/15, 14/14 on the checkpoint) is a local run in a cloud container. It supports gate A but is not Works evidence.
* **Also missing:** QA-165 (a Major) still names C7.3, so P-305 (3) holds the row Partial until it is narrowed (§3).
* The tick that P-401 requires is now built and walked. The Minors left (QA-171, QA-265, QA-324, QA-348, #1430's listed Minors) do not hold Works.

## 3. QA-165
* What is left of QA-165 is one thing: "no Adobe Reader Validate run shows a copy with these two boxes [Taiwan PIN, Israel indicator] empty is accepted; it closes with C7.2's Adobe evidence step".
* **That proof does not apply to C7.3:**
  * C7.3 is the Online answer sheet, typed into the portal. No Adobe Validate is on its path (P-62 is the PDF-upload channel), and an Online line's PDF copy is "not for filing" (P-145).
  * The two boxes are conditional on issuing-country codes 203/206, and the sheet correctly omits them for an Indian passport (`01`, section 1).
* **Whose it is:** the Adobe proof belongs to C7.2 (its 6 Adobe steps, plus QA-315) and to C10.2 (PENDING lines -5b, -6d), not to C7.3.
* **Who decides:** precedent says qa narrows a bug's capability field itself (QA-153 dropped C7.3 on 7 Nov). But this changes which Major holds a row (P-305 (3)) and what gate B reads, and an earlier reader asked for the check. So: **recommend qa remove C7.3 from QA-165, citing this verdict, and the Lead confirm in one line.** If the Lead rules that a PDF copy's Validate is part of every Online filing, QA-165 stays C7.3's one open item.

## 4. QA-323: closed by #1430
* QA-323 was about the words naming a control the page lacked. `01` and `02` show an "Entered in the portal" button under every section; ticking and taking off work (`02`, `04`, `05`).
* Close it on 7e32ee210, with evidence `walk/01`, `02`, `05`.

## 5. New findings: none
* Seen and not raised:
  * section 6, Education, "No answer to type in this section.", still takes a tick (the portal screen still exists);
  * four toasts stack over section 9 (`05`);
  * the sticky header overlaps the content in full-page captures (a capture artifact).

## 6. What moves C7.3 to Works
1. The Lead (or a lane with Actions write; the cloud lane got 403) dispatches `nightly.yml` with data=checkpoint on main's head, at 7e32ee210 or later, including #1430.
2. On that run, `C7.3.test.ts`, `C7.3-tick.test.ts` and `C7.3-screen.test.ts` are green. qa reads the job log and writes the run id and job id in the row (P-339).
3. QA-165 drops C7.3 (qa's record change, with the Lead's ack per §3). If the Lead rules otherwise, the Adobe Validate proof (C7.2's step) is also needed.
4. QA-323 is moved to history as closed.
5. If main's head carries product changes beyond 7e32ee210 that touch the sheet, or the run is red, repeat this gate A walk on that head first. Otherwise this gate A PASS stands.
