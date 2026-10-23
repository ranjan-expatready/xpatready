# Checker's verdict: Solution 1 one-pager, draft 3

18 October 2026 · The separate checker for Workstream 2, not the Lead. Read-only review: no shared product file, decision, NEXT or PROGRESS was changed; nothing was committed or written to a remote.

## Verdict

**Accepted for high/medium solution alignment once three local fixes are made: one on content (C-M1) and two visual (VM-1, VM-2).** C-M1 is a one-sentence fix plus one map decision. VM-2 is a small CSS change to the phone layout of the Shared records table, which the D243 rebuild broke. VM-1 is a label-placement pass on BPMN views 3–7 and the technical overview. After the fixes, a targeted recheck of those places is enough; a full re-review is not needed. *(Updated after the Lead asked me to cover D243 and the founder asked for a full visual review; see the two sections added below.)*

The page now does what this phase asks for. A founder can explain from it the whole journey from setup to filing, what AI does and what people decide, how a returning client's facts are reused, the important failure paths, and how changes are handled. J1, J2, J3, R1, R3 and the 8.3/8.4 alignment are confirmed closed. R2's core rule is closed. Its failure route, though (a signed file that does not match the approved one), is stated three different ways. That is the one material content contradiction left, and the framework does not allow an unconditional pass while one remains. The visual review adds two material presentation defects: lines through labels in the BPMN views, and a broken phone layout for the records table. Everything else below is minor.

## What was reviewed and how

- **Version.** The requested hash `92974d81…c6b2` matched at the start. I froze it with its sources in this folder (`manifest.sha256`). **While I was reviewing, the Lead rebuilt the page at 00:09** (founder follow-up D243: actor-type brackets in the diagram margins, the shared-records table, two wording fixes), so the current hash is `f351d479…0394`. I diffed the sources. The rebuild changed only `SIDES`, `RECORDS` text, `RECORD_PLAIN`, `TAG_MEANING`, `ACTOR_TYPE`, the rule-tag rendering and the records-table CSS. **No line behind any finding below changed.** The findings apply to both hashes. Line numbers are for the current `tools/s3/s3_data.py`; for the frozen copy, subtract 21 from any line after 115.
- **Browser suite, re-run independently with outputs written here.** The frozen `92974d81` page passed **148/148** (`one-pager-draft-3-browser-checks-2026-10-17.json`, `rerun-stdout.txt`, screenshots). The current `f351d479` page passed **149/149** (`current-f351d479/`). `checks/` was not touched by these runs.
- **Extra probe (`extra-probes.cjs`, `extra-probes.json`).** I clicked the eye on **every one of the 14 map stages, the two ways in included**, at 1000, 1100, 1280, 1440, 1600, 1759, 1760 and 1920 px, on both hashes. The open panel covered no part of the selected stage in any case, and there were no page errors. This goes beyond the Lead's test, which used 5 stages at 2 widths.
- **Read in full:** the data (`s3_data.py`: every activity, record, reuse example, map stage), views 5–7 and the notes and groups in `s3_views.py`, `s3_terms.py`, the J1 code in `build_one_pager.py` (`placePanel`), the change record, the brief, the framework, both earlier reviews and AIW-D239–D242 (plus D128, D157 and D243 for context). I inspected the Lead's map screenshot at 1440 for reading order, arrow routing and labels.
- **Team-source spot checks** against `sources/drive-snapshot-2026-10-13-1535` (AG-07 v2.9) and the `code/` copies: `agent/case:form-approve` held by Owner and Case Manager by default (SA6-D2, AG-07 L27); AG11-D9's four-eyes rule versus AIW-D157, where the team dropped two-person approval and the page follows the team, so they are consistent; "Signing room", "case wizard", "support ticket", "support queue", "government letter", "answer snapshot", `LEAD_RCIC` and "Immigration SME" all present in the team's documents.
- **Not done:** I did not run `build_one_pager.py`. It writes to the shared page and the ledger, so the structural checks and the content-preservation counts (2,139 / 1,534 / 461 / 144) are the Lead's report, not mine. Also not done: no new-reader trial, no screen reader, no Safari, Firefox or real device, no real form, PDF or portal run. The 22 scenario walks are part of the re-run suite and they passed. They check what the rendered text says; they do not run a workflow.

## Material finding

### C-M1. A signed file that does not match has three different return routes (R2 / M10 residual)

