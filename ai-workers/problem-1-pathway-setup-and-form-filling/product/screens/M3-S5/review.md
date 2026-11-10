# M3-S5 review: answer sheet for online-only forms (PR #1507, commit 8648d869a)

Reviewer: independent session, did not build it. Isolated copy `rev_m3s5` on :4457 (configured checkpoint, ~2 min load), stopped after use; never :4400. Live AI off, US$0. Concept: the BACKLOG row (no `concept.md` for M3-S5). Journey test: `journey-test-reviewer-2026-11-10.md` (score **8/10**).

**Verdict: Block** (one Major; fix list at the end). Ship after fixes: the mechanism is right, the Major is a small change.

## What holds (evidence)
* **Rule moved from code to data:** `ANSWER_SHEET_ONLY` is gone from `contracts/forms.ts`; `engine/channels.ts:66` `answerSheetOnly` reads the Form library's record for the release's account (else ANY) through `allowedChannels`, the same rule the Forms tab uses (C-3). No form number, program or key in engine/API code.
* **B164 guard** (#1501's `check_b164_no_engine_keys.ts`, run against this tree): the only finding from this PR is that the `M3-S5 … fill-case.ts` ALLOW entry is now stale. That is expected, and the list gets shorter. Whichever of #1501 and #1507 merges second must drop it. The other hit (`engine/runtime/filings.ts:36 VISITOR_FEE_SOURCE`) is already on origin/main, so it is not this PR's.
* **Constraints:** `prisma/schema.prisma` and `api/src/case-prepare.ts` are not touched. Graph `--check` exits 0.
* **Tests:** the API test passes 17/17 on my copy (its checkpoint-load step was skipped because the checkpoint was already loaded). It fails on the old code: R3 "pdf_copy false after the record" fails because the old rule needed `IRCC_SECURE_ACCOUNT`, and this release has no account. It also fails when the `generate` check is removed: the reason regex stops matching. The pure test fails if the account is ignored or if `copyOnlyForms` ignores `accepts`.
* **No regression on the Visitor visa:** vv.single (APR_PORTAL) has no Online lines and no APR_PORTAL or ANY Online-only record. Its cases list every PDF form with its copies, unchanged.
* **Express Entry:** behaviour is unchanged on the checkpoint. pnp.express_entry's release has no account, so IMM 5669 and 5406 still get a copy, as before. The founder's IRCC_SECURE_ACCOUNT records now load as FOUNDER_SAMPLE.
* **P-170:** the 4 PR Portal records load as SAMPLE_FIXTURE with the Guide 5289 line. The page is in `canada/index.json` and is replayed by FixtureCanada, and the quote is on it.
* **Deliberate choices:**
  * (1) Portal order = C7.3's printed parts in field order. The sheet says so ("until the portal's own screens are recorded (W6)"). Accepted.
  * (2) The generalisation is supported by P-113 ("The library records what IRCC accepts per portal"; portal-only forms get "a checked answer sheet") and by P-171 (3)'s reason. The record is account-wide, though the quote comes from one program's guide (Guide 5289, spousal sponsorship). That is acceptable as Sample, but say so in the record note.
  * (3) ANY when the release has no account matches C-3. Accepted.
  * (4) A person's reason is stored with the "Set by a person:" prefix, so its origin shows. An IRCC line shows with no source: see m3.
* **`generate` refusing only on ONLINE is right:** for a PDF upload or Paper channel the PDF is the deliverable, and the frozen release (validated against the record at release) decides. The old by-form refusal would have blocked a PDF line the release says to file. Gaps around it: m1, m4.

## Issues
**M1 (Major, Must). A "Copy, not for filing" made before the record disappears from the case.** `api/src/fill-case.ts:197` and `:206`: `pdf` now depends on live library data, and the loop only lists forms in `pdf`.
* Scenario (run on :4457): case ACC-mwb0y430-047r, IMM 5406 Online. "Download PDF copy" makes a copy (GENERATED, `copy_not_for_filing: true`). A second person then approves "IRCC accepts IMM 5406 only Online" in the Form library.
* Result: `GET /runtime/cases/:id/forms` no longer lists IMM 5406, while `form_instance` still holds 1 row. The Online line says "with no PDF copy" although one was made, and the officer can no longer see or download it.
* This breaks the project's own rule at `fill-case.ts:207` ("a form that stops applying keeps its copies in view (break M4)"). The old hard-coded rule could not change after copies existed.
* Fix: list a form that has copies even when it is no longer in `pdf`. Mark them as made before the record, as the copies of a form that stopped applying are. The Online line must not say "no PDF copy" while one exists. Add a fail case to `check_m3s5_online_only_api.ts`.

**m1 (Minor, Should). The list and the action disagree for a PDF line moved to Online.** `fill-case.ts:254`/`:259` `hasPdf` ignores the record, but `:306` refuses.
* Scenario (run): pnp.express_entry release, IMM 5562 PDF upload. The record "ANY: only Online" is approved, then the officer moves the person's IMM 5562 to Online (`PATCH items/:id/channel` gives 200).
* Result: the Forms tab shows "PDF copy, not for filing" and "Generate a copy", and pressing it gives a 422 toast "…answer sheet only, with no PDF copy" (both on one screen: `r-generate-5562-refused-1024.png`).
* Fix: `pdf_copy` and the form row's copy offer for a person whose channel is Online should use the same `sheetOnly` test as `generate`.

**m2 (Minor, Should). No test for the rule "used only when the quote is on its recorded page".** Removing `finder.ts:870`'s `if (!said)` (or the `officialUrl` check) passes every test. The pure test reads the HTML file itself, not the finder path. Fix: a finder fail case with a fixture whose quote is not on the page ("not used", nothing recorded), plus the "waiting" note. Also untested: `generate` with a non-Online channel and a sheet-only record (`fill-case.ts:306`'s `channel === "ONLINE"` gate can be removed with no failure).

