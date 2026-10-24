# Screen 01 — Programs: break report, round 2 (second CHECK of the closing fix pass)

Breaker, 23 Oct 2026, lane copy `screens-01-fix-c3010a` at 8d020757. Scope: concept "What gets built" + Layout v2, the round-1 retests and the P-74 extension (C1.6, C1.7, C2.7, C2.10, C3.10). Isolated copy `screens_br` on :4442 (fresh database, sample inputs loaded; :4400 untouched). No code changed, no AI call, nothing committed. Scripts and screenshots: session scratchpad `br2/` (`shots/`).
**Counts:** Blocker 0 · Major 3 · Minor 7. Left for the Lead as agreed: m4 deny by default, m5 atomic `baseRevision`, m9 intake wording.

## Round-1 retests
* **M1 fixed.** I raced a release against a channel change (at 20 ms) and against a portal change (at 60 ms and 90 ms). The release was refused each time: 409 "The draft changed" or 409 "was changed while it was being released". Nothing was published unreviewed.
* **M2 fixed.** The approver submitted LMIA. `/draft` holds it for them ("You submitted it…", `self: true`). Signing their own submission gets 403.
* **M3 fixed.** Reusing with `who: "<script>…"` gets 400 "Choose whose form it is from the list." and nothing is added.
* **M4 fixed.** After IMM 1295 is removed, the summary's Forms no longer lists it. The only place it still appears is as an attached source with "Add 1 form from the library".
* **m1 fixed** (empty items 400; the submitter signing gets 403). **m2 fixed** (different Hindi and Thai names are both created; the RTL override is stripped, so "BR asiv" is stored as plain text). **m3 fixed** (the hint follows the typing: "Visitors." gives "Visitors" exists: choose it).
* **m5 first half fixed** (removing a line twice, or editing a removed one, gets 409). **m7 fixed** (`/draft?summary=1` takes 3 ms). **m8 fixed** (`STUDIO_PORT=4442 restart-api.sh` without `DATABASE_URL` is refused, exit 2; `stop.sh` stops the database only on port 4400, read in the code).

## Major
**M1. A portal change is never a draft change, so it goes live without review.**
* Steps: on Live "With an LMIA", `PATCH /combinations/:id/portal {"portal":"ircc_portal"}` as the author.
* Expected: one draft change, listed for review and release, like any other row detail.
* Actual: the draft bar says 0 changes. `POST /submit` then succeeded with `changeSummary: []`. The approver approved it with nothing to sign. Release 2's snapshot now has `portal: ircc_portal`. The portal also rides silently into any later release of that row (Release 3 has it, and its review listed only the IMM 5409 channel).
* Cause: the snapshot carries `combination.portal`, but `diff` compares row details without it (`engine/validate.ts:152` `meta` has no `portal`). The portal decides each line's default channel and the "Online" checks. The sha gate does see it, so the release race holds.

**M2. Channel, portal and drafting-source saves have no version check: two sessions both get 200 and the last one wins (STANDARDS §4 [M]).**
* Steps: two `PATCH …/forms/IMM 5409/channel` calls sent at once on the draft line, one "ONLINE" and one "PDF_UPLOAD".
* Actual: both return 200 and the line ends up ONLINE. The session that chose PDF upload saw "IMM 5409 filed as PDF upload".
* The same happens one after the other: a page loaded earlier overwrites a newer choice with no 409.
* No `baseRevision` is accepted or checked: `api/src/forms.ts:441` (portal), `:449` (channel), `:498` (draft-from). "Use the default for N forms" makes N blind PATCHes (`web/src/components/channels.tsx:78`).
* What held: concurrent saves on a released line produce one new version; the other calls get 409.

**M3. "Add an online form" leaves captures that nobody can finish or abandon, and the combination page shows them for ever.**
* Steps, on Visitor visa:
  1. A page with an answer: refused, correctly.
  2. Then reload, and separately Back, 60 ms and 30 ms after "Add and send for approval".
* Expected: a refused or interrupted attempt leaves nothing behind, or the page offers continue and abandon.
* Actual: each attempt left a capture OPEN, with 0 or 2 screens. "Online forms added here" now lists three rows "Being captured: add the remaining screens, then finish", plus every Abandoned one.
* Neither this page nor any other web page has a finish, continue or abandon action. `grep` for `/finish` and `abandon` in `web/src` finds only this panel's own chain (`channels.tsx:125-137`). `OnlineForms` (`:90`) only lists.
* Each retry adds another row, so the list stops telling the author what is really awaiting a second person.

