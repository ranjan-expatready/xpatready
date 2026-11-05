# C7.3 Portal sheet: concept for the screen part (runtime lane, 5 Nov 2026, #1075)

Status: **concept r2 after the independent challenge (`challenge.md`: Build after these changes; M1–M5 taken), waiting
for the tech lead's approval (P-223 (4)).** The API it reads passes its pack on the configured checkpoint (13/13, two
fresh copies: `checkpoint-diagnosis.md` "After this PR").

## 1. Job and journey
* **Job:** the case officer types an Online form's answers into the IRCC portal, section by section, copying each
  answer, and marks each section "Entered in the portal" so the case knows what was typed and warns when it changes.
* **Persona:** the case officer (firm user, duty `case`). Never the client (403 today, kept).
* **Journey (J7 5.2, PACK-4 FQ-6):** case page › "How each form is filed" (C11.6, on main since #1056) › a form on
  Online › **Open answer sheet** › copy, type in the portal, tick each section › back to the case: the form reads
  Done when every section is entered and current, Out of date (warns only) when an entered answer changed.

## 2. Layers
| Layer | Today | New here |
|---|---|---|
| Data | `entered_section` → `answer_snapshot` (#358) | none |
| Rules | `engine/runtime/answer-sheet.ts` (sections from the form's own parts, PR #1075) | none |
| API | `GET /runtime/items/:id/answer-sheet` · `POST …/screens/:key/entered {version}` | none |
| UI | the Online row says "types it into the IRCC account from the answer sheet", with no way to open it | **the sheet page and its link** |

## 3. Business rules (all enforced by the server; the screen only shows them)
* BR-1 Only confirmed facts show a value (P-72); the rest are listed under "Still to confirm" with the person.
* BR-2 Sections follow the form's own parts as the release names them, in the form's order (`order_note` shown once).
* BR-3 Copy gives exactly `copy_text` (dates YYYY-MM-DD, Yes/No, an address on one line).
* BR-4 A tick sends the section's `version`; a changed sheet answers 409 → "Reload" notice, nothing ticked.
* BR-5 A changed answer after a tick: the section reads Out of date, shows the new value, and asks to re-enter and
  tick again (FQ-6, warns only; never blocks the filing).
* BR-6 A part not named yet (`named: false`, B78) shows its placeholder, "Not named yet in the configuration", and no
  tick: the server refuses one (409, challenge M5, built in #1075), so the form's Done waits for the name.
* BR-8 (challenge M1) Done is the server's: every section entered, current **and waiting for nothing**. A tick with
  answers still to confirm is accepted, so the section reads "Entered · n still to confirm" (warn) and progress counts
  only complete sections; "Still to confirm" is open when n > 0, and the tick says "n answers still to confirm: tick
  what you typed; confirming them later marks this part Out of date".
* BR-7 A recorded filing is read only (C8.2-9): no tick button, the server's words if tried.

## 4. Layout (EXPERIENCE §3 Workspace, challenge m1; team tokens, Inter, the shared Pill, Button, Notice (m2); `design/sheet-board.html` shows the parts, not the tokens)
* Route `/cases/:id/sheet/:itemId`, a real link (opens in a second window beside the portal). Trail
  Cases › <case> › <form> answer sheet; title "<form> answer sheet · <person>"; the IRCC account (`portal_words`);
  progress "2 of 8 sections complete"; the order note in muted text.
* The page reads the sheet **and** the case's Prepare view (challenge M2): the person, the account, `read_only`
  (BR-7), the item's state and reason, and `changes` (was, now) for the Out of date marks.
* **The link's home (m3, M3):** the per-person row of "How each form is filed" (C11.6, it holds the item id), on a
  form filed Online: "Open answer sheet", beside the item's state in words (Done · To do · Out of date, the server's
  reason), so the journey's last step shows on the case.
* One card per section, in order: title, state pill (Not entered · Entered by <name>, <time> · Out of date),
  a table of answers (Question · Person · Answer · Source · **Copy**), then "Still to confirm (n)" collapsed, then
  the button **Entered in the portal** (or "Tick again after entering the new answers" when out of date).
* A compound answer (an address, a phone; challenge M4) lists its parts, each with its word (`PART_WORD`) and its own
  Copy, in `copyText`'s order; the one-line Copy stays. A repeated row shows "Entry 2" (m5).
* Copy: a button per answer, `aria-label="Copy <label> for <person>"`; on click the text goes to the clipboard and
  the button reads "Copied" for 2 s (`aria-live` polite). No clipboard (old browser): the value is selected instead.
* States: loading skeleton · empty sheet (nothing confirmed yet: every section shows only "Still to confirm") ·
  409 not Online ("<form> is filed as PDF upload…", link back to "How each form is filed") · 409 no parts in the
  configuration · 422 inactive item · 403 client · 404. POST 409s branch on the problem `type` (m4): `…/stale` →
  Reload, `…/recorded` → read only; any other detail shown verbatim.
* 1440 and 1024 px; at 390 px the table becomes stacked rows. Keyboard: Tab through Copy buttons in reading order.

## 5. Copy
* Order note: the server's `order_note`, verbatim.
* Out of date, per changed row from `changes` (M2): "Changed since you entered it: was <old>." A row no longer
  confirmed: "No longer confirmed: waits to be confirmed." No `changes` in the read: "An answer here changed since you
  entered it." Then: "Enter the new answers in the portal, then tick again."
* Stale: "This section changed since you opened the sheet. Reload, check the answers against the portal, then tick."

## 6. Contract and tests
* Endpoints as built; no new shape. Tests: `tests/check_c73_sheet_browser.cjs` (new) on a fresh checkpoint copy:
  the walk starts with the channel change on "How each form is filed" (challenge Q2). Pass: open from the Online
  row, sections in the release's order (BR-2), only confirmed values (BR-1), copy puts `copy_text` (and each part) on
  the clipboard, tick shows who and when, "n still to confirm" (BR-8), Out of date with "was", Reload on a stale tick,
  the row reads Done when complete; fail: no link on a PDF upload row, client sees no sheet, recorded filing has no
  tick, an unnamed part has no tick (BR-6).
* Axe at 1440 and 390 px; one walk at 1440 px with screenshots; scale: 100+ answers, both reads under 1 s (m6).
* Best in class (§4b, m7): tax-filing interviews show a per-section "complete / needs attention" list with a jump
  link; bank onboarding copies one value per click with a visible confirmation. Both are kept here. Skipped layers
  (data, rules, API): built in #358 and #1075, nothing new.
* *Not built* (m10): undoing a mistaken tick, a follow-up row.

## 6b. Capability or scaffolding
Every element is the capability (P-33); nothing is a mock. *Not built:* the live portal's own screen order (W6).

## 7. Questions for the tech lead (recommendation first)
1. **Own page, not a dialog:** a sheet holds 8+ sections and 100+ answers, and the officer keeps it open beside the
   portal. Recommend the page.
2. **Until release 2 lands, the checkpoint path files IMM 5257 Online on the case (C11.6).** Recommend accepting
   that as product steps for P-322 (a person does it on "How each form is filed" today, inside what IRCC accepts,
   VV-R02), with the challenger's conditions: qa's row names the path, the walk starts with it, the pack asserts it
   (done), and the tech lead tells the founder since P-322 is the founder's. The release-line path takes over by
   itself once DEMO.md row 9 releases release 2.

## Definition of ready
Acceptance test `acceptance/C7.3.test.ts` (13/13 on the checkpoint) plus the browser check above; row text C7.3;
decisions: FQ-6, P-72, P-65, P-319, P-322; open: the two questions above.
