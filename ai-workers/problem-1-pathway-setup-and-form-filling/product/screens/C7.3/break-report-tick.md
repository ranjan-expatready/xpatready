# C7.3 "Entered in the portal" tick (P-401, QA-323): break report

PR #1430, head 58050bf91 (branch claude/dazzling-hamilton-f9cdyt). Isolated copy http://127.0.0.1:4441, database
xr_studio_scr_c73 (configured checkpoint, built from this head). Never :4400. Live AI off, US$0. Own case "Sample Client
BrkA" (case d7fcf8ac…, IMM 5257 item cdc1badf…, 9 sections) set up with `acceptance/lib/c73.ts` `onlineItemOf` and
`fillEverything`. The PR's own pack `C7.3-tick.test.ts 4441 xr_studio_scr_c73` gives 12/12 on the same copy.
Line numbers are at 58050bf91: `api/src/case-prepare.ts` (cp), `web/src/runtime/answer-sheet.tsx` (as).
Scope: the PR's list (untick API, `changes`/`unticked` on the sheet, the tick controls, the progress words).

## Verdict: 1 Major, 7 Minor. No Blocker.

## Findings

**M1 (Major) A malformed reason takes the tick off, then answers 500 with no audit line, and the sheet blames an older untick.**
* Repro: tick a section, then `POST /api/runtime/items/<item>/screens/personal_details/unentered` as user-O with
  `{"version":"<v>","entered_at":"<at>","reason":"abc \ud800 def"}` (a lone surrogate, valid JSON).
* Expected: 400 on the reason field, the tick kept (the shared `Reason` schema at cp:62 already refuses `[\ud800-\udfff]`).
* Actual: 500 "Something went wrong on the server". `entered_section` row 12:53:18.879 got `superseded_at`
  12:53:19.106 and the sheet shows the section as not ticked. `audit_event` has no `unentered` line for it (3 lines, 4
  unticks). The sheet's "Tick taken off by … Reason: …" then shows the untick before it (12:53:18.660, another reason)
  as if it explained this removal.
* Cause: `UnenteredBody`'s plain-text refine (cp:71) is a weaker copy of cp:62. It leaves out lone surrogates and the
  Hangul fillers U+115F/U+1160/U+3164/U+FFA0 (reason `"aㅤㅤ"` is accepted, 200). Also, the write commits
  (cp:765-770) before `audit.log` (cp:772) runs outside the transaction, so any failure in the audit write leaves the
  change made and the record of who did it and why missing. That breaks R2 ("the audit line holds who, when and the reason").

**m1 (Minor) A line break in the reason is refused as a "hidden or control character".**
* Keyboard walk at 1024 px: open "Take the tick off Personal details", type "Ticked by mistake", Enter, "second line",
  Tab, Enter. The field reads "Write the reason as plain text: it holds a hidden or control character."
* The control is a 2-row `<textarea>` (as:245) that invites Enter, and a pasted note keeps its line breaks. `\n` and `\t`
  fall in `\u0000-\u001f` (cp:71). Either accept line breaks or say "Write the reason on one line".

**m2 (Minor) After a 409 "not ticked" and Reload, the reason form stays open on a section that has no tick.**
* Two windows at 1024 px. In B, open "Take the tick off Contact information". In A (API), take that tick off. B submits:
  the warn notice and Reload show (correct). After B clicks Reload, the card shows "Tick taken off by … Reason: Other
  session" and still shows the reason box with "Take the tick off" / "Keep the tick". The "Entered in the portal" button
  stays hidden until "Keep the tick" is pressed (as:207 `reload` never clears `asking`; as:242 renders the form first).
  Screenshot: /tmp/claude-0/-home-user-xpatready/9f3706f5-374a-5b3c-b6c2-d040386104bd/scratchpad/brk/shots/b-after-reload.png

**m3 (Minor) A long unbroken reason makes the whole page scroll sideways.** Reason of 200 "Ä" + 200 "ذ" (accepted, 400
characters): the `data-unticked` line runs out of its card. Document scrollWidth is 3031 px at 1024 px and 3023 px at
512 px (200 % zoom). as:236 has no `[overflow-wrap:anywhere]`, which the item reason uses at as:93. The was/now `mono` spans
in the change list (as:232) have the same lack of wrapping (seen in the code; not reproduced, because confirmed answers are
short). Screenshot: …/scratchpad/brk/shots/wide-1024.png

