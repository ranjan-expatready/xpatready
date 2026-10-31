# Break report 3: N6 "P-179 follow-ups" (money safety), at commit c71fe137 (31 Oct)

Adversarial CHECK of `git diff 066b476c c71fe137`, branch `claude/friendly-lamport-06zafk`. Earlier report: this file at the commit before. US$0 throughout: no `*_LIVE` switch, no priced button, queue held, scratch ledgers only (`/tmp/brk3/...`, never `.tools/p2-ledger`).
* **What ran.** While I worked, other sessions changed the shared working tree (`p2/ledger.ts` was edited, then put back; `review.md`, the reviewer's journey test, `screenshots/p179/*`). So I extracted c71fe137 with `git archive` into `/tmp/brk3/src` and ran everything against that copy.
* **The copy.** The isolated copy was `n6_brk3` on :4459, started with `P2_LEDGER_DIR=/tmp/brk3/ledger STUDIO_HOLD_QUEUE=1` and its web build made from the same commit. At the end it was stopped and its database dropped.
* **Scripts** (scratch, not committed): `a1.ts`/`a2.ts` ledger, `lockw.ts`+`race.sh` spend.lock, `resw.ts` reserve lock, `settle.ts`, `h1.ts` HTTP, `b1.cjs` browser (Playwright, headless Chrome).

## Blocker
None found. Money stays at or below US$132, and at or below each cap unless a Continue was recorded (see What held).

## Major
None found.

## Minor
* **m1. On the Forms tab, a plan that went out of date while the dialog was open brings back review N1: a red toast, no warning, no Continue.**
  * Cause: `sources.tsx:127` makes the plan once, when Live is chosen. It is fetched again only after a 409 (`:143`), but the over-cap refusal is a 400.
  * Steps (`b1.cjs`, screenshot `/tmp/brk3/b3-stale.png`):
    1. Spend US$0. Forms › IMM 5257 › Draft with AI › Live: the plan fits.
    2. Another start (another copy, or Draft setup's queue) takes spend to US$119.
    3. Click "Start live AI draft". Expected: the cost warning with Continue. Actual: a red toast, "The worst case (US$7.23) is above what is left of the experiment cap (US$1.00 of US$120)."
    4. Click again: the same toast again. Nothing started (US$0).
  * The only way out is to close the dialog and open it again; the toast does not say so.
  * Expected: fetch the plan again when Start is clicked, or after any refusal from the launch.
* **m2. The same dialog gives two different "left" figures.**
  * The dialog says "Spent so far US$0.00 of the US$120.00 experiment cap; US$60.00 left." The US$60.00 is what is left of Wave 1 (`api/src/sources.ts:232`, `min(experiment, wave)`), not of the experiment cap. The toast meanwhile says "US$1.00 of US$120".
  * The sentence was edited by this commit (review n4); same screenshot.
* **m3. With the n5 fix, a busy lock at settle can throw away a paid answer and pay for the call again.**
  * Cause: `settle` now waits for the short lock (`ledger.ts:290`). The drafting process waits 10 s, then throws `LedgerBusy`.
  * In `runner.ts`, `settle` (`:74`) sits inside the `try` around the paid call, so that throw lands in the call's `catch`. There it counts as an error: not refused, not busy, no time-out. The answer `r.text` is dropped, the reservation is settled at its worst case (`:87`), and the loop goes on to attempt n+1, a second paid call for an answer it already had.
  * Shown at ledger level (`settle.ts`): an alive process holds `spend.reserve.lock`, and `settle` throws `LedgerBusy` after 10,006 ms with the worst case kept. The runner path was read, not run (it needs a paid caller).
  * Trigger is rare: a live holder for 10–30 s. The extra call stays within the caps.
  * Expected: settle after the `try`, or retry settle on `LedgerBusy` without treating it as a call failure.
* **m4. A used Continue still holds only until it expires (10 min). Break n2 is narrowed, not closed.**
  * Steps (`a2.ts`), committed US$120:
    1. Continue KQ (US$6) is recorded and used 11 min ago; its run has not reserved yet. `heldByOverridesUsd` gives 0 (`ledger.ts:133-143`).
    2. A new Continue K9 (US$12) is **recorded**.
    3. KQ's run reserves 6, which is allowed (the expiry is not checked at reserve).
    4. K9's run is refused at `reserve`: "126 + 12 … past the US$132 ceiling".
  * When it happens: Draft setup over many forms runs its steps one after another, so later steps reserve more than 10 minutes after the click.
  * Money stays at or below US$132. Expected: hold until the run has reserved its worst case or ended (`ended` already tells the API when a run has ended).
* **m5. A lone surrogate in `reason` still records a Continue with no audit (n3 fix incomplete).**
  * Steps: `POST /ai/overrides` with `reason:"a\uD800b"`. The answer is **500** "Something went wrong". The `override` line is written (`"reason":"a\ud800b"`), and there is 0 `ai_override` audit row: Postgres JSON refuses a lone `\ud800`.
  * The regex at `contracts/cost-check.ts:37` refuses C0 controls only.
  * The person's next click reuses that line (the review N2 reuse) and writes an audit row that says "again (their Continue from a moment ago…)". No earlier row exists, and the ledger keeps the first reason, not the one in the audit (`ledger.ts:156-157`, `ai.ts:343`).
  * U+2028, U+0085, U+FFFF, RTL text and emoji: 201, stored.
  * Expected: refuse unpaired surrogates (or `.isWellFormed()`), or write the audit before or with the ledger line.
* **m6. A `spend.lock` whose holder looks alive, or that comes from "another" host, is never broken; nothing ages it out.** This is break N1 again in narrower cases.
  * Steps (`lockw.ts`, locks back-dated 3 hours): `vm:1:…` (a live process id), `other-mac.local:999999:…` and `vm.local:999999:…` (this computer under another name). Each next `withLock` answers "ledger locked by another runner" (`ledger.ts:45-49`, `:300`).
  * When it happens: macOS's `os.hostname()` changes with the network (`Mac.local`, `Mac.lan`, `Mac`), and process ids are reused over days. A crash followed by either leaves a lock that every copy's AI steps wait on.
  * The words name a file, not what a person should do.
  * Expected: an age limit for named locks too, longer than the longest run, or words telling the person what to do.
* **m7. `recordOverride` returns a person's own Continue without checking the ceiling again** (`ledger.ts:157`, before `:158`).
  * Steps (`a1.ts` A): a Continue is recorded at US$120, then spend reaches US$127. The same person and key get `again:true` for a US$6 worst case: 133 > 132.
  * The API refuses earlier (`overrideAllowed` checks `can_continue`), and `reserve` checks the ceiling, so no money moves. But the ledger's own promise, "refused when it would take spend past the ceiling", is not kept on this path.
* **m8 (read, not reproduced). Three waiters can still both enter `withLock`.**
  * `breakStaleLock` renames whatever is at the lock name. Two of three waiters, B and C, read the dead lock. A breaks it and takes a fresh one. B then moves A's fresh lock aside and puts it back. In that moment C can `takeLock`. B's put-back then fails, and B deletes A's lock (`ledger.ts` breakStaleLock).
  * 8×6 and 16×12 rounds with a dead holder showed 0 overlaps, so the window is very short.

## What held
* **Money:**
  * 16 processes × 5 rounds reserve US$20 behind a dead-holder `spend.reserve.lock`: exactly 3 each round (Wave cap US$60), no LedgerBusy, no `.stale-*` left.
  * Past US$132: a live start without a Continue gets 400; with an older Continue, 409 "past the US$132.00…".
  * A stub start at US$133 gets 201 at US$0 (the `ai.ts` launch fix holds).
* **Locks:**
  * SIGTERM to a `withLock` holder: the next runner breaks the lock and enters at once.
  * 8 and 16 waiters on a dead `spend.lock`: one at a time, 0 overlap.
  * A reserve lock whose holder died: broken at once (POST /ai/overrides 201 in 35 ms).
  * A live holder for 6 s: 503 "The shared spend ledger is busy… Try again in a moment" after 2,029 ms. A `GET /session` sent meanwhile took 1,936 ms, the 2 s wait by design.
* **Continue reuse:**
  * The same person and key get the same id (1 line).
  * Two launches at once with that id: 201 and 409 "Being mapped…", exactly 1 `override_use`, 1 queued.
  * After Stop, the cancelled run's Continue holds US$0 (`ended`).
* **Fail closed:** unknown line types, an orphan `override_use`, a settle with no id and a non-text `override_id` do not lower committed or held. Malformed override lines stop starts in words (as the commit says).
* **Escape guard (Forms tab, browser):**
  * Cancel, then Escape: the form's dialog closes, so the guard is gone.
  * Escape while Continue is busy: swallowed, and the warning stays. After the 503, Escape cancels the warning only, and a second Escape closes the dialog.
  * After a Continue that started a run, Escape closes a later dialog: no leak.
* **Double Start (double click) on the Forms tab:** one warning, then Continue: 1 override, 1 use, 1 run.
* **Sizes:** at 1024 px and at 720 px (about 200 % zoom), the warning has no sideways scroll and Continue is visible. 0 page errors.

## Not checked
A real launcher or live run; a second author persona over HTTP (only `user-A` exists); a screen reader.
