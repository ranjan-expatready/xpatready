# C11.6 How each form is filed, on the case page: independent review

**Reviewed:** PR #1056, branch claude/keen-bell-k19fvr, commit **ef188a489**. `git diff origin/main...ef188a489` covers `web/src/runtime/item-channels.tsx` (new), `web/src/runtime/cases.tsx` (+2 lines), `tests/check_c116_channels_browser.ts` (new), and the notes and screenshots.
**Ran on:** isolated copy :4450 (xr_studio_c116, Visitor visa release 2, user-O), never :4400. US$0, live AI off.
**Concept used:** this item has no `concept.md`. I reviewed against J7 steps 2.3 and 5.2, `acceptance/C11.6.test.ts`, r5c board frames 2 and 6 (`M3-agent-view/design/draft-agent-view.html`), P-137 and P-143.
**Journey score:** **7.5 / 10**, below the pass mark of 8 (`journey-test-reviewer-2026-11-05.md`).

## Verdict: Block (commit ef188a489)
Fix M1 and M2, then ask for a re-review of the new commit.

## Issues
**Blockers:** none.

**Major**
* **M1. The row's state line is false after a change back to the default.** Change IMM 5707 to PDF upload, then back to Online. The row then reads "Online … Changed from Online (the combination's default) by Case officer (Sample), Nov 5, 03:32 a.m..". IMM 5257 back on PDF upload reads the same way. Evidence: R3 and R7, reviewer shot r3-back-on-default.
  * Cause: `item-channels.tsx:75` shows "Changed from {line_channel}" whenever `channel_changed` is set. The server keeps `channel_changed` (`by`/`at`, reason null) after a change back to the default.
  * Breaks: C11.6-3/9 ("The combination's default" vs "Changed from …") and EXPERIENCE §2.7 [M], reasons everywhere.
  * Fix: when `f.channel === f.line_channel`, say "The combination's default" (and, if wanted, "set back by X, when"). Add that step to the browser check. No check covers it today, which is why it passed.