| Where | What it says |
|---|---|
| Map stage 8 decision, `s3_data.py:1563` | "Signed file does not match → **back to the representative (stage 7)**; approval not inherited". The representative is in **stage 8**; stage 7's actors are Platform, AI and Agent. |
| 9.3 rule, `:1203` | An unmatched signed file "**comes back to the representative**" |
| 9.4 rule, `:1239`; view 6 `X18 "Problem when signing?" → L6b "To 8.1 (view 4)"`, `s3_views.py:247–248` and its flow | An unmatched signed file "goes back **through 8.1** (fact verification, map stage 6) to the form's review and the representative's approval" |

There is a second problem in the same place. The map decision asks "Representative approves the final form?" but offers "Signed file does not match" as one of the answers. That outcome does not answer the question, and it happens after signing, not at approval.

**Why it is material.** This is the failure path R2 was meant to close. The earlier acceptance said a signed file that cannot be matched stays with the representative for the existing check. A developer or QA reader gets three different expected next states. Sending a file with **unchanged facts** through 8.1 is also wrong in itself: nothing is wrong with the facts, so there is nothing to verify there.

**Smallest fix (no new step, tier or service):**
1. **One route everywhere.** A signed file whose answers cannot be matched to the approved version goes back to the representative's check (9.3) and keeps no approval. If the check shows a changed answer, that new value goes to 8.1 as 'needs review'. A wrong value reported while signing, or a re-run check that blocks, goes to 8.1, as today.
2. **Split the map decision in two.** "Representative approves the final form?" (Yes / Returned → stage 7), then after signing, "Signed file matches the approved answers?" (Yes → submit / No → back to the representative; approval not inherited). Remove "(stage 7)" from the representative outcome.
3. **Update 9.4's last rule and its `ret`** (`:1227`, `:1239`) to name the three causes and their two destinations. In view 6, either route the unmatched-file branch to 9.3, or relabel the link so the destination is clear.

**Acceptance.** Map stage 8, 9.3, 9.4 and view 6 give the same destination for each of the three causes. The browser suite still passes.

## Disposition of the earlier findings

| Finding | Checker's result | Evidence |
|---|---|---|
| **J1** panel hid the selected stage | **Confirmed fixed** | `placePanel` now positions the panel against map stages too (`build_one_pager.py:920–929`). Probe: 14 stages × 8 widths × 2 hashes, no overlap. The suite's switching and Escape focus-return checks pass. The limit the Lead states (the floating panel below 1,760 px) is accurate. |
| **J2** retained verified value vs pending replacement | **Confirmed fixed** | Records `:104`, 8.1 `:1007`, 8.2 `:1037`, 9.3 `:1207`, 9.5 `:1266`, reuse example row 3, stage 5 callout. Two statuses are shown; approval and submission are held; unrelated work continues; stable facts get no review. |
| **J3** blanket "Nothing for that fact" | **Confirmed fixed** | Matrix rows 5–8 (`:228–232`): missing / still true? / proposed / conflict, each with its own pre-fill and readiness. They agree with 7.1, 7.2 and 8.1. |
| "Earlier case is never changed" | **Confirmed narrowed** | 7.1 `:898`, stage 4 `:1520`. |
| **R1** reason alone cleared a required document | **Confirmed fixed** | 7.2 `:934, :944`, 7.3 `:974–975`, 9.5 `:1255, :1263–1264`, the 9.5 example, the stage 8 callout and the view 6 note. A reason never clears an item; a person may accept readable evidence by looking at it; an exception must be an SME-confirmed disposition; expiry still only warns. |
| **R2** ordinary signing withdrew approval | **Core rule confirmed fixed; failure route not consistent → C-M1** | 9.3 `:1202–1203` and 9.4 `:1226, :1236` keep approval through a verified link to the approved version. An arbitrary or changed signed file does not inherit approval. No new tier. |
| **R3** per-filing repetition in view 6 | **Confirmed fixed as a stated boundary** | The dashed group G6 (`s3_views.py:365`), the view 6 subtitle and end text, X15 "This filing decided?", the 9.6 rule `:1286` and the two-filings table `:1298–1303`. It is honestly described as a boundary, not executable multi-instance BPMN, which is acceptable for this artifact. |
| **8.3/8.4** unavailable meaning checker | **Confirmed aligned** | 8.3 exception `:1071`, 8.4 trigger `:1083`, ready `:1087`, rule `:1100`, view 5 note. Grey is never counted as a completed review; hard checks still apply. |

## The 13 consistency findings in section 5 of the change record

