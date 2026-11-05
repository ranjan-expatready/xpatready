# C7.3 Portal sheet: independent challenge of concept r1 (5 Nov 2026)

Challenger: a fresh context that did not draft it (skill screen-concept §B). Read the concept, board, diagnosis, EXPERIENCE, STANDARDS §2,
QUALITY, the branch's API and engine, the pack, and origin/main 0722f53f7's case page. `freshness.sh` fails here (no `code/`): the team's
screens are **Unverified**; the team's requirements (2026-11-02) use the same word, "answer sheet".

## Verdict: Build after these changes
No Blocker. Five Majors, each fixable on the screen or with one small server refusal; no new response shape is needed.
## Objections
**M1 Section state and progress disagree with the server's Done rule.** *Needed for the proof.* Fact: Done needs every section
entered, current **and waiting for nothing** (`api/src/case-prepare.ts:273-274`); a tick is accepted with "Still to confirm" items
(`:463-485` never reads `waiting`). The concept's pills, its "2 of 8 sections entered" and a collapsed "Still to confirm" ignore that
(§4; §1 drops "waits for nothing"); the board's Education card offers the primary tick with 7 to confirm and nothing confirmed.
Example: the officer ticks a part with 1 answer unconfirmed: the sheet says 8 of 8, the case is not Done; once the answer is confirmed
the part turns Out of date and shows in the case's Out of date panel as "changed after they were finished". Fix: pill "Entered · 1 still
to confirm" (warn); progress counts parts entered and complete; "Still to confirm" open when n > 0; the tick's description says
"1 answer still to confirm: tick what you typed; confirming it later marks this part Out of date".

**M2 The out-of-date words need data the sheet does not carry.** *Needed for the proof.* Fact: a section has only `out_of_date: boolean`
and today's answers (`engine/runtime/answer-sheet.ts:17`); what was entered lives in `answer_snapshot.facts_json`, exposed only as the
Prepare view's `changes` (was, now, label, person) and only when the item does not wait (`case-prepare.ts:262-271`). §5's "<label> for
<person> is now <new value>" also breaks when a confirmed answer becomes unconfirmed: it moves to `waiting`, so there is no new value.
Fix: the page also reads `GET /runtime/cases/:id/prepare` (it needs it anyway: person, `portal_words`, `filings[].read_only` for BR-7),
marks each changed row by subject + fact with "was <old>", words a removed one "no longer confirmed: waits to be confirmed", and falls
back to "An answer here changed since you entered it" when `changes` is absent.

**M3 The journey's last step is visible nowhere.** *Needed for the proof.* Fact: no screen on main renders an item's `done` / `to_do`:
Out of date filters `out_of_date` only (`web/src/runtime/out-of-date.tsx:24`); the channel row shows channel, signature and what IRCC
accepts (`item-channels.tsx:76-89`). §1 ends "back to the case: the form reads Done". Fix: the Online row's "Open answer sheet" link
carries the item's `state` and the server's `reason` from the same Prepare read. No new shape.

**M4 An address or phone is one line to copy; the form prints each part in its own box.** *Needed for the proof.* Fact: `copyText` joins
an address with commas and a phone as "+1 5550100" (`answer-sheet.ts:44-48`), one answer per fact (`:88`), while the form fills each part
into its own box (`engine/field-format.ts:175` ANSWER_PARTS). Example: the officer pastes "4, 12, Sample Road, Sampletown, …" into the
portal's Street name box, then splits it by hand: typing again, and an easy wrong box. The portal's own fields are Unverified (W6). Fix,
screen only: a compound answer lists its parts, each with its word (`field-format.ts:226` PART_WORD) and its own Copy, in `copyText`'s
order; the one-line Copy stays. BR-3 says so.

