# Gate A on #1084 (B104, J7 Stage 1 on the configured checkpoint), 5 Nov 2026

**Verdict: PASS for what #1084 claims.** It claims Partial for C8.2 and C6.9, plus the moves in C11.6 and C8.1. It makes no Works claim.

* **Head tested:** d89a3afb4. Its base is main 74aec1b58, which the PR merged once. The base was tested for comparison.
* **Tester:** the independent cloud qa (P-351 (3)), at the tech lead's request (Lead 13, 13:07 IST). It built none of this and fixed nothing.
* **Cost:** live AI off (every `*_LIVE` switch and AI key removed from each copy), US$0. No priced button and no live switch.
* **Copies:** each run used a fresh isolated copy, dropped afterwards.

## 1. Walk by screens at 1440 px, to the next capability's first step (P-348 (3))
The builder's walk (`walk-stage1-1440.cjs`) ran on my own copy, with the checkpoint loaded through the Demo menu:

| | main 74aec1b58 | head d89a3afb4 |
|---|---|---|
| Steps seen | 6 of 13 | **13 of 13**, plus 1 note (1.8 has no screen, B106) |
| Page errors | 0 | 0 |

On main it misses 1.2, 1.3a, 1.3b, 1.5, 2.3, 4.1a and 4.1b, as the PR says.

**Pressed beyond it, as a person would:**
* **Visitor visa › Forms › Signed by**, scrolled into view:
  * IMM 5257: "A parent, for a minor".
  * IMM 5707: "The person the form is about".
  * IMM 5476: "The person and the representative".
  * SCH1, IMM 5409, IMM 5475 and IRM 0002: "Not set" (the expert's question).
  * The set-up chips ("Step 3 of 6 · Review") and the header's draft count are the same as on main, so this PR did not cause them.
  * IMM 5257 loses its "Picked by AI · Sample" chip, as the PR says (review m6).
* **The case:**
  * The case reads "Filed through APR Portal: set by the combination, not on the case".
  * The channel panel still says "Signature: No signature" on every line (J7 1.4, B81; known, not this row).
* **J7 4.1, Run eligibility check:**
  * The result is "Possibly eligible — needs 3 facts": passport number and expiry, criminal history.
  * The four officer's-judgement lines and the disclaimer show.
  * The client is refused on this page: "This page is for the firm's staff".
* **J7 4.4, Override:**
  * With no label and no reason it is refused on each field.
  * With both, it is kept beside the rules' result with the officer's name and time.
  * Mark reviewed then shows "Seen by Case officer (Sample)".
* **J7 4.2:**
  * I went to Client A › Background information › "Whether the person ever committed … a criminal offence" and answered Yes.
  * The earlier run then reads "Out of date: Criminal history changed from not answered to Yes".
  * Run again, with a reason, gives "Possibly eligible — needs 2 facts; the representative reviews this". The page adds: "A rule like this never gives 'Not eligible' on its own" (P-230 (1)).
* **Browser console:** no page error. The only console errors are the 400 and 403 of the refusals I made on purpose.

## 2. M3 packs alone on a fresh configured checkpoint (no fixture setup; #1069's method)
* **What ran:**
  * 16 packs on the head, twice for the packs that move.
  * The same 16 on main 74aec1b58, once.
  * Step for step in `compare.md`.
* **The packs that move:**
  * **C8.2:** 11/12 → **12/12**.
  * **C6.9:** 2/15 → **15/15**.
  * **C11.6:** 6/14 → **9/14** (C11.6-1, -2, -8b).
  * **C8.1:** 0/14 → **2/14** (C8.1-1, -2).
* **Every other pack:** the same on main and on the head, step for step:
  * C1.3 54/54
  * C6.12 24/24
  * C6.12-breadth 1/4
  * C6.4 18/30
  * C6.5 9/32
  * C6.11 22/25
  * C7.3 2/13
  * C7.5 9/16
  * C7.6 19/25
  * C7.7 18/33
  * C9.2 5/11
  * C10.2 0/11
* **Result:** every change is fail → pass, and **none goes pass → fail.** The head's rounds 1 and 2 are the same step for step.

## 3. M2 packs the PR says are unchanged (each alone on Demo › Reset to the six)
* **C4.8:** 7/12
* **C4.11:** 24/24
* **C4.1:** 25/25
* **C2.6:** 32/32
* **C10.1:** 21/24

These are the same on main and on the head (rounds 1 and 2), **step for step.** That confirms the PR's table.

## Findings (none blocks this PR; for the qa lane to copy)
1. **UX · Minor · C6.9:** "Criminal history → Answer in the Agent view" on the eligibility page lands on the Agent view's first tab ("The representative"). It does not land on Client A's question. A person must find Client A › Background information among 83 missing answers. Expected: the link opens that person's section at that question. The code exists on main; it is newly reachable on the checkpoint.
2. **Conflict · Major (proposed) · C6.9 · P-236:**
   * The decision renames the page "Case check from confirmed facts", with outcomes "Qualifies · Can't tell yet · Does not qualify".
   * The screen still says "Eligibility", "Possibly eligible" and "Likely eligible".
   * It also counts an answer it labels "Yes (not confirmed yet)".
   * This is not this PR's code. It matters before C6.9 can be Works. The question for the tech lead is whether an unconfirmed answer may count.
3. **Note, C8.2:** its pack is 12/12 on the checkpoint on this head. The row is still not Works by the journey: Record the submission opens only once every filing is Ready to file, and no screen reaches that (QA-229, routes without a caller).

## Not done
* Keyboard and axe checks.
* 400 and 1024 px.
* A headed browser: this cloud machine has no display, so the walks ran headless.
* The PR's own GitHub checks (its `shard (1)` waits on the hot-file line the tech lead approved at 14:23 IST).
