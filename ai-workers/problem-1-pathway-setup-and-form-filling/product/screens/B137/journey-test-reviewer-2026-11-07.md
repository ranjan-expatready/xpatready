# B137 — C6.15 document substitute sets: journey test (reviewer, 7 Nov 2026)

Commit `79cde660c107b782b4d54ae53f7a20800d56585a`, PR #1268. Copy `rev615` on :4436 (runtime lane ports), fresh database, Demo › Load the configured checkpoint. Headless Chromium (Playwright) plus API and database reads. US$0, no AI. Review: `review.md` in this folder.

## Journeys (written from SA-1B-19, SA-1B-20, BACKLOG B137 and the README before walking)
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Content publisher: "this document can be replaced by others, for every programme" | Visitor visa › Documents › Proof of financial support › Change the substitute sets… › edit › reason › Send | Waits on To review; nothing changes yet | Held: "Sent: a second person approves it on To review; nothing changes before that."; the button is then disabled; DB change WAITING |
| J2 main | Approver: check and approve | To review › the change › compare › Approve | Before → after by name, reason; draft gets the sets | Held: compare correct, DB APPROVED by the approver, type draft has the sets. H1 reads "SET_SETS a document's substitute sets: …" (walk/04, my 1440 shot) |
| J3 main | Case officer: any one of | New case on the release › ⋯ › "Upload Letter of support…" | The alternative alone makes the line Received | Held (pack C6.15-15; walk/09) |
| J4 alternate | Publisher: pick "Sponsor-funded" (all of) for this combination | Drawer › The set this line uses › Use this set › release › new case | One member: Requested with "still to come"; both: Received; older case keeps Standard | Held (pack C6.15-17..23; walk/11) |
| J5 empty | Publisher on a type with no sets | Open the drawer | Says the type is its own only member, offers "Add substitute sets…" | Held (walk/01) |
| J6 error | Publisher sends a bad list | Empty set name; alternative without client words; first set not "Standard"; unchanged list | Refused in words, nothing saved | Held in words; the message sits under the Send button, out of view at 1440, not on the field |
| J7 wrong role | Client, case officer, reviewer by URL | GET sets, PUT pick, approve own change, withdraw another's | Refused on the server | Held: GET 403/403/401; pick 403 as reviewer and approver; self-approve 403; withdraw by approver 403 |
| J8 recovery | Two at once, withdraw | Two parallel proposals; two parallel picks; proposer withdraws an approved change | One wins, the other told; withdraw puts the sets back | Held: 201 + 409 "already waits"; 200 + 409; draft sets back to the earlier list |
| J9 boundary | Case officer: a member that is also its own line (configured to: Standard = proof or passport) | Upload the passport on the Passport line, then look at Proof of financial support; then upload a passport through the funds line | Funds line Received; the passport line's own file untouched or the link said | **Broke**: funds line "Not requested" + "Met by Passport information page copy"; Ready to file "not received"; the second upload replaced the Passport line's current file silently |
| J10 boundary | Publisher retires a member | Retire Host's bank statements (a member of Sponsor-funded), approve, submit the next release | Refused or warned, member named (SA-1B-19 r6, §12) | **Broke (Minor)**: retire allowed (where-used does not count sets), release went out, no warning |

## Replayed checks
* axe WCAG 2.2 A/AA: drawer (1440, 1024), editor, To review compare, case page: **0 violations** each.
* Widths 400, 1024, 1440 and 200 % (720 px): no sideways page scroll (scrollWidth = innerWidth each time).
* Keyboard: case line ⋯ focused, Enter opens, first item focused, ArrowDown moves, Escape returns focus to "Actions for Proof of financial support for Sample Client X". Editor Send by Enter works.
* Console: no page errors; the 400s logged are the refusals J6 asked for.
* Timings: case page to the set line 0.39-0.42 s; drawer sets 0.62 s warm, 1.27 s on the first cold load (includes navigation).
* Pack `acceptance/C6.15.test.ts`: 25/25 (3.0 s). Pure `tests/check_c615_document_sets.ts`: 31/31. Run once each (not twice: J9/J10 changed the data after).

## Data underneath
J1-J2: one `library_change` (document_sets) WAITING → APPROVED, `decided_by` the approver, reason as typed; type draft `sets` as edited (2 members left in Sponsor-funded); audit lines for proposed and approved (the approved line reads "(sET_SETS)"). J3-J4: `case_document.document_type` = the member key, the line state `received`/`requested` as expected, audit "uploaded … (in the set for Proof of financial support)". J8: `document_requirement` versions 3 PUBLISHED, 4 DRAFT, one draft only after the race.

## Findings
* **Major** J9 (review M1): case-checklist.ts:197-205 sets state only on the line uploaded on, while files and `set_status` are read per person and type across lines.
* **Major** J2 words (review M2): `SET_SETS` missing from `ACTION_WORD`, library-changes.ts:34.
* **Major** stale pick (review M3): sets-panel.tsx:36 sends no `baseRevision`.
* **Minor** J10 (S1), sign-off words (S2), dangling pick unseen (S3), error placement (S4), no staff wording (S5), duplicate reason (S8).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1-J4 done in the product's own screens and the pack |
| Next step obvious | ½ | Clear after Send; a dangling pick and an error under the fold leave the person unsure (S3, S4) |
| Plain words | ½ | "SET_SETS" heads the approver's page; sign-off says "supplies no facts" for a sets change |
| Feedback and state | ½ | J9: "Not requested" beside "Met by …" on one line |
| Correct data | ½ | J9 cross-line state and file replacement; J10 retired member released |
| Error recovery | 1 | J6-J8: every refusal worded, nothing half-saved, withdraw restores |
| Accessibility and screen sizes | 1 | axe 0, 400/1024/1440/200 %, keyboard path |
| Speed | 1 | Under 1 s warm on both screens; one request per view |
| Visual quality | ½ | Editor rows wrap their Remove buttons (walk/02); two filled buttons while editing; reason twice |
| Trust and sources | 1 | Sample labelled on every surface; before → after with the reason; no AI |
| **Total** | **7.5 / 10** | **Below the pass (8)**; no criterion at 0 |

## What would raise it, most valuable first
1. Fix J9 (state of every line the member counts for; say where a shared file came from) — correct data, feedback.
2. Word `SET_SETS`; name sets changes and picks in the expert's sign-off — plain words.
3. Show a dangling pick in the drawer; put editor errors at the field and move focus — next step, feedback.
4. One filled button while editing; keep Remove beside its field — visual quality.

## Not tested
A real screen reader; a person's unaided walk (D17, D20: the founder's); a hostile or very large file (unchanged code path from C6.4); CI.