* **M2. After a change, the case page says two different things about the same form.** After IMM 5707 goes to PDF upload, "How each form is filed" says PDF upload. Directly below it, Prepare application still says "IMM 5707 for Sample Client A · Copy, not for filing". Evidence: R9, shots m1-channel-row-5707 and m1-prepare-row-5707.
  * Cause: `GET /runtime/cases/:id/forms` still returns `channel: "ONLINE"`. `api/src/fill-case.ts:151` uses `channelIn(s, form)`, the release line, and never the item's channel, so `for_filing` and the "Copy, not for filing" pill (`forms.tsx:127`) are wrong once a person has changed the channel. This PR makes that change reachable for the first time, and the change is the screen's main action (J7 5.2, handing to 5.3 and 5.5).
  * Fix (forms lane's files): `/forms` takes the channel from the item, as `/prepare` does through `channelOf`, and the browser check reads Prepare application after the change. If the tech lead rules this belongs to C7.7, record that ruling and the known contradiction in `build-notes.md` "Not in this PR". Today it is silent.

**Minor**
* m1. **Internal IDs on the main path.** The greyed options quote the accepts record verbatim: "(“Set by a person: Sample for the M3 path: uploaded in the APR Portal; paper only as an accommodation (FQ-2, FQ-3)”)" (builder shot 03, `item-channels.tsx:135`). This breaks EXPERIENCE §5 [M] (no decision numbers on the main path), and it presents a person's Sample note as a quote under "IRCC does not accept it here". Fix: for a person-set record, show "Sample record set in the Form library" and its plain reason. Quote only IRCC's line, and give it its `source_url` or date, which the server already holds (`accepts_basis`).
* m2. **"Not needed" gets the wrong explanation.** It is greyed with "IRCC does not accept it here …" (shot r5-720-dialog). The engine has its own words for this case (`notNeededWords`), and r5c frame 6 says it means "the portal asks it itself". For IMM 5476 the same long note also repeats three times.
* m3. **Time typo.** "Nov 5, 03:32 a.m.." has a double full stop: en-CA's "a.m." plus the template's "." (`item-channels.tsx:30, 75`).
* m4. **Placement differs from the board, unrecorded.** r5c frame 2 and J7 2.3 put "Filed through APR Portal" in the case header chip row. Frame 6 and J7 5.2 put "⋯ Change channel" on the item rows of "Prepare the filing". The build adds a separate section above Prepare application. That is reasonable until C7.7's item list exists, but the build notes do not say so ("never deviate silently"). Fix: one line in `build-notes.md`.
* m5. **Untested states.** The "no longer accepted" red state (`:77`) and the submitted, read-only state (`:78`, C8.2-9) have no screen test or screenshot, so removing either line fails nothing. Add a fixture step, or name them under "could not check".
* m6. **409 does not say what changed.** The stale notice is the server's generic sentence, and after Reload the dialog keeps the item it was opened with (`:122`, `editing` not refreshed). STANDARDS §4 [M] asks for "409 with what changed". The server wording predates this PR, so it is minor here.
* m7. **No retrofit mapping in the build notes** (screen-review check 6). There is no line naming the team's equivalent component or route.

## STANDARDS / EXPERIENCE [M] lines touched by this screen
Met:
* §3.1 content is data. No form number or account in the live code (P-319): grep of `item-channels.tsx` finds no "IMM" or "APR".
* §3.4 checked twice. The server decides everything (`channelChange`); the UI only greys options and shows the field.
* §4 optimistic concurrency, under the row lock (`case-prepare.ts:515–518`).
* §5 one request per view. The panel shares the `OutOfDate` query key, so it adds no request.
* §6 Problem Details on the field, and server authorisation (client and author both get 403).
* §7 strict TypeScript, no `any`. axe on every state the builder reached, plus 400 and 720 px from me. `paperNeedsReason` mirrors the engine rule only to show the field: acceptable, flagged here.
* EXPERIENCE §1: status shown by pill plus words, one primary action. §2.3 edit in a dialog. §2.8 prevention by greying. §2.10 errors on the field. §2.12 keyboard, focus return, 1024 px and 200 % zoom (720 px).
* EXPERIENCE §4 states: loading, error, empty and not-derived are drawn (`:54–57`); conflict is shown.

Not met:
* EXPERIENCE §2.7 (M1).
* EXPERIENCE §5 (m1).
* STANDARDS §4 "with what changed" (m6).
* D1 and D19 consistency (M2).

## D1–D20 (1–5; reviewer evidence, browser and scripts)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | C11.6-1…12 on screen (37/37, 14/14). M1 misstates C11.6-3/9. Placement drift m4 |
| D2 Data integrity | 4 | Version under row lock. Double-click and two tabs write no duplicate (R5, R7) |
| D3 Reuse | 4 | Words from `contracts/forms.ts`. Team Dialog, Field, Notice, Pill |
| D4 Rule integrity | 4 | Accepted ways come from the library record. The server refuses others (C11.6-6/8a) |
| D5 Stability and recovery | 4 | Reload keeps the change. Stale gives Reload. Discard guard. Escape returns focus |
| D6 Freshness and governance | 3 | Who, when and reason on the row. Audit line without client text. IRCC's line has no date or source (m1) |
| D7 AI trust | n/a | No AI on this screen |
| D8 Orientation | 4 | Case path, section heading, a person heading per group |
| D9 Flow | 3 | Separate from the item rows. Prepare application contradicts after a change (M2) |
| D10 Language | 3 | FQ ids and "M3 path" in the dialog (m1). "a.m.." (m3). M1 wording |
| D11 Feedback and state | 3 | Toast and focus are good. The state line is wrong after a change back (M1) |
| D12 Visual quality | 4 | Clean rows, team look. A repeated note in the 5476 dialog (m2) |
| D13 Accessibility and responsive | 4 | axe 0 at 400/720/1024/1440, keyboard path. No real screen reader used |
| D14 Team look | 4 | Team tokens and components |
| D15 Speed | 5 | `/prepare` 0.15–0.17 s. No new request |
| D16 Testability | 3 | 37/37 twice, 14/14. M1, M2 and states m5 untested; a rule removed there fails nothing |
| D17 First-use | simulated only | No intended user walked it |
| D18 Provenance | 3 | Who and why on the row. The quote's origin is muddled (m1) |
| D19 End-to-end | 3 | J7 2.3 and 5.2 on screen. The hand-off to Prepare application is inconsistent (M2) |
| D20 Pain solved | simulated only | No intended user walked it |

## Checks run
* `check_c116_channels_browser.ts 4450 xr_studio_c116`: 37/37, twice. It rewrites the committed screenshots, so I restored them with `git checkout`.
* `acceptance/C11.6.test.ts`: 14/14. `graph.mjs --check`: exit 0, C11.6 named by 12 tests, no gap. `m3-guard.sh`: pass.
* Reviewer walk R1–R10 (journey report).
* Capability, not scaffolding: J7 2.3 and 5.2 run on the product's own screen. Release 2 comes from the pack's setup scripts, the documented Stage 0 scaffolding owned by M2, so that is not a finding here.

## Could not check
* A real screen reader, and an intended user's unaided walk (D17, D20).
* The submitted, read-only state and the "no longer accepted" state on screen.
* A visible browser pane (headless only).