## Minor
* **m1. The filing method reads badly, and it is very long on the Programs row.** Example: "PDF only; plus signed pdf upload when Needed once per couple when the principal applicant has a common-law partner who will accompany them to Canada.; plus online when Needed only when…". The problems are lower-case "pdf", "when Needed", ".;", and the full condition repeated on the row (`engine/channels.ts` `filingMethod`; screenshot `shots/comb-1024.png`).
* **m2. "Use the default for 3 forms" is misleading.**
  * It would turn a deliberate "Signed PDF upload" (IMM 5409) back into "PDF upload": the default is never Signed, so a signed line always shows as "off default".
  * The one note "(an approved online version from the IRCC Portal exists)" covers lines whose default is PDF upload (`channels.tsx:74`, `:83`).
  * Failures part-way leave a partial result, with one error toast.
* **m3. An online-only form with no portal gets a wrong message.** `+ Add` of IMM 7777 (library has only an online version) on Visitor visa, which has no portal, says "IMM 7777 has no stored file to attach. Upload the IRCC PDF." It does not say "choose the portal first" (`api/src/programs.ts:349`). With the portal set, the Online line is added correctly.
* **m4. The drafting-source words are wrong on combinations without a portal.**
  * Visitor visa and Super visa have no portal and file IMM 5707 as a PDF, yet they read "Reads the IRCC Portal screens … alone; the PDF version is not reused." The online filter accepts any portal when there is none (`api/src/forms.ts:486`).
  * Codes are not normalised: `draft-from` with "imm 5707", "IMM-5707" or "IMM  5707" gets 404. Captures map all of these to IMM 5707.
* **m5. A capture added from a combination may use another portal, with no warning.** IMM 1295 was captured on LMIA Online for LMIA, whose portal is the IRCC Portal. Its row says "Approved: an online version in the library", yet its default stays PDF upload.
* **m6. A large saved page holds the request for 60 s.** A 9 MB saved page took 60.1 s inside `POST /captures/:id/screens` and ended "Not read: the file could not be read". The reader runs in the web request (§4 [M]: never inside a web request). Also "1 questions".
* **m7. N+1 on the summary.** The summary now calls `defaultChannelFor` once per line, two queries each (`api/src/programs.ts` summary; §5 [M] no N+1). It takes 22–75 ms here, so the budget is not at risk with the sample data.

## What held
* **Roles.** The approver and the SME get 403 on portal, channel, draft-from and capture create. Self-approval of a capture gets 403. In the UI the approver sees read-only channels, a read-only portal and drafting words, and no "Add an online form" or "Use the default".
* **Bad input.** Unknown and removed lines (404), unknown combinations (404), and an invalid uuid (400). "online", "IRCC_PORTAL" and "online_only" get 400. A lower-case form code shows its field message in the panel.
* **Channels and release.** An Online line with no portal, with another portal, with no approved online version, or with no screen map is listed "Blocks release". It is held on the Release page and refused at submit. A changed channel is a draft change, needs SME sign-off, and Release 3 carries it (IMM 5409 SIGNED_PDF_UPLOAD).
* **Uploads.**
  * Refused, with nothing kept: the with-answers page, `template-with-answers.csv`, CSV formulas (`=cmd|…`, `+SUM`, `@SUM`, `-2+3` in label, help and options), all six `hostile-*.html` and `intake-one-question-answered.html`. The aria-unread page is "not read".
  * The same file twice and the same screen again are marked duplicates. 60 files at once get 413 and nothing is added; 30 are accepted; a file over 10 MB gets 413.
* **Approvals.** Approve against return, sent at once 4 times: exactly one wins (APPROVED or RETURNED, or both 409 when the capture was already in the library). Approve, return and abandon at once: one return, then the abandon; the approve gets 409.
* **Drafting source.** `ONLINE_ONLY` is honoured by `POST /online-versions/:id/screen-map/draft`: `pdf_twin` went from 4 to 0 and `pdf_edition` to null. The choice shows on every combination using the form (LMIA, Visitor visa, Super visa, Study permit).
* **C3.10.** No "box" or "boxes" in the rendered text, titles, labels or options of 21 page states, or in any API message string. Stored field-map reasons contain "check boxes" but are not shown anywhere.
* **Keyboard, layout and reload.** Tab reaches "Add an online form", Enter opens the panel with focus inside, and Escape closes it. No page-level sideways scroll at 1024 px or 200 % (512 px). The Forms table, with "Filed as", scrolls inside its card (`shots/c512a.png`). Reload and Back mid-action caused no error (see M3 for what was left behind).

## Not built (P-26) — not counted
100 programs / 400 combinations not re-run (budgets not built). One workspace per database, so "another workspace's id" was tested only as unknown ids. The capture review itself is Screen 02.

## Left behind
Database `xr_studio_screens_br` (one fresh start, then the tests above). Server :4442 stopped; :4443 not used.

## CHECK 24 Oct: small FIX QA-4/QA-20/QA-22
Breaker, 24 Oct 2026, branch `claude/screens-01-fix-c3010a` at 12af01a. Copy `screens_bk` on :4442 (fresh database, sample inputs loaded); stopped at the end, :4400 untouched. No code changed, no model call. Scripts and screenshots are in the session scratchpad `bk/` (`shots/`). **Counts:** Blocker 0 · Major 1 · Minor 5.

