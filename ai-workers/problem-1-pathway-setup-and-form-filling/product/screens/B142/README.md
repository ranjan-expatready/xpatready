# B142 — C7.9 must verify before filing: build notes and UX note (P-392)

Row B142 = L-SA8 (P-242, P-237; SA-1B-1 rule 9, SA-1B-260 rule 3, SA-1B-261 rule 7; P-406). Pull request 1282. Parked by P-414 (7 Nov), resumed by P-424 (9 Nov, Lead 37). No new screen: one section on the existing library field page, one block on the existing To review change page, and one more CRITICAL line on the existing Ready to file list (C7.6). Intent, not pixels (P-44). Scorecard: the UX lane's BIC-01..20 (`design/best-in-class-m3-case-screens-2026-11-07.md`).

## What a person can do now
* **Author** (Library › Fields › a field): sees "Must verify before filing" (Marked / Not marked) with the rule in words, and proposes it on or off with a reason ("Propose: must verify before filing…").
* **Immigration expert** (To review › the change): reads the field's flag before → after and what it does; only the expert (the sme duty) approves or returns it, never the proposer (SA-1B-1 r9). A second person without that duty is refused in words and the change is not shown as theirs to decide. It goes out with the next release.
* **Case officer** (a case › Ready to file): when a form writes a flagged fact whose value the client gave (their own, or the principal's for another person) and no one on staff has checked, the filing shows a CRITICAL line: "IMM 5257 for <person>: "<question>" not verified: the client gave it and no one on staff has checked it. Check against the document and confirm, or pass with a reason." It is passed with a recorded reason (P-237), never a block; the form still fills from the declared value meanwhile (P-411; `engine/runtime/case.ts` untouched). A staff confirmation (Confirm section, Confirm & use) or a staff entry or correction counts as verified (SA-1B-260 r3); a new client value is not covered by an earlier pass.

## Decisions, each with its best-in-class line
| # | Decision | Best in class (what we follow) |
|---|---|---|
| 1 | The flag lives on the library field; only the content team proposes and only the immigration expert approves (SA-1B-1 r9). | Review returns only what needs work, with a recorded decision (BIC-17). |
| 2 | **Warn, never block** (P-237; SA-1B-261 r7); the form keeps filling. | Incomplete is normal; the person decides (BIC-04). |
| 3 | The line names the person, the form and the question in the release's own words, and says what to do. | Errors say what and how to fix, where it happened (BIC-13); plain words (BIC-20). |
| 4 | A pass names the value it was given for: a new client value raises the line again. | No stale answers (BIC-03). |
| 5 | Verified has one meaning everywhere (SA-1B-260 r3): status VERIFIED, or written by staff on the Agent view. | One source of truth for a fact's status (BIC-05). |

## Not in this row (limits, said)
* Which fields carry the flag is the immigration expert's: the pack and the walk flag the passport number as **Sample** (SA-1B-1's own example; Unconfirmed: expert, AGENTS rule 4).
* A repeating group's rows are judged by every answer of that fact for the person (a duplicate beats a miss).
* "Confirm & use" on a document (C6.5, L-SA7) counts as verified through its VERIFIED status once that route exists; this row adds no document step.

## Migration
`20261109090000_c79_must_verify`: one column on `canonical_field`, and `readiness_pass`'s two code checks rewritten from the newest (`20261108041500_b162_no_copy`) plus `must_verify`. Re-stamped after main's newest when main was merged in (9 Nov), so no code is dropped and it runs after every check it rewrites; rollback recorded.
