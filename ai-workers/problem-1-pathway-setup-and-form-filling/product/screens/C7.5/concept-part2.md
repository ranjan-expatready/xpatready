# C7.5 part 2 — the Review page: run card, AI findings, replay (concept, runtime lane, 8 Nov IST)

For the tech lead's approval after an independent challenge (P-223 (4); no board). Builds on part 1 (`build-notes.md`, the Review panel, #788) and the agreed design: `../M3-agent-view/concept-draft.md` BR-19 and board frame 13, `../M3-design-2026-11-04/rows.md` "C7.5", part 1's `challenge.md` (the page was deferred to part 2 "when it has a run card, rounds and agreement to earn its own place").

## 1. Job and journey
The case officer runs an independent AI review of one person's filled form before it goes out, and decides each finding beside the rules' own. Persona: case officer at an RCIC firm (the representative of record waives a CRITICAL). Journey: Prepare application → **Review** → Ready to file (C7.6). Decisions: P-141, P-164 (2) (the page follows AG-11 Checker), P-121, P-110, P-227, P-71, P-168, P-232, P-295.

## 2. Layers (what exists → what is new)
* Data: `review_finding` (part 1) already has `agreement`, `reasons`, `replayed`, `run_id`. **No new table**: a run is one audit line (forms, mode, run files, counts, cost; never a value or reason) and the run id on each finding.
* Engine (new, pure): `engine/runtime/form-review.ts` — the review sheet; rules on an AI finding; P-121 High/Low; fingerprint.
* AI: `p2/prompts/form-review.v1.md`, `form-review-check.v1.md`, `form-review-output.v1.schema.json`; the launcher admits the new input kind `review_sheet` (closed, plain lines, no representative fact), with the form's official inventory.
* API (new): `api/src/review-runs.ts` — plan, run, stop. Part 1's routes unchanged.
* UI (new): `web/src/runtime/review.tsx` — the page at `/cases/:id/review`. Changed: `findings.tsx` (AI rows show agreement and both reasons; "Open Review" link on the case page's panel), `cases.tsx` (one route line).

## 3. Business rules
* **BR-1 Cost first (P-110, P-227).** Before anything runs the card shows **Saved · US$0.00** (or why none exists) and **Live · about US$1.06, at most US$4.80** for IMM 5257, under the US$5 job cap (P-232). Live is disabled with the words "a live review is not allowed without the founder's Go" while the switch is off. Only Saved and Live are offered.
* **BR-2 What the AI reads.** The form's official text (inventory) and its **review sheet**: for each box that would be written, its caption, fact and value; never the representative's facts; never contact details (email, phone, fax: not what AG-11-69 cross-checks; fewer client data sent). The same values give the same sheet.
* **BR-3 Replay key.** A Saved run is found by the form edition and the sheet's checksum (and the prompt), never the PDF checksum. Other values → "No saved review of this form edition with these values yet".
* **BR-4 Two rounds (P-121).** A first round and a blind checker; High when both raise the same fact with the same severity and the rules pass; otherwise **Low with both rounds' reasons** (a round that raised nothing says so). No third round.
* **BR-5 Never made up (AG-11-70).** A finding must name a fact on the sheet and quote words found in that fact's value; otherwise it is dropped and the run says why.
* **BR-6 Life of a finding** is part 1's: acknowledge, dismiss, waive (CRITICAL, representative of record only). A dismissed AI finding is not raised again (same person, form, fact, quote); a finding whose quoted words left the form is resolved by the rules at the next run.
* **BR-7 Warns, never blocks (P-71, P-168).** An open AI finding is a warning on the filing's readiness.
* **BR-8 Stop (P-110).** A live run shows Stop; the round running now ends, nothing after it is sent.
* **BR-9 Stand-in SI-6** chip on the card and on replayed findings ("Replayed").

## 4. Layout (EXPERIENCE §3 "detail page with a primary panel")
Path: Cases › reference › Review. **Run card** (top): Person (select, people on the case), Form (select, that person's PDF forms with a printed edition, IMM 5257 first); two rows, each a radio with its price first — *Saved US$0.00 · replays the checked run of <date>* / *Live about US$1.06, at most US$4.80 · needs the founder's Go* (disabled, the reason under it); SI-6 chip; the four steps listed; primary button "Run review (Saved, US$0.00)". While running: the steps tick in order with a live region; Stop on Live. After: one result line ("Saved: 3 new findings, 1 already on the case. US$0.00. Each finding warns; none blocks Ready to file.") and any dropped finding with its reason. **Findings** below: grouped **per filing, then person** (filing label from Prepare), each row as part 1 plus, for AI rows: agreement pill (High / Low), "The form says “<quote>”" and the reasons (High: one; Low: Round 1 and Round 2). The case page keeps its Review panel, with "Open Review" in its header. States: loading, error with Retry, no saved run (Saved disabled with the reason), nothing filled (the reason, link to the Agent view), empty findings, made-up test runs (a banner on every line; test copies only).

## 4b–4c. Best in class and scorecard (case-side)
Tax-filing "review before you file" (one list, each item links to where it is fixed, nothing blocks unless the authority would reject); code-review bots (each comment quotes the line; two reviewers' disagreement shown, a person resolves). Taken: the quote on every finding; one list grouped by what is filed; the price before the button; agreement shown, never hidden. BIC checks: one clear next step (the run button names its mode and price) · errors at the field (reasons on their field) · numbers agree (the card's cost is the ledger's) · nothing typed twice (person and form pre-chosen) · keyboard and axe clean at 1440, 1024, 400 px · the rest N/A for a staff-only page with no client input.

## 5. Copy
Live disabled: "Live is off on this copy: a live review is not allowed without the founder's Go, approved by the tech lead with its cost stated first (P-295). Use Saved (US$0)." No saved run: "No saved review of this form edition with these values yet: it is recorded once, in a Live run the tech lead approves (P-295)." Low reasons: "Round 1: MAJOR · …" / "Round 2 (blind checker): raised nothing on this fact."

## 6. Contract and tests
`POST /api/runtime/cases/:id/review-runs/plan {forms[], subject}` → `{forms[{form, edition, boxes, sheet, sheet_sha256, saved{available, why, files, made_up}, live_usd, live_worst_usd}], estimate{live_usd, live_worst_usd, replay_usd: 0, remaining_usd, job_cap_usd}, stand_in: "SI-6", live_allowed, live_why, replay_available, replay_why, made_up, steps[], plan_sha256}` · `POST …/review-runs {forms[], subject, mode: replay|live, planSha256?}` → 201 `{run_id, mode, cost_usd, cancelled, forms[{form, from, run_files, added, kept, resolved, dropped[], note}], added, note}` (live: switch and plan checksum required, 409 otherwise; replay without a saved run: 409, US$0) · `POST /api/runtime/review-runs/:run/stop`. Tests: pack `acceptance/C7.5.test.ts` (16 steps; -6b onward wait for the real saved run); `tests/check_c75_form_review_engine.ts` (BR-2…BR-5, guard admit/refuse, one pass and one fail each); `tests/check_c75_review_runs_api.ts` (isolated copy, `STUDIO_MADE_UP_REVIEW_RUNS=1`: the pack's 16 steps on a made-up saved run, roles, 409s, dismiss not returned, resolve on change, two runs at once, audit without values, stub pass of the job US$0); `tests/check_c75_review_page_browser.cjs` (run card, run Saved, findings per filing then person, Low reasons, keyboard, axe, 1440/1024/400).

## 6b. Capability or scaffolding
All capability. The made-up run folder is test scaffolding, only on an isolated copy (`STUDIO_VAR` set), never p2/runs, labelled on every line.

## 7. Questions (for the tech lead)
1. Contact details left out of the sheet (BR-2). *Recommend:* keep (AG-11-69 scope, data minimisation; also the pack's sample email is a made-up family value the launcher refuses).
2. The job reads the 358 KB inventory with the sheet: usual about US$1.06, worst US$4.80 (US$2.40 run cap a round), not the plan's US$3.62. *Recommend:* accept; the inventory gives the form's own words and choices.
3. Page now (own route), panel kept on the case page with a link. *Recommend:* yes (rows.md Q2, P-141 "full pages").

**Ready:** pack named; row text in the M3 plan "Row C6"; decisions above answered except the three questions.