**m3 (Minor, Should). Provenance in the reason.** `engine/channels.ts:72` quotes IRCC's line with no source or date, and a founder record (no quote) is stated as fact with no "Sample" label (rule 4, P-170; BIC-15). `AcceptRecord.source_url` is at hand. Fix: add "(IRCC, Guide 5289, read 27 Oct 2026; Sample)" or "(the founder's record, Sample)".

**m4 (Minor, Should). Misleading words.** A person moved from Online to PDF upload on a form recorded Online-only gets 404 "has no PDF to fill in this case's release" (`fill-case.ts:308`), though IRCC's PDF is in the release.

## Scores (D1–D20; 1–5, evidence-only)
D1 4: the row is met, with a pass and a fail on Express Entry; M1 open. · D2 3: an existing copy is hidden (M1). · D3 5: one rule, shared with the Forms tab. · D4 4: m1. · D5 4: reload keeps state; the tick survives the record. · D6 4: the record has basis, line and date. · D7 N/A: no AI. · D8 4: breadcrumb and title on the sheet. · D9 4: "Open answer sheet" sits on the line. · D10 4: plain words; the reason sentence is long. · D11 4: worded 422 toast; tick toast. · D12 4: team pills and components. · D13 5: axe 0 and no sideways scroll at 1440, 1024 and 400 px and at 200 % zoom; keyboard tick works. · D14 4. · D15 5: sheet opens in 150–170 ms, case page in about 1.2 s with all panels. · D16 3: m2. · D17 and D20: simulated only. · D18 3: m3. · D19 4: the case reaches the sheet, tick and Online line on its own screens; the record is set through C11.18's own screen route (no scaffolding).

## BIC (case-side, §6)
BIC-15 **Partly**: each Online line shows its channel and its next step (answer sheet), but a PDF-copy offer contradicts the action (m1) and the source is not named (m3). Should. · BIC-18 Met: "Answer sheet only" pill and reason; no empty sheet. · BIC-19 Met (1440 and 1024 px screenshots). · BIC-20 Met (keyboard: 32 Tabs to the sheet link, 6 to "Entered in the portal", Enter ticks it, focus moves to "Take the tick off"; 2 px focus outline; 200 % with no sideways scroll). · BIC-13 Met: the refusal names the reason. · BIC-01–12, 14, 16, 17: N/A (not on this screen).

## Retrofit
Nothing new in the team's stack; the change is data in the existing `FormEditionAccept` table.

## Not checked
The C7.3, C7.7, C11.6, C11.7 and C1.6 packs: the builder is running them, and I was told not to re-run them. `check_forms_s4_runs.ts` needs the Mac's paths. Its regex for the founder's "wait for the form" note still matches as a substring after this PR's added "; IRCC's lines for … wait" clause, but I did not run it. A real screen reader. An intended user's walk (D17, D20).
For the Lead, not this PR: P-113 says Express Entry files in the APR Portal, while the founder's P-171 (3) records say IRCC_SECURE_ACCOUNT. The checkpoint's Express Entry release has no account, so P-171 (3) is not visible on the demo case. That is fixed by data on the next release, not by code.

Screenshots (reviewer, scratch, not committed): `/tmp/claude-0/-home-user-xpatready/03fe3e66-fb93-565c-af12-7e162f4de18e/scratchpad/shots/`.

## To fix before Approve
1. M1: keep copies made before the record in view, and do not say "no PDF copy" while one exists; add a fail case.
Should (or a follow-up row each): m1, m2, m3, m4.
