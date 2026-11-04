# C1.6 forms channel slice: break report (PR #870 at c74dbcda, 4 Nov)

Tester: qa (break), on an isolated copy `brk_c16` on port 4459 (web/dist built from c74dbcda), never :4400. Live AI off,
no priced button, US$0. Copy stopped at the end (database and files removed).
Scope: this folder has no concept.md, challenge.md or build-notes.md, only `plan.md`. So the scope is the plan's
"Gaps" 1–2 and the PR's "What changed": the Programs card and List row show each form's channel, with Online naming its
portal; the Forms tab says which account an Online line is typed into; three decision ids are removed. Gap 3 (the family
form follows the channel) is queued, so it is not a finding.
Data: Reset to the six, then the fixture (reset + load). Planted states were written to my copy's database only: 15
extra lines on Visitor visa covering all four channels plus 3 checklists, and one combination retired by SQL.

## Findings

| # | Sev | What I did | Expected | Actual | Where |
|---|-----|-----------|----------|--------|-------|
| 1 | Major | Reset to the six. Set Visitor visa to IRCC secure account and IMM 5645 to Online (the PR's own demo state). Opened Programs › List at 1024 px, then at 200 % zoom (1280 px screen = 640 CSS px, deviceScaleFactor 2) and at 1440 px screen = 720 CSS px | EXPERIENCE §29 (M): "1024 px and 200 % zoom work". The new information (the portal, and which forms go which way) can be read | At 1024 the channel column is 140 px wide (measured `clientWidth/scrollWidth` 140/232 and 140/443). It reads "Online · IRCC secure a…" and "PDF upload: IMM 5257…": the portal name is cut and 5 of 6 PDF forms are hidden. At 200 % zoom it is 50 px: "Onli…", "PDF u…". No form and no portal can be read. At 200 % of 1440 it is 100 px. With 22 lines all four groups read "Online…/PDF u…/Paper:…/Not ne…". The full text is only in `title` | `web/src/pages/programs.tsx:648` (the `flex-1` channels box beside the tag, inside the trail gridcell), `:554` (`truncate`) |
| 2 | Major | Fixture: "With an LMIA" is Live · Release 1, PDF only. As the author, set its account to IRCC secure account and its draft IMM 5409 to Online. Read the card and the List row. Then retired the combination (SQL `retired_at`, standing in for an approved retire) and read the row under the Retired filter | A row labelled Live · Release 1, or "Retired at Release 1", names how that release files each form. Release 1's snapshot has no channel for IMM 5409, so it is PDF upload (checked in `config_release.snapshot`). If it shows the draft, it says so | The card reads "✓ Live · Next release: 4 of 5 steps to do … Online · IRCC secure account: IMM 5409 · PDF upload: IMM 1295, …". The retired card reads "Retired at Release 1 … Online · IRCC secure account: IMM 5409". Both show the unreleased draft's channels as that release's. The account is the live combination value (`c.portalKey`), but the channels come from the draft snapshot, so one row mixes the two. A retired row has no next release, so its draft channels describe nothing. (The existing filing tag reads the draft too, but this PR adds per-form claims to it.) | `api/src/programs.ts:143` (`buildSnapshots(..., "draft")`), `:222` (forms from `snapForms`), `:284` |
| 3 | Minor | Keyboard only, then touch emulation: Tab through a Programs card and a List row whose channel lines are cut (on the six at 1440 the card's PDF group is 249/535 px, see the PR's own screenshot `c16-programs-card-mixed-1440.png`: "IMM 5257, IMM 5409, IMM 5…") | The plan says a long group is "said in full on hover and to screen readers"; a sighted keyboard or touch user also needs a way to see it (EXPERIENCE §29 "keyboard path for every task") | The `<li>` are not focusable (`tabIndex=-1`, no Tip). The cut part is only in `title`, which a keyboard or touch user never sees. A sighted keyboard user's only way to the full list is to open the combination. Screen readers do get the full text (it is in the DOM) | `web/src/pages/programs.tsx:554` |
| 4 | Minor | Combination page › Forms tab, as author and as approver. Focused each column-header tip | No decision ids on screen (the PR removed three; PRODUCT §4) | The Signature column's tip still reads "…Only what fits the way it is filed is offered (**P-143**; Sample until the immigration expert confirms)." The builder's leak check reads `main.innerText`, which never includes a tooltip, so it missed this | `web/src/pages/workspace/forms.tsx:51` (`TIPS.signature`) |

## What held
* **Every IRCC account** (API set, read on card, List, Forms tab and picker; no leak of enum spellings or "(P-")**:**
  IRCC secure account, PR Portal, IRCC Portal, APR Portal, LMIA Online (ESDC): "Online · <name>: IMM 5645" and
  "Typed into the <name> from the answer sheet, in portal order". Not set: "Online · IRCC account not set". The picker
  always matched the row.
* **Unknown account key written to the DB:** `update combination set portal_key='WEIRD_KEY'` is refused by the check
  constraint `combination_portal_check`, and the API's `z.enum(IRCC_ACCOUNTS)` refuses it too. The raw-key fallback in
  `channelWithPortal` (`contracts/forms.ts:49`) cannot be reached.
* **Online on a paper-filing account:** a new Online line under PAPER gets 400, "…has no IRCC account (paper filing):
  every form is filed on paper. Choose Paper, or set the IRCC account…". An existing Online line becomes an error
  problem. The Forms tab says "Paper filing has no IRCC account to type it into: choose Paper, or set the account
  above", and the row says "Online · no IRCC account (paper filing)" (not phrased as going "through" paper).
* **Checklists and attached-but-not-set-up forms:** IMM 5483, IMM 5484 and IMM 5533 (checklists) and IMM 5257 SCH1
  (attached, no line) never appear in any channel group. A combination with no filed lines shows no channel list.
* **Two tabs changing the account:** tab A set PR Portal. Tab B, still showing IRCC secure account, chose APR Portal and
  was refused (conflict). B's picker and Online words refreshed to PR Portal, and the server kept PR Portal. In the
  same tab, the Online words update at once after a pick, with no reload.
* **Retired combination:** changing the account gets 409 "is retired".
* **Roles:** `/catalogue`, `/combinations/:id/summary` and `/channels` return 401 with no header or an unknown actor,
  and 403 for both clients (user-P, user-Q), the officer (user-O) and the representative (user-R). The approver and the
  expert can read but get 403 setting the account. The approver's read-only Forms tab says "Filed through the IRCC
  secure account" and gives the same Online words.
* **Widths and zoom (cards):** no sideways scroll on Programs cards or List at 1440, 1024 or 400 px, or at 200 % zoom.
  Cards stay readable at 200 % (264–446 px lines). The Forms tab at 1024 wraps the Online words in a narrow but
  readable column, with no sideways scroll.
* **axe (WCAG 2.2 AA):** clean on Programs cards and List at 1440 and at 200 % zoom with 22 lines, and on the Forms
  tab as author and as approver. Screen-reader text: the list is labelled "Each form's channel" and the filing tag has
  sr-only "Filing: …".
* **No enum spellings** (IRCC_SECURE_ACCOUNT, PDF_UPLOAD, NOT_NEEDED, PAPER, ONLINE) in the visible text of the card,
  the List row or the Forms tab in any account state. The three removed ids (accepts hint, Online words, automatic
  drawer) are gone from the source.
* **Budgets:** no new query. `account` is read from the combination row that is already loaded
  (`api/src/programs.ts:284`), so 100 programs / 400 combinations adds one short string per row. Not timed.

Not tried: hostile uploads, rename/delete, duplicates and rules. This slice adds no upload, name or rule path.
