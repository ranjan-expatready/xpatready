# C11.15 long page address (QA-252) · break report

Commit `6277f5df6` (branch `claude/eloquent-brahmagupta-r9inu3`). Scope: build-notes "What changed" 1–4. Isolated copy `forms_brk` on :4457 with the demo loaded (`POST /api/demo/load`, user-A). Only Rules only and Saved were used; Live was never pressed; US$0. Browser: Playwright with Chrome; API: fetch, using the branch's own `findRunKey` and `findErrorWords`.
Note: at 08:20 UTC another session edited `finder.tsx` in the shared working tree (uncommitted: the label words, and a comment saying the keyboard fix is coming) and rebuilt `web/dist`. Every result below except the 1024 px / 200 % layout check ran earlier, on the commit's build. The layout check ran after the rebuild; only the label words differ.

## Major
**M1. Keyboard only: tabbing from "The page this combination's last find read" switches the choice to "Another canada.ca page".**
Did: Super visa › Forms after a finished Rules only find on the Visitor visa page. Pressed Find again from the keyboard (Enter), then Tab repeatedly.
Expected: the chosen page stays chosen while focus moves on toward the mode choice and Start (this is how Find again worked before the change).
Actual: when focus enters the address box, `onFocus={() => setPicked("other")}` switches the radio to "Another canada.ca page". Start turns off and the dialog shows "Paste the address…". Tab 5 of the walk gave `page oX, start off, needed true`. Every forward Tab path from the page choice to the mode choice or Start goes through the box. The only way round is Shift+Tab, wrapping round to Start. Nothing is read from the wrong page (the failure is safe), but this is a regression on the main Find again path whenever a page is remembered.
Where: `web/src/pages/workspace/finder.tsx:115` (`otherPage`, used at the new `data-page-again` fieldset). The same focus rule already existed in the offered page list.

**M2. The words say "nothing was started" when a run was started.**
Did: Find again › Another page (148-character Start Up Visa page), Rules only. A route let the launch request reach the server, then dropped the answer (`route.fetch()` then `abort("connectionreset")`).
Expected: the words do not claim a fact the client cannot know, for example "The studio could not be reached; the find may have started. Press Start again to see it."
Actual: the dialog said "The studio could not be reached, so nothing was started…", but `ai_batch` held 1 new run. Pressing Start again gave the same run (the key held). The 5xx words claim the same ("…so nothing was started"). A 5xx can also follow a run that was started: `api/src/finder.ts` launch commits the batch, then awaits `audit.log` before `execute`, and a gateway timeout can come back while the server keeps going. With Live on, a person told "nothing was started" may believe nothing was spent.
Where: `web/src/pages/workspace/find-key.ts:32-33` (`FIND_WORDS.unreachable`, `server`), chosen at `:41-42`.

## Minor (6)
1. Concurrent Starts with the same key (5 at once, API) start one run. The other four get `409 Already finding`, not the same run. The build notes say "the same key returns the same run", which holds only after the first commit. No second run. `api/src/finder.ts:264` reads the key before the lock, and the active-run check at `:279-280` runs before the unique key (P2002) catch. In the browser, two `click()`s in one task sent 2 requests with 1 key and started 1 run, with no red line left behind.
2. Two tabs with the same choice: pressed together, 1 run (the other gets Already finding). Pressed one after the other once the first ended: **2 runs**. The key belongs to one dialog (`finder.tsx:76`). Only "Already finding" guards while a run is going. US$0 here; with Live, a dialog left open in another tab can start a second paid run after the first ends.
3. Stale remembered page: tab A shows the Visitor visa page as the page used before. Tab B finishes a find on another page (study permit). Tab A presses Start and gets `409` "Something changed since you looked at the plan… Look at it again". This is correct and nothing was started. But the dialog still shows the old page, does not fetch the plan again, and gives the same 409 on every Start until it is closed or the mode is switched.
4. The label "The page this combination's last find read" (`finder.tsx:54`) shows the last **finished** find's page. After a FAILED find on the pasted 148-character page, the dialog still offered the older page under that label, so the words are not true. The uncommitted working tree already rewords it.
5. Page addresses have no length limit: a 200,000-character canada.ca address passes the plan and the launch. It starts a run and is stored whole in `ai_batch.plan` (`contracts/form-library.ts:25` has no `.max`). The run ends "could not read the application page"; nothing breaks. A 6 MB address gets the server's own plain 413 words.
6. `findErrorWords` shows any message on a person-set field (`find-key.ts:26`, `:50`) unless it matches `RAW`. A simulated `400 {field:"pageUrl", message:"… /home/user/api/src/finder.ts:209"}` showed the path verbatim. Today's server never sends one, so this only matters if a server message changes.

## What held
* **Key length and collisions:** keys are 78–79 characters for any address (300, 2,000, 10,000, 60,000 and 200,000 characters, and non-ASCII). Each variant got its own key and its own run: case in the path, host case, one character apart, `?a=1` vs `?a=2`, a fragment, `%2D`. Trailing spaces are trimmed to the same page and the same key, which is correct.
* **Same key on another page or mode** (API): returns the existing run. It never starts the other page.
* **Double starts:** double and triple clicks with a 1.5 s slow server, 12 held Enter keydowns, and a Redo double click each gave 1 request and 1 run. The held Enter did not reopen the dialog. A retry after a lost answer sent the same key and got the same run. Reloading during Start left 0 runs and a normal panel.
* **Start reads the page shown as chosen**, checked from the launch bodies and `plan->>'page_url'`:
  * The page used before was chosen while the box still held a pasted address: no `pageUrl` was sent, and the run read the page used before.
  * Pasting, clearing or entering only spaces turned Start off and showed "Paste the address…".
  * Typing one more character turned Start off until the new plan arrived.
  * Switching mode before Start sent the last mode.
* **Words:**
  * Refusals of a page outside canada.ca (http, another host, user@host, a port, an IP address, javascript:, ftp:, file:, an IDN look-alike, not a URL) get the server's own words.
  * These get fixed words: a raw validator message or a refused key (refused words), plain-text 429 (refused words), 500/502/504 including HTML bodies, and a lost connection.
  * These get the server's sentences: 409 Already finding, 403 for user-C and user-P, 413.
  * No field name or validator default was ever shown.
* **Roles:** launching as user-C or user-P gets 403, and with no actor 401.
* **No regressions:** Find again with no remembered page (Visitor visa) shows no page fieldset and starts from the keyboard. The offered-page dialog on Super visa is unchanged. Redo with AI (wp.family IMM 1295) worked: the stage choice, the Match refusal in its own words, and Find + Rules only started 1 run with a `redo-…` key.
* **Layout:** at 1024 px and at 200 % (720×450 CSS px) with a 10,000-character address, the dialog does not scroll sideways (scrollWidth equals clientWidth, 510), Start stays visible, and Tab reaches Start.
* No page errors in any walk.