**M5 A tick on a part not named yet is lost, silently, when the part is named.** *Needed for the proof if the checkpoint release has a
waiting part (P-334 (1) keeps unheaded parts waiting; Unverified for IMM 5257).* Fact: an unnamed part's key is `part_<id>`
(`api/src/form-parts.ts:33`); once accepted it takes the decided key, so its tick matches no section and is dropped (`answer-sheet.ts:94-98`):
Not entered again, Done goes back, no warning. BR-6's "name it on To review" also points the case officer (duties `case` only,
`api/src/core.ts:47`) at a studio screen. Fix: the server refuses a tick on a `named: false` part (409: "This part is not named in the
configuration yet; tick it once it is"), the screen shows no tick there (as the board already does), the note reads "Not named yet in
the configuration". Pass and fail in `tests/check_vv_answer_sheet.ts`.

**Minor.** m1 "Detail page" is not an EXPERIENCE §3 pattern: use Workspace (header with path, status, next action) and a trail
Cases › <case> › <form> answer sheet (§2.1), not a back link only. m2 The board uses one-off hex colours and system-ui: build with team
tokens, Inter and the shared Pill, Button, Notice (§1). m3 Name the link's home: the C11.6 row per person (it has the item id), not the
Prepare panel's OnlineRow (`forms.tsx:44-51`: per form, no item id). m4 States miss GET 409 "no parts in this release's configuration"
(`case-prepare.ts:499`) and 422 inactive item (`:493`); the POST 409s differ by problem `type` (`…/stale` → Reload, `…/recorded` → read
only, `api/src/submission-record.ts:26`): branch on type, show any other detail verbatim. m5 Repeated rows (`answer.row`) look identical:
show "Entry 2". m6 Tests: no browser pass/fail for BR-1, BR-2, BR-6; no scale or timing check (100+ answers, two reads, D15 under 1 s).
m7 No §4b best-in-class lines; the skipped layers (STANDARDS §2) give no reason. m8 The status cites `checkpoint-diagnosis.md` for 13/13,
but it records 2/13; 13/13 is only in commit e13f74047's message and PR #1075 says "To come": record the run (copy, commit, command, exit).
m9 The pack logs the C11.6 change's status instead of asserting it: make it a named setup check. m10 *Not built:* a mistaken tick cannot
be undone (EXPERIENCE §2.8): a follow-up row, not this build.
## What is sound
The server owns every rule; a tick carries `version` and a stale one is a 409 (`case-prepare.ts:471`); confirmed facts only (P-72); out of
date warns, never blocks (FQ-6); a recorded filing refuses under the case lock (C8.2-9); parts come from the release's configuration, no
form number in code (P-319); a client gets 403; the order note admits W6 is not built; one `aria-label` per Copy and a polite "Copied";
stacked rows at 390 px; who ticked comes from the firm list, as on the channel row. QA-153 and QA-165 stay open: the screen alone does not
make C7.3 Works.
## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Link + state on the Online row | `filing_item.channel`, sheet state | `GET …/cases/:id/prepare` items[] | channelOf; Done `case-prepare.ts:274` | browser: link on Online only; Done / To do words |
| Header: person, account, read only | case people, portal, `filing_record` | same Prepare read | C8.2-9 | browser: recorded → no tick |
| Sections, answers, Still to confirm | `proposal_item` parts, answers | `GET …/items/:id/answer-sheet` | `sheetOf`, `partsInFormOrder`, `formPartsOf` | C7.3-3…6; browser BR-1, BR-2 |
| Copy, parts of a compound answer | `answer.value` | same | `copyText` | browser: clipboard per part and whole |
| Entered in the portal | `entered_section` + `answer_snapshot` | `POST …/screens/:key/entered {version}` | 409 stale / recorded | C7.3-9…11; browser Reload |
| Out of date marks | `answer_snapshot.facts_json` | Prepare `items[].changes` | `factChanges`, FQ-6 | C7.3-12/13; browser |
| No tick on an unnamed part (M5) | `proposal_item.status = waiting` | POST refusal (new words, no new shape) | M5 | `check_vv_answer_sheet.ts` pass + fail |
## Questions (recommendation first)
1. **Own page or dialog? Own page (agree).** A dialog traps focus on the case page; the officer keeps the sheet open for an hour beside the
   portal, often in a second window, and returns after a reload. A route does that, as `:id/eligibility` already does (`cases.tsx:67`);
   EXPERIENCE §2.3 is about editing a record, and this is a working view. Make the link a real link so it opens in a new window too.
2. **Accept the case-side C11.6 change as the checkpoint path for P-322 until release 2? Yes, with conditions.** It is a product step a
   person takes today on "How each form is filed", inside what IRCC accepts (VV-R02 "You must apply online"), recorded with who and when;
   the pack already prefers a released Online line, so release 2 takes over by itself. Conditions: qa's row names the path ("Works on the
   checkpoint through the case's channel change, C11.6"); the browser walk starts with that change on the channel row; m9's assertion;
   the tech lead tells the founder, since it reads P-322, a founder decision.
3. **M5: refuse a tick on an unnamed part (recommended), or carry ticks across naming by proposal id?** Refusing is one check and honest
   (Done waits for the name); carrying needs a key map the API does not hold.
## Lead response
**Builder (runtime lane), concept r2:** M1–M4 and m1–m7, m9 taken into `concept.md` r2; M5 built in #1075 (server refuses a tick on an unnamed part, `tickRefusal`, pass and fail in `check_vv_answer_sheet.ts`); m8 recorded in `checkpoint-diagnosis.md`; m10 a follow-up row. The tech lead's ruling goes below.
## Agreement
## Build discoveries