**m4 (Minor) The progress words say "Every section is ticked" while the item is To do, waiting for a fact.** Every section
ticked, and one answer in Personal details changed and not confirmed. The header reads "Every section is ticked 'Entered in
the portal'" next to "To do · Waiting for 1 fact to answer or confirm". The old line counted only complete sections
(concept §3 BR-8: "progress counts only complete sections"). The new count (as:80, as:95) drops `waiting`, so on its own it
reads as finished. The words are true, but the header now disagrees with the item's state.

**m5 (Minor) `entered_at` is optional, and when it is malformed the error gives the wrong reason.**
* Without `entered_at`, a stale untick removes a tick made after the caller read the sheet. With 6 unticks and 6 ticks
  in parallel and no `entered_at`, every untick returned 200 or 409 against whatever tick was current. The check runs
  only `if (b.entered_at !== undefined)` (cp:768). The screen always sends it.
* `"entered_at":"banana"` or `""` gives 409 "was ticked again since you read the sheet": the date is malformed, but the
  error says the sheet changed. A number or `null` gives 400 "Invalid input: expected string, received number" (Zod's
  default words, not the product's).

**m6 (Minor) Problem type and wording on the untick 409s.**
* "Not ticked" is `refuse(409, "section", …)` (cp:767): type `…/validation`, title "Some details need fixing" on a 409.
  The screen only shows Reload because of a regex on the words (as:218, `/changed since|ticked again since|not ticked/`).
  Concept §4 m4 says POST 409s branch on the problem `type`.
* The recorded refusal (cp:756, :766 into `submission-record.ts:28`) reads "…so it is read-only: Unticking "Entered in
  the portal" for IMM 5257 is not changed." That sentence is ungrammatical; the tick's version reads correctly.

**m7 (Minor) Accessibility and scale details.**
* On an out-of-date section the visible text is "Entered again in the portal" but the accessible name is "Entered in the
  portal: <title>" (as:256). The visible label is not part of the name (WCAG 2.5.3, voice control).
* Every sheet read (and every tick or untick, which call `sheet()`) now runs an unbounded `audit_event` query by
  `entity_key` (cp:713). The only index is `(workspace_id, at)` (prisma/schema.prisma:1201). EXPLAIN shows a Seq Scan
  over the whole table (6,663 rows, 1.4 ms here). The cost grows with all case activity in the workspace, not with this item.

## What held
* Roles: user-S (another firm) got 404 "No such case." on both the untick and the sheet read. user-P 403, user-A/B/C 403
  ("works on configuration"), unknown actor 401. user-R and user-T (same firm, duty represent) can untick, consistent with
  `reach(…,"officer")` and the tick.
* Double untick race: 8 parallel unticks with the same `version`/`entered_at` gave one 200 and seven 409 "not ticked",
  one audit line, no current row left. The case row lock (`FOR UPDATE`) orders them. Ticks and unticks in parallel never
  left more than one current row.
* Validation: no reason, blank, number, array or object gave 400 "Say why the tick comes off". 401 characters gave 400;
  tab, newline (see m1) and U+202E (RLO) gave 400; punctuation only gave 400 "in words". A wrong `version` gave 409 and
  nothing changed. A body that is an array, a bare string or not JSON gave 400.
* Section keys: `nope`, a key with an encoded slash, upper case, a trailing space, `%00`, a 3,000-character key,
  `__proto__` and `constructor` all gave 404 "no such section". A key that is not a uuid gave 404.
* A recorded filing (`filing_record` row inserted on the filing, then removed) gave 409 `…/recorded` for valid, empty and
  unknown-section bodies alike, with 9 current ticks kept.
* Done and count words: with 9 of 9 ticked the item is `done`. After an untick it is `to_do` and the item says "1 of 9
  sections still to tick … Education", the same count as the sheet. A changed confirmed answer gives `out_of_date` and
  `changes` [{was "SAMPLE", now "BRKNEW"}].
* `unticked` is absent once a section is ticked again (all 9 checked). The lookup is per item id and workspace, so nothing
  crosses items.
* Activity feed: user-S reads 0 lines of this case; the client gets 403 "Activity is for staff". The case marker
  "on case d7fcf8ac" comes before "Reason:", so a reason that names another case cannot move the line to that firm
  (case-feed.ts "first marker wins"). Configuration people read the reason, as for every line (studio.ts rule, from before this PR).
* Keyboard and screen reader at 1024 px: Tab reaches "Take the tick off Personal details" (37 Tabs). Enter puts the focus
  in the reason box. Escape returns the focus to the button. After an untick the focus lands on "Entered in the portal:
  Personal details". The field error is `role="alert"` and linked by `aria-describedby`. No page errors. No sideways
  scroll at 512 px without long text.