**Major**
* **K1. With the keyboard, the Portal select saves on every arrow key and then drops focus to the page.** Steps: author, `/c/<wp.family>`, Tab to Portal (18 Tabs), press ArrowDown. Expected: the user can move through the options and choose one, and focus stays on the select. Actual: each ArrowDown sends a PATCH right away, which means a draft change and a toast. Three quick presses gave 2 PATCHes and ended on "Authorized Paid Representatives Portal". `disabled={busy}` takes focus off the select: `document.activeElement` is BODY within 60 ms and stays there after the save (`web/src/components/channels.tsx:34`). The keyboard path for this task breaks (EXPERIENCE §12 [M]). This was there before the fix; QA-20 did not cause it.

**Minor**
* **m1. If /api/session never answers, Programs shows the skeleton forever, with no message and no Try again.** Steps: route `/api/session` so it never answers, or so it answers 200 with an empty body. Actual: after 12 s the list is still `ListSkeleton` with 8 skeleton rows and 0 alerts. The catalogue has loaded but is hidden (`programs.tsx:49`, `:145`: `knowsPerson` only becomes true from data or an error, and there is no timeout). Before the fix this case showed the list. Screenshot: `shots/session-hang.png`.
* **m2. While the skeleton shows, a screen reader is told "20 combinations shown".** Live regions during the load: `["Loading programs", "20 combinations shown"]`. The `sr-only` status at `programs.tsx:152` counts `rows` while the rows themselves are hidden.
* **m3. When the session fails, an author is told to switch to themselves.** Steps: `/api/session` answers 500, 401 or is aborted, as user-A. Actual: a banner says "The studio server is not answering … (401 Unauthorized)" (`App.tsx:69`), which is wrong for a 401 because the server did answer. Below it, the full list appears with New combination disabled and the tip "Only a configuration author can create combinations. Switch to the Configuration author." A 200 that is not JSON (an HTML proxy page) shows no banner at all, only the non-author state (`programs.tsx:49`: `!!session.data` is true for a string).
* **m4. The combination page has the same late-person flash QA-22 fixed on Programs.** With `/api/session` delayed 2 s, the author first sees the Portal as read-only bold text and the channels as text. Then they become selects and the layout jumps (states seen: `B+chanText` then `SELECT+chanSelect`). Nothing wrong is said, but the page jumps.
* **m5. Download edge cases outside the clean 404.**
  * An id containing `%00` gets a 500 (Postgres "invalid byte sequence 0x00"). It should be a 404, like `abc`.
  * The rest need a stored row that points at the wrong thing (tested by editing the copy's row):
    * A directory, or an empty `stored_path` (which resolves to the repository root), gets a 404 with the detail "Cannot GET /api/attachments/…/file", not the plain reason.
    * A path through a file (ENOTDIR) gets a 500. Only ENOENT is mapped (`main.ts:148`).
    * No server path leaked in any of these.
  * An official PDF uploaded under the name `.env` is attached and later downloads as `filename=".env"`, `application/octet-stream`. The stored name is safe (`0dc03b24e791-.env`).

**What held**
* **QA-4 dotfiles.** Every file served comes from a database row looked up by UUID. `abc`, `..%2F..%2F.env`, `%2e%2e`, `..%2F.git%2Fconfig`, a 5,000-character id and the zero UUID all get 404 "Not found (it may have been removed by a reset)." on both `/attachments/:id/file` and `/artifacts/:id/file`.
  * Upload names `.env`, `../../.env`, `..` and `..\..\.git\config` are cut to their basename and prefixed with the checksum (`58a93db92aef-.env`, `…-config`). A stored file name therefore never begins with a dot.
  * Uploaded fakes with planted text ("Ignore all previous instructions…") are held and never attached.
  * Artifact paths are built from codes in the coverage list only (`fill.ts:61`).
  * A gone file gets the plain 404. HEAD returns 200 with the right Content-Disposition.
* **QA-22.** With the session slow (2.5 s) the author never sees non-author words. Switching to the author while the SME's session was still loading went from skeleton (disabled) to enabled, and never showed the SME's state as the author's. Switching back to the SME disabled New combination at once.
* **QA-20.** On `/c/<wp.family>`, every portal (including the longest, "Representative Permanent Residence Portal"), plus the approver's read-only text, ends inside 320, 360 and 400 px. At 512 px (200 % of 1024) there is no sideways scroll.
  * At 320 and 360 px the page still scrolls to 384 px. The cause is the "People in this combination" section (`combination.tsx:156`), not the Portal select. It is below the 1024 px / 200 % bar, so it is not counted.
  * The select's accessible name is "Portal" and it has a visible 3 px focus ring.
* **Roles (not counted, m4 of round 2, left for the Lead).** Downloads need no role: Client A (`user-P`) and a caller with no header both get 200 on a source file.