| # | Checker's result |
|---|---|
| M1 forms added by a drafted rule | **Confirmed.** 2.1 trigger `:338`, 3.5 rule `:523`, 1.1 exception. *Minor:* the map's stage 1 example lists IMM 5476 as a base form (`:1484`), but 1.1's own source-set table (`:271–275`) does not. |
| M2 conflict vs needs review | **Confirmed.** Records `:104–106`, 8.1 `:1001`. |
| M3 three readiness points | **Largely confirmed.** *Minor residual:* 8.1 ready says it hands on no form with a missing or conflicting fact (`:995`), yet 8.2 renders forms with "needs a fact" / "blocked by conflict" fields (`:1026`, example `:1049`). Under either reading the form stops before filling or approval. Smallest fix: 8.1 ready, "a form whose facts are missing or in conflict may render, but stops at 8.4". |
| M4 submission re-check | **Confirmed.** 9.5 `:1266`, 9.3 `:1207`. |
| M5 unanswered 'still true?' | **Confirmed.** Records `:108`, 8.2 `:1037`, matrix row 6. |
| M6 status list and colours | **Partly.** The list is complete, but the 8.4 colour rule (`:1094`) holds two overlapping colour definitions joined in one sentence (a sweep or edit artefact). It also says a consistency flag is **red**, while 3.8 and 8.4's own example treat the lease-address consistency check as a **warn / amber**. And it puts 'needs review' (cannot be approved) in **amber** alongside warnings that *can* be acknowledged. 9.3's explicit rule still prevents approval, so this is minor. Smallest fix: one definition; red = block or meaning flag; amber = a warning to acknowledge; mark 'needs review' / 'still true?' as an amber **hold** that cannot be acknowledged away. |
| M7 one name for an AI-read value | **Confirmed.** "proposed from a document" (records `:95`, 7.3 `:972`). |
| M8 stage 3 decision | **Confirmed.** `:1501–1502`. |
| M9 unopenable source | **Confirmed.** 1.3 `:316, :328`. |
| M10 unmatched signed file | **Not consistent → C-M1.** |
| M11 who approves | **Confirmed** against the founder's AIW-D128 and D157 and the team (AG11-D9 superseded by the team's removal of two-person approval). *Minor:* the team's default holders of `form-approve` are **Owner and Case Manager** (SA6-D2). "Normally the case's lead representative" (`:1192`) and the TERMS line "the firm's licensed person who approves" are the page's own gloss. Add "(by default the firm's Owner and Case Manager roles hold it; licensed holders are preferred)". |
| M12 severity words; history gap | **Confirmed in 3.8** (`:601, :610`). *Minor residual:* CONTROLS still says "history gaps block submission **until explained**" (`:150`); make it "until filled with a recorded history entry and re-checked". |
| M13 "checklist item" meant two things | **Partly.** 3.3 now uses "document requirement line" in its output and example, but setup still calls source entries and drafted lines "checklist items": 2.2 io / accept / transfer / example (`:366, :375–376, :385`), 3.3 io / trigger / authority / exception (`:453, :456, :458, :470`), 3.5 ready and rule (`:516, :524`), 4.1 action (`:638`). The case meaning is unaffected and 3.3's `receiving` explains the change from line to item, so this is minor. Fix: about 10 strings → "source checklist entry" in 2.2 and 3.3 input, and "document requirement line" in 3.3 authority, 3.5 and 4.1. |

## Nomenclature and term-sweep regressions

