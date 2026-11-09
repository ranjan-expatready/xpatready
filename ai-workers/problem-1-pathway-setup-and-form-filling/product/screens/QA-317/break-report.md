# QA-317 break report: the C7.3 answer sheet page and its link (adversarial, 9 Nov 2026)

**Tested:** commit `32b96f6ac` (PR #1393), on a clean git worktree of that commit, isolated copy `br_q317` on :4439 (configured
checkpoint: release 2 files IMM 5257 Online). Live AI off, US$0. The shared tree was being edited by the builder during the
run (uncommitted fixes for some items below, then commit `2900cea30`); nothing here was tested on those, so re-test them.
**Data:** case A `BRK-CASE-A` (Client A, Spouse A, Child A1, each with an Online IMM 5257 item), case B `BRK-CASE-B` (Client B);
Client A given a 100-character family name, a phone with extension, an address with parts missing; case A later filled by
`fillEverything` (72 answers per sheet). Scope: concept `screens/C7.3/concept.md` r2, §4 page and link (ticks are B4).
Evidence screenshots: `/tmp/claude-0/-home-user-xpatready/37584d57-c949-52fc-b2ab-1b4fc455b3e9/scratchpad/q317/` (pN-*.png; scratch, not committed).

## Findings

**F1 Major. Another case's sheet shows under this case's trail and title, and a sheet the Prepare view does not hold shows
anyway.** `answer-sheet.tsx:47-48,65,73,77,80` reads the sheet by item id alone and the Prepare view by the case id in the path,
and never checks that the item is on that case (or that the Prepare read worked).
* Steps: as user-O open `/cases/<case A>/sheet/<case B's IMM 5257 item>`.
  Expected: refused ("not on this case") or redirected to case B. Actual: trail `Cases › BRK-CASE-A › IMM 5257 answer sheet`,
  case A's "Filed through APR Portal" line, title `IMM 5257 answer sheet ·` (no person), no state or reason, and every row is
  **Sample Client B** with live Copy buttons. "Back to the case" goes to case A. The reverse (`/cases/<B>/sheet/<A's item>`)
  is the same. (p1-caseA-itemB.png, p2-caseB-itemA.png)
* `/cases/00000000-0000-4000-8000-000000000000/sheet/<A's item>` and `/cases/not-a-case/sheet/<A's item>`: the prepare read
  fails (404) and is ignored: the trail says "Case", the title has no person, and the sheet shows in full (p3-unknowncase.png).
  The same silence hides BR-7: a submitted filing whose Prepare read fails shows no "Submitted to IRCC" notice.
* A person who stops travelling: PATCH `/runtime/cases/<A>/people/<child> {"applies":false}`, then open the child's sheet
  straight away (stale link, bookmark or second window). Expected: 422 "Only a form on this application…". Actual: the first
  load shows `IMM 5257 answer sheet ·` with no person or state, because the sheet read ran before the Prepare read made the
  item inactive. Reload gives the 422 (p9-child-not-travelling.png). Same root cause: a sheet with no matching Prepare item
  is still drawn.
* Why Major: the officer copies one case's answers into the IRCC account they have open for another case. The page's own
  header vouches for the wrong case. Both cases are in the same firm, so the server rightly allows both reads. Only the page
  can catch it.

