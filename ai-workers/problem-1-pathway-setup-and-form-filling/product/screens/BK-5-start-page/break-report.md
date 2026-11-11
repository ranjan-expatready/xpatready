# BK-5 PR 1 Starting points: break report (breaker role)

Commit under test: **2029a76fbab7b1f359c4bb0d9dc8347d360482ab** (branch `claude/ecstatic-franklin-sbhofa`, PR #1581). 11 Nov 2026.
Scope: concept rev 2 §9 PR 1 (`/start`, the three doors, Demo menu item, where-line). "Not built" items (removing the Demo menu's other items) are not findings.
Copy: isolated `screens_bk5b` on :4462, web built at 2029a76. The bundle is the 2029a76 one: the empty confirm reads "1 row", and the doors are live while the status is unread. Commit 0dae1533f ("review M1 …") landed on the branch during this run. It is **not** tested here.
Tools: Playwright (`/opt/pw-browsers/chromium`), direct API calls, psql. US$0: the page only ever posted `/demo/*`; no AI route was called and no priced button was pressed. Door 2 ran end to end 6 times (111-114 s), door 3 once (192.9 s).
Paths are under `prototype/studio/` and line numbers are at 2029a76.

## Findings

**B1 · Blocker: a door empties a demo that has programs without RESET, and tells the person "nothing you made is lost" (BR-2, EXPERIENCE §2.8).**
* *Cause:* `web/src/pages/start.tsx:155` sets `needsReset = !!status?.programsExist`. That is false while `/demo/status` is unread, failed or stale, and `:164`/`:176` always send `{confirm:"RESET"}` for doors 1 and 2. The status query (`:63`) never refetches outside the story job, and `refetchOnWindowFocus` is off. The doors' `off` (`:77`) looks only at the session, never at the status.
* *Repro 1 (two tabs, the concept's own breaker):* open `/start` on an empty demo. Load the six through the API, standing in for a second tab (17 programs). Back in the first tab, nothing has changed: "Last loaded: Nothing set up". Door 1's dialog says "The demo has no programs, so nothing you made is lost: no RESET needed" and "Goes … 1 row". Press **Empty and start**: it sends `POST /demo/reset {"confirm":"RESET"}`, programs go 17 → 0 (`program_def`), and the toast says "1234 rows removed".
* *Repro 2 (one tab, nothing else running):* with 17 programs (the finished story with its family case), hold the first `GET /demo/status` for 20 s, as a busy server would. "Last loaded" shows the spinner, but door 1 is enabled. The dialog reads "no RESET needed", "Goes … the rows in the demo", and the destructive button is live. Pressing it took programs from 17 to 0. With `/demo/status` answering 500, the doors stay enabled as well (only the error notice shows), so the same path applies.
* *Why Blocker:* this is the page's only destructive guard. The page states something false as fact and supplies the typed word itself, so the server's RESET check cannot help. It also needs no race: a slow or failed first read is enough. It is the same defect as the review's M1, and Repro 2 widens it. Door 3 is not affected: it sends `{}` (`:169`) and the server refuses with "Type RESET to confirm".

**m1 · Minor: the part-way words are false when the load was refused, not stopped.**
Door 2's reset succeeded. Before its load arrived (delayed 1.5 s by route), another client started a six load. The dialog then said: "Emptied; the configured load stopped part way: The sample inputs are already loading: wait for them to finish. Start again empties it first." Nothing stopped part way, because the configured load never started. "Start again" then gets a 409 while the other load runs. The window is small in real use (ms between the two calls). Code: `start.tsx:194`, which uses the part-way wording for any error after the reset, a 409 included.

**m2 · Minor: Try again after a part-way stop can replace "Emptied … part way" with "Not started".**
A trigger refusing the checkpoint's last audit line produced the part-way stop; RESET stayed typed and the button became "Try again". A second client then started a load, and I pressed Try again. The reset got a 409, and the notice changed to title "Not started" with "A sample load or Reset to the six is running…". The earlier fact, that the demo is emptied and half loaded, is gone from the dialog. "Last loaded: Another state" behind it is right. Code: `start.tsx:194-195`.

**m3 · Minor: after a reload, Back or a second tab, door 2's run is invisible and "Last loaded" never updates.**
* Reload during door 2's load: the server's load carries on, but the page shows no running state. All three doors are live, and "Last loaded: Another state" stays after the load finishes 111 s later. It updates only on a manual reload.
* Back during the load (in-app): no done notice ever appears, on any page.
* A second tab that watched the load says "Another state" after it finished.
* BR-4's words are allowed for this, and a second start gets the server's 409. Still, the page says "Keep this page open" and gives no `beforeunload` warning. Code: `start.tsx:63`, which polls only while the story runs.

**m4 · Minor: closing the confirm dialog drops keyboard focus to `<body>`.**
Keyboard only: Demo menu → Starting points… → Tab ×18 to "Start from nothing" → Enter → Escape. Focus lands on BODY, and it takes 20 Tabs to get back to the door (WCAG 2.4.3). Cause: the dialog is unmounted on close (`start.tsx:125`, `{door ? <StartDialog …/> : null}` with `open` always true), so nothing returns focus to the door.

**m5 · Minor (confirms the review's m1 and m2):**
* An empty demo's confirm says "Goes: All configuration, releases and cases: 1 row". That row is the last reset's activity line (`scope.rows["Activity entries"]=1`, `:207`).
* The part-way words carry two instructions: "…Reset the demo, then load again. Start again empties it first."

## What held
* **Server, wrong role:** reset, load and finished-story as user-B and user-C get 403 "… does not hold the author duty"; an unknown or empty `x-actor` gets 401.
* **UI, wrong role:** as user-B or user-C every door is disabled with "Approver (simulated) can look, not start…". Removing the `disabled` attribute and force-clicking opened no dialog and sent 0 POSTs.
* **Not the demo:** with the session answer rewritten to `workspace.demo:false`, the doors are off with "Nothing here can run in this workspace." I did not restart with a non-demo workspace key; the server's `DEMO_ONLY` guard is in code (`api/src/demo.ts:91, 529`).
* **Repeated clicks:** a triple click plus a forced 4th click on Empty and start sent exactly 1 reset and 1 load. A double click on door 3 sent 1 finished-story call.
* **Escape and Cancel while running:** ignored, and the running line kept counting.
* **Two tabs, door 2 at the same moment:** one tab says "Not started" with the server's 409 words, and the other loads and lands on Immigration programs.
* **Starts that collide with a running job:**
  * Door 1 or door 3 while door 2 loads: the 409 words, under "Not started".
  * Door 2 while the story runs: the 409 words.
  * Door 3's button is disabled while its job runs.
* **Door 3 progress:** it survives a reload ("5 s so far. It keeps loading if you leave or reload this page."). After the job, "Last loaded" turns to "The finished story" with no reload, and "Open the family case" appears; the status race fix held.
* **BR-6 part-way stop (trigger):** the words, RESET kept typed, and Try again re-running both calls work as the concept says.
* **Back mid-load:** it does not yank the person to `/` later.
* **Layout:**
  * At 1440, 1024 and 375 px, and at 200 % zoom of 1024 and 1440 (512×384 and 720×450 CSS px), there is no sideways scroll on the page or the dialog.
  * axe (WCAG 2.2 AA) found 0 violations on the page and the dialog at all five sizes.
  * Empty and start stays reachable at 512×384.
* **Keyboard:** the whole run works by keyboard: menu → door → type RESET → Enter. A lowercase "reset" is refused.

## Verdict
**Not ready at 2029a76fbab7b1f359c4bb0d9dc8347d360482ab.** One Blocker (B1: a destructive start without RESET on an unread, failed or stale status) and five Minors. A fresh break of B1 is needed on the head that claims the fix (0dae1533f or later), including Repro 2: a slow and a failing `/demo/status`.

## Re-break (f1e4f40)
Head **f1e4f4068dedfaca206f1f7a20c63e4fbe8e2101**: fresh copy `screens_bk5b` on :4462, with `web/dist` checked fresh (`web-fresh.sh ensure`; the bundle carries "did not start"). The only code change since 2029a76 is `web/src/pages/start.tsx`. Same tools as above; US$0.

**B1: fixed (held).**
* **Two tabs (t1), on all three doors:** the page was open on an empty demo, and then the six loaded through the API (17 programs). The stale dialog still opens with "no RESET needed". Pressing the button sends **0 POSTs**. The page says "The demo has programs now (loaded meanwhile, for example in another tab): nothing was emptied. Type RESET to confirm.", the RESET field appears, and "Goes" re-reads as 1234 rows. 17 programs are kept on every door.
* **Slow first `/demo/status` (15 s, t8):** all three doors stay off until it answers, and a forced click opens no dialog. After the answer they come on.
* **`/demo/status` answering 500:** the doors stay off and "The demo's state could not be read" shows.
* **Status read fine, but the re-read inside `go()` answering 500:** "Not started: re-read boom", 0 POSTs, 17 programs kept.

**B1-r · Minor: the window between the re-read and the reset is as long as the re-read's answer takes to arrive, not milliseconds.**
* *How:* on an empty demo, open door 1 (no RESET asked) and press it. The server answers the re-read at 1.2 s with `programsExist:false`, and the answer is delivered 50 s later (a held route, standing in for a very slow link). Meanwhile another client loads the six, which finishes at 33.8 s with 17 programs.
* *Result:* the page then sends `POST /demo/reset {"confirm":"RESET"}` at 51.2 s and gets 201. Programs go 17 → 0 with no RESET typed.
* *Where the server lock helps:* with a 25 s hold, the other load was still running, so the reset got a 409 and nothing was lost. The load's lock covers a load in progress. It does not cover one that finished inside the gap, or a program made by hand.
* *Why Minor:* it needs a pathological answer delay plus a second writer.
* *Fix:* closing it needs the server to judge "empty" atomically, for example a reset confirm that is refused when programs exist. That is an API change, so it is for the Lead, outside this PR.

**Your minors:**
* **m1: fixed.** A 409 load between the calls now reads title "Emptied, not loaded" with "Emptied; the configured load did not start: The sample inputs are already loading… Start again empties it first."
* **m2: fixed, with a nit.** A Try again refused by a 409 reads "…wait for it to finish, then reset. Nothing more was done: the demo is still as the last try left it (emptied, not fully loaded)." The nit: the 409 itself says another load is writing into the demo right now, so "still as the last try left it" is not quite true. Something like "another load is changing it" would be exact. Optional.
* **m3: fixed.** A page opened 1.3 s into a configured load read "Another state", followed by itself, and showed "Last loaded: Pathways released, ready to walk" 12 s after the load ended (181.8 s), with no reload.
* **m4: fixed.** Both Escape and Cancel return focus to the door that opened the dialog ("Load the finished story").
* **m5: partly.**
  * The empty confirm now says "No programs: only 1 record line, such as the last reset's activity line".
  * On a never-reset copy it reads "only 0 record lines, such as the last reset's activity line" (nit).
  * The part-way words with two instructions are unchanged. That was optional.

**New nit (Minor):** after "The demo has changed", keyboard focus sits on the dialog container, not the new RESET field. axe found 0 issues on that state.

**Re-break verdict:** **Ready at f1e4f4068dedfaca206f1f7a20c63e4fbe8e2101 for the breaker.** B1 is closed for stale, unread and failing status on all three doors. What remains is Minor: B1-r (the window grows with answer latency; the real fix is server-side, for the Lead) and three nits.
