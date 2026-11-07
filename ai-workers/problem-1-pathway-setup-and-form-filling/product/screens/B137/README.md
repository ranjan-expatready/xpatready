# B137 — C6.15 document substitute sets: build notes and UX note (P-392)

Row B137 (requirement row B3; SA-1B-19, SA-1B-20; P-406). Pull request 1268. No new screen: one section in the existing Documents tab drawer (board v2 frame 3, as built by W1-15 slice 3), one block on the existing To review change page, and two lines plus per-member upload items on the existing case Documents panel (C6.4 (a)). Intent, not pixels (P-44). Scorecard: the UX lane's BIC-01..20 (`design/best-in-class-m3-case-screens-2026-11-07.md`).

## What a person can do now
* **Author** (Visitor visa › Documents › a line's drawer): sees the line's document type's substitute sets ("Any one of" with the standard first and each alternative's "when acceptable" words; "All of"), which set this line uses, picks another set for this line on the draft ("Use this set"), and proposes the type's sets ("Add substitute sets…" / "Change the substitute sets…", with a reason).
* **Second person** (To review › the change): compares the sets before → after, by name, with the reason; Approve makes the type's draft; it goes out with the next release (as C4.5's "facts a document supplies").
* **Case officer** (case › Documents): each line says its set in words ("Any one of: … or …" / "All of: … and …"), staff's "acceptable when" words, and how far the files meet it ("1 of 2 received; still to come: …"); the line's ⋯ menu offers "Upload <member>…" per member; the line is Received once the set is met, else Requested.

## Decisions, each with its best-in-class line
| # | Decision | Best in class (what we follow) |
|---|---|---|
| 1 | Sets live on the library document type and a line only **picks** one by name (SA-1B-20 r2): no per-line members. | One source of truth reused everywhere (SA-1B-19 §2); ask once (BIC-01) applied to configuration. |
| 2 | Sets change only through **a second person's approval** with a reason, before → after shown by name. | Review returns only what needs work, with a recorded decision (BIC-17); changes are reviewed events (BIC-16). |
| 3 | The line says the rule **in words** ("Any one of" / "All of", the standard named) and what is **still to come**, by name. | Status by text, not colour (BIC-19); incomplete is normal, said plainly (BIC-04); plain words (BIC-20). |
| 4 | Upload asks **which member** by the menu item's own name ("Upload Host's bank statements…"), never a second dialog. | One action named for what it does (BIC-11); fewest clicks (SA-1B-152 §12: +0 for staff). |
| 5 | **Information only:** a set never blocks; an alternative is offered, the officer decides it is acceptable (SA-1B-19 §10). Ready to file still names an all-of line not met as "not received". | The person decides; the tool shows guidance (SA-1B-152 r6). |
| 6 | A file sent before a type had sets is **kept and shown** on the line, never dropped. | Duplicate beats a miss (AG16-60): no file disappears. |

## Not in this row (limits, said)
* The client's "I don't have this — I'll provide the alternative" (SA-1B-152) and "Alternative used" flag: client screen, not built (the officer uploads as a member now).
* "When acceptable" **conditions** in the library's condition language (SA-1B-19 r3, optional): not built; words only.
* A set member's own validity rule (a police certificate's 6 months, C6.4) is read for the line's own type only.
* The old per-line "Alternatives" (W1-15 slice 3) still sits above "Substitute sets" in the drawer (review S6; SA-1B-19 §3 knock-on says rows stop carrying them): moving them into sets is a follow-up row for the tech lead, not done here so no released line changes meaning.
* A line's set pick is named on the expert's sign-off only as a changed document requirement (review S2, second half); the type's sets are named in words.
* Retiring a member in use is now refused or warned by its uses (the set counts as a use), and a release whose line's set has a retired member is refused, named; a "publish lists the sets affected" warning (SA-1B-19 §12) is not built.

## Values
The sets, members and words in the pack and the walk are **Sample** (Unconfirmed: expert; AGENTS rule 4): they show the mechanism, not what IRCC accepts for Proof of financial support.

## Walk at 1440 px (P-352), on a fresh copy loaded with the configured checkpoint
`walk/01` drawer with no sets · `02` the editor filled (Standard any one of; Sponsor-funded all of) · `03` sent, waits · `04` the second person compares · `05` approved · `06` the drawer lists both, "This line uses it" on Standard · `07` the officer's line in words · `08` the ⋯ menu offers one upload per member · `09` the host's letter alone meets the line (Received) · `10` the author picks Sponsor-funded · `11` after the next release, a new case: "1 of 2 received; still to come: Host's bank statements (Sample)", Requested.

## Round 1 findings and what changed (review.md M1–M4, S1–S8; break-report.md F1–F4)
* **M1 / F1** a file counts on every line of the person whose set or own type has it: after an upload, each other such line not yet received is worked out again and becomes Received when met, with a history line ("… also meets …"). Pack step C6.15-26.
* **M2 / F4** `SET_SETS` reads "Change": the heading is "Change a document's substitute sets: …". Pack step C6.15-5b.
* **M3** "Use this set" sends the line's revision; a pick saved meanwhile is refused (409), never overwritten.
* **M4** the migration records its rollback.
* **F2 / S5** staff's "when acceptable" words are typed in the editor, kept on edit, and shown to the second person (before → after) and in the drawer. Pack step C6.15-5b.
* **F3 / S1** a set member is a use of the type (Where used), so it is not retired unseen; the release names a retired member (never its key) and refuses the line using it. Pure check steps "break F3"; pack step C6.15-25.
* **S2** the sign-off line names the type's sets in words. **S3** the drawer warns when the line picks a set its type no longer has. **S4** the editor's answer scrolls into view and takes focus on a refusal. **S7** the pack calls the sets routes by their own paths. **S8** the reason shows once.
