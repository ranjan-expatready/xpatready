# qa capability C6.14: one document for the whole application. Works (was Not built). 9 Nov 2026, 17:55–18:30 IST

qa lane, cloud copy. Row B136, built by #1392 (merged 16:51 IST). Live AI off; US$0; no paid runs. **Verdict by a fresh reader on Opus that ran nothing (P-303): Works; gate A PASS** (`reader-verdict.md`, word for word).

## Pack on GitHub's runners (P-339, P-322)
* nightly.yml run **42616655752**, dispatched by the tech lead on main **cfaa199f4** (`capabilities=C6.14 C6.19 C8.3 C6.13 C10.2 C7.3`, `data=checkpoint`). Job **129158118360** "packs (C6.14)": "C6.14.test.ts on the checkpoint: exit 0, **35/35** passed"; Gate B passed (`github-C6.14-42616655752.txt`).
* Main moved to **d8fddc328** while this ran (#1386, #1409: C6.5's "kept over the document" in `api/src/case-documents.ts`, `web/src/runtime/documents-drawer.tsx` and C6.5's tests). None of C6.14's files changed (`engine/runtime/case-checklist.ts`, `api/src/document-providers.ts`, the providers route, `web/src/runtime/checklist.tsx`), so no new run was dispatched. The tech lead may want C6.14 in the next nightly on the head, since C6.14's next step (upload) is next to that code.

## Gate A by screens (P-317, P-348 (3)): PASS
Fresh isolated copy `qa_c614` on :4474 on main **cfaa199f4**, started and stopped in the same command (ttl 60). Loaded by **Demo › Load the configured checkpoint** (103 s). 1024 px, Playwright, as each person in turn. Script `scripts/gate_a_c614.mts`; output `walk-output.txt` (23/23; the first run, `scripts/run1-output.txt`, was 20/21 because the script missed the file-chooser event; the second run caught it). Screenshots `shots/00`–`20`.
**Setup not under test (named):** the three cases were opened, and the couple's "married" answered, by the pack's helpers (`acceptance/lib/m3.ts`: C6.1 and C6.2's routes). Everything else is by screens, including the release.

| Step | Person | What the screen showed | Shot |
|---|---|---|---|
| Before any roles | Case officer | One "Marriage certificate copy · Once for the couple · Shared · Provided by Sample Spouse A · The person the item is for" | 01 |
| Set the roles | Configuration author | Drawer "Who provides it when shared": "Not set"; Send with no reason refused; Principal applicant, then Spouse or partner, with a reason; "waits for a second person on To review" | 02–05 |
| Approve | Approver | To review row "Marriage certificate copy · provided by Principal applicant, Spouse or partner when shared"; Before "Not set" → After "Principal applicant, then Spouse or partner"; Approve | 06b, 07 |
| Release (C4.x) | Author, Content reviewer, Approver | Submit; the expert's line "Marriage certificate copy: supplies no facts; provided by (when shared): principal applicant, then spouse or partner"; Sign; Approve and release: v2 → v3 | 08–10 |
| One item, two providers | Case officer | Family of four: **one** marriage-certificate item, "Provided by Sample Client A and Sample Spouse A · Default from the document type"; the only line marked Shared (the passport stays per person) | 11 |
| Change providers | Case officer | Both children greyed, "is 10 on 2026-11-09: nobody under 18 provides a document"; Save with no reason refused on the field; the principal alone saved, "Chosen by the case officer on 9 Nov, 12:37 (Case officer (Sample)): Only the principal holds the original certificate…"; "Use the defaults" with a reason gives both back; audited underneath | 12–16 |
| **F18** | Case officer | Principal with no date of birth, spouse of 17: "Provided by Sample Spouse C · The person the item is for"; the dialog's "Now:" says why ("age cannot be checked yet", "is 17 on 2026-11-09") | 17, 17b |
| **Next capability's first step (C6.4 Request, C6.5 Upload)** | Case officer | Menu: Request, Upload a file…, Not applicable…, Change providers…, History. Request → "Requested"; upload → "Received", "File: marriage-sample.png", "1 of 4 received"; providers still shown; still one item | 18–20 |

No sideways scroll at 1024 px (drawer, case). Probe `scripts/probe_upload_chooser.mts` (`probe-output.txt`, a second copy on :4475): "Upload a file…" opens the file chooser by mouse and by keyboard (on the passport line).

**F18 is as built:** when nobody matches, the provider is the filing's first applicant, on this slice the person whose list carries the item (Spouse C). See QA-332: that person can be 17.

## Findings (all Minor; none holds the row, per the reader)
* **QA-331** (UX · Minor): on the F18 fallback the line says only "The person the item is for", the same words as when no roles are set (01 vs 17); the reason is only inside "Change providers…" (17b). Concept BR-4/BR-5: "the line says why". The walk's check 7a matched only the name (the reader: that PASS overstated; 7d found the reason in the dialog).
* **QA-332** (Ambiguity · Minor): the F18 fallback names a 17-year-old as provider, while the same dialog says "Nobody under 18 provides a document" and greys that person out (17b). Is that intended (SA-1B-151 r3's fallback) or should the line say nobody can provide yet? The concept's founder question 3 (first applicant or principal) is still open.
* **QA-333** (UX · Minor): two age bases on one screen: the person's header says "Age: answer 'Date the application is submitted' first", while the providers rule says "is 17 on 2026-11-09" (today) (11, 17).
* **QA-334** (UX · Minor): the drawer's editor: after Send with no reason the error shows twice and stays red after a valid reason is typed (03, 04); "Provided by: The client" sits above "Who provides it when shared: Not set" in one drawer (02); the release line the expert signs is cut off with "…" (08, 09).

## Not proven
* A "once for the application" item (Filing scope, a sponsor's proof of funds): no release uses it yet (concept BR-2); only "once for the couple" was walked.
* The pack and the walk on d8fddc328 (see above).
* That the expert's sign-off was stored (the release went out after "Sign", and approval is refused without it elsewhere, J6; not checked here).
* A provider uploading for themselves; "Received from <person>" (BR-7, not built); a second change while one is open, and a stale version, through the screen (the pack holds 409s by route).
* 400 and 1440 px; one pass, not two; keyboard-only and axe not run; the shared demo :4400 was not running in this cloud copy.

## Questions for the tech lead
1. QA-332 for the founder: when nobody can provide, should a 17-year-old be named (built, F18), or should the line say no one can provide yet and ask the officer to choose? Recommendation: keep F18 as built, and have the line say "nobody 18 or over on the case can provide it" with the reason (QA-331), so the officer sees it without opening the dialog.
2. Put C6.14 in the next nightly on main's head (d8fddc328 or later)?

## Suggestions
* Show `providers_words` on the shared line when the rule is the fallback (QA-331). *Needed for the proof* · *Capability*.
* Record the main commit in each gate A walk's output (the reader could not tell from the files alone). *Later* · *Scaffolding*.