**F2 Major. With the clipboard refused, a part's Copy selects the whole one-line answer.** `answer-sheet.tsx:158` falls back to
`closest("tr").querySelector("[data-copy-text]")`, which is the row's one-line value even for a part button.
* Steps: Client A's sheet, Contact information. Make `navigator.clipboard.writeText` reject (a locked-down browser). Press the
  "number" part's Copy on the main telephone. Expected (concept §4): that part is selected for Ctrl+C. Actual: `+91 5551234567
  ext. 12` is selected and the screen reader hears "Selected: press Ctrl+C to copy". The officer pastes the whole phone into
  the portal's number field. The same happens for every address part (street name, city…) (p7-clip-refused-part.png).
  When the clipboard works, the part copies correctly (`5551234567`).

**F3 Minor. A link has no state beside it, and the links are not in the line's order.** Concept §4 (m3, M3) puts "Open answer
sheet" beside the item's state in words (Done · To do · Out of date), so the case shows the journey's last step.
`forms.tsx:60,67`: there is no state, and the links follow the Prepare items' order. On case A the line reads "for Sample
Client A, Sample Spouse A, Sample Child A1", but the links run Spouse A, Child A1, Client A (p4-online-line-A.png). The link
is also on the forms panel's Online line, not on the C11.6 "How each form is filed" row the concept names; the task brief
accepts that placement, so it is noted here only.

**F4 Minor. A sheet that is open does not see a channel change made elsewhere.** Open the spouse's sheet. In another tab or by
API (PATCH `/runtime/items/<item>/channel {"channel":"PDF_UPLOAD"}`, 200), move that form to PDF upload. The open page keeps the
form's sections, "To do" and three live Copy buttons with no notice, because `lib/api.ts:29` sets `refetchOnWindowFocus: false`.
Any navigation or reload then shows the right 409 ("IMM 5257 is filed as PDF upload…") (p8-stale-after-channel-change.png).
Minor because the page is meant to stay open beside the portal for a long time.

**F5 Minor (code reading, not reproduced). Every 409 gets the channel advice.** `answer-sheet.tsx:59` adds "Change how it is
filed under 'How each form is filed'" to any 409. The server's other 409 ("…parts are not set up in this case's release…
Ask the Lead", `case-prepare.ts:716`) would therefore point the officer at a channel change that cannot help.

**F6 Minor. Why an answer waits is shown only on mouse hover.** `answer-sheet.tsx:136` puts `why` in a `title` on the "To
confirm" pill. A keyboard, touch or screen-reader user never gets it, at any width.

## What held
* **Roles (API):** the sheet and prepare reads give 200 to user-O, user-R and user-T, 403 to user-P and user-Q (clients) and to
  user-A, user-B and user-C (configuration), 404 to user-S (another firm), and 401 with no actor or an unknown one. On the
  page, a client sees "This page is for the case officer" and no answer. user-S sees "No such answer sheet" with no data.
  A configuration person who opens a /cases URL is switched to the simulated officer by the older rule in
  `cases.tsx:50`, not this PR.
* **Malformed ids:** for a non-UUID item, a case id used as an item id, `..` or a trailing space, the page says "No such answer
  sheet" (404). An upper-case UUID opens the right sheet. `/sheet/` and `/sheet/<id>/extra` give "Page not found". A PDF
  upload item gives 409 in the server's words, with "Back to the case".
* **People:** the spouse's and the child's Online items each have their own link and their own sheet, with the right person in the title.
  When every person's item leaves Online, the line drops that person's link and name.
* **Text:** the server refuses control characters and right-to-left overrides, and non-English names are kept off the sheet
  (they carry problems), so nothing hostile reaches the page. The `<img onerror>` email was stored as text and never shown
  as markup. The page added no value the server did not send: every row's text equalled `copy_text`, and parts follow
  `copyText`'s order. A 100-character unbroken value and a 110-character street name wrap, with no sideways scroll at 1440,
  1024 and 390 px or at 200 % zoom on 1024 (512 CSS px). At 390 px the rows stack and each cell keeps its name.
* **Copy:** copying a whole answer and copying a part both put exactly the server's value on the clipboard. With no clipboard API at all,
  the row's value is selected and nothing crashes.
* **Keyboard:** the link has a visible 2 px outline and Enter opens the sheet. On the sheet, Tab goes trail, then each Copy in
  reading order, then each "Still to answer or confirm" summary. Back, forward and reload keep the right sheet and case.
  The browser console showed no page error and no React key warning on any run.
* **Budgets:** with 72 answers and 87 Copy buttons, the sheet read takes 0.07 s, the prepare read 0.24 s, and the first rows show in
  under 1 s (0.25 s once warm).
* **Server states:** a section ticked by API shows "Entered by Second representative (Sample), <time> · 5 still to answer or
  confirm". After the phone changed, it shows "Out of date" and the header gives the server's reason. Progress counts only
  complete sections (0 of 9).

Not tested: a hostile PDF upload, rules and a duplicate configuration. This page has no upload or configuration, so they are
out of scope. Not tested either: a submitted filing's read-only notice (it needs the C8.2 record path).