- **The sweep is clean of retired terms in prose.** In `s3_data.py` and `s3_views.py` there are zero prose hits for release, package (the only hits are the official guide's quote "application package" and a code path), specialist (code comment only), value list, form copy, government message, support report or Pathway Configurator. There is no broken grammar from the regex ("a publish", "forms the value" and similar: zero hits). The SME sign-off phrases read correctly.
- **Sweep leftovers (minor).** A one-word string has no space, so the sweep skipped it: table headers **"Copy"** in the 9.3 and 10.3 examples (`:1212`, `:1368`) should read "Form", and the 8.1 example cell **"confirmed"** (`:1011`) should read "verified". The actor sub-label for the lead representative reads "RCIC, lawyer or paralegal" (`:39`), but Who-is-who reads "RCIC, lawyer or notary, or paralegal" (`:58`); use the team's three types in both.
- **Term map not fully applied (minor, honestly marked).** The term map recommends the team's "Case › Forms › Approve form" for approval and "Case › Lifecycle" for government letters (`checks/one-pager-nomenclature-2026-10-17.md` rows at L87 and L89). The page keeps "Form check view › Approve" and "Case › Government letters", marked proposed. Either adopt the team's names or record why they were kept.
- **Spot-checked claims hold:** see "What was reviewed". The Immigration SME role is correctly marked proposed, with a build gap and a proposed team change. The Critical-warning conflict is shown, not settled.
- **Minor over-absolutes:** 6.3's accept and its "Same person" example say "only 'still true?' items are re-asked" (`:863, :872`). 7.1 and the matrix also ask missing facts, unresolved differences and new-service eligibility questions. Add "plus missing facts and differences".

- **More leftovers, found in the rendered text** (`rendered-text-f351d479.txt`). These are page strings written in the builder, which the sweep never touched, plus one in D243's new text. Evidence intro: "approved **release** criteria"; Evidence column header: "Approved **release** criterion" (the data says "acceptance criterion"). Case types intro: "Same engine and **package** shape". Technical-view matrix, Government row: "(**messages**)". View 5 end text: "**messages** to the case". D243's new records line: "The **master** library" (the sweep maps "master library" → "library"). Fix: run `norm()` over the builder's page strings too, and re-run the retired-terms check on rendered text, not on the data alone.

## D243 regression check (current hash `f351d479…`, at the Lead's request)

- **Actor-type brackets** (views 1–7 and the technical overview): present, readable and correct for each pool. Views 1, 3 and 7 show System and Super Admin; views 4–7 show Firm · agency and Client. Hovering explains each one (`visual/tip-atype.png`). *Minor:* the technical overview labels the Expat Ready pool's bracket "EXPAT READY", but its tooltip says "Super Admin actors" and every other view says "SUPER ADMIN"; use one word.
- **Lane tags** show names only; role and duties appear on hover (`visual/tip-lanetag` in `capture-log.txt`).
- **Shared records table, desktop:** good. The plain-words line comes first, the tag key is clear, every tag explains itself on hover, and the Read by / Changed by activity numbers open the right card (the suite's new check passes; `visual/1440-light-records.png`, `1440-dark-records.png`). **At phone width it breaks: see VM-2.**
- **"One version at a time"** matches the team's model. `CountryPackVersion` (`code/ERv2-sanitized@b48e4ce-2026-10-15/apps/api/prisma/models/country-pack-core.prisma:190`) allows one published version per country at a time. *Minor:* say "the country's pack version" to match the team. 5.3's rule "imported as one **pathway** version" now reads oddly beside it; check it.
- **No behaviour regressions:** 149/149, and the J1 probe is clean on the new hash.

## Visual and aesthetics review (founder's request)

**Method.** `visual-capture.cjs` takes 142 screenshots in `visual/`: 21 sections × 1440, 1280 and 375 px × light and dark, plus 9 tooltip close-ups. For element captures only, the sticky navigation is set to static so it does not cover the top of each shot. I inspected by eye: every 1440-light section; the 1440-dark map and records; the 1280 map; and the 375 intro, map, stage panel, view 5 list, records and evidence (crops `visual/crop-*.png`). The other dark and 1280 shots are saved but were only spot-checked. At 1280 the map lays out the same as at 1440.

**What works.** The map reads as one professional surface. It has consistent card style, band tints and badges; numbered stage circles; one arrow rail with every handoff labelled; decisions marked with a bar and an icon; dashed borders used only for the shared-record rail. Colour never carries meaning alone: tags, sides, bands and actors are all words that are also coloured. The type hierarchy is clear: stage titles bold, section labels in small capitals, secondary text grey. The eye sits in the same place on every card and task, and each mark has a working tooltip (eye, side tag, actor bracket, lane tag, gateway, rule tag, activity link, map decision mark: `visual/capture-log.txt`). The gateways are smaller (32 px) with grey labels, as the founder asked. Dark mode keeps the diagram panels light and the page readable. On the phone, the map stacks with downward arrows, the panel becomes a full-width sheet, and the BPMN views turn into readable lists.

### Material visual findings

**VM-1. Labels collide with lines and marks in BPMN views 3–7 and the technical overview.** Flow lines run through gateway questions and event labels, and task marks sit on top of task names. The change record says these collisions were fixed; they were not fixed everywhere. Worst instances:
- **View 6** (`visual/1440-light-view6.png`): "Problem when signing?" is crossed by a flow line. The group's dashed border runs through "Acknowledgement, requests, decision". **"This filing decided" spills past the pool's right edge.** "Form approved (each)" and "Government letter" are crossed by message lines.
- **View 5** (`1440-light-view5.png`): "Form edition supported?" collides with "Yes". "Review result", "Correct", "Agent takes it back", "Raise a support ticket", "Replaced after adoption" and "Support ticket (wrong mapping, or form not yet supported)" are each crossed by a line.
- **View 3** (`1440-light-view3.png`): "Corrections?", "All confirmed?", "Published?", "Pack version published" and "New version published (open cases adopt it, view 7)" are crossed by lines.
- **View 4** (`1440-light-view4.png`): the repeat mark sits on the last word of 7.2 "documents" and 7.3 "document". The 8.1 note overlaps the flow line and its "Yes" label. "Required facts available?" is crossed.
- **View 7** (`1440-light-view7.png`): 10.2's sub-process "+" sits on "publish change". "Support ticket", "New version published", "When a published change affects this case", "Prepare affected forms again" and "Waiting form replaced" are crossed.
- **Technical overview** (`1440-light-tech-overview.png`): "Support ticket" is struck through by its own message line; "Prepare this form" and "Form approved or fact to correct" are crossed.

*Why material:* question labels with lines through them look broken, and in view 6 they hide part of a decision. *Smallest fix:* move the individual labels using the offset options the view data already has (`lab`, `dx`, `wp`). Lift multi-instance and call marks below the task text, or give those tasks one more line of height. Then add a browser check that no label's box intersects a flow line or another label, so it stays fixed.

**VM-2. At phone width the Shared records table is crushed and its text overlaps (a D243 regression).** `visual/crop-375-light-records-0.png`. The new `table.rec{table-layout:fixed}` with columns at 14 / 44 / 21 / 21 % gives the record name about 48 px. "Published pack version" runs into the next column; a probe counts 6 overflowing cells (`phone-tables.cjs`). The activity numbers stack one per line, which makes the table about 2,900 px tall. *Smallest fix:* below 700 px, drop the fixed layout and show each record as a stacked card: name as the heading, then the plain line, "what it holds", and the Read by / Changed by numbers in wrapped rows. Or at least use `table-layout:auto` with a minimum width on the first column inside the existing sideways-scroll frame.

### Minor visual findings (polish)

| # | Where (screenshot) | Finding | Smallest fix |
|---|---|---|---|
| V1 | Who is who; map "Who acts" (`1440-light-who.png`, `-map-setup.png`) | Single-item lists are numbered ("1. Prospect, then client", "1. Government", "1. AI", "1. Agent") | Number only when there are two or more |
| V2 | Who is who headers (`1440-light-who.png`) | "Expat Ready · Super Admin console" wraps to two lines, so that column's badge and description start lower than the others | Shorten to "Super Admin console" (the badge says Expat Ready), or give headers a fixed height |
| V3 | Terms strip (`1440-light-intro.png`) | Four uneven columns: label widths differ, definitions wrap three lines beside an empty column, and row 2 does not line up with row 1 | A two-column grid with a fixed label width |
| V4 | Map side tags (`1440-light-map-setup.png`, `-map-change.png`) | "SUPER ADMIN" wraps under "Content publisher" but sits inline after "Immigration SME"; Platform and AI carry no side tag although Who is who names a System side | Always place the tag on its own line (or always inline, no-wrap); show "SYSTEM" for Platform and AI, or say why it is omitted |
| V5 | Map decisions (`1440-light-map-setup.png` stage 3; `-map-case.png` stages 6, 8) | The outcome-label column width changes between decisions in the same card; long outcome labels wrap to 3–5 lines ("Yes, and every form of the filing approved"; "'Needs review' or 'still true?'") | Shorter outcome labels (C-M1's split fixes stage 8); one label width per card |
| V6 | Setup and change bands (`-map-setup.png`, `-map-change.png`) | Large empty areas: the End marker takes a fourth column, and stage 3 is twice the height of stages 1–2 | Optional (natural height was the founder's choice): a narrower End column |
| V7 | Change band arrow (`-map-change.png`) | "New pub-lished version" is hyphenated mid-word | `hyphens:none` on arrow labels |
| V8 | Dark map (`1440-dark-map-case.png`) | Actor names lose their actor colours in dark mode (all white), unlike light mode | Lighter tints of the actor colours in dark mode |
| V9 | Stage panel (`1440-light-panel-stage5.png`) | The panel's "Good to know" callouts are large plain bullets with no heading, unlike the map's chevron style | Reuse the map's callout style and heading |
| V10 | Technical overview (`-tech-overview.png`) | Two "Diagram symbols" controls, a disclosure and a button, one above the other | Keep one |
| V11 | View 5 and view 4 notes (`-view5.png`, `-view4.png`) | The 8.3 "AI checker unavailable" note sits in the Lead representative lane by the lane label; the view 4 note overlaps a flow | Move the 8.3 note into the AI lane beside 8.3; nudge the 8.1 note clear of the flow |
| V12 | Controls chip flows (`1440-light-controls.png`) | "At setup" and "At case time" wrap so that a line starts with an arrow | Keep each arrow attached to the chip after it (no-wrap) |
| V13 | Phone tables (`crop-375-light-evidence-0.png`) | Controls, Case types, Evidence and the matrix scroll sideways inside frames (no content lost) but give no visual cue; columns are cut mid-word at the edge | A right-edge fade or "scroll →" hint; or stack these tables on phones |
| V14 | Tooltip (`tip-probe.cjs`) | In headless Chrome a diagram tooltip stayed visible after a wheel scroll with no pointer movement. **Not verified** in a real browser; my first capture showed it covering view 1 and view 3 labels | Hide the tooltip on any scroll event (capture phase, scrolling containers included) |

## Six lenses (expert judgements, not measured probabilities)

| Lens | Lead | Checker | Reason and smallest next action |
|---|---:|---:|---|
| 1. Solution quality | 8.5 | **8.5** | Simple, coherent design. The readiness and lifecycle holes (R1, R2 core, J2, M1) are closed with no new component. Next: real-form evidence, not this artifact. |
| 2. Completeness and precision | 8.5 | **8** | One contradictory failure route (C-M1). M13 and M6 only partly fixed; small M3 and M12 residuals. *Fix inside the artifact:* C-M1, then the minor list (about 25 strings, no structural change). |
| 3. Readability | 8.5 | **8** (visual **7.5**) | Content: the map comes first, plain labels, decisions written as questions, terms explained on first use. Long, but the founder accepts justified scrolling. Visual: the map and cards look professional, but VM-1's label collisions and the V1–V5 alignment polish keep it below 8. *Next:* VM-1, V1–V5; then a 10-minute new-reader walkthrough (not done). |
| 4. Usability | 8.5 | **8** (visual **7.5**) | 148/148 and 149/149 reproduced; J1 confirmed on every stage at 8 widths; tooltips work on every mark. VM-2 makes the records table unusable on a phone. No touch tooltips; floating-panel limit below 1,760 px. *Next:* VM-2, V13; then a real device and a screen reader once the page is frozen. |
| 5. Honesty and transparency | 9 | **8.5** | Tags, proposals, build gaps and evidence limits are exemplary. But the change record says M10 and M13 are "Fixed" when they are partly fixed, and D241's "every name from the team" is not fully met (two proposed screen names kept, which is honest on the page). *Fix:* correct the dispositions in the change record. |
| 6. Implementation feasibility | 7 | **7** | XFA filling, portal capture, read-back of final files and AI accuracy are unproven. This is stated, with fallbacks. *Needs evidence:* the planned real read; it cannot be fixed in the artifact. |

**Headline assessments:** best solution **8.5** · best communication **8** (8.5 once VM-1 and VM-2 are fixed) · best high/medium requirements **8** (8.5 once C-M1 and the M6/M13 residuals are fixed). Not 9: no reader trial yet, and feasibility depends on the real read. Neither is a cosmetic gap.

## For the Lead (local fixes, in order)

1. **C-M1** (material): one route for a mismatched signed file; split the stage 8 decision; align 9.3, 9.4 and view 6.
2. **VM-2** (material, D243 regression): the phone layout of the Shared records table.
3. **VM-1** (material, visual): the label-placement pass on views 3–7 and the technical overview, plus an automated label-collision check.
4. Minor, in one pass: the M6 colour rule; the M13 setup strings; the M3 8.1 ready wording; the M12 CONTROLS wording; "Copy" → "Form"; "confirmed" → "verified"; the representative types; 6.3's "only 'still true?'"; IMM 5476 in 1.1's source table; the M11 default holders; the builder-string leftovers (release, package, messages, master); the change record's M10 and M13 dispositions; V1–V14 as time allows.
5. Re-run the browser suite. A targeted checker recheck of C-M1, VM-1 and VM-2 then closes acceptance; the minor items need no checker round.
